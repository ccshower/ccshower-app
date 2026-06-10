-- Equipe operacional obrigatória em novos clientes; legado pode permanecer null até correção.

create or replace function public.enforce_cliente_equipe_operacional()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' and new.equipe_id is null then
    raise exception 'equipe_id is required for new clients';
  end if;

  if tg_op = 'UPDATE' and new.equipe_id is null and old.equipe_id is not null then
    raise exception 'equipe_id cannot be removed from client';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_clientes_equipe_operacional on public.clientes;
create trigger trg_clientes_equipe_operacional
before insert or update on public.clientes
for each row execute function public.enforce_cliente_equipe_operacional();

create or replace function public.enforce_ordem_servico_equipe_operacional()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.equipe_id is null or new.equipe_atual_id is null then
      raise exception 'ordens_servico requires equipe_id and equipe_atual_id on insert';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.equipe_id is null and old.equipe_id is not null then
      raise exception 'ordens_servico equipe_id cannot be removed';
    end if;
    if new.equipe_atual_id is null and old.equipe_atual_id is not null then
      raise exception 'ordens_servico equipe_atual_id cannot be removed';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ordens_servico_equipe_operacional on public.ordens_servico;
create trigger trg_ordens_servico_equipe_operacional
before insert or update on public.ordens_servico
for each row execute function public.enforce_ordem_servico_equipe_operacional();
