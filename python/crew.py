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
    tecnica_naming: str = ""  # portmanteau | neologismo | descritivo | aspiracional | ressignificado | acronimo | fundador | fonetico
    formula_tecnica: str = ""  # "Influence + Lab = InfluLab" / "SIGLA = Significado" / "silabas: ka+lo" / ""
    categoria: str = ""  # campo legado — igual a tecnica_naming
    territorio_estrategico: str = ""
    etimologia: str = ""
    justificativa: str = ""
    base_conceitual: str = ""
    por_que_e_diferente_dos_concorrentes: str = ""
    conexao_com_direcao_analista: str = ""
    benchmark_aprendido: str = ""
    risco_genericidade: str = ""
    risco_registro: str = ""
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
Metodo obrigatorio antes de entregar:
1. Interpreta a essencia da marca, promessa, publico, territorios e tom.
2. Usa o benchmark para identificar padroes que o mercado aceita, cliches saturados e espacos livres.
3. Cria mapa semantico interno com metaforas, raizes, sons desejaveis e palavras proibidas.
4. Gera internamente pelo menos 80 candidatos distribuidos pelas 8 tecnicas abaixo.
5. Rejeita candidatos genericos, obvios, longos demais, dificeis de pronunciar, parecidos com concorrentes ou com baixa registrabilidade.
6. Para cada finalista, testa em: pitch de 30s, app store, cartao de visita, hashtag e dominio falado em voz alta.
7. Entrega exatamente 24 propostas — o critico nao corta, apenas garante diversidade e qualidade.

AS 8 TECNICAS DE NAMING (minimo 2 propostas por tecnica, total 24):
- portmanteau: funde 2 palavras/conceitos. Formula: Palavra1 + Palavra2 = Nome. Ex: Influence+Lab=InfluLab, Trend+Space=TrendSpace, Micro+soft=Microsoft
- neologismo: palavra totalmente inventada com silabas fortes. Silabas uteis: Ka/Lo/Tra/Vox/Nex/Zen/Lum/Via. Ex: Kodak, Spotify, Nexora, Lumify
- descritivo: diz exatamente o que faz. Formula: Funcao + Beneficio. Ex: PayPal, Booking, Creator Growth, Social Reach
- aspiracional: evoca poder, futuro, movimento. Ex: Nike, Oracle, Amazon, Atlas, Nova, Horizon, Summit, Titan
- ressignificado: palavra comum em novo contexto. Ex: Apple, Slack, Uber, Pulse, Signal, Motion, Spark, Shift
- acronimo: sigla com significado estrategico. Ex: IBM, BMW, HBO, TSM=Trend Social Media, VCG=Viral Creator Group
- fundador: sobrenome ou nome pessoal para autoridade. Ex: Ford, Dell, Ferrari, Bloomberg
- fonetico: criado pela fonetica premium. Sons fortes K/X/T/Z/V. Sons premium L/M/N/R/A. Ex: Rolex, Lexus, Zara, Nvidia

Rejeita automaticamente: Tech Solutions, Prime Group, Max Business, Digital Hub, Smart Pro, Alpha Company, Global Service, Nome+Brasil, Nome+Agency, Nome+Consultoria, Nome+Company.

Entrega APENAS JSON valido (sem markdown fora do JSON) com:
{
  "plano_da_rodada": {
    "aprendizado_shortlist": [],
    "aprendizado_negativados": [],
    "padroes_a_repetir": [],
    "padroes_a_evitar": [],
    "nova_hipotese_criativa": "direcao testada nesta rodada",
    "como_esta_rodada_difere_da_anterior": "frase objetiva",
    "distribuicao_tecnicas": {"portmanteau": 3, "neologismo": 4, "descritivo": 2, "aspiracional": 3, "ressignificado": 4, "acronimo": 2, "fundador": 2, "fonetico": 4}
  },
  "processo_criativo": {
    "direcao_escolhida": "direcao principal",
    "tecnicas_exploradas": ["portmanteau","neologismo","descritivo","aspiracional","ressignificado","acronimo","fundador","fonetico"],
    "criterios_de_corte": [],
    "quantidade_gerada_internamente": 80
  },
  "propostas": [ exatamente 24 entradas ],
  "top3": [ exatamente 3 entradas ],
  "sintese_bases": "paragrafo: como as 24 propostas cobrem posicionamento, territorios e as 8 tecnicas",
  "criterios_usados": [],
  "padroes_evitados": []
}

