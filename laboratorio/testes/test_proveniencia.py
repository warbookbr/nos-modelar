"""Proveniência recusa chamar de reproduzível o que não é."""
from laboratorio.proveniencia import Proveniencia


def prov(**kw):
    base = dict(agente="i", versao_agente="1", entradas={"r": "sha256:a"},
                commit="a" * 40, arvore_suja=False)
    return Proveniencia(**{**base, **kw})


def test_commit_limpo_com_entradas_e_reproduzivel():
    ok, _ = prov().confiavel_para_reproduzir()
    assert ok


def test_arvore_suja_NAO_e_reproduzivel():
    """O commit registrado seria meia-verdade: o código medido não está publicado."""
    ok, motivo = prov(arvore_suja=True).confiavel_para_reproduzir()
    assert not ok and "suja" in motivo


def test_sem_commit_NAO_e_reproduzivel():
    ok, motivo = prov(commit=None).confiavel_para_reproduzir()
    assert not ok and "commit" in motivo


def test_sem_entrada_identificada_NAO_e_reproduzivel():
    ok, motivo = prov(entradas={}).confiavel_para_reproduzir()
    assert not ok and "hash" in motivo
