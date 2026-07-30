---
name: criar-peca
description: CRIAR conteúdo do jogo NÓS como IA — objeto 3D, som, animação, esqueleto — escrevendo a peça como lista de PASSOS (o formato da Oficina) e provando com as bancadas (ver PNGs, medir som). Use SEMPRE que o ideador pedir pra criar/editar uma peça, um objeto, um som, uma animação ou qualquer conteúdo do Atelier (v3) — este é o manual de autoria; a skill `oficina` é pra mexer NA ferramenta, não pra usá-la.
---

# Criar peça — o manual de autoria da IA

Você não clica na Oficina — você **escreve a peça direto** (o mesmo formato que
a Oficina grava) e **vê/mede** pelas bancadas. O laço: escrever → `npm run peca`
→ LER os PNGs → auditar → iterar. Peça de objeto mora em
`prototipos/fps/v3/pecas/`, de som em `pecas-som/`. Prefixo `_` = exemplo/preset
(o `auditar` sem argumento pula os `_`).

## Objeto 3D — o formato (copie de `pecas/_oficina-toco.js`)

`PARAMS` (dimensionais — citados por NOME nos passos, mudar NÃO renumera) +
`TOPO` (topológicos — mudar RECONSTRÓI e pode deixar passo órfão) + `PASSOS`
(a lista `[['op',{...}],...]`) + `meta` com `colisao: colisaoDe(PASSOS, PARAMS,
TOPO)` (CHAMADA, não valor) + `construir = executar(...)`. **`PASSOS` exportado**,
senão a Oficina nunca mais reabre o arquivo. Peça que usa `sel:{alias:...}`
exporta também `ALIASES` **e o ENCAMINHA nas duas chamadas** — `colisaoDe(PASSOS,
PARAMS, TOPO, MATERIAIS, ALIASES)` e `executar(PASSOS, PARAMS, TOPO, ctx,
MATERIAIS, ANIMACOES, ESQUELETO, ALIASES)`. Esquecer um dos dois não diz "faltou
ALIASES": diz `alias 'X' inexistente` em CADA citação (medido no `freio-disco`:
**69 órfãos** sem encaminhar, **0** com).

**Identidade por bloco (`BLOCO=1000`):** o passo `i` possui os ids
`[i*1000, i*1000+1000)`. Um cilindro de `lados:8` no passo 0 cria vértices
0..15 (anel de baixo 0..7, de cima 8..15 — SEM vértice de centro; as tampas são
polígonos) e faces 0..9 (laterais 0..7, fundo 8, topo 9); um `extruda` no passo
1 cria a partir de 1000. A numeração depende só da POSIÇÃO do passo — id que
aponta pro nada GRITA (órfão), nunca corrompe.

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
de propósito). Não é preciosismo: num TOPO o estrago é invisível a todos os
gates — `lados: NaN` vira `lados: 3` calado (`NaN|0` = 0), o cilindro cai de
V=16/F=10 pra V=6/F=5 com malha limpa, e todo id de face dos passos seguintes
passa a apontar pra outra face.

**Vocabulário IMPLEMENTADO hoje** (o resto da tabela do `docs/oficina.md` é
roteiro, ainda não existe — não use; o plano de fechar as lacunas é o épico
`docs/historico/playground.md`, e esta tabela DEVE ser atualizada a cada op entregue):

