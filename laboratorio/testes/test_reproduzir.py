"""Reprodução: os três níveis de divergência precisam ser vistos acontecendo.

Um verificador que só sabe dizer "reproduzido" não verifica nada.
"""
from laboratorio.reproduzir import verificar

SINTESE = {"conclusoes": [{"hipotese": "h1", "estado": "sustentada-no-dominio-testado"}]}
OUTRA = {"conclusoes": [{"hipotese": "h1", "estado": "contradita"}]}


def pacote(torcao=0.03, receita="sha256:aaa", versao="1.1.0"):
    return {
        "instrumento": "i", "versao": versao,
        "entradas": {"receita": receita},
        "medidas": [{"parametros": {"lados": 14}, "torcaoMaxima": torcao, "triangulos": 458}],
    }


def test_pacote_identico_reproduz():
    r = verificar(pacote(), pacote(), SINTESE, SINTESE)
    assert r["veredito"] == "reproduzido"
    assert r["divergencias"] == []


def test_entrada_diferente_e_NAO_COMPARAVEL_mesmo_com_numeros_iguais():
    """O caso mais perigoso: os números batem e não significam nada."""
    r = verificar(pacote(receita="sha256:aaa"), pacote(receita="sha256:bbb"), SINTESE, SINTESE)
    assert r["veredito"] == "nao-comparavel"


def test_versao_do_instrumento_conta_como_entrada():
    r = verificar(pacote(versao="1.0.0"), pacote(versao="1.1.0"), SINTESE, SINTESE)
    assert r["veredito"] == "nao-comparavel"


def test_medida_diferente_com_mesma_entrada_e_ACHADO():
    r = verificar(pacote(torcao=0.03), pacote(torcao=0.04), SINTESE, SINTESE)
    assert r["veredito"] == "medida-divergente"
    assert any(d["nivel"] == "medida" for d in r["divergencias"])


def test_conclusao_divergente_pesa_mais_que_medida():
    r = verificar(pacote(torcao=0.03), pacote(torcao=0.04), SINTESE, OUTRA)
    assert r["veredito"] == "conclusao-divergente"
    assert any(d["nivel"] == "conclusao" for d in r["divergencias"])


def test_medida_que_sumiu_e_medida_que_apareceu_sao_divergencia():
    vazio = {**pacote(), "medidas": []}
    assert verificar(pacote(), vazio, SINTESE, SINTESE)["veredito"] == "medida-divergente"
    assert verificar(vazio, pacote(), SINTESE, SINTESE)["veredito"] == "medida-divergente"
