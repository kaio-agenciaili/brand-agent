import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ sucesso: false, erro: "Supabase não configurado." }, { status: 500 });
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ sucesso: false, erro: "Não autenticado." }, { status: 401 });
  }

  const { error } = await supabase
    .from("projetos")
    .update({ status: "concluido", updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("created_by", user.id);

  if (error) {
    return NextResponse.json({ sucesso: false, erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ sucesso: true });
}
