"use client";

import { AgentesProcessando } from "@/components/briefing/AgentesProcessando";
import { useBriefingProjeto } from "@/components/projetos/briefing-projeto-context";
import { syntheticBriefingFromInput } from "@/lib/briefing/synthetic-briefing";
import { projetosMock } from "@/lib/mock/data";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

type Props = { idProjeto: string };

export function ProjetosInputClient({ idProjeto }: Props) {
  const router = useRouter();
  const {
    textoOriginal,
    setTextoOriginal,
    concorrentesOpcionais,
    setConcorrentesOpcionais,
    setBriefing,
  } = useBriefingProjeto();

  const [processando, setProcessando] = useState(false);
  const [corridaAgentes, setCorridaAgentes] = useState(0);
  const concluiu = useRef(false);
  const project = projetosMock.find((p) => p.id === idProjeto);

  const onAgentesFim = useCallback(() => {
    if (concluiu.current) {
      return;
    }
    concluiu.current = true;
    const b = syntheticBriefingFromInput(textoOriginal, concorrentesOpcionais);
    b.step1 = { ...b.step1, textoReuniao: textoOriginal };
    setBriefing(b);
    setProcessando(false);
    router.push(`/projetos/${idProjeto}/revisao`);
  }, [concorrentesOpcionais, idProjeto, router, setBriefing, textoOriginal]);

  function analisar() {
    concluiu.current = false;
    setCorridaAgentes((k) => k + 1);
    setProcessando(true);
  }

  return (
    <>
      <div className="mx-auto flex min-h-[min(85vh,880px)] max-w-3xl flex-col px-0">
        <header className="mb-8 text-center sm:mb-10">
          <p className="text-xs text-ili-cinza-400">
            {project?.nome ?? "Projecto"}{" "}
            {project && (
              <span className="text-ili-cinza-300">· {project.nomeCliente}</span>
            )}
          </p>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">
          <label className="sr-only" htmlFor="briefing-texto">
            Contexto do cliente
          </label>
          <textarea
            id="briefing-texto"
            value={textoOriginal}
            onChange={(e) => setTextoOriginal(e.target.value)}
            rows={12}
            className="min-h-[200px] w-full flex-1 resize-y rounded-2xl border border-ili-cinza-200/90 bg-white px-5 py-4 text-base leading-relaxed text-ili-preto shadow-sm ring-0 placeholder:text-ili-cinza-300 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200/80 sm:min-h-[320px] sm:text-[17px]"
            placeholder={
              "Cole aqui o texto da reunião, e-mail de briefing ou qualquer anotação sobre o cliente. Quanto mais contexto, melhores os nomes."
            }
          />
          <div className="mt-4">
            <label
              htmlFor="concorrentes-opc"
              className="mb-1.5 block text-xs font-medium text-ili-cinza-400"
            >
              Concorrentes que você já conhece (opcional, um por linha)
            </label>
            <textarea
              id="concorrentes-opc"
              value={concorrentesOpcionais}
              onChange={(e) => setConcorrentesOpcionais(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/50 px-3 py-2 text-sm text-ili-preto placeholder:text-ili-cinza-300 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200/80"
              placeholder="ex.: marca-a.com / Marca B"
            />
          </div>
        </div>
        <div className="mt-8 flex flex-col items-stretch sm:mt-10">
          <button
            type="button"
            onClick={analisar}
            disabled={processando}
            className="w-full rounded-2xl bg-brand-600 py-4 text-center text-base font-semibold text-white shadow-lg transition hover:bg-brand-700 disabled:opacity-50"
          >
            Analisar e preparar briefing →
          </button>
        </div>
      </div>
      <AgentesProcessando
        key={corridaAgentes}
        aberto={processando}
        onConcluido={onAgentesFim}
      />
    </>
  );
}
