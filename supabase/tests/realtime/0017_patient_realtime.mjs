import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'

import { createClient } from '@supabase/supabase-js'

const local = JSON.parse(
  execFileSync('npx', ['supabase', 'status', '--output', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
)

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}

const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, clientOptions)
const browserA = createClient(local.API_URL, local.ANON_KEY, clientOptions)
const browserB = createClient(local.API_URL, local.ANON_KEY, clientOptions)

const password = `Int02-${crypto.randomUUID()}-Aa1!`
const patientA = crypto.randomUUID()
const patientB = crypto.randomUUID()
const flagA = crypto.randomUUID()
const memoA = crypto.randomUUID()

const must = (result, action) => {
  if (result.error) throw new Error(`${action}: ${result.error.message}`)
  return result.data
}

const waitFor = async (predicate, message, timeoutMs = 10_000) => {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error(typeof message === 'function' ? message() : message)
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

const subscribe = (client, pid, received) => {
  const record = (table, payload) => {
    const row = payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old
    received.push({
      table,
      event: payload.eventType,
      patientId: table === 'patients' ? row.id : row.patient_id,
    })
  }

  const channel = client
    .channel(`int02-${pid}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'patients', filter: `id=eq.${pid}` },
      (payload) => record('patients', payload),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'flags', filter: `patient_id=eq.${pid}` },
      (payload) => record('flags', payload),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'memos', filter: `patient_id=eq.${pid}` },
      (payload) => record('memos', payload),
    )

  const ready = new Promise((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve()
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reject(new Error(`realtime subscription failed: ${status}`))
      }
    })
  })

  return { channel, ready }
}

test('patient-scoped realtime delivers refresh signals without cross-patient events', async () => {
  const suffix = crypto.randomUUID()
  const emailA = `int02-a-${suffix}@test.local`
  const emailB = `int02-b-${suffix}@test.local`
  let userA
  let userB
  let channelA
  let channelB

  try {
    userA = must(
      await admin.auth.admin.createUser({ email: emailA, password, email_confirm: true }),
      'create user A',
    ).user
    userB = must(
      await admin.auth.admin.createUser({ email: emailB, password, email_confirm: true }),
      'create user B',
    ).user

    must(
      await admin.from('patients').insert([
        {
          id: patientA,
          display_name: 'INT02 Patient A',
          age: 70,
          education_years: 10,
          created_by: userA.id,
        },
        {
          id: patientB,
          display_name: 'INT02 Patient B',
          age: 71,
          education_years: 10,
          created_by: userB.id,
        },
      ]),
      'create patients',
    )
    must(
      await admin.from('patient_members').insert([
        { patient_id: patientA, user_id: userA.id, role: 'caregiver' },
        { patient_id: patientB, user_id: userB.id, role: 'caregiver' },
      ]),
      'create memberships',
    )

    must(await browserA.auth.signInWithPassword({ email: emailA, password }), 'sign in A')
    must(await browserB.auth.signInWithPassword({ email: emailB, password }), 'sign in B')

    const receivedA = []
    const receivedB = []
    const subscriptionA = subscribe(browserA, patientA, receivedA)
    const subscriptionB = subscribe(browserB, patientB, receivedB)
    channelA = subscriptionA.channel
    channelB = subscriptionB.channel
    await Promise.all([subscriptionA.ready, subscriptionB.ready])
    // A freshly reset local stack can acknowledge the websocket join just
    // before its Postgres CDC process has attached to the publication. The
    // current Realtime image may need a couple of seconds to finish that first
    // attachment; without this, an otherwise healthy first run is flaky.
    await new Promise((resolve) => setTimeout(resolve, 2_500))

    must(
      await admin
        .from('patients')
        .update({ device_last_seen_at: new Date().toISOString(), device_pending_events: 2 })
        .eq('id', patientA),
      'emit patient update',
    )
    must(
      await admin.from('flags').insert({
        id: flagA,
        patient_id: patientA,
        type: 'decline',
        severity: 'moderate',
        status: 'active',
      }),
      'insert flag',
    )
    must(
      await admin.from('memos').insert({
        id: memoA,
        patient_id: patientA,
        storage_path: `${patientA}/memo.webm`,
        duration_ms: 1_000,
        recorded_at: Date.now(),
      }),
      'insert memo',
    )

    await waitFor(
      () =>
        receivedA.some((item) => item.table === 'patients' && item.event === 'UPDATE') &&
        receivedA.some((item) => item.table === 'flags' && item.event === 'INSERT') &&
        receivedA.some((item) => item.table === 'memos' && item.event === 'INSERT'),
      () =>
        `patient A did not receive all expected realtime events: ${JSON.stringify(receivedA)}`,
    )

    must(
      await browserA
        .from('flags')
        .update({ status: 'acknowledged', acknowledged_at: new Date(0).toISOString() })
        .eq('id', flagA),
      'acknowledge flag',
    )
    await waitFor(
      () => receivedA.some((item) => item.table === 'flags' && item.event === 'UPDATE'),
      'patient A did not receive the flag acknowledgement event',
    )

    const acknowledged = must(
      await admin.from('flags').select('acknowledged_by').eq('id', flagA).single(),
      'read acknowledged actor',
    )
    assert.equal(acknowledged.acknowledged_by, userA.id)

    await new Promise((resolve) => setTimeout(resolve, 500))
    assert.ok(receivedA.every((item) => item.patientId === patientA))
    assert.ok(receivedB.every((item) => item.patientId === patientB))
  } finally {
    await Promise.allSettled([
      channelA ? browserA.removeChannel(channelA) : Promise.resolve(),
      channelB ? browserB.removeChannel(channelB) : Promise.resolve(),
    ])
    await Promise.allSettled([browserA.auth.signOut(), browserB.auth.signOut()])
    browserA.realtime.disconnect()
    browserB.realtime.disconnect()
    await admin.from('patients').delete().in('id', [patientA, patientB])
    if (userA) await admin.auth.admin.deleteUser(userA.id)
    if (userB) await admin.auth.admin.deleteUser(userB.id)
  }
})
