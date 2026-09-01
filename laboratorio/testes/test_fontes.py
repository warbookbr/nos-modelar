"""Grafo de alegações: fonte não é verdade, e conflito é dado.

Cada recusa tem aqui um caso que a provoca. As duas mais caras — retratação que
alcança quem só cita, e apoio que parece múltiplo mas vem de uma fonte só — têm
teste próprio, porque são as que enganam sem levantar erro nenhum.
"""
import pytest

from laboratorio.erros import ErroLaboratorio
from laboratorio.fontes import Alegacao, Aplicacao, Fonte, Grafo


def fonte(identidade="f1", **kw):
    base = dict(identidade=identidade, titulo="t", natureza="primaria", licenca="cc-by")
    return Fonte(**{**base, **kw})


def alegacao(identidade="a1", fonte_="f1", **kw):
    base = dict(identidade=identidade, fonte=fonte_, enunciado="x aumenta y",
                localizacao="§3, tabela 2", condicoes=("aço, 20 °C",))
    return Alegacao(**{**base, **kw})


def grafo_com(*fontes):
    g = Grafo()
    for f in fontes:
        g.acrescentar_fonte(f)
    return g


def test_ALEGACAO_SEM_CONDICAO_e_recusada():
    """Sem condição declarada, o enunciado é lido como lei universal."""
    with pytest.raises(ErroLaboratorio) as erro:
        Alegacao(identidade="a", fonte="f", enunciado="e", localizacao="l", condicoes=())
    assert erro.value.codigo == "alegacao-sem-condicao"
    assert erro.value.acao_sugerida


def test_alegacao_sem_localizacao_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        Alegacao(identidade="a", fonte="f", enunciado="e", localizacao=" ",
                 condicoes=("c",))
    assert erro.value.codigo == "campo-vazio"


def test_fonte_sem_licenca_e_recusada():
    """'Não sei se posso guardar' não autoriza guardar."""
    with pytest.raises(ErroLaboratorio) as erro:
        fonte(licenca="")
    assert erro.value.codigo == "campo-vazio"


def test_natureza_invalida_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        fonte(natureza="boa")
    assert erro.value.codigo == "natureza-invalida"


def test_ALEGACAO_SEM_FONTE_NO_GRAFO_e_recusada():
    """Alegação sem fonte é boato com formato."""
    with pytest.raises(ErroLaboratorio) as erro:
        Grafo().acrescentar_alegacao(alegacao())
    assert erro.value.codigo == "alegacao-sem-fonte"


def test_mesma_identidade_com_outro_conteudo_e_recusada():
    g = grafo_com(fonte())
    with pytest.raises(ErroLaboratorio) as erro:
        g.acrescentar_fonte(fonte(titulo="outro"))
    assert erro.value.codigo == "fonte-conflitante"


def test_relacao_invalida_e_recusada():
    g = grafo_com(fonte())
    g.acrescentar_alegacao(alegacao("a1"))
    g.acrescentar_alegacao(alegacao("a2"))
    with pytest.raises(ErroLaboratorio) as erro:
        g.relacionar("a1", "refuta-definitivamente", "a2")
    assert erro.value.codigo == "relacao-invalida"


def test_CONFLITO_E_PRESERVADO_e_nao_resolvido():
    g = grafo_com(fonte("f1"), fonte("f2"))
    g.acrescentar_alegacao(alegacao("a1", "f1"))
    g.acrescentar_alegacao(alegacao("a2", "f2", enunciado="x diminui y"))
    g.relacionar("a1", "contradiz", "a2")
    assert g.conflitos() == [("a1", "a2")]
    # As duas continuam no grafo: nenhuma foi eleita perdedora.
    doc = g.documento()
    assert [a["identidade"] for a in doc["alegacoes"]] == ["a1", "a2"]


