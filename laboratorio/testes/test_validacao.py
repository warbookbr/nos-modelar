"""Composição de pareceres: aprovado é o caso mais difícil de conseguir."""
import pytest

from laboratorio.erros import ErroLaboratorio
from laboratorio.unidades import COMPRIMENTO, Grandeza
from laboratorio.validacao import Parecer, compor


def p(nome, parecer, **kw):
    return Parecer(validador=nome, parecer=parecer,
                   justificativa=kw.pop("justificativa", "porque sim, com motivo"), **kw)


def test_todos_aprovados_da_aprovado():
    assert compor((p("a", "aprovado"), p("b", "aprovado")))["veredito"] == "aprovado"


def test_UM_REPROVADO_manda_no_veredito():
    doc = compor((p("a", "aprovado"), p("b", "reprovado", detalhes={"delta": 3})))
    assert doc["veredito"] == "reprovado"


def test_INCONCLUSIVO_NAO_VIRA_APROVADO():
    """Validador que não conseguiu decidir não é validador satisfeito."""
    doc = compor((p("a", "aprovado"), p("b", "inconclusivo")))
    assert doc["veredito"] == "inconclusivo"


def test_reprovado_tem_precedencia_sobre_inconclusivo():
    doc = compor((p("a", "inconclusivo"), p("b", "reprovado", detalhes={"x": 1})))
    assert doc["veredito"] == "reprovado"


def test_SO_NAO_APLICAVEL_nao_e_aprovacao():
    """Nada foi de fato verificado."""
    doc = compor((p("a", "nao-aplicavel"), p("b", "nao-aplicavel")))
    assert doc["veredito"] == "inconclusivo"


def test_NENHUM_VALIDADOR_e_recusado():
    """A afirmação mais forte possível com a menor evidência possível."""
    with pytest.raises(ErroLaboratorio) as erro:
        compor(())
    assert erro.value.codigo == "sem-parecer"


def test_VALIDADOR_EXIGIDO_AUSENTE_impede_aprovacao():
    doc = compor((p("a", "aprovado"),), exigidos=("a", "convergencia"))
    assert doc["veredito"] == "inconclusivo"
    assert doc["exigidosAusentes"] == ["convergencia"]


def test_exigido_marcado_NAO_APLICAVEL_tambem_impede():
    """Pular validador difícil chamando-o de não aplicável não passa."""
    doc = compor((p("a", "aprovado"), p("convergencia", "nao-aplicavel")),
                 exigidos=("convergencia",))
    assert doc["veredito"] == "inconclusivo"
    assert doc["exigidosNaoAplicaveis"] == ["convergencia"]


def test_parecer_sem_justificativa_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        Parecer("a", "nao-aplicavel", "  ")
    assert erro.value.codigo == "parecer-sem-justificativa"


def test_reprovacao_sem_evidencia_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        p("a", "reprovado")
    assert erro.value.codigo == "reprovacao-sem-evidencia"


def test_LIMITE_EM_OUTRA_UNIDADE_e_recusado():
    """O erro de unidade entrando pela porta do validador."""
    with pytest.raises(ErroLaboratorio) as erro:
        p("a", "aprovado",
          medida=Grandeza(1, "mm", COMPRIMENTO),
          limite=Grandeza(1, "m", COMPRIMENTO))
    assert erro.value.codigo == "limite-incomparavel"


def test_validador_repetido_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        compor((p("a", "aprovado"), p("a", "reprovado", detalhes={"x": 1})))
    assert erro.value.codigo == "validador-repetido"


def test_o_veredito_diz_de_que_e_feito():
    """'Aprovado' sem a lista de quem rodou é gate nunca visto vermelho."""
    doc = compor((p("a", "aprovado"), p("b", "nao-aplicavel")))
    assert doc["porParecer"]["aprovado"] == ["a"]
    assert doc["porParecer"]["nao-aplicavel"] == ["b"]
    assert len(doc["pareceres"]) == 2


def test_nao_existe_escalar_de_confianca_no_veredito():
    doc = compor((p("a", "aprovado"),))
    assert not set(doc) & {"confianca", "score", "probabilidade", "peso"}
