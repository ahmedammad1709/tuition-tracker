-- ============================================================================
--  Tuition Fee Tracker  ·  Neon PostgreSQL setup
--  Run this ONCE in the Neon dashboard:  Project -> SQL Editor  -> paste -> Run
--  Safe to re-run: every statement is idempotent.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Owner account + login sessions
-- ---------------------------------------------------------------------------
create table if not exists public.app_owner (
  id            boolean primary key default true check (id),
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.sessions (
  token_hash   text primary key,
  owner_id     boolean not null default true references public.app_owner(id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_seen_at timestamptz not null default now()
);
create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

-- ---------------------------------------------------------------------------
-- 2. Domain tables
-- ---------------------------------------------------------------------------
create table if not exists public.students (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  grade       text not null,
  parent_name text,
  phone       text,
  monthly_fee numeric(10,0) not null check (monthly_fee >= 0),
  join_date   date not null default current_date,
  status      text not null default 'active' check (status in ('active','left')),
  leave_date  date,
  notes       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.monthly_records (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  month      text not null check (month ~ '^\d{4}-\d{2}$'),
  fee_due    numeric(10,0) not null check (fee_due >= 0),
  unique (student_id, month)
);
create index if not exists monthly_records_month_idx on public.monthly_records (month);

create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  month      text not null check (month ~ '^\d{4}-\d{2}$'),
  amount     numeric(10,0) not null check (amount > 0),
  paid_on    date not null default current_date,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists payments_student_month_idx on public.payments (student_id, month);

-- ---------------------------------------------------------------------------
-- 3. Business-logic functions
--    (authorisation is enforced in the app server layer, not in SQL)
-- ---------------------------------------------------------------------------

-- Generate missing monthly fee snapshots (one row per student per month)
-- for every month a student was active, up to `_upto` (YYYY-MM).
create or replace function public.ensure_monthly_records(_upto text)
returns void language plpgsql as $$
begin
  insert into public.monthly_records(student_id, month, fee_due)
  select s.id, to_char(m, 'YYYY-MM'), s.monthly_fee
  from public.students s
  cross join lateral generate_series(
    date_trunc('month', s.join_date),
    least(
      to_date(_upto || '-01', 'YYYY-MM-DD'),
      coalesce(date_trunc('month', s.leave_date), to_date(_upto || '-01', 'YYYY-MM-DD'))
    ),
    interval '1 month') m
  on conflict (student_id, month) do nothing;

  -- Drop records that fall outside a student's active range, but only when no
  -- payment exists for that month (never destroy payment history).
  delete from public.monthly_records r using public.students s
  where r.student_id = s.id
    and (
      r.month < to_char(s.join_date, 'YYYY-MM')
      or (s.leave_date is not null and r.month > to_char(s.leave_date, 'YYYY-MM'))
    )
    and not exists (
      select 1 from public.payments p
      where p.student_id = r.student_id and p.month = r.month
    );
end $$;

-- Apply a fee change from a given month onward (past months keep their snapshot).
create or replace function public.apply_fee_from(_student uuid, _from text, _fee numeric)
returns void language plpgsql as $$
begin
  update public.monthly_records
     set fee_due = _fee
   where student_id = _student and month >= _from;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Lock the tables down (defence in depth)
--    The app authenticates every request in server code and connects as the
--    database owner, which bypasses RLS. With RLS enabled and NO policies,
--    any other role gets zero access. If you later create a restricted role
--    for the app, add explicit policies for the rows it may touch.
-- ---------------------------------------------------------------------------
alter table public.app_owner      enable row level security;
alter table public.sessions       enable row level security;
alter table public.students       enable row level security;
alter table public.monthly_records enable row level security;
alter table public.payments       enable row level security;
