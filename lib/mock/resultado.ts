export interface AgenteStatus {
  id: string;
  nome: string;
  concluido: boolean;
}

export interface NomeSugeridoMock {
  id: string;
  nome: string;
  categoria: string;
  score: 1 | 2 | 3 | 4 | 5;
  justificativa: string;
  dominio: string;
  top3: boolean;
}

export const agentesPipeline: AgenteStatus[] = [
  { id: "a1", nome: "Pesquisa de contexto", concluido: true },
  { id: "a2", nome: "Análise competitiva", concluido: true },
  { id: "a3", nome: "Geração de candidatos", concluido: true },
  { id: "a4", nome: "Validação de registrabilidade", concluido: true },
  { id: "a5", nome: "Relatório e domínios", concluido: true },
];

export const nomesSugeridosMock: NomeSugeridoMock[] = [
  {
    id: "n1",
    nome: "Vértex Labs",
    categoria: "Evocativo",
    score: 5,
    justificativa:
      "Transmite inovação e precisão sem soar genérico; curto e memorável para B2B.",
    dominio: "vertexlabs.com.br",
    top3: true,
  },
  {
    id: "n2",
    nome: "Núcleo Digital",
    categoria: "Descritivo",
    score: 4,
    justificativa:
      "Clareza imediata para o segmento; reforça expertise técnica e escala.",
    dominio: "nucleodigital.io",
    top3: true,
  },
  {
    id: "n3",
    nome: "Pulso",
    categoria: "Inventado",
    score: 5,
    justificativa:
      "Uma sílaba forte, energia e movimento — alinha com posicionamento ágil.",
    dominio: "pulso.app",
    top3: true,
  },
  {
    id: "n4",
    nome: "Orion Data",
    categoria: "Combinado",
    score: 3,
    justificativa:
      "Nome sólido com referência aspiracional; validar conflitos em marcas similares.",
    dominio: "oriondata.com",
    top3: false,
  },
  {
    id: "n5",
    nome: "Casa do Código Vivo",
    categoria: "Descritivo",
    score: 2,
    justificativa:
      "Descritivo demais para diferenciação; pode funcionar em nicho local.",
    dominio: "casadocodigovivo.com.br",
    top3: false,
  },
  {
    id: "n6",
    nome: "Aurora Stack",
    categoria: "Evocativo",
    score: 4,
    justificativa:
      "Metáfora de clareza e começo; adequado para produto de produtividade.",
    dominio: "aurorastack.com",
    top3: false,
  },
  {
    id: "n7",
    nome: "Rizoma",
    categoria: "Inventado",
    score: 4,
    justificativa:
      "Memorável e distintivo; exige storytelling no site para ancorar significado.",
    dominio: "rizoma.io",
    top3: false,
  },
  {
    id: "n8",
    nome: "Borda",
    categoria: "Evocativo",
    score: 3,
    justificativa:
      "Minimalista; checar conflito com termos técnicos no setor.",
    dominio: "borda.app",
    top3: false,
  },
  {
    id: "n9",
    nome: "Firmament",
    categoria: "Evocativo",
    score: 4,
    justificativa:
      "Alta sofisticação; perfeito se o público for enterprise premium.",
    dominio: "firmament.co",
    top3: false,
  },
  {
    id: "n10",
    nome: "DuoMetric",
    categoria: "Combinado",
    score: 3,
    justificativa:
      "Sugere dados e pares; útil se o produto for analytics comparativo.",
    dominio: "duometric.com",
    top3: false,
  },
  {
    id: "n11",
    nome: "Labirinto Digital",
    categoria: "Descritivo",
    score: 2,
    justificativa:
      "Criativo porém longo; baixa puntu em memorabilidade para apps.",
    dominio: "labirintodigital.com.br",
    top3: false,
  },
  {
    id: "n12",
    nome: "Kite",
    categoria: "Inventado",
    score: 4,
    justificativa:
      "Uma palavra, leve e internacional; verificar conflito com homónimos em inglês.",
    dominio: "kite.io",
    top3: false,
  },
];

export const relatorioMarkdownMock = `# Relatório de naming (mock)

## Resumo executivo
Este relatório consolida a análise de **repetibilidade**, **diferenciação** e **fit cultural** com o posicionamento definido no briefing.

## Síntese
- *Posicionamento:* linha ténue entre inovação e confiança.  
- *Público-alvo:* decisores técnicos e founders em escala.  
- *Risco principal:* conflito fonético com marcas existentes no vertical de dados.

## Recomendações
1. Validar NIS e domínios com tempo de registo curto.  
2. Fazer prova de memorização em painel com 5–8 participantes.  
3. Garantir narrativa de marca alinhada ao arquétipo "Explorador".

---
*Dados de exemplo — sem pesquisa legal real.*`;
