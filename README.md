# Brand Agent

Plataforma web para naming e posicionamento de marcas com apoio de agentes de IA.  
O frontend orquestra briefings e revisões; o backend Python expõe APIs para orquestração (CrewAI/LLM).  
Objetivo: unir simplicidade na experiência do utilizador e rigor estratégico na geração de nomes.

## Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS  
- **Backend de agentes:** Python 3, FastAPI (ou app ASGI compatível), Uvicorn  
- **Dados / auth (quando integrado):** Supabase (URL, anon key, service role no servidor)

## Setup local

### Pré-requisitos

- Node.js 20+ (recomendado) e npm  
- Python 3.11+ com `pip`

### Frontend (Next.js)

```bash
npm install
cp .env.local.example .env.local
# Preencha .env.local com os valores reais
npm run dev
```

A app fica em `http://localhost:3000` (porta predefinida do Next.js).

### Backend Python (Uvicorn)

Na pasta do servidor Python (ex.: `python/`):

```bash
cd python
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Preencha .env
uvicorn server:app --reload --host 127.0.0.1 --port 8000
```

Ajuste `main:app` e a porta se o ponto de entrada do projeto for outro. O frontend deve apontar `CREWAI_SERVER_URL` para este URL.

## Variáveis de ambiente

| Ficheiro | Uso |
|----------|-----|
| `.env.local` (raiz) | Next.js: Supabase, Anthropic (se usado no edge/server), URL do serviço Python |
| `python/.env` | Chaves usadas só pelo backend (Anthropic, Serper, etc.) |

**Next.js (`.env.local`)**

- `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto Supabase  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — chave pública (browser)  
- `SUPABASE_SERVICE_ROLE_KEY` — só no servidor; nunca expor no cliente  
- `ANTHROPIC_API_KEY` — se chamadas Anthropic forem feitas a partir do Next (rotas de API)  
- `CREWAI_SERVER_URL` — base URL do backend Python (ex.: `http://localhost:8000`)
- `WHOISJSON_API_KEY` — opcional; melhora a checagem de disponibilidade de domínios. Sem ela, o sistema usa RDAP como fallback.

**Python (`python/.env`)**

- `ANTHROPIC_API_KEY` — modelos Anthropic no backend  
- `SERPER_API_KEY` — pesquisa web (Serper), se aplicável

Copie a partir de `.env.local.example` e `python/.env.example` e nunca comite ficheiros `.env` reais.

## Como correr tudo

1. Terminal 1 (Next.js): `npm run dev`  
2. Terminal 2 (API Python): `uvicorn server:app --reload --host 127.0.0.1 --port 8000` (ou o comando documentado no `python/README` do repositório, quando existir)

Garanta que `CREWAI_SERVER_URL` no Next corresponde ao URL onde o Uvicorn está a escutar.