| op | args | nota |
|---|---|---|
| `cubo` / `cilindro` | medidas (`larg`/`alt`/`prof` ou `lado`; `raio`/`altura`), `lados` (cilindro, TOPO), `origemId?` | geradores originais, e dois dos quatro que PUBLICAM `origem` (`origemId?` é a identidade estrutural que `sel:{origem}` endereça — você escolhe o número; **não confundir com `id`, que não se escreve**) |
| `esfera` | `raio` (PARAM, 0.5), `aneis` (TOPO, 6, mín 2), `lados` (TOPO, 8, mín 3) | **não publica `origem`** (`origemId` aqui é ignorado em silêncio). UV-sphere apoiada no chão (polo sul y=0, norte y=2·raio); numeração no comentário da op |
| `cone` | `raio` (PARAM, 0.5), `altura` (PARAM, 1), `lados` (TOPO, 8, mín 3) | **não publica `origem`**. Anel da base b+0..b+lados−1 (y=0), ápice b+lados; tampa −y como o fundo do cilindro |
| `plano` | `largura` (PARAM, 1), `profundidade` (PARAM, 1), `seg` (TOPO, 1, mín 1) | **não publica `origem`**. Grade XZ centrada na origem, y=0, linha a linha; seg² quads +y — o chão |
| `chamferBox` | `larg`/`alt`/`prof` (ou `lado`, PARAM — a convenção do cubo, chão embaixo), `chanfro` (PARAM, distância do corte) | **não publica `origem`** — e isso já decidiu a forma de uma peça real: a pinça e o suporte do freio a disco são fundidas, mas saíram em `cubo` de aresta viva porque `chamferBox` não é endereçável por nome. O cubo com CANTOS E ARESTAS chanfrados — corte FLAT (não arredonda). SEM parâmetro TOPO: sempre 24 vértices/26 faces, não tem como estourar o bloco. `chanfro` precisa ser `>0` e `<min(larg/2,prof/2,alt/2)` (cortes de pontas opostas da mesma aresta não podem se cruzar) — fora da faixa GRITA e aborta (0V/0F) |
| `lathe` | `perfil:[[raio,y],...]` (≥2 pontos, PARAM), `lados` (TOPO, mín 3), `origemId?` | PUBLICA `origem` (grade faixa×lado). Perfil 2D girado no eixo Y — generaliza a esfera (polo↔anel↔polo). Ponto de 2 elementos = canto reto PRA SEMPRE; ponto ≠ 2 elementos (a alça de curva reservada num 3º elemento, ou malformado) GRITA e ABORTA o passo (fail-closed). `raio` resolvido `===0` vira polo (1 vértice), `>0` vira anel (`lados` vértices), `<0` GRITA e aborta. Sem tampas automáticas: fechar uma ponta é terminar no eixo (raio 0) |
| `loft` | `secoes:[{pos:[x,y,z],raio} ou {pos,contorno:[[u,w],...]},...]` (≥2 seções, PARAM), `lados` (TOPO, mín 3), `origemId?` | PUBLICA `origem` (grade faixa×lado); é o único gerador que aceita POSIÇÃO explícita (`pos` por seção), então dispensa o `transladar` seguinte — o `inflate` também nasce onde os contornos mandam (medido), e todo o resto nasce preso à origem. Seções ao longo de um CAMINHO 3D arbitrário — generaliza o lathe (que é o caso degenerado de caminho reto no eixo Y). Cada anel é orientado por TRANSPORTE PARALELO (não torce numa curva — o mesmo `quadro`/`transporta` do `galhoSeca` de `arvore-cartoon.js`, reimplementado local ao núcleo). `raio` resolvido `===0` vira polo, `>0` vira anel, `<0` GRITA e aborta — igual ao lathe. `contorno` (P5) troca o círculo por EXATAMENTE `lados` pontos `[u,w]` explícitos (estrela, hexágono, retângulo — não-circular) no plano local do anel; `raio` e `contorno` são mutuamente exclusivos (os dois juntos, ou nenhum, GRITA); ponto com aridade ≠ 2 (a alça de curva reservada) e winding CW/degenerado também GRITAM e ABORTAM. Também GRITAM e ABORTAM: seção malformada, `pos` com aridade ≠ 3, segmento de comprimento zero (duas seções na mesma posição) e CUSP (caminho dobrando ~180°) — nos dois últimos a tangente fica indefinida. Sem tampas automáticas: fechar uma ponta é terminar a seção com raio 0 |
| `moveV` | `v`, `d:[x,y,z]` | ADITIVO (`p+d`), nunca posição absoluta |
| `moveF` | `face`, `d:[x,y,z]` | move TODOS os cantos da face, ADITIVO; canto compartilhado com outra face move junto (use `extruda` antes se não quiser afetar vizinho) |
| `moveA` | `a`, `b`, `d:[x,y,z]` | move as duas pontas de uma aresta, ADITIVO — açúcar sobre dois `moveV`; não exige `a`/`b` ligados por face |
| `vira` | `face` | inverte o winding (reverte `f.vs`) — SINGULAR, uma face por passo. Virar face JÁ consistente desalinha o pareamento com as vizinhas (não é bug — use pra consertar face já de costas, não como correção automática) |
| `apagaFace` | `face` | remove a face; os vértices dela CONTINUAM existindo (buraco de propósito — porta, janela, preparo pra composição manual) |
| `displace` | `sel?` (o formato do `rotaciona`, default = malha inteira), `amplitude` (PARAM, 0.1), `frequencia` (PARAM, 1), `semente` (PARAM, 0) | desloca cada vértice ao longo da NORMAL MÉDIA (Newell das faces que o tocam) por ruído seedado determinístico (`ruido3` — value noise, [0,1) remapeado pra [−amplitude,+amplitude]). Vértice sem face nenhuma GRITA (sem normal pra seguir). Id-estável (não cria/apaga nada) — preserva manifold de malha já fechada. Peça-exemplo `_pedra.js` |
| `extruda` | `face`, `dist` | só face única; anel novo nasce no bloco do passo |
| `mescla` | `de:[ids]`, `para:id` | solda; face de área zero some quieta, mas face com canto repetido (bowtie) GRITA e é removida |
| `rotaciona` | `eixo` (`'x'\|'y'\|'z'`), `graus` (PARAM), `sel?` (a seleção uniforme dos SETE campos — `tudo`/`v`/`f`/`grupo`/`regiao`/`origem`/`alias`, ver "Seleção semântica"; default = malha inteira), `pivo?` (`[x,y,z]`, default = centroide da seleção) | SIMPLES: só move posição (`p' = pivo + R_eixo(graus)·(p−pivo)`); NUNCA cria vértice/face nem renumera. `regiao` é caixa delimitadora (min/max os dois OBRIGATÓRIOS, sem `Infinity`); `grupo` são as faces daquele `f.parte`. **O default do pivô é armadilha:** centroide da seleção gira a peça em torno de si mesma — para pôr uma primitiva num eixo do conjunto, escreva `pivo` explícito |
| `transladar` | `d` (`[x,y,z]`, PARAM, default `[0,0,0]`), `sel?` (o MESMO formato do `rotaciona`, default = malha inteira) | SIMPLES: `p' = p + d`, ADITIVO como o `moveV`; NUNCA cria vértice/face nem renumera; sem pivô (translação não usa). **É COMO SE POSICIONA UMA PRIMITIVA:** `cubo`/`cilindro`/`esfera`/`cone`/`plano`/`chamferBox` nascem PRESOS à origem e `lathe` sempre gira em torno de Y — nenhum aceita posição. Crie a primitiva e translade no passo seguinte (`sel` ausente = tudo que existe até ali; use `sel:{regiao}`/`{grupo}` pra mover só a peça nova quando já houver outra geometria) |
| `espelha` | `eixo` (`'x'\|'y'\|'z'`), `pos?`, `sel?` uniforme; modo ESTRUTURAL: `origemId` + `derivaDe` juntos | DUPLICA faces; `sel:{f}`/`{grupo}` aponta faces, `{v}` alcança faces incidentes e `{regiao}` só faces inteiras na caixa. Weld no plano; ids novos do bloco; winding revertido; atributos herdados. **Modo ESTRUTURAL (é a 5ª fonte de `origem`):** com `origemId` + `derivaDe` a cópia vira endereçável por `sel:{origem:{op:'espelha',id,de}}`, onde `de` é a MESMA origem de `derivaDe`. Exige `sel:{origem:...}` direto — recusa `faces`, alias, região e ids literais — e aborta sem criar nada se alguma face-fonte estiver inteira no plano (a saída seria uma origem incompleta). Exemplo: `drone-inspecao.js`, trem de pouso |
| `pincel` | `modo:'face'` (`faces` legado OU `sel`, `cor`) ou `modo:'livre'` (`cor`,`raio`,`dureza`,`pontos:[{f,a,b}]`) | livre = dab face-local, acompanha a face; não aceita `sel` |
| `liso` | `faces:[ids]` (legado) ou `sel` | sombreado macio (padrão: chapado) |
| `material` | `faces` (legado) ou `sel`, `usa` | + `MATERIAIS = {mat1:{cor,emissivo,aspereza,semLuz,mistura:'transparente'}}` exportado |
| `parte` | `nome` (string com pelo menos um caractere visível), `faces:[ids]` (legado) ou `sel`, `pivo?` (`[x,y,z]`, PARAM), `substituir?` (só o literal `true`) | nomeia pra animação/material/grupo. O `nome` é a IDENTIDADE e é formato salvo: `''`, `'   '`, número, booleano, lista ou `nome` AUSENTE **GRITAM** e a op não toca em face nenhuma (fail-closed) — nomear nunca vira no-op silencioso, e `sel:{grupo}` cobra o mesmo contrato. Uma face pertence a NO MÁXIMO uma parte, e desde o O-2 **reatribuir GRITA**: se a face já é de OUTRA parte, o passo é recusado por face, ela fica com o dono ANTIGO e o órfão nomeia quem a batizou primeiro. Duas seleções sobrepostas não roubam mais faces em silêncio. Escreva `substituir: true` só quando transferir for a INTENÇÃO (valor diferente de `true` grita e a op segue estrita). Renomear para a MESMA parte segue mudo (é redundância, não conflito). `pivo` ausente = centroide da parte (resolvido no adaptador) |
| `pesar` | `osso`, `vs:[ids]` e/ou `faces:[ids]`, `peso` | skinning (acumula por vértice, normaliza top-4); não aceita `sel` |
| `solido` | `faces:[ids]` (legado) ou `sel` | o que entra na colisão |
| `inflate` | `contornoLado:[[z,y],...]` (≥3 pontos, PARAM), `contornoTopo:[[z,x],...]` (idem), `divisoes` (TOPO, mín 2) | **não publica `origem`**. Dois contornos 2D (plano z×y e z×x) viram VOLUME por interseção de dois prismas — não é malha booleana geral, é uma GRADE DE VOXEL (watertight por construção, mas o resultado sai BLOCKY/facetado — não suave). Ponto com aridade ≠ 2 (alça de curva reservada) GRITA e aborta, igual ao `contorno` do loft; <3 pontos idem; contornos que não se cruzam em nenhum voxel GRITA (volume vazio nunca é o que você queria). Vale largura≠altura — o único gerador sem seção circular. Peça-exemplo `_corpo.js` |

