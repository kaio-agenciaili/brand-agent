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

export interface ConcorrenteMock {
  id: string;
  nome: string;
  resumo: string;
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
  extensoes: ExtensaoDominio[];
}

export interface BriefingState {
  step1: BriefingStep1;
  step2: BriefingStep2;
  step3: BriefingStep3;
  step4: BriefingStep4;
  step5: BriefingStep5;
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
      extensoes: ["com", "com.br"],
    },
  };
}
