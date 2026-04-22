import { TERRITORIOS } from "./territorios";
import type {
  ArquetipoId,
  BriefingState,
  ComprimentoPreferido,
  ExtensaoDominio,
  IdiomaNome,
  Mercado,
  TipoNomePreferido,
} from "./types";
import {
  ARQUETIPOS,
  EIXOS_PERSONALIDADE,
  estadoBriefingVazio,
  type PilulasDiretriz,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJsonBruto(s: string): Record<string, unknown> | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  const semFence = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  // tenta parse direto
  try {
    const o = JSON.parse(semFence) as unknown;
    if (o && typeof o === "object" && !Array.isArray(o)) return o as Record<string, unknown>;
  } catch { /* continua */ }
  // fallback: extrai entre chaves
  const a = semFence.indexOf("{");
  const b = semFence.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try {
      const o = JSON.parse(semFence.slice(a, b + 1)) as unknown;
      if (o && typeof o === "object" && !Array.isArray(o)) return o as Record<string, unknown>;
    } catch { /* nada */ }
  }
  return null;
}

function asStr(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  if (Array.isArray(v)) return v.map(String).join(", ");
  return String(v);
}

function asStrArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") return v.split(/,\s*|\n/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function mapMercado(v: unknown): Mercado {
  const s = asStr(v).toUpperCase();
  if (s.includes("B2B") && s.includes("B2C")) return "Ambos";
  if (s.includes("B2C") || s.includes("CONSUMIDOR")) return "B2C";
  if (s.includes("B2B") || s.includes("EMPRESA")) return "B2B";
  return "Ambos";
}

function mapIdioma(v: unknown): IdiomaNome {
  const s = asStr(v).toLowerCase();
  if (s.includes("hibr") || s.includes("both") || s.includes("mist")) return "hibrido";
  if (s.includes("en") || s.includes("ingl")) return "en";
  if (s.includes("pt") || s.includes("portug")) return "pt";
  return "sem";
}

const VALID_TERRITORIO_IDS = new Set(TERRITORIOS.map((t) => t.id));
const TERRITORIO_ATRIBUTOS = new Map(TERRITORIOS.map((t) => [t.id, new Set(t.atributos)]));
const VALID_ARQUETIPO_IDS = new Set<string>(ARQUETIPOS.map((a) => a.id));
const VALID_EIXO_IDS = new Set(EIXOS_PERSONALIDADE.map((e) => e.id));
const VALID_TIPOS_NOME = new Set<TipoNomePreferido>(["inventado", "evocativo", "combinado", "descritivo"]);
const VALID_COMPRIMENTO = new Set<ComprimentoPreferido>(["1", "2-3", "4+", "sem"]);
const VALID_EXTENSOES = new Set<ExtensaoDominio>(["com.br", "com", "io", "app"]);

function nomeEmpresaFromJson(p: Record<string, unknown>): string {
  for (const k of [
    "empresa",
    "nome_empresa",
    "nome_marca",
    "marca",
    "nome_projeto",
    "brand",
    "nome",
  ]) {
    const v = asStr(p[k], "").trim();
    if (v) {
      return v;
    }
  }
  return "";
}

function pilulasFromExtracao(
  sugeridasRaw: unknown,
  textoResumo: string,
): PilulasDiretriz {
  let sugeridas = asStrArray(sugeridasRaw)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 24);
  if (!sugeridas.length && textoResumo.trim()) {
    sugeridas = textoResumo
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 16);
  }
  return { sugeridas, selecionadas: [] };
}

function mapTerritorios(raw: unknown): string[] {
  return asStrArray(raw).filter((id) => VALID_TERRITORIO_IDS.has(id));
}

function mapAtributosPorTerritorio(raw: unknown, territoriosSelecionados: string[]): Record<string, string[]> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string[]> = {};
  for (const tid of territoriosSelecionados) {
    const rawAttrs = (raw as Record<string, unknown>)[tid];
    const validAttrs = TERRITORIO_ATRIBUTOS.get(tid);
    if (!validAttrs) continue;
    const attrs = asStrArray(rawAttrs).filter((a) => validAttrs.has(a));
    if (attrs.length) out[tid] = attrs;
  }
  return out;
}

function mapArquetipos(raw: unknown): ArquetipoId[] {
  return asStrArray(raw).filter((id) => VALID_ARQUETIPO_IDS.has(id)) as ArquetipoId[];
}

function mapEixos(raw: unknown, defaults: Record<string, number>): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const result = { ...defaults };
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!VALID_EIXO_IDS.has(k)) continue;
    const n = Number(v);
    if (!isNaN(n)) result[k] = Math.min(100, Math.max(0, Math.round(n)));
  }
  return result;
}

function mapTiposNome(raw: unknown): TipoNomePreferido[] {
  return asStrArray(raw).filter((t) => VALID_TIPOS_NOME.has(t as TipoNomePreferido)) as TipoNomePreferido[];
}

