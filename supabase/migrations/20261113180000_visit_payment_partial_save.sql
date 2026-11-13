-- Recebimento na visita: financiamento entra no check do método.
-- Valor parcial do ambiente: quem já vê a OS comercial pode gravar.

alter table public.ordens_servico
  drop constraint if exists ordens_servico_visit_payment_method_check;

alter table public.ordens_servico
  add constraint ordens_servico_visit_payment_method_check
  check (
    visit_payment_method is null
    or visit_payment_method in (
      'cash',
      'check',
      'debit_card',
      'credit_card',
      'zelle',
      'financing'
    )
  );

drop policy if exists os_ambientes_insert on public.os_ambientes;
create policy os_ambientes_insert
on public.os_ambientes
for insert
to authenticated
with check (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_manage_sistema()
      or public.can_view_all_equipes()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
      or os.responsavel_id = auth.uid()
      or os.criado_por = auth.uid()
      or (
        public.user_equipe_is_commercial_stage()
        and os.etapa_atual = 'commercial'
      )
    )
  )
);

drop policy if exists os_ambientes_update on public.os_ambientes;
create policy os_ambientes_update
on public.os_ambientes
for update
to authenticated
using (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_manage_sistema()
      or public.can_view_all_equipes()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
      or os.responsavel_id = auth.uid()
      or os.criado_por = auth.uid()
      or (
        public.user_equipe_is_commercial_stage()
        and os.etapa_atual = 'commercial'
      )
    )
  )
)
with check (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_manage_sistema()
      or public.can_view_all_equipes()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
      or os.responsavel_id = auth.uid()
      or os.criado_por = auth.uid()
      or (
        public.user_equipe_is_commercial_stage()
        and os.etapa_atual = 'commercial'
      )
    )
  )
);
