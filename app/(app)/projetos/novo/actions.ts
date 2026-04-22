"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type CriarProjetoResult = { error: string } | void;

export async function criarProjetoAction(input: {
  mode: "existing" | "new";
  clienteId?: string;
  novoNome?: string;
  novoSetor?: string;
  nomeProjeto: string;
}): Promise<CriarProjetoResult> {
  const supabase = createClient();
  if (!supabase) {
    return { error: "Supabase não configurado." };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessão expirada. Inicie sessão novamente." };
  }

  const nomeProjeto = input.nomeProjeto.trim();
  if (!nomeProjeto) {
    return { error: "Indique o nome do projeto." };
  }

  let clienteId = input.clienteId?.trim() ?? "";

  if (input.mode === "new") {
    const nome = input.novoNome?.trim() ?? "";
    if (!nome) {
      return { error: "Indique o nome do cliente." };
    }
    const setor = input.novoSetor?.trim() || null;
    const { data: ins, error: errCliente } = await supabase
      .from("clientes")
      .insert({
        nome,
        setor,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (errCliente) {
      return { error: errCliente.message };
    }
    if (!ins?.id) {
      return { error: "Não foi possível criar o cliente." };
    }
    clienteId = ins.id;
  } else {
    if (!clienteId) {
      return { error: "Seleccione um cliente ou crie um novo." };
    }
  }

  const { data: proj, error: errProj } = await supabase
    .from("projetos")
    .insert({
      cliente_id: clienteId,
      nome_projeto: nomeProjeto,
      status: "rascunho",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (errProj) {
    return { error: errProj.message };
  }
  if (!proj?.id) {
    return { error: "Não foi possível criar o projeto." };
  }

  redirect(`/projetos/${proj.id}`);
}
