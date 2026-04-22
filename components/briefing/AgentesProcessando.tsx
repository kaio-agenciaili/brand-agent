"use client";

import { useEffect, useRef, useState } from "react";

const DURACAO_MS = 3000;
const N = 5;

const AGENTES = [
  { nome: "Briefing", sub: "Lendo e estruturando o briefing…" },
  { nome: "Benchmark", sub: "Pesquisando concorrentes no mercado…" },
  { nome: "Naming", sub: "Criando sugestões de nome…" },
  { nome: "Validação", sub: "Verificando disponibilidade e registro…" },
  { nome: "Estratégia", sub: "Consolidando recomendação final…" },
] as const;

type Fase = "aguardando" | "processando" | "concluido";

type Props = {
  aberto: boolean;
  onConcluido: () => void;
};

export function AgentesProcessando({ aberto, onConcluido }: Props) {
  const [fases, setFases] = useState<Fase[]>(Array(N).fill("aguardando"));
  const finalizou = useRef(false);

  useEffect(() => {
    if (!aberto) {
      finalizou.current = false;
      setFases(Array(N).fill("aguardando"));
      return;
    }
    finalizou.current = false;

    setFases(
      AGENTES.map((_, i) => (i === 0 ? "processando" : "aguardando")) as Fase[],
    );
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let s = 1; s < N; s++) {
      timers.push(
        setTimeout(() => {
          setFases(
            AGENTES.map((_, i) => {
              if (i < s) {
                return "concluido";
              }
              if (i === s) {
                return "processando";
              }
              return "aguardando";
            }) as Fase[],
          );
        }, s * DURACAO_MS),
      );
    }

    const finalizar = setTimeout(() => {
      setFases(Array(N).fill("concluido"));
      if (finalizou.current) {
        return;
      }
      finalizou.current = true;
      onConcluido();
    }, N * DURACAO_MS);
    timers.push(finalizar);

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [aberto, onConcluido]);

  if (!aberto) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-ili-preto/98 px-4 py-10 text-white"
      role="alertdialog"
      aria-busy
      aria-label="Processamento com agentes"
    >
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-ili-rosa-300">
        ili · naming
      </p>
      <h2 className="mb-8 max-w-md text-center text-lg font-light text-ili-cinza-200 sm:text-xl">
        Os agentes estão a trabalhar no teu contexto
      </h2>
      <ul className="w-full max-w-md space-y-3">
        {AGENTES.map((a, i) => {
          const f = fases[i] ?? "aguardando";
          return (
            <li
              key={a.nome}
              className={`rounded-xl border px-4 py-3 transition duration-500 ${
                f === "concluido"
                  ? "border-white/20 bg-white/[0.06]"
                  : f === "processando"
                    ? "border-ili-rosa-500/50 bg-ili-rosa-500/10 shadow-[0_0_24px_rgba(217,47,92,0.12)]"
                    : "border-white/10 bg-white/[0.03] opacity-55"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
                    f === "concluido"
                      ? "bg-white/15 text-ili-rosa-200"
                      : f === "processando"
                        ? "bg-ili-rosa-500/30 text-white"
                        : "bg-white/10 text-ili-cinza-400"
                  }`}
                >
                  {f === "concluido" ? "✓" : f === "processando" ? "◉" : "○"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {a.nome}
                  </p>
                  <p
                    className={
                      f === "processando"
                        ? "text-xs text-ili-rosa-200"
                        : "text-xs text-ili-cinza-300"
                    }
                  >
                    {a.sub}
                  </p>
                  {f === "processando" && (
                    <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
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
  );
}
