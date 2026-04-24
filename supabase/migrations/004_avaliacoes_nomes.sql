-- Guarda a avaliacao do analista por nome: shortlist, negativado ou neutro.
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS avaliacoes_nomes jsonb DEFAULT '{}';

COMMENT ON COLUMN public.projetos.avaliacoes_nomes IS
  'Avaliacao do analista por proposta de nome. Formato: { "NomeProposto": { "status": "shortlist|negativado|neutro", "nota": "texto" } }';
