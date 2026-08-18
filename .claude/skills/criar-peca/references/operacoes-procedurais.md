# Referência de operações procedurais

Leia esta referência quando a tarefa exigir uma operação específica. O catálogo
de operações é gerado do registro do núcleo: rode `npm run catalogo:gerar` e
consulte [`docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md`](../../../../docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md).
O executor continua sendo a autoridade final para argumentos e recusas.

O acervo de receitas está vazio; nomes de peças em exemplos históricos desta
referência não são caminhos disponíveis nem modelos para copiar.

## Navegação

- descoberta de operações, artefatos, efeitos e identidade: catálogo gerado;
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
`grupo`, `regiao`, `origem`, `alias` e, quando publicado, `porta`. Operações de
face podem usar `regiao.modo` (`contem` ou `toca`); rotação, translação e
deslocamento tratam região como seleção de vértices e recusam esse modo.

`faces:[ids]` existe para arquivos legados. Não o misture com `sel`. Nome
errado, região incompleta, alvo ausente ou seleção ambígua devem gritar e não
produzir alteração parcial.

## Pose de criação: `em` e `eixo`

Coloque a forma onde ela mora **no próprio passo do gerador**. Escrever
`gerador` + `rotaciona` + `transladar` para isso é o caminho longo, e ele
espalha a posição para longe da forma.

```js
['cilindro', { origemId: EIXO, raio: 'r', altura: 'h', eixo: 'x', em: [0.5, 0.1, 0] }]
```

- `em: [x,y,z]` translada a forma recém-criada. Vale em `cubo`, `cilindro`,
  `esfera`, `cone`, `plano`, `chamferBox` e `lathe`.
- `eixo: 'x' | 'y' | 'z'` escolhe a direção do eixo de revolução. Vale só em
  `cilindro`, `cone` e `lathe`, que são os gerados por revolução. `'y'` é como
  a forma já nasce.
- A ordem é **gira e depois move**, e o giro é em torno da origem.

O resultado é idêntico, vértice por vértice, a escrever os passos separados —
é isso que `tools/mecanifica/pose-de-criacao.test.ts` afirma. Use os passos
separados quando o pivô do giro **não** for a origem, ou quando precisar mover
algo que já existe.

`em` fora de um gerador GRITA, e `eixo` num gerador que não é de revolução
também: `cubo` não tem eixo para escolher.

Isto não encosta uma peça na outra nem mede vizinho — não existe `alinhar`
relacional no núcleo.

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

```js
['arranja', { origemId: CERCA, derivaDe: TABUA, sel: { origem: TABUA },
              modo: 'linear', d: ['passo', 0, 0], total: 'totalDeTabuas',
              nomes: ['central', 'direita', 'ponta'] }],
['parte', { nome: 'tabuaDaPonta',
            sel: { origem: { op: 'arranja', id: CERCA, de: TABUA, nome: 'ponta' } } }],
```

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

## Detalhes de seleção, aliases e proveniência

+**SEIS ops de geometria só aceitam ID LITERAL, nenhuma aceita `sel`:** `moveV`,
`moveF`, `moveA`, `vira`, `extruda` e `mescla` (a sétima é `pesar`, mesma
restrição, mas de skinning). Escolher uma delas é escolher escrever id
posicional — a referência que o `CLAUDE.md` proíbe persistir. Escrever `sel`
nelas não é atalho e não vira silêncio: o argumento de id chega `undefined` e a
op GRITA face/vértice inexistente (medido: 1 órfão em `moveV`/`moveF`/`vira`/
`extruda`, 2 em `moveA` — uma por ponta). **A exceção que morde é o `mescla`:**
com `para` válido e `de` ausente ele volta CALADO, 0 órfão e 0 mudança, então
ali nem o grito te salva — confira o efeito, não a ausência de erro. Quem
precisa de identidade estável compõe por primitiva +
`transladar`/`rotaciona`/`espelha` endereçados por `origem`/`alias`: a peça de
referência sem id cru (`freio-disco.js`) não usa nenhuma das seis. Se o assunto
exigir uma delas (correção de normal, solda), use — e REPORTE, porque é lacuna
de contrato, não estilo.

**`apagaFace` NÃO está nessa lista, e é a que mais importa.** Ela é a única op
que remove face — logo a única forma de abrir um furo, uma porta, um vão — e o
núcleo já lhe deu o ramo semântico: `sel:{...}` resolvido pelos mesmos sete
campos, exigindo **exatamente uma face**, gritando em ambiguidade e em seleção
vazia. Abrir um vão **não custa id posicional**; escrever `['apagaFace',
{ face: 4003 }]` é dívida escolhida, não imposta. A forma certa está na peça de
exercício `pecas/_vao-e-anteparo.js`:

```js
// o vão: remove a tampa de fundo da carcaça, POR NOME, sem citar id
['apagaFace', { sel: { origem: { op: 'cubo', id: 1, face: 'fundo' } } }],
```

Cuidado com a assimetria: `vira` (a op irmã, que conserta normal invertida)
continua sem caminho semântico — provar `vira` custa exatamente uma referência
posicional, e o cabeçalho de `_vao-e-anteparo.js` declara essa dívida alto em
vez de escondê-la.

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
`lathe` e `esfera` nascem em torno de **Y**; toda peça mecânica de eixo
horizontal (disco de freio, cubo de roda, pistão, polia, virabrequim) mora em
**X**. O passo é `rotaciona z -90` com **pivô explícito na origem** — `-90`
leva `+Y` para `+X`, e `+90` levaria para `-X`, espelhando o conjunto inteiro:

```js
// põe uma primitiva de revolução no eixo X (o helper `paraEixoX` do freio-disco)
['rotaciona', { eixo: 'z', graus: -90, pivo: [0, 0, 0], sel: { origem: { op: 'cilindro', id } } }],
```

O `pivo` explícito é obrigatório aqui pelo motivo da linha do `rotaciona` acima:
o default (centroide da seleção) giraria a primitiva em torno de si mesma, e ela
ficaria deitada **no lugar onde já estava** em vez de no eixo do conjunto. Depois
da rotação, o que era `tampa:'fundo'` (y=0) fica no **menor x** e `tampa:'topo'`
no **maior x** — é assim que `freio-disco.js` chama `pistaInterna`/`pistaExterna`
por alias, sendo `+X` o lado de FORA do carro.

**Seleção semântica (`sel`, D-129/D-130/D-131):** os SETE campos são `tudo`,
`v`, `f`, `grupo`, `regiao`, `origem` e `alias` — podem coexistir e se unem
(chave desconhecida GRITA nomeando os sete). `sel:{tudo:true}` é a
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
(`CLAUDE.md`). A op `pesar` ainda não aceita `sel` (só `vs:`/`faces:`), então
não dá pra dizer `tudo` nela.

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
no `loft`/`lathe`, `{}` é a união de todas as faixas. Recurso que existe e
nenhuma peça legada usa: o `drone-inspecao.js` ainda une as seis faces do cubo
à mão por um helper JS (`facesCubo`) — é dívida herdada, não modelo a copiar.
**O `cilindro` é a exceção que morde:** sem `lado` nem `tampa` são só as
LATERAIS (medido: 8 de 10 faces num cilindro de 8 lados), porque essa é a única
forma de dizer "o bordo, não as tampas" — `sel:{regiao}` não separa as duas (os
cantos da tampa caem na mesma caixa). Cilindro INTEIRO é a união dos três
termos: lateral + `tampa:'fundo'` + `tampa:'topo'`.

**`ALIASES` — dar NOME à seleção, o caminho que dispensa id de face.** A peça
exporta uma lista de pares `[nome, definição]` e qualquer passo cita
`sel:{alias:'nome'}`. É o que torna uma peça inteira escrevível sem um único id
cru: `pecas/freio-disco.js` tem **17 aliases e 0 id de vértice/face**. Alias é
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
  helper que devolve a LISTA de termos, como `cilindroInteiro(id)` no freio; o
  formato salvo continua plano.
- **`ALIASES` é validado ANTES do primeiro passo, e por `throw`** (não `grita`):
  lista malformada, nome duplicado (`alias duplicado 'X'`) ou origem inválida
  matam a peça inteira em vez de deixá-la executar pela metade.
- **É resolvido NO MOMENTO DA CITAÇÃO, não no fim da lista.** Um alias que reúne
  duas primitivas, citado antes de a segunda existir, vira ÓRFÃO (`origem
  cilindro:302 inexistente ou ainda não criada`) — custou 6 órfãos na rodada do
  freio. O autor pensa "o disco" como uma coisa só; o alias só é conjunto depois
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
copiar). Exemplos: `_oficina-anim.js` (partes), `_oficina-esqueleto.js` (rig
completo); peça com `ALIASES` encaminhado: `freio-disco.js`, `drone-inspecao.js`.

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
lascada/rocha sem precisar de `inflate`. Exemplo das primitivas novas:
`_primitivas.js`; do loft com raio: `_galho.js`; do loft com contorno
explícito (seção não-circular): `_viga.js`; do inflate: `_corpo.js`; do
chamferBox+displace: `_pedra.js`.

## Limites honestos

`inflate` continua blocky; `filete` ainda é limitado; JS puro não tem replay
canônico. Não declare uma forma coberta sem evidência visual e estrutural.
