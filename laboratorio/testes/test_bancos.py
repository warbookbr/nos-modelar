"""Bancos públicos: cache primeiro, e 'não sei' em vez de valor inventado.

Nenhum teste aqui toca a rede: o buscador é injetado. Há teste que confere que o
módulo não importa nada de rede.
"""
import json

import pytest

from laboratorio.bancos import Banco, Consulta
from laboratorio.erros import ErroLaboratorio
from laboratorio.unidades import dimensao

PRESSAO = dimensao(massa=1, comprimento=-1, tempo=-2)


def banco(**kw):
    base = dict(identidade="materials-project", metodo="dft", licenca="CC-BY-4.0",
                versao="2026.08", limitacoes=("GGA subestima módulo elástico em metais",))
    return Banco(**{**base, **kw})


def buscador_falso(registros):
    chamadas = []

    def buscar(identidade, pedido):
        chamadas.append((identidade, pedido))
        return registros

    buscar.chamadas = chamadas
    return buscar


def test_a_primeira_consulta_vai_a_rede_e_a_segunda_vem_do_CACHE(tmp_path):
    buscar = buscador_falso([{"material_id": "mp-13", "K": 170.0}])
    c = Consulta(banco(), tmp_path, buscador=buscar)
    primeira = c.buscar({"formula": "Fe"})
    segunda = c.buscar({"formula": "Fe"})
    assert primeira["veioDe"] == "rede"
    assert segunda["veioDe"] == "cache"
    assert len(buscar.chamadas) == 1


def test_SEM_CACHE_E_SEM_REDE_ele_RECUSA_em_vez_de_devolver_vazio(tmp_path):
    """Lista vazia viraria 'não existe nada publicado sobre isso'."""
    with pytest.raises(ErroLaboratorio) as erro:
        Consulta(banco(), tmp_path).buscar({"formula": "Fe"})
    assert erro.value.codigo == "consulta-nao-feita"
    assert erro.value.recuperavel is True
    assert erro.value.acao_sugerida


def test_o_cache_TRAZIDO_DE_OUTRA_MAQUINA_responde_sem_buscador(tmp_path):
    """O caminho real: consulta feita no PC, cache trazido para cá."""
    com_rede = Consulta(banco(), tmp_path, buscador=buscador_falso([{"K": 170.0}]))
    com_rede.buscar({"formula": "Fe"})
    sem_rede = Consulta(banco(), tmp_path)
    assert sem_rede.buscar({"formula": "Fe"})["veioDe"] == "cache"


def test_VERSAO_DIFERENTE_DO_BANCO_e_OUTRA_consulta(tmp_path):
    """O mesmo pedido a despejos diferentes não se reaproveita."""
    Consulta(banco(), tmp_path, buscador=buscador_falso([{"K": 170.0}])).buscar({"formula": "Fe"})
    nova = Consulta(banco(versao="2027.01"), tmp_path)
    with pytest.raises(ErroLaboratorio) as erro:
        nova.buscar({"formula": "Fe"})
    assert erro.value.codigo == "consulta-nao-feita"


def test_pedido_vazio_e_recusado(tmp_path):
    with pytest.raises(ErroLaboratorio) as erro:
        Consulta(banco(), tmp_path, buscador=buscador_falso([])).buscar({})
    assert erro.value.codigo == "pedido-vazio"


def test_resposta_que_nao_e_lista_e_recusada(tmp_path):
    def ruim(identidade, pedido):
        return {"K": 1}

    with pytest.raises(ErroLaboratorio) as erro:
        Consulta(banco(), tmp_path, buscador=ruim).buscar({"formula": "Fe"})
    assert erro.value.codigo == "resposta-malformada"


def test_BANCO_SEM_LIMITACOES_e_recusado():
    """Banco de cálculo sem ressalva se apresenta como medição."""
    with pytest.raises(ErroLaboratorio) as erro:
        banco(limitacoes=())
    assert erro.value.codigo == "banco-sem-limitacoes"


def test_banco_sem_versao_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        banco(versao=" ")
    assert erro.value.codigo == "campo-vazio"


def test_metodo_inventado_e_recusado():
    with pytest.raises(ErroLaboratorio) as erro:
        banco(metodo="confiavel")
    assert erro.value.codigo == "metodo-invalido"


def test_VALOR_DE_DFT_SAI_MARCADO_COMO_CALCULADO(tmp_path):
    """Um número de DFT que perde a marca vira 'a resistência do material'."""
    c = Consulta(banco(), tmp_path, buscador=buscador_falso([]))
    p = c.propriedade({"K": 170.0}, "K", "GPa", PRESSAO, condicao="0 K")
    assert p.origem == "calculada"
    assert "dft" in p.condicao
    assert p.fonte == "materials-project@2026.08"


def test_banco_EXPERIMENTAL_gera_propriedade_MEDIDA(tmp_path):
    c = Consulta(banco(identidade="ensaio", metodo="experimental"), tmp_path,
                 buscador=buscador_falso([]))
    assert c.propriedade({"K": 170.0}, "K", "GPa", PRESSAO, condicao="20 °C").origem == "medida"


def test_campo_ausente_no_registro_e_recusado(tmp_path):
    c = Consulta(banco(), tmp_path, buscador=buscador_falso([]))
    with pytest.raises(ErroLaboratorio) as erro:
        c.propriedade({"K": 1.0}, "G", "GPa", PRESSAO, condicao="0 K")
    assert erro.value.codigo == "campo-ausente-no-registro"


def test_valor_de_texto_no_registro_e_recusado(tmp_path):
    c = Consulta(banco(), tmp_path, buscador=buscador_falso([]))
    with pytest.raises(ErroLaboratorio) as erro:
        c.propriedade({"K": "170"}, "K", "GPa", PRESSAO, condicao="0 K")
    assert erro.value.codigo == "valor-nao-numerico"


def test_o_cache_guarda_a_identidade_do_banco_junto(tmp_path):
    """Sem isso o arquivo em disco não diz de onde veio."""
    c = Consulta(banco(), tmp_path, buscador=buscador_falso([{"K": 170.0}]))
    c.buscar({"formula": "Fe"})
    arquivo = next(tmp_path.glob("*.json"))
    guardado = json.loads(arquivo.read_text(encoding="utf-8"))
    assert guardado["banco"]["identidade"] == "materials-project"
    assert guardado["banco"]["limitacoes"]
    assert guardado["pedido"] == {"formula": "Fe"}


def test_O_MODULO_NAO_ABRE_CONEXAO():
    """Quem busca é injetado; os testes nunca tocam a rede."""
    import ast

    import laboratorio.bancos as modulo

    arvore = ast.parse(open(modulo.__file__, encoding="utf-8").read())
    citados = set()
    for no in ast.walk(arvore):
        if isinstance(no, ast.Import):
            citados.update(a.name.split(".")[0] for a in no.names)
        elif isinstance(no, ast.ImportFrom):
            citados.add((no.module or "").split(".")[0])
    assert not citados & {"urllib", "http", "requests", "socket", "httpx", "ftplib"}, citados
