grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on table
  public.workspaces,
  public.workspace_members,
  public.companies,
  public.company_members,
  public.audit_events,
  public.tax_periods,
  public.partners,
  public.purchase_entries,
  public.sales_entries
to authenticated, service_role;

-- RLS remains enabled and authoritative for authenticated requests.
