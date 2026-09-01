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


def test_o_EUCALIPTO_SECO_bate_os_metais_em_resistencia():
    """Correção pela fonte primária. Com 75 MPa — que é o valor da madeira VERDE —
    os metais ganhavam. Com os 111,7 MPa do Wood Handbook a 12% de umidade, que é
    a condição de um cabo, a madeira passa na frente dos dois."""
    medidas = estudo.comparar()["medidas"]
    madeira = medidas["eucalipto"]["margemP05"]
    assert all(medidas[n]["margemP05"] < madeira for n in ("aco-1020", "aluminio-6061-t6"))


def test_A_CARGA_SUPOSTA_ESTAVA_CERTA_e_o_erro_era_meu():
    """Este teste já afirmou o contrário. Eu concluí que a carga era abusiva porque
    ela reprovava até o eucalipto — e o que reprovava era eu usar 75 MPa, valor da
    madeira verde, para um cabo que é de madeira seca. Com o dado do Wood Handbook
    a madeira passa e a carga se mostra razoável."""
    assert estudo.comparar()["medidas"]["eucalipto"]["margemP05"] >= 1.0


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


def test_NAO_MEDIR_TEM_PRECO_em_milimetro_e_grama():
    """A tradução mais direta de por que ensaiar vale a pena. O preço foi corrigido
    de 10 mm para 5 mm quando a porta estrutural passou a valer estritamente."""
    caminhos = estudo.recomendar()["doisCaminhos"]
    assert caminhos["medindo"]["diametro_mm"] < caminhos["sem_medir"]["diametro_mm"]
    assert caminhos["medindo"]["massa_kg"] < caminhos["sem_medir"]["massa_kg"]
    assert "5 mm" in caminhos["licao"]


def test_o_REQUISITO_ESTRUTURAL_e_PORTA_e_nao_peso():
    """Numa soma ponderada o papel-lignina venceu tendo a PIOR margem de todas:
    conforto e preço compensaram o cabo quebrar. Quebrar não se negocia."""
    c = estudo.comparar()
    assert "papel-lignina" in c["eliminados"]
    assert "porta, não peso" in c["porQueEliminar"]


def test_a_PORTA_APROVA_o_eucalipto_e_reprova_o_candidato():
    """O concorrente com fonte primária passa; o candidato, a 32 mm, não."""
    c = estudo.comparar()
    assert "eucalipto" not in c["eliminados"]
    assert "papel-lignina" in c["eliminados"]


def test_A_TROCA_e_dita_EM_NUMERO_e_a_decisao_nao_e_de_quem_calcula():
    """68% mais pesado para dissipar 126% mais vibração."""
    troca = estudo.recomendar()["aTrocaEmNumero"]
    assert troca["massa_kg"]["papel-lignina"] > troca["massa_kg"]["eucalipto"]
    assert "não quem calcula" in troca["quemDecide"]


def test_a_ASSIMETRIA_DE_FONTES_e_declarada():
    """O benchmark tem fonte primária; o candidato recomendado não tem nenhuma."""
    assert "FPL-GTR-190" in estudo.recomendar()["assimetriaDasFontes"]
    assert "memória" in estudo.recomendar()["assimetriaDasFontes"]


def test_o_eucalipto_e_o_UNICO_com_fonte_primaria():
    assert estudo.MATERIAIS["eucalipto"]["fonte"] == "FPL-GTR-190"
    assert all("fonte" not in m for n, m in estudo.MATERIAIS.items() if n != "eucalipto")


def test_a_fonte_da_madeira_cita_o_documento_e_a_tabela():
    assert "FPL-GTR-190" in estudo.FONTE_MADEIRA
    assert "Tabela 5-5a" in estudo.FONTE_MADEIRA
    assert "12% de umidade" in estudo.FONTE_MADEIRA


def test_o_CONTEXTO_DE_FORNECIMENTO_e_declarado_e_nao_cravado_no_material():
    """Maturidade de fornecedor depende de quem pergunta; embutir isso no material
    seria pôr a situação de uma pessoa dentro de um número que parece técnico."""
    sem = estudo.CONTEXTOS_DE_FORNECIMENTO["sem-acesso-a-industria"]["fornecimento"]
    com = estudo.CONTEXTOS_DE_FORNECIMENTO["com-acesso-a-industria"]["fornecimento"]
    assert com["papel-lignina"] > sem["papel-lignina"]
    assert com["aco-1020"] == sem["aco-1020"]


