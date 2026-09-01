"""Primeiro estudo real do laboratório: a torção da cabeça do machado.

A PERGUNTA veio do trabalho de modelagem, não de um exercício: a cabeça, feita
por `inflate`, torce as faces, e a torção decide se `furo` aceita abrir o olho.
Sabia-se que ela existe; não se sabia se dá para baixá-la, quanto custa, e se o
preço é mudar a forma.

POR QUE ESTE ESTUDO É O PRIMEIRO. Ele testa o laboratório tanto quanto a
geometria: se a cerimônia de estudo, hipótese, execução, evidência e síntese não
disser nada que um script solto não diria, ela não se paga — e essa avaliação
está escrita na síntese, não escondida.

O JULGAMENTO MORA AQUI, NÃO NO INSTRUMENTO. O adaptador Node mede e devolve
número; quem decide se o número sustenta a hipótese é este módulo. Instrumento
que julga a própria saída se aprova sozinho.
"""

from __future__ import annotations

from typing import Any

from ..contratos import Estudo, Evidencia, Execucao, Hipotese, Sintese

INSTRUMENTO = "mecanifica.inflate-torcao"

#: Abaixo disto a torção deixa de importar para a triangulação, pela medida do
#: acervo: face de caixa desvia 1e-17 e loft que torce, 1e-2 para cima.
ALVO_TORCAO = 0.01

#: Quanto a caixa envolvente pode mudar e a forma ainda ser "a mesma". 1 mm num
#: envelope de 654 mm é 0,15%, abaixo do que qualquer inspeção visual separa.
TOLERANCIA_FORMA_M = 0.001

HIPOTESE_MONOTONA = Hipotese(
    proposicao="Aumentar `expoenteSecao` reduz a torção máxima das faces da cabeça.",
    predicao="A torção máxima cai a cada aumento de `expoenteSecao`, nas execuções admissíveis.",
    criterio_de_refutacao="Qualquer par consecutivo em que a torção SOBE ao aumentar o parâmetro.",
    dominio="cabeça do machado-de-guerra por `inflate`, apenas nas configurações que mantêm o olho furável",
)

#: A PERGUNTA MUDOU NO CONTATO COM O INSTRUMENTO, e isto fica registrado em vez
#: de reescrito. O estudo nasceu varrendo `lados` e `expoenteSecao`; a primeira
#: rodada devolveu 21 de 25 execuções gritando, e a causa não era ruído: o furo
#: do olho precisa CABER numa face, e aumentar `lados` estreita a face. `lados`
#: não é parâmetro livre nesta peça — é decidido pelo olho. Descobrir isso vale
#: mais que a resposta que eu tinha ido buscar.

HIPOTESE_ALCANCAVEL = Hipotese(
    proposicao=f"Existe combinação com torção abaixo de {ALVO_TORCAO} sem mudar a forma.",
    predicao=(
        "Ao menos uma combinação tem torção máxima abaixo do alvo e caixa envolvente "
        f"a menos de {TOLERANCIA_FORMA_M * 1000:.0f} mm da configuração de referência."
    ),
    criterio_de_refutacao="Nenhuma combinação satisfaz as duas condições ao mesmo tempo.",
    dominio="a mesma varredura acima; referência é lados=14, expoenteSecao=14",
)

ESTUDO = Estudo(
    pergunta=(
        "Dá para baixar a torção das faces da cabeça do machado abaixo de "
        f"{ALVO_TORCAO} mexendo só em `lados` e `expoenteSecao`, sem mudar a forma? "
        "E a que custo em triângulo?"
    ),
    criterio_de_encerramento=(
        "A varredura completa executa sem grito do motor e as duas hipóteses recebem "
        "estado; nenhuma delas pode ficar `nao-testada`."
    ),
    hipoteses=(HIPOTESE_MONOTONA, HIPOTESE_ALCANCAVEL),
)


def _altura(medida: dict[str, Any]) -> float:
    return medida["caixa"]["max"][1] - medida["caixa"]["min"][1]


def _execucoes(pacote: dict[str, Any]) -> list[Execucao]:
    return [
        Execucao(
            instrumento=pacote["instrumento"],
            versao_instrumento=pacote["versao"],
            parametros=m["parametros"],
            entradas={"peca": pacote["peca"]},
            saida={
                "torcaoMaxima": m["torcaoMaxima"],
                "triangulos": m["triangulos"],
                "alturaY": round(_altura(m), 6),
                "gritos": m["gritos"],
            },
        )
        for m in pacote["medidas"]
    ]


