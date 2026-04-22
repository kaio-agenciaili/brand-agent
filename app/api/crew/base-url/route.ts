import { getCrewaiBaseUrl } from "@/lib/crewai/url";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Expõe a URL pública do FastAPI só a usuários autenticados,
 * para o browser poder fazer warm-up (cold start Render) sem limite curto da Vercel.
 */
export async function GET() {
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ erro: "Supabase não configurado." }, { status: 500 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }
  return NextResponse.json({ baseUrl: getCrewaiBaseUrl() });
}
