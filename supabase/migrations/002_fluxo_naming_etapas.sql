-- Etapas do fluxo: validação do briefing estruturado e aprovação do benchmark

alter table public.projetos
  add column if not exists briefing_validado_em timestamptz;

alter table public.projetos
  add column if not exists benchmark_aprovado_em timestamptz;

comment on column public.projetos.briefing_validado_em is
  'Quando preenchido, a etapa 1 (briefing estruturado) foi validada pelo humano.';

comment on column public.projetos.benchmark_aprovado_em is
  'Quando preenchido, a etapa 2 (benchmark de concorrentes) foi aprovada.';
