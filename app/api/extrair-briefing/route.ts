import { mapCrewBriefingToState } from "@/lib/briefing/map-crew-briefing";
import { crewaiUrlForNodeFetch, getCrewaiBaseUrl } from "@/lib/crewai/url";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Body = {
  projeto_id: string;
  briefing_texto: string;
  concorrentes_manuais?: string[] | string | null;
};

function normConcorrentes(
  c: string[] | string | null | undefined,
): string[] {
  if (c == null) {
    return [];
  }
  if (Array.isArray(c)) {
    return c.map((x) => String(x).trim()).filter(Boolean);
  }
  return String(c)
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json(
      { sucesso: false, erro: "Supabase não configurado." },
      { status: 500 },
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { sucesso: false, erro: "Não autenticado." },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { sucesso: false, erro: "JSON inválido." },
      { status: 400 },
    );
  }
  const projetoId = (body.projeto_id || "").trim();
  const briefingTexto = (body.briefing_texto || "").trim();
  if (!projetoId || !briefingTexto) {
    return NextResponse.json(
      { sucesso: false, erro: "projeto_id e briefing_texto são obrigatórios." },
      { status: 400 },
    );
  }
  const concorrentes = normConcorrentes(body.concorrentes_manuais);

  const { data: project, error: errP } = await supabase
    .from("projetos")
    .select("id")
    .eq("id", projetoId)
    .eq("created_by", user.id)
    .maybeSingle();
  if (errP) {
    return NextResponse.json(
      { sucesso: false, erro: errP.message },
      { status: 500 },
    );
  }
  if (!project) {
    return NextResponse.json(
      { sucesso: false, erro: "Projecto não encontrado." },
      { status: 404 },
    );
  }

  const { error: upErr } = await supabase
    .from("projetos")
    .update({ briefing_texto: briefingTexto, updated_at: new Date().toISOString() })
    .eq("id", projetoId)
    .eq("created_by", user.id);
  if (upErr) {
    return NextResponse.json(
      { sucesso: false, erro: upErr.message },
      { status: 500 },
    );
  }

  const base = getCrewaiBaseUrl();
  let resPython: unknown;
  try {
    const res = await fetch(`${crewaiUrlForNodeFetch(base)}/extrair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        briefing_texto: briefingTexto,
        concorrentes_manuais: concorrentes.length ? concorrentes : null,
      }),
    });
    resPython = await res.json();
  } catch (e) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: `Crew API indisponível (${base}). Ligue o Python: ${String(e)}`,
      },
      { status: 502 },
    );
  }
  const pr = resPython as {
    sucesso?: boolean;
    briefing?: string | null;        // raw string do agente
    briefing_json?: Record<string, unknown> | null;  // JSON já parseado
    erro?: string;
  };
  if (!pr.sucesso) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: pr.erro || "A API Python devolveu erro.",
        raw: resPython,
      },
      { status: 502 },
    );
  }

  const manuaisStr = concorrentes.join("\n");
  // Usa briefing_json (já parseado) se disponível, senão cai no raw string
  const rawParaMapper = pr.briefing_json
    ? JSON.stringify(pr.briefing_json)
    : (pr.briefing ?? null);
  const briefingState = mapCrewBriefingToState(rawParaMapper, briefingTexto, manuaisStr);

  const { error: up2 } = await supabase
    .from("projetos")
    .update({
      briefing: briefingState as unknown as Record<string, unknown>,
      briefing_validado_em: null,
      benchmark_aprovado_em: null,
      benchmark: null,
      status: "em_andamento",
      updated_at: new Date().toISOString(),
    })
    .eq("id", projetoId)
    .eq("created_by", user.id);
  if (up2) {
    return NextResponse.json(
      { sucesso: false, erro: up2.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ sucesso: true, briefing: briefingState });
}
