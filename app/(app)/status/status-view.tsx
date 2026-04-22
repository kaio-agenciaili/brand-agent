"use client";

import { useCallback, useState } from "react";
import type { SystemStatusSnapshot } from "@/lib/system/status-snapshot";

function Indicador({
  titulo,
  sub,
  ok,
  extra,
}: {
  titulo: string;
  sub: string;
  ok: boolean;
  extra?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        ok
          ? "border-emerald-200 bg-emerald-50/80"
          : "border-amber-200 bg-amber-50/80"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ili-preto">{titulo}</h2>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            ok ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
          }`}
        >
          {ok ? "OK" : "Atenção"}
        </span>
      </div>
      <p className="text-sm text-ili-cinza-600">{sub}</p>
      {extra && (
        <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-white/60 p-2 text-xs text-ili-cinza-500">
          {extra}
        </pre>
      )}
    </div>
  );
}

type Props = {
  initialData: SystemStatusSnapshot | null;
  initialError: string | null;
};

export function StatusView({ initialData, initialError }: Props) {
  const [data, setData] = useState<SystemStatusSnapshot | null>(initialData);
  const [erro, setErro] = useState<string | null>(initialError);
  const [aCarregar, setACarregar] = useState(false);

  const recarregar = useCallback(async () => {
    setACarregar(true);
    setErro(null);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const r = await fetch("/api/status", {
        cache: "no-store",
        signal: ctrl.signal,
      });
      let j: SystemStatusSnapshot;
      try {
        j = (await r.json()) as SystemStatusSnapshot;
      } catch {
        setErro(
          r.ok
            ? "Resposta inválida (não é JSON). Tenta recarregar a página."
            : `Erro ${r.status}: resposta inesperada do servidor.`,
        );
        return;
      }
      if (!r.ok) {
        setErro(`HTTP ${r.status}`);
        return;
      }
      setData(j);
    } catch (e) {
      const aborted =
        (typeof DOMException !== "undefined" &&
          e instanceof DOMException &&
          e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");
      if (aborted) {
        setErro(
          "A verificação demorou demais (timeout 30s). O servidor Next ou o Supabase podem estar sobrecarregados — confira o terminal e a rede.",
        );
      } else {
        setErro(String(e));
      }
    } finally {
      clearTimeout(t);
      setACarregar(false);
    }
  }, []);

  const supaOk = Boolean(
    data?.supabase?.envConfigured && data?.supabase?.session === "autenticado",
  );
  const pyOk = data?.python?.reachable === true;
  const geralOk = data?.ok === true;
  const pyDet = data?.python?.detail?.toLowerCase() ?? "";
  const pyUrl = data?.python?.url ?? "";
  const pyTimeout =
    pyDet.includes("timeout") || pyDet.includes("aborted due to timeout");
  const pyRenderGratis =
    !pyOk && pyTimeout && pyUrl.includes("onrender.com");

  return (
    <div className="min-w-0 max-w-2xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ili-preto">Estado do sistema</h1>
          <p className="mt-1 text-sm text-ili-cinza-500">
            Supabase, sessão e API Python (Crew) — sem expor chaves.
          </p>
        </div>
        <button
          type="button"
          onClick={recarregar}
          disabled={aCarregar}
          className="rounded-lg border border-ili-cinza-200 bg-white px-3 py-2 text-sm font-medium text-ili-preto hover:border-brand-300 disabled:opacity-50"
        >
          {aCarregar ? "A verificar…" : "Atualizar"}
        </button>
      </div>

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {erro}
        </p>
      )}

      {aCarregar && !data && !erro && (
        <p className="text-sm text-ili-cinza-500">A carregar status…</p>
      )}

      {data && (
        <>
          <div
            className={`mb-4 rounded-2xl border p-4 ${
              geralOk
                ? "border-emerald-300 bg-emerald-50/90"
                : "border-amber-300 bg-amber-50/90"
            }`}
          >
            <p className="text-sm font-medium text-ili-preto">
              {geralOk
                ? "Tudo operacional para o fluxo (Supabase + sessão + API Python)."
                : "Algum componente precisa de atenção. Veja as caixas abaixo e as dicas."}
            </p>
            <p className="mt-1 text-xs text-ili-cinza-500">
              Última verificação: {data.timestamp}
            </p>
          </div>

          <div className="space-y-3">
            <Indicador
              titulo="Supabase + sessão"
              sub={
                !data.supabase.envConfigured
                  ? "Variáveis públicas do Supabase em falta (local: .env.local; Vercel: Environment Variables)."
                  : data.supabase.session === "autenticado"
                    ? "Sessão ativa: leitura/escrita com o seu usuário."
                    : `Estado: ${data.supabase.session}${
                        data.supabase.message
                          ? ` — ${data.supabase.message}`
                          : ""
                      }`
              }
              ok={supaOk}
              extra={
                !supaOk && !data.supabase.message
                  ? "Inicie sessão para marcar verde, ou defina NEXT_PUBLIC_SUPABASE_* na raiz do projeto (ou no painel da Vercel)."
                  : data.supabase.message
              }
            />
            <Indicador
              titulo="API Python (Crew / FastAPI)"
              sub={
                pyOk
                  ? `A responder em ${data.python.url} (GET / → ok).`
                  : `A tentar ${data.python.url}. ${
                      data.python.detail || "Não alcançável."
                    }`
              }
              ok={pyOk}
              extra={
                !pyOk
                  ? pyRenderGratis
                    ? `Render (plano grátis): a instância “dorme”. O primeiro pedido pode levar 1 minuto — esta página só espera ~10s.\n` +
                      `1) Abre a URL da API num separador e espera carregar de verdade.\n` +
                      `2) Volta aqui e clica “Atualizar”.\n` +
                      `Alternativa: plano pago no Render para o serviço ficar sempre ligado.`
                    : /localhost|127\.0\.0\.1/.test(pyUrl)
                      ? `Local: cd python && .\\.venv\\Scripts\\python.exe -m uvicorn server:app --reload --port 8000\n` +
                        `Na Vercel: define CREWAI_SERVER_URL com o HTTPS do Render (não uses localhost).`
                      : `Confirma CREWAI_SERVER_URL na Vercel = URL pública HTTPS da API (sem / no fim). Redeploy após mudar.\n` +
                        `Se for hospedagem grátis com cold start, abre a URL da API no browser, espera, e atualiza esta página.`
                  : `HTTP ${data.python.statusCode ?? "—"}`
              }
            />
            {pyRenderGratis && (
              <p className="rounded-xl border border-sky-200 bg-sky-50/90 p-3 text-sm text-sky-950">
                <span className="font-medium">Dica rápida:</span> abre{" "}
                <a
                  href={data.python.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline decoration-sky-600/40 underline-offset-2 hover:decoration-sky-800"
                >
                  a API no novo separador
                </a>{" "}
                e espera sair da página de “carregando”; depois “Atualizar” aqui.
              </p>
            )}
          </div>
        </>
      )}

      {!data && erro && !aCarregar && (
        <p className="text-sm text-ili-cinza-600">
          Usa &quot;Atualizar&quot; para tentar de novo, ou recarrega a página (F5).
        </p>
      )}
    </div>
  );
}
