# Laboratório computacional para IA — progresso por fatia

**Plano que governa:** [`planos/2026-09-01-laboratorio-computacional-ia.md`](planos/2026-09-01-laboratorio-computacional-ia.md)
**Dossiê:** [`DOSSIE-LABORATORIO-IA.md`](DOSSIE-LABORATORIO-IA.md)

Este documento é o relato: o que cada fatia entregou, o que ficou de fora e por
quê. O plano fica curto de propósito — ele autoriza e delimita; aqui mora o que
aconteceu. A regra do repositório é essa, e o gate de 200 linhas do plano é quem
a segura.

O fio condutor das três primeiras fatias é um só: **cada peça de maquinaria
entrou porque um estudo real precisou dela, e o que nenhum estudo pediu ficou de
fora com o motivo escrito.**

## R0 — o que o primeiro estudo devolveu

A Task 2 pedia "contratos v1 e identidade canônica". Ela foi feita **ao
contrário do plano, de propósito**: em vez de desenhar os nove contratos do
dossiê e depois procurar uso, rodei um estudo real e deixei que ele pedisse os
campos. Saíram cinco documentos, e cada campo existe porque o estudo usa.

A pergunta veio da modelagem, não de exercício: *dá para baixar a torção das
faces da cabeça do machado abaixo de 1% mexendo em `lados` e `expoenteSecao`,
sem mudar a forma?*

**A resposta é não.** A torção cai monotonicamente com `expoenteSecao`
(sustentada no domínio testado), mas o mínimo alcançável é 1,8% — nenhuma
configuração chega ao alvo com a forma preservada. Hipótese **contradita**, e
esse era um dos desfechos previstos por escrito antes de medir.

### O que o estudo achou que eu não fui procurar

**`lados` não é parâmetro livre nesta peça.** A primeira varredura devolveu 21
de 25 execuções gritando. A causa não era ruído: o furo do olho precisa CABER
numa face, e aumentar `lados` estreita a face. Dos cinco valores testados, só
`14` mantém o olho furável. A pergunta estava mal-posta, e foi o instrumento que
mostrou.

Isso também expôs um defeito latente na receita: `LADO_TOPO` e `LADO_FUNDO`
eram os literais 3 e 10, derivados à mão de `lados: 14`. Agora são calculados de
`lados`. Quem mexesse nesse número herdaria um furo fora do lugar, em silêncio.

### E um defeito no próprio instrumento, que o canário pegou

A primeira versão trocava `receita.PARAMS` — mas a receita calcula os argumentos
no carregamento do módulo, então o parâmetro não chegava a lugar nenhum e as 25
medidas saíram **idênticas**, com cara de varredura. Instrumento que não mede
nada e responde mesmo assim é o pior tipo. Agora ele tem um canário que compara
duas configurações que TÊM de diferir e se derruba se vierem iguais.

### O laboratório se pagou nesta rodada?

**Em parte, e vale ser exato.** O que mudou o resultado foi disciplina barata:
declarar o critério de refutação antes de medir, separar quem mede de quem
julga, e recusar conclusão vinda de execução que gritou. Nada disso precisou de
DAG, proveniência ou RO-Crate.

O que ainda não se pagou é a maquinaria pesada das fatias R1 a R7. Ela continua
justificada pelo dossiê, não por evidência deste estudo — e essa distinção fica
escrita para a próxima rodada cobrar.

## R1 — o que entrou, e o que ficou de fora com motivo

O buraco veio do R0, por uso: a síntese concluiu sobre a torção da cabeça do
machado **sem dizer qual cabeça**, e a receita mudou no meio do estudo. Quem
lesse a conclusão depois não teria como saber que objeto foi medido.

Entrou o que fecha isso:

- **armazém por conteúdo** — o id do artefato é o hash dele. Guardar o mesmo
  conteúdo duas vezes é no-op; conteúdo trocado por baixo é recusado na leitura,
  porque o nome prometia um hash que o conteúdo não tem;
- **proveniência** — commit, árvore limpa ou suja, e hash dos BYTES de cada
  entrada. Ela **recusa** chamar de reproduzível o que não é: sem commit, com
  árvore suja ou sem entrada identificada, ela diz não e diz por quê;
