"""Bancada de ensaios virtuais: tração, flexão em três pontos, flambagem e escala.

O QUE ELA FAZ, e o que ela NUNCA faz. Ela roda o ensaio no papel e devolve o que
o corpo de prova faria **segundo o modelo**. Todo resultado sai carimbado como
`simulado`, e nenhum sai como medida. A distinção não é preciosismo: ensaio
simulado testa o MODELO, não o material. Ele diz "se as propriedades de entrada
estiverem certas, é isto que acontece" — e as propriedades de entrada são
justamente a parte que este laboratório mais erra.

POR QUE ELA EXISTE. Até aqui só havia `viga.py`, que responde uma pergunta só:
cabo engastado com carga na ponta. Foi suficiente para reprovar dois candidatos,
e é estreito demais para qualquer outra pergunta. Aqui os ensaios ficam ao lado
uns dos outros, cada um com o seu domínio.

O ENSAIO MAIS IMPORTANTE DESTE MÓDULO NÃO É NENHUM DOS TRÊS: é `efeito_de_escala`.

Resistência não é uma propriedade média — ela é decidida pelo **maior defeito**
que por acaso está na peça. Peça grande tem mais chance de conter um defeito
grande, então **peça grande é mais fraca que o corpo de prova**, com o mesmo
material. Isso é estatística de Weibull, é conhecido desde os anos 1930, e é
sistematicamente esquecido quando alguém pega um valor de manual e aplica numa
peça dez vezes maior.

É exatamente o que este laboratório fez: os 111,7 MPa do eucalipto vêm de corpo
de prova pequeno e sem defeito, e foram aplicados direto num cabo de 1,2 m. O
número certo é menor, e `efeito_de_escala` diz quanto.

E ELE RECUSA METAL. O efeito de escala de Weibull descreve material FRÁGIL, que
falha na primeira trinca. Metal dúctil escoa, redistribui a tensão em volta do
defeito e não obedece a essa estatística. Aplicar a fórmula num aço devolveria um
número plausível e errado, então o módulo recusa em vez de calcular.

O QUE NÃO ESTÁ AQUI, e é dito para não ser suposto: fadiga, fluência, impacto de
verdade (que depende de taxa de deformação), e qualquer geometria que não seja
barra prismática. Ensaio de impacto real mede energia até romper com trinca
correndo; o que se calcula de graça é energia elástica armazenada, que é outra
coisa e não substitui.
"""

from __future__ import annotations

import math
from typing import Any

from .erros import falhar
from .instrumentos import Manifesto, Registro
from .unidades import Grandeza, dimensao

INSTRUMENTO = "materiais.bancada-de-ensaios"
VERSAO = "1.0.0"

PRESSAO = dimensao(massa=1, comprimento=-1, tempo=-2)
COMPRIMENTO = dimensao(comprimento=1)
FORCA = dimensao(massa=1, comprimento=1, tempo=-2)
ENERGIA = dimensao(massa=1, comprimento=2, tempo=-2)
ADIMENSIONAL = dimensao()

#: Carimbo obrigatório em toda saída. Ele existe para sobreviver ao copiar e
#: colar: um número solto num relatório perde o contexto, este carimbo não.
NATUREZA = "simulado — resultado de modelo, NÃO é medição de ensaio físico"

#: Abaixo desta esbeltez a coluna esmaga antes de flambar, e a fórmula de Euler
#: deixa de descrever a falha. Valor conservador e declarado.
ESBELTEZ_MINIMA_PARA_EULER = 80.0

#: Módulos de Weibull de referência, e a faixa é larga porque a coisa é assim.
#: Quanto MENOR o módulo, mais espalhada é a resistência e mais forte o efeito de
#: tamanho. Madeira estrutural com nó é mais espalhada que madeira limpa.
MODULOS_DE_WEIBULL = {
    "madeira-limpa": 12.0,
    "madeira-estrutural": 5.0,
    "bambu-colmo": 8.0,
    "ceramica": 10.0,
    "compósito-de-fibra": 15.0,
}

#: Materiais dúcteis, para os quais o efeito de escala de Weibull NÃO vale.
DUCTEIS = frozenset(("aco", "aluminio", "cobre", "latao", "metal-ductil"))

