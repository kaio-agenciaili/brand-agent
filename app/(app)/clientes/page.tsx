"use client";

import { clientesMock } from "@/lib/mock/data";
import Link from "next/link";

function formatarData(s: string) {
  return new Date(s).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ClientesPage() {
  return (
    <div className="min-w-0 max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-ili-preto">Clientes</h1>
        <button
          type="button"
          className="inline-flex w-fit items-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-brand-700"
        >
          Novo cliente
        </button>
      </div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clientesMock.map((c) => (
          <li
            key={c.id}
            className="flex flex-col rounded-xl border border-ili-cinza-200 bg-white p-5 shadow-sm transition hover:border-ili-rosa-200 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-ili-preto">{c.nome}</h2>
            <p className="mt-1 text-sm text-ili-cinza-400">Setor: {c.setor}</p>
            <p className="mt-3 text-sm text-ili-cinza-500">
              <span className="font-medium text-ili-preto">
                {c.qtdProjetos}
              </span>{" "}
              {c.qtdProjetos === 1 ? "projeto" : "projetos"}
            </p>
            <p className="mt-1 text-xs text-ili-cinza-400">
              Último projeto: {formatarData(c.ultimoProjetoEm)}
            </p>
            <div className="mt-4 grow" />
            <Link
              href="/projetos"
              className="inline-flex w-full justify-center rounded-lg border border-ili-cinza-200 bg-ili-cinza-50 py-2 text-sm font-medium text-brand-700 transition hover:border-brand-200 hover:bg-ili-rosa-50"
            >
              Ver projetos
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
