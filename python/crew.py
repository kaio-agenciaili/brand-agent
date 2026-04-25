"""
Crew de naming — 6 agentes com execução parcialmente paralela.
Fluxo: [briefing] → benchmark → naming → [validação || fonética] → estratégia
Suporte a progress_callback para streaming SSE.
"""
from __future__ import annotations

import json
import os
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Callable

import yaml
from crewai import Agent, Crew, Process, Task
from crewai_tools import SerperDevTool
from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError

_ROOT = Path(__file__).resolve().parent
load_dotenv(_ROOT / ".env")
load_dotenv()

PROMPTS_DIR = _ROOT / "prompts"


# ---------------------------------------------------------------------------
# Pydantic models — validam e normalizam saídas dos agentes
# ---------------------------------------------------------------------------

class PropostaNaming(BaseModel):
    nome: str
    categoria: str = ""
    territorio_estrategico: str = ""
    etimologia: str = ""
    justificativa: str = ""
    base_conceitual: str = ""
    por_que_e_diferente_dos_concorrentes: str = ""
    dominio_sugerido: str = ".com.br"
    alerta: str = ""
    score_registrabilidade: int = Field(default=3, ge=1, le=5)
    score_memorabilidade: int = Field(default=3, ge=1, le=5)
    score_sonoridade: int = Field(default=3, ge=1, le=5)
    score_originalidade: int = Field(default=3, ge=1, le=5)
    score_potencial_premium: int = Field(default=3, ge=1, le=5)
    score_final: int = Field(default=3, ge=1, le=5)


class Top3Item(BaseModel):
    nome: str
    justificativa: str = ""
    base_estrategica: str = ""
    defesa_para_apresentacao: str = ""


class NamingOutput(BaseModel):
    plano_da_rodada: dict[str, Any] = {}
    processo_criativo: dict[str, Any] = {}
    analise_estrategica: dict[str, Any] = {}
    propostas: list[PropostaNaming] = []
    top3: list[Top3Item] = []
    sintese_bases: str = ""
    criterios_usados: list[str] = []
    padroes_evitados: list[str] = []
    ranking_final: dict[str, Any] = {}


class FoneticaItem(BaseModel):
    nome: str
    pronuncia_pt: str = ""
    pronuncia_en: str = ""
    ritmo: str = ""
    memorabilidade: str = ""
    facilidade_escrita: str = ""
    alerta_fonetico: str = ""
    score_fonetico: int = Field(default=3, ge=1, le=5)
    score_pronuncia_pt: int = Field(default=3, ge=1, le=5)
    score_pronuncia_en: int = Field(default=3, ge=1, le=5)
    score_facilidade_escrita: int = Field(default=3, ge=1, le=5)
    risco_ouvido: str = ""
    risco_grafia: str = ""


class FoneticaOutput(BaseModel):
    analise: list[FoneticaItem] = []


# ---------------------------------------------------------------------------
# Carregamento de prompts dos arquivos YAML
# ---------------------------------------------------------------------------

def _load_prompt(name: str) -> dict:
    path = PROMPTS_DIR / f"{name}.yaml"
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    return {}


def _p(name: str, key: str, default: str = "") -> str:
    return _load_prompt(name).get(key, default)


# ---------------------------------------------------------------------------
# LLM
# ---------------------------------------------------------------------------

def _resolve_llm_id() -> str:
    provider = (os.environ.get("LLM_PROVIDER") or "openai").lower().strip()
    if provider in ("openai", "gpt", "open_ai"):
        if not (os.environ.get("OPENAI_API_KEY") or "").strip():
            raise ValueError(
                "OPENAI_API_KEY em falta. Para usar Claude: LLM_PROVIDER=anthropic + ANTHROPIC_API_KEY."
            )
        return (os.environ.get("OPENAI_MODEL") or "gpt-4o").strip()
    if provider in ("anthropic", "claude"):
        if not (os.environ.get("ANTHROPIC_API_KEY") or "").strip():
            raise ValueError(
                "ANTHROPIC_API_KEY em falta. Para usar GPT: LLM_PROVIDER=openai + OPENAI_API_KEY."
            )
        return (os.environ.get("ANTHROPIC_MODEL") or "claude-sonnet-4-20250514").strip()
    raise ValueError(f"LLM_PROVIDER inválido: {provider!r}. Use: openai ou anthropic.")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _taskoutput_raw(t: Any) -> str:
    if t is None:
        return ""
    r = getattr(t, "raw", None)
    if r is not None and str(r).strip():
        return str(r)
    return str(t)


def _json_do_llm(s: str) -> dict[str, Any] | None:
    s = (s or "").strip()
    if not s:
        return None
    if "```" in s:
        for block in s.split("```"):
            block = block.strip()
            if block.lower().startswith("json"):
                block = block[4:].strip()
            if block.startswith("{") or block.startswith("["):
                try:
                    out = json.loads(block)
                    if isinstance(out, dict):
                        return out
                except json.JSONDecodeError:
                    pass
    if "{" in s:
        a = s.find("{")
        b = s.rfind("}")
        if a >= 0 and b > a:
            try:
                out = json.loads(s[a: b + 1])
                if isinstance(out, dict):
                    return out
            except json.JSONDecodeError:
                pass
    return None


def _parse_and_validate(raw: str, model: type[BaseModel]) -> tuple[dict | None, dict | None]:
    """Retorna (validated_dict, raw_dict). validated_dict é None se Pydantic falhar."""
    data = _json_do_llm(raw)
    if not data:
        return None, None
    try:
        validated = model.model_validate(data)
        return validated.model_dump(), data
    except (ValidationError, Exception):
        return None, data


def _tem_briefing_revisado(b: dict[str, Any] | None) -> bool:
    if not b or not isinstance(b, dict):
        return False
    return any(v not in (None, "", {}, []) for v in b.values())


def _run_with_retry(crew: Crew, max_retries: int = 3) -> Any:
    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            return crew.kickoff()
        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
    raise RuntimeError(
        f"Crew falhou após {max_retries} tentativas: {last_error}"
    ) from last_error


def _first_task_output(result: Any) -> str:
    touts = list(getattr(result, "tasks_output", None) or [])
    return _taskoutput_raw(touts[0]) if touts else (getattr(result, "raw", None) or "")


