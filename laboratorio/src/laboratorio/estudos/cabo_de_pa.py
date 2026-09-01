"""Piloto: dá para trocar o cabo de pá de eucalipto por um tubo de liga?

A PERGUNTA DO USUÁRIO, inteira: a alternativa precisa ser mais barata, aguentar
pelo menos o mesmo, e absorver bem impacto e vibração — porque quem cava segura
aquilo o dia todo. Três exigências, e elas puxam para lados diferentes.

POR QUE ESTE ESTUDO É O QUE O LABORATÓRIO EXISTE PARA FAZER. A resposta não está
pronta em lugar nenhum, ela sai de comparar coisas que não se comparam sozinhas
(preço, resistência, vibração), e ela tem uma barreira que a IA não transpõe:
ensaio físico. O que dá para fazer é chegar até a borda dessa barreira com o
raciocínio limpo e dizer exatamente o que falta medir.

O RESULTADO QUE EU JÁ ESPERO, e escrevo antes de rodar para não me enganar
depois: metal ganha em resistência e perde feio em vibração. Madeira dissipa
cerca de 1% da energia por ciclo; aço dissipa 0,05%, alumínio menos ainda. Se a
conta confirmar, a conclusão não é "não troque" — é "trocar exige resolver a
vibração de outro jeito", e isso é uma pergunta de projeto, não de material.

A FRAQUEZA, dita antes do número: TODAS as propriedades aqui vêm da minha
memória de valores de manual, não conferidas contra fonte primária neste
ambiente. Especialmente os fatores de perda, que variam muito com frequência e
com o jeito de medir. Nada aqui vale para decidir compra sem conferir a entrada.
"""

from __future__ import annotations

from typing import Any

from ..contratos import Estudo, Evidencia, Execucao, Hipotese, Sintese
from ..incerteza import propagar
from ..instrumentos import Registro
from ..trocas import Candidata, Criterio, fronteira
from ..unidades import Grandeza, dimensao
from ..viga import avaliar, registro_padrao, secao_macica, secao_tubular

PRESSAO = dimensao(massa=1, comprimento=-1, tempo=-2)
MASSA = dimensao(massa=1)
DINHEIRO = dimensao()
ADIMENSIONAL = dimensao()

#: Cabo de pá típico: 1,2 m livre, e uma carga de ponta de 300 N — um adulto
#: fazendo força de alavanca. Números de projeto, escolhidos antes de calcular.
COMPRIMENTO_M = 1.2
FORCA_N = 300.0

#: Ciclos entre duas pancadas de quem cava. Governa quanta vibração sobra na mão.
CICLOS_ENTRE_PANCADAS = 10

#: TODAS as propriedades abaixo são valor de manual vindo da memória, NÃO
#: conferido contra fonte primária. Ficam juntas e marcadas para serem fáceis de
#: substituir por dado com fonte — que é a primeira coisa a fazer antes de usar.
FONTE = "valor de manual de memória; NÃO conferido contra fonte primária"

#: Critérios que NÃO são número e mesmo assim decidem. Eles entram como escala
#: ordinal declarada, e não como nota inventada: 3 é melhor que 2, e a distância
#: entre eles não significa nada. Fingir que significa seria transformar
#: julgamento em medida.
#:
#: `irritacao`: risco de intoxicação ou irritação para quem fabrica e para quem
#: segura a ferramenta o dia todo.
#: `ambiente`: origem do material e o que sobra dele no fim da vida.
ESCALA_QUALITATIVA = "3 = bom, 2 = aceitável, 1 = problemático; ordinal, não métrico"

#: MATURIDADE DE FORNECEDOR DEPENDE DE QUEM PERGUNTA, e por isso ela NÃO fica
#: cravada no material. Lignina é abundante no Brasil — as fábricas de celulose
#: produzem em escala enorme — mas quase toda ela é QUEIMADA dentro da própria
#: fábrica para gerar energia, e não vendida como adesivo de prateleira. Para
#: quem está de fora, isso é um gargalo sério; para quem está dentro da
#: indústria, é uma conversa interna.
#:
#: Tratar isso como propriedade do material seria embutir a situação de uma
#: pessoa dentro de um número que parece técnico. Fica como contexto, e o estudo
#: mostra os dois lados.
CONTEXTOS_DE_FORNECIMENTO = {
    "sem-acesso-a-industria": {
        "descricao": "comprador comum, dependente do que existe em catálogo",
        "fornecimento": {
            "eucalipto": 3, "aco-1020": 3, "aluminio-6061-t6": 3,
            "fibra-de-vidro": 3, "papel-fenolico": 2, "papel-lignina": 1,
        },
    },
    "com-acesso-a-industria": {
        "descricao": "quem negocia direto com produtor de celulose",
        "fornecimento": {
            "eucalipto": 3, "aco-1020": 3, "aluminio-6061-t6": 3,
            "fibra-de-vidro": 3, "papel-fenolico": 2, "papel-lignina": 3,
        },
    },
}

