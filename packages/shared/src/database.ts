import type { z } from 'zod';

import type {
  abilityMirrorRowSchema,
  auditLogRowSchema,
  banditStateRowSchema,
  escalationConfigRowSchema,
  escalationRowSchema,
  eventRowSchema,
  flagRowSchema,
  medicationRowSchema,
  memoRowSchema,
  pairingTokenRowSchema,
  patientMemberRowSchema,
  patientRowSchema,
  peopleRowSchema,
  reminderEventRowSchema,
  reportRowSchema,
  routineItemRowSchema,
  sessionRowSchema,
} from './schemas.ts';

/** A value that can be stored in a Postgres json/jsonb column. */
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export type Patient = z.infer<typeof patientRowSchema>;
export type PatientMember = z.infer<typeof patientMemberRowSchema>;
export type PairingToken = z.infer<typeof pairingTokenRowSchema>;
export type AuditLog = z.infer<typeof auditLogRowSchema>;
export type Person = z.infer<typeof peopleRowSchema>;
export type Medication = z.infer<typeof medicationRowSchema>;
export type RoutineItem = z.infer<typeof routineItemRowSchema>;
export type EscalationConfig = z.infer<typeof escalationConfigRowSchema>;
export type Session = z.infer<typeof sessionRowSchema>;
export type Event = z.infer<typeof eventRowSchema>;
export type ReminderEvent = z.infer<typeof reminderEventRowSchema>;
export type Memo = z.infer<typeof memoRowSchema>;
export type Escalation = z.infer<typeof escalationRowSchema>;
export type AbilityMirror = z.infer<typeof abilityMirrorRowSchema>;
export type Flag = z.infer<typeof flagRowSchema>;
export type BanditState = z.infer<typeof banditStateRowSchema>;
export type Report = z.infer<typeof reportRowSchema>;

export type PatientRole = PatientMember['role'];
export type CognitiveDomain = Event['domain'];
export type ReminderOutcome = NonNullable<ReminderEvent['outcome']>;
export type ReminderChannel = ReminderEvent['channel'];
export type EscalationStatus = Escalation['status'];
export type EscalationSource = Escalation['source'];
export type FlagType = Flag['type'];
export type FlagSeverity = Flag['severity'];
export type FlagStatus = Flag['status'];

export type PatientInsert = {
  id?: string;
  display_name: string;
  age: number;
  education_years?: number;
  lang_code?: string;
  script?: string;
  timezone?: string;
  content_version?: number;
  lang_pack_version?: number;
  device_user_id?: string | null;
  device_last_seen_at?: string | null;
  device_pending_events?: number | null;
  device_app_version?: string | null;
  clock_skew_ms?: number | null;
  consent_given_at?: string | null;
  active_flag_count?: number;
  created_by?: string | null;
  created_at?: string;
  archived_at?: string | null;
};

export type PatientMemberInsert = {
  patient_id: string;
  user_id: string;
  role: PatientRole;
  invited_by?: string | null;
  created_at?: string;
};

export type PairingTokenInsert = {
  token: string;
  patient_id: string;
  created_by: string;
  expires_at: string;
  consumed?: boolean;
  consumed_at?: string | null;
  attempts?: number;
  created_at?: string;
};

export type AuditLogInsert = {
  id?: number;
  patient_id?: string | null;
  actor?: string | null;
  action: string;
  detail?: Json | null;
  created_at?: string;
};

export type PersonInsert = {
  id?: string;
  patient_id: string;
  name: string;
  relationship: string;
  photo_path: string;
  voice_path?: string | null;
  memory_prompt?: string | null;
  is_deceased?: boolean;
  sort_order?: number;
  created_at?: string;
};

export type MedicationInsert = {
  id?: string;
  patient_id: string;
  name: string;
  dose: string;
  pill_photo_path?: string | null;
  voice_path?: string | null;
  window_start_min: number;
  window_end_min: number;
  chosen_time_min: number;
  days_of_week?: string;
  active?: boolean;
  created_at?: string;
};

export type RoutineItemInsert = {
  id?: string;
  patient_id: string;
  time_min: number;
  label_key: string;
  icon_asset: string;
  created_at?: string;
};

export type EscalationConfigInsert = {
  patient_id: string;
  steps?: Json;
  primary_name: string;
  primary_phone: string;
  secondary_name?: string | null;
  secondary_phone?: string | null;
  updated_at?: string;
};

export type SessionInsert = {
  id: string;
  patient_id: string;
  started_at: number;
  ended_at?: number | null;
  game_ids: string;
  completed?: boolean;
  abandoned_at_ms?: number | null;
  demo_replays?: number;
  server_received_at?: string;
};

