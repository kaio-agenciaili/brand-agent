import { briefingDesdeDb } from "@/lib/briefing/types";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ValidarBriefingClient } from "./validar-briefing-client";

export default async function ValidarBriefingPage({
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
      "briefing, briefing_texto, briefing_validado_em, benchmark_aprovado_em",
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
  if (row.briefing == null) {
    redirect(`/projetos/${params.id}`);
  }

  const forcar = searchParams?.editar === "validar";
  if (row.briefing_validado_em && !forcar) {
    redirect(`/projetos/${params.id}/benchmark`);
  }

  return (
    <ValidarBriefingClient
      idProjeto={params.id}
      initialBriefing={briefingDesdeDb(row.briefing)}
      initialTexto={row.briefing_texto ?? ""}
    />
  );
}
