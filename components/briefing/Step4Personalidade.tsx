"use client";

import {
  ARQUETIPOS,
  EIXOS_PERSONALIDADE,
  type ArquetipoId,
  type BriefingStep4,
} from "@/lib/briefing/types";
import { useState } from "react";

type Props = {
  value: BriefingStep4;
  onChange: (patch: Partial<BriefingStep4>) => void;
  /** Sliders mais compactos (tela de revisão). */
  compacto?: boolean;
};

function toggleArquetipo(
  atuais: ArquetipoId[],
  id: ArquetipoId,
): ArquetipoId[] {
  if (atuais.includes(id)) {
    return atuais.filter((x) => x !== id);
  }
  if (atuais.length >= 2) {
    return atuais;
  }
  return [...atuais, id];
}

export function Step4Personalidade({ value, onChange, compacto }: Props) {
  const [sugerindo, setSugerindo] = useState(false);

  function cliqueArquetipo(id: ArquetipoId) {
    onChange({ arquetipos: toggleArquetipo(value.arquetipos, id) });
  }

  function ajusteEixo(id: string, n: number) {
    onChange({
      eixos: { ...value.eixos, [id]: n },
    });
  }

  function sugerirIa() {
    setSugerindo(true);
    window.setTimeout(() => {
      const eixos = { ...value.eixos };
      for (const e of EIXOS_PERSONALIDADE) {
        eixos[e.id] = Math.floor(Math.random() * 101);
      }
      onChange({ eixos });
      setSugerindo(false);
    }, 2000);
  }

  return (
    <div className={compacto ? "space-y-4" : "space-y-8"}>
      <div>
        <h3 className="mb-2 text-sm font-medium text-ili-cinza-500">
          Arquétipos (máximo 2)
        </h3>
        <div
          className={
            compacto
              ? "grid grid-cols-2 gap-1.5 sm:grid-cols-3"
              : "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
          }
        >
          {ARQUETIPOS.map((a) => {
            const on = value.arquetipos.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => cliqueArquetipo(a.id)}
                className={`rounded-lg border px-2 py-2 text-left text-sm font-medium transition ${
                  compacto ? "text-xs " : ""
                } ${
                  on
                    ? "border-brand-600 bg-ili-rosa-50 text-brand-900"
                    : "border-ili-cinza-200 bg-white text-ili-cinza-500 hover:border-ili-cinza-200"
                }`}
              >
                {a.label}
              </button>
            );
          })}
        </div>
        {value.arquetipos.length >= 2 && (
          <p className="mt-2 text-xs text-ili-rosa-700">
            Máximo de 2. Desmarque um para escolher outro.
          </p>
        )}
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-ili-cinza-500">Eixos (0–100)</h3>
          {!compacto && (
            <button
              type="button"
              onClick={sugerirIa}
              disabled={sugerindo}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-wait disabled:opacity-60"
            >
              {sugerindo ? "A sugerir…" : "Sugerir com IA"}
            </button>
          )}
        </div>
        <div className={compacto ? "space-y-2" : "space-y-5"}>
          {EIXOS_PERSONALIDADE.map((e) => {
            const v = value.eixos[e.id] ?? 50;
            return (
              <div key={e.id}>
                <div
                  className={`mb-0.5 flex justify-between text-ili-cinza-400 ${
                    compacto ? "text-[10px] leading-tight" : "text-xs"
                  }`}
                >
                  <span className="max-w-[32%]">{e.esquerda}</span>
                  <span className="shrink-0 font-mono text-ili-cinza-500">
                    {v}
                  </span>
                  <span className="max-w-[32%] text-right">{e.direita}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={v}
                  onChange={(ev) =>
                    ajusteEixo(e.id, Number(ev.target.value))
                  }
                  className={
                    compacto
                      ? "h-1.5 w-full cursor-pointer accent-brand-600"
                      : "h-2 w-full cursor-pointer accent-brand-600"
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
