"""Trocas: a fronteira sai dos dados; o vencedor exige peso declarado."""
import pytest

from laboratorio.erros import ErroLaboratorio
from laboratorio.trocas import (Candidata, Criterio, fronteira,
                                ordenar_com_pesos)
from laboratorio.unidades import Grandeza, dimensao

PRESSAO = dimensao(massa=1, comprimento=-1, tempo=-2)
DINHEIRO = dimensao()

RESISTENCIA = Criterio("resistencia", "maximizar")
CUSTO = Criterio("custo", "minimizar")
CRITERIOS = (RESISTENCIA, CUSTO)


def liga(nome, resistencia, custo):
    return Candidata(nome, {"resistencia": Grandeza(resistencia, "MPa", PRESSAO),
                            "custo": Grandeza(custo, "BRL/kg", DINHEIRO)})


def test_a_DOMINADA_sai_da_fronteira():
    """Pior em tudo não é escolha, é ruído."""
    doc = fronteira((liga("A", 500, 10), liga("B", 400, 20)), CRITERIOS)
    assert doc["fronteira"] == ["A"]
    assert doc["dominadas"]["B"] == ["A"]


def test_quem_ganha_em_uma_coisa_FICA_na_fronteira():
    doc = fronteira((liga("forte", 800, 90), liga("barata", 400, 5)), CRITERIOS)
    assert doc["fronteira"] == ["barata", "forte"]


def test_A_FRONTEIRA_NAO_ELEGE_VENCEDOR():
    """Eleger exige dizer quanto vale cada critério, e isso é de quem decide."""
    doc = fronteira((liga("forte", 800, 90), liga("barata", 400, 5)), CRITERIOS)
    assert doc["vencedor"] is None
    assert doc["porQueSemVencedor"]


def test_a_fronteira_diz_O_QUE_SE_PERDE_em_cada_escolha():
    doc = fronteira((liga("forte", 800, 90), liga("barata", 400, 5)), CRITERIOS)
    perdas = {p["criterio"] for p in doc["trocas"]["forte"]}
    assert perdas == {"custo"}
    assert doc["trocas"]["forte"][0]["diferenca"] == 85


def test_empate_exato_mantem_as_duas():
    doc = fronteira((liga("A", 500, 10), liga("B", 500, 10)), CRITERIOS)
    assert doc["fronteira"] == ["A", "B"]


def test_CANDIDATA_SEM_UM_CRITERIO_e_recusada():
    """Ausência de dado não é valor neutro."""
    incompleta = Candidata("X", {"resistencia": Grandeza(500, "MPa", PRESSAO)})
    with pytest.raises(ErroLaboratorio) as erro:
        fronteira((liga("A", 500, 10), incompleta), CRITERIOS)
    assert erro.value.codigo == "avaliacao-faltando"
    assert erro.value.acao_sugerida


def test_MESMO_CRITERIO_EM_UNIDADES_DIFERENTES_e_recusado():
    """O erro de unidade decidindo compra de material."""
    outra = Candidata("B", {"resistencia": Grandeza(0.5, "GPa", PRESSAO),
                            "custo": Grandeza(10, "BRL/kg", DINHEIRO)})
    with pytest.raises(ErroLaboratorio) as erro:
        fronteira((liga("A", 500, 10), outra), CRITERIOS)
    assert erro.value.codigo == "criterio-em-unidades-diferentes"


def test_SENTIDO_NAO_DECLARADO_e_recusado():
    """Custo menor é melhor, resistência maior é melhor: adivinhar pelo nome é adivinhar."""
    with pytest.raises(ErroLaboratorio) as erro:
        Criterio("custo", "melhor")
    assert erro.value.codigo == "sentido-invalido"


def test_sem_criterio_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        fronteira((liga("A", 1, 1),), ())
    assert erro.value.codigo == "sem-criterios"


def test_sem_candidata_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        fronteira((), CRITERIOS)
    assert erro.value.codigo == "sem-candidatas"


def test_criterio_repetido_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        fronteira((liga("A", 1, 1),), (CUSTO, CUSTO))
    assert erro.value.codigo == "criterio-repetido"


def test_ranking_SEM_JUSTIFICATIVA_DOS_PESOS_e_recusado():
    """Peso sem justificativa é preferência disfarçada de resultado."""
    with pytest.raises(ErroLaboratorio) as erro:
        ordenar_com_pesos((liga("A", 500, 10), liga("B", 400, 5)), CRITERIOS,
                          {"resistencia": 1, "custo": 1}, justificativa=" ")
    assert erro.value.codigo == "pesos-sem-justificativa"


def test_CRITERIO_SEM_PESO_e_recusado():
    """Critério sem peso seria descartado em silêncio."""
    with pytest.raises(ErroLaboratorio) as erro:
        ordenar_com_pesos((liga("A", 500, 10),), CRITERIOS,
                          {"resistencia": 1}, justificativa="só importa resistência")
    assert erro.value.codigo == "peso-faltando"


def test_peso_para_criterio_inexistente_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        ordenar_com_pesos((liga("A", 500, 10),), CRITERIOS,
                          {"resistencia": 1, "custo": 1, "cor": 1}, justificativa="x")
    assert erro.value.codigo == "peso-sem-criterio"


def test_peso_negativo_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        ordenar_com_pesos((liga("A", 500, 10),), CRITERIOS,
                          {"resistencia": 1, "custo": -1}, justificativa="x")
    assert erro.value.codigo == "peso-negativo"


def test_O_PESO_MUDA_O_VENCEDOR_e_a_saida_diz_isso():
    candidatas = (liga("forte", 800, 90), liga("barata", 400, 5))
    caro = ordenar_com_pesos(candidatas, CRITERIOS, {"resistencia": 1, "custo": 0},
                             justificativa="protótipo, custo não importa")
    apertado = ordenar_com_pesos(candidatas, CRITERIOS, {"resistencia": 0, "custo": 1},
                                 justificativa="produção em massa")
    assert caro["primeiraColocada"] == "forte"
    assert apertado["primeiraColocada"] == "barata"
    assert caro["quemDecidiu"] == "os pesos declarados, não o experimento"


def test_ESCALA_NAO_DECIDE_o_ranking():
    """Sem normalizar, MPa esmagaria custo só por ser numericamente maior."""
    candidatas = (liga("forte", 800, 90), liga("barata", 400, 5))
    doc = ordenar_com_pesos(candidatas, CRITERIOS, {"resistencia": 1, "custo": 1},
                            justificativa="os dois importam igual")
    assert doc["empateNoTopo"] == ["barata", "forte"]


def test_empate_no_topo_fica_VISIVEL():
    doc = ordenar_com_pesos((liga("A", 500, 10), liga("B", 500, 10)), CRITERIOS,
                            {"resistencia": 1, "custo": 1}, justificativa="iguais")
    assert doc["empateNoTopo"] == ["A", "B"]
