"""A bancada de ensaios vale pelo que ela RECUSA e pelo que ela carimba."""

import math

import pytest

from laboratorio import ensaio
from laboratorio.erros import ErroLaboratorio


def test_TODO_resultado_sai_carimbado_como_simulado():
    """O carimbo existe para sobreviver ao copiar e colar. Sem ele, um número
    de modelo entra num relatório com cara de medição."""
    saidas = [
        ensaio.tracao(area_m2=1e-4, forca_n=1000, comprimento_m=0.1,
                      modulo_pa=200e9, resistencia_pa=350e6),
        ensaio.flexao_tres_pontos(largura_m=0.025, altura_m=0.025, vao_m=0.41,
                                  forca_n=500, modulo_pa=13e9, resistencia_pa=111.7e6),
        ensaio.flambagem(area_m2=1e-4, inercia_m4=1e-9, comprimento_m=2.0, modulo_pa=200e9),
        ensaio.efeito_de_escala(resistencia_pa=100e6, volume_do_ensaio_m3=1e-4,
                                volume_da_peca_m3=1e-3, modulo_de_weibull=10.0,
                                material="madeira"),
    ]
    for s in saidas:
        assert "simulado" in s["natureza"]
        assert "NÃO é medição" in s["natureza"]


def test_o_manifesto_diz_em_primeiro_lugar_que_nao_mede_nada():
    assert any("modelo" in n for n in ensaio.MANIFESTO.nao_cobre)


# --- tração ---------------------------------------------------------------

def test_a_tracao_confere_com_a_conta_feita_a_mao():
    r = ensaio.tracao(area_m2=2e-4, forca_n=4000, comprimento_m=0.5,
                      modulo_pa=200e9, resistencia_pa=400e6)
    assert abs(r["tensao"]["valor"] - 20e6) < 1.0
    assert abs(r["deformacao"]["valor"] - 1e-4) < 1e-12
    assert abs(r["alongamento"]["valor"] - 5e-5) < 1e-15
    assert abs(r["margemContraFalha"] - 20.0) < 1e-9


# --- flexão ---------------------------------------------------------------

def test_a_flexao_em_tres_pontos_confere_com_a_conta_feita_a_mao():
    r = ensaio.flexao_tres_pontos(largura_m=0.02, altura_m=0.02, vao_m=0.30,
                                  forca_n=100, modulo_pa=10e9, resistencia_pa=100e6)
    # sigma = 3FL / (2 b h^2)
    esperado = 3 * 100 * 0.30 / (2 * 0.02 * 0.02 ** 2)
    assert abs(r["tensao"]["valor"] - esperado) / esperado < 1e-12


def test_dobrar_a_altura_derruba_a_tensao_de_flexao_a_um_quarto():
    """Tensão de flexão vai com h²; é a razão de tubo vencer barra."""
    a = ensaio.flexao_tres_pontos(largura_m=0.02, altura_m=0.02, vao_m=0.3,
                                  forca_n=100, modulo_pa=10e9, resistencia_pa=100e6)
    b = ensaio.flexao_tres_pontos(largura_m=0.02, altura_m=0.04, vao_m=0.3,
                                  forca_n=100, modulo_pa=10e9, resistencia_pa=100e6)
    assert abs(a["tensao"]["valor"] / b["tensao"]["valor"] - 4.0) < 1e-9


# --- flambagem ------------------------------------------------------------

def test_coluna_curta_e_RECUSADA_em_vez_de_receber_carga_de_euler():
    """Coluna curta esmaga, não flamba. Euler devolveria a falha errada com um
    número de aparência correta."""
    with pytest.raises(ErroLaboratorio) as e:
        ensaio.flambagem(area_m2=1e-3, inercia_m4=1e-7, comprimento_m=0.1, modulo_pa=200e9)
    assert "esbeltez" in str(e.value)


def test_engastada_livre_flamba_com_um_quarto_da_carga_da_birrotulada():
    """K = 2 contra K = 1, e a carga vai com 1/K²."""
    comum = dict(area_m2=1e-4, inercia_m4=1e-9, comprimento_m=2.0, modulo_pa=200e9)
    a = ensaio.flambagem(**comum, extremidades="birrotulada")
    b = ensaio.flambagem(**comum, extremidades="engastada-livre")
    assert abs(a["cargaCritica"]["valor"] / b["cargaCritica"]["valor"] - 4.0) < 1e-9


