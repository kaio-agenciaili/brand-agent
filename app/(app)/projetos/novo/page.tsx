"use client";

import { clientesMock } from "@/lib/mock/data";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function NovoProjetoPage() {
  const router = useRouter();
  const [criarNovo, setCriarNovo] = useState(false);
  const [clienteId, setClienteId] = useState(clientesMock[0]?.id ?? "");
  const [novoNome, setNovoNome] = useState("");
  const [novoSetor, setNovoSetor] = useState("");
  const [nomeProjeto, setNomeProjeto] = useState("");

  function submeter(e: FormEvent) {
    e.preventDefault();
    if (!nomeProjeto.trim()) {
      return;
    }
    router.push("/projetos/demo");
  }

  return (
    <div className="min-w-0 max-w-xl">
      <h1 className="text-2xl font-semibold text-ili-preto">Novo projeto</h1>
      <p className="mt-1 text-sm text-ili-cinza-400">
        Escolha o cliente e o nome. Os dados serão mockados; o fluxo abre o
        briefing de exemplo.
      </p>
      <form onSubmit={submeter} className="mt-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <span className="text-sm font-medium text-ili-cinza-500">Cliente</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCriarNovo(false)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                !criarNovo
                  ? "bg-brand-600 text-white"
                  : "bg-ili-cinza-100 text-ili-cinza-500"
              }`}
            >
              Existente
            </button>
            <button
              type="button"
              onClick={() => setCriarNovo(true)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                criarNovo
                  ? "bg-brand-600 text-white"
                  : "bg-ili-cinza-100 text-ili-cinza-500"
              }`}
            >
              Criar novo
            </button>
          </div>
        </div>
        {!criarNovo ? (
          <div>
            <label
              className="mb-1 block text-sm font-medium text-ili-cinza-500"
              htmlFor="cliente"
            >
              Seleccionar cliente
            </label>
            <select
              id="cliente"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full rounded-lg border border-ili-cinza-200 bg-white px-3 py-2.5 text-ili-preto focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              {clientesMock.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} — {c.setor}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-dashed border-ili-rosa-200 bg-ili-rosa-50/30 p-4">
            <div>
              <label className="mb-1 block text-sm text-ili-cinza-500" htmlFor="n">
                Nome do cliente
              </label>
              <input
                id="n"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="w-full rounded-lg border border-ili-cinza-200 px-3 py-2"
                placeholder="ex.: Papelaria do Largo"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-ili-cinza-500" htmlFor="s">
                Setor
              </label>
              <input
                id="s"
                value={novoSetor}
                onChange={(e) => setNovoSetor(e.target.value)}
                className="w-full rounded-lg border border-ili-cinza-200 px-3 py-2"
                placeholder="ex.: Retalho"
              />
            </div>
            <p className="text-xs text-ili-cinza-400">
              Não grava ainda — simula criação inline.
            </p>
          </div>
        )}
        <div>
          <label
            className="mb-1 block text-sm font-medium text-ili-cinza-500"
            htmlFor="proj"
          >
            Nome do projeto
          </label>
          <input
            id="proj"
            required
            value={nomeProjeto}
            onChange={(e) => setNomeProjeto(e.target.value)}
            className="w-full rounded-lg border border-ili-cinza-200 px-3 py-2.5 text-ili-preto focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="ex.: Rebrand 2026"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-lg hover:bg-brand-700 sm:w-auto sm:px-8"
        >
          Criar e iniciar briefing
        </button>
      </form>
    </div>
  );
}
