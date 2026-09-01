"""Reproduzir um estudo a partir do registro, sem a conversa que o produziu.

ESTA É A PROMESSA CENTRAL do laboratório, e a única que um script solto não faz.
Um script deixa números num terminal; um estudo registrado tem de permitir que
outra pessoa — ou eu daqui a um mês, sem esta conversa — refaça a medida e veja
se a conclusão ainda vale.

O QUE ESTE MÓDULO NÃO FAZ, e é deliberado: ele não reexecuta o instrumento
sozinho. Executar é autoridade separada de planejar, e um verificador que dispara
processo por conta própria vira exatamente o que o desenho proíbe. Ele recebe o
pacote NOVO, já medido, e compara com o antigo.

O QUE CONTA COMO DIVERGÊNCIA é a parte que exige julgamento, e ela está separada
em três níveis, porque tratá-los igual esconde o que importa:

  - ENTRADA diferente: mediu-se outra coisa. A comparação de medida perde o
    sentido, e dizer "os números bateram" seria mentira sobre o que se comparou.
  - MEDIDA diferente com a mesma entrada: o resultado não é determinístico, e
    isso é achado, não ruído a arredondar.
  - CONCLUSÃO diferente: o estudo mudou de resposta. É o único nível que
    invalida a síntese publicada.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .identidade import identificar


@dataclass(frozen=True)
class Divergencia:
    nivel: str
    campo: str
    antes: Any
    depois: Any

    def documento(self) -> dict[str, Any]:
        return {
            "nivel": self.nivel,
            "campo": self.campo,
            "antes": self.antes,
            "depois": self.depois,
        }


def comparar(pacote_antigo: dict[str, Any], pacote_novo: dict[str, Any]) -> list[Divergencia]:
    """Divergências entre dois pacotes do mesmo instrumento, do mais grave ao menos."""
    divergencias: list[Divergencia] = []

    antigas = pacote_antigo.get("entradas", {})
    novas = pacote_novo.get("entradas", {})
    for chave in sorted(set(antigas) | set(novas)):
        if antigas.get(chave) != novas.get(chave):
            divergencias.append(
                Divergencia("entrada", chave, antigas.get(chave), novas.get(chave))
            )

    if pacote_antigo.get("versao") != pacote_novo.get("versao"):
        divergencias.append(
            Divergencia("entrada", "versaoInstrumento",
                        pacote_antigo.get("versao"), pacote_novo.get("versao"))
        )

    por_parametro = {identificar(m["parametros"]): m for m in pacote_antigo.get("medidas", [])}
    for medida in pacote_novo.get("medidas", []):
        chave = identificar(medida["parametros"])
        anterior = por_parametro.get(chave)
        if anterior is None:
            divergencias.append(
                Divergencia("medida", f"parametros={medida['parametros']}", None, "presente")
            )
            continue
        if identificar(anterior) != identificar(medida):
            divergencias.append(
                Divergencia(
                    "medida",
                    f"parametros={medida['parametros']}",
                    anterior.get("torcaoMaxima"),
                    medida.get("torcaoMaxima"),
                )
            )
    ausentes = {c for c in por_parametro} - {
        identificar(m["parametros"]) for m in pacote_novo.get("medidas", [])
    }
    for chave in sorted(ausentes):
        divergencias.append(
            Divergencia("medida", f"medida {chave[:16]}", "presente", None)
        )
    return divergencias


def verificar(
    pacote_antigo: dict[str, Any],
    pacote_novo: dict[str, Any],
    sintese_antiga: dict[str, Any],
    sintese_nova: dict[str, Any],
) -> dict[str, Any]:
    """Veredito de reprodução, com a distinção que importa dita por extenso."""
    divergencias = comparar(pacote_antigo, pacote_novo)
    entradas_mudaram = any(d.nivel == "entrada" for d in divergencias)
    medidas_mudaram = any(d.nivel == "medida" for d in divergencias)

    estados_antes = {c["hipotese"]: c["estado"] for c in sintese_antiga.get("conclusoes", [])}
    estados_depois = {c["hipotese"]: c["estado"] for c in sintese_nova.get("conclusoes", [])}
    conclusao_mudou = estados_antes != estados_depois
    if conclusao_mudou:
        for hipotese in sorted(set(estados_antes) | set(estados_depois)):
            if estados_antes.get(hipotese) != estados_depois.get(hipotese):
                divergencias.append(
                    Divergencia("conclusao", hipotese[:23],
                                estados_antes.get(hipotese), estados_depois.get(hipotese))
                )

    if entradas_mudaram:
        veredito = "nao-comparavel"
        motivo = ("As entradas mudaram: o instrumento mediu outra coisa. Comparar os "
                  "números daria uma igualdade sem significado.")
    elif conclusao_mudou:
        veredito = "conclusao-divergente"
        motivo = "Com as mesmas entradas, o estudo mudou de resposta."
    elif medidas_mudaram:
        veredito = "medida-divergente"
        motivo = ("Mesmas entradas e mesma conclusão, mas número diferente: o instrumento "
                  "não é determinístico, e isso é achado.")
    else:
        veredito = "reproduzido"
        motivo = "Mesmas entradas, mesmas medidas, mesma conclusão."

    return {
        "veredito": veredito,
        "motivo": motivo,
        "divergencias": [d.documento() for d in divergencias],
    }
