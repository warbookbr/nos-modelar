---
name: criar-peca
description: Criar ou refinar uma peça 3D procedural da Mecanifica como IA, escrevendo PASSOS e provando o resultado na bancada neutra com medidas, vistas e crítica objetiva.
---

# Criar peça — o manual de autoria da IA

Você **escreve a peça direto** no formato procedural e **vê/mede** na bancada
neutra. A Oficina humana herdada não existe neste repositório. O laço oficial é: escrever →
`npm run descrever` → `npm run bancada -- <peça> --vistas=isometrica,frontal,direita,superior`
→ ler as quatro vistas → crítica → iterar. `npm run peca` permanece uma
ferramenta herdada para diagnóstico de render, mas não é o laço visual principal
da IA: pode enquadrar o objeto pequeno e não mostra o estado semântico da bancada.
Peça de objeto mora em
`prototipos/fps/v3/pecas/`. Prefixo `_` = exemplo/fixture
(o `auditar` sem argumento pula os `_`).

## Objeto 3D — o formato (comece por `pecas/_tampa-de-caixa.js`)

`PARAMS` (dimensionais — citados por NOME nos passos, em geral não renumeram) +
`TOPO` (topológicos — mudar RECONSTRÓI e pode deixar passo órfão) + `PASSOS`
(a lista `[['op',{...}],...]`) + `meta` com `colisao: colisaoDe(PASSOS, PARAMS,
TOPO)` (CHAMADA, não valor) + `construir = executar(...)`. **`PASSOS` exportado**,
para que as ferramentas consigam inspecionar a definição. Peça que usa `sel:{alias:...}`
exporta também `ALIASES` **e o ENCAMINHA nas duas chamadas** — `colisaoDe(PASSOS,
PARAMS, TOPO, MATERIAIS, ALIASES)` e `executar(PASSOS, PARAMS, TOPO, ctx,
MATERIAIS, ANIMACOES, ESQUELETO, ALIASES)`. Esquecer um dos dois não diz "faltou
ALIASES": diz `alias 'X' inexistente` em CADA citação (medido no `freio-disco`:
**69 órfãos** sem encaminhar, **0** com).

**Identidade por bloco (`BLOCO=1000`):** o passo `i` possui os ids
`[i*1000, i*1000+1000)`. Um cilindro de `lados:8` no passo 0 cria vértices
0..15 (anel de baixo 0..7, de cima 8..15 — SEM vértice de centro; as tampas são
polígonos) e faces 0..9 (laterais 0..7, fundo 8, topo 9); um `extruda` no passo
1 cria a partir de 1000. O BLOCO depende só da posição; a numeração DENTRO dele
depende da topologia. `lados:{desvio}` é topológico: como deriva a contagem do
raio, mudar esse raio pode renumerar. Id que aponta pro nada GRITA, nunca
corrompe.

**NÃO ESCREVA `id:` num passo.** O campo é opcional e o núcleo calcula sozinho
pela posição; escrever só serve pra você errar. Se escrever um valor diferente
da posição, GRITA (`id X ≠ base da posição Y — a posição manda`), e o erro
CASCATEIA: toda referência posterior àquele bloco vira órfã. Foi exatamente
isso que custou **234 órfãos** e uma reescrita inteira na medição da Fase 3.5
— o agente escolheu os blocos por tipo de peça (corpo=1000, tampa=2000) porque
os exemplos escreviam `id:`, e aí intercalar um passo de apoio (`transladar`,
`pincel`) deslocou a posição de tudo que vinha depois. As peças-exemplo foram
limpas: nenhuma escreve `id:` hoje. **`origemId` é outra coisa** — esse VOCÊ
escolhe, é a identidade estrutural que `sel.origem` endereça, e não tem
relação com a posição do passo.

**Lei que vale pra TODA op:** número tem que ser FINITO e ponto tem que ser
`[x,y,z]`. `NaN`/`Infinity` ou aridade errada = **throw** (a peça inteira morre,
de propósito). Antes dessa guarda, `lados: NaN` podia virar 3 por coerção e
trocar a topologia com malha aparentemente limpa. Hoje o núcleo recusa o valor
antes de criar geometria.

