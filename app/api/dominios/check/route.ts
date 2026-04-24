import { NextResponse } from "next/server";

type Body = {
  dominios: string[];
};

type StatusDominio = "registrado" | "disponivel" | "sem_registro_encontrado" | "indeterminado";

type ResultadoDominio = {
  dominio: string;
  status: StatusDominio;
  fonte: string;
};

function normalizarDominio(dominio: string): string {
  return dominio
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/[^a-z0-9.-]/g, "");
}

function rdapUrl(dominio: string): string {
  if (dominio.endsWith(".br")) {
    return `https://rdap.registro.br/domain/${encodeURIComponent(dominio)}`;
  }
  return `https://rdap.org/domain/${encodeURIComponent(dominio)}`;
}

function splitDominio(dominio: string): { name: string; tld: string } | null {
  const normalizado = normalizarDominio(dominio);
  const partes = normalizado.split(".");
  if (partes.length < 2) return null;
  return {
    name: partes[0],
    tld: partes.slice(1).join("."),
  };
}

async function checarDomscan(dominio: string): Promise<ResultadoDominio | null> {
  const split = splitDominio(dominio);
  if (!split) return null;

  try {
    const url = new URL("https://domscan.net/v1/status");
    url.searchParams.set("name", split.name);
    url.searchParams.set("tlds", split.tld);

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      results?: Array<{ domain?: string; available?: boolean }>;
    };
    const item = data.results?.find(
      (r) => normalizarDominio(r.domain ?? "") === normalizarDominio(dominio),
    ) ?? data.results?.[0];

    if (!item || typeof item.available !== "boolean") return null;
    return {
      dominio: normalizarDominio(item.domain ?? dominio),
      status: item.available ? "disponivel" : "registrado",
      fonte: "domscan",
    };
  } catch {
    return null;
  }
}

async function checarDominio(dominio: string): Promise<ResultadoDominio> {
  const normalizado = normalizarDominio(dominio);
  if (!normalizado || !normalizado.includes(".")) {
    return { dominio, status: "indeterminado", fonte: "rdap" };
  }

  const whoisJsonKey = (process.env.WHOISJSON_API_KEY ?? "").trim();
  if (whoisJsonKey) {
    try {
      const url = new URL("https://whoisjson.com/api/v1/domain-availability");
      url.searchParams.set("domain", normalizado);
      const res = await fetch(url, {
        headers: { Authorization: `TOKEN=${whoisJsonKey}` },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { domain?: string; available?: boolean };
        if (typeof data.available === "boolean") {
          return {
            dominio: data.domain ? normalizarDominio(data.domain) : normalizado,
            status: data.available ? "disponivel" : "registrado",
            fonte: "whoisjson",
          };
        }
      }
    } catch {
      // fallback RDAP abaixo
    }
  }

  const domscan = await checarDomscan(normalizado);
  if (domscan) {
    return domscan;
  }

  try {
    const res = await fetch(rdapUrl(normalizado), {
      headers: { Accept: "application/rdap+json, application/json" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });

    if (res.ok) {
      return { dominio: normalizado, status: "registrado", fonte: "rdap" };
    }
    if (res.status === 404) {
      return { dominio: normalizado, status: "sem_registro_encontrado", fonte: "rdap" };
    }
    return { dominio: normalizado, status: "indeterminado", fonte: "rdap" };
  } catch {
    return { dominio: normalizado, status: "indeterminado", fonte: "rdap" };
  }
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ sucesso: false, erro: "JSON inválido." }, { status: 400 });
  }

  const dominios = Array.from(new Set((body.dominios ?? []).map(normalizarDominio).filter(Boolean))).slice(0, 150);
  const resultados = await Promise.all(dominios.map(checarDominio));

  return NextResponse.json({
    sucesso: true,
    resultados,
    aviso: "Quando WHOISJSON_API_KEY está configurada, a disponibilidade vem da WhoisJSON. Sem chave, a rota tenta DomScan e usa RDAP como fallback final.",
  });
}
