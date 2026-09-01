"""Leis: achar a forma que os pontos sustentam, sem chamar ajuste de explicação."""
import math

import pytest

from laboratorio.erros import ErroLaboratorio
from laboratorio.leis import procurar


def amostrar(f, xs):
    return list(xs), [f(x) for x in xs]


def test_acha_a_RETA_quando_os_dados_sao_reta():
    xs, ys = amostrar(lambda x: 3 * x + 7, range(1, 9))
    doc = procurar(xs, ys)
    assert doc["melhor"]["forma"] == "linear"
    assert doc["melhor"]["erroMedioAbsoluto"] < 1e-9


def test_acha_a_POTENCIA_quando_os_dados_sao_potencia():
    xs, ys = amostrar(lambda x: 2.0 * x ** 1.5, range(1, 12))
    doc = procurar(xs, ys)
    assert doc["melhor"]["forma"] == "potencia"
    assert "x^1.5" in doc["melhor"]["expressao"]


def test_acha_HALL_PETCH_no_inverso_da_raiz():
    """Resistência contra tamanho de grão: a forma clássica de materiais."""
    xs, ys = amostrar(lambda d: 100 + 500 / math.sqrt(d), [1, 2, 4, 9, 16, 25, 36, 49])
    doc = procurar(xs, ys)
    assert doc["melhor"]["forma"] == "inverso-da-raiz"
    assert "Hall-Petch" in doc["melhor"]["significado"]


def test_acha_a_EXPONENCIAL():
    xs, ys = amostrar(lambda x: 3.0 * math.exp(0.4 * x), range(1, 10))
    assert procurar(xs, ys)["melhor"]["forma"] == "exponencial"


def test_FORMA_QUE_NAO_SE_APLICA_e_MARCADA_e_nao_some():
    """Sumir da comparação faria a vencedora parecer melhor do que é."""
    xs = [-3.0, -2.0, -1.0, 1.0, 2.0, 3.0, 4.0]
    ys = [2 * x + 1 for x in xs]
    doc = procurar(xs, ys)
    por_forma = {c["forma"]: c for c in doc["candidatas"]}
    assert por_forma["potencia"]["estado"] == "nao-aplicavel"
    assert por_forma["potencia"]["motivo"]
    assert doc["melhor"]["forma"] == "linear"


def test_POUCOS_PONTOS_e_recusado():
    """Ajuste com poucos pontos descreve o ruído."""
    with pytest.raises(ErroLaboratorio) as erro:
        procurar([1, 2, 3], [1, 2, 3])
    assert erro.value.codigo == "pontos-insuficientes"
    assert erro.value.acao_sugerida


def test_x_constante_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        procurar([2.0] * 6, [1, 2, 3, 4, 5, 6])
    assert erro.value.codigo == "x-constante"


def test_pontos_desemparelhados_sao_recusados():
    with pytest.raises(ErroLaboratorio) as erro:
        procurar([1, 2, 3, 4, 5, 6], [1, 2])
    assert erro.value.codigo == "pontos-desemparelhados"


def test_ponto_nao_finito_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        procurar([1, 2, 3, 4, 5, 6], [1, 2, 3, float("inf"), 5, 6])
    assert erro.value.codigo == "ponto-nao-finito"


def test_TODO_RESULTADO_CARREGA_O_AVISO_de_que_ajuste_nao_e_explicacao():
    """Duas causas diferentes produzem a mesma curva."""
    xs, ys = amostrar(lambda x: 3 * x + 7, range(1, 9))
    doc = procurar(xs, ys)
    assert "não explica por quê" in doc["aviso"]
    assert doc["pontos"] == 8


def test_o_resultado_carrega_ERRO_e_nao_so_r2():
    xs, ys = amostrar(lambda x: 3 * x + 7, range(1, 9))
    melhor = procurar(xs, ys)["melhor"]
    assert "erroMedioAbsoluto" in melhor and "erroMaximo" in melhor
    assert "r2NoEspacoTransformado" in melhor


def test_EMPATE_TECNICO_fica_visivel():
    """Escolher por casas decimais entre duas formas quase iguais é falso."""
    xs = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2]
    ys = [2.0 * x for x in xs]
    doc = procurar(xs, ys)
    # Numa faixa curta, reta e potência descrevem praticamente igual.
    assert doc["melhor"]["forma"] in {"linear", "potencia"}
    assert isinstance(doc["empateTecnico"], list)


def test_toda_forma_do_catalogo_declara_SIGNIFICADO():
    """Forma sem significado é pescaria, e pescaria sempre pesca alguma coisa."""
    from laboratorio.leis import FORMAS

    assert all(f.significado.strip() for f in FORMAS)
