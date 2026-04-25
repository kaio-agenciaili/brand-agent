/**
 * Tipos e helpers para a página de resultados de naming.
 */

export type FoneticaNome = {
  pronuncia_pt?: string;
  pronuncia_en?: string;
  ritmo?: string;
  memorabilidade?: string;
  facilidade_escrita?: string;
  alerta_fonetico?: string;
  score_fonetico?: number;
  score_pronuncia_pt?: number;
  score_pronuncia_en?: number;
  score_facilidade_escrita?: number;
  risco_ouvido?: string;
  risco_grafia?: string;
};

export type PropostaNaming = {
  nome?: string;
  tecnica_naming?: string;
  formula_tecnica?: string;
  categoria?: string;
  territorio_estrategico?: string;
  etimologia?: string;
  justificativa?: string;
  base_conceitual?: string;
  por_que_e_diferente_dos_concorrentes?: string;
  dominio_sugerido?: string;
  alerta?: string;
  score_registrabilidade?: number;
  score_memorabilidade?: number;
  score_sonoridade?: number;
  score_originalidade?: number;
  score_potencial_premium?: number;
  score_final?: number;
  fonetica?: FoneticaNome;
  /** Análise pós-naming: possível colisão com marca global forte */
  colisao_marca_grande?: boolean;
  marca_grande_referencia?: string;
  gravidade_colisao?: string;
  explicacao_colisao?: string;
};

export type Top3Item = {
  nome?: string;
  justificativa?: string;
  base_estrategica?: string;
  defesa_para_apresentacao?: string;
  colisao_marca_grande?: boolean;
  marca_grande_referencia?: string;
  explicacao_colisao?: string;
};

export type NamingJson = {
  propostas?: PropostaNaming[];
  top3?: Top3Item[];
  sintese_bases?: string;
  ranking_final?: Record<string, unknown>;
  plano_da_rodada?: Record<string, unknown>;
  processo_criativo?: Record<string, unknown>;
};

export type FoneticaJson = {
  analise?: FoneticaNome[];
};

function jsonFromStringLoose(s: string): NamingJson | null {
  const t = s.trim();
  if (!t) return null;
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  const body = fence ? fence[1].trim() : t;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as NamingJson;
  } catch {
    return null;
  }
}

function mergeFonetica(propostas: PropostaNaming[], foneticaJson: FoneticaJson | null): PropostaNaming[] {
  if (!foneticaJson?.analise?.length) return propostas;
  const foneticaMap = new Map(
    foneticaJson.analise.map((f) => [f.pronuncia_pt ?? "", f]),
  );
  // Indexar por nome — foneticaJson.analise items têm campo "nome" no Python
  const foneticaByNome = new Map<string, FoneticaNome>();
  for (const item of foneticaJson.analise) {
    const nome = (item as unknown as Record<string, unknown>)["nome"] as string | undefined;
    if (nome) foneticaByNome.set(nome, item);
  }
  void foneticaMap;
  return propostas.map((p) => {
    if (!p.nome || p.fonetica) return p;
    const fon = foneticaByNome.get(p.nome);
    return fon ? { ...p, fonetica: fon } : p;
  });
}

export function extrairNamingParseado(
  nomesGeral: Record<string, unknown> | null,
): { parsed: NamingJson | null; rawNaming: string; foneticaJson: FoneticaJson | null } {
  if (!nomesGeral) return { parsed: null, rawNaming: "", foneticaJson: null };

  const foneticaJson = (nomesGeral.fonetica_json as FoneticaJson | null) ?? null;

  const direct = nomesGeral.naming_json;
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    const parsed = direct as NamingJson;
    if (parsed.propostas && foneticaJson) {
      parsed.propostas = mergeFonetica(parsed.propostas, foneticaJson);
    }
    return {
      parsed,
      rawNaming:
        typeof nomesGeral.naming === "string"
          ? nomesGeral.naming
          : JSON.stringify(direct, null, 2),
      foneticaJson,
    };
  }

  const raw = typeof nomesGeral.naming === "string" ? nomesGeral.naming : null;
  if (!raw) {
    return { parsed: null, rawNaming: JSON.stringify(nomesGeral, null, 2), foneticaJson };
  }

  const parsed = jsonFromStringLoose(raw);
  if (parsed?.propostas && foneticaJson) {
    parsed.propostas = mergeFonetica(parsed.propostas, foneticaJson);
  }
  return { parsed, rawNaming: raw, foneticaJson };
}
