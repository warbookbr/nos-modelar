"""Cabo de ferramenta tratado como viga: tensão, flecha, frequência e vibração.

O QUE ESTE INSTRUMENTO RESPONDE. Dado um cabo — seção, comprimento, material — e
uma carga na ponta: ele quebra? ele verga demais? ele vibra em que frequência? e
quanto da vibração sobra na mão do sujeito depois de alguns ciclos?

TUDO AQUI É CONTA FECHADA, das antigas, e escrita do zero. Nada de biblioteca,
nada de licença herdada. Viga engastada com carga na ponta é o modelo mais
simples que ainda descreve um cabo de pá: a mão de baixo segura, a de cima
empurra, e o esforço maior está no engaste.

A ARMADILHA QUE ESTE INSTRUMENTO PRECISA EVITAR. Trocar madeira maciça por tubo
metálico muda três coisas ao mesmo tempo, e é fácil olhar só a primeira:

  - a tensão cai, porque o metal é mais rígido e o tubo joga material para longe
    do centro — parece vitória;
  - a massa muda numa direção que depende da parede, não do material;
  - **o amortecimento despenca**, e ninguém percebe numa planilha de resistência.
    Madeira dissipa cerca de 1% da energia por ciclo; aço dissipa 0,05%. É por
    isso que ferramenta de cabo metálico morde a mão.

Por isso a vibração está aqui dentro, e não como um extra: um cabo que passa em
tensão e reprova na mão do usuário é um cabo reprovado.

O LIMITE MAIS PERIGOSO, e ele é estrutural: tubo de parede fina **enruga** antes
de escoar. A conta de tensão não sabe disso e devolveria um número ótimo para uma
parede impossível. O instrumento recusa razões de esbeltez de parede fora do que
a conta cobre, em vez de premiar a geometria mais fina.
"""

from __future__ import annotations

import math
from typing import Any

from .erros import falhar
from .instrumentos import Manifesto, Registro
from .unidades import Grandeza, dimensao

INSTRUMENTO = "materiais.cabo-como-viga-engastada"
VERSAO = "1.0.0"

PRESSAO = dimensao(massa=1, comprimento=-1, tempo=-2)
COMPRIMENTO = dimensao(comprimento=1)
MASSA = dimensao(massa=1)
FREQUENCIA = dimensao(tempo=-1)
ADIMENSIONAL = dimensao()

#: Primeira raiz da viga engastada em vibração livre. Constante da equação, não
#: escolha: cosh(k)·cos(k) + 1 = 0.
K1 = 1.8751040687119611

#: Acima desta razão diâmetro/parede o tubo enruga antes de escoar, e a conta de
#: tensão deixa de descrever a falha. O valor é conservador e declarado; o limite
#: real depende do material e da imperfeição de fabricação, que não estão aqui.
RAZAO_MAXIMA_DIAMETRO_PAREDE = 50.0

MANIFESTO = Manifesto(
    identidade=INSTRUMENTO,
    versao=VERSAO,
    capacidades=(
        "calcular tensão de flexão, flecha, frequência natural e decaimento de "
        "vibração de um cabo tratado como viga engastada com carga na ponta",
    ),
    dominio={
        "razaoDiametroParede": lambda v: v <= RAZAO_MAXIMA_DIAMETRO_PAREDE,
    },
    nao_cobre=(
        "enrugamento local de parede fina — a conta de tensão não descreve essa falha, "
        "e por isso a razão diâmetro/parede é recusada acima do limite declarado",
        "fadiga: isto é carga única, e cabo de pá sofre milhares de ciclos",
        "impacto propriamente dito, que envolve taxa de deformação e não só energia",
        "anisotropia da madeira: fibra longitudinal e transversal têm módulos muito "
        "diferentes, e aqui entra um módulo único, o da direção da fibra",
        "umidade, apodrecimento, nó e defeito natural da madeira",
        "ergonomia, empunhadura, acabamento e o que a mão sente além da vibração",
        "junta entre cabo e pá, que costuma ser onde a ferramenta falha de verdade",
    ),
    determinista=True,
    maturidade="experimental",
)


def registro_padrao() -> Registro:
    registro = Registro()
    registro.registrar(MANIFESTO)
    return registro


def secao_macica(diametro_m: float) -> dict[str, Any]:
    """Área e momento de inércia de uma seção circular cheia."""
    if diametro_m <= 0:
        raise falhar("instrumento", "dimensao-nao-positiva",
                     f"diâmetro {diametro_m}.", local="diametro")
    return {
        "tipo": "maciça",
        "area": math.pi * diametro_m ** 2 / 4,
        "inercia": math.pi * diametro_m ** 4 / 64,
        "raioExterno": diametro_m / 2,
        "razaoDiametroParede": 2.0,  # maciça: a "parede" é o raio
    }


