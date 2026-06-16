-- Bootstrap public.usuarios when a row is created in auth.users (Dashboard + app admin).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_tipo text;
begin
  v_nome := nullif(trim(coalesce(new.raw_user_meta_data->>'nome', '')), '');
  if v_nome is null then
    v_nome := initcap(split_part(coalesce(new.email, 'usuario'), '@', 1));
  end if;

  v_tipo := coalesce(nullif(trim(new.raw_user_meta_data->>'tipo_usuario'), ''), 'comum');
  if v_tipo not in ('comum', 'manager', 'admin') then
    v_tipo := 'comum';
  end if;

  insert into public.usuarios (
    id,
    nome,
    email,
    tipo_usuario,
    ativo
  )
  values (
    new.id,
    v_nome,
    coalesce(new.email, ''),
    v_tipo,
    true
  )
  on conflict (id) do update
  set
    email = excluded.email,
    nome = coalesce(nullif(trim(public.usuarios.nome), ''), excluded.nome);

  return new;
exception
  when others then
    raise warning 'handle_new_user skipped for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