**Sete ops de geometria só aceitam ID LITERAL, nenhuma aceita `sel`:** `moveV`,
`moveF`, `moveA`, `vira`, `apagaFace`, `extruda` e `mescla` (a oitava é
`pesar`, mesma restrição, mas de skinning). Escolher uma delas é
escolher escrever id posicional — a referência que o `CLAUDE.md` proíbe
persistir. Não é acaso que a peça de referência sem id cru (`freio-disco.js`)
não use nenhuma das sete: quem precisa de identidade estável compõe por
primitiva + `transladar`/`rotaciona`/`espelha` endereçados por
`origem`/`alias`. Se o assunto exigir uma delas (furo, correção de normal),
use — e REPORTE, porque é lacuna de contrato, não estilo.

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

**QUEM publica `origem` — 4 geradores de 8, mais uma transformação.** Só
`cubo` (`face?` nominal), `cilindro` (`lado?` numérico + `tampa?` nominal),
`lathe` e `loft` (grade `faixa?`×`lado?`) registram identidade estrutural, mais
o `espelha` no modo estrutural (`sel:{origem:{op:'espelha',id,de}}`).
**`chamferBox`, `esfera`, `cone`, `plano` e `inflate` NÃO são endereçáveis por
nome** — e a armadilha é que escrever `origemId` neles **não grita na
declaração**: a op ignora a chave em silêncio (medido: `chamferBox` com
`origemId` = 26 faces, 0 órfãos) e o erro só aparece lá na frente, na citação
(`op de origem 'chamferBox' desconhecida`). Isto MUDA A ESCOLHA DE GEOMETRIA,
não é detalhe: no freio a disco, a pinça e o suporte são peças FUNDIDAS e
`chamferBox` era literalmente o gerador do assunto — saíram em `cubo` de aresta
viva porque a alternativa era endereçá-las por caixa de coordenada escrita à
mão (medido: 3 órfãos e 26 faces sem identidade). Precisa endereçar por nome?
Escolha entre os quatro. Precisa mesmo de um dos outros? Sobra `sel:{regiao}` —
e REPORTE o limite, é sinal de qual contrato construir em seguida.

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
rotacionado (vaso, coluna, peão — lathe, só reto por enquanto) e forma
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

