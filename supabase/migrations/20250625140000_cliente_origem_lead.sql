-- Qualificação do lead no cadastro (Sales).

alter table public.clientes
  add column if not exists origem_lead text,
  add column if not exists origem_lead_outro text;

comment on column public.clientes.origem_lead is
  'Origem do lead: google, facebook, returning_client, referral, contractor, instagram, other';

comment on column public.clientes.origem_lead_outro is
  'Detalhe quando origem_lead = other (ex.: viu truck na rua)';
