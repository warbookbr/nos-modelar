"""Executor: cada limite visto estourando, e cada estado visto acontecendo.

O executor promete cinco confinamentos e nomeia quatro coisas que não confina.
As promessas têm teste aqui; as não-promessas estão asseguradas por um teste que
lê a declaração, para que ninguém apague a lista sem perceber.
"""
import time

import pytest

from laboratorio.erros import ErroLaboratorio, falhar
from laboratorio.executor import executar
from laboratorio.plano import Passo


def passo(nome, *, operacao="op", consome=(), produz=(), **parametros):
    return Passo(nome=nome, instrumento="i", versao_instrumento="1.0.0",
                 operacao=operacao, consome=consome, produz=produz,
                 parametros=parametros)


def estados(doc):
    return [(p["passo"], p["estado"]) for p in doc["passos"]]


def test_plano_feliz_conclui_e_a_saida_de_um_chega_no_outro():
    visto = {}

    def produzir(*, entradas, diretorio):
        return {"x": 7}

    def consumir(*, entradas, diretorio):
        visto.update(entradas)
        return {}

    doc = executar(
        (passo("a", produz=("x",)), passo("b", operacao="op2", consome=("x",))),
        {"op": produzir, "op2": consumir},
    )
    assert doc["veredito"] == "concluido"
    assert visto == {"x": 7}


def test_FALHA_FECHA_O_PASSO_e_interrompe_o_plano():
    """Não existe sucesso parcial silencioso: o seguinte fica `nao-executada`."""
    def quebrar(*, entradas, diretorio):
        raise ValueError("não deu")

    doc = executar(
        (passo("a"), passo("b")), {"op": quebrar},
    )
    assert doc["veredito"] == "interrompido"
    assert estados(doc) == [("a", "falhou"), ("b", "nao-executada")]
    assert doc["passos"][0]["erro"]["codigo"] == "excecao-do-instrumento"


def test_erro_do_laboratorio_e_registrado_com_o_codigo_de_origem():
    def quebrar(*, entradas, diretorio):
        raise falhar("instrumento", "canario-morto", "a medida não mede nada")

    doc = executar((passo("a"),), {"op": quebrar})
    assert doc["passos"][0]["erro"]["codigo"] == "canario-morto"


def test_TEMPO_DO_PASSO_estourado_marca_expirou_e_para_o_plano():
    def devagar(*, entradas, diretorio):
        time.sleep(0.05)
        return {}

    doc = executar((passo("a"), passo("b")), {"op": devagar},
                   limite_por_passo_s=0.01)
    assert estados(doc) == [("a", "expirou"), ("b", "nao-executada")]
    assert doc["passos"][0]["erro"]["codigo"] == "tempo-do-passo-esgotado"


def test_TEMPO_TOTAL_estourado_para_antes_de_comecar_o_proximo():
    def devagar(*, entradas, diretorio):
        time.sleep(0.05)
        return {}

    doc = executar((passo("a"), passo("b"), passo("c")), {"op": devagar},
                   limite_total_s=0.02)
    assert estados(doc)[0] == ("a", "concluida")
    assert estados(doc)[1] == ("b", "expirou")
    assert doc["passos"][1]["erro"]["codigo"] == "tempo-total-esgotado"


def test_TETO_DE_PASSOS_recusa_o_plano_INTEIRO_antes_de_rodar_qualquer_um():
    rodou = []

    def contar(*, entradas, diretorio):
        rodou.append(1)
        return {}

    with pytest.raises(ErroLaboratorio) as erro:
        executar(tuple(passo(f"p{i}") for i in range(5)), {"op": contar},
                 limite_de_passos=4)
    assert erro.value.codigo == "passos-acima-do-teto"
    assert erro.value.acao_sugerida
    assert rodou == []


def test_CANCELAMENTO_e_estado_e_nao_defeito():
    doc = executar((passo("a"), passo("b")), {"op": lambda **k: {}},
                   cancelado=lambda: True)
    assert estados(doc) == [("a", "cancelada"), ("b", "nao-executada")]


def test_operacao_ausente_no_executor_fecha_o_passo():
    doc = executar((passo("a", operacao="inexistente"),), {"op": lambda **k: {}})
    assert doc["passos"][0]["erro"]["codigo"] == "operacao-ausente"


def test_passo_que_NAO_ENTREGA_o_prometido_falha():
    doc = executar((passo("a", produz=("x",)),), {"op": lambda **k: {"y": 1}})
    assert doc["passos"][0]["estado"] == "falhou"
    assert doc["passos"][0]["erro"]["codigo"] == "saida-faltando"


def test_saida_sem_nome_e_recusada_quando_o_passo_prometeu_algo():
    doc = executar((passo("a", produz=("x",)),), {"op": lambda **k: 42})
    assert doc["passos"][0]["erro"]["codigo"] == "saida-nao-nomeada"


def test_SAIDA_NAO_PROMETIDA_e_descartada_para_o_grafo_nao_mentir():
    vazamento = {}

    def produzir(*, entradas, diretorio):
        return {"x": 1, "clandestina": 2}

    def consumir(*, entradas, diretorio):
        vazamento.update(entradas)
        return {}

    doc = executar((passo("a", produz=("x",)),
                    passo("b", operacao="op2", consome=("x",))),
                   {"op": produzir, "op2": consumir})
    assert doc["veredito"] == "concluido"
    assert vazamento == {"x": 1}
    assert doc["passos"][0]["saidas"] == ["x"]


def test_cada_passo_recebe_diretorio_proprio_e_ele_some_no_fim():
    vistos = []

    def anotar(*, entradas, diretorio):
        (diretorio / "rascunho.txt").write_text("oi", encoding="utf-8")
        vistos.append(diretorio)
        return {}

    doc = executar((passo("a"), passo("b")), {"op": anotar})
    assert doc["veredito"] == "concluido"
    assert vistos[0] != vistos[1]
    assert not any(d.exists() for d in vistos)


def test_parametros_do_passo_chegam_na_operacao():
    def somar(*, quanto, entradas, diretorio):
        return {"r": quanto + 1}

    doc = executar((passo("a", produz=("r",), quanto=41),), {"op": somar})
    assert doc["veredito"] == "concluido"


def test_o_que_o_executor_NAO_confina_fica_declarado_no_resultado():
    """Silêncio sobre cobertura é mentira sobre cobertura: a lista é parte da saída."""
    doc = executar((passo("a"),), {"op": lambda **k: {}})
    assert set(doc["confinamento"]["naoConfina"]) >= {"rede", "memória", "processos filhos"}
    assert doc["confinamento"]["confina"]
