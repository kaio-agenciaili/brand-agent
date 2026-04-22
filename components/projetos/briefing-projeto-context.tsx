"use client";

import type { BriefingState } from "@/lib/briefing/types";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type Ctx = {
  idProjeto: string;
  textoOriginal: string;
  setTextoOriginal: (v: string) => void;
  concorrentesOpcionais: string;
  setConcorrentesOpcionais: (v: string) => void;
  briefing: BriefingState | null;
  setBriefing: Dispatch<SetStateAction<BriefingState | null>>;
  limpar: () => void;
};

const BriefingProjetoContext = createContext<Ctx | null>(null);

export function BriefingProjetoProvider({
  idProjeto,
  children,
}: {
  idProjeto: string;
  children: ReactNode;
}) {
  const [textoOriginal, setTextoOriginal] = useState("");
  const [concorrentesOpcionais, setConcorrentesOpcionais] = useState("");
  const [briefing, setBriefing] = useState<BriefingState | null>(null);

  const limpar = useCallback(() => {
    setTextoOriginal("");
    setConcorrentesOpcionais("");
    setBriefing(null);
  }, []);

  const value = useMemo(
    () => ({
      idProjeto,
      textoOriginal,
      setTextoOriginal,
      concorrentesOpcionais,
      setConcorrentesOpcionais,
      briefing,
      setBriefing,
      limpar,
    }),
    [
      idProjeto,
      textoOriginal,
      concorrentesOpcionais,
      briefing,
      limpar,
    ],
  );

  return (
    <BriefingProjetoContext.Provider value={value}>
      {children}
    </BriefingProjetoContext.Provider>
  );
}

export function useBriefingProjeto() {
  const c = useContext(BriefingProjetoContext);
  if (!c) {
    throw new Error("useBriefingProjeto deve estar dentro de BriefingProjetoProvider");
  }
  return c;
}
