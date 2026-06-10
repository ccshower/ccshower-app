-- Chaves operacionais em ingles (snake_case). Banco neutro de idioma.

-- ---------------------------------------------------------------------------
-- clientes.tipo_cliente
-- ---------------------------------------------------------------------------
update public.clientes set tipo_cliente = 'residential' where tipo_cliente = 'RESIDENCIAL';
update public.clientes set tipo_cliente = 'construction_company' where tipo_cliente = 'CONSTRUTORA';
update public.clientes set tipo_cliente = 'architect' where tipo_cliente = 'ARQUITETO';
update public.clientes set tipo_cliente = 'partner' where tipo_cliente = 'PARCEIRO';
update public.clientes set tipo_cliente = 'commercial' where tipo_cliente = 'COMERCIAL';
update public.clientes set tipo_cliente = 'other' where tipo_cliente = 'OUTRO';

alter table public.clientes drop constraint if exists clientes_tipo_cliente_check;
alter table public.clientes
  alter column tipo_cliente set default 'residential';
alter table public.clientes
  add constraint clientes_tipo_cliente_check
  check (
    tipo_cliente in (
      'residential',
      'construction_company',
      'architect',
      'partner',
      'commercial',
      'other'
    )
  );

-- ---------------------------------------------------------------------------
-- equipes.codigo_operacional
-- ---------------------------------------------------------------------------
update public.equipes set codigo_operacional = 'commercial' where codigo_operacional = 'comercial';
update public.equipes set codigo_operacional = 'financial_review' where codigo_operacional = 'financeiro';
update public.equipes set codigo_operacional = 'project' where codigo_operacional = 'projeto';
update public.equipes set codigo_operacional = 'installation' where codigo_operacional = 'instalacao';

alter table public.equipes drop constraint if exists equipes_codigo_operacional_check;
alter table public.equipes
  add constraint equipes_codigo_operacional_check
  check (
    codigo_operacional is null
    or codigo_operacional in ('commercial', 'financial_review', 'project', 'installation')
  );

-- ---------------------------------------------------------------------------
-- ordens_servico.status
-- ---------------------------------------------------------------------------
update public.ordens_servico set status = 'open' where status = 'aberta';
update public.ordens_servico set status = 'scheduled' where status = 'agendada';
update public.ordens_servico set status = 'in_progress' where status = 'em_andamento';
update public.ordens_servico set status = 'completed' where status = 'concluida';
update public.ordens_servico set status = 'cancelled' where status = 'cancelada';

alter table public.ordens_servico drop constraint if exists ordens_servico_status_check;
alter table public.ordens_servico
  alter column status set default 'open';
alter table public.ordens_servico
  add constraint ordens_servico_status_check
  check (status in ('open', 'scheduled', 'in_progress', 'completed', 'cancelled'));

-- ---------------------------------------------------------------------------
-- ordens_servico.etapa_atual / status_atual
-- ---------------------------------------------------------------------------
update public.ordens_servico set etapa_atual = 'commercial' where etapa_atual = 'comercial';
update public.ordens_servico set etapa_atual = 'financial_review' where etapa_atual = 'financeiro';
update public.ordens_servico set etapa_atual = 'project' where etapa_atual = 'projeto';
update public.ordens_servico set etapa_atual = 'installation' where etapa_atual = 'instalacao';
update public.ordens_servico set etapa_atual = 'blocked' where etapa_atual = 'bloqueado';
update public.ordens_servico set etapa_atual = 'completed' where etapa_atual = 'concluida';

update public.ordens_servico set status_atual = 'visit_scheduled' where status_atual = 'visita_agendada';
update public.ordens_servico set status_atual = 'visit_in_progress' where status_atual = 'visita_em_andamento';
update public.ordens_servico set status_atual = 'commercial_pending' where status_atual = 'comercial_pendente';
update public.ordens_servico set status_atual = 'financial_pending' where status_atual = 'financeiro_pendente';
update public.ordens_servico set status_atual = 'financial_in_progress' where status_atual = 'financeiro_em_andamento';
update public.ordens_servico set status_atual = 'financial_blocked' where status_atual = 'financeiro_bloqueado';
update public.ordens_servico set status_atual = 'project_pending' where status_atual = 'projeto_pendente';
update public.ordens_servico set status_atual = 'project_in_progress' where status_atual = 'projeto_em_andamento';
update public.ordens_servico set status_atual = 'installation_scheduled' where status_atual = 'instalacao_agendada';
update public.ordens_servico set status_atual = 'installation_in_progress' where status_atual = 'instalacao_em_andamento';
update public.ordens_servico set status_atual = 'installation_pending' where status_atual = 'instalacao_pendente';
update public.ordens_servico set status_atual = 'completed' where status_atual = 'concluida';
update public.ordens_servico set status_atual = 'cancelled' where status_atual = 'cancelada';

