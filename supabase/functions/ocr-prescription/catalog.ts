const MATCH_THRESHOLD = 0.85;
const MAX_NAME_LENGTH = 160;

const shardCache = new Map<string, string[]>();

export function normalizeMedicineName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\btab\.?\b/g, 'tablet')
    .replace(/\bcap\.?\b/g, 'capsule')
    .replace(/\bsyp\.?\b/g, 'syrup')
    .replace(/\binj\.?\b/g, 'injection')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function comparisonName(value: string): string {
  const dosageForms = new Set([
    'tablet', 'capsule', 'syrup', 'injection', 'suspension', 'solution', 'drops',
    'cream', 'gel', 'ointment', 'powder', 'spray', 'lotion', 'strip', 'bottle',
  ]);
  return normalizeMedicineName(value)
    .split(' ')
    .filter((token) => !dosageForms.has(token))
    .join(' ');
}

function numericTokens(value: string): string[] {
  return [...new Set(normalizeMedicineName(value).match(/\b\d+(?:\.\d+)?\b/g) ?? [])].sort();
}

function compatibleNumbers(extracted: string, candidate: string): boolean {
  const expected = numericTokens(extracted);
  if (expected.length === 0) return true;
  const actual = new Set(numericTokens(candidate));
  return expected.every((token) => actual.has(token));
}

export function similarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left || !right) return 0;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= right.length; j += 1) previous[j] = current[j];
  }

  return 1 - previous[right.length] / Math.max(left.length, right.length);
}

function shardFor(value: string): string {
  const prefix = normalizeMedicineName(value).replace(/[^a-z0-9]/g, '').slice(0, 2);
  return prefix.padEnd(2, '_') || '__';
}

async function readShard(shard: string): Promise<string[]> {
  const cached = shardCache.get(shard);
  if (cached) return cached;

  try {
    const compressed = await Deno.readFile(new URL(`./catalog/${shard}.json.gz`, import.meta.url));
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    const entries = JSON.parse(await new Response(stream).text());
    if (!Array.isArray(entries) || !entries.every((entry) => typeof entry === 'string')) {
      throw new Error('invalid medicine catalogue shard');
    }
    shardCache.set(shard, entries);
    return entries;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return [];
    throw error;
  }
}

export type CatalogueMatch = {
  name: string;
  confidence: number;
  recognized: boolean;
};

export function bestCatalogueMatch(extracted: string, entries: string[]): CatalogueMatch {
  const clean = extracted.trim().slice(0, MAX_NAME_LENGTH);
  const query = comparisonName(clean);
  if (!query) return { name: clean, confidence: 0, recognized: false };

  let bestName = clean;
  let bestScore = 0;

  for (const candidate of entries) {
    if (!compatibleNumbers(clean, candidate)) continue;
    const score = similarity(query, comparisonName(candidate));
    if (score > bestScore) {
      bestName = candidate;
      bestScore = score;
      if (score === 1) break;
    }
  }

  const confidence = Math.round(bestScore * 10_000) / 10_000;
  return confidence >= MATCH_THRESHOLD
    ? { name: bestName, confidence, recognized: true }
    : { name: clean, confidence, recognized: false };
}

export async function matchMedicineName(extracted: string): Promise<CatalogueMatch> {
  const entries = await readShard(shardFor(extracted));
  return bestCatalogueMatch(extracted, entries);
}

const FREQUENCY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bq\.?i\.?d\.?\b/gi, 'four times daily'],
  [/\bt\.?d\.?s\.?\b/gi, 'three times daily'],
  [/\bt\.?i\.?d\.?\b/gi, 'three times daily'],
  [/\bb\.?d\.?\b/gi, 'twice daily'],
  [/\bb\.?i\.?d\.?\b/gi, 'twice daily'],
  [/\bo\.?d\.?\b/gi, 'once daily'],
  [/\bs\.?o\.?s\.?\b/gi, 'as needed'],
  [/\bh\.?s\.?\b/gi, 'at bedtime'],
];

export function normalizeFrequency(value: string): string {
  return FREQUENCY_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    value.trim(),
  ).replace(/\s+/g, ' ');
}
