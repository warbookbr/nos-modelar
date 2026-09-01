"""Armazém endereçado por conteúdo: o id de um artefato É o hash dele.

POR QUE ENDEREÇADO POR CONTEÚDO, e não por nome de arquivo. Nome é escolha de
quem salvou e muda sem o conteúdo mudar; hash é o conteúdo. Com nome, "já medi
isto" depende de alguém ter sido disciplinado ao nomear. Com hash, dois pacotes
idênticos ocupam o mesmo lugar sozinhos e dois diferentes nunca se confundem.

IMUTÁVEL POR CONSTRUÇÃO. Guardar um conteúdo que já existe é no-op; guardar um
conteúdo novo cria um id novo. Não existe "atualizar artefato" — atualizar seria
mudar o passado de quem já o citou.

O ARMAZÉM FICA FORA DO GIT (`laboratorio/.lab/`). Artefato de execução é saída,
não fonte; versioná-lo encheria o repositório de medida repetida. O que entra no
Git é a SÍNTESE e a proveniência, que são pequenas e é o que alguém lê depois.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .erros import falhar
from .identidade import identificar, serializar


class Armazem:
    def __init__(self, raiz: Path | str) -> None:
        self.raiz = Path(raiz)

    def _caminho(self, identidade: str) -> Path:
        if not identidade.startswith("sha256:"):
            raise falhar(
                "contrato",
                "identidade-invalida",
                f"'{identidade}' não é uma identidade de conteúdo (esperado 'sha256:<hex>').",
                local="identidade",
            )
        hexa = identidade.split(":", 1)[1]
        # Dois níveis de prefixo: um diretório com dezenas de milhares de
        # arquivos irmãos fica lento de listar em vários sistemas de arquivo.
        return self.raiz / hexa[:2] / hexa[2:4] / f"{hexa}.json"

    def guardar(self, documento: Any) -> str:
        identidade = identificar(documento)
        destino = self._caminho(identidade)
        if destino.exists():
            return identidade
        destino.parent.mkdir(parents=True, exist_ok=True)
        # Escrita em arquivo temporário e renomeação: um processo interrompido no
        # meio deixaria um artefato truncado cujo nome promete um hash que o
        # conteúdo não tem — e ninguém conferiria de novo, porque o nome basta.
        temporario = destino.with_suffix(".parcial")
        temporario.write_text(serializar(documento), encoding="utf-8")
        temporario.replace(destino)
        return identidade

    def ler(self, identidade: str) -> Any:
        caminho = self._caminho(identidade)
        if not caminho.exists():
            raise falhar(
                "proveniencia",
                "artefato-ausente",
                f"O artefato {identidade} não está neste armazém.",
                local=str(caminho),
                acaoSugerida="Reexecute o passo que o produziu, ou aponte para o armazém certo.",
            )
        documento = json.loads(caminho.read_text(encoding="utf-8"))
        conferido = identificar(documento)
        if conferido != identidade:
            # O nome do arquivo prometia um conteúdo e entregou outro. Isso é
            # adulteração ou corrupção, e as duas invalidam qualquer conclusão
            # pendurada nele.
            raise falhar(
                "proveniencia",
                "artefato-adulterado",
                f"{identidade} guarda conteúdo cujo hash é {conferido}.",
                local=str(caminho),
                recuperavel=False,
            )
        return documento