def _merge_colisoes_marcas_grandes(naming_json: dict[str, Any] | None, colisoes_raw: str) -> None:
    """Acrescenta em cada proposta/top3 campos de colisão com marcas globais."""
    if not naming_json or not colisoes_raw:
        return
    cj = _json_do_llm(colisoes_raw) or {}
    by_nome: dict[str, dict[str, Any]] = {}
    for a in cj.get("avaliacoes") or []:
        if not isinstance(a, dict):
            continue
        n = str(a.get("nome_proposta") or "").strip()
        if n:
            by_nome[n] = a

    def patch_item(item: dict[str, Any]) -> None:
        nome = str(item.get("nome") or "").strip()
        if not nome or nome not in by_nome:
            return
        a = by_nome[nome]
        item["colisao_marca_grande"] = bool(a.get("colisao_provavel"))
        item["marca_grande_referencia"] = str(a.get("marca_referencia") or "")
        item["gravidade_colisao"] = str(a.get("gravidade") or "nenhuma")
        item["explicacao_colisao"] = str(a.get("explicacao_curta") or "")

    for p in naming_json.get("propostas") or []:
        if isinstance(p, dict):
            patch_item(p)
    for p in naming_json.get("top3") or []:
        if isinstance(p, dict):
            patch_item(p)


# ---------------------------------------------------------------------------
# Schemas de tarefa (partes fixas das task descriptions)
# ---------------------------------------------------------------------------

TASK_NAMING_SCHEMA = """
Método obrigatório antes de entregar:
1. Interpreta a essência da marca, promessa, público, territórios e tom.
2. Usa o benchmark para identificar padrões que o mercado aceita, clichês saturados e espaços livres.
3. Cria mapa semântico interno com metáforas, raízes, sons desejáveis e palavras proibidas.
4. Gera internamente pelo menos 60 candidatos por categoria: evocativo, neologismo, composto, híbrido, descritivo inteligente, premium e global.
5. Rejeita candidatos genéricos, óbvios, longos demais, difíceis de falar/escrever, parecidos com concorrentes, compostos preguiçosos, sem relação estratégica, com baixa chance preliminar de registro ou sonoridade fraca.
6. Para cada candidato finalista, testa mentalmente em: pitch de 30s, app store, cartão de visita, hashtag e domínio falado em voz alta. Só avança com nomes que passam.
7. Entrega os 16 melhores (o crítico fará o corte final para 12).

Rejeita automaticamente padrões como: Tech Solutions, Prime Group, Max Business, Digital Hub, Smart Pro, Alpha Company, Global Service, Nome + Brasil, Nome + Agency, Nome + Consultoria, Nome + Company.

Entrega APENAS JSON válido (sem markdown fora do JSON) com:
{
  "plano_da_rodada": {
    "aprendizado_shortlist": ["o que aprendeu com nomes aprovados, se houver"],
    "aprendizado_negativados": ["o que evitar a partir dos negativados, se houver"],
    "padroes_a_repetir": ["padrões úteis"],
    "padroes_a_evitar": ["padrões proibidos"],
    "nova_hipotese_criativa": "direção testada nesta rodada",
    "como_esta_rodada_difere_da_anterior": "frase objetiva"
  },
  "processo_criativo": {
    "direcao_escolhida": "direção principal",
    "categorias_exploradas": ["evocativo", "neologismo", "premium"],
    "criterios_de_corte": ["critérios usados para rejeitar nomes ruins"],
    "quantidade_gerada_internamente": 60
  },
  "propostas": [ exatamente 16 entradas ],
  "top3": [ exatamente 3 entradas ],
  "sintese_bases": "parágrafo: como as 12 propostas cobrem posicionamento e territórios",
  "criterios_usados": ["lista curta dos critérios de seleção"],
  "padroes_evitados": ["lista curta de clichês ou padrões evitados do benchmark"]
}

Cada proposta OBRIGATORIAMENTE:
- "nome": string
- "categoria": descritivo_inteligente | neologismo | híbrido | composto | evocativo | premium | global
- "territorio_estrategico": string
- "etimologia": 1 frase — origem semântica
- "justificativa": 2–4 frases — por que serve esta marca
- "base_conceitual": 2–3 frases — LINK EXPLÍCITO com territórios, arquétipos e requisitos do briefing
- "por_que_e_diferente_dos_concorrentes": 1–2 frases
- "dominio_sugerido": ex: ".com.br", ".io"
- "alerta": riscos de confusão com marcas existentes (string, pode ser vazio)
- "score_registrabilidade": inteiro 1–5
- "score_memorabilidade": inteiro 1–5
- "score_sonoridade": inteiro 1–5
- "score_originalidade": inteiro 1–5
- "score_potencial_premium": inteiro 1–5
- "score_final": média arredondada dos 5 scores acima: round((registrabilidade + memorabilidade + sonoridade + originalidade + potencial_premium) / 5)

Cada top3:
- "nome": igual a uma das 12 (ou afinado)
- "justificativa": por que está no pódio
- "base_estrategica": 2–4 frases — como sustenta a estratégia + territórios
- "defesa_para_apresentacao": como defender este nome para o cliente

Mínimo 5 propostas devem ser neologismos ou palavras claramente inventadas.
SEM base_conceitual por proposta = tarefa incompleta.
SEM diferenciação explícita vs concorrentes = tarefa incompleta.
"""

TASK_FONETICA_SCHEMA = """
Entrega APENAS JSON válido com:
{
  "analise": [
    {
      "nome": "Nome exato da proposta",
      "pronuncia_pt": "sílabas destacadas, ex: KA-i-lo",
      "pronuncia_en": "pronúncia em inglês, ex: KAI-lo",
      "ritmo": "monossilábico | dissilábico | trissilábico | polissilábico",
      "memorabilidade": "alta | média | baixa — 1 frase de justificativa",
      "facilidade_escrita": "alta | média | baixa — 1 frase",
      "alerta_fonetico": "risco fônico específico ou string vazia",
      "score_fonetico": inteiro 1–5,
      "score_pronuncia_pt": inteiro 1–5,
      "score_pronuncia_en": inteiro 1–5,
      "score_facilidade_escrita": inteiro 1–5,
      "risco_ouvido": "risco de entender errado numa call ou string vazia",
      "risco_grafia": "risco de escrever errado depois de ouvir ou string vazia"
    }
  ]
}
Inclui TODOS os 12 nomes das propostas. Score 5 = excelente pronúncia + memorabilidade em PT e EN.
"""


