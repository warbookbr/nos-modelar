"""Armazém por conteúdo: id é o hash, e conteúdo trocado é detectado."""
import pytest

from laboratorio.artefatos import Armazem
from laboratorio.erros import ErroLaboratorio


def test_guardar_devolve_a_identidade_e_ler_devolve_o_mesmo(tmp_path):
    a = Armazem(tmp_path)
    ident = a.guardar({"medida": 1})
    assert a.ler(ident) == {"medida": 1}


def test_guardar_duas_vezes_o_mesmo_conteudo_e_no_op(tmp_path):
    a = Armazem(tmp_path)
    assert a.guardar({"m": 1}) == a.guardar({"m": 1})
    assert len(list(tmp_path.rglob("*.json"))) == 1


def test_ordem_de_chave_nao_cria_artefato_novo(tmp_path):
    a = Armazem(tmp_path)
    assert a.guardar({"a": 1, "b": 2}) == a.guardar({"b": 2, "a": 1})


def test_artefato_ausente_grita_com_acao(tmp_path):
    with pytest.raises(ErroLaboratorio) as erro:
        Armazem(tmp_path).ler("sha256:" + "0" * 64)
    assert erro.value.codigo == "artefato-ausente"
    assert erro.value.acao_sugerida


def test_conteudo_trocado_por_baixo_e_RECUSADO(tmp_path):
    """O nome promete um hash; se o conteúdo não bate, tudo que se apoia nele cai."""
    a = Armazem(tmp_path)
    ident = a.guardar({"medida": 1})
    caminho = next(tmp_path.rglob("*.json"))
    caminho.write_text('{"medida":999}', encoding="utf-8")
    with pytest.raises(ErroLaboratorio) as erro:
        a.ler(ident)
    assert erro.value.codigo == "artefato-adulterado"
    assert erro.value.recuperavel is False