**Vocabulário IMPLEMENTADO hoje.** A referência canônica de capacidades é o
núcleo `prototipos/fps/v3/motor/oficina.js`; a lista de operações que realmente
aceitam `origemId`/publicam `sel:{origem}` é exportada como
`OPERACOES_COM_ORIGEM`. Esta tabela ensina o uso, não deve virar uma cópia de
contrato de faces.

<!-- operacoes-com-origem: arranja, arredondarAresta, chamferBox, cilindro, cone, cubo, esfera, espelha, filete, furo, inflate, lathe, loft, plano -->

| op | args | nota |
|---|---|---|
| `cubo` / `cilindro` / `esfera` / `cone` / `plano` | dimensões PARAM, discretização TOPO quando houver, `origemId?` | todos publicam `origem`; use a origem inteira ou as famílias documentadas pelo núcleo. Em `cilindro` e `cone`, `lados` aceita número ou `{desvio: medida}`. `origemId` é identidade estrutural escolhida pelo autor — nunca é o `id` posicional do passo. |
| `chamferBox` | dimensões PARAM, `chanfro`, `origemId?` | publica `origem` (faces nominais, arestas e cantos). É corte plano: não é filete nem arredondamento. |
| `lathe` | `perfil:[[raio,y,raioDeConcordancia?],...]`, `lados`, `segmentosCurva?`, `origemId?` | publica origem por faixas/lados. O terceiro valor arredonda a quina; para custo diferente naquele canto use `{raio,segmentos}`. |
| `loft` | seções circulares ou `contorno:[[u,w,raioDeConcordancia?],...]`, `lados`, `orientacao?`, `segmentosCurva?`, `origemId?` | publica origem por faixas/lados; `orientacao` fixa a direção de uma seção não circular e o terceiro ponto suaviza o contorno. A forma local `{raio,segmentos}` só cabe se o contorno expandido continuar com exatamente `lados` pontos. |
| `moveV` | `v`, `d:[x,y,z]` | ADITIVO (`p+d`), nunca posição absoluta |
| `moveF` | `face`, `d:[x,y,z]` | move TODOS os cantos da face, ADITIVO; canto compartilhado com outra face move junto (use `extruda` antes se não quiser afetar vizinho) |
| `moveA` | `a`, `b`, `d:[x,y,z]` | move as duas pontas de uma aresta, ADITIVO — açúcar sobre dois `moveV`; não exige `a`/`b` ligados por face |
| `vira` | `face` | inverte o winding (reverte `f.vs`) — SINGULAR, uma face por passo. Virar face JÁ consistente desalinha o pareamento com as vizinhas (não é bug — use pra consertar face já de costas, não como correção automática) |
| `apagaFace` | `face` (legado) **ou `sel`** | remove a face; os vértices dela CONTINUAM existindo (buraco de propósito — porta, janela, preparo pra composição manual). **A ÚNICA das ops de edição que aceita `sel`** — e a única op do vocabulário que remove face, logo a única forma de abrir um VÃO: `['apagaFace', { sel: { origem: { op: 'cubo', id: 1, face: 'fundo' } } }]` (`pecas/_vao-e-anteparo.js`). Contrato: **exatamente uma face**; 2+ GRITA (`seleção ambígua: apagaFace exige exatamente uma face`), seleção vazia GRITA, e `face` + `sel` no MESMO passo GRITA — nenhum dos três apaga nada (fail-closed). Furo não custa mais id posicional |
| `displace` | `sel?` (o formato do `rotaciona`, default = malha inteira), `amplitude` (PARAM, 0.1), `frequencia` (PARAM, 1), `semente` (PARAM, 0) | desloca cada vértice ao longo da NORMAL MÉDIA (Newell das faces que o tocam) por ruído seedado determinístico (`ruido3` — value noise, [0,1) remapeado pra [−amplitude,+amplitude]). Vértice sem face nenhuma GRITA (sem normal pra seguir). Id-estável (não cria/apaga nada) — preserva manifold de malha já fechada. Peça-exemplo `_pedra.js` |
| `extruda` | `face`, `dist` | só face única; anel novo nasce no bloco do passo |
| `mescla` | `de:[ids]`, `para:id` | solda; face de área zero some quieta, mas face com canto repetido (bowtie) GRITA e é removida |
| `rotaciona` | `eixo` (`'x'\|'y'\|'z'`), `graus` (PARAM), `sel?` (a seleção uniforme dos SETE campos — `tudo`/`v`/`f`/`grupo`/`regiao`/`origem`/`alias`, ver "Seleção semântica"; default = malha inteira), `pivo?` (`[x,y,z]`, default = centroide da seleção) | SIMPLES: só move posição (`p' = pivo + R_eixo(graus)·(p−pivo)`, DESTRO nos três eixos — o sentido está em "O SENTIDO da rotação" logo abaixo da tabela, não deduza); NUNCA cria vértice/face nem renumera. `regiao` é caixa delimitadora (min/max os dois OBRIGATÓRIOS, sem `Infinity`); `grupo` são as faces daquele `f.parte`. **O default do pivô é armadilha:** centroide da seleção gira a peça em torno de si mesma — para pôr uma primitiva num eixo do conjunto, escreva `pivo` explícito |
| `transladar` | `d` (`[x,y,z]`, PARAM, default `[0,0,0]`), `sel?` (o MESMO formato do `rotaciona`, default = malha inteira) | SIMPLES: `p' = p + d`, ADITIVO como o `moveV`; NUNCA cria vértice/face nem renumera; sem pivô (translação não usa). **É COMO SE POSICIONA UMA PRIMITIVA:** `cubo`/`cilindro`/`esfera`/`cone`/`plano`/`chamferBox` nascem PRESOS à origem e `lathe` sempre gira em torno de Y — nenhum aceita posição. Crie a primitiva e translade no passo seguinte (`sel` ausente = tudo que existe até ali; use `sel:{regiao}`/`{grupo}` pra mover só a peça nova quando já houver outra geometria) |
| `espelha` | `eixo` (`'x'\|'y'\|'z'`), `pos?`, `sel?` uniforme; modo ESTRUTURAL: `origemId` + `derivaDe` juntos | DUPLICA faces; `sel:{f}`/`{grupo}` aponta faces, `{v}` alcança faces incidentes e `{regiao}` só faces inteiras na caixa. Weld no plano; ids novos do bloco; winding revertido; atributos herdados. **Modo ESTRUTURAL (é a 5ª fonte de `origem`):** com `origemId` + `derivaDe` a cópia vira endereçável por `sel:{origem:{op:'espelha',id,de}}`, onde `de` é a MESMA origem de `derivaDe`. Exige `sel:{origem:...}` direto — recusa `faces`, alias, região e ids literais — e aborta sem criar nada se alguma face-fonte estiver inteira no plano (a saída seria uma origem incompleta). Exemplo: `drone-inspecao.js`, trem de pouso |
| `publicarPorta` | `nome` (string visível, única na peça), `de:{op,id,...}` (origem estrutural — **não** é lista de id) | dá NOME de autor a uma origem estrutural e o publica no neutro (`nucleo().portas`), para citar depois com `sel:{porta:'nome'}` e para a régua/bancada mostrarem. Guarda a ORIGEM, nunca faces resolvidas: a porta continua certa depois de mover, girar ou pintar a primitiva. Nome repetido GRITA nomeando o passo que publicou antes; `de` inválida GRITA e a porta não entra no mapa |
| `arranja` | `modo:'radial'\|'linear'`, `total` (PARAM, inteiro ≥2, **conta a fonte**), radial: `eixo`, **exatamente uma** de `volta` (arco fechado, passo=`volta/total`) ou `graus` (passo entre instâncias), `pivo?` (default `[0,0,0]`), linear: `d` (`[x,y,z]`, passo de UMA instância); SEMPRE estrutural: `origemId` + `derivaDe` + `sel:{origem:...}` | REPETE uma origem estrutural: cria `total−1` cópias, ids novos do bloco, atributos herdados, **winding preservado** (rotação e translação não trocam a mão — só o `espelha` troca). É a 6ª fonte de `origem`: a saída é `{op:'arranja',id,de}` com o eixo `copia` (0..total−2, e a fonte **não** é cópia) — cite a coleção inteira omitindo `copia`, ou uma cópia por inteiro, nome de PARAM, `'primeira'`/`'ultima'` ou `{passo,fase}`. Ângulo da cópia k = `(k+1)·passo`, DERIVADO da contagem, nunca acumulado. **Grita, nunca escolhe:** `volta`+`graus` juntos ou nenhum dos dois, `total<2`, `d` nulo, cópia que cai a múltiplo exato de 360° da fonte, `sel` com faces/alias/região/ids. Vértice EXATAMENTE sobre o eixo é soldado; face inteira sobre o eixo aborta a coleção sem criar nada. Ex.: círculo de prisioneiros, aletas de disco, braços de roda |
| `furo` | `origemId` (OBRIGATÓRIO), `de` (origem estrutural de UMA face — a entrada), `centro` ou `centros`, `raio` padrão, `lados?` (TOPO: número ou `{desvio: medida}`), **exatamente uma** de `saida` ou profundidade, `orientacao?` | PUBLICA `origem` (famílias `borda`, `parede`, `saida` + tampa `'fundo'`). No modo `{desvio}`, um passo com raios diferentes deriva UM `lados` pelo maior raio; isso preserva a tolerância e a numeração uniforme das famílias. ABRE VAZIO numa face plana e convexa e aborta inteiro em ambiguidade, interseção, medida inválida ou estouro. Não é booleana genérica: toca só as faces nomeadas e registra as consumidas. Veja `_gabarito-de-furacao.js`. |
| `pincel` | `modo:'face'` (`faces` legado OU `sel`, `cor`) ou `modo:'livre'` (`cor`,`raio`,`dureza`,`pontos:[{f,a,b}]`) | livre = dab face-local, acompanha a face; não aceita `sel` |
| `liso` | `faces:[ids]` (legado) ou `sel` | sombreado macio (padrão: chapado) |
| `material` | `faces` (legado) ou `sel`, `usa` | + `MATERIAIS = {mat1:{cor,emissivo,aspereza,semLuz,mistura:'transparente'}}` exportado |
| `parte` | `nome` (string com pelo menos um caractere visível), `faces:[ids]` (legado) ou `sel`, `pivo?` (`[x,y,z]`, PARAM), `substituir?` (só o literal `true`) | nomeia pra animação/material/grupo. O `nome` é a IDENTIDADE e é formato salvo: `''`, `'   '`, número, booleano, lista ou `nome` AUSENTE **GRITAM** e a op não toca em face nenhuma (fail-closed) — nomear nunca vira no-op silencioso, e `sel:{grupo}` cobra o mesmo contrato. Uma face pertence a NO MÁXIMO uma parte, e desde o O-2 **reatribuir GRITA**: se a face já é de OUTRA parte, o passo é recusado por face, ela fica com o dono ANTIGO e o órfão nomeia quem a batizou primeiro. Duas seleções sobrepostas não roubam mais faces em silêncio. Escreva `substituir: true` só quando transferir for a INTENÇÃO (valor diferente de `true` grita e a op segue estrita). Renomear para a MESMA parte segue mudo (é redundância, não conflito). Se TODA a seleção for recusada, a parte **não é registrada** — o nome não vira parte fantasma sem face nenhuma, então trate o grito como "esta parte não existe", não como aviso. `pivo` ausente = centroide da parte (resolvido no adaptador) |
| `pesar` | `osso`, `vs:[ids]` e/ou `faces:[ids]`, `peso` | skinning (acumula por vértice, normaliza top-4); não aceita `sel` |
| `solido` | `faces:[ids]` (legado) ou `sel` | o que entra na colisão |
| `inflate` | `contornoLado`/`contornoTopo` com pontos `[u,w,raioDeConcordancia?]`, `divisoes`, `segmentosCurva?`, `origemId?` | publica a origem inteira. A alça pode ser número ou `{raio,segmentos}`; é um volume voxelizado, fechado porém facetado, não uma superfície orgânica lisa. |
| `filete` | `origemId`, `de` (uma face estrutural), `aresta`, `raio` | estado atual: um único painel, portanto **chanfro**, não arredondamento. Funciona só em aresta manifold de ponta simples; `chamferBox` e cantos complexos ainda são recusados. O desenho do v2 fica em `docs/mecanifica/FILETE-V2.md`. |
| `arredondarAresta` | `origemId`, `de` (uma face estrutural), `aresta`, `raio`, `paineis` inteiro ≥ 2 | raio real aproximado por uma faixa de painéis, com cada painel citável como `sel:{origem:{op:'arredondarAresta',id,painel}}`. Por enquanto é o **Escopo A**: só anel simples, faces convexas e uma face de continuidade em cada ponta. Recusa canto composto — inclusive `chamferBox` — antes de alterar a malha. |

