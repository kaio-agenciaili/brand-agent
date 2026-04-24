"use client";

import { Step1Empresa } from "@/components/briefing/Step1Empresa";
import { Step2Publico } from "@/components/briefing/Step2Publico";
import { Step3Posicionamento } from "@/components/briefing/Step3Posicionamento";
import { Step4Personalidade } from "@/components/briefing/Step4Personalidade";
import { Step5Diretrizes } from "@/components/briefing/Step5Diretrizes";
import { type EventoSSE } from "@/components/briefing/AgentesProcessando";
import { AgentesLive } from "@/components/briefing/AgentesLive";
import { FluxoNamingStepper } from "@/components/projetos/fluxo-naming-stepper";
import { useBriefingProjeto } from "@/components/projetos/briefing-projeto-context";
import { warmUpCrewFromBrowser } from "@/lib/crewai/browser-warmup";
import type { BriefingStep3, BriefingState } from "@/lib/briefing/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  idProjeto: string;
  initialBriefing: BriefingState;
  initialTexto: string;
  aprendizadosRodadaAnterior: string;
};

function Secao({ titulo, id: idSecao, children }: { titulo: string; id?: string; children: ReactNode }) {
  return (
    <section
      id={idSecao}
      className="rounded-2xl border border-ili-cinza-200 bg-white/90 p-4 shadow-sm scroll-mt-6"
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-800">{titulo}</h3>
      {children}
    </section>
  );
}

