import type { BenchmarkState } from "@/lib/briefing/benchmark-types";
import { briefingDesdeDb } from "@/lib/briefing/types";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { BenchmarkClient } from "./benchmark-client";

export default async function BenchmarkPage({
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
      "briefing, briefing_texto, briefing_validado_em, benchmark_aprovado_em, benchmark",
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
  if (!row.briefing_validado_em) {
    redirect(`/projetos/${params.id}/validar-briefing`);
  }

  const forcar = searchParams?.editar === "benchmark";
  if (row.benchmark_aprovado_em && !forcar) {
    redirect(`/projetos/${params.id}/revisao`);
  }

  const initialBenchmark =
    row.benchmark != null
      ? (row.benchmark as unknown as BenchmarkState)
      : null;

  return (
    <BenchmarkClient
      idProjeto={params.id}
      initialBriefing={briefingDesdeDb(row.briefing)}
      initialTexto={row.briefing_texto ?? ""}
      initialBenchmark={initialBenchmark}
    />
  );
}
