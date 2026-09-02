"""O revisor precisa provar que PEGA, e não só que roda.

Um gate que aprova quase tudo é pior do que gate nenhum: ele dá a sensação de
proteção sem a proteção. A primeira versão deste revisor deixava passar 91% dos
números inventados e ainda assim dizia "aprovado" — por isso `poder_de_deteccao`
existe e por isso ele é testado aqui com piso numérico.
"""
import json

import pytest

from laboratorio import revisor
from laboratorio.erros import ErroLaboratorio
from laboratorio.estudos import cabo_de_pa as estudo

DOSSIE = "docs/mecanifica/DOSSIE-CABO-DE-PA.md"


def test_o_revisor_MEDE_o_proprio_poder_e_ele_e_alto_onde_ha_dimensao():
    poder = revisor.poder_de_deteccao(amostras=500)
    for dimensao, medida in poder["porDimensao"].items():
        if dimensao == revisor.SEM_UNIDADE:
            continue
        assert medida["detectados"] >= 0.80, (dimensao, medida)


def test_numero_INVENTADO_e_acusado(tmp_path):
    doc = tmp_path / "d.md"
    doc.write_text("A resistência medida foi 987,3 MPa no ensaio.", encoding="utf-8")
    achados = revisor.numeros_sem_rastro(doc)["semRastro"]
    assert [a["escrito"] for a in achados] == ["987,3"]
    assert achados[0]["dimensao"] == "pressao"


def test_numero_VERDADEIRO_do_estudo_passa(tmp_path):
    resistencia = estudo.MATERIAIS["eucalipto"]["resistencia_pa"] / 1e6
    doc = tmp_path / "d.md"
    doc.write_text(f"O eucalipto do manual dá {resistencia:.1f} MPa.".replace(".", ","),
                   encoding="utf-8")
    assert revisor.numeros_sem_rastro(doc)["semRastro"] == ()


def test_a_tolerancia_segue_a_PRECISAO_ESCRITA_e_nao_uma_folga_fixa():
    # "1,77" é o intervalo [1,765; 1,775]: quem escreveu arredondou. Já "1,7700"
    # aperta sozinho, e um valor que só bate na segunda casa deixa de passar.
    conhecidos = frozenset({1.7719})
    assert revisor._bate(1.77, conhecidos, "1,77")
    assert not revisor._bate(1.77, conhecidos, "1,7700")


def test_o_ponto_de_MILHAR_do_portugues_nao_vira_decimal(tmp_path):
    # 210.526 em pt-BR é duzentos e dez mil. Ler como 210,5 acusaria a própria
    # formatação do documento como número inventado.
    doc = tmp_path / "d.md"
    doc.write_text("| σ/ρ |\n| ---: |\n| 210.526 |\n", encoding="utf-8")
    achados = revisor.numeros_sem_rastro(doc)["semRastro"]
    assert achados == () or achados[0]["valor"] == 210526.0


def test_a_unidade_vale_para_a_CELULA_e_nao_so_para_o_numero_colado(tmp_path):
    doc = tmp_path / "d.md"
    doc.write_text("| geometria |\n| :-: |\n| 32 × 6.0 mm |\n", encoding="utf-8")
    assert revisor.numeros_sem_rastro(doc)["semRastro"] == ()


def test_a_dimensao_ESCRITA_impede_casamento_entre_grandezas_diferentes(tmp_path):
    # 0,90 existe no estudo como margem. Escrito como "0,90 MPa" ele deixa de ser
    # a mesma coisa, e o revisor não pode aceitar por semelhança numérica.
    doc = tmp_path / "d.md"
    doc.write_text("A margem virou 0,90 MPa.", encoding="utf-8")
    assert revisor.numeros_sem_rastro(doc)["semRastro"] != ()


def test_propriedade_sem_fonte_usada_SEM_ressalva_reprova(tmp_path):
    doc = tmp_path / "d.md"
    doc.write_text("O bambu tem amortecimento melhor e absorção superior.",
                   encoding="utf-8")
    r = revisor.propriedades_sem_fonte_no_documento(doc)
    assert any(f["propriedade"] == "fator_de_perda" for f in r["usadasSemRessalva"])


def test_a_mesma_frase_COM_a_ressalva_passa(tmp_path):
    doc = tmp_path / "d.md"
    doc.write_text("O bambu tem amortecimento melhor. Nenhuma fonte mediu isso.",
                   encoding="utf-8")
    r = revisor.propriedades_sem_fonte_no_documento(doc)
    assert not any(f["propriedade"] == "fator_de_perda" for f in r["usadasSemRessalva"])


def test_o_dossie_do_repositorio_esta_APROVADO():
    r = revisor.revisar(DOSSIE)
    assert r["aprovado"] is True, r["propriedadesUsadasSemRessalva"]


def test_o_veredito_diz_por_escrito_o_que_ele_NAO_cobre():
    # A caça a número sem rastro relata e não reprova, e isso precisa estar dito
    # no próprio resultado — senão "aprovado" promete mais do que entrega.
    r = revisor.revisar(DOSSIE)
    assert "numerosSemRastro" in r["relataSemReprovar"]
    assert "NÃO quer dizer que todo número tem origem" in r["leiaAssim"]


def test_excecao_SEM_motivo_escrito_e_recusada(tmp_path, monkeypatch):
    arquivo = tmp_path / "excecoes.json"
    arquivo.write_text(json.dumps({"42": "curto"}), encoding="utf-8")
    monkeypatch.setattr(revisor, "EXCECOES", arquivo)
    with pytest.raises(ErroLaboratorio) as erro:
        revisor.carregar_excecoes()
    assert erro.value.codigo == "excecao-sem-motivo"


def test_as_excecoes_do_repositorio_TEM_motivo():
    for chave, motivo in revisor.carregar_excecoes().items():
        assert len(motivo) >= 15, chave


def test_documento_ausente_e_RECUSA_e_nao_silencio():
    with pytest.raises(ErroLaboratorio) as erro:
        revisor.revisar("nao/existe.md")
    assert erro.value.codigo == "documento-ausente"


def test_a_secao_de_LITERATURA_fica_de_fora(tmp_path):
    # Ano, volume e página de artigo são números de fora por definição; conferi-los
    # contra o estudo seria erro de categoria.
    doc = tmp_path / "d.md"
    doc.write_text("## 14. Literatura\n\nRevista Árvore 33(3):501-509, 2009.\n",
                   encoding="utf-8")
    assert revisor.numeros_sem_rastro(doc)["semRastro"] == ()
