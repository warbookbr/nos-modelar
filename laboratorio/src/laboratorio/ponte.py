"""A ponte: a Mecanifica entra no estudo como ENTRADA, e nunca sai alterada.

O RISCO QUE ESTE MÓDULO EXISTE PARA CONTER. Um modelo científico imperfeito
mexendo, em silêncio, no objeto que está sendo estudado. É a versão mais cara do
erro que este laboratório persegue desde o começo: o resultado sai plausível
porque a pergunta mudou junto com a resposta.

Daí as três recusas, e nenhuma é opinião:

  - **revisão fixada, e deriva é falha.** O estudo prega a peça por caminho e
    hash. Se o arquivo mudou entre fixar e abrir, `abrir()` recusa em vez de
    medir a peça nova achando que é a velha. Sem isto, o estudo compara duas
    coisas diferentes com o mesmo nome — e o nome é a única parte que aparece
    no relatório.
  - **a ponte é de leitura.** Ela não grava revisão da Mecanifica durante a
    execução científica. Não existe função de escrita aqui, e há teste que
    confere a ausência: capacidade que não existe não precisa de disciplina para
    não ser usada.
  - **recomendação NÃO é autoria aprovada.** Uma síntese pode recomendar
    parâmetros; aplicá-los é ato humano, fora da execução do laboratório. Por
    isso `RecomendacaoDeAutoria` não tem método de aplicar, carrega o domínio em
    que vale e exige as evidências que a sustentam — inclusive as contrárias.

O QUE ESTE MÓDULO NÃO FAZ. Não importa nada da Mecanifica: o adaptador Node é
quem toca a receita, e ele vive fora do núcleo. Aqui só existe a disciplina da
fixação e o contrato da recomendação. A guarda de direção — o núcleo nunca
importar `laboratorio/` — é do `arquitetura:lab:check`, e é ela que permite
apagar este diretório sem quebrar quem só quer modelar.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .erros import falhar
from .identidade import identificar
from .proveniencia import hash_de_arquivo

FORMATO_PECA = "lab.peca-fixada@1"
FORMATO_RECOMENDACAO = "lab.recomendacao-de-autoria@1"


@dataclass(frozen=True)
class PecaFixada:
    """Uma receita da Mecanifica pregada por caminho e conteúdo."""

    identidade: str
    caminho: str
    hash_conteudo: str
    #: Convenções sob as quais as medidas fazem sentido. Escala e eixo errados
    #: produzem número plausível, que é a falha que não se anuncia.
    convencoes: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        for campo in ("identidade", "caminho", "hash_conteudo"):
            if not str(getattr(self, campo)).strip():
                raise falhar("contrato", "campo-vazio",
                             f"{campo} precisa de texto não vazio.", local=campo)
        if not self.convencoes:
            raise falhar(
                "contrato", "peca-sem-convencoes",
                f"'{self.identidade}' não declara escala, eixo ou referencial.",
                local="convencoes",
                acaoSugerida="Diga ao menos a unidade de comprimento da receita.",
            )

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO_PECA,
            "identidade": self.identidade,
            "caminho": self.caminho,
            "hashConteudo": self.hash_conteudo,
            "convencoes": self.convencoes,
        }

    @property
    def id(self) -> str:
        return identificar(self.documento())


def fixar(identidade: str, caminho: Path | str, **convencoes: Any) -> PecaFixada:
    """Prega a peça no estado em que ela está agora."""
    alvo = Path(caminho)
    if not alvo.is_file():
        raise falhar("contrato", "peca-inexistente",
                     f"'{alvo}' não é um arquivo.", local="caminho")
    return PecaFixada(identidade=identidade, caminho=str(alvo),
                      hash_conteudo=hash_de_arquivo(alvo), convencoes=convencoes)


def abrir(peca: PecaFixada) -> str:
    """Devolve o conteúdo da peça fixada, ou recusa se ela mudou.

    Recusa e não avisa: medir a peça nova achando que é a velha faz o estudo
    comparar duas coisas diferentes com o mesmo nome, e o nome é a única parte
    que chega ao relatório.
    """
    alvo = Path(peca.caminho)
    if not alvo.is_file():
        raise falhar("proveniencia", "peca-sumiu",
                     f"'{peca.caminho}' não existe mais; a revisão fixada não pode ser aberta.",
                     local="caminho")
    agora = hash_de_arquivo(alvo)
    if agora != peca.hash_conteudo:
        raise falhar(
            "proveniencia", "peca-derivou",
            f"'{peca.identidade}' mudou depois de fixada "
            f"({peca.hash_conteudo[:12]} → {agora[:12]}).",
            local="hashConteudo",
            acaoSugerida="Fixe de novo DELIBERADAMENTE; o estudo antigo não vale para a peça nova.",
        )
    return alvo.read_text(encoding="utf-8")


@dataclass(frozen=True)
class RecomendacaoDeAutoria:
    """Uma sugestão de parâmetros. Não é aprovação, e não tem como se aplicar."""

    peca: str
    parametros: dict[str, Any]
    justificativa: str
    #: Domínio em que a recomendação vale. Recomendação sem domínio é lida como
    #: universal, e a que veio deste laboratório nunca é.
    dominio: str
    #: Identidades de evidências. Incluir as contrárias é obrigação: síntese que
    #: só lista o que a favorece é advocacia, não resultado.
    evidencias_a_favor: tuple[str, ...] = ()
    evidencias_contrarias: tuple[str, ...] = ()
    limites: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not self.parametros:
            raise falhar("contrato", "recomendacao-sem-parametro",
                         "recomendação que não muda nada não é recomendação.",
                         local="parametros")
        for campo in ("peca", "justificativa", "dominio"):
            if not str(getattr(self, campo)).strip():
                raise falhar("contrato", "campo-vazio",
                             f"{campo} precisa de texto não vazio.", local=campo)
        if not self.evidencias_a_favor:
            raise falhar("contrato", "recomendacao-sem-evidencia",
                         "recomendação sem evidência é palpite com formato de resultado.",
                         local="evidencias_a_favor")
        if not self.limites:
            raise falhar(
                "contrato", "recomendacao-sem-limite",
                "recomendação sem limite declarado se comporta como conclusão geral.",
                local="limites",
                acaoSugerida="Diga onde ela deixa de valer; se você não sabe, esse é o limite.",
            )

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO_RECOMENDACAO,
            "peca": self.peca,
            "parametros": self.parametros,
            "justificativa": self.justificativa,
            "dominio": self.dominio,
            "evidenciasAFavor": list(self.evidencias_a_favor),
            "evidenciasContrarias": list(self.evidencias_contrarias),
            "limites": list(self.limites),
            # Dito na própria saída, para nenhum consumidor precisar deduzir:
            "aplicacao": "manual, fora da execução do laboratório",
        }

    @property
    def id(self) -> str:
        return identificar(self.documento())
