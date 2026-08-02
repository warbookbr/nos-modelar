# Prancha de referência — freio a disco dianteiro

Prancha multivista do primeiro sistema mecânico da Mecanifica
(`prototipos/fps/v3/pecas/freio-disco.js`). Existe para que outra sessão saiba
**o que cada parâmetro controla** e **onde cada parte fica** antes de mexer na
peça, sem precisar reabrir a bancada para descobrir a convenção de eixos.

Os PNGs não são versionados (evidência regenerável, D-30). Cada vista abaixo
traz o comando que a reproduz e o endereço da bancada que a abre.

## Convenção de eixos

| eixo | significado | sinal |
|---|---|---|
| X | eixo da roda | `+X` para FORA do carro (lado da roda), `-X` para DENTRO |
| Y | raio | `y = 0` é o centro do eixo; a pinça está às 12 horas |
| Z | tangente | largura da pinça, da pastilha e do suporte |

Tudo é medido em metros. `y = 0, z = 0` é a linha de centro do eixo da roda,
então **Y é raio** e comparar um valor com `discoRaio` (0,140) diz de imediato se
a peça está dentro ou fora do disco.

## Vistas ortogonais

Projeção ortográfica, porque só nela a medida na foto é proporcional à medida
real:

```bash
npm run bancada -- freio-disco --vistas=direita,frontal,superior --projecao=ortografica --estrito
```

| vista | arquivo em `tools/bancadas/out/` | o que ela prova |
|---|---|---|
| direita (olha ao longo de X) | `bancada-freio-disco-direita-orto.png` | o disco como círculo cheio; a pinça e o suporte ocupam só a faixa radial de `pincaGarraBaseY` (0,082) até `pincaPonteY + pincaPonteAltura` (0,184) |
| frontal (olha ao longo de Z) | `bancada-freio-disco-frontal-orto.png` | o empilhamento axial: chapéu, disco, pastilha interna, pastilha externa e garras, todos na ordem esperada em X |
| superior (olha ao longo de Y) | `bancada-freio-disco-superior-orto.png` | a pinça atravessando o disco de lado a lado — o "abraço" |

Vistas de leitura, em perspectiva (a montagem fica compreensível, mas a medida
na foto não é proporcional):

```bash
npm run bancada -- freio-disco --vistas=isometrica
npm run bancada -- freio-disco --vistas=isometrica --explosao=0.12
npm run bancada -- freio-disco --selecionadas=pastilhaInterna,pistao --modo=contexto --vistas=superior
npm run bancada -- freio-disco --selecionadas=suporte --modo=contexto --vistas=direita
```

Use explosão **baixa** (≈0,12). A partir de ≈0,2 as partes saem do
enquadramento, porque a câmera é enquadrada na montagem fechada e não
reenquadra ao explodir (ATRITOS-AUTORIA A-12).

## Partes semânticas

Oito partes, todas endereçáveis pelo nome na bancada (`--selecionadas=<nome>`) e
nos passos (`sel:{grupo:'<nome>'}`). São 526 faces, nenhuma sem identidade.

| parte | faces | caixa (x, y, z) | papel |
|---|---:|---|---|
| `disco` | 60 | −0,060…0,012 · ±0,140 · ±0,140 | pista de atrito + chapéu; gira com a roda |
| `cubo` | 240 | −0,070…0,044 · ±0,052 · ±0,052 | barril, flange furado e piloto que centraliza a roda |
| `pastilhaInterna` | 6 | −0,028…−0,014 · 0,088…0,136 · ±0,038 | pastilha do lado do pistão |
| `pastilhaExterna` | 6 | 0,014…0,028 · 0,088…0,136 · ±0,038 | pastilha do lado da roda |
| `pinca` | 18 | ±0,058 · 0,082…0,184 · ±0,046 | ponte + duas garras; abraça o disco |
| `pistao` | 14 | −0,044…−0,028 · 0,092…0,132 · ±0,020 | empurra a pastilha interna |
| `suporte` | 18 | −0,078…−0,058 · 0,046…0,158 · ±0,096 | placa de ancoragem + duas orelhas |
| `flexivel` | 40 | −0,109…−0,043 · 0,165…0,262 · 0,021…0,127 | mangueira, do banjo da pinça até a linha rígida |

### Flange de roda

O flange é UM disco na ponta do cubo, com o círculo de prisioneiros furado nele
num passo só (`centros:{distancia:'prisioneiroOrbita', total:'prisioneiros',
volta:360}`). Ele pertence à parte `cubo`, que agora tem TRÊS corpos: o barril,
o flange e o piloto.

Até a rodada "Flange de uma peça só" cada prisioneiro tinha um ressalto quadrado
próprio, e o motivo era a linguagem, não a mecânica: um passo de `furo` consumia
a face de entrada, então dois furos exigiam duas faces. Com o `centros` os
quatro saem da mesma face, e `TOPO.prisioneiros` é a única coisa a mudar para
ter 5 ou 6 — a peça constrói com 3, 5, 6 e 8, e a prova está em
`tools/mecanifica/freio-disco-integridade.test.ts`.

