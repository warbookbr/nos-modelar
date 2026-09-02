"""A casca de linha de comando não pode ter física própria nem engolir recusa."""

import json

import pytest

from laboratorio import cli


def test_candidatos_sai_como_json_legivel(capsys):
    assert cli.main(["candidatos"]) == 0
    saida = json.loads(capsys.readouterr().out)
    assert "eucalipto-urograndis" in saida["candidatos"]


def test_milimetro_entra_e_metro_sai(capsys):
    assert cli.main(["avaliar", "eucalipto", "--diametro-mm", "32"]) == 0
    saida = json.loads(capsys.readouterr().out)
    assert saida["geometria"]["diametro_m"] == pytest.approx(0.032)


def test_recusa_sai_como_JSON_e_codigo_1_e_nao_como_pilha(capsys):
    assert cli.main(["avaliar", "eucalipto", "--diametro-mm", "60"]) == 1
    erro = json.loads(capsys.readouterr().err)["erro"]
    assert erro["codigo"] == "diametro-nao-cabe-na-mao"
    assert erro["acaoSugerida"]


def test_o_caso_passado_por_parametro_CHEGA_na_conta(capsys):
    cli.main(["avaliar", "eucalipto", "--forca", "600"])
    dobro = json.loads(capsys.readouterr().out)
    cli.main(["avaliar", "eucalipto", "--forca", "300"])
    simples = json.loads(capsys.readouterr().out)
    assert dobro["margemContraFalha"] == pytest.approx(simples["margemContraFalha"] / 2)


def test_o_ensaio_virtual_tambem_esta_na_casca(capsys):
    assert cli.main(["ensaio", "flexao", "--largura-mm", "25", "--altura-mm", "25",
                     "--vao-mm", "410", "--forca", "1000",
                     "--modulo-gpa", "13", "--resistencia-mpa", "112"]) == 0
    saida = json.loads(capsys.readouterr().out)
    assert saida["natureza"].startswith("simulado")


def test_a_casca_NAO_aceita_propriedade_de_material_solta(capsys):
    # Aceitar --resistencia aqui seria inventar material sem fonte pela linha de comando.
    with pytest.raises(SystemExit):
        cli.main(["avaliar", "eucalipto", "--resistencia-mpa", "500"])
    # Na bancada virtual ela entra, e aí é o ponto: material hipotético sai
    # marcado como simulado e não vira candidato de nada.
    assert cli.main(["ensaio", "tracao", "--area-mm2", "100", "--forca", "5000",
                     "--comprimento-mm", "200", "--modulo-gpa", "13",
                     "--resistencia-mpa", "112"]) == 0
