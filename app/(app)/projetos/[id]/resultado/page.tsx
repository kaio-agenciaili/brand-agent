import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ResultadoClient } from "./resultado-client";

export default async function ResultadoPage({
  params,
}: {
  params: { id: string };
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

  // Query principal — colunas sempre existentes
  const { data: row, error } = await supabase
    .from("projetos")
    .select("id, status, nome_projeto, relatorio_final, nomes_gerados, nomes_escolhidos")
    .eq("id", params.id)
    .eq("created_by", user.id)
    .maybeSingle();

  if (error) {
    return (
      <p className="text-sm text-red-600">
        Não foi possível carregar o resultado: {error.message}
      </p>
    );
  }
  if (!row) {
    notFound();
  }
  if (row.status !== "concluido" && row.status !== "gerado") {
    if (row.status === "em_andamento") {
      redirect(`/projetos/${params.id}/revisao`);
    }
    redirect(`/projetos/${params.id}`);
  }

  // Colunas novas: tenta buscar separado para não quebrar se migration não foi rodada
  let notasNomes: Record<string, string> = {};
  let avaliacoesNomes: Record<
    string,
    { status: "shortlist" | "negativado" | "neutro"; nota?: string }
  > = {};
  try {
    const { data: extra } = await supabase
      .from("projetos")
      .select("notas_nomes, avaliacoes_nomes")
      .eq("id", params.id)
      .eq("created_by", user.id)
      .maybeSingle();
    notasNomes = (extra?.notas_nomes as Record<string, string> | null) ?? {};
    avaliacoesNomes =
      (extra?.avaliacoes_nomes as
        | Record<
            string,
            { status: "shortlist" | "negativado" | "neutro"; nota?: string }
          >
        | null) ?? {};
  } catch {
    // coluna ainda não existe - ignora
  }

  return (
    <ResultadoClient
      idProjeto={row.id}
      nomeProjeto={row.nome_projeto}
      statusProjeto={row.status}
      relatorioFinal={row.relatorio_final ?? ""}
      nomesGeral={row.nomes_gerados as Record<string, unknown> | null}
      nomesEscolhidos={(row.nomes_escolhidos as string[] | null) ?? []}
      notasNomes={notasNomes}
      avaliacoesNomes={avaliacoesNomes}
    />
  );
}