Aliases do flange: `flangeInteiro` (o disco antes do corte),
`paredesDosPrisioneiros` (o cilindro por onde cada prisioneiro passa),
`segundoPrisioneiro` (um furo sozinho), `bocasDosPrisioneiros` (a borda de cada
furo) e `assentosDeRoda` (a superfície de apoio da roda: a borda MAIS o
preenchimento).

O flange continua com `cuboRaio` (0,052), mas o piloto novo usa
`pilotoRaio` (0,051) e avança de `pilotoInicioX` (0,032) até
`pilotoFimX` (0,044). Assim a roda entra primeiro no piloto menor e só depois
apoia no flange. Na pose declarada da montagem, as escalas 2,45 (freio) e 1,60
(roda) deixam 3,05 mm de folga radial entre piloto e cavidade do aro; o comando
`npm run descrever:montagem -- roda-no-freio` mede e explica esse número.

A manga de eixo não faz parte deste sistema: as duas orelhas do `suporte`
terminam onde ela começaria. Ela entra na Fase 4, junto com o contexto do
veículo.

### Portas semânticas e aliases

Além das partes, a peça publica nomes de **seleção** para superfícies que outras
regras vão precisar citar — o que `AUTORIA-IA.md` chama de porta. Não são
listas de faces disfarçadas: quem cita `pistaInterna` não sabe (nem precisa
saber) que ela é a tampa `fundo` de um cilindro.

| alias | o que é |
|---|---|
| `pistaInterna` / `pistaExterna` | as duas pistas de atrito do disco — onde a pastilha encosta |
| `discoBordo` | a borda cilíndrica do disco |
| `pistaoFaceDeEmpurrar` | a face do pistão que toca a costa da pastilha interna |
| `discoInteiro`, `cuboInteiro`, `pincaInteira`, `suporteInteiro`, `flexivelInteiro` | o conjunto de faces de cada parte |
| `pincaPonte`, `pincaGarraInterna`, `pincaGarraExterna` | as três peças fundidas da pinça, separadas |
| `pastilhaInternaInteira`, `pastilhaExternaInteira`, `pistaoInteiro` | idem, por primitiva |
| `pilotoDaRoda` | porta cilíndrica externa: eixo X, raio e intervalo axial declarados para receber a roda |

## Medidas nomeadas

### Independentes — é aqui que se refina

| parâmetro | valor | governa |
|---|---:|---|
| `discoRaio` | 0,140 | raio externo da pista; disco de 280 mm |
| `discoEspessura` | 0,024 | espessura do disco; move as duas pistas ao mesmo tempo |
| `chapeuRaio` | 0,072 | raio do chapéu (a panela central) |
| `chapeuProfundidade` | 0,048 | quanto o chapéu recua para dentro do carro |
| `cuboRaio` | 0,052 | raio do barril do cubo, e também do flange |
| `pilotoRaio` | 0,051 | raio do ressalto que centraliza a roda |
| `pilotoComprimento` | 0,012 | avanço axial do piloto além do flange |
| `flangeEspessura` | 0,012 | quanto o flange avança para fora, além da face do cubo |
| `prisioneiroOrbita` | 0,038 | raio do círculo de prisioneiros (o PCD dividido por 2) |
| `prisioneiroFuroRaio` | 0,0065 | furo passante do prisioneiro (M12) |
| `cuboComprimento` | 0,090 | comprimento axial do cubo |
| `cuboRecuo` | 0,070 | onde o cubo começa, para dentro do plano do disco |
| `folgaPastilha` | 0,002 | folga de repouso entre pastilha e disco |
| `pastilhaEspessura` | 0,014 | fricção + placa; é o parâmetro do desgaste (Fase 5) |
| `pastilhaAltura` | 0,048 | altura radial da faixa de atrito |
| `pastilhaLargura` | 0,076 | largura da pastilha em Z |
| `pastilhaBaseY` | 0,088 | raio interno da faixa de atrito (0,63·`discoRaio`) |
| `pincaParedeEspessura` | 0,030 | espessura de cada garra |
| `pincaProfundidade` | 0,092 | extensão da pinça em Z |
| `pincaPonteAltura` | 0,038 | altura radial da ponte |
| `pincaGarraAltura` | 0,066 | altura radial de cada garra |
| `pincaGarraBaseY` | 0,082 | raio onde as garras começam (0,59·`discoRaio`) |
| `folgaPonte` | 0,006 | vão entre o topo do disco e a face interna da ponte |
| `pistaoRaio` | 0,020 | raio do pistão |
| `pistaoComprimento` | 0,016 | avanço do pistão |
| `suporteEspessura` | 0,020 | espessura da placa de ancoragem |
| `suporteLargura` | 0,100 | largura da placa em Z |
| `folgaSuporte` | 0,006 | vão entre a placa fixa e o maior raio que gira ao lado dela |
| `suporteSobraGarra` | 0,010 | quanto a placa passa do topo da garra que sustenta |
| `suporteOrelhaAltura` | 0,036 | altura das orelhas de parafuso |
| `suporteOrelhaAvanco` | 0,046 | quanto cada orelha avança em Z |
| `flexivelRaio` | 0,005 | raio da mangueira |
| `flexivelBanjoRaio` | 0,008 | raio do banjo, na saída da pinça |

