"use client";

import { useState } from "react";
import type { EventoSSE } from "./AgentesProcessando";

const AGENTES = [
  {
    id: "briefing",
    nome: "Briefing",
    descricao: "Estruturando o contexto da marca",
    emoji: "📋",
  },
  {
    id: "benchmark",
    nome: "Benchmark",
    descricao: "Mapeando o cenário competitivo",
    emoji: "🔍",
  },
  {
    id: "naming",
    nome: "Naming",
    descricao: "Criando as 12 propostas de nome",
    emoji: "✍️",
  },
  {
    id: "validacao",
    nome: "Validação",
    descricao: "Verificando disponibilidade e IP",
    emoji: "⚖️",
  },
  {
    id: "fonetica",
    nome: "Fonética",
    descricao: "Analisando pronúncia e memorabilidade",
    emoji: "🔊",
  },
  {
    id: "estrategia",
    nome: "Estratégia",
    descricao: "Consolidando o relatório final",
    emoji: "🏆",
  },
] as const;

type AgentId = (typeof AGENTES)[number]["id"];
type Fase = "aguardando" | "processando" | "concluido";

type AgentState = {
  fase: Fase;
  output?: string;
};

function _preview(raw: string): string {
  if (!raw) return "";
  // limpa JSON / markdown para mostrar só texto relevante
  const limpo = raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[{}[\]"]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const linhas = limpo.split("\n").filter((l) => l.trim().length > 10);
  return linhas.slice(0, 3).join(" · ").slice(0, 180) + (limpo.length > 180 ? "…" : "");
}

function buildStates(eventos: EventoSSE[]): Record<AgentId, AgentState> {
  const states = Object.fromEntries(
    AGENTES.map((a) => [a.id, { fase: "aguardando" as Fase }]),
  ) as Record<AgentId, AgentState>;

  for (const ev of eventos) {
    const id = ev.agente as AgentId | undefined;
    if (!id || !(id in states)) continue;
    if (ev.type === "agent_start") states[id].fase = "processando";
    if (ev.type === "agent_done") {
      states[id].fase = "concluido";
      const raw = (ev as EventoSSE & { output?: string }).output ?? "";
      states[id].output = _preview(raw);
    }
  }
  return states;
}

type Props = {
  eventos: EventoSSE[];
  visivel: boolean;
};

export function AgentesLive({ eventos, visivel }: Props) {
  const [expandido, setExpandido] = useState<AgentId | null>(null);

  if (!visivel) return null;

  const states = buildStates(eventos);
  const concluidos = AGENTES.filter((a) => states[a.id].fase === "concluido").length;
  const processandoIdx = AGENTES.findIndex((a) => states[a.id].fase === "processando");
  const pct = Math.round((concluidos / AGENTES.length) * 100);
  const agteAtual = processandoIdx >= 0 ? AGENTES[processandoIdx] : null;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-ili-cinza-200 bg-white shadow-sm">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 border-b border-ili-cinza-100 bg-ili-cinza-50/60 px-4 py-3">
        <div className="flex items-center gap-3">
          {agteAtual ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-base">
              {agteAtual.emoji}
            </span>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-base">
              ✓
            </span>
          )}
          <div>
            <p className="text-sm font-semibold text-ili-preto">
              {agteAtual
                ? `${agteAtual.nome} · ${agteAtual.descricao}`
                : concluidos === AGENTES.length
                  ? "Pipeline concluído · a redirecionar…"
                  : "A iniciar pipeline…"}
            </p>
            <p className="text-xs text-ili-cinza-400">
              {concluidos} de {AGENTES.length} agentes concluídos
            </p>
          </div>
        </div>
        <span className="tabular-nums text-lg font-semibold text-brand-700">{pct}%</span>
      </div>

      {/* Barra de progresso */}
      <div className="h-1.5 w-full bg-ili-cinza-100">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Lista de agentes */}
      <ul className="divide-y divide-ili-cinza-100">
        {AGENTES.map((a) => {
          const st = states[a.id];
          const isExpanded = expandido === a.id;
          const podeExpandir = st.fase === "concluido" && !!st.output;

          return (
            <li key={a.id}>
              <button
                type="button"
                disabled={!podeExpandir}
                onClick={() => setExpandido(isExpanded ? null : a.id)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                  podeExpandir ? "hover:bg-ili-cinza-50/60 cursor-pointer" : "cursor-default"
                }`}
              >
                {/* Ícone de estado */}
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    st.fase === "concluido"
                      ? "bg-emerald-100 text-emerald-600"
                      : st.fase === "processando"
                        ? "bg-brand-100 text-brand-600"
                        : "bg-ili-cinza-100 text-ili-cinza-400"
                  }`}
                >
                  {st.fase === "concluido" ? "✓" : st.fase === "processando" ? "◉" : "○"}
                </span>

                {/* Info do agente */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        st.fase === "aguardando" ? "text-ili-cinza-400" : "text-ili-preto"
                      }`}
                    >
                      {a.emoji} {a.nome}
                    </span>
                    {st.fase === "processando" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: "0ms" }} />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: "150ms" }} />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: "300ms" }} />
                        a processar
                      </span>
                    )}
                    {st.fase === "concluido" && podeExpandir && (
                      <span className="text-xs text-ili-cinza-400">
                        {isExpanded ? "recolher ↑" : "ver output ↓"}
                      </span>
                    )}
                  </div>

                  <p
                    className={`mt-0.5 text-xs ${
                      st.fase === "aguardando" ? "text-ili-cinza-300" : "text-ili-cinza-500"
                    }`}
                  >
                    {st.fase === "processando" ? a.descricao + "…" : a.descricao}
                  </p>

                  {/* Preview inline (quando não expandido) */}
                  {st.fase === "concluido" && st.output && !isExpanded && (
                    <p className="mt-1 truncate text-xs text-ili-cinza-400 italic">
                      {st.output.slice(0, 100)}
                      {st.output.length > 100 ? "…" : ""}
                    </p>
                  )}
                </div>
              </button>

              {/* Output expandido */}
              {isExpanded && st.output && (
                <div className="border-t border-ili-cinza-100 bg-ili-cinza-50/80 px-4 py-3">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-ili-cinza-600">
                    {st.output}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
