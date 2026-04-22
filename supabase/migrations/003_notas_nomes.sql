-- Adiciona coluna para notas do analista por nome (mapa nome → nota)
-- e coluna para armazenar fonetica_json separado do nomes_gerados
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS notas_nomes jsonb DEFAULT '{}';

COMMENT ON COLUMN public.projetos.notas_nomes IS
  'Notas do analista por proposta de nome. Formato: { "NomeProposto": "texto da nota" }';
