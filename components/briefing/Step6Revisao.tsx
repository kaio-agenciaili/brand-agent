"use client";

import { TERRITORIOS } from "@/lib/briefing/territorios";
import { ARQUETIPOS, EIXOS_PERSONALIDADE } from "@/lib/briefing/types";
import type { BriefingState } from "@/lib/briefing/types";
import { useRouter } from "next/navigation";

type Props = {
  dados: BriefingState;
  idProjeto: string;
};

const idiomaLabel: Record<string, string> = {
  pt: "Português",
  en: "Inglês",
  hibrido: "Híbrido",
  sem: "Sem restrição",
};

export function Step6Revisao({ dados, idProjeto }: Props) {
  const router = useRouter();
  const { step1, step2, step3, step4, step5 } = dados;

  function irResultado() {
    router.push(`/projetos/${idProjeto}/resultado`);
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <ResumoBloco title="1 — Empresa">
          <Campo l="Empresa" v={step1.nomeEmpresa} />
          <Campo l="Setor" v={step1.setor} />
          <Campo l="O que faz" v={step1.oQueFaz} multiline />
          <Campo l="Propósito" v={step1.proposito} multiline />
          <Campo l="Mercado" v={step1.mercado} />
        </ResumoBloco>
        <ResumoBloco title="2 — Público">
          <Campo l="Perfil" v={step2.perfilDemografico} multiline />
          <Campo l="Sente e deseja" v={step2.senteEDeseja} multiline />
          <Campo l="Objeções" v={step2.objecoes} multiline />
          <Campo
            l="Idioma do nome"
            v={idiomaLabel[step2.idiomaNome] ?? step2.idiomaNome}
          />
        </ResumoBloco>
        <ResumoBloco title="3 — Posicionamento" className="lg:col-span-2">
          <Campo l="Concorrentes (manual)" v={step3.concorrentesManual} multiline />
          {step3.concorrentesIa.length > 0 && (
            <div className="text-sm text-ili-cinza-500">
              <p className="mb-1 font-medium text-ili-cinza-500">Concorrentes (IA):</p>
              <ul className="list-inside list-disc">
                {step3.concorrentesIa.map((c) => (
                  <li key={c.id}>{c.nome}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm">
            <span className="font-medium text-ili-cinza-500">Territórios: </span>
            {step3.territoriosSelecionados.length
              ? step3.territoriosSelecionados
                  .map(
                    (id) =>
                      TERRITORIOS.find((t) => t.id === id)?.titulo ?? id,
                  )
                  .join(", ")
              : "—"}
          </p>
        </ResumoBloco>
        <ResumoBloco title="4 — Personalidade">
          <p className="text-sm text-ili-cinza-500">
            <span className="font-medium text-ili-cinza-500">Arquétipos: </span>
            {step4.arquetipos.length
              ? step4.arquetipos
                  .map(
                    (id) => ARQUETIPOS.find((a) => a.id === id)?.label ?? id,
                  )
                  .join(", ")
              : "—"}
          </p>
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-ili-cinza-500">
            {EIXOS_PERSONALIDADE.map((e) => (
              <div key={e.id} className="flex justify-between gap-2">
                <span>
                  {e.esquerda} / {e.direita}
                </span>
                <span className="font-mono text-ili-cinza-500">
                  {step4.eixos[e.id] ?? 50}
                </span>
              </div>
            ))}
          </div>
        </ResumoBloco>
        <ResumoBloco title="5 — Diretrizes">
          <Campo
            l="Tipos de nome"
            v={step5.tiposNome.join(", ") || "—"}
          />
          <Campo l="Comprimento" v={step5.comprimento} />
          <Campo
            l="Nomes a negativar"
            v={step5.nomesNegativar || "—"}
            multiline
          />
          <Campo
            l="Sinónimos / termos de que gosta"
            v={step5.sinonimosGosto || "—"}
            multiline
          />
          <Campo l="Evitar (raízes)" v={step5.palavrasEvitar} multiline />
          <Campo l="Inspirações" v={step5.nomesInspiram} multiline />
          <Campo
            l="Outras notas"
            v={step5.outrasNotasNaming || "—"}
            multiline
          />
          <p className="text-sm text-ili-cinza-500">
            <span className="font-medium text-ili-cinza-500">Extensões: </span>
            {step5.extensoes.map((x) => `.${x}`).join(", ") || "—"}
          </p>
        </ResumoBloco>
      </div>
      <div className="flex flex-col items-center border-t border-ili-cinza-200 pt-8">
        <button
          type="button"
          onClick={irResultado}
          className="rounded-xl bg-brand-600 px-8 py-3 text-base font-semibold text-white shadow-md transition hover:bg-brand-700"
        >
          Gerar nomes com IA
        </button>
        <p className="mt-2 text-center text-sm text-ili-cinza-400">
          Irá abrir a página de resultado (dados de exemplo).
        </p>
      </div>
    </div>
  );
}

function ResumoBloco({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-ili-cinza-200 bg-white p-4 shadow-sm ${className}`}
    >
      <h3 className="mb-3 border-b border-ili-cinza-100 pb-2 text-sm font-semibold text-brand-800">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Campo({
  l,
  v,
  multiline,
}: {
  l: string;
  v: string;
  multiline?: boolean;
}) {
  if (!v?.trim()) {
    return null;
  }
  return (
    <div className="text-sm">
      <span className="font-medium text-ili-cinza-500">{l}: </span>
      {multiline ? (
        <p className="mt-0.5 whitespace-pre-wrap text-ili-cinza-500">{v}</p>
      ) : (
        <span className="text-ili-cinza-500">{v}</span>
      )}
    </div>
  );
}
