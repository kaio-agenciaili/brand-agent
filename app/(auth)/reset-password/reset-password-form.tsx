"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [sessaoValida, setSessaoValida] = useState<boolean | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setSessaoValida(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSessaoValida(Boolean(data.session));
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmacao) {
      setError("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    const supabase = createClient();
    if (!supabase) {
      setError("Configuração de autenticação indisponível.");
      setCarregando(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError("Não foi possível redefinir a senha. Tente novamente.");
      setCarregando(false);
      return;
    }

    setSucesso(true);
    setCarregando(false);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ili-cinza-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ili-cinza-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-ili-preto">Nova senha</h1>
          <p className="mt-1 text-sm text-ili-cinza-400">
            Escolha uma nova senha para sua conta.
          </p>
        </div>

        {sessaoValida === false ? (
          <div className="space-y-4">
            <p
              className="rounded-lg border border-ili-rosa-200 bg-ili-rosa-50 px-3 py-3 text-sm text-ili-rosa-800"
              role="alert"
            >
              O link de redefinição expirou ou é inválido. Solicite um novo
              link.
            </p>
            <Link
              href="/forgot-password"
              className="block w-full rounded-lg bg-brand-600 py-2.5 text-center text-sm font-medium text-white shadow transition hover:bg-brand-700"
            >
              Solicitar novo link
            </Link>
          </div>
        ) : sucesso ? (
          <p
            className="rounded-lg border border-ili-cinza-200 bg-ili-cinza-50 px-3 py-3 text-sm text-ili-cinza-500"
            role="status"
          >
            Senha redefinida com sucesso. A redirecionar…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-ili-cinza-500"
              >
                Nova senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-ili-cinza-200 bg-white px-3 py-2 text-ili-preto placeholder-ili-cinza-400 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label
                htmlFor="confirmacao"
                className="mb-1 block text-sm font-medium text-ili-cinza-500"
              >
                Confirmar nova senha
              </label>
              <input
                id="confirmacao"
                name="confirmacao"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                className="w-full rounded-lg border border-ili-cinza-200 bg-white px-3 py-2 text-ili-preto placeholder-ili-cinza-400 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p
                className="rounded-lg border border-ili-rosa-200 bg-ili-rosa-50 px-3 py-2 text-sm text-ili-rosa-800"
                role="alert"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={carregando || sessaoValida === null}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white shadow transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {carregando ? "A salvar…" : "Redefinir senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
