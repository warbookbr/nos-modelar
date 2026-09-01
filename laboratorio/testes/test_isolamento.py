from laboratorio import ErroLaboratorio, falhar


def test_erro_expoe_contrato_estavel():
    erro = falhar(
        "contrato",
        "documento-invalido",
        "formato ausente",
        local="$.formato",
    )

    assert isinstance(erro, ErroLaboratorio)
    assert erro.para_dict() == {
        "categoria": "contrato",
        "codigo": "documento-invalido",
        "mensagem": "formato ausente",
        "local": "$.formato",
        "causa": None,
        "recuperavel": False,
        "acaoSugerida": None,
    }


def test_erro_preserva_contexto_opcional_completo():
    erro = falhar(
        "execucao",
        "instrumento-indisponivel",
        "solver ausente",
        causa="executável não encontrado",
        recuperavel=True,
        acaoSugerida="Instale o solver e repita.",
    )

    assert erro.para_dict() == {
        "categoria": "execucao",
        "codigo": "instrumento-indisponivel",
        "mensagem": "solver ausente",
        "local": None,
        "causa": "executável não encontrado",
        "recuperavel": True,
        "acaoSugerida": "Instale o solver e repita.",
    }
