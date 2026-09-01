"""Executa um plano já provado, com limites, cancelamento e registro do que houve.

AUTORIDADE SEPARADA. O executor recebe um plano JÁ ORDENADO pelo planejador e um
registro de operações; ele não valida grafo e não descobre capacidade. Se ele
também planejasse, "planejar não é executar" viraria letra morta.

O QUE ELE CONFINA DE VERDADE, e o que NÃO — dito aqui porque silêncio sobre
cobertura é mentira sobre cobertura, e um executor que se anuncia "confinado"
sem qualificar é a pior versão disso:

  CONFINA
  - TEMPO, por passo e para o plano inteiro. Passo que estoura é cancelado e
    registrado como `expirou`; o plano para ali.
  - ORÇAMENTO de passos, para plano gerado por engano não rodar até o fim.
  - PROPAGAÇÃO. Falha fecha o passo e interrompe o plano: não existe sucesso
    parcial silencioso, e passo seguinte não roda com entrada que não veio.
  - DIRETÓRIO. Cada execução recebe um diretório efêmero próprio.

  NÃO CONFINA, e cada um precisa de mecanismo que este processo não tem
  - REDE. As operações rodam no mesmo processo Python; bloquear rede aqui exigiria
    subprocesso com política de sistema. O manifesto do instrumento é quem declara
    se usa rede, e essa declaração é promessa, não barreira.
  - SISTEMA DE ARQUIVOS fora do diretório efêmero.
  - MEMÓRIA e processos filhos.
  Enquanto for assim, este executor serve para instrumento local e confiável —
  que é o único que o laboratório tem — e NÃO para código de terceiro.
"""

from __future__ import annotations

import shutil
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from .erros import ErroLaboratorio, falhar
from .plano import Passo

Operacao = Callable[..., Any]

ESTADOS = ("concluida", "falhou", "expirou", "cancelada", "nao-executada")


@dataclass
class ResultadoPasso:
    passo: str
    estado: str
    duracao_s: float
    saidas: dict[str, Any]
    erro: dict[str, Any] | None = None

    def documento(self) -> dict[str, Any]:
        return {
            "passo": self.passo,
            "estado": self.estado,
            "duracaoS": round(self.duracao_s, 6),
            "saidas": sorted(self.saidas),
            "erro": self.erro,
        }


class Cancelado(Exception):
    """Pedido de parada vindo de fora, tratado como estado e não como defeito."""