# ---------------------------------------------------------------------------
# Função principal
# ---------------------------------------------------------------------------

def rodar_crew(
    briefing_texto: str,
    concorrentes_manuais: list[str] | None = None,
    briefing_estruturado: dict[str, Any] | None = None,
    progress_callback: Callable[[dict], None] | None = None,
) -> dict[str, Any]:
    """
    Pipeline de naming com 6 agentes.
    Se briefing_estruturado fornecido, pula a extração (usa os 4 agentes restantes).
    progress_callback recebe: {"type": "agent_start|agent_done|done|error", "agente": str, "index": int, ...}
    """

    def emit(event: dict) -> None:
        if progress_callback:
            try:
                progress_callback(event)
            except Exception:
                pass

    concorrentes_manuais = list(concorrentes_manuais or [])
    serper_key = (os.environ.get("SERPER_API_KEY") or "").strip()
    use_serper = bool(serper_key)
    llm_id = _resolve_llm_id()
    benchmark_tools: list = [SerperDevTool()] if use_serper else []
    use_revisado = _tem_briefing_revisado(briefing_estruturado)
    j_revisado = (
        json.dumps(briefing_estruturado, ensure_ascii=False, indent=2) if use_revisado else ""
    )

    bloco_briefing = (
        f"\nBRIEFING REVISADO (prevalece sobre texto bruto):\n---\n{j_revisado}\n---\n"
        f"TEXTO BRUTO (referência):\n---\n{briefing_texto}\n---\n"
        if use_revisado
        else f"\nTEXTO BRUTO:\n---\n{briefing_texto}\n---\n"
    )

    if concorrentes_manuais:
        manuais_txt = "Concorrentes fornecidos: " + ", ".join(concorrentes_manuais)
    elif use_serper:
        manuais_txt = "Sem concorrentes manuais — usa Serper para descobrir."
    else:
        manuais_txt = (
            'Sem concorrentes manuais e sem Serper — infere 3 concorrentes plausíveis '
            'e indica "fonte": "inferencia_llm" em cada entrada.'
        )

    # ------------------------------------------------------------------
    # Construção de agentes (role/goal/backstory dos arquivos YAML)
    # ------------------------------------------------------------------

    def _make_agent(prompt_name: str, **overrides) -> Agent:
        p = _load_prompt(prompt_name)
        return Agent(
            role=overrides.get("role", p.get("role", prompt_name)),
            goal=overrides.get("goal", p.get("goal", "")),
            backstory=overrides.get("backstory", p.get("backstory", "")),
            llm=llm_id,
            verbose=True,
            **{k: v for k, v in overrides.items() if k not in ("role", "goal", "backstory")},
        )

    agente_briefing = _make_agent("briefing")
    agente_benchmark = _make_agent("benchmark", tools=benchmark_tools)
    agente_semantica = _make_agent("semantica")
    agente_naming = _make_agent("naming")
    agente_critico = _make_agent("critico")
    agente_validacao = _make_agent("validacao")
    agente_fonetica = _make_agent("fonetica")
    agente_estrategia = _make_agent("estrategia")
    agente_ranking = _make_agent("ranking")

    # ------------------------------------------------------------------
    # Funções de execução por fase (cada agente = mini-crew de 1 tarefa)
    # Passar contexto das fases anteriores na description da tarefa.
    # ------------------------------------------------------------------

    def _run_briefing() -> str:
        emit({"type": "agent_start", "agente": "briefing", "index": 0})
        task = Task(
            description=(
                "Lê o texto bruto abaixo. Extrai e devolve APENAS JSON válido com as chaves: "
                "empresa (obrigatório: nome provisório se não existir), setor, mercado, o_que_faz, "
                "proposito, publico_alvo, tom_desejado, objecoes, idioma, palavras_evitar. "
                "Completa com inferência profissional campos vazios quando o contexto permitir. "
                "Sem markdown, sem texto fora do JSON."
                + bloco_briefing
            ),
            expected_output="JSON com as 9 chaves indicadas, em texto puro.",
            agent=agente_briefing,
        )
        result = _run_with_retry(Crew(agents=[agente_briefing], tasks=[task], process=Process.sequential, verbose=True))
        raw = _first_task_output(result)
        emit({"type": "agent_done", "agente": "briefing", "index": 0, "output": raw})
        return raw

    def _run_benchmark(briefing_out: str) -> str:
        emit({"type": "agent_start", "agente": "benchmark", "index": 1})
        base = (
            "Usa a ferramenta Serper para identificar ~3 concorrentes relevantes. "
            if use_serper
            else "Sem ferramenta web — define 3 concorrentes/marcas de referência com base no briefing. "
        )
        task = Task(
            description=(
                base + manuais_txt + bloco_briefing
                + f"\nBRIEFING ESTRUTURADO:\n{briefing_out[:2000]}\n"
                + "Devolve APENAS JSON com até 5 entradas. Cada entrada: "
                "nome, tipo (direto|indireto), posicionamento, tom, estilo_naming, pontos_fortes, pontos_fracos, "
                "padroes_nome_aceitos, cliches_a_evitar, oportunidade_diferenciacao. "
                "Inclui também no topo: padroes_mercado_aceita, cliches_setor, espacos_livres_naming. "
                "Chave de topo opcional: `concorrentes`. Parseável com json.loads."
            ),
            expected_output="JSON de benchmarking competitivo com padrões aceitos, clichês e espaços livres.",
            agent=agente_benchmark,
        )
        result = _run_with_retry(Crew(agents=[agente_benchmark], tasks=[task], process=Process.sequential, verbose=True))
        raw = _first_task_output(result)
        emit({"type": "agent_done", "agente": "benchmark", "index": 1, "output": raw})
        return raw

    def _run_semantica(briefing_out: str, benchmark_out: str) -> str:
        emit({"type": "agent_start", "agente": "semantica", "index": 2})
        task = Task(
            description=(
                "Antes de criar nomes, transforma briefing e benchmark num mapa estratégico-semântico. "
                "Não gere nomes. Entrega APENAS JSON válido com:\n"
                "{\n"
                '  "essencia_marca": "...",\n'
                '  "tensao_central": "...",\n'
                '  "promessa_verbal": "...",\n'
                '  "territorios_criativos": [{"nome": "...", "ideia": "...", "por_que_importa": "...", "riscos": "..."}],\n'
                '  "mapa_semantico": {"campos": [], "metaforas": [], "verbos": [], "raizes_possiveis": [], "sons_desejados": [], "palavras_evitar": []},\n'
                '  "codigos_do_mercado": {"padroes_aceitos": [], "padroes_saturados": [], "oportunidades_de_contraste": []},\n'
                '  "criterios_de_naming": []\n'
                "}\n"
                + bloco_briefing
                + f"\nBRIEFING ESTRUTURADO:\n{briefing_out[:2500]}\n"
                + f"\nBENCHMARK:\n{benchmark_out[:3000]}\n"
            ),
            expected_output="JSON com mapa estratégico-semântico para orientar o naming.",
            agent=agente_semantica,
        )
        result = _run_with_retry(Crew(agents=[agente_semantica], tasks=[task], process=Process.sequential, verbose=True))
        raw = _first_task_output(result)
        emit({"type": "agent_done", "agente": "semantica", "index": 2, "output": raw})
        return raw

    def _run_naming(briefing_out: str, benchmark_out: str, semantica_out: str) -> str:
        emit({"type": "agent_start", "agente": "naming", "index": 2})
        task = Task(
            description=(
                "Gera 12 propostas de nome com bases conceituais explícitas. "
                "Nunca começa pelos nomes: primeiro usa briefing + benchmark para inferir essência, territórios, mapa semântico, "
                "padrões aceitos pelo mercado, clichês do setor e espaços livres. "
                "Os nomes dos concorrentes são base para entender linguagem aceita, mas devem ser diferenciados e não imitados.\n"
                + bloco_briefing
                + f"\nBRIEFING ESTRUTURADO:\n{briefing_out[:2000]}\n"
                + f"\nBENCHMARK (concorrentes, padrões aceitos e clichês):\n{benchmark_out[:3000]}\n"
                + f"\nESTRATÉGIA SEMÂNTICA (usar como mapa obrigatório):\n{semantica_out[:3500]}\n"
                + TASK_NAMING_SCHEMA
            ),
            expected_output="JSON com propostas (12) + top3 + sintese_bases; base_conceitual obrigatória por proposta.",
            agent=agente_naming,
        )
        result = _run_with_retry(Crew(agents=[agente_naming], tasks=[task], process=Process.sequential, verbose=True))
        raw = _first_task_output(result)
        emit({"type": "agent_done", "agente": "naming", "index": 2, "output": raw})
        return raw

    def _run_critico(briefing_out: str, benchmark_out: str, semantica_out: str, naming_out: str, colisoes_out: str) -> str:
        emit({"type": "agent_start", "agente": "critico", "index": 3})
        task = Task(
            description=(
                "Recebeste 16 propostas de nome e as colisões com marcas globais já identificadas. "
                "Tua missão: cortar para exatamente 12 propostas finais fortes. "
                "Rejeite nomes genéricos, óbvios, parecidos com concorrentes, difíceis de defender, "
                "compostos preguiçosos, sem relação estratégica ou com colisão de gravidade alta/media. "
                "Para cada nome rejeitado, cria uma alternativa melhor seguindo o mesmo schema. "
                "Entregue APENAS JSON válido no mesmo formato de naming, com exatamente 12 propostas finais, top3 atualizado, "
                "e campos adicionais: `critica_resumo`, `nomes_rejeitados` [{nome, motivo}], `ajustes_feitos`.\n"
                f"\nBRIEFING:\n{briefing_out[:1800]}"
                f"\nBENCHMARK:\n{benchmark_out[:2200]}"
                f"\nESTRATÉGIA SEMÂNTICA (régua principal de avaliação):\n{semantica_out[:3500]}"
                f"\nCOLISÕES COM MARCAS GLOBAIS (usar como critério de corte):\n{colisoes_out[:1500]}"
                f"\nNOMES GERADOS (16 propostas):\n{naming_out[:7000]}"
                "\nCritérios de corte: genericidade, baixa sonoridade, baixa originalidade, distância do briefing, similaridade com concorrentes, colisão confirmada, baixa registrabilidade preliminar e baixo potencial premium."
            ),
            expected_output="JSON final revisado com exatamente 12 propostas fortes e nomes rejeitados explicados.",
            agent=agente_critico,
        )
        result = _run_with_retry(Crew(agents=[agente_critico], tasks=[task], process=Process.sequential, verbose=True))
        raw = _first_task_output(result)
        emit({"type": "agent_done", "agente": "critico", "index": 3, "output": raw})
        return raw

    def _run_colisoes_marcas(naming_out: str) -> str:
        emit({"type": "agent_start", "agente": "colisoes", "index": 7})
        agente_col = _make_agent("colisoes")
        task = Task(
            description=(
                "Analisa cada NOME nas propostas JSON abaixo. Para cada nome, avalia se há risco "
                "real de confusão com MARCA GLOBAL muito forte (Fortune 500, big tech, luxo icónico, "
                "grandes bancos internacionais, OEM automóvel massivo, etc.). "
                "Não marques colisão por palavras genéricas comuns. "
                "Devolve APENAS JSON:\n"
                '{"avaliacoes": [\n'
                "  {\"nome_proposta\": \"...\", \"colisao_provavel\": false, "
                '"marca_referencia": "", "gravidade": "nenhuma|baixa|media|alta", '
                '"explicacao_curta": ""}\n'
                "]}\n"
                f"\nOUTPUT DE NAMING (extrai os nomes das propostas):\n{naming_out[:8000]}\n"
            ),
            expected_output="JSON apenas com avaliacoes.",
            agent=agente_col,
        )
        result = _run_with_retry(
            Crew(
                agents=[agente_col],
                tasks=[task],
                process=Process.sequential,
                verbose=True,
            )
        )
        raw = _first_task_output(result)
        emit({"type": "agent_done", "agente": "colisoes", "index": 7, "output": raw})
        return raw

    def _run_validacao(naming_out: str) -> str:
        emit({"type": "agent_start", "agente": "validacao", "index": 3})
        task = Task(
            description=(
                "Avalia preliminarmente TODOS os 12 nomes e aprofunda o top 3. "
                "Não dê parecer jurídico. Produz APENAS JSON com:\n"
                "{\n"
                '  "avaliacoes": [{"nome": "...", "risco_preliminar": "baixo|medio|alto", "risco_genericidade": "baixo|medio|alto", "queries_inpi": [], "queries_google": [], "motivo": ""}],\n'
                '  "top3_aprofundado": [{"nome": "...", "classes_ncl_provaveis": [], "dominios": [], "handles_redes": [], "recomendacao": ""}],\n'
                '  "aviso": "Triagem preliminar; não substitui busca profissional no INPI nem parecer jurídico."\n'
                "}\n"
                f"\nNOMES GERADOS:\n{naming_out[:5000]}"
            ),
            expected_output="JSON de validação/roteiro (INPI, domínios, redes, Google, NCL).",
            agent=agente_validacao,
        )
        result = _run_with_retry(Crew(agents=[agente_validacao], tasks=[task], process=Process.sequential, verbose=True))
        raw = _first_task_output(result)
        emit({"type": "agent_done", "agente": "validacao", "index": 3, "output": raw})
        return raw

    def _run_fonetica(naming_out: str) -> str:
        emit({"type": "agent_start", "agente": "fonetica", "index": 4})
        task = Task(
            description=(
                "Analisa foneticamente TODOS os 12 nomes do passo de naming.\n"
                + TASK_FONETICA_SCHEMA
                + f"\nNOMES GERADOS:\n{naming_out[:6000]}"
            ),
            expected_output="JSON com campo 'analise' contendo um objeto por nome proposto.",
            agent=agente_fonetica,
        )
        result = _run_with_retry(Crew(agents=[agente_fonetica], tasks=[task], process=Process.sequential, verbose=True))
        raw = _first_task_output(result)
        emit({"type": "agent_done", "agente": "fonetica", "index": 4, "output": raw})
        return raw

    def _run_estrategia(
        briefing_out: str,
        benchmark_out: str,
        naming_out: str,
        validacao_out: str,
        fonetica_out: str,
        ranking_out: str,
    ) -> str:
        emit({"type": "agent_start", "agente": "estrategia", "index": 5})
        task = Task(
            description=(
                "Consolida todos os outputs num Relatório final em Markdown com:\n"
                "## Resumo executivo\n## Benchmark\n## Nome recomendado (base estratégica + fonética)\n"
                "## Alternativas (outras 9 com linha de base por nome)\n## Próximos passos\n## Linha de posicionamento\n"
                "Referencia bases dos nomes de topo e destaca melhores scores fonéticos. Tom profissional, em português.\n"
                f"\n### BRIEFING:\n{briefing_out[:2000]}"
                f"\n### BENCHMARK:\n{benchmark_out[:1500]}"
                f"\n### NAMING (12 propostas + top3):\n{naming_out[:3000]}"
                f"\n### VALIDAÇÃO:\n{validacao_out[:1500]}"
                f"\n### FONÉTICA:\n{fonetica_out[:1500]}"
                f"\n### RANKING FINAL:\n{ranking_out[:2000]}"
            ),
            expected_output="Relatório em Markdown completo, pronto para stakeholders.",
            agent=agente_estrategia,
        )
        result = _run_with_retry(Crew(agents=[agente_estrategia], tasks=[task], process=Process.sequential, verbose=True))
        raw = _first_task_output(result)
        emit({"type": "agent_done", "agente": "estrategia", "index": 5, "output": raw})
        return raw

    def _run_ranking(
        briefing_out: str,
        benchmark_out: str,
        naming_out: str,
        validacao_out: str,
        fonetica_out: str,
    ) -> str:
        emit({"type": "agent_start", "agente": "ranking", "index": 6})
        task = Task(
            description=(
                "Consolida os nomes finais e calcula ranking estratégico. Entrega APENAS JSON válido com:\n"
                "{\n"
                '  "pesos": {"aderencia_briefing": 20, "originalidade": 15, "memorabilidade": 15, "sonoridade": 15, "diferenciacao_competitiva": 15, "registrabilidade_preliminar": 10, "potencial_premium": 10},\n'
                '  "top12": [{"nome": "...", "score_final": 0, "motivo": "...", "principal_risco": "..."}],\n'
                '  "top3": [{"nome": "...", "posicao": 1, "motivo": "...", "base_estrategica": "...", "defesa_para_apresentacao": "...", "principal_risco": "..."}],\n'
                '  "recomendacao_final": "..."\n'
                "}\n"
                f"\nBRIEFING:\n{briefing_out[:1800]}"
                f"\nBENCHMARK:\n{benchmark_out[:1800]}"
                f"\nNOMES REVISADOS:\n{naming_out[:5000]}"
                f"\nVALIDAÇÃO:\n{validacao_out[:1800]}"
                f"\nFONÉTICA:\n{fonetica_out[:1800]}"
            ),
            expected_output="JSON de ranking final com top12, top3 e recomendação.",
            agent=agente_ranking,
        )
        result = _run_with_retry(Crew(agents=[agente_ranking], tasks=[task], process=Process.sequential, verbose=True))
        raw = _first_task_output(result)
        emit({"type": "agent_done", "agente": "ranking", "index": 6, "output": raw})
        return raw

    # ------------------------------------------------------------------
    # Execução do pipeline
    # ------------------------------------------------------------------

    # Fase 1: briefing (se não revisado) → benchmark → naming
    if use_revisado:
        briefing_out = j_revisado
    else:
        briefing_out = _run_briefing()

    benchmark_out = _run_benchmark(briefing_out)
    semantica_out = _run_semantica(briefing_out, benchmark_out)
    naming_out_bruto = _run_naming(briefing_out, benchmark_out, semantica_out)
    colisoes_out = _run_colisoes_marcas(naming_out_bruto)
    naming_out = _run_critico(briefing_out, benchmark_out, semantica_out, naming_out_bruto, colisoes_out)

    # Fase 2: validação + fonética em PARALELO
    with ThreadPoolExecutor(max_workers=2) as executor:
        fut_val = executor.submit(_run_validacao, naming_out)
        fut_fon = executor.submit(_run_fonetica, naming_out)
        validacao_out = fut_val.result()
        fonetica_out = fut_fon.result()

    ranking_out = _run_ranking(
        briefing_out, benchmark_out, naming_out, validacao_out, fonetica_out
    )

    # Fase 3: estratégia (usa todos os outputs)
    estrategia_out = _run_estrategia(
        briefing_out, benchmark_out, naming_out, validacao_out, fonetica_out, ranking_out
    )

    # ------------------------------------------------------------------
    # Parse e validação dos outputs com Pydantic
    # ------------------------------------------------------------------
    naming_validated, naming_raw_dict = _parse_and_validate(naming_out, NamingOutput)
    fonetica_validated, fonetica_raw_dict = _parse_and_validate(fonetica_out, FoneticaOutput)
    ranking_json = _json_do_llm(ranking_out)

    # Merge fonética nas propostas (se ambos disponíveis)
    naming_json = naming_validated or naming_raw_dict
    _merge_colisoes_marcas_grandes(
        naming_json if isinstance(naming_json, dict) else None,
        colisoes_out,
    )
    if naming_json and fonetica_validated:
        fon_map = {item["nome"]: item for item in fonetica_validated.get("analise", [])}
        for proposta in naming_json.get("propostas", []):
            nome = proposta.get("nome", "")
            if nome in fon_map:
                proposta["fonetica"] = fon_map[nome]
    if naming_json and ranking_json:
        naming_json["ranking_final"] = ranking_json
        if isinstance(ranking_json.get("top3"), list):
            naming_json["top3"] = ranking_json["top3"]

    result: dict[str, Any] = {
        "relatorio_final": estrategia_out,
        "tasks_outputs": {
            "briefing": briefing_out,
            "benchmark": benchmark_out,
            "semantica": semantica_out,
            "naming_bruto": naming_out_bruto,
            "naming": naming_out,
            "colisoes": colisoes_out,
            "validacao": validacao_out,
            "fonetica": fonetica_out,
            "ranking": ranking_out,
        },
        "naming_json": naming_json,
        "fonetica_json": fonetica_validated or fonetica_raw_dict,
    }

    emit({"type": "done", **result})
    return result


