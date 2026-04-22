import { crewaiUrlForNodeFetch, getCrewaiBaseUrl } from "@/lib/crewai/url";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
                  nomes_gerados: { ...partialOutputs } as unknown as Record<string, unknown>,
                  updated_at: new Date().toISOString(),
                }).eq("id", projetoId).eq("created_by", user.id);
              }

              // Salvar resultado final
              if (event.type === "done") {
                const nomesPayload = {
                  ...((event.tasks_outputs as Record<string, unknown>) || {}),
                  naming_json: event.naming_json ?? null,
                  fonetica_json: event.fonetica_json ?? null,
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
