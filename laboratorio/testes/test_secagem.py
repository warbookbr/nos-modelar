"""Secagem: o tempo vai com o quadrado da espessura, e é a razão que vale."""
import pytest

from laboratorio.erros import ErroLaboratorio
from laboratorio.secagem import comparar_preparo, tempo_de_secagem


def test_DOBRAR_A_ESPESSURA_QUADRUPLICA_o_tempo():
    """Não é proporcional: é quadrático. É o que decide a comparação."""
    assert abs(tempo_de_secagem(0.02) / tempo_de_secagem(0.01) - 4.0) < 1e-9


def test_a_RAZAO_nao_depende_da_difusividade():
    """Por isso a razão é confiável e o valor absoluto não."""
    a = tempo_de_secagem(0.016, difusividade=1e-10) / tempo_de_secagem(0.0015, difusividade=1e-10)
    b = tempo_de_secagem(0.016, difusividade=5e-10) / tempo_de_secagem(0.0015, difusividade=5e-10)
    assert abs(a - b) < 1e-9


def test_espessura_nao_positiva_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        tempo_de_secagem(0.0)
    assert erro.value.codigo == "espessura-nao-positiva"


def test_sem_peca_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        comparar_preparo({})
    assert erro.value.codigo == "sem-peca"


def test_o_resultado_AVISA_para_ler_a_razao_e_nao_o_valor():
    """Os dias absolutos são otimistas: cabo de eucalipto seca ao ar em meses."""
    r = comparar_preparo({"a": {"espessura_de_difusao_m": 0.01}})
    assert "meses" in r["leiaARazaoNaoOvalor"]
    assert "difusividade se cancela" in r["leiaARazaoNaoOvalor"]


def test_o_que_o_modelo_NAO_faz_e_declarado():
    """Colapso e rachadura viram perda de material, e não só tempo."""
    juntos = " ".join(comparar_preparo({"a": {"espessura_de_difusao_m": 0.01}})["oQueNaoModela"])
    assert "colapso" in juntos and "estufa" in juntos


def test_PASSO_SOBREPOSTO_e_declarado_e_nao_somado():
    """Somar passo que roda em paralelo inventa tempo que ninguém gasta."""
    r = comparar_preparo({"x": {"espessura_de_difusao_m": 0.003,
                                "passos": ("imersão", "secagem"),
                                "sobrepostos": ("imersão",)}})
    assert r["pecas"]["x"]["passosSobrepostos"] == ("imersão",)
