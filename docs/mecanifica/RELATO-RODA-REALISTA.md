# Relato do experimento — roda realista

Registro da tentativa de criar uma roda no perfil `realista-apresentacao` usando
exclusivamente a linguagem procedural atual da Oficina. A peça produzida é
`prototipos/fps/v3/pecas/roda-dianteira-realista-experimento.js`; ela permanece
isolada e não substitui a roda vigente nem entra na apresentação.

## Resultado

O experimento chegou a uma **roda técnica estilizada de apresentação**, com
ganho visual claro sobre uma composição de cilindros sólidos:

- pneu oco de raio 0,340 m e largura 0,220 m;
- quatro sulcos longitudinais realmente rebaixados na geometria;
- barril, flange e miolo anulares, com abertura central;
- dez braços formando cinco pares;
- cinco janelas reais, sem disco pintado fingindo abertura;
- cinco porcas hexagonais de leitura, sem criar cubo ou prisioneiro;
- materiais separados para borracha, sulcos, barril, flange, recessos, raios,
  miolo e fixadores;
- sete partes selecionáveis, 2.082 faces, 2.184 vértices e 4.024 triângulos;
- zero face sem identidade, zero órfão e zero id geométrico cru.

O resultado ainda **não é fotorealista**. A silhueta, a montagem e a leitura de
aro de liga são plausíveis, mas o pneu conserva aspecto procedural, as junções
dos raios não têm filetes e faltam detalhes de superfície que a referência
possui.

## Rodadas realizadas

### 1. Perfil e estrutura

A primeira versão usou:

- `lathe` fechado por repetição explícita do primeiro ponto para pneu, aro e
  miolo;
- cinco `cubo` como recessos estruturais atrás dos pares;
- dez `loft` com seção em diamante de quatro lados para os braços;
- cinco `cilindro` de seis lados para as porcas.

Ela passou na régua com 1.878 faces, zero órfão e zero face sem parte. Na imagem,
porém, os sulcos de 9 mm separavam o pneu em cinco nervuras muito duras e os
braços em diamante pareciam hastes de bicicleta.

### 2. Correção do pneu

A profundidade dos sulcos caiu de 9 mm para 5 mm. O perfil foi redistribuído e
o giro passou de 40 para 44 lados sem ultrapassar o limite de mil vértices do
passo `lathe`. A vista frontal ficou menos serrilhada e os cinco blocos de
borracha passaram a ler como bandas separadas por canais.

Esse contorno resolve apenas os sulcos que percorrem toda a circunferência. Não
há sulcos transversais ou diagonais.

### 3. Correção dos raios

Os mesmos dez caminhos foram preservados, mas a seção em diamante foi trocada
por um retângulo chanfrado de oito lados:

- largura tangencial cresce da raiz para o flange;
- espessura axial continua menor que a largura;
- quatro planos estreitos simulam um chanfro longitudinal;
- o afastamento angular de cada par passou para ±7,5°.

A mudança produziu face frontal, bordas iluminadas e braços com leitura mais
próxima de peça fundida/usinada. O recesso escuro foi aproximado até encostar no
verso dos braços. A inspeção isolada confirmou miolo, fixadores e os dez braços
como componentes selecionáveis.

## O que a linguagem resolveu bem

### Revolução com abertura real

`lathe` permitiu descrever pneu, barril, flange e miolo como perfis ocos. Isso
evitou o problema do aro em forma de disco sólido. Os vales do perfil do pneu
também são rebaixos geométricos, não faixas pretas pintadas.

### Identidade estrutural

As 23 primitivas publicam `origemId`. Todas as transformações, partes e
materiais usam `sel.origem`, aliases ou grupos. Inserir um passo anterior não
muda a identidade de nenhuma superfície.

### Aberturas por composição

Construir somente os braços e os anéis necessários deixou cinco janelas vazias
por construção. Não foi preciso cortar uma chapa nem apagar faces por id.

### Chanfro de seção

O `contorno` do `loft` foi suficiente para uma seção octogonal com face larga e
quatro bordas estreitas. É um contorno simples, mas captura luz melhor que um
prisma cru.

## Dificuldades e contornos

### Ausência de operação radial

Não existe `repetirRadial`, nem seno/cosseno na gramática de parâmetros. Para
manter os dez braços derivados das mesmas cinco medidas, o módulo gera cem
parâmetros de coordenadas (`10 braços × 5 raios × Y/Z`) e expande os passos em
JavaScript.

O arquivo final tem 141 parâmetros, embora apenas uma fração seja decisão
dimensional. O resultado é determinístico e refinável, mas a relação autoral
“cinco pares em torno do eixo X” fica escondida em código auxiliar.

**Capacidade ausente:** repetição radial declarativa com quantidade, eixo,
ângulo inicial, abertura do par e identidade semântica derivada.

