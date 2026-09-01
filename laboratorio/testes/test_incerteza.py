"""Propagação: semente declarada, quantis, e convergência conferida."""
import pytest

from laboratorio.erros import ErroLaboratorio
from laboratorio.incerteza import Sorteio, propagar


def identidade(ponto):
    return ponto["x"]


def test_A_MESMA_SEMENTE_DA_O_MESMO_RESULTADO():
    """Sem isto a reprodução vira sorte."""
    a = propagar({"x": (0.0, 1.0)}, identidade, semente=7, amostras=500)
    b = propagar({"x": (0.0, 1.0)}, identidade, semente=7, amostras=500)
    assert a["p05"] == b["p05"] and a["p95"] == b["p95"]


def test_sementes_diferentes_dao_resultados_diferentes():
    a = propagar({"x": (0.0, 1.0)}, identidade, semente=7, amostras=500)
    b = propagar({"x": (0.0, 1.0)}, identidade, semente=8, amostras=500)
    assert a["p05"] != b["p05"]


def test_os_quantis_ficam_na_faixa_e_em_ordem():
    r = propagar({"x": (10.0, 20.0)}, identidade, semente=1, amostras=2000)
    assert 10.0 <= r["minimo"] <= r["p05"] <= r["p50"] <= r["p95"] <= r["maximo"] <= 20.0


def test_A_ORDEM_DO_DICIONARIO_NAO_MUDA_o_resultado():
    """Senão a reprodução dependeria de detalhe invisível de quem montou a entrada."""
    f = lambda p: p["a"] - p["b"]
    a = propagar({"a": (0.0, 1.0), "b": (0.0, 1.0)}, f, semente=3, amostras=500)
    b = propagar({"b": (0.0, 1.0), "a": (0.0, 1.0)}, f, semente=3, amostras=500)
    assert a["p50"] == b["p50"]


def test_POUCAS_AMOSTRAS_e_recusado():
    """O percentil 5 de 100 amostras balança mais que o efeito medido."""
    with pytest.raises(ErroLaboratorio) as erro:
        propagar({"x": (0.0, 1.0)}, identidade, semente=1, amostras=50)
    assert erro.value.codigo == "amostras-insuficientes"


def test_A_CONVERGENCIA_e_CONFERIDA_e_nao_assumida():
    r = propagar({"x": (0.0, 1.0)}, identidade, semente=1, amostras=2000)
    assert r["convergencia"]["convergiu"] is True
    assert r["convergencia"]["criterio"]


def test_sem_faixa_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        propagar({}, identidade, semente=1)
    assert erro.value.codigo == "sem-faixa"


def test_faixa_invertida_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        propagar({"x": (5.0, 1.0)}, identidade, semente=1)
    assert erro.value.codigo == "faixa-invalida"


def test_resultado_nao_finito_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        propagar({"x": (0.0, 1.0)}, lambda p: float("inf"), semente=1)
    assert erro.value.codigo == "resultado-nao-finito"


def test_semente_invalida_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        Sorteio(-1)
    assert erro.value.codigo == "semente-invalida"


def test_A_SAIDA_AVISA_que_nao_sabe_de_CORRELACAO():
    """Se as entradas andam juntas no mundo real, a cauda aqui está otimista."""
    r = propagar({"x": (0.0, 1.0)}, identidade, semente=1, amostras=500)
    assert "otimista" in r["aviso"]
    assert r["distribuicaoSuposta"]
    assert r["semente"] == 1
