# Referência de operações procedurais

Leia esta referência quando a tarefa exigir uma operação específica. O catálogo
de operações é gerado do registro do núcleo: rode `npm run catalogo:gerar` e
consulte [`docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md`](../../../../docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md).
Cada operação publica também schema de argumentos, exemplo executável,
pré-condições, limites e diagnóstico em
[`schemas-operacoes.json`](../../../../docs/mecanifica/gerado/schemas-operacoes.json).
Pelo MCP, prefira `descrever_capacidade`: ele entrega somente o contrato completo
da operação pedida. O executor continua sendo a autoridade final para validar
uma receita concreta e produzir recusas ligadas ao estado real da malha.

As peças citadas como exemplo nesta referência foram removidas do acervo em
`c78961f`. As lições continuam medidas e válidas — o que não existe mais é o
arquivo para abrir. O acervo mora em `procedural/pecas/`, e hoje não tem
receita; a convenção de cada operação vem do catálogo, e não de receita antiga.

## Navegação

- descoberta de operações, artefatos, efeitos e identidade: catálogo gerado;
- argumentos e exemplo de uma operação: `descrever_capacidade` ou contratos gerados;
- seleção semântica, identidade e limites: seção de seleção;
- proveniência de `origem`, rotação e exemplos: detalhes de seleção;
- aliases, atributos e animação: bloco de aliases e leis do núcleo.

## Operações disponíveis

Não mantenha outra lista aqui. O catálogo gerado contém cada operação registrada
uma única vez, com os artefatos que consome e produz, seus efeitos e política de
identidade. Esta referência conserva apenas decisões de autoria que não podem
ser inferidas de um contrato curto: seleção, orientação, proveniência e limites.

## Seleção semântica

Onde a operação aceitar `sel`, os campos disponíveis são `tudo`, `v`, `f`,
`grupo`, `regiao`, `origem`, `alias`, `onde` (filtro geométrico, abaixo) e, quando
publicado, `porta`. Operações de
face podem usar `regiao.modo` (`contem` ou `toca`); rotação, translação e
deslocamento tratam região como seleção de vértices e recusam esse modo.

`faces:[ids]` existe para arquivos legados. Não o misture com `sel`. Nome
errado, região incompleta, alvo ausente ou seleção ambígua devem gritar e não
produzir alteração parcial.

### Seleção por propriedade geométrica: `onde`

`sel:{onde:{...}}` escolhe face ou aresta pelo que ela é, sem id. É a única chave
de `sel` que filtra em vez de unir: com `origem`, `grupo`, `regiao`, `alias` ou
`porta` na mesma seleção, escolhe dentro do que elas juntaram; sozinha, escolhe
em toda a malha. Os critérios se aplicam nesta ordem, e `extremo` mede entre os
que sobraram dos anteriores:

- `alvo`: `'face'` (padrão) ou `'aresta'`. Se `tipo` só existe para um alvo, ele
  decide; `alvo` contrário ao `tipo` grita.
- `tipo`: de face, `'plana'` ou `'empenada'`; de aresta, `'viva'`, `'lisa'` ou
  `'borda'`. `viva` e `lisa` pedem `angulo` (graus entre as normais das duas
  faces: 0 é liso, 90 é a quina de uma caixa); viva é estritamente acima dele,
  lisa é até ele. `borda` é a aresta de uma face só (malha aberta). Aresta com
  uma face ou com três ou mais não tem ângulo e não é viva nem lisa.
- `normal:{dir:[x,y,z], ate:graus}`: a normal da face a até `ate` graus de `dir`
  (`dir` não precisa de comprimento 1, e vale nome de PARAM). Numa aresta vale se
  alguma das faces vizinhas passa: `normal` para cima com `alvo:'aresta'` são as
  arestas da face de cima.
- `extremo:{eixo:'x'|'y'|'z', lado:'max'|'min', tol?}`: o elemento cujo centro
  (média dos cantos da face, ponto médio da aresta) está no maior ou menor valor
  do eixo, e os que ficam a até `tol` dele (padrão 1e-6, em unidades do mundo).

```js
// a face de cima da caixa 1, e só dela (a caixa 2 tem outra face de cima)
{ origem: { op: 'cubo', id: 1 }, onde: { normal: { dir: [0, 1, 0], ate: 5 } } }
// as 8 arestas da tampa de cima de um cilindro: vivas acima de 60° e em y máximo
{ onde: { tipo: 'viva', angulo: 60, extremo: { eixo: 'y', lado: 'max' } } }
```

Seleção de aresta devolve as pontas dela como vértices: `transladar` e `rotaciona`
movem essas pontas, e as operações de face (`pincel`, `parte`, `material`) a
recusam por não ter face. `arredondarAresta`, `filete` e `moveA` aceitam `sel` no
lugar de `de` + `aresta` (ou `a` + `b`), desde que ela resolva para exatamente
uma aresta (a face de apoio é a de menor id entre as que a usam). Resultado vazio grita em `sel.onde` com o
critério pedido e o número de candidatos que sobrou a cada passo; chave, valor
ou combinação inválidos gritam com o campo. O resultado é ordenado (faces por id,
arestas por par de vértices) e não depende da execução.

## Pose de criação: `em` e `eixo`

Coloque a forma onde ela mora **no próprio passo do gerador**. Escrever
`gerador` + `rotaciona` + `transladar` para isso é o caminho longo, e ele
espalha a posição para longe da forma.

```js
['cilindro', { origemId: EIXO, raio: 'r', altura: 'h', eixo: 'x', em: [0.5, 0.1, 0] }]
```

- `em: [x,y,z]` translada a forma recém-criada. Vale em `cubo`, `cilindro`,
  `esfera`, `cone`, `plano`, `chamferBox`, `lathe` e `extrusao`.
- `eixo: 'x' | 'y' | 'z'` escolhe a direção do eixo de revolução. Vale só em
  `cilindro`, `cone`, `lathe` e `extrusao`, que têm um eixo (o da revolução ou o
  da extrusão). `'y'` é como a forma já nasce.
- A ordem é **gira e depois move**, e o giro é em torno da origem.

O resultado é idêntico, vértice por vértice, a escrever os passos separados —
é isso que `procedural/nucleo/pose-de-criacao.test.ts` afirma. Use os passos
separados quando o pivô do giro **não** for a origem, ou quando precisar mover
algo que já existe.

`em` fora de um gerador GRITA, e `eixo` num gerador que não é de revolução
também: `cubo` não tem eixo para escolher.

Isto não encosta uma peça na outra nem mede vizinho — não existe `alinhar`
relacional no núcleo.

## Perfil com furo e deslocamento de contorno

`extrusao` levanta em y um perfil 2D, e o `lathe` revoluciona o mesmo perfil como
seção; os dois montam o perfil pela `CrossSection` da Manifold (Clipper2), então
a receita descreve o perfil e não calcula ponto. O contorno externo é uma lista
de pontos `[u, v]` (em `extrusao` o ponto vai para `x = u`, `z = v`; no `lathe` é
`[raio, y]`) ou uma forma pronta: `{retangulo: {largura, profundidade, centro?,
cantos?}}` (os `cantos` são os de `retanguloArredondado`) e `{circulo: {raio,
centro?}}`. Os `furos` são formas nas mesmas três escritas. O `deslocar` é
`{para: 'dentro'|'fora', distancia, canto: 'redondo'|'reto'|'esquadria', limite?}`:
`dentro` recua o externo e aumenta cada furo, `fora` faz o contrário. O canto
`esquadria` prolonga as arestas até se encontrarem (e corta reto além de `limite`
vezes a distância, padrão 4), o `reto` corta o canto por uma aresta tangente ao
círculo de raio `distancia` no vértice, e o `redondo` põe arco com
`segmentosArco` segmentos por quarto de volta (padrão 4, também no círculo).
Para dentro, um contorno só com cantos convexos recua igual nos três cantos; a
diferença aparece para fora e nos cantos côncavos.

```js
['extrusao', { origemId: PLACA, perfil: { retangulo: { largura: 'L', profundidade: 'P', cantos: 0.01 } },
  furos: [{ circulo: { raio: 0.004, centro: [0.03, 0] } }, { circulo: { raio: 0.004, centro: [-0.03, 0] } }],
  deslocar: { para: 'fora', distancia: 0.002, canto: 'redondo' }, altura: 'espessura' }]
['lathe', { origemId: ARO, lados: 24, perfil: [[0.05, 0], [0.07, 0], [0.07, 0.02], [0.05, 0.02]],
  furos: [{ circulo: { raio: 0.003, centro: [0.06, 0.01] } }] }]   // com furos ou deslocar o perfil é a seção, fechada pelo eixo
```

O furo precisa ficar inteiro dentro do externo, a mais de 1e-6 da diagonal da
borda e dos outros furos, e um furo não contém outro. Furo que encosta, cruza ou
sai é recusado com o índice, a distância medida e o conserto, e o mesmo vale para
campo desconhecido, `distancia` que não é positiva, `canto` fora da lista e
deslocamento que apaga o perfil (a mensagem diz o recuo máximo aproximado). Para
abrir o furo na borda, escreva o recorte no contorno externo. Um recuo pode partir
o perfil em pedaços, e cada pedaço sai como contorno próprio. A saída é a mesma
em toda execução: cada contorno começa pelo menor ponto, furos e pedaços saem
ordenados e a grade é de 1e-8, a precisão do Clipper2.

### Contorno por trechos: reto, arco, tangente, concordância e spline

Onde o perfil precisava de arco ou de curva suave, a receita calculava os pontos à
mão. O contorno externo de `extrusao` (e cada forma de `furos`, também no `lathe`)
aceita uma quarta escrita, `{contorno: {inicio: [u, v], trechos: [...]}}`. Cada
trecho é um objeto de uma chave só e começa onde o anterior terminou; o contorno
fecha sozinho com um reto de volta ao `inicio`.

- `{reto: [u, v]}`: segmento reto até o ponto.
- `{arco: {por: [u, v], ate: [u, v]}}`: arco por três pontos (o atual, `por` e `ate`).
- `{arco: {centro: [u, v], angulo}}`: arco em volta de `centro`, `angulo` em graus
  (positivo é anti-horário, entre 0 e 360 exclusive).
- `{arcoTangente: [u, v]}`: arco que sai tangente ao fim do trecho anterior (reto,
  arco ou spline) e termina no ponto.
- `{concordancia: raio}`: filete de `raio` no canto atual, entre o reto que chegou e
  o reto que vem. Escrita antes do primeiro trecho vale para o canto do `inicio`, e
  depois do último, para o canto antes do reto de fechamento.
- `{spline: [[u, v], ...]}`: curva suave que passa por todos os pontos, em ordem,
  depois do ponto atual. Em `{spline: {pontos, tangente}}`, `tangente: 'anterior'`
  (padrão quando há trecho anterior) parte tangente ao trecho anterior e `'livre'`
  parte na direção da primeira corda.

```js
// gancho: reto, arco tangente de raio 2, coluna, e a volta pela face interna (raio 1)
['extrusao', { origemId: GANCHO, altura: 'espessura', segmentosArco: 8, perfil: { contorno: {
  inicio: [0, 0],
  trechos: [{ reto: [4, 0] }, { arcoTangente: [6, 2] }, { reto: [6, 5] }, { reto: [5, 5] },
            { reto: [5, 2] }, { arcoTangente: [4, 1] }, { reto: [0, 1] }] } } }]
// retângulo 4 × 3 de cantos 0,5: os mesmos números de {retangulo: {..., cantos: 0.5}}
{ contorno: { inicio: [2, 1.5], trechos: [{ concordancia: 0.5 }, { reto: [-2, 1.5] }, { concordancia: 0.5 },
  { reto: [-2, -1.5] }, { concordancia: 0.5 }, { reto: [2, -1.5] }, { concordancia: 0.5 }] } }
```

A discretização é argumento da receita, nunca tolerância calculada. Um arco ou
filete de varredura S usa `ceil(S / 90° × segmentosArco)` segmentos iguais em
ângulo (`segmentosArco` do passo, padrão 4), e cada vão da spline usa
`segmentosSpline` segmentos (do passo ou do próprio contorno, padrão 8). Os pontos
de passagem e as pontas dos arcos saem exatamente onde foram escritos, os números
saem na grade de 1e-9 e a mesma receita dá os mesmos números, byte a byte. A
spline é Catmull-Rom centrípeta: passa pelos pontos (a B-spline só se aproxima
deles), é local (mexer num ponto altera no máximo os quatro vãos vizinhos, que é o
que o parâmetro da peça precisa) e não faz laço nem ponta dentro de um vão. A
tangente é contínua em cada ponto, e a curvatura não.

