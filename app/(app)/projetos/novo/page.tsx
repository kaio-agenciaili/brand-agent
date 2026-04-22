import { createClient } from "@/lib/supabase/server";
import { NovoProjetoForm } from "./novo-projeto-form";
import { redirect } from "next/navigation";

export default async function NovoProjetoPage() {
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

  const { data: clientes, error } = await supabase
    .from("clientes")
    .select("id, nome, setor")
    .eq("created_by", user.id)
    .order("nome", { ascending: true });

  if (error) {
    return (
      <div className="min-w-0 max-w-xl">
        <h1 className="text-2xl font-semibold text-ili-preto">Novo projecto</h1>
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Não foi possível carregar clientes. {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-xl">
      <h1 className="text-2xl font-semibold text-ili-preto">Novo projecto</h1>
      <p className="mt-1 text-sm text-ili-cinza-400">
        Escolha o cliente e o nome do projecto. O briefing abre com o registo
        real na base de dados.
      </p>
      <NovoProjetoForm clientes={clientes ?? []} />
    </div>
  );
}
