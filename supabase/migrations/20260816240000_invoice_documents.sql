create type public.invoice_document_status as enum ('uploaded', 'reviewing', 'confirmed', 'rejected');
create type public.invoice_document_ledger as enum ('kuf', 'kif');

create table public.invoice_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  tax_period_id uuid references public.tax_periods(id) on delete restrict,
  uploaded_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  original_filename text not null check (char_length(trim(original_filename)) between 1 and 255),
  storage_path text not null unique check (
    storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 15000000),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  status public.invoice_document_status not null default 'uploaded',
  suggested_ledger public.invoice_document_ledger,
  linked_entry_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'confirmed' and tax_period_id is not null and suggested_ledger is not null and linked_entry_id is not null)
    or (status <> 'confirmed' and linked_entry_id is null)
  )
);

alter table public.purchase_entries
  add column source_document_id uuid references public.invoice_documents(id) on delete restrict;
alter table public.sales_entries
  add column source_document_id uuid references public.invoice_documents(id) on delete restrict;

create unique index purchase_entries_source_document_unique_idx
  on public.purchase_entries(source_document_id) where source_document_id is not null;
create unique index sales_entries_source_document_unique_idx
  on public.sales_entries(source_document_id) where source_document_id is not null;
create index invoice_documents_company_created_idx
  on public.invoice_documents(company_id, created_at desc);
create index invoice_documents_period_status_idx
  on public.invoice_documents(tax_period_id, status);

create function public.protect_invoice_document() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.companies
    where id = new.company_id and workspace_id = new.workspace_id
  ) then raise exception 'Document company does not belong to workspace'; end if;

  if new.tax_period_id is not null and not exists (
    select 1 from public.tax_periods
    where id = new.tax_period_id and company_id = new.company_id
  ) then raise exception 'Document tax period does not belong to company'; end if;

  if tg_op = 'INSERT' and (
    new.status <> 'uploaded'
    or new.suggested_ledger is not null
    or new.linked_entry_id is not null
  ) then raise exception 'New document must start as an unlinked upload'; end if;

  if tg_op = 'UPDATE' then
    if old.workspace_id is distinct from new.workspace_id
      or old.company_id is distinct from new.company_id
      or old.uploaded_by is distinct from new.uploaded_by
      or old.original_filename is distinct from new.original_filename
      or old.storage_path is distinct from new.storage_path
      or old.mime_type is distinct from new.mime_type
      or old.byte_size is distinct from new.byte_size
      or old.sha256 is distinct from new.sha256
      or old.created_at is distinct from new.created_at
    then raise exception 'Document upload metadata is immutable'; end if;

    if old.status = 'confirmed' then raise exception 'Confirmed document is immutable'; end if;
    if old.status = 'rejected' and new.status <> 'rejected' then raise exception 'Rejected document cannot be reopened'; end if;
    if new.status = 'confirmed' and coalesce(current_setting('numeron.document_confirmation', true), '') <> 'on' then
      raise exception 'Document can only be confirmed through reviewed posting';
    end if;
  end if;
  return new;
end;
$$;

create function public.protect_source_document_link() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  source_company_id uuid;
  source_status public.invoice_document_status;
  source_linked_entry_id uuid;
begin
  if tg_op = 'DELETE' then
    if old.source_document_id is not null then raise exception 'Reviewed document entry cannot be deleted'; end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.source_document_id is not distinct from new.source_document_id then return new; end if;
  if new.source_document_id is null then return new; end if;
  if coalesce(current_setting('numeron.document_confirmation', true), '') <> 'on' then
    raise exception 'Source document can only be linked through reviewed posting';
  end if;

  select company_id, status, linked_entry_id
    into source_company_id, source_status, source_linked_entry_id
  from public.invoice_documents where id = new.source_document_id for update;
  if source_company_id is null then raise exception 'Source document not found'; end if;
  if source_company_id <> new.company_id then raise exception 'Source document belongs to another company'; end if;
  if source_status in ('confirmed', 'rejected') or source_linked_entry_id is not null then
    raise exception 'Source document was already resolved';
  end if;
  if exists (select 1 from public.purchase_entries where source_document_id = new.source_document_id)
    or exists (select 1 from public.sales_entries where source_document_id = new.source_document_id)
  then raise exception 'Source document is already linked'; end if;
  return new;
end;
$$;

create trigger invoice_documents_protect
  before insert or update on public.invoice_documents
  for each row execute function public.protect_invoice_document();
create trigger invoice_documents_set_updated_at
  before update on public.invoice_documents
  for each row execute function public.set_updated_at();
create trigger invoice_documents_audit
  after insert or update on public.invoice_documents
  for each row execute function public.write_audit_event();
create trigger purchase_entries_source_document_protect
  before insert or update or delete on public.purchase_entries
  for each row execute function public.protect_source_document_link();
create trigger sales_entries_source_document_protect
  before insert or update or delete on public.sales_entries
  for each row execute function public.protect_source_document_link();

alter table public.invoice_documents enable row level security;
create policy "members read assigned company documents"
  on public.invoice_documents for select
  using (public.has_company_access(company_id));
create policy "members upload assigned company documents"
  on public.invoice_documents for insert
  with check (public.has_company_access(company_id) and uploaded_by = auth.uid());
create policy "members review assigned company documents"
  on public.invoice_documents for update
  using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

grant select, insert, update on public.invoice_documents to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invoice-documents', 'invoice-documents', false, 15000000,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "members read private invoice documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'invoice-documents'
    and public.has_company_access(((storage.foldername(name))[1])::uuid)
  );
