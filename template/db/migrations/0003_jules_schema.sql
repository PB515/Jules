-- 0003_jules_schema — Project Jules core data model.
-- Source: docs/project-spec.md §5. Two deliberate deviations from the spec's
-- literal field list, logged here per the "reconcile-to-reality" convention:
--   1. students.season_joules / lifetime_joules are NOT stored columns. Spec §5
--      lists them as fields, but §5/§11 also says JouleTransaction is the ledger
--      of record and totals are "derived by summing it... never a mutated
--      balance column" (CLAUDE.md decision 5). The stronger, more explicit rule
--      wins: totals are computed on read (see 0004_jules_functions.sql), closing
--      a self-consistency gap in the spec rather than picking one reading silently.
--   2. events.qr_code_token / qr_token_expires_at are NOT stored either. A
--      deterministic HMAC-over-time-epoch (0004) rotates the token without a
--      mutable column, a cron, or write contention across serverless instances —
--      strictly stronger than a column a background job forgets to refresh.

-- migrate:up

create extension if not exists pgcrypto;

create table if not exists institution_settings (
  id              boolean primary key default true,
  allowed_domains text[] not null default array['yourcollege.edu'], -- PLACEHOLDER, see CLAUDE.md decision 10
  updated_at      timestamptz not null default now(),
  constraint institution_settings_singleton check (id)
);

create table if not exists app_secrets (
  key   text primary key,
  value text not null
);
alter table app_secrets enable row level security;

create table if not exists students (
  id                uuid primary key references auth.users(id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 120),
  college_email     text not null unique,
  phone             text,
  status            text not null default 'active' check (status in ('active', 'locked')),
  streak_days       integer not null default 0,
  last_active_date  date,
  created_at        timestamptz not null default now()
);
create index if not exists idx_students_college_email on students (lower(college_email));

create table if not exists admins (
  id                 uuid primary key references auth.users(id) on delete cascade,
  name               text not null check (char_length(name) between 1 and 120),
  email              text not null unique,
  role               text not null check (role in ('owner', 'officer', 'volunteer')),
  volunteer_event_id uuid,
  created_at         timestamptz not null default now()
);

create table if not exists seasons (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  start_date date not null,
  end_date   date not null,
  cadence    text not null check (cadence in ('semester', 'trimester', 'annual', 'custom')),
  created_at timestamptz not null default now(),
  constraint seasons_dates_valid check (end_date > start_date)
);
create index if not exists idx_seasons_range on seasons (start_date, end_date);

create table if not exists events (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(name) between 1 and 160),
  type               text not null check (type in ('standard_meeting', 'expert_session', 'volunteer_task', 'surge')),
  event_date         timestamptz not null,
  end_date           timestamptz,
  location           text,
  joule_value        integer check (joule_value in (10, 25, 50)),
  geofence_lat       double precision,
  geofence_lng       double precision,
  geofence_radius_m  integer not null default 150,
  created_by         uuid references admins(id),
  created_at         timestamptz not null default now(),
  constraint events_joule_value_shape check (
    (type = 'surge' and joule_value is null) or
    (type <> 'surge' and joule_value is not null)
  )
);
create index if not exists idx_events_date on events (event_date);

alter table admins
  add constraint admins_volunteer_event_fk foreign key (volunteer_event_id) references events(id);

create table if not exists surges (
  id                   uuid primary key default gen_random_uuid(),
  event_id             uuid references events(id),
  name                 text not null check (char_length(name) between 1 and 160),
  season_id            uuid references seasons(id),
  status               text not null default 'draft' check (status in ('draft', 'live', 'complete')),
  points_per_question  integer not null default 20 check (points_per_question > 0),
  starts_at            timestamptz,
  ends_at              timestamptz,
  created_by           uuid references admins(id),
  created_at           timestamptz not null default now()
);

create table if not exists questions (
  id                 uuid primary key default gen_random_uuid(),
  surge_id           uuid not null references surges(id) on delete cascade,
  text               text not null check (char_length(text) <= 280),
  option_a           text not null check (char_length(option_a) <= 80),
  option_b           text not null check (char_length(option_b) <= 80),
  option_c           text not null check (char_length(option_c) <= 80),
  option_d           text not null check (char_length(option_d) <= 80),
  correct_option     text not null check (correct_option in ('A', 'B', 'C', 'D')),
  time_limit_seconds integer not null default 15,
  time_limit_flagged boolean not null default false,
  tag                text,
  order_index        integer not null default 0,
  created_at         timestamptz not null default now(),
  unique (surge_id, text)
);
create index if not exists idx_questions_surge on questions (surge_id, order_index);

create table if not exists joule_transactions (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references students(id) on delete cascade,
  event_id         uuid references events(id),
  surge_id         uuid references surges(id),
  question_id      uuid references questions(id),
  amount           integer not null,
  type             text not null check (type in ('event_scan', 'surge_correct_answer', 'admin_manual_adjustment')),
  response_time_ms integer,
  flagged_geofence boolean not null default false,
  created_by_admin uuid references admins(id),
  created_at       timestamptz not null default now()
);
create unique index if not exists uq_one_scan_per_student_event
  on joule_transactions (student_id, event_id) where type = 'event_scan';
create unique index if not exists uq_one_answer_per_student_question
  on joule_transactions (student_id, question_id) where type = 'surge_correct_answer';
create index if not exists idx_joule_tx_student on joule_transactions (student_id, created_at);
create index if not exists idx_joule_tx_surge on joule_transactions (surge_id) where surge_id is not null;

-- Records EVERY answer attempt (correct or not) so "one submission per question
-- per student" (spec §11) holds regardless of outcome. joule_transactions only
-- ever gets a row for CORRECT answers (the ledger stays a record of earned
-- Joules, not of attempts) — this table is the separate rate-limit record.
create table if not exists surge_answers (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references students(id) on delete cascade,
  question_id      uuid not null references questions(id) on delete cascade,
  selected_option  text not null check (selected_option in ('A', 'B', 'C', 'D')),
  correct          boolean not null,
  response_time_ms integer,
  created_at       timestamptz not null default now(),
  unique (student_id, question_id)
);
create index if not exists idx_surge_answers_student on surge_answers (student_id);

create table if not exists audit_log_entries (
  id                uuid primary key default gen_random_uuid(),
  admin_id          uuid references admins(id),
  action            text not null check (action in ('force_reset', 'manual_joule_adjustment', 'csv_import', 'role_change')),
  target_student_id uuid references students(id),
  details           jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists idx_audit_log_target on audit_log_entries (target_student_id);

-- migrate:down

drop table if exists audit_log_entries;
drop table if exists surge_answers;
drop table if exists joule_transactions;
drop table if exists questions;
drop table if exists surges;
alter table if exists admins drop constraint if exists admins_volunteer_event_fk;
drop table if exists events;
drop table if exists seasons;
drop table if exists admins;
drop table if exists students;
drop table if exists app_secrets;
drop table if exists institution_settings;