Os quatro nós do caminho da mangueira são nomeados um por um
(`flexivelBocaX/Y/Z`, `flexivelCurvaX/Y/Z`, `flexivelSubidaX/Y/Z`,
`flexivelUniaoX/Y/Z`) porque a linguagem de autoria só sabe nomear escalar, não
ponto (ATRITOS-AUTORIA A-8).

### Derivadas — não edite, elas se recalculam

Não existe expressão dentro do passo (ATRITOS-AUTORIA A-5), então a derivação
mora em JS puro no topo do arquivo e o passo cita o nome derivado. Mudar uma
independente arrasta todas as dependentes:

| derivada | fórmula | o que garante |
|---|---|---|
| `discoX` | −`discoEspessura`/2 | o disco fica centrado no plano da roda |
| `chapeuX` | −(`discoEspessura`/2 + `chapeuProfundidade`) | o chapéu encosta na face interna do disco |
| `pilotoInicioX` / `pilotoFimX` | face externa do flange; + `pilotoComprimento` | o piloto nasce depois do flange e termina dentro da cavidade da roda |
| `pastilhaInternaX` / `pastilhaExternaX` | ∓(`discoEspessura`/2 + `folgaPastilha` + `pastilhaEspessura`/2) | a folga de repouso existe nos dois lados |
| `pastilhaMeioY` | `pastilhaBaseY` + `pastilhaAltura`/2 | o eixo do pistão bate com o centro da pastilha |
| `pincaGarraInternaX` / `pincaGarraExternaX` | ∓(costa da pastilha + `pincaParedeEspessura`/2) | cada garra encosta na costa da sua pastilha |
| `pincaLargura` | 2·(costa da pastilha + `pincaParedeEspessura`) | a ponte cobre exatamente as duas garras |
| `pincaPonteY` | `discoRaio` + `folgaPonte` | a ponte passa por cima do disco sem tocar |
| `pistaoX` | −(costa da pastilha + `pistaoComprimento`) | o pistão termina exatamente na costa da pastilha interna |
| `suportePlacaX` | −(costa da pastilha + `pincaParedeEspessura` + `suporteEspessura`/2) | a placa encosta atrás da garra interna |
| `suporteBaseY` | `chapeuRaio` + `folgaSuporte` | a placa é FIXA e começa acima de tudo que GIRA com a roda |
| `suporteAltura` | topo da garra + `suporteSobraGarra` − `suporteBaseY` | a placa cobre a garra interna inteira, sustentando-a |
| `suporteOrelhaY`, `suporteOrelhaZ` | centralização da orelha na placa | as duas orelhas ficam simétricas |
| `flexivelPontaBocaX/Y/Z`, `flexivelPontaUniaoX/Y/Z` | recuo sobre a tangente do caminho | os polos fecham o tubo sem criar cúspide no loft |

### Topológicos — mudar reconstrói

`ladosDisco` 32, `ladosChapeu` 24, `ladosCubo` 16, `ladosPistao` 12,
`ladosFlexivel` 8. Mudar qualquer um altera a **contagem** de faces da
primitiva afetada; não é refinamento de medida, por isso mora em `TOPO`.

## Como alterar um componente pelo nome

O critério de saída da Fase 3 é este. Três exemplos, nenhum com índice de
vértice, face ou objeto:

- **aproximar a pastilha interna do disco**: baixe `folgaPastilha`. As duas
  pastilhas, o pistão e as garras seguem juntos, porque todos derivam dela.
- **desgastar a pastilha** (Fase 5): baixe `pastilhaEspessura`. A pastilha
  afina, a garra e o pistão avançam para continuar encostados na costa dela.
- **usar um disco maior**: suba `discoRaio`. A ponte da pinça sobe com ele por
  `pincaPonteY`; as pastilhas **não** sobem — `pastilhaBaseY` é independente de
  propósito, para que a faixa de atrito seja uma decisão explícita.

Depois de qualquer mudança, confira nas três ortogonais e rode
`npm run bancada -- freio-disco --vistas=direita --estrito`, que sai ≠0 se
alguma face perdeu identidade.

## Verificação desta rodada

| gate | resultado |
|---|---|
| `npm test` | 330 testes, 9 arquivos, aprovado (7 casos novos em `tools/mecanifica/freio-disco-integridade.test.ts`) |
| `npm run typecheck` | aprovado |
| `npm run build` | aprovado |
| `npm run mapa` | 172 arquivos |
| `npm run gabarito:selecao:check` | `freio-disco` acusada como peça NOVA; regravado, nenhuma peça existente mudou de hash |
| `npm run docs:links:check` | aprovado — 52 docs alcançáveis a partir do `INDEX.md` |
| `npm run bancada -- freio-disco --estrito` | 180 faces, 0 sem identidade |
| órfãos do núcleo | 0 |

As dificuldades encontradas ao modelar estão em
[`docs/mecanifica/ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md), rodada 1.
