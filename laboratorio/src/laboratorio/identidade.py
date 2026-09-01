"""Identidade de documento por conteúdo: serialização canônica e SHA-256.

POR QUE CANÔNICA. Dois documentos com o mesmo conteúdo e ordens de chave
diferentes têm de dar o MESMO id, senão "já rodei isto" vira uma pergunta sem
resposta e a proveniência não fecha. Por isso a serialização é fixada aqui, uma
vez, e não deixada ao `json.dumps` de cada chamador.

O QUE A CANONIZAÇÃO DECIDE, e cada escolha tem um motivo:

  - chaves ORDENADAS, sem espaço: a ordem de escrita do autor não é conteúdo;
  - UTF-8 sem escape: `ç` é o mesmo caractere em qualquer arquivo, e escapá-lo
    faria o hash depender da configuração de quem serializou;
  - NÃO-FINITO RECUSADO. `NaN` e `Infinity` não existem em JSON, e o Python os
    escreve assim mesmo, gerando um documento que outro leitor rejeita. Pior:
    `NaN != NaN`, então dois documentos "iguais" com NaN nunca se comparam
    iguais. Medida que não é número é defeito, não dado;
  - INTEIRO E FLUTUANTE SÃO O MESMO VALOR quando o flutuante é exato. `2.0` vira
    `2`, senão a mesma medida lida de duas rotas dá dois ids. Isto é uma
    decisão, não uma sutileza: quem precisa distinguir 2 de 2.0 precisa de um
    campo de tipo, não de um dígito a mais no hash.
"""

from __future__ import annotations

import hashlib
import json
import math
from typing import Any

from .erros import falhar

FORMATO_ALGORITMO = "sha256"


def _canonizar(valor: Any, caminho: str = "$") -> Any:
    if isinstance(valor, bool) or valor is None or isinstance(valor, str):
        return valor
    if isinstance(valor, int):
        return valor
    if isinstance(valor, float):
        if not math.isfinite(valor):
            raise falhar(
                "contrato",
                "numero-nao-finito",
                f"{caminho} é {valor!r}, que não existe em JSON e nunca se compara igual a si mesmo.",
                local=caminho,
                acaoSugerida="Corrija a medida na origem; documento não guarda NaN nem infinito.",
            )
        return int(valor) if valor.is_integer() else valor
    if isinstance(valor, dict):
        for chave in valor:
            if not isinstance(chave, str):
                raise falhar(
                    "contrato",
                    "chave-nao-textual",
                    f"{caminho} tem a chave {chave!r}, que não é texto.",
                    local=caminho,
                )
        return {c: _canonizar(valor[c], f"{caminho}.{c}") for c in sorted(valor)}
    if isinstance(valor, (list, tuple)):
        # Ordem de LISTA é conteúdo — ela não é reordenada. Uma lista cuja ordem
        # não importa deveria ser declarada como conjunto pelo contrato, e o
        # contrato é quem sabe disso; a canonização não adivinha.
        return [_canonizar(item, f"{caminho}[{i}]") for i, item in enumerate(valor)]
    raise falhar(
        "contrato",
        "tipo-nao-serializavel",
        f"{caminho} é do tipo {type(valor).__name__}, que não tem representação canônica.",
        local=caminho,
        acaoSugerida="Converta para texto, número, booleano, nulo, lista ou dicionário.",
    )


def serializar(documento: Any) -> str:
    """Texto canônico de um documento. Mesmo conteúdo, mesmo texto, sempre."""
    return json.dumps(
        _canonizar(documento),
        sort_keys=True,
        ensure_ascii=False,
        separators=(",", ":"),
        allow_nan=False,
    )


def identificar(documento: Any) -> str:
    """Id por conteúdo, no formato `sha256:<hex>`."""
    bruto = serializar(documento).encode("utf-8")
    return f"{FORMATO_ALGORITMO}:{hashlib.sha256(bruto).hexdigest()}"