### Frame implícito do `loft`

Uma seção retangular não conserva automaticamente “largura tangencial” e
“espessura axial” em todos os caminhos radiais. O frame local troca U e W
conforme a direção do caminho. A peça precisou detectar essa troca e remontar
cada contorno.

O contorno em diamante da primeira rodada escondia o problema por ser simétrico,
mas também fazia os raios parecerem hastes. A seção retangular revelou a
limitação.

**Capacidade ausente:** orientação declarada da seção, por exemplo uma normal
axial ou um frame publicado, sem reproduzir a escolha interna do gerador.

### `chamferBox` sem origem

`chamferBox` seria útil para os recessos e talvez para um braço reto, mas não
publica origem estrutural. Sem `sel.origem`, não é possível movê-lo, agrupá-lo e
garantir identidade de todas as faces sem recorrer a ids posicionais. Ele foi
descartado antes da modelagem final.

**Contorno:** `loft` com contorno de oito lados nos raios; `cubo` simples nos
recessos, onde a borda reta é menos exposta.

### Sem subtração ou corte volumétrico

A linguagem não oferece operação booleana para abrir sulcos transversais no
pneu, perfurar o miolo ou recortar bolsões complexos num disco. Usar material
escuro sobre uma superfície não seria uma abertura e foi rejeitado.

**Contornos usados:**

- sulcos longitudinais incorporados ao perfil do `lathe`;
- abertura central feita pelo perfil anular do miolo;
- janelas entre raios feitas deixando o espaço vazio;
- fixadores representados por porcas sobre o miolo, não por furos/prisioneiros.

**Detalhe reduzido:** não há sulcos transversais, furos de fixação verdadeiros,
válvula nem recortes de alívio no miolo.

### Perfil sem curvas

Cada ponto do `lathe` é uma quina linear; alça de curva está reservada, mas não
implementada. `liso` suaviza a normal, não a silhueta. Ombro, flange e rebaixos
foram aproximados por vários segmentos.

**Efeito visível:** a vista frontal ainda mostra bandas e ombros mais rígidos
que os da referência, e a lateral conserva uma leve facetação.

**Capacidade ausente:** segmentos de perfil curvos com contrato estável.

### Sem filetes entre corpos

Os raios intersectam miolo e flange, mas não existe filete ou união que produza
uma transição contínua. Sobreposição garante montagem visual; não reproduz o
raio de fundição das junções.

**Capacidade ausente:** filete/união entre partes sem perder identidade e
editabilidade.

### Hierarquia plana

Os dez geradores são agrupados na parte `raios`, e os cinco cilindros na parte
`fixadores`. A bancada isola os grupos, mas não oferece a hierarquia
`raios → par → braço` nem `fixadores → fixador individual`.

### Régua por envelope

O relatório numérico acusa interpenetrações entre pneu, aro, miolo e raios
porque compara caixas de corpos. Nesta montagem, várias sobreposições são
assentos intencionais. A ferramenta confirma caixa e folga externa, mas não
distingue encaixe anular de colisão — a mesma limitação já registrada como
A-16.

## Custo de autoria

| item | quantidade |
|---|---:|
| partes semânticas | 7 |
| origens estruturais | 23 |
| parâmetros exportados | 141 |
| parâmetros topológicos | 5 |
| passos expandidos | 66 |
| aliases | 10 |
| materiais | 8 |
| faces | 2.082 |
| vértices | 2.184 |
| triângulos renderizados | 4.024 |

O custo geométrico é aceitável para uma peça de inspeção. O custo autoral é
alto: cem parâmetros existem somente para compensar a falta de repetição radial
e trigonometria declarativa.

### Custo depois da reescrita com `arranja` (31 de julho de 2026)

A tabela acima é o estado que ORIGINOU o A-17 e o O-13. Ela fica onde está: a
comparação é a prova. Depois que a op `arranja` passou a existir, a peça foi
reescrita e medida de novo, com a mesma régua.

| item | antes | depois | diferença |
|---|---:|---:|---|
| partes semânticas | 7 | 16 | +9 — cada braço virou parte |
| parâmetros exportados | 141 | 43 | **−98** |
| destes, coordenadas de braço (`r0_..r9_`) | 100 | 0 | **−100** |
| parâmetros topológicos | 5 | 8 | +3 contagens do arranjo |
| passos expandidos | 66 | 47 | −19 |
| passos que geram instância repetida | 20 | 3 | −17 |
| aliases | 10 | 20 | +10 — um por braço |
| materiais | 8 | 8 | — |
| faces | 2.082 | 2.132 | +50 |
| vértices | 2.184 | 2.194 | +10 |
| triângulos renderizados | 4.024 | 4.044 | +20 |

O que sustenta cada linha:

