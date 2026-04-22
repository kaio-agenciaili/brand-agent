"use client";

import { estiloBadgeStatus, labelStatus, projetosMock } from "@/lib/mock/data";
import Link from "next/link";

export default function ProjetosListPage() {
  return (
    <div className="min-w-0 max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-ili-preto">Projetos</h1>
        <Link
          href="/projetos/novo"
          className="inline-flex w-fit rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-brand-700"
        >
          Novo projeto
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projetosMock.map((p) => (
          <li
            key={p.id}
            className="flex flex-col rounded-xl border border-ili-cinza-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h2 className="font-semibold text-ili-preto">{p.nome}</h2>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${estiloBadgeStatus(p.status)}`}
              >
                {labelStatus(p.status)}
              </span>
            </div>
            <p className="text-sm text-ili-cinza-500">{p.nomeCliente}</p>
            <div className="mt-4">
              <Link
                className="text-sm font-medium text-brand-600 hover:text-brand-800"
                href={`/projetos/${p.id}`}
              >
                Abrir briefing →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
