-- Complemento do endereço (apt, suite, unit). Não entra no Places sozinho.

alter table public.clientes
  add column if not exists endereco_complemento text;