- os **cem parâmetros somem por inteiro**. Um braço é declarado no ângulo ZERO,
  onde Y é o raio nomeado e Z é zero. Não há seno nem cosseno no arquivo;
- os **19 passos a menos** são dez `loft`, cinco `cubo`+`rotaciona` e cinco
  `cilindro`+`transladar` virando um gerador e cinco `arranja`. Em troca, dez
  passos `parte` novos entraram, um por braço — é por isso que a queda de passos
  (−19) é menor que a de instâncias (−17 geradores);
- as **+50 faces e +10 vértices** têm uma causa só: a porca deixou de ser
  `cilindro` e virou `lathe` de seis lados (8 faces → 18 por porca). A troca foi
  forçada pelo A-24, e o motivo está escrito no arquivo da peça;
- a **silhueta não mudou**. Conferida na bancada em `direita`, `frontal` e
  `isometrica`, ortográfica, contra as imagens desta rodada.

Também sumiu algo que a tabela antiga não media: a função `contornoChanfrado`
decidia, braço a braço, qual eixo do frame local do `loft` era o tangencial,
porque havia dez caminhos com dez direções. Com um caminho só, a decisão deixou
de existir.

O custo autoral que este relato media está pago: a intenção "cinco pares em
torno do eixo X" está escrita no arquivo, e não a expansão dela. Os limites de
perfil curvo, corte e filete continuam de pé e são o assunto do candidato a
ciclo 4.

## Provas executadas

```bash
npm run descrever -- roda-dianteira-realista-experimento --estrito
npm run bancada -- roda-dianteira-realista-experimento --vistas=direita,frontal,isometrica --projecao=ortografica --estrito --res=1440
npm run bancada -- roda-dianteira-realista-experimento --selecionadas=raios,mioloAro,fixadores --modo=isolar --focar --vistas=direita,isometrica --projecao=ortografica --estrito --res=1440
npm run id-cru:check
```

Resultados finais:

- `descrever`: 7 partes, 2.082 faces, 2.184 vértices, 0 faces sem identidade e
  0 órfãos; `raios ↔ recessosRaios` encostam no eixo X com vão 0,000 m;
- bancada: 4.024 triângulos e 0 faces sem identidade nas três vistas;
- isolamento: `raios`, `mioloAro` e `fixadores` resolvidos sem seleção ignorada;
- `id-cru:check`: 0 id cru fora da lista herdada.

Imagens finais:

- `tools/bancadas/out/bancada-roda-dianteira-realista-experimento-direita-orto.png`;
- `tools/bancadas/out/bancada-roda-dianteira-realista-experimento-frontal-orto.png`;
- `tools/bancadas/out/bancada-roda-dianteira-realista-experimento-isometrica-orto.png`;
- `tools/bancadas/out/bancada-roda-dianteira-realista-experimento-direita-sel-fixadores+mioloAro+raios-isolar-orto-focado.png`;
- `tools/bancadas/out/bancada-roda-dianteira-realista-experimento-isometrica-sel-fixadores+mioloAro+raios-isolar-orto-focado.png`.

### Provas da reescrita com `arranja`

```bash
npm run descrever -- roda-dianteira-realista-experimento --estrito
npm run bancada -- roda-dianteira-realista-experimento --vistas=direita,frontal,isometrica --projecao=ortografica --estrito
npm run bancada -- roda-dianteira-realista-experimento --selecionadas=raioRecuadoDoGrupo3 --modo=isolar --projecao=ortografica
npx vitest run tools/mecanifica/arranjo-em-peca.test.ts
```

Resultados:

- `descrever`: 16 partes, 2.132 faces, 2.194 vértices, 0 face sem identidade e 0
  órfão; `fixadores` com **5 corpos** (a contagem que denunciou o A-24 quando
  eram 13);
- bancada: silhueta idêntica à das imagens acima nas três vistas;
- isolamento de UM braço pelo nome, na bancada e na régua —
  `bancada-roda-dianteira-realista-experimento-direita-sel-raioRecuadoDoGrupo3-isolar-orto.png`
  mostra um braço só, e a régua lhe dá caixa e corpo próprios;
- `arranjo-em-peca.test.ts`: 13 casos, contagem derivada de `TOPO`.

## Conclusão

A Oficina não condena a IA a produzir apenas low-poly: com perfis ocos, lofts
por contorno, identidade de origem e inspeção multivista, foi possível chegar a
uma roda mecanicamente legível e substancialmente mais detalhada.

Ela, porém, ainda conduz o resultado para um **realismo procedural estilizado**.
Os maiores limites observados não são “falta de mais polígonos”; são ausência de
relações autorais de alto nível — repetição radial, orientação explícita de
seção, curvas de perfil, cortes e filetes. Essas capacidades reduziriam ao mesmo
tempo o esforço, a verbosidade e a aparência artesanal dos contornos.
