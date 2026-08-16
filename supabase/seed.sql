-- Completely fictional development seed data. Auth users and memberships are
-- created locally through Supabase Auth, never with real data or credentials.
insert into public.workspaces (id, name) values ('11111111-1111-1111-1111-111111111111', 'Demo računovodstvo') on conflict (id) do nothing;
insert into public.companies (id, workspace_id, name, vat_number, address) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Alfa Demo d.o.o.', '440000000001', 'Demo ulica 1, Sarajevo'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Beta Demo d.o.o.', '440000000002', 'Primjer cesta 2, Mostar')
on conflict (id) do nothing;
