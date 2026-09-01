"""Bibliografia: fontes reais com DOI, e ZERO alegações — porque nada foi lido."""
from laboratorio.estudos.bibliografia_cabo import BUSCAS, carregar, montar_grafo, resumo


def test_as_consultas_estao_em_disco_e_nao_dependem_da_rede():
    """O cache é o que faz a pesquisa reproduzir daqui a um ano."""
    consultas = carregar()
    assert len(consultas) == len(BUSCAS)
    for c in consultas:
        assert c["consulta"] in BUSCAS
        assert c["consultadoEm"] and c["itens"]


def test_o_grafo_tem_FONTES_e_NENHUMA_alegacao():
    """Título não sustenta valor medido; alegação exige ler o artigo."""
    doc = montar_grafo().documento()
    assert len(doc["fontes"]) > 30
    assert doc["alegacoes"] == []


def test_toda_fonte_tem_DOI_e_ano():
    """Referência que não se abre nem se data não serve para mostrar a ninguém."""
    for fonte in montar_grafo().documento()["fontes"]:
        assert fonte["identidade"].startswith("10.")
        assert fonte["versao"] and fonte["versao"] != "None"


def test_toda_busca_tem_PERGUNTA_declarada():
    """Consulta sem pergunta por trás é pescaria."""
    assert all(motivo.strip().endswith("?") for motivo in BUSCAS.values())


def test_o_resumo_diz_que_os_artigos_NAO_foram_lidos():
    r = resumo()
    assert r["alegacoes"] == 0
    assert "NÃO foram lidos" in r["naoSustenta"]
    assert r["porQueZeroAlegacoes"]


def test_material_suplementar_foi_descartado():
    """O Crossref indexa suplemento com DOI próprio, e ele sobe na relevância."""
    for consulta in carregar():
        for item in consulta["itens"]:
            assert not item["doi"].endswith((".s001", ".s002", ".s003"))
