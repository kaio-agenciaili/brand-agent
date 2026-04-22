"use client";

import type { PilulasDiretriz } from "@/lib/briefing/types";

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

type Props = {
  titulo: string;
  ajuda?: string;
  pilulas: PilulasDiretriz;
  onPilulas: (next: PilulasDiretriz) => void;
  textoLivre: string;
  onTextoLivre: (v: string) => void;
  placeholderLivre?: string;
};

export function PilulasGrupo({
  titulo,
  ajuda,
  pilulas,
  onPilulas,
  textoLivre,
  onTextoLivre,
  placeholderLivre,
}: Props) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-ili-cinza-500">{titulo}</p>
        {ajuda ? (
          <p className="mt-0.5 text-xs text-ili-cinza-400">{ajuda}</p>
        ) : null}
      </div>
      {pilulas.sugeridas.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {pilulas.sugeridas.map((pill) => {
            const on = pilulas.selecionadas.includes(pill);
            return (
              <button
                key={pill}
                type="button"
                onClick={() =>
                  onPilulas({
                    ...pilulas,
                    selecionadas: toggle(pilulas.selecionadas, pill),
                  })
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  on
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-ili-cinza-200 bg-white text-ili-cinza-600 hover:border-brand-300"
                }`}
              >
                {pill}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-ili-cinza-400">
          Sem sugestões da IA ainda — use o texto abaixo ou volte a extrair o briefing.
        </p>
      )}
      <textarea
        value={textoLivre}
        onChange={(e) => onTextoLivre(e.target.value)}
        rows={2}
        placeholder={placeholderLivre}
        className="w-full rounded-xl border border-ili-cinza-200 px-3 py-2 text-sm text-ili-preto placeholder:text-ili-cinza-300 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
    </div>
  );
}
