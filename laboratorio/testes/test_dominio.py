"""A fronteira só vale se ela concordar com a bancada. É a primeira coisa testada."""

import math

import pytest

from laboratorio import dominio
from laboratorio.erros import ErroLaboratorio
from laboratorio.viga import avaliar, secao_macica

CARGA = dict(forca_n=300.0, comprimento_m=1.2)


def _cabo(d, modulo, densidade, resistencia):
    return avaliar(secao_macica(d), **CARGA, modulo_pa=modulo,
                   densidade_kg_m3=densidade, resistencia_pa=resistencia,
                   fator_de_perda=0.01)


def test_a_ALGEBRA_da_fronteira_concorda_com_a_BANCADA():
    """A prova de que a derivação está certa, e não só plausível.

    Monto um cabo qualquer na bancada, leio massa e flecha dele, e peço à fronteira
    o piso para exatamente essa massa e essa flecha. O material tem de cair
    exatamente EM CIMA da fronteira nas duas contas. Se a álgebra estivesse errada,
    ele cairia acima ou abaixo.
    """
    d, modulo, densidade, resistencia = 0.032, 13.0e9, 800.0, 111.7e6
    r = _cabo(d, modulo, densidade, resistencia)
    massa = r["massa"]["valor"]
    flecha = r["flecha"]["valor"] if isinstance(r.get("flecha"), dict) else r["flecha_m"]

    f = dominio.fronteira(**CARGA, diametro_m=d, massa_maxima_kg=massa,
                          flecha_maxima_m=flecha,
                          margem_alvo=r["margemContraFalha"])
    assert math.isclose(f.resistencia_por_densidade, resistencia / densidade, rel_tol=1e-9)
    assert math.isclose(f.rigidez_por_densidade, modulo / densidade, rel_tol=1e-9)


def test_a_fronteira_AFROUXA_com_diametro_maior():
    """Engrossar compra resistência de graça até acabar a mão. É a razão de a
    fronteira ser avaliada no maior diâmetro permitido."""
    comum = dict(**CARGA, massa_maxima_kg=0.8, flecha_maxima_m=0.30)
    fina = dominio.fronteira(**comum, diametro_m=0.032)
    grossa = dominio.fronteira(**comum, diametro_m=0.045)
    assert grossa.resistencia_por_densidade < fina.resistencia_por_densidade
    assert grossa.rigidez_por_densidade < fina.rigidez_por_densidade


def test_a_fronteira_APERTA_com_massa_menor():
    comum = dict(**CARGA, diametro_m=0.040, flecha_maxima_m=0.30)
    leve = dominio.fronteira(**comum, massa_maxima_kg=0.4)
    pesada = dominio.fronteira(**comum, massa_maxima_kg=1.2)
    assert leve.resistencia_por_densidade > pesada.resistencia_por_densidade


# --- a peneira, contra tudo o que este estudo já testou -------------------

#: Piso mais frouxo do problema real: 45 mm, o limite da mão; 1,0 kg, que é bem
#: mais do que o cabo de eucalipto pesa; e flecha igual à do eucalipto brasileiro.
#: Frouxo de propósito — quem reprova AQUI não tinha chance nenhuma.
FROUXA = dict(**CARGA, diametro_m=0.045, massa_maxima_kg=1.0, flecha_maxima_m=0.30)

#: resistência (já corrigida grosso modo), módulo, densidade
CANDIDATOS = {
    "bambu-colmo": (150e6, 15.0e9, 700.0),
    "eucalipto-urograndis": (77e6, 11.1e9, 612.0),
    "pinus-comercial": (48e6, 8.0e9, 510.0),
    "fibra-de-vidro": (300e6, 30.0e9, 1900.0),
    "aco-1020": (350e6, 205.0e9, 7850.0),
    "papel-lignina": (65e6, 6.0e9, 1300.0),
    "sisal-mamona": (11e6, 2.5e9, 1150.0),
    "madeira-plastica": (40e6, 3.4e9, 1150.0),
    "adobe-com-fibra": (1e6, 1.0e9, 1750.0),
    "po-de-pedra-50": (12e6, 26.5e9, 1900.0),
    "geopolimero": (8e6, 25.0e9, 2100.0),
}


def _situar(nome):
    s, e, rho = CANDIDATOS[nome]
    f = dominio.fronteira(**FROUXA)
    return dominio.situar(f, resistencia_pa=s, modulo_pa=e,
                          densidade_kg_m3=rho, nome=nome)