def executar(
    ordem: tuple[Passo, ...],
    operacoes: dict[str, Operacao],
    *,
    limite_por_passo_s: float = 60.0,
    limite_total_s: float = 600.0,
    limite_de_passos: int = 100,
    cancelado: Callable[[], bool] = lambda: False,
) -> dict[str, Any]:
    """Roda os passos em ordem. Falha ou estouro fecha o plano ali mesmo."""
    if len(ordem) > limite_de_passos:
        raise falhar(
            "orcamento", "passos-acima-do-teto",
            f"O plano tem {len(ordem)} passos e o teto é {limite_de_passos}.",
            local="limite_de_passos",
            acaoSugerida="Suba o teto DELIBERADAMENTE ou reduza o plano; não é para passar sem decidir.",
        )

    valores: dict[str, Any] = {}
    resultados: list[ResultadoPasso] = []
    inicio_total = time.monotonic()
    raiz = Path(tempfile.mkdtemp(prefix="lab-execucao-"))
    interrompido = False

    try:
        for passo in ordem:
            if interrompido:
                resultados.append(ResultadoPasso(passo.nome, "nao-executada", 0.0, {}))
                continue

            gasto = time.monotonic() - inicio_total
            if gasto >= limite_total_s:
                resultados.append(ResultadoPasso(
                    passo.nome, "expirou", 0.0, {},
                    {"codigo": "tempo-total-esgotado",
                     "mensagem": f"O plano gastou {gasto:.1f}s do teto de {limite_total_s}s."},
                ))
                interrompido = True
                continue

            operacao = operacoes.get(passo.operacao)
            if operacao is None:
                resultados.append(ResultadoPasso(
                    passo.nome, "falhou", 0.0, {},
                    {"codigo": "operacao-ausente",
                     "mensagem": f"'{passo.operacao}' não foi fornecida ao executor."},
                ))
                interrompido = True
                continue

            diretorio = raiz / passo.nome
            diretorio.mkdir(parents=True, exist_ok=True)
            entradas = {nome: valores[nome] for nome in passo.consome}
            comeco = time.monotonic()
            try:
                if cancelado():
                    raise Cancelado()
                saida = operacao(
                    **passo.parametros, entradas=entradas, diretorio=diretorio,
                )
                duracao = time.monotonic() - comeco
                # O tempo é conferido DEPOIS: sem subprocesso não há como
                # interromper uma função no meio. O passo é marcado `expirou` e o
                # plano para, mas o trabalho dele já foi feito — e isso é
                # limitação declarada, não descuido.
                if duracao > limite_por_passo_s:
                    resultados.append(ResultadoPasso(
                        passo.nome, "expirou", duracao, {},
                        {"codigo": "tempo-do-passo-esgotado",
                         "mensagem": f"'{passo.nome}' levou {duracao:.1f}s, acima de {limite_por_passo_s}s."},
                    ))
                    interrompido = True
                    continue
                produzidas = _colher(passo, saida)
                valores.update(produzidas)
                resultados.append(ResultadoPasso(passo.nome, "concluida", duracao, produzidas))
            except Cancelado:
                resultados.append(ResultadoPasso(
                    passo.nome, "cancelada", time.monotonic() - comeco, {},
                    {"codigo": "cancelado", "mensagem": "Parada pedida de fora."},
                ))
                interrompido = True
            except ErroLaboratorio as erro:
                resultados.append(ResultadoPasso(
                    passo.nome, "falhou", time.monotonic() - comeco, {}, erro.para_dict(),
                ))
                interrompido = True
            except Exception as erro:  # noqa: BLE001 — a exceção vira estado, não sobe
                resultados.append(ResultadoPasso(
                    passo.nome, "falhou", time.monotonic() - comeco, {},
                    {"codigo": "excecao-do-instrumento",
                     "mensagem": f"{type(erro).__name__}: {erro}"},
                ))
                interrompido = True
    finally:
        shutil.rmtree(raiz, ignore_errors=True)

    concluidos = [r for r in resultados if r.estado == "concluida"]
    return {
        "veredito": "concluido" if len(concluidos) == len(ordem) else "interrompido",
        "passos": [r.documento() for r in resultados],
        "duracaoTotalS": round(time.monotonic() - inicio_total, 6),
        "confinamento": {
            "confina": ["tempo por passo", "tempo total", "teto de passos",
                        "propagação de falha", "diretório efêmero"],
            "naoConfina": ["rede", "sistema de arquivos fora do diretório",
                           "memória", "processos filhos"],
        },
    }


def _colher(passo: Passo, saida: Any) -> dict[str, Any]:
    """O passo tem de entregar exatamente o que prometeu produzir."""
    if not passo.produz:
        return {}
    if not isinstance(saida, dict):
        raise falhar(
            "contrato", "saida-nao-nomeada",
            f"'{passo.nome}' promete {list(passo.produz)} e devolveu {type(saida).__name__}.",
            local=f"passos.{passo.nome}.produz",
        )
    faltando = [n for n in passo.produz if n not in saida]
    if faltando:
        raise falhar(
            "contrato", "saida-faltando",
            f"'{passo.nome}' prometeu {faltando} e não entregou.",
            local=f"passos.{passo.nome}.produz",
        )
    # Saída não prometida é DESCARTADA, não propagada: senão um passo poderia
    # alimentar outro por um canal que o plano não declara, e o grafo mentiria.
    return {n: saida[n] for n in passo.produz}