def secao_tubular(diametro_externo_m: float, parede_m: float) -> dict[str, Any]:
    """Área e momento de inércia de um tubo.

    O tubo é o que torna metal viável num cabo: ele joga material para longe do
    centro, onde ele trabalha, e tira do meio, onde não trabalha.
    """
    if diametro_externo_m <= 0 or parede_m <= 0:
        raise falhar("instrumento", "dimensao-nao-positiva",
                     f"diâmetro {diametro_externo_m}, parede {parede_m}.", local="secao")
    interno = diametro_externo_m - 2 * parede_m
    if interno <= 0:
        raise falhar("instrumento", "parede-maior-que-o-tubo",
                     f"parede {parede_m} m não cabe em diâmetro {diametro_externo_m} m.",
                     local="parede")
    razao = diametro_externo_m / parede_m
    if razao > RAZAO_MAXIMA_DIAMETRO_PAREDE:
        # Recusa, e não aviso: sem isto a otimização escolheria sempre a parede
        # mais fina possível, que é exatamente a que enruga.
        raise falhar(
            "instrumento", "parede-fina-demais",
            f"razão diâmetro/parede {razao:.1f} passa de {RAZAO_MAXIMA_DIAMETRO_PAREDE}; "
            "acima disso o tubo enruga antes de escoar e a conta de tensão não descreve a falha.",
            local="parede",
            acaoSugerida="Engrosse a parede ou trate o enrugamento com um instrumento próprio.",
        )
    return {
        "tipo": "tubular",
        "area": math.pi * (diametro_externo_m ** 2 - interno ** 2) / 4,
        "inercia": math.pi * (diametro_externo_m ** 4 - interno ** 4) / 64,
        "raioExterno": diametro_externo_m / 2,
        "razaoDiametroParede": razao,
    }


def avaliar(secao: dict[str, Any], *, comprimento_m: float, forca_n: float,
            modulo_pa: float, densidade_kg_m3: float, resistencia_pa: float,
            fator_de_perda: float, condicao: str = "não declarada") -> dict[str, Any]:
    """Tensão, flecha, massa, frequência e sobra de vibração após dez ciclos."""
    for nome, valor in (("comprimento_m", comprimento_m), ("forca_n", forca_n),
                        ("modulo_pa", modulo_pa), ("densidade_kg_m3", densidade_kg_m3),
                        ("resistencia_pa", resistencia_pa)):
        if not math.isfinite(valor) or valor <= 0:
            raise falhar("instrumento", "entrada-nao-positiva",
                         f"{nome} = {valor}.", local=nome)
    if not 0 < fator_de_perda < 1:
        raise falhar(
            "instrumento", "fator-de-perda-fora-de-faixa",
            f"fator de perda {fator_de_perda}; ele é a fração de energia dissipada "
            "por radiano e vive entre 0 e 1.",
            local="fator_de_perda",
        )

    inercia = secao["inercia"]
    area = secao["area"]
    momento = forca_n * comprimento_m
    tensao = momento * secao["raioExterno"] / inercia
    flecha = forca_n * comprimento_m ** 3 / (3 * modulo_pa * inercia)
    massa = densidade_kg_m3 * area * comprimento_m
    massa_linear = densidade_kg_m3 * area
    frequencia = (K1 ** 2 / (2 * math.pi)) * math.sqrt(
        modulo_pa * inercia / (massa_linear * comprimento_m ** 4))
    # Energia restante após 10 ciclos livres. A amplitude cai por exp(-π·η) a
    # cada ciclo; dez ciclos é o que cabe entre duas pancadas de quem cava.
    sobra = math.exp(-math.pi * fator_de_perda * 10)
    margem = resistencia_pa / tensao

    def g(valor: float, unidade: str, dim: tuple[int, ...]) -> dict[str, Any]:
        return Grandeza(valor, unidade, dim).documento()

    return {
        "instrumento": INSTRUMENTO,
        "versao": VERSAO,
        "parametros": {"razaoDiametroParede": secao["razaoDiametroParede"],
                       "comprimento_m": comprimento_m, "forca_n": forca_n},
        "entradas": {"secao": secao["tipo"], "condicao": condicao},
        "tensao": g(tensao, "Pa", PRESSAO),
        "margemContraFalha": margem,
        "flecha": g(flecha, "m", COMPRIMENTO),
        "massa": g(massa, "kg", MASSA),
        "frequenciaNatural": g(frequencia, "Hz", FREQUENCIA),
        "vibracaoRestanteApos10Ciclos": g(sobra, "1", ADIMENSIONAL),
        "aprovaEmResistencia": margem >= 1.0,
        # Dito na saída: a margem é contra a resistência FORNECIDA, e quem
        # forneceu decide se ela já tem coeficiente de segurança embutido.
        "significadoDaMargem": ("resistência de entrada dividida pela tensão calculada; "
                                "não há coeficiente de segurança embutido aqui"),
    }


def canario() -> None:
    """Casos com resposta conhecida por fora da implementação."""
    # Um tubo tem de ser mais rígido que o maciço de MESMA MASSA. É a razão de
    # existir do tubo; se a conta não mostrar isso, ela está errada.
    macico = secao_macica(0.030)
    tubo = secao_tubular(0.040, 0.0032)
    if not (tubo["inercia"] > macico["inercia"] and tubo["area"] < macico["area"]):
        raise falhar("instrumento", "canario-morto",
                     "o tubo não ficou mais rígido com menos área que o maciço.",
                     local="canario")

    # Dobrar o diâmetro de uma seção cheia multiplica a inércia por 16.
    razao = secao_macica(0.060)["inercia"] / macico["inercia"]
    if abs(razao - 16.0) > 1e-9:
        raise falhar("instrumento", "canario-morto",
                     f"dobrar o diâmetro deu {razao}× em vez de 16×.", local="canario")

    # Material que dissipa mais tem de sobrar MENOS vibração.
    comum = dict(comprimento_m=1.2, forca_n=300.0, modulo_pa=10e9,
                 densidade_kg_m3=700.0, resistencia_pa=80e6)
    mole = avaliar(macico, fator_de_perda=0.02, **comum)
    duro = avaliar(macico, fator_de_perda=0.0005, **comum)
    if not (mole["vibracaoRestanteApos10Ciclos"]["valor"]
            < duro["vibracaoRestanteApos10Ciclos"]["valor"]):
        raise falhar("instrumento", "canario-morto",
                     "quem dissipa mais não sobrou menos vibração.", local="canario")
