"""A literatura por trás do estudo do cabo — e o que ela sustenta, que é menos
do que parece.

O QUE ESTAS REFERÊNCIAS SUSTENTAM: que as perguntas do estudo são perguntas
reconhecidas, com campo ativo e gente publicando. Isso é o que separa "eu acho"
de "existe literatura sobre isto, aqui está o DOI".

O QUE ELAS NÃO SUSTENTAM, e a distinção precisa sobreviver a quem for repassar o
material: **nenhum destes artigos foi lido.** O que veio do Crossref é metadado —
título, DOI, revista, ano, citações. Nenhum número deste estudo veio de nenhum
deles, e um título não sustenta valor de resistência, de módulo nem de fator de
perda.

Por isso este módulo constrói `Fonte` e não constrói `Alegacao`. A alegação exige
ler o artigo, ver a condição em que o número foi obtido e decidir se ela se
parece com a nossa — três coisas que são trabalho de pessoa, e nenhuma delas
cabe num campo de metadado.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ..fontes import Fonte, Grafo

RAIZ = Path(__file__).resolve().parents[3] / "pesquisa" / "cache"

#: Por que cada busca foi feita. Consulta sem pergunta por trás é pescaria, e o
#: registro do motivo é o que permite alguém julgar se a busca foi honesta ou se
#: foi atrás do que confirmava a ideia.
BUSCAS = {
    "lignin based wood adhesive bonding strength formaldehyde free":
        "o candidato depende de um ligante natural que cole bem; o campo existe?",
    "formaldehyde emission particleboard adhesive regulation health":
        "a recusa da variante fenólica se apoia em risco reconhecido, ou é implicância minha?",
    "paper phenolic laminate mechanical properties composite":
        "laminado de papel tem propriedades mecânicas estudadas?",
    "damping loss factor wood metal comparison vibration":
        "a diferença de amortecimento entre madeira e metal é medida por alguém?",
    "moisture absorption cellulose composite mechanical degradation":
        "a ameaça que eu apontei ao candidato — umidade — é reconhecida?",
    "hand arm vibration tool handle damping material":
        "vibração em cabo de ferramenta é preocupação estabelecida ou detalhe?",
    "bamboo culm mechanical properties flexural strength":
        "bambu tem propriedade mecânica medida e publicada, e o nó importa?",
    "bamboo tool handle vibration damping":
        "alguém já mediu bambu por amortecimento?",
    "bamboo preservation boron treatment durability":
        "o tratamento contra caruncho é procedimento estabelecido?",
    "laminated bamboo engineered structural properties":
        "bambu laminado tem base industrial e estrutural?",
}


def carregar() -> list[dict[str, Any]]:
    """Lê as consultas guardadas em disco. Não vai à rede."""
    consultas = []
    for arquivo in sorted(RAIZ.glob("*.json")):
        consultas.append(json.loads(arquivo.read_text(encoding="utf-8")))
    return consultas


def montar_grafo() -> Grafo:
    """Põe as publicações no grafo como FONTES, e nenhuma alegação."""
    grafo = Grafo()
    vistos: set[str] = set()
    for consulta in carregar():
        for item in consulta["itens"]:
            if not item["doi"] or item["doi"] in vistos:
                continue
            vistos.add(item["doi"])
            grafo.acrescentar_fonte(Fonte(
                identidade=item["doi"],
                titulo=item["titulo"],
                # `secundaria` seria mentira e `primaria` também: do metadado não
                # dá para saber se o artigo mediu ou revisou. Fica `primaria`
                # apenas para artigo de periódico, e a limitação está dita aqui.
                natureza="primaria" if item["tipo"] == "journal-article" else "secundaria",
                licenca=(item["licencas"][0] if item["licencas"] else "não declarada no metadado"),
                versao=str(item["ano"]),
            ))
    return grafo


def resumo() -> dict[str, Any]:
    """O que a bibliografia é, com o limite colado nela."""
    consultas = carregar()
    grafo = montar_grafo()
    return {
        "consultas": len(consultas),
        "publicacoes": len(grafo.documento()["fontes"]),
        "alegacoes": len(grafo.documento()["alegacoes"]),
        "sustenta": ("que as perguntas do estudo são reconhecidas e têm campo ativo"),
        "naoSustenta": ("nenhum número do estudo: os artigos NÃO foram lidos, só os "
                        "metadados foram obtidos, e título não sustenta valor medido"),
        "porQueZeroAlegacoes": ("alegação exige ler o artigo e comparar a condição dele "
                                "com a nossa; isso é trabalho de pessoa, não de metadado"),
    }
