export type TipoConcorrenteBenchmark = "direto" | "indireto";

export interface BenchmarkConcorrente {
  id: string;
  nome: string;
  tipo: TipoConcorrenteBenchmark;
  resumo: string;
}

export interface BenchmarkState {
  concorrentes: BenchmarkConcorrente[];
}

export function benchmarkVazio(): BenchmarkState {
  return { concorrentes: [] };
}

export function nomesBenchmarkParaTextarea(s: BenchmarkState): string {
  return s.concorrentes
    .map((c) => c.nome.trim())
    .filter(Boolean)
    .join("\n");
}
