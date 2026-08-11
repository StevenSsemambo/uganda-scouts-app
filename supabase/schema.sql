-- =====================================================================
-- THE USA — Uganda Scouts Association App
-- Supabase schema (Postgres + Row Level Security)
--
-- HOW TO USE:
-- 1. Create a project at https://supabase.com
-- 2. Open the SQL Editor in your project dashboard
-- 3. Paste this entire file and click "Run"
-- 4. Copy your Project URL + anon public key into .env (see .env.example)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES  (extends Supabase auth.users with app-level role/info)
-- ---------------------------------------------------------------------
create type user_role as enum ('member', 'admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role user_role not null default 'member',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on profiles for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Helper function: is the current user an admin?
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------
-- 2. ID COUNTERS  (drives auto member-ID generation per district+year)
--    e.g. Jinja, 2026 -> J001, J002, J003 ...
-- ---------------------------------------------------------------------
create table id_counters (
  district_code text not null,
  year int not null,
  last_seq int not null default 0,
  primary key (district_code, year)
);

alter table id_counters enable row level security;
create policy "Authenticated users can read counters"
  on id_counters for select
  using (auth.role() = 'authenticated');

-- Atomically returns the next formatted member ID for a district+year,
-- e.g. next_member_id('J', 2026) -> 'J-2026-003'
create or replace function next_member_id(p_district_code text, p_year int)
returns text
language plpgsql
security definer
as $$
declare
  v_seq int;
begin
  insert into id_counters (district_code, year, last_seq)
  values (p_district_code, p_year, 1)
  on conflict (district_code, year)
  do update set last_seq = id_counters.last_seq + 1
  returning last_seq into v_seq;

  return p_district_code || '-' || p_year || '-' || lpad(v_seq::text, 3, '0');
end;
$$;

-- ---------------------------------------------------------------------
-- 3. MEMBERS  (core membership registry)
-- ---------------------------------------------------------------------
create type membership_type as enum ('Life', 'Annual');

create table members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  member_code text unique,               -- auto-generated e.g. J-2026-002
  full_name text not null,
  category text,                          -- per Association's reference document
  amount numeric(12,2) default 0,
  membership_type membership_type not null default 'Annual',
  district text not null,
  district_code text not null,
  year int not null default extract(year from now())::int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table members enable row level security;

create policy "Members can view own record"
  on members for select
  using (auth.uid() = user_id or is_admin());

create policy "Members can insert own record"
  on members for insert
  with check (auth.uid() = user_id);

create policy "Members can update own record"
  on members for update
  using (auth.uid() = user_id or is_admin());

create policy "Admins can delete records"
  on members for delete
  using (is_admin());

-- Auto-assign member_code + district_code on insert
create or replace function assign_member_code()
returns trigger
language plpgsql
as $$
begin
  if new.member_code is null then
    new.member_code := next_member_id(new.district_code, new.year);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_assign_member_code
  before insert on members
  for each row execute function assign_member_code();

create trigger trg_members_updated_at
  before update on members
  for each row execute function assign_member_code();

-- ---------------------------------------------------------------------
-- 4. PAYMENTS  (Option B — manual verification workflow)
-- ---------------------------------------------------------------------
create type payment_status as enum ('pending', 'verified', 'rejected');

create table payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  amount numeric(12,2) not null,
  purpose text not null default 'Registration Fee',  -- Registration, Subscription, Camp Fee, Donation
  payment_method text,                                -- Bank Deposit, MTN MoMo, Airtel Money, etc.
  reference_number text not null,
  payment_date date not null,
  year int not null default extract(year from now())::int,
  status payment_status not null default 'pending',
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now()
);

alter table payments enable row level security;

create policy "Members can view own payments"
  on payments for select
  using (
    exists (select 1 from members m where m.id = payments.member_id and m.user_id = auth.uid())
    or is_admin()
  );