A concordância liga dois retos; entre reto e arco, use `arcoTangente` ou a spline
tangente. O filete de raio `r` num canto de giro φ come `r·tan(φ/2)` de cada reto
vizinho, e dois filetes no mesmo reto dividem o comprimento dele. São recusados,
com o campo (`perfil.contorno.trechos[3].arco`), o valor e o que se aceita: arco
por três pontos colineares ou repetidos, raio de concordância maior que o reto
(a mensagem dá o raio máximo que cabe), retos colineares ou que voltam sobre si,
`arcoTangente` com o ponto sobre a reta da tangente ou sem trecho anterior, arco
por centro com ângulo 0 ou de 360 ou mais, spline com um ponto só ou com pontos
consecutivos repetidos, trecho desconhecido e `segmentosArco` ou `segmentosSpline`
que não é inteiro >= 1. Um contorno que se cruza é recusado pelo `montarPerfil`
como polígono não simples. O lathe ainda lê `perfil` como lista de pontos
`[raio, y]` (com a concordância própria do terceiro número); o `{contorno}` vale
nos `furos` dele.

Na origem, `sel:{origem:{op:'extrusao',id,...}}` sem eixo é o sólido inteiro
(laterais e as duas tampas), ao contrário do `cilindro`, e as booleanas o aceitam
assim. `lado` escolhe uma lateral pela ordem dos pontos, `tampa` (`'fundo'` ou
`'topo'`) todas as peças convexas da tampa, e `parede` (`'externo'`, `'furos'`,
`'todas'` ou o número do furo) as laterais de um contorno. No `lathe` com furos,
as faixas se enfileiram: o externo e depois os furos. O `deslocarContorno` de
`procedural/nucleo/contorno.js` não delega a esta montagem: ele preserva o número de vértices que o
`loft` com casca exige.

## Ponto nomeado

Um nome pode guardar o ponto inteiro, e não só um escalar:

```js
export const PARAMS = { apoioDaPinca: [0.06, 0.02, 0], paraBaixo: [0, -1, 0] };
...
['transladar', { sel: { origem: FLEXIVEL }, d: 'apoioDaPinca' }],
['arranja',    { …, pivo: 'centroDaRoda' }],
```

Vale em qualquer campo que aceita ponto — `d`, `pivo`, `em`, `direcao`. Cada
componente continua aceitando PARAM e expressão. Um ponto nomeado **não** cita
outro ponto nomeado: componente é escalar.

Prefira isto a `apoioX`/`apoioY`/`apoioZ`: três nomes para um ponto é a mesma
coisa escrita três vezes, e alterar dois e esquecer o terceiro produz um ponto
que ninguém escreveu.

## Encostar em vez de digitar a coordenada

Quando uma peça se apoia na outra, **derive** o contato em vez de calcular o
número. Coordenada digitada não sabe de onde veio: se a espessura da vizinha
mudar, o encosto se desfaz e nada avisa.

```js
['encostar', { sel: { origem: PASTILHA }, referencia: { origem: DISCO },
               direcao: [0, -1, 0], folga: 'folgaDePastilha' }],
```

- `sel` é o que se move; `referencia` é o lado que fica parado;
- `direcao` é obrigatória. Ela **não** é inferida de propósito: inferir traria
  ambiguidade e desempate, e a peça deixaria de ser reexecutável;
- `folga` é a distância que sobra no fim (ausente = encosta de fato). Negativa é
  recusada — interferência declarada é `transladar`.

A conta leva a frente do que move até a traseira da referência, na direção
declarada, menos a folga. Ela POSICIONA em contato, então também corrige o corpo
que passou do ponto.

**O que ela não é:** contato por extensão na direção declarada. Não descobre o
que encosta em quê, não resolve interpenetração lateral, não é encaixe nem
colisão. Para medir de verdade, continue medindo.

## Nome de cópia no `arranja`

`copia: 2` é POSIÇÃO, e posição não é identidade. Se o `total` mudar, a linha
continua resolvendo e passa a apontar para uma cópia com outro papel, sem erro.

Declare `nomes` no passo, um por cópia, e cite por nome:

`derivaDe` e `de` recebem uma ORIGEM — `{op,id}` —, não o `origemId` cru. O
exemplo abaixo escreve `TABUA` nos dois, e `TABUA` é a origem inteira, não o
número. Trocar por um inteiro dá `derivaDe inválida: origem precisa ser um
objeto com op e id`, e custou três rodadas a quem leu isto como identificador.

```js
const TABUA = { op: 'cubo', id: 7 };   // ← origem, não número

['arranja', { origemId: CERCA, derivaDe: TABUA, sel: { origem: TABUA },
              modo: 'linear', d: ['passo', 0, 0], total: 'totalDeTabuas',
              nomes: ['central', 'direita', 'ponta'] }],
['parte', { nome: 'tabuaDaPonta',
            sel: { origem: { op: 'arranja', id: CERCA, de: TABUA, nome: 'ponta' } } }],
```

`espelha` segue a mesma regra: `derivaDe` na criação e `de` na citação, os dois
com a origem completa.

A lista é exata: uma entrada por cópia (`total − 1`, porque a fonte não é
cópia). Mexer no `total` sem revisar os nomes GRITA — é isso que obriga a olhar
para a citação que talvez tenha mudado de sentido.

`copia` e `nome` não convivem na mesma origem. `copia` continua certo quando
você realmente quer falar de posição.

## Identidade estrutural

`origemId` é escolhido pelo autor e endereça uma primitiva. `origem` sem eixo
seleciona a primitiva inteira; no cilindro, a forma sem `lado` nem `tampa`
seleciona somente laterais. Para o cilindro inteiro, una lateral, `fundo` e
`topo` ou publique um alias.

`ALIASES` é uma lista de `[nome, definição]`; cada termo é uma origem ou uma
união plana de origens. Não encadeie alias. Valide-os antes do primeiro passo e
encaminhe-os a todas as chamadas do núcleo que recebem aliases.

## Superfície subdividida: `subdivisao`

`subdivisao` gera uma superfície Catmull-Clark lisa a partir de uma gaiola de
quads com poucos pontos, a forma de modelar uma chapa contínua com dobras vivas.
Os campos são `vertices` (cada um o nome de um ponto de `PARAMS`, uma vez só,
ou `[x,y,z]` anônimo), `faces` (os nomes de ponto de cada face, anti-horário
visto de fora), `vincos`, `cantos` (nomes de ponto), `niveis` (0 a 6, padrão 2),
`borda`, `simetria` e `medidas`. O catálogo e `descrever_capacidade` trazem o
contrato completo. Escreva a gaiola por nomes: o índice de vértice na face só
serve à gaiola anônima, e vinco e canto não aceitam índice.

Sem `medidas`, a superfície aproxima a gaiola e não passa pelos pontos: cada
medida da `TABELA` aplicada a um vértice sai encolhida, e o canto de borda não
tem raio controlado. Para que a superfície passe por uma cota, escreva o vértice
como nome de ponto e liste esse nome em `medidas`, por exemplo
`medidas: ['quinaDoTeto', 'pontaDoCapo']`. Os pontos listados passam pela
superfície limite a menos de 1e-6 m, e os outros pontos da gaiola ficam onde
foram declarados. Na simetria em `x`, a imagem espelhada do ponto medido também
é medida. A posição dos pontos medidos se resolve de uma vez por eliminação de
Gauss sobre os pesos do ponto limite, e o resultado é bit a bit. Com `medidas`,
todo vértice da malha entregue vai ao seu ponto limite, e cada ponto medido é
um vértice da malha exportada a menos de 1e-6 m da cota; sem a projeção, a malha
de nível 2 ficaria de 1 a 18 cm dele numa forma de 2 m. O preço é a corda: o
meio de cada face fica mais longe da superfície limite que sem a projeção (no
cubo de 2 m em nível 2, 5,8 cm contra 2 cm), então suba `niveis` quando a face
precisar acompanhar a curva, porque essa distância cai de três a quatro vezes a
cada nível. Quando a gaiola é amostra de uma forma desenhada e a densidade
dela varia, marque todos os pontos, e não só as cotas: sem medida, a superfície
fica para dentro da amostra cerca de curvatura × passo² / 6, e a faixa adensada
salta para fora do resto (4,5 mm na carenagem de prova, contra 0,3 mm na faixa
fina), enquanto cada cota medida sozinha vira um calombo. Com todos os pontos
marcados, gradue o passo para que nenhum intervalo passe do dobro do vizinho,
porque um salto de quatro vezes ondula a superfície junto da faixa e, junto de
uma borda livre, espreme as linhas da malha até dobrar a face; e um recorte na
borda, como um arco, deve levantar as colunas sem mudar a forma que elas
amostram, ou a forma ganha quina nas pontas do recorte. A eliminação aproveita
que a matriz é esparsa: mil pontos medidos levam cerca de 0,6 s. A gaiola ajustada se move
mais que a cota: para passar pelos oito cantos de um cubo de 2 m, o canto da
gaiola anda até 3 m, e a superfície se desloca no máximo 7% além da correção
no ponto, de modo que entre os pontos ela quase não incha. Um conjunto de medidas que a superfície
limite não separa, como os oito cantos de um cubo liso, grita com os nomes dos
pontos e não gera malha. Também grita o conjunto em que um erro no alvo moveria
a gaiola mais de 100 vezes esse erro, porque aí 1 mm de cota vira 10 cm de
gaiola. A regra é a do OpenSubdiv no modo uniforme e confere,
a 1e-6 m, com a saída congelada do modificador Subdivision Surface do Blender
em `procedural/nucleo/fixtures/subdivisao-oraculo-blender.json`.

A cota que tem erro, como a lida de imagem ou de foto, se declara com peso:
`medidas: ['quinaDoTeto', { ponto: 'cotaLida', peso: 1 }]`. O nome sozinho
continua a cota exata, e o peso (número maior que zero ou nome de `PARAMS`)
faz a superfície se aproximar da cota por mínimos quadrados sem passar por
ela, com cada ponto da gaiola em volta pagando o quanto anda: peso 1 pesa o
desvio à cota igual ao deslocamento de um ponto da gaiola, e quanto maior o
peso, mais perto da cota e mais a superfície copia o erro dela. Use o peso
quando muitas cotas vizinhas vêm de uma leitura com erro da ordem de
milímetros, porque com todas exatas a superfície passa por cada erro e ondula;
use a cota exata para o que a peça precisa acertar, como a altura de um vão ou
de um encaixe, e misture as duas no mesmo passo. Numa chapa de grade de
100 mm com vinte cotas alinhadas e ruído de até ±2 mm, a exata dá desvio de
normal p95 de 1,43 grau, e o peso 1 dá 0,65 grau, com desvio médio de 0,79 mm
às cotas (ruído médio de 1,04 mm) e de 0,53 mm à forma sem ruído, contra
1,04 mm da exata; peso 4 deixa 0,48 mm nas cotas e 0,85 grau, peso 16,
0,22 mm e 1,06 grau. Na `gaiolaPorEstacoes`, `peso` entra no seletor da
medida, como `{ estacao: 'meio', peso: 1 }`. A formulação, o sistema normal e
o ganho, que grita como na exata, estão em `ajustarGaiolaAsMedidasComPeso`, em
`procedural/nucleo/subdivisao.js`.

Dado lido de imagem entra com peso por padrão: a cota exata nos pontos lidos faz a
superfície passar por cada erro de leitura (no sétimo teste cego, erros de 1,6 a
2,9 mm viraram rugas). No passo, `pesoPadrao: 1` (número ou nome de `PARAMS`) faz o
nome escrito sozinho em `medidas` ter esse peso em vez de ser exato, e a cota de
projeto que a peça precisa acertar se escreve `{ ponto: 'alturaDoVao', exata: true }`;
a declaração de um ponto (peso ou `exata`) vence o padrão sobre ele, e `exata` com
`peso` grita. Na `gaiolaPorEstacoes`, `leitura: true` (ou `leitura: { peso, erro,
inclinacao, estrito }`) declara que as estações e as colunas vêm de leitura, e a
medida sem `peso` ganha o peso da leitura (1 por padrão); `exata: true` na medida
a mantém exata, como em `{ estacao: 'e1', coluna: 'c2', exata: true }`, e o `peso`
próprio vale mais que o da leitura. Sem `leitura` nem `pesoPadrao`, o nome sozinho
continua cota exata, e a receita escrita antes tem a mesma malha. Numa chapa de
1600 mm com erro de ±2 mm plantado em todos os pontos, a exata ondula até 2,32 mm
(21 falhas a `--limiar-mm=1`) e o peso padrão até 0,73 mm (nenhuma a esse limiar), e o
peso não leva a chapa abaixo de 0,3 mm quando o erro está nos pontos da gaiola;
numa chapa lisa de raio 2 m o peso 1 deixa a superfície perto de 0,7 mm para dentro
dos pontos. A leitura também avisa pelo nome quando duas estações-chave vizinhas
ficam mais perto do que o erro sustenta: duas leituras diferem até 2 × `erro` (mm,
2 por padrão), e a inclinação que só o erro põe é essa diferença dividida pelo
espaçamento; acima de `inclinacao` (0,1) a gaiola devolve em `avisos`
`{ ref: 'estacoesProximas', estacoes, espacamentoMm, minimoRecomendadoMm, inclinacao,
texto }`, com o mínimo 2 × erro / inclinacao (40 mm nos padrões), e
`npm run ondulacao` os traz em `avisosDaGaiola`. `estrito: true` faz o aviso gritar.
Seis estações a 4 mm, com a cota exata, dobram uma chapa lisa em 384 faces; com a
leitura, nenhuma, e o aviso já tinha dito.

