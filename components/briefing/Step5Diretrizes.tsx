"use client";

import { PilulasGrupo } from "@/components/briefing/PilulasGrupo";
import type {
  BriefingStep5,
  ExtensaoDominio,
  PilulasDiretriz,
  TipoNomePreferido,
} from "@/lib/briefing/types";
import { pilulasDiretrizVazias } from "@/lib/briefing/types";

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

const exts: { v: ExtensaoDominio; l: string }[] = [
  { v: "com", l: ".com" },
  { v: "com.br", l: ".com.br" },
  { v: "net", l: ".net" },
  { v: "org", l: ".org" },
  { v: "co", l: ".co" },
  { v: "io", l: ".io" },
  { v: "ai", l: ".ai" },
  { v: "app", l: ".app" },
  { v: "dev", l: ".dev" },
  { v: "digital", l: ".digital" },
];

function toggleArray<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function pilulas(
  v: BriefingStep5,
  key: keyof Pick<
    BriefingStep5,
    | "pilulasSinonimos"
    | "pilulasEvitar"
    | "pilulasInspiram"
    | "pilulasNegativar"
    | "pilulasOutras"
  >,
): PilulasDiretriz {
  return v[key] ?? pilulasDiretrizVazias();
}

export function Step5Diretrizes({ value, onChange }: Props) {
  return (
    <div className="space-y-8">
      <p className="text-xs text-ili-cinza-400">
        A IA pré-preenche sugestões na extração do briefing. Clique nas pílulas
        que quer incluir e complete com texto livre se precisar.
      </p>
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
      <PilulasGrupo
        titulo="Nomes a negativar"
        ajuda="Pílulas sugeridas pela IA; clique para incluir. Texto livre para mais detalhe."
        pilulas={pilulas(value, "pilulasNegativar")}
        onPilulas={(next) => onChange({ pilulasNegativar: next })}
        textoLivre={value.nomesNegativar}
        onTextoLivre={(v) => onChange({ nomesNegativar: v })}
        placeholderLivre="Notas adicionais (opcional)…"
      />

      <PilulasGrupo
        titulo="Sinónimos ou termos de que gosta"
        ajuda="Ideias semânticas para o naming — seleccione as que fazem sentido."
        pilulas={pilulas(value, "pilulasSinonimos")}
        onPilulas={(next) => onChange({ pilulasSinonimos: next })}
        textoLivre={value.sinonimosGosto}
        onTextoLivre={(v) => onChange({ sinonimosGosto: v })}
        placeholderLivre="Outros termos à mão (opcional)…"
      />

      <PilulasGrupo
        titulo="Palavras, sílabas ou raízes a evitar"
        ajuda="Clichés ou sons que quer afastar."
        pilulas={pilulas(value, "pilulasEvitar")}
        onPilulas={(next) => onChange({ pilulasEvitar: next })}
        textoLivre={value.palavrasEvitar}
        onTextoLivre={(v) => onChange({ palavrasEvitar: v })}
        placeholderLivre="Ex.: mais raízes a evitar…"
      />

      <PilulasGrupo
        titulo="Marcas ou nomes de referência que inspiram"
        ajuda="Referência de tom ou estrutura — não para copiar."
        pilulas={pilulas(value, "pilulasInspiram")}
        onPilulas={(next) => onChange({ pilulasInspiram: next })}
        textoLivre={value.nomesInspiram}
        onTextoLivre={(v) => onChange({ nomesInspiram: v })}
        placeholderLivre="Outras referências (opcional)…"
      />

      <PilulasGrupo
        titulo="Outras notas para o naming"
        ajuda="Restrições ou preferências adicionais sugeridas pela IA."
        pilulas={pilulas(value, "pilulasOutras")}
        onPilulas={(next) => onChange({ pilulasOutras: next })}
        textoLivre={value.outrasNotasNaming}
        onTextoLivre={(v) => onChange({ outrasNotasNaming: v })}
        placeholderLivre="Notas extra (opcional)…"
      />

      <div className="rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/60 px-3 py-3">
        <p className="text-sm font-medium text-ili-cinza-500">
          Domínios checados automaticamente
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ili-cinza-400">
          No resultado, o sistema checa por padrão as extensões mais usadas. Não é preciso escolher nesta etapa.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {exts.map((e) => (
            <span
              key={e.v}
              className="rounded-full border border-ili-cinza-200 bg-white px-2.5 py-1 text-xs font-medium text-ili-cinza-500"
            >
              {e.l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
