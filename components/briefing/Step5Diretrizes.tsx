"use client";

import { PilulasGrupo } from "@/components/briefing/PilulasGrupo";
import type {
  BriefingStep5,
  ComprimentoPreferido,
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
  const soComBr =
    value.extensoes.length === 1 && value.extensoes[0] === "com.br";

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
        {soComBr ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
            <span className="font-medium">Só .com.br?</span> Se tiver interesse
            em <strong>.com</strong>, <strong>.io</strong> ou <strong>.app</strong>{" "}
            para defesa de marca ou expansão, seleccione acima ou diga ao cliente
            para validar disponibilidade nesses TLDs.
            <div className="mt-2 flex flex-wrap gap-2">
              {(["com", "io", "app"] as const).map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() =>
                    onChange({
                      extensoes: toggleArray(value.extensoes, x),
                    })
                  }
                  className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                >
                  + .{x}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