O vinco é uma sequência nomeada de pontos da gaiola ao longo das arestas, como
`vincos: [{ nome: 'dobraDaAba', pontos: ['a', 'b', 'c'], nitidez: 0.75 }]`;
para fechar um aro, repita o primeiro ponto no fim. A `nitidez` vai de 0 (liso)
a 1 (vivo), aceita nome de `PARAMS`, e `'viva'` é a escrita explícita do vinco
vivo. A nitidez n vira 10 n² níveis de Catmull-Clark semiaguda, a mesma
conversão do vinco do Blender, e de 10 níveis para cima o vinco é vivo, como
no OpenSubdiv; por isso a nitidez 1 já é viva, e a superfície limite do Blender
com vinco 1 confere com a do núcleo a 2e-7 m e fica a 4e-4 m da nitidez finita
9,99. O raio de borda escala com a gaiola: num cubo de 1 m com as doze arestas
vincadas, o meio da aresta fica na superfície limite como num filete de
107 mm de raio com nitidez 0,5, 12,2 mm com 0,75, 2,1 mm com 0,9, 1,1 mm com
0,95 e zero com 1, o que dá raio ≈ 0,6 × lado da face × 2^(−10 n²). Abaixo de
0,5 o cubo já não tem face plana (com 0,25 o meio da face cai 3 cm), e a
nitidez só arredonda a forma toda. Vinco ou canto por índice grita com a forma
nomeada; par de pontos do vinco que não é aresta da gaiola, ponto que não está
na gaiola, nome de vinco repetido e aresta em dois vincos gritam com os nomes.
`cantos: ['quina']` fixa o ponto como canto vivo, o vinco de vértice 1 do
Blender. `simetria: 'x'` pede a gaiola da metade `x >= 0`, que é espelhada
antes de subdividir para a costura sair lisa, com os vincos e cantos
espelhados. Um vértice declarado que nenhuma face usa grita com o nome do
ponto, e a operação não gera malha.

As faces geradas saem lisas com ângulo de 30 graus, o mesmo `liso` com
`angulo` do passo `liso`, e as arestas que descendem de um vinco vivo levam
quebra de sombra, de modo que a dobra continua aresta também nas pontas, onde o
diedro cai abaixo do ângulo. Não marque a superfície com um passo `liso`
depois: ele trocaria o ângulo e manteria as quebras. `liso: 45` (número ou nome
de `PARAMS`) muda o ângulo, `liso: false` devolve as faces chapadas,
`quebraNosVincos: 'todos'` quebra também nos vincos de nitidez fracionária
(que na superfície limite são lisos, e por isso ficam fora por padrão) e
`'nenhum'` deixa só o ângulo. Só a marca de sombra muda: as posições e as faces
são as mesmas com qualquer valor. Na carenagem de prova, a sombra lisa tira as
listras de triângulo que a luz chapada desenhava nas pontas da cintura e a
quebra mantém a dobra até onde o vinco termina. A bancada respeita a quebra; as
vistas da receita (`vistas-da-receita`) desenham toda face chapada. Um ombro
de nitidez fracionária que em nível 2 tem arestas acima de 30 graus continua
facetado; suba `niveis` ou adense as colunas antes de subir o ângulo.

A gaiola de uma chapa longa se escreve por estações, com `gaiolaPorEstacoes`
de `procedural/nucleo/gaiola-por-estacoes.js`, chamada em `gerarPassos` com os
números que `derivar()` tirou da `TABELA`. Cada estação tem nome, posição `em`
no eixo e as colunas nomeadas em ordem, cada uma com `em: [u, v]` nos outros
dois eixos (na ordem x, y, z) e, se preciso, um terceiro número que desloca o
ponto ao longo do eixo. O ponto se chama `estacao_coluna`, e o ajudante devolve
`pontos`, que a receita publica num getter de `TOPO` calculado de `this.PARAMS`,
e `passo`, que se espalha no passo. Em `PARAMS` os pontos ficariam fixos desde a
carga do módulo, e mudar a `TABELA` não moveria a gaiola; o exemplo completo é
`procedural/pecas/carenagem-de-prova/`, e o fluxo está em
`docs/mecanifica/modelar-carroceria.md`:

```js
const coluna = (nome, u, v) => ({ nome, em: [u, v] });
const secao = (nome, em, comCintura) => ({ nome, em, colunas: [
  coluna('soleira', P.largura, P.base),
  ...(comCintura ? [coluna('cintura', P.saliencia, P.cintura)] : []),
  coluna('ombro', P.largura - P.recuo, P.altura), coluna('centro', 0, P.teto),
] });
const lateral = gaiolaPorEstacoes({
  eixo: 'z', simetria: 'x',
  estacoes: [secao('frente', 0, false), secao('meio', P.meio, true), secao('pilar', P.pilar, true), secao('tras', P.comprimento, true)],
  vincos: [{ nome: 'ombro', coluna: 'ombro', nitidez: 0.75 }, { nome: 'linhaDeCintura', coluna: 'cintura', nitidez: 'viva' }],
  vaos: [{ nome: 'claraboia', estacoes: ['meio', 'pilar'], colunas: ['ombro', 'centro'] }],
  medidas: ['frente', 'meio', 'pilar', 'tras'].map((estacao) => ({ estacao })),
});
// get TOPO() { return { origem, ...lateral.pontos }; }; passo: ['subdivisao', { origemId: 1, ...lateral.passo, niveis: 2 }]
```

A coluna liga-se à de mesmo nome na estação anterior. A que surge entre duas
que seguem, como `cintura` acima, começa ali e fecha um pentágono, e a que some
termina ali; `de: ['m', 'n']` funde duas colunas da estação anterior numa só, e
duas colunas com o mesmo `de` dividem uma em duas, cada uma fechando um
triângulo. Assim a gaiola adensa só perto de um vinco: na forma de prova do
teste do ajudante, a chapa com vinco vivo, ombro de nitidez 0,75, arco na borda
e vão sai com 472 pontos de gaiola e 13.603 vértices, contra 1.596 pontos e
48.671 vértices da mesma forma em grade cheia na densidade do vinco, e as duas
superfícies ficam a até 4,8 mm uma da outra, 0,4 mm perto do vinco. O vão tira
as faces entre duas estações e duas colunas, o vinco segue uma coluna
(`coluna`, com `de` e `ate` em estações) ou uma estação (`estacao`, com `de` e
`ate` em colunas), e `cantos` e `medidas` marcam por `{ estacao, coluna }`, em
que só a estação marca a estação inteira e só a coluna marca a coluna inteira.
A borda que sobra é livre, e `borda: 'cantos'` no passo mantém os cantos dela;
`bordaDoVao(nome)` devolve os pontos da borda de um vão pelo nome dele, a linha de
uma aba (veja `aba` no `friso`).
A face sai com a normal no sentido (colunas) × (estações), e `virar: true`
inverte. Com `simetria: 'x'` a gaiola é a metade `x >= 0`. Gritam com os nomes
a coluna citada que a estação não tem, a transição impossível (ligações que se
cruzam, a primeira ou a última coluna sem ligação e face de mais de cinco
lados), o vão que deixa ponto sem face, o vinco sobre aresta que a fusão ou o
vão tirou, o ponto com x < 0 na simetria e a aresta no plano x = 0 com duas
faces.

Para adensar só um trecho, como uma borda enrolada ou a volta de um friso na
ponta de um vão, declare uma região e marque com `regiao` as estações parciais
e as colunas extras dela. A estação parcial vai de uma coluna a outra dentro da
faixa de colunas da região (`null` é a borda) e fica entre as duas estações
inteiras da faixa; a face de fora que encosta nela fecha um pentágono, e por
isso, entre duas estações inteiras, só uma parcial toca cada coluna de borda da
região. `termina: true` na última estação de uma coluna deixa a chapa acabar ali
daquele lado, com a aresta até a vizinha como borda livre (a tampa que acaba
antes da última estação), e `comeca: true` faz a coluna nascer na borda:

```js
const g = gaiolaPorEstacoes({
  eixo: 'z',
  regioes: [{ nome: 'moldura', estacoes: ['e03', 'e07'], colunas: ['d', null] }],
  estacoes: [
    secao('e03', 0.30),
    { nome: 'm35', em: 0.35, regiao: 'moldura', colunas: [d, e, ...aba.map((c) => ({ ...c, comeca: true }))] },
    secao('e04', 0.40, { extras: aba.map((c) => ({ ...c, regiao: 'moldura' })) }),
    // ... m45, e05, m55, e06, e a última parcial com termina: true nas colunas da aba
    secao('e07', 0.70),
  ],
});
// g.regioes.moldura lista os pontos da região
```

Na borda enrolada de prova (`procedural/nucleo/fixtures/borda-enrolada.js`), a
região acrescenta 62 pontos à chapa de 55, todos dentro da faixa, com 8
pentágonos na transição; a superfície em nível 2 sai sem cruzamento e com no
máximo 19,7 graus entre faces vizinhas, os 1.095 vértices novos ficam nas faces
que a região mudou e nas vizinhas delas, e o resto da chapa sai igual. O eixo
também pode ser uma curva nomeada, para o anel em volta de um vão:
`eixo: { curva: 'vidro', pontos, normal: [1, 0, 0], fechada: true }`, com `em`
como fração do comprimento da poligonal, de 0 a menos de 1, e a coluna em
`[u, v, w]` no triedro da curva: v na normal declarada, w na tangente e u = T × V,
que aponta para fora quando a curva gira no sentido anti-horário visto do lado da
normal. O anel liga a última estação à primeira, e o vinco que segue uma coluna
inteira volta ao primeiro ponto.

Quando só alguns cortes da forma são conhecidos, escreva só eles e deixe o
ajudante preencher o resto, sem escrever interpolação na receita. `curvas`
declara as colunas a frações fixas do comprimento de uma curva de seção, e cada
estação dá a curva por pontos-chave; a curva é a Catmull-Rom centrípeta, que
passa pelos pontos e não faz laço, e a fração conta o comprimento, então as
colunas não se amontoam onde os pontos se juntam, como num canto arredondado.
`interpolar` faz da estação sem `colunas` uma estação interpolada e, com
`passo`, gera as que faltam entre duas declaradas, graduadas a no máximo o
dobro do vizinho; cada coluna sai da interpolação monótona (PCHIP) das chaves,
que não passa dos valores dos nós. Marque as medidas só nas chaves, com
`chaves: true`, porque cota em estação interpolada ondula:

```js
const g = gaiolaPorEstacoes({
  eixo: 'z', simetria: 'x', interpolar: { passo: 0.1 },
  curvas: [{ nome: 'secao', colunas: [0, 0.25, 0.5, 0.75, 1].map((fracao, j) => ({ nome: `s${j}`, fracao })) }],
  estacoes: cortes.map(({ nome, z, pontos }) => ({ nome, em: z, colunas: [{ curva: 'secao', pontos }] })),
  medidas: [{ chaves: true }],
});
// g.estacoes lista { nome, em, tipo: 'chave' | 'interpolada' | 'gerada' }
```

A estação gerada se chama `${anterior}_${k}`, nome que muda com o passo, e por
isso cantos, medidas, vincos, vãos e regiões não a citam (grita); declare
`{ nome, em }` sem colunas para a estação que precisa de nome. Entre duas
chaves, a estação interpolada leva as colunas da primeira que se ligam à
segunda, e a fusão, a divisão e a coluna nova ficam na chave seguinte. Como a
interpolação não passa dos nós, tire um corte em cada extremo da forma (o
ponto mais alto do teto, a seção mais larga): na prova do ajudante, cinco
cortes de uma superfície analítica de 2,4 m a cada 0,6 m reproduzem a
superfície a 0,37 mm, a interpolação linear ficaria a 1,25 mm, e com o máximo
de uma coluna caindo 0,23 m depois de um corte o desvio sobe a 0,73 mm. A
interpolação não extrapola, não entra numa região e não vale no eixo fechado.