create policy "Members can submit own payments"
  on payments for insert
  with check (
    exists (select 1 from members m where m.id = payments.member_id and m.user_id = auth.uid())
  );

create policy "Admins can update payments (verify/reject)"
  on payments for update
  using (is_admin());

-- ---------------------------------------------------------------------
-- 5. SIMPLE REFERENCE MODULES
--    Schools, Commissioners, Trainers, Scout Leaders, Rover Scouts,
--    Donors, District Leadership, District Subscriptions
--    Any authenticated user can submit; only admins can edit/delete.
-- ---------------------------------------------------------------------
create table schools (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id),
  school_name text not null,
  level text not null,          -- Primary, Secondary, Tertiary
  district text not null,
  year int not null default extract(year from now())::int,
  created_at timestamptz not null default now()
);

create table commissioners (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id),
  full_name text not null,
  district text not null,
  email text,
  year int not null default extract(year from now())::int,
  created_at timestamptz not null default now()
);

create table trainers (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id),
  full_name text not null,
  district text not null,
  year int not null default extract(year from now())::int,
  created_at timestamptz not null default now()
);

create table scout_leaders (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id),
  full_name text not null,
  district text not null,
  contact text,
  email text,
  year int not null default extract(year from now())::int,
  created_at timestamptz not null default now()
);

create table rover_scouts (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id),
  full_name text not null,
  district text not null,
  email text,
  contact text,
  year int not null default extract(year from now())::int,
  created_at timestamptz not null default now()
);

create table donors (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id),
  donor_name text not null,
  purpose text,
  in_charge_or_district text,
  year int not null default extract(year from now())::int,
  created_at timestamptz not null default now()
);

create table district_leadership (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id),
  full_name text not null,
  title text not null,
  district text not null,
  year int not null default extract(year from now())::int,
  created_at timestamptz not null default now()
);

create table district_subscriptions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id),
  district text not null,
  amount numeric(12,2) not null default 0,
  year int not null default extract(year from now())::int,
  created_at timestamptz not null default now()
);

-- Apply the same RLS pattern to every simple reference module
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'schools','commissioners','trainers','scout_leaders',
    'rover_scouts','donors','district_leadership','district_subscriptions'
  ]
  loop
    execute format('alter table %I enable row level security;', tbl);

    execute format(
      'create policy "Authenticated can view %1$s" on %1$I for select using (auth.role() = ''authenticated'');',
      tbl
    );
    execute format(
      'create policy "Authenticated can insert %1$s" on %1$I for insert with check (auth.role() = ''authenticated'');',
      tbl
    );
    execute format(
      'create policy "Admins can update %1$s" on %1$I for update using (is_admin());',
      tbl
    );
    execute format(
      'create policy "Admins can delete %1$s" on %1$I for delete using (is_admin());',
      tbl
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6. CAMP FEE RECORDS (fixed fee, tracked per member/year)
-- ---------------------------------------------------------------------
create table camp_fees (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  amount numeric(12,2) not null default 10000,
  year int not null default extract(year from now())::int,
  status payment_status not null default 'pending',
  reference_number text,
  payment_date date,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table camp_fees enable row level security;

create policy "Members can view own camp fees"
  on camp_fees for select
  using (
    exists (select 1 from members m where m.id = camp_fees.member_id and m.user_id = auth.uid())
    or is_admin()
  );

create policy "Members can submit own camp fees"
  on camp_fees for insert
  with check (
    exists (select 1 from members m where m.id = camp_fees.member_id and m.user_id = auth.uid())
  );

create policy "Admins can update camp fees"
  on camp_fees for update
  using (is_admin());

-- ---------------------------------------------------------------------
-- 7. Auto-create a profile row whenever a new auth user signs up
-- ---------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'member')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- Done. Next: create your first admin account by signing up normally,
-- then in the SQL editor run:
--   update profiles set role = 'admin' where email = 'youradmin@email.com';
-- ---------------------------------------------------------------------