- **verificação de reprodução**, em três níveis separados de propósito. Entrada
  diferente é `nao-comparavel` — o caso mais perigoso é justamente aquele em que
  os números batem e não significam nada. Medida diferente com a mesma entrada é
  achado, não ruído. Conclusão diferente é o único nível que invalida a síntese.

**RO-Crate ficou de fora, e isso é decisão.** Ele é formato de EXPORTAÇÃO e não
existe consumidor: ninguém, dentro nem fora, pede um pacote nesse formato hoje.
Construí-lo agora seria adivinhar o que um leitor futuro quer — o mesmo erro que
esta fatia acabou de evitar ao deixar os contratos nascerem do estudo. Entra
quando houver quem leia.

Prova de ponta a ponta: duas execuções do instrumento, guardadas por conteúdo,
avaliadas e comparadas — veredito `reproduzido`. E a proveniência da rodada saiu
**não confiável**, corretamente, porque a árvore estava suja na hora.

## R2 — metade entregue, metade adiada, e o critério de cada uma

**Entrou o registro de instrumentos**, e ele é justificado por falha vivida, não
pelo dossiê: o instrumento do primeiro estudo não declarava domínio, e eu varri
`lados` de 10 a 26 sem saber que só 14 mantém o olho do machado furável —
descobri por 21 execuções gritando. O instrumento SABIA, a informação estava na
geometria dele, e não tinha onde dizer.

Duas regras, e as duas recusam:

- **importar não concede capacidade.** Instrumento não registrado é recusado com
  o motivo por escrito. Achar o arquivo, importá-lo ou encontrá-lo no `PATH` não
  vale como declaração;
- **manifesto sem `nao_cobre` é recusado.** Não declarar limite é afirmar que
  cobre tudo, e nenhum instrumento cobre. A síntese passa a repetir esses
  limites, e medida fora do domínio declarado é excluída antes de qualquer
  avaliação — o filtro de domínio roda ANTES do de admissibilidade, porque
  medida fora do que o instrumento promete nem deveria ser julgada.

**DAG e runner entraram depois, e a mudança de rumo fica registrada.** Eu tinha
adiado os dois com um critério escrito — um segundo instrumento, ou um estudo cujo
passo consuma a saída de outro — e nenhum dos dois apareceu. O que mudou foi a
decisão de quem manda no projeto: montar o laboratório antes de usá-lo, em vez de
deixar cada peça esperar a falha que a justifica. Anoto assim porque o critério
não foi cumprido, foi substituído, e a diferença importa para quem ler depois.

O planejador prova o grafo ANTES de qualquer execução, e cada prova veio de um
modo de falha: ciclo, capacidade que o instrumento não declara, duas saídas com o
mesmo nome (ordem de execução virando dado, que é a proibição de posição-como-
identidade outra vez), entrada que ninguém produz — o erro que mais parece
funcionar, porque o passo roda, recebe vazio e devolve número plausível — e
versão de instrumento sem fixar. Falha fechada: nenhuma ordem parcial sai, para
não convidar a rodar "o que dá". O módulo não importa o executor, e há teste que
verifica isso: "planejar não é executar" precisa de barreira, não de frase.

O executor confina tempo por passo, tempo total, teto de passos, propagação de
falha e diretório efêmero — e **declara na própria saída** que não confina rede,
sistema de arquivos fora daquele diretório, memória nem processos filhos. Ele
serve para instrumento local e confiável, que é o único que este laboratório tem,
e não para código de terceiro. Duas honestidades caras: o tempo do passo é
conferido depois de ele rodar, porque sem subprocesso não há como interromper uma
função no meio; e saída que o passo não prometeu é descartada, para um passo não
alimentar outro por canal que o grafo não declara.

Vinte e cinco testes, e cada regra foi vista vermelha antes de virar verde.

## R3 — o grafo entrou; os conectores de rede não, e digo por quê

**Fonte não é verdade** é a regra que o módulo inteiro serve. Uma citação válida
sustenta que ALGUÉM PUBLICOU uma alegação; ela não prova que a alegação está
correta nem que se aplica ao que estou medindo. Por isso a alegação não tem campo
de verdade nem escalar de confiança — seria o mesmo pecado já recusado nas
hipóteses, com outro nome — e há teste que verifica a ausência desses campos.

