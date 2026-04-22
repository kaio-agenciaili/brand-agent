export type Mercado = "B2B" | "B2C" | "Ambos";

export type IdiomaNome = "pt" | "en" | "hibrido" | "sem";

export type ArquetipoId =
  | "cuidador"
  | "sabio"
  | "inocente"
  | "heroi"
  | "explorador"
  | "criador"
  | "governante"
  | "mago"
  | "fora-da-lei"
  | "bobo"
  | "amante"
  | "cara-comum";

export const ARQUETIPOS: { id: ArquetipoId; label: string }[] = [
  { id: "cuidador", label: "Cuidador" },
  { id: "sabio", label: "Sábio" },
  { id: "inocente", label: "Inocente" },
  { id: "heroi", label: "Herói" },
  { id: "explorador", label: "Explorador" },
  { id: "criador", label: "Criador" },
  { id: "governante", label: "Governante" },
  { id: "mago", label: "Mago" },
  { id: "fora-da-lei", label: "Fora-da-lei" },
  { id: "bobo", label: "Bobo" },
  { id: "amante", label: "Amante" },
  { id: "cara-comum", label: "Cara comum" },
];

export type TipoNomePreferido =
  | "inventado"
  | "evocativo"
  | "combinado"
  | "descritivo";

export type ComprimentoPreferido = "1" | "2-3" | "4+" | "sem";

export type ExtensaoDominio = "com.br" | "com" | "io" | "app";

/** Pílulas sugeridas pela IA; o humano selecciona as que aplicam. */
export type PilulasDiretriz = {
  sugeridas: string[];
  selecionadas: string[];
};

export interface ConcorrenteMock {
  id: string;
  nome: string;
  resumo: string;
  tipo?: "direto" | "indireto";
}

export interface BriefingStep1 {
  textoReuniao: string;
  nomeEmpresa: string;
  setor: string;
  oQueFaz: string;
  proposito: string;
  mercado: Mercado;
}

export interface BriefingStep2 {
  perfilDemografico: string;
  senteEDeseja: string;
  objecoes: string;
  idiomaNome: IdiomaNome;
}

export interface BriefingStep3 {
  concorrentesManual: string;
  concorrentesIa: ConcorrenteMock[];
  territoriosSelecionados: string[];
  expandidoId: string | null;
  atributosPorTerritorio: Record<string, string[]>;
}

export interface BriefingStep4 {
  arquetipos: ArquetipoId[];
  /** chave = id do eixo, valor 0–100 */
  eixos: Record<string, number>;
}

export const EIXOS_PERSONALIDADE: {
  id: string;
  esquerda: string;
  direita: string;
}[] = [
  { id: "racional-emocional", esquerda: "Racional", direita: "Emocional" },
  { id: "simples-sofisticado", esquerda: "Simples", direita: "Sofisticado" },
  { id: "tradicional-inovador", esquerda: "Tradicional", direita: "Inovador" },
  { id: "acessivel-exclusivo", esquerda: "Acessível", direita: "Exclusivo" },
  { id: "contido-expressivo", esquerda: "Contido", direita: "Expressivo" },
  { id: "formal-ousada", esquerda: "Formal", direita: "Ousada" },
  { id: "masculino-feminino", esquerda: "Masculino", direita: "Feminino" },
  { id: "calmo-energetico", esquerda: "Calmo", direita: "Energético" },
  { id: "jovem-madura", esquerda: "Jovem", direita: "Madura" },
  { id: "equilibrado-vibrante", esquerda: "Equilibrado", direita: "Vibrante" },
  { id: "tecnica-proxima", esquerda: "Técnica", direita: "Próxima" },
  {
    id: "tecnologica-humana",
    esquerda: "Tecnológica",
    direita: "Humana",
  },
];

export interface BriefingStep5 {
  tiposNome: TipoNomePreferido[];
  comprimento: ComprimentoPreferido;
  palavrasEvitar: string;
  nomesInspiram: string;
  /** Nomes ou marcas que não quer ver (negativar) — texto livre além das pílulas */
  nomesNegativar: string;
  /** Sinónimos, termos ou associações semânticas de que gosta */
  sinonimosGosto: string;
  /** Outras preferências ou restrições para o naming */
  outrasNotasNaming: string;
  extensoes: ExtensaoDominio[];
  pilulasSinonimos: PilulasDiretriz;
  pilulasEvitar: PilulasDiretriz;
  pilulasInspiram: PilulasDiretriz;
  pilulasNegativar: PilulasDiretriz;
  pilulasOutras: PilulasDiretriz;
}

export interface BriefingState {
  step1: BriefingStep1;
  step2: BriefingStep2;
  step3: BriefingStep3;
  step4: BriefingStep4;
  step5: BriefingStep5;
}

export function pilulasDiretrizVazias(): PilulasDiretriz {
  return { sugeridas: [], selecionadas: [] };
}