MANIFESTO = Manifesto(
    identidade=INSTRUMENTO,
    versao=VERSAO,
    capacidades=(
        "ensaio de tração simulado em barra prismática",
        "ensaio de flexão em três pontos simulado em barra prismática",
        "carga crítica de flambagem por Euler, com recusa fora da esbeltez válida",
        "correção de resistência por efeito de tamanho de Weibull, recusada para dúctil",
    ),
    dominio={
        "esbeltez": lambda v: v >= ESBELTEZ_MINIMA_PARA_EULER,
        "moduloDeWeibull": lambda v: 1.0 < v < 60.0,
    },
    nao_cobre=(
        "medição física de qualquer espécie: tudo aqui é modelo",
        "fadiga e fluência, que são carga repetida e carga longa",
        "impacto de verdade, que depende de taxa de deformação e de trinca correndo",
        "anisotropia: entra um módulo único, o da direção do esforço",
        "geometria que não seja barra prismática",
        "efeito de escala em material dúctil, que é recusado em vez de calculado",
        "umidade, temperatura e envelhecimento",
    ),
    determinista=True,
    maturidade="experimental",
)


def registro_padrao() -> Registro:
    registro = Registro()
    registro.registrar(MANIFESTO)
    return registro


def _positivo(**valores: float) -> None:
    for nome, valor in valores.items():
        if not math.isfinite(valor) or valor <= 0:
            raise falhar("instrumento", "entrada-nao-positiva",
                         f"{nome} = {valor}.", local=nome)


def _cabecalho(ensaio: str, entradas: dict[str, Any]) -> dict[str, Any]:
    return {
        "instrumento": INSTRUMENTO,
        "versao": VERSAO,
        "ensaio": ensaio,
        "natureza": NATUREZA,
        "entradas": entradas,
    }


def tracao(*, area_m2: float, forca_n: float, comprimento_m: float,
           modulo_pa: float, resistencia_pa: float) -> dict[str, Any]:
    """Tração simples: tensão, deformação, alongamento e margem contra romper."""
    _positivo(area_m2=area_m2, forca_n=forca_n, comprimento_m=comprimento_m,
              modulo_pa=modulo_pa, resistencia_pa=resistencia_pa)
    tensao = forca_n / area_m2
    deformacao = tensao / modulo_pa
    return {
        **_cabecalho("tração", {"area_m2": area_m2, "forca_n": forca_n,
                                "comprimento_m": comprimento_m,
                                "modulo_pa": modulo_pa,
                                "resistencia_pa": resistencia_pa}),
        "tensao": Grandeza(tensao, "Pa", PRESSAO).documento(),
        "deformacao": Grandeza(deformacao, "1", ADIMENSIONAL).documento(),
        "alongamento": Grandeza(deformacao * comprimento_m, "m", COMPRIMENTO).documento(),
        "margemContraFalha": resistencia_pa / tensao,
    }


def flexao_tres_pontos(*, largura_m: float, altura_m: float, vao_m: float,
                       forca_n: float, modulo_pa: float,
                       resistencia_pa: float) -> dict[str, Any]:
    """Flexão em três pontos numa barra retangular: o ensaio de norma de madeira.

    ESTE É O ENSAIO QUE PRODUZ O NÚMERO DO WOOD HANDBOOK. Saber a geometria dele
    importa porque é dela que vem o efeito de tamanho: o corpo de prova é pequeno,
    e a peça de verdade não é.
    """
    _positivo(largura_m=largura_m, altura_m=altura_m, vao_m=vao_m, forca_n=forca_n,
              modulo_pa=modulo_pa, resistencia_pa=resistencia_pa)
    inercia = largura_m * altura_m ** 3 / 12
    momento = forca_n * vao_m / 4
    tensao = momento * (altura_m / 2) / inercia
    flecha = forca_n * vao_m ** 3 / (48 * modulo_pa * inercia)
    return {
        **_cabecalho("flexão em três pontos",
                     {"largura_m": largura_m, "altura_m": altura_m, "vao_m": vao_m,
                      "forca_n": forca_n, "modulo_pa": modulo_pa,
                      "resistencia_pa": resistencia_pa}),
        "tensao": Grandeza(tensao, "Pa", PRESSAO).documento(),
        "flecha": Grandeza(flecha, "m", COMPRIMENTO).documento(),
        "volumeSolicitado_m3": largura_m * altura_m * vao_m,
        "margemContraFalha": resistencia_pa / tensao,
    }


