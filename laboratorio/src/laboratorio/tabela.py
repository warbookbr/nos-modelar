"""A tabela curada de materiais do laboratório, em arquivo e não em código.

POR QUE ELA EXISTE. Até aqui, as propriedades moravam dentro do estudo que as
usava — o módulo do eucalipto vivia em `estudos/cabo_de_pa.py`. Isso tem dois
custos, e os dois já se pagaram: o próximo estudo recomeça da minha memória, e
copiar número de um estudo para outro carrega junto a condição do primeiro. Foi
assim que 75 MPa de madeira VERDE virou propriedade de um cabo SECO, subestimando
o concorrente em 50% até o Wood Handbook me corrigir.

O QUE ESTA TABELA IMPÕE, e é o ponto dela. Nenhuma linha entra como número solto.
`materiais.Propriedade` já exige unidade, **condição** e **origem**, e recusa
quem se diz publicada sem citar fonte. A tabela só carrega e valida — a
disciplina é do tipo, não deste arquivo.

O QUE ELA TORNA VISÍVEL, e isto é desconfortável de propósito: hoje 27 das 36
propriedades são `estimada`, ou seja, valor de manual lembrado e não conferido.
Enterrado dentro de um estudo isso vira nota de rodapé; numa tabela com uma
coluna de origem, vira a primeira coisa que se vê. `cobertura()` conta.

COMPOSIÇÃO TEM DUAS BASES AQUI, e a distinção é obrigatória. Aço se descreve por
elemento, e aí a tabela periódica confere cada símbolo — 'Fee' não passa. Madeira
e bambu se descrevem por constituinte (celulose, lignina), que não são elementos
e não podem ser conferidos contra a tabela periódica. Misturar as duas faria a
validação parecer que aconteceu quando não aconteceu.

ISTO NÃO CALCULA NADA. Não há regra de mistura, previsão nem conversão aqui.
Cálculo é instrumento e instrumento declara domínio; aqui só mora o dado.
"""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from .erros import falhar
from .materiais import Composicao, Material, Propriedade
from .periodica import RAIZ_DE_DADOS, conferir_simbolos
from .unidades import Grandeza, dimensao

FORMATO_TABELA = "lab.tabela-de-materiais@1"

#: As bases de composição aceitas, e por que são duas. Ver o cabeçalho.
BASES = frozenset(("elementar", "constituinte"))

#: Dimensões nomeadas que a tabela sabe montar. Nome de dimensão desconhecido é
#: recusado em vez de virar adimensional em silêncio.
DIMENSOES = {
    "pressao": dimensao(massa=1, comprimento=-1, tempo=-2),
    "densidade": dimensao(massa=1, comprimento=-3),
    "adimensional": dimensao(),
}


def _grandeza(p: dict[str, Any]) -> Grandeza:
    nome = p.get("dimensao")
    if nome not in DIMENSOES:
        raise falhar("contrato", "dimensao-desconhecida",
                     f"'{p.get('nome')}' declara dimensão {nome!r}; "
                     f"conhecidas: {sorted(DIMENSOES)}.", local="dimensao")
    return Grandeza(float(p["valor"]), p["unidade"], DIMENSOES[nome])


def _material(m: dict[str, Any]) -> Material:
    base = m.get("baseDaComposicao")
    if base not in BASES:
        raise falhar("contrato", "base-de-composicao-invalida",
                     f"'{m.get('identidade')}' declara base {base!r}; "
                     f"aceitas: {sorted(BASES)}.", local="baseDaComposicao")
    fracoes = {str(k): float(v) for k, v in m["fracoes"].items()}
    if base == "elementar":
        # Só aqui a tabela periódica tem o que dizer. Chamá-la sobre celulose
        # devolveria erro verdadeiro sobre uma pergunta errada.
        conferir_simbolos(fracoes)
    propriedades = tuple(
        Propriedade(nome=p["nome"], valor=_grandeza(p), condicao=p["condicao"],
                    origem=p["origem"], fonte=p.get("fonte"))
        for p in m["propriedades"]
    )
    return Material(
        identidade=m["identidade"],
        composicao=Composicao(fracoes),
        propriedades=propriedades,
        processamento=m.get("processamento"),
        notas={**m.get("notas", {}), "baseDaComposicao": base},
    )


@lru_cache(maxsize=1)
def carregar() -> dict[str, Material]:
    """Lê a tabela do disco uma vez e devolve os materiais por identidade."""
    arquivo = RAIZ_DE_DADOS / "materiais" / "tabela.json"
    if not arquivo.is_file():
        raise falhar("contrato", "tabela-ausente", f"não achei {arquivo}.",
                     local="dados/materiais/tabela.json")
    doc = json.loads(arquivo.read_text(encoding="utf-8"))
    if doc.get("formato") != FORMATO_TABELA:
        raise falhar("contrato", "formato-desconhecido",
                     f"esperava '{FORMATO_TABELA}', veio {doc.get('formato')!r}.",
                     local="formato")
    fora: dict[str, Material] = {}
    for m in doc["materiais"]:
        material = _material(m)
        if material.identidade in fora:
            raise falhar("contrato", "material-repetido",
                         f"'{material.identidade}' aparece duas vezes.",
                         local="materiais")
        fora[material.identidade] = material
    if not fora:
        raise falhar("contrato", "tabela-vazia", "a tabela não tem material.",
                     local="materiais")
    return fora


def material(identidade: str) -> Material:
    """Busca um material, listando os que existem quando erra."""
    achado = carregar().get(identidade)
    if achado is None:
        raise falhar("contrato", "material-ausente",
                     f"'{identidade}' não está na tabela. "
                     f"Existem: {sorted(carregar())}.", local="identidade")
    return achado


def valor(identidade: str, propriedade: str, condicao: str) -> Propriedade:
    """Atalho para uma propriedade, exigindo a condição.

    A condição é obrigatória de propósito: pedir 'o módulo' sem dizer em que
    condição é exatamente o atalho que produziu o erro do eucalipto verde.
    """
    return material(identidade).propriedade(propriedade, condicao)


def cobertura() -> dict[str, Any]:
    """Quanto da tabela é fonte de verdade e quanto ainda é memória.

    Este número é o placar honesto do laboratório, e ele deve subir com o tempo.
    Se ele parar de subir enquanto a tabela cresce, a tabela está piorando.
    """
    contagem: dict[str, int] = {}
    sem_fonte: list[str] = []
    for m in carregar().values():
        for p in m.propriedades:
            contagem[p.origem] = contagem.get(p.origem, 0) + 1
            if p.origem != "publicada":
                sem_fonte.append(f"{m.identidade}.{p.nome}")
    total = sum(contagem.values())
    return {
        "formato": "lab.cobertura-da-tabela@1",
        "materiais": len(carregar()),
        "propriedades": total,
        "porOrigem": dict(sorted(contagem.items())),
        "fracaoPublicada": contagem.get("publicada", 0) / total if total else 0.0,
        "aConferir": sorted(sem_fonte),
        "leiaAssim": ("`fracaoPublicada` é o placar. O resto é valor de manual de "
                      "memória, e serve para pensar, não para decidir compra."),
    }
