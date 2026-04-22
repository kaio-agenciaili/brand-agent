/** Padrão generoso: no Render grátis o cold start costuma 1–3 min; 2 min falhava com “signal timed out”. */
const WARMUP_TIMEOUT_PADRAO_MS = 300_000;

/**
 * Pedido direto do browser → FastAPI. Contorna o limite ~10s das funções Vercel no plano grátis,
 * necessário quando o Render “dorme” e o cold start é longo.
 */
export async function warmUpCrewFromBrowser(timeoutMs = WARMUP_TIMEOUT_PADRAO_MS): Promise<void> {
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
