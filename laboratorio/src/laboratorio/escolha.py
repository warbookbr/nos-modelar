"""Escolher o próximo experimento, quando cada experimento custa horas.

O PROBLEMA. Varredura cega gasta o mesmo tanto em região já conhecida e em
região que decide o estudo. Quando um ponto custa minutos, isso é desperdício
tolerável; quando custa seis horas na máquina de alguém, é o custo dominante do
laboratório inteiro.

A IDEIA, em uma frase: com os pontos já medidos, construir um palpite barato que
diz **onde ele não sabe**, e mandar o próximo experimento para onde a ignorância
é mais cara.

DUAS COISAS QUE ESTE MÓDULO NUNCA FAZ, e as duas seriam fáceis de fazer sem
querer:

  - **passar palpite por medida.** Toda saída daqui é `estimada` e vem com a
    incerteza junto. Um valor previsto que perde a etiqueta vira, três passos
    adiante, um resultado que ninguém sabe que foi inventado.
  - **extrapolar calado.** Fora da faixa medida, o palpite volta para a média e a
    incerteza explode — o que é o comportamento correto e uma resposta inútil.
    Então ele DIZ que está fora da faixa, em vez de devolver o número como se
    valesse.

POR QUE PYTHON PURO. Cada ponto custa horas, então são dezenas deles, nunca
milhões: a conta cabe sem biblioteca numérica. Trazer uma dependência pesada
para inverter uma matriz 30×30 seria pagar caro por nada — e este laboratório
não instala dependência implicitamente.

DETERMINISMO. Sem sorteio, sem reinício aleatório: o mesmo conjunto de pontos
escolhe sempre o mesmo próximo experimento, senão o estudo não se reproduz.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Sequence

from .erros import falhar

FORMATO = "lab.sugestao-de-experimento@1"

#: Abaixo disto o palpite não tem o que aprender, e fingir que tem é pior do que
#: dizer "meça mais". Dois pontos definem uma reta e nenhuma curvatura.
MINIMO_DE_PONTOS = 4

#: Ruído numérico somado à diagonal para a decomposição não falhar quando dois
#: pontos são quase iguais. É estabilização, não modelagem de ruído do ensaio.
PISO_NUMERICO = 1e-10


def _cholesky(matriz: list[list[float]]) -> list[list[float]]:
    n = len(matriz)
    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            soma = sum(L[i][k] * L[j][k] for k in range(j))
            if i == j:
                radical = matriz[i][i] - soma
                if radical <= 0:
                    raise falhar(
                        "contrato", "pontos-degenerados",
                        "Os pontos medidos são indistinguíveis para o modelo; "
                        "provavelmente há repetição exata ou escala mal escolhida.",
                        local="pontos",
                    )
                L[i][j] = math.sqrt(radical)
            else:
                L[i][j] = (matriz[i][j] - soma) / L[j][j]
    return L


def _resolver(L: list[list[float]], b: list[float]) -> list[float]:
    n = len(b)
    y = [0.0] * n
    for i in range(n):
        y[i] = (b[i] - sum(L[i][k] * y[k] for k in range(i))) / L[i][i]
    x = [0.0] * n
    for i in reversed(range(n)):
        x[i] = (y[i] - sum(L[k][i] * x[k] for k in range(i + 1, n))) / L[i][i]
    return x


@dataclass(frozen=True)
class Previsao:
    """Um palpite com a incerteza junto, e sempre marcado como palpite."""

    valor: float
    desvio: float
    dentro_da_faixa: bool
    origem: str = "estimada"

    def documento(self) -> dict[str, Any]:
        return {
            "valor": self.valor,
            "desvio": self.desvio,
            "dentroDaFaixa": self.dentro_da_faixa,
            "origem": self.origem,
        }


class Palpite:
    """Modelo barato treinado nos pontos caros. Interpola; não descobre.

    Uma coisa importante e pouco intuitiva: ele é um interpolador com barra de
    erro, não uma teoria. Se a física do problema muda de regime dentro da faixa
    medida, ele passa por cima disso suavemente e sem avisar. Ele diz onde não
    mediu; não diz onde entendeu errado.
    """

    def __init__(self, entradas: Sequence[Sequence[float]], saidas: Sequence[float],
                 *, comprimento: float | None = None) -> None:
        if len(entradas) != len(saidas):
            raise falhar("contrato", "pontos-desemparelhados",
                         f"{len(entradas)} entradas e {len(saidas)} saídas.", local="pontos")
        if len(entradas) < MINIMO_DE_PONTOS:
            raise falhar(
                "contrato", "pontos-insuficientes",
                f"{len(entradas)} pontos; o mínimo é {MINIMO_DE_PONTOS}. "
                "Dois pontos definem uma reta e nenhuma curvatura.",
                local="pontos",
                acaoSugerida="Meça alguns pontos espalhados antes de pedir sugestão.",
            )
        dimensoes = {len(e) for e in entradas}
        if len(dimensoes) != 1:
            raise falhar("contrato", "dimensao-inconsistente",
                         f"os pontos têm tamanhos diferentes: {sorted(dimensoes)}.",
                         local="pontos")
        if any(not math.isfinite(s) for s in saidas):
            raise falhar("contrato", "saida-nao-finita",
                         "há saída não finita entre os pontos medidos.", local="saidas")
        distintos = {tuple(map(float, e)) for e in entradas}
        if len(distintos) < MINIMO_DE_PONTOS:
            # Este modelo não tem termo de ruído: ele passa EXATAMENTE por cada
            # ponto. Dois valores diferentes na mesma entrada seriam uma
            # contradição que ele não sabe representar — e vários pontos iguais
            # produzem confiança altíssima numa região que foi medida uma vez só.
            raise falhar(
                "contrato", "pontos-repetidos",
                f"{len(entradas)} pontos, mas só {len(distintos)} entradas distintas; "
                f"o mínimo é {MINIMO_DE_PONTOS}.",
                local="pontos",
                acaoSugerida="Espalhe as medições; réplica no mesmo ponto este modelo não "
                             "representa, porque ele não tem termo de ruído.",
            )

        self.entradas = [list(map(float, e)) for e in entradas]
        self.saidas = [float(s) for s in saidas]
        self.d = len(self.entradas[0])
        self.minimos = [min(p[i] for p in self.entradas) for i in range(self.d)]
        self.maximos = [max(p[i] for p in self.entradas) for i in range(self.d)]
        # Normalizar por faixa: sem isso, uma variável em MPa domina uma em
        # fração de massa por ser mil vezes maior, e a escolha vira artefato de
        # unidade em vez de informação.
        self.escalas = [
            (a - b) if (a - b) > 0 else 1.0 for a, b in zip(self.maximos, self.minimos)
        ]
        self.media = sum(self.saidas) / len(self.saidas)
        variancia = sum((s - self.media) ** 2 for s in self.saidas) / len(self.saidas)
        self.amplitude = math.sqrt(variancia) if variancia > 0 else 1.0
        # Comprimento característico: metade do domínio normalizado. Escolha
        # deliberada e declarada, não ajustada por otimização — ajuste com poucos
        # pontos superajusta e produz confiança falsa.
        self.comprimento = comprimento if comprimento is not None else 0.5

        n = len(self.entradas)
        K = [[self._nucleo(self.entradas[i], self.entradas[j]) for j in range(n)]
             for i in range(n)]
        for i in range(n):
            K[i][i] += PISO_NUMERICO
        self._L = _cholesky(K)
        self._alfa = _resolver(self._L, [s - self.media for s in self.saidas])

    def _normalizar(self, ponto: Sequence[float]) -> list[float]:
        return [(v - m) / e for v, m, e in zip(ponto, self.minimos, self.escalas)]

    def _nucleo(self, a: Sequence[float], b: Sequence[float]) -> float:
        na, nb = self._normalizar(a), self._normalizar(b)
        quadrado = sum((x - y) ** 2 for x, y in zip(na, nb))
        return (self.amplitude ** 2) * math.exp(-quadrado / (2 * self.comprimento ** 2))

    def dentro_da_faixa(self, ponto: Sequence[float]) -> bool:
        return all(lo <= v <= hi for v, lo, hi in zip(ponto, self.minimos, self.maximos))

    def prever(self, ponto: Sequence[float]) -> Previsao:
        if len(ponto) != self.d:
            raise falhar("contrato", "dimensao-inconsistente",
                         f"o ponto tem {len(ponto)} coordenadas e o modelo espera {self.d}.",
                         local="ponto")
        k = [self._nucleo(ponto, e) for e in self.entradas]
        valor = self.media + sum(ki * ai for ki, ai in zip(k, self._alfa))
        v = _resolver(self._L, k)
        # A conta pode dar levemente negativa por arredondamento; zero é o piso
        # honesto, e não se esconde a origem disso.
        variancia = max(self._nucleo(ponto, ponto) - sum(vi * ki for vi, ki in zip(v, k)), 0.0)
        return Previsao(valor=valor, desvio=math.sqrt(variancia),
                        dentro_da_faixa=self.dentro_da_faixa(ponto))


def sugerir(palpite: Palpite, candidatos: Sequence[Sequence[float]], *,
            objetivo: str = "explorar", maximizar: bool = True,
            peso_da_duvida: float = 1.0) -> dict[str, Any]:
    """Escolhe o próximo experimento entre os candidatos.

    `explorar` manda medir onde a dúvida é maior — serve para mapear.
    `melhorar` mistura o valor previsto com a dúvida, para caçar o melhor ponto
    sem ficar preso no que já parece bom.

    A escolha é DETERMINÍSTICA e devolve por que aquele ponto ganhou. Sugestão
    sem motivo é oráculo, e oráculo não se audita.
    """
    if objetivo not in ("explorar", "melhorar"):
        raise falhar("contrato", "objetivo-invalido",
                     f"objetivo '{objetivo}' não existe; use 'explorar' ou 'melhorar'.",
                     local="objetivo")
    if not candidatos:
        raise falhar("contrato", "sem-candidatos",
                     "não há candidato para escolher.", local="candidatos")

    sinal = 1.0 if maximizar else -1.0
    avaliados = []
    for indice, c in enumerate(candidatos):
        p = palpite.prever(c)
        if objetivo == "explorar":
            merito = p.desvio
        else:
            merito = sinal * p.valor + peso_da_duvida * p.desvio
        avaliados.append((merito, indice, list(c), p))

    # Empate desempata pelo índice, não por sorte: reprodutibilidade.
    melhor = max(avaliados, key=lambda t: (t[0], -t[1]))
    merito, indice, ponto, previsao = melhor
    fora = [i for _, i, c, pr in avaliados if not pr.dentro_da_faixa]
    return {
        "formato": FORMATO,
        "proximo": ponto,
        "indice": indice,
        "objetivo": objetivo,
        "merito": merito,
        "previsao": previsao.documento(),
        "motivo": ("maior dúvida entre os candidatos" if objetivo == "explorar"
                   else "melhor combinação de valor previsto e dúvida"),
        # Dito sempre, mesmo quando vazio: extrapolação silenciosa é o modo de
        # falha desta ferramenta.
        "candidatosForaDaFaixaMedida": fora,
        "faixaMedida": [[lo, hi] for lo, hi in zip(palpite.minimos, palpite.maximos)],
    }
