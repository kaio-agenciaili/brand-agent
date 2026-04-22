"use client";

import type {
  BriefingStep5,
  ComprimentoPreferido,
  ExtensaoDominio,
  TipoNomePreferido,
} from "@/lib/briefing/types";

type Props = {
  value: BriefingStep5;
  onChange: (patch: Partial<BriefingStep5>) => void;
};

const tipos: { v: TipoNomePreferido; l: string }[] = [
  { v: "inventado", l: "Inventado" },
  { v: "evocativo", l: "Evocativo" },
  { v: "combinado", l: "Combinado" },
  { v: "descritivo", l: "Descritivo" },
];

const compr: { v: ComprimentoPreferido; l: string }[] = [
  { v: "1", l: "1 sílaba" },
  { v: "2-3", l: "2–3 sílabas" },
  { v: "4+", l: "4+ sílabas" },
  { v: "sem", l: "Sem preferência" },
];

const exts: { v: ExtensaoDominio; l: string }[] = [
  { v: "com.br", l: ".com.br" },
  { v: "com", l: ".com" },
  { v: "io", l: ".io" },
  { v: "app", l: ".app" },
];

function toggleArray<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function Step5Diretrizes({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium text-ili-cinza-500">
          Tipo de nome preferido (múltipla escolha)
        </p>
        <div className="flex flex-wrap gap-2">
          {tipos.map((t) => {
            const on = value.tiposNome.includes(t.v);
            return (
              <button
                key={t.v}
                type="button"
                onClick={() =>
                  onChange({ tiposNome: toggleArray(value.tiposNome, t.v) })
                }
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  on
                    ? "border-brand-600 bg-ili-rosa-50 text-brand-900"
                    : "border-ili-cinza-200 bg-white text-ili-cinza-500"
                }`}
              >
                {t.l}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-ili-cinza-500">Comprimento</p>
        <div className="flex flex-wrap gap-3">
          {compr.map((c) => (
            <label
              key={c.v}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-ili-cinza-200 bg-white px-3 py-2 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-ili-rosa-50"
            >
              <input
                type="radio"
                name="comprimento"
                checked={value.comprimento === c.v}
                onChange={() => onChange({ comprimento: c.v })}
                className="text-brand-600"
              />
              {c.l}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ili-cinza-500">
          Palavras / raízes a evitar
        </label>
        <textarea
          value={value.palavrasEvitar}
          onChange={(e) => onChange({ palavrasEvitar: e.target.value })}
          rows={3}
          className="w-full rounded-xl border border-ili-cinza-200 px-3 py-2 text-ili-preto focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ili-cinza-500">
          Nomes que inspiram
        </label>
        <textarea
          value={value.nomesInspiram}
          onChange={(e) => onChange({ nomesInspiram: e.target.value })}
          rows={3}
          className="w-full rounded-xl border border-ili-cinza-200 px-3 py-2 text-ili-preto focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-ili-cinza-500">
          Extensões de domínio (múltipla escolha)
        </p>
        <div className="flex flex-wrap gap-2">
          {exts.map((e) => {
            const on = value.extensoes.includes(e.v);
            return (
              <button
                key={e.v}
                type="button"
                onClick={() =>
                  onChange({ extensoes: toggleArray(value.extensoes, e.v) })
                }
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  on
                    ? "border-brand-600 bg-ili-rosa-50 text-brand-900"
                    : "border-ili-cinza-200 bg-white"
                }`}
              >
                {e.l}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
