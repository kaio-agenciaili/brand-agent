import { crewaiUrlForNodeFetch, getCrewaiBaseUrl } from "@/lib/crewai/url";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const GET_USER_MS = 10_000;
/** Render grátis e similares demoram a “acordar”; 5s falhava sempre no cold start. Vercel Hobby limita a função a ~10s. */
const PYTHON_CHECK_MS = 10_000;

function abortAfter(ms: number) {
  return AbortSignal.timeout(ms);
}

export type SystemStatusSnapshot = {
  ok: boolean;
  timestamp: string;
  supabase: {
    envConfigured: boolean;
    session: string;
    message?: string;
  };
  python: {
    url: string;
    reachable: boolean;
    statusCode?: number;
    detail?: string;
  };
  dicas: {
    envCrew: boolean;
    fallbackUrl: string;
  };
};

/**
 * Agregado de saúde: Supabase (env + sessão) e API Python (GET /).
 * Usado pela rota /api/status e pela página /status (SSR) para o primeiro ecrã não depender do JS.
 */
export async function getSystemStatusSnapshot(): Promise<SystemStatusSnapshot> {
  const ts = new Date().toISOString();
  const base = getCrewaiBaseUrl();
  const supaEnv = isSupabaseConfigured();

  async function resolveSupabase() {
    if (!supaEnv) {
      return {
        session: "nao_configurado" as const,
        supaMsg:
          "Faltam NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      };
    }
    const supabase = createClient();
    if (!supabase) {
      return { session: "erro" as const, supaMsg: "Cliente Supabase null." };
    }
    try {
      const out = await Promise.race([
        supabase.auth.getUser(),
        new Promise<"timeout">((resolve) =>
          setTimeout(() => resolve("timeout"), GET_USER_MS),
        ),
      ]);
      if (out === "timeout") {
        return {
          session: "erro" as const,
          supaMsg:
            "Timeout ao contatar o Supabase (rede ou configuração). Tente de novo.",
        };
      }
      const {
        data: { user },
        error,
      } = out;
      if (error) {
        return { session: "erro" as const, supaMsg: error.message };
      }
      return {
        session: (user ? "autenticado" : "sem_sessao") as
          | "autenticado"
          | "sem_sessao",
        supaMsg: undefined,
      };
    } catch (e) {
      return { session: "erro" as const, supaMsg: String(e) };
    }
  }

  async function resolvePython() {
    const python: {
      url: string;
      reachable: boolean;
      statusCode?: number;
      detail?: string;
    } = {
      url: base,
      reachable: false,
    };
    try {
      const r = await fetch(`${crewaiUrlForNodeFetch(base)}/`, {
        method: "GET",
        cache: "no-store",
        signal: abortAfter(PYTHON_CHECK_MS),
      });
      python.statusCode = r.status;
      python.reachable = r.ok;
      if (!r.ok) {
        python.detail = `HTTP ${r.status}`;
      }
    } catch (e) {
      python.detail = String(e);
    }
    return python;
  }

  const [supa, python] = await Promise.all([
    resolveSupabase(),
    resolvePython(),
  ]);
  const session = supa.session;
  const supaMsg = supa.supaMsg;
  const ok = supaEnv && session === "autenticado" && python.reachable;

  return {
    ok,
    timestamp: ts,
    supabase: {
      envConfigured: supaEnv,
      session,
      message: supaMsg,
    },
    python,
    dicas: {
      envCrew: Boolean(process.env.CREWAI_SERVER_URL?.trim()),
      fallbackUrl: "http://127.0.0.1:8000",
    },
  };
}
