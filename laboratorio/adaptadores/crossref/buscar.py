"""Busca metadados de artigo no Crossref e devolve fontes, nunca alegações.

A LINHA QUE ESTE MÓDULO NÃO CRUZA, e ela é a razão de ele existir separado do
grafo: **Crossref devolve metadado, não conteúdo**. Título, DOI, revista, ano,
licença. Nada disso diz o que o artigo mediu, em que condição, nem com que
resultado.

Fabricar `Alegacao` a partir de título seria a violação exata de "fonte não é
verdade": um título como "Lignin-based adhesive for particleboard" sustenta que
alguém publicou sobre o assunto, e absolutamente nada sobre o valor de
resistência que se queira citar. Por isso a função devolve fonte e para ali.
Quem quiser alegação lê o artigo — pessoa, não este código.

O QUE ELE ENTREGA DE ÚTIL MESMO ASSIM. Uma bibliografia com DOI verificável, que
é o que separa "eu acho" de "existe literatura sobre isto, aqui está".

CACHE EM DISCO, e não é conveniência: sem ele a mesma pesquisa devolve coisa
diferente daqui a um mês e o estudo deixa de reproduzir.

CORTESIA E LIMITE. O Crossref pede identificação no user-agent e pede que não se
martele o serviço. A pausa entre chamadas e o teto de linhas não são educação: é
o que mantém o acesso aberto para todo mundo.
"""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path
from typing import Any

BASE = "https://api.crossref.org/works"
AGENTE = "mecanifica-laboratorio/1.0 (pesquisa academica)"
PAUSA_S = 1.0
MAXIMO_POR_CONSULTA = 20


def _pedir(parametros: dict[str, str]) -> dict[str, Any]:
    url = f"{BASE}?{urllib.parse.urlencode(parametros)}"
    pedido = urllib.request.Request(url, headers={"User-Agent": AGENTE})
    with urllib.request.urlopen(pedido, timeout=30) as resposta:
        return json.loads(resposta.read().decode("utf-8"))


def buscar(consulta: str, *, cache: Path | str, linhas: int = 10,
           desde: int | None = None) -> dict[str, Any]:
    """Devolve os metadados da consulta, do cache quando já foi feita."""
    linhas = min(linhas, MAXIMO_POR_CONSULTA)
    raiz = Path(cache)
    raiz.mkdir(parents=True, exist_ok=True)
    chave = urllib.parse.quote(f"{consulta}|{linhas}|{desde}", safe="")[:180]
    arquivo = raiz / f"{chave}.json"
    if arquivo.is_file():
        guardado = json.loads(arquivo.read_text(encoding="utf-8"))
        return {**guardado, "veioDe": "cache"}

    parametros = {
        "query.bibliographic": consulta,
        "rows": str(linhas),
        "select": "DOI,title,container-title,issued,type,license,is-referenced-by-count,author",
        "sort": "relevance",
    }
    if desde:
        parametros["filter"] = f"from-pub-date:{desde}-01-01"
    bruto = _pedir(parametros)
    time.sleep(PAUSA_S)

    # FILTRO, e ele tem motivo. O Crossref indexa material suplementar com DOI
    # próprio (`component`), e esses entram no topo da relevância sem serem
    # artigo nenhum. Sem ano também sai: referência que não se data não se
    # confere. O que sobra é o que alguém consegue abrir e ler.
    TIPOS_ACEITOS = {"journal-article", "book-chapter", "proceedings-article", "review"}
    itens = []
    for item in bruto["message"]["items"]:
        if item.get("type") not in TIPOS_ACEITOS:
            continue
        if not (item.get("issued", {}).get("date-parts", [[None]])[0] or [None])[0]:
            continue
        autores = item.get("author", []) or []
        itens.append({
            "doi": item.get("DOI", ""),
            "titulo": (item.get("title") or [""])[0],
            "revista": (item.get("container-title") or [""])[0],
            "ano": (item.get("issued", {}).get("date-parts", [[None]])[0] or [None])[0],
            "tipo": item.get("type", ""),
            "citacoes": item.get("is-referenced-by-count", 0),
            "licencas": [lic.get("URL", "") for lic in item.get("license", [])],
            "primeiroAutor": (autores[0].get("family", "") if autores else ""),
        })

    documento = {
        "fonte": "crossref",
        "consulta": consulta,
        "consultadoEm": date.today().isoformat(),
        "totalNaBase": bruto["message"].get("total-results"),
        "itens": sorted(itens, key=lambda i: (-i["citacoes"], -(i["ano"] or 0))),
        "descartados": len(bruto["message"]["items"]) - len(itens),
        "oQueIssoNaoE": ("metadado apenas; nenhum valor, condição ou conclusão de "
                         "artigo algum está aqui, e título não sustenta alegação"),
    }
    arquivo.write_text(json.dumps(documento, ensure_ascii=False, indent=1, sort_keys=True),
                       encoding="utf-8")
    return {**documento, "veioDe": "rede"}