Cada proposta OBRIGATORIAMENTE:
- "nome": string
- "tecnica_naming": portmanteau | neologismo | descritivo | aspiracional | ressignificado | acronimo | fundador | fonetico
- "formula_tecnica": portmanteau -> "Palavra1 + Palavra2 = Nome"; acronimo -> "SIGLA = Significado completo"; neologismo -> "silabas: xx+yy+zz"; outros -> ""
- "categoria": mesmo valor de tecnica_naming (campo de compatibilidade)
- "territorio_estrategico": string
- "etimologia": 1 frase sobre origem semantica
- "origem_na_matriz": "Conceito A (sinonimo) + Conceito B (sinonimo)" ou tecnica usada
- "justificativa": 2-4 frases sobre por que serve esta marca
- "base_conceitual": 2-3 frases com LINK EXPLICITO com territorios, arquetipos e briefing
- "por_que_e_diferente_dos_concorrentes": 1-2 frases
- "dominio_sugerido": ex: ".com.br", ".io"
- "alerta": riscos de confusao com marcas (string, pode ser vazio)
- "score_registrabilidade": inteiro 1-5
- "score_memorabilidade": inteiro 1-5
- "score_sonoridade": inteiro 1-5
- "score_originalidade": inteiro 1-5
- "score_potencial_premium": inteiro 1-5
- "score_final": round((registrabilidade + memorabilidade + sonoridade + originalidade + potencial_premium) / 5)

Cada top3:
- "nome": igual a uma das 24
- "justificativa": por que esta no podio
- "base_estrategica": 2-4 frases sobre como sustenta estrategia + territorios
- "defesa_para_apresentacao": como defender para o cliente

Minimo 6 propostas devem usar combinacao da matriz_sinonimos (tecnica portmanteau ou ressignificado via matriz).
SEM base_conceitual = tarefa incompleta. SEM diferenciacao vs concorrentes = tarefa incompleta.

OVERRIDE QUANDO HOUVER DIRETRIZES DO ANALISTA (bloco DIRETRIZES/APRENDIZADOS no topo):
- Se o analista especificou palavras, termos ou combinacoes preferidas: usa esses termos como
  materia-prima PRINCIPAL em pelo menos 16 das 24 propostas.
  Ex: "gosto de Tech, Go, Cache, flow" -> gera GoFlow, TechCache, CacheLab, OnFire, FireGo,
  IntFlow, FloatOn, LabFire, GoInt, CacheOn, TechOn, FireCache, etc.
  Combina sistematicamente as palavras indicadas entre si e com sinonimos da marca.
- A distribuicao minima por tecnica e FLEXIVEL quando ha direcao clara do analista.
  Concentra nas tecnicas que melhor servem ao feedback (portmanteau com as palavras indicadas,
  neologismo com as silabas, fonetico com os sons). Nao ha trava de "minimo 2 por tecnica".
- Para cada nome na shortlist aprovada: gera pelo menos 2 variacoes/extensoes proximas
  (mesma tecnica, campo semantico adjacente, combinacao com outro sinonimo da matriz).
  Ex: shortlist "TrendSpace" -> gera "TrendHub", "TrendFlow", "WaveSpace", "PulseArena".
- Para cada nome NEGATIVADO: identifica o RADICAL e o PADRAO do nome negativado e REJEITA
  qualquer nome com esse radical, prefixo, sufixo ou estrutura similar.
  Ex: negativado "InnovBridge" -> radical "Innov" -> rejeitar Innova*, Innove*, InnovX*,
  InnovaWave, InnovaGrid, InnovaHub, etc. Explorar o oposto: simplicidade, concretude, etc.
- Nomes que violam negativados ou ignoram as palavras preferidas = tarefa incompleta.

