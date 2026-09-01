# Cabo de pá: alternativas ao eucalipto — dossiê técnico

**O que este documento é:** um estudo computacional comparando nove materiais para
cabo de pá, com as contas, os critérios fixados antes de calcular, a origem de cada
número, os limites do que foi feito, e a literatura que sustenta as perguntas.

**O que ele não é:** ensaio. Nada foi medido em bancada.

**Versão em página web, para leitura fora do repositório:**
<https://claude.ai/code/artifact/8a67eb1d-16d3-4068-bc50-16db3d18cca4>

## 1. A pergunta

Substituir o cabo de pá de eucalipto por alternativa mais barata, com resistência
igual ou maior, boa absorção de impacto e vibração, acessível, sem agredir o meio
ambiente, sem risco de intoxicação ou irritação, e sem processo de fabricação caro
ou demorado.

## 2. Resposta curta

**Colmo de bambu**, em tubo de 43 × 3 mm, **com seleção de lote**. Contra o
eucalipto brasileiro: **43% mais leve, 62% mais barato, dissipa 31% da vibração
contra 27%, e seca cerca de 114 vezes mais rápido.**

**A seleção de lote não é opcional.** Sem ela o mesmo cabo dá 0,61 contra 0,63 do
eucalipto — perde, por pouco. Com ela, 1,07. Esta é a mudança mais importante
desta versão, e ela veio de dado medido que substituiu a minha memória.

Ele tem ainda duas exigências próprias — tratamento contra caruncho, obrigatório —
e um risco que este estudo não modela: rachadura ao longo da fibra com ciclo de
umidade.

**Se bambu não for viável, pinus comercial em 44 mm** empata com folga e custa
quase o mesmo do eucalipto, em troca de 58% mais peso. A fraqueza dele — madeira
mole, que amassa e marca — este estudo **não** mede.

### As três correções que mudaram este dossiê, e todas pioraram números

Estão aqui porque um dossiê que só melhora não é dossiê, é propaganda.

**1. O concorrente era a árvore errada.** As versões anteriores comparavam tudo
contra **jarrah**, do Wood Handbook americano. Jarrah e karri são espécies
**australianas**, e o Brasil não planta isso: aqui é grandis, saligna, urophylla e
o híbrido **urograndis**. O erro não foi de cálculo, foi de pergunta: usei a fonte
primária que **existia** em vez da que **respondia**. Com dado brasileiro medido, o
concorrente é mais fraco e mais leve, e a margem dele cai de 0,90 para 0,63.

**2. O bambu era o material pior documentado do estudo.** O concorrente tinha fonte
medida e o candidato recomendado rodava com a minha memória. Fechado: agora há dado
brasileiro medido de colmo inteiro — e ele **corrige meus números para baixo nos
três**. Eu usava 170 MPa, 15,0 GPa e 700 kg/m³; o medido dá **136,3 MPa, 13,1 GPa
e 740 kg/m³**. Eu estava 25% otimista na resistência, a favor do candidato que eu
mesmo recomendava.

Pior que o valor central foi a **cauda**: eu cortava a faixa em 100 MPa, e a
literatura de colmo inteiro desce a **62 MPa**. É essa cauda que torna a seleção de
lote obrigatória. E **engrossar não substitui selecionar**: de 37 para 43 mm a
margem sobe de 0,44 para 0,61 e para aí. Colmo ruim é ruim em qualquer diâmetro que
ainda caiba na mão.

**3. Efeito de tamanho.** Resistência não é propriedade média: ela é decidida pelo
maior defeito que por acaso está na peça, e peça maior tem mais chance de conter
defeito grande. Os valores de manual vêm de corpo de prova pequeno, e o cabo é
maior. Todos os números caíram — madeira 10 a 16%, compósitos 27%. Metal não recebe
a correção, porque escoa em volta do defeito; isso cria um viés a favor do metal,
declarado na seção 12.

## 3. Todos os candidatos

Cabo de 1,2 m, carga de 300 N na ponta, cada um na geometria que se compra.
Ordenados por resistência por quilo. O **eucalipto-urograndis** é o concorrente; o
`eucalipto` (jarrah) fica como referência estrangeira, não como alvo. A coluna
`fonte` diz quem tem dado medido lido diretamente e quem ainda roda de memória.

| material | geometria | σ/ρ | fator tam. | margem (p05) | custo | dissipa | saúde | ambiente | água | fabric. | fonte |
| --- | :-: | ---: | ---: | ---: | ---: | ---: | :-: | :-: | :-: | :-: | :-: |
| fibra-de-vidro | 32 × 3.0 mm | 210.526 | 0.75 | 1.23 | 9.35 | 22% | 1 | 1 | 3 | 2 | — |
| pinus-elliottii | 32 mm | 189.831 | 0.90 | 0.71 | 2.56 | 27% | 3 | 3 | 1 | 3 | medida |
| bambu-colmo | 32 × 6.0 mm | 184.230 | 0.90 | 0.45 | 0.87 | 31% | 3 | 3 | 2 | 3 | medida |
| bambu-laminado | 32 × 6.0 mm | 171.429 | 0.90 | 0.69 | 3.29 | 31% | 3 | 3 | 2 | 3 | — |
| **eucalipto-urograndis** | 32 mm | 150.327 | 0.84 | 0.63 | 1.77 | 27% | 3 | 3 | 2 | 3 | medida |
| eucalipto | 32 mm | 139.625 | 0.90 | 0.90 | 3.09 | 27% | 3 | 3 | 2 | 3 | medida |
| papel-lignina-curaua | 32 × 4.5 mm | 138.462 | 0.73 | 0.56 | 4.25 | 43% | 2 | 3 | 1 | 2 | — |
| pinus-comercial | 44 mm | 137.255 | 0.68 | 0.96 | 1.86 | 27% | 3 | 3 | 1 | 3 | — |
| eucalipto-laminado | 32 mm | 113.333 | 0.90 | 0.63 | 5.07 | 27% | 2 | 3 | 2 | 2 | — |
| aluminio-6061-t6 | 32 × 2.0 mm | 102.222 | 1.00 | 0.97 | 12.21 | 1% | 3 | 1 | 3 | 3 | — |
| papel-fenolico | 32 × 4.5 mm | 88.889 | 0.73 | 0.36 | 3.15 | 54% | 1 | 2 | 2 | 3 | — |
| papel-lignina | 32 × 6.0 mm | 65.385 | 0.72 | 0.27 | 3.06 | 61% | 3 | 3 | 1 | 3 | — |
| aco-1020 | 32 × 1.2 mm | 44.586 | 1.00 | 0.80 | 6.56 | 2% | 3 | 2 | 2 | 3 | — |
| sisal-mamona | 32 × 4.5 mm | 13.043 | 0.73 | 0.07 | 6.44 | 79% | 2 | 3 | 2 | 2 | — |

