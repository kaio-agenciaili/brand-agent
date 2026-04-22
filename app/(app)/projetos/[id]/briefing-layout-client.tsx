"use client";

import { BriefingProjetoProvider } from "@/components/projetos/briefing-projeto-context";
import type { ReactNode } from "react";

export function BriefingProjetoLayoutClient({
  idProjeto,
  children,
}: {
  idProjeto: string;
  children: ReactNode;
}) {
  return <BriefingProjetoProvider idProjeto={idProjeto}>{children}</BriefingProjetoProvider>;
}