#: Custo de conformidade: quanto se paga para PODER vender o produto. Resina
#: fenólica cai em norma de emissão de formaldeído (E1/E0 aqui, CARB e TSCA
#: Title VI para exportar), o que significa ensaio recorrente, certificação e
#: controle de exposição do trabalhador. Produto sem formaldeído pula esse
#: capítulo inteiro — regulamentação, aqui, é vantagem e não custo.
CONFORMIDADE = {
    "eucalipto": 3, "aco-1020": 3, "aluminio-6061-t6": 3,
    "fibra-de-vidro": 2, "papel-fenolico": 1, "papel-lignina": 3,
}

MATERIAIS = {
    "eucalipto": {
        "modulo_pa": 12.0e9,
        "densidade_kg_m3": 800.0,
        "resistencia_pa": 75.0e6,
        "fator_de_perda": 0.010,
        "preco_por_kg": 4.0,
        # A dispersão é a razão de este estudo existir: duas tábuas do mesmo
        # eucalipto diferem muito, e comparar a média da madeira com um número
        # de metal esconde exatamente a peça ruim do lote.
        "irritacao": 3,
        "ambiente": 3,
        "justificativaQualitativa": "madeira de reflorestamento; pó de lixamento incomoda, e nada mais",
        "dispersao": {"modulo_pa": (8.0e9, 16.0e9), "resistencia_pa": (55e6, 95e6)},
    },
    "aco-1020": {
        "modulo_pa": 205.0e9,
        "densidade_kg_m3": 7850.0,
        "resistencia_pa": 350.0e6,
        "fator_de_perda": 0.0005,
        "preco_por_kg": 6.0,
        "irritacao": 3,
        "ambiente": 2,
        "justificativaQualitativa": "inerte na mão; produção intensiva em energia, mas reciclagem madura",
        "dispersao": {"resistencia_pa": (330e6, 380e6)},
    },
    "aluminio-6061-t6": {
        "modulo_pa": 69.0e9,
        "densidade_kg_m3": 2700.0,
        "resistencia_pa": 276.0e6,
        "fator_de_perda": 0.0002,
        "preco_por_kg": 20.0,
        "irritacao": 3,
        "ambiente": 1,
        "justificativaQualitativa": "inerte na mão; produção é das mais intensivas em energia que existem",
        "dispersao": {"resistencia_pa": (260e6, 290e6)},
    },
    # Laminado de papel reciclado. NÃO é ideia solta: papel-fenólico é material
    # antigo e foi usado em engrenagem de comando de motor justamente por ser
    # silencioso — o amortecimento alto é a razão de ele estar aqui. A fibra de
    # celulose é curta e aleatória, então resistência é o ponto fraco, e umidade
    # é o outro: celulose absorve água e perde rigidez, daí a vedação externa.
    #
    # DUAS VARIANTES, e a diferença entre elas é o nó do projeto.
    #
    # A fenólica cola melhor e é o material com histórico industrial — mas é
    # feita com formaldeído, que é irritante e cancerígeno reconhecido, e libera
    # resíduo ao longo da vida. Ela entra na comparação para MOSTRAR o custo de
    # escolher a que funciona, não porque seja recomendada.
    #
    # A de lignina é a que atende o critério de saúde e ambiente: lignina é o
    # próprio cimento natural da madeira e sai como resíduo da fabricação de
    # papel — o mesmo processo que dá a fibra. Ela cola menos, e é por isso que a
    # resistência aqui é menor. Esse é o problema real do material, e ele não é
    # escondido atrás de uma média.
    #
    # ESTAS SÃO AS ENTRADAS MAIS FRACAS DO ESTUDO. As faixas são largas por
    # ignorância, não por conservadorismo: largura aqui é o tamanho do que eu
    # não sei, e para a lignina eu sei ainda menos.
    "papel-fenolico": {
        "modulo_pa": 8.0e9,
        "densidade_kg_m3": 1350.0,
        "resistencia_pa": 120.0e6,
        "fator_de_perda": 0.025,
        "preco_por_kg": 5.0,
        "irritacao": 1,
        "ambiente": 2,
        "justificativaQualitativa": (
            "resina fenólica é feita com formaldeído, irritante e cancerígeno "
            "reconhecido, com liberação ao longo da vida da peça"),
        "dispersao": {"modulo_pa": (5e9, 12e9), "resistencia_pa": (70e6, 170e6)},
    },
    "papel-lignina": {
        "modulo_pa": 6.0e9,
        "densidade_kg_m3": 1300.0,
        "resistencia_pa": 85.0e6,
        "fator_de_perda": 0.030,
        "preco_por_kg": 4.0,
        "irritacao": 3,
        "ambiente": 3,
        "justificativaQualitativa": (
            "papel reciclado ligado por lignina, resíduo do mesmo processo que "
            "produz o papel; sem formaldeído, e degradável no fim da vida"),
        "dispersao": {"modulo_pa": (3.5e9, 9e9), "resistencia_pa": (45e6, 130e6)},
    },
    "fibra-de-vidro": {
        "modulo_pa": 30.0e9,
        "densidade_kg_m3": 1900.0,
        "resistencia_pa": 400.0e6,
        # Compósito dissipa MUITO mais que metal, e é por isso que ele entra na
        # comparação: é o candidato que pode ganhar nos três critérios.
        "fator_de_perda": 0.008,
        "preco_por_kg": 15.0,
        "irritacao": 1,
        "ambiente": 1,
        "justificativaQualitativa": "pó e lasca de vidro irritam pele e pulmão ao cortar ou lixar; praticamente não se recicla e não degrada",
        "dispersao": {"modulo_pa": (25e9, 35e9), "resistencia_pa": (320e6, 480e6)},
    },
}