def test_contexto_desconhecido_e_recusado():
    import pytest

    from laboratorio.erros import ErroLaboratorio

    with pytest.raises(ErroLaboratorio) as erro:
        estudo.comparar("qualquer-um")
    assert erro.value.codigo == "contexto-desconhecido"


def test_a_CONFORMIDADE_premia_quem_dispensa_norma_de_formaldeido():
    """Regulamentação aqui é vantagem, não custo."""
    assert estudo.CONFORMIDADE["papel-lignina"] > estudo.CONFORMIDADE["papel-fenolico"]


def test_a_analise_de_fabricacao_se_declara_FORA_do_laboratorio():
    """Análise não é estudo, e a diferença tem de estar visível."""
    assert "NÃO SAIU DO LABORATÓRIO" in estudo.recomendar()["fabricacaoEfornecimento"]


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


def test_a_VARIANTE_IGUALITARIA_e_o_melhor_negocio():
    """Perseguir o máximo custa 68% de massa; só empatar custa 9%, com o mesmo
    amortecimento. A pergunta veio do usuário e a resposta é sim."""
    v = estudo.avaliar_variantes(medida=True)["variantes"]
    assert v["igualitaria-medida"]["empataOuSupera"]
    assert v["igualitaria-medida"]["massaRelativaAoEucalipto"] < 0.15
    assert v["extrema"]["massaRelativaAoEucalipto"] > 0.60
    assert v["igualitaria-medida"]["dissipacao"] == v["extrema"]["dissipacao"]


def test_o_AMORTECIMENTO_NAO_DEPENDE_da_geometria():
    """Correção de algo que eu deixei ambíguo: a dissipação vem do MATERIAL, e
    engrossar o cabo é para resistência, não para vibração.

    Este teste já afirmou que TODAS as variantes dissipavam igual, o que era
    verdade enquanto havia um material só. Com o laminado reforçado por fibra a
    afirmação certa é mais estreita: dentro de cada material, a geometria não
    muda o amortecimento."""
    v = estudo.avaliar_variantes(medida=True)["variantes"]
    por_material = {}
    for x in v.values():
        por_material.setdefault(x["material"], set()).add(round(x["dissipacao"], 9))
    assert all(len(d) == 1 for d in por_material.values()), por_material
    assert len(por_material) >= 2


def test_MEDIR_QUASE_METADE_o_peso_do_cabo():
    """Mesmo material, mesmo empate: 0,84 kg medindo contra 1,45 kg sem medir."""
    v = estudo.avaliar_variantes(medida=True)["variantes"]
    assert v["igualitaria-sem-medir"]["massa_kg"] > 1.6 * v["igualitaria-medida"]["massa_kg"]


def test_o_LIMITE_DE_EMPUNHADURA_existe_porque_a_otimizacao_fugiu():
    """Sem ele a varredura foi para 69 mm de parede fina: mais leve e mais barato
    que a madeira, e impossível de segurar."""
    d = estudo.avaliar_variantes()
    assert "69 mm" in d["porQueOLimiteExiste"]
    assert "falta restrição" in d["porQueOLimiteExiste"]
    assert d["variantes"]["extrema"]["cabeNaMao"] is False
    assert d["variantes"]["igualitaria-medida"]["cabeNaMao"] is True


def test_a_referencia_das_variantes_carrega_a_FONTE_da_madeira():
    assert "FPL-GTR-190" in estudo.avaliar_variantes()["referencia"]["fonte"]


def test_a_FIBRA_FECHA_a_lacuna_de_resistencia_por_quilo():
    """O alvo calculado era 182 MPa para empatar por quilo com o eucalipto. O
    laminado reforçado chega a 138.462 contra 139.625 da madeira."""
    def especifica(n):
        m = estudo.MATERIAIS[n]
        return m["resistencia_pa"] / m["densidade_kg_m3"]

    assert especifica("papel-lignina-curaua") > 1.9 * especifica("papel-lignina")
    assert abs(especifica("papel-lignina-curaua") / especifica("eucalipto") - 1) < 0.05