Escala qualitativa: 3 = bom, 2 = aceitável, 1 = problemático; ordinal, não métrico.

**O bambu perdeu o primeiro lugar em resistência por quilo.** Com o valor de
memória ele batia até a fibra de vidro; com o medido, cai para terceiro. Ele
continua sendo o recomendado, e agora por outros motivos: preço, peso, saúde,
ambiente e processo. Isso precisa ser dito alto e não sumir na tabela, porque era a
conta que este dossiê vinha citando como razão principal.

**Leia a coluna de margem com cuidado.** Com o efeito de tamanho aplicado, **nem o
eucalipto passa em 1,0** nesta carga. Isso diz que 300 N na ponta de 1,2 m é caso
duro, e não que a madeira seja ruim — o cabo real de 71 cm tem margem bem maior. A
porta em 1,0 ficou como estava; baixá-la depois de ver o resultado seria escolher a
conclusão.

**Requisito estrutural é porta, não critério com peso.** Quebrar não se troca por
ser confortável ou barato.

### Candidatos que foram testados e reprovaram

| ideia | por que entrou | por que saiu |
| --- | --- | --- |
| eucalipto laminado | atacar a secagem sem trocar de matéria-prima | a cola custa mais que o material que ia substituir |
| sisal + resina de mamona | fibra longa nacional, resina vegetal sem formaldeído | a resina de mamona é flexível por projeto; mesmo no cenário otimista o cabo verga o dobro |
| papelão / papel reciclado | material barato e abundante | fibra curta e desalinhada: metade da resistência necessária, e resina nenhuma conserta fibra |
| pó de pedra, barro, geopolímero | material baratíssimo e disponível | cerâmica: rígida, quebradiça e pesada — margem 0,08 a 0,22 com 2 kg de cabo |
| madeira plástica (WPC) | serragem é resíduo a custo zero, zero dia de estufa, amortece muito bem | a 45 mm ele até alcança a resistência, no extremo otimista — e pesa **2,19 kg contra 0,59 kg** |
| micarta (tecido + fenólica) | material antigo, muito amortecedor | é o papel-fenólico da tabela: metade da resistência, e formaldeído |
| pinus **selecionado** | resistência alta por quilo | o prêmio de peça sem nó o deixa mais caro que o eucalipto |
| osso, chifre, corno, madrepérola | material natural duro, e o osso é mineral rígido com colágeno tenaz | chifre e corno reprovam por serem **moles**; madrepérola por ser **pesada**; e o bambu tem a mesma arquitetura com o dobro do desempenho |

## 4. Dimensionado para empatar com o eucalipto brasileiro

Amortecimento é propriedade do **material** e vale em qualquer diâmetro; engrossar o
cabo serve para resistência, não para vibração. As duas colunas de margem mostram o
preço de não selecionar o lote.

| variante | material | geometria | massa | vs. euc. | custo | p05 c/ seleção | p05 s/ seleção | dissipa |
| --- | --- | :-: | ---: | ---: | ---: | ---: | ---: | ---: |
| **eucalipto-urograndis** | madeira maciça | 32 mm | 0.59 kg | — | 1.77 | 0.63 | 0.63 | 27% |
| pinus-comercial | madeira maciça | 44 mm | 0.93 kg | +58% | 1.86 | 0.96 | 0.96 | 27% |
| extrema | papel-lignina | 50 × 6.0 mm | 1.29 kg | +119% | 5.18 | 1.15 | 0.77 | 61% |
| bambu-sem-selecionar | bambu-colmo | 43 × 3.0 mm | 0.33 kg | -43% | 0.67 | 1.07 | 0.61 | 31% |
| igualitaria-sem-medir | papel-lignina | 45 × 8.0 mm | 1.45 kg | +146% | 5.80 | 1.03 | 0.69 | 61% |
| curaua-sem-medir | papel-lignina-curaua | 41 × 3.0 mm | 0.56 kg | -5% | 3.91 | 1.00 | 0.75 | 43% |
| bambu-laminado | bambu-laminado | 43 × 3.0 mm | 0.32 kg | -46% | 2.53 | 0.94 | 0.92 | 31% |
| bambu-selecionado | bambu-colmo | 37 × 3.0 mm | 0.28 kg | -52% | 0.57 | 0.78 | 0.44 | 31% |
| curaua-medida | papel-lignina-curaua | 36 × 3.0 mm | 0.49 kg | -18% | 3.40 | 0.76 | 0.57 | 43% |
| igualitaria-medida | papel-lignina | 45 × 4.2 mm | 0.84 kg | +42% | 3.36 | 0.73 | 0.49 | 61% |
| igualitaria-40mm | papel-lignina | 40 × 6.6 mm | 1.08 kg | +83% | 4.32 | 0.72 | 0.48 | 61% |

**Para o colmo, "selecionar" não é ensaiar — é escolher o que entra.** A variação é
da planta, e nenhum ensaio a reduz: mede-se para descartar, não para melhorar. Na
prática isso é gabarito de diâmetro e parede, e descarte de colmo novo, ferido ou
de parede fina. A seção 9 detalha.

**O pinus comercial é a alternativa de quem não tem bambu.** Ele empata com folga e
não depende de seleção, mas pesa 58% mais. Exige duas coisas de projeto, ambas
baratas e padrão de ferramenta: **virola metálica ou parafuso passante com arruela**
na zona do encaixe, porque pinus esmaga no furo do rebite; e **acabamento em óleo ou
cera**, porque apodrece mais rápido. Tratamento de autoclave com sal metálico é
remédio de poste enterrado, não se aplica a cabo de mão, e brigaria com a exigência
de não-toxicidade.

## 4b. Quando parar de procurar

Não dá para esgotar a lista de materiais: sempre aparece mais uma ideia, e cada
uma custa uma rodada de conta para morrer. Este estudo gastou assim com papelão,
barro, pó de pedra, sisal, madeira plástica, micarta e laminado — sete candidatos,
sete reprovas.

Dá, em compensação, para **fechar o espaço por baixo**. As restrições do problema
— 300 N na ponta de 1,2 m, no máximo 45 mm para caber na mão, no máximo 1,0 kg de
cabo, vergando no máximo o que o eucalipto verga — recortam uma região no plano de
**resistência por quilo** contra **rigidez por quilo**. Fora dela, não há material
possível.

**O piso, no caso mais generoso:**

| exigência | mínimo |
| --- | ---: |
| resistência por quilo (σ/ρ) | **76.800** |
| rigidez por quilo (E/ρ) | **5.461.000** |

