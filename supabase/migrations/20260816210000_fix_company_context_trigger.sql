create or replace function public.assert_company_context() returns trigger language plpgsql security definer set search_path = public as $$
declare
  expected_workspace_id uuid;
begin
  select workspace_id into expected_workspace_id from public.companies where id = new.company_id;
  if expected_workspace_id is null or expected_workspace_id <> new.workspace_id then
    raise exception 'Company does not belong to workspace';
  end if;

  if tg_table_name = 'purchase_entries' then
    if not exists (select 1 from public.tax_periods where id = new.tax_period_id and company_id = new.company_id) then
      raise exception 'Tax period does not belong to company';
    end if;
    if not exists (select 1 from public.partners where id = new.partner_id and company_id = new.company_id) then
      raise exception 'Partner does not belong to company';
    end if;
  end if;

  return new;
end;
$$;
