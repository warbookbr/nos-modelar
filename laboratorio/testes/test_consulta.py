"""A camada de parâmetros só vale se ela não afrouxar nada que o estudo apertou."""

import math

import pytest

from laboratorio import consulta
from laboratorio.erros import ErroLaboratorio
from laboratorio.estudos import cabo_de_pa


def test_sem_diametro_a_consulta_REPRODUZ_a_linha_do_estudo():
    # A chamada mais curta possível não pode inventar um caso novo por omissão.
    for nome in consulta.candidatos():
        r = consulta.avaliar(nome)
        do_estudo = cabo_de_pa.medir(nome)
        assert math.isclose(r["margemContraFalha"], do_estudo["margemDeterminista"],
                            rel_tol=1e-12), nome


def test_a_parede_HERDADA_do_estudo_passa_mas_sai_MARCADA():
    # Aço e alumínio entraram na tabela antes de a parede mínima existir. A
    # consulta reproduz as duas linhas e nomeia a violação, em vez de escolher
    # entre esconder e recusar o próprio estudo.
    marcado = consulta.avaliar("aco-1020")["geometria"]["paredeAbaixoDaMinima"]
    assert marcado is not None and "1.2 mm" in marcado
    assert consulta.avaliar("bambu-colmo")["geometria"]["paredeAbaixoDaMinima"] is None
    assert consulta.avaliar("eucalipto")["geometria"]["paredeAbaixoDaMinima"] is None


def test_o_limite_de_EMPUNHADURA_continua_sendo_recusa():
    with pytest.raises(ErroLaboratorio) as erro:
        consulta.avaliar("eucalipto", diametro_m=0.060)
    assert erro.value.codigo == "diametro-nao-cabe-na-mao"


def test_a_parede_MINIMA_continua_sendo_recusa():
    with pytest.raises(ErroLaboratorio) as erro:
        consulta.avaliar("bambu-colmo", diametro_m=0.032, parede_m=0.0018)
    assert erro.value.codigo == "parede-amassa"


def test_barra_cheia_RECUSA_parede_em_vez_de_ignorar():
    # Ignorar em silêncio devolveria um número certo para uma pergunta errada.
    with pytest.raises(ErroLaboratorio) as erro:
        consulta.avaliar("eucalipto", parede_m=0.004)
    assert erro.value.codigo == "parede-em-secao-macica"


def test_material_desconhecido_LISTA_os_que_existem():
    with pytest.raises(ErroLaboratorio) as erro:
        consulta.avaliar("titanio-de-marte")
    assert erro.value.codigo == "material-ausente"
    assert "eucalipto" in erro.value.mensagem


def test_nenhum_numero_sai_SEM_dizer_de_onde_veio():
    r = consulta.avaliar("seringueira")
    assert set(r["procedencia"]["porPropriedade"]) == set(cabo_de_pa.PROPRIEDADES_COM_FONTE)
    assert "simulado" in r["natureza"]


def test_a_margem_CRESCE_com_o_diametro_que_e_o_que_a_bissecao_assume():
    fino = consulta.avaliar("eucalipto", diametro_m=0.030)["margemContraFalha"]
    grosso = consulta.avaliar("eucalipto", diametro_m=0.040)["margemContraFalha"]
    assert grosso > fino


def test_o_diametro_minimo_devolve_o_EXATO_e_o_MILIMETRO_conferido():
    r = consulta.diametro_minimo("pinus-comercial")
    assert r["existe"] is True
    # O milímetro não é o exato arredondado na confiança: ele foi rodado de novo.
    conferido = consulta.avaliar("pinus-comercial",
                                 diametro_m=r["milimetroQuePassa_m"])["margemContraFalha"]
    assert conferido >= 1.0
    assert math.isclose(conferido, r["margemNoMilimetro"], rel_tol=1e-12)
    # E o exato, sendo o limite, não sobra: um milímetro abaixo reprova.
    assert consulta.avaliar(
        "pinus-comercial",
        diametro_m=r["milimetroQuePassa_m"] - 0.001)["margemContraFalha"] < 1.0


def test_quem_nao_alcanca_a_margem_NEM_no_teto_diz_isso_em_vez_de_devolver_numero():
    caso = consulta.Caso(margem_alvo=8.0)
    r = consulta.diametro_minimo("papel-lignina", caso=caso)
    assert r["existe"] is False
    assert r["margemNoTeto"] < 8.0


def test_o_diametro_minimo_avisa_que_e_NOMINAL_e_nao_cauda_de_lote():
    r = consulta.diametro_minimo("pinus-comercial")
    assert "NOMINAL" in r["cuidado"]


def test_a_peneira_e_condicao_NECESSARIA_e_nao_promessa_de_geometria():
    # A fronteira não diz "funciona neste diâmetro": ela diz "não está eliminado".
    # No diâmetro do piso a barra cheia de urograndis pesa mais que o limite, e
    # isso NÃO contradiz a peneira — a massa é o que ela já usou para derivar o
    # piso de σ/ρ, não um segundo teste a aplicar depois.
    caso = consulta.Caso()
    por_nome = {linha["candidato"]: linha
                for linha in consulta.peneirar(caso=caso)["candidatos"]}
    assert not por_nome["eucalipto-urograndis"]["eliminado"]
    assert consulta.avaliar("eucalipto-urograndis", caso=caso,
                            diametro_m=caso.diametro_maximo_m)["massa_kg"] > 1.0


def test_quem_a_peneira_ELIMINA_nao_cumpre_a_margem_em_nenhum_diametro():
    # Este é o sentido forte da peneira, e o que a torna útil: eliminado é
    # definitivo dentro do domínio, então a busca por diâmetro tem de falhar.
    caso = consulta.Caso()
    for linha in consulta.peneirar(caso=caso)["candidatos"]:
        if not linha["eliminado"] or "resistência por quilo" not in linha["reprovaEm"]:
            continue
        nome = linha["candidato"]
        if cabo_de_pa.GEOMETRIAS[nome][0] != "macica":
            continue  # a peneira só cobre seção cheia, e ela mesma diz isso
        r = consulta.diametro_minimo(nome, caso=caso)
        assert r["existe"] is False or \
            consulta.avaliar(nome, caso=caso,
                             diametro_m=r["exato_m"])["massa_kg"] > caso.massa_maxima_kg, nome


def test_caso_com_numero_nao_positivo_e_RECUSADO_na_entrada():
    for campo in ("forca_n", "comprimento_m", "massa_maxima_kg", "flecha_maxima_m"):
        with pytest.raises(ErroLaboratorio) as erro:
            consulta.Caso(**{campo: 0.0})
        assert erro.value.codigo == "entrada-nao-positiva"


def test_forca_maior_EXIGE_cabo_mais_grosso():
    leve = consulta.diametro_minimo("eucalipto-urograndis",
                                    caso=consulta.Caso(forca_n=200.0))
    pesado = consulta.diametro_minimo("eucalipto-urograndis",
                                      caso=consulta.Caso(forca_n=400.0))
    assert pesado["exato_m"] > leve["exato_m"]


def test_a_consulta_NAO_deixa_inventar_material_pela_porta_dos_fundos():
    # Nenhuma função aceita propriedade solta: material entra pelo estudo, com fonte.
    import inspect
    for funcao in (consulta.avaliar, consulta.diametro_minimo, consulta.peneirar):
        parametros = set(inspect.signature(funcao).parameters)
        assert not parametros & {"resistencia_pa", "modulo_pa", "densidade_kg_m3"}
