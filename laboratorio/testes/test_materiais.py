"""Material: composição que não fecha e propriedade sem condição são recusadas."""
import pytest

from laboratorio.erros import ErroLaboratorio
from laboratorio.materiais import Composicao, Material, Propriedade
from laboratorio.unidades import Grandeza, dimensao

PRESSAO = dimensao(massa=1, comprimento=-1, tempo=-2)


def mpa(v):
    return Grandeza(v, "MPa", PRESSAO)


def prop(**kw):
    base = dict(nome="limite de escoamento", valor=mpa(250),
                condicao="20 °C, recozido", origem="medida")
    return Propriedade(**{**base, **kw})


def test_composicao_que_fecha_passa():
    c = Composicao({"Fe": 0.98, "C": 0.02})
    assert c.principal == "Fe"


def test_FRACOES_QUE_NAO_SOMAM_UM_e_recusada():
    """Dado corrompido de onde sai valor plausível."""
    with pytest.raises(ErroLaboratorio) as erro:
        Composicao({"Fe": 0.97, "C": 0.02})
    assert erro.value.codigo == "fracoes-nao-somam-um"


def test_fracao_em_PORCENTAGEM_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        Composicao({"Fe": 98, "C": 2})
    assert erro.value.codigo == "fracao-fora-de-faixa"
    assert "100" in erro.value.mensagem


def test_fracao_zero_ou_negativa_e_recusada():
    for ruim in ({"Fe": 1.0, "C": 0.0}, {"Fe": 1.2, "C": -0.2}):
        with pytest.raises(ErroLaboratorio):
            Composicao(ruim)


def test_composicao_vazia_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        Composicao({})
    assert erro.value.codigo == "composicao-vazia"


def test_BASE_INVENTADA_e_recusada():
    """1% de carbono em massa é ~4,5% atômico: trocar base muda tudo."""
    with pytest.raises(ErroLaboratorio) as erro:
        Composicao({"Fe": 1.0}, base="volume")
    assert erro.value.codigo == "base-invalida"


def test_empate_de_fracao_e_resolvido_pelo_nome_e_nao_por_sorte():
    assert Composicao({"Cu": 0.5, "Zn": 0.5}).principal == "Cu"


def test_PROPRIEDADE_SEM_CONDICAO_e_recusada():
    """O mesmo aço a 20 °C e a 600 °C dá números diferentes."""
    with pytest.raises(ErroLaboratorio) as erro:
        prop(condicao="  ")
    assert erro.value.codigo == "propriedade-sem-condicao"
    assert erro.value.acao_sugerida


def test_publicada_sem_fonte_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        prop(origem="publicada")
    assert erro.value.codigo == "publicada-sem-fonte"


def test_origem_inventada_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        prop(origem="obvia")
    assert erro.value.codigo == "origem-invalida"


def test_INCERTEZA_EM_OUTRA_UNIDADE_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        prop(incerteza=Grandeza(5, "GPa", PRESSAO))
    assert erro.value.codigo == "incerteza-em-outra-unidade"


def test_MESMA_PROPRIEDADE_NA_MESMA_CONDICAO_DUAS_VEZES_e_recusada():
    """Conflito se resolve no grafo de alegações, não escolhendo uma em silêncio."""
    with pytest.raises(ErroLaboratorio) as erro:
        Material("aço", Composicao({"Fe": 1.0}), (prop(), prop(valor=mpa(300))))
    assert erro.value.codigo == "propriedade-repetida"
    assert erro.value.acao_sugerida


def test_mesma_propriedade_em_CONDICOES_DIFERENTES_e_normal():
    m = Material("aço", Composicao({"Fe": 1.0}),
                 (prop(), prop(valor=mpa(120), condicao="600 °C, recozido")))
    assert m.propriedade("limite de escoamento", "600 °C, recozido").valor.valor == 120


def test_BUSCAR_PROPRIEDADE_EXIGE_A_CONDICAO():
    """Pegar 'a' propriedade sem dizer a condição é o atalho do número errado."""
    m = Material("aço", Composicao({"Fe": 1.0}), (prop(),))
    with pytest.raises(ErroLaboratorio) as erro:
        m.propriedade("limite de escoamento", "600 °C, recozido")
    assert erro.value.codigo == "propriedade-ausente"
    assert "20 °C, recozido" in erro.value.mensagem


def test_o_modulo_NAO_CALCULA_nada():
    """Cálculo é instrumento, e instrumento declara domínio."""
    import laboratorio.materiais as modulo

    assert not [n for n in dir(modulo)
                if n.startswith(("calcular", "prever", "misturar", "estimar"))]


def test_materiais_iguais_tem_a_mesma_identidade():
    a = Material("aço", Composicao({"Fe": 0.98, "C": 0.02}), (prop(),))
    b = Material("aço", Composicao({"C": 0.02, "Fe": 0.98}), (prop(),))
    assert a.id == b.id
