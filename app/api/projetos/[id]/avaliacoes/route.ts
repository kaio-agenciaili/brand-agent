import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type StatusAvaliacaoNome = "shortlist" | "negativado" | "neutro";

type AvaliacaoNome = {
  status: StatusAvaliacaoNome;
  nota?: string;
};

type Body = {
  avaliacoes: Record<string, AvaliacaoNome>;
  nomesEscolhidos?: string[];
};

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ sucesso: false }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ sucesso: false }, { status: 401 });

  const body = (await request.json()) as Body;
  const avaliacoes = body.avaliacoes ?? {};
  const nomesEscolhidos =
    body.nomesEscolhidos ??
    Object.entries(avaliacoes)
      .filter(([, avaliacao]) => avaliacao.status === "shortlist")
      .map(([nome]) => nome);

  const { error } = await supabase
    .from("projetos")
    .update({
      avaliacoes_nomes: avaliacoes as unknown as Record<string, unknown>,
      nomes_escolhidos: nomesEscolhidos,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("created_by", user.id);

  if (error) return NextResponse.json({ sucesso: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ sucesso: true });
}