Três coisas ficam separadas porque são três julgamentos diferentes: o que a
publicação É (identidade, licença, retratação), o que ela AFIRMA (enunciado, onde
no texto, sob que condições) e se aquilo VALE AQUI. O terceiro é do laboratório,
não da fonte, e por isso `aplicar` exige justificativa escrita e ao menos uma
ressalva — transportar resultado sem ressalva é a forma mais comum de usar
achado fora do domínio dele. Alegação sem condição declarada também é recusada:
ela se comporta como lei universal.

Duas armadilhas que não levantam erro sozinhas ganharam mecanismo:

- **retratação alcança quem só cita.** Fonte retratada continua no grafo, marcada,
  e a contaminação viaja por citação, não só por vizinhança. Apagar esconderia
  que o estudo um dia se apoiou nela;
- **apoio que parece múltiplo.** Três alegações do mesmo artigo não são três
  evidências, e cinco revisões do mesmo experimento também não. O grafo conta
  fontes primárias distintas, não alegações.

Conflito fica preservado e ligado, nunca resolvido: o grafo não elege vencedora,
mostra a contradição para a síntese ter de falar dela.

**Os conectores de Crossref e OpenAlex não entraram, e isso não é atraso.** Eles
precisam de paginação, cache, rate-limit, licença e orçamento de contexto — cinco
coisas que só se provam contra a rede real, e o laboratório ainda não tem um
estudo que peça literatura. Construí-los agora seria produzir código cuja única
prova seria eu afirmando que funciona. O grafo, esse, tem prova local: dezenove
testes, cada recusa vista acontecer.

## R4 — unidades e pareceres entraram; incerteza não tem o que propagar ainda

**Número nu não atravessa mais interface científica.** O erro de unidade é a
falha mais bem disfarçada que existe aqui: não levanta exceção, não deixa rastro,
e devolve um número plausível na ordem de grandeza errada. É a mesma família do
instrumento que media sempre a mesma coisa parecendo varredura e do passo que
recebe vazio e devolve número plausível — em todos, o resultado É plausível, e é
justamente por isso que sobrevive à revisão.

Duas escolhas que parecem detalhe e não são:

- **dimensão não é unidade.** Metro e milímetro têm a mesma dimensão e não somam.
  Converter em silêncio seria escolher um fator no lugar de quem mede, então a
  conversão é explícita e exige dizer de onde vem o fator — fator sem origem é o
  erro de unidade disfarçado de conversão, e passa na revisão por parecer uma;
- **sem tabela de unidades do mundo.** Não há catálogo aqui. Uma tabela grande
  seria adivinhar qual unidade o laboratório vai usar, e este repositório já
  registrou que onde falta evidência o desenho fica bonito.

**Admissibilidade virou composição, e aprovado é o veredito mais difícil de
conseguir.** Inconclusivo não vira aprovado: um validador que não conseguiu
decidir não é um validador satisfeito. `nao-aplicavel` exige justificativa, senão
seria a forma cômoda de pular validador difícil — e validador exigido marcado
assim continua bloqueando a aprovação. Nenhum validador rodar não é aprovação: é
a afirmação mais forte possível feita com a menor evidência possível. O veredito
carrega quem rodou e o que cada um disse, porque "aprovado" sem essa lista é gate
nunca visto vermelho com outro nome.

**Incerteza e sensibilidade ficaram de fora, e o motivo é concreto:** o único
instrumento deste laboratório é determinístico. Não há distribuição para propagar
nem amostra para convergir; qualquer máquina de incerteza escrita agora seria
exercitada só por dados que eu mesmo inventasse. Ela entra quando existir medida
com ruído real ou parâmetro com faixa declarada.

Vinte e nove testes novos, cada recusa vista acontecer.

## R5 — a Mecanifica entra como entrada, e não sai alterada

O risco que esta fatia contém é o mais caro do laboratório inteiro: um modelo
imperfeito mexendo, em silêncio, no objeto que está sendo estudado. O resultado
sai plausível porque a pergunta mudou junto com a resposta.

Três recusas, e nenhuma é opinião:

- **revisão fixada, e deriva é falha.** O estudo prega a peça por caminho e
  conteúdo. Se o arquivo mudou entre fixar e abrir, a ponte recusa em vez de
  medir a peça nova achando que é a velha — o estudo compararia duas coisas
  diferentes com o mesmo nome, e o nome é a única parte que chega ao relatório.
  A fixação é por conteúdo, não por data: reescrever igual não conta como deriva;
- **a ponte é de leitura.** Não existe função de escrita nela, e há teste que
  confere a ausência. Capacidade que não existe não precisa de disciplina para
  não ser usada;
- **recomendação não é autoria aprovada.** Ela não tem método de aplicar, carrega
  o domínio em que vale, exige limites e exige as evidências — inclusive as
  contrárias, porque síntese que só lista o que a favorece é advocacia.

A guarda de direção já existia e continua sendo o que sustenta a incubação: o
núcleo nunca importa `laboratorio/`, e por isso o diretório pode ser apagado sem
quebrar quem só quer modelar. O adaptador Node, único arquivo autorizado a citar
a Mecanifica, também já vivia fora do núcleo desde o primeiro estudo.

Quinze testes novos.

## Foco definido: materiais — e o que a falta dele custou

Até aqui o plano dizia que o laboratório era "geral" e não dizia sobre o quê. O
usuário cobrou, e a cobrança estava certa: generalidade sem assunto não é escopo,
é ausência de escopo com nome bonito. Sete módulos foram construídos antes de
alguém perguntar qual era a pergunta.

O preço não foi só abstrato. Sem foco, eu resumi o laboratório como "mede se a
mudança na peça melhorou" — encolhendo tudo num validador de 3D, exatamente o que
o dossiê proíbe na primeira página — e **ofereci apagar o módulo de fontes**, que
é central para materiais e parecia supérfluo para um laboratório de nada. A
proposta foi retirada.

**O laboratório estuda materiais:** ligas e misturas, propriedades mecânicas,
resistência, rigidez, estabilidade, e o custo de conseguir aquilo na prática. A
generalidade continua valendo como FORMA — os contratos não conhecem materiais —
mas o domínio de trabalho é um só.

### Onde cada coisa roda

Parte do trabalho não cabe neste ambiente. Cálculo quântico e varredura longa
rodam na máquina do usuário; aqui ficam contratos, análise, modelos baratos e os
testes. Duas consequências que o desenho honra: resultado é salvo por ponto, não
no fim, porque execução de horas pode morrer no meio; e o armazém por conteúdo
existe para conta cara rodar uma vez e nunca mais.

### Material e composição

Guarda o dado e a disciplina dele, e não calcula nada — cálculo é instrumento, e
instrumento declara domínio. Três recusas, todas de erro que não se anuncia:
fração que não soma um (dado corrompido de onde sai valor plausível), propriedade
sem condição (o mesmo aço a 20 °C e a 600 °C dá números diferentes) e propriedade
sem origem (medida, calculada e estimada não são a mesma coisa). Buscar uma
propriedade exige dizer a condição, porque pegar "a" propriedade é o atalho que
produz o número errado. Duas propriedades iguais na mesma condição são recusadas:
conflito se resolve no grafo de alegações, com as duas fontes à vista.

### Escolher o próximo experimento

Quando um ponto custa seis horas, varredura cega é o custo dominante do
laboratório. O palpite aprende com os pontos já medidos e diz **onde não sabe**;
a sugestão manda o próximo experimento para onde a ignorância é mais cara.

Duas coisas que ele nunca faz: passar palpite por medida — toda saída é marcada
`estimada` e vem com a incerteza — e extrapolar calado, que é o modo de falha
desta ferramenta; a sugestão sempre lista quais candidatos estão fora da faixa
medida. A escolha é determinística até no empate, senão o estudo não reproduz.

Em Python puro, e isso é coerente: cada ponto custa horas, então são dezenas de
pontos, nunca milhões. Trazer biblioteca numérica pesada para inverter uma matriz
30×30 seria pagar caro por nada.

E o modelo tem um limite que o próprio código declara: ele é um interpolador com
barra de erro, não uma teoria. Diz onde não mediu; não diz onde entendeu errado.
Um teste que eu escrevi esperando ver recusa passou verde e revelou um buraco
real — quatro medições do mesmo ponto passavam como quatro pontos. Corrigi o
módulo, não o teste.