function mapComprimento(raw: unknown): ComprimentoPreferido {
  const s = asStr(raw).trim() as ComprimentoPreferido;
  return VALID_COMPRIMENTO.has(s) ? s : "sem";
}

function mapExtensoes(raw: unknown, defaults: ExtensaoDominio[]): ExtensaoDominio[] {
  const filtered = asStrArray(raw).filter((e) => VALID_EXTENSOES.has(e as ExtensaoDominio)) as ExtensaoDominio[];
  return filtered.length ? filtered : defaults;
}

// ---------------------------------------------------------------------------
// Função pública
// ---------------------------------------------------------------------------

/**
 * Converte o JSON rico devolvido pelo agente de extração para BriefingState completo.
 * Aceita tanto o JSON bruto (string com fence de markdown) quanto o objeto já parseado.
 */
export function mapCrewBriefingToState(
  briefingTaskOutput: string | null | undefined,
  textoReuniao: string,
  concorrentesManual: string,
): BriefingState {
  const b = estadoBriefingVazio();
  b.step1.textoReuniao = textoReuniao.trim();
  b.step3.concorrentesManual = concorrentesManual.trim();

  const p = parseJsonBruto(
    typeof briefingTaskOutput === "string" ? briefingTaskOutput : "",
  );
  if (!p) return b;

  // --- Step 1 ---
  const nomeEmp = nomeEmpresaFromJson(p);
  b.step1 = {
    ...b.step1,
    nomeEmpresa: nomeEmp || asStr(p.empresa, b.step1.nomeEmpresa),
    setor: asStr(p.setor, b.step1.setor),
    oQueFaz: asStr(p.o_que_faz ?? p["o_que_faz"], b.step1.oQueFaz),
    proposito: asStr(p.proposito ?? p.missao ?? p["proposito_missao"], b.step1.proposito),
    mercado: mapMercado(p.mercado),
  };

  // --- Step 2 ---
  b.step2 = {
    perfilDemografico: asStr(
      p.publico_alvo ?? p.perfil_demografico,
      b.step2.perfilDemografico,
    ),
    senteEDeseja: asStr(
      p.tom_desejado ?? p.o_que_sente_deseja ?? p.sente_deseja,
      b.step2.senteEDeseja,
    ),
    objecoes: asStr(
      p.objecoes ?? p.principais_objeções ?? p.principais_objecoes,
      b.step2.objecoes,
    ),
    idiomaNome: mapIdioma(p.idioma),
  };

  // --- Step 3 — Territórios ---
  const territoriosSelecionados = mapTerritorios(p.territorios_sugeridos);
  const atributosPorTerritorio = mapAtributosPorTerritorio(
    p.atributos_por_territorio,
    territoriosSelecionados,
  );
  b.step3 = {
    ...b.step3,
    territoriosSelecionados,
    atributosPorTerritorio,
  };

  // --- Step 4 — Personalidade ---
  b.step4 = {
    arquetipos: mapArquetipos(p.arquetipos_sugeridos),
    eixos: mapEixos(p.eixos_sugeridos, b.step4.eixos),
  };

  // --- Step 5 — Diretrizes de naming ---
  const palavrasEvitarStr = asStr(p.palavras_evitar, b.step5.palavrasEvitar);
  const nomesInspiramStr = asStr(p.nomes_inspiram, b.step5.nomesInspiram);
  const nomesNegativarStr = asStr(p.nomes_negativar, b.step5.nomesNegativar);
  const sinonimosStr = asStr(p.sinonimos_gosto, b.step5.sinonimosGosto);
  const outrasStr = asStr(p.outras_notas_naming, b.step5.outrasNotasNaming);

  b.step5 = {
    tiposNome: mapTiposNome(p.tipos_nome_sugeridos),
    comprimento: mapComprimento(p.comprimento_sugerido),
    palavrasEvitar: palavrasEvitarStr,
    nomesInspiram: nomesInspiramStr,
    nomesNegativar: nomesNegativarStr,
    sinonimosGosto: sinonimosStr,
    outrasNotasNaming: outrasStr,
    extensoes: mapExtensoes(p.extensoes_sugeridas, b.step5.extensoes),
    pilulasSinonimos: pilulasFromExtracao(p.sinonimos_gosto_sugeridos, sinonimosStr),
    pilulasEvitar: pilulasFromExtracao(p.palavras_evitar_sugeridas, palavrasEvitarStr),
    pilulasInspiram: pilulasFromExtracao(p.nomes_inspiram_sugeridos, nomesInspiramStr),
    pilulasNegativar: pilulasFromExtracao(p.nomes_negativar_sugeridos, nomesNegativarStr),
    pilulasOutras: pilulasFromExtracao(p.outras_notas_sugeridas, outrasStr),
  };

  return b;
}
