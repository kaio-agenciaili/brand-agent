import { BriefingProjetoLayoutClient } from "./briefing-layout-client";

export default function ProjetosIdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <BriefingProjetoLayoutClient idProjeto={params.id}>
      {children}
    </BriefingProjetoLayoutClient>
  );
}
