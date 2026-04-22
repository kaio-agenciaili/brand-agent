export type StatusProjeto = "rascunho" | "em andamento" | "concluído";

export interface ProjetoMock {
  id: string;
  nome: string;
  clienteId: string;
  nomeCliente: string;
  status: StatusProjeto;
  atualizadoEm: string;
}

export interface ClienteMock {
  id: string;
  nome: string;
  setor: string;
  qtdProjetos: number;
  ultimoProjetoEm: string;
}

export const resumoDashboard = {
  totalProjetos: 24,
  emAndamento: 9,
  concluidos: 12,
  totalClientes: 11,
} as const;

export const clientesMock: ClienteMock[] = [
  {
    id: "c1",
    nome: "Acme Brasil",
    setor: "Tecnologia",
    qtdProjetos: 4,
    ultimoProjetoEm: "2026-04-18",
  },
  {
    id: "c2",
    nome: "Verde & Co.",
    setor: "Alimentação",
    qtdProjetos: 2,
    ultimoProjetoEm: "2026-04-10",
  },
  {
    id: "c3",
    nome: "Núcleo Fintech",
    setor: "Serviços financeiros",
    qtdProjetos: 6,
    ultimoProjetoEm: "2026-04-20",
  },
  {
    id: "c4",
    nome: "Studio Aurora",
    setor: "Design",
    qtdProjetos: 1,
    ultimoProjetoEm: "2026-03-22",
  },
  {
    id: "c5",
    nome: "LogiPort",
    setor: "Logística",
    qtdProjetos: 3,
    ultimoProjetoEm: "2026-04-12",
  },
];

export const projetosMock: ProjetoMock[] = [
  {
    id: "demo",
    nome: "Naming — piloto",
    clienteId: "c1",
    nomeCliente: "Acme Brasil",
    status: "em andamento",
    atualizadoEm: "2026-04-21T14:30:00Z",
  },
  {
    id: "p2",
    nome: "Rebrand sustentável",
    clienteId: "c2",
    nomeCliente: "Verde & Co.",
    status: "rascunho",
    atualizadoEm: "2026-04-19T09:15:00Z",
  },
  {
    id: "p3",
    nome: "App Pagamentos",
    clienteId: "c3",
    nomeCliente: "Núcleo Fintech",
    status: "concluído",
    atualizadoEm: "2026-04-16T11:00:00Z",
  },
  {
    id: "p4",
    nome: "Identidade 2026",
    clienteId: "c4",
    nomeCliente: "Studio Aurora",
    status: "em andamento",
    atualizadoEm: "2026-04-20T16:45:00Z",
  },
  {
    id: "p5",
    nome: "Hub logístico",
    clienteId: "c5",
    nomeCliente: "LogiPort",
    status: "rascunho",
    atualizadoEm: "2026-04-11T08:00:00Z",
  },
];

export const projetosRecentesDashboard = [...projetosMock]
  .sort(
    (a, b) =>
      new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime(),
  )
  .slice(0, 5);

const rotulosStatus: Record<StatusProjeto, string> = {
  rascunho: "Rascunho",
  "em andamento": "Em andamento",
  concluído: "Concluído",
};

export function labelStatus(status: StatusProjeto): string {
  return rotulosStatus[status];
}

export function estiloBadgeStatus(status: StatusProjeto): string {
  switch (status) {
    case "rascunho":
      return "bg-ili-cinza-100 text-ili-cinza-500 border-ili-cinza-200";
    case "em andamento":
      return "bg-ili-rosa-50 text-ili-rosa-800 border-ili-rosa-200";
    case "concluído":
      return "bg-ili-preto text-white border-ili-cinza-300";
    default:
      return "bg-ili-cinza-100 text-ili-cinza-500";
  }
}