def test_RETRATACAO_ALCANCA_quem_apenas_cita():
    """Retratação não apaga: marca, e a marca viaja pela citação."""
    g = grafo_com(fonte("ruim", situacao="retratada"), fonte("boa"))
    g.acrescentar_alegacao(alegacao("apoiada-na-ruim", "ruim"))
    g.acrescentar_alegacao(alegacao("cita-a-anterior", "boa"))
    g.relacionar("cita-a-anterior", "cita", "apoiada-na-ruim")
    contaminadas = g.contaminadas()
    assert set(contaminadas) == {"apoiada-na-ruim", "cita-a-anterior"}
    assert contaminadas["cita-a-anterior"] == ["ruim", "apoiada-na-ruim"]
    # E nada foi removido do grafo.
    assert len(g.documento()["alegacoes"]) == 2


def test_correcao_marca_a_fonte_antiga_sem_apaga_la():
    g = grafo_com(fonte("velha"))
    g.acrescentar_fonte(fonte("nova", corrige=("velha",)))
    situacoes = {f["identidade"]: f["situacao"] for f in g.documento()["fontes"]}
    assert situacoes == {"velha": "corrigida", "nova": "vigente"}


def test_corrigir_fonte_ausente_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        Grafo().acrescentar_fonte(fonte("nova", corrige=("fantasma",)))
    assert erro.value.codigo == "corrige-fonte-ausente"


def test_APOIO_QUE_PARECE_MULTIPLO_vindo_de_UMA_fonte_so():
    """Três alegações do mesmo artigo não são três evidências."""
    g = grafo_com(fonte("f1"))
    for i in (1, 2, 3):
        g.acrescentar_alegacao(alegacao(f"a{i}", "f1"))
    assert g.independencia(("a1", "a2", "a3")) == {
        "alegacoes": 3, "fontesDistintas": 1,
        "fontesPrimarias": ["f1"], "apoioIndependente": 1,
    }


def test_revisao_secundaria_nao_conta_como_apoio_independente():
    g = grafo_com(fonte("primaria"), fonte("revisao", natureza="secundaria"))
    g.acrescentar_alegacao(alegacao("a1", "primaria"))
    g.acrescentar_alegacao(alegacao("a2", "revisao"))
    resumo = g.independencia(("a1", "a2"))
    assert resumo["fontesDistintas"] == 2
    assert resumo["apoioIndependente"] == 1


def test_APLICAR_SEM_RESSALVA_e_recusado():
    """Transportar resultado sem ressalva é usar fora do domínio dele."""
    g = grafo_com(fonte())
    g.acrescentar_alegacao(alegacao())
    with pytest.raises(ErroLaboratorio) as erro:
        g.aplicar(Aplicacao("a1", "h1", "sustenta", "mede a mesma grandeza", ()))
    assert erro.value.codigo == "aplicacao-sem-ressalva"
    assert erro.value.acao_sugerida


def test_aplicar_sem_justificativa_e_recusado():
    g = grafo_com(fonte())
    g.acrescentar_alegacao(alegacao())
    with pytest.raises(ErroLaboratorio) as erro:
        g.aplicar(Aplicacao("a1", "h1", "sustenta", "  ", ("outro material",)))
    assert erro.value.codigo == "campo-vazio"


def test_aplicacao_bem_formada_passa():
    g = grafo_com(fonte())
    g.acrescentar_alegacao(alegacao())
    g.aplicar(Aplicacao("a1", "h1", "sustenta", "mesma grandeza, mesmo método",
                        ("a fonte mediu aço; o estudo mede alumínio",)))


def test_alegacao_NAO_TEM_campo_de_verdade_nem_de_confianca():
    """Citação sustenta que alguém publicou; não que está certo."""
    campos = set(alegacao().documento())
    assert not campos & {"verdadeira", "confianca", "peso", "score"}


def test_o_grafo_nao_busca_nada_na_rede():
    """Este módulo guarda e relaciona; conector é outra autoridade."""
    import ast

    import laboratorio.fontes as modulo

    arvore = ast.parse(open(modulo.__file__, encoding="utf-8").read())
    citados = set()
    for no in ast.walk(arvore):
        if isinstance(no, ast.Import):
            citados.update(a.name.split(".")[0] for a in no.names)
        elif isinstance(no, ast.ImportFrom):
            citados.add((no.module or "").split(".")[0])
    assert not citados & {"urllib", "http", "requests", "socket", "httpx"}, citados