A moldura em volta de um vão, a calha e o lábio de um arco pedem laços de arestas
que contornam a borda, e a grade de estações e colunas não os tem: o vão sai
retangular e o arco corta a grade na diagonal. `aneis` põe esses laços e os costura
à grade ao redor, de dois jeitos. Com `recuo` maior que zero o anel preenche o vão
por dentro: o vão é o limite de fora, a abertura de verdade, a borda livre da chapa,
fica `recuo` mm para dentro da borda dele, e é a volta 1 do anel. O recuo é um número
para todos os lados, ou um por lado, citando pelo nome as duas colunas e as duas
estações que o vão declara em `colunas` e `estacoes`, com `padrao` para o lado que
faltar. Com `recuo: 0` a abertura é a própria borda do vão, que a gaiola já tem, e as
voltas 2, 3... crescem para fora, sobre a grade: o anel troca a faixa de faces que
cerca o vão (`camadas`, de uma a quatro; sem a opção ele toma a menor que fecha a
transição) por faces suas, e a volta 1 são os pontos da própria borda, com os nomes da
grade. Nos dois jeitos as voltas se afastam da abertura, em direção à grade, a
`largura` mm uma da outra (ou a `larguras`, uma entre cada par de voltas), e `relevo`
desloca cada volta pela normal, em mm (positivo no sentido da normal das faces; a volta
1 de recuo 0 não tem relevo, porque o relevo dela se faz movendo as colunas e estações
da borda). Os pontos se chamam `<anel>_a<volta>_<ponto da borda do vão>`, com
`_arco<j>` nos pontos do arco de cada canto, e a gaiola devolve `aneis[nome]` com os
nomes de cada volta. Vincos, cantos e medidas os citam por nome:

```js
// o vão maior que a abertura, com um recuo para cada lado: 60 mm embaixo, 80 mm em cima, 70 mm nas pontas
const g = gaiolaPorEstacoes({
  eixo: 'z', virar: true, estacoes,
  vaos: [{ nome: 'gota', estacoes: ['e4', 'e13'], colunas: ['baixo', 'cima'] }],
  aneis: [{
    nome: 'g', vao: 'gota', recuo: { baixo: 60, cima: 80, e4: 70, e13: 70 }, voltas: 3, largura: 10,
    raio: 50, raios: { e13_baixo: 0, e13_cima: 0 }, relevo: [0, 10, 0],   // cantos de 50 mm, a ponta viva
  }],
  vincos: [{ nome: 'molduraDeDentro', anel: 'g', volta: 1, nitidez: 'viva' }, { nome: 'molduraDeFora', anel: 'g', volta: 3, nitidez: 'viva' }],
  medidas: [...estacoes.map(({ nome }) => ({ estacao: nome })), { anel: 'g', volta: 2, peso: 100 }, { anel: 'g', volta: 3, peso: 5 }],
});
// a abertura é a própria borda do vão: recuo 0, e as voltas crescem para fora, sobre a grade
const h = gaiolaPorEstacoes({
  eixo: 'z', virar: true, estacoes, vaos: [{ nome: 'gota', estacoes: ['e5', 'e14'], colunas: ['baixo', 'cima'] }],
  aneis: [{ nome: 'g', vao: 'gota', recuo: 0, voltas: 3, largura: 10, relevo: [0, 10, 0] }],
  vincos: [{ nome: 'molduraDeDentro', anel: 'g', volta: 1, nitidez: 'viva' }, { nome: 'molduraDeFora', anel: 'g', volta: 3, nitidez: 'viva' }],
  medidas: [...estacoes.map(({ nome }) => ({ estacao: nome })), { anel: 'g', volta: 2, peso: 100 }],
});
// g.bordaDoVao('gota') passa a ser a volta 1, a linha da aba do friso; g.aneis.g.voltas[0] lista os pontos dela
```

Entre a última volta e a grade o anel acrescenta sozinho laços de transição
(`<anel>_c<j>_…`), cada um até duas vezes mais largo que o anterior, até a aresta da
grade: a face de 10 mm ao lado de uma de 100 mm dobra a superfície quando a
subdivisão leva os vértices ao limite (na chapa de prova da fatia 1, com uma só faixa
de 120 mm ao lado da volta de 10 mm, 137 faces viradas em nível 2 e 614 em nível 3,
mesmo com os pontos do anel de peso 5; com a transição, nenhuma), e o dobro de uma faixa
à seguinte é o que ela aguenta. A transição acompanha a grade de cada lado da borda: a
última faixa tem de 0,4 a 2,5 vezes a aresta que sai dali, e o mesmo número de laços
serve a todos os lados, cada lado com a sua razão de alargamento. A gota de uma janela
afina até uns 10 mm numa ponta, e a grade em volta dela mede de 45 a 60 mm; com recuo por lado
cada lado pede o seu, e uma grade que varia até 5% em volta do vão é tratada como uniforme,
pela mediana. Quando nenhum número de laços serve a todos os
lados, a transição cai também na mediana antes de gritar. O recuo ou a faixa de faces
precisa deixar o espaço que a transição pede, de 0,6 a 0,8 vezes a aresta da grade além da
última volta para voltas de 6 a 10 mm, e quando não deixa o anel grita com o lado (a coluna
ou a estação e as estações ou colunas entre as quais ele fica), o que sobra entre a última volta e a grade,
o que a transição pede e o que mudar, nos nomes do modelador: o recuo daquele lado, ou a
coluna ou a estação a acrescentar entre dois nomes, com a aresta que a grade precisa ter
ali. Com `recuo: 20, voltas: 2, largura: 6` num vão afilado a resposta é:

```text
o anel 'g': com o recuo de 20 mm da borda do vão 'gota', a transição das voltas até a grade
não fecha: ao longo da estação 'e4', entre as colunas 'm1' e 'cima' (e mais 1 trecho desse
lado) sobram 14.0 mm entre a última volta (a 6.0 mm da abertura) e a borda do vão (recuo de
20.0 mm), e as arestas da grade ali medem 60.5 mm; a transição pede 48.9 mm ou mais; aumente
o recuo desse lado para pelo menos 54.9 mm, ou acrescente uma estação entre 'e4' e 'e3', nas
colunas 'm1' e 'cima': a aresta da grade precisa medir 30.0 mm ou menos ali, e mede 60.5 mm;
ao longo da coluna 'cima', entre as estações 'e4' e 'e5' (e mais 8 trechos desse lado) ...
```

Com `raio`, os cantos da abertura saem arredondados (só com recuo); `raios` troca o raio
de um canto pelo nome do ponto da borda do vão, e zero o deixa vivo, como a ponta de uma
gota. As voltas se afastam da abertura como curvas paralelas, de modo que o raio do canto
cresce com o afastamento (raio mais afastamento), e o arco de cada canto tem no máximo
`segmentos` segmentos por quarto de volta (par, padrão 4), com os pontos sobre o arco; o
canto de mais de 90 graus fica com os mesmos segmentos do de 90, porque mais que isso põe
mais de um deslocamento no mesmo ponto da borda e a valência sobe a 6 ou mais. O raio do canto mais o recuo da esquina precisam caber entre a esquina e o
primeiro ponto do lado, e o anel grita com os dois pontos e com o raio que cabe, achado
refazendo o anel: com pontos a 100 mm, um canto de 52 mm cabe num vão de 900 mm de lado e o
de 53 mm não. Com recuo 0 os cantos das voltas saem em esquadria, o ponto do canto a
distância ÷ cos(meia virada) da quina e sem vértice extraordinário nas voltas, porque o
arco de uma volta de 10 mm em volta de uma quina viva faz faces de 10 mm junto de faces de
50 mm e deixou a superfície com faces viradas na moldura em relevo; `arredondar: true` os
contorna com arco de raio igual à distância (`segmentos` vale 2 por padrão aí) e segue a
borda a menos de 0,5 mm também no canto, para a moldura lisa.

O vão que se abre na borda da chapa, como o recorte de uma roda, dá um anel aberto: com
recuo as voltas começam e acabam sobre a borda livre, no prolongamento dela pela parábola
que passa pela ponta da borda do vão e pelos dois pontos livres de antes, e com recuo 0 elas
saem da ponta da borda do vão pela borda livre da grade, para fora do vão. No vão que se abre
no plano de simetria, as pontas dos laços ficam exatamente sobre o plano. O vão de uma janela
que as colunas que terminam e começam deixam não tira face, porque a chapa só tem as colunas
do lado: a janela de trás de uma carroceria na metade com `simetria: 'x'`, em que as colunas
do meio terminam numa estação (`termina: true`) e recomeçam em outra (`comeca: true`). Declare
esse vão com `livre: true`, da estação em que elas terminam à em que recomeçam e da primeira
coluna delas à primeira que a chapa conserva entre as duas estações; a primeira coluna pode
faltar nas estações do meio, e a borda do vão, `bordaDoVao`, é a borda livre entre os
pontos dele, que o anel de recuo 0 aceita como qualquer outro vão aberto:

```js
// as colunas c0 a c4 terminam na estação e6 e começam na e12 (termina/comeca nas colunas dessas estações)
vaos: [{ nome: 'vidro', estacoes: ['e6', 'e12'], colunas: ['c0', 'c5'], livre: true }],
aneis: [{ nome: 'v', vao: 'vidro', recuo: 0, voltas: 3, largura: 10 }],
```

Sem `livre: true` o vão grita que não tira nenhuma face e lembra dessa declaração.

As distâncias do anel são medidas sobre a chapa, e as alturas saem de um ajuste
polinomial aos pontos da borda e da fileira da grade em volta dela (com recuo 0, aos da
faixa trocada e da fileira de fora), de modo que os pontos do anel ficam sobre a chapa que
a grade desenha. A costura liga o laço de fora à borda do vão (ou, com recuo 0, à borda de
fora da faixa de faces) por uma faixa só de quadriláteros; o arco de cada canto tem mais
pontos que o canto da borda, e a faixa acrescenta esses pontos com faces de três pontos de
um laço e um do outro. Os vértices extraordinários que isso deixa a gaiola devolve
declarados em `aneis[nome].extraordinarios` com a valência, e o resto da malha é de
quadriláteros regulares. Toda face do anel segue o sentido das faces da grade, e a que
sai ao contrário, um laço que se cruza num canto de lados muito diferentes, faz o anel
gritar com os pontos. Na chapa de prova da fatia 1 (`procedural/nucleo/fixtures/gaiola-aneis-prova.js`, raios de 2 e
3 m, um vão de 900 × 1000 mm com cantos de 50 mm e um recorte de 300 × 800 mm na borda), os
pontos do anel ficam a 0,009 mm da chapa, os lados das voltas a 0,03 mm do gabarito da
janela e a 0,11 mm do do recorte, o raio dos arcos a 0,12 mm do pedido (medido pelo círculo
por três pontos do arco), e as pontas do anel aberto exatamente sobre a borda livre. Na
chapa da gota (`procedural/nucleo/fixtures/gaiola-gota-prova.js`, raios de 1800 e 2500 mm, uma gota de 450 mm que tem 230 mm de
altura na estação larga e 10 mm na ponta, numa grade que a acompanha com arestas de 38 a 67 mm
em 500 × 975 mm), o anel de recuo 0 troca duas camadas de faces e sai com 241 pontos e 202
quadriláteros, as voltas a 10,000 e 20,000 mm da borda nos lados e os cantos em esquadria. O anel
de recuo por lado, na mesma gota com o vão 60 mm, 80 mm e 70 mm maior que a abertura em 588 × 1050 mm,
põe a abertura a 60,0 mm da borda do vão embaixo, a 80,0 mm em cima e a 70,0 mm nas pontas (a
menos de 0,05 mm), com as voltas a 10 e 20 mm dela, o canto de 50 mm com o raio pedido mais a
distância e a ponta viva; sai com 223 pontos, 187 quadriláteros e dez vértices extraordinários
declarados (valência 3, 5 e 6). A metade de chapa
com o vão de colunas que terminam e começam (`procedural/nucleo/fixtures/gaiola-borda-livre-prova.js`, 17 estações e 16
colunas a 50 mm) sai com 294 pontos, as pontas das voltas exatamente no plano de simetria.
Nas três chapas `npm run ondulacao` não acusa falha fora de `junto`, nem face virada, com a
moldura lisa e com a moldura em relevo de 10 mm, e o maior desvio da superfície à versão suavizada fica em 0,83 mm.