# ---------------------------------------------------------------------------
# Agente de Refinamento (chamado separadamente)
# ---------------------------------------------------------------------------

def refinar_nomes(
    nomes_selecionados: list[str],
    instrucoes: str,
    briefing_estruturado: dict[str, Any],
    briefing_texto: str,
    nomes_negativados: list[str] | None = None,
    progress_callback: Callable[[dict], None] | None = None,
) -> dict[str, Any]:
    """
    Gera variações dos nomes favoritos selecionados pelo analista.
    Retorna JSON com propostas refinadas (mesmo schema de NamingOutput, mas pode ter menos de 12).
    """

    def emit(event: dict) -> None:
        if progress_callback:
            try:
                progress_callback(event)
            except Exception:
                pass

    llm_id = _resolve_llm_id()
    p = _load_prompt("refinamento")
    agente = Agent(
        role=p.get("role", "Especialista em refinamento de nomes de marca"),
        goal=p.get("goal", "Gerar variações estratégicas dos nomes favoritos."),
        backstory=p.get("backstory", ""),
        llm=llm_id,
        verbose=True,
    )

    j_briefing = json.dumps(briefing_estruturado, ensure_ascii=False, indent=2)

    negativados_txt = (
        f"NOMES NEGATIVADOS (territórios e padrões a EVITAR nas variações): {', '.join(nomes_negativados)}\n\n"
        if nomes_negativados
        else ""
    )

    task = Task(
        description=(
            f"O analista selecionou os seguintes nomes para refinamento: {', '.join(nomes_selecionados)}\n\n"
            f"Instruções do analista: {instrucoes}\n\n"
            + negativados_txt
            + f"BRIEFING DO PROJETO:\n{j_briefing[:3000]}\n\n"
            f"TEXTO ORIGINAL:\n{briefing_texto[:1500]}\n\n"
            "Antes de listar variações, produza `plano_da_rodada` com: aprendizado dos nomes selecionados, "
            "padrões a repetir, padrões a evitar (incluindo territórios dos negativados), hipótese criativa e como esta iteração difere da anterior.\n\n"
            "Gera 6 a 9 variações dos nomes selecionados. Para cada variação entrega:\n"
            "- nome: string\n"
            "- nome_origem: qual dos nomes selecionados serviu de base\n"
            "- tipo_variacao: fonética | morfológica | semântica | híbrida\n"
            "- justificativa: 2-3 frases — como avança a estratégia\n"
            "- base_conceitual: link com territórios e arquétipos do briefing\n"
            "- dominio_sugerido: string\n"
            "- score_registrabilidade: inteiro 1-5\n\n"
            "Entrega APENAS JSON com chaves: 'plano_da_rodada' e 'variações': [array de objetos acima]."
        ),
        expected_output="JSON com campo 'variações' contendo as propostas refinadas.",
        agent=agente,
    )

    emit({"type": "agent_start", "agente": "refinamento", "index": 0})
    result = _run_with_retry(
        Crew(agents=[agente], tasks=[task], process=Process.sequential, verbose=True)
    )
    raw = _first_task_output(result)
    parsed = _json_do_llm(raw)
    emit({"type": "agent_done", "agente": "refinamento", "index": 0, "output": raw})
    emit({"type": "done"})

    return {"sucesso": True, "raw": raw, "refinamento_json": parsed}


