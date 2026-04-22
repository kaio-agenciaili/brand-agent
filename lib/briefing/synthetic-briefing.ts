import { TERRITORIOS } from "./territorios";
import type { ArquetipoId, BriefingState, ConcorrenteMock, Mercado } from "./types";
import { estadoBriefingVazio } from "./types";

const MOCK_CONC_IA: ConcorrenteMock[] = [
  {
    id: "a1",
    nome: "DataPeak",
    resumo: "Suite analítica B2B com foco em dashboards.",
  },
  {
    id: "a2",
    nome: "Insightory",
    resumo: "Ferramenta de insights e benchmarks sectoriais.",
  },
];

/**
 * Gera um briefing de exemplo a partir do texto colado (simula o output dos agentes).
 */
export function syntheticBriefingFromInput(
  textoBruto: string,
  concorrentesLinhas: string,
): BriefingState {
  const b = estadoBriefingVazio();
  const t = textoBruto.trim() || "Contexto ainda a completar.";

  b.step1 = {
    textoReuniao: t,
    nomeEmpresa: "Vértex Analytics",
    setor: "Tecnologia / dados",
    oQueFaz:
      "Plataforma de inteligência de negócio e automação de relatórios para equipas de growth e operações.",
    proposito:
      "Tornar a decisão baseada em dados acessível, rápida e clara em qualquer etapa do funil.",
    mercado: "B2B" as Mercado,
  };

  b.step2 = {
    perfilDemografico:
      "Líderes e analistas 28–50 anos, Brasil e Portugal, contexto híbrido remoto, familiarizados com SaaS e APIs.",
    senteEDeseja:
      "Cansaço de planilhas e dashboards genéricos; desejam clareza, velocidade e confiança nas métricas.",
    objecoes:
      "Custo; curva de aprendizagem; integrações com o stack legado; segurança e conformidade (LGPD).",
    idiomaNome: "pt",
  };

  b.step3 = {
    concorrentesManual: concorrentesLinhas.trim(),
    concorrentesIa: [...MOCK_CONC_IA],
    territoriosSelecionados: [
      TERRITORIOS[0]!.id,
      TERRITORIOS[1]!.id,
      TERRITORIOS[2]!.id,
    ],
    expandidoId: null,
    atributosPorTerritorio: {
      [TERRITORIOS[0]!.id]: ["Performance", "Confiabilidade"],
      [TERRITORIOS[1]!.id]: ["Confiança", "Pertencimento"],
    },
  };

  b.step4 = {
    arquetipos: ["explorador" as ArquetipoId, "mago" as ArquetipoId],
    eixos: { ...b.step4.eixos },
  };
  b.step4.eixos["racional-emocional"] = 42;
  b.step4.eixos["tradicional-inovador"] = 68;
  b.step4.eixos["tecnologica-humana"] = 35;

  b.step5 = {
    tiposNome: ["evocativo", "inventado"],
    comprimento: "2-3",
    palavrasEvitar: "data, solução, global, group",
    nomesInspiram: "Notion, Linear, Figma",
    extensoes: ["com", "com.br", "io"],
  };

  return b;
}
