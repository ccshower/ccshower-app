-- Coating (Sales): checkbox — marcado = sim.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ordens_servico'
      and column_name = 'coating'
      and udt_name <> 'bool'
  ) then
    alter table public.ordens_servico
      add column if not exists coating_bool boolean not null default false;

    update public.ordens_servico
    set coating_bool = true
    where coating is not null
      and btrim(coating::text) <> '';

    alter table public.ordens_servico
      drop column coating;

    alter table public.ordens_servico
      rename column coating_bool to coating;
  else
    alter table public.ordens_servico
      add column if not exists coating boolean not null default false;
  end if;
end $$;

comment on column public.ordens_servico.coating is
  'Coating (Sales): true = yes';
