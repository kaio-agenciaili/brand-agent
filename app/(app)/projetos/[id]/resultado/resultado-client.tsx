"use client";

import {
  agentesPipeline,
  nomesSugeridosMock,
  relatorioMarkdownMock,
} from "@/lib/mock/resultado";
import Link from "next/link";
import { useState } from "react";

function Estrelas({ n }: { n: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={i <= n ? "text-ili-rosa-500" : "text-ili-cinza-200"}
        >
          ★
        </span>
      ))}
    </div>
  );
}

type Props = { idProjeto: string };

export function ResultadoClient({ idProjeto }: Props) {
  const [relatorioAberto, setRelatorioAberto] = useState(false);

  return (
    <div className="min-w-0 max-w-6xl">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ili-preto">
            Resultados do naming
          </h1>
          <p className="text-sm text-ili-cinza-400">Projeto: {idProjeto}</p>
        </div>
        <Link
          href={`/projetos/${idProjeto}`}
          className="text-sm font-medium text-brand-600 hover:text-brand-800"
        >
          ← Voltar ao briefing
        </Link>
      </div>

      <div className="mb-10 rounded-xl border border-ili-cinza-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium text-ili-cinza-500">
          Agentes (simulado)
        </p>
        <div className="space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-ili-cinza-100">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-ili-rosa-500 to-ili-rosa-400" />
          </div>
          <ul className="flex flex-wrap gap-3 text-xs sm:gap-4">
            {agentesPipeline.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-1.5 text-ili-preto"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full bg-ili-rosa-500"
                  aria-hidden
                />
                {a.nome}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-medium text-ili-cinza-500">Nomes sugeridos</h2>
      <ul className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {nomesSugeridosMock.map((n) => (
          <li
            key={n.id}
            className={`flex flex-col rounded-xl border bg-white p-4 shadow-sm ${
              n.top3
                ? "border-2 border-brand-500 ring-2 ring-brand-100"
                : "border-ili-cinza-200"
            }`}
          >
            {n.top3 && (
              <span className="mb-2 w-fit rounded-full bg-ili-rosa-100 px-2 py-0.5 text-xs font-semibold text-brand-800">
                Top 3
              </span>
            )}
            <h3 className="text-lg font-bold text-ili-preto">{n.nome}</h3>
            <span className="mt-1 inline-block w-fit rounded border border-ili-cinza-200 bg-ili-cinza-50 px-2 py-0.5 text-xs text-ili-cinza-500">
              {n.categoria}
            </span>
            <div className="mt-2">
              <Estrelas n={n.score} />
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-ili-cinza-500">
              {n.justificativa}
            </p>
            <p className="mt-3 text-xs text-ili-cinza-400">
              Domínio:{" "}
              <span className="font-mono text-ili-cinza-500">{n.dominio}</span>
            </p>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center border-t border-ili-cinza-200 pt-8">
        <button
          type="button"
          onClick={() => setRelatorioAberto((o) => !o)}
          className="text-sm font-medium text-brand-600 hover:text-brand-800"
        >
          {relatorioAberto ? "Ocultar relatório" : "Ver relatório completo"}
        </button>
        {relatorioAberto && (
          <article className="mt-4 w-full max-w-3xl rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/80 p-6 text-left text-sm text-ili-cinza-500">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {relatorioMarkdownMock}
            </pre>
          </article>
        )}
        <button
          type="button"
          onClick={() => {
            window.alert("Download simulado (sem ficheiro real).");
          }}
          className="mt-6 rounded-lg border border-ili-cinza-200 bg-white px-5 py-2.5 text-sm font-medium text-ili-cinza-500 hover:border-brand-200 hover:bg-ili-rosa-50"
        >
          Baixar relatório
        </button>
      </div>
    </div>
  );
}
