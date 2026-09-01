"""Achar a relação que os pontos sustentam, em vez de devolver tabela.

A DIFERENÇA QUE ISTO FAZ. "Medi 40 pontos, aqui estão" é dado. "A resistência
cresce com o inverso da raiz do tamanho de grão" é conhecimento: vale fora dos
pontos medidos, dá para conferir contra teoria, e cabe numa frase.

COMO, E POR QUE ASSIM. Este módulo NÃO inventa fórmula livremente. Ele testa um
catálogo pequeno de formas que já significam alguma coisa em materiais — reta,
potência, exponencial, inverso da raiz (que é a forma de Hall-Petch) — e diz qual
descreve melhor, com o erro. Busca livre de fórmula, com poucos pontos caros,
acha sempre alguma coisa: quanto mais liberdade, mais fácil ajustar ruído e
chamar isso de lei.

TRÊS RECUSAS QUE SUSTENTAM O RESULTADO:

  - **ajuste não é explicação.** O resultado carrega o erro e o número de pontos,
    e nunca diz "a lei é". Diz qual forma descreve melhor os dados que existem.
  - **forma que não se aplica não compete.** Potência com x negativo, log de
    zero: em vez de virar `nan` e sumir da comparação, a forma é marcada
    `nao-aplicavel` com o motivo.
  - **poucos pontos por parâmetro não vale.** Uma forma de dois parâmetros
    ajustada em três pontos passa por qualquer coisa. O mínimo é declarado e a
    forma é recusada, não silenciosamente premiada.

E O AVISO QUE VAI JUNTO DE TODO RESULTADO: coincidir com uma forma não explica
por quê. Duas causas diferentes produzem a mesma curva o tempo todo.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Callable, Sequence

from .erros import falhar

FORMATO = "lab.lei-candidata@1"

#: Pontos por parâmetro livre. Abaixo disso o ajuste descreve o ruído.
PONTOS_POR_PARAMETRO = 3


@dataclass(frozen=True)
class Forma:
    """Uma relação candidata: como transformar x e y para virar uma reta."""

    nome: str
    expressao: str
    #: Por que essa forma faz sentido em materiais. Forma sem significado é
    #: pescaria — e pescaria com poucos pontos sempre pesca alguma coisa.
    significado: str
    de_x: Callable[[float], float]
    de_y: Callable[[float], float]
    #: Monta a frase final a partir dos coeficientes da reta ajustada.
    escrever: Callable[[float, float], str]
    parametros: int = 2


def _reta(xs: Sequence[float], ys: Sequence[float]) -> tuple[float, float]:
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx == 0:
        raise falhar("contrato", "x-constante",
                     "todos os x são iguais; não há relação para achar.", local="pontos")
    a = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
    return a, my - a * mx


FORMAS: tuple[Forma, ...] = (
    Forma("linear", "y = a·x + b",
          "proporção direta; a base de comparação para as outras",
          lambda x: x, lambda y: y,
          lambda a, b: f"y = {a:.6g}·x + {b:.6g}"),
    Forma("potencia", "y = b·x^a",
          "leis de escala; expoente costuma ter significado físico",
          math.log, math.log,
          lambda a, b: f"y = {math.exp(b):.6g}·x^{a:.6g}"),
    Forma("exponencial", "y = b·e^(a·x)",
          "processos ativados, como difusão com temperatura",
          lambda x: x, math.log,
          lambda a, b: f"y = {math.exp(b):.6g}·e^({a:.6g}·x)"),
    Forma("inverso-da-raiz", "y = a/√x + b",
          "forma de Hall-Petch: resistência contra tamanho de grão",
          lambda x: 1.0 / math.sqrt(x), lambda y: y,
          lambda a, b: f"y = {a:.6g}/√x + {b:.6g}"),
    Forma("logaritmica", "y = a·ln(x) + b",
          "encruamento e saturação",
          math.log, lambda y: y,
          lambda a, b: f"y = {a:.6g}·ln(x) + {b:.6g}"),
)


def _avaliar(forma: Forma, xs: Sequence[float], ys: Sequence[float]) -> dict[str, Any]:
    try:
        tx = [forma.de_x(x) for x in xs]
        ty = [forma.de_y(y) for y in ys]
    except (ValueError, ZeroDivisionError) as erro:
        # Marcada, não sumida: uma forma que vira `nan` e desaparece da
        # comparação faz a vencedora parecer melhor do que é.
        return {"forma": forma.nome, "estado": "nao-aplicavel",
                "motivo": f"a transformação não vale para estes dados ({erro})."}
    if any(not math.isfinite(v) for v in tx + ty):
        return {"forma": forma.nome, "estado": "nao-aplicavel",
                "motivo": "a transformação produziu valor não finito."}

    a, b = _reta(tx, ty)
    previstos = [a * x + b for x in tx]
    media = sum(ty) / len(ty)
    total = sum((y - media) ** 2 for y in ty)
    residuo = sum((y - p) ** 2 for y, p in zip(ty, previstos))
    # R² do espaço TRANSFORMADO. Dito porque comparar R² entre transformações
    # diferentes é comparar coisas diferentes — e é o erro clássico desta conta.
    r2 = 1.0 - residuo / total if total > 0 else 0.0

    # Erro no espaço ORIGINAL, que é onde a pergunta vive.
    erros = []
    for x, y in zip(xs, ys):
        try:
            previsto_y = _inverter(forma, a * forma.de_x(x) + b)
        except (ValueError, OverflowError):
            return {"forma": forma.nome, "estado": "nao-aplicavel",
                    "motivo": "não foi possível voltar ao espaço original."}
        erros.append(abs(previsto_y - y))
    return {
        "forma": forma.nome,
        "estado": "ajustada",
        "expressao": forma.escrever(a, b),
        "significado": forma.significado,
        "r2NoEspacoTransformado": r2,
        "erroMedioAbsoluto": sum(erros) / len(erros),
        "erroMaximo": max(erros),
        "coeficientes": {"a": a, "b": b},
    }


def _inverter(forma: Forma, valor: float) -> float:
    return math.exp(valor) if forma.de_y is math.log else valor


def procurar(xs: Sequence[float], ys: Sequence[float]) -> dict[str, Any]:
    """Testa o catálogo e ordena pelo erro no espaço original.

    Ordena por erro real, e NÃO por R², justamente porque R² de espaços
    transformados diferentes não é comparável entre si.
    """
    if len(xs) != len(ys):
        raise falhar("contrato", "pontos-desemparelhados",
                     f"{len(xs)} x e {len(ys)} y.", local="pontos")
    minimo = PONTOS_POR_PARAMETRO * 2
    if len(xs) < minimo:
        raise falhar(
            "contrato", "pontos-insuficientes",
            f"{len(xs)} pontos para formas de 2 parâmetros; o mínimo é {minimo}.",
            local="pontos",
            acaoSugerida="Meça mais pontos; ajuste com poucos pontos descreve o ruído.",
        )
    if any(not math.isfinite(v) for v in list(xs) + list(ys)):
        raise falhar("contrato", "ponto-nao-finito",
                     "há valor não finito entre os pontos.", local="pontos")

    resultados = [_avaliar(f, xs, ys) for f in FORMAS]
    ajustadas = [r for r in resultados if r["estado"] == "ajustada"]
    ajustadas.sort(key=lambda r: (r["erroMedioAbsoluto"], r["forma"]))

    if not ajustadas:
        return {"formato": FORMATO, "melhor": None,
                "porQue": "nenhuma forma do catálogo se aplica a estes dados.",
                "candidatas": resultados}

    melhor = ajustadas[0]
    segunda = ajustadas[1] if len(ajustadas) > 1 else None
    # Quando duas formas explicam praticamente igual, dizer que uma "é a lei"
    # seria escolher por casas decimais. O empate fica na saída.
    empate = bool(segunda and melhor["erroMedioAbsoluto"] > 0 and
                  segunda["erroMedioAbsoluto"] <= melhor["erroMedioAbsoluto"] * 1.1)
    return {
        "formato": FORMATO,
        "melhor": melhor,
        "empateTecnico": [segunda["forma"]] if empate else [],
        "candidatas": resultados,
        "pontos": len(xs),
        "aviso": ("Coincidir com uma forma não explica por quê: duas causas "
                  "diferentes produzem a mesma curva. Isto é a forma que melhor "
                  "descreve os pontos medidos, não uma lei estabelecida."),
    }
