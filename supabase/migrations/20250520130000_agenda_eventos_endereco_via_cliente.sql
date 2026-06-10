-- Endereco da visita vem do cliente (fonte unica). Remove duplicata em agenda_eventos.

alter table public.agenda_eventos
  drop column if exists endereco_formatado,
  drop column if exists latitude,
  drop column if exists longitude;

create or replace function public.criar_evento_inicial_ordem_servico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cli record;
  data_visita timestamptz;
begin
  select c.equipe_id into cli
  from public.clientes c
  where c.id = new.cliente_id;

  data_visita :=
    ((date_trunc('day', now() at time zone 'America/New_York') + interval '1 day')
      + time '09:00') at time zone 'America/New_York';

  insert into public.agenda_eventos (
    ordem_servico_id,
    cliente_id,
    equipe_id,
    responsavel_id,
    tipo_evento,
    etapa,
    status,
    titulo,
    descricao,
    data_evento
  )
  values (
    new.id,
    new.cliente_id,
    coalesce(new.equipe_id, cli.equipe_id),
    new.responsavel_id,
    'visita_tecnica',
    'comercial',
    'agendado',
    new.titulo,
    new.descricao,
    data_visita
  );

  return new;
end;
$$;
