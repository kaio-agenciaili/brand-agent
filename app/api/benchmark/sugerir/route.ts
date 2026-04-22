import { crewaiUrlForNodeFetch, getCrewaiBaseUrl } from "@/lib/crewai/url";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Body = {
  projeto_id: string;
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

  if (!body.projeto_id?.trim()) {
    return NextResponse.json({ sucesso: false, erro: "projeto_id é obrigatório." }, { status: 400 });
  }

  const { data: row } = await supabase
    .from("projetos")
    .select("briefing, briefing_texto")
    .eq("id", body.projeto_id)
    .eq("created_by", user.id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ sucesso: false, erro: "Projecto não encontrado." }, { status: 404 });
  }

  const base = getCrewaiBaseUrl();
  let resPython: unknown;
  try {
    const res = await fetch(`${crewaiUrlForNodeFetch(base)}/benchmark/sugerir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        briefing_texto: row.briefing_texto ?? "",
        briefing_estruturado: row.briefing ?? {},
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

  const pr = resPython as {
    sucesso?: boolean;
    concorrentes_json?: { concorrentes?: unknown[] } | null;
    erro?: string;
  };

  if (!pr.sucesso) {
    return NextResponse.json(
      { sucesso: false, erro: pr.erro || "Erro ao sugerir concorrentes." },
      { status: 502 },
    );
  }

  const concorrentes = pr.concorrentes_json?.concorrentes ?? [];
  return NextResponse.json({ sucesso: true, concorrentes });
}
