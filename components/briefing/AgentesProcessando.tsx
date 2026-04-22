"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const AGENTES = [
  { id: "briefing", nome: "Briefing", sub: "Lendo e estruturando o briefing…" },
  { id: "benchmark", nome: "Benchmark", sub: "Pesquisando concorrentes no mercado…" },
  { id: "naming", nome: "Naming", sub: "Criando sugestões de nome…" },
  {
    id: "colisoes",
    nome: "Marcas globais",
    sub: "A verificar colisão com marcas muito fortes…",
  },
  { id: "validacao", nome: "Validação", sub: "Verificando disponibilidade e registro…" },
  { id: "fonetica", nome: "Fonética", sub: "Analisando pronúncia e memorabilidade…" },
  { id: "estrategia", nome: "Estratégia", sub: "Consolidando recomendação final…" },
] as const;

const N = AGENTES.length;

type AgentId = (typeof AGENTES)[number]["id"];
type Fase = "aguardando" | "processando" | "concluido";

export type EventoSSE = {
  type: string;
  agente?: string;
  index?: number;
};

type Props = {
  aberto: boolean;
  onConcluido?: () => void;
  /** Eventos reais recebidos do SSE. Quando fornecidos, usa progresso real. */
  eventosReais?: EventoSSE[];
};

function calcPercentual(fases: Fase[]): number {
  const concl = fases.filter((f) => f === "concluido").length;
  if (concl === N) return 100;
  const proc = fases.findIndex((f) => f === "processando");
  return Math.min(98, Math.round(concl * (100 / N) + (proc >= 0 ? 100 / N / 2 : 0)));
}

function fasesFromEventos(eventos: EventoSSE[]): Fase[] {
  const fases: Fase[] = Array(N).fill("aguardando");
  for (const ev of eventos) {
    const idx = AGENTES.findIndex((a) => a.id === (ev.agente as AgentId | undefined));
    if (idx < 0) continue;
    if (ev.type === "agent_start") fases[idx] = "processando";
    if (ev.type === "agent_done") fases[idx] = "concluido";
  }
  return fases as Fase[];
}

function fasesSimuladas(elapsedMs: number): Fase[] {
  const visStep = Math.min(N - 1, Math.floor(elapsedMs / 5000));
  return AGENTES.map((_, i) => {
    if (i < visStep) return "concluido";
    if (i === visStep) return "processando";
    return "aguardando";
  }) as Fase[];
}

export function AgentesProcessando({ aberto, onConcluido, eventosReais }: Props) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef(0);
  const finalizouRef = useRef(false);

  useEffect(() => {
    if (!aberto) {
      setElapsedMs(0);
      finalizouRef.current = false;
      return;
    }
    startRef.current = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - startRef.current), 200);
    return () => clearInterval(id);
  }, [aberto]);

  const fases = useMemo<Fase[]>(() => {
    if (!aberto) return Array(N).fill("aguardando") as Fase[];
    if (eventosReais?.length) return fasesFromEventos(eventosReais);
    return fasesSimuladas(elapsedMs);
  }, [aberto, eventosReais, elapsedMs]);

  const percentual = useMemo(() => calcPercentual(fases), [fases]);

  // Chamar onConcluido quando todos concluídos (modo simulado)
  useEffect(() => {
    if (!aberto || finalizouRef.current) return;
    if (!eventosReais && fases.every((f) => f === "concluido")) {
      finalizouRef.current = true;
      onConcluido?.();
    }
  }, [aberto, fases, onConcluido, eventosReais]);

  if (!aberto || typeof document === "undefined") return null;

  // Indica se usamos progresso real ou simulado
  const usandoReal = Boolean(eventosReais?.length);

  const inner = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[#0a0a0a]/[0.97] p-4 py-8 text-white backdrop-blur-sm"
      role="alertdialog"
      aria-modal
      aria-busy
      aria-label="Processamento com agentes"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ili-preto/90 p-5 shadow-2xl sm:p-6">
        <p className="mb-1 text-center text-xs font-medium uppercase tracking-[0.2em] text-ili-rosa-300">
          ili · naming
        </p>
        <h2 className="mb-4 text-center text-base font-light leading-snug text-ili-cinza-100 sm:text-lg">
          Os agentes estão a trabalhar no teu contexto
        </h2>

        <div className="mb-5">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-ili-cinza-300">
              {usandoReal ? "Progresso real" : "Progresso estimado"}
            </span>
            <span className="tabular-nums text-2xl font-semibold text-ili-rosa-300" aria-live="polite">
              {percentual}%
            </span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentual}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-ili-rosa-600 to-ili-rosa-400 transition-[width] duration-500 ease-out"
              style={{ width: `${Math.min(100, percentual)}%` }}
            />
          </div>
        </div>

        {!usandoReal && (
          <p className="mb-4 text-center text-xs text-ili-cinza-200">
            Progresso estimado — a barra actualiza ao chegar a resposta.
          </p>
        )}

        <ul className="mt-2 w-full space-y-2">
          {AGENTES.map((a, i) => {
            const f = fases[i] ?? "aguardando";
            return (
              <li
                key={a.id}
                className={`rounded-xl border px-3 py-2.5 transition duration-500 ${
                  f === "concluido"
                    ? "border-white/20 bg-white/[0.08]"
                    : f === "processando"
                      ? "border-ili-rosa-500/50 bg-ili-rosa-500/10 shadow-[0_0_20px_rgba(217,47,92,0.1)]"
                      : "border-white/10 bg-white/[0.04] opacity-40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                      f === "concluido"
                        ? "bg-white/15 text-ili-rosa-200"
                        : f === "processando"
                          ? "bg-ili-rosa-500/30 text-white"
                          : "bg-white/10 text-ili-cinza-500"
                    }`}
                  >
                    {f === "concluido" ? "✓" : f === "processando" ? "◉" : "○"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{a.nome}</p>
                    <p className={f === "processando" ? "text-xs text-ili-rosa-200/95" : "text-xs text-ili-cinza-200"}>
                      {a.sub}
                    </p>
                    {f === "processando" && (
                      <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-1/2 animate-pulse bg-gradient-to-r from-ili-rosa-600 to-ili-rosa-400" />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  return createPortal(inner, document.body);
}