def test_a_fibra_COBRA_o_preco_em_amortecimento():
    """Fibra rígida e alinhada endurece o compósito, e material mais rígido dissipa
    menos. Ganhar resistência custa a vantagem inteira do candidato."""
    v = estudo.avaliar_variantes(medida=True)["variantes"]
    assert v["curaua-medida"]["dissipacao"] < v["igualitaria-medida"]["dissipacao"]
    assert v["curaua-medida"]["dissipacao"] > 0.27  # ainda bate a madeira


def test_a_variante_com_FIBRA_e_mais_leve_que_a_madeira():
    v = estudo.avaliar_variantes(medida=True)["variantes"]["curaua-medida"]
    assert v["massaRelativaAoEucalipto"] < -0.30
    assert v["empataOuSupera"] and v["cabeNaMao"] and v["paredeSobreviveAoUso"]


def test_a_PAREDE_MINIMA_entrou_porque_a_otimizacao_achou_o_terceiro_buraco():
    """Cabo fino não morre por flexão: morre amassado, no encaixe ou caindo."""
    d = estudo.avaliar_variantes()
    assert "amassa" in d["porQueOLimiteExiste"]
    assert d["paredeMinima_m"] == 0.003
    assert all(v["paredeSobreviveAoUso"] for v in d["variantes"].values())


def test_a_agua_e_a_fabricacao_tem_nota_para_TODO_material():
    """Critérios que o usuário pediu, e ausência de nota seria omissão cômoda."""
    for nome, m in estudo.MATERIAIS.items():
        assert "agua" in m and "fabricacao" in m, nome
        assert m["justificativaAguaEfabricacao"].strip()


def test_a_agua_e_o_ponto_fraco_dos_laminados_de_papel():
    """Celulose absorve, e a vedação externa é obrigatória — não é detalhe."""
    for nome in ("papel-lignina", "papel-lignina-curaua"):
        assert estudo.MATERIAIS[nome]["agua"] == 1


def test_o_BAMBU_tem_a_maior_resistencia_por_quilo_do_estudo():
    """Ele já é um compósito de fibra unidirecional feito pela planta, e já vem em
    forma de tubo. Bate até a fibra de vidro."""
    def especifica(n):
        m = estudo.MATERIAIS[n]
        return m["resistencia_pa"] / m["densidade_kg_m3"]

    melhor = max(estudo.MATERIAIS, key=especifica)
    assert melhor == "bambu-colmo"
    assert especifica("bambu-colmo") > especifica("fibra-de-vidro")


def test_o_BAMBU_e_o_UNICO_que_vence_SEM_medir():
    """Todos os outros candidatos dependem de estreitar a incerteza para empatar."""
    sem = estudo.avaliar_variantes(medida=False)["variantes"]
    assert sem["bambu-sem-selecionar"]["empataOuSupera"]
    assert sem["bambu-sem-selecionar"]["massaRelativaAoEucalipto"] < -0.50
    assert not sem["igualitaria-medida"]["empataOuSupera"] or \
        sem["igualitaria-medida"]["massa_kg"] > sem["bambu-sem-selecionar"]["massa_kg"]


def test_o_bambu_e_MUITO_mais_barato():
    v = estudo.avaliar_variantes(medida=True)
    assert v["variantes"]["bambu-selecionado"]["custo"] < 0.25 * v["referencia"]["custo"]


def test_o_PROCESSO_do_bambu_e_declarado_inteiro():
    """A pergunta certa não é 'é simples?', é 'o que exatamente precisa acontecer?'."""
    proc = estudo.MATERIAIS["bambu-colmo"]["processo"]
    juntos = " ".join(proc["exige"])
    assert "caruncho" in juntos and "secagem" in juntos
    assert "resina" in proc["dispensa"] and "estufa de cura" in proc["dispensa"]
    assert "rachadura" in proc["riscoDeDurabilidade"]
    assert "NÃO o modela" in proc["riscoDeDurabilidade"]


