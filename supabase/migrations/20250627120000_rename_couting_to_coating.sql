-- Corrige typo: coluna couting → coating (boolean na visita comercial).

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ordens_servico'
      and column_name = 'couting'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ordens_servico'
      and column_name = 'coating'
      and udt_name = 'bool'
  ) then
    alter table public.ordens_servico
      rename column couting to coating;
  end if;
end $$;

comment on column public.ordens_servico.coating is
  'Coating (Sales): true = yes';
