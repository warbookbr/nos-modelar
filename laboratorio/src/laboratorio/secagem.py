"""Quanto tempo a matéria-prima leva para ficar pronta — e por que a espessura manda.

A PERGUNTA QUE ISTO RESPONDE, e ela veio do usuário: se o bambu levar o mesmo
tempo que o eucalipto para secar, o ganho encolhe. É a pergunta certa, porque
tempo de secagem é estoque parado, e estoque parado é dinheiro.

A FÍSICA. Secar é difusão de água para fora. Na solução da equação de difusão, o
tempo característico vai com o QUADRADO da espessura que a água precisa
atravessar: dobrar a espessura quadruplica o tempo. É por isso que tábua grossa
demora meses e ripa fina demora semanas — não é proporcional, é quadrático.

E é aí que a geometria do bambu decide. O colmo já vem oco, com parede de poucos
milímetros, e seca pelos dois lados. O cabo de eucalipto é maciço, e a água do
centro precisa atravessar o raio inteiro.

O QUE ESTE MODELO NÃO FAZ, e cada item pode mudar o resultado:
  - **não é cronograma de estufa.** É comparação de ordem de grandeza entre duas
    geometrias no MESMO regime de secagem. Programa de estufa real depende de
    espécie, temperatura, umidade e da experiência de quem opera;
  - **não modela colapso nem rachadura.** Eucalipto é conhecido por colapsar e
    rachar ao secar, e isso vira perda de material, não só tempo. O modelo diz
    quanto tempo; não diz quanto sobra;
  - **não sabe de tratamento.** O bambu precisa de imersão contra caruncho, e ela
    PODE ser feita com o colmo ainda verde, antes de secar — sobrepondo os dois
    passos em vez de somá-los. Se for feita depois, soma.
"""

from __future__ import annotations

import math
from typing import Any

from .erros import falhar

FORMATO = "lab.tempo-de-preparo@1"

#: Difusividade efetiva de umidade, ordem de grandeza para madeira e bambu à
#: temperatura ambiente. O VALOR não importa para a comparação — ele se cancela
#: na razão entre dois materiais — e está aqui só para o tempo sair em dias.
DIFUSIVIDADE_M2_POR_S = 1e-10


def tempo_de_secagem(espessura_de_difusao_m: float, *,
                     difusividade: float = DIFUSIVIDADE_M2_POR_S) -> float:
    """Tempo característico de secagem, em dias, para uma espessura dada.

    `espessura_de_difusao_m` é o caminho que a água percorre até a superfície:
    metade da parede num tubo que seca dos dois lados, e o raio numa peça maciça.
    """
    if espessura_de_difusao_m <= 0:
        raise falhar("instrumento", "espessura-nao-positiva",
                     f"espessura {espessura_de_difusao_m}.", local="espessura")
    segundos = espessura_de_difusao_m ** 2 / difusividade
    return segundos / 86400.0


def comparar_preparo(pecas: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """Compara o preparo de várias peças, com os passos declarados.

    Cada peça informa `espessura_de_difusao_m`, os `passos` que ela exige e quais
    deles são `sobrepostos` — porque somar passo que roda em paralelo inventa
    tempo que ninguém gasta.
    """
    if not pecas:
        raise falhar("contrato", "sem-peca", "nada para comparar.", local="pecas")
    saida = {}
    for nome, p in pecas.items():
        dias = tempo_de_secagem(p["espessura_de_difusao_m"])
        saida[nome] = {
            "espessuraDeDifusao_mm": p["espessura_de_difusao_m"] * 1000,
            "diasDeSecagem": dias,
            "passos": p.get("passos", ()),
            "passosSobrepostos": p.get("sobrepostos", ()),
            "observacao": p.get("observacao", ""),
        }
    base = min(saida.values(), key=lambda x: x["diasDeSecagem"])["diasDeSecagem"]
    for x in saida.values():
        x["vezesMaisLentoQueOMaisRapido"] = x["diasDeSecagem"] / base
    return {
        "formato": FORMATO,
        "pecas": saida,
        # A HONESTIDADE QUE ESTE RESULTADO EXIGE: o número ABSOLUTO de dias é
        # otimista. Cabo de eucalipto seca ao ar em MESES, não nas semanas que
        # esta conta devolve, porque a difusividade usada é ordem de grandeza e o
        # regime real é mais lento. A RAZÃO entre as peças, essa sim, é robusta:
        # a difusividade se cancela, e sobra só a razão dos quadrados das
        # espessuras. É a razão que responde à pergunta, e não o valor.
        "leiaARazaoNaoOvalor": (
            "os dias absolutos são otimistas — cabo de eucalipto seca ao ar em meses. "
            "A razão entre as peças é o resultado confiável, porque a difusividade se "
            "cancela nela e sobra a razão dos quadrados das espessuras"
        ),
        "porQueQuadratico": ("secar é difusão, e o tempo característico vai com o "
                             "QUADRADO da espessura: dobrar a espessura quadruplica o tempo"),
        "oQueNaoModela": (
            "cronograma real de estufa, que depende de espécie, temperatura e operador",
            "colapso e rachadura ao secar, que viram perda de material e não só tempo",
            "sobreposição entre tratamento e secagem, que é declarada por peça e não deduzida",
        ),
    }
