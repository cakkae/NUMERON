alter table public.purchase_entries
  add column document_type text not null default '01'
  check (document_type in ('01','02','03','04','05','06','07','08','09'));

create table public.sales_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  tax_period_id uuid not null references public.tax_periods(id) on delete restrict,
  partner_id uuid not null references public.partners(id) on delete restrict,
  document_type text not null check (document_type in ('01','02','03','04','05','06','07','08','09')),
  invoice_number text not null check (char_length(trim(invoice_number)) > 0),
  invoice_date date not null,
  amount numeric(14, 2) not null check (amount >= 0),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (company_id, invoice_number, is_archived)
);

create index sales_entries_company_period_idx on public.sales_entries(company_id, tax_period_id, invoice_date desc);

create function public.assert_book_entry_context() returns trigger language plpgsql security definer set search_path = public as $$
declare
  period_year smallint;
  period_month smallint;
begin
  perform 1 from public.companies where id = new.company_id and workspace_id = new.workspace_id;
  if not found then raise exception 'Company does not belong to workspace'; end if;
  select year, month into period_year, period_month from public.tax_periods where id = new.tax_period_id and company_id = new.company_id;
  if period_year is null then raise exception 'Tax period does not belong to company'; end if;
  if extract(year from new.invoice_date) <> period_year or extract(month from new.invoice_date) <> period_month then
    raise exception 'Invoice date is outside tax period';
  end if;
  perform 1 from public.partners where id = new.partner_id and company_id = new.company_id;
  if not found then raise exception 'Partner does not belong to company'; end if;
  return new;
end;
$$;

drop trigger purchase_entries_company_context on public.purchase_entries;
create trigger purchase_entries_company_context before insert or update on public.purchase_entries for each row execute function public.assert_book_entry_context();
create trigger sales_entries_company_context before insert or update on public.sales_entries for each row execute function public.assert_book_entry_context();
create trigger sales_entries_set_updated_at before update on public.sales_entries for each row execute function public.set_updated_at();
create trigger sales_entries_audit after insert or update or delete on public.sales_entries for each row execute function public.write_audit_event();

create function public.guard_ready_for_export() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'ready_for_export' and old.status <> 'ready_for_export' and exists (
    select 1 from (
      select company_id, tax_period_id, partner_id, document_type, invoice_number, invoice_date, amount from public.purchase_entries where tax_period_id = new.id and not is_archived
      union all
      select company_id, tax_period_id, partner_id, document_type, invoice_number, invoice_date, amount from public.sales_entries where tax_period_id = new.id and not is_archived
    ) entries
    left join public.partners on partners.id = entries.partner_id and partners.company_id = entries.company_id
    where entries.company_id <> new.company_id or entries.tax_period_id <> new.id
      or entries.document_type not in ('01','02','03','04','05','06','07','08','09')
      or char_length(trim(entries.invoice_number)) = 0
      or entries.amount < 0
      or extract(year from entries.invoice_date) <> new.year or extract(month from entries.invoice_date) <> new.month
      or partners.id is null or partners.vat_number !~ '^[0-9]{12}$' or partners.jib !~ '^[0-9]{13}$'
  ) then raise exception 'Period has blocking validation errors'; end if;
  return new;
end;
$$;
create trigger tax_periods_ready_guard before update of status on public.tax_periods for each row execute function public.guard_ready_for_export();

alter table public.sales_entries enable row level security;
create policy "users read assigned company sales" on public.sales_entries for select using (public.has_company_access(company_id));
create policy "owners manage sales in open periods" on public.sales_entries for all using (
  public.can_manage_company(company_id) and public.is_tax_period_open(tax_period_id, company_id)
) with check (
  public.can_manage_company(company_id) and public.is_tax_period_open(tax_period_id, company_id)
);
