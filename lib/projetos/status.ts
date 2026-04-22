/**
 * Valores de `projetos.status` na base de dados (snake_case, sem acentos).
 */
export type StatusProjetoDb =
  | "rascunho"
  | "em_andamento"
  | "concluido";

const rotulos: Record<StatusProjetoDb, string> = {
  rascunho: "Rascunho",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

export function labelStatusDb(status: string): string {
  if (status in rotulos) {
    return rotulos[status as StatusProjetoDb];
  }
  return status;
}

export function estiloBadgeStatusDb(status: string): string {
  switch (status) {
    case "rascunho":
      return "bg-ili-cinza-100 text-ili-cinza-500 border-ili-cinza-200";
    case "em_andamento":
      return "bg-ili-rosa-50 text-ili-rosa-800 border-ili-rosa-200";
    case "concluido":
      return "bg-ili-preto text-white border-ili-cinza-300";
    default:
      return "bg-ili-cinza-100 text-ili-cinza-500";
  }
}
