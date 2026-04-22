import { getSystemStatusSnapshot } from "@/lib/system/status-snapshot";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
/** Alinha com o tempo máximo típico no plano gratuito da Vercel (health check ao Python). */
export const maxDuration = 10;

export async function GET() {
  const body = await getSystemStatusSnapshot();
  return NextResponse.json(body);
}
