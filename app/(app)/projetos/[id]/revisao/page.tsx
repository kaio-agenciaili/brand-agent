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
      "briefing, briefing_texto, briefing_validado_em, benchmark_aprovado_em",
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

  return (
    <RevisaoBriefingClient
      idProjeto={params.id}
      initialBriefing={briefingDesdeDb(row.briefing)}
      initialTexto={row.briefing_texto ?? ""}
    />
  );
}
