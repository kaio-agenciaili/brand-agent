"use client";

import { Step1Empresa } from "@/components/briefing/Step1Empresa";
import { Step2Publico } from "@/components/briefing/Step2Publico";
import { Step3Posicionamento } from "@/components/briefing/Step3Posicionamento";
import { Step4Personalidade } from "@/components/briefing/Step4Personalidade";
import { Step5Diretrizes } from "@/components/briefing/Step5Diretrizes";
import { FluxoNamingStepper } from "@/components/projetos/fluxo-naming-stepper";
import { useBriefingProjeto } from "@/components/projetos/briefing-projeto-context";
import type { BriefingState } from "@/lib/briefing/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState, type ReactNode } from "react";

type Props = {
  idProjeto: string;
  initialBriefing: BriefingState;
  initialTexto: string;
};

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-ili-cinza-200 bg-white/90 p-4 shadow-sm">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-800">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

export function ValidarBriefingClient({
  idProjeto,
  initialBriefing,
  initialTexto,
}: Props) {
  const router = useRouter();
  const { briefing, setBriefing, textoOriginal, setTextoOriginal } =
    useBriefingProjeto();
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useLayoutEffect(() => {
    setBriefing(initialBriefing);
    setTextoOriginal(initialTexto);
  }, [initialBriefing, initialTexto, setBriefing, setTextoOriginal]);

  const b = briefing ?? initialBriefing;

  function setState(updater: (s: BriefingState) => BriefingState) {
    setBriefing((prev) => {
      const p = prev ?? initialBriefing;
      return updater(p);
    });
  }

  async function validar() {
    setErro(null);
    setGravando(true);
    try {
      const res = await fetch("/api/fluxo/validar-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projeto_id: idProjeto,
          briefing: b,
        }),
      });
      const data = (await res.json()) as { sucesso?: boolean; erro?: string };
      if (!res.ok || !data.sucesso) {
        setErro(data.erro || "Não foi possível validar o briefing.");
        return;
      }
      router.push(`/projetos/${idProjeto}/benchmark`);
      router.refresh();
    } catch (e) {
      setErro(String(e));
    } finally {
      setGravando(false);
    }
  }

  return (
    <div className="min-w-0 max-w-7xl pb-8">
      <FluxoNamingStepper
        idProjeto={idProjeto}
        etapaAtual={1}
        mostrarRefazerInputNoBriefingAtual
      />
      {erro && (
        <p
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {erro}
        </p>
      )}
      <h1 className="mb-2 text-2xl font-semibold text-ili-preto">
        Validar briefing estruturado
      </h1>
      <p className="mb-6 text-sm text-ili-cinza-500">
        O agente gerou o briefing a partir do material e do desafio. Revise e
        corrija os campos abaixo; depois avance para o benchmark de
        concorrentes.
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr] lg:items-start">
        <div className="order-2 lg:order-1 lg:sticky lg:top-4">
          <p className="mb-2 text-xs font-medium uppercase text-ili-cinza-400">
            Material original
          </p>
          <div className="rounded-2xl border border-ili-cinza-200 bg-ili-cinza-50/40 p-4">
            <pre className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-ili-cinza-500">
              {textoOriginal || initialTexto || "—"}
            </pre>
          </div>
        </div>
        <div className="order-1 space-y-4 lg:order-2">
          <Secao titulo="Empresa">
            <Step1Empresa
              modoRevisao
              value={b.step1}
              onChange={(p) =>
                setState((s) => ({ ...s, step1: { ...s.step1, ...p } }))
              }
            />
          </Secao>
          <Secao titulo="Público-alvo">
            <Step2Publico
              value={b.step2}
              onChange={(p) =>
                setState((s) => ({ ...s, step2: { ...s.step2, ...p } }))
              }
            />
          </Secao>
          <Secao titulo="Territórios emocionais">
            <Step3Posicionamento
              omitirConcorrentes
              value={b.step3}
              onChange={(patch) =>
                setState((s) => ({
                  ...s,
                  step3:
                    typeof patch === "function"
                      ? patch(s.step3)
                      : { ...s.step3, ...patch },
                }))
              }
            />
          </Secao>
          <Secao titulo="Personalidade de marca">
            <Step4Personalidade
              compacto
              value={b.step4}
              onChange={(p) =>
                setState((s) => ({ ...s, step4: { ...s.step4, ...p } }))
              }
            />
          </Secao>
          <Secao titulo="Diretrizes de naming">
            <Step5Diretrizes
              value={b.step5}
              onChange={(p) =>
                setState((s) => ({ ...s, step5: { ...s.step5, ...p } }))
              }
            />
          </Secao>
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={validar}
              disabled={gravando}
              className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-50"
            >
              {gravando ? "A gravar…" : "Validar briefing →"}
            </button>
            <p className="text-center">
              <Link
                href={`/projetos/${idProjeto}?editar=input`}
                className="text-sm text-ili-cinza-400 underline-offset-2 hover:text-brand-600 hover:underline"
              >
                Voltar ao input do briefing
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
