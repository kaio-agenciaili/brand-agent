"use client";

import { FormEvent, useState, useTransition } from "react";
import { criarProjetoAction } from "./actions";

type ClienteOp = { id: string; nome: string; setor: string | null };

type Props = {
  clientes: ClienteOp[];
};

export function NovoProjetoForm({ clientes }: Props) {
  const [isPending, startTransition] = useTransition();
  const [criarNovo, setCriarNovo] = useState(clientes.length === 0);
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [novoNome, setNovoNome] = useState("");
  const [novoSetor, setNovoSetor] = useState("");
  const [nomeProjeto, setNomeProjeto] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function submeter(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!nomeProjeto.trim()) {
      return;
    }
    startTransition(async () => {
      const res = await criarProjetoAction({
        mode: criarNovo ? "new" : "existing",
        clienteId: criarNovo ? undefined : clienteId,
        novoNome: criarNovo ? novoNome : undefined,
        novoSetor: criarNovo ? novoSetor : undefined,
        nomeProjeto,
      });
      if (res && "error" in res) {
        setErro(res.error);
      }
    });
  }

  return (
    <form onSubmit={submeter} className="mt-8 space-y-6">
      {erro && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {erro}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <span className="text-sm font-medium text-ili-cinza-500">Cliente</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCriarNovo(false)}
            disabled={clientes.length === 0}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              !criarNovo
                ? "bg-brand-600 text-white"
                : "bg-ili-cinza-100 text-ili-cinza-500"
            } ${clientes.length === 0 ? "cursor-not-allowed opacity-50" : ""}`}
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
      {!criarNovo && clientes.length > 0 ? (
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
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} — {c.setor ?? "—"}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {criarNovo && (
        <div className="space-y-3 rounded-xl border border-dashed border-ili-rosa-200 bg-ili-rosa-50/30 p-4">
          <div>
            <label
              className="mb-1 block text-sm text-ili-cinza-500"
              htmlFor="n"
            >
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
            <label
              className="mb-1 block text-sm text-ili-cinza-500"
              htmlFor="s"
            >
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
        </div>
      )}
      {clientes.length === 0 && !criarNovo && (
        <p className="text-sm text-ili-cinza-500">
          Não tem clientes ainda. Use &quot;Criar novo&quot; para o primeiro
          registo.
        </p>
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
        disabled={isPending}
        className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-lg hover:bg-brand-700 disabled:opacity-50 sm:w-auto sm:px-8"
      >
        {isPending ? "A criar…" : "Criar e iniciar briefing"}
      </button>
    </form>
  );
}
