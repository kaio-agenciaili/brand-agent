import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

function formatarData(s: string) {
  return new Date(s).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function EstadoVazio() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ili-cinza-200 bg-ili-cinza-50/50 px-6 py-12 text-center">
      <p className="text-sm text-ili-cinza-500">Nenhum cliente ainda.</p>
      <p className="mt-1 text-xs text-ili-cinza-400">
        Crie um projecto e associe um cliente novo, ou falo connosco para
        importar.
      </p>
      <Link
        href="/projetos/novo"
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        Criar primeiro projecto →
      </Link>
    </div>
  );
}

export default async function ClientesPage() {
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

  const { data: clientesRows, error: errC } = await supabase
    .from("clientes")
    .select("id, nome, setor, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  const { data: projetosRows, error: errP } = await supabase
    .from("projetos")
    .select("cliente_id, updated_at, created_at")
    .eq("created_by", user.id);

  if (errC || errP) {
    return (
      <div className="min-w-0 max-w-7xl">
        <h1 className="text-2xl font-semibold text-ili-preto">Clientes</h1>
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Não foi possível carregar os clientes.{" "}
          {errC?.message ?? errP?.message}
        </p>
      </div>
    );
  }

  const porCliente = new Map<
    string,
    { count: number; ultimo: string | null }
  >();
  for (const p of projetosRows ?? []) {
    const prev = porCliente.get(p.cliente_id) ?? {
      count: 0,
      ultimo: null as string | null,
    };
    prev.count += 1;
    const t = p.updated_at || p.created_at;
    if (t) {
      if (!prev.ultimo || t > prev.ultimo) {
        prev.ultimo = t;
      }
    }
    porCliente.set(p.cliente_id, prev);
  }

  const clientes = clientesRows ?? [];

  return (
    <div className="min-w-0 max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-ili-preto">Clientes</h1>
        <Link
          href="/projetos/novo"
          className="inline-flex w-fit items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-brand-700"
        >
          Novo projecto
        </Link>
      </div>
      {clientes.length === 0 ? (
        <EstadoVazio />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clientes.map((c) => {
            const ag = porCliente.get(c.id);
            const qtd = ag?.count ?? 0;
            const ultimo = ag?.ultimo;
            return (
              <li
                key={c.id}
                className="flex flex-col rounded-xl border border-ili-cinza-200 bg-white p-5 shadow-sm transition hover:border-ili-rosa-200 hover:shadow-md"
              >
                <h2 className="text-lg font-semibold text-ili-preto">
                  {c.nome}
                </h2>
                <p className="mt-1 text-sm text-ili-cinza-400">
                  Setor: {c.setor ?? "—"}
                </p>
                <p className="mt-3 text-sm text-ili-cinza-500">
                  <span className="font-medium text-ili-preto">{qtd}</span>{" "}
                  {qtd === 1 ? "projecto" : "projectos"}
                </p>
                <p className="mt-1 text-xs text-ili-cinza-400">
                  {ultimo
                    ? `Última actualização de projecto: ${formatarData(ultimo)}`
                    : "Ainda sem projectos neste cliente."}
                </p>
                <div className="mt-4 grow" />
                <Link
                  href="/projetos"
                  className="inline-flex w-full justify-center rounded-lg border border-ili-cinza-200 bg-ili-cinza-50 py-2 text-sm font-medium text-brand-700 transition hover:border-brand-200 hover:bg-ili-rosa-50"
                >
                  Ver projectos
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
