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
cada nível. Marque só as cotas que a peça precisa acertar. A gaiola ajustada se move
mais que a cota: para passar pelos oito cantos de um cubo de 2 m, o canto da
gaiola anda até 3 m, e a superfície se desloca no máximo 7% além da correção
no ponto, de modo que entre os pontos ela quase não incha. Um conjunto de medidas que a superfície
limite não separa, como os oito cantos de um cubo liso, grita com os nomes dos
pontos e não gera malha. Também grita o conjunto em que um erro no alvo moveria
a gaiola mais de 100 vezes esse erro, porque aí 1 mm de cota vira 10 cm de
gaiola. A regra é a do OpenSubdiv no modo uniforme e confere,
a 1e-6 m, com a saída congelada do modificador Subdivision Surface do Blender
em `procedural/nucleo/fixtures/subdivisao-oraculo-blender.json`.

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

A superfície sai aberta se a gaiola for aberta,
sem espessura, e não aceita booleana nem `filete` sobre ela. `origem` publica
somente as faces da superfície, sem sub-endereço, porque a ordem de saída não é
identidade.

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