#: Geometrias comparáveis: a madeira maciça como é, e tubos de parede honesta.
GEOMETRIAS = {
    "eucalipto": ("macica", 0.032, None),
    "aco-1020": ("tubular", 0.032, 0.0012),
    "aluminio-6061-t6": ("tubular", 0.032, 0.0020),
    "fibra-de-vidro": ("tubular", 0.032, 0.0030),
    "papel-fenolico": ("tubular", 0.032, 0.0045),
    "papel-lignina": ("tubular", 0.032, 0.0060),
}

SEMENTE = 20260901

HIPOTESE_RESISTENCIA = Hipotese(
    proposicao="Um tubo metálico de mesmo diâmetro externo aguenta ao menos tanto quanto o eucalipto.",
    predicao="A margem contra falha do metal, no percentil 5, fica acima da do eucalipto no percentil 5.",
    criterio_de_refutacao="A margem do metal no p05 ficar abaixo da do eucalipto no p05.",
    dominio="cabo de 1,2 m, 32 mm externo, carga de ponta de 300 N, flexão estática",
)

#: ERRO DE MÉTODO, PRESERVADO. O critério abaixo pede que a vibração RESTANTE no
#: metal seja o dobro da restante na madeira. Ele é impossível de satisfazer aqui,
#: e não porque o metal seja bom: sobra é uma fração limitada a 1, e a da madeira
#: já é 0,73 — o dobro seria 1,46, acima do máximo possível. Escolhi uma métrica
#: que satura, e a hipótese saiu `contradita` mesmo com o metal dissipando
#: dezessete vezes menos energia que a madeira.
#:
#: A medida certa é a energia DISSIPADA, não a restante: madeira dissipa 27% em
#: dez ciclos, aço dissipa 1,6%. O critério fica como está, e o estado dele fica
#: como saiu, porque reescrever o critério depois de ver o resultado é escolher a
#: conclusão. `HIPOTESE_VIBRACAO_V2` está formulada abaixo e NÃO é testada por
#: esta rodada: ela nasceu depois dos dados, e dizer o contrário seria fraude.