alter table public.ordens_servico drop constraint if exists ordens_servico_etapa_atual_check;
alter table public.ordens_servico
  alter column etapa_atual set default 'commercial';
alter table public.ordens_servico
  add constraint ordens_servico_etapa_atual_check
  check (
    etapa_atual in (
      'commercial',
      'financial_review',
      'project',
      'installation',
      'blocked',
      'completed'
    )
  );

-- ---------------------------------------------------------------------------
-- agenda_eventos
-- ---------------------------------------------------------------------------
update public.agenda_eventos set etapa = 'commercial' where etapa = 'comercial';
update public.agenda_eventos set etapa = 'financial_review' where etapa = 'financeiro';
update public.agenda_eventos set etapa = 'project' where etapa = 'projeto';
update public.agenda_eventos set etapa = 'installation' where etapa = 'instalacao';
update public.agenda_eventos set etapa = 'blocked' where etapa = 'bloqueado';
update public.agenda_eventos set etapa = 'completed' where etapa = 'concluida';

update public.agenda_eventos set tipo_evento = 'technical_visit' where tipo_evento = 'visita_tecnica';
update public.agenda_eventos set tipo_evento = 'measurement' where tipo_evento = 'medicao';
update public.agenda_eventos set tipo_evento = 'stage_changed' where tipo_evento = 'mudanca_etapa';
update public.agenda_eventos set tipo_evento = 'status_changed' where tipo_evento = 'mudanca_status';
update public.agenda_eventos set tipo_evento = 'os_created' where tipo_evento = 'os_criada';

update public.agenda_eventos set status = 'scheduled' where status = 'agendado';
update public.agenda_eventos set status = 'confirmed' where status = 'confirmado';
update public.agenda_eventos set status = 'on_site' where status = 'em_campo';
update public.agenda_eventos set status = 'completed' where status = 'concluido';
update public.agenda_eventos set status = 'cancelled' where status = 'cancelado';

update public.agenda_eventos set titulo = 'os_created' where titulo in ('OS criada', 'OS Criada');
update public.agenda_eventos set titulo = 'stage_changed' where titulo in ('Avanco de etapa', 'Etapa alterada (admin)', 'Mudança de etapa');
update public.agenda_eventos set titulo = 'status_changed' where titulo in ('Status da OS alterado', 'Mudança de status');

alter table public.agenda_eventos drop constraint if exists agenda_eventos_etapa_check;
alter table public.agenda_eventos
  alter column etapa set default 'commercial';
alter table public.agenda_eventos
  add constraint agenda_eventos_etapa_check
  check (
    etapa in (
      'commercial',
      'financial_review',
      'project',
      'installation',
      'blocked',
      'completed'
    )
  );

alter table public.agenda_eventos drop constraint if exists agenda_eventos_tipo_evento_check;
alter table public.agenda_eventos
  alter column tipo_evento set default 'technical_visit';
alter table public.agenda_eventos
  add constraint agenda_eventos_tipo_evento_check
  check (
    tipo_evento in (
      'technical_visit',
      'measurement',
      'installation',
      'stage_changed',
      'status_changed',
      'os_created',
      'other'
    )
  );

alter table public.agenda_eventos drop constraint if exists agenda_eventos_status_check;
alter table public.agenda_eventos
  alter column status set default 'scheduled';
alter table public.agenda_eventos
  add constraint agenda_eventos_status_check
  check (
    status in ('scheduled', 'confirmed', 'on_site', 'completed', 'cancelled')
  );

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
    'technical_visit',
    'commercial',
    'scheduled',
    new.titulo,
    new.descricao,
    data_visita
  );

  return new;
end;
$$;
