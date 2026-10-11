# As ferramentas de modelagem

**Estado:** ativo

**Descongelado em 2026-10-08,** quando [o caminho curto da
IA](encerrados/2026-10-07-o-caminho-curto-da-ia.md) fechou, com a casca adiantada
pela pessoa para a fatia 2 e o rascunho das [perguntas do
crítico](encerrados/2026-10-08-perguntas-do-critico-por-objeto.md) na fatia do
crítico calibrado.

**Responsável:** Claude, com o aceite da pessoa

**Repositório e base:** `warbookbr/nos-mecanifica`, branch da sessão sobre a `main`

## Problema observado

O Mecanifica deve deixar uma IA modelar os objetos da [lista de
famílias](../FAMILIAS-DE-OBJETOS.md) melhor, mais barato e com mais confiança,
e hoje quatro coisas impedem isso. O esboço e o núcleo são dois motores, com
unidades, formas, encaixe e gate próprios, e o que o esboço decide é refeito na
modelagem; o esboço, que deveria ser leve e barato, saiu mais caro que o núcleo
em várias tarefas quando foi usado para objeto detalhado. O núcleo já seleciona
por grupo, região, origem, porta e alias, mas várias operações ainda pedem
identificador de vértice ou face, e não há seleção por propriedade geométrica,
perfil 2D com furo nem curva com arco, de modo que a IA escreve contas e números
à mão na receita. Faltam as ferramentas que cobrem a lista: a [contagem por
objeto](../FERRAMENTAS-POR-OBJETO.md) põe casca com espessura em 125 objetos,
articulações em 93, estrutura de barras em 72 e chapa dobrada em 62, e a casca e
a chapa não existem. E a verificação já tem peças que medem contra referência
externa, mas elas não estão no caminho de toda peça: na prática a régua compara a
peça contra a declaração dela, e o crítico visual é o único juiz da semelhança.
As [análises de 2026-10](../ANALISES-DE-2026-10.md) detalham cada ponto.

Em 2026-10-08, a caçamba do carrinho de mão pediu uma bacia oca de parede
inclinada e contorno em D, que o `loft` do esboço (só seção convexa) e a
`extrusao` (sem inclinação) não fazem, e o esbocista a gerou por um script em
Python que gravava 34 facetas em número fixo. O script, guardado em
[`carrinho-refeito-2026-10-08`](../banco-de-provas/carrinho-refeito-2026-10-08/), com o
[atrito](../banco-de-provas/carrinho-refeito-2026-10-08/ATRITOS.md) que o reproduz, é a
especificação do que falta: contorno paramétrico, deslocamento de contorno e casca. E o crítico com
as cinco perguntas genéricas tratou como detalhe dobradiças por fora da porta, que
com perguntas do componente e da família apontou como defeito estrutural.

## Resultado

Um núcleo só, com níveis de detalhe. O esboço passa a ser o nível zero, feito
sobre a forma global N2 estendida, e cada nível seguinte refina dentro do
envelope e das portas do anterior, de modo que o que o esboço decide não é
refeito. Duas peças se encaixam pelas portas do núcleo, estendidas a mais tipos,
e o esboço e o gate de contato leem o mesmo dado. A IA descreve a peça por
features (furo nesta face, arredondamento nesta aresta, casca com tais faces
abertas) e por ferramentas que geram as formas difíceis, e o núcleo resolve a
geometria. A verificação mede a peça contra a referência antes de o crítico
olhar, e o custo de cada objeto (tokens, rodadas e nota) é registrado como dado.

## Incluído

- as portas como contrato único de encaixe: novos tipos além de cilindro e anel
  (plano de apoio, padrão de furos, trilho e folga por classe de ajuste), e o
  esboço e as famílias passando a declarar portas em vez de contatos próprios;
- o nível zero: a forma global N2 estendida com as primitivas do esboço (cone,
  esfera, anel, revolução, extrusão de perfil côncavo, tubo) e com a ligação ao
  nível detalhado, em que a receita refina dentro do envelope e das portas da
  blocagem;
