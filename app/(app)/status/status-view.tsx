"use client";

import { warmUpCrewFromBrowser } from "@/lib/crewai/browser-warmup";
import type { SystemStatusSnapshot } from "@/lib/system/status-snapshot";
import { useCallback, useEffect, useState } from "react";

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

type TesteBrowserState =
  | { fase: "idle" }
  | { fase: "a_correr" }
  | { fase: "ok"; ms: number }
  | { fase: "erro"; msg: string };

export function StatusView({ initialData, initialError }: Props) {
  const [data, setData] = useState<SystemStatusSnapshot | null>(initialData);
  const [erro, setErro] = useState<string | null>(initialError);
  const [aCarregar, setACarregar] = useState(false);
  const [testeBrowser, setTesteBrowser] = useState<TesteBrowserState>({ fase: "idle" });
  const [testeSegundos, setTesteSegundos] = useState(0);

  useEffect(() => {
    if (testeBrowser.fase !== "a_correr") return;
    setTesteSegundos(0);
    const id = window.setInterval(() => {
      setTesteSegundos((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [testeBrowser.fase]);

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
            ? "Resposta inválida (não é JSON). Tente recarregar a página."
            : r.status === 504
              ? "Erro 504 (tempo esgotado no servidor). Comum no plano grátis da Vercel se a checagem demorar demais — abra a URL da API no Render, espere acordar, e clique em Atualizar."
              : `Erro ${r.status}: resposta inesperada do servidor.`,
        );
        return;
      }
      if (!r.ok) {
        setErro(
          r.status === 504
            ? "HTTP 504: a função /api/status estourou o tempo na Vercel. Acorde o serviço no Render (abra o URL da API) e tente de novo."
            : `HTTP ${r.status}`,
        );
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

  const testarPythonNoBrowser = useCallback(async () => {
    setTesteBrowser({ fase: "a_correr" });
    const t0 = performance.now();
    try {
      await warmUpCrewFromBrowser();
      const ms = Math.round(performance.now() - t0);
      setTesteBrowser({ fase: "ok", ms });
    } catch (e) {
      setTesteBrowser({ fase: "erro", msg: String(e) });
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
                    ? `Render (plano grátis): a instância “dorme”. O primeiro pedido pode levar 1 minuto — a Vercel só deixa a checagem usar ~7s (senão dá 504).\n` +
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

            <div className="rounded-2xl border border-ili-cinza-200 bg-white/90 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-ili-preto">
                Testes para diagnóstico
              </h2>
              <p className="mt-1 text-xs text-ili-cinza-500">
                Host que o servidor Next usa:{" "}
                <code className="rounded bg-ili-cinza-100 px-1 py-0.5 text-ili-preto">
                  {data.dicas.crewHostname}
                </code>
                {!data.dicas.envCrew && (
                  <span className="ml-1 text-amber-700">
                    (CREWAI_SERVER_URL não definido — fallback local)
                  </span>
                )}
              </p>
              <p className="mt-2 text-sm text-ili-cinza-600">
                <strong className="font-medium text-ili-preto">Teste pelo browser</strong>{" "}
                — igual ao aquecimento antes de “Gerar nomes”. No Render grátis pode levar{" "}
                <strong className="font-medium text-ili-preto">vários minutos</strong> (timeout até
                5 min). Não passa pelo limite curto da Vercel.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={testarPythonNoBrowser}
                  disabled={testeBrowser.fase === "a_correr" || !supaOk}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  title={
                    !supaOk
                      ? "Inicie sessão para obter a URL da API e testar CORS."
                      : undefined
                  }
                >
                  {testeBrowser.fase === "a_correr"
                    ? `Conectando à API… (${testeSegundos}s / até ~300s)`
                    : "Testar ligação browser → Python"}
                </button>
                <button
                  type="button"
                  onClick={recarregar}
                  disabled={aCarregar}
                  className="rounded-lg border border-ili-cinza-200 bg-white px-3 py-2 text-sm font-medium text-ili-preto hover:border-brand-300 disabled:opacity-50"
                >
                  Depois: Atualizar painel (servidor → Python)
                </button>
              </div>
              {testeBrowser.fase === "ok" && (
                <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-2 text-sm text-emerald-900">
                  OK em {testeBrowser.ms} ms. Clique em{" "}
                  <strong className="font-medium">Depois: Atualizar painel</strong> — a caixa
                  Python costuma ficar verde se o servidor Vercel conseguir responder a tempo.
                </p>
              )}
              {testeBrowser.fase === "erro" && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">
                  Falhou: {testeBrowser.msg}.
                  {/timed out|TimeoutError/i.test(testeBrowser.msg) ? (
                    <>
                      {" "}
                      O Render grátis pode demorar mais que isso a acordar, ou o serviço não está a
                      subir. Abra{" "}
                      <a
                        href={data.python.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline"
                      >
                        a API no browser
                      </a>{" "}
                      e no painel do Render veja <strong className="font-medium">Logs</strong> —
                      erros de deploy ou de <code className="text-xs">uvicorn</code> aparecem lá.
                      Com domínio próprio na Vercel, defina{" "}
                      <code className="text-xs">CORS_EXTRA_ORIGINS</code> no Render.
                    </>
                  ) : (
                    <>
                      {" "}
                      Confira <code className="text-xs">CORS_EXTRA_ORIGINS</code> no Render se usar
                      domínio próprio.
                    </>
                  )}
                </p>
              )}
              <p className="mt-3 text-xs text-ili-cinza-400">
                <strong className="text-ili-cinza-500">Atualizar</strong> no topo = checagem pelo{" "}
                <em>servidor</em> Vercel (~7,5 s). Se der timeout com o Render a dormir, use o
                teste pelo browser acima primeiro.
              </p>
            </div>
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