create policy "members upload private invoice documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'invoice-documents'
    and public.has_company_access(((storage.foldername(name))[1])::uuid)
    and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );
create policy "uploaders remove failed private invoice uploads"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'invoice-documents'
    and owner_id = auth.uid()::text
    and public.has_company_access(((storage.foldername(name))[1])::uuid)
  );

create function public.confirm_invoice_document(
  target_document_id uuid,
  target_period_id uuid,
  target_ledger text,
  entry_data jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  document_record public.invoice_documents%rowtype;
  entry_id uuid := gen_random_uuid();
  partner_id_value uuid;
  document_type_value text;
  invoice_number_value text;
  invoice_date_value date;
begin
  select * into document_record
  from public.invoice_documents where id = target_document_id for update;
  if not found or not public.has_company_access(document_record.company_id) then raise exception 'Document not found'; end if;
  if not public.can_manage_company(document_record.company_id) then raise exception 'Only company owner can post document'; end if;
  if document_record.status in ('confirmed', 'rejected') or document_record.linked_entry_id is not null then
    raise exception 'Document was already resolved';
  end if;
  if target_ledger not in ('kuf', 'kif') then raise exception 'Ledger must be kuf or kif'; end if;
  if not public.is_tax_period_open(target_period_id, document_record.company_id) then raise exception 'Tax period is not open'; end if;

  partner_id_value := (entry_data->>'partner_id')::uuid;
  document_type_value := entry_data->>'document_type';
  invoice_number_value := trim(entry_data->>'invoice_number');
  invoice_date_value := (entry_data->>'invoice_date')::date;
  if document_type_value not in ('01','02','03','04','05','06','07','08','09') then raise exception 'Invalid document type'; end if;
  if invoice_number_value is null or invoice_number_value = '' then raise exception 'Invoice number is required'; end if;
  if not exists (
    select 1 from public.partners where id = partner_id_value and company_id = document_record.company_id
  ) then raise exception 'Partner does not belong to company'; end if;

  perform set_config('numeron.document_confirmation', 'on', true);
  if target_ledger = 'kuf' then
    insert into public.purchase_entries (
      id, workspace_id, company_id, tax_period_id, partner_id, source_document_id,
      document_type, invoice_number, invoice_date, received_date, amount,
      invoice_amount_excluding_vat, invoice_amount_with_vat, flat_rate_compensation,
      input_vat_amount, deductible_input_vat, non_deductible_input_vat,
      input_vat_field_32, input_vat_field_33, input_vat_field_34
    ) values (
      entry_id, document_record.workspace_id, document_record.company_id, target_period_id,
      partner_id_value, target_document_id, document_type_value, invoice_number_value,
      invoice_date_value, (entry_data->>'received_date')::date,
      nullif(entry_data->>'invoice_amount_with_vat', '')::numeric,
      nullif(entry_data->>'invoice_amount_excluding_vat', '')::numeric,
      nullif(entry_data->>'invoice_amount_with_vat', '')::numeric,
      nullif(entry_data->>'flat_rate_compensation', '')::numeric,
      nullif(entry_data->>'input_vat_amount', '')::numeric,
      nullif(entry_data->>'deductible_input_vat', '')::numeric,
      nullif(entry_data->>'non_deductible_input_vat', '')::numeric,
      nullif(entry_data->>'input_vat_field_32', '')::numeric,
      nullif(entry_data->>'input_vat_field_33', '')::numeric,
      nullif(entry_data->>'input_vat_field_34', '')::numeric
    );
  else
    insert into public.sales_entries (
      id, workspace_id, company_id, tax_period_id, partner_id, source_document_id,
      document_type, invoice_number, invoice_date, amount,
      invoice_total_amount, internal_invoice_amount, export_invoice_amount,
      vat_exempt_supply_amount, taxable_base_registered, output_vat_registered,
      taxable_base_non_registered, output_vat_non_registered,
      output_vat_field_32, output_vat_field_33, output_vat_field_34
    ) values (
      entry_id, document_record.workspace_id, document_record.company_id, target_period_id,
      partner_id_value, target_document_id, document_type_value, invoice_number_value,
      invoice_date_value, nullif(entry_data->>'invoice_total_amount', '')::numeric,
      nullif(entry_data->>'invoice_total_amount', '')::numeric,
      nullif(entry_data->>'internal_invoice_amount', '')::numeric,
      nullif(entry_data->>'export_invoice_amount', '')::numeric,
      nullif(entry_data->>'vat_exempt_supply_amount', '')::numeric,
      nullif(entry_data->>'taxable_base_registered', '')::numeric,
      nullif(entry_data->>'output_vat_registered', '')::numeric,
      nullif(entry_data->>'taxable_base_non_registered', '')::numeric,
      nullif(entry_data->>'output_vat_non_registered', '')::numeric,
      nullif(entry_data->>'output_vat_field_32', '')::numeric,
      nullif(entry_data->>'output_vat_field_33', '')::numeric,
      nullif(entry_data->>'output_vat_field_34', '')::numeric
    );
  end if;

  update public.invoice_documents set
    tax_period_id = target_period_id,
    status = 'confirmed',
    suggested_ledger = target_ledger::public.invoice_document_ledger,
    linked_entry_id = entry_id
  where id = target_document_id;
  return entry_id;
end;
$$;

revoke all on function public.confirm_invoice_document(uuid, uuid, text, jsonb) from public;
grant execute on function public.confirm_invoice_document(uuid, uuid, text, jsonb) to authenticated, service_role;