def test_o_laminado_de_bambu_reabre_a_questao_do_adesivo():
    juntos = " ".join(estudo.MATERIAIS["bambu-laminado"]["processo"]["exige"])
    assert "formaldeído" in juntos


def test_para_o_colmo_MEDIR_e_SELECIONAR_LOTE():
    """A variação é da planta; nenhum ensaio a reduz — o que se faz é escolher."""
    import inspect
    fonte = inspect.getsource(estudo.avaliar_variantes)
    assert "SELECIONAR LOTE" in fonte


def test_o_BAMBU_SECA_ORDENS_DE_GRANDEZA_mais_rapido():
    """A pergunta do usuário: se levar o mesmo tempo, o ganho encolhe. Não leva —
    o colmo já vem com parede de 3 mm e o cabo de eucalipto é maciço."""
    p = estudo.comparar_preparo_da_materia_prima()["pecas"]
    euc = p["cabo de eucalipto (maciço 32 mm)"]["vezesMaisLentoQueOMaisRapido"]
    assert euc > 100


def test_a_IMERSAO_do_bambu_e_SOBREPOSTA_a_secagem():
    """Pode ser feita com o colmo verde; somar seria inventar tempo."""
    p = estudo.comparar_preparo_da_materia_prima()["pecas"]
    assert "imersão contra caruncho" in p["colmo de bambu (parede 3 mm)"]["passosSobrepostos"]


def test_ate_o_LAMINADO_seca_muito_mais_rapido_que_o_macico():
    p = estudo.comparar_preparo_da_materia_prima()["pecas"]
    assert (p["bambu laminado (ripa 6 mm)"]["vezesMaisLentoQueOMaisRapido"]
            < 0.1 * p["cabo de eucalipto (maciço 32 mm)"]["vezesMaisLentoQueOMaisRapido"])


def test_a_analise_ambiental_declara_o_IMPEDIMENTO_da_especie():
    """Bambu alastrante vira invasor; escolher espécie errada cria o problema que
    se queria resolver."""
    imp = " ".join(estudo.AMBIENTE_E_FORNECIMENTO["bambu-colmo"]["impedimentos"])
    assert "Phyllostachys" in imp and "invasor" in imp
    assert "licenciamento" in imp
    assert "efluente" in imp or "boro" in imp


def test_a_analise_de_fornecimento_separa_MATERIA_PRIMA_de_CADEIA():
    """Matéria-prima abundante e cadeia imatura é o mesmo padrão da lignina."""
    forn = " ".join(estudo.AMBIENTE_E_FORNECIMENTO["bambu-colmo"]["fornecimento"])
    assert "CADEIA IMATURA" in forn
    assert "cadeia industrial madura" in forn


def test_toda_analise_carrega_a_MARCA_de_que_nao_e_estudo():
    for bloco in estudo.AMBIENTE_E_FORNECIMENTO.values():
        assert "NÃO ESTUDO" in bloco["marca"]


def test_o_BAMBU_NAO_ACEITA_a_mesma_fixacao_do_eucalipto():
    """Colmo é oco com 3 mm de parede e racha na fibra; parafuso auto-atarraxante
    cunha as fibras. É o mesmo esmagamento de parede que motivou a parede mínima,
    agora aparecendo na junta."""
    f = estudo.FIXACAO_E_INTEMPERISMO["parafuso"]
    assert "NÃO aceita" in f["veredito"]
    assert len(f["solucoesConhecidas"]) >= 4
    assert "NÓ" in " ".join(f["solucoesConhecidas"])
    assert "obrigatório" in f["custoDisso"]


def test_sol_e_tempo_dao_EMPATE_e_nao_vantagem():
    """UV degrada lignina nos dois; não inventar vantagem onde não há."""
    assert "empate" in estudo.FIXACAO_E_INTEMPERISMO["sol_e_tempo"]["veredito"]


def test_a_resposta_sobre_RESINA_separa_nao_precisa_de_nao_pode():
    r = estudo.FIXACAO_E_INTEMPERISMO["resina"]
    assert "não PRECISA estruturalmente" in r["resposta"]
    assert r["ondeEla_AJUDA"] and r["ondeElaNAO_PODE"]


