import { crewaiUrlForNodeFetch, getCrewaiBaseUrl } from "@/lib/crewai/url";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NamingJson = {
  propostas?: Array<Record<string, unknown> & { nome?: string }>;
  top3?: Array<Record<string, unknown> & { nome?: string }>;
  sintese_bases?: string;
  [key: string]: unknown;
};

function nomeKey(nome: unknown): string {
  return String(nome ?? "").trim().toLocaleLowerCase("pt-BR");
}

function mergeNamingJson(anterior: unknown, novo: unknown): unknown {
  if (!novo || typeof novo !== "object" || Array.isArray(novo)) {
    return novo ?? anterior ?? null;
  }
  const novoJson = novo as NamingJson;
  const anteriorJson =
    anterior && typeof anterior === "object" && !Array.isArray(anterior)
      ? (anterior as NamingJson)
      : null;
  const propostasAnteriores = Array.isArray(anteriorJson?.propostas)
    ? anteriorJson!.propostas
    : [];
  const propostasNovas = Array.isArray(novoJson.propostas) ? novoJson.propostas : [];
  const byNome = new Map<string, Record<string, unknown> & { nome?: string }>();

  for (const p of propostasAnteriores) {
    const key = nomeKey(p.nome);
    if (key) byNome.set(key, { ...p, rodada_origem: p.rodada_origem ?? "anterior" });
  }
  for (const p of propostasNovas) {
    const key = nomeKey(p.nome);
    if (key) byNome.set(key, { ...p, rodada_origem: "atual" });
  }

  const propostas = Array.from(byNome.values());
  const sinteseAnterior = anteriorJson?.sintese_bases ? String(anteriorJson.sintese_bases) : "";
  const sinteseNova = novoJson.sintese_bases ? String(novoJson.sintese_bases) : "";

  return {
    ...anteriorJson,
    ...novoJson,
    propostas,
    top3: Array.isArray(novoJson.top3) ? novoJson.top3 : anteriorJson?.top3 ?? [],
    sintese_bases: [sinteseAnterior, sinteseNova].filter(Boolean).join("\n\n"),
    total_propostas_acumuladas: propostas.length,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("job_id");
  const projetoId = searchParams.get("projeto_id");

  if (!jobId || !projetoId) {
    return new Response("Parâmetros job_id e projeto_id são obrigatórios.", { status: 400 });
  }

  const supabase = createClient();
  if (!supabase) {
    return new Response("Supabase não configurado.", { status: 500 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const { data: projectSnapshot } = await supabase
    .from("projetos")
    .select("nomes_gerados")
    .eq("id", projetoId)
    .eq("created_by", user.id)
    .maybeSingle();
  const nomesGeradosAnteriores =
    (projectSnapshot?.nomes_gerados as Record<string, unknown> | null) ?? null;

  const base = getCrewaiBaseUrl();
  let pythonRes: Response;
  try {
    pythonRes = await fetch(`${crewaiUrlForNodeFetch(base)}/naming/stream/${jobId}`, {
      headers: { Accept: "text/event-stream" },
      signal: AbortSignal.timeout(600_000),
    });
  } catch (e) {
    return new Response(`Falha ao conectar ao stream Python: ${String(e)}`, { status: 502 });
  }

  if (!pythonRes.ok || !pythonRes.body) {
    return new Response("Stream Python indisponível.", { status: 502 });
  }

  const encoder = new TextEncoder();
  const reader = pythonRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const partialOutputs: Record<string, string> = {};

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const eventStr = line.slice(6).trim();
            if (!eventStr) continue;

            // Repassar evento ao browser
            controller.enqueue(encoder.encode(`data: ${eventStr}\n\n`));

            try {
              const event = JSON.parse(eventStr) as Record<string, unknown>;

              // Salvar output incremental por agente
              if (event.type === "agent_done" && event.agente && event.output) {
                partialOutputs[event.agente as string] = event.output as string;
                await supabase.from("projetos").update({
                  nomes_gerados: {
                    ...(nomesGeradosAnteriores ?? {}),
                    rodada_em_andamento: { ...partialOutputs },
                  } as unknown as Record<string, unknown>,
                  updated_at: new Date().toISOString(),
                }).eq("id", projetoId).eq("created_by", user.id);
              }

              // Salvar resultado final
              if (event.type === "done") {
                const namingJsonAcumulado = mergeNamingJson(
                  nomesGeradosAnteriores?.naming_json,
                  event.naming_json,
                );
                const nomesPayload = {
                  ...(nomesGeradosAnteriores ?? {}),
                  ...((event.tasks_outputs as Record<string, unknown>) || {}),
                  naming_json: namingJsonAcumulado,
                  fonetica_json: event.fonetica_json ?? null,
                  ultima_rodada_json: event.naming_json ?? null,
                };
                await supabase.from("projetos").update({
                  nomes_gerados: nomesPayload as unknown as Record<string, unknown>,
                  relatorio_final: (event.relatorio_final as string) || "",
                  status: "concluido",
                  updated_at: new Date().toISOString(),
                }).eq("id", projetoId).eq("created_by", user.id);
              }

              if (event.type === "stream_end" || event.type === "error" || event.type === "timeout") {
                break;
              }
            } catch {
              // evento não-JSON, ignorar
            }
          }
        }
      } finally {
        controller.close();
        reader.cancel();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
