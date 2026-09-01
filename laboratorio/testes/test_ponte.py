"""A ponte: peça entra como entrada, e não sai alterada."""
import pytest

from laboratorio.erros import ErroLaboratorio
from laboratorio.ponte import RecomendacaoDeAutoria, abrir, fixar


@pytest.fixture
def receita(tmp_path):
    alvo = tmp_path / "machado.js"
    alvo.write_text("export const PARAMS = { lados: 14 };\n", encoding="utf-8")
    return alvo


def test_fixar_e_abrir_devolve_o_conteudo(receita):
    peca = fixar("machado@3", receita, unidade_de_comprimento="mm")
    assert "lados: 14" in abrir(peca)


def test_PECA_QUE_MUDOU_e_RECUSADA_e_nao_apenas_avisada(receita):
    """Medir a peça nova achando que é a velha compara duas coisas com um nome só."""
    peca = fixar("machado@3", receita, unidade_de_comprimento="mm")
    receita.write_text("export const PARAMS = { lados: 18 };\n", encoding="utf-8")
    with pytest.raises(ErroLaboratorio) as erro:
        abrir(peca)
    assert erro.value.codigo == "peca-derivou"
    assert erro.value.acao_sugerida


def test_peca_que_sumiu_e_recusada(receita):
    peca = fixar("machado@3", receita, unidade_de_comprimento="mm")
    receita.unlink()
    with pytest.raises(ErroLaboratorio) as erro:
        abrir(peca)
    assert erro.value.codigo == "peca-sumiu"


def test_fixar_arquivo_inexistente_e_recusado(tmp_path):
    with pytest.raises(ErroLaboratorio) as erro:
        fixar("x", tmp_path / "nao-existe.js", unidade_de_comprimento="mm")
    assert erro.value.codigo == "peca-inexistente"


def test_PECA_SEM_CONVENCOES_e_recusada(receita):
    """Escala e eixo errados produzem número plausível."""
    with pytest.raises(ErroLaboratorio) as erro:
        fixar("machado@3", receita)
    assert erro.value.codigo == "peca-sem-convencoes"


def test_reescrever_o_MESMO_conteudo_nao_conta_como_deriva(receita):
    """A fixação é por conteúdo, não por data: mtime muda, o hash não."""
    peca = fixar("machado@3", receita, unidade_de_comprimento="mm")
    receita.write_text(receita.read_text(encoding="utf-8"), encoding="utf-8")
    assert abrir(peca)


def test_A_PONTE_NAO_TEM_COMO_ESCREVER_na_mecanifica():
    """Capacidade que não existe não precisa de disciplina para não ser usada."""
    import laboratorio.ponte as modulo

    fonte = open(modulo.__file__, encoding="utf-8").read()
    corpo = fonte.split('"""', 2)[2]  # fora do docstring do módulo
    for proibido in ("write_text(", "open(", "mkdir(", "unlink(", "rename("):
        assert proibido not in corpo, proibido


def test_a_ponte_nao_importa_a_mecanifica():
    import ast

    import laboratorio.ponte as modulo

    arvore = ast.parse(open(modulo.__file__, encoding="utf-8").read())
    citados = set()
    for no in ast.walk(arvore):
        if isinstance(no, ast.Import):
            citados.update(a.name for a in no.names)
        elif isinstance(no, ast.ImportFrom):
            citados.add(no.module or "")
    assert not any(n.startswith(("prototipos", "src", "modulos")) for n in citados), citados


def recomendacao(**kw):
    base = dict(peca="machado@3", parametros={"lados": 14},
                justificativa="14 mantém o olho furável",
                dominio="expoenteSecao >= 10, olho centrado",
                evidencias_a_favor=("e1",), limites=("não vale para olho oblongo",))
    return RecomendacaoDeAutoria(**{**base, **kw})


def test_RECOMENDACAO_NAO_TEM_COMO_SE_APLICAR():
    """Aplicar é ato humano, fora da execução do laboratório."""
    r = recomendacao()
    assert not [m for m in dir(r) if m.startswith(("aplicar", "gravar", "salvar", "escrever"))]
    assert r.documento()["aplicacao"] == "manual, fora da execução do laboratório"


def test_recomendacao_sem_limite_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        recomendacao(limites=())
    assert erro.value.codigo == "recomendacao-sem-limite"
    assert erro.value.acao_sugerida


def test_recomendacao_sem_evidencia_e_recusada():
    """Palpite com formato de resultado."""
    with pytest.raises(ErroLaboratorio) as erro:
        recomendacao(evidencias_a_favor=())
    assert erro.value.codigo == "recomendacao-sem-evidencia"


def test_recomendacao_sem_dominio_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        recomendacao(dominio=" ")
    assert erro.value.codigo == "campo-vazio"


def test_recomendacao_que_nao_muda_nada_e_recusada():
    with pytest.raises(ErroLaboratorio) as erro:
        recomendacao(parametros={})
    assert erro.value.codigo == "recomendacao-sem-parametro"


def test_o_documento_carrega_as_evidencias_CONTRARIAS():
    """Síntese que só lista o que a favorece é advocacia, não resultado."""
    doc = recomendacao(evidencias_contrarias=("e9",)).documento()
    assert doc["evidenciasContrarias"] == ["e9"]
