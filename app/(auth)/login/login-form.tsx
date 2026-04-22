"use client";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCarregando(true);
    const supabase = createClient();

    if (!supabase) {
      // Sem Supabase: entrar no app (modo local só de UI)
      const next = searchParams.get("next");
      const destino =
        next &&
        next.startsWith("/") &&
        !next.startsWith("//") &&
        !next.startsWith("/login")
          ? next
          : "/dashboard";
      setCarregando(false);
      router.push(destino);
      router.refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError("E-mail ou senha incorretos. Tente novamente.");
      setCarregando(false);
      return;
    }
    const next = searchParams.get("next");
    const destino =
      next &&
      next.startsWith("/") &&
      !next.startsWith("//") &&
      !next.startsWith("/login")
        ? next
        : "/dashboard";
    router.push(destino);
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ili-cinza-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ili-cinza-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-ili-preto">Entrar</h1>
          <p className="mt-1 text-sm text-ili-cinza-400">
            {isSupabaseConfigured() ? (
              "Use o e-mail e a senha da sua conta."
            ) : (
              <span>
                Modo local (sem Supabase): qualquer dado e &quot;Entrar&quot; abre
                o app; configure <code className="text-xs">.env.local</code>{" "}
                para auth real.
              </span>
            )}
          </p>
        </div>
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
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-ili-cinza-500"
            >
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            disabled={carregando}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white shadow transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? "A entrar…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
