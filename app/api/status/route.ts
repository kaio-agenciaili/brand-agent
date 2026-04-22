import { getSystemStatusSnapshot } from "@/lib/system/status-snapshot";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const body = await getSystemStatusSnapshot();
  return NextResponse.json(body);
}