### Decidir com trade-off, em vez de eleger campeã

O caso normal em materiais: a liga mais resistente é mais frágil, ou mais cara,
ou depende de elemento que ninguém compra. Eleger uma exige dizer quanto vale
cada coisa — e isso é julgamento de quem decide, não resultado do experimento.

O que sai dos dados sozinho é a **fronteira**: as candidatas que ninguém supera
em tudo, e, para cada uma, o que se perde ao escolhê-la. Ranking só sai com os
pesos declarados e justificados, e a saída diz que **foi o peso que decidiu**.
Um ranking multicritério que esconde os pesos é preferência de quem escreveu o
código vestida de resultado objetivo.

Duas recusas que valem citar: candidata sem um dos critérios é recusada, porque
ausência de dado não é valor neutro e trataria desconhecido como zero; e o mesmo
critério em unidades diferentes é recusado — é o erro de unidade decidindo compra
de material. Custo e disponibilidade entram como critério, não como detalhe.

### Extrair a relação, não devolver tabela

"Medi 40 pontos, aqui estão" é dado. "A resistência cresce com o inverso da raiz
do tamanho de grão" é conhecimento: vale fora dos pontos, dá para conferir contra
teoria, e cabe numa frase.

O módulo testa um catálogo pequeno de formas que já significam algo em materiais
— reta, potência, exponencial, inverso da raiz (Hall-Petch) e logarítmica — em
vez de buscar fórmula livremente. A razão é dura: com poucos pontos caros, busca
livre acha sempre alguma coisa, e quanto mais liberdade, mais fácil ajustar ruído
e chamar isso de lei. Forma sem significado declarado não entra no catálogo.

Três cuidados que mudam o resultado: forma que não se aplica é **marcada**, não
sumida — virar `nan` e desaparecer faria a vencedora parecer melhor do que é; a
ordenação usa erro no espaço original, não R², porque R² de transformações
diferentes não é comparável entre si, e comparar é o erro clássico desta conta; e
empate técnico fica visível, porque escolher por casas decimais entre duas formas
quase iguais é decisão falsa.

Todo resultado sai com o aviso: coincidir com uma forma não explica por quê —
duas causas diferentes produzem a mesma curva o tempo todo.

### Consultar banco público antes de recalcular

Materials Project, OQMD e AFLOW têm milhões de compostos já calculados. Perguntar
custa segundos; recalcular custa horas na máquina de alguém.

O risco é maior que o ganho se ignorado: **valor de banco público quase nunca é
medida**. A maioria vem de cálculo quântico com erro sistemático conhecido, e um
número desses colado num relatório sem etiqueta vira "a resistência do material"
para quem ler depois. Por isso o banco é obrigado a declarar método e limitação —
banco de cálculo sem ressalva se apresenta como medição — e todo valor sai
marcado `calculada`, com o método e a versão do despejo dentro da condição.

A parte que resolve o problema dos dois ambientes: **cache primeiro, e quem busca
é injetado**. O módulo não abre conexão; ele recebe uma função. Sem cache e sem
buscador, ele RECUSA dizendo que não consultou — devolver lista vazia faria o
estudo concluir "não existe nada publicado sobre isso". O caminho real fica
testado: consulta feita onde há rede, cache trazido, resposta aqui sem rede.

A versão do banco entra na chave do cache, porque o mesmo pedido a despejos
diferentes é outra consulta, e reaproveitar misturaria duas fontes numa.

## Piloto 1 — cabo de pá, e o dia em que o laboratório se pagou

A pergunta veio do usuário inteira: dá para trocar o cabo de pá de eucalipto por
uma alternativa mais barata, que aguente pelo menos o mesmo, absorva bem impacto
e vibração, e ainda seja acessível, sem agredir o ambiente e sem risco de
intoxicação? Seis exigências que puxam para lados diferentes.

### O resultado