Meça os pontos do anel com peso, e não com cota exata: a cota exata põe 56 faces viradas
na superfície em nível 2 junto dos cantos da chapa da fatia 1, e a de peso 5 deixa a chapa
sem nenhuma e sem falha de `npm run ondulacao` fora de `junto`. Numa moldura em relevo só a
volta deslocada leva peso grande (50 a 100), porque ela é a que precisa chegar à altura
pedida, e cada vão pede a sua medida das outras voltas: a gota de recuo 0 e a janela da
fatia 1 saem lisas só com a volta deslocada, e a gota de recuo por lado, de grade grossa
junto do canto de 50 mm, precisa do peso 5 na volta 3 para o calombo de uma face de 110 mm
ficar abaixo de 0,3 mm. Com a moldura de 10 mm em relevo (volta 2 deslocada, voltas 1 e 3
vincadas vivas), a gaiola declarada tem o diedro de 44,0 a 44,5 graus que 10 mm de relevo em
10 mm de largura pedem sobre a chapa curva, e a superfície chega a 9,8 a 9,96 mm de altura
na crista. O diedro no vinco da superfície limite sai a 48,4 graus (3,4 graus mais aberto)
na gota de recuo 0, com o peso 100 só na volta deslocada, e a 53,8 graus na de recuo por lado,
com o peso 5 também na volta 3: a superfície passa pela crista, e o flanco sobe mais
depressa que a corda da gaiola declarada. Na chapa da fatia 1 o diedro limite é 49,4 graus
com a crista a 9,9 mm; com a cota exata na volta deslocada a crista chega a 10,0 mm e o
diedro sobe a 56,8 graus, e sem cota nos anéis da janela a crista fica em 6,2 mm e o diedro
em 44,4 graus: o peso escolhe onde parar entre os dois.

Sem `espessura`, a superfície sai aberta se a gaiola for aberta, e o
`conferir-malha` acusa casca aberta. Com `espessura: 0.002` (número ou nome de
`PARAMS`), a superfície subdividida vira a face externa de um sólido fechado:
cada vértice anda a espessura contra a normal das faces até a face interna, a
parede fecha cada borda livre e cada vão, e as medidas continuam na face
externa. `lado: 'normal'` põe o material a favor da normal, para a gaiola
declarada com a normal para dentro; a superfície declarada é sempre a externa.
Na dobra viva e no canto o deslocamento vai à esquadria, e a face interna fica
a uma espessura de cada face externa. Na forma de prova da gaiola por estações,
com 2 mm de chapa em nível 2, o sólido sai sem casca aberta, sem cruzamento,
com a face interna entre 0,994 e 1,0004 espessura da externa e volume 0,13%
abaixo da área vezes a espessura. A espessura que passa do raio de curvatura
local do lado do material grita com os pontos nomeados da gaiola mais perto,
porque ali a face interna se dobraria sobre si; no vinco vivo esse raio é a
largura da faixa de faces ao lado dele dividida pela tangente do meio ângulo
da dobra, e cai pela metade a cada nível (na forma de prova, 6,1 cm no nível 1,
3 cm no 2 e 1,5 cm no 3). Partes distantes da chapa a menos de uma espessura
uma da outra não são conferidas. `origem` publica as faces sem sub-endereço
por posição, porque a ordem de saída não é identidade; com espessura,
`parte: 'externa'`, `'interna'` ou `'borda'` cita cada grupo, como na casca.
A superfície não aceita booleana nem `filete` sobre ela.

Para achar onde a superfície ondula, rode `npm run ondulacao -- <peça>`, e não
leia listras de reflexo: a ferramenta executa a receita como as outras, lê a
superfície externa de cada passo `subdivisao` e devolve em JSON cada falha com
`posicaoMm`, `amplitudeMm` (o desvio pela normal a uma versão suavizada local,
um ajuste cúbico robusto a até três espaçamentos da gaiola), `extensaoMm`,
`tipo` (`ondulacao` quando o desvio troca de sinal, `calombo` para fora ou para
dentro, `emenda` quando a normal salta fora de um vinco, `faceVirada` quando a
normal de uma face se inverte em relação à da vizinha) e `pontos`, os dois a
quatro pontos nomeados da gaiola que mais pesam na falha, em ordem, pelos pesos
que a própria subdivisão dá a cada ponto na malha entregue, cada um com `desvioMm`,
o desvio com sinal do vértice dele (positivo, para fora da versão suavizada), e a
falha traz `extensaoEmEspacamentos`. Até uns dois espaçamentos, mova cada ponto
nomeado 1,5 vez o desvio contra o sinal dele e rode de novo, e repita até a
falha sumir: uma rodada tira quase tudo, e acima de três a versão suavizada
acompanha o ponto que se moveu, uma rodada tira cerca de um quarto e a falha
reaparece nos vizinhos (numa ondulação de seis pontos de 1,7 mm desenhada por
código, cinco rodadas). O ponto nomeado pode não ser entrada da `TABELA`: o de
estação gerada pela interpolação (`estacao_k_coluna`) não se cita, e quem o
define são as duas estações-chave vizinhas na mesma coluna, que andam juntas, e
o de coluna que sai de curva de seção sai dos pontos-chave da curva, que são o
que se move. O deslocamento que as rodadas pedem é da forma lida, e a comparação
de cortes confere depois que ele ficou dentro do erro de leitura. Declarar como
vinco uma dobra que a linha de feição lida não confirma tira a falha de
`falhas` e deixa o desvio colado ao vinco em `junto`, sem corrigir nada. A
falha a menos de um espaçamento de um vinco,
de uma borda ou de um canto declarados sai em `junto`, e não em `falhas`, porque
ali o desvio é da feição pedida; um vinco que a forma tem e o passo não declara
sai como falha. A `faceVirada` é a aresta fora dos vincos e das bordas em que as
normais das duas faces passam de 90 graus (`--virada-graus=`), a superfície dobrada
sobre si que o desvio e a emenda não pegam; ela é falha mesmo junto de uma feição, e
traz `faces`, `facesViradas` (a mancha cuja normal fica contra a da face da gaiola
declarada de que descende), `arestas` e `anguloGraus`, e a superfície traz
`facesViradas`, a soma: a cota exata nos pontos do anel dá 58, perto das 56 da área
projetada. O limiar padrão é 0,3 mm (`--limiar-mm=`): numa chapa desenhada
por código com todos os pontos medidos, a forma lisa fica abaixo de 0,23 mm e a
ondulação de 1 mm plantada entre dois pontos vizinhos sai com 0,88 mm e esses
dois pontos à frente. Com `medidas`, os pontos citados são os da gaiola
ajustada, e mexer no ponto declarado move o ajustado. A função
`ondulacaoDaReceita`, de `tools/mecanifica/ondulacao-da-superficie.mjs`, faz o
mesmo num teste. Uma feição desenhada mais estreita que três espaçamentos da
gaiola sai acusada mesmo com a superfície sobre a forma; alargue a feição ou
adense as colunas ao redor dela. Na carenagem de prova, colunas a 175 mm longe do
vinco, fundidas em triângulos perto dele, deixaram a superfície 0,35 mm fora da
forma, e com colunas a 87,5 mm a leitura não acha nada. A zebra continua para a
pessoa e o crítico conferirem.

Para a falha de mais de três espaçamentos, rode `npm run alisar --
<receita.js>` (`tools/mecanifica/alisar-a-superficie.mjs`) em vez de rodadas de
ponto a ponto: o fluxo é rodar a ondulação, alisar, aplicar e conferir. A
ferramenta resolve de uma vez, por mínimos quadrados com regularização, o
deslocamento dos números da `TABELA` que movem uma coluna escrita numa
estação-chave ou um ponto-chave de curva de seção (os únicos valores
editáveis; o ponto de estação gerada e o de coluna de curva saem deles), de
modo que os desvios da superfície caiam sem afastá-la dos pontos medidos mais
que o erro de leitura. Os pontos medidos são as `medidas` da receita, na
posição declarada antes da edição, e, com `--cortes=<cortes lidos.json>` (a
saída de `ler-corte.py`), os pontos do traço de cada corte, cada um com o
`erro_mm` do corte dele; `--tolerancia-mm=` fixa um erro de leitura para todos
(padrão: a mediana dos `erro_mm` dos cortes, ou 2 mm sem cortes). Nenhum
número anda mais que o dobro da tolerância, e o ponto da superfície amarrado a
uma medida não anda mais que ela. A saída em JSON traz `edicoes` (por nome:
`tabela`, `indice`, `antigo`, `novo`, `deslocamentoMm` e as `entradas` da
gaiola que o número move), `antes` e `depois` com as falhas da receita rodada
com as edições, `medidas` e `cortes` com o quanto cada ponto medido estava
longe e ficou, `modelo` (a diferença entre o desvio previsto e o medido) e
`alisavel`. Aplique as edições à `TABELA`, ou grave uma cópia com
`--gravar=<cópia.js>` (os números precisam estar escritos no texto da
receita), e rode `npm run ondulacao` de novo. `--rodadas=2` lineariza de novo
em torno do primeiro resultado, para edições de vários milímetros. Receita fora
do repositório pede `--raiz=<pasta>`. Quando `alisavel` é falso, as falhas que
sobram saem em `sobram`, cada uma com as medidas que estão no limite da
tolerância ao redor dela (`impedem`), e é o caso em que a forma pede vinco ou
estação nova: as edições que saem são a melhor tentativa dentro da tolerância.
A gaiola dá a base: `gaiolaPorEstacoes` devolve `origens` (de cada ponto, a
entrada declarada, a coluna de curva de seção com a curva, a fração e os
pontos-chave, ou a estação gerada com as chaves, a fração e os nós),
`entradas` (as coordenadas editáveis, como `z800/quarto[2].v`) e `estrutura`
(o que não é entrada), e a ondulação traz `origem` em cada ponto que cita.
Numa chapa desenhada por código, com erro de leitura de até 1,5 mm plantado nos
pontos-chave, o alisamento tira as nove falhas (de até 0,74 mm, quatro delas de
mais de três espaçamentos) editando números de no máximo 1,4 mm, com as
medidas a até 1,66 mm; com uma quina real de 15 graus sem vinco, a falha
cai de 0,59 a 0,48 mm e sai `alisavel: false`. A entrega de carroceria não
deixa falha de ondulação que o alisamento consiga tirar dentro do erro de
leitura dos cortes.

Quando os vincos vêm das linhas 3D de um pacote (`ler-linhas --3d`, que confere
cada linha contra os cortes do pacote e põe a que atravessa um corte longe do
contorno dele em `recusadas_pelos_cortes`, fora de `polilinhas_3d`), rode
`npm run vincos-das-linhas -- <peça> --linhas=<linhas.json>` e declare o que
ela sugere, em vez de escolher a coluna a olho. A ferramenta separa as colunas
e as estações pelos nomes `estacao_coluna` da `gaiolaPorEstacoes` (sem esse
formato, usa os laços de arestas), avalia cada uma na superfície limite e, para
cada linha, espelhada para x ≥ 0 na simetria, dá a coluna ou a estação que a
acompanha a até 5 mm na mesma direção, a distância média e máxima e a
declaração em `vincos` (`{ nome, pontos, nitidez }`, para o passo) e em
`vincosNaGaiola` (`{ nome, coluna, de, ate, nitidez }`, para o ajudante). A
nitidez é `'viva'`, ou, com `angulo_graus` na linha, a menor de 0,5 a 0,9 que
dobra a malha a 90% do ângulo lido. `cantos` pede canto no ponto onde a linha
dobra e o vinco liso passa a mais de 2 mm dela; `faltantes` dá, para o trecho
que nenhuma coluna acompanha, entre que colunas pôr a nova, a que fração e o
ponto da linha em cada estação; `comVincos` diz se o passo aceita tudo, e cada
vinco traz a distância à linha e o diedro na malha refeita. Numa forma
desenhada por código com linhas de ruído de ±1 mm, os vincos sugeridos ficaram
a até 1,95 mm das linhas e o friso entre duas colunas saiu a 0,406 do caminho,
com 0,4 desenhado. Só cita nomes que a receita declara. Com `interpolar`, a
estação gerada (`${chave}_${k}`) não é citável: o vinco de coluna vai de
estação-chave a estação-chave, e a coluna que passa por estação gerada sai sem
`pontos`, com `semPontosNoPasso`, e vale `vincosNaGaiola`; o que começa, acaba
ou dobra numa estação gerada sai com `deEntreChaves` e `ateEntreChaves` ou em
`cantosSemChave`, entre que chaves e a que fração, e a linha ao longo de uma
estação gerada sai em `faltantes` como estação-chave nova entre as duas chaves.
A aresta de uma face só, na borda da peça ou na de um vão, é borda e a chapa
termina ali: o trecho sai como `borda` (em `bordas`, com `emBorda` quando só
parte dele é borda) e nenhum vinco se sugere nela. A função `vincosDasLinhas`,
do mesmo arquivo, faz o mesmo num teste.

## Friso ao longo de curva: `friso`

`friso` desenha nervura, tubo ou friso de perfil declarado seguindo uma linha
nomeada, ou a aba que dobra a borda de um vão (opção `aba`, mais adiante). Sobre a chapa, a linha é a sequência dos nomes de ponto da gaiola de um
passo `subdivisao` anterior, citado por `superficie: { op: 'subdivisao', id }`,
ao longo das arestas da gaiola, como no vinco, e repetir o primeiro nome no fim
fecha a volta:

```js
['friso', { origemId: 20, superficie: { op: 'subdivisao', id: 1 },
  linha: { nome: 'molduraDoVao', pontos: ['b2_2', 'b3_2', 'b4_2', 'b4_3', 'b4_4', 'b3_4', 'b2_4', 'b2_3', 'b2_2'] },
  perfil: { circulo: { raio: 'moldura_raio', centro: [0, 'moldura_altura'] } } }],
['parte', { nome: 'moldura', sel: { origem: { op: 'friso', id: 20 } } }],
```

Cada ponto da linha é o vértice que o passo da superfície entregou sobre essas
arestas, e com `medidas` esse vértice está na superfície limite; a normal é a da
face de fora da chapa, e o friso acompanha a chapa mesmo depois de uma pose ou
`transladar` dela. O perfil é `[u, v]` em metro, com `v` pela normal e `v = 0`
na linha, e `u` para a esquerda de quem segue a linha com a normal para cima:
lista de pontos, `{retangulo}`, `{circulo}` ou `{contorno}`, como no perfil da
extrusão. A parte de `v` negativo entra na chapa: com espessura, o perfil que não
desce abaixo de `v = 0` grita, porque só encostaria numa linha, e o que entra
mais que a espessura grita, porque atravessaria a face de dentro. Entre em
torno de metade da espessura, e mais que a folga da base reta do perfil na chapa
que curva de lado, cerca de curvatura × (largura/2)² / 2, que o passo não confere.
`ponta: 'aberta'` (o padrão) tampa o perfil plano; `'fechada'` encolhe o perfil
em quarto de elipse até um ponto da linha ao longo de `fechamento` (o padrão é a
largura do perfil); `[inicio, fim]` escolhe cada ponta, e a volta não tem ponta.
Sem `superficie`, a linha é uma polilinha de pontos nomeados de `PARAMS` ou
`[x,y,z]`, com `normal` declarada.

O friso é um sólido próprio que entra na chapa, e não uma fusão: a booleana sobre
a superfície subdividida ficou de fora do plano que criou a operação, e o friso
precisaria da chapa inteira como sólido de entrada. Nomeie a chapa e o friso com
`parte` e declare o contato em `contatos` da receita, com o motivo; o
`contatosDaPeca` mede o par como `interpenetram`, e esquecer a declaração
reprova. Em cada junta o perfil fica no plano bissetor e se estica pela
esquadria, de modo que uma volta de cantos de 90 graus sai sem fresta; a curva
fechada demais para a largura do perfil grita com o ponto da gaiola mais perto.
A linha que muda de direção numa aresta da gaiola faz canto mesmo na chapa lisa,
porque cada aresta da gaiola vira uma curva da superfície que chega ao ponto na
direção da aresta. Cada trecho é corda da chapa, e com `medidas` a corda fica a
cerca de passo² / (8 × raio) da superfície limite: na chapa de prova do teste,
com raios de 600 e 900 mm e nível 2, o tubo, a nervura e o friso de ponta
fechada ficam a no máximo 0,15 mm da linha limite. Na simetria em `x` da
superfície, a linha que toca o plano `x = 0` numa ponta continua na imagem
espelhada, a que toca nas duas vira volta, e a que não toca ganha a cópia
espelhada. `origem` publica as faces, `parte: 'lateral'` a superfície varrida e
`parte: 'pontas'` as tampas das pontas abertas.

### Aba que dobra a borda de um vão: `aba`

Uma chapa pode dobrar para dentro na borda de um vão, em poucos milímetros de raio, e formar uma aba; um corte que atravessa a borda mostra se há aba, o ângulo, o raio e a largura. O `friso` com perfil desenhado à mão não faz essa aba: o passo recusa o perfil que não sobe acima da linha (`o perfil fica todo abaixo da linha`) e, se ele sobe um pouco, o que desce mais que a espessura (`ele atravessaria a face de dentro`), de modo que uma perna de 20 mm não passa. A opção `aba` toma o lugar de `perfil` e desenha o perfil em L sozinha:

```js
const g = gaiolaPorEstacoes({ /* ... */ vaos: [{ nome: 'janela', estacoes: ['e3', 'e5'], colunas: ['c3', 'c5'] }] });
['subdivisao', { origemId: 1, ...g.passo, borda: 'cantos', espessura: 'chapa_espessura' }],
['friso', { origemId: 2, superficie: { op: 'subdivisao', id: 1 },
  linha: { nome: 'abaDaJanela', pontos: g.bordaDoVao('janela') },
  aba: { largura: 'aba_largura', angulo: 90, raio: 'aba_raio' } }],
['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
['parte', { nome: 'aba', sel: { origem: { op: 'friso', id: 2 } } }],
```

`aba: { largura, angulo, raio }` tem os três campos obrigatórios, para a medida da aba ficar escrita na receita. `largura` e `raio` são metros (a `TABELA` os declara em milímetro e `derivar()` converte) e `angulo` são graus, número ou nome de `PARAMS` que `derivar()` deixa em graus. Com `espessura` no passo da superfície, o perfil sai dela: a face de fora da chapa chega à linha, dobra para dentro (contra a normal) num arco de raio `raio` na face de dentro e `raio + espessura` na de fora, que gira `angulo` graus, e a perna reta de comprimento `largura` segue na direção em que o arco acabou. Com `angulo: 90` a perna fica paralela à normal da chapa na linha, a ponta livre a `raio + espessura + largura` abaixo da face de fora. A dobra começa na linha e se estende `raio + espessura` para o lado do vão, de modo que a linha da gaiola fica onde a chapa plana acaba, e não na ponta da aba; um vão de 200 mm com aba de raio 2 mm e chapa de 2 mm fica 8 mm mais estreito na boca da dobra. O `angulo` vai de zero a menos de 180 graus, e a aba que passa por baixo da chapa (ângulo grande com perna longa) grita com a distância, assim como a que atravessa a própria dobra.

A linha é a borda livre de um vão ou do contorno, pelos nomes de ponto da gaiola e em qualquer sentido: o passo acha de que lado fica a chapa pelo sentido em que a face percorre cada aresta, e grita com o ponto quando um trecho tem duas faces (`este trecho da linha não é borda livre da chapa`) ou muda de lado. `gaiolaPorEstacoes` devolve `bordaDoVao(nome)`, a sequência de pontos da borda do vão pelo nome que o vão tem em `vaos`, com o primeiro repetido no fim quando a borda é uma volta e sem repetir quando o vão abre na borda da chapa; a ordem é a da face que ficou (a chapa à esquerda, vista de fora) e `virar` a inverte. Na simetria em `x`, a borda de um vão que cruza o plano `x = 0` vira uma volta só e fica simétrica, como em qualquer friso. As quinas vivas de 90 graus do vão saem com a esquadria do varrimento, e a ponta aberta da borda do contorno ganha tampas de quadriláteros.

As faces da aba saem lisas a 30 graus, como as da superfície: as arestas vivas (a ponta livre, a parede de espessura, o canto da perna) dividem a normal por inteiro e o arco de 22,5 graus por segmento (`segmentosArco` por quarto de volta, padrão 4) não divide; só nas quinas vivas de 90 graus do vão a sombra do arco se divide até 13 graus, porque as faces de lados opostos da esquadria ficam a 31 graus umas das outras, perto do limiar. A aba é um sólido próprio que nasce na parede da borda da chapa, sem fusão: nomeie as duas com `parte` e declare o contato em `contatos`, que `contatosDaPeca` mede como `interpenetram` porque a costura difere da parede por até 0,07 mm. Na chapa de prova (`procedural/nucleo/fixtures/aba-prova.js`, raios de 600 e 900 mm, nível 2, aba de 20 mm a 90 graus com raio de 2 mm e chapa de 2 mm) a aba acompanha a borda do vão a no máximo 0,17 mm da linha limite, a dobra tem o raio e o ângulo declarados (erro de 0,0007 mm no raio e 0,01 grau, a raiz a até 0,4 grau da normal da chapa), os 32 vértices de fora da costura coincidem com os da chapa e os de dentro ficam a até 0,07 mm, e cada parte fecha sem achado no `conferir-malha`. A aba não confere colisão com outras partes nem com a aba de um vão vizinho.

Sem `espessura` no passo da superfície a chapa é só a pele (é o que o pacote cego entrega), e a mesma declaração `aba: { largura, angulo, raio }` faz a aba em PELE: uma superfície aberta, de quadriláteros, sem tampas e sem espessura própria. A pele continua a borda do vão com as faces orientadas como as da chapa (a normal da aba sai da linha igual à da chapa e gira com a dobra), dobra para dentro num arco de raio `raio` e `angulo` graus, e segue em perna reta de `largura`. O `raio` é então o da própria pele, e não o da face de dentro: para a pele coincidir com a face de fora de uma chapa de espessura `t` e raio interno `r`, declare `raio` igual a `r + t`. A aba não ganha espessura declarada à parte, porque a pele que o pacote entrega não a tem; a receita que quer a aba sólida declara a espessura na chapa, e o caso com espessura sai como antes. Os mesmos gritos valem (`raio`, `largura` e `angulo` inválidos, aba que passa por baixo da chapa, trecho que não é borda livre), e a pele não faz parte de um sólido: não declare contato de volume com a chapa, e confira a continuidade pela borda em comum, cujos vértices da primeira fileira coincidem com os da borda da chapa e cujas arestas são percorridas em sentido oposto. Na chapa de prova sem espessura, a aba de 20 mm a 90 graus com raio de 2 mm acompanha a borda do vão a no máximo 0,17 mm da linha limite, o raio sai com erro de 0,0001 mm e o ângulo de 0,01 grau, a perna tem 20,00 mm, os 32 vértices da primeira fileira coincidem com os da borda da chapa (32 arestas de costura, todas em sentido oposto), nenhuma aresta é percorrida duas vezes no mesmo sentido, o diedro entre faces vizinhas fica em 22,5 graus fora das quatro quinas de 90 graus do vão e em 90,3 graus nelas, e duas execuções dão a mesma malha. A prova está em `procedural/nucleo/friso-aba-pele.test.mjs`.

## Detalhes de seleção, aliases e proveniência

**Nenhuma op de edição exige ID LITERAL: `sel` ocupa o lugar do id em todas.**
`moveV`, `moveF`, `moveA`, `vira`, `mescla`, `pesar` e `filete` aceitam `sel`,
como `extruda`, `apagaFace` e `arredondarAresta` já aceitavam, e cada uma cobra
a cardinalidade que a forma por id já tinha:

| op | `sel` precisa resolver para | exemplo |
|---|---|---|
| `moveV` | exatamente um vértice | `['moveV', { sel: { regiao: { min: [0.4, 0.9, 0.4], max: [0.6, 1.1, 0.6] } }, d: [0, 0.1, 0] }]` |
| `moveF` | exatamente uma face | `['moveF', { sel: { origem: CAIXA, onde: { extremo: { eixo: 'y', lado: 'max' } } }, d: [0, 0.1, 0] }]` |
| `moveA` | exatamente uma aresta | `['moveA', { sel: { origem: CAIXA, onde: { alvo: 'aresta', extremo: { eixo: 'z', lado: 'max' } } }, d: [0, 0.1, 0] }]` |
| `vira` | uma ou mais faces, cada uma virada por si | `['vira', { sel: { origem: CAIXA, onde: { normal: { dir: [0, 1, 0], ate: 90 } } } }]` |
| `mescla` | `sel`: um ou mais vértices que somem; `selPara`: exatamente o vértice que fica | `['mescla', { sel: CANTO_A, selPara: CANTO_B }]` |
| `pesar` | um ou mais vértices (os cantos de uma face ou aresta entram) | `['pesar', { osso: 'raiz', sel: { origem: CAIXA }, peso: 1 }]` |
| `filete` | exatamente uma aresta | `['filete', { origemId: 9, sel: ARESTA, raio: 0.1 }]` |

Só `onde: { alvo: 'aresta', ... }` produz aresta; as demais chaves de `sel`
resolvem faces e vértices. Vértice sem `id` tem a `regiao` (uma caixa em volta
dele, que aceita expressão nos limites), e a seleção de face ou aresta entrega
os cantos dela às ops de vértice. A seleção que não bate com a cardinalidade
GRITA em `sel` com o que a op pedia e quantos alvos resolveu (`moveV exige
exatamente um vértice em sel, e resolveu 4`) e a malha fica como estava; `id`
junto com `sel` na mesma op grita `face+sel`, `v+sel`, `a+sel`, `de+sel` ou
`para+selPara`, porque duas fontes concorrentes não se unem por acidente. Seleção
vazia grita em `mescla` e `pesar`, que por id aceitavam lista vazia calada. `mescla` com `sel` e `selPara` resolve as duas antes de mudar a malha, e
as duas se misturam com `de` e `para` por id (`sel` com `para`, `de` com
`selPara`). Em `filete` e `arredondarAresta` a face de apoio é a de menor id
entre as duas da aresta, e o painel nasce com o sentido dela: apontar a mesma
aresta pela outra face dá outro canon. O id literal continua aceito, mas é
dívida posicional (`CLAUDE.md`) e é relatada; use `sel` por `origem`, `alias`,
`porta` ou `onde`, que não persistem id algum.

