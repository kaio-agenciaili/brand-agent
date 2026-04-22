import { type BriefingState, diretrizesNamingParaTextoCrew } from "@/lib/briefing/types";
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

  const projetoId = (body.projeto_id || "").trim();
  const txt = (body.briefing_texto || "").trim();

  if (!projetoId || !body.briefing || !txt) {
    return NextResponse.json({ sucesso: false, erro: "projeto_id, briefing e briefing_texto são obrigatórios." }, { status: 400 });
  }

  const { data: project, error: errP } = await supabase
    .from("projetos")
    .select("id, benchmark")
    .eq("id", projetoId)
    .eq("created_by", user.id)
    .maybeSingle();

  if (errP || !project) {
    return NextResponse.json({ sucesso: false, erro: errP?.message || "Projecto não encontrado." }, { status: 404 });
  }

  // Salvar briefing e marcar em andamento
  await supabase.from("projetos").update({
    briefing: body.briefing as unknown as Record<string, unknown>,
    briefing_texto: txt,
    status: "em_andamento",
    updated_at: new Date().toISOString(),
  }).eq("id", projetoId).eq("created_by", user.id);

  // Montar texto para o crew (inclui benchmark aprovado + diretrizes step5)
  const bench = project.benchmark as { concorrentes?: { nome: string; tipo?: string; resumo: string }[] } | null;
  let textoParaCrew = txt;
  if (bench?.concorrentes?.length) {
    const bloco = bench.concorrentes
      .map((c) => `- ${c.nome} (${c.tipo === "indireto" ? "indireto" : "direto"}): ${c.resumo}`)
      .join("\n");
    textoParaCrew = `${txt}\n\n## Benchmark aprovado\n${bloco}`;
  }
  textoParaCrew += diretrizesNamingParaTextoCrew(body.briefing.step5);

  const concor = body.concorrentes_manuais?.length ? body.concorrentes_manuais : null;
  const base = getCrewaiBaseUrl();

  // Chamar /naming/start no Python e retornar job_id
  let jobId: string;
  try {
    const res = await fetch(`${crewaiUrlForNodeFetch(base)}/naming/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        briefing_texto: textoParaCrew,
        concorrentes_manuais: concor,
        briefing_estruturado: body.briefing as unknown as Record<string, unknown>,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json()) as { job_id?: string };
    if (!data.job_id) throw new Error("Python não retornou job_id.");
    jobId = data.job_id;
  } catch (e) {
    return NextResponse.json(
      { sucesso: false, erro: `Falha ao iniciar job Python: ${String(e)}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ sucesso: true, job_id: jobId, projeto_id: projetoId });
}