export type EventInsert = {
  id: string;
  patient_id: string;
  session_id: string;
  game_id: string;
  domain: CognitiveDomain;
  item_id: string;
  item_difficulty: number;
  theta_before: number;
  correct: boolean;
  initiation_ms: number;
  movement_ms: number;
  response_time_ms: number;
  chosen_id?: string | null;
  error_class?: string | null;
  trial_index: number;
  trial_context?: string | null;
  hint_level?: number;
  metrics?: Json | null;
  ts: number;
  hour_of_day: number;
  tz_offset_min: number;
  server_received_at?: string;
};

export type ReminderEventInsert = {
  id: string;
  patient_id: string;
  medication_id: string;
  scheduled_at: number;
  fired_at?: number | null;
  responded_at?: number | null;
  outcome?: ReminderOutcome | null;
  channel: ReminderChannel;
  ladder_step: number;
  server_received_at?: string;
};

export type MemoInsert = {
  id: string;
  patient_id: string;
  storage_path: string;
  duration_ms: number;
  recorded_at: number;
  context_tag?: string | null;
  transcript?: string | null;
  read_at?: string | null;
  server_received_at?: string;
};

export type EscalationInsert = {
  id: string;
  patient_id: string;
  reminder_event_id?: string | null;
  medication_id?: string | null;
  step: number;
  status?: EscalationStatus;
  reason?: string | null;
  twilio_sid?: string | null;
  requested_at: number;
  not_before?: string;
  executed_at?: string | null;
  source?: EscalationSource;
  created_at?: string;
};

export type AbilityMirrorInsert = {
  patient_id: string;
  domain: string;
  theta: number;
  n_trials: number;
  rt_mean_log?: number | null;
  rt_var?: number | null;
  updated_at?: string;
};

export type FlagInsert = {
  id?: string;
  patient_id: string;
  type: FlagType;
  domains?: string[];
  severity: FlagSeverity;
  changepoint_date?: string | null;
  z_scores?: Json | null;
  evidence_session_ids?: string[] | null;
  baseline_window?: string | null;
  recent_window?: string | null;
  confidence?: number | null;
  status?: FlagStatus;
  created_at?: string;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
};

export type BanditStateInsert = {
  medication_id: string;
  patient_id: string;
  posteriors?: Json;
  last_decay_at?: string;
  updated_at?: string;
};

export type ReportInsert = {
  id?: string;
  patient_id: string;
  storage_path: string;
  months: number;
  generated_by?: string | null;
  created_at?: string;
};

export type PatientUpdate = Partial<PatientInsert>;
export type PatientMemberUpdate = Partial<PatientMemberInsert>;
export type PairingTokenUpdate = Partial<PairingTokenInsert>;
export type AuditLogUpdate = Partial<AuditLogInsert>;
export type PersonUpdate = Partial<PersonInsert>;
export type MedicationUpdate = Partial<MedicationInsert>;
export type RoutineItemUpdate = Partial<RoutineItemInsert>;
export type EscalationConfigUpdate = Partial<EscalationConfigInsert>;
export type SessionUpdate = Partial<SessionInsert>;
export type EventUpdate = Partial<EventInsert>;
export type ReminderEventUpdate = Partial<ReminderEventInsert>;
export type MemoUpdate = Partial<MemoInsert>;
export type EscalationUpdate = Partial<EscalationInsert>;
export type AbilityMirrorUpdate = Partial<AbilityMirrorInsert>;
export type FlagUpdate = Partial<FlagInsert>;
export type BanditStateUpdate = Partial<BanditStateInsert>;
export type ReportUpdate = Partial<ReportInsert>;

export type PatientContent = {
  version: number;
  lang_code: string;
  script: string;
  timezone: string;
  lang_pack_version: number;
  elder_name: string;
  age: number;
  education_years: number;
  people: Array<Pick<Person,
    | 'id'
    | 'name'
    | 'relationship'
    | 'photo_path'
    | 'voice_path'
    | 'memory_prompt'
    | 'is_deceased'
    | 'sort_order'>>;
  medications: Array<Pick<Medication,
    | 'id'
    | 'name'
    | 'dose'
    | 'pill_photo_path'
    | 'voice_path'
    | 'window_start_min'
    | 'window_end_min'
    | 'chosen_time_min'
    | 'days_of_week'
    | 'active'>>;
  routine: Array<Pick<RoutineItem, 'id' | 'time_min' | 'label_key' | 'icon_asset'>>;
  escalation: Pick<EscalationConfig,
    | 'steps'
    | 'primary_name'
    | 'primary_phone'
    | 'secondary_name'
    | 'secondary_phone'> | null;
};

export type DeviceHeartbeatResult = {
  server_time_ms: number;
  clock_skew_ms: number;
};

export type PatientOverview = {
  patient_id: string;
  display_name: string;
  role: PatientRole;
  played_today: boolean;
  session_minutes: number;
  meds_scheduled: number;
  meds_confirmed: number;
  active_flags: number;
  unread_memos: number;
  device_last_seen_at: string | null;
  device_status: 'never' | 'offline' | 'stale' | 'ok';
};

