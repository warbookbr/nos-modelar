"""Onde um candidato TEM de estar para ainda ser possível — o espaço, não a lista.

O PROBLEMA QUE ISTO RESOLVE. Enumerar material não acaba nunca: sempre aparece
mais uma ideia, e cada uma custa uma rodada de conta para morrer. Este estudo
gastou assim com papelão, barro, pó de pedra, sisal, madeira plástica, micarta e
laminado. Todos reprovaram, e nenhum precisava ter chegado à bancada.

A SAÍDA NÃO É TESTAR MAIS RÁPIDO, é parar de testar um por um. As restrições do
problema — carga, comprimento, diâmetro que cabe na mão, massa que se carrega —
recortam uma REGIÃO no plano de resistência-por-quilo contra rigidez-por-quilo.
Material fora da região está fora, e a conta que mostra isso é uma linha.

A CONSEQUÊNCIA PRÁTICA: a pergunta "já esgotamos as alternativas?" não tem
resposta por enumeração, e tem por região. Não se prova que nada mais existe; se
diz exatamente o que um candidato novo precisa ter para valer a pena olhar.

POR QUE RESISTÊNCIA POR QUILO E RIGIDEZ POR QUILO, e não os valores absolutos: o
diâmetro é livre até o limite da mão, então engrossar compra resistência de graça
— até acabar a mão ou acabar o braço. Quando o diâmetro é livre e a massa é
limitada, quem decide é a propriedade dividida pela densidade. É por isso que o
bambu ganha do aço tendo um quinto da resistência absoluta.

O QUE ESTA REGIÃO NÃO SABE, e a lista importa tanto quanto a conta: saúde,
toxicidade, preço, fornecedor, dureza de superfície, apodrecimento, fadiga e
farpa. Ela é um filtro de POSSIBILIDADE FÍSICA, e passar nela não é ser bom
candidato — é apenas não estar eliminado. Reprovar nela, sim, é definitivo.

AS FÓRMULAS SÃO DERIVADAS, e não copiadas: viga engastada de seção circular
cheia, carga na ponta. Elas estão provadas contra `viga.py` no teste — se as duas
discordarem, o teste quebra. Álgebra que ninguém confere envelhece errada.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from .erros import falhar
from .instrumentos import Manifesto, Registro

INSTRUMENTO = "materiais.dominio-de-possibilidade"
VERSAO = "1.0.0"

MANIFESTO = Manifesto(
    identidade=INSTRUMENTO,
    versao=VERSAO,
    capacidades=(
        "calcular a resistência por quilo e a rigidez por quilo mínimas para um "
        "cabo de seção circular cheia, dados carga, comprimento, diâmetro máximo, "
        "massa máxima e flecha máxima",
        "dizer se um material está eliminado, e por qual das duas restrições",
    ),
    dominio={
        "diametro_m": lambda v: 0 < v < 0.2,
        "comprimento_m": lambda v: 0 < v < 5.0,
    },
    nao_cobre=(
        "seção que não seja circular cheia: tubo joga material para longe do centro "
        "e desloca a fronteira a favor do candidato",
        "saúde, toxicidade, preço, fornecedor e certificação",
        "dureza de superfície, apodrecimento, caruncho e farpa",
        "fadiga, fluência e impacto",
        "efeito de tamanho: quem entra aqui deve entrar JÁ corrigido",
        "anisotropia: entra um módulo único, o da direção do esforço",
    ),
    determinista=True,
    maturidade="experimental",
)


def registro_padrao() -> Registro:
    registro = Registro()
    registro.registrar(MANIFESTO)
    return registro


@dataclass(frozen=True)
class Fronteira:
    """O piso que um material precisa alcançar para não estar eliminado."""

    resistencia_por_densidade: float
    rigidez_por_densidade: float
    #: Em que geometria este piso vale. Ele é o piso MAIS FROUXO possível, obtido
    #: no maior diâmetro que a mão aceita: qualquer cabo mais fino exige mais.
    diametro_m: float
    massa_maxima_kg: float

    def documento(self) -> dict[str, Any]:
        return {
            "instrumento": INSTRUMENTO,
            "versao": VERSAO,
            "resistenciaPorDensidade": self.resistencia_por_densidade,
            "rigidezPorDensidade": self.rigidez_por_densidade,
            "diametro_m": self.diametro_m,
            "massaMaxima_kg": self.massa_maxima_kg,
            "leiaAssim": ("piso de possibilidade física no diâmetro mais generoso; "
                          "passar aqui não é ser bom candidato, é não estar eliminado"),
        }


def fronteira(*, forca_n: float, comprimento_m: float, diametro_m: float,
              massa_maxima_kg: float, flecha_maxima_m: float,
              margem_alvo: float = 1.0) -> Fronteira:
    """Deriva o piso de σ/ρ e de E/ρ para a geometria mais generosa permitida.

    RESISTÊNCIA. Numa viga engastada de seção cheia, a tensão máxima é
    32·F·L/(π·d³) e a massa é ρ·π·d²·L/4. Exigir σ ≥ tensão·margem e massa ≤ M dá,
    dividindo uma pela outra:

        σ/ρ  ≥  8·F·L²·margem / (M·d)

    RIGIDEZ. A flecha é 64·F·L³/(3·π·E·d⁴). Exigir flecha ≤ δ dá, pelo mesmo
    caminho:

        E/ρ  ≥  16·F·L⁴ / (3·δ·M·d²)

    As duas caem com o diâmetro, então o piso mais frouxo está no maior diâmetro.
    """
    for nome, valor in (("forca_n", forca_n), ("comprimento_m", comprimento_m),
                        ("diametro_m", diametro_m), ("massa_maxima_kg", massa_maxima_kg),
                        ("flecha_maxima_m", flecha_maxima_m), ("margem_alvo", margem_alvo)):
        if not math.isfinite(valor) or valor <= 0:
            raise falhar("instrumento", "entrada-nao-positiva",
                         f"{nome} = {valor}.", local=nome)
    return Fronteira(
        resistencia_por_densidade=(
            8 * forca_n * comprimento_m ** 2 * margem_alvo / (massa_maxima_kg * diametro_m)),
        rigidez_por_densidade=(
            16 * forca_n * comprimento_m ** 4
            / (3 * flecha_maxima_m * massa_maxima_kg * diametro_m ** 2)),
        diametro_m=diametro_m,
        massa_maxima_kg=massa_maxima_kg,
    )


def situar(fronteira: Fronteira, *, resistencia_pa: float, modulo_pa: float,
           densidade_kg_m3: float, nome: str = "candidato") -> dict[str, Any]:
    """Diz se o material está eliminado, e por qual restrição.

    A resistência que entra aqui deve estar JÁ corrigida pelo efeito de tamanho:
    o piso é do CABO, e valor de corpo de prova não é valor de cabo.
    """
    for chave, valor in (("resistencia_pa", resistencia_pa), ("modulo_pa", modulo_pa),
                         ("densidade_kg_m3", densidade_kg_m3)):
        if not math.isfinite(valor) or valor <= 0:
            raise falhar("instrumento", "entrada-nao-positiva",
                         f"{chave} = {valor}.", local=chave)
    sigma = resistencia_pa / densidade_kg_m3
    e = modulo_pa / densidade_kg_m3
    passa_resistencia = sigma >= fronteira.resistencia_por_densidade
    passa_rigidez = e >= fronteira.rigidez_por_densidade
    faltas = tuple(
        f for f, ok in (("resistência por quilo", passa_resistencia),
                        ("rigidez por quilo", passa_rigidez)) if not ok)
    return {
        "instrumento": INSTRUMENTO,
        "versao": VERSAO,
        "candidato": nome,
        "resistenciaPorDensidade": sigma,
        "rigidezPorDensidade": e,
        "folgaEmResistencia": sigma / fronteira.resistencia_por_densidade,
        "folgaEmRigidez": e / fronteira.rigidez_por_densidade,
        "eliminado": bool(faltas),
        "reprovaEm": faltas,
        "leiaAssim": ("eliminado aqui é definitivo dentro do domínio declarado; "
                      "não eliminado não é aprovado — saúde, preço, dureza e "
                      "durabilidade ficam todos de fora desta conta"),
    }
