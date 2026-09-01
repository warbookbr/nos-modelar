"""Plano de execução: um grafo de passos, provado ANTES de qualquer execução.

POR QUE PROVAR ANTES. Um plano que só descobre problema no meio já gastou tempo,
já produziu artefato parcial e deixa a pergunta "o que dessa saída presta?" para
alguém responder depois. Todas as verificações aqui são estáticas: elas olham a
declaração, não o resultado.

O QUE O PLANEJADOR PROVA, e cada item veio de um modo de falha real ou previsto:

  - **aciclicidade.** Passo que depende de si mesmo, direta ou indiretamente,
    nunca fica pronto — e sem esta prova o executor descobre isso travando.
  - **capacidade existe.** Passo que chama operação não registrada só falha na
    hora de executar, quando o orçamento já foi gasto nos passos anteriores.
  - **produtor único.** Duas saídas com o mesmo nome fazem o consumidor receber
    "a última que escreveu", que é ordem de execução virando dado. Este
    repositório proíbe posição como identidade, e isto é a mesma coisa.
  - **entrada tem produtor ou é literal.** Consumir nome que ninguém produz é o
    erro que mais parece funcionar: o passo roda, recebe vazio, e devolve um
    número plausível.
  - **versão fixa.** Instrumento citado sem versão muda debaixo do plano entre
    o planejamento e a execução, e a proveniência registra uma coisa que não foi
    a que rodou.

PLANEJAR NÃO É EXECUTAR. Este módulo não roda nada e não importa o executor.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .erros import falhar
from .identidade import identificar
from .instrumentos import Registro

FORMATO = "lab.plano@1"


@dataclass(frozen=True)
class Passo:
    """Uma operação declarada, com o que consome e o que promete produzir."""

    nome: str
    instrumento: str
    versao_instrumento: str
    operacao: str
    #: Nomes de saídas de outros passos. Literais entram em `parametros`.
    consome: tuple[str, ...] = ()
    produz: tuple[str, ...] = ()
    parametros: dict[str, Any] = field(default_factory=dict)

    def documento(self) -> dict[str, Any]:
        return {
            "nome": self.nome,
            "instrumento": self.instrumento,
            "versaoInstrumento": self.versao_instrumento,
            "operacao": self.operacao,
            "consome": list(self.consome),
            "produz": list(self.produz),
            "parametros": self.parametros,
        }


@dataclass(frozen=True)
class Plano:
    passos: tuple[Passo, ...]

    def documento(self) -> dict[str, Any]:
        return {"formato": FORMATO, "passos": [p.documento() for p in self.passos]}

    @property
    def id(self) -> str:
        return identificar(self.documento())


def _produtores(plano: Plano) -> dict[str, str]:
    produtores: dict[str, str] = {}
    for passo in plano.passos:
        for saida in passo.produz:
            anterior = produtores.get(saida)
            if anterior is not None:
                raise falhar(
                    "contrato",
                    "produtor-duplicado",
                    f"'{saida}' é produzida por '{anterior}' e por '{passo.nome}'; "
                    "o consumidor receberia a última que escreveu, e ordem de execução não é dado.",
                    local=f"passos.{passo.nome}.produz",
                )
            produtores[saida] = passo.nome
    return produtores


def ordenar(plano: Plano, registro: Registro) -> tuple[Passo, ...]:
    """Prova o plano e devolve os passos em ordem de execução.

    Falha fechada: qualquer problema levanta, e nenhuma ordem parcial é
    devolvida. Ordem parcial convidaria a rodar "o que dá".
    """
    nomes = [p.nome for p in plano.passos]
    if len(set(nomes)) != len(nomes):
        repetidos = sorted({n for n in nomes if nomes.count(n) > 1})
        raise falhar(
            "contrato", "passo-duplicado",
            f"nome de passo repetido: {repetidos}; nome é como um passo é citado.",
            local="passos",
        )
    if not plano.passos:
        raise falhar("contrato", "plano-vazio", "Plano sem passo não executa nada.", local="passos")

    for passo in plano.passos:
        if not passo.versao_instrumento:
            raise falhar(
                "contrato", "versao-flutuante",
                f"'{passo.nome}' cita '{passo.instrumento}' sem versão; ela mudaria debaixo do plano.",
                local=f"passos.{passo.nome}.versaoInstrumento",
            )
        manifesto = registro.exigir(passo.instrumento, passo.versao_instrumento)
        if passo.operacao not in manifesto.capacidades:
            raise falhar(
                "instrumento", "capacidade-ausente",
                f"'{passo.nome}' pede '{passo.operacao}', que '{passo.instrumento}' não declara. "
                f"Declaradas: {list(manifesto.capacidades)}.",
                local=f"passos.{passo.nome}.operacao",
            )

    produtores = _produtores(plano)
    for passo in plano.passos:
        for entrada in passo.consome:
            if entrada not in produtores:
                raise falhar(
                    "contrato", "entrada-sem-produtor",
                    f"'{passo.nome}' consome '{entrada}', que nenhum passo produz. "
                    "O passo rodaria recebendo vazio e devolveria número plausível.",
                    local=f"passos.{passo.nome}.consome",
                )

    # Ordenação topológica de Kahn. O que sobra depois dela é exatamente o que
    # está preso em ciclo, e é isso que a mensagem nomeia.
    dependencias = {
        p.nome: {produtores[e] for e in p.consome} for p in plano.passos
    }
    por_nome = {p.nome: p for p in plano.passos}
    ordem: list[Passo] = []
    pendentes = dict(dependencias)
    while pendentes:
        prontos = sorted(n for n, deps in pendentes.items() if not deps)
        if not prontos:
            raise falhar(
                "contrato", "ciclo-no-plano",
                f"Estes passos dependem uns dos outros e nunca ficariam prontos: {sorted(pendentes)}.",
                local="passos",
            )
        for nome in prontos:
            ordem.append(por_nome[nome])
            del pendentes[nome]
        for deps in pendentes.values():
            deps.difference_update(prontos)
    return tuple(ordem)
