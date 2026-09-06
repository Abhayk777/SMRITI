begin;

insert into patients (
  id,
  display_name,
  age,
  education_years,
  lang_code,
  script,
  timezone
) values (
  'e4d6e934-f4a7-4afe-978b-9431b8e6b03c',
  'Test Patient',
  72,
  10,
  'en',
  'latin',
  'Asia/Kolkata'
);

insert into medications (
  id,
  patient_id,
  name,
  dose,
  window_start_min,
  window_end_min,
  chosen_time_min
) values (
  '23319d46-05e5-418b-91a4-c5a1f32f84b1',
  'e4d6e934-f4a7-4afe-978b-9431b8e6b03c',
  'Test Med',
  '1 tablet',
  450,
  510,
  480
);

-- Reserved fictional NANP number. Override only in the local database before
-- a live provider test; never commit a caregiver's personal phone number.
insert into escalation_config (
  patient_id,
  primary_name,
  primary_phone
) values (
  'e4d6e934-f4a7-4afe-978b-9431b8e6b03c',
  'Test Caregiver',
  '+919990659399'
);

commit;
