-- Brand Agent – schema inicial (clientes + projetos)
-- Cole no Supabase: SQL Editor → New query → Run
-- Requer: extensão pgcrypto (geralmente já ativa no Supabase para gen_random_uuid)

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  setor text,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete cascade
);

create table if not exists public.projetos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  nome_projeto text not null,
  status text not null default 'rascunho',
  briefing_texto text,
  briefing jsonb,
  benchmark jsonb,
  nomes_gerados jsonb,
  nomes_escolhidos text[],
  prompts_validacao jsonb,
  relatorio_final text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Trigger: updated_at em projetos
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projetos_set_updated_at on public.projetos;

create trigger trg_projetos_set_updated_at
  before update on public.projetos
  for each row
  execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.clientes enable row level security;
alter table public.projetos enable row level security;

-- Remove políticas antigas (re-execução idempotente em dev)
drop policy if exists "clientes_autenticados_total" on public.clientes;
drop policy if exists "projetos_autenticados_total" on public.projetos;

-- Utilizador autenticado: leitura e escrita em todas as linhas
-- (ambiente de desenvolvimento; restringa por created_by em produção se precisar)
create policy "clientes_autenticados_total"
  on public.clientes
  for all
  to authenticated
  using (true)
  with check (true);

create policy "projetos_autenticados_total"
  on public.projetos
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Índices (opcional, ajuda em FKs e listagens)
-- ---------------------------------------------------------------------------

create index if not exists idx_projetos_cliente_id on public.projetos (cliente_id);
create index if not exists idx_projetos_created_by on public.projetos (created_by);
create index if not exists idx_clientes_created_by on public.clientes (created_by);