# ---------------------------------------------------------------------------
# Extração de briefing completo — 1 agente, JSON rico com todos os campos
# ---------------------------------------------------------------------------

_BRIEFING_COMPLETO_SCHEMA = """
Analisa o texto e devolve APENAS JSON válido (sem markdown fora do JSON) com:

{
  // Step 1 — Empresa
  "empresa": "nome da empresa ou marca",
  "setor": "setor de mercado",
  "o_que_faz": "descrição clara do produto/serviço",
  "proposito": "missão ou propósito de marca",
  "mercado": "B2B | B2C | Ambos",

  // Step 2 — Público
  "publico_alvo": "perfil demográfico e comportamental do público",
  "tom_desejado": "o que o público sente e deseja (emoções e aspirações)",
  "objecoes": "principais objeções ou medos do público",
  "idioma": "pt | en | hibrido",

  // Step 3 — Territórios (escolhe 3 a 5 IDs dos disponíveis)
  "territorios_sugeridos": ["id1", "id2", "id3"],
  "atributos_por_territorio": {
    "id1": ["Atributo A", "Atributo B"],
    "id2": ["Atributo C"]
  },

  // Step 4 — Personalidade
  "arquetipos_sugeridos": ["id1", "id2"],  // 1 a 3 do total de 12
  "eixos_sugeridos": {
    "racional-emocional": 60,         // 0=Racional, 100=Emocional
    "simples-sofisticado": 45,        // 0=Simples, 100=Sofisticado
    "tradicional-inovador": 75,       // 0=Tradicional, 100=Inovador
    "acessivel-exclusivo": 40,        // 0=Acessível, 100=Exclusivo
    "contido-expressivo": 55,
    "formal-ousada": 50,
    "masculino-feminino": 50,
    "calmo-energetico": 65,
    "jovem-madura": 45,
    "equilibrado-vibrante": 60,
    "tecnica-proxima": 55,
    "tecnologica-humana": 45
  },

  // Step 5 — Diretrizes de naming (strings + pílulas para o humano clicar na UI)
  "tipos_nome_sugeridos": ["inventado", "evocativo"],  // inventado | evocativo | combinado | descritivo
  "comprimento_sugerido": "2-3",                        // "1" | "2-3" | "4+" | "sem"
  "palavras_evitar": "resumo curto ou vazio; detalhe nas pílulas",
  "nomes_inspiram": "resumo curto ou vazio",
  "nomes_negativar": "resumo curto ou vazio",
  "sinonimos_gosto": "resumo curto ou vazio",
  "outras_notas_naming": "resumo curto ou vazio",
  "sinonimos_gosto_sugeridos": ["8 a 14 termos curtos, ex.: luz, vínculo, precisão"],
  "palavras_evitar_sugeridas": ["6 a 12 raízes/sílabas ou clichés a evitar"],
  "nomes_inspiram_sugeridos": ["4 a 8 marcas de referência plausíveis no setor (só tom, sem copiar)"],
  "nomes_negativar_sugeridos": ["4 a 8 nomes ou padrões a evitar"],
  "outras_notas_sugeridas": ["4 a 8 notas curtas opcionais (pronúncia, mercado, duplo sentido)"],
  "extensoes_sugeridas": ["com.br", "com"]  // com.br | com | io | app — inclui várias se fizer sentido
}

IDs de territórios válidos:
funcional-racional, emocional-humano, status-poder, inovacao-futuro,
sustentabilidade-proposito, resultado-performance, simplicidade, comunidade,
criatividade, jornada, seguranca, energia, bem-estar, conhecimento, diversao, tempo-legado

IDs de arquétipos válidos:
cuidador, sabio, inocente, heroi, explorador, criador, governante, mago, fora-da-lei, bobo, amante, cara-comum

O campo "empresa" é OBRIGATÓRIO: se não houver nome oficial, inventa um rótulo provisório útil
(ex.: "Nova marca [setor]" ou nome tirado do desafio). Nunca devolvas "empresa" vazia.

Para "proposito", "publico_alvo", "tom_desejado", "objecoes": completa com inferência profissional
quando o texto for parcial — o cliente pode editar depois.

Preenche sempre os arrays *_sugeridos com itens concretos (pílulas), não listas vazias.
"""


