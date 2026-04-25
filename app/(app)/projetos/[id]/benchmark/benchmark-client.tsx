"use client";

import { FluxoNamingStepper } from "@/components/projetos/fluxo-naming-stepper";
import { useBriefingProjeto } from "@/components/projetos/briefing-projeto-context";
import type {
  BenchmarkConcorrente,
  BenchmarkState,
  TipoConcorrenteBenchmark,
} from "@/lib/briefing/benchmark-types";
import type { BriefingState } from "@/lib/briefing/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";

type Props = {
  idProjeto: string;
  initialBriefing: BriefingState;
  initialTexto: string;
  initialBenchmark: BenchmarkState | null;
};

function novoConcorrente(): BenchmarkConcorrente {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    nome: "",
    tipo: "direto",
    resumo: "",
  };
}

function normTipo(v: unknown): TipoConcorrenteBenchmark {
  return String(v).trim() === "indireto" ? "indireto" : "direto";
}

export function BenchmarkClient({
  idProjeto,
  initialBriefing,
  initialTexto,
  initialBenchmark,
}: Props) {
  const router = useRouter();
  const { setBriefing, setTextoOriginal } = useBriefingProjeto();
  const [benchmark, setBenchmark] = useState<BenchmarkState>(() => {
    if (initialBenchmark?.concorrentes?.length) {
      return initialBenchmark;
    }
    return { concorrentes: [novoConcorrente()] };
  });
  const [iaLinha, setIaLinha] = useState<string | null>(null);
  const [iaGlobal, setIaGlobal] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [autoCarregado, setAutoCarregado] = useState(false);

  useLayoutEffect(() => {
    setBriefing(initialBriefing);
    setTextoOriginal(initialTexto);
  }, [initialBriefing, initialTexto, setBriefing, setTextoOriginal]);

  // Auto-carregar sugestões se não há benchmark existente
  useEffect(() => {
    if (!autoCarregado && !initialBenchmark?.concorrentes?.length) {
      setAutoCarregado(true);
      void sugestoesIaConcorrentes();
    } else {
      setAutoCarregado(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preenchidos = benchmark.concorrentes.filter((c) => c.nome.trim());
  const podeMais = benchmark.concorrentes.length < 10;

  function patchConcorrente(id: string, patch: Partial<BenchmarkConcorrente>) {
    setBenchmark((prev) => ({
      concorrentes: prev.concorrentes.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    }));
  }

  function removerLinha(id: string) {
    setBenchmark((prev) => {
      const next = prev.concorrentes.filter((c) => c.id !== id);
      return { concorrentes: next.length ? next : [novoConcorrente()] };
    });
  }

  function adicionarLinha() {
    if (!podeMais) return;
    setBenchmark((prev) => ({
      concorrentes: [...prev.concorrentes, novoConcorrente()],
    }));
  }

  async function sugestoesIaConcorrentes() {
    setErro(null);
    setIaGlobal(true);
    try {
      const res = await fetch("/api/benchmark/sugerir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projeto_id: idProjeto }),
      });
      const data = (await res.json()) as {
        sucesso?: boolean;
        concorrentes?: { nome?: string; tipo?: string; resumo?: string }[];
        erro?: string;
      };
      if (!res.ok || !data.sucesso) {
        setErro(data.erro || "Não foi possível obter sugestões da IA.");
        return;
      }
      const sugestoes: BenchmarkConcorrente[] = (data.concorrentes ?? []).map(
        (c) => ({
          id: novoConcorrente().id,
          nome: String(c.nome ?? "").trim(),
          tipo: normTipo(c.tipo),
          resumo: String(c.resumo ?? "").trim(),
        }),
      );
      if (!sugestoes.length) {
        setErro("A IA não devolveu sugestões. Adicione concorrentes manualmente.");
        return;
      }
      setBenchmark((prev) => {
        const existentes = prev.concorrentes.filter((c) => c.nome.trim());
        const novas = sugestoes.filter(
          (s) =>
            !existentes.some(
              (e) => e.nome.toLowerCase() === s.nome.toLowerCase(),
            ),
        );
        const merged = [...existentes, ...novas].slice(0, 10);
        return { concorrentes: merged.length ? merged : sugestoes.slice(0, 10) };
      });
    } catch (e) {
      setErro(`Erro ao contactar IA: ${String(e)}`);
    } finally {
      setIaGlobal(false);
    }
  }

  async function gerarAnaliseIa(id: string) {
    const c = benchmark.concorrentes.find((x) => x.id === id);
    if (!c?.nome.trim()) {
      setErro("Preencha o nome do concorrente antes de pedir a análise.");
      return;
    }
    setErro(null);
    setIaLinha(id);
    try {
      const res = await fetch("/api/benchmark/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projeto_id: idProjeto,
          nome: c.nome.trim(),
          tipo: c.tipo,
        }),
      });
      const data = (await res.json()) as { sucesso?: boolean; resumo?: string; erro?: string };
      if (!res.ok || !data.sucesso) {
        setErro(data.erro || "Não foi possível gerar a análise.");
        return;
      }
      if (data.resumo) {
        patchConcorrente(id, { resumo: data.resumo });
      }
    } catch (e) {
      setErro(`Erro ao gerar análise: ${String(e)}`);
    } finally {
      setIaLinha(null);
    }
  }

  async function aprovar() {
    setErro(null);
    if (preenchidos.length === 0) {
      setErro("Inclua pelo menos um concorrente.");
      return;
    }
    if (preenchidos.length > 10) {
      setErro("Máximo de 10 concorrentes.");
      return;
    }
    setGravando(true);
    try {
      const res = await fetch("/api/fluxo/aprovar-benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projeto_id: idProjeto,
          briefing: initialBriefing,
          benchmark: {
            concorrentes: preenchidos.map((c) => ({
              ...c,
              nome: c.nome.trim(),
              resumo: c.resumo.trim(),
            })),
          },
        }),
      });
      const data = (await res.json()) as { sucesso?: boolean; erro?: string };
      if (!res.ok || !data.sucesso) {
        setErro(data.erro || "Não foi possível aprovar o benchmark.");
        return;
      }
      router.push(`/projetos/${idProjeto}/revisao`);
      router.refresh();
    } catch (e) {
      setErro(String(e));
    } finally {
      setGravando(false);
    }
  }

  return (
    <div className="min-w-0 max-w-4xl pb-8">
      <FluxoNamingStepper idProjeto={idProjeto} etapaAtual={2} />
      {erro && (
        <p
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {erro}
        </p>
      )}
      <h1 className="mb-2 text-2xl font-semibold text-ili-preto">Benchmark</h1>
      <p className="mb-6 text-sm text-ili-cinza-500">
        A IA sugeriu concorrentes com base no briefing. Revise, edite ou adicione
        mais — classifique como direto ou indireto. Esses nomes serão usados para entender
        o que o mercado aceita, quais padrões evitar e como diferenciar a nova marca.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void sugestoesIaConcorrentes()}
          disabled={iaGlobal || benchmark.concorrentes.length >= 10}
          className="rounded-xl border border-ili-cinza-200 bg-white px-4 py-2.5 text-sm font-medium text-ili-cinza-600 shadow-sm hover:border-brand-300 hover:text-brand-800 disabled:cursor-wait disabled:opacity-60"
        >
          {iaGlobal ? "A pesquisar…" : "Actualizar sugestões (IA)"}
        </button>
        <button
          type="button"
          onClick={adicionarLinha}
          disabled={!podeMais}
          className="rounded-xl border border-dashed border-ili-cinza-300 px-4 py-2.5 text-sm text-ili-cinza-500 hover:border-brand-400 hover:text-brand-800 disabled:opacity-40"
        >
          + Adicionar linha ({benchmark.concorrentes.length}/10)
        </button>
      </div>

      {iaGlobal && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-ili-cinza-200 bg-ili-cinza-50/60 px-4 py-3 text-sm text-ili-cinza-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          A analisar o briefing e pesquisar concorrentes…
        </div>
      )}

      <ul className="space-y-4">
        {benchmark.concorrentes.map((c, idx) => (
          <li
            key={c.id}
            className="rounded-2xl border border-ili-cinza-200 bg-white/90 p-4 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ili-cinza-400">
                Concorrente {idx + 1}
              </span>
              {benchmark.concorrentes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removerLinha(c.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remover
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-ili-cinza-500">
                  Nome ou referência
                </label>
                <input
                  type="text"
                  value={c.nome}
                  onChange={(e) =>
                    patchConcorrente(c.id, { nome: e.target.value })
                  }
                  className="w-full rounded-xl border border-ili-cinza-200 px-3 py-2 text-sm text-ili-preto focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200/80"
                  placeholder="ex.: marca ou site"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ili-cinza-500">
                  Relação com o projeto
                </label>
                <select
                  value={c.tipo}
                  onChange={(e) =>
                    patchConcorrente(c.id, {
                      tipo: e.target.value as TipoConcorrenteBenchmark,
                    })
                  }
                  className="w-full rounded-xl border border-ili-cinza-200 bg-white px-3 py-2 text-sm text-ili-preto focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200/80"
                >
                  <option value="direto">Concorrente direto</option>
                  <option value="indireto">Concorrente indireto</option>
                </select>
                <p className="mt-1 text-xs text-ili-cinza-400">
                  Direto compete pela mesma escolha. Indireto inspira códigos, linguagem ou expectativa do mercado.
                </p>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => void gerarAnaliseIa(c.id)}
                  disabled={iaLinha === c.id}
                  className="w-full rounded-xl border border-ili-cinza-200 bg-ili-cinza-50/80 px-3 py-2 text-sm font-medium text-ili-cinza-600 hover:border-brand-300 hover:text-brand-800 disabled:cursor-wait"
                >
                  {iaLinha === c.id ? "A gerar…" : "Gerar benchmark (IA)"}
                </button>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-ili-cinza-500">
                  Análise / benchmark (editável)
                </label>
                <textarea
                  value={c.resumo}
                  onChange={(e) =>
                    patchConcorrente(c.id, { resumo: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-xl border border-ili-cinza-200 px-3 py-2 text-sm text-ili-preto focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200/80"
                  placeholder="Posicionamento, tom de naming, pontos fortes e fracos…"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={() => void aprovar()}
          disabled={gravando}
          className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-50"
        >
          {gravando ? "A gravar…" : "Aprovar benchmark →"}
        </button>
        <p className="text-center">
          <Link
            href={`/projetos/${idProjeto}/validar-briefing`}
            className="text-sm text-ili-cinza-400 underline-offset-2 hover:text-brand-600 hover:underline"
          >
            Voltar à validação do briefing
          </Link>
        </p>
      </div>
    </div>
  );
}
