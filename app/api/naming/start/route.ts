import { type BriefingState, diretrizesNamingParaTextoCrew } from "@/lib/briefing/types";
import { crewaiUrlForNodeFetch, getCrewaiBaseUrl } from "@/lib/crewai/url";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Body = {
  projeto_id: string;
  briefing: BriefingState;
  briefing_texto: string;
  concorrentes_manuais?: string[] | null;
  feedback_rodada?: string | null;
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
    .select("id, benchmark, avaliacoes_nomes, notas_nomes, nomes_gerados")
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
    const diretos = bench.concorrentes
      .filter((c) => c.tipo !== "indireto")
      .map((c) => c.nome)
      .join(", ");
    const indiretos = bench.concorrentes
      .filter((c) => c.tipo === "indireto")
      .map((c) => c.nome)
      .join(", ");
    textoParaCrew = `${txt}\n\n## Benchmark aprovado\n${bloco}\n\n## Leitura obrigatória do benchmark para naming\nUse os nomes dos concorrentes para entender o que o mercado já aceita, mas não copie estruturas, radicais ou clichês. Concorrentes diretos indicam padrões de categoria que precisam ser diferenciados. Concorrentes indiretos indicam códigos de linguagem e expectativa que podem inspirar sem imitar.\nConcorrentes diretos: ${diretos || "não informados"}\nConcorrentes indiretos/referências: ${indiretos || "não informados"}\nAntes de gerar nomes, identifique mentalmente padrões aceitos, clichês saturados e espaços livres.`;
  }
  textoParaCrew += diretrizesNamingParaTextoCrew(body.briefing.step5);

  const avaliacoes =
    (project.avaliacoes_nomes as
      | Record<string, { status?: string; nota?: string }>
      | null) ?? {};
  const notas = (project.notas_nomes as Record<string, string> | null) ?? {};
  const nomesGerados = (project.nomes_gerados as Record<string, unknown> | null) ?? null;
  const namingAnterior = nomesGerados?.naming_json as
    | { propostas?: Array<{ nome?: string }> }
    | null
    | undefined;
  const nomesAnteriores = (namingAnterior?.propostas ?? [])
    .map((p) => String(p.nome ?? "").trim())
    .filter(Boolean);
  const aprovados = Object.entries(avaliacoes)
    .filter(([, v]) => v.status === "shortlist")
    .map(([nome, v]) => `- ${nome}${v.nota || notas[nome] ? `: ${v.nota || notas[nome]}` : ""}`);
  const negativados = Object.entries(avaliacoes)
    .filter(([, v]) => v.status === "negativado")
    .map(([nome, v]) => `- ${nome}${v.nota || notas[nome] ? `: ${v.nota || notas[nome]}` : ""}`);
  const feedbackRodada = (body.feedback_rodada ?? "").trim();
  const aprendizados = [
    nomesAnteriores.length ? `Todos os nomes já gerados neste projeto (não repetir; usar como repertório acumulado):\n${nomesAnteriores.map((n) => `- ${n}`).join("\n")}` : "",
    aprovados.length ? `Nomes aprovados/shortlist — BASE PARA VARIAÇÕES OBRIGATÓRIAS:\n${aprovados.join("\n")}\nPara cada nome aprovado, gera pelo menos 2 variações próximas (mesma técnica, campo semântico adjacente ou nova combinação da matriz). Os aprovados mostram o que o analista gosta — amplia esse território.` : "",
    negativados.length ? `Nomes negativados (território a evitar; aprende o padrão para explorar o oposto):\n${negativados.join("\n")}` : "",
    feedbackRodada ? `FEEDBACK DO ANALISTA — prioridade máxima, sobrepõe distribuição de técnicas:\n${feedbackRodada}` : "",
  ].filter(Boolean);
  if (aprendizados.length) {
    textoParaCrew += `\n\n## Aprendizados e repertório acumulado\n${aprendizados.join("\n\n")}\n\nRegras para a nova rodada: aprenda com os nomes aprovados, evite os padrões dos negativados, não repita nomes anteriores e explique como cada nova proposta responde a esses aprendizados. Gere nomes novos para ampliar a lista acumulada do projeto.`;
  }

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
      // Depois do warm-up no browser, costuma ser rápido; margem para rede lenta / Pro Vercel.
      signal: AbortSignal.timeout(45_000),
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
