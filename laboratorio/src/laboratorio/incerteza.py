"""Propagar a dispersão das entradas até a resposta, com semente declarada.

POR QUE SÓ AGORA. Eu adiei esta máquina duas vezes, e das duas com o mesmo
motivo: não havia entrada com dispersão real, e propagar incerteza inventada
produz um intervalo bonito que não significa nada. O cabo de pá mudou isso.
Madeira não tem UM módulo elástico: duas tábuas do mesmo eucalipto diferem
facilmente 20% ou 30%, por densidade, umidade, nó e direção de fibra. Ignorar
isso e comparar um número de madeira com um número de metal é comparar uma
distribuição com um ponto — e a comparação sai errada justamente onde importa,
na peça ruim do lote.

O QUE ESTE MÓDULO FAZ. Sorteia entradas dentro das faixas declaradas, roda a
conta muitas vezes, e devolve quantis — não só a média. A pergunta de engenharia
quase nunca é "quanto dá em média"; é "quão ruim fica na peça ruim".

TRÊS DISCIPLINAS:

  - **semente declarada, sempre.** Sem ela o mesmo estudo dá resultado diferente
    a cada rodada e a reprodução vira sorte. A semente entra na saída.
  - **gerador escrito aqui.** Um PRNG simples e determinístico, sem depender de
    implementação de biblioteca que pode mudar entre versões e quebrar a
    reprodução de um estudo antigo.
  - **convergência conferida, não assumida.** Se o resultado ainda balança entre
    a primeira e a segunda metade das amostras, o número de amostras é pequeno —
    e isso é DITO, não escondido atrás de uma média estável por acaso.

O QUE ELE NÃO FAZ. Não descobre correlação: se duas entradas andam juntas no
mundo real — densidade e módulo da madeira andam — sortear as duas independentes
subestima a cauda. Quem monta o estudo declara isso, e o módulo avisa que não
sabe.
"""

from __future__ import annotations

import math
from typing import Any, Callable, Sequence

from .erros import falhar

FORMATO = "lab.propagacao-de-incerteza@1"

#: Abaixo disto os quantis de cauda não têm amostra suficiente para significar
#: algo: o percentil 5 de 100 amostras é o quinto valor, e ele balança muito.
MINIMO_DE_AMOSTRAS = 200


class Sorteio:
    """Gerador determinístico próprio, para o estudo não depender de versão.

    É um gerador linear congruente de 64 bits com os parâmetros de Knuth. Não
    serve para criptografia e não se apresenta como tal; serve para varrer faixa
    de propriedade de material, que é para o que está aqui.
    """

    def __init__(self, semente: int) -> None:
        if not isinstance(semente, int) or semente < 0:
            raise falhar("contrato", "semente-invalida",
                         f"semente {semente!r}; use inteiro não negativo.", local="semente")
        self.semente = semente
        self._estado = (semente * 6364136223846793005 + 1442695040888963407) % (2 ** 64)

    def proximo(self) -> float:
        """Próximo valor em [0, 1)."""
        self._estado = (self._estado * 6364136223846793005 + 1442695040888963407) % (2 ** 64)
        return (self._estado >> 11) / float(2 ** 53)

    def uniforme(self, minimo: float, maximo: float) -> float:
        if maximo < minimo:
            raise falhar("contrato", "faixa-invertida",
                         f"faixa [{minimo}, {maximo}].", local="faixa")
        return minimo + (maximo - minimo) * self.proximo()


def _quantil(ordenados: Sequence[float], fracao: float) -> float:
    if not ordenados:
        raise falhar("contrato", "sem-amostra", "nada para resumir.", local="amostras")
    posicao = fracao * (len(ordenados) - 1)
    baixo = math.floor(posicao)
    alto = math.ceil(posicao)
    if baixo == alto:
        return ordenados[int(posicao)]
    peso = posicao - baixo
    return ordenados[baixo] * (1 - peso) + ordenados[alto] * peso


def propagar(faixas: dict[str, tuple[float, float]],
             calcular: Callable[[dict[str, float]], float],
             *, semente: int, amostras: int = 2000,
             correlacoes_declaradas: str = "nenhuma") -> dict[str, Any]:
    """Sorteia dentro das faixas e devolve os quantis da resposta."""
    if not faixas:
        raise falhar("contrato", "sem-faixa",
                     "propagar sem entrada dispersa não propaga nada.", local="faixas")
    if amostras < MINIMO_DE_AMOSTRAS:
        raise falhar(
            "contrato", "amostras-insuficientes",
            f"{amostras} amostras; o mínimo é {MINIMO_DE_AMOSTRAS}, senão os quantis "
            "de cauda balançam mais que o efeito que se quer medir.",
            local="amostras",
        )
    for nome, (minimo, maximo) in faixas.items():
        if not (math.isfinite(minimo) and math.isfinite(maximo)) or maximo < minimo:
            raise falhar("contrato", "faixa-invalida",
                         f"faixa de '{nome}' é [{minimo}, {maximo}].", local="faixas")

    sorteio = Sorteio(semente)
    resultados: list[float] = []
    for _ in range(amostras):
        # A ordem do sorteio é fixa pelo nome, e não pela ordem do dicionário:
        # senão a mesma semente daria resultado diferente conforme quem montou o
        # dicionário, e a reprodução dependeria de detalhe invisível.
        ponto = {nome: sorteio.uniforme(*faixas[nome]) for nome in sorted(faixas)}
        valor = calcular(ponto)
        if not math.isfinite(valor):
            raise falhar("contrato", "resultado-nao-finito",
                         f"a conta devolveu {valor} para {ponto}.", local="calcular")
        resultados.append(valor)

    ordenados = sorted(resultados)
    metade = len(ordenados) // 2
    media_primeira = sum(resultados[:metade]) / metade
    media_segunda = sum(resultados[metade:]) / (len(resultados) - metade)
    escala = abs(sum(resultados) / len(resultados)) or 1.0
    deriva = abs(media_primeira - media_segunda) / escala
    convergiu = deriva < 0.01

    return {
        "formato": FORMATO,
        "semente": semente,
        "amostras": amostras,
        "media": sum(resultados) / len(resultados),
        "p05": _quantil(ordenados, 0.05),
        "p50": _quantil(ordenados, 0.50),
        "p95": _quantil(ordenados, 0.95),
        "minimo": ordenados[0],
        "maximo": ordenados[-1],
        "convergencia": {
            "convergiu": convergiu,
            "derivaEntreMetades": deriva,
            "criterio": "diferença entre as médias das duas metades abaixo de 1%",
        },
        # Ditas na saída porque são as duas coisas que fazem alguém ler o
        # intervalo como mais confiável do que ele é.
        "distribuicaoSuposta": "uniforme dentro de cada faixa declarada",
        "correlacoes": correlacoes_declaradas,
        "aviso": ("entradas sorteadas de forma independente; se elas andam juntas no "
                  "mundo real, a cauda aqui está otimista"),
    }
