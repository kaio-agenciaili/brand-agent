"use client";

import {
  estiloBadgeStatus,
  labelStatus,
  projetosRecentesDashboard,
  resumoDashboard,
} from "@/lib/mock/data";
import Link from "next/link";

function CardResumo({
  titulo,
  valor,
  subtitulo,
}: {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
}) {
  return (
    <div className="rounded-xl border border-ili-cinza-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-ili-cinza-400">{titulo}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-ili-preto">
        {valor}
      </p>
      {subtitulo && <p className="mt-1 text-xs text-ili-cinza-400">{subtitulo}</p>}
    </div>
  );
}

function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function DashboardPage() {
  return (
    <div className="min-w-0 max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-ili-preto">Dashboard</h1>
        <Link
          href="/projetos/novo"
          className="inline-flex w-fit items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-brand-700"
        >
          Novo projeto
        </Link>
      </div>
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CardResumo
          titulo="Total de projetos"
          valor={resumoDashboard.totalProjetos}
        />
        <CardResumo
          titulo="Em andamento"
          valor={resumoDashboard.emAndamento}
        />
        <CardResumo
          titulo="Concluídos"
          valor={resumoDashboard.concluidos}
        />
        <CardResumo
          titulo="Total de clientes"
          valor={resumoDashboard.totalClientes}
        />
      </div>
      <div>
        <h2 className="mb-4 text-lg font-medium text-ili-cinza-500">
          Projetos recentes
        </h2>
        <div className="overflow-x-auto rounded-xl border border-ili-cinza-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-ili-cinza-200 text-left text-sm">
            <thead className="bg-ili-cinza-50 text-ili-cinza-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome do projeto</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Actualização</th>
                <th className="w-32 px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ili-cinza-100 text-ili-cinza-500">
              {projetosRecentesDashboard.map((p) => (
                <tr key={p.id} className="hover:bg-ili-cinza-50/80">
                  <td className="px-4 py-3 font-medium">{p.nome}</td>
                  <td className="px-4 py-3 text-ili-cinza-500">{p.nomeCliente}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${estiloBadgeStatus(p.status)}`}
                    >
                      {labelStatus(p.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ili-cinza-500">
                    {formatarData(p.atualizadoEm)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/projetos/${p.id}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-800"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