def test_a_PENEIRA_mata_de_uma_linha_o_que_custou_uma_rodada_cada():
    """Cada um destes gastou uma rodada de conta para morrer. Nenhum precisava
    ter chegado à bancada: todos reprovam no piso mais frouxo do problema."""
    for nome in ("sisal-mamona", "adobe-com-fibra", "po-de-pedra-50",
                 "geopolimero", "papel-lignina", "madeira-plastica"):
        assert _situar(nome)["eliminado"], nome


def test_a_peneira_NAO_mata_quem_de_fato_disputou():
    for nome in ("bambu-colmo", "fibra-de-vidro", "eucalipto-urograndis"):
        assert not _situar(nome)["eliminado"], nome


def test_ela_diz_QUAL_restricao_reprovou_e_elas_sao_diferentes():
    """Distinção que este estudo levou muito tempo para enxergar: sisal é fraco de
    um jeito e pó de pedra é fraco de outro. Sisal reprova nas duas; pó de pedra é
    rijo e passa em rigidez, morrendo só na resistência."""
    sisal = _situar("sisal-mamona")
    pedra = _situar("po-de-pedra-50")
    assert set(sisal["reprovaEm"]) == {"resistência por quilo", "rigidez por quilo"}
    assert sisal["folgaEmRigidez"] < 1.0
    assert pedra["reprovaEm"] == ("resistência por quilo",)
    assert pedra["folgaEmRigidez"] > 1.0, "pó de pedra é rijo; ele é frágil, não mole"


def test_a_peneira_ELIMINA_O_ACO_e_esse_e_o_LIMITE_dela():
    """Este teste afirmava o contrário, e o módulo o corrigiu na primeira execução.

    O aço reprova aqui, em resistência por quilo — e a eliminação está CERTA para o
    que a peneira mede e ERRADA para o mundo: a peneira é de seção CHEIA, e uma
    barra maciça de aço de 45 mm pesaria uns 15 kg. Aço vira cabo como TUBO de
    parede fina, e tubo joga material para longe do centro, deslocando a fronteira
    a favor dele.

    Então a ressalva do `leiaAssim` não é enfeite: "eliminado é definitivo DENTRO
    DO DOMÍNIO DECLARADO", e o domínio declarado é seção cheia. Aplicar esta
    peneira num candidato que se usa em tubo mata quem sobreviveria.

    A conclusão do estudo sobre o aço não muda, e vem de outro lugar: ele é
    reprovado por vibração, que esta conta não vê.
    """
    aco = _situar("aco-1020")
    assert aco["eliminado"]
    assert aco["reprovaEm"] == ("resistência por quilo",)
    assert aco["folgaEmRigidez"] > 4.0, "de rigidez ele tem de sobra"
    assert "dentro do domínio declarado" in aco["leiaAssim"]
    assert any("circular cheia" in n for n in dominio.MANIFESTO.nao_cobre)


def test_NAO_ELIMINADO_nao_e_APROVADO_e_o_aluminio_prova():
    """O alumínio passa na peneira com folga e continua reprovado no estudo, por
    vibração — que esta conta não vê. Passar aqui é só não estar eliminado."""
    f = dominio.fronteira(**FROUXA)
    aluminio = dominio.situar(f, resistencia_pa=276e6, modulo_pa=69e9,
                              densidade_kg_m3=2700.0, nome="aluminio-6061-t6")
    assert not aluminio["eliminado"]
    assert "não eliminado não é aprovado" in aluminio["leiaAssim"]


def test_o_bambu_tem_a_MAIOR_folga_entre_os_que_passam():
    folgas = {n: _situar(n)["folgaEmResistencia"]
              for n in CANDIDATOS if not _situar(n)["eliminado"]}
    assert max(folgas, key=folgas.get) == "bambu-colmo"
    assert folgas["bambu-colmo"] > folgas["eucalipto-urograndis"]


def test_entrada_nao_positiva_e_recusada():
    with pytest.raises(ErroLaboratorio):
        dominio.fronteira(**{**FROUXA, "massa_maxima_kg": 0.0})
    with pytest.raises(ErroLaboratorio):
        dominio.situar(dominio.fronteira(**FROUXA), resistencia_pa=-1.0,
                       modulo_pa=1e9, densidade_kg_m3=1000.0)


def test_o_manifesto_admite_que_TUBO_desloca_a_fronteira():
    """A fronteira é de seção cheia. Tubo joga material para longe do centro e
    afrouxa o piso — omitir isso faria a peneira matar candidato que sobreviveria."""
    assert any("tubo" in n.lower() for n in dominio.MANIFESTO.nao_cobre)