**SEIS ops de geometria só aceitam ID LITERAL, nenhuma aceita `sel`:** `moveV`,
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

## O laço de VER (você tem olhos — use-os)

**A bancada é a prova visual oficial da IA.** Depois de conferir números com
`npm run descrever -- minha-peca --estrito`, rode:

```bash
npm run revisar -- minha-peca
```

Ele abre a bancada neutra em isométrica, frontal, direita e superior, salva as
quatro vistas reproduzíveis e falha quando a geometria fica cortada ou pequena
demais para uma crítica visual. Leia os PNGs; o gate confirma enquadramento,
não decide se a forma atende à referência. Para encaixes, some
`--selecionadas=parteA,parteB --modo=isolar --focar` ao `npm run bancada`.

**`npm run criar -- minha-peca`** é o COMANDO PADRÃO (P7, D-120) — um laço
único: estado do núcleo + manifesto de capacidades (cruzado contra a tabela
acima — avisa se ela ficou pra trás) + `auditar` + `porteiro` + `gabarito`
(se houver referência) + VEREDITO AGREGADO, com os renders (3 ângulos + 3
`geo=normais`) salvos em `tools/bancadas/out/criar-*` pra você LER. Prefira
ele a rodar os comandos abaixo em separado — existe justamente pra nenhum
gate ficar de fora por esquecimento.

