"use client";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState, FormEvent } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCarregando(true);
    const supabase = createClient();

    if (!supabase) {
      setError(
        "Modo local sem Supabase: recuperação de senha requer configuração real.",
      );
      setCarregando(false);
      return;
    }

    const origin = window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      },
    );

    if (resetError) {
      setError("Não foi possível enviar o e-mail. Tente novamente.");
      setCarregando(false);
      return;
    }

    setEnviado(true);
    setCarregando(false);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ili-cinza-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ili-cinza-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-ili-preto">
            Recuperar senha
          </h1>
          <p className="mt-1 text-sm text-ili-cinza-400">
            {isSupabaseConfigured()
              ? "Informe seu e-mail para receber o link de redefinição."
              : "Modo local sem Supabase: recuperação de senha indisponível."}
          </p>
        </div>

        {enviado ? (
          <div className="space-y-4">
            <p
              className="rounded-lg border border-ili-cinza-200 bg-ili-cinza-50 px-3 py-3 text-sm text-ili-cinza-500"
              role="status"
            >
              Se existir uma conta com este e-mail, enviaremos um link para
              redefinir a senha. Verifique sua caixa de entrada.
            </p>
            <Link
              href="/login"
              className="block w-full rounded-lg border border-ili-cinza-200 bg-white py-2.5 text-center text-sm font-medium text-ili-preto shadow-sm transition hover:bg-ili-cinza-50"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-ili-cinza-500"
              >
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-ili-cinza-200 bg-white px-3 py-2 text-ili-preto placeholder-ili-cinza-400 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="seu@email.com"
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
              disabled={carregando}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white shadow transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {carregando ? "A enviar…" : "Enviar link"}
            </button>
            <Link
              href="/login"
              className="block text-center text-sm text-ili-cinza-500 hover:text-ili-preto"
            >
              Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
