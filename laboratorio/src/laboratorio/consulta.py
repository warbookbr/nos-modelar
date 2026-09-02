"""Camada de parâmetros: rodar os candidatos do estudo em QUALQUER caso de projeto.

POR QUE ELA EXISTE. O estudo do cabo de pá nasceu com o caso de projeto preso em
constantes de módulo — 1,2 m, 300 N, e um diâmetro por candidato numa tabela
fixa. Isso é bom para um estudo, que precisa ser reexecutável e comparável, e é
ruim para PERGUNTAR: trocar a força ou o comprimento exigia editar Python.

Aqui o caso vira argumento e os dados curados continuam onde estão. Nada de
propriedade de material é definido neste arquivo, de propósito: quem quiser
acrescentar material acrescenta no estudo, com fonte por propriedade, e ele
aparece aqui de graça.

AS RESTRIÇÕES VÊM JUNTO. Três vezes, neste mesmo estudo, a otimização achou o
vazio de uma restrição ausente — parede que enruga, diâmetro que não cabe na
mão, parede que amassa. Uma camada que aceitasse qualquer número reabriria os
três buracos de uma vez, então o limite de empunhadura e a parede mínima são
recusa aqui também, e não aviso.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from .erros import falhar
from .estudos.cabo_de_pa import (
    CICLOS_ENTRE_PANCADAS,
    DIAMETRO_MAXIMO_DE_EMPUNHADURA_M,
    GEOMETRIAS,
    MATERIAIS,
    PAREDE_MINIMA_PRATICA_M,
    fator_de_escala,
    procedencia,
)
from .dominio import fronteira, situar
from .viga import avaliar as avaliar_viga, secao_macica, secao_tubular

INSTRUMENTO = "consulta"
VERSAO = "1.0.0"

#: O que sai daqui é conta, não ensaio. Vai em toda resposta para que ninguém
#: precise lembrar disso lendo um número bonito.
NATUREZA = "simulado — resultado de modelo, NÃO é medição de ensaio físico"

#: Resolução do fabricante. Diâmetro de cabo se compra em milímetro inteiro, e
#: foi arredondamento de varredura que já escondeu, neste estudo, uma reprova por
#: cinco milésimos. Por isso a busca devolve o valor exato E o milímetro que de
#: fato passa, cada um com seu nome.
PASSO_DE_FABRICACAO_M = 0.001


@dataclass(frozen=True)
class Caso:
    """O caso de projeto: o que se pede da peça, sem dizer de que ela é feita."""

    forca_n: float = 300.0
    comprimento_m: float = 1.2
    massa_maxima_kg: float = 1.0
    flecha_maxima_m: float = 0.30
    margem_alvo: float = 1.0
    diametro_maximo_m: float = DIAMETRO_MAXIMO_DE_EMPUNHADURA_M
    condicao: str = "ambiente, carga estática de ponta"

    def __post_init__(self) -> None:
        for nome, valor in (("forca_n", self.forca_n),
                            ("comprimento_m", self.comprimento_m),
                            ("massa_maxima_kg", self.massa_maxima_kg),
                            ("flecha_maxima_m", self.flecha_maxima_m),
                            ("margem_alvo", self.margem_alvo),
                            ("diametro_maximo_m", self.diametro_maximo_m)):
            if not math.isfinite(valor) or valor <= 0:
                raise falhar("instrumento", "entrada-nao-positiva",
                             f"{nome} = {valor}.", local=nome)

    def documento(self) -> dict[str, Any]:
        return {
            "forca_n": self.forca_n,
            "comprimento_m": self.comprimento_m,
            "massaMaxima_kg": self.massa_maxima_kg,
            "flechaMaxima_m": self.flecha_maxima_m,
            "margemAlvo": self.margem_alvo,
            "diametroMaximo_m": self.diametro_maximo_m,
            "condicao": self.condicao,
            "ciclosEntrePancadas": CICLOS_ENTRE_PANCADAS,
        }


def candidatos() -> tuple[str, ...]:
    """Os materiais com propriedade curada, em ordem estável."""
    return tuple(sorted(MATERIAIS))


def _material(nome: str) -> dict[str, Any]:
    if nome not in MATERIAIS:
        raise falhar("contrato", "material-ausente",
                     f"'{nome}'; existem {sorted(MATERIAIS)}.", local="nome",
                     acaoSugerida="Acrescente o material no estudo, com fonte por "
                                  "propriedade, e ele aparece aqui sozinho.")
    return MATERIAIS[nome]


def secao_de(nome: str, *, diametro_m: float, parede_m: float | None = None,
             diametro_maximo_m: float = DIAMETRO_MAXIMO_DE_EMPUNHADURA_M) -> dict[str, Any]:
    """A seção do candidato no diâmetro pedido, com as restrições de uso valendo.

    A forma (cheia ou tubo) segue a do estudo, que é a forma em que o material
    existe no mundo; a parede pode ser trocada, o tipo não. Trocar tubo por barra
    cheia não é ajustar parâmetro, é trocar o produto — e aí a comparação para de
    valer sem que nada acuse.
    """
    _material(nome)
    if diametro_m > diametro_maximo_m:
        raise falhar(
            "instrumento", "diametro-nao-cabe-na-mao",
            f"{diametro_m * 1000:.1f} mm passa do limite de empunhadura de "
            f"{diametro_maximo_m * 1000:.1f} mm.",
            local="diametro_m",
            acaoSugerida="Engrossar não é resposta livre: acima disto a mão não fecha.",
        )
    tipo, _, parede_padrao = GEOMETRIAS[nome]
    if tipo == "macica":
        if parede_m is not None:
            raise falhar("contrato", "parede-em-secao-macica",
                         f"'{nome}' é barra cheia neste estudo e não tem parede.",
                         local="parede_m")
        return secao_macica(diametro_m)
    if parede_m is None:
        # PAREDE HERDADA DO ESTUDO, e ela pode violar a mínima prática — o aço
        # (1,2 mm) e o alumínio (2,0 mm) entraram na tabela ANTES de a mínima
        # existir, e ninguém voltou para conferir as linhas antigas. Reproduzir o
        # estudo exige aceitá-las; aceitar em silêncio seria esconder. Então a
        # violação sai marcada no resultado, e a recusa fica para a parede que
        # QUEM CHAMA escolhe — que é onde a otimização procuraria o buraco.
        return secao_tubular(diametro_m, parede_padrao)
    if parede_m < PAREDE_MINIMA_PRATICA_M:
        raise falhar(
            "instrumento", "parede-amassa",
            f"parede de {parede_m * 1000:.1f} mm fica abaixo da mínima prática de "
            f"{PAREDE_MINIMA_PRATICA_M * 1000:.1f} mm.",
            local="parede_m",
            acaoSugerida="Cabo de parede fina morre amassado, e esta conta não "
                         "modela esse modo de falha.",
        )
    return secao_tubular(diametro_m, parede_m)


def parede_abaixo_da_minima(nome: str, parede_m: float | None) -> str | None:
    """Nomeia a violação herdada, para ela viajar junto com o número."""
    tipo, _, parede_padrao = GEOMETRIAS[nome]
    if tipo == "macica":
        return None
    parede = parede_padrao if parede_m is None else parede_m
    if parede >= PAREDE_MINIMA_PRATICA_M:
        return None
    return (f"parede de {parede * 1000:.1f} mm, abaixo da mínima prática de "
            f"{PAREDE_MINIMA_PRATICA_M * 1000:.1f} mm; esta linha é anterior à "
            "restrição e a conta NÃO modela amassamento")


def avaliar(nome: str, *, caso: Caso = Caso(), diametro_m: float | None = None,
            parede_m: float | None = None) -> dict[str, Any]:
    """Roda um candidato no caso pedido, com efeito de tamanho e procedência.

    Sem `diametro_m`, usa o do estudo — o que faz a chamada mais curta reproduzir
    a linha do estudo em vez de inventar um caso novo por omissão.
    """
    material = _material(nome)
    diametro = GEOMETRIAS[nome][1] if diametro_m is None else diametro_m
    secao = secao_de(nome, diametro_m=diametro, parede_m=parede_m,
                     diametro_maximo_m=caso.diametro_maximo_m)

    escala = fator_de_escala(nome, secao["area"] * caso.comprimento_m)
    propriedades = {chave: material[chave] for chave in
                    ("modulo_pa", "densidade_kg_m3", "resistencia_pa", "fator_de_perda")}
    resistencia_de_manual = propriedades["resistencia_pa"]
    propriedades["resistencia_pa"] *= escala["fator"]

    resultado = avaliar_viga(secao, comprimento_m=caso.comprimento_m,
                             forca_n=caso.forca_n, condicao=caso.condicao,
                             **propriedades)
    massa = resultado["massa"]["valor"]
    return {
        "instrumento": INSTRUMENTO,
        "versao": VERSAO,
        "natureza": NATUREZA,
        "candidato": nome,
        "caso": caso.documento(),
        "geometria": {"tipo": secao["tipo"], "diametro_m": diametro,
                      "parede_m": parede_m if parede_m is not None else GEOMETRIAS[nome][2],
                      "paredeAbaixoDaMinima": parede_abaixo_da_minima(nome, parede_m)},
        "efeitoDeEscala": escala,
        "resistenciaDeManual_pa": resistencia_de_manual,
        "resistenciaNaPeca_pa": propriedades["resistencia_pa"],
        "viga": resultado,
        "margemContraFalha": resultado["margemContraFalha"],
        "massa_kg": massa,
        "cumpreMassa": massa <= caso.massa_maxima_kg,
        "cumpreFlecha": resultado["flecha"]["valor"] <= caso.flecha_maxima_m,
        "cumpreMargem": resultado["margemContraFalha"] >= caso.margem_alvo,
        "procedencia": procedencia(nome),
        "leiaAssim": ("margem nominal, sem a dispersão do lote; o estudo é quem "
                      "roda a cauda ruim, e é ela que decide compra"),
    }


def diametro_minimo(nome: str, *, caso: Caso = Caso(),
                    parede_m: float | None = None) -> dict[str, Any]:
    """O diâmetro mais fino que ainda cumpre a margem alvo, em valor e em milímetro.

    DOIS NÚMEROS, E NÃO UM. A varredura arredondada já escondeu, neste estudo,
    uma reprova por cinco milésimos: o painel dizia 1,00 e o valor era 0,9952.
    Aqui o exato e o comprável saem separados, e o milímetro devolvido é
    RECONFERIDO rodando a viga nele — não é o exato arredondado para cima na
    confiança de que arredondar para cima sempre ajuda.
    """
    _material(nome)
    tipo = GEOMETRIAS[nome][0]
    if tipo == "macica" and parede_m is not None:
        raise falhar("contrato", "parede-em-secao-macica",
                     f"'{nome}' é barra cheia neste estudo e não tem parede.",
                     local="parede_m")

    def margem(d: float) -> float:
        return avaliar(nome, caso=caso, diametro_m=d, parede_m=parede_m)["margemContraFalha"]

    teto = caso.diametro_maximo_m
    try:
        margem_no_teto = margem(teto)
    except Exception as erro:  # parede que não cabe no tubo, por exemplo
        raise falhar("instrumento", "geometria-impossivel-no-teto",
                     f"'{nome}' não fecha geometria em {teto * 1000:.1f} mm.",
                     local="diametro_maximo_m", causa=str(erro)) from erro
    if margem_no_teto < caso.margem_alvo:
        return {
            "instrumento": INSTRUMENTO,
            "versao": VERSAO,
            "natureza": NATUREZA,
            "candidato": nome,
            "caso": caso.documento(),
            "existe": False,
            "margemNoTeto": margem_no_teto,
            "porque": ("nem no diâmetro máximo de empunhadura a margem alvo é "
                       "alcançada; engrossar mais não é opção que a mão aceite"),
        }

    # A margem cresce com o diâmetro (tensão cai com d³), então bisseção serve.
    baixo, alto = 1e-4, teto
    for _ in range(80):
        meio = (baixo + alto) / 2
        try:
            ok = margem(meio) >= caso.margem_alvo
        except Exception:
            baixo = meio  # geometria impossível é sempre do lado fino
            continue
        if ok:
            alto = meio
        else:
            baixo = meio
    exato = alto

    milimetro = math.ceil(exato / PASSO_DE_FABRICACAO_M) * PASSO_DE_FABRICACAO_M
    while milimetro <= teto + 1e-12 and margem(min(milimetro, teto)) < caso.margem_alvo:
        milimetro += PASSO_DE_FABRICACAO_M
    passa_no_milimetro = milimetro <= teto + 1e-12
    return {
        "instrumento": INSTRUMENTO,
        "versao": VERSAO,
        "natureza": NATUREZA,
        "candidato": nome,
        "caso": caso.documento(),
        "existe": True,
        "exato_m": exato,
        "milimetroQuePassa_m": milimetro if passa_no_milimetro else None,
        "margemNoMilimetro": margem(milimetro) if passa_no_milimetro else None,
        "leiaAssim": ("o exato é da conta e o milímetro é do fornecedor; comprar "
                      "pelo exato arredondado é como a reprova por cinco "
                      "milésimos passou despercebida uma vez"),
        "cuidado": ("este diâmetro cumpre a margem no valor NOMINAL da "
                    "propriedade; o estudo dimensiona pela cauda ruim do lote "
                    "e por isso chega a peça mais grossa que esta"),
    }


def peneirar(*, caso: Caso = Caso(), diametro_m: float | None = None) -> dict[str, Any]:
    """Situa todos os candidatos contra o piso físico do caso.

    Não confunda com aprovação: a peneira só diz quem está ELIMINADO, e por qual
    das duas restrições. Preço, dureza, saúde e durabilidade ficam de fora.
    """
    diametro = caso.diametro_maximo_m if diametro_m is None else diametro_m
    piso = fronteira(forca_n=caso.forca_n, comprimento_m=caso.comprimento_m,
                     diametro_m=diametro, massa_maxima_kg=caso.massa_maxima_kg,
                     flecha_maxima_m=caso.flecha_maxima_m,
                     margem_alvo=caso.margem_alvo)
    linhas = []
    for nome in candidatos():
        material = MATERIAIS[nome]
        secao = secao_macica(diametro)
        escala = fator_de_escala(nome, secao["area"] * caso.comprimento_m)
        linhas.append(situar(
            piso,
            resistencia_pa=material["resistencia_pa"] * escala["fator"],
            modulo_pa=material["modulo_pa"],
            densidade_kg_m3=material["densidade_kg_m3"],
            nome=nome,
        ))
    return {
        "instrumento": INSTRUMENTO,
        "versao": VERSAO,
        "natureza": NATUREZA,
        "caso": caso.documento(),
        "fronteira": piso.documento(),
        "candidatos": tuple(linhas),
        "leiaAssim": ("o efeito de tamanho aqui é calculado no volume de uma barra "
                      "CHEIA no diâmetro do piso, que é o volume mais desfavorável; "
                      "quem existe como tubo leva desconto maior do que levaria"),
    }
