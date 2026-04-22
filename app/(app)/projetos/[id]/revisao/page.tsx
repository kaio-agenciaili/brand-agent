import { RevisaoBriefingClient } from "./revisao-briefing-client";

export default function RevisaoPage({
  params,
}: {
  params: { id: string };
}) {
  return <RevisaoBriefingClient idProjeto={params.id} />;
}