Um candidato novo se testa em uma linha: divide a resistência pela densidade,
divide o módulo pela densidade, e compara. Todos os sete reprovados deste dossiê
morrem aqui, sem chegar à bancada. O bambu passa com quase três vezes a folga
necessária em resistência.

**Duas ressalvas, e elas são o que impede a peneira de virar armadilha:**

A conta é de **seção cheia**. Tubo joga material para longe do centro e afrouxa o
piso a favor do candidato — a peneira reprova o aço, e reprova errado: aço vira
cabo como tubo de parede fina. Quem se usa em tubo tem de ser avaliado como tubo.

E passar não é ser aprovado. **Saúde, toxicidade, preço, fornecedor, dureza,
apodrecimento, fadiga e farpa ficam todos de fora desta conta.** O alumínio passa
com folga e continua reprovado no estudo, por vibração. Reprovar aqui é
definitivo; passar é apenas não estar eliminado.

## 5. Preparo da matéria-prima

Secar é difusão, e o tempo vai com o **quadrado** da espessura que a água atravessa.
O cabo de eucalipto é maciço; o colmo já vem oco.

| peça | caminho de difusão | vezes mais lento | passos |
| --- | ---: | ---: | --- |
| cabo de eucalipto (maciço 32 mm) | 16.0 mm | 114× | abate e corte, secagem, torneamento, acabamento |
| colmo de bambu (parede 3 mm) | 1.5 mm | 1× | corte do colmo, imersão contra caruncho, secagem, corte no comprimento |
| bambu laminado (ripa 6 mm) | 3.0 mm | 4× | corte, imersão, secagem, laminação, usinagem |

*Os dias absolutos são otimistas — cabo de eucalipto seca ao ar em meses. a razão entre as peças é o resultado confiável, porque a difusividade se cancela nela e sobra a razão dos quadrados das espessuras.*

O tratamento contra caruncho **não soma**: a imersão em bórax pode ser feita com o
colmo ainda verde. E o modelo não considera colapso nem rachadura ao secar, que no
eucalipto viram perda de material — ou seja, a comparação real tende a favorecer o
bambu ainda mais.

## 6. Processo de fabricação

### bambu-colmo

**Dispensa:** resina, impregnação, enrolamento, máquina de laminar, estufa de cura.

**Exige:**

- secagem: semanas ao ar ou dias em estufa — mas o cabo de eucalipto também seca, então não é custo novo
- tratamento contra caruncho: bambu tem amido e é comido por besouro; sem tratar, o cabo dura de um a três anos. O método padrão é imersão em bórax e ácido bórico, barato e difundido, mas é um tanque e alguns dias

**Risco de durabilidade:** rachadura ao longo da fibra com ciclo de umidade. É o problema real do bambu, e não a resistência — e este estudo NÃO o modela.

### bambu-laminado

**Dispensa:** máquina especial.

**Exige:**

- as mesmas secagem e tratamento do colmo
- laminação de ripas, que é indústria estabelecida para piso e móvel
- adesivo — e aqui a pergunta do formaldeído reaparece, com resposta conhecida: existe versão sem

**Risco de durabilidade:** some a rachadura de colmo e some o nó; em troca, a colagem vira o ponto de falha, e ela depende do adesivo escolhido.

Para comparação, o laminado de papel com lignina exige resina, impregnação,
enrolamento, máquina de laminar e estufa de cura — tudo o que o bambu dispensa.

## 7. Ambiente e fornecimento

*Esta seção é **análise**, não estudo: nada aqui foi medido nem verificado contra
fonte primária. Ela entra porque decide adoção tanto quanto resistência.*

### bambu-colmo

**A favor:**

- é uma gramínea: corta-se o colmo e a touceira rebrota sem replantio, em ciclo de três a cinco anos contra sete ou mais do eucalipto
- não leva resina, adesivo nem aditivo, então não há emissão de processo nem passivo de descarte
- sequestro de carbono rápido durante o crescimento

**Impedimentos e cuidados:**

- ESPÉCIE IMPORTA: bambus alastrantes do gênero Phyllostachys se espalham por rizoma e são tratados como invasores em vários lugares; os entouceirantes (Bambusa, Dendrocalamus) ficam onde foram plantados. Escolher espécie errada cria problema ambiental em vez de resolver
- colheita de bambu NATIVO em área de mata pode exigir licenciamento; bambu cultivado não tem esse entrave
- o banho de bórax gera efluente: boro em concentração alta afeta planta, e o tanque precisa de reuso em circuito fechado em vez de descarte

**Fornecimento:**

- MATÉRIA-PRIMA ABUNDANTE, CADEIA IMATURA — e essa distinção é a mesma que apareceu na lignina. O Brasil tem cultivo relevante, com histórico de plantios grandes para celulose no Nordeste, e há política pública específica de incentivo ao cultivo. Mas a cadeia de colmo CLASSIFICADO, com lote conferido e diâmetro consistente, é artesanal e regional. Comprar bambu é fácil; comprar bambu com garantia de lote não é
- o eucalipto, em contraste, tem cadeia industrial madura para cabo pronto: é a vantagem real dele neste estudo, e não a propriedade mecânica

### bambu-laminado

**A favor:**

- aproveita colmo fora de bitola e resíduo de corte, o que melhora o uso do material colhido
- some o nó e a variação de colmo, que é o que trava a cadeia do colmo natural

**Impedimentos e cuidados:**

- volta a depender de adesivo, e aí a pergunta do formaldeído reaparece — com resposta conhecida, porque existe versão sem
- a laminação gasta energia e gera resíduo que o colmo cortado não gera

**Fornecimento:**

- indústria estabelecida no mundo todo para piso e móvel, o que dá cadeia mais previsível que a do colmo — em troca de quatro vezes o custo

### O padrão que se repete

Tanto na lignina quanto no bambu o gargalo é o mesmo e não é o material:
**matéria-prima abundante, cadeia imatura**. Comprar bambu é fácil; comprar bambu
com garantia de lote não é. A vantagem real do eucalipto neste estudo não é
propriedade mecânica — é ter cadeia industrial pronta para cabo acabado.
## 8. Fixação, sol e resina

*Análise, não estudo: nada aqui foi medido.*

### Parafuso — o bambu não aceita a mesma fixação do eucalipto

Eucalipto é maciço e o parafuso morde material inteiro; o colmo é oco com 3 mm de parede, e bambu racha ao longo da fibra com facilidade que a madeira não tem. parafuso auto-atarraxante cunha as fibras e inicia trinca longitudinal — é por isso que construção com bambu tradicionalmente evita prego e parafuso.