def extrair_briefing_completo(
    briefing_texto: str,
) -> dict[str, Any]:
    """
    Roda 1 agente especializado e devolve o JSON completo do briefing,
    pronto para mapCrewBriefingToState no frontend.
    """
    llm_id = _resolve_llm_id()
    p = _load_prompt("briefing")

    agente = Agent(
        role=p.get("role", "Especialista em extração de briefing de marca"),
        goal=p.get("goal", "Extrair um briefing completo a partir do texto bruto."),
        backstory=p.get("backstory", ""),
        llm=llm_id,
        verbose=True,
    )
    task = Task(
        description=(
            "Lê o texto abaixo e preenche o JSON de briefing completo com todos os campos.\n"
            + _BRIEFING_COMPLETO_SCHEMA
            + f"\n\nTEXTO BRUTO:\n---\n{briefing_texto}\n---"
        ),
        expected_output="JSON completo de briefing conforme o schema acima.",
        agent=agente,
    )
    result = _run_with_retry(
        Crew(agents=[agente], tasks=[task], process=Process.sequential, verbose=True)
    )
    raw = _first_task_output(result)
    parsed = _json_do_llm(raw)
    return {"sucesso": True, "briefing": raw, "briefing_json": parsed}


# ---------------------------------------------------------------------------
# Sugestão de concorrentes — 1 agente, JSON com 3–5 entradas
# ---------------------------------------------------------------------------

