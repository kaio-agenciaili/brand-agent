"use client";

import { FluxoNamingStepper } from "@/components/projetos/fluxo-naming-stepper";
import {
  extrairNamingParseado,
  type FoneticaNome,
  type PropostaNaming,
  type Top3Item,
} from "@/lib/resultado/naming-display";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type StatusAvaliacaoNome = "shortlist" | "negativado" | "neutro";

type AvaliacaoNome = {
  status: StatusAvaliacaoNome;
  nota?: string;
};

type StatusDominio = "registrado" | "disponivel" | "sem_registro_encontrado" | "indeterminado";

type ResultadoDominio = {
  dominio: string;
  status: StatusDominio;
  fonte: string;
};

type Props = {
  idProjeto: string;
  nomeProjeto: string;
  statusProjeto: string;
  relatorioFinal: string;
  nomesGeral: Record<string, unknown> | null;
  nomesEscolhidos: string[];
  notasNomes: Record<string, string>;
  avaliacoesNomes: Record<string, AvaliacaoNome>;
};

const dominiosPopulares = ["com", "com.br", "net", "org", "co", "io", "ai", "app", "dev", "digital"];

function gerarPromptInpi(params: {
  nomeProjeto: string;
  shortlist: PropostaNaming[];
  negativados: PropostaNaming[];
  notas: Record<string, string>;
  sintese: string | null;
}): string {
  const nomesSelecionados = params.shortlist.map((p) => `- ${p.nome}`).join("\n") || "- Nenhum";
  const nomesNegativados =
    params.negativados
      .map((p) => `- ${p.nome}${params.notas[p.nome ?? ""] ? `: ${params.notas[p.nome ?? ""]}` : ""}`)
      .join("\n") || "- Nenhum";

  return `Você é um assistente de pré-checagem de marcas para naming no Brasil.

Analise apenas os nomes selecionados para shortlist. A tarefa é orientar uma busca manual no INPI e em buscas públicas, sem emitir parecer jurídico.

Projeto:
${params.nomeProjeto}

Síntese estratégica:
${params.sintese ?? "Não informada."}

Nomes selecionados para checagem:
${nomesSelecionados}

Nomes negativados da rodada, apenas como aprendizado do que evitar:
${nomesNegativados}

Para cada nome selecionado:
1. Sugira buscas no INPI: nome exato, variações com e sem acento, grafias similares, radicais, plural/singular e termos foneticamente próximos.
2. Sugira classes NCL prováveis e explique o motivo.
3. Aponte riscos preliminares: nomes iguais, nomes parecidos, colisão fonética, colisão semântica e termos genéricos/descritivos.
4. Gere uma tabela com: nome, termos de busca INPI, classes NCL prováveis, risco preliminar, motivo e recomendação.
5. Sugira também buscas amplas no Google para marcas, empresas, produtos, domínios e redes sociais.

Importante: não dê parecer jurídico. Faça apenas triagem preliminar para orientar a validação profissional no INPI.`;
}

function gerarPromptApresentacao(params: {
  nomeProjeto: string;
  shortlist: PropostaNaming[];
  notas: Record<string, string>;
  sintese: string | null;
  relatorioFinal: string;
}): string {
  const nomes = params.shortlist
    .map((p) => {
      const nota = params.notas[p.nome ?? ""];
      return `- ${p.nome}: ${p.base_conceitual ?? p.justificativa ?? ""}${nota ? `\n  Nota do analista: ${nota}` : ""}`;
    })
    .join("\n") || "- Nenhum nome selecionado";

  return `Você é um estrategista de marca preparando uma apresentação de naming para cliente.

Crie uma apresentação clara e profissional explicando como os nomes foram selecionados.

Projeto:
${params.nomeProjeto}

Síntese das bases:
${params.sintese ?? "Não informada."}

Nomes selecionados para apresentação:
${nomes}

Relatório e contexto disponível:
${params.relatorioFinal || "Não informado."}

Estruture a apresentação em slides:
1. Título do projeto
2. Objetivo do naming
3. Contexto e desafio
4. Critérios de pesquisa e seleção
5. Territórios estratégicos usados
6. Benchmark e aprendizados
7. Como a pesquisa foi conduzida
8. Shortlist de nomes
9. Um slide por nome selecionado, com ideia central, racional estratégico, relação com briefing, forças, pontos de atenção e caminhos visuais/verbais possíveis
10. Recomendação e próximos passos

Tom: consultivo, estratégico, claro e pronto para apresentação a cliente.`;
}

function dominiosParaNome(nome: string): string[] {
  const slug = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!slug) return [];
  return dominiosPopulares.map((ext) => `${slug}.${ext}`);
}

function rotuloStatusDominio(status: StatusDominio): string {
  switch (status) {
    case "registrado":
      return "registrado";
    case "disponivel":
      return "disponível";
    case "sem_registro_encontrado":
      return "sem registro encontrado";
    default:
      return "indeterminado";
  }
}

function classeStatusDominio(status: StatusDominio): string {
  switch (status) {
    case "registrado":
      return "bg-red-50 text-red-700 border-red-100";
    case "disponivel":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "sem_registro_encontrado":
      return "bg-amber-50 text-amber-800 border-amber-100";
    default:
      return "bg-ili-cinza-100 text-ili-cinza-500 border-ili-cinza-200";
  }
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function ScoreRegistrabilidade({ score }: { score?: number }) {
  if (!score) return null;
  return (
    <div className="flex items-center gap-1" title={`Score de registrabilidade: ${score}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-4 rounded-full ${i < score ? "bg-brand-500" : "bg-ili-cinza-200"}`}
        />
      ))}
      <span className="ml-1 text-xs text-ili-cinza-400">{score}/5</span>
    </div>
  );
}

