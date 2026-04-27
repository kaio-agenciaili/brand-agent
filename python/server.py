import asyncio
import json
import os
import uuid
from typing import Any, AsyncGenerator, Dict, List, Optional

from crew import analisar_concorrente, extrair_briefing_completo, refinar_nomes, rodar_crew, sugerir_concorrentes
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI(title="Brand Agent API")

_cors_extra = [o.strip() for o in os.environ.get("CORS_EXTRA_ORIGINS", "").split(",") if o.strip()]
_cors_origins = list(
    dict.fromkeys(
        [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ]
        + _cors_extra
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class NamingRequest(BaseModel):
    briefing_texto: str
    concorrentes_manuais: Optional[List[str]] = None
    briefing_estruturado: Optional[Dict[str, Any]] = None


class RefinarRequest(BaseModel):
    nomes_selecionados: List[str]
    instrucoes: str
    briefing_estruturado: Dict[str, Any]
    briefing_texto: str


class BenchmarkSugerirRequest(BaseModel):
    briefing_texto: str
    briefing_estruturado: Optional[Dict[str, Any]] = None


class BenchmarkAnalisarRequest(BaseModel):
    nome: str
    tipo: str = "direto"
    briefing_texto: str
    briefing_estruturado: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Job Manager — armazena filas de eventos SSE por job_id
# ---------------------------------------------------------------------------

_job_queues: dict[str, asyncio.Queue] = {}


def _make_progress_callback(job_id: str, loop: asyncio.AbstractEventLoop):
    """Retorna um callback thread-safe que enfileira eventos SSE."""
    queue = _job_queues[job_id]

    def callback(event: dict) -> None:
        loop.call_soon_threadsafe(queue.put_nowait, event)

    return callback


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def health() -> dict:
    return {"status": "ok"}


@app.post("/naming/start")
async def naming_start(request: NamingRequest) -> dict:
    """
    Inicia o pipeline de naming em background e retorna job_id imediatamente.
    O cliente pode acompanhar o progresso via GET /naming/stream/{job_id}.
    """
    job_id = str(uuid.uuid4())
    loop = asyncio.get_event_loop()
    _job_queues[job_id] = asyncio.Queue()
    callback = _make_progress_callback(job_id, loop)

    async def run_job() -> None:
        try:
            await asyncio.to_thread(
                rodar_crew,
                request.briefing_texto,
                request.concorrentes_manuais,
                request.briefing_estruturado,
                callback,
            )
        except Exception as e:
            loop.call_soon_threadsafe(
                _job_queues[job_id].put_nowait,
                {"type": "error", "message": str(e)},
            )
        finally:
            # Sentinela: encerra o stream
            loop.call_soon_threadsafe(_job_queues[job_id].put_nowait, None)

    asyncio.create_task(run_job())
    return {"job_id": job_id}


@app.get("/naming/stream/{job_id}")
async def naming_stream(job_id: str) -> StreamingResponse:
    """
    SSE stream de progresso do job. Emite eventos até o pipeline terminar.
    Formato: data: {json}\n\n
    Tipos de evento: agent_start, agent_done, done, error, stream_end
    """
    if job_id not in _job_queues:
        raise HTTPException(status_code=404, detail="Job não encontrado ou já expirado.")

    queue = _job_queues[job_id]

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=600)
                except asyncio.TimeoutError:
                    yield 'data: {"type":"timeout"}\n\n'
                    break

                if event is None:
                    yield 'data: {"type":"stream_end"}\n\n'
                    break

                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

                if event.get("type") in ("done", "error"):
                    yield 'data: {"type":"stream_end"}\n\n'
                    break
        finally:
            _job_queues.pop(job_id, None)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/naming")
async def naming(request: NamingRequest) -> dict:
    """Endpoint síncrono (sem SSE) — mantido para compatibilidade."""
    try:
        resultado = await asyncio.to_thread(
            rodar_crew,
            request.briefing_texto,
            request.concorrentes_manuais,
            request.briefing_estruturado,
        )
        return {"sucesso": True, **resultado}
    except Exception as e:
        return {
            "sucesso": False,
            "erro": str(e),
            "relatorio_final": "",
            "tasks_outputs": {},
        }


@app.post("/extrair")
async def extrair(request: NamingRequest) -> dict:
    """Extrai briefing completo (1 agente) — devolve JSON rico com territórios, arquétipos e step5."""
    try:
        resultado = await asyncio.to_thread(
            extrair_briefing_completo,
            request.briefing_texto,
        )
        return resultado
    except Exception as e:
        return {"sucesso": False, "erro": str(e)}


@app.post("/benchmark/sugerir")
async def benchmark_sugerir(request: BenchmarkSugerirRequest) -> dict:
    """Sugere 3–5 concorrentes com base no briefing do projeto."""
    try:
        resultado = await asyncio.to_thread(
            sugerir_concorrentes,
            request.briefing_texto,
            request.briefing_estruturado,
        )
        return resultado
    except Exception as e:
        return {"sucesso": False, "erro": str(e), "concorrentes_json": None}


@app.post("/benchmark/analisar")
async def benchmark_analisar(request: BenchmarkAnalisarRequest) -> dict:
    """Analisa um único concorrente no contexto do briefing."""
    try:
        resultado = await asyncio.to_thread(
            analisar_concorrente,
            request.nome,
            request.tipo,
            request.briefing_texto,
            request.briefing_estruturado,
        )
        return resultado
    except Exception as e:
        return {"sucesso": False, "erro": str(e), "resumo": ""}


@app.post("/refinar")
async def refinar(request: RefinarRequest) -> dict:
    """
    Gera variações dos nomes favoritos selecionados pelo analista.
    """
    job_id = str(uuid.uuid4())
    loop = asyncio.get_event_loop()
    _job_queues[job_id] = asyncio.Queue()
    callback = _make_progress_callback(job_id, loop)

    try:
        resultado = await asyncio.to_thread(
            refinar_nomes,
            request.nomes_selecionados,
            request.instrucoes,
            request.briefing_estruturado,
            request.briefing_texto,
            None,
            callback,
        )
        return {"sucesso": True, **resultado}
    except Exception as e:
        return {"sucesso": False, "erro": str(e), "refinamento_json": None}
    finally:
        _job_queues.pop(job_id, None)