def avaliar(pacote: dict[str, Any]) -> Sintese:
    """Recebe o pacote do instrumento e devolve a síntese, com estados e limites."""
    todas = pacote["medidas"]
    inadmissiveis = [m for m in todas if m["gritos"]]
    # Execução com grito do motor é PRESERVADA e não sustenta conclusão: a peça
    # saiu diferente do que a receita pediu, e medir o que saiu não responde à
    # pergunta. Ela vira limite de domínio, não lixo e não evidência.
    medidas = [m for m in todas if not m["gritos"]]
    if len(medidas) < 2:
        return Sintese(
            estudo_id=ESTUDO.id,
            conclusoes=(
                {"hipotese": HIPOTESE_MONOTONA.id, "estado": "inconclusiva"},
                {"hipotese": HIPOTESE_ALCANCAVEL.id, "estado": "inconclusiva"},
            ),
            limites=(
                f"Só {len(medidas)} execução(ões) admissível(is) de {len(todas)}: "
                "não há varredura para comparar.",
            ),
        )
    execucoes = _execucoes({**pacote, "medidas": medidas})
    por_id = {id(m): e.id for m, e in zip(medidas, execucoes)}

    # --- hipótese 1: a torção cai a cada aumento de `expoenteSecao` ---
    quebras = []
    ordenadas = sorted(medidas, key=lambda m: m["parametros"]["expoenteSecao"])
    for anterior, atual in zip(ordenadas, ordenadas[1:]):
        if atual["torcaoMaxima"] > anterior["torcaoMaxima"]:
            quebras.append({
                "de": anterior["parametros"]["expoenteSecao"],
                "para": atual["parametros"]["expoenteSecao"],
            })
    estado_monotona = "contradita" if quebras else "sustentada-no-dominio-testado"
    familias = sorted({m["parametros"]["lados"] for m in medidas})

    # --- hipótese 2: existe combinação abaixo do alvo, com a forma preservada ---
    referencia = next(
        (m for m in medidas if m["parametros"] == {"lados": 14, "expoenteSecao": 14}), None
    )
    candidatas = []
    if referencia is not None:
        base = _altura(referencia)
        candidatas = [
            m for m in medidas
            if m["torcaoMaxima"] < ALVO_TORCAO
            and abs(_altura(m) - base) <= TOLERANCIA_FORMA_M
        ]
    if referencia is None:
        estado_alcancavel = "inconclusiva"
    elif candidatas:
        estado_alcancavel = "sustentada-no-dominio-testado"
    else:
        estado_alcancavel = "contradita"

    melhor = min(candidatas, key=lambda m: m["triangulos"], default=None)
    evidencias = (
        Evidencia(
            hipotese_id=HIPOTESE_MONOTONA.id,
            execucoes=tuple(por_id[id(m)] for m in medidas),
            direcao="contradiz" if quebras else "sustenta",
            justificativa=(
                f"{len(quebras)} par(es) consecutivo(s) subiram a torção."
                if quebras else
                f"A torção cai em todos os {len(medidas) - 1} pares consecutivos."
            ),
            dominio=HIPOTESE_MONOTONA.dominio,
        ),
    )

    conclusoes: list[dict[str, Any]] = [
        {
            "hipotese": HIPOTESE_MONOTONA.id,
            "estado": estado_monotona,
            "resumo": f"{len(quebras)} quebra(s) de monotonicidade em {len(medidas)} medidas.",
        },
        {
            "hipotese": HIPOTESE_ALCANCAVEL.id,
            "estado": estado_alcancavel,
            "resumo": (
                f"{len(candidatas)} combinação(ões) abaixo de {ALVO_TORCAO} com forma preservada."
                + (
                    f" A mais barata é lados={melhor['parametros']['lados']}, "
                    f"expoenteSecao={melhor['parametros']['expoenteSecao']}, "
                    f"torção {melhor['torcaoMaxima']:.5f}, {melhor['triangulos']} triângulos "
                    f"(referência: {referencia['triangulos']})."
                    if melhor else ""
                )
            ),
        },
    ]

    dominio = pacote.get("dominio", {})
    limites = [
        "Vale para UMA peça — a cabeça deste machado — e para um parâmetro só.",
        (
            "`lados` NÃO é parâmetro livre nesta peça: de "
            f"{dominio.get('ladosTestados', [])} só {dominio.get('ladosViaveis', [])} mantém o olho "
            "furável, porque o furo precisa caber numa face e mais lados estreita a face."
        ),
        (
            f"{len(inadmissiveis)} execução(ões) da varredura foram excluídas por grito do motor "
            "e não sustentam nenhuma conclusão."
        ) if inadmissiveis else "Todas as execuções da varredura foram admissíveis.",
        "Não diz nada sobre outras formas de `inflate`, nem sobre `loft`.",
        f"A tolerância de planaridade do `furo` é 1e-9: nenhuma combinação medida silencia o alerta, "
        f"e a menor torção alcançada ({min(m['torcaoMaxima'] for m in medidas):.5f}) segue muito acima dela.",
        "A forma foi conferida só pela caixa envolvente; ela não detecta mudança interna de silhueta.",
    ]
    return Sintese(
        estudo_id=ESTUDO.id,
        conclusoes=tuple(conclusoes),
        limites=tuple(limites),
        evidencias=tuple(e.id for e in evidencias),
    )
