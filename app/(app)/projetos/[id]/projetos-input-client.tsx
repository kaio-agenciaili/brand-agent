"use client";

import { AgentesProcessando } from "@/components/briefing/AgentesProcessando";
import { FluxoNamingStepper } from "@/components/projetos/fluxo-naming-stepper";
import { useBriefingProjeto } from "@/components/projetos/briefing-projeto-context";
import type { BriefingState } from "@/lib/briefing/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  idProjeto: string;
  nomeProjeto: string;
  nomeCliente: string;
  /** Texto gravo na base (rascunho) ao reabrir o projecto */
  textoRascunhoInicial?: string;
};

export function ProjetosInputClient({
  idProjeto,
  nomeProjeto,
  nomeCliente,
  textoRascunhoInicial = "",
}: Props) {
  const router = useRouter();
  const { textoOriginal, setTextoOriginal, setBriefing } =
    useBriefingProjeto();

  const [desafio, setDesafio] = useState("");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (textoRascunhoInicial) {
      setTextoOriginal(textoRascunhoInicial);
    }
  }, [textoRascunhoInicial, setTextoOriginal]);

  async function analisar() {
    if (!textoOriginal.trim() && !desafio.trim()) {
      setErro("Descreva o desafio ou cole material de contexto antes de continuar.");
      return;
    }
    const blocoDesafio = desafio.trim()
      ? `## Desafio\n${desafio.trim()}`
      : "";
    const blocoContexto = textoOriginal.trim()
      ? `## Material e referências\n${textoOriginal.trim()}`
      : "";
    const briefingParaApi = [blocoDesafio, blocoContexto]
      .filter(Boolean)
      .join("\n\n");
    setErro(null);
    setProcessando(true);
    try {
      const res = await fetch("/api/extrair-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projeto_id: idProjeto,
          briefing_texto: briefingParaApi,
          concorrentes_manuais: [],
        }),
      });
      const data = (await res.json()) as {
        sucesso?: boolean;
        briefing?: unknown;
        erro?: string;
      };
      if (!res.ok || !data.sucesso) {
        setErro(data.erro || `Erro ${res.status}`);
        return;
      }
      if (data.briefing) {
        setBriefing(data.briefing as BriefingState);
      }
      setTextoOriginal(briefingParaApi);
      router.push(`/projetos/${idProjeto}/validar-briefing`);
      router.refresh();
    } catch (e) {
      setErro(String(e));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <FluxoNamingStepper idProjeto={idProjeto} etapaAtual={1} />
      {erro && (
        <p
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {erro}
        </p>
      )}
      <div className="mx-auto flex min-h-[min(85vh,880px)] max-w-3xl flex-col px-0">
        <header className="mb-6 text-center sm:mb-8">
          <h1 className="text-lg font-semibold text-ili-preto sm:text-xl">
            Input do briefing
          </h1>
          <p className="mt-1 text-xs text-ili-cinza-400">
            {nomeProjeto}
            {nomeCliente && (
              <span className="text-ili-cinza-300"> · {nomeCliente}</span>
            )}
          </p>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div>
            <label
              htmlFor="briefing-desafio"
              className="mb-1.5 block text-left text-xs font-medium text-ili-cinza-500"
            >
              Qual é o desafio?
            </label>
            <textarea
              id="briefing-desafio"
              value={desafio}
              onChange={(e) => setDesafio(e.target.value)}
              rows={3}
              disabled={processando}
              className="w-full resize-y rounded-2xl border border-ili-cinza-200/90 bg-white px-4 py-3 text-sm leading-relaxed text-ili-preto shadow-sm placeholder:text-ili-cinza-300 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200/80 disabled:opacity-50"
              placeholder="Ex.: criar nome para nova linha de produto X, reposicionar após fusão, entrar no mercado Y…"
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <label
              htmlFor="briefing-texto"
              className="mb-1.5 block text-left text-xs font-medium text-ili-cinza-500"
            >
              Material de apoio (texto, notas de reunião, referências)
            </label>
            <textarea
              id="briefing-texto"
              value={textoOriginal}
              onChange={(e) => setTextoOriginal(e.target.value)}
              rows={12}
              disabled={processando}
              className="min-h-[180px] w-full flex-1 resize-y rounded-2xl border border-ili-cinza-200/90 bg-white px-5 py-4 text-base leading-relaxed text-ili-preto shadow-sm ring-0 placeholder:text-ili-cinza-300 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200/80 sm:min-h-[280px] sm:text-[17px] disabled:opacity-50"
              placeholder="Cole transcrições, e-mails, links ou notas. Opcional se o desafio acima já for suficiente."
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
            {processando
              ? "A chamar o agente…"
              : "Gerar briefing estruturado →"}
          </button>
        </div>
      </div>
      <AgentesProcessando aberto={processando} />
    </>
  );
}
