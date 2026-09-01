"""Registro de instrumento: importar não concede capacidade, e limite é obrigatório."""
import pytest

from laboratorio.erros import ErroLaboratorio
from laboratorio.instrumentos import Manifesto, Registro


def manifesto(**kw):
    base = dict(identidade="i", versao="1.0.0", capacidades=("medir",),
                nao_cobre=("outra coisa",))
    return Manifesto(**{**base, **kw})


def test_manifesto_sem_limite_e_RECUSADO():
    """Não declarar limite é afirmar que cobre tudo, e nenhum instrumento cobre."""
    with pytest.raises(ErroLaboratorio) as erro:
        Manifesto(identidade="i", versao="1", capacidades=("medir",), nao_cobre=())
    assert erro.value.codigo == "manifesto-sem-limite"
    assert erro.value.acao_sugerida


def test_manifesto_sem_capacidade_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        Manifesto(identidade="i", versao="1", capacidades=(), nao_cobre=("x",))
    assert erro.value.codigo == "manifesto-sem-capacidade"


def test_instrumento_NAO_REGISTRADO_e_recusado():
    """Existir não basta: o estudo só usa o que foi declarado."""
    with pytest.raises(ErroLaboratorio) as erro:
        Registro().exigir("i", "1.0.0")
    assert erro.value.codigo == "instrumento-nao-registrado"
    assert "PATH" in erro.value.mensagem


def test_versao_diferente_da_registrada_e_recusada():
    r = Registro()
    r.registrar(manifesto(versao="1.0.0"))
    with pytest.raises(ErroLaboratorio) as erro:
        r.exigir("i", "2.0.0")
    assert erro.value.codigo == "versao-inesperada"


def test_registrar_a_mesma_identidade_com_outra_versao_e_recusado():
    """Trocar versão sem trocar nome mudaria o que se mede em silêncio."""
    r = Registro()
    r.registrar(manifesto(versao="1.0.0"))
    with pytest.raises(ErroLaboratorio) as erro:
        r.registrar(manifesto(versao="2.0.0"))
    assert erro.value.codigo == "versao-conflitante"


def test_dominio_declarado_aponta_o_parametro_fora():
    m = manifesto(dominio={"lados": lambda v: v == 14, "exp": lambda v: v >= 10})
    assert m.fora_do_dominio({"lados": 14, "exp": 20}) == []
    assert m.fora_do_dominio({"lados": 18, "exp": 6}) == ["exp", "lados"]


def test_parametro_nao_declarado_nao_e_julgado():
    """O manifesto diz onde vale; sobre o que ele não declara, ele não opina."""
    assert manifesto(dominio={"lados": lambda v: v == 14}).fora_do_dominio({"outro": 99}) == []