- o esboço refeito sobre o nível zero, aproveitando o que no módulo atual é
  processo e não geometria (Condutor, unidades, notas de passagem, Marcos,
  crítico com escala ancorada e vistas); o módulo atual fica congelado até a
  troca e continua servindo à skill `esbocar-opcoes`;
- antes do resto, o contorno paramétrico e o deslocamento de contorno como
  funções puras do núcleo, e a casca no `loft` do esboço atual, a única forma
  nova nele antes da troca;
- a camada de features sobre os seletores que já existem: seleção de face e
  aresta por propriedade geométrica (direção da normal, posição extrema, tipo),
  perfil 2D com furo e deslocamento de contorno, curva com arco, tangente e
  spline, e as operações que hoje pedem identificador passando a aceitar seleção;
- as primeiras ferramentas como extensões nativas, na ordem da contagem por
  objeto: casca com espessura, chapa dobrada, articulações e estrutura de barras,
  cada uma aceita pelo crítico em objetos da lista nos extremos das faixas e num
  ponto médio;
- a verificação ancorada: o G01 da forma global, a conferência contra foto e o
  contorno por parte no caminho de toda peça, antes do crítico, que julga só o
  que a medida não decide; e o crítico calibrado por um conjunto fixo de imagens
  com defeitos conhecidos e nota esperada, e perguntas de forma por componente e
  família no brief, com a proporção indo para o `--medidas`;
- as primeiras famílias, as primitivas 2.0: peças paramétricas aprovadas que a
  IA chama com poucos parâmetros em vez de reconstruir, feitas como composições
  procedurais sobre as ferramentas, em dois níveis, de componente (roda e pneu,
  cilindro hidráulico, mola, fixador, articulação) e de objeto (montagens de
  componentes, como roupeiro e cadeira), escolhidas entre as que mais se repetem
  na lista; cada uma é aprovada pela varredura de parâmetros e pelo crítico nos
  extremos das faixas e num ponto médio, com as portas conferidas;
- regra que vira código: quando uma ferramenta ou feature nova torna uma regra
  verificável, a regra sai da leitura obrigatória e passa a ser gate, recusa do
  executor ou aviso com mensagem que explica, e o documento guarda só o que é
  julgamento;
- o custo como medida: tokens, rodadas e nota por unidade gravados em cada
  rodada, e um banco de provas com os mesmos objetos refeitos para comparar.

## Excluído

- o OCCT como kernel de autoria; ele continua só na exportação STEP. A
  [análise de agosto](../historico/ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md)
  o rejeitou para ativo visual e deixou a reabertura para requisito de
  fabricação ou tolerância de peça mecânica, que este plano não tem; a hipótese
  volta se a camada de features sobre a malha não der arredondamento ou casca
  aceitáveis;
- o que está congelado: a carroceria por casca deformável e o vocabulário
  poligonal da bancada; o `loft` continua fora da pele exterior de carroceria,
  como a análise de agosto fixou;
- versões novas de montagem persistida: a composição fica como está até haver
  objetos que a exercitem;
- as famílias orgânicas da fase posterior;
- mudar de lugar o que já está bem desenhado (receita determinística, identidade
  semântica, montagem recursiva, mapa de dependências, revisão e impacto).

## Gate de saída

1. As portas cobrem os tipos novos, com teste, e o esboço e o gate de contato
   leem portas.
2. A caçamba do carrinho de mão está escrita no JSON do esboço, sem script e
   presa aos parâmetros do chassi, com casca e contorno de cantos arredondados, e
   a pessoa a aprova.
3. Um objeto da lista é esboçado no nível zero e refinado até a receita
   detalhada sem refazer posição, medida ou encaixe decididos no esboço.
4. Uma receita usa seleção por propriedade geométrica, perfil com furo e curva
   com arco sem nenhum identificador numérico escrito pela IA.
5. Casca, chapa dobrada, articulações e estrutura de barras existem como
   extensões nativas e são aceitas pelo crítico nos objetos escolhidos, nos
   extremos e no ponto médio das faixas.
6. Uma parte que diverge da referência é reprovada pela medida antes de chegar
   ao crítico, e o crítico acerta a nota esperada no conjunto de calibração,
   que inclui as dobradiças por fora e a picape baixa.