Comandos individuais (pra investigar um achado específico do `criar`, ou pra
ângulo/resolução fora do padrão):

```bash
npm run peca -- minha-peca --giro=8             # 8 ângulos (defeito de um lado só)
npm run peca -- minha-peca --res=1400 --geo=normais   # SEM textura: emenda/faceta SALTAM
npm run peca -- minha-peca --res=1400 --geo=flat      # silhueta/volume
npm run auditar -- minha-peca && npm run porteiro -- minha-peca   # os mesmos gates do criar, isolados
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

## Som — o formato (copie de `pecas-som/_agua.js`)

`PARAMS` + `semente` + `PASSOS` (grafo em dados: cada passo um NÓ com `id`,
ligado por `de:`) + `meta` (com `duracao: duracaoDoGrafo(somNucleo(...))`) +
`construir(ctx,quando) = construirGrafo(somNucleo(PASSOS,PARAMS,semente), ctx, quando)`.
O nó de áudio LIVRE (sem consumidor) é a saída.

**Nós implementados:** `oscilador` (forma/freq), `ruido` (cor/k), `filtro`
(passa-baixa/alta/banda, freq, q), `envelope` (ataque/pico/decaimento/duracao),
`ganho`, `lfo` (modula um param de outro nó), `soma`. Presets de referência com
os números do jogo: `_passo` (estalo agudo ~3 kHz), `_vento` (sustentado 4,5 s),
`_bolha` (tonal, varre), `_agua` (grave abafado ~350 Hz).

**O ouvido (você não escuta — MEDE):**

```bash
npm run analisar -- minha-peca-som    # espectrograma (Read a imagem!) + tom/brilho/envelope/duração
npm run sintetizar -- minha-peca-som  # amostras/hash offline (determinismo)
npm run somab                         # A/B contra o som real do jogo, por eixo
```

Brilho alto ≈ estalo/agudo; centroide baixo ≈ abafado/grave; o espectrograma
mostra varredura/harmônico/tremor. Compare SEMPRE com um preset vizinho.

## O caminho JS-puro (fora da Oficina — fallback)

`construir(ctx)` direto com `ctx.{TS,tex,geo,m4}` (molde: `pecas/_modelo.js`;
exemplos grandes: `arvore3d`, `casa-toras`, `ilha-chao`). Geometria ilimitada,
MAS **não reabre na Oficina** nem tem replay canônico — é pra motor/paisagem e
pro que o vocabulário ainda não cobre. Prefira PASSOS sempre que der; se cair
aqui por falta de uma op, DIGA (é sinal de qual op construir em seguida).

## Entrega

Peça nova precisa de CABEÇALHO (1º comentário — o `mapa:check` barra sem) e
passa pelos gates (`npm run mapa` + os quatro de sempre). Determinismo:
NENHUM `Date.now()`/`Math.random()` cru — semente escrita na peça. O fluxo de
commit/decisão: skill `nos-fluxo`.