function concorrentesParaApi(b: BriefingState): string[] {
  return b.step3.concorrentesManual.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

export function RevisaoBriefingClient({
  idProjeto,
  initialBriefing,
  initialTexto,
  aprendizadosRodadaAnterior,
}: Props) {
  const router = useRouter();
  const { briefing, setBriefing, textoOriginal, setTextoOriginal } = useBriefingProjeto();
  const [processando, setProcessando] = useState(false);
  const [faseProcesso, setFaseProcesso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [feedbackRodada, setFeedbackRodada] = useState("");
  const [eventosSSE, setEventosSSE] = useState<EventoSSE[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useLayoutEffect(() => {
    setBriefing(initialBriefing);
    setTextoOriginal(initialTexto);
  }, [initialBriefing, initialTexto, setBriefing, setTextoOriginal]);

  const b = briefing ?? initialBriefing;

  function setState(updater: (s: BriefingState) => BriefingState) {
    setBriefing((prev) => updater(prev ?? initialBriefing));
  }

  function patchStep3(patch: Partial<BriefingStep3> | ((prev: BriefingStep3) => BriefingStep3)) {
    setState((s) => {
      const step3 = typeof patch === "function" ? patch(s.step3) : { ...s.step3, ...patch };
      return { ...s, step3 };
    });
  }

  function encerrarSSE() {
    esRef.current?.close();
    esRef.current = null;
  }

  async function confirmar() {
    setErro(null);
    setEventosSSE([]);
    setProcessando(true);
    setFaseProcesso(null);
    encerrarSSE();

    try {
      setFaseProcesso(
        "A preparar o servidor de IA (no plano grátis do Render isto pode levar até ~1 min na primeira vez)…",
      );
      try {
        await warmUpCrewFromBrowser();
      } catch {
        /* warm-up falhou (rede/CORS); ainda tentamos iniciar o job */
      }
      setFaseProcesso("A iniciar geração…");

      // 1. Iniciar job no Python via Next.js
      const startRes = await fetch("/api/naming/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projeto_id: idProjeto,
          briefing: b,
          briefing_texto: textoOriginal || initialTexto,
          concorrentes_manuais: concorrentesParaApi(b),
          feedback_rodada: feedbackRodada,
        }),
      });
      const startData = (await startRes.json()) as { sucesso?: boolean; job_id?: string; erro?: string };

      if (!startRes.ok || !startData.sucesso || !startData.job_id) {
        setErro(startData.erro || "Erro ao iniciar geração.");
        setProcessando(false);
        setFaseProcesso(null);
        return;
      }

      const jobId = startData.job_id;
      setFaseProcesso("Agentes a gerar nomes…");

      // 2. Conectar ao stream SSE
      const streamUrl = `/api/naming/stream?job_id=${encodeURIComponent(jobId)}&projeto_id=${encodeURIComponent(idProjeto)}`;
      const es = new EventSource(streamUrl);
      esRef.current = es;

      es.onmessage = (e) => {
        let event: EventoSSE;
        try {
          event = JSON.parse(e.data as string) as EventoSSE;
        } catch {
          return;
        }

        setEventosSSE((prev) => [...prev, event]);

        if (event.type === "done") {
          encerrarSSE();
          setProcessando(false);
          setFaseProcesso(null);
          router.push(`/projetos/${idProjeto}/resultado`);
          router.refresh();
        }

        if (event.type === "error") {
          encerrarSSE();
          setProcessando(false);
          setFaseProcesso(null);
          setErro("Erro durante a geração. Tente novamente.");
        }

        if (event.type === "stream_end" || event.type === "timeout") {
          encerrarSSE();
          setProcessando(false);
          setFaseProcesso(null);
        }
      };

      es.onerror = () => {
        encerrarSSE();
        setProcessando(false);
        setFaseProcesso(null);
        setErro(
          "Conexão com o servidor perdida. Confira se a API Python no Render está no ar e o CREWAI_SERVER_URL na Vercel.",
        );
      };
    } catch (e) {
      setErro(String(e));
      setProcessando(false);
      setFaseProcesso(null);
    }
  }

  return (
    <div className="min-w-0 max-w-7xl pb-8">
      <FluxoNamingStepper idProjeto={idProjeto} etapaAtual={3} />

      <AgentesLive eventos={eventosSSE} visivel={processando} />

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {erro}
        </p>
      )}
      <h1 className="mb-2 text-2xl font-semibold text-ili-preto">Revisão completa</h1>
      <p className="mb-6 text-sm text-ili-cinza-500">
        Pode alterar qualquer secção abaixo e voltar a carregar em{" "}
        <strong className="font-medium text-ili-cinza-600">Gerar nova rodada</strong>{" "}
        para obter novas propostas (os resultados anteriores serão substituídos quando a nova geração terminar).
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr] lg:items-start">
        <div className="order-2 lg:order-1">
          <p className="mb-2 text-xs font-medium uppercase text-ili-cinza-400">Texto original</p>
          <div className="rounded-2xl border border-ili-cinza-200 bg-ili-cinza-50/40 p-4">
            <pre className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-ili-cinza-500">
              {textoOriginal || initialTexto || "—"}
            </pre>
          </div>
        </div>
        <div className="order-1 space-y-4 lg:order-2">
          <p className="text-sm text-ili-cinza-500">
            Os concorrentes do benchmark aparecem em resumo abaixo; o foco aqui é território, tom e regras de naming.
          </p>
          <Secao titulo="Empresa">
            <Step1Empresa
              modoRevisao
              value={b.step1}
              onChange={(p) => setState((s) => ({ ...s, step1: { ...s.step1, ...p } }))}
            />
          </Secao>
          <Secao titulo="Público">
            <Step2Publico
              value={b.step2}
              onChange={(p) => setState((s) => ({ ...s, step2: { ...s.step2, ...p } }))}
            />
          </Secao>
          <Secao titulo="Posicionamento">
            <Step3Posicionamento omitirConcorrentes value={b.step3} onChange={patchStep3} />
          </Secao>
          <Secao titulo="Personalidade">
            <Step4Personalidade
              compacto
              value={b.step4}
              onChange={(p) => setState((s) => ({ ...s, step4: { ...s.step4, ...p } }))}
            />
          </Secao>
          <Secao titulo="Diretrizes de naming" id="diretrizes-naming">
            <Step5Diretrizes
              value={b.step5}
              onChange={(p) => setState((s) => ({ ...s, step5: { ...s.step5, ...p } }))}
            />
          </Secao>
          <Secao titulo="Aprendizados para nova rodada">
            {aprendizadosRodadaAnterior ? (
              <div className="mb-3 rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/60 p-3">
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-ili-cinza-500">
                  {aprendizadosRodadaAnterior}
                </pre>
              </div>
            ) : (
              <p className="mb-3 text-sm text-ili-cinza-400">
                Ainda não há shortlist ou nomes negativados salvos da rodada anterior.
              </p>
            )}
            <label className="mb-1 block text-xs font-medium text-ili-cinza-500">
              Feedback escrito para orientar a próxima geração
            </label>
            <textarea
              value={feedbackRodada}
              onChange={(e) => setFeedbackRodada(e.target.value)}
              rows={5}
              placeholder="Ex.: manter nomes curtos e sonoros; evitar termos muito tech; explorar mais neologismos com sensação humana..."
              className="w-full rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/40 px-3 py-2.5 text-sm text-ili-preto outline-none placeholder:text-ili-cinza-300 focus:border-brand-300 focus:ring-1 focus:ring-brand-200"
            />
          </Secao>
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={confirmar}
              disabled={processando}
              className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-50"
            >
              {processando
                ? faseProcesso || "Agentes a gerar nomes…"
                : "Gerar nova rodada com aprendizados →"}
            </button>
            <p className="text-center text-sm text-ili-cinza-400">
              <Link
                href={`/projetos/${idProjeto}/benchmark?editar=benchmark`}
                className="underline-offset-2 hover:text-brand-600 hover:underline"
              >
                Rever benchmark
              </Link>
              <span className="mx-2 text-ili-cinza-300">·</span>
              <Link
                href={`/projetos/${idProjeto}?editar=input`}
                className="underline-offset-2 hover:text-brand-600 hover:underline"
              >
                Input inicial
              </Link>
            </p>
          </div>
        </div>
      </div>
      {/* Overlay minimalista apenas para bloquear cliques durante processamento */}
      {processando && (
        <div className="fixed inset-0 z-10 cursor-not-allowed" aria-hidden />
      )}
    </div>
  );
}