| candidato | margem p05 | custo | energia dissipada | irritação | ambiente |
| --- | --- | --- | --- | --- | --- |
| eucalipto | 0,51 | 3,09 | 27,0% | 3 | 3 |
| aço 1020 | 0,80 | 6,56 | 1,6% | 3 | 2 |
| alumínio 6061 | 0,97 | 12,21 | 0,6% | 3 | 1 |
| fibra de vidro | 1,65 | 9,35 | 22,2% | 1 | 1 |
| papel-fenólico | 0,49 | 3,15 | 54,4% | 1 | 2 |
| **papel-lignina** | **0,37** | **3,06** | **61,0%** | **3** | **3** |

O laminado de papel reciclado ligado por lignina ganha em tudo que foi pedido —
mais barato que a madeira, dissipa 2,3 vezes mais vibração, sem irritação e sem
passivo ambiental — e perde só em resistência. O usuário lembrava exatamente
disso: "faltava algo na liga para garantir resistência". Faltava, e ainda falta.

A variante fenólica existe na comparação para mostrar o preço de escolher a que
funciona: ela cola melhor, e é feita com formaldeído. O critério de saúde era
explícito, então ela fica registrada e recusada, não apagada.

### O achado que mandou na recomendação

A 40 mm de diâmetro, com a incerteza LARGA que declarei por não ter fonte, a
margem no percentil 5 é 0,65 e reprova. Com uma incerteza medida de ±15% em torno
da **mesma média**, ela vai a 0,97. Mesmo material, mesma geometria, mesma
resistência média: a diferença é só o quanto eu sei.

**A incerteza que reprova o cabo é a minha, não a do material.** Isso muda a
recomendação de lugar: não adianta mexer na liga enquanto a ignorância dominar.
Dez corpos de prova em ensaio de flexão decidem mais que qualquer conta feita
daqui — e é exatamente a barreira que o laboratório não transpõe sozinho.

### Três erros meus que os testes pegaram

- **critério que satura.** Escrevi que o metal teria de sobrar com o *dobro* da
  vibração da madeira. Sobra é fração limitada a 1, e a da madeira já é 0,73: o
  dobro seria impossível. A hipótese saiu `contradita` com o metal dissipando
  dezessete vezes menos energia. O critério ficou como estava, o estado ficou
  como saiu, e a versão corrigida entrou no módulo **marcada como não testada** —
  reescrever critério depois de ver o resultado é escolher a conclusão;
- **exagero sobre a fibra de vidro.** Eu disse que ela ganhava sem piorar a mão.
  Piora: 0,778 contra 0,730;
- **generalização que envelheceu.** Depois escrevi que nenhum candidato batia a
  madeira em vibração — e os laminados de papel batem, com folga. A afirmação
  certa era mais estreita.

### E um achado sobre a própria hipótese de carga

O caso de 300 N na ponta com alavanca inteira reprova **até o eucalipto**: margem
p05 de 0,51. Isso não é descoberta sobre madeira; é sinal de que a carga suposta
descreve uso abusivo — pá como pé de cabra — e não cavar normal. Fica registrado
como achado sobre a hipótese, e não maquiado.

### O que entrou de máquina nova

`viga.py` (tensão, flecha, frequência e decaimento de vibração, tudo conta
fechada e escrita do zero) e `incerteza.py` (propagação por sorteio com semente
declarada, gerador próprio para não depender de versão de biblioteca, e
convergência conferida em vez de assumida). A incerteza esperou dois adiamentos
por falta de entrada dispersa real; madeira, que varia 20% ou 30% de tábua para
tábua, finalmente deu o motivo.

### Fabricação, fornecimento e conformidade — e o erro de método que eles revelaram

O usuário acrescentou critérios que não são número: acessível, sem agredir o
ambiente, sem risco de intoxicação. Entraram como escala **ordinal declarada** —
3 melhor que 2, e a distância entre eles não significa nada. Fingir que significa
seria transformar julgamento em medida.

**Maturidade de fornecedor virou contexto, não propriedade do material.** Lignina
é abundante no Brasil e quase toda queimada dentro da própria fábrica de celulose
para gerar energia, em vez de vendida como adesivo de prateleira. Para quem está
de fora isso é gargalo; para quem está dentro da indústria, é conversa interna. O
usuário está dentro. Cravar isso no material poria a situação de uma pessoa
dentro de um número que parece técnico, então o estudo roda nos dois cenários.

