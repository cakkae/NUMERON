create table public.uino_exports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  tax_period_id uuid not null references public.tax_periods(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  book_type text not null check (book_type in ('KUF', 'KIF')),
  file_name text not null check (file_name ~ '^[0-9]{12}_[0-9]{4}_[12]_[0-9]{2}\.csv$'),
  sequence smallint not null check (sequence between 1 and 99),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text not null unique,
  item_count integer not null check (item_count >= 0),
  size_bytes integer not null check (size_bytes between 1 and 5000000),
  totals jsonb not null,
  generated_at timestamptz not null default now()
);

create index uino_exports_company_period_idx
  on public.uino_exports(company_id, tax_period_id, generated_at desc);

alter table public.uino_exports enable row level security;

create policy "users read assigned company exports"
  on public.uino_exports for select
  using (public.has_company_access(company_id));

create policy "owners create assigned company exports"
  on public.uino_exports for insert
  with check (public.can_manage_company(company_id) and created_by = auth.uid());

create policy "owners delete assigned company exports"
  on public.uino_exports for delete
  using (public.can_manage_company(company_id));

create trigger uino_exports_audit
  after insert or delete on public.uino_exports
  for each row execute function public.write_audit_event();

grant select, insert, delete on public.uino_exports to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uino-exports', 'uino-exports', false, 5000000, array['text/csv'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "assigned users read private UINO exports"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'uino-exports'
    and public.has_company_access(((storage.foldername(name))[1])::uuid)
  );

create policy "company owners create private UINO exports"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'uino-exports'
    and public.can_manage_company(((storage.foldername(name))[1])::uuid)
  );

create policy "company owners remove private UINO exports"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'uino-exports'
    and public.can_manage_company(((storage.foldername(name))[1])::uuid)
  );
