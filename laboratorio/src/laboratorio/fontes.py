"""Fontes e alegações: um grafo que preserva conflito em vez de resolver.

**FONTE NÃO É VERDADE.** Esta é a regra que o módulo inteiro serve. Uma citação
válida sustenta que ALGUÉM PUBLICOU uma alegação; ela não prova que a alegação
está correta, nem que se aplica ao estudo que a cita. Por isso `Alegacao` não tem
campo de verdade, e por isso não existe escalar de confiança: seria o mesmo
pecado que o laboratório já recusou nas hipóteses, com outro nome.

**METADADO, ALEGAÇÃO E EVIDÊNCIA SÃO COISAS DIFERENTES.** A `Fonte` diz o que a
publicação é (identidade, versão, licença, retratação). A `Alegacao` diz o que
ela afirma, com onde no texto. Ligar uma alegação a uma hipótese do estudo é um
terceiro ato, `aplica`, e ele exige justificativa escrita — porque "esse artigo
fala do assunto" não é o mesmo que "esse resultado vale nas minhas condições".

**CONFLITO É DADO, NÃO DEFEITO.** Duas fontes que se contradizem ficam as duas no
grafo, ligadas por `contradiz`. O grafo não elege vencedora; ele mostra o conflito
para a síntese ter de falar dele. Resolver conflito silenciosamente é como
sucesso parcial silencioso: some com a informação mais cara que se tem.

**RETRATAÇÃO NÃO APAGA.** Fonte retratada continua no grafo, marcada, e toda
alegação que dependia dela fica contaminada por alcance — inclusive alegações que
apenas citam a retratada. Apagar esconderia que o estudo um dia se apoiou nela.

**TEXTO DE FONTE É DADO NÃO CONFIÁVEL.** Nada aqui interpreta o conteúdo de uma
fonte como instrução. Este módulo só guarda e relaciona; não busca na rede, não
resolve DOI e não lê arquivo. Conector de rede é outra autoridade, e entra quando
houver como provar paginação, cache, licença e orçamento — não junto com isto.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .erros import falhar
from .identidade import identificar

FORMATO_FONTE = "lab.fonte@1"
FORMATO_ALEGACAO = "lab.alegacao@1"
FORMATO_GRAFO = "lab.grafo-de-alegacoes@1"

#: `primaria` mede; `derivada` reanalisa dado de outrem; `secundaria` resume o
#: que outros mediram. A distinção existe porque três revisões que repetem o
#: mesmo estudo primário não são três evidências independentes.
NATUREZAS = frozenset(("primaria", "derivada", "secundaria"))

SITUACOES = frozenset(("vigente", "corrigida", "retratada"))

#: Relações entre alegações. Nenhuma delas afirma que algo é verdade.
RELACOES = frozenset(("replica", "contradiz", "estende", "cita"))


def _texto(valor: Any, campo: str) -> str:
    if not isinstance(valor, str) or not valor.strip():
        raise falhar("contrato", "campo-vazio",
                     f"{campo} precisa de texto não vazio.", local=campo)
    return valor


@dataclass(frozen=True)
class Fonte:
    """O que uma publicação É. Não o que ela afirma."""

    identidade: str
    titulo: str
    natureza: str
    #: Licença de uso. Sem ela o laboratório não sabe se pode guardar o texto,
    #: e "não sei" não autoriza guardar.
    licenca: str
    situacao: str = "vigente"
    #: Identidades de fontes que esta corrige ou retrata.
    corrige: tuple[str, ...] = ()
    versao: str | None = None

    def __post_init__(self) -> None:
        for campo in ("identidade", "titulo", "licenca"):
            _texto(getattr(self, campo), campo)
        if self.natureza not in NATUREZAS:
            raise falhar("contrato", "natureza-invalida",
                         f"natureza '{self.natureza}' não existe; aceitas: {sorted(NATUREZAS)}. "
                         "A distinção existe porque revisões que repetem o mesmo primário "
                         "não são evidências independentes.",
                         local="natureza")
        if self.situacao not in SITUACOES:
            raise falhar("contrato", "situacao-invalida",
                         f"situação '{self.situacao}' não existe; aceitas: {sorted(SITUACOES)}.",
                         local="situacao")

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO_FONTE,
            "identidade": self.identidade,
            "titulo": self.titulo,
            "natureza": self.natureza,
            "licenca": self.licenca,
            "situacao": self.situacao,
            "corrige": list(self.corrige),
            "versao": self.versao,
        }

    @property
    def id(self) -> str:
        return identificar(self.documento())


@dataclass(frozen=True)
class Alegacao:
    """O que uma fonte AFIRMA, com onde no texto e sob que condições."""

    identidade: str
    fonte: str
    enunciado: str
    #: Onde a alegação está na fonte (seção, página, tabela). Sem isto ninguém
    #: consegue conferir se o enunciado é mesmo o que a fonte diz.
    localizacao: str
    #: Condições em que a fonte diz que o enunciado vale. Vazio é recusado:
    #: alegação sem condição declarada se comporta como lei universal.
    condicoes: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        for campo in ("identidade", "fonte", "enunciado", "localizacao"):
            _texto(getattr(self, campo), campo)
        if not self.condicoes:
            raise falhar(
                "contrato", "alegacao-sem-condicao",
                f"'{self.identidade}' não declara em que condições vale.",
                local="condicoes",
                acaoSugerida="Diga população, faixa ou método; sem isso ela é lida como lei universal.",
            )

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO_ALEGACAO,
            "identidade": self.identidade,
            "fonte": self.fonte,
            "enunciado": self.enunciado,
            "localizacao": self.localizacao,
            "condicoes": list(self.condicoes),
        }

    @property
    def id(self) -> str:
        return identificar(self.documento())


@dataclass(frozen=True)
class Aplicacao:
    """Ligação entre uma alegação e uma hipótese do estudo, com justificativa.

    Existe separada porque "a fonte diz X" e "X vale para o que estou medindo"
    são dois julgamentos, e o segundo é do laboratório, não da fonte.
    """

    alegacao: str
    hipotese: str
    direcao: str
    justificativa: str
    #: Diferenças entre as condições da fonte e as do estudo. Vazio é recusado
    #: pelo grafo: alegação transportada sem ressalva é a forma mais comum de
    #: usar resultado fora do domínio dele.
    ressalvas: tuple[str, ...] = ()


class Grafo:
    """Guarda fontes, alegações e relações. Não elege vencedora."""

    def __init__(self) -> None:
        self._fontes: dict[str, Fonte] = {}
        self._alegacoes: dict[str, Alegacao] = {}
        self._relacoes: list[tuple[str, str, str]] = []
        self._aplicacoes: list[Aplicacao] = []

    def acrescentar_fonte(self, fonte: Fonte) -> Fonte:
        anterior = self._fontes.get(fonte.identidade)
        if anterior is not None and anterior.documento() != fonte.documento():
            raise falhar("contrato", "fonte-conflitante",
                         f"'{fonte.identidade}' já está no grafo com outro conteúdo.",
                         local="identidade")
        for alvo in fonte.corrige:
            if alvo not in self._fontes:
                raise falhar("contrato", "corrige-fonte-ausente",
                             f"'{fonte.identidade}' corrige '{alvo}', que não está no grafo.",
                             local="corrige")
        self._fontes[fonte.identidade] = fonte
        for alvo in fonte.corrige:
            velha = self._fontes[alvo]
            if velha.situacao == "vigente":
                self._fontes[alvo] = Fonte(
                    identidade=velha.identidade, titulo=velha.titulo,
                    natureza=velha.natureza, licenca=velha.licenca,
                    situacao="corrigida", corrige=velha.corrige, versao=velha.versao,
                )
        return fonte

    def acrescentar_alegacao(self, alegacao: Alegacao) -> Alegacao:
        if alegacao.fonte not in self._fontes:
            raise falhar("contrato", "alegacao-sem-fonte",
                         f"'{alegacao.identidade}' cita a fonte '{alegacao.fonte}', "
                         "que não está no grafo; alegação sem fonte é boato com formato.",
                         local="fonte")
        self._alegacoes[alegacao.identidade] = alegacao
        return alegacao

    def relacionar(self, origem: str, relacao: str, destino: str) -> None:
        if relacao not in RELACOES:
            raise falhar("contrato", "relacao-invalida",
                         f"relação '{relacao}' não existe; aceitas: {sorted(RELACOES)}.",
                         local="relacao")
        for lado, nome in ((origem, "origem"), (destino, "destino")):
            if lado not in self._alegacoes:
                raise falhar("contrato", "alegacao-ausente",
                             f"a {nome} '{lado}' não está no grafo.", local=nome)
        if origem == destino:
            raise falhar("contrato", "relacao-consigo-mesma",
                         f"'{origem}' não se relaciona consigo mesma.", local="destino")
        self._relacoes.append((origem, relacao, destino))

    def aplicar(self, aplicacao: Aplicacao) -> None:
        if aplicacao.alegacao not in self._alegacoes:
            raise falhar("contrato", "alegacao-ausente",
                         f"'{aplicacao.alegacao}' não está no grafo.", local="alegacao")
        _texto(aplicacao.justificativa, "justificativa")
        if not aplicacao.ressalvas:
            raise falhar(
                "contrato", "aplicacao-sem-ressalva",
                f"'{aplicacao.alegacao}' foi aplicada a '{aplicacao.hipotese}' sem ressalva.",
                local="ressalvas",
                acaoSugerida="Diga ao menos uma diferença entre as condições da fonte e as suas; "
                             "se não houver nenhuma, escreva por que não há.",
            )
        self._aplicacoes.append(aplicacao)

    def contaminadas(self) -> dict[str, list[str]]:
        """Alegações que dependem, por alcance, de alguma fonte retratada.

        Alcance e não vizinhança: uma alegação que apenas CITA outra apoiada em
        fonte retratada também aparece. Retratação não apaga nada; ela marca.
        """
        retratadas = {f.identidade for f in self._fontes.values() if f.situacao == "retratada"}
        motivo: dict[str, list[str]] = {
            a.identidade: [a.fonte] for a in self._alegacoes.values() if a.fonte in retratadas
        }
        mudou = True
        while mudou:
            mudou = False
            for origem, _relacao, destino in self._relacoes:
                if destino in motivo and origem not in motivo:
                    motivo[origem] = motivo[destino] + [destino]
                    mudou = True
        return {k: motivo[k] for k in sorted(motivo)}

    def conflitos(self) -> list[tuple[str, str]]:
        """Pares que se contradizem, preservados como estão."""
        return sorted({
            (min(o, d), max(o, d))
            for o, relacao, d in self._relacoes if relacao == "contradiz"
        })

    def independencia(self, identidades: tuple[str, ...]) -> dict[str, Any]:
        """Quantas dessas alegações são de fato apoios independentes.

        Alegações da MESMA fonte contam uma vez, e as `secundaria` são separadas
        das que mediram: cinco revisões do mesmo experimento não são cinco
        evidências.
        """
        fontes = {self._alegacoes[i].fonte for i in identidades if i in self._alegacoes}
        primarias = sorted(f for f in fontes if self._fontes[f].natureza == "primaria")
        return {
            "alegacoes": len(identidades),
            "fontesDistintas": len(fontes),
            "fontesPrimarias": primarias,
            "apoioIndependente": len(primarias),
        }

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO_GRAFO,
            "fontes": [self._fontes[k].documento() for k in sorted(self._fontes)],
            "alegacoes": [self._alegacoes[k].documento() for k in sorted(self._alegacoes)],
            "relacoes": [list(r) for r in sorted(self._relacoes)],
            "conflitos": [list(c) for c in self.conflitos()],
            "contaminadas": self.contaminadas(),
        }

    @property
    def id(self) -> str:
        return identificar(self.documento())
