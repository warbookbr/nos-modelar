"""Planejador: cada prova do grafo vista falhando, não só passando.

Gate que nunca foi visto vermelho é decoração. Cada regra que `ordenar` promete
tem aqui um plano que a viola, e a asserção é sobre o código do erro — não sobre
"levantou alguma coisa".
"""
import pytest

from laboratorio.erros import ErroLaboratorio
from laboratorio.instrumentos import Manifesto, Registro
from laboratorio.plano import Passo, Plano, ordenar


def registro(capacidades=("medir", "resumir")):
    r = Registro()
    r.registrar(Manifesto(
        identidade="i", versao="1.0.0", capacidades=capacidades,
        nao_cobre=("qualquer coisa fora do teste",),
    ))
    return r


def passo(nome, *, operacao="medir", consome=(), produz=(), versao="1.0.0"):
    return Passo(nome=nome, instrumento="i", versao_instrumento=versao,
                 operacao=operacao, consome=consome, produz=produz)


def test_ordem_respeita_a_dependencia():
    plano = Plano((
        passo("resumo", operacao="resumir", consome=("bruto",)),
        passo("medida", produz=("bruto",)),
    ))
    assert [p.nome for p in ordenar(plano, registro())] == ["medida", "resumo"]


def test_plano_sem_dependencia_sai_em_ordem_estavel():
    """Sem aresta, a ordem é alfabética — determinística, não a de declaração."""
    plano = Plano((passo("z"), passo("a")))
    assert [p.nome for p in ordenar(plano, registro())] == ["a", "z"]


def test_CICLO_e_detectado_e_os_passos_presos_sao_nomeados():
    plano = Plano((
        passo("a", consome=("de-b",), produz=("de-a",)),
        passo("b", operacao="resumir", consome=("de-a",), produz=("de-b",)),
    ))
    with pytest.raises(ErroLaboratorio) as erro:
        ordenar(plano, registro())
    assert erro.value.codigo == "ciclo-no-plano"
    assert "'a'" in erro.value.mensagem and "'b'" in erro.value.mensagem


def test_ciclo_de_um_passo_so_tambem_e_detectado():
    plano = Plano((passo("a", consome=("x",), produz=("x",)),))
    with pytest.raises(ErroLaboratorio) as erro:
        ordenar(plano, registro())
    assert erro.value.codigo == "ciclo-no-plano"


def test_ENTRADA_SEM_PRODUTOR_e_recusada():
    """O erro que mais parece funcionar: recebe vazio e devolve número plausível."""
    plano = Plano((passo("a", consome=("ninguem-produz",)),))
    with pytest.raises(ErroLaboratorio) as erro:
        ordenar(plano, registro())
    assert erro.value.codigo == "entrada-sem-produtor"


def test_PRODUTOR_DUPLICADO_e_recusado():
    plano = Plano((passo("a", produz=("x",)), passo("b", produz=("x",))))
    with pytest.raises(ErroLaboratorio) as erro:
        ordenar(plano, registro())
    assert erro.value.codigo == "produtor-duplicado"
    assert "'a'" in erro.value.mensagem and "'b'" in erro.value.mensagem


def test_CAPACIDADE_AUSENTE_e_recusada_antes_de_executar():
    plano = Plano((passo("a", operacao="voar"),))
    with pytest.raises(ErroLaboratorio) as erro:
        ordenar(plano, registro())
    assert erro.value.codigo == "capacidade-ausente"


def test_instrumento_nao_registrado_e_recusado_pelo_planejador():
    plano = Plano((Passo("a", "outro", "1.0.0", "medir"),))
    with pytest.raises(ErroLaboratorio) as erro:
        ordenar(plano, registro())
    assert erro.value.codigo == "instrumento-nao-registrado"


def test_VERSAO_FLUTUANTE_e_recusada():
    plano = Plano((passo("a", versao=""),))
    with pytest.raises(ErroLaboratorio) as erro:
        ordenar(plano, registro())
    assert erro.value.codigo == "versao-flutuante"


def test_NOME_DE_PASSO_REPETIDO_e_recusado():
    plano = Plano((passo("a"), passo("a")))
    with pytest.raises(ErroLaboratorio) as erro:
        ordenar(plano, registro())
    assert erro.value.codigo == "passo-duplicado"


def test_PLANO_VAZIO_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        ordenar(Plano(()), registro())
    assert erro.value.codigo == "plano-vazio"


def test_id_do_plano_nao_depende_da_ordem_de_execucao():
    """Reordenar a declaração muda o plano; o id existe para notar isso."""
    a, b = passo("a", produz=("x",)), passo("b", operacao="resumir", consome=("x",))
    assert Plano((a, b)).id != Plano((b, a)).id
    assert Plano((a, b)).id == Plano((a, b)).id


def test_planejador_nao_importa_o_executor():
    """Planejar não é executar: se este módulo pudesse rodar, a regra era enfeite."""
    import ast

    import laboratorio.plano as modulo

    arvore = ast.parse(open(modulo.__file__, encoding="utf-8").read())
    citados = set()
    for no in ast.walk(arvore):
        if isinstance(no, ast.Import):
            citados.update(a.name for a in no.names)
        elif isinstance(no, ast.ImportFrom):
            citados.add(no.module or "")
    assert not any("executor" in nome for nome in citados), citados
