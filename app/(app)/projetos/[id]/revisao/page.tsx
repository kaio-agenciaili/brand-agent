import { createClient } from "@/lib/supabase/server";
import { briefingDesdeDb } from "@/lib/briefing/types";
import { notFound, redirect } from "next/navigation";
import { RevisaoBriefingClient } from "./revisao-briefing-client";

export default async function RevisaoPage({
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

  const { data: row, error } = await supabase
    .from("projetos")
    .select(
      "briefing, briefing_texto, briefing_validado_em, benchmark_aprovado_em, avaliacoes_nomes, notas_nomes",
    )
    .eq("id", params.id)
    .eq("created_by", user.id)
    .maybeSingle();

  if (error) {
    return (
      <p className="text-sm text-red-600">Não foi possível carregar a revisão.</p>
    );
  }
  if (!row) {
    notFound();
  }
  if (row.briefing == null) {
    redirect(`/projetos/${params.id}`);
  }
  if (!row.briefing_validado_em) {
    redirect(`/projetos/${params.id}/validar-briefing`);
  }
  if (!row.benchmark_aprovado_em) {
    redirect(`/projetos/${params.id}/benchmark`);
  }

  const avaliacoes =
    (row.avaliacoes_nomes as
      | Record<string, { status?: string; nota?: string }>
      | null) ?? {};
  const notas = (row.notas_nomes as Record<string, string> | null) ?? {};
  const aprovados = Object.entries(avaliacoes)
    .filter(([, v]) => v.status === "shortlist")
    .map(([nome, v]) => `- ${nome}${v.nota || notas[nome] ? `: ${v.nota || notas[nome]}` : ""}`);
  const negativados = Object.entries(avaliacoes)
    .filter(([, v]) => v.status === "negativado")
    .map(([nome, v]) => `- ${nome}${v.nota || notas[nome] ? `: ${v.nota || notas[nome]}` : ""}`);
  const aprendizadosRodadaAnterior = [
    aprovados.length ? `Nomes aprovados/shortlist:\n${aprovados.join("\n")}` : "",
    negativados.length ? `Nomes negativados:\n${negativados.join("\n")}` : "",
  ].filter(Boolean).join("\n\n");

  return (
    <RevisaoBriefingClient
      idProjeto={params.id}
      initialBriefing={briefingDesdeDb(row.briefing)}
      initialTexto={row.briefing_texto ?? ""}
      aprendizadosRodadaAnterior={aprendizadosRodadaAnterior}
    />
  );
}