**Ressalva medida, peça com `ALIASES`:** hoje o `criar` chama o núcleo SEM
encaminhar `ALIASES` (`tools/bancadas/criar.mjs`), então a seção "estado
(núcleo)" acusa um órfão por citação de alias — 69 no `freio-disco`, que na
execução real tem 0. Órfão de alias nessa seção é ARTEFATO da bancada, não
defeito da peça; confirme pelo caminho que encaminha (`construir`/`colisaoDe`
da própria peça, `npm run gabarito:selecao:check`, ou os testes da peça) antes
de mexer em qualquer coisa.

Comandos individuais (para investigar um achado específico do `criar`, ou uma
falha do laço oficial):

```bash
npm run peca -- minha-peca --giro=8             # diagnóstico herdado: 8 ângulos
npm run peca -- minha-peca --res=1400 --geo=normais   # diagnóstico herdado: emenda/faceta
npm run peca -- minha-peca --res=1400 --geo=flat      # diagnóstico herdado: silhueta/volume
npm run criar -- minha-peca                                      # fluxo atual: núcleo, porteiro e gabarito
npm run executar                                # replay/determinismo do núcleo
npm run gabarito -- minha-peca                  # o mesmo IoU do criar, isolado — mais ângulos que o CONTORNOS cobrir
```