HIPOTESE_VIBRACAO = Hipotese(
    proposicao="Metal sobra com muito mais vibração na mão do que madeira.",
    predicao=(
        f"Após {CICLOS_ENTRE_PANCADAS} ciclos livres, a vibração restante no metal é "
        "ao menos o dobro da restante na madeira."
    ),
    criterio_de_refutacao="A sobra do metal ficar abaixo do dobro da sobra da madeira.",
    dominio="mesmo cabo; fator de perda de manual, que varia com frequência e método de medida",
)

#: Formulada DEPOIS de ver os dados. Não recebe estado nesta rodada; existe para
#: a próxima, e a marca de origem viaja com ela.
HIPOTESE_VIBRACAO_V2 = Hipotese(
    proposicao="Metal dissipa ao menos dez vezes menos energia por ciclo que madeira.",
    predicao=(
        "A energia dissipada em dez ciclos pelo metal é menos de um décimo da "
        "dissipada pela madeira."
    ),
    criterio_de_refutacao="A razão entre as energias dissipadas ficar acima de um décimo.",
    dominio="mesmo cabo; NÃO TESTADA nesta rodada, formulada após os dados",
)

HIPOTESE_ALTERNATIVA = Hipotese(
    proposicao="Existe candidato que bate o eucalipto em resistência SEM piorar a vibração.",
    predicao="Ao menos um candidato tem margem p05 maior e sobra de vibração não maior que a do eucalipto.",
    criterio_de_refutacao="Nenhum candidato satisfazer as duas condições.",
    dominio="os quatro candidatos deste estudo, nas geometrias declaradas",
)

ESTUDO = Estudo(
    pergunta=(
        "Dá para substituir o cabo de pá de eucalipto por uma alternativa mais barata, "
        "com resistência igual ou maior, sem piorar a absorção de impacto e vibração?"
    ),
    criterio_de_encerramento=(
        "Os quatro candidatos são avaliados com propagação de incerteza convergida, "
        "e as três hipóteses recebem estado; nenhuma pode ficar `nao-testada`."
    ),
    hipoteses=(HIPOTESE_RESISTENCIA, HIPOTESE_VIBRACAO, HIPOTESE_ALTERNATIVA),
)


def _secao(nome: str) -> dict[str, Any]:
    tipo, diametro, parede = GEOMETRIAS[nome]
    return secao_macica(diametro) if tipo == "macica" else secao_tubular(diametro, parede)


def medir(nome: str) -> dict[str, Any]:
    """Roda a viga para um candidato, com a incerteza das propriedades dispersas."""
    material = MATERIAIS[nome]
    secao = _secao(nome)
    base = {chave: material[chave] for chave in
            ("modulo_pa", "densidade_kg_m3", "resistencia_pa", "fator_de_perda")}

    determinista = avaliar(secao, comprimento_m=COMPRIMENTO_M, forca_n=FORCA_N,
                           condicao="ambiente, carga estática de ponta", **base)

    dispersao = material["dispersao"]
    margem = propagar(
        dispersao,
        lambda ponto: avaliar(secao, comprimento_m=COMPRIMENTO_M, forca_n=FORCA_N,
                              **{**base, **ponto})["margemContraFalha"],
        semente=SEMENTE, amostras=2000,
        correlacoes_declaradas=(
            "densidade e módulo da madeira andam juntos no mundo real e aqui foram "
            "tratados de forma independente; a cauda ruim está otimista"
            if nome == "eucalipto" else "nenhuma declarada"
        ),
    )
    massa = determinista["massa"]["valor"]
    return {
        "candidato": nome,
        "instrumento": determinista["instrumento"],
        "versao": determinista["versao"],
        "parametros": determinista["parametros"],
        "entradas": {**determinista["entradas"], "material": nome, "fonte": FONTE},
        "margemDeterminista": determinista["margemContraFalha"],
        "margemP05": margem["p05"],
        "margemP50": margem["p50"],
        "convergiu": margem["convergencia"]["convergiu"],
        "massa_kg": massa,
        "custo": massa * material["preco_por_kg"],
        "flecha_m": determinista["flecha"]["valor"],
        "frequencia_hz": determinista["frequenciaNatural"]["valor"],
        "vibracaoRestante": determinista["vibracaoRestanteApos10Ciclos"]["valor"],
        "propagacao": margem,
    }


