"""Quem produziu um resultado, com o quê, e sobre qual versão da peça.

O BURACO QUE ISTO FECHA, achado por uso e não por antecipação. O primeiro estudo
concluiu que a torção da cabeça do machado não desce abaixo de 1% — e a síntese
não dizia QUAL cabeça. Pior: a receita mudou NO MEIO do estudo (os índices de
face do olho deixaram de ser literais), então a conclusão publicada apontava
para um objeto ambíguo. Reproduzir depois exigiria a memória da conversa, que é
exatamente o que o laboratório existe para não precisar.

O modelo segue a semântica do W3C PROV, com o mínimo que este estudo usa:
entidade (o que foi consumido ou produzido), atividade (a execução) e agente
(quem executou). Campo novo entra quando um estudo precisar.
"""

from __future__ import annotations

import hashlib
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .erros import falhar
from .identidade import identificar

FORMATO = "lab.proveniencia@1"


def hash_de_arquivo(caminho: Path | str) -> str:
    """Identidade de um arquivo-fonte pelos BYTES dele, não pelo caminho."""
    caminho = Path(caminho)
    if not caminho.is_file():
        raise falhar(
            "proveniencia",
            "fonte-ausente",
            f"'{caminho}' não existe ou não é arquivo.",
            local=str(caminho),
        )
    return f"sha256:{hashlib.sha256(caminho.read_bytes()).hexdigest()}"


def commit_atual(repo: Path | str) -> str | None:
    """O commit do código que rodou, ou None quando não há git disponível.

    Devolve None em vez de inventar: proveniência que finge saber é pior que
    proveniência que declara não saber, porque a segunda pelo menos avisa quem
    tenta reproduzir.
    """
    try:
        saida = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(repo), capture_output=True, text=True, timeout=10, check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return saida.stdout.strip() or None


def arvore_suja(repo: Path | str) -> bool | None:
    """Havia mudança não commitada quando isto rodou?

    Importa porque um commit limpo identifica o código, e uma árvore suja NÃO —
    o commit registrado seria uma meia-verdade. Quem reproduz precisa saber que
    o estado medido não está em lugar nenhum recuperável.
    """
    try:
        saida = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(repo), capture_output=True, text=True, timeout=10, check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return bool(saida.stdout.strip())


@dataclass(frozen=True)
class Proveniencia:
    """O registro que torna um resultado reproduzível sem a conversa."""

    agente: str
    versao_agente: str
    entradas: dict[str, str]
    commit: str | None = None
    arvore_suja: bool | None = None

    def documento(self) -> dict[str, Any]:
        return {
            "formato": FORMATO,
            "agente": self.agente,
            "versaoAgente": self.versao_agente,
            "entradas": self.entradas,
            "commit": self.commit,
            "arvoreSuja": self.arvore_suja,
        }

    @property
    def id(self) -> str:
        return identificar(self.documento())

    def confiavel_para_reproduzir(self) -> tuple[bool, str]:
        """Dá para outra pessoa refazer isto a partir daqui, e por quê não."""
        if self.commit is None:
            return False, "o commit do código não foi registrado"
        if self.arvore_suja:
            return False, (
                f"a árvore estava suja no commit {self.commit[:8]}: o código medido "
                "não está publicado em lugar nenhum"
            )
        if not self.entradas:
            return False, "nenhuma entrada foi identificada por hash"
        return True, "commit limpo e entradas identificadas por hash"