**Conformidade entrou como vantagem, não custo.** Resina fenólica cai em norma de
emissão de formaldeído — ensaio recorrente, certificação, controle de exposição.
Sem formaldeído, pula-se o capítulo inteiro.

#### O erro de método, que é a lição mais cara deste piloto

Com oito critérios, **ninguém é dominado**: a fronteira devolveu os seis
candidatos, nos dois cenários. É propriedade conhecida — mais critérios, mais
fácil ser o melhor em algum — e significa que a fronteira sozinha parou de
decidir.

Restou o ranking com pesos. E aí apareceu o problema: **o papel-lignina venceu
nos dois cenários tendo a PIOR margem estrutural de todas**, 0,37. Conforto,
preço e ambiente compensaram o cabo quebrar.

Isso não é peso mal escolhido, é erro de forma. Soma ponderada permite que
qualquer critério compense qualquer outro, e **quebrar não se troca por ser
confortável**. Requisito estrutural é PORTA, não peso: quem não passa sai da
comparação, e só quem passa disputa nos critérios negociáveis. A porta entrou no
estudo, e com ela a comparação volta a significar algo.

#### O resultado final, numa frase

**Não medir custa 10 mm de diâmetro e 290 g.**

O papel-lignina passa na porta com 50 mm carregando a incerteza larga que declarei
por não ter fonte. Com a resistência medida — dez corpos de prova, ±15% em torno
da mesma média — passa com 40 mm e 1,00 kg. Mesmo material, mesma resistência
média: a diferença é só informação.

E a porta reprova até o eucalipto nesta carga, o que confirma pela terceira vez
que o caso suposto é uso abusivo. A comparação segue válida porque todos sofrem a
mesma carga.

A análise de fabricação e fornecimento está registrada na recomendação **marcada
como fora do laboratório**: é análise, não estudo, e não foi medida.

### Pesquisa de verdade: o dia em que o laboratório parou de ser ensaio geral

Até aqui todo número deste laboratório tinha saído de mim — memória de valor de
manual, sem fonte primária. Isso está escrito em cada estudo, e era o limite mais
honesto que havia para declarar.

O Crossref respondeu deste ambiente. Seis consultas, 45 publicações com DOI
verificável, guardadas em disco para a pesquisa reproduzir daqui a um ano. É a
primeira vez que entra dado externo conferível.

**E o módulo constrói `Fonte`, não `Alegacao` — zero alegações, de propósito.**
Crossref devolve metadado: título, DOI, revista, ano, citações. Nada disso diz o
que o artigo mediu nem em que condição. Fabricar alegação a partir de título
seria a violação exata de "fonte não é verdade" — um título como
"Lignin-based adhesive for particleboard" sustenta que alguém publicou sobre o
assunto, e nada sobre o valor de resistência que se queira citar. Alegação exige
ler o artigo e comparar a condição dele com a nossa; é trabalho de pessoa.

Cada busca carrega a **pergunta que a motivou**, porque consulta sem pergunta por
trás é pescaria — e o registro do motivo é o que permite alguém julgar se a busca
foi honesta ou se foi atrás do que confirmava a ideia. Material suplementar, que
o Crossref indexa com DOI próprio e sobe na relevância sem ser artigo, é
descartado; sem ano também sai.

O que a literatura sustentou:

- ligante de lignina sem formaldeído com alta resistência de colagem é campo
  ativo, com publicação de 2024 a 2026 — é exatamente a lacuna do nosso candidato;
- emissão de formaldeído em painel é problema reconhecido, não implicância;
- vibração mão-braço em cabo de ferramenta tem literatura própria e antiga;
- degradação de compósito de celulose por umidade é reconhecida — a ameaça que o
  estudo tinha apontado ao candidato.

O dossiê `DOSSIE-CABO-DE-PA.md` reúne resultado, limites, bibliografia e o que
precisa ser medido, num formato para mostrar a outras pessoas. Ele abre dizendo
o que é e o que não é, e a seção de literatura repete que **os artigos não foram
lidos**.

### A barreira não era intransponível — e a fonte real derrubou duas conclusões minhas

Eu tinha declarado que não dava para trocar meus números de memória por números com
fonte: Crossref dá metadado, Europe PMC é biomédico, a busca por resumo devolve
artigos vizinhos. O usuário desconfiou da desistência, e estava certo.