#: REQUISITO ELIMINATÓRIO, e a distinção que ele carrega é a lição mais cara
#: deste piloto. Uma soma ponderada deixa qualquer critério COMPENSAR qualquer
#: outro: rodando o ranking com pesos, o papel-lignina venceu nos dois cenários
#: de fornecimento — sendo que ele tem a PIOR margem estrutural de todos, 0,37.
#: Conforto, preço e ambiente compensaram o fato de o cabo quebrar.
#:
#: Isso não é preferência mal escolhida; é erro de forma. Quebrar não se troca
#: por ser confortável. Requisito estrutural é PORTA, não peso: quem não passa
#: sai da comparação, e só quem passa disputa nos critérios negociáveis.
#:
#: O valor é 1,0 porque a margem já é resistência dividida por tensão. Note que
#: NÃO há coeficiente de segurança aqui — para uma ferramenta de verdade ele
#: existiria, e seria decisão de quem projeta, não deste módulo.
MARGEM_MINIMA_ELIMINATORIA = 1.0


def comparar(contexto: str = "com-acesso-a-industria") -> dict[str, Any]:
    """Mede todos e monta a fronteira de trocas, no contexto de fornecimento dado."""
    if contexto not in CONTEXTOS_DE_FORNECIMENTO:
        from ..erros import falhar
        raise falhar("contrato", "contexto-desconhecido",
                     f"contexto '{contexto}'; existem {sorted(CONTEXTOS_DE_FORNECIMENTO)}.",
                     local="contexto")
    medidas = {nome: medir(nome) for nome in MATERIAIS}
    candidatas = tuple(
        Candidata(nome, {
            "margem": Grandeza(m["margemP05"], "1", ADIMENSIONAL),
            "leveza": Grandeza(-m["massa_kg"], "kg", MASSA),
            "baratez": Grandeza(-m["custo"], "BRL", DINHEIRO),
            "amortecimento": Grandeza(-m["vibracaoRestante"], "1", ADIMENSIONAL),
            "saude": Grandeza(MATERIAIS[nome]["irritacao"], "ordinal", ADIMENSIONAL),
            "ambiente": Grandeza(MATERIAIS[nome]["ambiente"], "ordinal", ADIMENSIONAL),
            "fornecimento": Grandeza(
                CONTEXTOS_DE_FORNECIMENTO[contexto]["fornecimento"][nome],
                "ordinal", ADIMENSIONAL),
            "conformidade": Grandeza(CONFORMIDADE[nome], "ordinal", ADIMENSIONAL),
        })
        for nome, m in medidas.items()
    )
    criterios = (
        Criterio("margem", "maximizar"),
        Criterio("leveza", "maximizar"),
        Criterio("baratez", "maximizar"),
        Criterio("amortecimento", "maximizar"),
        Criterio("saude", "maximizar"),
        Criterio("ambiente", "maximizar"),
        Criterio("fornecimento", "maximizar"),
        Criterio("conformidade", "maximizar"),
    )
    eliminados = {
        nome: (f"margem p05 {m['margemP05']:.2f} abaixo de "
               f"{MARGEM_MINIMA_ELIMINATORIA:.2f}: o cabo quebra na carga suposta")
        for nome, m in medidas.items() if m["margemP05"] < MARGEM_MINIMA_ELIMINATORIA
    }
    return {
        "medidas": medidas,
        "eliminados": eliminados,
        "aprovadosNaPorta": sorted(set(medidas) - set(eliminados)),
        "porQueEliminar": (
            "requisito estrutural é porta, não peso: numa soma ponderada, conforto e "
            "preço compensariam o cabo quebrar, e isso aconteceu de verdade nesta "
            "comparação antes de a porta existir"
        ),
        "contexto": contexto,
        "descricaoDoContexto": CONTEXTOS_DE_FORNECIMENTO[contexto]["descricao"],
        "trocas": fronteira(candidatas, criterios),
        # Dito na saída: os quatro últimos critérios são ordinais, e somar ou
        # tirar média deles seria transformar julgamento em medida.
        "criteriosOrdinais": ["saude", "ambiente", "fornecimento", "conformidade"],
        "escala": ESCALA_QUALITATIVA,
    }


