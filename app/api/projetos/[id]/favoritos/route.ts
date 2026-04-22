import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Body = { nomes: string[] };

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ sucesso: false }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ sucesso: false }, { status: 401 });

  const body = (await request.json()) as Body;
  const { error } = await supabase
    .from("projetos")
    .update({ nomes_escolhidos: body.nomes, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("created_by", user.id);

  if (error) return NextResponse.json({ sucesso: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ sucesso: true });
}
