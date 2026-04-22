import { createClient } from "@/lib/supabase/server";
import {
  estiloBadgeStatusDb,
  labelStatusDb,
} from "@/lib/projetos/status";
import Link from "next/link";
import { redirect } from "next/navigation";

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

function EstadoVazioProjetos() {
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

export default async function DashboardPage() {
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

  const userId = user.id;

  const [totalP, andamento, concluidos, totalC, recentes] = await Promise.all([
    supabase
      .from("projetos")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId),
    supabase
      .from("projetos")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId)
      .eq("status", "em_andamento"),
    supabase
      .from("projetos")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId)
      .eq("status", "concluido"),
    supabase
      .from("clientes")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId),
    supabase
      .from("projetos")
      .select("id, nome_projeto, status, updated_at, clientes ( nome )")
      .eq("created_by", userId)
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  const nTotal = totalP.error
    ? 0
    : totalP.count ?? 0;
  const nAnd = andamento.error ? 0 : andamento.count ?? 0;
  const nConcl = concluidos.error ? 0 : concluidos.count ?? 0;
  const nClientes = totalC.error ? 0 : totalC.count ?? 0;

  const filaErro =
    totalP.error ||
    andamento.error ||
    concluidos.error ||
    totalC.error ||
    recentes.error;
  if (filaErro) {
    return (
      <div className="min-w-0 max-w-7xl">
        <h1 className="text-2xl font-semibold text-ili-preto">Dashboard</h1>
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Não foi possível carregar o dashboard. {filaErro.message}
        </p>
      </div>
    );
  }

  const linhas = (recentes.data ?? []).map((row) => {
    const join = row.clientes;
    const nomeCliente =
      join && typeof join === "object" && "nome" in join
        ? String((join as { nome: string }).nome)
        : "—";
    return {
      id: row.id,
      nome: row.nome_projeto,
      status: row.status,
      nomeCliente,
      atualizadoEm: row.updated_at,
    };
  });

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
        <CardResumo titulo="Total de projetos" valor={nTotal} />
        <CardResumo titulo="Em andamento" valor={nAnd} />
        <CardResumo titulo="Concluídos" valor={nConcl} />
        <CardResumo titulo="Total de clientes" valor={nClientes} />
      </div>
      <div>
        <h2 className="mb-4 text-lg font-medium text-ili-cinza-500">
          Projetos recentes
        </h2>
        {nTotal === 0 ? (
          <EstadoVazioProjetos />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-ili-cinza-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-ili-cinza-200 text-left text-sm">
              <thead className="bg-ili-cinza-50 text-ili-cinza-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome do projecto</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Actualização</th>
                  <th className="w-32 px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ili-cinza-100 text-ili-cinza-500">
                {linhas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-ili-cinza-400"
                    >
                      Sem projectos com os filtros actuais.
                    </td>
                  </tr>
                ) : (
                  linhas.map((p) => (
                    <tr key={p.id} className="hover:bg-ili-cinza-50/80">
                      <td className="px-4 py-3 font-medium">{p.nome}</td>
                      <td className="px-4 py-3 text-ili-cinza-500">
                        {p.nomeCliente}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${estiloBadgeStatusDb(p.status)}`}
                        >
                          {labelStatusDb(p.status)}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
