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

import math
from typing import Any

from ..contratos import Estudo, Evidencia, Execucao, Hipotese, Sintese
from ..ensaio import efeito_de_escala
from ..incerteza import propagar
from ..secagem import comparar_preparo
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

#: FONTE PRIMÁRIA DE VERDADE, e a única deste estudo. O Wood Handbook do Forest
#: Products Laboratory (USDA Forest Service, FPL-GTR-190) é domínio público e é a
#: referência canônica de propriedade mecânica de madeira. Baixado e lido neste
#: ambiente, Tabela 5-5a, páginas 5-19 e 5-23 do documento.
#:
#: E A CORREÇÃO QUE ELE IMPÔS: eu tinha usado 75 MPa para o eucalipto, que é
#: aproximadamente o valor da madeira VERDE. Cabo de pá é madeira SECA, e a 12% de
#: umidade o jarrah dá 111,7 MPa e o karri 139 MPa. Eu havia SUBESTIMADO o
#: concorrente em cerca de 50%, o que tornava o candidato melhor do que ele é.
#: A SEGUNDA FONTE PRIMÁRIA, e ela derruba a primeira como referência do problema.
#:
#: O eucalipto do Wood Handbook é jarrah e karri: espécies AUSTRALIANAS. O Brasil
#: não planta isso. Aqui se planta grandis, saligna, urophylla e o híbrido
#: urograndis, que é de longe o mais plantado. Ou seja: o estudo passou o tempo
#: todo tentando bater uma árvore que não é a que está no cabo da pá.
#:
#: O ERRO NÃO FOI DE CÁLCULO, foi de pergunta. Eu peguei a fonte primária que
#: existia em vez da fonte primária que respondia — e fonte boa sobre a coisa
#: errada é pior que fonte fraca sobre a coisa certa, porque ela vem com
#: autoridade.
#:
#: Quem apontou foi uma crítica externa, listando as espécies brasileiras. Ela não
#: trazia dado conferível, mas trazia a pergunta certa.
#: A TERCEIRA FONTE PRIMÁRIA, e a que faltava: o VENCEDOR do estudo era, até
#: aqui, o material pior documentado dele. O concorrente tinha duas fontes medidas
#: e o candidato recomendado rodava com a minha memória — assimetria que trabalha
#: contra a recomendação, e que estava declarada nos limites do dossiê sem ser
#: resolvida.
#:
#: E O DADO MEDIDO CORRIGE MEUS NÚMEROS PARA BAIXO, nos três. Eu usava 170 MPa,
#: 15,0 GPa e 700 kg/m³; o medido dá 136,3 MPa, 13,1 GPa e 740 kg/m³. Ou seja: eu
#: estava 25% otimista na resistência, 15% na rigidez, e ainda subestimava a
#: densidade. Erro de memória com direção — e a direção favorecia o candidato que
#: eu vinha recomendando.
FONTE_BAMBU = (
    "MOTA, I.; AZEVEDO, M.; COELHO, P.; et al. Estudo das propriedades físicas e "
    "mecânicas do bambu brasileiro (Bambusa vulgaris vittata) para aplicação na "
    "construção de sistemas hidráulicos alternativos. Revista de Estudos "
    "Ambientais (REA), v. 19, n. 1, p. 18-26, 2017, UniFOA. Acesso aberto, PDF "
    "lido diretamente nesta sessão. Ensaio em COLMO INTEIRO, que é a condição do "
    "cabo. A faixa larga da dispersão é de Janssen (2000), citada no mesmo artigo "
    "para colmos inteiros: 62 a 170 MPa e 6,0 a 14,0 GPa."
)

FONTE_MADEIRA_BR = (
    "GONÇALVES, F. G.; OLIVEIRA, J. T. S.; et al. Estudo de algumas propriedades "
    "mecânicas da madeira de um híbrido clonal de Eucalyptus urophylla x "
    "Eucalyptus grandis. Revista Árvore, Viçosa-MG, v. 33, n. 3, p. 501-509, 2009. "
    "Acesso aberto, PDF lido diretamente nesta sessão; Tabela 3, madeira seca "
    "corrigida para 12% de umidade."
)

