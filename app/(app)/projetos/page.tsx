import { createClient } from "@/lib/supabase/server";
import {
  estiloBadgeStatusDb,
  labelStatusDb,
} from "@/lib/projetos/status";
import Link from "next/link";
import { redirect } from "next/navigation";

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

function EstadoVazio() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ili-cinza-200 bg-ili-cinza-50/50 px-6 py-12 text-center">
      <p className="text-sm text-ili-cinza-500">Nenhum projecto ainda.</p>
      <Link
        href="/projetos/novo"
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        Criar primeiro projecto →
      </Link>
    </div>
  );
}

export default async function ProjetosListPage() {
  const supabase = createClient();
  if (!supabase) {
    redirect("/login");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: rows, error } = await supabase
    .from("projetos")
    .select("id, nome_projeto, status, updated_at, clientes ( nome )")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-red-600">Não foi possível listar projectos. {error.message}</p>
    );
  }

  const list = rows ?? [];
  if (list.length === 0) {
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
        <EstadoVazio />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-ili-preto">Projetos</h1>
        <Link
          href="/projetos/novo"
          className="inline-flex w-fit rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-brand-700"
        >
          Novo projecto
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-ili-cinza-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-ili-cinza-200 text-left text-sm">
          <thead className="bg-ili-cinza-50 text-ili-cinza-500">
            <tr>
              <th className="px-4 py-3 font-medium">Projecto</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Actualização</th>
              <th className="w-32 px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ili-cinza-100 text-ili-cinza-500">
            {list.map((p) => {
              const c = p.clientes;
              const nomeCliente =
                c && typeof c === "object" && "nome" in c
                  ? String((c as { nome: string }).nome)
                  : "—";
              return (
                <tr key={p.id} className="hover:bg-ili-cinza-50/80">
                  <td className="px-4 py-3 font-medium text-ili-preto">
                    {p.nome_projeto}
                  </td>
                  <td className="px-4 py-3">{nomeCliente}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${estiloBadgeStatusDb(p.status)}`}
                    >
                      {labelStatusDb(p.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {formatarData(p.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="text-sm font-medium text-brand-600 hover:text-brand-800"
                      href={`/projetos/${p.id}`}
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