def test_a_ressalva_do_EPOXI_esta_declarada():
    """'Base água' não torna o epóxi automaticamente a opção limpa: o não curado
    é sensibilizante de contato."""
    assert "sensibilizante" in " ".join(estudo.FIXACAO_E_INTEMPERISMO["resina"]["ondeElaNAO_PODE"])


def test_selar_REDUZ_mas_NAO_ELIMINA_a_rachadura():
    """Bambu também racha por gradiente interno e tensão de crescimento."""
    assert "NÃO elimina" in " ".join(estudo.FIXACAO_E_INTEMPERISMO["resina"]["ondeEla_AJUDA"])


def test_o_BAMBU_OCO_NAO_VERGA_MAIS_que_o_eucalipto_macico():
    """A pergunta do usuário, medida: tubo põe material longe do centro, onde ele
    trabalha, e os 5 mm a mais de diâmetro compensam o vazio com folga."""
    v = estudo.avaliar_variantes(medida=True)["variantes"]["bambu-selecionado"]
    assert v["rigidezRelativa"] > 1.0
    assert v["flechaRelativa"] < 1.0
    assert v["vergaMenosQueOEucalipto"]


def test_o_OCO_so_funciona_por_causa_do_DIAMETRO():
    """A 34 mm o mesmo bambu fica 21% menos rígido. A desconfiança estava certa:
    o que salva é o diâmetro, não o material."""
    from laboratorio.estudos.cabo_de_pa import rigidez_relativa
    from laboratorio.viga import secao_tubular

    E = estudo.MATERIAIS["bambu-colmo"]["modulo_pa"]
    assert rigidez_relativa(secao_tubular(0.037, 0.003), E) > 1.0
    assert rigidez_relativa(secao_tubular(0.034, 0.003), E) < 0.85


def test_a_RIGIDEZ_como_criterio_REPROVOU_uma_variante_que_passava():
    """Cabo que não quebra mas balança demais é cabo ruim, e nada media isso."""
    v = estudo.avaliar_variantes(medida=True)["variantes"]
    assert v["igualitaria-40mm"]["empataOuSupera"]
    assert not v["igualitaria-40mm"]["vergaMenosQueOEucalipto"]


def test_o_estudo_DIZ_por_que_a_rigidez_entrou_tarde():
    d = estudo.avaliar_variantes()
    assert "o portão só olhava resistência" in d["porQueRigidezEntrou"]


def test_o_diametro_do_bambu_se_SELECIONA_e_nao_se_usina():
    g = estudo.GEOMETRIA_NA_PRATICA["diametro"]
    assert "SELECIONA" in g["veredito"]
    assert "gabarito" in " ".join(g["como"])


def test_NAO_SE_LIXA_a_superficie_externa_do_colmo():
    """A resistência é graduada: as fibras mais densas estão na casca."""
    assert "GRADUADA" in estudo.GEOMETRIA_NA_PRATICA["diametro"]["oQueNAOfazer"]


def test_o_projeto_tem_de_tolerar_FAIXA_e_nao_medida():
    g = estudo.GEOMETRIA_NA_PRATICA["diametro"]
    assert "FAIXA e não medida" in g["consequenciaDeProjeto"]
    assert "não inclui o rendimento da seleção" in g["custoNaoContabilizado"]


def test_o_no_incomoda_mas_e_ESTRUTURALMENTE_BOM():
    n = estudo.GEOMETRIA_NA_PRATICA["nos"]
    assert "resiste a rachar" in n["eOnoEBOM"]
    assert "SÓ o colar externo" in " ".join(n["solucoes"])


def test_PREENCHER_NAO_serve_para_rigidez():
    """O material do centro não trabalha em flexão: espuma é peso por nada."""
    r = estudo.PREENCHIMENTO["paraRigidez"]
    assert r["veredito"] == "não serve"
    assert "quarta potência" in r["porQue"]
    assert r["numeros"]["espuma PU 40 kg/m³"]["rigidez"] == "+0,13%"


def test_aumentar_o_DIAMETRO_e_melhor_que_encher():
    assert "3 mm no diâmetro" in estudo.PREENCHIMENTO["paraRigidez"]["alternativaMelhor"]