FONTE_MADEIRA = (
    "Wood Handbook — Wood as an Engineering Material, FPL-GTR-190, "
    "USDA Forest Service, Forest Products Laboratory, 2010; Tabela 5-5a "
    "(Jarrah, Eucalyptus marginata, e Karri, Eucalyptus diversicolor, a 12% de umidade). "
    "Domínio público, consultado diretamente."
)

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
            "eucalipto-laminado": 3,
            "sisal-mamona": 2,
            "pinus-elliottii": 3,
            "pinus-comercial": 3,
            "eucalipto-urograndis": 3,
        },
    },
    "com-acesso-a-industria": {
        "descricao": "quem negocia direto com produtor de celulose",
        "fornecimento": {
            "eucalipto": 3, "aco-1020": 3, "aluminio-6061-t6": 3,
            "fibra-de-vidro": 3, "papel-fenolico": 2, "papel-lignina": 3,
            "papel-lignina-curaua": 2,
            "bambu-colmo": 3, "bambu-laminado": 3,
            "eucalipto-laminado": 3,
            "sisal-mamona": 2,
            "pinus-elliottii": 3,
            "pinus-comercial": 3,
            "eucalipto-urograndis": 3,
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
    "papel-lignina-curaua": 3, "bambu-colmo": 3, "bambu-laminado": 3,
    # Fenólica no LVL padrão traz a norma de formaldeído junto.
    "eucalipto-laminado": 2,
    # Sem formaldeído: pula a norma de emissão inteira.
    "sisal-mamona": 3,
    "pinus-elliottii": 3,
    "pinus-comercial": 3,
    "eucalipto-urograndis": 3,
}

MATERIAIS = {
    # ÚNICO material deste estudo com fonte primária: ver FONTE_MADEIRA.
    # Jarrah a 12% de umidade é o mais conservador dos dois eucaliptos tabelados,
    # e por isso é o escolhido como referência: comparar o candidato contra o
    # concorrente mais fraco da família é o teste mais duro para o candidato.
    # O fator de perda vem do mesmo manual, capítulo 5: o decremento logarítmico
    # da madeira vai de 0,02 (seca) a 0,1 (úmida), e o fator de perda é esse
    # valor dividido por pi — de 0,006 a 0,032.
    "eucalipto": {
        "modulo_pa": 13.0e9,
        "densidade_kg_m3": 800.0,
        "resistencia_pa": 111.7e6,
        "fator_de_perda": 0.010,
        "fonte": "FPL-GTR-190",
        "preco_por_kg": 4.0,
        # A dispersão é a razão de este estudo existir: duas tábuas do mesmo
        # eucalipto diferem muito, e comparar a média da madeira com um número
        # de metal esconde exatamente a peça ruim do lote.
        "irritacao": 3,
        "ambiente": 3,
        "justificativaQualitativa": "madeira de reflorestamento; pó de lixamento incomoda, e nada mais",
        # Faixa agora ANCORADA em dado tabelado, e não em palpite: de jarrah
        # (13,0 GPa / 111,7 MPa) a karri (17,9 GPa / 139,0 MPa), ambos a 12%.
        "agua": 2,
        "fabricacao": 3,
        "justificativaAguaEfabricacao": "absorve água e apodrece se não tratada; fabricação é torneamento, trivial",
        "dispersao": {"modulo_pa": (13.0e9, 17.9e9), "resistencia_pa": (111.7e6, 139.0e6)},
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
        "agua": 2,
        "fabricacao": 3,
        "justificativaAguaEfabricacao": "enferruja sem pintura; tubo trefilado é commodity",
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
        "agua": 3,
        "fabricacao": 3,
        "justificativaAguaEfabricacao": "não corrói em uso comum; tubo extrudado é commodity",
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
        "agua": 2,
        "fabricacao": 3,
        "justificativaAguaEfabricacao": "a resina protege razoavelmente; enrolamento espiral é maduro e barato",
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
        "agua": 1,
        "fabricacao": 3,
        "justificativaAguaEfabricacao": "celulose absorve água e a lignina protege menos que a fenólica; vedação externa é obrigatória, e é o ponto fraco do candidato",
        "dispersao": {"modulo_pa": (3.5e9, 9e9), "resistencia_pa": (45e6, 130e6)},
    },
    # A LACUNA TEM NOME: fibra longa e alinhada. Papel dá fibra curta e aleatória,
    # e é isso que trava o laminado em 85 MPa. Acrescentar fibra contínua no
    # sentido do cabo é o caminho conhecido, e há opção que não quebra nenhum dos
    # critérios do usuário — curauá é brasileira e das mais resistentes que
    # existem entre as naturais, com linho, juta e sisal como alternativas.
    #
    # E O PREÇO DISSO, que precisa ser dito junto: fibra rígida e alinhada
    # ENDURECE o compósito, e material mais rígido dissipa menos. Ganhar
    # resistência custa amortecimento — que é a vantagem inteira do candidato.
    # O fator de perda cai de 0,030 para cerca de 0,018.
    #
    # A fabricação também fica mais difícil: alinhar fibra exige enrolamento
    # filamentar ou laminação orientada, e não o enrolamento espiral de papel,
    # que é o que tornava o candidato barato.
    #
    # NÚMEROS DE MEMÓRIA, e mais incertos que todos os outros: este material não
    # existe pronto, é uma composição proposta. A faixa é a mais larga do estudo.
    "papel-lignina-curaua": {
        "modulo_pa": 20.0e9,
        "densidade_kg_m3": 1300.0,
        "resistencia_pa": 180.0e6,
        "fator_de_perda": 0.018,
        "preco_por_kg": 7.0,
        "irritacao": 2,
        "ambiente": 3,
        "agua": 1,
        "fabricacao": 2,
        "justificativaQualitativa": (
            "sem formaldeído e degradável, como a lignina pura; a nota de irritação "
            "cai porque pó de fibra vegetal no processamento é risco respiratório "
            "reconhecido, e exige exaustão"),
        "justificativaAguaEfabricacao": (
            "mais superfície de celulose que o laminado puro, então absorve pelo menos "
            "tanto; alinhar fibra exige enrolamento filamentar, não o espiral barato"),
        "dispersao": {"modulo_pa": (12e9, 28e9), "resistencia_pa": (110e6, 260e6)},
    },
    # O CANDIDATO QUE EU TINHA DEIXADO DE FORA, e o usuário cobrou. Bambu já é um
    # compósito de fibra unidirecional feito pela planta, já vem em forma de TUBO,
    # e tem a maior resistência por quilo de todos os materiais deste estudo —
    # 242.857, acima até da fibra de vidro. Cabo de ferramenta de bambu existe há
    # séculos, o que é evidência de uso que nenhum candidato novo tem.
    #
    # A fabricação é cortar. Não há enrolamento, resina, cura nem alinhamento de
    # fibra: o material já vem pronto e oco, com a fibra no lugar certo.
    #
    # O PREÇO DISSO é a variabilidade: colmo natural varia com espécie, idade,
    # altura no colmo e nó, e o nó é onde ele racha. A faixa aqui é larga por essa
    # razão física, e não só por ignorância minha — e é o caso em que medir tem de
    # virar seleção de lote, não um número só.
    "bambu-colmo": {
        # Medido, colmo inteiro. Ver FONTE_BAMBU, e ver ali por que estes números
        # são MENORES que os que este estudo usou até agora.
        "modulo_pa": 13.089e9,
        "densidade_kg_m3": 740.0,
        "resistencia_pa": 136.33e6,
        "fonte": "REA 19(1):18-26, 2017 (UniFOA) — lido diretamente",
        "fator_de_perda": 0.012,
        "preco_por_kg": 2.0,
        "irritacao": 3,
        "ambiente": 3,
        "agua": 2,
        "fabricacao": 3,
        "justificativaQualitativa": (
            "material natural sem resina nem aditivo; cresce em três a cinco anos e "
            "rebrota da mesma touceira, sem replantio"),
        "justificativaAguaEfabricacao": (
            "absorve umidade e precisa de acabamento, mas menos que celulose solta; "
            "fabricação é cortar o colmo — não há resina, impregnação, enrolamento "
            "nem cura"),
        # PROCESSO, dito inteiro porque a pergunta certa não é "é simples?" e sim
        # "o que exatamente precisa acontecer?". O bambu dispensa tudo o que o
        # laminado de papel exige, e cobra duas coisas próprias.
        "processo": {
            "dispensa": ("resina", "impregnação", "enrolamento", "máquina de laminar",
                         "estufa de cura"),
            "exige": (
                "secagem: semanas ao ar ou dias em estufa — mas o cabo de eucalipto "
                "também seca, então não é custo novo",
                "tratamento contra caruncho: bambu tem amido e é comido por besouro; "
                "sem tratar, o cabo dura de um a três anos. O método padrão é imersão "
                "em bórax e ácido bórico, barato e difundido, mas é um tanque e alguns dias",
            ),
            "riscoDeDurabilidade": (
                "rachadura ao longo da fibra com ciclo de umidade. É o problema real do "
                "bambu, e não a resistência — e este estudo NÃO o modela"),
        },
        # Faixa de Janssen para colmo inteiro, e ela é MAIS LARGA e MAIS BAIXA que
        # a que eu tinha posto de memória. Largura aqui é a variação da planta, que
        # nenhum ensaio reduz: o que se faz com ela é selecionar lote.
        "dispersao": {"modulo_pa": (6.0e9, 14.0e9), "resistencia_pa": (62.0e6, 170.0e6)},
    },
    # Bambu laminado colado: o mesmo material desmontado em ripas e recolado, que
    # é como se faz piso e móvel de bambu no mundo inteiro. Perde resistência por
    # quilo em troca de CONSISTÊNCIA e de geometria livre — some o nó, some a
    # variação de colmo, e dá para fazer a seção que se quiser.
    "bambu-laminado": {
        "modulo_pa": 12.0e9,
        "densidade_kg_m3": 700.0,
        "resistencia_pa": 120.0e6,
        "fator_de_perda": 0.012,
        "preco_por_kg": 8.0,
        "irritacao": 3,
        "ambiente": 3,
        "agua": 2,
        "fabricacao": 3,
        "justificativaQualitativa": (
            "indústria estabelecida no mundo todo para piso e móvel; o adesivo é a "
            "única variável de saúde, e existe versão sem formaldeído"),
        "justificativaAguaEfabricacao": (
            "mesma absorção do colmo; fabricação é laminação de ripas, processo "
            "industrial maduro e sem máquina especial"),
        "processo": {
            "dispensa": ("máquina especial",),
            "exige": (
                "as mesmas secagem e tratamento do colmo",
                "laminação de ripas, que é indústria estabelecida para piso e móvel",
                "adesivo — e aqui a pergunta do formaldeído reaparece, com resposta "
                "conhecida: existe versão sem",
            ),
            "riscoDeDurabilidade": (
                "some a rachadura de colmo e some o nó; em troca, a colagem vira o "
                "ponto de falha, e ela depende do adesivo escolhido"),
        },
        "dispersao": {"modulo_pa": (10e9, 15e9), "resistencia_pa": (100e6, 140e6)},
    },
    # Eucalipto laminado (LVL): a MESMA árvore, fatiada em lâminas finas, seca e
    # recolada. Entra por causa de uma pergunta do usuário — se madeira é boa e o
    # gargalo é secagem, dá para atacar a secagem sem trocar de matéria-prima?
    #
    # A FÍSICA QUE JUSTIFICA: secar é difusão, e o tempo cresce com o QUADRADO da
    # espessura. Um taco de 32 mm e uma lâmina de 2 mm da mesma tora diferem por
    # um fator de cerca de 256. O usuário corrigiu bem o alcance disso: a estufa é
    # carregada com paletes inteiros, não com uma peça, então o ganho não é por
    # peça — é de OCUPAÇÃO da estufa por lote entregue. A estufa gira mais vezes.
    #
    # O QUE SE PAGA: o laminado é mais fraco por quilo que a madeira limpa. LVL é
    # feito de tora comercial inteira, com nó e defeito distribuídos, enquanto os
    # 111,7 MPa do jarrah tabelado vêm de corpo de prova SEM defeito. A média cai.
    #
    # O QUE SE GANHA, e é o ponto que interessa: a DISPERSÃO despenca. O defeito
    # que numa peça maciça é o ponto de quebra vira, no laminado, uma lâmina ruim
    # entre nove boas. Cabo não quebra na média, quebra no pior do lote — então a
    # comparação honesta é no p05, e não no valor nominal.
    #
    # A FRAQUEZA: estes números são de manual de memória, como quase tudo aqui, e
    # LVL de eucalipto varia muito com a classe da tora e com a linha de cola.
    "eucalipto-laminado": {
        "modulo_pa": 14.0e9,
        "densidade_kg_m3": 750.0,
        "resistencia_pa": 85.0e6,
        "fator_de_perda": 0.010,
        "preco_por_kg": 7.0,
        "irritacao": 2,
        "ambiente": 3,
        "justificativaQualitativa": (
            "a madeira em si é inerte; o adesivo é a única variável de saúde, e o "
            "LVL industrial padrão usa resina fenólica — existe versão sem "
            "formaldeído, mas ela não é o que sai da linha por omissão"),
        "agua": 2,
        "fabricacao": 2,
        "justificativaAguaEfabricacao": (
            "mesma absorção da madeira maciça, com a linha de cola como caminho "
            "extra; fabricação exige laminar, secar, encolar e prensar — indústria "
            "madura e forte no Brasil, mas várias etapas a mais que tornear um taco"),
        "processo": {
            "dispensa": ("meses de estufa com a peça na espessura final",),
            "exige": (
                "laminação da tora, que é máquina dedicada",
                "adesivo e prensa quente",
                "usinagem do bloco até o perfil do cabo",
            ),
            "riscoDeDurabilidade": (
                "a linha de cola vira o ponto de falha e o caminho de entrada de "
                "água; delaminação com ciclo de molha e seca é o risco real, e este "
                "estudo NÃO o modela"),
        },
        # Estreita de propósito, e essa estreiteza É o produto do processo.
        "dispersao": {"modulo_pa": (13.0e9, 15.5e9), "resistencia_pa": (78.0e6, 95.0e6)},
        # RESULTADO, e ele é NEGATIVO — fica registrado porque resultado negativo
        # também é resultado. A 32 mm maciço, mesma geometria do cabo atual, o
        # laminado dá margem 0,70 no p05 contra 1,01 do eucalipto maciço: reprova
        # na porta estrutural. A dispersão estreita funcionou como previsto (o p05
        # fica a 8% do determinista, contra a cauda larga da madeira limpa), mas a
        # queda da média foi maior que o ganho de consistência.
        #
        # Ele volta a empatar a 36 mm, ainda dentro do que a mão segura. Só que aí
        # pesa 0,92 kg contra 0,77 kg e custa R$ 6,41 contra R$ 3,09. Ou seja:
        # empata em segurança, perde em peso, e custa o DOBRO do material que veio
        # substituir. A exigência do usuário era ser mais barato, e não é.
        #
        # A CONCLUSÃO HONESTA: o ganho de secagem é real e a física dele se
        # sustenta, mas ele é ganho de LOGÍSTICA, e o preço da colagem come esse
        # ganho e mais um pouco. Laminar eucalipto resolve o gargalo de estufa de
        # quem já tem a estufa; não resolve a pergunta deste estudo.
    },
    # Sisal com poliuretano de mamona. Entra por sugestão minha e a pedido do
    # usuário, e a lógica parecia boa: o que matou o papelão foi fibra CURTA e
    # desalinhada, e sisal é fibra longa; o que derrubou a fenólica foi o
    # formaldeído, e o poliuretano de mamona é resina vegetal sem formaldeído,
    # desenvolvida no Brasil. Fibra nacional, resina nacional, saúde resolvida.
    #
    # E FALHA. Fica registrado inteiro porque o motivo da falha é instrutivo.
    #
    # A resina PURA mede 6,46 MPa de tração, e os compósitos publicados de sisal
    # com ela ficam em 14 a 15 MPa. Não é um número ruim de laboratório ruim: o
    # poliuretano de mamona é uma resina FLEXÍVEL, e ela foi feita para ser. O
    # sisal em si é ótimo — a fibra sozinha dá de 400 a 700 MPa. O problema não é
    # a fibra, é a matriz que a segura, e é sempre a matriz que manda no
    # compósito quando ela é mole.
    #
    # ERRO MEU, CORRIGIDO PELO TESTE, e vale registrar como se deu. Eu tinha posto
    # numa faixa só o que está PUBLICADO (15 MPa) e uma EXTRAPOLAÇÃO minha para
    # matriz rígida com fibra alinhada (180 MPa) — treze vezes maior. Sortear
    # uniforme dentro disso afirma que qualquer valor no meio é igualmente
    # provável, o que é falso: um extremo é medida e o outro é hipótese sobre
    # OUTRA formulação. `test_TODA_propagacao_CONVERGIU` reprovou, porque a
    # amostragem não assenta numa faixa dessas — o teste de convergência acabou
    # detectando um erro de modelagem, e não de amostragem.
    #
    # A dispersão abaixo é só a faixa publicada. O teto extrapolado virou
    # `TETO_EXTRAPOLADO_SISAL`, declarado e separado, porque hipótese não pode
    # entrar disfarçada de medição.
    #
    # O ACHADO QUE VALE MAIS QUE O RESULTADO: mesmo no TETO otimista o cabo passa
    # na resistência e reprova na RIGIDEZ — flete 509 mm contra 258 mm do
    # eucalipto, o dobro. E rigidez é justamente o que resina nenhuma conserta: o
    # módulo de fibra natural para em torno de 20 GPa. O bambu já entrega 15 GPa
    # sem resina, sem alinhamento de fábrica e sem cura. Ou seja, fabricar sisal
    # com resina é tentar produzir o que o bambu já é — a planta faz o compósito
    # alinhado de graça, e faz melhor.
    "sisal-mamona": {
        "modulo_pa": 2.5e9,
        "densidade_kg_m3": 1150.0,
        "resistencia_pa": 15.0e6,
        # O único critério em que ele ganha de todo mundo, e ganha fácil.
        "fator_de_perda": 0.050,
        "preco_por_kg": 12.0,
        "irritacao": 2,
        "ambiente": 3,
        "justificativaQualitativa": (
            "sisal e mamona são agrícolas e nacionais, e a peça curada é inerte; o "
            "isocianato usado na cura é sensibilizante respiratório, o que é problema "
            "de quem fabrica e não de quem segura a pá"),
        "agua": 2,
        "fabricacao": 2,
        "justificativaAguaEfabricacao": (
            "o poliuretano veda bem, mas a fibra na borda cortada absorve; fabricação "
            "exige pentear e alinhar a fibra, impregnar e curar em molde"),
        "processo": {
            "dispensa": ("formaldeído", "fibra mineral", "estufa de secagem longa"),
            "exige": (
                "alinhamento da fibra, que é o que dá a resistência e é a etapa cara",
                "impregnação e cura em molde",
                "controle de exposição ao isocianato na linha",
            ),
            "riscoDeDurabilidade": (
                "descolamento fibra-matriz com ciclo de umidade; este estudo NÃO o modela"),
        },
        "dispersao": {"modulo_pa": (1.5e9, 3.5e9), "resistencia_pa": (14.0e6, 25.0e6)},
        # RESULTADO, negativo nas duas pontas da faixa e por motivos DIFERENTES.
        # No piso publicado: tubo de 32 mm dá margem 0,10 contra 1,00 do eucalipto,
        # e nem maciço a 45 mm salva — chega a 0,37 pesando 2,2 kg, quase o triplo
        # da madeira. Está uma ordem de grandeza fora, não é ajuste de geometria.
        # No teto extrapolado: passa na resistência (1,18) e reprova na rigidez.
        # Uma faixa que reprova nas duas pontas por motivos distintos é uma
        # conclusão mais forte do que uma que reprova por pouco.
    },
    # PINUS. Entra tarde, e a demora é uma falha de método minha que fica
    # registrada: eu tratei "madeira" como se fosse uma coisa só e passei o estudo
    # inteiro tentando bater o eucalipto com material exótico, sem nunca testar a
    # OUTRA madeira de reflorestamento — que no Brasil é a mais plantada, a mais
    # barata e a mais fácil de achar.
    #
    # O NÚMERO QUE EU NÃO TINHA OLHADO: resistência por quilo. O pinus elliottii dá
    # 189.831 contra 139.625 do eucalipto. Ele é MAIS FRACO em valor absoluto e
    # MELHOR por quilo, porque é bem mais leve. Para uma peça em flexão com
    # diâmetro livre, é a segunda conta que manda.
    #
    # E ELE RESPONDE A QUEIXA ORIGINAL DO USUÁRIO, que era secagem. Eucalipto é
    # notoriamente difícil de secar: colapsa e racha por dentro, e por isso fica
    # tempo demais na estufa. Pinus é das madeiras mais fáceis de secar que
    # existem — menos densa, menos propensa a colapso. O ganho de estufa que o
    # laminado prometia e não entregou aparece aqui de graça, sem cola e sem
    # prensa.
    #
    # O QUE ELE COBRA, e é real: pinus é MOLE. Dureza de superfície muito abaixo
    # da do eucalipto, então amassa no encaixe da pá e marca com o uso. E apodrece
    # mais rápido sem tratamento — mas tratamento de pinus é a maior indústria de
    # madeira tratada do país, então é custo conhecido, não é obstáculo.
    #
    # A RESSALVA DE FONTE, dita com precisão: os valores vêm do mesmo Wood
    # Handbook do eucalipto, e as linhas dos pinheiros do sul são padrão. Eu NÃO
    # reabri o documento nesta sessão para conferir estas duas linhas — o
    # eucalipto eu conferi, estas não. Fica marcado.
    "pinus-elliottii": {
        "modulo_pa": 13.7e9,
        "densidade_kg_m3": 590.0,
        "resistencia_pa": 112.0e6,
        "fator_de_perda": 0.010,
        "fonte": "FPL-GTR-190 (linha NÃO reconferida nesta sessão)",
        # PREÇO CORRIGIDO, e a correção veio de uma crítica externa que pegou uma
        # incoerência minha: eu tinha juntado resistência de madeira LIMPA com
        # preço de madeira COMUM. Os 112 MPa são corpo de prova sem defeito; os
        # R$ 2/kg são pinus de pátio, com nó. Não dá para ter os dois.
        # Peça selecionada sem nó e de fibra reta custa prêmio de seleção.
        "preco_por_kg": 4.5,
        "irritacao": 3,
        "ambiente": 3,
        "justificativaQualitativa": (
            "madeira de reflorestamento, a mais plantada do Brasil; resina incomoda "
            "pouco e o pó de lixamento é o de sempre"),
        "agua": 1,
        "fabricacao": 3,
        "justificativaAguaEfabricacao": (
            "apodrece mais rápido que eucalipto e exige tratamento, que é indústria "
            "madura aqui; seca MUITO mais fácil que eucalipto, que colapsa e racha "
            "por dentro — é o ganho de estufa que o laminado prometia e não entregou"),
        "processo": {
            "dispensa": ("cola", "prensa", "resina", "laminação"),
            "exige": (
                "seleção de peça sem nó e de fibra reta, que é o que já se faz com "
                "cabo de ferramenta",
                "tratamento contra apodrecimento, indústria estabelecida no país",
            ),
            "riscoDeDurabilidade": (
                "madeira MOLE: amassa no encaixe da pá e marca com o uso. Este estudo "
                "NÃO modela dureza de superfície, e é a fraqueza real do candidato"),
        },
        "dispersao": {"modulo_pa": (12.3e9, 13.7e9), "resistencia_pa": (88.0e6, 112.0e6)},
    },
    # PINUS COMERCIAL, com nó, e ele é a variante honesta deste estudo.
    #
    # DE ONDE VIERAM ESTES NÚMEROS: de uma crítica externa, não de mim. Ela usou
    # 70 MPa e 8 GPa contra os meus 112 MPa e 13,7 GPa, e a diferença não é
    # discordância — é que estamos falando de coisas diferentes. Os meus são de
    # corpo de prova pequeno e sem defeito; os dela são de madeira de pátio, com
    # nó e bolsa de resina. Para uma peça que se compra pronta, os dela são os
    # certos.
    #
    # E A SAÍDA É BOA: engrossar é grátis, selecionar é caro. Aceitar o nó e ir
    # para 40 mm custa diâmetro, que não custa nada; escolher tábua limpa custa
    # preço, que era justamente a vantagem do candidato. A crítica concluía que o
    # pinus estava fora; com os números dela mesma, a 40 mm ele passa.
    #
    # E AQUI O RESULTADO ME CORRIGIU DE NOVO, na direção da crítica. Eu anunciei
    # 40 mm olhando só o valor nominal, onde a margem dá 1,05. No PIOR CASO, com a
    # dispersão do nó, 40 mm dá 0,75 — abaixo do eucalipto. Nó não espalha a
    # resistência um pouco: o módulo de Weibull cai de 12 para 5, e o desconto de
    # tamanho passa de 10% para 30%.
    #
    # O diâmetro honesto é 44 mm, onde o pior caso dá 0,96 e empata com o
    # eucalipto. Para passar na porta absoluta de 1,0 seriam 45 mm, que é
    # exatamente o limite da mão — sem folga nenhuma.
    #
    # ENTÃO O PINUS NÃO É VITÓRIA, É TROCA: 40% mais barato e muito mais fácil de
    # secar, em troca de ser 20% mais pesado e visivelmente mais gordo. A crítica
    # externa estava mais perto da verdade do que a minha primeira resposta, e o
    # que ela errou foi só a conclusão de que ele estava fora.
    #
    # 44 MM CABE NA MÃO: cabo de pá comercial vive entre 38 e 42 mm, e o limite de
    # empunhadura deste estudo é 45.
    "pinus-comercial": {
        "modulo_pa": 8.0e9,
        "densidade_kg_m3": 510.0,
        "resistencia_pa": 70.0e6,
        "fator_de_perda": 0.010,
        "preco_por_kg": 2.0,
        "irritacao": 3,
        "ambiente": 3,
        "justificativaQualitativa": (
            "madeira de reflorestamento sem aditivo; acabamento de cabo é óleo ou "
            "cera, atóxico — tratamento de autoclave com sal metálico é remédio de "
            "poste enterrado e não se aplica a ferramenta de mão"),
        "agua": 1,
        "fabricacao": 3,
        "justificativaAguaEfabricacao": (
            "apodrece mais rápido que eucalipto e pede acabamento; seca MUITO mais "
            "fácil, que é o ganho de estufa que o laminado prometia e não entregou"),
        "processo": {
            "dispensa": ("cola", "prensa", "resina", "seleção de peça limpa"),
            "exige": (
                "44 mm em vez de 32, para compensar o nó no PIOR CASO — e não os "
                "40 mm que bastam no valor nominal",
                "virola metálica ou parafuso passante com arruela na zona do encaixe, "
                "porque pinus esmaga no furo do rebite",
                "acabamento em óleo ou cera contra apodrecimento",
            ),
            "riscoDeDurabilidade": (
                "DUREZA. Pinus é mole no corpo inteiro, não só no parafuso: marca e "
                "amassa com o uso. É conforto e vida útil, não é segurança, e este "
                "estudo NÃO modela dureza de superfície. É a crítica que fica de pé"),
            "fratura": (
                "pinus lasca em farpa longa ao romper; enfaixamento ou verniz na zona "
                "da mão contém, e margem maior reduz a chance de chegar lá"),
        },
        "dispersao": {"modulo_pa": (7.0e9, 10.0e9), "resistencia_pa": (60.0e6, 80.0e6)},
    },
    # O EUCALIPTO QUE O BRASIL REALMENTE PLANTA, e portanto o concorrente de
    # verdade. Híbrido clonal urophylla x grandis, medido, com fonte aberta lida
    # nesta sessão. Ver FONTE_MADEIRA_BR.
    #
    # OS NÚMEROS, da Tabela 3, madeira seca corrigida para 12%, seis medições em
    # três extratos e duas toras: MOR de 82,95 a 103,2 MPa, média 92,0. MOE de
    # 9,65 a 12,78 GPa, média 11,1.
    #
    # A CONVERSÃO DE DENSIDADE, declarada porque é premissa e não medida: o artigo
    # dá densidade BÁSICA (massa seca sobre volume verde), média 0,502 g/cm³. Ela
    # NÃO é a densidade a 12% de umidade, que é a condição do cabo. O fator usual
    # é de 1,20 a 1,25; aqui entra 1,22, o que dá cerca de 612 kg/m³. Usar a
    # básica direto subestimaria a massa do cabo em uns 20%.
    #
    # E O QUE ISSO FAZ COM O ESTUDO INTEIRO: a margem do concorrente cai de 0,89
    # para 0,69. Todo candidato deste estudo foi julgado contra uma barra 22% alta
    # demais, e vários que "não empatavam" empatam contra a árvore certa.
    #
    # A COMPENSAÇÃO, e ela é interessante: o urograndis é mais fraco E bem mais
    # leve. Por quilo ele dá 150.300 contra 139.625 do jarrah. Como madeira ele é
    # melhor do que o número absoluto sugere; como cabo de 32 mm ele é pior,
    # porque a 32 mm quem manda é o valor absoluto.
    "eucalipto-urograndis": {
        "modulo_pa": 11.1e9,
        "densidade_kg_m3": 612.0,
        "resistencia_pa": 92.0e6,
        "fator_de_perda": 0.010,
        "fonte": "Revista Árvore 33(3):501-509, 2009 — lido diretamente",
        "preco_por_kg": 3.0,
        "irritacao": 3,
        "ambiente": 3,
        "justificativaQualitativa": "madeira de reflorestamento, a mais plantada do país",
        "agua": 2,
        "fabricacao": 3,
        "justificativaAguaEfabricacao": (
            "absorve água e apodrece se não tratada; seca com dificuldade — colapso e "
            "rachadura interna são o motivo do tempo de estufa que o usuário relatou"),
        "dispersao": {"modulo_pa": (9.652e9, 12.781e9), "resistencia_pa": (82.95e6, 103.2e6)},
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
        "agua": 3,
        "fabricacao": 2,
        "justificativaAguaEfabricacao": "não absorve água; pultrusão exige matriz e máquina caras",
        "dispersao": {"modulo_pa": (25e9, 35e9), "resistencia_pa": (320e6, 480e6)},
    },
}

#: O teto otimista do sisal com resina, mantido FORA da dispersão do material
#: porque ele não é medida deste sistema: é o que uma matriz rígida com fibra
#: bem alinhada e fração alta daria, extrapolado de compósitos de fibra natural
#: em geral. Fica declarado para poder ser rodado à parte e citado como hipótese.
#:
#: E o resultado dele é o achado mais útil deste candidato: mesmo aqui o cabo
#: PASSA na resistência (margem 1,18) e REPROVA na rigidez — flete 509 mm contra
#: 258 mm do eucalipto. Resistência dá para comprar com resina e fibra; rigidez
#: não, porque o módulo de fibra natural para perto de 20 GPa. O bambu entrega
#: 15 GPa sem resina nenhuma.
TETO_EXTRAPOLADO_SISAL = {
    "modulo_pa": 9.0e9,
    "densidade_kg_m3": 1200.0,
    "resistencia_pa": 180.0e6,
    "fator_de_perda": 0.030,
    "natureza": "extrapolação, NÃO medida; não use como propriedade de material",
}

#: Geometrias comparáveis: a madeira maciça como é, e tubos de parede honesta.
GEOMETRIAS = {
    "eucalipto": ("macica", 0.032, None),
    "eucalipto-laminado": ("macica", 0.032, None),
    "sisal-mamona": ("tubular", 0.032, 0.0045),
    "pinus-elliottii": ("macica", 0.032, None),
    "pinus-comercial": ("macica", 0.044, None),
    "eucalipto-urograndis": ("macica", 0.032, None),
    "aco-1020": ("tubular", 0.032, 0.0012),
    "aluminio-6061-t6": ("tubular", 0.032, 0.0020),
    "fibra-de-vidro": ("tubular", 0.032, 0.0030),
    "papel-fenolico": ("tubular", 0.032, 0.0045),
    "papel-lignina": ("tubular", 0.032, 0.0060),
    "papel-lignina-curaua": ("tubular", 0.032, 0.0045),
    "bambu-colmo": ("tubular", 0.032, 0.0060),
    "bambu-laminado": ("tubular", 0.032, 0.0060),
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


#: DE QUE CORPO DE PROVA VEIO CADA RESISTÊNCIA, e por que isso muda o número.
#:
#: Resistência não é propriedade média: ela é decidida pelo maior defeito que por
#: acaso está na peça. Peça maior tem mais material, mais material tem mais chance
#: de conter o defeito grande, e por isso **a peça real é mais fraca que o corpo
#: de prova de onde o valor de manual saiu**. É estatística de Weibull, e vale
#: para material frágil.
#:
#: ESTE ESTUDO IGNOROU ISSO ATÉ AQUI, e o erro tem direção. Os 111,7 MPa do Wood
#: Handbook vêm de um corpo de prova de 25 x 25 x 410 mm; o cabo de 1,2 m tem
#: quase quatro vezes esse volume. Aplicar o número direto superestimou TODO
#: candidato cujo valor veio de corpo de prova pequeno — e os compósitos vêm do
#: menor de todos.
#:
#: E A CORREÇÃO NÃO AJUDA QUEM EU ACHEI QUE AJUDARIA. Eu disse ao usuário que ela
#: aumentaria a folga do bambu, porque só tinha olhado o desconto do eucalipto.
#: Errado: madeira e bambu vêm de corpo de prova GRANDE e perdem cerca de 10%,
#: enquanto os compósitos vêm do corpo de prova de norma, de 3,2 x 12,7 x 100 mm,
#: e perdem cerca de 27%. A correção é praticamente neutra entre bambu e
#: eucalipto, e é dura com todo o resto.
#:
#: METAL NÃO ENTRA. Material dúctil escoa em volta do defeito e redistribui a
#: tensão; `ensaio.efeito_de_escala` recusa calcular para ele, e aqui ele fica de
#: fora em vez de receber um fator inventado.
#:
#: Os volumes de corpo de prova são: o da madeira, real (norma de pequeno corpo
#: livre de defeito do FPL); o do bambu, um segmento de colmo, ESTIMADO; o dos
#: compósitos, o corpo de flexão da ASTM D790, que é padrão. Os módulos de
#: Weibull são de faixa de literatura e estão em `ensaio.MODULOS_DE_WEIBULL`.
CORPOS_DE_PROVA = {
    "madeira": {
        "volume_m3": 0.025 * 0.025 * 0.410,
        "modulo_de_weibull": 12.0,
        "origem": "corpo pequeno livre de defeito, FPL-GTR-190; medida real",
    },
    "bambu": {
        "volume_m3": math.pi / 4 * (0.032 ** 2 - 0.020 ** 2) * 0.50,
        "modulo_de_weibull": 8.0,
        "origem": "segmento de colmo em flexão; volume ESTIMADO",
    },
    # O corpo de prova do artigo brasileiro é MENOR que o do FPL: 2 x 2 x 30 cm
    # contra 2,5 x 2,5 x 41 cm. Corpo menor tem menos defeito, então o desconto de
    # tamanho para a peça real é MAIOR. A diferença de corpo de prova entre duas
    # fontes não é detalhe de método: ela muda o número final.
    "madeira-br": {
        "volume_m3": 0.020 * 0.020 * 0.300,
        "modulo_de_weibull": 12.0,
        "origem": "corpo de 2 x 2 x 30 cm, Revista Árvore 33(3), 2009; medida real",
    },
    "madeira-estrutural": {
        "volume_m3": 0.025 * 0.025 * 0.410,
        "modulo_de_weibull": 5.0,
        "origem": "mesmo corpo do FPL, com módulo de Weibull de peça COM nó",
    },
    "composito": {
        "volume_m3": 0.0032 * 0.0127 * 0.100,
        "modulo_de_weibull": 15.0,
        "origem": "corpo de flexão ASTM D790",
    },
}

#: A ASSIMETRIA QUE ISTO CRIA, e ela é desconfortável. Corrigir os frágeis e não
#: corrigir os dúcteis está certo em física — Weibull não descreve metal — e
#: mesmo assim penaliza um lado só. O efeito de tamanho em metal é FRACO, não é
#: ZERO, e aqui ele entra como zero por falta de modelo, não por medida.
#:
#: A CONSEQUÊNCIA APARECEU NA HORA: com a madeira descontada em 10% e os metais
#: em nada, o alumínio passou na frente do eucalipto em margem — invertendo uma
#: conclusão que este estudo já tinha registrado. Isso NÃO quer dizer que metal
#: virou boa escolha para cabo; ele continua reprovado por vibração, que é outro
#: critério. Quer dizer que a comparação entre frágil e dúctil, neste estudo,
#: passou a carregar um viés declarado a favor do dúctil.
#:
#: A que família de corpo de prova cada candidato pertence. Metal fica de fora de
#: propósito: ausência aqui quer dizer "não se corrige", e não "esqueci".
FAMILIA_DE_ENSAIO = {
    "eucalipto": "madeira",
    "eucalipto-laminado": "madeira",
    "pinus-elliottii": "madeira",
    # Comercial tem nó, e nó espalha muito mais a resistência que madeira limpa.
    "pinus-comercial": "madeira-estrutural",
    "eucalipto-urograndis": "madeira-br",
    "bambu-colmo": "bambu",
    "bambu-laminado": "bambu",
    "papel-fenolico": "composito",
    "papel-lignina": "composito",
    "papel-lignina-curaua": "composito",
    "sisal-mamona": "composito",
    "fibra-de-vidro": "composito",
}


def fator_de_escala(nome: str, volume_da_peca_m3: float) -> dict[str, Any]:
    """Quanto a resistência de manual cai quando a peça é maior que o ensaio.

    Devolve fator 1,0 e o motivo para quem não se corrige, em vez de omitir: um
    candidato sem correção precisa dizer POR QUE não tem.
    """
    familia = FAMILIA_DE_ENSAIO.get(nome)
    if familia is None:
        return {"fator": 1.0, "familia": None,
                "porque": "material dúctil: escoa em volta do defeito e não segue "
                          "a estatística do elo mais fraco"}
    cp = CORPOS_DE_PROVA[familia]
    r = efeito_de_escala(
        resistencia_pa=1.0, volume_do_ensaio_m3=cp["volume_m3"],
        volume_da_peca_m3=volume_da_peca_m3,
        modulo_de_weibull=cp["modulo_de_weibull"], material=familia)
    return {"fator": r["fatorDeReducao"], "familia": familia,
            "corpoDeProva": cp["origem"],
            "porque": "peça maior que o corpo de prova tem mais chance de conter "
                      "o defeito que decide a ruptura"}


def _secao(nome: str) -> dict[str, Any]:
    tipo, diametro, parede = GEOMETRIAS[nome]
    return secao_macica(diametro) if tipo == "macica" else secao_tubular(diametro, parede)


def medir(nome: str) -> dict[str, Any]:
    """Roda a viga para um candidato, com a incerteza das propriedades dispersas."""
    material = MATERIAIS[nome]
    secao = _secao(nome)
    base = {chave: material[chave] for chave in
            ("modulo_pa", "densidade_kg_m3", "resistencia_pa", "fator_de_perda")}

    # A resistência tabelada é do CORPO DE PROVA. O cabo é maior, e portanto mais
    # fraco. A correção entra aqui, antes de qualquer conta, e vale igualmente
    # para o valor nominal e para as duas pontas da dispersão — corrigir só o
    # nominal deixaria a cauda ruim otimista, que é a cauda que quebra.
    escala = fator_de_escala(nome, secao["area"] * COMPRIMENTO_M)
    base["resistencia_pa"] *= escala["fator"]
    dispersao_corrigida = {
        chave: ((a * escala["fator"], b * escala["fator"])
                if chave == "resistencia_pa" else (a, b))
        for chave, (a, b) in material["dispersao"].items()
    }

    determinista = avaliar(secao, comprimento_m=COMPRIMENTO_M, forca_n=FORCA_N,
                           condicao="ambiente, carga estática de ponta", **base)

    margem = propagar(
        dispersao_corrigida,
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
        "efeitoDeEscala": escala,
        "resistenciaDeManual_pa": material["resistencia_pa"],
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
#: O QUE A CORREÇÃO DE TAMANHO FEZ COM ESTA PORTA, e por que ela NÃO foi mexida.
#:
#: Com a resistência corrigida para o tamanho da peça, o eucalipto cai para 0,90
#: e passa a REPROVAR na própria porta que este estudo usa. O concorrente não
#: passa no critério absoluto.
#:
#: A TENTAÇÃO ÓBVIA é baixar a porta ou torná-la relativa ao eucalipto, já que a
#: pergunta do usuário era "pelo menos tão resistente quanto o eucalipto". E é
#: exatamente por ser óbvia depois do resultado que ela não é feita aqui:
#: reescrever critério depois de ver o número é escolher a conclusão. Já
#: aconteceu uma vez neste arquivo, com o critério de vibração, e ficou
#: registrado em vez de corrigido.
#:
#: O QUE O NÚMERO ESTÁ DIZENDO DE VERDADE: 300 N na ponta de 1,2 m é carga dura, e
#: nem a madeira aguenta com folga quando o tamanho da peça entra na conta. O cabo
#: real que o usuário trouxe tem 71 cm, e a 71 cm a margem sobe muito. A porta não
#: está errada — o caso de carga é que é o pior caso, e ele foi escolhido antes.
#:
#: A comparação relativa continua existindo e sempre existiu, com outro nome:
#: `empataOuSupera` nas variantes compara com o eucalipto, não com 1,0.
MARGEM_MINIMA_ELIMINATORIA = 1.0

#: RIGIDEZ COMO CRITÉRIO, e ela entrou porque o usuário perguntou o que o estudo
#: não sabia: um tubo oco não verga demais quando se levanta terra na ponta?
#:
#: O portão só olhava resistência. Cabo que não quebra mas balança demais é cabo
#: ruim, e nada aqui media isso — foi lacuna do estudo, não do material.
#:
#: A resposta, medida: no diâmetro recomendado o bambu oco é 5% MAIS rígido que o
#: eucalipto maciço, porque tubo põe material longe do centro, onde ele trabalha.
#: Mas a 34 mm ele fica 26% mais mole. O oco só funciona porque é 37 mm e não 32 —
#: a desconfiança do usuário estava certa, e o que salva é o diâmetro.
FLECHA_MAXIMA_RELATIVA_AO_EUCALIPTO = 1.05


def rigidez_relativa(secao: dict[str, Any], modulo_pa: float) -> float:
    """Rigidez à flexão da seção, dividida pela do cabo de eucalipto de referência."""
    # REFERÊNCIA TROCADA para o eucalipto BRASILEIRO: comparar rigidez contra uma
    # árvore australiana que ninguém planta aqui responde a pergunta errada.
    referencia = MATERIAIS[REFERENCIA]["modulo_pa"] * secao_macica(0.032)["inercia"]
    return modulo_pa * secao["inercia"] / referencia


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
            "agua": Grandeza(MATERIAIS[nome]["agua"], "ordinal", ADIMENSIONAL),
            "fabricacao": Grandeza(MATERIAIS[nome]["fabricacao"], "ordinal", ADIMENSIONAL),
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
        Criterio("agua", "maximizar"),
        Criterio("fabricacao", "maximizar"),
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
        "criteriosOrdinais": ["saude", "ambiente", "fornecimento", "conformidade",
                              "agua", "fabricacao"],
        "escala": ESCALA_QUALITATIVA,
    }


#: LIMITE DE EMPUNHADURA, e ele entrou por uma otimização que fugiu. Buscando a
#: configuração mais leve que empata com o eucalipto, a varredura foi direto para
#: 69 mm de diâmetro com 2,2 mm de parede: mais leve e mais barato que a madeira,
#: e completamente impossível de segurar. Tubo grande e fino é eficiente em
#: flexão, e a conta não sabia que existe mão.
#:
#: A lição não é sobre cabo: **otimização vai exatamente para onde falta
#: restrição**, e o que falta não aparece no resultado — aparece como um número
#: ótimo. A restrição está aqui agora, e 45 mm já é a borda do que se segura bem.
DIAMETRO_MAXIMO_DE_EMPUNHADURA_M = 0.045

#: PAREDE MÍNIMA PRÁTICA, e ela entrou pelo mesmo motivo que o limite de
#: empunhadura: a otimização achou outro buraco. Com a variante reforçada por
#: fibra, a varredura foi para 1,8 mm de parede — dentro do meu limite de
#: enrugamento, que cobre flambagem elástica em flexão, e completamente fora do
#: que sobrevive ao uso.
#:
#: Cabo de ferramenta de parede fina não morre por flexão: morre AMASSADO. Cai da
#: caçamba, bate em pedra, e o encaixe na pá esmaga a parede. É modo de falha
#: local, que esta conta não modela — e por isso vira restrição, não critério.
#:
#: TERCEIRA VEZ NESTE MESMO ESTUDO que a otimização acha o vazio de uma restrição
#: ausente: primeiro a parede que enruga, depois o diâmetro que não cabe na mão,
#: agora a parede que amassa. O padrão é sempre o mesmo, e o resultado ausente
#: nunca aparece como erro — aparece como ótimo.
PAREDE_MINIMA_PRATICA_M = 0.003

#: CONTRA QUEM ESTE ESTUDO COMPARA, e a escolha é a resposta à pergunta do
#: usuário. Ele quer substituir o cabo de eucalipto que existe no Brasil, e o que
#: existe no Brasil é urograndis — não o jarrah australiano do Wood Handbook.
#: O jarrah fica na tabela como referência estrangeira, e não como alvo.
REFERENCIA = "eucalipto-urograndis"

#: A SELEÇÃO DE LOTE DEIXOU DE SER OPCIONAL, e este é o achado que mais custou à
#: recomendação deste estudo.
#:
#: Enquanto o bambu rodava com resistência da minha memória, faixa de 100 a 240
#: MPa, ele era "o único candidato que vence sem exigir medição" — e isso era a
#: manchete. Com a faixa MEDIDA de colmo inteiro, de 62 a 170 MPa, ele perde do
#: eucalipto brasileiro no pior caso: 0,61 contra 0,63.
#:
#: A largura importa mais que o valor central aqui. Meu valor central estava 25%
#: otimista, o que já era ruim; mas o que virou a conclusão foi a CAUDA, que eu
#: tinha cortado em 100 MPa quando a literatura de colmo inteiro desce a 62.
#:
#: E o remédio não é engrossar: de 37 para 43 mm a margem vai de 0,44 para 0,61, e
#: para. Colmo ruim é ruim em qualquer diâmetro que ainda caiba na mão.
#:
#: COM seleção de lote, o bambu a 43 mm dá 1,07 contra 0,63, pesando metade e
#: custando um terço. A recomendação continua de pé; ela só deixou de ser grátis.
SELECAO_DE_LOTE = {
    "obrigatoria": True,
    "porQue": ("a variação natural do colmo inteiro vai de 62 a 170 MPa, e a ponta "
               "baixa dessa faixa não faz cabo"),
    "oQueNaoResolve": "engrossar: de 37 para 43 mm ganha 0,17 de margem e para aí",
    "margemComSelecao": 1.07,
    "margemSemSelecao": 0.61,
}

#: PINUS ENGROSSADO: a resposta mais barata do estudo inteiro, e a mais chata.
#:
#: A 32 mm o pinus empata com o eucalipto no valor nominal e fica atrás no pior
#: caso, porque a faixa dele é larga — ela vai do taeda ao elliottii, que são
#: espécies diferentes vendidas como "pinus". Engrossar resolve, e engrossar é
#: grátis num material que custa um terço.
#:
#: A 37 mm, ainda folgado dentro do que a mão segura, ele passa na porta
#: absoluta de 1,0 — que o próprio eucalipto não passa — pesando MENOS que o
#: eucalipto e custando menos da metade.
#:
#: E O DIÂMETRO AQUI FOI ESCOLHIDO DEPOIS DE VER O RESULTADO, o que é legítimo e
#: precisa da distinção dita: diâmetro é parâmetro de PROJETO, e dimensionar a
#: peça para atender o requisito é engenharia. Mexer na porta seria escolher a
#: conclusão. Um é permitido, o outro não, e a diferença é essa.
#:
#: ERRO DE LEITURA MEU, REGISTRADO: eu havia anunciado 36 mm olhando uma varredura
#: arredondada que mostrava "1,00". O número verdadeiro a 36 mm é 0,9952, e ele
#: NÃO passa. Arredondamento na saída escondeu a reprova por 5 milésimos.
#:
#: O QUE ELE NÃO RESOLVE, e precisa estar do lado do número: pinus é mole. Amassa
#: no encaixe da pá e marca com o uso, e este estudo não modela dureza de
#: superfície. É a fraqueza real, e ela não aparece em nenhuma conta daqui.
PINUS_COMERCIAL_ENGROSSADO = {
    "diametro_m": 0.044,
    "margemP05": 0.96,
    "porQue": ("aceitar o nó e pagar em diâmetro; selecionar peça limpa custa preço, "
               "que era justamente a vantagem do candidato"),
    "aTroca": "40% mais barato e mais fácil de secar; 20% mais pesado e mais gordo",
    "oQueFaltaModelar": "dureza de superfície, que é onde o pinus perde de verdade",
}

PINUS_ENGROSSADO = {
    "diametro_m": 0.037,
    "margemA36mm": 0.9952,
    "porQue": ("um terço do preço do eucalipto compra diâmetro à vontade; "
               "36 mm continua confortável na mão"),
    "oQueFaltaModelar": "dureza de superfície, que é onde o pinus perde de verdade",
}

#: Variantes de projeto. A diferença entre elas não é o material — é o que se
#: pede dele. `extrema` maximiza a folga estrutural; `igualitaria` só empata com
#: o eucalipto e gasta o resto em ser leve e barata.
VARIANTES = {
    "bambu-selecionado": {
        "diametro_m": 0.037, "parede_m": 0.0030,
        "objetivo": "empatar com o eucalipto usando colmo de bambu selecionado",
        "observacao": "leve e barata, e só empata COM seleção de lote: a 37 mm ela "
                      "cai para 0,44 carregando a variação natural inteira",
    },
    "bambu-sem-selecionar": {
        "diametro_m": 0.043, "parede_m": 0.0030,
        "objetivo": "engrossar para absorver parte da variação natural do colmo",
        # O NOME DESTA VARIANTE FICOU MENTIROSO, e fica registrado em vez de
        # maquiado. Ela nasceu quando eu usava resistência de memória com faixa de
        # 100 a 240 MPa. Com a faixa MEDIDA de colmo inteiro, de 62 a 170 MPa, ela
        # dá 0,61 contra 0,63 do eucalipto brasileiro: perde, por pouco.
        # Engrossar de 37 para 43 mm absorve parte da variação, e não toda.
        "observacao": "engrossar ajuda e NÃO basta: sem seleção de lote ela dá 0,61 "
                      "contra 0,63 do eucalipto. Com seleção, 1,07",
    },
    "bambu-laminado": {
        "diametro_m": 0.043, "parede_m": 0.0030,
        "objetivo": "trocar variabilidade por consistência, aceitando o custo",
        "observacao": "some o nó e a rachadura de colmo; custa 4 vezes mais e volta a "
                      "depender de adesivo",
    },
    "curaua-medida": {
        "diametro_m": 0.036, "parede_m": 0.0030,
        "objetivo": "empatar com o eucalipto usando o laminado reforçado com fibra",
        "observacao": "a melhor do estudo: 37% mais leve, 10% mais cara, dissipa 43%",
    },
    "curaua-sem-medir": {
        "diametro_m": 0.041, "parede_m": 0.0030,
        "objetivo": "o mesmo, carregando a incerteza larga",
        "observacao": "ainda 28% mais leve que a madeira, mas 27% mais cara",
    },
    "extrema": {
        "diametro_m": 0.050, "parede_m": 0.006,
        "objetivo": "folga estrutural, sem limite de empunhadura",
        "observacao": "50 mm passa do que se segura bem; entra como referência de topo",
    },
    "igualitaria-medida": {
        "diametro_m": 0.045, "parede_m": 0.0042,
        "objetivo": "empatar com o eucalipto gastando o mínimo de massa",
        "observacao": "exige a resistência medida (±15%); é a melhor troca do estudo",
    },
    "igualitaria-sem-medir": {
        "diametro_m": 0.045, "parede_m": 0.0080,
        "objetivo": "empatar com o eucalipto carregando a incerteza larga",
        "observacao": "mesmo material e mesmo empate, com quase o dobro da massa",
    },
    "igualitaria-40mm": {
        "diametro_m": 0.040, "parede_m": 0.0066,
        "objetivo": "empatar mantendo o diâmetro comum de cabo de pá",
        "observacao": "45 mm é a borda do que se segura; 40 mm é confortável e custa massa",
    },
}


def avaliar_variantes(medida: bool = True) -> dict[str, Any]:
    """Compara as variantes de projeto contra o eucalipto com fonte primária.

    A PERGUNTA QUE ISTO RESPONDE, e ela veio do usuário: em vez de perseguir o
    máximo, e se o candidato só EMPATAR com o eucalipto e gastar o resto em ser
    leve e barato? A resposta é sim, e com uma condição — só compensa se a
    resistência for medida.
    """
    #: Faixa medida por material: ±15% em torno do valor nominal, que é o que um
    #: ensaio de dez corpos de prova costuma entregar.
    MEDIDAS = {
        "papel-lignina": {"resistencia_pa": (72e6, 98e6), "modulo_pa": (5e9, 7e9)},
        "papel-lignina-curaua": {"resistencia_pa": (153e6, 207e6), "modulo_pa": (17e9, 23e9)},
        # Para o colmo natural, "medir" é SELECIONAR LOTE: a variação é da planta,
        # e nenhum ensaio a reduz — o que se faz é escolher o que entra.
        # ±15% em torno do valor MEDIDO, que é o que a seleção de lote entrega.
        "bambu-colmo": {"resistencia_pa": (115.9e6, 156.8e6), "modulo_pa": (11.1e9, 15.1e9)},
        "bambu-laminado": {"resistencia_pa": (102e6, 138e6), "modulo_pa": (10e9, 14e9)},
    }
    referencia = medir(REFERENCIA)
    referencia_flecha = referencia["flecha_m"]

    saida = {}
    for nome, v in VARIANTES.items():
        material = (
            "bambu-laminado" if nome == "bambu-laminado"
            else "bambu-colmo" if nome.startswith("bambu")
            else "papel-lignina-curaua" if nome.startswith("curaua")
            else "papel-lignina"
        )
        mat = MATERIAIS[material]
        base = {k: mat[k] for k in
                ("modulo_pa", "densidade_kg_m3", "resistencia_pa", "fator_de_perda")}
        dispersao = MEDIDAS[material] if medida else mat["dispersao"]
        if v["parede_m"] < PAREDE_MINIMA_PRATICA_M:
            raise falhar("contrato", "parede-abaixo-do-pratico",
                         f"'{nome}' tem parede de {v['parede_m'] * 1000:.1f} mm, abaixo "
                         f"de {PAREDE_MINIMA_PRATICA_M * 1000:.1f} mm; ela amassa em uso.",
                         local="VARIANTES")
        secao = secao_tubular(v["diametro_m"], v["parede_m"])
        # Mesma correção de tamanho da `medir`: a variante também é maior que o
        # corpo de prova, e cada variante tem o seu volume.
        escala = fator_de_escala(material, secao["area"] * COMPRIMENTO_M)
        base["resistencia_pa"] *= escala["fator"]
        dispersao = {c: ((a * escala["fator"], b * escala["fator"])
                         if c == "resistencia_pa" else (a, b))
                     for c, (a, b) in dispersao.items()}
        r = avaliar(secao, comprimento_m=COMPRIMENTO_M, forca_n=FORCA_N, **base)
        p = propagar(dispersao,
                     lambda pt: avaliar(secao, comprimento_m=COMPRIMENTO_M,
                                        forca_n=FORCA_N, **{**base, **pt})["margemContraFalha"],
                     semente=SEMENTE, amostras=2000)
        massa = r["massa"]["valor"]
        saida[nome] = {
            **v,
            "material": material,
            "efeitoDeEscala": escala,
            "margemP05": p["p05"],
            "massa_kg": massa,
            "custo": massa * mat["preco_por_kg"],
            "dissipacao": 1 - r["vibracaoRestanteApos10Ciclos"]["valor"],
            "massaRelativaAoEucalipto": massa / referencia["massa_kg"] - 1,
            "empataOuSupera": p["p05"] >= referencia["margemP05"],
            "cabeNaMao": v["diametro_m"] <= DIAMETRO_MAXIMO_DE_EMPUNHADURA_M,
            "rigidezRelativa": rigidez_relativa(secao, base["modulo_pa"]),
            "flechaRelativa": r["flecha"]["valor"] / referencia_flecha,
            "vergaMenosQueOEucalipto": r["flecha"]["valor"] <= (
                referencia_flecha * FLECHA_MAXIMA_RELATIVA_AO_EUCALIPTO),
            "paredeSobreviveAoUso": v["parede_m"] >= PAREDE_MINIMA_PRATICA_M,
        }
    return {
        "referencia": {"material": REFERENCIA, "margemP05": referencia["margemP05"],
                       "massa_kg": referencia["massa_kg"], "custo": referencia["custo"],
                       "dissipacao": 1 - referencia["vibracaoRestante"],
                       "fonte": FONTE_MADEIRA},
        "resistenciaMedida": medida,
        "variantes": saida,
        "limiteDeEmpunhadura_m": DIAMETRO_MAXIMO_DE_EMPUNHADURA_M,
        "flechaDeReferencia_m": referencia_flecha,
        "porQueRigidezEntrou": (
            "o portão só olhava resistência, e cabo que não quebra mas balança demais "
            "é cabo ruim. A pergunta veio do usuário: tubo oco não verga demais? "
            "Resposta medida: no diâmetro recomendado é 5% MAIS rígido que o maciço, "
            "porque tubo põe material longe do centro — mas a 34 mm fica 26% mais mole, "
            "então o que salva é o diâmetro e não o material"
        ),
        "paredeMinima_m": PAREDE_MINIMA_PRATICA_M,
        "porQueOLimiteExiste": (
            "sem ele a otimização foi para 69 mm de parede fina: mais leve e mais "
            "barato que a madeira, e impossível de segurar. Otimização vai exatamente "
            "para onde falta restrição, e o que falta aparece como número ótimo. "
            "Aconteceu três vezes neste estudo: parede que enruga, diâmetro que não "
            "cabe na mão, e parede que amassa em uso"
        ),
    }


#: PREPARO DA MATÉRIA-PRIMA, e a pergunta veio do usuário: se o bambu levar o
#: mesmo tempo que o eucalipto para secar, o ganho encolhe.
#:
#: Não leva, e o motivo é geométrico. Secar é difusão, e o tempo vai com o
#: QUADRADO da espessura que a água atravessa. O cabo de eucalipto é maciço: a
#: água do centro percorre 16 mm. O colmo de bambu já vem oco, com parede de 3 mm
#: que seca dos dois lados — 1,5 mm de caminho. A razão dos quadrados dá cerca de
#: 114 vezes.
#:
#: E o tratamento contra caruncho NÃO soma: a imersão em bórax pode ser feita com
#: o colmo ainda verde, antes de secar. Somar passo que roda em paralelo inventa
#: tempo que ninguém gasta.
PECAS_PARA_PREPARO = {
    "cabo de eucalipto (maciço 32 mm)": {
        "espessura_de_difusao_m": 0.016,
        "passos": ("abate e corte", "secagem", "torneamento", "acabamento"),
        "observacao": "a água do centro atravessa o raio inteiro",
    },
    "colmo de bambu (parede 3 mm)": {
        "espessura_de_difusao_m": 0.0015,
        "passos": ("corte do colmo", "imersão contra caruncho", "secagem",
                   "corte no comprimento"),
        "sobrepostos": ("imersão contra caruncho",),
        "observacao": "já vem oco; a parede seca pelos dois lados, e a imersão pode "
                      "ser feita com o colmo verde",
    },
    "bambu laminado (ripa 6 mm)": {
        "espessura_de_difusao_m": 0.003,
        "passos": ("corte", "imersão", "secagem", "laminação", "usinagem"),
        "sobrepostos": ("imersão",),
        "observacao": "a ripa é mais grossa que a parede do colmo, e ainda assim "
                      "seca muito mais rápido que o maciço",
    },
}


def comparar_preparo_da_materia_prima() -> dict[str, Any]:
    """Quanto tempo cada matéria-prima leva para ficar pronta."""
    return comparar_preparo(PECAS_PARA_PREPARO)


#: ANÁLISE AMBIENTAL E DE FORNECIMENTO. Nada disto saiu de conta: é análise, e a
#: marca está no fim de cada bloco. Entra no estudo porque decide adoção tanto
#: quanto resistência — e porque ausência de análise seria omissão cômoda.
AMBIENTE_E_FORNECIMENTO = {
    "bambu-colmo": {
        "aFavor": (
            "é uma gramínea: corta-se o colmo e a touceira rebrota sem replantio, "
            "em ciclo de três a cinco anos contra sete ou mais do eucalipto",
            "não leva resina, adesivo nem aditivo, então não há emissão de processo "
            "nem passivo de descarte",
            "sequestro de carbono rápido durante o crescimento",
        ),
        "impedimentos": (
            "ESPÉCIE IMPORTA: bambus alastrantes do gênero Phyllostachys se espalham "
            "por rizoma e são tratados como invasores em vários lugares; os entouceirantes "
            "(Bambusa, Dendrocalamus) ficam onde foram plantados. Escolher espécie errada "
            "cria problema ambiental em vez de resolver",
            "colheita de bambu NATIVO em área de mata pode exigir licenciamento; bambu "
            "cultivado não tem esse entrave",
            "o banho de bórax gera efluente: boro em concentração alta afeta planta, e o "
            "tanque precisa de reuso em circuito fechado em vez de descarte",
        ),
        "fornecimento": (
            "MATÉRIA-PRIMA ABUNDANTE, CADEIA IMATURA — e essa distinção é a mesma que "
            "apareceu na lignina. O Brasil tem cultivo relevante, com histórico de "
            "plantios grandes para celulose no Nordeste, e há política pública "
            "específica de incentivo ao cultivo. Mas a cadeia de colmo CLASSIFICADO, "
            "com lote conferido e diâmetro consistente, é artesanal e regional. "
            "Comprar bambu é fácil; comprar bambu com garantia de lote não é",
            "o eucalipto, em contraste, tem cadeia industrial madura para cabo pronto: "
            "é a vantagem real dele neste estudo, e não a propriedade mecânica",
        ),
        "marca": ("ANÁLISE, NÃO ESTUDO: nada aqui foi medido nem verificado contra "
                  "fonte primária, inclusive a menção a política pública, que vem de "
                  "memória e precisa ser conferida antes de ser citada a terceiros"),
    },
    "bambu-laminado": {
        "aFavor": (
            "aproveita colmo fora de bitola e resíduo de corte, o que melhora o uso do "
            "material colhido",
            "some o nó e a variação de colmo, que é o que trava a cadeia do colmo natural",
        ),
        "impedimentos": (
            "volta a depender de adesivo, e aí a pergunta do formaldeído reaparece — "
            "com resposta conhecida, porque existe versão sem",
            "a laminação gasta energia e gera resíduo que o colmo cortado não gera",
        ),
        "fornecimento": (
            "indústria estabelecida no mundo todo para piso e móvel, o que dá cadeia "
            "mais previsível que a do colmo — em troca de quatro vezes o custo",
        ),
        "marca": "ANÁLISE, NÃO ESTUDO: não medido, não verificado",
    },
}


#: FIXAÇÃO E INTEMPERISMO. Duas perguntas do usuário que este estudo não modelava,
#: e a primeira delas muda o projeto — não a escolha do material, mas o desenho da
#: ponta do cabo.
#:
#: NADA DAQUI SAIU DE CONTA: é análise, e vale o mesmo aviso das outras.
FIXACAO_E_INTEMPERISMO = {
    "parafuso": {
        "veredito": "o bambu NÃO aceita a mesma fixação do eucalipto",
        "porQue": (
            "eucalipto é maciço e o parafuso morde material inteiro; o colmo é OCO "
            "com 3 mm de parede, e bambu racha ao longo da fibra com facilidade que a "
            "madeira não tem. Parafuso auto-atarraxante cunha as fibras e inicia trinca "
            "longitudinal — é por isso que construção com bambu tradicionalmente evita "
            "prego e parafuso"
        ),
        "eOModoDeFalhaQueJaTinhaSidoMarcado": (
            "é o mesmo esmagamento de parede que motivou a PAREDE_MINIMA_PRATICA_M; "
            "aqui ele aparece na junta, que é onde ferramenta costuma falhar de verdade"
        ),
        "solucoesConhecidas": (
            "bucha interna na ponta: tarugo de madeira ou plug ocupando os últimos "
            "10 a 15 cm, para o parafuso morder sólido e a parede não amassar",
            "parafuso passante com arruela em vez de auto-atarraxante, que distribui "
            "em vez de cunhar",
            "anel ou virola metálica por fora da junta, impedindo a trinca de abrir",
            "posicionar a junta perto de um NÓ, que é o diafragma natural do bambu e "
            "onde ele resiste a rachar",
        ),
        "custoDisso": "barato, mas obrigatório: é detalhe de projeto, não opcional",
    },
    # LACUNA CORRIGIDA. As soluções acima cuidam da ponta que entra na pá, e o
    # estudo tinha deixado a OUTRA de fora. São duas pontas com problemas
    # diferentes: embaixo o parafuso cunha e a parede amassa; em cima o tubo fica
    # simplesmente ABERTO, e é daí que a rachadura começa, porque a extremidade
    # livre não tem nada segurando as fibras juntas.
    "ponta_livre": {
        "veredito": "toda extremidade cortada é um início de trinca",
        "solucoes": (
            "cortar logo acima de um NÓ: o nó é um diafragma que fecha o tubo e trava "
            "as fibras. Custo zero — é só posicionamento do corte, e é a regra mais "
            "barata do projeto inteiro",
            "tampa ou anel na ponta, quando o corte não puder cair num nó",
        ),
        "regraQueResume": (
            "os DOIS cortes do cabo devem cair em nó sempre que der; isso ataca a maior "
            "ameaça de durabilidade do bambu sem custar nada"
        ),
        # CORREÇÃO, e ela veio de uma pergunta simples: quantos nós tem um pedaço
        # de 1,2 m? Entrenó de Bambusa tuldoides fica entre 30 e 45 cm, mais curto
        # perto da base e mais longo no meio do colmo, então 1,2 m dá de três a
        # cinco nós contando as pontas — não um.
        #
        # E daí sai o que eu tinha dito errado: "corte nos dois nós" não é regra
        # que se aplica sempre, porque QUEM ESCOLHE ONDE O NÓ ESTÁ É A PLANTA. Se
        # o entrenó for de 40 cm, 1,2 m fecha exatamente; com 35 ou 45, não fecha.
        # Exigir nó nas duas pontas é mais um critério de seleção, e seleção custa
        # rendimento.
        "quantosNosEmUmCabo": {
            "entrenoTipico_cm": (30, 45),
            "nosEm1_2m": (3, 5),
            "quemEscolhe": "a planta, não o projeto",
        },
        "aRegraCorrigida": (
            "nó na ponta que entra na pá: EXIJA, porque é a que sofre parafuso e "
            "esmagamento, e vale gastar rendimento nela",
            "nó na ponta livre: PREFIRA, não exija — se não cair, uma tampa ou anel "
            "resolve, e é barato",
            "aceite FAIXA de comprimento, e não só de diâmetro: um cabo que pode ter "
            "entre 1,15 e 1,30 m acha muito mais colmo que caia bem nos nós",
        ),
    },
    "sol_e_tempo": {
        "veredito": "empate com o eucalipto",
        "porQue": (
            "UV degrada lignina na superfície dos dois: acinzenta, abre microfissura e "
            "abre caminho para a água. O bambu tem vantagem inicial pela epiderme cerosa "
            "e rica em sílica, mas quando ela se vai o comportamento se iguala"
        ),
        "consequencia": "os dois pedem acabamento e reaplicação periódica; nenhum ganho "
                        "e nenhuma perda na comparação",
    },
    "resina": {
        "pergunta": "não usar resina é porque não precisa ou porque não pode?",
        "resposta": (
            "não PRECISA estruturalmente: o colmo já é um compósito de fibra contínua "
            "unida por lignina natural, e chega aos 170 MPa sem impregnação, prensagem "
            "nem cura. Dispensar resina é economia de processo, não sacrifício"
        ),
        "ondeEla_AJUDA": (
            "selagem superficial contra umidade, que reduz — mas NÃO elimina — a "
            "rachadura: bambu também racha por gradiente interno e por tensão de "
            "crescimento, não só pela superfície",
            "bucha ou adesivo na ponta, para a fixação descrita acima",
        ),
        "ondeElaNAO_PODE": (
            "fenólica e ureia-formol, pela emissão de formaldeído — a restrição do "
            "usuário é a essas, e não a resina em geral",
            "epóxi merece ressalva que costuma faltar: o epóxi NÃO CURADO é "
            "sensibilizante de contato e causa dermatite ocupacional, então 'base água' "
            "não o torna automaticamente a opção limpa",
        ),
        "selantesRealmenteMansos": (
            "óleo de linhaça", "cera de carnaúba", "goma-laca",
        ),
        "marca": "ANÁLISE, NÃO ESTUDO: não medido, não verificado",
    },
}


#: COMO SE OBTÉM A MEDIDA, e a resposta muda o jeito de comprar. Duas perguntas do
#: usuário: bambu não dá para usinar, então como ficar dentro da tolerância? E os
#: nós atrapalham a empunhadura?
#:
#: ANÁLISE, NÃO ESTUDO: nada aqui foi medido.
GEOMETRIA_NA_PRATICA = {
    "diametro": {
        "veredito": "não se usina, se SELECIONA",
        "como": (
            "classificação por gabarito de anel passa-não-passa, com os colmos indo "
            "para caixas por faixa de diâmetro — é o padrão em construção com bambu",
            "a parede também varia, e diminui em direção ao topo do colmo, então a "
            "seleção é por diâmetro E por espessura na altura de corte",
        ),
        "oQueNAOfazer": (
            "tornear ou lixar a superfície externa para acertar o diâmetro: a "
            "resistência do bambu é GRADUADA, com as fibras mais densas na casca. "
            "Tirar 1 mm de fora custa muito mais que 1 mm de material"
        ),
        "consequenciaDeProjeto": (
            "o projeto tem de tolerar FAIXA e não medida: exigir 37 ± 0,5 mm descarta "
            "muito colmo, e aceitar 36 a 42 mm aproveita quase tudo. Quem se adapta é "
            "a virola e a bucha da ponta, não o colmo"
        ),
        "custoNaoContabilizado": (
            "o preço de R$ 0,54 é do MATERIAL, e não inclui o rendimento da seleção. "
            "Faixa estreita significa descarte, e descarte é custo"
        ),
    },
    "nos": {
        "veredito": "incomodam sob a mão que desliza, e resolve fácil",
        "solucoes": (
            "lixar SÓ o colar externo do nó — seguro, ao contrário de lixar o colmo "
            "inteiro, porque a força do nó está no diafragma interno e não na saliência",
            "posicionar o corte para que os nós caiam onde a mão não corre",
            "empunhadura de borracha, cortiça ou fita no trecho de trabalho, que "
            "resolve de vez e ainda melhora o atrito com luva",
        ),
        "eOnoEBOM": (
            "estruturalmente o nó é onde o bambu resiste a rachar, e é por isso que a "
            "junta com a pá deve ficar perto de um"
        ),
    },
    "marca": "ANÁLISE, NÃO ESTUDO: não medido, não verificado",
}


#: PREENCHER O COLMO: ajuda? A resposta separa duas coisas que parecem uma só.
#:
#: PARA RIGIDEZ, NÃO SERVE — e é a mesma física que faz o tubo existir. O material
#: do centro não trabalha em flexão, porque a contribuição vai com a quarta
#: potência da distância ao eixo. Espuma de poliuretano a 40 kg/m³ acrescenta 13%
#: de massa e 0,13% de rigidez. Tarugo de madeira dá +65% de rigidez, mas custa
#: +168% de massa: quem quer rigidez aumenta 3 mm no diâmetro, que sai de graça.
#:
#: PARA AMASSAMENTO, SERVE MUITO — e é o modo de falha real, o mesmo que motivou a
#: parede mínima e o cuidado com o parafuso. Tubo cheio não afunda a parede no
#: encaixe nem quando bate em pedra, e o preenchimento colado segura a trinca.
#:
#: E POR ISSO SÓ AS PONTAS: 15 cm em cada extremidade com espuma pesa 23 g, 8% do
#: cabo. É a bucha da ponta que já estava na recomendação, agora com número.
PREENCHIMENTO = {
    "paraRigidez": {
        "veredito": "não serve",
        "porQue": ("o material do centro não trabalha em flexão: a contribuição vai "
                   "com a quarta potência da distância ao eixo"),
        "numeros": {
            "espuma PU 40 kg/m³": {"massa": "+13%", "rigidez": "+0,13%"},
            "espuma PU 100 kg/m³": {"massa": "+34%", "rigidez": "+0,39%"},
            "cortiça 150 kg/m³": {"massa": "+51%", "rigidez": "+0,19%"},
            "tarugo de madeira": {"massa": "+168%", "rigidez": "+65%"},
        },
        "alternativaMelhor": ("quem quer rigidez aumenta 3 mm no diâmetro; sai de "
                              "graça em massa e custo"),
    },
    "paraAmassamento": {
        "veredito": "serve muito, e é o modo de falha que importa",
        "porQue": ("tubo cheio não afunda a parede no encaixe da pá nem ao bater em "
                   "pedra, e o preenchimento colado segura a trinca de abrir"),
        "ondeEncher": "só as pontas: 15 cm de cada lado com espuma pesam 23 g, 8% do cabo",
        "eOMesmoQue": "a bucha da ponta que já estava na recomendação, agora com número",
    },
    "oQueNAOfazer": (
        "encher o cabo inteiro e selar: se entrar água num tubo fechado e cheio, ela "
        "não sai, e o bambu apodrece por dentro sem ninguém ver"
    ),
    "marca": "ANÁLISE, NÃO ESTUDO: os números de massa e rigidez saem de conta, mas "
             "a resistência ao amassamento NÃO foi calculada — é raciocínio, não medida",
}


#: FORNECEDORES: busca feita na web em 2026-09-01. NENHUMA das empresas foi
#: verificada — não se sabe se estão ativas, se atendem volume, nem se vendem
#: colmo classificado por diâmetro. É lista de partida para telefonar, e não
#: lista de fornecedor qualificado. Dizer o contrário seria transformar uma busca
#: em due diligence.
FORNECEDORES = {
    "oProblemaQueABuscaRevelou": (
        "o mercado brasileiro de bambu TRATADO mira CONSTRUÇÃO, e por isso vende "
        "colmo grosso: os kits anunciados são de 13 a 14 cm. O cabo precisa de 36 a "
        "42 mm, que é a ponta fina. Não falta material — falta canal"
    ),
    "aConvergenciaBoa": (
        "a espécie que dá colmo nesse diâmetro é também a ambientalmente segura. "
        "Bambusa tuldoides (bambu comum ou caipira) é ENTOUCEIRANTE, não alastra por "
        "rizoma, e cresce na faixa certa. Já Dendrocalamus asper e giganteus, que são "
        "os que a indústria trata, são grandes demais"
    ),
    "encontrados": (
        {"nome": "Bambu Show", "url": "http://bambushow.blogspot.com/p/produtos.html",
         "porQue": "o mais próximo: corta sob medida e lista varas de 1,5 a 20 cm, "
                   "com tratamento — nosso diâmetro cai dentro"},
        {"nome": "Bambu Market", "url": "https://bambu.com.br/categoria-produto/bambu-tratado/bambu-dendrocalamus-asper-tratado/",
         "porQue": "tratado, mas só asper em 13 a 14 cm: grosso demais"},
        {"nome": "Bambugalô", "url": "https://www.bambugalo.com.br/bambu-tratado",
         "porQue": "distribuidor de tratado no Nordeste"},
        {"nome": "Bambuaria", "url": "https://bambuaria.com.br/venda-de-bambu.php",
         "porQue": "venda de colmo"},
        {"nome": "Sítio Flora Sol", "url": "https://www.sitioflorasol.com.br/product-page/bambu-tuldoides",
         "porQue": "mudas de tuldoides, não colmo cortado — serve para plantar, não para comprar"},
    ),
    "certificacao": {
        "veredito": "possível, não estabelecida",
        "detalhe": (
            "o FSC cobre produto não-madeireiro e tem o padrão SLIMF para pequeno "
            "produtor, que é exatamente o perfil de quem planta bambu. Mas NÃO foi "
            "encontrada nenhuma operação de bambu certificada FSC no Brasil"
        ),
        "consequencia": ("se certificação for exigência da empresa, isso vira um "
                         "projeto com o fornecedor, e não uma compra"),
    },
    "marca": ("BUSCA NA WEB, NÃO VERIFICADA: nenhuma empresa foi contatada nem "
              "conferida quanto a atividade, capacidade ou classificação por diâmetro"),
}


#: JANELA DE ACEITAÇÃO DO COLMO, e ela existe porque a pergunta certa não é "qual
#: diâmetro?" mas "o que serve?".
#:
#: A busca de fornecedor levantou a dúvida de abandonar o bambu por falta de
#: garantia de diâmetro. A dúvida some quando se olha o que de fato é exigido: os
#: 37 mm recomendados não são requisito, são o resultado de casar com o eucalipto
#: carregando a incerteza larga. Varrendo diâmetro e parede, **43 combinações**
#: entre 35 e 45 mm empatam com o eucalipto E ficam mais leves e mais baratas que
#: ele. A pior delas, 45 × 6 mm, ainda dá 0,618 kg contra 0,772 e R$ 1,24 contra
#: 3,09.
#:
#: O pedido ao fornecedor, então, não é uma medida — é uma faixa larga, e o
#: projeto se ajusta ao que existe em vez de o contrário.
JANELA_DE_COLMO = {
    "pedidoAoFornecedor": (
        "colmo entouceirante, 35 a 45 mm de diâmetro externo, parede de no mínimo "
        "3 mm, tratado contra caruncho"
    ),
    "porQueNaoEUmaMedida": (
        "os 37 mm são resultado de casar com o eucalipto carregando incerteza larga, "
        "e não requisito. Qualquer combinação da janela serve, com massa e custo "
        "diferentes — o projeto se ajusta ao que o fornecedor tem"
    ),
    "combinacoesQueServem": 43,
    "faixaDeDiametro_mm": (35, 45),
    "paredeMinima_mm": 3.0,
    "piorCasoDaJanela": {"geometria": "45 × 6 mm", "massa_kg": 0.618, "custo": 1.24,
                         "aindaAssim": "20% mais leve e 60% mais barato que o eucalipto"},
    "seOColmoFalhar": (
        "bambu laminado é fabricado NA MEDIDA, sem problema de seleção nenhum. Custa "
        "quatro vezes mais por quilo e ainda sai 59% mais leve e 18% mais barato por "
        "cabo que o eucalipto — é a reserva, não o plano"
    ),
    "ordemDeAcao": (
        "telefonar para quem lista faixa fina",
        "ajustar o projeto ao que o fornecedor tem dentro da janela",
        "bambu laminado como reserva",
    ),
}


def recomendar() -> dict[str, Any]:
    """O que fazer, depois que a fonte primária derrubou duas conclusões minhas.

    O QUE MUDOU. O Wood Handbook (FPL-GTR-190, domínio público) foi lido neste
    ambiente e deu o eucalipto seco a 12% de umidade: 111,7 MPa, não os 75 MPa que
    eu vinha usando — 75 é aproximadamente o valor da madeira VERDE, e cabo de pá
    é madeira seca. Duas conclusões caíram junto:

      - o eucalipto PASSA na porta estrutural (margem p05 1,01). O "achado" de que
        a carga suposta era abusiva estava errado: a carga estava certa, minha
        propriedade é que estava errada;
      - a barra para o candidato subiu 50%.

    O QUE SOBROU DE PÉ, e agora contra um concorrente medido de verdade: o
    papel-lignina continua ganhando em custo, em amortecimento, em saúde e em
    ambiente. Ele precisa de 50 mm para passar carregando minha incerteza, e de
    45 mm se a resistência for medida.

    A TROCA HONESTA, dita em número: 1,29 kg contra 0,77 kg do eucalipto. O cabo é
    68% mais pesado para dissipar 126% mais vibração. Quem segura a ferramenta o
    dia todo é quem decide se esse câmbio vale, e isso não é decisão de quem
    calcula.
    """
    return {
        "candidato": "papel-lignina",
        "porQueEle": (
            "ganha em custo, em amortecimento, em saúde e em ambiente, e ainda "
            "dispensa a norma de emissão de formaldeído — e perde em resistência e "
            "em peso, agora contra um eucalipto com fonte primária"
        ),
        "aTrocaEmNumero": {
            "massa_kg": {"eucalipto": 0.77, "papel-lignina": 1.29},
            "dissipacao": {"eucalipto": "27%", "papel-lignina": "61%"},
            "resumo": "68% mais pesado para dissipar 126% mais vibração",
            "quemDecide": "quem segura a ferramenta o dia todo, não quem calcula",
        },
        "doisCaminhos": {
            "medindo": {"diametro_mm": 45, "massa_kg": 1.15,
                        "exige": "ensaio de flexão em ao menos dez corpos de prova"},
            "sem_medir": {"diametro_mm": 50, "massa_kg": 1.29,
                          "exige": "nada, mas o cabo carrega minha ignorância em peso"},
            "licao": "não medir custa 5 mm de diâmetro e 140 g",
        },
        "proximaAcao": {
            "o_que": "ensaio de flexão de três pontos em ao menos dez corpos de prova",
            "porQue": ("a incerteza que reprova o cabo é a minha, não a do material: "
                       "estreitar a faixa de 45-130 MPa para ±15% vale 5 mm de diâmetro"),
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
        "assimetriaDasFontes": (
            "O eucalipto tem fonte primária de domínio público (FPL-GTR-190) e o "
            "candidato NÃO tem nenhuma: os números dele saíram de memória. O "
            "benchmark é sólido; o candidato é o que precisa ser medido."
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
            f"As propriedades dos demais materiais são {FONTE}. Os fatores de perda são a entrada mais "
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
            "CORREÇÃO REGISTRADA: este estudo afirmou que o caso de carga era abusivo "
            "porque reprovava até o eucalipto. Estava errado. Eu usava 75 MPa para a "
            "madeira, que é o valor VERDE; o Wood Handbook dá 111,7 MPa a 12% de umidade, "
            "que é a condição de um cabo. Com o valor certo o eucalipto passa, a carga "
            "estava correta, e a barra para o candidato subiu 50%.",
            "ASSIMETRIA DE FONTES: só o eucalipto tem fonte primária (FPL-GTR-190, "
            "domínio público, lido diretamente). Todos os outros materiais, inclusive o "
            "candidato recomendado, seguem com números de memória.",
        ),
    )
