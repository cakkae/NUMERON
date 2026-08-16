create type public.tax_period_status as enum ('open', 'locked');

create table public.tax_periods (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  year smallint not null check (year between 2000 and 2100),
  month smallint not null check (month between 1 and 12),
  status public.tax_period_status not null default 'open',
  created_at timestamptz not null default now(),
  unique (company_id, year, month)
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  address text not null check (char_length(trim(address)) > 0),
  vat_number text not null check (vat_number ~ '^[0-9]{12}$'),
  jib text not null check (jib ~ '^[0-9]{13}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, vat_number)
);

create table public.purchase_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  tax_period_id uuid not null references public.tax_periods(id) on delete restrict,
  partner_id uuid not null references public.partners(id) on delete restrict,
  invoice_number text not null check (char_length(trim(invoice_number)) > 0),
  invoice_date date not null,
  amount numeric(14, 2) not null check (amount >= 0),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (company_id, invoice_number, is_archived)
);

create index tax_periods_company_id_idx on public.tax_periods(company_id, year desc, month desc);
create index partners_company_name_idx on public.partners(company_id, name);
create index purchase_entries_company_period_idx on public.purchase_entries(company_id, tax_period_id, invoice_date desc);

create function public.can_manage_company(target_company_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.can_edit_company(target_company_id);
$$;
create function public.is_tax_period_open(target_tax_period_id uuid, target_company_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tax_periods where id = target_tax_period_id and company_id = target_company_id and status = 'open');
$$;
create function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create function public.assert_company_context() returns trigger language plpgsql security definer set search_path = public as $$
declare
  expected_workspace_id uuid;
begin
  select workspace_id into expected_workspace_id from public.companies where id = new.company_id;
  if expected_workspace_id is null or expected_workspace_id <> new.workspace_id then
    raise exception 'Company does not belong to workspace';
  end if;
  if tg_table_name = 'purchase_entries' and not exists (
    select 1 from public.tax_periods where id = new.tax_period_id and company_id = new.company_id
  ) then raise exception 'Tax period does not belong to company'; end if;
  if tg_table_name = 'purchase_entries' and not exists (
    select 1 from public.partners where id = new.partner_id and company_id = new.company_id
  ) then raise exception 'Partner does not belong to company'; end if;
  return new;
end;
$$;
create function public.write_audit_event() returns trigger language plpgsql security definer set search_path = public as $$
declare
  record_workspace_id uuid;
  record_company_id uuid;
  record_id uuid;
begin
  if tg_op = 'DELETE' then
    record_workspace_id := old.workspace_id;
    record_company_id := old.company_id;
    record_id := old.id;
  else
    record_workspace_id := new.workspace_id;
    record_company_id := new.company_id;
    record_id := new.id;
  end if;
  insert into public.audit_events (workspace_id, company_id, user_id, action, entity_type, entity_id, metadata)
  values (record_workspace_id, record_company_id, auth.uid(), lower(tg_op), tg_table_name, record_id, '{}'::jsonb);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger partners_set_updated_at before update on public.partners for each row execute function public.set_updated_at();
create trigger purchase_entries_set_updated_at before update on public.purchase_entries for each row execute function public.set_updated_at();
create trigger tax_periods_company_context before insert or update on public.tax_periods for each row execute function public.assert_company_context();
create trigger partners_company_context before insert or update on public.partners for each row execute function public.assert_company_context();
create trigger purchase_entries_company_context before insert or update on public.purchase_entries for each row execute function public.assert_company_context();
create trigger tax_periods_audit after insert or update or delete on public.tax_periods for each row execute function public.write_audit_event();
create trigger partners_audit after insert or update or delete on public.partners for each row execute function public.write_audit_event();
create trigger purchase_entries_audit after insert or update or delete on public.purchase_entries for each row execute function public.write_audit_event();

alter table public.tax_periods enable row level security;
alter table public.partners enable row level security;
alter table public.purchase_entries enable row level security;

create policy "users read assigned company tax periods" on public.tax_periods for select using (public.has_company_access(company_id));
create policy "owners manage assigned company tax periods" on public.tax_periods for all using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
create policy "users read assigned company partners" on public.partners for select using (public.has_company_access(company_id));
create policy "owners manage assigned company partners" on public.partners for all using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
create policy "users read assigned company purchases" on public.purchase_entries for select using (public.has_company_access(company_id));
create policy "owners manage purchases in open periods" on public.purchase_entries for all using (
  public.can_manage_company(company_id) and public.is_tax_period_open(tax_period_id, company_id)
) with check (
  public.can_manage_company(company_id) and public.is_tax_period_open(tax_period_id, company_id)
);