7. Pelo menos três famílias de componente e uma de objeto estão aprovadas em
   toda a faixa e usáveis por parâmetro.
8. O banco de provas mostra tokens, rodadas e nota dos mesmos objetos antes e
   depois.
9. `npm run gates --completo` passa.

## Fatias

1. O banco de provas com a medida de custo, para ter o antes, e as portas
   estendidas como contrato único de encaixe. Feita em 2026-10-07.
2. O contorno e a casca: perfil paramétrico e deslocamento de contorno no
   núcleo, a casca no `loft` do esboço e a caçamba do carrinho de mão. Feita em
   2026-10-09, com a caçamba aprovada pela pessoa (item 2 do gate).
3. O nível zero: a forma global N2 estendida e ligada ao nível detalhado. Feita
   em 2026-10-09: o andaime aceita as primitivas do esboço, e a receita declara
   em `REFINA` o volume que cada parte refina, com o verificador no veredito da
   peça recusando parte fora do envelope e porta movida.
4. O esboço refeito sobre o nível zero, com o processo do módulo atual, pelo
   [desenho](../CONTEXTO-FERRAMENTAS-DE-MODELAGEM.md#desenho-da-fatia-4) que a
   pessoa aprovou em 2026-10-10. Feita em 2026-10-10: a cadeira refeita pelo
   nível zero custou 94.093 tokens com nota 9, contra 101.631 e nota 8; as vistas
   do crítico seguem no desenhista atual, que mostra a cavidade.
5. O resto da camada de features sobre os seletores existentes. Em 2026-10-10
   entrou o perfil com furo e deslocamento de contorno sobre a `CrossSection`
   (operação `extrusao` e `lathe` com `furos`), a seleção de face e aresta por
   propriedade geométrica (`sel.onde`, aceita em `extruda` e `arredondarAresta`) e
   o contorno por trechos com reto, arco, arco tangente, concordância e spline,
   e nenhuma operação de edição exige mais identificador. Feita em 2026-10-10.
6. Casca com espessura e chapa dobrada como extensões nativas do núcleo, sobre
   as funções da fatia 2. As duas extensões entraram em 2026-10-10 (a casca
   recua cada face pelo plano, porque o `levelSet` medido gerava milhares de
   triângulos e errava a parede; sólido côncavo com quina de quatro faces ou mais
   é recusado); a aceitação nas faixas vem com as famílias da fatia 9.
7. Articulações e estrutura de barras, como extensões nativas. As duas
   entraram em 2026-10-10 (a articulação confere o curso contra as peças que
   ficam, por amostragem); a aceitação nas faixas vem com a fatia 9.
8. A verificação ancorada no caminho de toda peça e o crítico calibrado, com as
   perguntas por componente e por família.
9. As primeiras famílias, pelo [desenho](../CONTEXTO-FERRAMENTAS-DE-MODELAGEM.md#desenho-da-fatia-9) aprovado em 2026-10-11.
10. O banco de provas refeito e o fechamento.

## Riscos e desvios

O risco maior é o escopo; cada fatia fecha com teste e gate antes da seguinte, e o
esboço atual segue usável até o novo cobrir o que ele faz. O segundo é o nível zero
ficar tão pesado quanto o núcleo; o banco de provas mede isso na fatia 4, e o nível
zero que custar mais que o esboço atual não o substitui. O terceiro é a forma
global N2, parada desde agosto, não servir de base; a fatia 3 começa conferindo que
ela roda, e se não servir o nível zero é escrito ao lado dela com o mesmo contrato
de alvo e G01. O quarto é a casca e o arredondamento sobre malha não ficarem bons
em forma livre; nesse caso a hipótese do OCCT volta, com o custo já descrito na
pesquisa. O quinto é a nota do crítico variar entre julgamentos do mesmo objeto,
como no fechamento do caminho curto; a calibração da fatia 8 mede essa variação.

## Fechamento

A preencher.

## Depois deste plano

O que vem depois, o que já existe e este plano reaproveita, e as referências de
cada fatia estão no [contexto do plano](../CONTEXTO-FERRAMENTAS-DE-MODELAGEM.md),
aberto quando a fatia pede.