export function estadoBriefingVazio(): BriefingState {
  const eixos: Record<string, number> = {};
  for (const e of EIXOS_PERSONALIDADE) {
    eixos[e.id] = 50;
  }
  return {
    step1: {
      textoReuniao: "",
      nomeEmpresa: "",
      setor: "",
      oQueFaz: "",
      proposito: "",
      mercado: "B2B",
    },
    step2: {
      perfilDemografico: "",
      senteEDeseja: "",
      objecoes: "",
      idiomaNome: "pt",
    },
    step3: {
      concorrentesManual: "",
      concorrentesIa: [],
      territoriosSelecionados: [],
      expandidoId: null,
      atributosPorTerritorio: {},
    },
    step4: { arquetipos: [], eixos },
    step5: {
      tiposNome: [],
      comprimento: "sem",
      palavrasEvitar: "",
      nomesInspiram: "",
      nomesNegativar: "",
      sinonimosGosto: "",
      outrasNotasNaming: "",
      extensoes: ["com", "com.br"],
      pilulasSinonimos: pilulasDiretrizVazias(),
      pilulasEvitar: pilulasDiretrizVazias(),
      pilulasInspiram: pilulasDiretrizVazias(),
      pilulasNegativar: pilulasDiretrizVazias(),
      pilulasOutras: pilulasDiretrizVazias(),
    },
  };
}

function mergePilulas(
  base: PilulasDiretriz,
  partial?: Partial<PilulasDiretriz>,
): PilulasDiretriz {
  const sugeridas = partial?.sugeridas ?? base.sugeridas;
  const selecionadas = partial?.selecionadas ?? base.selecionadas;
  return {
    sugeridas: Array.isArray(sugeridas) ? sugeridas : base.sugeridas,
    selecionadas: Array.isArray(selecionadas) ? selecionadas : base.selecionadas,
  };
}

/** Texto extra para a crew / LLM (além do JSON estruturado). */
export function diretrizesNamingParaTextoCrew(s: BriefingStep5): string {
  const juntar = (pil: PilulasDiretriz | undefined, extra: string | undefined): string => {
    const p = pil?.selecionadas?.filter(Boolean) ?? [];
    const e = (extra ?? "").trim();
    const partes = [...p];
    if (e) {
      partes.push(e);
    }
    return partes.join("; ");
  };

  const linhas: string[] = [];
  const neg = juntar(s.pilulasNegativar, s.nomesNegativar);
  if (neg) {
    linhas.push(`Nomes a negativar (não propor nem variações óbvias): ${neg}`);
  }
  const sin = juntar(s.pilulasSinonimos, s.sinonimosGosto);
  if (sin) {
    linhas.push(`Sinónimos ou termos de que gosta: ${sin}`);
  }
  const ev = juntar(s.pilulasEvitar, s.palavrasEvitar);
  if (ev) {
    linhas.push(`Palavras, raízes ou sílabas a evitar: ${ev}`);
  }
  const ins = juntar(s.pilulasInspiram, s.nomesInspiram);
  if (ins) {
    linhas.push(`Marcas ou nomes de referência (inspiração, sem copiar): ${ins}`);
  }
  const out = juntar(s.pilulasOutras, s.outrasNotasNaming);
  if (out) {
    linhas.push(`Outras notas para o naming: ${out}`);
  }
  if (s.tiposNome?.length) {
    linhas.push(`Tipos de nome preferidos: ${s.tiposNome.join(", ")}`);
  }
  if (s.comprimento && s.comprimento !== "sem") {
    linhas.push(`Comprimento (sílabas): ${s.comprimento}`);
  }
  if (s.extensoes?.length) {
    linhas.push(
      `Extensões de domínio desejadas: ${s.extensoes.map((e) => `.${e}`).join(", ")}`,
    );
  }
  if (!linhas.length) {
    return "";
  }
  return `\n\n## Diretrizes explícitas de naming\n${linhas.join("\n")}`;
}

export function briefingDesdeDb(data: unknown): BriefingState {
  const base = estadoBriefingVazio();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return base;
  }
  const r = data as Partial<BriefingState>;
  const s5 = (r.step5 ?? {}) as Partial<BriefingStep5>;
  return {
    step1: { ...base.step1, ...r.step1 },
    step2: { ...base.step2, ...r.step2 },
    step3: { ...base.step3, ...r.step3 },
    step4: {
      ...base.step4,
      ...r.step4,
      eixos: { ...base.step4.eixos, ...r.step4?.eixos },
      arquetipos: r.step4?.arquetipos ?? base.step4.arquetipos,
    },
    step5: {
      ...base.step5,
      ...s5,
      pilulasSinonimos: mergePilulas(
        base.step5.pilulasSinonimos,
        s5.pilulasSinonimos,
      ),
      pilulasEvitar: mergePilulas(base.step5.pilulasEvitar, s5.pilulasEvitar),
      pilulasInspiram: mergePilulas(
        base.step5.pilulasInspiram,
        s5.pilulasInspiram,
      ),
      pilulasNegativar: mergePilulas(
        base.step5.pilulasNegativar,
        s5.pilulasNegativar,
      ),
      pilulasOutras: mergePilulas(
        base.step5.pilulasOutras,
        s5.pilulasOutras,
      ),
    },
  };
}