É o mesmo modo de falha que já obrigou a parede mínima de 3 mm, agora aparecendo na
junta — que é onde ferramenta costuma falhar de verdade.

**Soluções conhecidas, todas baratas e todas obrigatórias como conjunto:**

- bucha interna na ponta: tarugo de madeira ou plug ocupando os últimos 10 a 15 cm, para o parafuso morder sólido e a parede não amassar
- parafuso passante com arruela em vez de auto-atarraxante, que distribui em vez de cunhar
- anel ou virola metálica por fora da junta, impedindo a trinca de abrir
- posicionar a junta perto de um NÓ, que é o diafragma natural do bambu e onde ele resiste a rachar

**Custo:** barato, mas obrigatório: é detalhe de projeto, não opcional.

### A outra ponta: toda extremidade cortada é um início de trinca

As quatro medidas acima cuidam da ponta que entra na pá. A de cima fica simplesmente
**aberta**, e é daí que a rachadura começa: a extremidade livre não tem nada segurando
as fibras juntas.

- cortar logo acima de um NÓ: o nó é um diafragma que fecha o tubo e trava as fibras. Custo zero — é só posicionamento do corte, e é a regra mais barata do projeto inteiro;
- tampa ou anel na ponta, quando o corte não puder cair num nó;

**A regra que resume:** os DOIS cortes do cabo devem cair em nó sempre que der; isso ataca a maior ameaça de durabilidade do bambu sem custar nada.
### Sol e tempo — empate

Uv degrada lignina na superfície dos dois: acinzenta, abre microfissura e abre caminho para a água. o bambu tem vantagem inicial pela epiderme cerosa e rica em sílica, mas quando ela se vai o comportamento se iguala.

Os dois pedem acabamento e reaplicação periódica; nenhum ganho e nenhuma perda na comparação.

### Resina — não precisa, mas pode

**Não usar resina é porque não precisa ou porque não pode?**

Não precisa estruturalmente: o colmo já é um compósito de fibra contínua unida por lignina natural, e chega aos 170 mpa sem impregnação, prensagem nem cura. dispensar resina é economia de processo, não sacrifício.

**Onde ela ajuda:**

- selagem superficial contra umidade, que reduz — mas NÃO elimina — a rachadura: bambu também racha por gradiente interno e por tensão de crescimento, não só pela superfície
- bucha ou adesivo na ponta, para a fixação descrita acima

**Onde ela não pode:**

- fenólica e ureia-formol, pela emissão de formaldeído — a restrição do usuário é a essas, e não a resina em geral
- epóxi merece ressalva que costuma faltar: o epóxi NÃO CURADO é sensibilizante de contato e causa dermatite ocupacional, então 'base água' não o torna automaticamente a opção limpa

**Selantes realmente mansos:** óleo de linhaça, cera de carnaúba, goma-laca.
## 9. Como se obtém a medida, na prática

*Análise, não estudo: nada aqui foi medido.*

### Diâmetro: não se usina, se seleciona

- classificação por gabarito de anel passa-não-passa, com os colmos indo para caixas por faixa de diâmetro — é o padrão em construção com bambu
- a parede também varia, e diminui em direção ao topo do colmo, então a seleção é por diâmetro E por espessura na altura de corte

**O que não fazer:** tornear ou lixar a superfície externa para acertar o diâmetro: a resistência do bambu é GRADUADA, com as fibras mais densas na casca. Tirar 1 mm de fora custa muito mais que 1 mm de material.

**Consequência de projeto:** o projeto tem de tolerar FAIXA e não medida: exigir 37 ± 0,5 mm descarta muito colmo, e aceitar 36 a 42 mm aproveita quase tudo. Quem se adapta é a virola e a bucha da ponta, não o colmo.

**Custo não contabilizado:** o preço de R$ 0,54 é do MATERIAL, e não inclui o rendimento da seleção. Faixa estreita significa descarte, e descarte é custo.

### Nós: incomodam, e resolve fácil

- lixar SÓ o colar externo do nó — seguro, ao contrário de lixar o colmo inteiro, porque a força do nó está no diafragma interno e não na saliência
- posicionar o corte para que os nós caiam onde a mão não corre
- empunhadura de borracha, cortiça ou fita no trecho de trabalho, que resolve de vez e ainda melhora o atrito com luva

E lembrando: estruturalmente o nó é onde o bambu resiste a rachar, e é por isso que a junta com a pá deve ficar perto de um.

### Rigidez — a pergunta sobre vergar

Tubo oco não é mole por ser oco: ele põe material longe do centro, que é onde o
material trabalha em flexão.

| cabo | flecha | rigidez |
| --- | ---: | ---: |
| eucalipto 32 mm maciço | 258 mm | — |
| bambu-selecionado (37 × 3.0 mm) | 247 mm (-4%) | 1.05× |
| bambu-sem-selecionar (43 × 3.0 mm) | 152 mm (-41%) | 1.70× |
| igualitaria-40mm (40 × 6.6 mm) | 287 mm (+11%) | 0.90× |

**No diâmetro recomendado o bambu é 5% mais rígido que o eucalipto maciço.** Mas a
34 mm ele fica 21% menos rígido: o oco só funciona porque é 37 mm e não 32 — o que
salva é o diâmetro, não o material.

A rigidez entrou como critério tarde, quando o usuário perguntou, e já reprovou uma
variante que passava em tudo: a lignina em 40 mm verga 11% mais que a madeira.
### Preencher o colmo ajuda?

Separa em duas coisas que parecem uma só.

**Para rigidez, não serve.** É a mesma física que faz o tubo existir: o material do
centro não trabalha em flexão.

| preenchimento | massa a mais | ganho de rigidez |
| --- | ---: | ---: |
| espuma PU 40 kg/m³ | +13% | +0,13% |
| espuma PU 100 kg/m³ | +34% | +0,39% |
| cortiça 150 kg/m³ | +51% | +0,19% |
| tarugo de madeira | +168% | +65% |

**Alternativa melhor:** quem quer rigidez aumenta 3 mm no diâmetro; sai de graça em massa e custo.

**Para amassamento, serve muito** — e é o modo de falha que importa. Tubo cheio não afunda a parede no encaixe da pá nem ao bater em pedra, e o preenchimento colado segura a trinca de abrir.

**Onde encher:** só as pontas: 15 cm de cada lado com espuma pesam 23 g, 8% do cabo. É a bucha da ponta que já estava na recomendação, agora com número.

**O que não fazer:** encher o cabo inteiro e selar: se entrar água num tubo fechado e cheio, ela não sai, e o bambu apodrece por dentro sem ninguém ver.
## 10. Fornecedores nacionais

