"""A identidade canônica: mesmo conteúdo, mesmo id — e recusa do que não é dado."""
import pytest

from laboratorio.erros import ErroLaboratorio
from laboratorio.identidade import identificar, serializar


def test_ordem_de_chave_nao_muda_a_identidade():
    assert identificar({"b": 1, "a": 2}) == identificar({"a": 2, "b": 1})


def test_conteudo_diferente_muda_a_identidade():
    assert identificar({"a": 1}) != identificar({"a": 2})


def test_ordem_de_lista_e_conteudo():
    """Lista é sequência: trocar a ordem é outro documento, e o id acompanha."""
    assert identificar({"a": [1, 2]}) != identificar({"a": [2, 1]})


def test_flutuante_exato_e_o_mesmo_valor_que_o_inteiro():
    """Senão a mesma medida lida por duas rotas produz dois ids."""
    assert identificar({"n": 2.0}) == identificar({"n": 2})
    assert serializar({"n": 2.0}) == '{"n":2}'


def test_nao_finito_e_recusado():
    """NaN nunca se compara igual a si mesmo: como identidade, é veneno."""
    for valor in (float("nan"), float("inf")):
        with pytest.raises(ErroLaboratorio) as erro:
            identificar({"medida": valor})
        assert erro.value.codigo == "numero-nao-finito"


def test_tipo_sem_representacao_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        identificar({"quando": object()})
    assert erro.value.codigo == "tipo-nao-serializavel"
