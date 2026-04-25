import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ProjetosInputClient } from "./projetos-input-client";

export default async function ProjetoInputPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { editar?: string };
}) {
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

  const { data: row, error } = await supabase
    .from("projetos")
    .select(
      "id, nome_projeto, briefing_texto, status, briefing, briefing_validado_em, benchmark_aprovado_em, clientes ( nome )",
    )
    .eq("id", params.id)
    .eq("created_by", user.id)
    .maybeSingle();

  if (error) {
    return (
      <p className="text-sm text-red-600">Não foi possível carregar o projecto.</p>
    );
  }
  if (!row) {
    notFound();
  }

  if (row.status === "concluido" || row.status === "gerado") {
    redirect(`/projetos/${params.id}/resultado`);
  }

  const forcarInput = searchParams?.editar === "input";
  if (!forcarInput) {
    if (row.briefing != null && !row.briefing_validado_em) {
      redirect(`/projetos/${params.id}/validar-briefing`);
    }
    if (row.briefing_validado_em && !row.benchmark_aprovado_em) {
      redirect(`/projetos/${params.id}/benchmark`);
    }
    if (row.benchmark_aprovado_em) {
      redirect(`/projetos/${params.id}/revisao`);
    }
  }

  const j = row.clientes;
  const nomeCliente =
    j && typeof j === "object" && "nome" in j
      ? String((j as { nome: string }).nome)
      : "—";

  return (
    <ProjetosInputClient
      idProjeto={row.id}
      nomeProjeto={row.nome_projeto}
      nomeCliente={nomeCliente}
      textoRascunhoInicial={row.briefing_texto ?? ""}
    />
  );
}
