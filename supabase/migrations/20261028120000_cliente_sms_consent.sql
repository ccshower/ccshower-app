-- Consentimento SMS no cadastro do cliente.
-- Clientes existentes ficam sem autorização (default false). Nenhum histórico é apagado.

alter table public.clientes
  add column if not exists sms_autorizado boolean not null default false,
  add column if not exists sms_consentimento_em timestamptz,
  add column if not exists sms_consentimento_metodo text,
  add column if not exists sms_opt_out_em timestamptz,
  add column if not exists sms_opt_out_origem text;

alter table public.clientes
  drop constraint if exists clientes_sms_consentimento_metodo_check;

alter table public.clientes
  add constraint clientes_sms_consentimento_metodo_check
  check (
    sms_consentimento_metodo is null
    or sms_consentimento_metodo = 'verbal'
  );

comment on column public.clientes.sms_autorizado is
  'True somente após confirmação verbal do cliente. Default false; não autoriza cadastros existentes.';

comment on column public.clientes.sms_consentimento_em is
  'Data/hora da confirmação verbal vigente. Não é renovada em um salvamento sem nova confirmação.';

comment on column public.clientes.sms_consentimento_metodo is
  'Método da confirmação vigente. Nesta etapa apenas verbal.';

comment on column public.clientes.sms_opt_out_em is
  'Data/hora de um opt-out. Bloqueia o SMS enquanto for igual ou posterior a sms_consentimento_em.';

comment on column public.clientes.sms_opt_out_origem is
  'Origem do opt-out, quando houver registro. Esta etapa não grava STOP automaticamente.';
