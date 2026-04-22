import { ProjetosInputClient } from "./projetos-input-client";

export default function ProjetoInputPage({
  params,
}: {
  params: { id: string };
}) {
  return <ProjetosInputClient idProjeto={params.id} />;
}
