alter table public.partners
  alter column vat_number drop not null,
  alter column jib drop not null,
  drop constraint partners_vat_number_check,
  drop constraint partners_jib_check,
  drop constraint partners_company_id_vat_number_key,
  add constraint partners_vat_number_check check (
    vat_number is null or vat_number = '' or vat_number ~ '^[0-9]{12}$'
  ),
  add constraint partners_jib_check check (
    jib is null or jib = '' or jib ~ '^[0-9]{13}$'
  );

create unique index partners_company_vat_number_unique_idx
  on public.partners(company_id, vat_number)
  where vat_number is not null
    and vat_number <> ''
    and vat_number <> '000000000000';

alter table public.purchase_entries
  alter column amount drop not null,
  add column received_date date,
  add column invoice_amount_excluding_vat numeric(24, 2) check (invoice_amount_excluding_vat >= 0),
  add column invoice_amount_with_vat numeric(24, 2) check (invoice_amount_with_vat >= 0),
  add column flat_rate_compensation numeric(24, 2) check (flat_rate_compensation >= 0),
  add column input_vat_amount numeric(24, 2) check (input_vat_amount >= 0),
  add column deductible_input_vat numeric(24, 2) check (deductible_input_vat >= 0),
  add column non_deductible_input_vat numeric(24, 2) check (non_deductible_input_vat >= 0),
  add column input_vat_field_32 numeric(24, 2) check (input_vat_field_32 >= 0),
  add column input_vat_field_33 numeric(24, 2) check (input_vat_field_33 >= 0),
  add column input_vat_field_34 numeric(24, 2) check (input_vat_field_34 >= 0);

update public.purchase_entries
set received_date = invoice_date,
    invoice_amount_with_vat = amount
where received_date is null;

alter table public.purchase_entries
  alter column received_date set not null;

alter table public.sales_entries
  alter column amount drop not null,
  add column invoice_total_amount numeric(24, 2) check (invoice_total_amount >= 0),
  add column internal_invoice_amount numeric(24, 2) check (internal_invoice_amount >= 0),
  add column export_invoice_amount numeric(24, 2) check (export_invoice_amount >= 0),
  add column vat_exempt_supply_amount numeric(24, 2) check (vat_exempt_supply_amount >= 0),
  add column taxable_base_registered numeric(24, 2) check (taxable_base_registered >= 0),
  add column output_vat_registered numeric(24, 2) check (output_vat_registered >= 0),
  add column taxable_base_non_registered numeric(24, 2) check (taxable_base_non_registered >= 0),
  add column output_vat_non_registered numeric(24, 2) check (output_vat_non_registered >= 0),
  add column output_vat_field_32 numeric(24, 2) check (output_vat_field_32 >= 0),
  add column output_vat_field_33 numeric(24, 2) check (output_vat_field_33 >= 0),
  add column output_vat_field_34 numeric(24, 2) check (output_vat_field_34 >= 0);

update public.sales_entries
set invoice_total_amount = amount
where invoice_total_amount is null;

create or replace function public.assert_book_entry_context() returns trigger language plpgsql security definer set search_path = public as $$
declare
  period_year smallint;
  period_month smallint;
  entry_period_date date;
begin
  perform 1 from public.companies where id = new.company_id and workspace_id = new.workspace_id;
  if not found then raise exception 'Company does not belong to workspace'; end if;
  select year, month into period_year, period_month from public.tax_periods where id = new.tax_period_id and company_id = new.company_id;
  if period_year is null then raise exception 'Tax period does not belong to company'; end if;
  if tg_table_name = 'purchase_entries' then
    entry_period_date := new.received_date;
  else
    entry_period_date := new.invoice_date;
  end if;
  if extract(year from entry_period_date) <> period_year or extract(month from entry_period_date) <> period_month then
    raise exception 'Entry date is outside tax period';
  end if;
  perform 1 from public.partners where id = new.partner_id and company_id = new.company_id;
  if not found then raise exception 'Partner does not belong to company'; end if;
  return new;
end;
$$;

create or replace function public.guard_ready_for_export() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'ready_for_export' and old.status <> 'ready_for_export' then
    if exists (
      select 1
      from public.purchase_entries entries
      left join public.partners on partners.id = entries.partner_id and partners.company_id = entries.company_id
      where entries.tax_period_id = new.id and not entries.is_archived and (
        entries.company_id <> new.company_id
        or entries.document_type not in ('01','02','03','04','05','06','07','08','09')
        or char_length(trim(entries.invoice_number)) = 0
        or extract(year from entries.received_date) <> new.year
        or extract(month from entries.received_date) <> new.month
        or partners.id is null
        or (entries.document_type = '04' and (
          coalesce(partners.vat_number, '') <> '000000000000'
          or coalesce(partners.jib, '') <> '0000000000000'
        ))
      )
    ) then raise exception 'Period has blocking KUF validation errors'; end if;

    if exists (
      select 1
      from public.sales_entries entries
      left join public.partners on partners.id = entries.partner_id and partners.company_id = entries.company_id
      where entries.tax_period_id = new.id and not entries.is_archived and (
        entries.company_id <> new.company_id
        or entries.document_type not in ('01','02','03','04','05','06','07','08','09')
        or char_length(trim(entries.invoice_number)) = 0
        or extract(year from entries.invoice_date) <> new.year
        or extract(month from entries.invoice_date) <> new.month
        or partners.id is null
        or (entries.document_type = '04' and (
          coalesce(partners.vat_number, '') <> '000000000000'
          or coalesce(partners.jib, '') <> '0000000000000'
        ))
      )
    ) then raise exception 'Period has blocking KIF validation errors'; end if;
  end if;
  return new;
end;
$$;