function ScoreFonetico({ score }: { score?: number }) {
  if (!score) return null;
  return (
    <div className="flex items-center gap-1" title={`Score fonético: ${score}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-4 rounded-full ${i < score ? "bg-ili-rosa-400" : "bg-ili-cinza-200"}`}
        />
      ))}
    </div>
  );
}

const TECNICA_CONFIG: Record<string, { label: string; cor: string }> = {
  portmanteau: { label: "Fusão", cor: "bg-blue-100 text-blue-700" },
  neologismo: { label: "Neologismo", cor: "bg-violet-100 text-violet-700" },
  descritivo: { label: "Descritivo", cor: "bg-slate-100 text-slate-600" },
  aspiracional: { label: "Aspiracional", cor: "bg-amber-100 text-amber-800" },
  ressignificado: { label: "Resignificado", cor: "bg-emerald-100 text-emerald-700" },
  acronimo: { label: "Acrônimo", cor: "bg-cyan-100 text-cyan-700" },
  fundador: { label: "Fundador", cor: "bg-orange-100 text-orange-700" },
  fonetico: { label: "Fonético", cor: "bg-pink-100 text-pink-700" },
};

function BadgeCategoria({ tecnica, categoria }: { tecnica?: string; categoria?: string }) {
  const key = (tecnica ?? categoria ?? "").toLowerCase();
  if (!key) return null;
  const cfg = TECNICA_CONFIG[key];
  if (cfg) {
    return (
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cor}`}>
        {cfg.label}
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-ili-cinza-100 px-2 py-0.5 text-xs font-medium text-ili-cinza-500">
      {tecnica ?? categoria}
    </span>
  );
}

function PainelFonetica({ fon }: { fon: FoneticaNome }) {
  return (
    <div className="mt-3 rounded-xl border border-ili-cinza-100 bg-ili-cinza-50/60 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ili-cinza-400">
        Análise Fonética
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {fon.pronuncia_pt && (
          <>
            <span className="text-ili-cinza-400">PT</span>
            <span className="font-mono text-ili-preto">{fon.pronuncia_pt}</span>
          </>
        )}
        {fon.pronuncia_en && (
          <>
            <span className="text-ili-cinza-400">EN</span>
            <span className="font-mono text-ili-preto">{fon.pronuncia_en}</span>
          </>
        )}
        {fon.ritmo && (
          <>
            <span className="text-ili-cinza-400">Ritmo</span>
            <span className="text-ili-preto">{fon.ritmo}</span>
          </>
        )}
        {fon.memorabilidade && (
          <>
            <span className="text-ili-cinza-400">Memorabilidade</span>
            <span className="text-ili-preto">{fon.memorabilidade}</span>
          </>
        )}
        {fon.facilidade_escrita && (
          <>
            <span className="text-ili-cinza-400">Escrita</span>
            <span className="text-ili-preto">{fon.facilidade_escrita}</span>
          </>
        )}
      </div>
      {fon.score_fonetico && (
        <div className="mt-2">
          <ScoreFonetico score={fon.score_fonetico} />
        </div>
      )}
      {fon.alerta_fonetico && (
        <p className="mt-2 text-xs text-amber-700">
          <span className="font-medium">Alerta:</span> {fon.alerta_fonetico}
        </p>
      )}
    </div>
  );
}

function CartaoProposta({
  p,
  idx,
  favorito,
  status,
  nota,
  dominiosNome,
  onToggleFavorito,
  onStatus,
  onNota,
}: {
  p: PropostaNaming;
  idx: number;
  favorito: boolean;
  status: StatusAvaliacaoNome;
  nota: string;
  dominiosNome: ResultadoDominio[];
  onToggleFavorito: () => void;
  onStatus: (status: StatusAvaliacaoNome) => void;
  onNota: (n: string) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [editandoNota, setEditandoNota] = useState(false);
  const [notaLocal, setNotaLocal] = useState(nota);

  function salvarNota() {
    setEditandoNota(false);
    onNota(notaLocal);
  }

  return (
    <div
      id={p.nome ? `card-${p.nome.toLowerCase().replace(/\s+/g, "-")}` : undefined}
      className={`rounded-2xl border bg-white shadow-sm transition-all duration-200 ${
        status === "shortlist"
          ? "border-brand-300 ring-1 ring-brand-200"
          : status === "negativado"
            ? "border-red-200 bg-red-50/20"
          : "border-ili-cinza-200 hover:border-ili-cinza-300"
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setExpandido((o) => !o)}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-ili-cinza-300">{idx + 1}</span>
              <h3 className="text-lg font-semibold text-ili-preto hover:text-brand-700">{p.nome ?? "—"}</h3>
              {status === "shortlist" ? (
                <span className="inline-block rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                  Selecionado
                </span>
              ) : null}
              {status === "negativado" ? (
                <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  Negativado
                </span>
              ) : null}
              <BadgeCategoria tecnica={p.tecnica_naming} categoria={p.categoria} />
              {p.territorio_estrategico ? (
                <span className="inline-block rounded-full bg-ili-cinza-100 px-2 py-0.5 text-xs font-medium text-ili-cinza-500">
                  {p.territorio_estrategico}
                </span>
              ) : null}
              {p.colisao_marca_grande ? (
                <span
                  className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800"
                  title={
                    p.explicacao_colisao ||
                    p.marca_grande_referencia ||
                    "Possível colisão com marca forte"
                  }
                >
                  Colisão marca forte
                  {p.marca_grande_referencia
                    ? ` → ${p.marca_grande_referencia}`
                    : ""}
                </span>
              ) : null}
            </div>
            {p.colisao_marca_grande && p.explicacao_colisao ? (
              <p className="mt-1 text-xs text-red-700">{p.explicacao_colisao}</p>
            ) : null}
            {p.dominio_sugerido && (
              <p className="mt-0.5 text-xs text-ili-cinza-400">{p.dominio_sugerido}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleFavorito}
            className={`shrink-0 rounded-lg p-1.5 transition ${
              favorito
                ? "text-brand-600 hover:text-brand-400"
                : "text-ili-cinza-300 hover:text-brand-400"
            }`}
            title={favorito ? "Remover da shortlist" : "Adicionar à shortlist"}
            aria-label={favorito ? "Remover da shortlist" : "Adicionar à shortlist"}
          >
            <svg className="h-5 w-5" fill={favorito ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
        </div>

        {/* Fórmula da técnica */}
        {p.formula_tecnica && (
          <p className="mt-2 font-mono text-xs text-ili-cinza-500">{p.formula_tecnica}</p>
        )}

        {/* Base conceitual */}
        {p.base_conceitual && (
          <p className="mt-3 text-sm leading-relaxed text-ili-preto">{p.base_conceitual}</p>
        )}

        {/* Scores */}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <ScoreRegistrabilidade score={p.score_registrabilidade} />
          {p.score_final ? (
            <div className="text-xs font-medium text-ili-cinza-400" title="Score final estratégico">
              Final {p.score_final}/5
            </div>
          ) : null}
          {p.fonetica?.score_fonetico && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ili-cinza-400">Fon.</span>
              <ScoreFonetico score={p.fonetica.score_fonetico} />
            </div>
          )}
        </div>

        {/* Alerta de IP */}
        {p.alerta && (
          <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
            <span className="font-medium">IP:</span> {p.alerta}
          </p>
        )}

        {dominiosNome.length ? (
          <div className="mt-3 rounded-xl border border-ili-cinza-100 bg-ili-cinza-50/60 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ili-cinza-400">
              Domínios
            </p>
            <div className="flex flex-wrap gap-1.5">
              {dominiosNome.map((item) => (
                <span
                  key={item.dominio}
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${classeStatusDominio(item.status)}`}
                  title="Checagem preliminar via RDAP. Confirme no registrador."
                >
                  {item.dominio} · {rotuloStatusDominio(item.status)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Expandir / Recolher */}
        <button
          type="button"
          data-expand="true"
          onClick={() => setExpandido((o) => !o)}
          className="mt-3 text-xs font-medium text-brand-600 hover:text-brand-800"
        >
          {expandido ? "Recolher" : "Ver detalhes"}
        </button>

        {/* Detalhes expandidos */}
        {expandido && (
          <div className="mt-3 space-y-3 border-t border-ili-cinza-100 pt-3">
            {p.etimologia && (
              <div>
                <p className="text-xs font-medium text-ili-cinza-400">Etimologia</p>
                <p className="mt-0.5 text-sm text-ili-cinza-600">{p.etimologia}</p>
              </div>
            )}
            {p.justificativa && (
              <div>
                <p className="text-xs font-medium text-ili-cinza-400">Justificativa</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ili-cinza-600">{p.justificativa}</p>
              </div>
            )}
            {p.por_que_e_diferente_dos_concorrentes && (
              <div>
                <p className="text-xs font-medium text-ili-cinza-400">Diferenciação vs concorrentes</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ili-cinza-600">
                  {p.por_que_e_diferente_dos_concorrentes}
                </p>
              </div>
            )}
            {p.fonetica && <PainelFonetica fon={p.fonetica} />}
          </div>
        )}

        {/* Nota do analista */}
        <div className="mt-3 border-t border-ili-cinza-100 pt-3">
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onStatus(status === "shortlist" ? "neutro" : "shortlist")}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                status === "shortlist"
                  ? "border-brand-300 bg-ili-rosa-50 text-brand-800"
                  : "border-ili-cinza-200 text-ili-cinza-500 hover:border-brand-200 hover:text-brand-700"
              }`}
            >
              Shortlist
            </button>
            <button
              type="button"
              onClick={() => onStatus(status === "negativado" ? "neutro" : "negativado")}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                status === "negativado"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-ili-cinza-200 text-ili-cinza-500 hover:border-red-200 hover:text-red-700"
              }`}
            >
              Negativar
            </button>
          </div>
          {editandoNota ? (
            <div className="flex flex-col gap-2">
              <textarea
                className="w-full rounded-lg border border-ili-cinza-200 bg-ili-cinza-50 p-2 text-xs text-ili-preto outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-200"
                rows={3}
                placeholder="Nota interna do analista…"
                value={notaLocal}
                onChange={(e) => setNotaLocal(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={salvarNota}
                  className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
                >
                  Salvar nota
                </button>
                <button
                  type="button"
                  onClick={() => { setEditandoNota(false); setNotaLocal(nota); }}
                  className="rounded-lg border border-ili-cinza-200 px-3 py-1 text-xs text-ili-cinza-500 hover:bg-ili-cinza-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditandoNota(true)}
              className="flex items-center gap-1.5 text-xs text-ili-cinza-400 hover:text-ili-cinza-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              {nota ? <span className="italic">{nota}</span> : "Adicionar nota"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CartaoTop3({
  nome,
  justificativa,
  baseEstrategica,
  rank,
  colisao,
  marcaRef,
  explicacaoColisao,
}: {
  nome: string;
  justificativa: string;
  baseEstrategica: string;
  rank: number;
  colisao?: boolean;
  marcaRef?: string;
  explicacaoColisao?: string;
}) {
  const medalhas = ["🥇", "🥈", "🥉"];
  return (
    <div className="rounded-xl border-2 border-brand-200 bg-gradient-to-b from-ili-rosa-50/80 to-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
        {medalhas[rank] ?? ""} Top {rank + 1}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h3 className="text-xl font-semibold text-ili-preto">{nome}</h3>
        {colisao ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
            Colisão marca forte{marcaRef ? ` → ${marcaRef}` : ""}
          </span>
        ) : null}
      </div>
      {colisao && explicacaoColisao ? (
        <p className="mt-1 text-xs text-red-700">{explicacaoColisao}</p>
      ) : null}
      {baseEstrategica && (
        <div className="mt-3">
          <p className="text-xs font-medium text-ili-cinza-400">Base estratégica</p>
          <p className="mt-0.5 text-sm leading-relaxed text-ili-preto">{baseEstrategica}</p>
        </div>
      )}
      {justificativa && (
        <div className="mt-3 border-t border-ili-cinza-100 pt-3">
          <p className="text-xs font-medium text-ili-cinza-400">Justificativa</p>
          <p className="mt-0.5 text-sm leading-relaxed text-ili-cinza-500">{justificativa}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function ResultadoClient({
  idProjeto,
  nomeProjeto,
  statusProjeto,
  relatorioFinal,
  nomesGeral,
  nomesEscolhidos: initialFavoritos,
  notasNomes: initialNotas,
  avaliacoesNomes: initialAvaliacoes,
}: Props) {
  const [relatorioAberto, setRelatorioAberto] = useState(false);
  const [status, setStatus] = useState(statusProjeto);
  const [concluindo, setConcluindo] = useState(false);

  async function concluirProjeto() {
    setConcluindo(true);
    try {
      await fetch(`/api/projetos/${idProjeto}/concluir`, { method: "POST" });
      setStatus("concluido");
    } finally {
      setConcluindo(false);
    }
  }

  const initialSelecionados = [
    ...initialFavoritos,
    ...Object.entries(initialAvaliacoes)
      .filter(([, avaliacao]) => avaliacao.status === "shortlist")
      .map(([nome]) => nome),
  ];
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set(initialSelecionados));
  const [notas, setNotas] = useState<Record<string, string>>(initialNotas);
  const [avaliacoes, setAvaliacoes] = useState<Record<string, AvaliacaoNome>>(() => {
    const base = { ...initialAvaliacoes };
    for (const nome of initialSelecionados) {
      base[nome] = { ...(base[nome] ?? {}), status: "shortlist" };
    }
    return base;
  });
  const [salvandoFavoritos, setSalvandoFavoritos] = useState(false);
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [salvandoAvaliacao, setSalvandoAvaliacao] = useState(false);
  const [filtroTecnica, setFiltroTecnica] = useState<string | null>(null);
  const [dominios, setDominios] = useState<Record<string, ResultadoDominio>>({});
  const [checandoDominios, setChecandoDominios] = useState(false);

  // — Refinamento (nome sugerido pelo analista)
  const [nomeSugerido, setNomeSugerido] = useState("");
  const [instrucoes, setInstrucoes] = useState("");
  const [gerandoVariacoes, setGerandoVariacoes] = useState(false);
  const [variacoes, setVariacoes] = useState<PropostaNaming[]>([]);
  const [erroRefinamento, setErroRefinamento] = useState<string | null>(null);

  const { parsed, rawNaming } = extrairNamingParseado(nomesGeral);
  const propostas = Array.isArray(parsed?.propostas) ? parsed!.propostas : [];
  const top3 = Array.isArray(parsed?.top3) ? parsed!.top3 : [];
  const sintese = typeof parsed?.sintese_bases === "string" ? parsed.sintese_bases : null;
  const favoritosKey = Array.from(favoritos).sort().join("|");
  const avaliacoesKey = Object.entries(avaliacoes)
    .map(([nome, avaliacao]) => `${nome}:${avaliacao.status}`)
    .sort()
    .join("|");
  const propostasKey = propostas.map((p) => p.nome ?? "").join("|");
  const propostasVisiveis = useMemo(() => {
    const byNome = new Map<string, PropostaNaming>();
    for (const proposta of propostas) {
      const nome = proposta.nome?.trim();
      if (nome) byNome.set(nome.toLocaleLowerCase("pt-BR"), proposta);
    }
    const nomesSelecionados = new Set<string>();
    for (const nome of Array.from(favoritos)) {
      if (nome.trim()) nomesSelecionados.add(nome.trim());
    }
    for (const [nome, avaliacao] of Object.entries(avaliacoes)) {
      if (avaliacao.status === "shortlist" && nome.trim()) {
        nomesSelecionados.add(nome.trim());
      }
    }
    for (const nome of Array.from(nomesSelecionados)) {
      const key = nome.toLocaleLowerCase("pt-BR");
      if (!byNome.has(key)) {
        byNome.set(key, {
          nome,
          categoria: "selecionado",
          base_conceitual: "Nome selecionado anteriormente pelo analista.",
        });
      }
    }
    // Garante que negativados também aparecem mesmo que não estejam nas propostas mescladas
    for (const [nome, avaliacao] of Object.entries(avaliacoes)) {
      if (avaliacao.status === "negativado" && nome.trim()) {
        const key = nome.toLocaleLowerCase("pt-BR");
        if (!byNome.has(key)) {
          byNome.set(key, {
            nome,
            categoria: "negativado",
            base_conceitual: "Nome negativado da rodada anterior.",
          });
        }
      }
    }
    return Array.from(byNome.values());
  }, [propostasKey, favoritosKey, avaliacoesKey]);

  const shortlistArr = propostasVisiveis.filter((p) => p.nome && avaliacoes[p.nome]?.status === "shortlist");
  const negativadosArr = propostasVisiveis.filter((p) => p.nome && avaliacoes[p.nome]?.status === "negativado");
  const novosArr = propostasVisiveis.filter((p) => {
    const status = p.nome ? avaliacoes[p.nome]?.status : undefined;
    return status !== "shortlist" && status !== "negativado";
  });
  const dominiosResultado = useMemo(
    () => propostasVisiveis.flatMap((p) => dominiosParaNome(p.nome ?? "")),
    [propostasKey, favoritosKey, avaliacoesKey],
  );
  const promptInpi = gerarPromptInpi({
    nomeProjeto,
    shortlist: shortlistArr,
    negativados: negativadosArr,
    notas,
    sintese,
  });
  const promptApresentacao = gerarPromptApresentacao({
    nomeProjeto,
    shortlist: shortlistArr,
    notas,
    sintese,
    relatorioFinal,
  });

  useEffect(() => {
    if (!dominiosResultado.length) return;
    let ativo = true;
    async function checar() {
      setChecandoDominios(true);
      try {
        const res = await fetch("/api/dominios/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dominios: dominiosResultado }),
        });
        const data = (await res.json()) as {
          sucesso?: boolean;
          resultados?: ResultadoDominio[];
        };
        if (!ativo || !data.sucesso) return;
        const mapa: Record<string, ResultadoDominio> = {};
        for (const item of data.resultados ?? []) {
          mapa[item.dominio] = item;
        }
        setDominios((prev) => ({ ...prev, ...mapa }));
      } finally {
        if (ativo) setChecandoDominios(false);
      }
    }
    void checar();
    return () => {
      ativo = false;
    };
  }, [dominiosResultado]);

  const toggleFavorito = useCallback(
    async (nome: string) => {
      const novoSet = new Set(favoritos);
      const novasAvaliacoes = { ...avaliacoes };
      if (novoSet.has(nome)) novoSet.delete(nome);
      else novoSet.add(nome);
      if (novoSet.has(nome)) {
        novasAvaliacoes[nome] = { ...(novasAvaliacoes[nome] ?? {}), status: "shortlist" };
      } else if (novasAvaliacoes[nome]?.status === "shortlist") {
        novasAvaliacoes[nome] = { ...(novasAvaliacoes[nome] ?? {}), status: "neutro" };
      }
      setFavoritos(novoSet);
      setAvaliacoes(novasAvaliacoes);
      setSalvandoFavoritos(true);
      try {
        await fetch(`/api/projetos/${idProjeto}/avaliacoes`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            avaliacoes: novasAvaliacoes,
            nomesEscolhidos: Array.from(novoSet),
          }),
        });
      } finally {
        setSalvandoFavoritos(false);
      }
    },
    [avaliacoes, favoritos, idProjeto],
  );

  const salvarStatusNome = useCallback(
    async (nome: string, status: StatusAvaliacaoNome) => {
      if (!nome) return;
      const novasAvaliacoes = { ...avaliacoes, [nome]: { ...(avaliacoes[nome] ?? {}), status } };
      const novoSet = new Set(favoritos);
      if (status === "shortlist") {
        novoSet.add(nome);
      } else {
        novoSet.delete(nome);
      }
      setAvaliacoes(novasAvaliacoes);
      setFavoritos(novoSet);
      setSalvandoAvaliacao(true);
      try {
        await fetch(`/api/projetos/${idProjeto}/avaliacoes`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            avaliacoes: novasAvaliacoes,
            nomesEscolhidos: Array.from(novoSet),
          }),
        });
      } finally {
        setSalvandoAvaliacao(false);
      }
    },
    [avaliacoes, favoritos, idProjeto],
  );

  const salvarNota = useCallback(
    async (nome: string, nota: string) => {
      const novasNotas = { ...notas, [nome]: nota };
      if (!nota) delete novasNotas[nome];
      const novasAvaliacoes = {
        ...avaliacoes,
        [nome]: { ...(avaliacoes[nome] ?? { status: "neutro" as const }), nota },
      };
      if (!nota && novasAvaliacoes[nome]) {
        delete novasAvaliacoes[nome].nota;
      }
      setNotas(novasNotas);
      setAvaliacoes(novasAvaliacoes);
      setSalvandoNota(true);
      try {
        await Promise.all([
          fetch(`/api/projetos/${idProjeto}/notas`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notas: novasNotas }),
          }),
          fetch(`/api/projetos/${idProjeto}/avaliacoes`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              avaliacoes: novasAvaliacoes,
              nomesEscolhidos: Array.from(favoritos),
            }),
          }),
        ]);
      } finally {
        setSalvandoNota(false);
      }
    },
    [avaliacoes, favoritos, notas, idProjeto],
  );

  const favoritosArr = shortlistArr;

  async function gerarVariacoes() {
    if (!nomeSugerido.trim()) return;
    setErroRefinamento(null);
    setGerandoVariacoes(true);
    setVariacoes([]);
    try {
      const res = await fetch("/api/naming/refinar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projeto_id: idProjeto,
          nome_sugerido: nomeSugerido.trim(),
          instrucoes: instrucoes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        sucesso?: boolean;
        refinamento_json?: { variações?: unknown[] } | null;
        erro?: string;
      };
      if (!data.sucesso) {
        setErroRefinamento(data.erro ?? "Erro ao gerar variações.");
        return;
      }
      const vars = (data.refinamento_json?.variações ?? []) as Record<string, unknown>[];
      setVariacoes(
        vars.map((v) => ({
          nome: String(v.nome ?? ""),
          categoria: String(v.tipo_variacao ?? "variação"),
          justificativa: String(v.justificativa ?? ""),
          base_conceitual: String(v.base_conceitual ?? ""),
          dominio_sugerido: String(v.dominio_sugerido ?? ".com.br"),
          score_registrabilidade: Number(v.score_registrabilidade ?? 3),
        })),
      );
    } catch (e) {
      setErroRefinamento(String(e));
    } finally {
      setGerandoVariacoes(false);
    }
  }

  return (
    <div className="min-w-0 max-w-6xl">
      <FluxoNamingStepper idProjeto={idProjeto} etapaAtual={4} />

      <div className="mb-6 rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/50 px-4 py-3 text-sm text-ili-cinza-600">
        O pipeline inclui uma verificação automática de{" "}
        <strong className="font-medium text-ili-preto">colisão com marcas globais muito fortes</strong>
        . Propostas marcadas a vermelho merecem revisão humana e pesquisa (INPI,
        Google, jurídico) — não substitui parecer profissional.
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-ili-preto">Resultados do naming</h1>
            {status === "concluido" ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Concluído
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                Em aberto
              </span>
            )}
          </div>
          <p className="text-sm text-ili-cinza-400">{nomeProjeto}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(salvandoFavoritos || salvandoNota || salvandoAvaliacao) && (
            <span className="text-xs text-ili-cinza-400">A guardar…</span>
          )}
          {status === "gerado" && (
            <button
              type="button"
              onClick={() => void concluirProjeto()}
              disabled={concluindo}
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-500 hover:bg-emerald-100 disabled:opacity-50"
            >
              {concluindo ? "A concluir…" : "Concluir projeto"}
            </button>
          )}
          <Link
            href={`/projetos/${idProjeto}/revisao#diretrizes-naming`}
            className="rounded-xl border border-brand-200 bg-ili-rosa-50/80 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:border-brand-400"
          >
            Refazer rodada com este briefing
          </Link>
          <Link
            href={`/projetos/${idProjeto}/revisao`}
            className="text-sm font-medium text-ili-cinza-500 underline-offset-2 hover:text-brand-600 hover:underline"
          >
            Revisão completa
          </Link>
        </div>
      </div>

      {/* Síntese */}
      {sintese && (
        <div className="mb-8 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
          <h2 className="mb-2 text-sm font-semibold text-brand-900">Síntese das bases</h2>
          <p className="text-sm leading-relaxed text-ili-cinza-700">{sintese}</p>
        </div>
      )}

      {/* Top 3 */}
      {top3.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-medium text-ili-preto">Top 3 e bases estratégicas</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {top3.slice(0, 3).map((t: Top3Item, i: number) => (
              <CartaoTop3
                key={`${t.nome ?? i}-${i}`}
                rank={i}
                nome={String(t.nome ?? "—")}
                justificativa={String(t.justificativa ?? "")}
                baseEstrategica={String(t.base_estrategica ?? "")}
                colisao={t.colisao_marca_grande}
                marcaRef={t.marca_grande_referencia}
                explicacaoColisao={t.explicacao_colisao}
              />
            ))}
          </div>
        </section>
      )}

      {/* Shortlist e validacao */}
      {propostasVisiveis.length > 0 && (
        <section className="mb-10 rounded-2xl border border-ili-cinza-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-medium text-ili-preto">Shortlist para validação</h2>
              <p className="mt-1 text-sm text-ili-cinza-500">
                Marque os nomes que vão para pré-checagem de INPI, domínios e apresentação. Os negativados ficam como aprendizado para a próxima rodada.
              </p>
            </div>
            <div className="flex gap-2 text-xs font-medium">
              <span className="rounded-full bg-ili-rosa-50 px-2.5 py-1 text-brand-800">
                {shortlistArr.length} na shortlist
              </span>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">
                {negativadosArr.length} negativados
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-ili-cinza-100 bg-ili-cinza-50/60 p-4">
              <h3 className="text-sm font-semibold text-ili-preto">Nomes selecionados</h3>
              {shortlistArr.length ? (
                <ul className="mt-3 space-y-2 text-sm text-ili-cinza-600">
                  {shortlistArr.map((p) => (
                    <li
                      key={`short-${p.nome}`}
                      className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2"
                    >
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            const id = `card-${(p.nome ?? "").toLowerCase().replace(/\s+/g, "-")}`;
                            document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                          className="font-medium text-ili-preto hover:text-brand-700 hover:underline underline-offset-2"
                        >
                          {p.nome}
                        </button>
                        {notas[p.nome ?? ""] ? (
                          <span className="ml-2 text-xs text-ili-cinza-400">{notas[p.nome ?? ""]}</span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => void salvarStatusNome(p.nome ?? "", "neutro")}
                        className="shrink-0 rounded-lg border border-ili-cinza-200 px-2 py-1 text-xs font-medium text-ili-cinza-500 hover:border-brand-200 hover:text-brand-700"
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ili-cinza-400">Nenhum nome selecionado ainda.</p>
              )}
            </div>

            <div className="rounded-xl border border-red-100 bg-red-50/40 p-4">
              <h3 className="text-sm font-semibold text-red-800">Nomes negativados</h3>
              {negativadosArr.length ? (
                <ul className="mt-3 space-y-2 text-sm text-red-700">
                  {negativadosArr.map((p) => (
                    <li key={`neg-${p.nome}`} className="rounded-lg bg-white/80 px-3 py-2">
                      <span className="font-medium">{p.nome}</span>
                      {notas[p.nome ?? ""] ? (
                        <span className="ml-2 text-xs text-red-500">{notas[p.nome ?? ""]}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-red-400">Nenhum nome negativado ainda.</p>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ili-preto">Prompt INPI para Claude</h3>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(promptInpi)}
                  disabled={!shortlistArr.length}
                  className="rounded-lg border border-ili-cinza-200 px-3 py-1 text-xs font-medium text-ili-cinza-500 hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
                >
                  Copiar
                </button>
              </div>
              <textarea
                readOnly
                value={promptInpi}
                className="h-56 w-full resize-y rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/50 p-3 text-xs leading-relaxed text-ili-cinza-600 outline-none"
              />
            </div>

            <div className="rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/50 p-4">
              <h3 className="text-sm font-semibold text-ili-preto">Domínios no resultado</h3>
              <p className="mt-2 text-sm leading-relaxed text-ili-cinza-500">
                Cada nome abaixo mostra automaticamente .com, .com.br, .net, .org, .co, .io, .ai, .app, .dev e .digital com status de pré-checagem.
              </p>
              {checandoDominios ? (
                <p className="mt-3 text-xs text-ili-cinza-400">Checando domínios via RDAP...</p>
              ) : (
                <p className="mt-3 text-xs text-ili-cinza-400">Confirme disponibilidade no registrador antes da decisão final.</p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ili-preto">Prompt base da apresentação</h3>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(promptApresentacao)}
                disabled={!shortlistArr.length}
                className="rounded-lg border border-ili-cinza-200 px-3 py-1 text-xs font-medium text-ili-cinza-500 hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
              >
                Copiar
              </button>
            </div>
            <textarea
              readOnly
              value={promptApresentacao}
              className="h-52 w-full resize-y rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/50 p-3 text-xs leading-relaxed text-ili-cinza-600 outline-none"
            />
          </div>
        </section>
      )}

      {/* Shortlist do analista */}
      {favoritosArr.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-medium text-ili-preto">
            <svg className="h-5 w-5 text-brand-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            Shortlist do analista ({favoritosArr.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoritosArr.map((p, i) => (
              <CartaoProposta
                key={`fav-${p.nome ?? i}`}
                p={p}
                idx={propostasVisiveis.indexOf(p)}
                favorito
                status={avaliacoes[p.nome ?? ""]?.status ?? "shortlist"}
                nota={notas[p.nome ?? ""] ?? ""}
                dominiosNome={dominiosParaNome(p.nome ?? "").map((dom) => ({
                  dominio: dom,
                  status: dominios[dom]?.status ?? "indeterminado",
                  fonte: dominios[dom]?.fonte ?? "rdap",
                }))}
                onToggleFavorito={() => void toggleFavorito(p.nome ?? "")}
                onStatus={(status) => void salvarStatusNome(p.nome ?? "", status)}
                onNota={(n) => void salvarNota(p.nome ?? "", n)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Novas propostas */}
      {novosArr.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-2 text-lg font-medium text-ili-preto">
            Novas propostas para avaliar ({novosArr.length})
          </h2>
          <p className="mb-4 text-sm text-ili-cinza-500">
            A lista cresce a cada nova rodada. A IA aprende com shortlist, negativados e notas anteriores,
            sem apagar as propostas já geradas. Clique na estrela para marcar shortlist e em{" "}
            <strong className="font-medium text-ili-preto">Ver detalhes</strong> para expandir.
          </p>

          {/* Filtro por técnica */}
          {(() => {
            const contagens: Record<string, number> = {};
            for (const p of novosArr) {
              const key = (p.tecnica_naming ?? p.categoria ?? "").toLowerCase();
              if (key && TECNICA_CONFIG[key]) {
                contagens[key] = (contagens[key] ?? 0) + 1;
              }
            }
            const tecnicasPresentes = Object.keys(contagens);
            if (tecnicasPresentes.length < 2) return null;
            return (
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFiltroTecnica(null)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    filtroTecnica === null
                      ? "border-brand-300 bg-ili-rosa-50 text-brand-800"
                      : "border-ili-cinza-200 text-ili-cinza-500 hover:border-ili-cinza-300"
                  }`}
                >
                  Todos ({novosArr.length})
                </button>
                {tecnicasPresentes.map((key) => {
                  const cfg = TECNICA_CONFIG[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFiltroTecnica(filtroTecnica === key ? null : key)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        filtroTecnica === key
                          ? `${cfg.cor} border-current`
                          : "border-ili-cinza-200 text-ili-cinza-500 hover:border-ili-cinza-300"
                      }`}
                    >
                      {cfg.label} ({contagens[key]})
                    </button>
                  );
                })}
              </div>
            );
          })()}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {novosArr
              .filter((p) => {
                if (!filtroTecnica) return true;
                const key = (p.tecnica_naming ?? p.categoria ?? "").toLowerCase();
                return key === filtroTecnica;
              })
              .map((p, i) => (
                <CartaoProposta
                  key={`${p.nome ?? i}-${i}`}
                  p={p}
                  idx={i}
                  favorito={Boolean(p.nome && favoritos.has(p.nome))}
                  status={avaliacoes[p.nome ?? ""]?.status ?? "neutro"}
                  nota={notas[p.nome ?? ""] ?? ""}
                  dominiosNome={dominiosParaNome(p.nome ?? "").map((dom) => ({
                    dominio: dom,
                    status: dominios[dom]?.status ?? "indeterminado",
                    fonte: dominios[dom]?.fonte ?? "rdap",
                  }))}
                  onToggleFavorito={() => void toggleFavorito(p.nome ?? "")}
                  onStatus={(status) => void salvarStatusNome(p.nome ?? "", status)}
                  onNota={(n) => void salvarNota(p.nome ?? "", n)}
                />
              ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Nome sugerido pelo analista — gera variações via IA               */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-10 rounded-2xl border border-ili-cinza-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-medium text-ili-preto">
          Tem um nome em mente?
        </h2>
        <p className="mb-4 text-sm text-ili-cinza-500">
          Digite um nome ou conceito e a IA gera variações alinhadas ao briefing do projeto.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ili-cinza-500">
              Nome ou conceito
            </label>
            <input
              type="text"
              value={nomeSugerido}
              onChange={(e) => setNomeSugerido(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void gerarVariacoes(); }}
              placeholder="ex: Lumina, Velo, conceito de leveza…"
              className="w-full rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/40 px-3 py-2.5 text-sm text-ili-preto outline-none placeholder:text-ili-cinza-300 focus:border-brand-300 focus:ring-1 focus:ring-brand-200"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ili-cinza-500">
              Direção criativa (opcional)
            </label>
            <input
              type="text"
              value={instrucoes}
              onChange={(e) => setInstrucoes(e.target.value)}
              placeholder="ex: explorar raízes latinas, manter o sufixo -ia…"
              className="w-full rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/40 px-3 py-2.5 text-sm text-ili-preto outline-none placeholder:text-ili-cinza-300 focus:border-brand-300 focus:ring-1 focus:ring-brand-200"
            />
          </div>
          <button
            type="button"
            onClick={() => void gerarVariacoes()}
            disabled={gerandoVariacoes || !nomeSugerido.trim()}
            className="shrink-0 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          >
            {gerandoVariacoes ? "Gerando…" : "Gerar variações"}
          </button>
        </div>

        {erroRefinamento && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {erroRefinamento}
          </p>
        )}

        {gerandoVariacoes && (
          <div className="mt-6 flex items-center gap-3 text-sm text-ili-cinza-500">
            <span className="inline-flex gap-1">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="h-2 w-2 animate-bounce rounded-full bg-brand-400"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </span>
            {`A IA está criando variações de «${nomeSugerido}»…`}
          </div>
        )}

        {variacoes.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-ili-preto">
              {`${variacoes.length} variações geradas para «${nomeSugerido}»`}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {variacoes.map((p, i) => (
                <CartaoProposta
                  key={`var-${p.nome ?? i}-${i}`}
                  p={p}
                  idx={i}
                  favorito={Boolean(p.nome && favoritos.has(p.nome))}
                  status={avaliacoes[p.nome ?? ""]?.status ?? "neutro"}
                  nota={notas[p.nome ?? ""] ?? ""}
                  dominiosNome={dominiosParaNome(p.nome ?? "").map((dom) => ({
                    dominio: dom,
                    status: dominios[dom]?.status ?? "indeterminado",
                    fonte: dominios[dom]?.fonte ?? "rdap",
                  }))}
                  onToggleFavorito={() => void toggleFavorito(p.nome ?? "")}
                  onStatus={(status) => void salvarStatusNome(p.nome ?? "", status)}
                  onNota={(n) => void salvarNota(p.nome ?? "", n)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Fallback: output bruto */}
      {(!parsed || (propostas.length === 0 && top3.length === 0)) && (
        <div className="mb-10">
          <h2 className="mb-2 text-lg font-medium text-ili-cinza-500">Saída naming (bruto)</h2>
          <p className="mb-2 text-sm text-ili-cinza-500">
            Não foi possível mapear o JSON de sugestões. Copie a saída abaixo ou gere novamente com o servidor actualizado.
          </p>
          <div className="rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/50 p-4">
            <pre className="max-h-[50vh] overflow-auto text-xs text-ili-cinza-600 sm:text-sm">
              {rawNaming}
            </pre>
          </div>
        </div>
      )}

      {/* Relatório executivo */}
      <div className="flex flex-col items-center border-t border-ili-cinza-200 pt-8">
        <button
          type="button"
          onClick={() => setRelatorioAberto((o) => !o)}
          className="text-sm font-medium text-brand-600 hover:text-brand-800"
        >
          {relatorioAberto ? "Ocultar relatório" : "Ver relatório executivo completo"}
        </button>
        {relatorioAberto && (
          <article className="mt-4 w-full max-w-3xl rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/80 p-6 text-left">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ili-preto">
              {relatorioFinal || "— Sem relatório gravado."}
            </pre>
          </article>
        )}
        <button
          type="button"
          onClick={() => {
            if (!relatorioFinal) return;
            const b = new Blob([relatorioFinal], { type: "text/markdown" });
            const u = URL.createObjectURL(b);
            const a = document.createElement("a");
            a.href = u;
            a.download = `relatorio-${idProjeto}.md`;
            a.click();
            URL.revokeObjectURL(u);
          }}
          className="mt-6 rounded-lg border border-ili-cinza-200 bg-white px-5 py-2.5 text-sm font-medium text-ili-cinza-500 hover:border-brand-200 hover:bg-ili-rosa-50"
        >
          Baixar relatório (.md)
        </button>
      </div>
    </div>
  );
}
