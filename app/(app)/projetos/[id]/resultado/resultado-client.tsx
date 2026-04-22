"use client";

import { FluxoNamingStepper } from "@/components/projetos/fluxo-naming-stepper";
import {
  extrairNamingParseado,
  type FoneticaNome,
  type PropostaNaming,
  type Top3Item,
} from "@/lib/resultado/naming-display";
import Link from "next/link";
import { useCallback, useState } from "react";

type Props = {
  idProjeto: string;
  nomeProjeto: string;
  relatorioFinal: string;
  nomesGeral: Record<string, unknown> | null;
  nomesEscolhidos: string[];
  notasNomes: Record<string, string>;
};

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

function BadgeCategoria({ categoria }: { categoria?: string }) {
  if (!categoria) return null;
  const cores: Record<string, string> = {
    neologismo: "bg-violet-100 text-violet-700",
    híbrido: "bg-blue-100 text-blue-700",
    evocativo: "bg-amber-100 text-amber-700",
    composto: "bg-emerald-100 text-emerald-700",
    descritivo: "bg-slate-100 text-slate-600",
  };
  const cor = cores[categoria.toLowerCase()] ?? "bg-ili-cinza-100 text-ili-cinza-500";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cor}`}>
      {categoria}
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
  nota,
  onToggleFavorito,
  onNota,
}: {
  p: PropostaNaming;
  idx: number;
  favorito: boolean;
  nota: string;
  onToggleFavorito: () => void;
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
      className={`rounded-2xl border bg-white shadow-sm transition-all duration-200 ${
        favorito
          ? "border-brand-300 ring-1 ring-brand-200"
          : "border-ili-cinza-200 hover:border-ili-cinza-300"
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-ili-cinza-300">{idx + 1}</span>
              <h3 className="text-lg font-semibold text-ili-preto">{p.nome ?? "—"}</h3>
              <BadgeCategoria categoria={p.categoria} />
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
            title={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <svg className="h-5 w-5" fill={favorito ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
        </div>

        {/* Base conceitual */}
        {p.base_conceitual && (
          <p className="mt-3 text-sm leading-relaxed text-ili-preto">{p.base_conceitual}</p>
        )}

        {/* Scores */}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <ScoreRegistrabilidade score={p.score_registrabilidade} />
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

        {/* Expandir / Recolher */}
        <button
          type="button"
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
            {p.fonetica && <PainelFonetica fon={p.fonetica} />}
          </div>
        )}

        {/* Nota do analista */}
        <div className="mt-3 border-t border-ili-cinza-100 pt-3">
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
  relatorioFinal,
  nomesGeral,
  nomesEscolhidos: initialFavoritos,
  notasNomes: initialNotas,
}: Props) {
  const [relatorioAberto, setRelatorioAberto] = useState(false);
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set(initialFavoritos));
  const [notas, setNotas] = useState<Record<string, string>>(initialNotas);
  const [salvandoFavoritos, setSalvandoFavoritos] = useState(false);
  const [salvandoNota, setSalvandoNota] = useState(false);

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

  const toggleFavorito = useCallback(
    async (nome: string) => {
      const novoSet = new Set(favoritos);
      if (novoSet.has(nome)) novoSet.delete(nome);
      else novoSet.add(nome);
      setFavoritos(novoSet);
      setSalvandoFavoritos(true);
      try {
        await fetch(`/api/projetos/${idProjeto}/favoritos`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nomes: Array.from(novoSet) }),
        });
      } finally {
        setSalvandoFavoritos(false);
      }
    },
    [favoritos, idProjeto],
  );

  const salvarNota = useCallback(
    async (nome: string, nota: string) => {
      const novasNotas = { ...notas, [nome]: nota };
      if (!nota) delete novasNotas[nome];
      setNotas(novasNotas);
      setSalvandoNota(true);
      try {
        await fetch(`/api/projetos/${idProjeto}/notas`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notas: novasNotas }),
        });
      } finally {
        setSalvandoNota(false);
      }
    },
    [notas, idProjeto],
  );

  const favoritosArr = propostas.filter((p) => p.nome && favoritos.has(p.nome));

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
          <h1 className="text-2xl font-semibold text-ili-preto">Resultados do naming</h1>
          <p className="text-sm text-ili-cinza-400">{nomeProjeto}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(salvandoFavoritos || salvandoNota) && (
            <span className="text-xs text-ili-cinza-400">A guardar…</span>
          )}
          <Link
            href={`/projetos/${idProjeto}/revisao#diretrizes-naming`}
            className="rounded-xl border border-brand-200 bg-ili-rosa-50/80 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:border-brand-400"
          >
            Gerar novas propostas
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

      {/* Favoritos do analista */}
      {favoritosArr.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-medium text-ili-preto">
            <svg className="h-5 w-5 text-brand-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            Selecionados pelo analista ({favoritosArr.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoritosArr.map((p, i) => (
              <CartaoProposta
                key={`fav-${p.nome ?? i}`}
                p={p}
                idx={propostas.indexOf(p)}
                favorito
                nota={notas[p.nome ?? ""] ?? ""}
                onToggleFavorito={() => void toggleFavorito(p.nome ?? "")}
                onNota={(n) => void salvarNota(p.nome ?? "", n)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Todas as propostas */}
      {propostas.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-2 text-lg font-medium text-ili-preto">Todas as propostas</h2>
          <p className="mb-4 text-sm text-ili-cinza-500">
            Cada sugestão inclui base conceitual, análise fonética e score de registrabilidade.
            Clique na estrela para marcar favoritos e em{" "}
            <strong className="font-medium text-ili-preto">Ver detalhes</strong> para expandir.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {propostas.map((p, i) => (
              <CartaoProposta
                key={`${p.nome ?? i}-${i}`}
                p={p}
                idx={i}
                favorito={Boolean(p.nome && favoritos.has(p.nome))}
                nota={notas[p.nome ?? ""] ?? ""}
                onToggleFavorito={() => void toggleFavorito(p.nome ?? "")}
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
                  nota={notas[p.nome ?? ""] ?? ""}
                  onToggleFavorito={() => void toggleFavorito(p.nome ?? "")}
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