def test_PREENCHER_A_PONTA_serve_contra_AMASSAMENTO():
    """É o modo de falha real, e converge na bucha que já estava recomendada."""
    a = estudo.PREENCHIMENTO["paraAmassamento"]
    assert "só as pontas" in a["ondeEncher"]
    assert "bucha da ponta" in a["eOMesmoQue"]


def test_NAO_encher_inteiro_e_selar():
    """Água que entra num tubo cheio e fechado não sai, e apodrece por dentro."""
    assert "apodrece por dentro" in estudo.PREENCHIMENTO["oQueNAOfazer"]


def test_a_analise_de_preenchimento_diz_o_que_NAO_foi_calculado():
    assert "NÃO foi calculada" in estudo.PREENCHIMENTO["marca"]


def test_a_busca_de_FORNECEDOR_revelou_o_descasamento_de_diametro():
    """O mercado de bambu tratado mira construção e vende colmo grosso; o cabo
    precisa da ponta fina. Não falta material, falta canal."""
    f = estudo.FORNECEDORES
    assert "13 a 14 cm" in f["oProblemaQueABuscaRevelou"]
    assert "falta canal" in f["oProblemaQueABuscaRevelou"]


def test_a_especie_do_DIAMETRO_certo_e_tambem_a_AMBIENTALMENTE_segura():
    """Bambusa tuldoides é entouceirante e dá colmo na faixa; asper e giganteus,
    que a indústria trata, são grandes demais."""
    c = estudo.FORNECEDORES["aConvergenciaBoa"]
    assert "tuldoides" in c and "ENTOUCEIRANTE" in c


def test_a_CERTIFICACAO_e_possivel_mas_NAO_estabelecida():
    cert = estudo.FORNECEDORES["certificacao"]
    assert cert["veredito"] == "possível, não estabelecida"
    assert "NÃO foi encontrada nenhuma operação" in cert["detalhe"]


def test_toda_a_lista_carrega_que_NAO_FOI_VERIFICADA():
    """Transformar uma busca em due diligence seria mentir sobre o que se fez."""
    assert "NÃO VERIFICADA" in estudo.FORNECEDORES["marca"]
    assert all(f["url"].startswith("http") for f in estudo.FORNECEDORES["encontrados"])


def test_o_pedido_ao_fornecedor_e_uma_JANELA_e_nao_uma_medida():
    """A dúvida de abandonar o bambu por falta de garantia de diâmetro some quando
    se olha o que de fato é exigido: 43 combinações entre 35 e 45 mm servem."""
    j = estudo.JANELA_DE_COLMO
    assert j["faixaDeDiametro_mm"] == (35, 45)
    assert j["combinacoesQueServem"] > 40
    assert "não requisito" in j["porQueNaoEUmaMedida"]


def test_ATE_O_PIOR_CASO_da_janela_bate_o_eucalipto():
    p = estudo.JANELA_DE_COLMO["piorCasoDaJanela"]
    assert p["massa_kg"] < 0.772 and p["custo"] < 3.09


def test_existe_RESERVA_se_o_colmo_falhar():
    """Bambu laminado é fabricado na medida: sem problema de seleção."""
    assert "NA MEDIDA" in estudo.JANELA_DE_COLMO["seOColmoFalhar"]
    assert len(estudo.JANELA_DE_COLMO["ordemDeAcao"]) == 3


def test_a_PONTA_LIVRE_tambem_precisa_de_cuidado():
    """Lacuna corrigida: o estudo tratava só da ponta que entra na pá. A de cima
    fica aberta, e extremidade livre é onde a rachadura começa."""
    p = estudo.FIXACAO_E_INTEMPERISMO["ponta_livre"]
    assert "início de trinca" in p["veredito"]
    assert "NÓ" in " ".join(p["solucoes"])
    assert "DOIS cortes" in p["regraQueResume"]


def test_cortar_no_no_e_a_medida_mais_BARATA_do_projeto():
    """Custo zero: é só posicionamento do corte."""
    assert "Custo zero" in " ".join(estudo.FIXACAO_E_INTEMPERISMO["ponta_livre"]["solucoes"])
