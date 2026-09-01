"""Escolha do próximo experimento: o palpite tem de saber onde não sabe."""
import math

import pytest

from laboratorio.erros import ErroLaboratorio
from laboratorio.escolha import Palpite, sugerir


def pontos_de(f, xs):
    return [[x] for x in xs], [f(x) for x in xs]


def palpite_simples(xs=(0.0, 1.0, 2.0, 3.0, 4.0)):
    e, s = pontos_de(lambda x: x * x, xs)
    return Palpite(e, s)


def test_o_palpite_ACERTA_onde_ja_mediu():
    p = palpite_simples()
    previsao = p.prever([2.0])
    assert abs(previsao.valor - 4.0) < 1e-3
    assert previsao.desvio < 1e-3


def test_A_DUVIDA_CRESCE_longe_dos_pontos_medidos():
    p = Palpite([[0.0], [1.0], [4.0], [5.0]], [0.0, 1.0, 16.0, 25.0])
    perto = p.prever([1.05]).desvio
    longe = p.prever([2.5]).desvio
    assert longe > perto


def test_FORA_DA_FAIXA_e_DECLARADO_e_nao_devolvido_como_se_valesse():
    p = palpite_simples()
    assert p.prever([2.0]).dentro_da_faixa is True
    assert p.prever([9.0]).dentro_da_faixa is False


def test_toda_previsao_e_marcada_como_ESTIMADA():
    """Palpite que perde a etiqueta vira resultado que ninguém sabe que foi inventado."""
    assert palpite_simples().prever([1.5]).documento()["origem"] == "estimada"


def test_POUCOS_PONTOS_e_recusado():
    """Dois pontos definem uma reta e nenhuma curvatura."""
    with pytest.raises(ErroLaboratorio) as erro:
        Palpite([[0.0], [1.0]], [0.0, 1.0])
    assert erro.value.codigo == "pontos-insuficientes"
    assert erro.value.acao_sugerida


def test_pontos_desemparelhados_sao_recusados():
    with pytest.raises(ErroLaboratorio) as erro:
        Palpite([[0.0], [1.0], [2.0], [3.0]], [0.0, 1.0])
    assert erro.value.codigo == "pontos-desemparelhados"


def test_pontos_de_tamanhos_diferentes_sao_recusados():
    with pytest.raises(ErroLaboratorio) as erro:
        Palpite([[0.0], [1.0, 2.0], [2.0], [3.0]], [0, 1, 2, 3])
    assert erro.value.codigo == "dimensao-inconsistente"


def test_saida_nao_finita_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        Palpite([[0.0], [1.0], [2.0], [3.0]], [0.0, float("nan"), 2.0, 3.0])
    assert erro.value.codigo == "saida-nao-finita"


def test_PONTOS_REPETIDOS_sao_recusados_com_motivo():
    """Quatro medições do mesmo ponto não são quatro pontos, e este modelo não
    tem termo de ruído para representar réplica."""
    with pytest.raises(ErroLaboratorio) as erro:
        Palpite([[1.0], [1.0], [1.0], [1.0]], [1.0, 1.0, 1.0, 1.0])
    assert erro.value.codigo == "pontos-repetidos"
    assert erro.value.acao_sugerida


def test_repeticao_parcial_tambem_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        Palpite([[0.0], [1.0], [1.0], [2.0]], [0.0, 1.0, 1.0, 4.0])
    assert erro.value.codigo == "pontos-repetidos"


def test_ESCALA_NAO_DECIDE_a_escolha():
    """Sem normalizar, a variável em MPa dominaria a variável em fração."""
    entradas = [[0.0, 0.0], [1.0, 500.0], [0.0, 500.0], [1.0, 0.0], [0.5, 250.0]]
    saidas = [0.0, 2.0, 1.0, 1.0, 1.0]
    p = Palpite(entradas, saidas)
    # Um candidato distante em fração e outro distante em MPa devem ter dúvidas
    # da mesma ordem, porque as duas variáveis varrem a faixa inteira.
    a = p.prever([0.25, 250.0]).desvio
    b = p.prever([0.5, 125.0]).desvio
    assert 0.2 < a / b < 5


def test_EXPLORAR_manda_medir_onde_a_duvida_e_maior():
    p = Palpite([[0.0], [1.0], [4.0], [5.0]], [0.0, 1.0, 16.0, 25.0])
    escolha = sugerir(p, [[1.05], [2.5]], objetivo="explorar")
    assert escolha["proximo"] == [2.5]
    assert "dúvida" in escolha["motivo"]


def test_MELHORAR_persegue_o_valor_alto_sem_ignorar_a_duvida():
    p = palpite_simples()
    escolha = sugerir(p, [[0.5], [3.5]], objetivo="melhorar", maximizar=True)
    assert escolha["proximo"] == [3.5]


def test_minimizar_inverte_a_preferencia():
    p = palpite_simples()
    escolha = sugerir(p, [[0.5], [3.5]], objetivo="melhorar",
                      maximizar=False, peso_da_duvida=0.0)
    assert escolha["proximo"] == [0.5]


def test_A_SUGESTAO_DIZ_quais_candidatos_estao_FORA_da_faixa_medida():
    """Extrapolação silenciosa é o modo de falha desta ferramenta."""
    p = palpite_simples()
    escolha = sugerir(p, [[2.0], [99.0]], objetivo="explorar")
    assert escolha["candidatosForaDaFaixaMedida"] == [1]
    assert escolha["faixaMedida"] == [[0.0, 4.0]]


def test_a_escolha_e_DETERMINISTICA_inclusive_no_empate():
    p = palpite_simples()
    candidatos = [[1.5], [2.5], [1.5]]
    escolhas = {sugerir(p, candidatos, objetivo="explorar")["indice"] for _ in range(5)}
    assert len(escolhas) == 1


def test_sem_candidato_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        sugerir(palpite_simples(), [], objetivo="explorar")
    assert erro.value.codigo == "sem-candidatos"


def test_objetivo_inventado_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        sugerir(palpite_simples(), [[1.0]], objetivo="adivinhar")
    assert erro.value.codigo == "objetivo-invalido"


def test_a_sugestao_diz_POR_QUE_aquele_ponto_ganhou():
    """Sugestão sem motivo é oráculo, e oráculo não se audita."""
    escolha = sugerir(palpite_simples(), [[1.5], [2.5]], objetivo="explorar")
    assert escolha["motivo"] and "merito" in escolha and escolha["previsao"]
