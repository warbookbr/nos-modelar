"""Registro explícito de instrumentos, com o que cada um NÃO cobre.

DUAS REGRAS, e as duas vêm de falha vivida.

**Importar não concede capacidade.** Um instrumento só participa de estudo se
estiver registrado por um manifesto. Encontrar o arquivo, conseguir importá-lo
ou achá-lo no `PATH` não basta. Sem isso, qualquer script que rode vira
instrumento por acidente, e a pergunta "o que produziu este número" passa a
depender de arqueologia.

**Silêncio sobre cobertura é mentira sobre cobertura.** O manifesto declara o
domínio de validade e as exclusões, e o registro RECUSA medida fora do domínio
declarado. O primeiro instrumento deste laboratório não declarava nada: eu varri
`lados` de 10 a 26 sem saber que só 14 mantém o olho do machado furável, e
descobri por 21 execuções gritando. O instrumento sabia — a informação estava na
geometria dele — e não tinha onde dizer.

O que este módulo NÃO faz, e é deliberado: não executa nada. Registro é
descoberta e planejamento; execução é outra autoridade.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from .erros import falhar
from .identidade import identificar

FORMATO = "lab.instrumento@1"

MATURIDADES = frozenset(("experimental", "qualificado", "validado-localmente", "restrito"))


@dataclass(frozen=True)
class Manifesto:
    """O que um instrumento faz, onde vale, e o que ele explicitamente não cobre."""

    identidade: str
    versao: str
    capacidades: tuple[str, ...]
    #: Funções que dizem se um parâmetro está no domínio. Chave é o nome do
    #: parâmetro; valor recebe o valor e devolve True quando está dentro.
    dominio: dict[str, Callable[[Any], bool]] = field(default_factory=dict)
    nao_cobre: tuple[str, ...] = ()
    determinista: bool = True
    maturidade: str = "experimental"

    def __post_init__(self) -> None:
        if not self.capacidades:
            raise falhar(
                "instrumento",
                "manifesto-sem-capacidade",
                f"'{self.identidade}' não declara nenhuma capacidade.",
                local="capacidades",
            )
        if not self.nao_cobre:
            # Instrumento que não declara limite está afirmando que cobre tudo,
            # e nenhum cobre. A recusa aqui é o que impede a omissão cômoda.
            raise falhar(
                "instrumento",
                "manifesto-sem-limite",
                f"'{self.identidade}' não declara o que NÃO cobre.",
                local="nao_cobre",
                acaoSugerida="Diga ao menos uma coisa que ele não mede; silêncio aqui é promessa falsa.",
            )
        if self.maturidade not in MATURIDADES:
            raise falhar(
                "instrumento",
                "maturidade-invalida",
                f"maturidade '{self.maturidade}' não existe; aceitas: {sorted(MATURIDADES)}.",
                local="maturidade",
            )

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO,
            "identidade": self.identidade,
            "versao": self.versao,
            "capacidades": list(self.capacidades),
            "dominioDeclarado": sorted(self.dominio),
            "naoCobre": list(self.nao_cobre),
            "determinista": self.determinista,
            "maturidade": self.maturidade,
        }

    @property
    def id(self) -> str:
        return identificar(self.documento())

    def fora_do_dominio(self, parametros: dict[str, Any]) -> list[str]:
        """Quais parâmetros caem fora do que o instrumento declarou cobrir."""
        return sorted(
            nome for nome, dentro in self.dominio.items()
            if nome in parametros and not dentro(parametros[nome])
        )


class Registro:
    """Só instrumento registrado participa de estudo."""

    def __init__(self) -> None:
        self._por_identidade: dict[str, Manifesto] = {}

    def registrar(self, manifesto: Manifesto) -> Manifesto:
        anterior = self._por_identidade.get(manifesto.identidade)
        if anterior is not None and anterior.versao != manifesto.versao:
            # Trocar a versão de um instrumento no meio de um estudo mudaria o
            # que se está medindo sem mudar o nome. Registrar de novo com versão
            # diferente é declaração nova, não atualização silenciosa.
            raise falhar(
                "instrumento",
                "versao-conflitante",
                f"'{manifesto.identidade}' já está registrado na versão {anterior.versao}.",
                local="versao",
                acaoSugerida="Use outra identidade para outra versão, ou limpe o registro entre estudos.",
            )
        self._por_identidade[manifesto.identidade] = manifesto
        return manifesto

    def exigir(self, identidade: str, versao: str) -> Manifesto:
        manifesto = self._por_identidade.get(identidade)
        if manifesto is None:
            raise falhar(
                "instrumento",
                "instrumento-nao-registrado",
                f"'{identidade}' não está registrado; importar ou encontrar no PATH não concede capacidade.",
                local="identidade",
                acaoSugerida="Registre um manifesto antes de usar a medida em um estudo.",
            )
        if manifesto.versao != versao:
            raise falhar(
                "instrumento",
                "versao-inesperada",
                f"'{identidade}' está registrado na versão {manifesto.versao}, e a medida veio da {versao}.",
                local="versao",
            )
        return manifesto