def sugerir_concorrentes(
    briefing_texto: str,
    briefing_estruturado: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Usa 1 agente para sugerir 3–10 concorrentes com base no briefing.
    Retorna JSON com campo 'concorrentes': [{nome, tipo, resumo}].
    """
    llm_id = _resolve_llm_id()
    serper_key = (os.environ.get("SERPER_API_KEY") or "").strip()
    use_serper = bool(serper_key)
    tools = [SerperDevTool()] if use_serper else []

    context = (
        json.dumps(briefing_estruturado, ensure_ascii=False, indent=2)
        if briefing_estruturado
        else ""
    )

    setor = ""
    o_que_faz = ""
    if briefing_estruturado and isinstance(briefing_estruturado, dict):
        setor = str(briefing_estruturado.get("setor") or "")
        o_que_faz = str(briefing_estruturado.get("o_que_faz") or "")

    busca_txt = (
        f'Pesquisa na web: "{setor} empresas concorrentes", "{o_que_faz} marcas", "{setor} startups brasil". '
        if use_serper and (setor or o_que_faz)
        else "Sem acesso web — usa conhecimento treinado para identificar players reais do setor. "
    )

    p = _load_prompt("sugerir_concorrentes")
    agente = Agent(
        role=p.get("role", "Especialista em análise de mercado e benchmarking competitivo"),
        goal=p.get("goal", "Identificar concorrentes relevantes com base no briefing da marca."),
        backstory=p.get("backstory", ""),
        tools=tools,
        llm=llm_id,
        verbose=True,
    )

    task = Task(
        description=(
            busca_txt
            + "Identifica entre 3 e 10 concorrentes ou marcas de referência para este projeto de naming.\n\n"
            "PRIORIDADE: comece pelos concorrentes DIRETOS — empresas que competem pelo mesmo cliente, "
            "com a mesma solução, no mesmo mercado. Só depois adicione indiretos (segmento adjacente "
            "ou referência de naming/posicionamento) para completar o mapa.\n\n"
            "A classificação é obrigatória e deve ser precisa:\n"
            '- "direto": compete pela mesma escolha de compra do mesmo público\n'
            '- "indireto": não compete diretamente, mas define códigos, linguagem ou expectativa do mercado\n\n'
            "Analisa os NOMES dos concorrentes para extrair o que o mercado já aceita e o que a nova marca deve evitar.\n\n"
            "Entrega APENAS JSON válido com:\n"
            "{\n"
            '  "padroes_mercado_aceita": ["padrões de naming percebidos nos concorrentes"],\n'
            '  "cliches_setor": ["termos, sufixos, estilos ou estruturas saturadas"],\n'
            '  "espacos_livres_naming": ["oportunidades para diferenciar a nova marca"],\n'
            '  "concorrentes": [\n'
            "    {\n"
            '      "nome": "Nome da marca",\n'
            '      "tipo": "direto",\n'
            '      "resumo": "Análise de 2-4 frases: posicionamento, tom de naming, pontos relevantes para diferenciação",\n'
            '      "estilo_naming": "descritivo | evocativo | composto | neologismo | híbrido | institucional",\n'
            '      "padroes_nome_aceitos": ["o que este nome indica que o mercado aceita"],\n'
            '      "cliches_a_evitar": ["o que não copiar deste nome"],\n'
            '      "oportunidade_diferenciacao": "como a nova marca pode se afastar desse padrão"\n'
            "    }\n"
            "  ]\n"
            "}\n\n"
            'Valores válidos para "tipo": "direto" ou "indireto".\n\n'
            f"BRIEFING ESTRUTURADO:\n{context[:2000]}\n\n"
            f"TEXTO ORIGINAL:\n{briefing_texto[:1500]}\n"
        ),
        expected_output="JSON com campo 'concorrentes' contendo 3 a 10 entradas, priorizando diretos.",
        agent=agente,
    )

    result = _run_with_retry(
        Crew(agents=[agente], tasks=[task], process=Process.sequential, verbose=True)
    )
    raw = _first_task_output(result)
    parsed = _json_do_llm(raw)
    return {"sucesso": True, "raw": raw, "concorrentes_json": parsed}


def analisar_concorrente(
    nome: str,
    tipo: str,
    briefing_texto: str,
    briefing_estruturado: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Analisa um único concorrente no contexto do briefing.
    Retorna JSON com campo 'resumo': string.
    """
    llm_id = _resolve_llm_id()
    context = (
        json.dumps(briefing_estruturado, ensure_ascii=False, indent=2)
        if briefing_estruturado
        else ""
    )
    tipo_label = "concorrente direto (mesmo segmento e público)" if tipo == "direto" else "concorrente indireto (segmento adjacente ou referência de naming)"

    p = _load_prompt("analisar_concorrente")
    agente = Agent(
        role=p.get("role", "Especialista em análise de naming e posicionamento de marca"),
        goal=p.get("goal", "Analisar um concorrente em profundidade para apoiar um projeto de naming."),
        backstory=p.get("backstory", ""),
        llm=llm_id,
        verbose=True,
    )

    task = Task(
        description=(
            f"Analisa o concorrente/marca de referência '{nome}' ({tipo_label}) "
            "no contexto do projeto de naming descrito abaixo.\n\n"
            "Entrega APENAS JSON válido:\n"
            "{\n"
            '  "resumo": "análise de 3-5 frases: posicionamento, tom de naming, pontos fortes/fracos e implicações para diferenciação",\n'
            '  "estilo_naming": "descritivo | evocativo | composto | neologismo | híbrido | institucional",\n'
            '  "padroes_nome_aceitos": ["o que este nome indica que o mercado aceita"],\n'
            '  "cliches_a_evitar": ["o que não copiar deste nome"],\n'
            '  "oportunidade_diferenciacao": "como a nova marca pode se afastar desse padrão"\n'
            "}\n\n"
            f"BRIEFING ESTRUTURADO:\n{context[:2000]}\n\n"
            f"TEXTO ORIGINAL:\n{briefing_texto[:1500]}\n"
        ),
        expected_output="JSON com campo 'resumo' contendo a análise.",
        agent=agente,
    )

    result = _run_with_retry(
        Crew(agents=[agente], tasks=[task], process=Process.sequential, verbose=True)
    )
    raw = _first_task_output(result)
    parsed = _json_do_llm(raw)
    if parsed:
        partes = [str(parsed.get("resumo", "")).strip()]
        estilo = str(parsed.get("estilo_naming", "")).strip()
        if estilo:
            partes.append(f"Estilo de naming: {estilo}.")
        padroes = parsed.get("padroes_nome_aceitos") or []
        if isinstance(padroes, list) and padroes:
            partes.append("Padrões que o mercado aceita: " + "; ".join(map(str, padroes)) + ".")
        cliches = parsed.get("cliches_a_evitar") or []
        if isinstance(cliches, list) and cliches:
            partes.append("Clichês a evitar: " + "; ".join(map(str, cliches)) + ".")
        oportunidade = str(parsed.get("oportunidade_diferenciacao", "")).strip()
        if oportunidade:
            partes.append(f"Oportunidade de diferenciação: {oportunidade}")
        resumo = "\n".join([p for p in partes if p]) or raw.strip()
    else:
        resumo = raw.strip()
    return {"sucesso": True, "resumo": resumo}


if __name__ == "__main__":
    briefing_exemplo = """
    Startup de tecnologia para saúde mental.
    App de acompanhamento emocional com IA para adultos jovens 22-35 em empresas de tech.
    Nome moderno, humano, leveza e confiança.
    Evitar: mental, saúde, psico, therapy. Funcionar em português e inglês.
    """
    resultado = rodar_crew(
        briefing_texto=briefing_exemplo,
        concorrentes_manuais=["Zenklub", "Vittude"],
        progress_callback=lambda e: print(f"[{e.get('type')}] {e.get('agente', '')}"),
    )
    print(resultado["relatorio_final"])
    with open("resultado_naming.json", "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)
    print("Salvo em resultado_naming.json")