`arredondarAresta` e `filete` arredondam também a borda de uma tampa partida em
faces coplanares, como o topo de uma `extrusao` com furo ou de um contorno por
trechos: as faces planas que se tocam contam como uma só, e a borda do topo ou de
um furo arredonda por `sel.onde`. A tangência escorrega ao longo da aresta
vizinha até o plano da face de ponta, para ela continuar plana numa quina que
não é de 90°, e o raio é conferido contra todos os vértices da tampa antes de
escrever; raio que passa de um vértice ou da espessura é recusado com o vértice e
a distância. Três casos que a tampa partida recusava hoje arredondam. A aresta ao
longo da espessura de uma chapa com furos (o canto da aba) tem na ponta a outra
tampa, triangulada em leque com dezenas de faces em torno do vértice: a vizinha do
lado B recebe os pontos do arco e as demais só levam o vértice à tangência. A peça
de tampa convexa que uma quina quase reta deixa côncava ao se mover (a recusa que
dependia de `segmentosArco`) é partida em peças convexas, que ficam na tampa da
extrusão, e só se recusa o que se atravessa ou se inverte. E a borda livre que
termina numa concordância do contorno, cuja face de ponta é quase paralela à
aresta e não comporta a conta de escorregar (o recuo passaria muito além da
faceta), termina na seção perpendicular: o canto velho fica onde estava, a tampa
ganha o triângulo que o fecha e um degrau plano, em leque a partir do canto, fecha
o fim do arco. O degrau entra na faixa pela origem (`{op:'arredondarAresta',
id}` sem `painel`) e o volume retirado é exatamente a seção do arco vezes o
comprimento da aresta; esse modo só entra quando o comum recusa, e o contorno que
volta sobre a faixa (a faceta seguinte passa da seção perpendicular) continua
recusado. Numa chapa com furos, arredonde as arestas da tampa (laterais e topo)
antes das do canto ao longo da espessura: o remate de uma segunda aresta sobre um
canto cuja tampa é um leque recusa com `é uma tampa partida: o remate do canto
pede uma face só ali`. A prova está em
`procedural/nucleo/operacoes/arredondar-chapa-furada.test.ts`.

O degrau não passa calado. Quando um arredondamento (ou chanfro) termina em
degrau, o resultado da execução traz um aviso em `neutro.avisos` (o canal que já
carregava o raio reduzido por `raioMinimo`, fora da forma canônica) com `ref:
'degrau'`, a aresta (vértices e extremos), a ponta, o ângulo que a face vizinha
faz com ela, o motivo e a sugestão. `npm run descrever` o mostra na seção AVISOS
DO NÚCLEO da descrição e numa linha da saída de erro, e `resultado.avisos` o leva
a quem chama. O degrau reprova no veredito do `descrever` (e, por ele, em
`guarda:acervo`) com a mensagem do aviso, mesmo com a malha fechada; com
`--sem-veredito` ele só aparece. Quem lê o aviso troca a chamada por `cadeia`.

`cadeia` arredonda numa chamada só a aresta escolhida e as que continuam em
tangência a partir dela, até um canto vivo ou até fechar o laço: `cadeia: true`
(ângulo máximo de 30° entre arestas consecutivas) ou `cadeia: { ate: graus }`,
com `ate` entre 0 e 90, o mesmo nome e a mesma unidade de `normal.ate` do
`onde`. A cadeia é uma varredura só: não há tampa nem degrau nas junções, e o
raio pode passar do comprimento das facetas. Serve à borda da tampa de uma
`extrusao` por trechos (reto, arco tangente, concordância), à borda de um furo ou
recorte e ao laço inteiro de um contorno tangente, e exige a tampa plana (o grupo
de faces coplanares) e as paredes perpendiculares a ela. Em cada vértice o anel é
a seção no plano bissetor das duas arestas vizinhas, de modo que o contorno que
sobra na tampa é o original deslocado do raio para dentro com junta em esquadria,
o mesmo que a `CrossSection` dá em `deslocar` com `canto: 'esquadria'`. Os
painéis saem aresta por aresta, na ordem da cadeia, e `{op:'arredondarAresta',
id}` os cita todos. Numa cadeia aberta a ponta termina em canto vivo e o anel
escorrega até a face de ponta, como na aresta simples; arredonde a cadeia antes
das arestas do canto, que a cadeia recusa uma ponta que já encontra um
arredondamento. O passo recusa sem escrever, com a causa, o diedro diferente de
90°, o raio que passa da altura da parede, o raio que passa do raio de curvatura
de um trecho convexo (`o raio não cabe: a faceta … some antes de o arredondamento
terminar`; o arco côncavo de um recorte não limita nada), o canto agudo da ponta
que o raio não comporta, o vértice da tampa mais perto que o raio e a cadeia que
dá a volta e volta ao próprio vértice num canto vivo. A cadeia de uma aresta só
segue o caminho da aresta simples. A prova está em
`procedural/nucleo/operacoes/arredondar-cadeia.test.ts` (a borda livre de cima da
aba do tubo com 3 mm, o laço de um estádio, o aro de um furo oblongo e as pontas
oblíquas, com o desvio de cada vértice ao raio abaixo de 1e-9 e o volume
retirado conferido) e em `aviso-de-degrau.test.ts`.

O canto onde duas ou três arestas arredondadas (ou chanfradas por `filete`)
chegam ao mesmo vértice se fecha em esquadria, e cada aresta continua sendo uma
chamada de `sel.onde` que resolve para uma aresta só, em qualquer ordem. Quando a
ponta da aresta nova já é ponta de uma faixa de painéis feita por outra chamada,
os dois prismas se cruzam pela interseção das retas de vértice: o anel de pontas
da faixa antiga escorrega ao longo do próprio eixo até o encontro e passa a ser
também o da nova, nenhum vértice nasce no canto, todo painel segue plano e sobre
o cilindro do raio pedido, e a face de ponta (a que a faixa antiga margeava) perde
os pontos do anel menos o último. No canto de três, as duas faixas antigas já
dividem o anel, a metade dele perto da aresta nova se parte em duas cópias e o
vértice triplo cai a 45° do arco. A condição é a mesma nas arestas do canto: raio
igual, mesmo número de painéis e arestas a 90°, e número par de painéis onde três
arestas se encontram (um chanfro de `filete`, com um painel, fecha o canto de
duas arestas e recusa o de três). Quando a condição falha, o passo recusa com a
causa (`as retas de vértice … não se cruzam`, `o canto pede o mesmo número de
painéis`, `pede um número par de painéis`) e a malha fica como estava. A prova
está em `procedural/nucleo/operacoes/arredondar-canto.test.ts`: a caixa com as 12
arestas, a chapa com furo com as quatro bordas do topo, as duas ordens de
aplicação dando os mesmos polígonos e o volume retirado conferido.

**`apagaFace` é a que mais importa.** Ela é a única op
que remove face — logo a única forma de abrir um furo, uma porta, um vão — e o
núcleo já lhe deu o ramo semântico: `sel:{...}` resolvido pelos mesmos
campos, exigindo **exatamente uma face**, gritando em ambiguidade e em seleção
vazia. Abrir um vão **não custa id posicional**; escrever `['apagaFace',
{ face: 4003 }]` é dívida escolhida, não imposta. A forma certa, medida numa peça de
exercício hoje removida do acervo, é citar a face pela origem:

```js
// o vão: remove a tampa de fundo da carcaça, POR NOME, sem citar id
['apagaFace', { sel: { origem: { op: 'cubo', id: 1, face: 'fundo' } } }],
```

`vira`, a op irmã que conserta normal invertida, aceita a mesma forma
(`['vira', { sel: { origem: { op: 'cubo', id: 1, face: 'topo' } } }]`), então
corrigir uma normal também não custa id posicional.

**O SENTIDO da rotação — DESTRO nos três eixos.** A fórmula `p' = pivo +
R_eixo(graus)·(p−pivo)` não diz para que LADO, e este é o erro que nenhuma
conferência visual pega: um conjunto espelhado em x parece o conjunto certo (um
freio espelhado parece um freio), e o `descrever` também não denuncia, porque a
caixa de uma peça espelhada continua simétrica e plausível. Regra única, sem
exceção por eixo: **polegar da mão DIREITA no sentido POSITIVO do eixo; os dedos
enrolam para onde `graus` positivo leva os pontos** — o ciclo X→Y→Z→X.

A mão fica concreta porque os nomes de face do `cubo` fixam os eixos:
`direita` = +X, `topo` = +Y, `frente` = +Z (e `esquerda`/`fundo`/`tras` os
negativos). Então: polegar apontando para a `frente` (+Z, para você), dedos
enrolando da `direita` (+X) para o `topo` (+Y) — isso é `rotaciona z 90`.

| eixo | `graus` | leva | para |
|---|---|---|---|
| `x` | `+90` | `+Y` | `+Z` |
| `x` | `-90` | `+Y` | `-Z` |
| `y` | `+90` | `+X` | `-Z` |
| `y` | `-90` | `+X` | `+Z` |
| `z` | `+90` | `+Y` | `-X` |
| `z` | `-90` | `+Y` | `+X` |

Tabela MEDIDA (marca unitária girada pelo núcleo com `pivo:[0,0,0]`), não
deduzida da matriz, e travada por `tools/bancadas/skill-criar-peca.test.ts`: se
o núcleo trocar de convenção, o teste quebra em vez de a peça sair espelhada.

**Caso canônico — primitiva de revolução do eixo Y para o eixo X.** `cilindro`,
`cone` e `lathe` nascem em torno de **Y**; toda peça mecânica de eixo
horizontal (disco de freio, cubo de roda, pistão, polia, virabrequim) mora em
**X**. O passo é `rotaciona z -90` com **pivô explícito na origem** — `-90`
leva `+Y` para `+X`, e `+90` levaria para `-X`, espelhando o conjunto inteiro:

```js
// põe uma primitiva de revolução no eixo X
['rotaciona', { eixo: 'z', graus: -90, pivo: [0, 0, 0], sel: { origem: { op: 'cilindro', id } } }],
```

O `pivo` explícito é obrigatório aqui pelo motivo da linha do `rotaciona` acima:
o default (centroide da seleção) giraria a primitiva em torno de si mesma, e ela
ficaria deitada **no lugar onde já estava** em vez de no eixo do conjunto. Depois
da rotação, o que era `tampa:'fundo'` (y=0) fica no **menor x** e `tampa:'topo'`
no **maior x** — é assim que um disco de freio nomeia `pistaInterna`/`pistaExterna`
por alias, sendo `+X` o lado de FORA do carro.

**Seleção semântica (`sel`, D-129/D-130/D-131):** os campos são `tudo`, `v`, `f`,
`grupo`, `regiao`, `origem`, `porta`, `alias` e `onde` — podem coexistir e se
unem, com a exceção de `onde`, que filtra o que os outros juntaram (chave
desconhecida GRITA nomeando todos). `sel:{tudo:true}` é a
ÚNICA forma explícita de "a peça inteira" — todos os vértices e todas as
faces vivos (Rodada B da Fase 3.5). Só aceita o literal `true`
(`false`/`1`/`'sim'` GRITAM). **Deliberadamente diferente de `sel` ausente,
que continua GRITANDO**: ausência nunca virou "tudo" — um erro de digitação
(`fases:` em vez de `faces:`) não pode pintar a peça inteira em silêncio; só
a palavra `tudo:true` escrita de propósito faz isso. **`tudo` resolve no
momento do PASSO**: geometria criada depois não é atingida, e geometria
inserida antes passa a ser — sem gritar. Se o alcance precisa sobreviver à
reordenação da lista, use `grupo`, `origem` ou `alias` — **nunca id de vértice
ou de face**: id é posicional, e referência posicional persistida é proibida
(`CLAUDE.md`). `pesar` aceita `sel` como as demais, inclusive `tudo:true`.

**QUEM publica `origem`.** Não memorize uma contagem: consulte a marca
`operacoes-com-origem` desta skill, derivada de `OPERACOES_COM_ORIGEM` no
núcleo e travada por teste. Cada gerador tem famílias diferentes; leia a linha
da operação ou o comentário canônico antes de citar e nunca suponha que
`origemId` é o bloco posicional do passo.

