-- Growmated Command Center (personal) schema
-- Paste into Supabase SQL editor to create tables.

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  business_type text,
  country text,
  project_name text,
  phase text,
  status text,
  start_date date,
  expected_completion date,
  contract_value_usd numeric,
  amount_received numeric,
  amount_outstanding numeric,
  monthly_retainer_usd numeric,
  next_action text,
  next_action_due_date date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists pipeline (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  owner_name text,
  email text,
  industry text,
  country_city text,
  source text,
  outreach_status text,
  date_first_contacted date,
  last_follow_up_date date,
  next_follow_up_date date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists income (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  client text,
  invoice_number text,
  description text,
  amount numeric not null,
  status text,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  category text,
  description text,
  amount numeric not null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists time_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  hours_9to5 numeric,
  hours_growmated numeric,
  project_task text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  monthly_revenue_target_usd numeric default 0,
  monthly_growmated_hours_target numeric default 0,
  new_clients_target_per_quarter int default 0,
  current_quarter_focus text,
  month1_goals text,
  month2_goals text,
  month3_goals text,
  parking_lot jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
