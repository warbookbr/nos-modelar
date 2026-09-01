from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ErroLaboratorio(Exception):
    categoria: str
    codigo: str
    mensagem: str
    local: str | None = None
    causa: str | None = None
    recuperavel: bool = False
    acao_sugerida: str | None = None

    def __str__(self) -> str:
        return f"{self.codigo}: {self.mensagem}"

    def para_dict(self) -> dict[str, str | bool | None]:
        return {
            "categoria": self.categoria,
            "codigo": self.codigo,
            "mensagem": self.mensagem,
            "local": self.local,
            "causa": self.causa,
            "recuperavel": self.recuperavel,
            "acaoSugerida": self.acao_sugerida,
        }


def falhar(
    categoria: str,
    codigo: str,
    mensagem: str,
    **contexto: Any,
) -> ErroLaboratorio:
    acao_sugerida = contexto.pop(
        "acaoSugerida",
        contexto.pop("acao_sugerida", None),
    )
    return ErroLaboratorio(
        categoria=categoria,
        codigo=codigo,
        mensagem=mensagem,
        acao_sugerida=acao_sugerida,
        **contexto,
    )
