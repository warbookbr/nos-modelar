"""A tabela de materiais só vale se ela RECUSAR dado incompleto. É o que se testa."""

import pytest

from laboratorio import tabela
from laboratorio.erros import ErroLaboratorio
from laboratorio.materiais import Propriedade
from laboratorio.unidades import Grandeza


def test_a_tabela_carrega_e_nao_esta_vazia():
    assert len(tabela.carregar()) >= 10


def test_TODA_propriedade_declara_condicao_e_origem():
    """É a razão de a tabela existir: número solto é o que produz o erro caro."""
    for m in tabela.carregar().values():
        for p in m.propriedades:
            assert p.condicao.strip()
            assert p.origem in {"medida", "calculada", "estimada", "publicada"}


def test_TODA_propriedade_publicada_cita_fonte():
    for m in tabela.carregar().values():
        for p in m.propriedades:
            if p.origem == "publicada":
                assert (p.fonte or "").strip(), f"{m.identidade}.{p.nome}"


def test_o_eucalipto_traz_o_valor_da_fonte_primaria_e_nao_o_da_madeira_verde():
    """111,7 MPa a 12% de umidade, e NÃO os 75 MPa de madeira verde que eu usei
    por engano e que subestimavam o concorrente em cerca de 50%."""
    p = tabela.valor("eucalipto-jarrah", "resistenciaAFlexao",
                     "modulo de ruptura, 12% de umidade, 20 C")
    assert abs(p.valor.valor - 111.7e6) < 1.0
    assert "FPL-GTR-190" in p.fonte


def test_pedir_propriedade_sem_a_condicao_certa_FALHA():
    """Pegar 'a' propriedade sem dizer em que condição é o atalho que erra."""
    with pytest.raises(ErroLaboratorio):
        tabela.valor("eucalipto-jarrah", "resistenciaAFlexao", "qualquer uma")


def test_material_inexistente_lista_os_que_existem():
    with pytest.raises(ErroLaboratorio) as e:
        tabela.material("madeira-magica")
    assert "eucalipto-jarrah" in str(e.value)


def test_composicao_elementar_e_conferida_contra_a_tabela_periodica():
    """Aço se descreve por elemento, e cada símbolo tem de existir de verdade."""
    aco = tabela.material("aco-1020")
    assert aco.notas["baseDaComposicao"] == "elementar"
    assert aco.composicao.principal == "Fe"


def test_composicao_por_constituinte_NAO_e_conferida_contra_a_tabela_periodica():
    """Celulose e lignina não são elementos. Conferi-las ali faria a validação
    parecer que aconteceu quando não aconteceu."""
    bambu = tabela.material("bambu-colmo")
    assert bambu.notas["baseDaComposicao"] == "constituinte"
    assert "celulose" in bambu.composicao.fracoes


def test_a_cobertura_diz_quanto_da_tabela_ainda_e_MEMORIA():
    """O placar honesto. Ele deve subir com o tempo; se a tabela crescer e ele
    cair, a tabela está piorando."""
    c = tabela.cobertura()
    assert c["propriedades"] == sum(c["porOrigem"].values())
    assert c["porOrigem"]["estimada"] > 0, "a tabela está escondendo o que é memória"
    assert len(c["aConferir"]) == c["propriedades"] - c["porOrigem"].get("publicada", 0)


def test_duas_fontes_para_a_MESMA_propriedade_na_MESMA_condicao_sao_CONFLITO():
    """Conflito se resolve com as duas fontes à vista, não escolhendo uma em silêncio."""
    m = tabela.material("eucalipto-jarrah")
    p = m.propriedades[0]
    repetida = Propriedade(nome=p.nome, valor=Grandeza(1.0, p.valor.unidade, p.valor.dimensao),
                           condicao=p.condicao, origem="estimada")
    with pytest.raises(ErroLaboratorio):
        type(m)(identidade=m.identidade, composicao=m.composicao,
                propriedades=m.propriedades + (repetida,))


def test_dimensao_desconhecida_NAO_vira_adimensional_em_silencio():
    with pytest.raises(ErroLaboratorio):
        tabela._grandeza({"nome": "x", "valor": 1.0, "unidade": "Pa", "dimensao": "gosma"})
