"""A tabela periódica, e o que ela permite exigir de uma composição.

POR QUE ELA ESTÁ AQUI, e não é enfeite. Sem ela, `Composicao` aceita qualquer
texto como elemento: "Fee" a 0,98 e "C" a 0,02 soma 1,0 e passa como aço. O erro
não aparece — aparece uma liga. Com a tabela, símbolo que não existe é recusado
na entrada, que é o único lugar onde ainda é barato.

O SEGUNDO USO, que é o que dá trabalho de verdade: converter fração em massa
para fração atômica. `materiais.py` já avisa que 1% de carbono em massa é ~4,5%
atômico no ferro, e essa conversão precisa de massa atômica — que é exatamente o
que esta tabela guarda. Trocar de base em silêncio muda todo número derivado
depois.

O QUE ESTA TABELA NÃO É. Ela não tem densidade, ponto de fusão, dureza nem
eletronegatividade. Número atômico e símbolo são definição, e massa atômica
padrão é valor IUPAC estável e conferível; propriedade física de elemento
depende de fase, alotropia e temperatura, e cair aqui sem condição seria repetir
o erro que `materiais.py` existe para impedir. Propriedade física entra pela
tabela de materiais, com condição e origem, ou por `bancos.py`.

MASSA DE ELEMENTO SEM ISÓTOPO ESTÁVEL não é massa atômica padrão: é a massa do
isótopo de maior meia-vida. Ela vem marcada, e converter base usando um desses
sem saber disso é um erro que este módulo deixa visível em vez de esconder.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from .erros import falhar

FORMATO_TABELA = "lab.tabela-periodica@1"

#: A raiz de dados curados do laboratório. Dado fica em arquivo, não em código:
#: assim ele é conferível na revisão e some do diff quando não muda.
RAIZ_DE_DADOS = Path(__file__).resolve().parents[2] / "dados"


@dataclass(frozen=True)
class Elemento:
    z: int
    simbolo: str
    nome: str
    massa_atomica_u: float
    #: Verdadeiro quando o elemento não tem isótopo estável e a massa é a do
    #: isótopo de maior meia-vida. Não é massa atômica padrão.
    massa_e_de_isotopo: bool

    def documento(self) -> dict[str, Any]:
        return {"z": self.z, "simbolo": self.simbolo, "nome": self.nome,
                "massaAtomica_u": self.massa_atomica_u,
                "massaEhDeIsotopo": self.massa_e_de_isotopo}


@lru_cache(maxsize=1)
def tabela() -> dict[str, Elemento]:
    """Carrega a tabela do disco uma vez, indexada por símbolo."""
    arquivo = RAIZ_DE_DADOS / "elementos.json"
    if not arquivo.is_file():
        raise falhar("contrato", "tabela-periodica-ausente",
                     f"não achei {arquivo}.", local="dados/elementos.json")
    doc = json.loads(arquivo.read_text(encoding="utf-8"))
    if doc.get("formato") != FORMATO_TABELA:
        raise falhar("contrato", "formato-desconhecido",
                     f"esperava '{FORMATO_TABELA}', veio {doc.get('formato')!r}.",
                     local="formato")
    fora: dict[str, Elemento] = {}
    for e in doc["elementos"]:
        fora[e["simbolo"]] = Elemento(
            z=e["z"], simbolo=e["simbolo"], nome=e["nome"],
            massa_atomica_u=e["massaAtomica_u"],
            massa_e_de_isotopo=e["massaEhDeIsotopo"])
    if len(fora) != 118:
        raise falhar("contrato", "tabela-incompleta",
                     f"a tabela tem {len(fora)} elementos; esperado 118.",
                     local="elementos")
    return fora


def elemento(simbolo: str) -> Elemento:
    """Busca por símbolo, com o `case` exato. 'FE' não é ferro."""
    achado = tabela().get(simbolo)
    if achado is None:
        raise falhar(
            "contrato", "elemento-inexistente",
            f"'{simbolo}' não é símbolo de elemento.",
            local="simbolo",
            acaoSugerida=("Símbolo é sensível a maiúscula: 'Fe' é ferro, 'FE' e 'fe' "
                          "não são nada. Composição com símbolo inventado vira liga "
                          "que ninguém percebe."),
        )
    return achado


def conferir_simbolos(simbolos) -> None:
    """Recusa a coleção inteira se qualquer símbolo não existir."""
    desconhecidos = sorted(s for s in simbolos if s not in tabela())
    if desconhecidos:
        raise falhar("contrato", "elemento-inexistente",
                     f"não são elementos: {desconhecidos}.", local="fracoes")


def massa_para_atomica(fracoes_em_massa: dict[str, float]) -> dict[str, float]:
    """Converte fração em massa para fração atômica.

    ESTA CONVERSÃO É A RAZÃO DE A TABELA EXISTIR. Ela não é cosmética: 1% de
    carbono em massa no ferro é cerca de 4,5% atômico, e os dois números se
    parecem o bastante para trocarem de lugar sem ninguém ver.
    """
    conferir_simbolos(fracoes_em_massa)
    if not fracoes_em_massa:
        raise falhar("contrato", "composicao-vazia",
                     "não há fração para converter.", local="fracoes")
    incertos = sorted(s for s in fracoes_em_massa if elemento(s).massa_e_de_isotopo)
    if incertos:
        raise falhar(
            "contrato", "massa-atomica-nao-padrao",
            f"{incertos} não têm isótopo estável, e a massa tabelada é a do isótopo "
            "de maior meia-vida.",
            local="fracoes",
            acaoSugerida=("Converter base com essa massa dá um número que parece "
                          "fração atômica e não é. Declare o isótopo que você usa."),
        )
    mols = {s: f / elemento(s).massa_atomica_u for s, f in fracoes_em_massa.items()}
    total = sum(mols.values())
    if total <= 0:
        raise falhar("contrato", "fracoes-nao-positivas",
                     "as frações somam zero ou menos.", local="fracoes")
    return {s: m / total for s, m in sorted(mols.items())}
