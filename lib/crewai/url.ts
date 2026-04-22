/**
 * Base URL do FastAPI (Crew) — a partir do .env do Next; fallback para IPv4 local.
 */
export function getCrewaiBaseUrl() {
  return (process.env.CREWAI_SERVER_URL || "http://127.0.0.1:8000").replace(
    /\/$/,
    "",
  );
}

/**
 * No Node (p.ex. Windows), `http://localhost:8000` pode resolver para ::1
 * enquanto o Uvicorn costuma escutar em 127.0.0.1. Usar em `fetch()` no servidor.
 * A string original (`getCrewaiBaseUrl()`) mantém-se para mensagens e UI.
 */
export function crewaiUrlForNodeFetch(absolute: string) {
  try {
    const u = new URL(absolute.includes("://") ? absolute : `http://${absolute}`);
    if (u.hostname === "localhost") {
      u.hostname = "127.0.0.1";
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    return absolute;
  }
}
