"""Os documentos mínimos de uma investigação.

ESCOPO DELIBERADAMENTE PEQUENO. O dossiê descreve nove contratos; aqui existem
cinco, e cada campo presente é campo que o PRIMEIRO estudo real usa. A ordem
importa: contrato escrito antes de existir estudo é contrato adivinhado, e este
repositório já registrou que onde falta evidência o desenho fica bonito. Campo
novo entra quando um estudo precisar dele, não antes.

A REGRA QUE MAIS CUSTA, e por isso vem primeiro: **não existe hipótese
verdadeira**. Os estados são `nao-testada`, `sustentada-no-dominio-testado`,
`contradita` e `inconclusiva`. Não há escalar universal de confiança. Uma
hipótese sustentada é sustentada NAQUELE domínio, com aquelas execuções, e a
síntese carrega o domínio junto.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from .erros import falhar
from .identidade import identificar

FORMATO_ESTUDO = "lab.estudo@1"
FORMATO_HIPOTESE = "lab.hipotese@1"
FORMATO_EXECUCAO = "lab.execucao@1"
FORMATO_EVIDENCIA = "lab.evidencia@1"
FORMATO_SINTESE = "lab.sintese@1"

EstadoHipotese = Literal[
    "nao-testada", "sustentada-no-dominio-testado", "contradita", "inconclusiva"
]
ESTADOS_HIPOTESE = frozenset(
    ("nao-testada", "sustentada-no-dominio-testado", "contradita", "inconclusiva")
)
DIRECOES_EVIDENCIA = frozenset(("sustenta", "contradiz", "limita", "contextualiza"))


def _exigir_texto(valor: Any, campo: str) -> str:
    if not isinstance(valor, str) or not valor.strip():
        raise falhar(
            "contrato", "campo-vazio", f"{campo} precisa de texto não vazio.", local=campo
        )
    return valor


@dataclass(frozen=True)
class Hipotese:
    """Proposição testável, com o que a refutaria dito ANTES de medir."""

    proposicao: str
    predicao: str
    criterio_de_refutacao: str
    dominio: str
    estado: EstadoHipotese = "nao-testada"

    def __post_init__(self) -> None:
        for campo in ("proposicao", "predicao", "criterio_de_refutacao", "dominio"):
            _exigir_texto(getattr(self, campo), campo)
        if self.estado not in ESTADOS_HIPOTESE:
            raise falhar(
                "contrato",
                "estado-invalido",
                f"estado '{self.estado}' não existe; aceitos: {sorted(ESTADOS_HIPOTESE)}.",
                local="estado",
                acaoSugerida="Não existe estado 'verdadeira': o mais forte é sustentada-no-dominio-testado.",
            )

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO_HIPOTESE,
            "proposicao": self.proposicao,
            "predicao": self.predicao,
            "criterioDeRefutacao": self.criterio_de_refutacao,
            "dominio": self.dominio,
            "estado": self.estado,
        }

    @property
    def id(self) -> str:
        # A identidade NÃO inclui o estado: a hipótese é a mesma proposição
        # antes e depois de ser avaliada, e é isso que permite ligar a evidência
        # a ela sem que o id mude no meio do estudo.
        documento = self.documento()
        del documento["estado"]
        return identificar(documento)


@dataclass(frozen=True)
class Execucao:
    """Uma tentativa concreta de um instrumento, com entradas e saídas por hash."""

    instrumento: str
    versao_instrumento: str
    parametros: dict[str, Any]
    entradas: dict[str, str]
    saida: dict[str, Any]

    def __post_init__(self) -> None:
        _exigir_texto(self.instrumento, "instrumento")
        _exigir_texto(self.versao_instrumento, "versao_instrumento")

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO_EXECUCAO,
            "instrumento": self.instrumento,
            "versaoInstrumento": self.versao_instrumento,
            "parametros": self.parametros,
            "entradas": self.entradas,
            "saida": self.saida,
        }

    @property
    def id(self) -> str:
        return identificar(self.documento())


@dataclass(frozen=True)
class Evidencia:
    """Liga execuções a uma hipótese, com direção e domínio declarados."""

    hipotese_id: str
    execucoes: tuple[str, ...]
    direcao: str
    justificativa: str
    dominio: str

    def __post_init__(self) -> None:
        if self.direcao not in DIRECOES_EVIDENCIA:
            raise falhar(
                "contrato",
                "direcao-invalida",
                f"direcao '{self.direcao}' não existe; aceitas: {sorted(DIRECOES_EVIDENCIA)}.",
                local="direcao",
            )
        if not self.execucoes:
            raise falhar(
                "contrato",
                "evidencia-sem-execucao",
                "Evidência sem execução é opinião: cite ao menos uma.",
                local="execucoes",
            )
        _exigir_texto(self.justificativa, "justificativa")
        _exigir_texto(self.dominio, "dominio")

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO_EVIDENCIA,
            "hipoteseId": self.hipotese_id,
            "execucoes": list(self.execucoes),
            "direcao": self.direcao,
            "justificativa": self.justificativa,
            "dominio": self.dominio,
        }

    @property
    def id(self) -> str:
        return identificar(self.documento())


@dataclass(frozen=True)
class Estudo:
    """O envelope: a pergunta, as hipóteses e quando parar."""

    pergunta: str
    criterio_de_encerramento: str
    hipoteses: tuple[Hipotese, ...]

    def __post_init__(self) -> None:
        _exigir_texto(self.pergunta, "pergunta")
        _exigir_texto(self.criterio_de_encerramento, "criterio_de_encerramento")
        if not self.hipoteses:
            raise falhar(
                "contrato",
                "estudo-sem-hipotese",
                "Estudo sem hipótese não tem o que testar.",
                local="hipoteses",
            )

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO_ESTUDO,
            "pergunta": self.pergunta,
            "criterioDeEncerramento": self.criterio_de_encerramento,
            "hipoteses": [h.documento() for h in self.hipoteses],
        }

    @property
    def id(self) -> str:
        return identificar(self.documento())


@dataclass(frozen=True)
class Sintese:
    """O que o estudo concluiu, sem apagar o que ficou de fora."""

    estudo_id: str
    conclusoes: tuple[dict[str, Any], ...]
    limites: tuple[str, ...]
    evidencias: tuple[str, ...] = field(default=())

    def __post_init__(self) -> None:
        if not self.limites:
            raise falhar(
                "contrato",
                "sintese-sem-limite",
                "Síntese sem limite declarado promete mais do que mediu.",
                local="limites",
                acaoSugerida="Diga ao menos onde o resultado NÃO vale.",
            )
        for conclusao in self.conclusoes:
            estado = conclusao.get("estado")
            if estado not in ESTADOS_HIPOTESE:
                raise falhar(
                    "contrato",
                    "estado-invalido",
                    f"conclusão com estado '{estado}', que não existe.",
                    local="conclusoes",
                )

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO_SINTESE,
            "estudoId": self.estudo_id,
            "conclusoes": list(self.conclusoes),
            "limites": list(self.limites),
            "evidencias": list(self.evidencias),
        }

    @property
    def id(self) -> str:
        return identificar(self.documento())
