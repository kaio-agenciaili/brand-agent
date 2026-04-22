"use client";

import type { BriefingStep1, Mercado } from "@/lib/briefing/types";
import { useState } from "react";

type Props = {
  value: BriefingStep1;
  onChange: (patch: Partial<BriefingStep1>) => void;
  /** Só mostra os campos extraídos (revisão). */
  modoRevisao?: boolean;
};

const mercadoOp: { v: Mercado; l: string }[] = [
  { v: "B2B", l: "B2B" },
  { v: "B2C", l: "B2C" },
  { v: "Ambos", l: "Ambos" },
];

export function Step1Empresa({ value, onChange, modoRevisao }: Props) {
  const [extrairIa, setExtrairIa] = useState(false);

  function simularExtracao() {
    setExtrairIa(true);
    window.setTimeout(() => {
      onChange({
        nomeEmpresa: "Vértex Analytics",
        setor: "Software de análise",
        oQueFaz:
          "Plataforma de BI e automação de relatórios para equipas de revenue e operações.",
        proposito:
          "Democratizar decisões baseadas em dados com rapidez e simplicidade.",
        mercado: "B2B",
      });
      setExtrairIa(false);
    }, 2000);
  }

  return (
    <div className="space-y-6">
      {!modoRevisao && (
        <>
          <div>
            <label className="mb-2 block text-sm font-medium text-ili-cinza-500">
              Cole o texto da reunião ou briefing aqui
            </label>
            <textarea
              value={value.textoReuniao}
              onChange={(e) => onChange({ textoReuniao: e.target.value })}
              rows={8}
              className="w-full rounded-xl border border-ili-cinza-200 bg-white px-4 py-3 text-ili-preto shadow-sm placeholder:text-ili-cinza-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Transcrição, notas ou documento colado…"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={simularExtracao}
              disabled={extrairIa}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
            >
              {extrairIa ? "A extrair…" : "Extrair com IA"}
            </button>
          </div>
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label className="mb-1 block text-sm font-medium text-ili-cinza-500">
            Nome da empresa
          </label>
          <input
            type="text"
            value={value.nomeEmpresa}
            onChange={(e) => onChange({ nomeEmpresa: e.target.value })}
            className="w-full rounded-lg border border-ili-cinza-200 px-3 py-2 text-ili-preto focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ili-cinza-500">
            Setor
          </label>
          <input
            type="text"
            value={value.setor}
            onChange={(e) => onChange({ setor: e.target.value })}
            className="w-full rounded-lg border border-ili-cinza-200 px-3 py-2 text-ili-preto focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-ili-cinza-500">
            O que faz
          </label>
          <textarea
            value={value.oQueFaz}
            onChange={(e) => onChange({ oQueFaz: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-ili-cinza-200 px-3 py-2 text-ili-preto focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-ili-cinza-500">
            Propósito / missão
          </label>
          <textarea
            value={value.proposito}
            onChange={(e) => onChange({ proposito: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-ili-cinza-200 px-3 py-2 text-ili-preto focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-ili-cinza-500">Mercado</p>
        <div className="flex flex-wrap gap-3">
          {mercadoOp.map(({ v, l }) => (
            <label
              key={v}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-ili-cinza-200 bg-white px-3 py-2 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-ili-rosa-50"
            >
              <input
                type="radio"
                name="mercado"
                value={v}
                checked={value.mercado === v}
                onChange={() => onChange({ mercado: v })}
                className="text-brand-600 focus:ring-brand-500"
              />
              {l}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
