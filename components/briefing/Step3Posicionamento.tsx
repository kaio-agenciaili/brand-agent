"use client";

import type { BriefingStep3, ConcorrenteMock } from "@/lib/briefing/types";
import { TERRITORIOS } from "@/lib/briefing/territorios";
import { useState } from "react";

type Props = {
  value: BriefingStep3;
  onChange: (
    patch:
      | Partial<BriefingStep3>
      | ((prev: BriefingStep3) => BriefingStep3),
  ) => void;
  /** Quando true, não permite editar concorrentes (fluxo: benchmark já aprovado). */
  omitirConcorrentes?: boolean;
};

const mockConcorrentes: ConcorrenteMock[] = [
  {
    id: "m1",
    nome: "DataPeak",
    resumo: "Suite analítica para PME, forte em dashboards prontos.",
  },
  {
    id: "m2",
    nome: "Metrik Hub",
    resumo: "Foco em integrações nativas e benchmarks sectoriais.",
  },
  {
    id: "m3",
    nome: "InsightFlow",
    resumo: "Modelo freemium com alertas em tempo real e API aberta.",
  },
];

function toggleIn<T>(list: T[], item: T): T[] {
  return list.includes(item)
    ? list.filter((x) => x !== item)
    : [...list, item];
}

export function Step3Posicionamento({
  value,
  onChange,
  omitirConcorrentes = false,
}: Props) {
  const [carregarIa, setCarregarIa] = useState(false);

  function pesquisarConcorrentes() {
    setCarregarIa(true);
    window.setTimeout(() => {
      onChange({ concorrentesIa: mockConcorrentes });
      setCarregarIa(false);
    }, 2000);
  }

  function expandirSo(id: string) {
    onChange((prev) => ({
      ...prev,
      expandidoId: prev.expandidoId === id ? null : id,
    }));
  }

  function toggleAtributo(territorioId: string, atributo: string) {
    onChange((prev) => {
      const atual = prev.atributosPorTerritorio[territorioId] ?? [];
      const next = toggleIn(atual, atributo);
      return {
        ...prev,
        atributosPorTerritorio: {
          ...prev.atributosPorTerritorio,
          [territorioId]: next,
        },
      };
    });
  }

  return (
    <div className="space-y-8">
      {omitirConcorrentes ? (
        <div>
          <h3 className="mb-2 text-sm font-medium text-ili-cinza-500">
            Concorrentes (benchmark aprovado)
          </h3>
          {value.concorrentesIa.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {value.concorrentesIa.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/50 p-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ili-preto">{c.nome}</p>
                    {c.tipo ? (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-800 ring-1 ring-ili-cinza-200">
                        {c.tipo === "direto" ? "Direto" : "Indireto"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-ili-cinza-500">{c.resumo}</p>
                </div>
              ))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/50 p-3 font-sans text-sm text-ili-cinza-600">
              {value.concorrentesManual.trim() || "—"}
            </pre>
          )}
        </div>
      ) : (
        <div>
          <label className="mb-2 block text-sm font-medium text-ili-cinza-500">
            Concorrentes (um por linha)
          </label>
          <textarea
            value={value.concorrentesManual}
            onChange={(e) => onChange({ concorrentesManual: e.target.value })}
            rows={5}
            className="w-full rounded-xl border border-ili-cinza-200 px-3 py-2 font-mono text-sm text-ili-preto focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="ex.: concorrente.com"
          />
          <button
            type="button"
            onClick={pesquisarConcorrentes}
            disabled={carregarIa}
            className="mt-3 rounded-lg border border-ili-cinza-200 bg-white px-4 py-2 text-sm font-medium text-ili-cinza-500 shadow-sm hover:border-brand-300 hover:text-brand-800 disabled:cursor-wait"
          >
            {carregarIa ? "A pesquisar…" : "Pesquisar concorrentes com IA"}
          </button>
          {value.concorrentesIa.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {value.concorrentesIa.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-ili-cinza-200 bg-white p-3 shadow-sm"
                >
                  <p className="font-semibold text-ili-preto">{c.nome}</p>
                  <p className="mt-1 text-sm text-ili-cinza-500">{c.resumo}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div>
        <h3 className="mb-3 text-sm font-medium text-ili-cinza-500">
          Territórios emocionais (múltipla escolha)
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {TERRITORIOS.map((t) => {
            const selecionado = value.territoriosSelecionados.includes(t.id);
            const expandido = value.expandidoId === t.id;
            const tags = value.atributosPorTerritorio[t.id] ?? [];
            return (
              <div
                key={t.id}
                className={`overflow-hidden rounded-xl border bg-white text-left shadow-sm transition ${
                  selecionado
                    ? "border-brand-600 ring-1 ring-brand-200"
                    : "border-ili-cinza-200 hover:border-ili-cinza-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onChange((prev) => {
                      const sel = toggleIn(
                        prev.territoriosSelecionados,
                        t.id,
                      );
                      const atrib = { ...prev.atributosPorTerritorio };
                      if (sel.includes(t.id) && atrib[t.id] === undefined) {
                        atrib[t.id] = [];
                      }
                      return {
                        ...prev,
                        territoriosSelecionados: sel,
                      };
                    });
                  }}
                  className="w-full px-3 py-2.5 text-left"
                >
                  <span className="text-sm font-medium text-ili-preto">
                    {t.titulo}
                  </span>
                </button>
                <div className="border-t border-ili-cinza-100 px-2 py-1">
                  <button
                    type="button"
                    onClick={() => expandirSo(t.id)}
                    className="w-full rounded-lg px-2 py-1.5 text-xs text-brand-700 hover:bg-ili-rosa-50"
                  >
                    {expandido ? "Ocultar atributos" : "Atributos (tags)"}
                  </button>
                </div>
                {expandido && (
                  <div className="border-t border-ili-cinza-100 bg-ili-cinza-50/80 px-2 py-2">
                    <p className="mb-1.5 text-xs text-ili-cinza-400">Toque para seleccionar</p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.atributos.map((a) => {
                        const on = tags.includes(a);
                        return (
                          <button
                            key={a}
                            type="button"
                            onClick={() => toggleAtributo(t.id, a)}
                            className={`rounded-full border px-2 py-0.5 text-xs transition ${
                              on
                                ? "border-brand-600 bg-brand-600 text-white"
                                : "border-ili-cinza-200 bg-white text-ili-cinza-500 hover:border-ili-rosa-300"
                            }`}
                          >
                            {a}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
