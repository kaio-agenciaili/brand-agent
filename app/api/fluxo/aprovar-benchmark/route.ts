import type { BenchmarkState } from "@/lib/briefing/benchmark-types";
import type { BriefingState } from "@/lib/briefing/types";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Body = {
  projeto_id: string;
  briefing: BriefingState;
  benchmark: BenchmarkState;
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
  if (!projetoId || !body.briefing || !body.benchmark) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: "projeto_id, briefing e benchmark são obrigatórios.",
      },
      { status: 400 },
    );
  }

  const concorrentes = body.benchmark.concorrentes.filter(
    (c) => c.nome.trim().length > 0,
  );
  if (concorrentes.length === 0) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: "Inclua pelo menos um concorrente com nome antes de aprovar.",
      },
      { status: 400 },
    );
  }
  if (concorrentes.length > 10) {
    return NextResponse.json(
      { sucesso: false, erro: "Máximo de 10 concorrentes." },
      { status: 400 },
    );
  }

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

  const briefing = { ...body.briefing };
  briefing.step3 = {
    ...briefing.step3,
    concorrentesManual: concorrentes.map((c) => c.nome.trim()).join("\n"),
    concorrentesIa: concorrentes.map((c) => ({
      id: c.id,
      nome: c.nome.trim(),
      resumo: c.resumo.trim() || "—",
      tipo: c.tipo,
    })),
  };

  const benchmarkLimpo: BenchmarkState = {
    concorrentes: concorrentes.map((c) => ({
      ...c,
      nome: c.nome.trim(),
      resumo: c.resumo.trim(),
    })),
  };

  const agora = new Date().toISOString();
  const { error: up } = await supabase
    .from("projetos")
    .update({
      briefing: briefing as unknown as Record<string, unknown>,
      benchmark: benchmarkLimpo as unknown as Record<string, unknown>,
      benchmark_aprovado_em: agora,
      updated_at: agora,
    })
    .eq("id", projetoId)
    .eq("created_by", user.id);

  if (up) {
    return NextResponse.json(
      { sucesso: false, erro: up.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ sucesso: true });
}
