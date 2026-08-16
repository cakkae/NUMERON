create extension if not exists "pgcrypto";

create type public.workspace_role as enum ('owner', 'accountant', 'viewer');
create type public.company_role as enum ('manager', 'editor', 'viewer');
create type public.company_status as enum ('active', 'archived');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now()
);
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'accountant',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  vat_number text not null check (char_length(trim(vat_number)) > 0),
  address text,
  status public.company_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (workspace_id, vat_number)
);
create table public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.company_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid references public.companies(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (char_length(trim(action)) > 0),
  entity_type text not null check (char_length(trim(entity_type)) > 0),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index companies_workspace_id_idx on public.companies(workspace_id);
create index audit_events_company_id_idx on public.audit_events(company_id, created_at desc);

-- SECURITY DEFINER avoids policy recursion; membership rows are owner-managed.
create function public.is_workspace_member(target_workspace_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = target_workspace_id and user_id = auth.uid());
$$;
create function public.is_workspace_owner(target_workspace_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = target_workspace_id and user_id = auth.uid() and role = 'owner');
$$;
create function public.has_company_access(target_company_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.company_members where company_id = target_company_id and user_id = auth.uid());
$$;
create function public.can_edit_company(target_company_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.company_members where company_id = target_company_id and user_id = auth.uid() and role in ('manager', 'editor'));
$$;
create function public.is_workspace_owner_for_company(target_company_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.companies
    join public.workspace_members on workspace_members.workspace_id = companies.workspace_id
    where companies.id = target_company_id and workspace_members.user_id = auth.uid() and workspace_members.role = 'owner'
  );
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.audit_events enable row level security;
create policy "workspace members can read their workspace" on public.workspaces for select using (public.is_workspace_member(id));
create policy "owners can update their workspace" on public.workspaces for update using (public.is_workspace_owner(id)) with check (public.is_workspace_owner(id));
create policy "members can read workspace membership" on public.workspace_members for select using (user_id = auth.uid() or public.is_workspace_owner(workspace_id));
create policy "owners manage workspace members" on public.workspace_members for all using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy "users read assigned companies" on public.companies for select using (public.has_company_access(id));
create policy "owners create companies" on public.companies for insert with check (public.is_workspace_owner(workspace_id));
create policy "editors update assigned companies" on public.companies for update using (public.can_edit_company(id)) with check (public.can_edit_company(id));
create policy "users read memberships for assigned companies" on public.company_members for select using (user_id = auth.uid() or public.has_company_access(company_id));
create policy "workspace owners manage company memberships" on public.company_members for all using (public.is_workspace_owner_for_company(company_id)) with check (public.is_workspace_owner_for_company(company_id));
create policy "users read audit events for assigned companies" on public.audit_events for select using (company_id is not null and public.has_company_access(company_id));
create policy "assigned users create own audit events" on public.audit_events for insert with check (user_id = auth.uid() and company_id is not null and public.has_company_access(company_id));
