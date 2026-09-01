"""Grandezas com dimensão. Número nu não atravessa interface científica.

POR QUE ISTO EXISTE. O erro de unidade não levanta exceção, não deixa rastro e
não parece erro: ele devolve um número plausível, na ordem de grandeza errada, e
sobrevive a toda revisão que olhe só para o código. Somar milímetro com metro é a
mesma classe de falha que o laboratório já enfrentou duas vezes com outro rosto —
o instrumento que media sempre a mesma coisa parecendo varredura, e o passo que
recebe vazio e devolve número plausível. Em todos, o resultado É plausível.

O QUE ESTE MÓDULO FAZ E O QUE NÃO FAZ. Ele carrega dimensão junto do número e
recusa operação dimensionalmente inválida. Ele NÃO tem tabela de unidades do
mundo, NÃO adivinha conversão e NÃO aceita fator de conversão implícito: quem
converte declara o fator, e o fator entra no registro. Uma tabela grande aqui
seria adivinhação de qual unidade o laboratório vai usar — e este repositório já
registrou que onde falta evidência o desenho fica bonito.

DIMENSÃO NÃO É UNIDADE. Metro e milímetro têm a MESMA dimensão e NÃO são
intercambiáveis; por isso a comparação exige unidade igual, não dimensão igual.
Confundir os dois é como confundir "tem o mesmo tipo" com "é o mesmo valor".
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from .erros import falhar

FORMATO = "lab.grandeza@1"

#: Bases dimensionais do SI usadas aqui. Adimensional é o expoente todo zero, e
#: tem nome próprio porque ângulo e razão precisam existir sem virar "número nu".
BASES = ("comprimento", "massa", "tempo", "corrente", "temperatura", "quantidade", "luminosidade")

Dimensao = tuple[int, ...]

ADIMENSIONAL: Dimensao = (0,) * len(BASES)


def dimensao(**expoentes: int) -> Dimensao:
    """Monta uma dimensão a partir das bases nomeadas."""
    desconhecidas = sorted(set(expoentes) - set(BASES))
    if desconhecidas:
        raise falhar("contrato", "base-dimensional-desconhecida",
                     f"{desconhecidas} não são bases; aceitas: {list(BASES)}.",
                     local="dimensao")
    return tuple(int(expoentes.get(base, 0)) for base in BASES)


COMPRIMENTO = dimensao(comprimento=1)
AREA = dimensao(comprimento=2)
VOLUME = dimensao(comprimento=3)
ANGULO = ADIMENSIONAL
RAZAO = ADIMENSIONAL


def escrever(d: Dimensao) -> str:
    partes = [f"{b}^{e}" for b, e in zip(BASES, d) if e]
    return "·".join(partes) if partes else "adimensional"


@dataclass(frozen=True)
class Grandeza:
    """Um valor, sua unidade e sua dimensão — os três juntos ou nenhum."""

    valor: float
    unidade: str
    dimensao: Dimensao

    def __post_init__(self) -> None:
        if not isinstance(self.valor, (int, float)) or isinstance(self.valor, bool):
            raise falhar("contrato", "valor-nao-numerico",
                         f"valor '{self.valor!r}' não é número.", local="valor")
        if not math.isfinite(self.valor):
            # NaN e infinito atravessam contas inteiras sem reclamar e envenenam
            # a comparação: NaN != NaN faz um teste de igualdade passar por fora.
            raise falhar("contrato", "valor-nao-finito",
                         f"valor {self.valor} não é finito; ele contamina a conta em silêncio.",
                         local="valor")
        if not self.unidade.strip():
            raise falhar("contrato", "unidade-vazia",
                         "grandeza sem unidade é número nu com outro nome.", local="unidade")
        if len(self.dimensao) != len(BASES):
            raise falhar("contrato", "dimensao-malformada",
                         f"dimensão precisa de {len(BASES)} expoentes.", local="dimensao")

    def _exigir_mesma_unidade(self, outra: Grandeza, operacao: str) -> None:
        if self.dimensao != outra.dimensao:
            raise falhar(
                "contrato", "dimensao-incompativel",
                f"{operacao} entre {escrever(self.dimensao)} e {escrever(outra.dimensao)}.",
                local="dimensao",
            )
        if self.unidade != outra.unidade:
            # Mesma dimensão, unidades diferentes: metro e milímetro. Converter
            # aqui em silêncio seria escolher um fator no lugar de quem mede.
            raise falhar(
                "contrato", "unidade-incompativel",
                f"{operacao} entre '{self.unidade}' e '{outra.unidade}'; mesma dimensão não é mesma unidade.",
                local="unidade",
                acaoSugerida="Converta explicitamente com converter(), declarando o fator.",
            )

    def __add__(self, outra: Grandeza) -> Grandeza:
        self._exigir_mesma_unidade(outra, "soma")
        return Grandeza(self.valor + outra.valor, self.unidade, self.dimensao)

    def __sub__(self, outra: Grandeza) -> Grandeza:
        self._exigir_mesma_unidade(outra, "subtração")
        return Grandeza(self.valor - outra.valor, self.unidade, self.dimensao)

    def __mul__(self, outra: Grandeza | float) -> Grandeza:
        if isinstance(outra, Grandeza):
            return Grandeza(
                self.valor * outra.valor,
                f"{self.unidade}·{outra.unidade}",
                tuple(a + b for a, b in zip(self.dimensao, outra.dimensao)),
            )
        return Grandeza(self.valor * outra, self.unidade, self.dimensao)

    def __truediv__(self, outra: Grandeza | float) -> Grandeza:
        if isinstance(outra, Grandeza):
            if outra.valor == 0:
                raise falhar("contrato", "divisao-por-zero",
                             "divisão por grandeza de valor zero.", local="valor")
            unidade = self.unidade if self.unidade == outra.unidade else f"{self.unidade}/{outra.unidade}"
            dim = tuple(a - b for a, b in zip(self.dimensao, outra.dimensao))
            # Razão de mesma unidade é adimensional, e a unidade some junto:
            # deixar "mm/mm" seria carregar unidade que não existe mais.
            return Grandeza(self.valor / outra.valor, "1" if dim == ADIMENSIONAL else unidade, dim)
        if outra == 0:
            raise falhar("contrato", "divisao-por-zero", "divisão por zero.", local="valor")
        return Grandeza(self.valor / outra, self.unidade, self.dimensao)

    def comparavel_com(self, outra: Grandeza) -> bool:
        return self.dimensao == outra.dimensao and self.unidade == outra.unidade

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO,
            "valor": self.valor,
            "unidade": self.unidade,
            "dimensao": escrever(self.dimensao),
        }


def converter(grandeza: Grandeza, para: str, fator: float, *, justificativa: str) -> Grandeza:
    """Converte declarando o fator e por que ele é esse.

    A justificativa é obrigatória porque fator sem origem é o erro de unidade
    disfarçado de conversão: ele passa na revisão exatamente por parecer uma.
    """
    if not justificativa.strip():
        raise falhar("contrato", "conversao-sem-justificativa",
                     f"conversão de '{grandeza.unidade}' para '{para}' sem dizer de onde vem o fator.",
                     local="justificativa")
    if not math.isfinite(fator) or fator == 0:
        raise falhar("contrato", "fator-invalido",
                     f"fator {fator} não serve para conversão.", local="fator")
    if not para.strip():
        raise falhar("contrato", "unidade-vazia", "unidade de destino vazia.", local="para")
    # A dimensão NÃO muda numa conversão: converter mm para m é a mesma grandeza
    # física. Fator que mudasse dimensão seria outra conta, não conversão.
    return Grandeza(grandeza.valor * fator, para, grandeza.dimensao)
