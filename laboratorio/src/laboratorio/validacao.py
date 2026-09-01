"""Admissibilidade como composição de pareceres, nunca um booleano universal.

A REGRA. Cada validador responde `aprovado`, `reprovado`, `inconclusivo` ou
`nao-aplicavel`, com métrica, limite e justificativa. A composição desses
pareceres é o veredito — e ele carrega quais validadores rodaram, porque
"aprovado" sem essa lista é a mesma mentira que gate nunca visto vermelho.

TRÊS COISAS QUE ESTA COMPOSIÇÃO RECUSA, e as três apareceram em algum ponto deste
laboratório ou do repositório que o hospeda:

  - **inconclusivo virando aprovado.** Um validador que não conseguiu decidir NÃO
    é um validador satisfeito. Se qualquer parecer é inconclusivo, o veredito é
    `inconclusivo` — só `reprovado` tem precedência, porque uma reprovação já
    decidiu.
  - **`nao-aplicavel` disfarçando ausência.** Não aplicável é um julgamento e
    exige justificativa; sem ela, seria a forma cômoda de pular validador difícil.
  - **conjunto vazio passando.** Nenhum validador rodou não é aprovação; é a
    afirmação mais forte possível feita com a menor evidência possível.

NÃO EXISTE NÚMERO ÚNICO DE CONFIANÇA. Já é regra nas hipóteses e nas fontes; aqui
seria pior, porque um escalar convida a comparar estudos que não são comparáveis.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .erros import falhar
from .unidades import Grandeza

FORMATO = "lab.veredito@1"

PARECERES = ("aprovado", "reprovado", "inconclusivo", "nao-aplicavel")


@dataclass(frozen=True)
class Parecer:
    """O que UM validador concluiu, com o que mediu e contra que limite."""

    validador: str
    parecer: str
    justificativa: str
    medida: Grandeza | None = None
    limite: Grandeza | None = None
    detalhes: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.parecer not in PARECERES:
            raise falhar("contrato", "parecer-invalido",
                         f"parecer '{self.parecer}' não existe; aceitos: {list(PARECERES)}.",
                         local="parecer")
        if not self.justificativa.strip():
            raise falhar("contrato", "parecer-sem-justificativa",
                         f"'{self.validador}' respondeu '{self.parecer}' sem dizer por quê.",
                         local="justificativa",
                         acaoSugerida="Justifique inclusive o 'nao-aplicavel'; ele é julgamento, não omissão.")
        if self.medida is not None and self.limite is not None:
            if not self.medida.comparavel_com(self.limite):
                # Comparar medida com limite de outra unidade é o erro de unidade
                # entrando pela porta do validador, que é a última que deveria abrir.
                raise falhar(
                    "contrato", "limite-incomparavel",
                    f"'{self.validador}' compara '{self.medida.unidade}' com '{self.limite.unidade}'.",
                    local="limite",
                )
        if self.parecer == "reprovado" and self.medida is None and not self.detalhes:
            raise falhar("contrato", "reprovacao-sem-evidencia",
                         f"'{self.validador}' reprovou sem medida nem detalhe.",
                         local="medida")

    def documento(self) -> dict[str, Any]:
        return {
            "validador": self.validador,
            "parecer": self.parecer,
            "justificativa": self.justificativa,
            "medida": self.medida.documento() if self.medida else None,
            "limite": self.limite.documento() if self.limite else None,
            "detalhes": self.detalhes,
        }


def compor(pareceres: tuple[Parecer, ...], *, exigidos: tuple[str, ...] = ()) -> dict[str, Any]:
    """Compõe os pareceres num veredito que diz de que ele é feito.

    `exigidos` nomeia validadores sem os quais o veredito não pode ser
    `aprovado`. Sem essa lista, aprovar é fácil: basta rodar poucos.
    """
    if not pareceres:
        raise falhar("contrato", "sem-parecer",
                     "Nenhum validador rodou; ausência de validação não é aprovação.",
                     local="pareceres")

    nomes = [p.validador for p in pareceres]
    if len(set(nomes)) != len(nomes):
        raise falhar("contrato", "validador-repetido",
                     f"validador citado duas vezes: {sorted({n for n in nomes if nomes.count(n) > 1})}.",
                     local="pareceres")

    por_parecer = {chave: sorted(p.validador for p in pareceres if p.parecer == chave)
                   for chave in PARECERES}

    faltando = sorted(set(exigidos) - set(nomes))
    nao_rodou = sorted(v for v in exigidos if v in por_parecer["nao-aplicavel"])

    if por_parecer["reprovado"]:
        veredito = "reprovado"
    elif por_parecer["inconclusivo"]:
        veredito = "inconclusivo"
    elif faltando or nao_rodou:
        veredito = "inconclusivo"
    elif not por_parecer["aprovado"]:
        # Só `nao-aplicavel`: nada foi de fato verificado.
        veredito = "inconclusivo"
    else:
        veredito = "aprovado"

    return {
        "formato": FORMATO,
        "veredito": veredito,
        "porParecer": por_parecer,
        "exigidosAusentes": faltando,
        "exigidosNaoAplicaveis": nao_rodou,
        "pareceres": [p.documento() for p in pareceres],
    }
