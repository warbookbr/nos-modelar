"""Decidir entre candidatas quando não existe uma melhor em tudo.

O CASO NORMAL EM MATERIAIS. A liga mais resistente é mais frágil, ou mais cara,
ou depende de um elemento que ninguém consegue comprar. Eleger uma campeã exige
dizer quanto vale cada coisa — e esse é um julgamento de quem decide, não um
resultado do experimento.

O QUE ESTE MÓDULO ENTREGA. A **fronteira**: as candidatas que ninguém supera em
tudo. Ela sai dos dados sozinha, sem ninguém arbitrar peso. E, para cada uma, o
que se perde ao escolhê-la em vez das outras — que é a informação que o
tomador de decisão realmente usa.

A RECUSA CENTRAL. Ranking só sai se os pesos vierem declarados, e a saída diz que
foi o peso que decidiu, não o dado. Devolver "a melhor" a partir de vários
critérios sem pesos é embutir a preferência de quem escreveu o código dentro de
um número que parece objetivo.

CRITÉRIO É GRANDEZA, não número nu — inclusive custo e disponibilidade, que aqui
são critério e não detalhe. Comparar candidatas cujo mesmo critério vem em
unidades diferentes é o erro de unidade decidindo compra de material.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence

from .erros import falhar
from .unidades import Grandeza

FORMATO = "lab.fronteira-de-trocas@1"

SENTIDOS = ("maximizar", "minimizar")


@dataclass(frozen=True)
class Criterio:
    """Uma coisa que se quer, e para que lado ela é melhor."""

    nome: str
    sentido: str

    def __post_init__(self) -> None:
        if self.sentido not in SENTIDOS:
            # Sem sentido declarado não há default seguro: custo menor é melhor,
            # resistência maior é melhor, e adivinhar pelo nome é adivinhar.
            raise falhar("contrato", "sentido-invalido",
                         f"'{self.nome}' precisa de sentido {list(SENTIDOS)}; veio '{self.sentido}'.",
                         local="sentido")


@dataclass(frozen=True)
class Candidata:
    """Uma opção avaliada em cada critério, com unidade."""

    identidade: str
    valores: dict[str, Grandeza]

    def __post_init__(self) -> None:
        if not self.identidade.strip():
            raise falhar("contrato", "campo-vazio", "identidade precisa de texto.",
                         local="identidade")
        if not self.valores:
            raise falhar("contrato", "candidata-sem-valor",
                         f"'{self.identidade}' não foi avaliada em nada.", local="valores")


def _conferir(candidatas: Sequence[Candidata], criterios: Sequence[Criterio]) -> None:
    if not candidatas:
        raise falhar("contrato", "sem-candidatas", "não há o que comparar.", local="candidatas")
    if not criterios:
        raise falhar("contrato", "sem-criterios",
                     "comparar sem critério é escolher por gosto.", local="criterios")
    nomes = [c.nome for c in criterios]
    if len(set(nomes)) != len(nomes):
        raise falhar("contrato", "criterio-repetido",
                     f"critério citado duas vezes: {sorted({n for n in nomes if nomes.count(n) > 1})}.",
                     local="criterios")
    referencia: dict[str, Grandeza] = {}
    for candidata in candidatas:
        for criterio in criterios:
            valor = candidata.valores.get(criterio.nome)
            if valor is None:
                # Candidata sem um critério não é "neutra" nele: ela é
                # desconhecida, e tratar desconhecido como zero elegeria ou
                # eliminaria alguém por ausência de dado.
                raise falhar(
                    "contrato", "avaliacao-faltando",
                    f"'{candidata.identidade}' não tem '{criterio.nome}'.",
                    local="valores",
                    acaoSugerida="Meça, ou tire a candidata; ausência não é valor neutro.",
                )
            anterior = referencia.get(criterio.nome)
            if anterior is None:
                referencia[criterio.nome] = valor
            elif not anterior.comparavel_com(valor):
                raise falhar(
                    "contrato", "criterio-em-unidades-diferentes",
                    f"'{criterio.nome}' vem em '{anterior.unidade}' e em '{valor.unidade}'.",
                    local="valores",
                )


def _melhor_ou_igual(a: Grandeza, b: Grandeza, sentido: str) -> bool:
    return a.valor >= b.valor if sentido == "maximizar" else a.valor <= b.valor


def _domina(a: Candidata, b: Candidata, criterios: Sequence[Criterio]) -> bool:
    """`a` domina `b` se não é pior em nada e é melhor em ao menos um."""
    nao_pior = all(_melhor_ou_igual(a.valores[c.nome], b.valores[c.nome], c.sentido)
                   for c in criterios)
    melhor_em_algo = any(a.valores[c.nome].valor != b.valores[c.nome].valor and
                         _melhor_ou_igual(a.valores[c.nome], b.valores[c.nome], c.sentido)
                         for c in criterios)
    return nao_pior and melhor_em_algo


def fronteira(candidatas: Sequence[Candidata], criterios: Sequence[Criterio]) -> dict[str, Any]:
    """As candidatas que ninguém supera em tudo, e o que cada uma custa.

    Isto sai dos dados sem ninguém arbitrar peso — por isso é o resultado que o
    laboratório pode entregar sozinho.
    """
    _conferir(candidatas, criterios)
    sobreviventes = [
        a for a in candidatas
        if not any(_domina(b, a, criterios) for b in candidatas if b.identidade != a.identidade)
    ]
    eliminadas = {
        a.identidade: sorted(b.identidade for b in candidatas
                             if b.identidade != a.identidade and _domina(b, a, criterios))
        for a in candidatas if a not in sobreviventes
    }

    trocas: dict[str, Any] = {}
    for a in sobreviventes:
        perdas = []
        for b in sobreviventes:
            if b.identidade == a.identidade:
                continue
            for c in criterios:
                va, vb = a.valores[c.nome], b.valores[c.nome]
                if not _melhor_ou_igual(va, vb, c.sentido) and va.valor != vb.valor:
                    perdas.append({
                        "criterio": c.nome, "perde_para": b.identidade,
                        "diferenca": abs(vb.valor - va.valor), "unidade": va.unidade,
                    })
        trocas[a.identidade] = perdas

    return {
        "formato": FORMATO,
        "fronteira": sorted(c.identidade for c in sobreviventes),
        "dominadas": eliminadas,
        "trocas": trocas,
        "criterios": [{"nome": c.nome, "sentido": c.sentido} for c in criterios],
        # Dito na saída para ninguém precisar deduzir por que não veio um vencedor.
        "vencedor": None,
        "porQueSemVencedor": ("eleger uma exige dizer quanto vale cada critério, "
                              "e isso é julgamento de quem decide, não resultado do experimento"),
    }


def ordenar_com_pesos(candidatas: Sequence[Candidata], criterios: Sequence[Criterio],
                      pesos: dict[str, float], *, justificativa: str) -> dict[str, Any]:
    """Ranking, e só com os pesos declarados e justificados.

    A saída diz que o peso decidiu. Um ranking multicritério que esconde os pesos
    é preferência de quem escreveu o código vestida de resultado objetivo.
    """
    _conferir(candidatas, criterios)
    if not justificativa.strip():
        raise falhar("contrato", "pesos-sem-justificativa",
                     "peso sem justificativa é preferência disfarçada de resultado.",
                     local="justificativa")
    faltando = sorted({c.nome for c in criterios} - set(pesos))
    if faltando:
        raise falhar("contrato", "peso-faltando",
                     f"sem peso para {faltando}; critério sem peso seria descartado em silêncio.",
                     local="pesos")
    sobrando = sorted(set(pesos) - {c.nome for c in criterios})
    if sobrando:
        raise falhar("contrato", "peso-sem-criterio",
                     f"há peso para {sobrando}, que não é critério.", local="pesos")
    if any(p < 0 for p in pesos.values()):
        raise falhar("contrato", "peso-negativo",
                     "peso negativo inverte o sentido do critério pelas costas.", local="pesos")
    if sum(pesos.values()) <= 0:
        raise falhar("contrato", "pesos-nulos", "todos os pesos são zero.", local="pesos")

    # Normalizar por faixa dentro de cada critério: sem isso, um critério em MPa
    # domina um em fração só por ser numericamente maior, e o peso vira enfeite.
    faixas = {}
    for c in criterios:
        vs = [x.valores[c.nome].valor for x in candidatas]
        faixas[c.nome] = (min(vs), max(vs))

    pontuadas = []
    for candidata in candidatas:
        total = 0.0
        for c in criterios:
            lo, hi = faixas[c.nome]
            v = candidata.valores[c.nome].valor
            normal = 0.5 if hi == lo else (v - lo) / (hi - lo)
            if c.sentido == "minimizar":
                normal = 1.0 - normal
            total += pesos[c.nome] * normal
        pontuadas.append((total, candidata.identidade))

    # Empate desempata por nome, e o empate fica visível em vez de sumir.
    ordem = sorted(pontuadas, key=lambda t: (-t[0], t[1]))
    melhor = ordem[0][0]
    empatadas = sorted(nome for pontos, nome in ordem if pontos == melhor)
    return {
        "formato": FORMATO,
        "ordem": [{"candidata": nome, "pontos": pontos} for pontos, nome in ordem],
        "primeiraColocada": ordem[0][1],
        "empateNoTopo": empatadas if len(empatadas) > 1 else [],
        "pesos": dict(sorted(pesos.items())),
        "justificativaDosPesos": justificativa,
        "quemDecidiu": "os pesos declarados, não o experimento",
    }
