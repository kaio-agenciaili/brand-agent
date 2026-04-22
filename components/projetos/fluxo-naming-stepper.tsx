"use client";

import Link from "next/link";

export type EtapaFluxoNaming = 1 | 2 | 3 | 4;

const passos: { num: EtapaFluxoNaming; titulo: string; desc: string }[] = [
  { num: 1, titulo: "Briefing", desc: "Input e validação" },
  { num: 2, titulo: "Benchmark", desc: "Concorrentes" },
  { num: 3, titulo: "Revisão", desc: "Completa" },
  { num: 4, titulo: "Naming", desc: "Nomes" },
];

export function FluxoNamingStepper({
  idProjeto,
  etapaAtual,
  /** Na sub-rota «validar briefing»: permite refazer desde o input sem mudar etapaAtual. */
  mostrarRefazerInputNoBriefingAtual = false,
}: {
  idProjeto: string;
  etapaAtual: EtapaFluxoNaming;
  mostrarRefazerInputNoBriefingAtual?: boolean;
}) {
  const atual = etapaAtual;

  const hrefEtapa = (n: number): string => {
    const q =
      n === 1
        ? "?editar=input"
        : n === 2
          ? "?editar=benchmark"
          : n === 3
            ? "?editar=revisao"
            : "";
    switch (n) {
      case 1:
        return `/projetos/${idProjeto}${q}`;
      case 2:
        return `/projetos/${idProjeto}/benchmark${q}`;
      case 3:
        return `/projetos/${idProjeto}/revisao${q}`;
      case 4:
        return `/projetos/${idProjeto}/resultado`;
      default:
        return `/projetos/${idProjeto}`;
    }
  };

  /** Volta a essa fase com intenção de repetir (query-string de edição). */
  const hrefRefazer = (n: EtapaFluxoNaming): string => {
    switch (n) {
      case 1:
        if (mostrarRefazerInputNoBriefingAtual) {
          return `/projetos/${idProjeto}?editar=input`;
        }
        if (atual >= 2) {
          return `/projetos/${idProjeto}/validar-briefing?editar=validar`;
        }
        return `/projetos/${idProjeto}?editar=input`;
      case 2:
        return `/projetos/${idProjeto}/benchmark?editar=benchmark`;
      case 3:
        return `/projetos/${idProjeto}/revisao#diretrizes-naming`;
      case 4:
        return `/projetos/${idProjeto}/revisao#diretrizes-naming`;
      default:
        return `/projetos/${idProjeto}`;
    }
  };

  const mostrarRefazer = (n: EtapaFluxoNaming): boolean => {
    if (n < atual) {
      return true;
    }
    if (n === 4 && atual === 4) {
      return true;
    }
    if (n === 1 && atual === 1 && mostrarRefazerInputNoBriefingAtual) {
      return true;
    }
    return false;
  };

  const rotuloRefazer = (n: EtapaFluxoNaming): string => {
    if (n === 4 && atual === 4) {
      return "Gerar outra ronda";
    }
    if (n === 1 && atual === 1 && mostrarRefazerInputNoBriefingAtual) {
      return "Refazer input";
    }
    if (n === 1 && atual >= 2) {
      return "Refazer briefing";
    }
    return "Refazer";
  };

  return (
    <nav
      aria-label="Etapas do fluxo de naming"
      className="mb-8 rounded-2xl border border-ili-cinza-200 bg-white/80 px-3 py-4 shadow-sm sm:px-5"
    >
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-2">
        {passos.map((p) => {
          const on = p.num === atual;
          const isResultado = p.num === 4;
          const refazer = mostrarRefazer(p.num);
          return (
            <li key={p.num}>
              <div
                className={`flex min-h-0 flex-col rounded-xl border transition sm:min-h-[5.25rem] ${
                  on
                    ? "border-brand-600 bg-ili-rosa-50 ring-1 ring-brand-200"
                    : "border-ili-cinza-100 bg-ili-cinza-50/40 hover:border-ili-cinza-200"
                } ${isResultado ? "opacity-90" : ""}`}
              >
                <Link
                  href={hrefEtapa(p.num)}
                  className="flex flex-1 flex-col px-3 py-2.5 text-left"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ili-cinza-400">
                    Etapa {p.num}
                  </span>
                  <span
                    className={`text-sm font-semibold ${on ? "text-brand-800" : "text-ili-preto"}`}
                  >
                    {p.titulo}
                  </span>
                  <span className="text-xs text-ili-cinza-500">{p.desc}</span>
                </Link>
                {refazer ? (
                  <div className="border-t border-ili-cinza-100/80 px-2 py-1.5">
                    <Link
                      href={hrefRefazer(p.num)}
                      className="block w-full rounded-lg py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-brand-700 hover:bg-white/80 hover:text-brand-900"
                    >
                      {rotuloRefazer(p.num)}
                    </Link>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