*Busca na web em 2026-09-01. Nenhuma empresa foi contatada nem verificada.*

**O que a busca revelou.** O mercado brasileiro de bambu tratado mira construção, e por isso vende colmo grosso: os kits anunciados são de 13 a 14 cm. o cabo precisa de 36 a 42 mm, que é a ponta fina. não falta material — falta canal.

**E uma convergência boa:** a espécie que dá colmo nesse diâmetro é também a ambientalmente segura. Bambusa tuldoides (bambu comum ou caipira) é ENTOUCEIRANTE, não alastra por rizoma, e cresce na faixa certa. Já Dendrocalamus asper e giganteus, que são os que a indústria trata, são grandes demais.

### Encontrados

- [Bambu Show](http://bambushow.blogspot.com/p/produtos.html) — o mais próximo: corta sob medida e lista varas de 1,5 a 20 cm, com tratamento — nosso diâmetro cai dentro.
- [Bambu Market](https://bambu.com.br/categoria-produto/bambu-tratado/bambu-dendrocalamus-asper-tratado/) — tratado, mas só asper em 13 a 14 cm: grosso demais.
- [Bambugalô](https://www.bambugalo.com.br/bambu-tratado) — distribuidor de tratado no Nordeste.
- [Bambuaria](https://bambuaria.com.br/venda-de-bambu.php) — venda de colmo.
- [Sítio Flora Sol](https://www.sitioflorasol.com.br/product-page/bambu-tuldoides) — mudas de tuldoides, não colmo cortado — serve para plantar, não para comprar.

### O que pedir ao fornecedor

> **colmo entouceirante, 35 a 45 mm de diâmetro externo, parede de no mínimo 3 mm, tratado contra caruncho**

Não é uma medida, é uma janela — e ela é larga: os 37 mm são resultado de casar com o eucalipto carregando incerteza larga, e não requisito. Qualquer combinação da janela serve, com massa e custo diferentes — o projeto se ajusta ao que o fornecedor tem.

**43 combinações** entre 35 e
45 mm empatam com o eucalipto **e** ficam mais leves e mais
baratas que ele. O pior caso da janela, 45 × 6 mm, ainda dá
0.618 kg contra 0,772 e R$ 1.24
contra 3,09.

**Se o colmo falhar:** bambu laminado é fabricado NA MEDIDA, sem problema de seleção nenhum. Custa quatro vezes mais por quilo e ainda sai 59% mais leve e 18% mais barato por cabo que o eucalipto — é a reserva, não o plano.

**Ordem de ação:** telefonar para quem lista faixa fina; ajustar o projeto ao que o fornecedor tem dentro da janela; bambu laminado como reserva.
### Certificação: possível, não estabelecida

O fsc cobre produto não-madeireiro e tem o padrão slimf para pequeno produtor, que é exatamente o perfil de quem planta bambu. mas não foi encontrada nenhuma operação de bambu certificada fsc no brasil. Consequência prática: se certificação for exigência da empresa, isso vira um projeto com o fornecedor, e não uma compra.

**Leia esta lista pelo que ela é.** BUSCA NA WEB, NÃO VERIFICADA: nenhuma empresa foi contatada nem conferida quanto a atividade, capacidade ou classificação por diâmetro. É ponto de partida para telefonar,
e não fornecedor qualificado — tratar uma busca como avaliação de fornecedor seria
inventar um trabalho que não foi feito.
## 11. Entradas, e de onde cada número veio

**Leia antes de discutir qualquer resultado.** Um só material tem fonte primária.

| material | módulo (GPa) | resistência (MPa) | densidade (kg/m³) | fator de perda | R$/kg | fonte |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| eucalipto | 13 | 112 | 800 | 0.0100 | 4.00 | **FPL-GTR-190** |
| aco-1020 | 205 | 350 | 7850 | 0.0005 | 6.00 | memória |
| aluminio-6061-t6 | 69 | 276 | 2700 | 0.0002 | 20.00 | memória |
| papel-fenolico | 8 | 120 | 1350 | 0.0250 | 5.00 | memória |
| papel-lignina | 6 | 85 | 1300 | 0.0300 | 4.00 | memória |
| papel-lignina-curaua | 20 | 180 | 1300 | 0.0180 | 7.00 | memória |
| bambu-colmo | 15 | 170 | 700 | 0.0120 | 2.00 | memória |
| bambu-laminado | 12 | 120 | 700 | 0.0120 | 8.00 | memória |
| fibra-de-vidro | 30 | 400 | 1900 | 0.0080 | 15.00 | memória |

### A fonte primária

Wood Handbook — Wood as an Engineering Material, FPL-GTR-190, USDA Forest Service, Forest Products Laboratory, 2010; Tabela 5-5a (Jarrah, Eucalyptus marginata, e Karri, Eucalyptus diversicolor, a 12% de umidade). Domínio público, consultado diretamente.

### A correção que ela impôs

O estudo usava 75 MPa para o eucalipto, que é aproximadamente o valor da madeira
**verde**. Cabo é madeira **seca**, e a 12% de umidade o jarrah dá 111,7 MPa. Com
isso, uma conclusão anterior caiu: eu havia dito que a carga de 300 N era abusiva
porque reprovava até o eucalipto — a carga estava certa, minha propriedade é que
estava errada. E a barra para os candidatos subiu 50%.

### A assimetria que precisa ficar clara

O eucalipto tem fonte primária de domínio público (FPL-GTR-190) e o candidato NÃO tem nenhuma: os números dele saíram de memória. O benchmark é sólido; o candidato é o que precisa ser medido.

## 12. Limites

- A BARREIRA QUE NÃO SE TRANSPÕE AQUI: nada foi ensaiado fisicamente. Impacto real envolve taxa de deformação, e cabo real sofre fadiga por milhares de ciclos — nenhuma das duas coisas está nesta conta.
- As propriedades dos demais materiais são valor de manual de memória; NÃO conferido contra fonte primária. Os fatores de perda são a entrada mais frágil: eles variam com frequência e com o método de medida, às vezes por um fator de dois.
- A madeira foi tratada com um módulo único, mas ela é anisotrópica: fibra longitudinal e transversal têm rigidez muito diferente, e nó e umidade mudam tudo.
- Densidade e módulo da madeira andam juntos no mundo real e foram sorteados de forma independente; a cauda ruim do eucalipto está otimista.
- A junta entre cabo e pá não entrou, e é onde ferramenta costuma falhar de verdade.
- Preço por quilo é ordem de grandeza, não cotação; ele muda com região, volume e momento.
- O papel-fenólico é a entrada mais fraca: faixas largas por ignorância, não por conservadorismo. E o estudo NÃO modela o que mais ameaça esse candidato — absorção de umidade, que degrada celulose, e o desempenho da vedação ao longo do tempo. Sem isso, qualquer aprovação dele aqui é provisória.
- A hipótese da vibração saiu `contradita` por ERRO MEU DE CRITÉRIO, não por o metal ser bom: pedi que a vibração RESTANTE dobrasse, e sobra é limitada a 1. Em energia dissipada, que é a medida certa, o metal dissipa cerca de dezessete vezes menos que a madeira. O critério não foi reescrito depois do resultado, e a versão corrigida está no módulo marcada como não testada.
- CORREÇÃO REGISTRADA, em três movimentos, porque ela mudou de lado duas vezes. Primeiro este estudo disse que o caso de carga era abusivo, porque reprovava até o eucalipto. Depois descobriu que o abusivo era o dado: 75 MPa é madeira VERDE, e cabo é madeira SECA, que o Wood Handbook dá em 111,7 MPa — com o valor certo o eucalipto passava e a barra subia 50%. Agora, com o efeito de tamanho aplicado, o eucalipto volta a reprovar, em 0,90, e desta vez sem erro de dado. A leitura final é que 300 N na ponta de 1,2 m É caso duro, e o cabo real de 71 cm está longe disso.
- VIÉS DECLARADO ENTRE FRÁGIL E DÚCTIL: a correção de tamanho desconta 10% da madeira, 27% dos compósitos e **nada** do metal, porque a estatística do elo mais fraco não descreve material que escoa. Está certo na física e cria uma assimetria: o alumínio passou à frente do eucalipto em margem por causa dela. O efeito de tamanho em metal é FRACO, não é ZERO, e aqui entra como zero por falta de modelo. Isso não promove o metal, que segue reprovado por vibração.
- INCOERÊNCIA DE QUALIDADE E PREÇO, corrigida depois de crítica externa: a versão anterior usava resistência de madeira sem nó com preço de madeira de pátio. Corrigido, o pinus selecionado sai MAIS CARO que o eucalipto, e só a peça comercial engrossada mantém vantagem de preço. O mesmo tipo de erro pode estar em outras linhas da tabela e não foi varrido.
- DUREZA DE SUPERFÍCIE NÃO É MODELADA, e é a fraqueza principal do pinus: madeira mole marca, amassa no encaixe e desgasta. Nenhuma conta deste dossiê a mede.
- ASSIMETRIA DE FONTES, **em boa parte fechada**: há três fontes primárias lidas diretamente — FPL-GTR-190 para o jarrah, Revista Árvore 33(3) 2009 para o urograndis, e REA 19(1) 2017 para o bambu, esta última em COLMO INTEIRO, que é a condição do cabo. O concorrente e o recomendado agora estão no mesmo pé. Os demais materiais seguem com números de memória, e todos eles já reprovaram — o que significa que a fraqueza de fonte restante está do lado dos eliminados, e não da recomendação.
- **NENHUMA DAS QUATRO FONTES PRIMÁRIAS MEDIU AMORTECIMENTO.** Elas medem resistência, módulo, densidade, compressão e cisalhamento. Todo fator de perda deste dossiê — inclusive o da coluna "dissipa", que é um argumento central da recomendação — é valor de manual de memória. E o rótulo de fonte é do MATERIAL, então ele se espalha por cima de uma propriedade que a fonte nunca tocou: quem lê a linha da seringueira vê "Scientia Forestalis 2020" e supõe que o amortecimento veio de lá. Não veio. As madeiras todas carregam o mesmo número porque eu copiei o mesmo número, e a igualdade na tabela parece resultado sendo premissa.
- E A FONTE MEDIDA PIOROU O CANDIDATO, não melhorou: eu estava 25% otimista na resistência do bambu e cortava a cauda baixa da faixa em 100 MPa quando a literatura de colmo inteiro desce a 62. Erro de memória com direção, e a direção favorecia o que eu recomendava.
- O CONCORRENTE ERA A ÁRVORE ERRADA até esta versão, e ninguém do lado de cá percebeu. O achado veio de crítica externa que listou as espécies plantadas no Brasil. Isso sugere que outras premissas do estudo podem estar erradas do mesmo jeito: não por conta mal feita, mas por pergunta mal escolhida.
- PREMISSA DECLARADA: o artigo brasileiro dá densidade **básica** (massa seca sobre volume verde), e o cabo trabalha a 12% de umidade. A conversão usa fator 1,22, que é valor usual e não medida deste caso. Usar a básica direto subestimaria a massa do cabo em cerca de 20%.
- CORPOS DE PROVA DE FONTES DIFERENTES dão descontos de tamanho diferentes: o brasileiro é 2 × 2 × 30 cm e o americano é 2,5 × 2,5 × 41 cm. Comparar duas fontes sem olhar isso mistura dois números que não são da mesma coisa.
- Rachadura do bambu ao longo da fibra com ciclo de umidade não é modelada, e é o
  risco real de durabilidade dele.
- Três restrições entraram no estudo depois que a otimização foi para o vazio delas:
  parede que enruga, diâmetro de 69 mm que não cabe na mão, e parede de 1,8 mm que
  amassa em uso. Pode haver uma quarta que ainda não apareceu.
- A busca de candidatos foi guiada pela ideia inicial, não por varredura do espaço,
  e isso já cobrou duas vezes. O bambu — material com séculos de uso em cabo de
  ferramenta — só entrou quando o usuário perguntou se havia algo melhor. E o
  pinus, a madeira mais plantada e mais barata do país, só entrou muito depois,
  porque o estudo tratou "madeira" como se fosse uma coisa só e foi procurar
  material exótico. Provavelmente há outros candidatos óbvios não testados.

## 13. O que precisa ser medido

Para o bambu, em ordem de valor:

- **rachadura em ciclo de umidade**, que é o risco real e o que este estudo não sabe;
- **resistência por lote de colmo**, que é seleção e não ensaio único;
- **fator de perda medido**, e ele subiu na lista: nenhuma das quatro fontes deste dossiê mede amortecimento, e ele é argumento central da recomendação;
- **resistência após ciclos**, porque cabo de pá é fadiga e isto foi carga única.

Para o pinus comercial, em ordem de valor:

- **dureza de superfície e desgaste no encaixe**, que é a fraqueza dele e não está
  em nenhuma conta daqui;
- **resistência do lote real**, porque a faixa de peça com nó é larga e é ela que
  manda no pior caso;
- **esmagamento no furo do parafuso**, com e sem virola, que é o modo de falha que
  a crítica externa apontou e o remédio proposto.

Para os laminados de papel, o primeiro item continua sendo resistência à flexão.

## 14. Literatura

70 publicações com DOI, de 10 buscas. **Estes artigos não
foram lidos** — eles sustentam que as perguntas são reconhecidas e os campos são
ativos, e não sustentam nenhum número deste documento. A única fonte efetivamente
lida é o Wood Handbook citado na seção 7.

### o candidato depende de um ligante natural que cole bem; o campo existe?

Busca: `lignin based wood adhesive bonding strength formaldehyde free` — 7344485 resultados, consultada em 2026-09-01.

- Zhu (2024), *Chemical Engineering Journal*. Aminated alkali lignin nanoparticles enabled formaldehyde-free biomass wood adhesive with high strength, toughness, and mildew resistance. [10.1016/j.cej.2024.152914](https://doi.org/10.1016/j.cej.2024.152914) — 63 citações.
- Hu (2025), *ACS Applied Polymer Materials*. Formaldehyde-Free, High-Bonding Performance, Fully Lignin-Based Adhesive Cross-Linked by Glutaraldehyde. [10.1021/acsapm.4c03378](https://doi.org/10.1021/acsapm.4c03378) — 14 citações.
- Chen (2026), *ACS Sustainable Chemistry &amp; Engineering*. A Formaldehyde-Free Lignin-Based Adhesive with High Bonding Strength, Mild Curing Conditions, and Reusability. [10.1021/acssuschemeng.5c13165](https://doi.org/10.1021/acssuschemeng.5c13165) — 2 citações.
- Li (2026), *ACS Sustainable Chemistry &amp; Engineering*. Wood Adhesive Based on Lignin-Crosslinked Epoxidized Carboxymethyl Chitosan with High Bonding Strength. [10.1021/acssuschemeng.6c05201](https://doi.org/10.1021/acssuschemeng.6c05201) — 1 citações.

### a recusa da variante fenólica se apoia em risco reconhecido, ou é implicância minha?

Busca: `formaldehyde emission particleboard adhesive regulation health` — 4127671 resultados, consultada em 2026-09-01.

- Ghani (2018), *Building and Environment*. Reducing formaldehyde emission of urea formaldehyde-bonded particleboard by addition of amines as formaldehyde scavenger. [10.1016/j.buildenv.2018.06.020](https://doi.org/10.1016/j.buildenv.2018.06.020) — 103 citações.
- Kawalerczyk (2022), *Polymers*. APTES-Modified Nanocellulose as the Formaldehyde Scavenger for UF Adhesive-Bonded Particleboard and Strawboard. [10.3390/polym14225037](https://doi.org/10.3390/polym14225037) — 45 citações.
- Zhang (2016), *RSC Advances*. Influence of a urea–formaldehyde resin adhesive on pyrolysis characteristics and volatiles emission of poplar particleboard. [10.1039/c5ra18068f](https://doi.org/10.1039/c5ra18068f) — 27 citações.
- Risnasari (2019), *Proceedings of the International Conference on Natural Resources and Technology*. Characterization of Particleboard from Waste Tea Leaves  (Camellia Sinensis L) and Meranti Wood (Shorea Sp) using Urea-Formaldehyde Adhesive and It’s Formaldehyde Emission. [10.5220/0008552702610264](https://doi.org/10.5220/0008552702610264) — 2 citações.

### laminado de papel tem propriedades mecânicas estudadas?

Busca: `paper phenolic laminate mechanical properties composite` — 2932267 resultados, consultada em 2026-09-01.

- Zhang (2022), *Composite Structures*. Mechanical properties prediction of composite laminate with FEA and machine learning coupled method. [10.1016/j.compstruct.2022.116086](https://doi.org/10.1016/j.compstruct.2022.116086) — 95 citações.
- Jang (2000), *Polymer Testing*. The effect of flame retardants on the flammability and mechanical properties of paper-sludge/phenolic composite. [10.1016/s0142-9418(98)00088-9](https://doi.org/10.1016/s0142-9418(98)00088-9) — 43 citações.
- Quagliato (2019), *Composite Structures*. Manufacturing process and mechanical properties characterization for steel skin – Carbon fiber reinforced polymer core laminate structures. [10.1016/j.compstruct.2018.10.078](https://doi.org/10.1016/j.compstruct.2018.10.078) — 10 citações.
- He (2021), *Composite Structures*. Experimental study on mechanical properties of sandwich tempered glass unidirectional composite laminate. [10.1016/j.compstruct.2020.112980](https://doi.org/10.1016/j.compstruct.2020.112980) — 7 citações.

### a diferença de amortecimento entre madeira e metal é medida por alguém?

Busca: `damping loss factor wood metal comparison vibration` — 2778867 resultados, consultada em 2026-09-01.

- Cherif (2015), *Journal of Sound and Vibration*. Damping loss factor estimation of two-dimensional orthotropic structures from a displacement field measurement. [10.1016/j.jsv.2015.06.042](https://doi.org/10.1016/j.jsv.2015.06.042) — 41 citações.
- Parrinello (2018), *Journal of Sound and Vibration*. Evaluation of damping loss factor of flat laminates by sound transmission. [10.1016/j.jsv.2018.03.017](https://doi.org/10.1016/j.jsv.2018.03.017) — 9 citações.
- Bin Fazail (2023), *Journal of Sound and Vibration*. Damping loss factor characterization of complex structures using a Green’s function-based model. [10.1016/j.jsv.2023.117642](https://doi.org/10.1016/j.jsv.2023.117642) — 7 citações.
- Ma (2018), *Composite Structures*. Wave component solutions of free vibration and mode damping loss factor of finite length periodic beam structure with damping material. [10.1016/j.compstruct.2018.06.096](https://doi.org/10.1016/j.compstruct.2018.06.096) — 7 citações.

### a ameaça que eu apontei ao candidato — umidade — é reconhecida?

Busca: `moisture absorption cellulose composite mechanical degradation` — 1820219 resultados, consultada em 2026-09-01.

- Boukhoulda (2006), *Composite Structures*. The effect of fiber orientation angle in composite materials on moisture absorption and material degradation after hygrothermal ageing. [10.1016/j.compstruct.2005.04.032](https://doi.org/10.1016/j.compstruct.2005.04.032) — 103 citações.
- Ridzuan (2016), *Composite Structures*. Moisture absorption and mechanical degradation of hybrid Pennisetum purpureum/glass–epoxy composites. [10.1016/j.compstruct.2016.01.030](https://doi.org/10.1016/j.compstruct.2016.01.030) — 88 citações.
- Gabr (2013), *Cellulose*. Mechanical, thermal, and moisture absorption properties of nano-clay reinforced nano-cellulose biocomposites. [10.1007/s10570-013-9876-8](https://doi.org/10.1007/s10570-013-9876-8) — 75 citações.
- Hassan (2019), *Cellulose*. Thermo-mechanical, morphological and water absorption properties of thermoplastic starch/cellulose composite foams reinforced with PLA. [10.1007/s10570-019-02393-1](https://doi.org/10.1007/s10570-019-02393-1) — 74 citações.

### vibração em cabo de ferramenta é preocupação estabelecida ou detalhe?

Busca: `hand arm vibration tool handle damping material` — 1346136 resultados, consultada em 2026-09-01.

- Marcotte (2005), *Journal of Sound and Vibration*. Effect of handle size and hand–handle contact force on the biodynamic response of the hand–arm system under zh-axis vibration. [10.1016/j.jsv.2004.06.007](https://doi.org/10.1016/j.jsv.2004.06.007) — 71 citações.
- Aldien (2006), *Journal of Sound and Vibration*. Influence of hand forces and handle size on power absorption of the human hand–arm exposed to zh-axis vibration. [10.1016/j.jsv.2005.05.005](https://doi.org/10.1016/j.jsv.2005.05.005) — 19 citações.
- Oddo (2004), *Journal of Sound and Vibration*. Design of a suspended handle to attenuate rock drill hand-arm vibration: model development and validation. [10.1016/j.jsv.2003.06.006](https://doi.org/10.1016/j.jsv.2003.06.006) — 17 citações.
- Tony (2019), *Work*. Influence of handle shape and size to reduce the hand-arm vibration discomfort. [10.3233/wor-192948](https://doi.org/10.3233/wor-192948) — 6 citações.

### bambu tem propriedade mecânica medida e publicada, e o nó importa?

Busca: `bamboo culm mechanical properties flexural strength` — 2554012 resultados, consultada em 2026-09-01.

- Qi (2015), *Journal of Forestry Research*. Effects of characteristic inhomogeneity of bamboo culm nodes on mechanical properties of bamboo fiber reinforced composite. [10.1007/s11676-015-0106-0](https://doi.org/10.1007/s11676-015-0106-0) — 34 citações.
- Qi (2014), *Journal of Wood Science*. Influence of characteristic inhomogeneity of bamboo culm on mechanical properties of bamboo plywood: effect of culm height. [10.1007/s10086-014-1429-8](https://doi.org/10.1007/s10086-014-1429-8) — 34 citações.
- Deng (2025), *Construction and Building Materials*. Mechanical properties of round bamboo splicing joints with internal bamboo culm. [10.1016/j.conbuildmat.2025.144128](https://doi.org/10.1016/j.conbuildmat.2025.144128) — 3 citações.
- Bantie (2025), *Advances in Bamboo Science*. Physical and mechanical properties of highland bamboo (Oldeania alpina (K.Schum.) Stapleton) landraces and culm sections growing at Banja District, Northwest Ethiopia. [10.1016/j.bamboo.2025.100172](https://doi.org/10.1016/j.bamboo.2025.100172) — 2 citações.

### alguém já mediu bambu por amortecimento?

Busca: `bamboo tool handle vibration damping` — 616576 resultados, consultada em 2026-09-01.

- Chen (2022), *Industrial Crops and Products*. The effect of constituent units on the vibration reduction of bamboo engineering materials: The synergistic vibration reduction mechanism of bamboo stiffness and wood damping. [10.1016/j.indcrop.2022.115785](https://doi.org/10.1016/j.indcrop.2022.115785) — 8 citações.
- Busse (2021), *Advances in Mechanical Engineering*. Evaluation of the vibration characteristics and handle vibration damping of diesel-fueled 15-HP single-axle tractor. [10.1177/16878140211040648](https://doi.org/10.1177/16878140211040648) — 6 citações.
- Adimass (2025), *Scientific Reports*. Damping properties of bamboo and glass fiber reinforced epoxy hybrid composites with edge cracks for vibration damping applications. [10.1038/s41598-025-31296-4](https://doi.org/10.1038/s41598-025-31296-4) — 4 citações.
- Burnett (2012), *IADC/SPE Drilling Conference and Exhibition*. Rotary Steerable Tool Damage Prevention by Utilization of an Asymmetric Vibration Damping Tool. [10.2118/149696-ms](https://doi.org/10.2118/149696-ms) — 2 citações.

### o tratamento contra caruncho é procedimento estabelecido?

Busca: `bamboo preservation boron treatment durability` — 2101412 resultados, consultada em 2026-09-01.

- Bui (2017), *Sustainability*. A Bamboo Treatment Procedure: Effects on the Durability and Mechanical Performance. [10.3390/su9091444](https://doi.org/10.3390/su9091444) — 45 citações.
- Kaminski (2016), *The Structural Engineer*. Structural use of bamboo. Part 2: Durability and preservation. [10.56330/trbw8039](https://doi.org/10.56330/trbw8039) — 29 citações.
- Wahab (2005), *Journal of Bamboo and Rattan*. Effect of heat treatment using palm oil on properties and durability of Semantan bamboo. [10.1163/156915905774310034](https://doi.org/10.1163/156915905774310034) — 25 citações.
- Mwanja (2023), *Advances in Bamboo Science*. Perception of artisans towards bamboo preservation for improved product durability in Uganda. [10.1016/j.bamboo.2023.100020](https://doi.org/10.1016/j.bamboo.2023.100020) — 8 citações.

### bambu laminado tem base industrial e estrutural?

Busca: `laminated bamboo engineered structural properties` — 2444857 resultados, consultada em 2026-09-01.

- Mashrah (2025), *Structures*. Comprehensive review of engineered bamboo in structural engineering: Comparative insights into laminated bamboo and bamboo scrimber. [10.1016/j.istruc.2025.108896](https://doi.org/10.1016/j.istruc.2025.108896) — 31 citações.
- Li (2023), *Composite Structures*. Strength properties of unidirectional laminated engineered bamboo boards under off-axis tension and compression tests. [10.1016/j.compstruct.2023.117405](https://doi.org/10.1016/j.compstruct.2023.117405) — 11 citações.
- Ji (2022), *Journal of Renewable Materials*. Engineered Wood/Bamboo Laminated Composites for Outdoor Hydrophilic Platforms: Structural Design and Performance. [10.32604/jrm.2022.021761](https://doi.org/10.32604/jrm.2022.021761) — 3 citações.
- Mohinderu (2026), *CivilEng*. Engineered Laminated Bamboo for Structural Applications: A Critical Review of Materials, Systems, and Design Challenges. [10.3390/civileng7020024](https://doi.org/10.3390/civileng7020024) — 0 citações.