export type InviteMemberResult =
  | { status: 'added' }
  | { status: 'pending'; message: string };

type Relationship<
  ForeignKeyName extends string,
  Column extends string,
  IsOneToOne extends boolean,
  ReferencedRelation extends string,
  ReferencedColumn extends string,
> = {
  foreignKeyName: ForeignKeyName;
  columns: [Column];
  isOneToOne: IsOneToOne;
  referencedRelation: ReferencedRelation;
  referencedColumns: [ReferencedColumn];
};

type PatientRelationship<
  ForeignKeyName extends string,
  IsOneToOne extends boolean = false,
> = Relationship<ForeignKeyName, 'patient_id', IsOneToOne, 'patients', 'id'>;

type TableDefinition<Row, Insert, Update, Relationships extends unknown[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

/** Supabase client generic matching the current migration-defined schema. */
export type Database = {
  public: {
    Tables: {
      patients: TableDefinition<Patient, PatientInsert, PatientUpdate>;
      patient_members: TableDefinition<PatientMember, PatientMemberInsert, PatientMemberUpdate, [
        PatientRelationship<'patient_members_patient_id_fkey'>,
      ]>;
      pairing_tokens: TableDefinition<PairingToken, PairingTokenInsert, PairingTokenUpdate, [
        PatientRelationship<'pairing_tokens_patient_id_fkey'>,
      ]>;
      audit_log: TableDefinition<AuditLog, AuditLogInsert, AuditLogUpdate, [
        PatientRelationship<'audit_log_patient_id_fkey'>,
      ]>;
      people: TableDefinition<Person, PersonInsert, PersonUpdate, [
        PatientRelationship<'people_patient_id_fkey'>,
      ]>;
      medications: TableDefinition<Medication, MedicationInsert, MedicationUpdate, [
        PatientRelationship<'medications_patient_id_fkey'>,
      ]>;
      routine_items: TableDefinition<RoutineItem, RoutineItemInsert, RoutineItemUpdate, [
        PatientRelationship<'routine_items_patient_id_fkey'>,
      ]>;
      escalation_config: TableDefinition<EscalationConfig, EscalationConfigInsert, EscalationConfigUpdate, [
        PatientRelationship<'escalation_config_patient_id_fkey', true>,
      ]>;
      sessions: TableDefinition<Session, SessionInsert, SessionUpdate, [
        PatientRelationship<'sessions_patient_id_fkey'>,
      ]>;
      events: TableDefinition<Event, EventInsert, EventUpdate, [
        PatientRelationship<'events_patient_id_fkey'>,
      ]>;
      reminder_events: TableDefinition<ReminderEvent, ReminderEventInsert, ReminderEventUpdate, [
        PatientRelationship<'reminder_events_patient_id_fkey'>,
      ]>;
      memos: TableDefinition<Memo, MemoInsert, MemoUpdate, [
        PatientRelationship<'memos_patient_id_fkey'>,
      ]>;
      escalations: TableDefinition<Escalation, EscalationInsert, EscalationUpdate, [
        PatientRelationship<'escalations_patient_id_fkey'>,
      ]>;
      ability_mirror: TableDefinition<AbilityMirror, AbilityMirrorInsert, AbilityMirrorUpdate, [
        PatientRelationship<'ability_mirror_patient_id_fkey'>,
      ]>;
      flags: TableDefinition<Flag, FlagInsert, FlagUpdate, [
        PatientRelationship<'flags_patient_id_fkey'>,
      ]>;
      bandit_state: TableDefinition<BanditState, BanditStateInsert, BanditStateUpdate, [
        Relationship<'bandit_state_medication_id_fkey', 'medication_id', true, 'medications', 'id'>,
        PatientRelationship<'bandit_state_patient_id_fkey'>,
      ]>;
      reports: TableDefinition<Report, ReportInsert, ReportUpdate, [
        PatientRelationship<'reports_patient_id_fkey'>,
      ]>;
    };
    Views: Record<string, never>;
    Functions: {
      get_patient_content: {
        Args: { p_patient_id: string };
        Returns: PatientContent;
      };
      device_heartbeat: {
        Args: {
          p_patient_id: string;
          p_app_version: string;
          p_pending_events: number;
          p_device_time_ms: number;
        };
        Returns: DeviceHeartbeatResult;
      };
      create_patient: {
        Args: {
          p_name: string;
          p_age: number;
          p_education: number;
          p_lang: string;
          p_timezone?: string;
          p_primary_name?: string | null;
          p_primary_phone?: string | null;
        };
        Returns: string;
      };
      my_patients_overview: {
        Args: Record<string, never>;
        Returns: PatientOverview[];
      };
      invite_member: {
        Args: {
          p_patient_id: string;
          p_phone: string;
          p_role: 'family_viewer' | 'caregiver';
        };
        Returns: InviteMemberResult;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
