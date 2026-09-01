"""O estudo julga — e precisa ser visto CONTRADIZENDO, não só concordando.

Um avaliador que sempre sustenta a hipótese é o mesmo defeito do gate que nunca
foi visto vermelho: ele parece funcionar e não decide nada.
"""
from laboratorio.estudos.torcao_do_machado import (
    ALVO_TORCAO,
    MANIFESTO,
    HIPOTESE_ALCANCAVEL,
    HIPOTESE_MONOTONA,
    avaliar,
)


def medida(expoente, torcao, *, gritos=0, altura=0.6547, triangulos=458):
    return {
        "parametros": {"lados": 14, "expoenteSecao": expoente},
        "gritos": gritos,
        "triangulos": triangulos,
        "torcaoMaxima": torcao,
        "torcaoMediana": torcao / 2,
        "facesTortas": 10,
        "caixa": {"min": [0, 0, 0], "max": [0.1, altura, 0.1]},
    }


def pacote(medidas, dominio=None):
    return {
        "instrumento": MANIFESTO.identidade,
        "versao": MANIFESTO.versao,
        "peca": "machado-de-guerra",
        "dominio": dominio or {"ladosTestados": [10, 14], "ladosViaveis": [14]},
        "medidas": medidas,
    }


def estado(sintese, hipotese):
    doc = sintese.documento()
    return next(c["estado"] for c in doc["conclusoes"] if c["hipotese"] == hipotese.id)


def test_monotonicidade_sustentada_quando_a_torcao_cai():
    s = avaliar(pacote([medida(6, 0.08), medida(10, 0.05), medida(14, 0.03)]))
    assert estado(s, HIPOTESE_MONOTONA) == "sustentada-no-dominio-testado"


def test_monotonicidade_CONTRADITA_quando_a_torcao_sobe():
    """O caso que prova que o avaliador decide em vez de carimbar."""
    s = avaliar(pacote([medida(6, 0.03), medida(10, 0.05), medida(14, 0.08)]))
    assert estado(s, HIPOTESE_MONOTONA) == "contradita"


def test_alvo_sustentado_quando_alguem_fica_abaixo_com_a_forma_intacta():
    referencia = medida(14, 0.03)
    barato = medida(30, ALVO_TORCAO / 2, triangulos=500)
    s = avaliar(pacote([referencia, barato]))
    assert estado(s, HIPOTESE_ALCANCAVEL) == "sustentada-no-dominio-testado"


def test_alvo_CONTRADITO_quando_baixar_a_torcao_deforma_a_peca():
    """Baixar a torção mudando a forma não é resposta: é outra peça."""
    referencia = medida(14, 0.03)
    deformado = medida(30, ALVO_TORCAO / 2, altura=0.70)   # 45 mm fora da referência
    s = avaliar(pacote([referencia, deformado]))
    assert estado(s, HIPOTESE_ALCANCAVEL) == "contradita"


def test_execucao_com_grito_nao_sustenta_e_vira_limite():
    """Dentro do domínio declarado, mas com grito do motor: preservada e não usada.

    A medida precisa estar DENTRO do domínio, senão ela é excluída antes — o
    filtro de domínio roda primeiro, e é a ordem certa: medida fora do que o
    instrumento declara nem chega a ser avaliada por admissibilidade.
    """
    s = avaliar(pacote([medida(10, 0.08, gritos=1), medida(14, 0.05), medida(20, 0.03)]))
    limites = " ".join(s.documento()["limites"])
    assert "1 execução(ões) da varredura foram excluídas" in limites
    assert estado(s, HIPOTESE_MONOTONA) == "sustentada-no-dominio-testado"


def test_sem_varredura_admissivel_o_estudo_fica_inconclusivo():
    """Não existe conclusão barata: sem dado admissível, ninguém decide nada."""
    s = avaliar(pacote([medida(10, 0.08, gritos=1), medida(14, 0.05, gritos=1)]))
    assert estado(s, HIPOTESE_MONOTONA) == "inconclusiva"
    assert estado(s, HIPOTESE_ALCANCAVEL) == "inconclusiva"


def test_a_sintese_carrega_o_dominio_que_o_instrumento_descobriu():
    s = avaliar(pacote([medida(10, 0.05), medida(14, 0.03)]))
    limites = " ".join(s.documento()["limites"])
    assert "`lados` NÃO é parâmetro livre" in limites


def test_medida_fora_do_dominio_declarado_e_EXCLUIDA_e_dita():
    """O instrumento declara onde vale; medida fora não sustenta conclusão."""
    fora = medida(6, 0.09)          # expoenteSecao 6 está fora do domínio declarado
    dentro = [medida(10, 0.05), medida(14, 0.03)]
    s = avaliar(pacote([fora, *dentro]))
    limites = " ".join(s.documento()["limites"])
    assert "1 medida(s) ficaram FORA do domínio declarado" in limites
    assert estado(s, HIPOTESE_MONOTONA) == "sustentada-no-dominio-testado"


def test_instrumento_nao_registrado_GRITA_em_vez_de_concluir():
    import pytest

    from laboratorio.erros import ErroLaboratorio

    estranho = {**pacote([medida(10, 0.05), medida(14, 0.03)]), "instrumento": "outro"}
    with pytest.raises(ErroLaboratorio) as erro:
        avaliar(estranho)
    assert erro.value.codigo == "instrumento-nao-registrado"


def test_a_sintese_repete_o_que_o_instrumento_nao_cobre():
    s = avaliar(pacote([medida(10, 0.05), medida(14, 0.03)]))
    limites = " ".join(s.documento()["limites"])
    assert "O instrumento não cobre:" in limites
    assert "formas por `loft`" in limites
