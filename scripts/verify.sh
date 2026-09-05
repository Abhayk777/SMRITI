#!/usr/bin/env bash
# Smriti guardrails. Run before every commit.
set -uo pipefail

fail=0
M=supabase/migrations
err() { echo "❌ $1"; fail=1; }

if ! compgen -G "$M/*.sql" > /dev/null; then
  echo "ℹ no migrations yet — skipping SQL checks"
else

  echo "→ RLS enabled for every table"
  # collect declared tables across all migrations (no pipeline into while: avoids
  # pipefail firing when a file contains no CREATE TABLE)
  tables=$(grep -hioE "create table (if not exists )?[a-z_.]+" $M/*.sql \
           | awk '{print $NF}' | sed 's/^public\.//' | sort -u)
  for t in $tables; do
    grep -qiE "alter table (public\.)?$t enable row level security" $M/*.sql \
      || err "RLS never enabled for table: $t"
  done

  echo "→ auth.uid() wrapped as (select auth.uid())"
  if grep -rnE "auth\.uid\(\)" $M/*.sql | grep -v "select auth.uid()" | grep -vE "^\S+: *--"; then
    err "bare auth.uid() found — wrap as (select auth.uid())"
  fi

  echo "→ no time/timetz columns (use integer minutes)"
  if grep -rniE "^[[:space:]]+[a-z_]+[[:space:]]+time(tz)?([[:space:]]|,|$)" $M/*.sql; then
    err "time-typed column — use integer minutes 0..1439"
  fi

  echo "→ no trigger function writing back to events"
  if grep -rniE "insert into (public\.)?events|update (public\.)?events" $M/*.sql \
     | grep -v "^$M/0004"; then
    err "something outside 0004 writes to events — check for trigger loop"
  fi

  echo "→ migrations numbered uniquely"
  dupes=$(ls $M/*.sql 2>/dev/null | xargs -n1 basename | cut -c1-4 | sort | uniq -d)
  [ -n "$dupes" ] && err "duplicate migration numbers: $dupes"

fi

echo "→ no service-role key in web/"
if [ -d web/src ] && grep -rn "SERVICE_ROLE\|service_role" web/src/ 2>/dev/null; then
  err "service-role key referenced in browser code"
fi

echo "→ supabase client isolated to lib/db.ts"
if [ -d web/src ]; then
  stray=$(grep -rl "@supabase/supabase-js" web/src/ 2>/dev/null | grep -v "lib/db.ts" || true)
  [ -n "$stray" ] && { echo "$stray"; err "supabase imported outside web/src/lib/db.ts"; }
fi

echo "→ no committed secrets"
if git ls-files 2>/dev/null | grep -qE "^\.env|/\.env$|\.env\..*[^e]$"; then
  err ".env file is tracked by git"
fi

if [ $fail -eq 0 ]; then echo "✅ all checks passed"; fi
exit $fail
