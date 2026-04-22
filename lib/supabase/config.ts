/**
 * Supabase está configurado (URL + anon key) para ligação real.
 * Sem isto, o app corre em modo “só front” (UI sem auth nem chamadas).
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  return url.length > 0 && key.length > 0;
}
