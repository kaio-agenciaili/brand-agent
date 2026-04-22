import { ResultadoClient } from "./resultado-client";

export default function ResultadoPage({
  params,
}: {
  params: { id: string };
}) {
  return <ResultadoClient idProjeto={params.id} />;
}