**LEIA os PNGs de verdade** (Read no arquivo, incluindo a sobreposição do
`gabarito`). Regra de comportamento (skill `auditar-peca`): todo julgamento
cita ≥1 número/gate; FORMA é do ideador — você aponta os defeitos que vê,
entrega, e NUNCA conclui sozinho "ficou bom". O `gabarito` FORÇA o número (IoU
calibrado) mas ainda depende de um `CONTORNOS` desenhado à mão em
`prototipos/fps/v3/gabaritos/<peça>.js` (0..1, olhando o PNG) — sem gabarito
pra peça, a bancada falha alto (nada foi medido), nunca finge que passou.

## O caminho JS-puro (fallback)

`construir(ctx)` direto com `ctx.{TS,tex,geo,m4}` (molde: `pecas/_modelo.js`;
exemplos grandes: `arvore3d`, `casa-toras`, `ilha-chao`). Geometria ilimitada,
MAS **não tem replay canônico** — é para motor/paisagem e
pro que o vocabulário ainda não cobre. Prefira PASSOS sempre que der; se cair
aqui por falta de uma op, DIGA (é sinal de qual op construir em seguida).

## Entrega

Peça nova precisa de CABEÇALHO (1º comentário — o `mapa:check` barra sem) e
passa pelos gates (`npm run mapa` + os quatro de sempre). Determinismo:
NENHUM `Date.now()`/`Math.random()` cru — semente escrita na peça. O fluxo de
commit e decisão segue `AGENTS.md` e `docs/mecanifica/INDEX.md`.
