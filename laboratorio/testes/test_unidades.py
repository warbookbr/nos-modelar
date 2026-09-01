"""Grandezas: o erro de unidade não levanta exceção sozinho, então levanta aqui."""
import pytest

from laboratorio.erros import ErroLaboratorio
from laboratorio.unidades import (ADIMENSIONAL, AREA, COMPRIMENTO, Grandeza,
                                  converter, dimensao, escrever)


def mm(v):
    return Grandeza(v, "mm", COMPRIMENTO)


def test_soma_de_mesma_unidade_passa():
    assert (mm(2) + mm(3)).valor == 5


def test_SOMAR_DIMENSOES_DIFERENTES_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        mm(1) + Grandeza(1, "s", dimensao(tempo=1))
    assert erro.value.codigo == "dimensao-incompativel"


def test_SOMAR_MESMA_DIMENSAO_COM_OUTRA_UNIDADE_e_recusado():
    """Metro e milímetro têm a mesma dimensão e não são a mesma coisa."""
    with pytest.raises(ErroLaboratorio) as erro:
        mm(1) + Grandeza(1, "m", COMPRIMENTO)
    assert erro.value.codigo == "unidade-incompativel"
    assert erro.value.acao_sugerida


def test_multiplicar_comprimentos_da_area():
    a = mm(3) * mm(4)
    assert a.valor == 12 and a.dimensao == AREA and a.unidade == "mm·mm"


def test_razao_de_mesma_unidade_fica_adimensional_e_perde_a_unidade():
    r = mm(10) / mm(4)
    assert r.dimensao == ADIMENSIONAL
    assert r.unidade == "1"
    assert r.valor == 2.5


def test_dividir_dimensoes_diferentes_preserva_a_conta():
    v = mm(10) / Grandeza(2, "s", dimensao(tempo=1))
    assert v.unidade == "mm/s"
    assert escrever(v.dimensao) == "comprimento^1·tempo^-1"


def test_VALOR_NAO_FINITO_e_recusado():
    """NaN atravessa conta inteira sem reclamar e faz igualdade mentir."""
    with pytest.raises(ErroLaboratorio) as erro:
        mm(float("nan"))
    assert erro.value.codigo == "valor-nao-finito"
    with pytest.raises(ErroLaboratorio):
        mm(float("inf"))


def test_GRANDEZA_SEM_UNIDADE_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        Grandeza(1, "  ", COMPRIMENTO)
    assert erro.value.codigo == "unidade-vazia"


def test_booleano_nao_passa_por_numero():
    with pytest.raises(ErroLaboratorio) as erro:
        Grandeza(True, "mm", COMPRIMENTO)
    assert erro.value.codigo == "valor-nao-numerico"


def test_divisao_por_zero_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        mm(1) / mm(0)
    assert erro.value.codigo == "divisao-por-zero"


def test_base_dimensional_inventada_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        dimensao(dinheiro=1)
    assert erro.value.codigo == "base-dimensional-desconhecida"


def test_CONVERSAO_SEM_JUSTIFICATIVA_e_recusada():
    """Fator sem origem é o erro de unidade disfarçado de conversão."""
    with pytest.raises(ErroLaboratorio) as erro:
        converter(mm(1000), "m", 1e-3, justificativa=" ")
    assert erro.value.codigo == "conversao-sem-justificativa"


def test_conversao_declarada_preserva_a_dimensao():
    m = converter(mm(1000), "m", 1e-3, justificativa="1 m = 1000 mm, definição do SI")
    assert m.valor == 1.0 and m.unidade == "m"
    assert m.dimensao == COMPRIMENTO


def test_fator_invalido_e_recusado():
    for ruim in (0, float("inf")):
        with pytest.raises(ErroLaboratorio) as erro:
            converter(mm(1), "m", ruim, justificativa="x")
        assert erro.value.codigo == "fator-invalido"


def test_convertida_ainda_nao_soma_com_a_original():
    """A conversão não apaga a diferença de unidade; ela move o valor."""
    m = converter(mm(1000), "m", 1e-3, justificativa="definição do SI")
    with pytest.raises(ErroLaboratorio):
        m + mm(1)
