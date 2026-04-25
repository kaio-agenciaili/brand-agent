import {
  type BriefingState,
  diretrizesNamingParaTextoCrew,
} from "@/lib/briefing/types";
import { crewaiUrlForNodeFetch, getCrewaiBaseUrl } from "@/lib/crewai/url";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Body = {
  projeto_id: string;
  briefing: BriefingState;
  briefing_texto: string;
  concorrentes_manuais?: string[] | null;
};

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
  const txt = (body.briefing_texto || "").trim();
  if (!projetoId) {
    return NextResponse.json(
      { sucesso: false, erro: "projeto_id é obrigatório." },
      { status: 400 },
    );
  }
  if (!body.briefing) {
    return NextResponse.json(
      { sucesso: false, erro: "briefing é obrigatório." },
      { status: 400 },
    );
  }
  if (!txt) {
    return NextResponse.json(
      { sucesso: false, erro: "briefing_texto é obrigatório." },
      { status: 400 },
    );
  }

  const { data: project, error: errP } = await supabase
    .from("projetos")
    .select("id, benchmark")
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

  const { error: up0 } = await supabase
    .from("projetos")
    .update({
      briefing: body.briefing as unknown as Record<string, unknown>,
      briefing_texto: txt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projetoId)
    .eq("created_by", user.id);
  if (up0) {
    return NextResponse.json(
      { sucesso: false, erro: up0.message },
      { status: 500 },
    );
  }

  const concor = body.concorrentes_manuais?.length
    ? body.concorrentes_manuais
    : null;

  let textoParaCrew = txt;
  const bench = project.benchmark as
    | { concorrentes?: { nome: string; tipo?: string; resumo: string }[] }
    | null
    | undefined;
  if (bench?.concorrentes?.length) {
    const bloco = bench.concorrentes
      .map(
        (c) =>
          `- ${c.nome} (${c.tipo === "indireto" ? "indireto" : "direto"}): ${c.resumo}`,
      )
      .join("\n");
    textoParaCrew = `${txt}\n\n## Benchmark aprovado\n${bloco}`;
  }

  textoParaCrew += diretrizesNamingParaTextoCrew(body.briefing.step5);

  const { error: upStatus } = await supabase
    .from("projetos")
    .update({
      status: "em_andamento",
      updated_at: new Date().toISOString(),
    })
    .eq("id", projetoId)
    .eq("created_by", user.id);
  if (upStatus) {
    return NextResponse.json(
      { sucesso: false, erro: upStatus.message },
      { status: 500 },
    );
  }

  const base = getCrewaiBaseUrl();
  let resPython: unknown;
  try {
    const res = await fetch(`${crewaiUrlForNodeFetch(base)}/naming`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        briefing_texto: textoParaCrew,
        concorrentes_manuais: concor,
        briefing_estruturado: body.briefing as unknown as Record<
          string,
          unknown
        >,
      }),
      signal: AbortSignal.timeout(300_000),
    });
    resPython = await res.json();
  } catch (e) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: `Crew API ou timeout. Verifique o servidor Python em ${base}. ${String(e)}`,
      },
      { status: 502 },
    );
  }
  const pr = resPython as {
    sucesso?: boolean;
    relatorio_final?: string;
    tasks_outputs?: Record<string, string>;
    naming_json?: Record<string, unknown> | null;
    erro?: string;
  };
  if (!pr.sucesso) {
    return NextResponse.json(
      { sucesso: false, erro: pr.erro || "Erro no naming.", raw: resPython },
      { status: 502 },
    );
  }

  const nomesPayload = {
    ...(pr.tasks_outputs || {}),
    naming_json: pr.naming_json ?? null,
  };

  const { error: up1 } = await supabase
    .from("projetos")
    .update({
      nomes_gerados: nomesPayload as unknown as Record<string, unknown>,
      relatorio_final: pr.relatorio_final || "",
      status: "gerado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", projetoId)
    .eq("created_by", user.id);
  if (up1) {
    return NextResponse.json(
      { sucesso: false, erro: up1.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    sucesso: true,
    relatorio_final: pr.relatorio_final,
    tasks_outputs: pr.tasks_outputs,
    naming_json: pr.naming_json ?? null,
  });
}
