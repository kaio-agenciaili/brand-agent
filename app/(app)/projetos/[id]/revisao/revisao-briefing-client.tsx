"use client";

import { Step1Empresa } from "@/components/briefing/Step1Empresa";
import { Step2Publico } from "@/components/briefing/Step2Publico";
import { Step3Posicionamento } from "@/components/briefing/Step3Posicionamento";
import { Step4Personalidade } from "@/components/briefing/Step4Personalidade";
import { Step5Diretrizes } from "@/components/briefing/Step5Diretrizes";
import { useBriefingProjeto } from "@/components/projetos/briefing-projeto-context";
import type { BriefingStep3, BriefingState } from "@/lib/briefing/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

type Props = { idProjeto: string };

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ili-cinza-200 bg-white/90 p-4 shadow-sm">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-800">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

export function RevisaoBriefingClient({ idProjeto }: Props) {
  const router = useRouter();
  const { briefing, setBriefing, textoOriginal } = useBriefingProjeto();

  useEffect(() => {
    if (!briefing) {
      router.replace(`/projetos/${idProjeto}`);
    }
  }, [briefing, idProjeto, router]);

  if (!briefing) {
    return (
      <div className="py-12 text-center text-sm text-ili-cinza-400">
        A carregar…
      </div>
    );
  }

  function setState(updater: (b: BriefingState) => BriefingState) {
    setBriefing((prev) => (prev ? updater(prev) : prev));
  }

  function patchStep3(
    patch:
      | Partial<BriefingStep3>
      | ((prev: BriefingStep3) => BriefingStep3),
  ) {
    setState((b) => {
      const step3 =
        typeof patch === "function" ? patch(b.step3) : { ...b.step3, ...patch };
      return { ...b, step3 };
    });
  }

  return (
    <div className="min-w-0 max-w-7xl pb-8">
      <h1 className="mb-6 text-2xl font-semibold text-ili-preto">
        Revisão do briefing
      </h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr] lg:items-start">
        <div className="order-2 lg:order-1">
          <p className="mb-2 text-xs font-medium uppercase text-ili-cinza-400">
            Texto original
          </p>
          <div className="rounded-2xl border border-ili-cinza-200 bg-ili-cinza-50/40 p-4">
            <pre className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-ili-cinza-500">
              {textoOriginal || "—"}
            </pre>
          </div>
        </div>
        <div className="order-1 space-y-4 lg:order-2">
          <p className="text-sm text-ili-cinza-500">
            Os agentes interpretaram seu briefing. Revise e ajuste se
            necessário.
          </p>
          <Secao titulo="Empresa">
            <Step1Empresa
              modoRevisao
              value={briefing.step1}
              onChange={(p) =>
                setState((b) => ({ ...b, step1: { ...b.step1, ...p } }))
              }
            />
          </Secao>
          <Secao titulo="Público">
            <Step2Publico
              value={briefing.step2}
              onChange={(p) =>
                setState((b) => ({ ...b, step2: { ...b.step2, ...p } }))
              }
            />
          </Secao>
          <Secao titulo="Posicionamento">
            <Step3Posicionamento
              value={briefing.step3}
              onChange={patchStep3}
            />
          </Secao>
          <Secao titulo="Personalidade">
            <Step4Personalidade
              compacto
              value={briefing.step4}
              onChange={(p) =>
                setState((b) => ({ ...b, step4: { ...b.step4, ...p } }))
              }
            />
          </Secao>
          <Secao titulo="Diretrizes">
            <Step5Diretrizes
              value={briefing.step5}
              onChange={(p) =>
                setState((b) => ({ ...b, step5: { ...b.step5, ...p } }))
              }
            />
          </Secao>
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() =>
                router.push(`/projetos/${idProjeto}/resultado`)
              }
              className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700"
            >
              Confirmar e gerar nomes →
            </button>
            <p className="text-center">
              <Link
                href={`/projetos/${idProjeto}`}
                className="text-sm text-ili-cinza-400 underline-offset-2 hover:text-brand-600 hover:underline"
              >
                Voltar e editar o texto original
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
