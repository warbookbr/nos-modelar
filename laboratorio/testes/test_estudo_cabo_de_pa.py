"""Piloto do cabo de pá: as três hipóteses, e o achado sobre a carga suposta."""
from laboratorio.estudos import cabo_de_pa as estudo


def test_o_estudo_roda_de_ponta_a_ponta():
    sintese = estudo.avaliar_estudo()
    assert len(sintese.conclusoes) == 3
    assert all(c["estado"] != "nao-testada" for c in sintese.conclusoes)


def test_METAL_SOBRA_COM_MUITO_MAIS_VIBRACAO_que_madeira():
    """O resultado central: metal dissipa vinte vezes menos que madeira."""
    medidas = estudo.comparar()["medidas"]
    madeira = medidas["eucalipto"]["vibracaoRestante"]
    for nome in ("aco-1020", "aluminio-6061-t6"):
        assert medidas[nome]["vibracaoRestante"] > madeira
    assert medidas["aco-1020"]["vibracaoRestante"] > 0.95
    assert madeira < 0.80


def test_NENHUM_MATERIAL_ESTRUTURAL_BATE_A_MADEIRA_EM_VIBRACAO():
    """Duas correções moram neste teste, e as duas vieram de erro meu.

    Primeiro eu escrevi que a fibra de vidro ganhava sem piorar a mão: não ganha,
    sobra 0,778 contra 0,730 da madeira. Depois escrevi que NENHUM candidato
    batia a madeira — e os laminados de papel batem, com folga. A afirmação certa
    é mais estreita: entre metal e fibra de vidro, nenhum chega perto da madeira."""
    medidas = estudo.comparar()["medidas"]
    madeira = medidas["eucalipto"]["vibracaoRestante"]
    for nome in ("aco-1020", "aluminio-6061-t6", "fibra-de-vidro"):
        assert medidas[nome]["vibracaoRestante"] > madeira


def test_os_LAMINADOS_DE_PAPEL_BATEM_a_madeira_em_vibracao():
    """A vantagem inteira do candidato: dissipa mais que o dobro da madeira."""
    medidas = estudo.comparar()["medidas"]
    dissipa = lambda n: 1 - medidas[n]["vibracaoRestante"]
    assert dissipa("papel-lignina") > 2 * dissipa("eucalipto")
    assert dissipa("papel-fenolico") > 2 * dissipa("eucalipto")


def test_a_FIBRA_DE_VIDRO_chega_PERTO_da_madeira_e_os_metais_nao():
    """A diferença de grau importa: fibra fica a 5 pontos da madeira; metal, a 25."""
    medidas = estudo.comparar()["medidas"]
    madeira = medidas["eucalipto"]["vibracaoRestante"]
    fibra = medidas["fibra-de-vidro"]["vibracaoRestante"]
    aco = medidas["aco-1020"]["vibracaoRestante"]
    assert (fibra - madeira) < 0.10
    assert (aco - madeira) > 0.20
    assert medidas["fibra-de-vidro"]["margemP05"] > medidas["eucalipto"]["margemP05"]


def test_o_metal_ganha_em_resistencia():
    medidas = estudo.comparar()["medidas"]
    madeira = medidas["eucalipto"]["margemP05"]
    assert all(medidas[n]["margemP05"] > madeira for n in ("aco-1020", "aluminio-6061-t6"))


def test_A_CARGA_SUPOSTA_REPROVA_ATE_A_MADEIRA_e_isso_e_um_achado():
    """Margem abaixo de 1 no eucalipto diz que o caso de carga é uso abusivo,
    e não cavar normal. É achado sobre a hipótese de carga, não sobre a madeira."""
    assert estudo.comparar()["medidas"]["eucalipto"]["margemP05"] < 1.0


def test_TODA_propagacao_CONVERGIU():
    assert all(m["convergiu"] for m in estudo.comparar()["medidas"].values())


def test_a_semente_e_declarada_no_modulo():
    assert isinstance(estudo.SEMENTE, int)


def test_a_sintese_diz_que_NADA_FOI_ENSAIADO():
    sintese = estudo.avaliar_estudo()
    juntos = " ".join(sintese.limites)
    assert "nada foi ensaiado fisicamente" in juntos
    assert "fadiga" in juntos
    assert "NÃO conferido contra fonte primária" in juntos


def test_a_sintese_admite_a_CORRELACAO_que_ela_ignorou():
    """Densidade e módulo da madeira andam juntos; sortear independente é otimista."""
    juntos = " ".join(estudo.avaliar_estudo().limites)
    assert "otimista" in juntos


def test_as_propriedades_ficam_ISOLADAS_e_marcadas():
    assert "NÃO conferido" in estudo.FONTE
    for material in estudo.MATERIAIS.values():
        assert "fator_de_perda" in material and "preco_por_kg" in material


def test_a_fronteira_de_trocas_NAO_elege_vencedor():
    assert estudo.comparar()["trocas"]["vencedor"] is None


def test_a_recomendacao_aponta_MEDIR_e_nao_mexer_na_liga():
    """A incerteza que reprova o cabo é a do autor, não a do material."""
    r = estudo.recomendar()
    assert r["candidato"] == "papel-lignina"
    assert "flexão" in r["proximaAcao"]["o_que"]
    assert "a incerteza que reprova o cabo é a minha" in r["proximaAcao"]["porQue"]
    assert "não transpõe" in r["proximaAcao"]["quemFaz"]


def test_a_recomendacao_RECUSA_a_variante_fenolica_por_saude():
    assert "formaldeído" in estudo.recomendar()["oQueNAOfazer"]


def test_o_papel_lignina_ganha_em_tudo_MENOS_resistencia():
    medidas = estudo.comparar()["medidas"]
    lignina, madeira = medidas["papel-lignina"], medidas["eucalipto"]
    assert lignina["custo"] < madeira["custo"]
    assert lignina["vibracaoRestante"] < madeira["vibracaoRestante"]
    assert lignina["massa_kg"] < madeira["massa_kg"]
    assert lignina["margemP05"] < madeira["margemP05"]


def test_a_variante_de_LIGNINA_passa_nos_criterios_de_saude_e_ambiente():
    lignina = estudo.MATERIAIS["papel-lignina"]
    fenolica = estudo.MATERIAIS["papel-fenolico"]
    assert lignina["irritacao"] == 3 and lignina["ambiente"] == 3
    assert fenolica["irritacao"] == 1


def test_a_escala_qualitativa_se_declara_ORDINAL():
    """Fingir que a distância entre 3 e 2 significa algo é virar julgamento em medida."""
    assert "ordinal" in estudo.ESCALA_QUALITATIVA
