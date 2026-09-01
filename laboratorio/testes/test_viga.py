"""Cabo como viga: as contas, e a recusa que impede otimizar para a parede impossível."""
import pytest

from laboratorio.erros import ErroLaboratorio
from laboratorio.viga import (MANIFESTO, avaliar, canario, registro_padrao,
                              secao_macica, secao_tubular)

COMUM = dict(comprimento_m=1.2, forca_n=300.0, modulo_pa=12e9,
             densidade_kg_m3=800.0, resistencia_pa=75e6, fator_de_perda=0.01)


def test_O_CANARIO_PASSA():
    canario()


def test_dobrar_o_diametro_multiplica_a_inercia_por_16():
    assert abs(secao_macica(0.06)["inercia"] / secao_macica(0.03)["inercia"] - 16) < 1e-9


def test_o_TUBO_e_mais_rigido_que_o_macico_com_MENOS_material():
    """É a razão de existir do tubo: material longe do centro trabalha mais."""
    tubo = secao_tubular(0.040, 0.0032)
    macico = secao_macica(0.030)
    assert tubo["inercia"] > macico["inercia"]
    assert tubo["area"] < macico["area"]


def test_PAREDE_FINA_DEMAIS_e_RECUSADA():
    """Sem isto a otimização escolhe sempre a parede que enruga."""
    with pytest.raises(ErroLaboratorio) as erro:
        secao_tubular(0.032, 0.0002)
    assert erro.value.codigo == "parede-fina-demais"
    assert erro.value.acao_sugerida


def test_parede_maior_que_o_tubo_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        secao_tubular(0.032, 0.020)
    assert erro.value.codigo == "parede-maior-que-o-tubo"


def test_a_tensao_cresce_com_a_carga_e_com_o_braco():
    base = avaliar(secao_macica(0.032), **COMUM)["tensao"]["valor"]
    dobro = avaliar(secao_macica(0.032), **{**COMUM, "forca_n": 600.0})["tensao"]["valor"]
    assert abs(dobro / base - 2) < 1e-9


def test_a_flecha_cresce_com_o_CUBO_do_comprimento():
    base = avaliar(secao_macica(0.032), **COMUM)["flecha"]["valor"]
    longo = avaliar(secao_macica(0.032), **{**COMUM, "comprimento_m": 2.4})["flecha"]["valor"]
    assert abs(longo / base - 8) < 1e-9


def test_QUEM_DISSIPA_MAIS_sobra_com_MENOS_vibracao():
    """A conta que separa madeira de metal na mão do usuário."""
    madeira = avaliar(secao_macica(0.032), **COMUM)["vibracaoRestanteApos10Ciclos"]["valor"]
    metal = avaliar(secao_macica(0.032),
                    **{**COMUM, "fator_de_perda": 0.0005})["vibracaoRestanteApos10Ciclos"]["valor"]
    assert metal > madeira
    assert metal > 0.9 and madeira < 0.8


def test_fator_de_perda_fora_de_faixa_e_recusado():
    for ruim in (0.0, 1.0, -0.1):
        with pytest.raises(ErroLaboratorio) as erro:
            avaliar(secao_macica(0.032), **{**COMUM, "fator_de_perda": ruim})
        assert erro.value.codigo == "fator-de-perda-fora-de-faixa"


def test_entrada_nao_positiva_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        avaliar(secao_macica(0.032), **{**COMUM, "modulo_pa": 0.0})
    assert erro.value.codigo == "entrada-nao-positiva"


def test_a_MARGEM_diz_que_NAO_tem_coeficiente_de_seguranca_embutido():
    r = avaliar(secao_macica(0.032), **COMUM)
    assert "não há coeficiente de segurança" in r["significadoDaMargem"]


def test_o_manifesto_declara_fadiga_e_enrugamento_como_nao_cobertos():
    juntos = " ".join(MANIFESTO.nao_cobre)
    assert "fadiga" in juntos and "nrugamento" in juntos


def test_o_instrumento_esta_registrado():
    assert registro_padrao().exigir(MANIFESTO.identidade, MANIFESTO.versao)
