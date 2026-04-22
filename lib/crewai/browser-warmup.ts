/**
 * Pedido direto do browser → FastAPI. Contorna o limite ~10s das funções Vercel no plano grátis,
 * necessário quando o Render “dorme” e o cold start passa de 15–60s.
 */
export async function warmUpCrewFromBrowser(timeoutMs = 120_000): Promise<void> {
  const r = await fetch("/api/crew/base-url");
  if (!r.ok) return;
  const j = (await r.json()) as { baseUrl?: string };
  const base = (j.baseUrl || "").trim().replace(/\/$/, "");
  if (!base.startsWith("http")) return;
  if (base.includes("127.0.0.1") || base.includes("localhost")) return;

  const res = await fetch(`${base}/`, {
    method: "GET",
    mode: "cors",
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`Warm-up: HTTP ${res.status}`);
  }
}