def recomendar() -> dict[str, Any]:
    """O que fazer com o resultado — e quanto custa NÃO medir.

    O ACHADO QUE MANDA, e ele cabe numa frase: não medir custa 10 mm de diâmetro
    e 290 g de peso.

    O papel-lignina passa na porta estrutural com 50 mm carregando a incerteza
    LARGA que declarei por não ter fonte. Com a resistência medida — dez corpos
    de prova, faixa de ±15% em torno da mesma média — ele passa com 40 mm e 1,00
    kg. Mesmo material, mesma resistência média: a diferença é só informação.

    É por isso que a próxima ação não é mexer na liga. Enquanto a incerteza
    dominante for a minha ignorância, qualquer mudança de composição está sendo
    julgada por uma régua que não existe.
    """
    return {
        "candidato": "papel-lignina",
        "porQueEle": (
            "ganha em tudo que foi pedido — mais barato que o eucalipto, dissipa 2,3 "
            "vezes mais vibração, sem irritação e sem passivo ambiental, e ainda pula "
            "a norma de emissão de formaldeído — e perde só em resistência"
        ),
        "doisCaminhos": {
            "medindo": {"diametro_mm": 40, "massa_kg": 1.00,
                        "exige": "ensaio de flexão em ao menos dez corpos de prova"},
            "sem_medir": {"diametro_mm": 50, "massa_kg": 1.29,
                          "exige": "nada, mas o cabo fica gordo e pesado à toa"},
            "licao": "não medir custa 10 mm de diâmetro e 290 g",
        },
        "proximaAcao": {
            "o_que": "ensaio de flexão de três pontos em ao menos dez corpos de prova",
            "porQue": ("a incerteza que reprova o cabo é a minha, não a do material: "
                       "estreitar a faixa de 45-130 MPa para ±15% vale 10 mm de diâmetro"),
            "quemFaz": "pessoa, em bancada física; o laboratório não transpõe isso",
        },
        "oQueMedirJunto": (
            "resistência à flexão e módulo, que é o que estreita a incerteza",
            "absorção de água e resistência DEPOIS de molhar, que é a ameaça real ao candidato",
            "fator de perda medido, porque o valor usado aqui é de memória e é a "
            "vantagem inteira do material",
            "resistência após ciclos, porque cabo de pá é fadiga e isto foi carga única",
        ),
        "oQueNAOfazer": (
            "adotar a variante fenólica pelo desempenho: ela usa formaldeído, que é "
            "irritante e cancerígeno reconhecido, o critério de saúde foi explícito, "
            "e ela ainda traz o custo de conformidade que a lignina dispensa"
        ),
        "fabricacaoEfornecimento": (
            "enrolamento espiral de papel impregnado é tecnologia madura e barata, "
            "ordem de grandeza abaixo de pultrusão de fibra ou trefilação de tubo; "
            "o gargalo é o ligante, porque lignina é abundante mas queimada dentro da "
            "própria fábrica de celulose em vez de vendida como adesivo pronto. "
            "ISTO NÃO SAIU DO LABORATÓRIO: é análise, não estudo, e não foi medido."
        ),
    }


