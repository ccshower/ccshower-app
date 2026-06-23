-- Couting (Sales): checkbox — marcado = sim.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ordens_servico'
      and column_name = 'coating'
  ) then
    alter table public.ordens_servico
      add column if not exists couting boolean not null default false;

    update public.ordens_servico
    set couting = true
    where coating is not null
      and btrim(coating) <> '';

    alter table public.ordens_servico
      drop column coating;
  else
    alter table public.ordens_servico
      add column if not exists couting boolean not null default false;
  end if;
end $$;

comment on column public.ordens_servico.couting is
  'Couting (Sales): true = sim';
