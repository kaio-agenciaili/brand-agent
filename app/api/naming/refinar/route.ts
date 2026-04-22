import { crewaiUrlForNodeFetch, getCrewaiBaseUrl } from "@/lib/crewai/url";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Body = {
  projeto_id: string;
  /** Nome ou conceito sugerido pelo analista */
  nome_sugerido: string;
  /** Instruções opcionais de direção criativa */
  instrucoes?: string;
};

export async function POST(request: Request) {
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ sucesso: false, erro: "Supabase não configurado." }, { status: 500 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ sucesso: false, erro: "Não autenticado." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ sucesso: false, erro: "JSON inválido." }, { status: 400 });
  }

  if (!body.projeto_id || !body.nome_sugerido?.trim()) {
    return NextResponse.json(
      { sucesso: false, erro: "projeto_id e nome_sugerido são obrigatórios." },
      { status: 400 },
    );
  }

  // Buscar briefing do projeto
  const { data: row } = await supabase
    .from("projetos")
    .select("briefing, briefing_texto")
    .eq("id", body.projeto_id)
    .eq("created_by", user.id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ sucesso: false, erro: "Projecto não encontrado." }, { status: 404 });
  }

  const instrucoes = body.instrucoes?.trim()
    ? body.instrucoes.trim()
    : `Gera variações e iterações do nome/conceito "${body.nome_sugerido.trim()}" respeitando a estratégia e os territórios do briefing.`;

  const base = getCrewaiBaseUrl();
  let resPython: unknown;
  try {
    const res = await fetch(`${crewaiUrlForNodeFetch(base)}/refinar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomes_selecionados: [body.nome_sugerido.trim()],
        instrucoes,
        briefing_estruturado: row.briefing ?? {},
        briefing_texto: row.briefing_texto ?? "",
      }),
      signal: AbortSignal.timeout(120_000),
    });
    resPython = await res.json();
  } catch (e) {
    return NextResponse.json(
      { sucesso: false, erro: `Falha ao contactar Python: ${String(e)}` },
      { status: 502 },
    );
  }

  const pr = resPython as { sucesso?: boolean; refinamento_json?: unknown; erro?: string };
  if (!pr.sucesso) {
    return NextResponse.json(
      { sucesso: false, erro: pr.erro || "Erro no refinamento." },
      { status: 502 },
    );
  }

  return NextResponse.json({ sucesso: true, refinamento_json: pr.refinamento_json });
}