No loft **e no lathe** (o `lathe` reusa o MESMO contrato do loft, faixa×lado — é o
TEMPLATE de que o loft generalizou), `sel:{origem:{op:'loft'|'lathe',id,
faixa?,lado?}}` endereça a grade de duas dimensões da origem — **`faixa` e
`lado` são os DOIS opcionais** (D-130, Rodada A da Fase 3.5), ausente =
"todos" nesse eixo: `{faixa}` é o anel/segmento local zero-based;
`{faixa,lado}` é uma face só; `{lado}` sem `faixa` é a **coluna** (uma face
por faixa, no mesmo lado — pula faixa sem lateral, e lado fora do limite em
qualquer faixa GRITA sem selecionar parcial); `{}` é toda a origem (a união
de todas as faixas; se nenhuma render face, GRITA). No lathe, "faixa" é o
SEGMENTO entre dois pontos consecutivos do perfil (a mesma contagem da
guarda `polo↔polo` da op: segmento degenerado não emite face, é pulado na
união e GRITA se endereçado explícito, igual a uma faixa sem lateral no
loft). **Cada eixo também aceita um FILTRO DE PROGRESSÃO `{passo,fase}`**
(D-130, Rodada C da Fase 3.5) — o índice `k` daquele eixo entra se
`k%passo===fase`: `{lado:{passo:2,fase:0}}` são os lados pares de toda faixa,
`{lado:{passo:2,fase:1}}` os ímpares, `{faixa:{passo:3,fase:0}}` cada
terceiro anel. `passo` inteiro `≥1`, `fase` inteiro em `[0,passo)`, **os dois
juntos sempre** (`{passo:2}` sozinho GRITA — não assume `fase:0`); fora disso
GRITA. `{passo:1,fase:0}` é a identidade (todos). É a forma de dizer
"alternado" sem listar `[0,2,4,…]` à mão — nasceu de medir que 18,6% dos ids
de uma peça real eram exatamente essa progressão, escrita pra satisfazer o
`detector-de-banding`. **Só vale aqui**: paridade sobre índice exige
conectividade REGULAR, e os eixos de `sel.origem` são a única grade regular
do vocabulário — não estenda para `sel.f` nem ids globais. Nem loft nem lathe
têm tampa na origem: toda face deles é `faixa`×`lado` (fechar uma ponta é
terminar a seção/o perfil em raio 0, e o polo não vira face endereçável à
parte). **O `cubo` NÃO recebe filtro** — a `face` dele é nominal
(`fundo`/`topo`/`tras`/`direita`/`frente`/`esquerda`), não um eixo numérico. No
cubo, `sel:{origem:{op:'cubo',id,face?}}` — `face` também opcional: ausente =
as 6 faces (pulando as já removidas por `apagaFace`; se nenhuma sobrar, GRITA).

No **cilindro** (Fase 4, D-13x — a lacuna que travava a peça `lanterna` e a
reescrita do `_torno`), `sel:{origem:{op:'cilindro',id,lado?,tampa?}}` usa
DOIS eixos INDEPENDENTES, não a grade faixa×lado do loft/lathe: `lado` é
NUMÉRICO sobre as `L` faces LATERAIS (inteiro | ausente = todas | filtro
`{passo,fase}`, o mesmo `validarEixo`); `tampa` é NOMINAL (`'fundo'` ou
`'topo'`, sem filtro de progressão — é a mesma convenção do `face` do cubo,
duas faces só). Os dois se UNEM: `lado` presente contribui as laterais
resolvidas, `tampa` presente contribui aquela tampa; **nenhum dos dois
presente = TODAS as laterais, sem tampa nenhuma** (a mesma convenção `{}` do
loft/lathe — resolve "só a lateral, não as tampas" sem precisar separar por
`sel.regiao`, que não consegue: os cantos da tampa caem na MESMA caixa que os
da lateral). Tampa removida por `apagaFace` GRITA se endereçada explícita.
Essa proveniência é reconstruída no núcleo, não entra no canônico; `id`
posicional do PASSO não ganha novo significado.

**`origem` SEM eixo já é a primitiva inteira — não escreva a união à mão.**
`sel:{origem:{op:'cubo',id}}` sem `face` são as 6 faces vivas (medido: 6 de 6);
no `loft`/`lathe`, `{}` é a união de todas as faixas. Recurso que existe e as
peças legadas não usavam: uma delas unia as seis faces do cubo à mão por um
helper JS (`facesCubo`) — era dívida herdada, não modelo a copiar.
**O `cilindro` é a exceção que morde:** sem `lado` nem `tampa` são só as
LATERAIS (medido: 8 de 10 faces num cilindro de 8 lados), porque essa é a única
forma de dizer "o bordo, não as tampas" — `sel:{regiao}` não separa as duas (os
cantos da tampa caem na mesma caixa). Cilindro INTEIRO é a união dos três
termos: lateral + `tampa:'fundo'` + `tampa:'topo'`.

**`ALIASES` — dar NOME à seleção, o caminho que dispensa id de face.** A peça
exporta uma lista de pares `[nome, definição]` e qualquer passo cita
`sel:{alias:'nome'}`. É o que torna uma peça inteira escrevível sem um único id
cru: a peça de referência medida tinha **17 aliases e 0 id de vértice/face**. Alias é
NOME DE SELEÇÃO, não `parte` — quem nomeia faces é a op `parte` (e só ela
alimenta `sel:{grupo}`); confundir os dois já produziu peça errada com todos os
gates verdes (D-140, no drone).

```js
export const ALIASES = [
  // 1) DIRETO: uma origem só. Dá nome de DOMÍNIO a uma porta geométrica —
  //    depois do `rotaciona z -90` que põe o disco no eixo da roda, a tampa
  //    `fundo` é a pista de DENTRO, e nada na geometria diz isso.
  ['pistaInterna', { origem: { op: 'cilindro', id: 301, tampa: 'fundo' } }],
  // 2) COMPOSTO: `unir` de origens — o cilindro inteiro (lateral + 2 tampas).
  ['discoPistaInteira', { unir: [
    { origem: { op: 'cilindro', id: 301 } },
    { origem: { op: 'cilindro', id: 301, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id: 301, tampa: 'topo' } },
  ] }],
];
// e nos PASSOS, sem saber que "a pista" é uma tampa de cilindro:
['transladar', { d: ['discoX', 0, 0], sel: { alias: 'discoPistaInteira' } }],
['parte',      { nome: 'disco',       sel: { alias: 'discoInteiro' } }],
['liso',       { sel: { alias: 'discoBordo' } }],
```

As leis, todas conferidas no núcleo:

- **alias NÃO ENCADEIA e só aceita `origem`.** Cada termo é `{origem:{...}}` e
  nada mais: `{alias:'outro'}` dentro de `unir`, chave a mais ou termo vazio é
  recusado com `oficina: alias 'X' inválido: só origem ou unir de origens`
  (e há uma segunda guarda na citação, `aliases não encadeiam e só aceitam
  origem`). Para compor alias de alias, componha em JS na própria peça — um
  helper que devolve a LISTA de termos, como um `cilindroInteiro(id)` que reúne
  corpo e tampas; o formato salvo continua plano.
- **`ALIASES` é validado ANTES do primeiro passo, e por `throw`** (não `grita`):
  lista malformada, nome duplicado (`alias duplicado 'X'`) ou origem inválida
  matam a peça inteira em vez de deixá-la executar pela metade.
- **É resolvido NO MOMENTO DA CITAÇÃO, não no fim da lista.** Um alias que reúne
  duas primitivas, citado antes de a segunda existir, vira ÓRFÃO (`origem
  cilindro:302 inexistente ou ainda não criada`) — custou 6 órfãos numa peça
  já removida do acervo. O autor pensa "o disco" como uma coisa só; o alias só é conjunto depois
  do último passo que o compõe. **Padrão que funciona:** um alias POR PRIMITIVA
  para os passos intermediários (`discoPistaInteira`, `discoChapeuInteiro`) e o
  alias agregado (`discoInteiro`) só no `parte`, quando tudo já existe.
- **Tudo ou nada.** Se QUALQUER termo do `unir` falhar, o núcleo esvazia a
  seleção inteira e a op grita seleção vazia — nunca move/pinta meia peça.
- `sel:{alias}` recebe UM nome (string) e une com os outros campos de `sel`
  como qualquer chave. Exceção única: o modo ESTRUTURAL do `espelha` recusa
  alias (exige `sel:{origem:...}` direto, para a saída ser uma origem completa).

**Os mesmos sete campos valem para toda op que aceita `sel`** — `rotaciona`,
`transladar`, `displace`, `espelha` e os atributos por face (`pincel` no modo
`face`, `liso`, `material`, `solido`, `parte`). O que muda é a LEITURA: em
operação de FACE, `v` significa as faces incidentes e `regiao` significa as
faces segundo `modo` — `sel:{regiao:{min,max,modo?}}` aceita `'contem'`
(DEFAULT: face inteiramente dentro da caixa inclusiva) ou `'toca'` (pelo menos
um canto dentro), e qualquer outro valor GRITA (O-3). Em
`rotaciona`/`transladar`/`displace`, região continua sendo os vértices dentro
da caixa — o eixo de VÉRTICE lê a caixa como "toca" e `modo` **não governa esse
eixo**, então escrever `modo` nessas três ops **GRITA** (fail-closed: a região
não seleciona nada). Não copie o `sel` de um exemplo de `pincel` para um
`transladar` sem tirar o `modo`. Essa assimetria existia calada desde sempre
(vértice por toque, face por contenção); `modo` a tornou dizível na op de face,
e o grito impede que ela volte a ser calada na op de vértice. Para arrastar a
face inteira use `sel:{f}`/`{origem}`/`{alias}`, que levam os cantos junto. `faces:[ids]` é compatibilidade para arquivo salvo; nunca
misture com `sel` (os dois juntos GRITAM). Nome errado, id inválido, chave desconhecida,
região incompleta/invertida ou seleção sem alvo **GRITA** — pare e corrija a
lista, não tente adivinhar. `sel` AUSENTE grita nas ops de face, mas em
`rotaciona`/`transladar`/`displace` significa a malha inteira (herança
histórica, não simetria).

**Animação/esqueleto** (exportados junto, opcionais): `ANIMACOES =
{nome:{duracao,repete,trilhas:[{parte|osso,canal,chaves:[[t,v],...]}]}}` (canais
`rotX/rotY/rotZ/pos...`, interpolação smoothstep) e `ESQUELETO =
{ossos:{b0:{pai,pivo:[x,y,z]},...}}` — a assinatura completa é
`executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS = {}, ANIMACOES = {}, ESQUELETO = null, ALIASES = [])`
(e `colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS = {}, ALIASES = [])`,
`nucleo(PASSOS, PARAMS, TOPO, MATERIAIS = {}, ESQUELETO = null, ALIASES = [])` —
os argumentos posicionais NÃO estão na mesma ordem nas três; confira antes de
copiar). As peças que exercitavam animação, esqueleto e encaminhamento de `ALIASES`
saíram do acervo; o contrato acima continua valendo e é conferido por teste.

**Alcance honesto:** caixa+cilindro+esfera+cone+plano+lathe+loft+extruda+move
cobrem arquitetura, móveis, props angulados, troncos, bolas, chão, perfil
rotacionado (vaso, coluna, peão, pneu — com concordâncias quando a silhueta
pedir) e forma
orgânica OU angular composta ao longo de um caminho (tubo/casco/galho/membro
com seção `{pos,raio}`; viga/perfil-I/haste-de-estrela com seção `{pos,
contorno}` — loft, frame por transporte paralelo, sem torcer numa curva).
`espelha`+`rotaciona` destravam objeto BILATERAL — modele só metade (com a
borda EXATA no plano do espelho pra soldar) e complete com `espelha`; incline
uma parte com `rotaciona`. `inflate` destrava corpo com largura≠altura (torso,
pedra, casco achatado) a partir de dois perfis 2D — mas sai BLOCKY (voxel, não
suave); se o caso pedir superfície lisa e orgânica, `inflate` ainda não serve,
reporte o limite (ou use o caminho JS-puro abaixo). `chamferBox` destrava caixa
"macia" sem virar redonda (baú, caixote, pedestal, bloco de concreto puído —
ainda faces PLANAS, só sem quina viva); `displace` quebra a monotonia de
qualquer malha fechada com relevo orgânico determinístico (pedra, tronco
áspero, terreno) — os dois juntos (chamferBox + displace) dão pedra
lascada/rocha sem precisar de `inflate`. As peças de exercício que demonstravam cada
uma dessas primitivas saíram do acervo. Para ver a operação em uso hoje, a
tabela "Contrato mínimo" da skill aponta a receita atual por FORMA — caixa e
junção, seção que viaja, assimetria num plano, detalhe repetido em torno de um
eixo.

## Limites honestos

`inflate` continua blocky; `filete` ainda é limitado; JS puro não tem replay
canônico. Não declare uma forma coberta sem evidência visual e estrutural.