O que eu não tinha tentado: **repositório de governo**. O *Wood Handbook — Wood as
an Engineering Material* (FPL-GTR-190, USDA Forest Service) é a referência canônica
de propriedade mecânica de madeira, tem 509 páginas, é **domínio público** e está
aberto. Baixado e lido aqui, Tabela 5-5a.

**Os números reais, a 12% de umidade:** jarrah (*Eucalyptus marginata*) 111,7 MPa e
13,0 GPa; karri (*E. diversicolor*) 139,0 MPa e 17,9 GPa. Eu vinha usando 75 MPa —
que é aproximadamente o valor da madeira **verde**. Cabo de pá é madeira **seca**.

Duas conclusões deste laboratório caíram junto:

- **"o caso de carga é abusivo" estava errado.** Eu havia concluído isso porque a
  carga reprovava até o eucalipto, e registrei como achado sobre a hipótese de
  carga. Não era: a carga estava certa e minha propriedade é que estava errada. Com
  o valor correto o eucalipto passa na porta com margem 1,01;
- **a barra subiu 50%.** O concorrente do candidato não é 75 MPa, é 111,7.

Quatro testes falharam na atualização, e todos afirmavam coisas que a fonte
desmentiu. Cada um foi reescrito para a verdade nova, com o erro anterior citado no
próprio teste — inclusive o preço de não medir, que eu tinha anunciado como 10 mm e
290 g e virou 5 mm e 140 g quando a porta estrutural passou a valer estritamente.

E apareceu a troca honesta, que só existe agora que o benchmark é real: o cabo de
lignina precisa de 1,29 kg contra 0,77 kg do eucalipto — **68% mais pesado para
dissipar 126% mais vibração**. Quem segura a ferramenta o dia todo é quem decide se
o câmbio vale, e isso não é decisão de quem calcula.

**A assimetria de fontes fica declarada no dossiê:** só o eucalipto tem fonte
primária; o candidato recomendado segue com números de memória. O benchmark é
sólido, o candidato é o que precisa ser medido.

### Variantes de projeto, e a otimização que fugiu para onde faltava restrição

O usuário perguntou: em vez de perseguir o máximo, e se o candidato só **empatar**
com o eucalipto e gastar o resto em ser leve e barato? A intuição estava certa, e
o número dá razão a ela.

Antes, uma correção do que eu tinha deixado ambíguo: os 61% de dissipação são
propriedade do **material** e valem em qualquer diâmetro. Engrossar o cabo é para
resistência, nunca para vibração. Todas as variantes amortecem igual.

| variante | geometria | massa | vs. eucalipto | dissipa |
| --- | --- | ---: | ---: | ---: |
| eucalipto | 32 mm maciço | 0,77 kg | — | 27% |
| **igualitária, medida** | 45 × 4,2 mm | 0,84 kg | **+9%** | 61% |
| igualitária, sem medir | 45 × 8,0 mm | 1,45 kg | +88% | 61% |
| igualitária, 40 mm | 40 × 6,6 mm | 1,08 kg | +40% | 61% |
| extrema | 50 × 6,0 mm | 1,29 kg | +68% | 61% |

**Só empatar custa 9% de massa; perseguir folga custa 68%** — com o mesmo
amortecimento. E medir aparece pela terceira vez como o item mais valioso do
estudo: mesmo material e mesmo empate, 0,84 kg medindo contra 1,45 kg sem medir.

#### A otimização foi para 69 mm

Procurando a configuração mais leve que empata, a varredura achou **69 mm de
diâmetro com 2,2 mm de parede**: mais leve e mais barato que a madeira, e
completamente impossível de segurar. Tubo grande e fino é eficiente em flexão, e a
conta não sabia que existe mão.

A lição não é sobre cabo: **otimização vai exatamente para onde falta restrição, e
o que falta não aparece como erro — aparece como número ótimo.** Foi o que
aconteceu antes com a parede fina, que já tinha exigido um limite de enrugamento; é
o mesmo modo de falha em outra variável. O limite de empunhadura entrou em 45 mm, e
a variante de 40 mm existe para quem quiser diâmetro comum, custando 40% de massa.
