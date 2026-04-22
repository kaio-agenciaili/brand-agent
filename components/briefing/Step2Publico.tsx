"use client";

import type { BriefingStep2, IdiomaNome } from "@/lib/briefing/types";

type Props = {
  value: BriefingStep2;
  onChange: (patch: Partial<BriefingStep2>) => void;
};

const idiomas: { v: IdiomaNome; l: string }[] = [
  { v: "pt", l: "Português" },
  { v: "en", l: "Inglês" },
  { v: "hibrido", l: "Híbrido" },
  { v: "sem", l: "Sem restrição" },
];

export function Step2Publico({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-ili-cinza-500">
          Perfil demográfico
        </label>
        <textarea
          value={value.perfilDemografico}
          onChange={(e) => onChange({ perfilDemografico: e.target.value })}
          rows={4}
          className="w-full rounded-xl border border-ili-cinza-200 px-3 py-2 text-ili-preto focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
          placeholder="Idade, geografia, contexto de uso…"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ili-cinza-500">
          O que sente e deseja
        </label>
        <textarea
          value={value.senteEDeseja}
          onChange={(e) => onChange({ senteEDeseja: e.target.value })}
          rows={4}
          className="w-full rounded-xl border border-ili-cinza-200 px-3 py-2 text-ili-preto focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ili-cinza-500">
          Principais objeções
        </label>
        <textarea
          value={value.objecoes}
          onChange={(e) => onChange({ objecoes: e.target.value })}
          rows={4}
          className="w-full rounded-xl border border-ili-cinza-200 px-3 py-2 text-ili-preto focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>
      <div>
        <p className="mb-3 text-sm font-medium text-ili-cinza-500">
          Idioma do nome
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {idiomas.map(({ v, l }) => (
            <label
              key={v}
              className="flex cursor-pointer flex-col rounded-xl border border-ili-cinza-200 bg-white p-4 text-sm shadow-sm transition hover:border-ili-rosa-200 has-[:checked]:border-brand-600 has-[:checked]:ring-2 has-[:checked]:ring-brand-200"
            >
              <input
                type="radio"
                name="idiomaNome"
                checked={value.idiomaNome === v}
                onChange={() => onChange({ idiomaNome: v })}
                className="mb-2 text-brand-600"
              />
              <span className="font-medium text-ili-preto">{l}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