def flambagem(*, area_m2: float, inercia_m4: float, comprimento_m: float,
              modulo_pa: float, extremidades: str = "birrotulada") -> dict[str, Any]:
    """Carga crítica de Euler, RECUSADA quando a coluna é curta demais.

    Coluna curta não flamba: ela esmaga. A fórmula de Euler não sabe disso e
    devolveria uma carga crítica altíssima para uma coluna atarracada — número
    plausível descrevendo a falha errada.
    """
    _positivo(area_m2=area_m2, inercia_m4=inercia_m4, comprimento_m=comprimento_m,
              modulo_pa=modulo_pa)
    fatores = {"birrotulada": 1.0, "engastada-livre": 2.0,
               "engastada-rotulada": 0.699, "biengastada": 0.5}
    if extremidades not in fatores:
        raise falhar("instrumento", "extremidade-desconhecida",
                     f"'{extremidades}'; conhecidas: {sorted(fatores)}.",
                     local="extremidades")
    k = fatores[extremidades]
    raio_de_giracao = math.sqrt(inercia_m4 / area_m2)
    esbeltez = k * comprimento_m / raio_de_giracao
    if esbeltez < ESBELTEZ_MINIMA_PARA_EULER:
        raise falhar(
            "instrumento", "esbeltez-abaixo-do-dominio",
            f"esbeltez {esbeltez:.1f}, abaixo de {ESBELTEZ_MINIMA_PARA_EULER}.",
            local="esbeltez",
            acaoSugerida=("Coluna curta esmaga antes de flambar, e Euler descreveria a "
                          "falha errada com um número que parece certo. Compare com a "
                          "resistência à compressão."),
        )
    carga = math.pi ** 2 * modulo_pa * inercia_m4 / (k * comprimento_m) ** 2
    return {
        **_cabecalho("flambagem de Euler",
                     {"area_m2": area_m2, "inercia_m4": inercia_m4,
                      "comprimento_m": comprimento_m, "modulo_pa": modulo_pa,
                      "extremidades": extremidades}),
        "esbeltez": esbeltez,
        "cargaCritica": Grandeza(carga, "N", FORCA).documento(),
        "tensaoCritica": Grandeza(carga / area_m2, "Pa", PRESSAO).documento(),
    }


def efeito_de_escala(*, resistencia_pa: float, volume_do_ensaio_m3: float,
                     volume_da_peca_m3: float, modulo_de_weibull: float,
                     material: str) -> dict[str, Any]:
    """Corrige a resistência do corpo de prova para o tamanho da peça real.

    A CONTA: σ_peça = σ_ensaio · (V_ensaio / V_peça)^(1/m).

    O QUE ELA DIZ, em português: peça maior tem mais material, mais material tem
    mais chance de conter o defeito grande, e é o defeito grande que decide.
    Quanto menor o módulo de Weibull `m`, mais espalhada é a resistência do
    material e mais forte esse efeito.

    ELA SÓ VALE PARA MATERIAL FRÁGIL. Metal dúctil escoa em volta do defeito e
    redistribui a tensão; a estatística do elo mais fraco não descreve isso.
    """
    _positivo(resistencia_pa=resistencia_pa, volume_do_ensaio_m3=volume_do_ensaio_m3,
              volume_da_peca_m3=volume_da_peca_m3, modulo_de_weibull=modulo_de_weibull)
    if material in DUCTEIS:
        raise falhar(
            "instrumento", "weibull-em-material-ductil",
            f"'{material}' é dúctil, e o efeito de tamanho de Weibull descreve "
            "material frágil.",
            local="material",
            acaoSugerida=("Material dúctil escoa em volta do defeito e redistribui a "
                          "tensão. A fórmula devolveria um número plausível e errado."),
        )
    if not 1.0 < modulo_de_weibull < 60.0:
        raise falhar("instrumento", "modulo-de-weibull-fora-de-faixa",
                     f"m = {modulo_de_weibull}; esperado entre 1 e 60.",
                     local="modulo_de_weibull")
    razao = volume_do_ensaio_m3 / volume_da_peca_m3
    corrigida = resistencia_pa * razao ** (1.0 / modulo_de_weibull)
    return {
        **_cabecalho("efeito de tamanho de Weibull",
                     {"resistencia_pa": resistencia_pa,
                      "volume_do_ensaio_m3": volume_do_ensaio_m3,
                      "volume_da_peca_m3": volume_da_peca_m3,
                      "modulo_de_weibull": modulo_de_weibull,
                      "material": material}),
        "resistenciaCorrigida": Grandeza(corrigida, "Pa", PRESSAO).documento(),
        "fatorDeReducao": corrigida / resistencia_pa,
        "leiaAssim": ("a peça é mais fraca que o corpo de prova porque é maior, e não "
                      "porque o material é outro; o valor de manual é do corpo de prova"),
    }