AJUSTE DE PRIORIDADE CRIATIVA:
- As regras anti-generico acima sao sinais de risco, nao bloqueios absolutos. Nao censure cedo.
- Benchmark e cliches do mercado sao referencia de aprendizado, nao prioridade acima do briefing ou do analista.
- Se houver conflito entre benchmark e direcao criativa do analista, siga a direcao do analista e explique o risco.
- Termos como Tech, Lab, Digital, AI, Flow, Go, On, Fire, Cache, Int ou Float nao sao proibidos se o analista demonstrar gosto por eles. Use como materia-prima, raiz, inspiracao ou ressignificacao.
- As 8 tecnicas sao repertorio criativo, nao grade obrigatoria. Nao force sigla, fundador ou descritivo se nao fizer sentido.
- Negativados ensinam padroes rejeitados, nao proíbem automaticamente todos os radicais contidos neles. Se um termo aparece em negativado mas tambem foi pedido pelo analista, preserve o termo e mude a estrutura.
- Para cada proposta, marque risco_genericidade e risco_registro quando relevante, mas nao elimine automaticamente nomes simples que tenham clareza comercial ou potencial de curadoria.
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
Inclui TODOS os 24 nomes das propostas. Score 5 = excelente pronuncia + memorabilidade em PT e EN.
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

    # Extrai diretrizes + aprendizados + feedback do analista do briefing_texto.
    # Captura desde '## Diretrizes explícitas de naming' até o fim do texto,
    # incluindo '## Aprendizados e repertório acumulado' (onde fica o feedback_rodada).
    import re as _re
    _dir_match = _re.search(r'(## Diretrizes explícitas de naming[\s\S]*)', briefing_texto)
    _dir_txt = _dir_match.group(1).strip() if _dir_match else ""
    # Se não tiver diretrizes mas tiver aprendizados/feedback, extrai só essa seção
    if not _dir_txt:
        _apr_match = _re.search(r'(## Aprendizados[\s\S]*)', briefing_texto)
        _dir_txt = _apr_match.group(1).strip() if _apr_match else ""
    bloco_diretrizes = (
        "\n\nDIRETRIZES E FEEDBACK OBRIGATÓRIOS DO ANALISTA — prioridade máxima, seguir rigorosamente:\n"
        + _dir_txt + "\n\n"
        if _dir_txt
        else ""
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
                bloco_diretrizes
                + "Antes de criar nomes, transforma briefing e benchmark num mapa estratégico-semântico. "
                "Se existem DIRETRIZES OBRIGATÓRIAS DO ANALISTA acima, usa os termos de 'Sinônimos ou termos de que gosta' "
                "como conceitos-chave prioritários na matriz_sinonimos. "
                "Não gere nomes. Entrega APENAS JSON válido com:\n"
                "{\n"
                '  "essencia_marca": "...",\n'
                '  "tensao_central": "...",\n'
                '  "promessa_verbal": "...",\n'
                '  "territorios_criativos": [{"nome": "...", "ideia": "...", "por_que_importa": "...", "riscos": "..."}],\n'
                '  "mapa_semantico": {"campos": [], "metaforas": [], "verbos": [], "raizes_possiveis": [], "sons_desejados": [], "palavras_evitar": []},\n'
                '  "matriz_sinonimos": {\n'
                '    "instrucao": "Para cada conceito-chave da marca, lista 6-10 sinônimos e traduções em PT, EN, FR, ES, LA",\n'
                '    "conceitos": [\n'
                '      {\n'
                '        "conceito": "nome do conceito (ex: influência, tendência, conexão)",\n'
                '        "por_que_importa": "por que este conceito é central para a marca",\n'
                '        "sinonimos_pt": ["palavra1", "palavra2"],\n'
                '        "sinonimos_en": ["word1", "word2"],\n'
                '        "sinonimos_outros": ["mot1 (FR)", "palabra1 (ES)", "radix1 (LA)"],\n'
                '        "combinacoes_sugeridas": ["ConceptoA + SinonimoB = NomePossivel"]\n'
                '      }\n'
                '    ]\n'
                '  },\n'
                '  "codigos_do_mercado": {"padroes_aceitos": [], "padroes_saturados": [], "oportunidades_de_contraste": []},\n'
                '  "criterios_de_naming": []\n'
                "}\n"
                "A matriz_sinonimos é OBRIGATÓRIA: lista no mínimo 3 conceitos-chave, cada um com 6+ sinônimos e pelo menos 3 combinacoes_sugeridas.\n"
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
                bloco_diretrizes
                + "Gera 24 propostas de nome usando as 8 tecnicas de naming (minimo 2 por tecnica). "
                "Nunca comeca pelos nomes: primeiro usa briefing + benchmark para inferir essencia, territorios, "
                "padroes aceitos pelo mercado, cliches do setor e espacos livres. "
                "Usa a matriz_sinonimos para combinacoes intencionais (portmanteau/ressignificado via matriz).\n"
                "Para portmanteau: combina sistematicamente sinonimos de conceitos diferentes da matriz. "
                "Ex: [sinonimos de tendencia] x [sinonimos de espaco] -> TrendSpace, WaveHub, PulseArena.\n"
                "Para neologismo: mistura silabas fortes com boa sonoridade. "
                "Para fonetico: usa sons K/X/T/Z/V (forcas) e L/M/N/R/A (premium).\n"
                + bloco_briefing
                + f"\nBRIEFING ESTRUTURADO:\n{briefing_out[:2000]}\n"
                + f"\nBENCHMARK (concorrentes, padrões aceitos e clichês):\n{benchmark_out[:3000]}\n"
                + f"\nESTRATÉGIA SEMÂNTICA (usar como mapa obrigatório):\n{semantica_out[:3500]}\n"
                + TASK_NAMING_SCHEMA
            ),
            expected_output="JSON com exatamente 24 propostas (8 tecnicas x 3) + top3 + sintese_bases; tecnica_naming, formula_tecnica e base_conceitual obrigatorias por proposta.",
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
                bloco_diretrizes
                + "Recebeste 24 propostas de nome e as colisoes com marcas globais ja identificadas. "
                "Tua missao: garantir qualidade, variedade util e obediencia a direcao do analista — NAO cortes o numero (mantem 24). "
                "As tecnicas de naming sao repertorio, nao grade obrigatoria: nao force minimo por tecnica. "
                "Nomes simples ou descritivos nao devem ser removidos automaticamente; marque risco_genericidade quando houver. "
                "ATENCAO: Se ha DIRETRIZES E FEEDBACK OBRIGATORIOS acima, PRIORIZA manter ou substituir por nomes que usam "
                "as palavras/termos preferidos do analista. NAO substituas nomes que seguem as preferencias por genericos. "
                "Verifica tambem: nomes que repetem claramente a ESTRUTURA rejeitada de nomes NEGATIVADOS devem ser substituidos. "
                "Nao proiba automaticamente todo radical de negativado se o analista tambem gosta daquele termo. "
                "Para cada problema grave encontrado, substitui por alternativa melhor com tecnica_naming adequada e mesmo schema completo. "
                "Entrega APENAS JSON valido no mesmo formato de naming, com exatamente 24 propostas, top3 atualizado, "
                "e campos: critica_resumo (str), nomes_substituidos [{nome, motivo, substituto}], ajustes_feitos (str), "
                "diversidade_tecnicas {tecnica: contagem}, riscos_mantidos [{nome, risco, motivo}].\n"
                "O top3 deve ser uma lista de 3 OBJETOS (nao strings) com: nome, justificativa, base_estrategica, defesa_para_apresentacao.\n"
                f"\nBRIEFING:\n{briefing_out[:1800]}"
                f"\nBENCHMARK:\n{benchmark_out[:2200]}"
                f"\nESTRATEGIA SEMANTICA:\n{semantica_out[:3500]}"
                f"\nCOLISOES COM MARCAS GLOBAIS:\n{colisoes_out[:1500]}"
                f"\nNOMES GERADOS (24 propostas):\n{naming_out[:24000]}"
                "\nCriterios de substituicao: genericidade, baixa sonoridade, colisao confirmada, tecnica sub-representada, distancia do briefing, variacao de negativado."
            ),
            expected_output="JSON revisado com exatamente 24 propostas, tecnicas diversificadas e top3 como lista de objetos.",
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
                f"\nOUTPUT DE NAMING (extrai os nomes das propostas):\n{naming_out[:20000]}\n"
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
                "Avalia preliminarmente TODOS os 24 nomes e aprofunda o top 3. "
                "Não dê parecer jurídico. Produz APENAS JSON com:\n"
                "{\n"
                '  "avaliacoes": [{"nome": "...", "risco_preliminar": "baixo|medio|alto", "risco_genericidade": "baixo|medio|alto", "queries_inpi": [], "queries_google": [], "motivo": ""}],\n'
                '  "top3_aprofundado": [{"nome": "...", "classes_ncl_provaveis": [], "dominios": [], "handles_redes": [], "recomendacao": ""}],\n'
                '  "aviso": "Triagem preliminar; não substitui busca profissional no INPI nem parecer jurídico."\n'
                "}\n"
                f"\nNOMES GERADOS:\n{naming_out[:12000]}"
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
                "Analisa foneticamente TODOS os 24 nomes do passo de naming.\n"
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
                "## Alternativas (outras 21 com linha de base por nome)\n## Proximos passos\n## Linha de posicionamento\n"
                "Referencia bases dos nomes de topo e destaca melhores scores foneticos. Tom profissional, em portugues.\n"
                f"\n### BRIEFING:\n{briefing_out[:2000]}"
                f"\n### BENCHMARK:\n{benchmark_out[:1500]}"
                f"\n### NAMING (24 propostas + top3):\n{naming_out[:8000]}"
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
                "Consolida os 24 nomes finais e calcula ranking estratégico. Entrega APENAS JSON válido com:\n"
                "{\n"
                '  "pesos": {"aderencia_briefing": 20, "originalidade": 15, "memorabilidade": 15, "sonoridade": 15, "diferenciacao_competitiva": 15, "registrabilidade_preliminar": 10, "potencial_premium": 10},\n'
                '  "todos_nomes": [{"nome": "...", "score_final": 0, "tecnica_naming": "...", "motivo": "...", "principal_risco": "..."}],\n'
                '  "top3": [{"nome": "...", "posicao": 1, "justificativa": "por que este nome ganhou", "base_estrategica": "como sustenta estrategia + territorios", "defesa_para_apresentacao": "como defender para o cliente", "principal_risco": "..."}],\n'
                '  "recomendacao_final": "..."\n'
                "}\n"
                f"\nBRIEFING:\n{briefing_out[:1800]}"
                f"\nBENCHMARK:\n{benchmark_out[:1800]}"
                f"\nNOMES REVISADOS:\n{naming_out[:8000]}"
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
