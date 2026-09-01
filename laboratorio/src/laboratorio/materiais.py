"""Composição e propriedades de um material. O objeto de estudo do laboratório.

O QUE É UM MATERIAL AQUI. Uma composição — quais elementos, em que fração — e um
conjunto de propriedades, cada uma com unidade, com a condição em que foi obtida
e com a origem. Propriedade sem condição é a mentira mais comum da área: o
módulo de um aço a 20 °C e a 600 °C são números diferentes, e o segundo não
avisa que é outro.

TRÊS RECUSAS, e as três vêm de erro que não se anuncia:

  - **fração que não fecha.** Composição que soma 0,97 ou 1,04 é dado corrompido,
    e o cálculo seguinte devolve valor plausível a partir dela. A tolerância é
    apertada e explícita.
  - **propriedade sem origem.** Medida, calculada e estimada não são a mesma
    coisa, e misturá-las faz um palpite herdar a autoridade de um ensaio.
  - **propriedade sem condição.** Ver acima; é a que mais custa.

O QUE ESTE MÓDULO NÃO FAZ. Não calcula nada. Ele não sabe regra de mistura, não
prevê resistência e não converte propriedade. Cálculo é instrumento, e
instrumento declara domínio — aqui só mora o dado e a disciplina dele.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .erros import falhar
from .identidade import identificar
from .unidades import Grandeza

FORMATO_MATERIAL = "lab.material@1"
FORMATO_PROPRIEDADE = "lab.propriedade@1"

#: Como o valor foi obtido. A ordem NÃO é hierarquia de qualidade: um cálculo bem
#: feito bate um ensaio mal feito. A distinção existe para não se perder de vista
#: o que é medição do mundo e o que é consequência de um modelo.
ORIGENS = frozenset(("medida", "calculada", "estimada", "publicada"))

#: Soma das frações. A folga cobre arredondamento de quem digita 33,33 três
#: vezes, e nada além disso.
TOLERANCIA_FRACAO = 1e-6


@dataclass(frozen=True)
class Propriedade:
    """Um valor de propriedade, com unidade, condição e origem."""

    nome: str
    valor: Grandeza
    #: Em que condição vale: temperatura, tratamento, direção, taxa de ensaio.
    condicao: str
    origem: str
    #: Identidade da fonte, quando `publicada`. Publicada sem fonte é boato.
    fonte: str | None = None
    incerteza: Grandeza | None = None

    def __post_init__(self) -> None:
        if not self.nome.strip():
            raise falhar("contrato", "campo-vazio", "nome precisa de texto.", local="nome")
        if self.origem not in ORIGENS:
            raise falhar("contrato", "origem-invalida",
                         f"origem '{self.origem}' não existe; aceitas: {sorted(ORIGENS)}.",
                         local="origem")
        if not self.condicao.strip():
            raise falhar(
                "contrato", "propriedade-sem-condicao",
                f"'{self.nome}' não diz em que condição vale.",
                local="condicao",
                acaoSugerida="Diga ao menos a temperatura; o mesmo aço a 20 °C e a 600 °C dá números diferentes.",
            )
        if self.origem == "publicada" and not (self.fonte or "").strip():
            raise falhar("contrato", "publicada-sem-fonte",
                         f"'{self.nome}' se diz publicada e não cita fonte.", local="fonte")
        if self.incerteza is not None and not self.incerteza.comparavel_com(self.valor):
            raise falhar("contrato", "incerteza-em-outra-unidade",
                         f"'{self.nome}' mede em '{self.valor.unidade}' e a incerteza vem em "
                         f"'{self.incerteza.unidade}'.", local="incerteza")

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO_PROPRIEDADE,
            "nome": self.nome,
            "valor": self.valor.documento(),
            "condicao": self.condicao,
            "origem": self.origem,
            "fonte": self.fonte,
            "incerteza": self.incerteza.documento() if self.incerteza else None,
        }


@dataclass(frozen=True)
class Composicao:
    """Elementos e suas frações. Fração é em massa, dita e não suposta."""

    fracoes: dict[str, float]
    base: str = "massa"

    def __post_init__(self) -> None:
        if not self.fracoes:
            raise falhar("contrato", "composicao-vazia",
                         "material sem elemento não é material.", local="fracoes")
        if self.base not in ("massa", "atomica"):
            # Trocar base em silêncio muda todo número derivado: 1% de carbono em
            # massa é ~4,5% atômico no ferro.
            raise falhar("contrato", "base-invalida",
                         f"base '{self.base}' não existe; use 'massa' ou 'atomica'.",
                         local="base")
        for elemento, fracao in self.fracoes.items():
            if not isinstance(fracao, (int, float)) or isinstance(fracao, bool):
                raise falhar("contrato", "fracao-nao-numerica",
                             f"fração de '{elemento}' não é número.", local="fracoes")
            if not 0 < fracao <= 1:
                raise falhar("contrato", "fracao-fora-de-faixa",
                             f"fração de '{elemento}' é {fracao}; esperado entre 0 e 1. "
                             "Se veio em porcentagem, divida por 100 deliberadamente.",
                             local="fracoes")
        soma = sum(self.fracoes.values())
        if abs(soma - 1.0) > TOLERANCIA_FRACAO:
            raise falhar(
                "contrato", "fracoes-nao-somam-um",
                f"as frações somam {soma!r}; composição que não fecha é dado corrompido, "
                "e o cálculo seguinte devolve valor plausível a partir dela.",
                local="fracoes",
            )

    @property
    def principal(self) -> str:
        """O elemento de maior fração. Empate é resolvido pelo nome, não por sorte."""
        return max(sorted(self.fracoes), key=lambda e: self.fracoes[e])

    def documento(self) -> dict[str, Any]:
        return {"base": self.base,
                "fracoes": {k: self.fracoes[k] for k in sorted(self.fracoes)}}


@dataclass(frozen=True)
class Material:
    """Uma composição com as propriedades conhecidas dela."""

    identidade: str
    composicao: Composicao
    propriedades: tuple[Propriedade, ...] = ()
    processamento: str | None = None
    notas: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.identidade.strip():
            raise falhar("contrato", "campo-vazio", "identidade precisa de texto.",
                         local="identidade")
        vistos: set[tuple[str, str]] = set()
        for p in self.propriedades:
            chave = (p.nome, p.condicao)
            if chave in vistos:
                # Dois valores para a MESMA propriedade na MESMA condição é
                # conflito, e conflito se resolve no grafo de alegações, com as
                # duas fontes à vista — não escolhendo uma aqui em silêncio.
                raise falhar(
                    "contrato", "propriedade-repetida",
                    f"'{p.nome}' aparece duas vezes na condição '{p.condicao}'.",
                    local="propriedades",
                    acaoSugerida="Registre o conflito entre as fontes em vez de escolher uma.",
                )
            vistos.add(chave)

    def propriedade(self, nome: str, condicao: str) -> Propriedade:
        """Busca exigindo a condição: pegar 'a' propriedade sem dizer em que
        condição é o atalho que produz o número errado."""
        for p in self.propriedades:
            if p.nome == nome and p.condicao == condicao:
                return p
        conhecidas = sorted({f"{p.nome} @ {p.condicao}" for p in self.propriedades})
        raise falhar("contrato", "propriedade-ausente",
                     f"'{self.identidade}' não tem '{nome}' em '{condicao}'. "
                     f"Conhecidas: {conhecidas}.", local="propriedades")

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO_MATERIAL,
            "identidade": self.identidade,
            "composicao": self.composicao.documento(),
            "processamento": self.processamento,
            "propriedades": [p.documento() for p in self.propriedades],
            "notas": self.notas,
        }

    @property
    def id(self) -> str:
        return identificar(self.documento())
