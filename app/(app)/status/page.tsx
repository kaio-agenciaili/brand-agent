import { getSystemStatusSnapshot } from "@/lib/system/status-snapshot";
import { StatusView } from "./status-view";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  let initialData: Awaited<ReturnType<typeof getSystemStatusSnapshot>> | null =
    null;
  let initialError: string | null = null;
  try {
    initialData = await getSystemStatusSnapshot();
  } catch (e) {
    initialError = e instanceof Error ? e.message : String(e);
  }
  return <StatusView initialData={initialData} initialError={initialError} />;
}
