import type { SupabaseClient } from '@supabase/supabase-js';

import { createAnonClient } from './supabase.ts';
import { sendSms } from './twilio.ts';
import type { PairingDeviceMetadata, PairingResult } from './types.ts';

export async function provisionDevice(
  admin: SupabaseClient,
  patientId: string,
  metadata: PairingDeviceMetadata = {},
): Promise<PairingResult> {
  const { data: patient, error: patientError } = await admin
    .from('patients')
    .select('id, display_name, lang_code, age, education_years, device_user_id')
    .eq('id', patientId)
    .single();

  if (patientError || !patient) {
    console.error('Pairing patient lookup failed', patientError);
    throw new Error('patient not found');
  }

  let replacementPhone: string | null = null;
  if (patient.device_user_id) {
    const oldDeviceUserId = patient.device_user_id;
    const { error: deleteError } = await admin.auth.admin.deleteUser(oldDeviceUserId);
    if (deleteError) {
      console.error('Existing device revocation failed', deleteError);
      throw new Error('could not revoke existing device');
    }

    const { error: auditError } = await admin.from('audit_log').insert({
      patient_id: patientId,
      action: 'device_replaced',
      detail: { old: oldDeviceUserId },
    });
    if (auditError) {
      console.error('Device replacement audit failed', auditError);
      throw new Error('could not audit device replacement');
    }

    const { data: config, error: configError } = await admin
      .from('escalation_config')
      .select('primary_phone')
      .eq('patient_id', patientId)
      .maybeSingle();
    if (configError) console.error('Replacement contact lookup failed', configError);
    replacementPhone = config?.primary_phone ?? null;
  }

  const email = `device.${patientId}.${crypto.randomUUID()}@smriti.internal`;
  const password = crypto.randomUUID() + crypto.randomUUID();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { is_device: true, patient_id: patientId },
  });
  if (createError || !created.user) {
    console.error('Device auth user creation failed', createError);
    throw new Error('could not create device user');
  }

  const deviceUserId = created.user.id;
  const anon = createAnonClient();
  const { data: signedIn, error: signInError } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signedIn.session) {
    await admin.auth.admin.deleteUser(deviceUserId);
    console.error('Device auth sign-in failed', signInError);
    throw new Error('could not create device session');
  }

  const pairedAt = new Date();
  const clockSkewMs = metadata.device_time_ms === undefined
    ? null
    : metadata.device_time_ms - pairedAt.getTime();
  const { error: bindError } = await admin
    .from('patients')
    .update({
      device_user_id: deviceUserId,
      device_last_seen_at: pairedAt.toISOString(),
      device_pending_events: 0,
      // An existing tablet can send its version immediately. Older builds are
      // honest about not reporting it yet; their first heartbeat replaces this.
      device_app_version: metadata.app_version ?? 'Awaiting first sync',
      clock_skew_ms: clockSkewMs,
    })
    .eq('id', patientId);
  if (bindError) {
    await admin.auth.admin.deleteUser(deviceUserId);
    console.error('Device binding failed', bindError);
    throw new Error('could not bind device');
  }

  if (replacementPhone) {
    await sendSms(
      replacementPhone,
      `A new tablet was set up for ${patient.display_name} today.`,
    );
  }

  return {
    refresh_token: signedIn.session.refresh_token,
    patient_id: patient.id,
    device_user_id: deviceUserId,
    lang_code: patient.lang_code,
    elder_name: patient.display_name,
    age: patient.age,
    education_years: patient.education_years,
  };
}