def test_extremidade_desconhecida_e_recusada():
    with pytest.raises(ErroLaboratorio):
        ensaio.flambagem(area_m2=1e-4, inercia_m4=1e-9, comprimento_m=2.0,
                         modulo_pa=200e9, extremidades="soldada no teto")


# --- efeito de escala -----------------------------------------------------

def test_peca_MAIOR_que_o_corpo_de_prova_fica_mais_FRACA():
    r = ensaio.efeito_de_escala(resistencia_pa=100e6, volume_do_ensaio_m3=1e-4,
                                volume_da_peca_m3=1e-2, modulo_de_weibull=10.0,
                                material="madeira")
    assert r["fatorDeReducao"] < 1.0
    assert r["resistenciaCorrigida"]["valor"] < 100e6


def test_peca_do_MESMO_tamanho_do_ensaio_nao_muda_nada():
    r = ensaio.efeito_de_escala(resistencia_pa=100e6, volume_do_ensaio_m3=1e-3,
                                volume_da_peca_m3=1e-3, modulo_de_weibull=10.0,
                                material="madeira")
    assert abs(r["fatorDeReducao"] - 1.0) < 1e-12


def test_material_mais_ESPALHADO_sofre_mais_com_o_tamanho():
    """Módulo de Weibull menor quer dizer resistência mais espalhada, e efeito
    de tamanho mais forte. Madeira estrutural com nó sofre mais que madeira limpa."""
    comum = dict(resistencia_pa=100e6, volume_do_ensaio_m3=1e-4,
                 volume_da_peca_m3=1e-2, material="madeira")
    limpa = ensaio.efeito_de_escala(**comum, modulo_de_weibull=12.0)
    com_no = ensaio.efeito_de_escala(**comum, modulo_de_weibull=5.0)
    assert com_no["fatorDeReducao"] < limpa["fatorDeReducao"]


def test_efeito_de_escala_em_METAL_DUCTIL_e_RECUSADO():
    """Metal escoa em volta do defeito e redistribui a tensão. A fórmula do elo
    mais fraco devolveria um número plausível e errado."""
    for ductil in ("aco", "aluminio"):
        with pytest.raises(ErroLaboratorio) as e:
            ensaio.efeito_de_escala(resistencia_pa=350e6, volume_do_ensaio_m3=1e-4,
                                    volume_da_peca_m3=1e-2, modulo_de_weibull=10.0,
                                    material=ductil)
        assert "dúctil" in str(e.value)


def test_o_CABO_de_eucalipto_e_mais_fraco_que_o_corpo_de_prova_do_manual():
    """A correção que este estudo deixou de fazer.

    Os 111,7 MPa do Wood Handbook vêm de corpo de prova de 25 x 25 x 410 mm. O
    estudo do cabo de pá aplicou esse número direto num cabo de 32 mm por 1,2 m,
    que tem quase quatro vezes o volume. Pela estatística de Weibull o cabo é
    mais fraco, e o estudo portanto SUPERESTIMOU o concorrente.
    """
    volume_do_ensaio = 0.025 * 0.025 * 0.410
    volume_do_cabo = math.pi * 0.016 ** 2 * 1.2
    assert volume_do_cabo > volume_do_ensaio
    r = ensaio.efeito_de_escala(
        resistencia_pa=111.7e6, volume_do_ensaio_m3=volume_do_ensaio,
        volume_da_peca_m3=volume_do_cabo,
        modulo_de_weibull=ensaio.MODULOS_DE_WEIBULL["madeira-limpa"],
        material="madeira")
    corrigida = r["resistenciaCorrigida"]["valor"]
    assert 95e6 < corrigida < 105e6, "esperado cerca de 100 MPa, uns 10% abaixo do manual"


def test_modulo_de_weibull_absurdo_e_recusado():
    for m in (0.5, 100.0):
        with pytest.raises(ErroLaboratorio):
            ensaio.efeito_de_escala(resistencia_pa=100e6, volume_do_ensaio_m3=1e-4,
                                    volume_da_peca_m3=1e-3, modulo_de_weibull=m,
                                    material="madeira")