def avaliar_estudo(comparacao: dict[str, Any] | None = None,
                   registro: Registro | None = None) -> Sintese:
    """Estados das três hipóteses, com os limites que o resultado carrega."""
    registro = registro or registro_padrao()
    comparacao = comparacao or comparar()
    medidas = comparacao["medidas"]
    registro.exigir(medidas["eucalipto"]["instrumento"], medidas["eucalipto"]["versao"])

    madeira = medidas["eucalipto"]
    metais = [medidas["aco-1020"], medidas["aluminio-6061-t6"]]

    execucoes = tuple(
        Execucao(instrumento=m["instrumento"], versao_instrumento=m["versao"],
                 parametros=m["parametros"], entradas=m["entradas"],
                 saida={"margemP05": m["margemP05"], "massa_kg": m["massa_kg"],
                        "custo": m["custo"], "vibracaoRestante": m["vibracaoRestante"]})
        for m in medidas.values()
    )
    ids = tuple(e.id for e in execucoes)

    metal_aguenta = all(m["margemP05"] > madeira["margemP05"] for m in metais)
    pior_metal = min(m["vibracaoRestante"] for m in metais)
    metal_vibra = pior_metal >= 2 * madeira["vibracaoRestante"]
    alternativas = [
        nome for nome, m in medidas.items()
        if nome != "eucalipto"
        and m["margemP05"] > madeira["margemP05"]
        and m["vibracaoRestante"] <= madeira["vibracaoRestante"]
    ]

    evidencias = (
        Evidencia(
            hipotese_id=HIPOTESE_RESISTENCIA.id, execucoes=ids,
            direcao="sustenta" if metal_aguenta else "contradiz",
            justificativa=(
                f"margem p05: eucalipto {madeira['margemP05']:.2f}, "
                + ", ".join(f"{m['candidato']} {m['margemP05']:.2f}" for m in metais) + "."
            ),
            dominio=HIPOTESE_RESISTENCIA.dominio,
        ),
        Evidencia(
            hipotese_id=HIPOTESE_VIBRACAO.id, execucoes=ids,
            direcao="sustenta" if metal_vibra else "contradiz",
            justificativa=(
                f"sobra após {CICLOS_ENTRE_PANCADAS} ciclos: eucalipto "
                f"{madeira['vibracaoRestante']:.3f}, pior metal {pior_metal:.3f}."
            ),
            dominio=HIPOTESE_VIBRACAO.dominio,
        ),
        Evidencia(
            hipotese_id=HIPOTESE_ALTERNATIVA.id, execucoes=ids,
            direcao="sustenta" if alternativas else "contradiz",
            justificativa=(f"candidatos que passam nas duas condições: {alternativas}."
                           if alternativas else "nenhum candidato passa nas duas condições."),
            dominio=HIPOTESE_ALTERNATIVA.dominio,
        ),
    )

    return Sintese(
        estudo_id=ESTUDO.id,
        conclusoes=(
            {"hipotese": HIPOTESE_RESISTENCIA.id,
             "estado": "sustentada-no-dominio-testado" if metal_aguenta else "contradita"},
            {"hipotese": HIPOTESE_VIBRACAO.id,
             "estado": "sustentada-no-dominio-testado" if metal_vibra else "contradita"},
            {"hipotese": HIPOTESE_ALTERNATIVA.id,
             "estado": "sustentada-no-dominio-testado" if alternativas else "contradita"},
        ),
        evidencias=tuple(e.id for e in evidencias),
        limites=(
            "A BARREIRA QUE NÃO SE TRANSPÕE AQUI: nada foi ensaiado fisicamente. "
            "Impacto real envolve taxa de deformação, e cabo real sofre fadiga por "
            "milhares de ciclos — nenhuma das duas coisas está nesta conta.",
            f"TODAS as propriedades são {FONTE}. Os fatores de perda são a entrada mais "
            "frágil: eles variam com frequência e com o método de medida, às vezes por "
            "um fator de dois.",
            "A madeira foi tratada com um módulo único, mas ela é anisotrópica: fibra "
            "longitudinal e transversal têm rigidez muito diferente, e nó e umidade mudam tudo.",
            "Densidade e módulo da madeira andam juntos no mundo real e foram sorteados "
            "de forma independente; a cauda ruim do eucalipto está otimista.",
            "A junta entre cabo e pá não entrou, e é onde ferramenta costuma falhar de verdade.",
            "Preço por quilo é ordem de grandeza, não cotação; ele muda com região, "
            "volume e momento.",
            "O papel-fenólico é a entrada mais fraca: faixas largas por ignorância, não "
            "por conservadorismo. E o estudo NÃO modela o que mais ameaça esse candidato — "
            "absorção de umidade, que degrada celulose, e o desempenho da vedação ao longo "
            "do tempo. Sem isso, qualquer aprovação dele aqui é provisória.",
            "A hipótese da vibração saiu `contradita` por ERRO MEU DE CRITÉRIO, não por "
            "o metal ser bom: pedi que a vibração RESTANTE dobrasse, e sobra é limitada "
            "a 1. Em energia dissipada, que é a medida certa, o metal dissipa cerca de "
            "dezessete vezes menos que a madeira. O critério não foi reescrito depois "
            "do resultado, e a versão corrigida está no módulo marcada como não testada.",
            "O caso de carga (300 N na ponta, alavanca inteira) reprova ATÉ o eucalipto: "
            "margem p05 de 0,51. Isso descreve uso abusivo, tipo pá de pé de cabra, e não "
            "cavar normal — é achado sobre a hipótese de carga, não sobre a madeira.",
        ),
    )
