"""A tabela periódica serve para RECUSAR composição inventada, e é isso que se testa."""

import pytest

from laboratorio import periodica
from laboratorio.erros import ErroLaboratorio


def test_a_tabela_tem_os_118_elementos():
    assert len(periodica.tabela()) == 118


def test_o_simbolo_e_sensivel_a_maiuscula():
    """'FE' não é ferro. Aceitar seria deixar passar erro de digitação como liga."""
    assert periodica.elemento("Fe").nome == "ferro"
    for errado in ("FE", "fe", "fE"):
        with pytest.raises(ErroLaboratorio):
            periodica.elemento(errado)


def test_simbolo_inventado_e_recusado():
    with pytest.raises(ErroLaboratorio) as e:
        periodica.conferir_simbolos({"Fee": 0.98, "C": 0.02})
    assert "Fee" in str(e.value)


def test_o_numero_atomico_e_unico_e_vai_de_1_a_118():
    zs = sorted(e.z for e in periodica.tabela().values())
    assert zs == list(range(1, 119))


def test_a_conversao_de_base_reproduz_o_caso_citado_na_documentacao():
    """`materiais.py` afirma que 1% de C em massa no ferro é ~4,5% atômico.

    O teste existe porque a afirmação está escrita na documentação, e documentação
    que ninguém confere envelhece sem avisar.
    """
    atomica = periodica.massa_para_atomica({"Fe": 0.99, "C": 0.01})
    assert 0.044 < atomica["C"] < 0.046
    assert abs(sum(atomica.values()) - 1.0) < 1e-12


def test_converter_base_de_elemento_sem_isotopo_estavel_e_RECUSADO():
    """A massa tabelada do Tc é de um isótopo, não é massa atômica padrão.

    Usá-la numa conversão devolve um número que PARECE fração atômica. O módulo
    recusa em vez de devolver o número plausível.
    """
    with pytest.raises(ErroLaboratorio) as e:
        periodica.massa_para_atomica({"Fe": 0.9, "Tc": 0.1})
    assert "Tc" in str(e.value)


def test_elemento_sem_isotopo_estavel_vem_marcado():
    assert periodica.elemento("U").massa_e_de_isotopo is True
    assert periodica.elemento("Fe").massa_e_de_isotopo is False


def test_a_tabela_NAO_carrega_propriedade_fisica():
    """Densidade de elemento depende de fase e alotropia, e cair aqui sem condição
    repetiria o erro que `materiais.py` existe para impedir."""
    campos = periodica.elemento("Fe").documento()
    for proibido in ("densidade", "pontoDeFusao", "dureza", "eletronegatividade"):
        assert proibido not in campos
