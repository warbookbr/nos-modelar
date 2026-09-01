"""Consultar bancos públicos antes de gastar horas recalculando o que já existe.

O GANHO. Materials Project, OQMD e AFLOW têm milhões de compostos já calculados.
Perguntar custa segundos; recalcular custa horas na máquina de alguém. Consultar
primeiro é a economia mais barata que este laboratório tem.

O RISCO, que é maior que o ganho se ignorado: **valor de banco público quase
nunca é medida**. A maioria vem de cálculo quântico com aproximações conhecidas,
que erram de forma sistemática — e um número desses, colado num relatório sem a
etiqueta, vira "resistência do material" para quem lê depois. Por isso a fonte é
obrigada a declarar o método, e o valor sai marcado com ele.

COMO ISTO FUNCIONA EM DOIS LUGARES. Não há rede garantida no ambiente efêmero, e
há na máquina do usuário. A saída não é fingir que dá:

  - **cache primeiro, sempre.** Consulta já feita é respondida do disco, e a
    resposta guardada é a mesma para sempre.
  - **quem busca é injetado.** Este módulo não abre conexão; ele recebe uma função
    que busca. Sem ela e sem cache, ele RECUSA dizendo que não consultou — nunca
    devolve valor plausível de origem obscura.
  - **os testes nunca tocam a rede.** Eles injetam um buscador falso, e há teste
    que confere a ausência de qualquer import de rede aqui.

TEXTO DE BANCO É DADO, NUNCA INSTRUÇÃO. Nada do que volta de uma consulta é lido
como comando, nem por este módulo nem por quem o usa.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from .erros import falhar
from .identidade import identificar
from .materiais import Propriedade
from .unidades import Grandeza

FORMATO_CONSULTA = "lab.consulta-a-banco@1"
FORMATO_REGISTRO = "lab.registro-de-banco@1"

#: Como o banco produziu o número. `dft` cobre a maioria dos bancos abertos, e
#: está aqui separado de `experimental` justamente porque a diferença some quando
#: alguém copia o valor para um relatório.
METODOS = frozenset(("dft", "experimental", "empirico", "aprendizado-de-maquina", "desconhecido"))

Buscador = Callable[[str, dict[str, Any]], list[dict[str, Any]]]


@dataclass(frozen=True)
class Banco:
    """Um banco público, com o que ele é e como ele calcula."""

    identidade: str
    metodo: str
    licenca: str
    #: Versão ou data do despejo consultado. Sem isto a consulta não se reproduz:
    #: o mesmo pedido responde diferente daqui a seis meses.
    versao: str
    #: Erros sistemáticos conhecidos do método. Vazio é recusado — um banco de
    #: DFT sem ressalva se apresenta como medição.
    limitacoes: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        for campo in ("identidade", "licenca", "versao"):
            if not str(getattr(self, campo)).strip():
                raise falhar("contrato", "campo-vazio",
                             f"{campo} precisa de texto não vazio.", local=campo)
        if self.metodo not in METODOS:
            raise falhar("contrato", "metodo-invalido",
                         f"método '{self.metodo}' não existe; aceitos: {sorted(METODOS)}.",
                         local="metodo")
        if not self.limitacoes:
            raise falhar(
                "contrato", "banco-sem-limitacoes",
                f"'{self.identidade}' não declara erro sistemático conhecido.",
                local="limitacoes",
                acaoSugerida="Um banco de cálculo sem ressalva se apresenta como medição.",
            )

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO_REGISTRO,
            "identidade": self.identidade,
            "metodo": self.metodo,
            "licenca": self.licenca,
            "versao": self.versao,
            "limitacoes": list(self.limitacoes),
        }


class Consulta:
    """Pergunta a um banco, respondida do cache sempre que possível."""

    def __init__(self, banco: Banco, cache: Path | str, *, buscador: Buscador | None = None) -> None:
        self.banco = banco
        self.raiz = Path(cache)
        self.raiz.mkdir(parents=True, exist_ok=True)
        self._buscador = buscador

    def _chave(self, pedido: dict[str, Any]) -> str:
        # A versão do banco entra na chave: o mesmo pedido a despejos diferentes
        # é outra consulta, e reaproveitar seria misturar duas fontes numa.
        return identificar({"banco": self.banco.identidade,
                            "versao": self.banco.versao, "pedido": pedido})

    def _arquivo(self, chave: str) -> Path:
        return self.raiz / f"{chave}.json"

    def buscar(self, pedido: dict[str, Any]) -> dict[str, Any]:
        """Devolve os registros, do cache ou da rede, dizendo de onde vieram."""
        if not pedido:
            raise falhar("contrato", "pedido-vazio",
                         "consulta sem pedido traria o banco inteiro.", local="pedido")
        chave = self._chave(pedido)
        arquivo = self._arquivo(chave)

        if arquivo.is_file():
            guardado = json.loads(arquivo.read_text(encoding="utf-8"))
            return {**guardado, "veioDe": "cache"}

        if self._buscador is None:
            # A recusa é o ponto: sem cache e sem quem busque, a única saída
            # honesta é dizer que não sabe. Devolver lista vazia faria o estudo
            # concluir "não existe nada publicado sobre isso".
            raise falhar(
                "proveniencia", "consulta-nao-feita",
                f"'{self.banco.identidade}' não está no cache e não há buscador nesta máquina.",
                local="buscador",
                recuperavel=True,
                acaoSugerida="Rode esta consulta onde há rede e traga o cache; "
                             "lista vazia aqui viraria 'não existe nada publicado'.",
            )

        registros = self._buscador(self.banco.identidade, pedido)
        if not isinstance(registros, list):
            raise falhar("contrato", "resposta-malformada",
                         f"o buscador devolveu {type(registros).__name__} em vez de lista.",
                         local="buscador")
        documento = {
            "formato": FORMATO_CONSULTA,
            "banco": self.banco.documento(),
            "pedido": pedido,
            "registros": registros,
            "quantidade": len(registros),
        }
        # Grava antes de devolver: consulta longa que morre no meio não pode
        # perder o que já custou.
        arquivo.write_text(json.dumps(documento, ensure_ascii=False, sort_keys=True),
                           encoding="utf-8")
        return {**documento, "veioDe": "rede"}

    def propriedade(self, registro: dict[str, Any], nome: str, unidade: str,
                    dimensao: tuple[int, ...], *, condicao: str) -> Propriedade:
        """Converte um campo do registro em propriedade etiquetada com o método.

        A etiqueta é o produto principal desta função. Um número de DFT que perde
        a marca vira, três documentos adiante, "a resistência do material".
        """
        if nome not in registro:
            raise falhar("contrato", "campo-ausente-no-registro",
                         f"o registro não tem '{nome}'; campos: {sorted(registro)}.",
                         local="registro")
        valor = registro[nome]
        if not isinstance(valor, (int, float)) or isinstance(valor, bool):
            raise falhar("contrato", "valor-nao-numerico",
                         f"'{nome}' veio como {type(valor).__name__}.", local="registro")
        origem = "medida" if self.banco.metodo == "experimental" else "calculada"
        return Propriedade(
            nome=nome,
            valor=Grandeza(float(valor), unidade, dimensao),
            condicao=f"{condicao} · {self.banco.metodo} · {self.banco.identidade}@{self.banco.versao}",
            origem=origem,
            fonte=f"{self.banco.identidade}@{self.banco.versao}",
        )
