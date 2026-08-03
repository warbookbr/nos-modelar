# Atritos de autoria — o que dói ao modelar

Registro das dificuldades observadas quando alguém — pessoa ou agente — modela
de verdade. Existe para que capacidade nova nasça de dificuldade observada, não
de lista especulativa de operações.

## Como registrar

Um atrito só entra aqui depois de acontecer numa rodada real de modelagem. Cada
entrada precisa de:

- **onde dói** — na linguagem da Oficina (escrever a peça) ou na bancada
  (inspecionar a peça). Confundir os dois faz consertar a ferramenta errada;
- **evidência** — quantas iterações, qual foto, qual comando, qual erro;
- **o que foi contornado** — a gambiarra usada para seguir em frente;
- **capacidade candidata** — o que resolveria o caso geral, não só este.

Retrabalho é a medida. Chute de coordenada, ida e volta para achar um nome e
foto que não mostra o defeito são todos contáveis, mesmo quando o método de
quem modelou é inesperado.

## Atritos em acompanhamento

Esta seção preserva a ordem em que os atritos foram investigados. O estado
explícito manda mais que a posição no arquivo:

| Atrito | Estado atual |
|---|---|
| A-37 | resolvido: `arredondarAresta` costura canto composto de `chamferBox` |
| A-36 | resolvido para aresta simples por `arredondarAresta`; o restante é A-37 |
| A-35 | resolvido: discretização local por concordância |
| A-34 | resolvido por `lados:{desvio}` em `cilindro`, `cone` e `furo` |
| A-33 | resolvido: triangulação completa depois do caminho compatível |
| A-29 | candidato dentro de relações semânticas, sem plano ativo |
| A-32 | resolvido por `PEC-01` no `AUT-2026-06`: piloto e flange separados |
| A-30 | resolvido pela F1 do antigo Ciclo 6 |
| A-16 | Recorte A concluído por `AUT-2026-06`; limite geral de cavidades permanece |
| A-1 | resolvido: câmera livre reproduzível por URL validada |
| A-15 | retirado da Mecanifica com a Oficina humana |

### A-37 — o filete não compõe com o `chamferBox`, e era justo a pinça que precisava

**Estado atual — RESOLVIDO:** o contrato convergido não amplia `filete`. O
Escopo B de `arredondarAresta` percorre o leque composto do `chamferBox` e
mantém o triângulo de canto como a face existente que recebe a sequência do
arco. O resultado e os limites estão em [`FILETE-V2.md`](FILETE-V2.md) e no
plano concluído [`AUT-2026-04`](planos/2026-08-02-canto-composto.md).

**Onde dói:** linguagem da Oficina, ao compor `filete` com `chamferBox`.

**Evidência:** o gate do ciclo 5 nomeou a pinça do `freio-disco` como o caso a
resolver: "pinça, suporte e pistão são caixas de aresta viva a 90°; uma pinça de
verdade é fundida". A pinça, o suporte e as orelhas são todos `chamferBox`. O
`filete` exige que cada PONTA da aresta escolhida tenha exatamente UMA face além
das duas da aresta — é assim que ele sabe onde fechar a fresta que o recuo abre.
Numa face de `chamferBox`, cada ponta encosta em DUAS faces a mais (a tira de
chanfro da aresta vizinha e a face de canto), então o passo grita:
`a ponta v0 da aresta 0 da face 22001 tem 2 face(s) além das duas da aresta`.

**Contorno usado:** a prova em peça de produto foi para as PASTILHAS, que são
`cubo` simples. E não foi consolo: o chanfro de entrada e de saída da face de
atrito existe numa pastilha de verdade por causa de ruído — a quina viva
entrando no disco excita a vibração que vira o chiado. Quatro filetes, +8 V e
+4 F na peça inteira. A pinça continua uma peça de bloco.

**Capacidade entregue:** a mesma `arredondarAresta` aceita agora as 24 arestas
nominais do `chamferBox`, com dois ou mais painéis. O caminho simples continua
literal; no canto composto o triângulo já existente vira um polígono que cobre
todas as divisões da faixa, sem face nova anônima. O teste varre as 24 arestas,
o gate executável mede 28 V/28 F em dois painéis, e a fixture neutra
`_bloco-arredondado-composto` prova 30 V/29 F, 0 órfão e 0 face sem identidade.
A pinça do freio ficou fora desta rodada por decisão de escopo, não por limite
da operação.

### A-36 — o filete de UM painel é um chanfro, não um arredondamento

**Estado atual — RESOLVIDO PARA ARESTA SIMPLES:** `filete` foi preservado como
chanfro compatível e `arredondarAresta` implementa o arco multipainel no Escopo
A. O canto composto não reabre A-36; ele continua registrado como A-37.

**Onde dói:** linguagem da Oficina, e na leitura que o cliente faz.

**Evidência:** a op `filete` corta a aresta com UM painel plano. Num canto de
90° isso dá dois cantos de 45°, que é o que a condição 5 do gate pede com
`n = 1`. A condição está cumprida ao pé da letra e a palavra continua grande
demais para o que a op faz: dois cantos de 45° são um chanfro. Arredondar pede
vários painéis.

**Por que ficou assim, e isto foi medido, não suposto:** subdividir o corte por
interpolação esférica entre as duas direções perpendiculares produz um painel
intermediário cuja normal NÃO fica entre as normais das duas faces do jeito
ingênuo — o painel mais perto da face de entrada sai com a normal mais perto da
OUTRA face. Entregar isso seria entregar quebrado.

**Capacidade entregue:** `arredondarAresta`, sem dar um segundo significado a
`filete`. A derivação e o gate do Escopo A estão em
[`FILETE-V2.md`](FILETE-V2.md).

**Junto, e menor:** o `raio` do filete não é conferido contra o tamanho das
faces vizinhas. Um raio grande demais faz o painel novo ultrapassar a face, e o
núcleo não impede. Hoje é responsabilidade declarada do autor.

### A-35 — `segmentosCurva` é um número por PASSO, não por concordância

**Onde dói:** linguagem da Oficina, nos três lugares que aceitam a alça de
curva (`lathe`, `contorno` do `loft`, contornos do `inflate`).

**Como apareceu:** ao rodar o ombro do pneu (`roda-dianteira.js`), os dois
cantos arredondados (flanco->banda de um lado, banda->flanco do outro) usam
o MESMO `segmentosCurva` porque é um argumento do passo inteiro, não do
ponto. Funcionou aqui porque os dois raios são iguais (simetria do pneu),
mas um perfil com uma concordância GRANDE (que pede mais segmentos pra não
facetar) e outra PEQUENA (que precisaria de menos, por custo) não tem como
pedir dois números — o autor sobe os dois pro nível do maior, ou aceita
faceta visível no menor.

**Estado atual — RESOLVIDO:** a alça aceita `[a,b,raio]` ou
`[a,b,{raio,segmentos}]` nos três consumidores. Raio puro continua usando
`segmentosCurva` do passo, sem mudar nenhuma peça existente; a forma objeto
altera só aquela curva. `segmentos` é inteiro de 1 a 1000, por isso uma entrada
malformada aborta antes de criar geometria ou gastar memória sem limite.

**Limite declarado:** isto dá ao autor uma contagem local explícita, não uma
derivação de tolerância. Escolher a qualidade automaticamente por desvio para
um arco exige uma regra própria para o ângulo e continua fora deste escopo.

### A-34 — contagens circulares sem unidade impediam comparar acabamento

**Estado atual — RESOLVIDO:** `cilindro`, `cone` e `furo` aceitam
`lados:{desvio: medida}`. O núcleo deriva a menor contagem cuja flecha do
polígono inscrito atende à tolerância. No `furo` com raios mistos, usa o maior
raio e conserva um único `L` no passo.

**Correção da evidência:** a foto original foi lida ao contrário. O furo de
prisioneiro (R=6,5 mm, L=12) tinha flecha de 0,2215 mm; o flange (R=52 mm,
L=16), 0,9992 mm. O contorno mais facetado era o flange, 4,51 vezes pior, não o
furo. Normal suave continua sendo sombreado, nunca contorno.

**Prova:** `tools/oficina/lados-por-desvio.test.ts` fixa round-trip,
minimalidade, maior raio, determinismo e recusas. `_gabarito-de-furacao` prova a
mesma tolerância em furo, cilindro e cone fora do domínio automotivo, com zero
órfão e zero face sem identidade. A revisão superior, frontal e isométrica
achou e corrigiu a leitura ambígua do fundo do furo sem alterar geometria.

**Limites declarados:** o modo automático põe raio na topologia e pode
renumerar dentro do bloco; o modo numérico permanece byte-idêntico. Esfera,
`lathe` e `loft` precisam de derivação própria. A quina viva do aro é outro
problema e não volta acoplada a este atrito.

### A-33 — a partição do furo trava em face de poucos lados com furo raspando a borda

**Onde dói:** núcleo da Oficina, na op `furo` com vários `centros`.

**Como apareceu:** a rodada "Flange de uma peça só" registrou "17 de 240
combinações gritavam antes, 0 depois". A frase vale DENTRO das 240 escolhidas.
A varredura histórica de 14 212 combinações da mesma figura (face de 3 a 36
lados, furo de 3 a 24 lados, 2 a 20 furos; raio da face 0,052, furos de raio
0,0065 a 0,038 do centro) encontrou:

| resultado | casos | julgamento |
| --- | ---: | --- |
| sai inteira, sem órfão | 10 866 | — |
| anéis se cruzam ou um anel não cabe | 2 405 | grito CORRETO |
| estoura o bloco de ids do passo | 904 | limite DECLARADO do núcleo |
| a partição trava: "nenhuma orelha livre" | 37 | **defeito, resolvido** |

**Evidência e resolução:** as 37 têm face de POUCOS lados (6, 7, 8, 10 e 18)
e muitos furos raspando a borda. O caminho de ponte curta preserva cada saída
que já fechava; só quando suas três ordens e o orçamento determinístico de
pontes alternativas não fecham entra Earcut, que triangula os mesmos vértices
sem criar junção em T. A saída ainda atravessa as provas próprias de contagem,
área, bordas e famílias semânticas antes de alterar a face.

`tools/oficina/oficina.test.ts` mantém as 37 assinaturas como regressão de
casca fechada e contagem exata; `tools/oficina/furo-ordens-de-ponte.test.ts`
leva três casos até o adaptador. A fixture neutra
`_gabarito-triangulacao-de-furos` exercita o último caso (hexágono, dez furos
triangulares) e saiu com 144 faces, 0 órfão e 0 face sem identidade na bancada.
Casos geometricamente inválidos continuam abortando antes de qualquer malha.

### A-29 — o passo do arranjo radial só dá centro NOMEÁVEL em 90°, 180° e 270°

**Onde dói:** linguagem da Oficina, ao compor `arranja` com `furo`.

**A evidência ORIGINAL foi embora, e isto é registro, não conserto.** O flange
de roda de `prototipos/fps/v3/pecas/freio-disco.js` era o caso desta entrada
enquanto ele fosse um ressalto por prisioneiro, posto pelo `arranja` e furado um
a um. A rodada "Flange de uma peça só" trocou os ressaltos por UM disco com
`centros:{distancia, total, volta}`, e ali não existe mais cópia a localizar:
`npm test` constrói o freio com 3, 5, 6 e 8 prisioneiros, e o de 5 (72°) sai com
zero órfão e sem um cosseno no arquivo. O atrito continua ABERTO porque a forma
de círculo do `centros` desarma o caso do CÍRCULO DE FUROS, não o caso geral de
localizar a cópia `k` de um `arranja` radial — e é este que segue sem resposta,
para qualquer op que precise apontar para uma cópia girada.

**Evidência (a que motivou, preservada):** a op `furo` exige `centro`, o ponto
do MUNDO por onde o furo passa — e exige com razão: o centroide da face como
default seria um furo que muda de lugar quando a face muda de forma. Só que o
assento em que ele entrava foi posto ali pelo `arranja`, que girou a fonte de
`volta/total` graus. Para dizer onde está o centro da cópia `k`, o autor precisa
do ponto girado.

A gramática aritmética dos PARAMS tem `+ - * /`, parênteses e nomes. Não tem
seno nem cosseno, e é decisão: fórmula transcendental no arquivo salvo é a porta
de entrada da divergência entre implementações. A consequência é aritmética
simples: com `total: 4` e `volta: 360` o passo é 90°, e o ponto girado é
±raio em Y ou em Z, ou zero — quatro nomes de parâmetro e nada mais. Com
`total: 5` (72°), o centro de cada cópia precisaria de `cos 72°` e `sen 72°`
como PARAM, isto é, oito números de coordenada digitados à mão. É exatamente a
classe que o ciclo 3 tirou da roda experimental (A-17). Enquanto durou, ela
prendeu o flange do freio em QUATRO prisioneiros.

**Contorno usado, e por que ele caiu:** eram quatro prisioneiros com `volta:
360` e `total: 4`, o único passo que a aritmética sem transcendental nomeia. O
`centros` em círculo tornou o contorno desnecessário no freio; o freio continua
com quatro porque 4×100 é um padrão real de carro médio, e agora é escolha de
desenho, não da linguagem.

**Capacidade candidata, em ordem de preferência:**

1. o `furo` aceitar centro em coordenada DA FACE de entrada, e não só do mundo
   — explícito, nunca default. Aí o mesmo centro serve a fonte e a toda cópia,
   e o ângulo some da conta. É o conserto certo e o mais estreito;
2. uma op que repita o CORTE junto com a cópia (o `arranja` levar consigo os
   furos já abertos na fonte). Resolve A-26 e A-29 de uma vez, e é bem maior;
3. `cos`/`sen` na gramática de expressão. É o mais barato de escrever e o pior
   de todos: põe transcendental no formato salvo para consertar um sintoma.

### A-32 — o cubo do freio não tem cubo-piloto: o flange não pode ser mais largo que o barril

**Estado atual — RESOLVIDO:** `PEC-01` separou o piloto (raio 0,051) do flange
(raio 0,052). O piloto aparece como terceiro corpo da parte `cubo`, publica a
porta `pilotoDaRoda`, e a roda publica `cavidadeDoCubo`. A montagem read-only
`roda-no-freio` mede 3,05 mm de folga radial; não reposiciona nem cria
hierarquia. A evidência está em `tools/mecanifica/interfaces-montagem.test.ts`
e no comando `npm run descrever:montagem -- roda-no-freio`.

**Onde dói:** o desenho da peça `freio-disco`, e a régua que confere a montagem.

**Evidência:** a rodada "Flange de uma peça só", ao decidir o raio do flange. Um
cubo de roda de verdade tem DOIS diâmetros na ponta: um cubo-piloto estreito,
que centra a roda, e um flange mais largo, em que a roda se aperta. O
`freio-disco` tem um só. O barril é `cuboRaio` de ponta a ponta, e a roda entra
por cima DELE: `roda-dianteira-integridade` afirma que a abertura do aro, na
escala da cena, passa do cubo por 0,6 mm. Um flange mais largo que `cuboRaio`
bateria no aro em vez de receber a roda.

O resultado está na foto
`tools/bancadas/out/bancada-freio-disco-isometrica-sel-cubo-isolar-focado.png`:
o cubo lê como um cilindro liso com um círculo de furos na tampa. Os ressaltos
sumiram, que era o assunto da rodada, mas o degrau piloto/flange que faz um
flange PARECER flange na silhueta lateral não existe — não porque a linguagem
não saiba fazer, e sim porque a montagem, como está modelada hoje, não deixa.

**Contorno usado:** `flangeRaio: '= cuboRaio'`, escrito como derivada, com o
motivo no comentário e um teste que morre se ele sair. A peça não finge ter um
degrau que não tem.

**Capacidade candidata:** nada no núcleo — isto é DESENHO. O conserto é o cubo
virar dois cilindros, um piloto de raio menor na ponta e o flange atrás dele, e
a roda passar a citar a porta do piloto em vez do barril inteiro. Custa mexer em
`roda-dianteira` e na relação declarada entre as duas peças, então fica
registrado em vez de embutido de contrabando numa rodada sobre furos.

### A-30 — um passo de furo tem UM raio: a flange com furo central não cabe

**Estado atual — RESOLVIDO:** `centros` aceita pontos, discos e círculos com
`raio`, `profundidade` e `nome` próprios; os valores do passo são padrões. A
origem `furo` resolve o grupo por nome. `_flange-de-tubulacao` prova passagem
central e círculo de parafusos no mesmo passo, e os testes cobrem raios e
profundidades diferentes.

**Onde doía:** linguagem da Oficina.

**Evidência histórica:** a peça de exercício
`prototipos/fps/v3/pecas/_tampa-de-caixa.js`, escrita para provar o círculo de
parafusos do ciclo "Furo v2". Uma flange de tubulação de verdade tem o furo
CENTRAL da passagem mais o círculo de parafusos em volta, e os dois têm
diâmetros diferentes. O `furo` aceita vários CENTROS num passo, mas um `raio`
só — e um segundo passo não achava mais a face, porque o primeiro a consumia. A
figura mais comum de flange continuava fora da linguagem.

**Contorno usado antes da correção:** a peça de exercício era uma tampa CHEIA,
sem furo central,
com o círculo de quatro parafusos e uma cabeça de aperto por cima. A limitação
ficava dita em voz alta no cabeçalho dela, não escondida no desenho.

**Capacidade entregue:** `centros` aceita ponto, disco ou círculo; disco e
círculo podem declarar `raio`, `profundidade` e `nome`, e o passo fornece os
padrões. A conferência compara os anéis reais, a terceira ordem de ponte usa o
raio declarado e o grupo nomeado permanece estável quando a quantidade muda.

### A-16 — a régua por envelopes não reconhece encaixe oco

**Estado atual:** os Recortes A–E de `AUT-05` medem e posicionam uma interface
cilíndrica, distinguindo contato local de alerta amplo. O Recorte F
[`AUT-2026-11`](planos/2026-08-02-assentamento-anular.md) aplica a mesma regra ao
aro↔pneu: duas faixas anulares declaradas medem sobreposição radial e axial, mas
o alerta amplo das partes continua exposto. Isso resolve a ambiguidade da roda
sem transformar caixa em colisão exata. Solver, reposicionamento persistente,
deformação de borracha e exceção silenciosa continuam fora do contrato.

**Onde dói:** conferência headless da bancada.

**Evidência:** a primeira roda revisada,
`prototipos/fps/v3/pecas/roda-dianteira.js`, tem pneu, aro e tampa central como
partes distintas. `npm run descrever -- roda-dianteira` mede `aro↔pneu` como
`interpenetra`, pois as caixas de ambos necessariamente se sobrepõem. Isso não
é defeito: o aro mora dentro da cavidade anular do pneu. A mesma régua também
não consegue provar que a abertura de 0,128 m do aro, já escalada na cena,
recebe o cubo do freio de 0,127 m sem invasão de sólido.

**Contorno:** manter a relação dimensional explícita na
[`PRANCHA-RODA-DIANTEIRA.md`](PRANCHA-RODA-DIANTEIRA.md), revisar as três vistas
ortogonais e travar o raio interno do aro por teste. Não marcar a invasão como
“ignorada” no relatório, pois isso esconderia uma colisão verdadeira em outra
montagem.

**Capacidade candidata:** portas semânticas de volume e assento (por exemplo,
`aro.cavidade` e `cubo.flange`) e uma relação declarada `encaixa`. A ferramenta
continuaria reportando colisão entre sólidos, mas saberia medir a folga entre a
porta interna de um componente oco e a porta externa do componente recebido.
É geral: um rolamento no alojamento, uma tampa em carcaça ou uma tomada em
conector têm o mesmo problema.

### A-1 — enquadramento livre não volta pela URL

**Estado atual — RESOLVIDO:** `AUT-2026-05` guarda posição, alvo, vetor acima e
zoom com cinco casas na URL; a bancada restaura esse dado depois da projeção,
sem UUID ou estado interno. Entrada inválida fecha para isométrica e as vistas
canônicas permanecem byte-idênticas. A prova real `npm run guarda:camera` orbita
em ortográfica, recarrega o endereço e compara os dados restaurados.

**Onde dói:** bancada.

**Evidência:** ao orbitar, `vistaAtual` vira `livre` e
`salvarEstadoNaUrl` grava `isometrica` no lugar
(`src/bancada/main.js`). `npm run bancada -- --focar` avisa que o recorte
fotografado não está no endereço que ele mesmo imprime.

**Contorno:** só usar as sete vistas canônicas como evidência compartilhável.

**Capacidade candidata:** registrar câmera e alvo na URL com precisão fixa, para
que qualquer enquadramento — não apenas os canônicos — seja reproduzível. Vale
para qualquer inspetor 3D, não só para a Mecanifica.

### A-15 — a ferramenta de autoria do projeto salva peça que o gate do projeto reprova

**Onde dói:** linguagem da Oficina.

**Estado atual — RETIRADO DO PRODUTO:** a Oficina humana foi removida da
Mecanifica. Não existe mais caminho de UI capaz de produzir e salvar esse
artefato incompatível. O atrito não foi resolvido dentro do editor; ele deixou
de pertencer ao produto. A evidência abaixo permanece como histórico e como
material de contribuição ao NÓS. O gate `id-cru` continua ativo para as peças
escritas diretamente por agentes.

**Evidência histórica:** quem modelava em `prototipos/fps/v3/oficina.html` e clicava Salvar
recebe passos endereçados por id posicional e nada mais — a interface emite
`['parte',{nome,faces:[ids]}]`, `['pincel',{modo:'face',faces:[ids],cor}]`,
`['solido',{faces:[ids]}]`, `['material',{faces:[ids],usa}]`,
`['pesar',{osso,faces:[ids],peso}]`, `['pincel',{modo:'livre',pontos:[{f,a,b}]}]`,
`['mescla',{de:[ids],para}]`, `['moveV',{v,d}]`, `['extruda',{face,dist}]` e, no
único ponto em que escreve `sel`, escreve `sel:{f:[ids]}` (passo 17, espelhar).
`sel:{alias|grupo|origem|regiao}` não aparece uma vez. O `tools/servir.mjs` grava
o resultado em `prototipos/fps/v3/pecas/`, que é exatamente o diretório varrido
pelo `npm run id-cru:check`. Reproduzido: uma peça de 4 passos com a forma que a
interface produz sai com exit 1 no gate.

A dor não é o gate reprovar — id posicional é referência proibida pelo
`CLAUDE.md` e a catraca do O-4 está certa. A dor é o **ciclo fechado**: o
projeto oferece uma ferramenta para autorar, a ferramenta produz a única saída
que ela sabe produzir, e essa saída não passa no CI do mesmo projeto. Enquanto
isso durar, a Oficina serve para explorar e não para entregar, e quem
modela pela interface descobre isso só no gate.

**Estado no fechamento da Fundação de autoria v1 — ABERTO À ÉPOCA:** a Oficina passou a recusar
antes do POST ou do download qualquer uma das seis formas posicionais cobertas
pelo gate. Ela segue como espaço exploratório; este ciclo não promete conversão
automática.

O atrito **não** foi para os resolvidos, e a razão é o que a própria prova
mediu. A guarda resolve a metade "entrega silenciosa": nada incompatível sai da
Oficina sem aviso. Ela não resolve — e o ciclo nunca prometeu resolver — a
metade que dá nome ao atrito:

- a Oficina continua sem saber **emitir** referência semântica: todo botão que
  grava seleção grava id posicional, então modelar pela interface e entregar
  seguem sendo coisas diferentes;
- três das seis formas (`vs:[ids]`, `pontos:[{f}]`, `de:[ids]` do `mescla`) não
  têm caminho semântico nem no núcleo — ali nem converter à mão resolve;
- a guarda chegou a divergir do gate na direção oposta, recusando peça que o CI
  aprova; isso era o A-22, **resolvido** no ciclo Endereços semânticos v1 — a
  regra passou a viver num módulo só, importado pela Oficina, pelo gate e pelo
  harness.

No NÓS original, o atrito fecha quando a interface souber gravar
`sel:{alias|origem|porta|...}` no momento em que grava o passo. Na Mecanifica,
essa obrigação terminou com a retirada da interface.

**Prova histórica pelo botão real, e o que ela achou.** `npm run guarda:salvar`
(`tools/mecanifica/guarda-salvar-oficina.mjs`) dirige a interface de verdade —
clique em "marcar sólido", que só sabe gravar `['solido',{faces:[ids]}]`, e
clique em "Salvar peça" — contra o `servir.mjs` real (rota que grava em
`pecas/`, apontada para um TEMP) e contra um servidor estático sem a rota, que
força o fallback de download. A medição mostrou a guarda valendo **pelo botão**
(nenhum POST, nenhum download, arquivo em disco intacto) e **não valendo pelo
gancho** `window.__oficina.salvar()`, o caminho que as bancadas headless usam: a
mesma edição recusada no clique saía em POST e o servidor gravava o arquivo. A
guarda estava no ouvinte do clique, não no caminho; ela desceu para o funil
`salvarPeca`, por onde passam os dois caminhos de saída e todos os chamadores.
A prova cobre os dois lados — `_vao-e-anteparo` (peça limpa, não automotiva)
salva pelo mesmo botão e volta a salvar depois de um `Ctrl+Z` —, senão seria
bloqueio e não guarda.

**Contorno histórico:** converter a peça à mão depois de salvar (trocar `faces:[ids]` por
`sel:{alias|grupo|origem|regiao}`), ou registrar a peça na lista herdada
`tools/bancadas/id-cru-herdado.json` de propósito, assumindo a dívida no commit.
Foi só o conselho da mensagem de erro que mudou nesta rodada: ele dizia
"Endereçe por `sel:{alias|grupo|origem|regiao}`" sem dizer que isso é impossível
pela interface — remediação que não existe é pior que remediação nenhuma, porque
manda o autor procurar uma saída inexistente.

**Capacidade candidata:** a Oficina precisa saber emitir referência semântica —
nomear a seleção (alias) ou citar a `origem` da primitiva no momento em que
grava o passo, em vez de despejar o id que ela tem na mão. É o mesmo assunto de
O-6/O-12 (R4) e O-7 (R5), visto do lado da interface: enquanto o gerador não
publica identidade endereçável, a interface não tem o que citar. Vale para
qualquer editor que grave um script reexecutável, não só para a Mecanifica.

Três formas que a interface emite (`vs:[ids]` do `pesar`, `pontos:[{f}]` do
pincel macio e `de:[ids]` do `mescla`) não têm caminho semântico **no núcleo**,
não só na interface: ali nem converter à mão resolve. Essas três só saem do id
posicional com capacidade nova no próprio vocabulário.

## Rodada 1 — freio a disco

Sessão de modelagem de `prototipos/fps/v3/pecas/freio-disco.js` (Fase 3), sem
navegador: só a Oficina para escrever e `npm run bancada` para olhar. Regra da
rodada: **não consertar a ferramenta**, apenas contornar e registrar.

Números da peça, para dar escala ao que vem abaixo: 52 passos, 13 primitivas,
61 parâmetros (26 independentes, 12 nós do caminho da mangueira, 23 derivados),
17 aliases, 8 partes, 180 faces, 0 órfãos, 0 faces sem identidade.

### Diário cru

**Contexto (sem retrabalho).** Li `CLAUDE.md`, `INDEX.md`, `PLANO.md`,
`AUTORIA-IA.md`, `BANCADA-E-APRESENTACAO.md`, a skill `criar-peca` e este
documento. Aí veio a primeira surpresa: a tabela de operações da skill **não
menciona `ALIASES`, `sel:{alias:...}` nem `unir`** — e são justamente as três
coisas que tornam a peça escrevível sem id de face. Descobri por acidente, lendo
`pecas/drone-inspecao.js` porque queria um modelo de arquivo, e confirmei
grepando `motor/oficina.js`. Se eu tivesse confiado só no manual, teria escrito
a peça com listas de faces.

**Leitura do núcleo antes de escrever a primeira linha (≈500 linhas).** Li
`resolverSelecao`, `CONTRATOS_ORIGEM`, `rotaciona`, `cubo`, `cilindro` e `loft`.
Não foi curiosidade: eram quatro decisões que eu não conseguia tomar sem o
código-fonte.

1. *Quais geradores publicam `origem`?* Só `loft`, `lathe`, `cubo` e `cilindro`.
   Isso **escolheu a geometria da peça**: eu queria a pinça em `chamferBox`
   (peça fundida, aresta viva nenhuma), e desisti porque uma primitiva sem
   `origem` só se endereça por `sel:{regiao}`, isto é, por caixa de coordenada
   chutada à mão. Escrever o assunto na linguagem da ferramenta em vez do
   contrário — o pior tipo de decisão.
2. *Qual o sinal da rotação?* Precisava saber se `rotaciona z −90` leva `+Y`
   para `+X` ou para `−X`, porque errar espelharia a peça inteira e o freio
   ficaria com o pistão do lado da roda — um erro que a foto **não** denuncia
   (um freio espelhado parece um freio). Fui ler a matriz.
3. *O pivô default.* É o centroide da seleção. Para levar um cilindro do eixo Y
   para o eixo X eu preciso girar em torno da ORIGEM, não do centro dele. Passei
   `pivo:[0,0,0]` nas 4 rotações. Nenhuma iteração perdida — mas só porque leio
   o núcleo antes; o default silencioso é uma armadilha carregada.
4. *`transladar` sem `sel` move a malha inteira.* Escopei os 12 `transladar`.

**Estado das quatro.** O O-0 (R1) respondeu 1, 3 e 4 na skill `criar-peca`. A 2
ficou aberta e foi fechada na correção da R2: a skill agora traz **"O SENTIDO da
rotação"** — a regra da mão direita ancorada nos nomes de face do `cubo`
(`direita`=+X, `topo`=+Y, `frente`=+Z), a tabela dos 3 eixos × ±90 e o caso
canônico "primitiva de revolução do eixo Y para o eixo X" (`rotaciona z -90`
leva `+Y` para `+X`). A tabela é **medida** contra o núcleo por
`tools/bancadas/skill-criar-peca.test.ts`, não copiada da matriz: se a
convenção do núcleo mudar, o teste quebra em vez de a próxima peça sair
espelhada — que é justamente o defeito que nem a foto nem o `descrever`
denunciam.

**Escrita da peça (1 vez, sem reescrever nada).** Escrevi o arquivo inteiro de
uma vez e ele rodou na primeira execução com **6 órfãos** — todos da mesma
causa: o alias `discoInteiro` (pista + chapéu) foi citado num `transladar` que
acontece **antes** de o chapéu existir. Alias é resolvido no momento da citação,
então um nome de conjunto não pode ser escrito antes de todas as suas peças
existirem. Corrigi criando dois aliases por primitiva (`discoPistaInteira`,
`discoChapeuInteiro`) e usando o agregado só no `parte`. **1 iteração.** Depois
disso: 0 órfãos, 266 V, 180 F, contagem batendo com a conta feita no papel.

**Coordenada chutada: quase nenhuma, e isso foi de propósito.** Não fiquei
mexendo em número e conferindo na foto. Montei um bloco de 23 medidas
`DERIVADAS` em JS puro no topo do arquivo — `pastilhaInternaX =
−(discoEspessura/2 + folgaPastilha + pastilhaEspessura/2)` — e deixei a
aritmética garantir o encaixe. É o contorno para a falta de `encostar` e de
expressão dentro do passo. Funcionou: os quatro encaixes que importam (folga da
pastilha nos dois lados, pistão na costa da pastilha, ponte por fora do raio,
suporte atrás da garra) saíram exatos na primeira medição, e virei isso em
teste. **Exceção honesta:** o caminho da mangueira e os dois recuos de tangente
que fecham as pontas do loft (`+0,006 / −0,007 / −0,009`) são chute puro, sem
nenhuma verificação numérica — só "parece uma mangueira" na foto.

**Onde a foto não mostrou o que eu queria (o pior pedaço da sessão).** Renderei
`direita,frontal,superior` em perspectiva. A `direita` mostrou o disco como
círculo, ótimo. A `frontal` era ilegível: um borrão de blocos cinza. Passei
**três leituras de PNG** fazendo perícia de pixel — medindo larguras em pixel,
derivando a escala de uma dimensão conhecida (a largura da pinça, 0,116 m) e
conferindo cada faixa contra a caixa esperada — só para responder "o eixo do
disco está em X ou eu espelhei a peça?". Refiz em ortográfica (a projeção certa
para medir) e repeti a perícia. Conclusão: estava tudo certo desde o começo.
Quatro leituras de foto e nenhum defeito encontrado, porque a foto não tem
escala, não tem gnômon de eixo e não sabe dizer "esta faixa é o `disco`".

**Onde a bancada brilhou (registrar o que NÃO dói também é útil).** Sobrou um
trapézio escuro na vista `direita` que eu não conseguia identificar. Em vez de
mais perícia, rodei
`--selecionadas=suporte --modo=contexto`: **um comando, uma foto**, e ficou
óbvio que o suporte estava simétrico e centrado, e que o trapézio era face
sombreada da própria pinça. O par seleção-por-nome + contexto fantasma é a
melhor coisa da bancada hoje. O mesmo vale para `--estrito`: dizer "0 faces sem
identidade" num número, sem eu procurar, poupou a rodada inteira.

**Explosão.** `--explosao=0.4` (o valor que a própria tarefa sugeria) jogou
todas as partes para fora do enquadramento — a foto é meia lua de disco no
canto e blocos cortados no topo. Baixei para 0,12 e ficou legível. **2
iterações.** Mesmo em 0,12, pastilhas e pistão continuam escondidos dentro da
pinça, porque a explosão é radial a partir do centroide e essas três partes
estão todas às 12 horas: elas se afastam **juntas**, na mesma direção. Para
mostrar o miolo do freio a explosão precisa ser axial (ao longo de X), isto é,
autoral — exatamente o que `BANCADA-E-APRESENTACAO.md` já previa.

**`--focar`.** Rodei o comando pedido,
`--selecionadas=pastilhaInterna --modo=contexto --focar`. O recorte aproxima
tanto (a pastilha tem 14 mm de espessura) que a pastilha virou um retângulo
verde chapado ocupando meia tela e o "contexto" saiu da moldura: sobrou uma
névoa clara sem forma reconhecível. `contexto` + `focar` se anulam. Abandonei
`--focar` e usei `--modo=contexto` sem foco, com duas partes selecionadas
(`pastilhaInterna,pistao`) — aí sim deu para ver, de cima, o pistão encostado na
costa da pastilha. **1 iteração perdida.** O tingimento verde da seleção (A-3,
já registrado) piorou o caso.

**Refino de proporção (2 iterações, guiadas por foto).** Na isométrica a pinça
pareceu grande demais: a garra começava em `y = 0,076`, ou 54% do raio do disco
— calipers reais cobrem mais ou menos de 65% do raio para fora. Subi
`pincaGarraBaseY` para 0,082 e baixei `pincaGarraAltura` para 0,066 (o topo
continua encostando na ponte, porque 0,082+0,066 = 0,148). Na mesma foto o
suporte parecia um cubo solto: aumentei a placa para dentro
(`suporteBaseY` 0,058 → 0,046, `suporteAltura` 0,100 → 0,112). As duas
mudanças foram um `sed` em `MEDIDAS`, sem tocar em nenhum passo — foi o momento
em que o esforço de parametrizar se pagou.

**Testes.** Escrevi `tools/mecanifica/freio-disco-integridade.test.ts` com 7
casos que medem as relações de domínio pela caixa delimitadora **por nome de
parte** (nunca por id): folga das duas pastilhas, pistão encostado, pinça
atravessando o plano do disco, suporte atrás da garra, as 8 partes e
determinismo. Passaram os 7 na primeira execução — porque a aritmética das
derivadas já garantia o que eles medem.

**O que procurei e não achei.** `encostar`, `alinhar`, `centralizar` (estão em
`AUTORIA-IA.md` como vocabulário pretendido, não existem); expressão dentro do
passo; um jeito de nomear um PONTO; `origem` para `chamferBox`; hierarquia
pai/filho de partes (o `PARTES` com `pai:` do `AUTORIA-IA.md` também é
pretendido — hoje `f.parte` é uma string plana, e a bancada mostra 8 componentes
irmãos, sem dizer que a pastilha mora na pinça). Não tentei disco com furo
central: exigiria um perfil de `lathe` fechado sobre si mesmo e o contrato não
diz se isso é legal, então preferi disco maciço a gastar iterações descobrindo.

**Onde tive que contar vértice na mão:** em nenhum lugar. Nenhum id de vértice
ou face aparece no arquivo. Esse pedaço do contrato está de pé, e é o pedaço que
já foi consertado antes desta rodada.

### Atritos

#### A-4 — primitiva nasce presa à origem, então posicionar é 31% da lista

**Onde dói:** linguagem da Oficina.

**Evidência:** 16 dos 52 passos da peça (4 `rotaciona` + 12 `transladar`) não
descrevem o freio: descrevem o transporte de uma primitiva da origem até o lugar
dela. Nenhum gerador aceita posição ou orientação, e `lathe`/`cilindro` só giram
em torno de Y — mas o eixo deste sistema é X, então **toda** peça de revolução
custa o trio criar + `rotaciona z −90` + `transladar`.

**Contorno:** um helper local `paraEixoX(id)` que devolve o passo de rotação
sempre com `pivo:[0,0,0]`, repetido nas 4 primitivas de revolução.

**Capacidade candidata:** `posicionar`/`orientar` como argumento da criação, ou
a relação declarativa `alinhar` (`eixo de A` com `eixo de B`) prometida em
`AUTORIA-IA.md`. Uma peça deveria declarar o eixo do conjunto **uma vez**, não
uma vez por primitiva. Vale para qualquer montagem mecânica, não só para freios.

#### A-5 — não existe expressão dentro do passo, então a derivação foge do envelope

**Onde dói:** linguagem da Oficina.

**Evidência:** 23 dos 61 parâmetros da peça são derivados, e todos eram
calculados em JS puro num bloco `DERIVADAS` no topo do arquivo, porque um passo
só aceita nome de parâmetro ou número literal — não há como escrever
`-($discoEspessura/2 + $folgaPastilha + $pastilhaEspessura/2)` onde ela é usada.
O efeito colateral era sério: essas 23 medidas **não eram editáveis pela
Oficina**. Quem reabria o arquivo via 61 números soltos e não sabia quais eram
consequência dos demais — e mudar `folgaPastilha` pela interface não moveria a
pastilha.

**Contorno:** o bloco `DERIVADAS`, com um comentário por linha dizendo qual
encaixe cada derivada garante, e 7 testes que reprovam se a derivação romper.

**Capacidade candidata:** `derivarParametro` com expressão validada e ciclo
detectado (item 5 das regras do `AUTORIA-IA.md`), guardada no documento — de
modo que a derivação seja formato salvo e não código de acompanhamento. É a
capacidade mais reaproveitável desta rodada: nada nela sabe o que é um freio.

**Estado (R3, O-5):** resolvido no núcleo com uma expressão explícita iniciada
por `=`. Ela aceita somente números, nomes, parênteses e `+ - * /`; não usa
`eval`, detecta ciclo e recusa valor não-finito. As 23 derivadas do freio agora
estão no `PARAMS` salvo e os testes de integridade continuam verdes. O próximo
atrito não é mais esconder aritmética: é conseguir expressar a intenção de
contato (`encostar`, A-6).

#### A-6 — `encostar` não existe, e a aritmética que o substitui é invisível

**Onde dói:** linguagem da Oficina.

**Evidência:** o `CLAUDE.md` do próprio repositório usa "encostar a pastilha no
disco" como exemplo do que deve virar capacidade geral. Modelei quatro contatos
(pastilha↔folga↔disco nos dois lados, pistão↔costa da pastilha, garra↔costa da
pastilha, placa↔garra) e todos os quatro viraram soma de espessuras. Funciona e
é exato — mas a INTENÇÃO desaparece: o arquivo diz `pistaoX = -(pastilhaCostaX +
pistaoComprimento)`, não diz "o pistão encosta na costa da pastilha interna". Um
agente que mude `pistaoComprimento` sem ler o comentário desencosta o pistão sem
receber erro nenhum.

**Contorno:** nomear as derivadas pelo contato que elas produzem e escrever os
7 testes de integridade para que desencostar reprove um gate.

**Capacidade candidata:** `encostar` (`de:` porta, `em:` porta, com folga
opcional) e `distanciar`, resolvidos no momento da execução contra as portas
publicadas. Um teste não deveria ser a única memória de uma intenção geométrica.

#### A-7 — alias é resolvido no momento da citação, e o autor pensa em conjuntos

**Onde dói:** linguagem da Oficina.

**Evidência:** 6 órfãos na primeira execução, todos
`origem cilindro:302 inexistente ou ainda não criada`, porque escrevi
`sel:{alias:'discoInteiro'}` num `transladar` que roda antes da segunda metade
do disco existir. O `grita` foi impecável — nomeou o passo, a op e a causa, e a
seleção virou vazia em vez de mover meia peça. O atrito não é o diagnóstico, é o
modelo mental: eu penso "o disco" como uma coisa só, mas o alias só é um
conjunto depois do último passo que o compõe.

**Contorno:** um alias por primitiva (`discoPistaInteira`,
`discoChapeuInteiro`) para as operações intermediárias, e o alias agregado só no
`parte`. 1 iteração; hoje a peça tem 17 aliases para 8 partes, e essa inflação é
a marca do contorno.

**Capacidade candidata:** declarar o alias como INTENÇÃO e resolvê-lo tarde
(quando citado, exigir apenas que ele esteja completo ao final da lista), ou uma
mensagem que diga "este alias fica completo no passo N, você citou no passo M".

**Estado (R2, item O-11):** a **mensagem** já está no núcleo — citar um alias
incompleto continua gritando a causa e passa a gritar também
`alias 'discoInteiro' fica completo no passo 2; você citou no passo 1 — falta
cilindro:303 (nasce no passo 2)`, com o que falta listado. A **resolução tarde**
não foi feita: mudaria a semântica do formato salvo e é Faixa 3. O atrito segue
ABERTO até uma rodada de autoria escrever uma peça com alias de conjunto e
medir se a mensagem, sozinha, evitou a iteração perdida — o defeito era de
modelo mental, e só autoria real prova que o modelo mental foi corrigido.

#### A-8 — só se nomeia escalar, nunca ponto

**Onde dói:** linguagem da Oficina.

**Evidência:** 12 dos 61 parâmetros existem só para nomear os 4 nós do caminho
da mangueira (`flexivelBocaX/Y/Z`, `flexivelCurvaX/Y/Z`, …), e mais 6 para os
2 polos que fecham o tubo. O passo do `loft` fica com 18 strings de nome de
parâmetro em vez de 6 nomes de ponto. Não é só verbosidade: um caminho de
mangueira é uma curva, e a curva não tem nome nenhum no documento — não dá para
dizer "afaste o caminho do flexível 5 mm da pinça".

**Contorno:** o prefixo repetido `flexivel<Nó><Eixo>` e a confiança em que
ninguém edite um eixo sem os outros dois.

**Capacidade candidata:** parâmetro de tipo ponto (e, adiante, de tipo caminho),
com as mesmas garantias de aridade e finitude que o núcleo já aplica a
`[x,y,z]`. Serve para qualquer peça com trajeto — cabo, tubo, correia, trilho.

#### A-9 — os quatro geradores com `origem` decidem a forma da peça

**Onde dói:** linguagem da Oficina.

**Evidência:** só `cubo`, `cilindro`, `lathe` e `loft` publicam identidade
estrutural. `chamferBox`, `esfera`, `cone`, `plano`, `inflate` não. Medido:

```text
['chamferBox', { larg: 0.1, alt: 0.04, prof: 0.09, chanfro: 0.008, origemId: 900 }],
['parte', { nome: 'pinca', sel: { origem: { op: 'chamferBox', id: 900 } } }],
-> "origem inválida: op de origem 'chamferBox' desconhecida"  (3 órfãos, 26 faces sem identidade)
```

A pinça e o suporte de um freio são peças FUNDIDAS — `chamferBox` é literalmente
o gerador do assunto. Modelei as duas em `cubo` de aresta viva porque a
alternativa era endereçá-las por `sel:{regiao}`, ou seja, por caixa de
coordenada escrita à mão, que é o retorno da chuva de índices por outra porta
(o drone herdado faz isso, e é o pedaço menos legível dele). O critério de saída
da Fase 3 — "alterar qualquer componente pelo nome" — é incompatível com metade
do vocabulário de geradores.

**Contorno:** não usar os geradores sem `origem`. A peça ficou com arestas mais
vivas do que o assunto pede.

**Capacidade candidata:** `origem` para TODO gerador. O contrato do `cubo`
(`face` nominal opcional) já serve de molde para `chamferBox` e `plano`; o do
`cilindro` (eixo numérico + tampa nominal) serve para `esfera` e `cone`.
Enquanto faltar, o vocabulário tem dois níveis de cidadania e o autor escolhe a
forma pelo nível, não pelo objeto.

#### A-10 — porta de primitiva é geométrica, não semântica

**Onde dói:** linguagem da Oficina.

**Evidência:** as duas pistas de frenagem do disco são, para o núcleo, as tampas
`fundo` e `topo` de um cilindro. Depois do `rotaciona z −90` que põe o disco no
eixo da roda, `fundo` é a pista de DENTRO e `topo` a de FORA — e nada no
documento diz isso. Tive que derivar de cabeça qual tampa virou qual pista, e o
erro seria invisível (pintar a pista errada não muda a silhueta).

**Contorno:** os aliases `pistaInterna`/`pistaExterna`/`pistaoFaceDeEmpurrar`,
que dão nome de domínio à porta geométrica. Funcionou bem — é o contorno de que
menos me arrependo.

**Capacidade candidata:** `publicarPorta` (renomear/publicar uma porta com nome
do autor, item já listado no `AUTORIA-IA.md`), e portas de gerador nomeadas no
quadro LOCAL da primitiva, para que o nome sobreviva a transformações.

#### A-11 — partes são uma lista plana; o plano pede hierarquia

**Onde dói:** linguagem da Oficina.

**Evidência:** a Fase 3 pede "hierarquia e encaixes semânticos" e a regra 3 do
`AUTORIA-IA.md` pede "partes formam uma hierarquia navegável". `f.parte` é uma
string única por face: não há como dizer que `pastilhaInterna` e `pistao` moram
dentro de `pinca`, nem que as 8 partes formam o sistema
`freioDianteiroDireito`. A bancada mostra 8 componentes irmãos em ordem
alfabética — `Cubo` ao lado de `Flexivel` —, e explicar o freio ao cliente vai
exigir justamente o agrupamento que não existe.

**Contorno:** convenção de nome (`pastilhaInterna`/`pastilhaExterna`,
`pincaPonte`/`pincaGarraInterna` como aliases) — prefixo fazendo o papel de pai.

**Evidência adicional (Fase 4, apresentação):** para registrar
`freioDianteiroDireito` em
`src/dominio/mecanica/freio-dianteiro-direito.js`, foi necessário repetir,
fora da definição procedural, uma lista explícita das 8 partes (`disco`, `cubo`,
pastilhas, `pinca`, `pistao`, `suporte`, `flexivel`). O registro permite foco e
isolamento sem tocar em UUIDs do Three.js, mas a composição não consegue pedir
ao núcleo “a subárvore do freio”: precisa manter essa associação em paralelo.
É um contorno seguro para a apresentação, não uma solução de autoria.

**Capacidade candidata:** parte com `pai` declarado e seleção por subárvore
(`sel:{grupo:'pinca', comFilhos:true}`). Genérico: qualquer montagem quer isso.

#### A-12 — a explosão não reenquadra, e a automática esconde o miolo

**Onde dói:** bancada.

**Evidência:** `npm run bancada -- freio-disco --explosao=0.4 --vistas=isometrica`
produz `bancada-freio-disco-isometrica-exp40.png`, onde o disco entra como uma
meia lua no canto inferior e a pinça sai cortada no topo — a câmera continua
enquadrada na montagem FECHADA. Precisei de 2 iterações para achar 0,12 como o
maior valor utilizável. E mesmo legível, a explosão radial a partir do centroide
não separa pastilhas, pistão e pinça, porque as três estão às 12 horas e vão
para o mesmo lado: o miolo do freio continua escondido justamente na foto que
existe para revelá-lo.

**Contorno:** explosão baixa (0,12) e, para ver o contato pistão↔pastilha, uma
foto separada com `--selecionadas=pastilhaInterna,pistao --modo=contexto` vista
de cima.

**Capacidade candidata:** (a) reenquadrar na caixa EXPLODIDA, e (b) aceitar
vetores autorais de explosão por parte — a `APRESENTACAO` já desenhada em
`BANCADA-E-APRESENTACAO.md`. O fallback radial é bom para descobrir peça
sobreposta; é inútil para um conjunto co-radial.

**Estado (rodada preparatória da Fase 4):** a primeira metade está resolvida:
quando a explosão estabiliza, a bancada enquadra a caixa das partes visíveis já
afastadas. A foto `bancada-freio-disco-isometrica-exp40.png` agora mantém todas
as oito partes no quadro a 40%. Vetores autorais continuam abertos: são
conhecimento de montagem e serão provados com o primeiro sistema no carro, não
inferidos pelo fallback radial.

#### A-13 — a foto não tem escala nem eixo, então a conferência vira perícia de pixel

**Onde dói:** bancada.

**Evidência:** 4 leituras de PNG (`bancada-freio-disco-frontal.png`,
`bancada-freio-disco-frontal-orto.png`, `direita.png`, `superior-orto.png`)
gastas para responder uma pergunta binária: "o eixo do disco está em X?".
Método usado, por não haver outro: medir uma largura em pixel, dividir pela
medida conhecida (a pinça, 0,116 m) para achar a escala (≈1050 px/m), e depois
conferir cada faixa da imagem contra a caixa esperada. Peça de 0,40 m com
detalhes de 2 mm: a folga da pastilha tem 2 pixels. A resposta certa veio da
medição numérica que fiz **fora** da bancada (caixa por parte, em Node), não da
foto.

**Contorno:** rodar a bancada em `--projecao=ortografica` para medir, imprimir a
caixa por parte com um script à parte e usar a foto só para julgar proporção.

**Capacidade candidata:** a bancada imprimir, junto do PNG, a **caixa
delimitadora por parte** e a escala px/m da vista, e desenhar um gnômon de eixo
e uma régua no canto da imagem ortográfica. Duas linhas de texto no relatório
que ela já imprime resolveriam a maior parte disto — e valem para qualquer
inspetor 3D headless, não só para a Mecanifica.

**Estado (R2, item O-1):** a medição saiu do script à parte e virou ferramenta.
`npm run descrever -- <peça>` imprime, por parte semântica, caixa/centro/
dimensões/faces e a relação de cada par de partes em número, a partir do módulo
neutro `src/autoria/descrever-partes.js` — o mesmo que alimenta a contagem do
painel da bancada, para não haver duas verdades sobre a mesma medida. Os quatro
encaixes do freio que custaram as 4 leituras de PNG agora saem assim, sem abrir
imagem: pastilha interna e externa a `0.002000` do disco em x (= `folgaPastilha`),
`pastilhaInterna ↔ pistao` em `encosta` com vão x `0.000000`, e `disco ↔ pinca`
com folga `0.006000` em y (= `folgaPonte`) sobre um vão x de `-0.024000`, isto é,
a pinça cobre a espessura inteira do disco. O atrito segue **parcialmente
aberto**: falta o lado da FOTO — escala px/m, gnômon de eixo e régua na imagem
ortográfica —, que é da bancada, não da autoria.

**Estado (rodada preparatória da Fase 4):** a bancada agora desenha uma régua e
imprime metros, px/m e o mapeamento dos eixos na própria imagem. Em projeção
ortográfica a escala é exata; em perspectiva ela é marcada como aproximada. A
caixa e as relações continuam no `npm run descrever`, que é a fonte numérica.
Falta apenas um gnômon geométrico (a legenda não finge ser uma seta 3D), se uma
rodada real ainda precisar de orientação além do texto.

**Correção (revisão adversarial da R2, ALTA-1):** a primeira versão media a
relação entre partes **face a face**, e face plana alinhada ao eixo tem espessura
zero na sua normal — o vão naquele eixo nunca fica negativo, então `interpenetra`
era **inalcançável** pelo caminho do CLI. Dois cubos encostados, 50% sobrepostos
e um inteiramente dentro do outro saíam os três como `encosta`, e contenção total
saía como `folga` — a régua dava o mesmo número para a montagem certa e para a
errada. A relação passou a ser medida **corpo a corpo** (componente conexo contra
componente conexo, que é o que resolve a peça oca sem mentir sobre invasão), com
o mesmo classificador de `relacaoEntreCaixas` — uma verdade só. Os quatro números
do parágrafo acima continuam idênticos; o que mudou é que as invasões deixaram de
ser silenciadas: `pinca ↔ pistao` reporta `interpenetra 0.016000` (o pistão mora
dentro da garra, de propósito) e o suporte aparece invadindo `cubo` em 6 mm e
`disco` em 2 mm — dois encostes que a medida antiga escondia e que a peça pode
querer revisar.

#### A-14 — `--focar` numa parte pequena destrói o contexto que `--modo=contexto` promete

**Onde dói:** bancada.

**Evidência:**
`bancada-freio-disco-superior-sel-pastilhaInterna-contexto-focado.png` — a
pastilha (14 mm × 48 mm × 76 mm) vira um retângulo verde chapado ocupando meia
tela e o restante do freio sai do enquadramento: sobra uma névoa clara sem forma
reconhecível. As duas opções pedem coisas opostas (aproximar ao máximo da
seleção × mostrar onde ela mora) e o resultado não serve para nenhuma das duas.
Somado ao tingimento verde (A-3), a foto não mostra nem a forma da pastilha nem
a posição dela.

**Contorno:** desistir de `--focar` e usar `--modo=contexto` com duas partes
vizinhas selecionadas, deixando o enquadramento no conjunto.

**Capacidade candidata:** `focar` com margem proporcional ao CONJUNTO, não à
seleção (ou uma margem declarada, `--focar=0.4`), para que aproximar não
signifique perder o contexto. Junto com A-2 (enquadrar tudo × enquadrar
seleção), é o mesmo assunto: a bancada precisa de um controle de enquadramento
com dois alvos e uma margem, em vez de um botão só.

**Estado (rodada preparatória da Fase 4):** em contexto, `Focar seleção` calcula
a caixa da montagem junto da seleção; a peça continua identificada, mas o freio
inteiro permanece reconhecível. `F` passou a ser `Enquadrar tudo` e não limpa a
seleção. A margem autoral ajustável ainda não existe, porém o conflito que
destruía o contexto foi removido.

### O que NÃO doeu (para não consertar o lado errado)

- **Seleção por nome + contexto fantasma.** `--selecionadas=suporte
  --modo=contexto` matou em 1 comando uma dúvida que 3 leituras de foto não
  resolveram. É a ferramenta funcionando como projetada.
- **`--estrito` e a contagem de faces sem identidade.** Um número, sem eu
  procurar. Foi o gate que deu confiança na entrega.
- **`grita` / órfãos.** Os 6 órfãos da primeira execução nomearam passo, op e
  causa e não corromperam nada; e a tentativa com `chamferBox` falhou alto em
  vez de virar no-op. A lei do fail-closed está de pé.
- **Uma parte feita de várias primitivas.** Chamar `parte` com o mesmo nome em
  seleções diferentes (`pinca` = ponte + 2 garras; `disco` = pista + chapéu;
  `suporte` = placa + 2 orelhas) simplesmente funciona, e é barato.
- **`PARAMS` versus `TOPO`.** Os dois refinos de proporção foram `sed` em duas
  linhas de `MEDIDAS`, sem tocar em passo nenhum e sem renumerar nada. É o
  contrato entregando exatamente o que promete.
- **Nenhum id de vértice ou face.** Não contei vértice na mão em momento algum.

## Atritos resolvidos

### A-38 — a revisão apagava a evidência e fazia a IA remodelar para a câmera

**Onde doeu:** bancada e orquestração do fluxo assistido, não linguagem
geométrica.

**Evidência:** no A/B da dobradiça, o Sol assistido executou
`revisar:modelagem` oito vezes. Sete execuções capturaram quatro PNGs, mas uma
vista pequena fez o diretório temporário inteiro ser apagado; a oitava expirou
esperando a página. Como todas as vistas herdavam o raio 3D da montagem, uma
vista fina ficava pequena mesmo com a peça inteira no quadro. O agente abriu a
dobradiça e repetiu a revisão para satisfazer a câmera.

**Agravante documental:** o briefing combinou folhas de 1,20 m, altura total
máxima de 1,26 m e pino claramente visível além das duas extremidades. Restavam
no máximo 15 mm por lado. O guia de uma mudança por hipótese também não dizia
que essa disciplina começa depois da primeira revisão. As instruções não
causaram as sete recusas, mas transformaram a falha de câmera em pressão para
alterar a geometria.

**Correção — Revisão visual econômica v1:** o frustum ortográfico agora nasce do
envelope projetado de cada vista; a prontidão da página recebe uma repetição
automática; relatório e imagens de uma recusa são preservados em
`tentativas/<assinatura-do-modelo>/`; `tentativa.json` classifica `camera`,
`modelo` ou `ferramenta` e manda explicitamente não remodelar quando a falha não
é da peça. O mesmo estado não duplica artefato e uma revisão válida posterior
continua promovida atomicamente.

**Prova:** sem mudar nenhum vértice, a dobradiça assistida gerou `r002` em uma
execução e a crua gerou `r001` em uma execução; a vista superior antes recusada
da condição crua passou. `_caixote-filetado` e `freio-disco` passaram nas quatro
vistas. Testes cobrem enquadramento por vista, preservação, deduplicação,
classificação e promoção posterior.

**Lição geral:** gate visual que destrói a própria evidência não orienta
iteração; ele fabrica tentativa e erro. Falha de câmera, falha da ferramenta e
falha do modelo precisam de saídas diferentes antes de pedir outra alteração.

### A-31 — a peça declarava `liso` e a bancada mostrava chapado

**Onde dói:** adaptador de renderização (`src/autoria/adaptar-three.js`).

**Evidência:** a foto
`tools/bancadas/out/bancada-freio-disco-direita-sel-cubo-isolar-focado.png`. O
contorno dos quatro furos de prisioneiro serrilhava. A peça não tinha culpa: o
`freio-disco` já usa 12 lados nesses furos e já marca a parede como `liso`.
Medido no adaptador: das 540 faces do freio, 172 estão marcadas `liso`, e ainda
assim 100% dos triângulos da malha saíam com normal CHAPADA.

Foram duas causas independentes, as duas no adaptador e nenhuma no núcleo.

1. **Sombreado.** O adaptador nunca leu `face.liso`. Ele montava uma geometria
   NÃO INDEXADA e chamava `computeVertexNormals()`, que nesse caso devolve, por
   definição, a normal do triângulo repetida nos três cantos. A marca mais antiga
   do formato salvo não tinha efeito nenhum na bancada nem no galpão.

2. **Geometria.** O adaptador triangulava todo n-gon em LEQUE a partir do canto
   0, e leque só vale em polígono CONVEXO. A borda do furo não é: numa placa com
   um furo de 12 lados, 4 das 12 faces da borda são quads CÔNCAVOS. Neles o
   leque emitia um triângulo de área NEGATIVA — normal invertida, iluminada pelo
   lado errado por causa do `DoubleSide` — que ainda cobria área FORA do polígono
   e deixava o reflexo descoberto. Isso é defeito de forma, não de sombreado, e
   atingia toda face côncava de qualquer peça, não só a borda do furo.

**Correção:** a normal passou a ser POSTA em vez de recalculada. `liso` soma
normal por vértice do núcleo, e a soma varre SÓ as faces lisas — é isso que
impede a tampa do cilindro de entortar a lateral e é isso que dá à borda chapada
uma quina limpa contra a parede lisa. A soma é do estado neutro inteiro, antes
de partir em malhas por parte e material, para que troca de material não vire
costura. E o leque virou triangulação por ORELHAS no plano da face, que falha
alto quando o contorno não fecha.

**Prova:** `tools/mecanifica/normais-lisas.test.ts`, 15 casos, mais os PNGs de
antes e depois no mesmo enquadramento (vista direita e isométrica, furo de
perto). Três mutações rodadas na entrega: ignorar `face.liso` derruba 3 casos; somar sobre
TODAS as faces em vez de só as lisas derruba 2; voltar ao leque derruba 2. Uma
quarta mutação SOBREVIVEU e virou conserto: havia uma conferência que endireitava
a normal do triângulo contra a normal do plano, e ela mascarava o leque — a
aparência ficava certa e a área errada continuava lá. A conferência foi removida.

**Segunda leva de provas, depois da revisão.** Quatro frases que o adaptador
escrevia no comentário não tinham asserção nenhuma embaixo: com a suíte de 710
casos, estragar a linha correspondente deixava tudo verde. As quatro ganharam
fixture e mutação que as mata — a soma ser do estado NEUTRO inteiro (cilindro
liso partido por material), o peso por ÁREA (barril de altura 10 contra abinha
de 0,02), a queda para a normal CHAPADA quando a soma degenera (aba de
espessura zero) e a normal do TRIÂNGULO em vez da do plano (loft entre dois
quadrados a 45°). E o adaptador passou a ser atravessado pelo ACERVO INTEIRO em
`tools/mecanifica/acervo-adaptador.test.ts`: antes só cinco peças chegavam nele
em teste, e ele tinha ganhado três caminhos novos que LANÇAM.

**O que isto NÃO conserta:** a SILHUETA. Normal suave é sombreado. O contorno do
furo continua o polígono de `lados` arestas que a malha tem, e na vista direita
de perto dá para contar as 12 quinas. Esse resto NÃO fica enterrado aqui: ele
saiu com nome próprio como **A-34**, na lista de atritos ABERTOS.

### A-26 — um furo por face: um círculo de parafusos não cabe numa placa

**Onde dói:** linguagem da Oficina.

**Evidência:** a peça de exercício
`prototipos/fps/v3/pecas/_prateleira-furada.js`, escrita para provar a op `furo`
fora do vocabulário automotivo. A op consome a face de entrada — ela deixa de
ser um polígono e vira a borda anular do corte. Um SEGUNDO furo na MESMA face é
impossível: a face que ele citaria não existe mais. Na prática o autor teria de
descobrir em qual das `lados` faces da borda o segundo furo cai, o que é
endereçamento por acaso.

O custo é exatamente a figura mecânica mais comum que existe: um círculo de
parafusos numa placa, ou uma fileira de furos numa cantoneira. Hoje eles só
existem se cada furo cair numa face diferente. A peça de exercício foi desenhada
em volta dessa limitação — três furos, três faces distintas —, e isso está dito
nela em voz alta.

O `arranja` também não resolve: ele COPIA faces, não repete o corte. Arranjar a
origem de um furo daria seis cópias da geometria do furo flutuando, sem furar a
placa seis vezes.

**Contorno usado:** um furo por face, e o conjunto declarado por um ALIAS `unir`
juntando as faces que sobraram com as origens que os cortes publicaram — o
conserto que o próprio diagnóstico do núcleo recomenda.

**Segunda evidência, agora numa peça de PRODUTO (ciclo 4, fechamento):** o
flange de roda de `freio-disco.js`. Um flange de verdade é UMA chapa com quatro
furos. Aqui ele é uma chapa por prisioneiro: quatro assentos, cada um uma
primitiva própria, porque cada furo precisa de uma face de entrada só dele. A
forma resultante existe em cubo de roda real (flange lobado), então a peça não
ficou mentindo — mas a decisão foi da linguagem, não do desenho, e o custo é
visível na régua: a parte `cubo` tem cinco CORPOS onde deveria ter dois.

**Capacidade candidata:** o `furo` aceitar VÁRIOS centros num passo só (uma
lista, ou um arranjo declarado como o do `arranja`), abrindo N furos na mesma
face de uma vez, com a borda anular resolvida entre o contorno externo e os N
anéis. A numeração continuaria fechada (`lados` faces por anel, mais a borda),
mas a partição do polígono deixa de ser a volta simples de hoje. É geral: placa
de móvel, flange, cantoneira, chapa de robô e cubo de roda têm todos círculo ou
fileira de furos.

**Correção (ciclo "Furo v2"):** a chave `centros` da op `furo`, nas duas formas
que o autor mecânico usa para dizer a mesma coisa:

- `centros: [[x,y,z], …]` — a lista, um ponto do mundo por furo;
- `centros: {pivo, distancia, total, volta|graus}` — o círculo dito como frase.
  As palavras são as do `arranja` e significam a mesma coisa. "Quatro furos a
  62 mm do centro" é `{distancia:'orbitaDoParafuso', total:'parafusos',
  volta:360}`, e o arquivo se parece com a frase. Nenhum seno e nenhum cosseno
  entram no formato salvo: o círculo nasce no quadro (u,w) da própria face, e
  `orientacao` decide onde cai o furo 0. É por isso que esta forma também
  desarma o A-29 no caso do círculo de furos, sem tocar na gramática de PARAMS.

`centro` e `centros` dizem a mesma coisa em número diferente: as duas juntas
gritam, nenhuma das duas grita. `centro` singular segue byte a byte o que era —
`npm run gabarito:selecao:check` continua com as peças antigas idênticas.

O que a correção teve de resolver, e como:

- **a partição da face com vários anéis.** A borda anular de um anel só é a
  volta simples entre o contorno e o anel; com dois anéis ela não existe. A
  saída é uma triangulação por PONTES e ORELHAS, que não cria vértice nenhum —
  nenhuma face vizinha fica com um canto no meio de uma aresta dela (junção em
  T, que é fenda de malha). Contagem fechada: `n + M·L + 2M − 2` triângulos.
  A partição por células (uma por furo, cortada pelos eixos radicais) foi
  RECUSADA: além da junção em T, ela faz três células calcularem o mesmo ponto
  por três contas diferentes, e costurar isso exige solda por tolerância;
- **anéis que se cruzam.** Dois furos sobrepostos não são um furo em oito, e
  malha aberta que passa é o pior resultado possível. O teorema do eixo
  separador entre os dois polígonos decide, e ENCOSTAR conta como cruzar —
  vértice pinçado é malha errada e plausível na foto. A conferência é UMA, na
  entrada: a projeção do anel na face de saída é AFIM, então não pode aproximar
  anéis que a entrada separou. Isso está medido no teste da saída oblíqua, em
  vez de repetido como uma segunda conferência que nunca falharia;
- **identidade por furo.** O eixo `furo` da origem endereça cada furo do passo
  sozinho (`{op:'furo', id, furo:2, parede:0}`), e o eixo ausente continua
  querendo dizer "todos" — é o que faz o furo de um centro só responder palavra
  por palavra como sempre respondeu. A superfície da face que não toca anel
  nenhum ganhou nome próprio: `preenchimento` e `preenchimentoDaSaida`.

**Prova em peça:** `prototipos/fps/v3/pecas/_tampa-de-caixa.js`, fora do
vocabulário automotivo — tampa de caixa de inspeção com círculo de quatro
parafusos num passo e dois furos cegos de chave de pino em outro. A régua mede
253 faces, 0 sem identidade, 0 órfão e a chapa com UM corpo, que é exatamente o
custo que este atrito cobrava.

**Prova em peça de PRODUTO (rodada "Flange de uma peça só"):** o flange de
`freio-disco.js` deixou de ser uma chapa por prisioneiro. Ele é UM disco na
ponta do cubo, com os quatro furos abertos da mesma face em UM passo. Medido:

| | antes | depois |
|---|---|---|
| passos do trecho do flange | 7 | 4 |
| parâmetros do trecho | 9 | 5 |
| identidades estruturais | 6 (304–309) | 2 (304, 305) |
| CORPOS da parte `cubo` | 5 | 2 |
| faces da peça | 540 | 504 |
| envelope do `cubo` | x −0,070..0,032, y e z ±0,052 | idêntico |

E `prisioneiros` passou a bastar sozinho: a peça constrói com 3, 5, 6 e 8, com
zero órfão e sem um cosseno no arquivo. Era isto que o atrito cobrava, e o custo
tinha nome — cinco corpos onde deveria haver dois.

**O que a prova em produto ACHOU no núcleo:** a partição por pontes e orelhas
recusava a peça inteira. A face do flange é a tampa de um cilindro de 16 lados,
com 4 anéis de 12 lados a 90°, e 16, 12 e 4 são todos múltiplos de 4 — a
simetria põe o vértice de um anel EXATAMENTE em cima da aresta de uma orelha de
outro (produto vetorial 2,2·10⁻¹⁹, contra um eps de 10⁻¹²). "Em cima" não é
"dentro", então a orelha era cortada, engolia a lasca do outro lado da aresta e
deixava o resto do polígono com orientação invertida. O sintoma chegava longe da
causa: `a partição criou um triângulo de área nula ou invertida`, uma das três
provas de estado impossível que o próprio núcleo declarava não ter entrada capaz
de disparar. A orelha passou a recusar vértice em cima de qualquer uma das suas
três arestas, com o `pontoNoSegmento` que a ponte já usava. Varrendo 240
combinações de face × furo × total, 17 gritavam antes e 0 gritam depois. O
cabeçalho das três provas agora diz que aquela afirmação já foi falsa uma vez.

### A-28 — a origem do arranjo só sabia responder pela cópia INTEIRA

**Onde dói:** linguagem da Oficina.

**Evidência:** a tentativa de compor as duas capacidades do ciclo 4 numa peça de
produto. `furo` exige que `de` resolva para EXATAMENTE uma face — duas faces é
endereço ambíguo, e ambiguidade grita. A origem `{op:'arranja', id, de, copia}`
exigia que `de` fosse, chave por chave, o `derivaDe` declarado no passo
(`origensIguais`), e `derivaDe` de um sólido é o sólido inteiro. Logo a cópia de
um assento só sabia se apresentar com as 26 faces juntas, e não havia como
dizer "a face de fora da terceira cópia".

O efeito não estava escrito em lugar nenhum e nenhum teste o media, porque
nenhuma peça tinha tentado. Sem o conserto, o furo de prisioneiro do freio só
existiria com os quatro assentos declarados à mão, cada um com o seu par
`chamferBox` + `transladar` — a repetição que o `arranja` veio matar — ou com o
ângulo de cada cópia virando parâmetro de coordenada (A-29).

**Correção:** o portão da origem `arranja` deixou de ser a IGUALDADE da origem
declarada e passou a ser a PERTINÊNCIA das faces. `de` pode ser a fonte inteira
(como sempre) ou qualquer origem cujas faces sejam faces daquela fonte:
`{op:'arranja', id, de:{op:'chamferBox', id:S, face:'direita'}, copia:2}` é uma
face só, na cópia pedida. Citar algo que este arranjo não copiou continua
gritando, e o grito passou a nomear a face e a fonte.

É estritamente mais permissivo do que a igualdade — origem igual resolve para
todas as faces da fonte, todas no mapa —, então nenhuma citação já escrita mudou
de significado: `gabarito:selecao:check` ficou verde com as 24 peças anteriores
byte-idênticas.

**O que ele NÃO afrouxou, e a regra que sobrou:** o recorte é resolvido contra a
malha VIVA. Uma face da fonte já consumida por um corte derruba a citação da
cópia também — então, numa peça que fura a fonte E as cópias, a fonte é a
ÚLTIMA a ser furada. Isso está no comentário da op, na peça, e afirmado em
`tools/oficina/arranja-contrato.test.ts`.

**Prova:** 6 casos novos em `tools/oficina/arranja-contrato.test.ts` (8 → 14).
Duas mutações rodadas: repor o portão de igualdade derruba 5 casos; trocar o
grito de "não pertence à fonte" por um `continue` silencioso derruba 1.

### A-17 — repetição radial vira coordenada em massa

**Onde dói:** linguagem da Oficina.

**Evidência:** a variante
`prototipos/fps/v3/pecas/roda-dianteira-realista-experimento.js` precisava
declarar dez braços em cinco pares ao redor do eixo X. Como não existe
repetição radial nem trigonometria na gramática de parâmetros, a peça gerou cem
parâmetros de coordenadas (`10 braços × 5 raios × Y/Z`) e terminou com 141
parâmetros. A malha passou nos gates, mas a intenção “cinco pares radiais” ficou
escondida em expansão JavaScript e outro agente precisa reconstruí-la antes de
refinar abertura ou quantidade.

**Contorno:** calcular as coordenadas no módulo da peça e expandir dez passos
`loft`, preservando `origemId` individual em cada braço. É determinístico e
evita id cru, mas mistura um arranjo geométrico geral com a definição do objeto.

**Capacidade candidata:** `repetirRadial` e `repetirLinear` declarativos, com
eixo, quantidade, ângulo inicial, espaçamento e identidade semântica derivada por
instância. O contrato deve permitir endereçar a coleção e cada cópia sem depender
do índice do passo. É o O-13 de
[`OFICINA-OTIMIZACOES.md`](OFICINA-OTIMIZACOES.md) e serve igualmente para
pétalas, colunas, pás, dentes ou elementos abstratos.

**Confirmação fora do vocabulário mecânico:** as quatro paredes de
`prototipos/fps/v3/pecas/_jardineira.js` são quatro passos `chamferBox` +
`transladar` copiados, com quatro posições derivadas escritas uma a uma
(`paredeFrenteZ`, `paredeTrasZ`, `paredeDireitaX`, `paredeEsquerdaX`). A
intenção — "uma caixa de quatro paredes" — não está escrita em lugar nenhum. É
o mesmo A-17 dos braços da roda, num objeto que não tem eixo nem cubo: a
repetição linear dói igual em marcenaria.

**Correção (ciclo "Arranjos semânticos v1", O-13):** entrou a op `arranja`, nos
modos `radial` e `linear`. Ela é sempre estrutural — `origemId`, `derivaDe` e
`sel:{origem:...}` são obrigatórios —, então cópia anônima não é possível por
construção. A saída publica a origem `{op:'arranja', id, de}` com o eixo `copia`,
que aceita as mesmas formas dos outros eixos: ausente (a coleção inteira),
inteiro, nome de parâmetro, `'primeira'`/`'ultima'` ou filtro `{passo,fase}`.
Nenhuma dessas citações depende de id de face nem da posição do passo, e a prova
disso é um caso que insere um passo antes do arranjo e cobra a mesma cópia.

A contagem é `total`, contando a fonte — "cinco braços" é `total:5` —, porque
contar cópias obrigaria a escrever 5 para dizer seis, que é a mesma aritmética
escondida que o item veio matar. O ângulo da cópia `k` é `(k+1)·passo`, derivado
da contagem e aplicado sempre à posição da fonte; acumular somaria erro de ponto
flutuante dentro do arquivo salvo, e o teste mede exatamente a diferença entre os
dois doubles para que a afirmação não passe com as duas implementações.

**Correção na PEÇA (fechamento do mesmo ciclo, 31 de julho de 2026):** a roda
experimental foi reescrita com o arranjo, e a medida é a prova do item:

| medida | antes | depois |
|---|---:|---:|
| parâmetros (`PARAMS`) | 141 | 43 |
| destes, coordenadas `r0_..r9_` de seno/cosseno | 100 | **0** |
| passos (`PASSOS`) | 66 | 47 |
| passos de geração de instância (`loft`/`cubo`/`cilindro` repetidos) | 20 | 3 |
| partes nomeadas | 7 | 16 |
| faces / vértices | 2082 / 2184 | 2132 / 2194 |

Um braço é declarado no ângulo ZERO, onde Y é o raio nomeado e Z é zero — não
há seno nem cosseno em lugar nenhum do arquivo. `rotaciona` abre meia abertura
do par, um `arranja` cria o outro braço do par e dois `arranja` de volta fechada
replicam os dois em `gruposDeRaios` grupos. Os cinco recessos e as cinco porcas
seguem o mesmo caminho, um passo de arranjo cada.

Some junto uma distorção que ninguém tinha nomeado: a função `contornoChanfrado`
decidia, braço a braço, qual eixo do frame local do `loft` era o tangencial,
porque havia dez caminhos com dez direções diferentes. Com um caminho só, a
decisão deixou de existir.

Cada cópia continua endereçável: os dez braços são dez PARTES nomeadas
(`raioRecuadoDoGrupo3`), resolvidas por `{op:'arranja', id, copia}`. Recessos e
porcas ficam AGREGADOS de propósito, para a peça exercitar as duas formas — a
coleção inteira e a cópia isolada. Silhueta conferida na bancada em três
enquadramentos, idêntica à de antes.

**O que continua aberto, dito na cara:** a **confirmação em marcenaria acima
não foi paga**. As quatro paredes da `_jardineira` continuam quatro passos
copiados; elas formam um retângulo, então nenhum dos dois modos do `arranja`
resolve as quatro de uma vez, e mexer nela arriscaria as provas que ela já
sustenta. A prova não automotiva do arranjo entrou em peça nova
(`prototipos/fps/v3/pecas/_cerca-e-flor.js`). A ordem em que a coleção resolve
as faces segue determinística e sem afirmação, porque nenhum consumidor do
núcleo distingue essa ordem hoje.

### A-27 — não havia subtração: a peça era montada EM VOLTA do vazio

**Onde doeu:** linguagem da Oficina.

**Evidência:** a roda experimental, registrada em
[`RELATO-RODA-REALISTA.md`](RELATO-RODA-REALISTA.md), seção "Sem subtração ou
corte volumétrico". A linguagem não tinha nenhuma operação para abrir sulco
transversal, perfurar o miolo ou recortar bolsão. Todo vazio era CONTORNADO: a
abertura central saiu do perfil anular do miolo, as janelas entre raios saíram
de deixar o espaço em branco, e os fixadores viraram porcas SOBRE o miolo em vez
de furos. O custo aparece no que não foi modelado — o cubo do freio não tem furo
de prisioneiro e a roda não tem furo de fixação de verdade.

**Contorno usado:** material escuro sobre a superfície foi cogitado e recusado
(não é abertura, é pintura); a peça foi montada em volta do vazio.

**Correção (ciclo "Corte e orientação de seção v1"):** a op `furo` — um furo
cilíndrico numa face plana e convexa, PASSANTE (`saida`, a face por onde ele
sai) ou CEGO (`profundidade`, onde ele para).

A decisão central foi NÃO construir uma booleana genérica. Uma booleana destrói
a identidade de dezenas de faces de uma vez, em silêncio, que é exatamente o que
O-6 e O-12 vieram matar. `furo` toca só as duas faces que o autor nomeou por
origem estrutural; toda face criada nasce endereçável pela origem `furo`
(famílias `borda`, `parede`, `saida` e a tampa `'fundo'`); e toda face destruída
entra num registro de consumo que faz a citação seguinte GRITAR — inclusive a
citação de UNIÃO (`{op:'cubo', id}`), que antes pulava id morto em silêncio e
devolveria cinco faces das seis, plausível na foto.

O casamento entre o anel e os cantos da face cortada é ANGULAR, não por índice:
com índice a borda de um quadrado com furo central e `lados:8` sai com
quadriláteros reflexos, planos mas côncavos, que o leque de triangulação do
visor preenche torto. Isso tem afirmação em teste.

**Prova fora do assunto automotivo:**
`prototipos/fps/v3/pecas/_prateleira-furada.js` — tábua, parafuso passante,
encaixe de cavilha cego e puxador redondo vazado. 5 partes, 116 faces, 0 face
sem identidade, 0 órfão, 3 portas.

**Limite declarado:** um furo por face (A-26, aberto). Só furo CILÍNDRICO, só
face PLANA e CONVEXA, só na direção da normal — furo oblíquo, rasgo, bolsão e
sulco transversal continuam sem operação. Nenhuma peça de PRODUTO usa a op: o
cubo do freio continua sem prisioneiro.

**Lição geral:** a operação estreita e correta chega antes da geral e
traiçoeira. Cada caso real resolvido por ela é um caso a menos contornado no
arquivo da peça, e nenhuma identidade se perde no caminho.

### A-25 — o frame do `loft` era implícito, e a peça remontava o contorno

**Onde doeu:** linguagem da Oficina.

**Evidência:** a roda experimental, registrada em
[`RELATO-RODA-REALISTA.md`](RELATO-RODA-REALISTA.md), seção "Frame implícito do
`loft`". Uma seção RETANGULAR não conserva "largura tangencial" e "espessura
axial" em caminhos de direções diferentes: quem decidia para onde apontava o
eixo `+u` de cada anel era o TRANSPORTE PARALELO, isto é, o HISTÓRICO do
caminho. Com dez braços em dez direções, a função `contornoChanfrado` da peça
DETECTAVA a troca de eixo e REMONTAVA cada contorno, em código auxiliar dentro
do arquivo da peça.

O sintoma é o de sempre nesta série: a primeira rodada usou seção em DIAMANTE,
que é simétrica e por isso escondia o problema — e fazia os braços parecerem
hastes de bicicleta. A seção retangular, que era a certa para o assunto,
revelou a limitação. A ferramenta escolhendo a forma da peça.

**Contorno usado:** código auxiliar na peça, fora do formato salvo.

**Correção (ciclo "Corte e orientação de seção v1"):** a chave `orientacao`
(`[x,y,z]`, opcional) do `loft`. O AUTOR declara a direção do mundo para onde
aponta o `+u` de toda seção; ela é PROJETADA no plano de cada seção, então não
precisa ser perpendicular. Cada seção projeta a MESMA referência na PRÓPRIA
tangente: não há rotação propagada, então caminho torcido não gira o perfil e
duas seções com a mesma tangente têm a mesma seção — inclusive em caminhos
diferentes. Referência PARALELA à tangente de alguma seção, vetor nulo e
aridade ≠ 3 GRITAM e ABORTAM o passo inteiro (0 V/0 F); a chave nunca desempata
sozinha. Ausente, o transporte paralelo de sempre, byte a byte
(`gabarito:selecao:check` verde sem regravar).

**Limite declarado:** a chave é do `loft`. O `lathe` gira em torno de um eixo
fixo e não tem frame a declarar; `inflate` e as primitivas nascem alinhadas aos
eixos do mundo. A roda experimental **não** foi reescrita neste ciclo — a peça
continua com o contorno remontado em código, e quem a reescrever paga a dívida.

**Lição geral:** quando o gerador escolhe sozinho um grau de liberdade que o
autor consegue nomear, a escolha vaza para a peça como código auxiliar. Publicar
a escolha como argumento é mais barato que documentá-la.

### A-24 — o arranjo copia UMA origem, e nem todo gerador sabe dizer "a primitiva inteira"

**Onde doeu:** linguagem da Oficina.

**Evidência:** ao reescrever as cinco porcas da roda experimental com `arranja`.
O passo exige `sel:{origem:...}` direto — sem alias, sem união —, e a porca era
um `cilindro`. No contrato do `cilindro`, `{op,id}` sem eixo são só as
LATERAIS, por compatibilidade com peça já publicada; a primitiva inteira só
existe como união de três origens (laterais, tampa `fundo`, tampa `topo`). O
`cubo`, o `chamferBox`, o `cone`, o `lathe` e o `loft` têm o inteiro; o
`cilindro` e o `plano`, não.

O contorno óbvio — três `arranja`, um por família — passa em todo gate e é
errado: cada cópia sai com as tampas SOLTAS do tubo, porque os dois arranjos
alocam vértices próprios e nada os solda. A régua mediu **13 corpos no lugar de
5** na parte `fixadores`. Na foto é invisível: as tampas ficam exatamente sobre
a boca do tubo.

**Contorno usado:** a porca virou um `lathe` de seis lados com o perfil fechado
nos dois polos (`[[0,0],[r,0],[r,h],[0,h]]`). Uma origem, um arranjo, cinco
corpos. A troca é decisão de modelagem forçada pela ferramenta, e está escrita
no arquivo da peça como tal.

**Capacidade candidata:** dar ao `cilindro` e ao `plano` uma forma de citar a
primitiva inteira sem quebrar quem já cita `{op,id}` esperando as laterais —
por exemplo uma palavra explícita no eixo `tampa`. Alternativa mais geral:
`arranja` aceitar uma união de origens como fonte, criando UMA coleção com
vértices compartilhados. As duas mudam formato salvo e nenhuma entra num ciclo
já fechado. Não tem item em `OFICINA-OTIMIZACOES.md` ainda.

### A-23 — a palavra reservada de extremidade engolia um parâmetro homônimo

**Onde doeu:** linguagem da Oficina.

**Evidência:** medido na revisão adversarial do ciclo "Endereços semânticos v1".
Num `plano` com `seg: 3` e `PARAMS {ultima: 0}`, escrever `faixa: 'ultima'`
devolvia a última linha da grade, não a linha 0. A palavra reservada ganhava do
parâmetro do autor sem nenhum diagnóstico. Não era referência inválida, era
referência que resolvia para OUTRA coisa em silêncio — a classe que o
`CLAUDE.md` proíbe, e justamente a que o A-19 tinha acabado de fechar do outro
lado.

**Contorno:** nenhum, porque o autor não tinha como perceber. Nenhuma peça do
repositório declara parâmetro com esse nome, então o defeito estava latente.

**Correção (ciclo "Arranjos semânticos v1"):** a palavra continua reservada — ela
ganha —, mas a COLISÃO grita, com a causa nomeada e o conserto dito ("renomeie o
parâmetro"). Sem colisão nada muda: os dois caminhos seguem como estavam, e o
gabarito das 22 peças ficou byte-idêntico. A prova cobre `PARAM` e `TOPO` (os
dois entram no mesmo dicionário) e mais de um eixo, para a regra não valer só na
`faixa` do `plano`.

**Lição geral:** vocabulário fechado é decisão legítima; precedência silenciosa
sobre o dicionário do autor não é. Quem reserva palavra precisa gritar na
colisão, não vencer calado.

### A-18 — três geradores só sabiam citar a primitiva inteira

**Onde doeu:** linguagem da Oficina.

**Evidência:** a fixture não automotiva `prototipos/fps/v3/pecas/_jardineira.js`
queria três portas que a topologia declarada do núcleo já conhecia e que o
contrato de `origem` não expunha: a boca do botão de flor (`cone`), a borda da
soleira (`chamferBox`) e uma célula da terra (`plano`). Os três publicavam
`origem` só da primitiva inteira, apesar de terem numeração fechada, documentada
linha a linha e travada por teste. A justificativa do O-6 ("topologia sem grade
ou face nominal honesta") foi medida contra o núcleo e vale para **um** gerador:
`inflate`.

**Contorno usado na época:** publicar a porta com o nome honesto do que o
contrato alcançava (`soleiraDaJardineira`, `leitoDaTerra`) e registrar no
cabeçalho da peça o que não deu para nomear.

**Correção (ciclo Endereços semânticos v1):** cada um passou a citar o eixo que
a topologia já tinha, reusando as fábricas de contrato que já existiam em
`prototipos/fps/v3/motor/oficina.js`, sem vocabulário novo:

| gerador | estrutura reusada | eixos publicados |
|---|---|---|
| `cone` | a do `cilindro` (a cópia inline virou a fábrica `contratoLadoTampa`) | `lado` (as L laterais) e `tampa` — só `'fundo'`, porque o ápice é vértice, não face |
| `chamferBox` | a do `cubo` (a cópia inline virou a fábrica `contratoCaixa`) | `face` (as 6 nominais, mesma ordem do cubo) mais `aresta` (12) e `canto` (8) |
| `plano` | a grade `faixa`×`lado` do `loft` | `faixa` = linha em z, `lado` = coluna em x, a numeração `b + iz·seg + ix` |

`inflate` fica no contrato mínimo, e isso agora está escrito no código como
DECISÃO medida — a malha dele sai de um scan de voxels, sem fórmula fechada de
face. Publicar grade ali seria prometer região e entregar ordem de varredura.

**Prova na peça, não só no núcleo (mesmo ciclo).** `_jardineira` foi reescrita e
publica as três portas que ela queria e não conseguia — cada uma com o nome do
que alcança de verdade:

| porta | origem | o que alcança |
|---|---|---|
| `bordaDaFrenteDaSoleira` | `chamferBox:400 aresta 3` | UMA das 12 arestas do chanfro, a que fica entre `topo` e `frente`; o teste mede que ela corre a largura da soleira menos um chanfro em cada ponta |
| `faixaDaFrenteDaTerra` | `plano:402 faixa 'ultima'` | a última LINHA em z da grade, a tira de terra encostada na parede da frente |
| `assentoDoBotao` | `cone:405 tampa 'fundo'` | a tampa da base do cone. NÃO é "a boca da flor": o ápice é vértice, não face, e o teste trava que o assento cai exatamente sobre a `coroaDoCaule` |

Nenhum nome promete região que o contrato não alcance. `aresta 3` é literal de
propósito: a topologia do `chamferBox` é FIXA (26 faces, sem nenhum `TOPO`),
então o índice não envelhece como envelhecia o `faixa: 0` do bulbo — o caso do
A-19. A peça mudou de hash de propósito e o gabarito foi regravado só para ela.

**Aditividade:** `{op,id}` sem eixo continua devolvendo a primitiva inteira nos
três, e `gabarito:selecao:check` ficou verde sem regravar quando a mudança foi
só de núcleo (22 peças byte-idênticas). Por isso o `cone` responde a `{}` diferente do `cilindro`
(que devolve só as laterais): trocar o padrão faria toda citação de cone já
escrita apontar para outro conjunto sem diagnóstico nenhum — o erro que o A-19
condena. Aditividade manda mais que simetria, e a divergência está dita no
código.

### A-19 — o eixo de uma origem não aceitava expressão nem "o último"

**Onde doeu:** linguagem da Oficina.

**Evidência:** a mesma fixture quis publicar a porta `coloDoBulbo` sobre o leque
do polo NORTE da esfera, que é `faixa: bulboAneis - 1`. `validarEixo` exigia
`Number.isSafeInteger` e o eixo não passava por `st.num`, então ele era o único
campo dimensional da linguagem que não podia citar um parâmetro. `faixa: 3`
continuava **válida** apontando para outra faixa quando alguém mudava a
contagem: a referência não ficava inválida, ficava errada. O contorno foi
remodelar a peça para a porta cair na `faixa: 0` — foi a ferramenta que escolheu
a forma da peça, o mesmo sintoma do A-9.

**Correção (ciclo Endereços semânticos v1):** o eixo passou a aceitar, além do
inteiro literal, as duas formas que faltavam:

- **nome de PARAM/TOPO ou expressão `=…`**, pelo mesmo caminho `st.num` de todo
  campo dimensional;
- **palavra de extremidade**, `'primeira'` ou `'ultima'`, resolvida contra a
  contagem REAL do gerador naquele passo — "a última faixa" continua sendo a
  última quando a contagem muda.

Vale para todo eixo de índice da linguagem: `faixa`/`lado` de loft, lathe,
esfera e plano; `lado` de cilindro e cone; `aresta`/`canto` de chamferBox. As
duas palavras são RESERVADAS: um PARAM chamado `ultima` não é alcançável por um
eixo. Valor fora do contrato GRITA com a causa nomeada (não resolve / não é
índice / fora do limite) e não seleciona nada pela metade.

**A distorção foi DESFEITA (mesmo ciclo).** Não bastava a capacidade existir: a
peça continuava remodelada em volta da limitação. `coloDoBulbo` agora diz
`faixa: 'ultima'` — o leque do polo NORTE, que é o que a intenção sempre foi —,
e sumiram o `rotaciona` de meia-volta e o parâmetro `bulboMeiaVolta`, que
existiam só para pôr a `faixa: 0` para cima. A forma final do bulbo não mudou; o
que mudou é que a peça descreve a intenção em vez do contorno. Dois casos de
`tools/mecanifica/jardineira-integridade.test.ts` montam a peça com outro `TOPO`
(`bulboAneis` 5, `bulboLados` 16, `terraSeg` 6) e medem que o colo continua
sendo o polo de cima e a `faixaDaFrenteDaTerra` continua sendo a linha da
frente — é a contagem real resolvendo a palavra, não coincidência.

### A-21 — o gate de id cru reprovava a capacidade que a rodada acabara de shipar

**Onde doeu:** gate do projeto (`tools/bancadas/id-cru.mjs`).

**Evidência:** a primeira PEÇA a usar `publicarPorta`
(`prototipos/fps/v3/pecas/_jardineira.js`) foi reprovada por
`npm run id-cru:check` com "5 id(s) posicional(is) (5× de:[ids] (mescla))". A
peça não tem um único id posicional: os cinco "ids" eram as cinco portas.

Causa: desde o O-12 a chave `de` tem **dois** contratos — `mescla` lê
`de:[ids]` (coleção de vértice) e `publicarPorta` lê `de:{op,id,...}` (origem
estrutural, irmã de `sel:{origem}` e de `derivaDe`). O gate é op-agnóstico por
projeto e contava a chave, não a forma. Ninguém viu na R4 porque `publicarPorta`
só existia em teste unitário do núcleo: **nenhuma peça** usava a op, e o gate
varre `prototipos/fps/v3/pecas/`.

O contorno tentador era registrar `_jardineira` em
`tools/bancadas/id-cru-herdado.json` "de propósito", que é o que a própria
mensagem do gate sugere. Seria gravar como dívida a única peça do repositório
que usa a referência mais semântica da linguagem.

**Correção:** o discriminador passou a ser a FORMA, não o nome da op —
`de` conta como id cru a menos que seja objeto plano com `op` **e** `id`. Lista,
string, número e objeto sem esse contrato continuam contando, porque o gate não
pode ser mais permissivo que o núcleo. Travado em `tools/bancadas/id-cru.test.ts`
("de:{op,id} do publicarPorta é ORIGEM ESTRUTURAL, não id cru"), com as
contagens herdadas intactas (13 peças, 8244 ids congelados).

**Lição, que é a mesma do A-15:** capacidade provada só em teste de núcleo não
está provada. O A-15 achou a guarda no ouvinte do clique em vez do funil quando
o botão real foi acionado; aqui o gate do projeto reprovava a capacidade nova
quando uma peça real a usou. Nos dois casos o teste unitário estava verde.

### A-20 — porta publicada era invisível fora do núcleo

**Onde doeu:** conferência headless e ferramental.

**Evidência:** `nucleo()` devolvia `{V, F, orfaos, merges, partes, esqueleto,
pesos}` e **não** devolvia `st.portas`. Uma porta só existia enquanto a lista de
passos rodava: nem `npm run descrever`, nem a bancada, nem `adaptarThree` sabiam
que a peça publicou `peDoCaule`. `npm run bancada -- _jardineira` listava seis
componentes e nenhuma porta.

Consequência medida: para provar que `sel:{porta}` resolve depois da
transformação, `tools/mecanifica/jardineira-integridade.test.ts` teve que
**marcar cada porta com um material próprio** e ler a marca de volta. A prova
vale, mas é indireta — o teste afirma sobre `f.material`, não sobre a porta.

**Contorno usado na época:** materiais dedicados (`terraUmida`, `corteFresco`,
`peleDoColo`) e comentário explicando por que eles existem.

**Correção (ciclo Endereços semânticos v1), em duas metades:**

1. **o núcleo devolve** — `nucleo()` passa a devolver `portas`: Map nome ->
   `{nome, de, passo}`, ordenado por nome, com `de` clonado. Só o que foi
   DECLARADO. Fica fora do `neutroCanonico` de propósito: porta é contrato de
   autoria, não geometria, e o canônico é hash de peça;
2. **quem confere mostra** — `src/autoria/descrever-partes.js` ganha
   `portasPublicadas(neutro)` e uma seção `PORTAS PUBLICADAS` no relatório. O
   CLI `npm run descrever` e a bancada consomem DELE: uma verdade só sobre a
   mesma medida, e o módulo continua sem importar Three.js. Na bancada é um
   `<details>` fechado que some quando a peça não publica porta — uma linha
   quando há o que dizer, zero linha quando não há.

O que a régua mostra é a origem **declarada** (`cilindro:404 tampa=fundo`), não
as faces resolvidas. É decisão, não omissão: a resolução depende de quais passos
já rodaram quando a porta é citada, então congelar o fim da lista faria a porta
mentir sobre os passos anteriores. O vocabulário é o dos contratos que já
existem (`cubo`, `cilindro`, `tampa`) — nome publicado vira formato salvo, e
nome que promete região e entrega primitiva é pior que nome nenhum.

Medido: `npm run descrever -- _jardineira` imprime `portas: 8` e as oito linhas,
com o passo que publicou cada uma (eram cinco quando o A-20 foi consertado; as
outras três nasceram do A-18, no mesmo ciclo). Conferido no navegador em dois
enquadramentos, e numa peça sem porta (`freio-disco`), onde o bloco não aparece.

**A prova indireta acabou (mesmo ciclo).** O teste da fixture tinha 15 leituras
de `f.material` como procuração de porta; agora tem 0. Ele afirma sobre porta de
duas formas diretas: lê `neutro.portas` para checar o que a peça DECLARA (nome,
origem clonada e o passo que publicou cada uma) e monta a peça com um passo de
SONDA no fim da lista — `['material', {sel:{porta}}]` — para medir o que a porta
ALCANÇA depois de todas as transformações. A citação passou a ser do teste, não
uma marca deixada na peça. Consequência colhida: os materiais que sobraram na
`_jardineira` foram conferidos um a um e nenhum é marcação — cada um é uma
citação com função de autoria, e três portas ficam publicadas sem citação
nenhuma, porque material inventado só para o teste ler de volta não é autoria.

**Continua fora:** `adaptarThree` não expõe portas. Ele converte geometria para
cena, e porta é contrato de autoria; quem precisa de porta lê o neutro. Se um dia
a apresentação precisar citar porta, isso vira atrito próprio com evidência
própria.

### A-22 — a mesma regra copiada em três lugares, e as três divergiram

**Onde doeu:** linguagem da Oficina (o funil de salvamento).

**Evidência:** medido na verificação de fechamento da Fundação de autoria v1,
dirigindo a Oficina real com Playwright. Abrir `oficina.html?peca=_jardineira` e
clicar em "Salvar peça" **sem editar nada** devolvia:

```
não salvo: a Oficina ainda não consegue exportar esta edição semanticamente
(5 referência(s) posicional(is))
alerta: passo 1: de:[ids] | passo 11: de:[ids] | passo 14: de:[ids]
        passo 18: de:[ids] | passo 19: de:[ids]
```

Os cinco passos acusados eram os cinco `publicarPorta` da peça, que são origem
**estrutural**, não coleção de id. A peça está no repositório, passa
`npm run id-cru:check` e é justamente a prova não automotiva do O-12. A
ferramenta de autoria do projeto recusava uma peça que o CI do projeto aprova, e
recusava exatamente a capacidade que o ciclo anterior tinha entregado.

Causa: a mesma regra vivia copiada em TRÊS lugares — o gate
`tools/bancadas/id-cru.mjs`, `diagnosticarExportacaoIncompativel` em
`prototipos/fps/v3/oficina.html` e a recontagem "independente" de
`tools/mecanifica/guarda-salvar-oficina.mjs`. O conserto do A-21 desceu só para
o gate. E o oráculo do harness não acusou a divergência porque **errava igual à
guarda**: prova duplicada não é prova independente quando as duas cópias saem da
mesma fonte.

**Correção feita no ciclo Endereços semânticos v1:** uma regra só, em
`prototipos/fps/v3/motor/referencia-posicional.js`, então importada pelos três.
Consertar a terceira cópia teria funcionado até a próxima divergência; a chave
`de` já tinha divergido duas vezes.

**Estado atual:** os dois consumidores da Oficina e o harness foram removidos.
O módulo permanece porque o gate `id-cru` ainda o usa, e o teste headless cobra
identidade de função em vez de manter uma segunda implementação.

**Por que o módulo foi posto ali na época:** dentro de `prototipos/fps/v3/`, não em
`src/autoria/`. A Oficina era uma página servida com RAIZ em `prototipos/fps/v3/`
(`tools/servir.mjs`), e um import que suba para `src/` sai da raiz servida e
404 no navegador — medido antes de escolher o caminho. Módulo compartilhado que
a página não consegue carregar não é regra única: é a quarta cópia. O arquivo
não importa nada, nem Three.js nem o núcleo, e roda igual em Node e no
navegador.

**O que o harness passou a ser na época:** ele provava a INSTALAÇÃO da guarda — que o botão
real, o gancho `window.__oficina.salvar()`, o POST e o fallback de download
passam por ela. Que a REGRA classifica certo é
`tools/mecanifica/referencia-posicional.test.ts`, headless e barato. Cada prova
no seu lugar, em vez de uma cópia fingindo ser a segunda opinião.

**Prova, pelos dois lados e pelo botão real** (`npm run guarda:salvar`, 20
afirmações): `_jardineira` abre na Oficina e Salvar grava (1 POST, arquivo em
disco byte-idêntico ao serializado, 0 alerta); a mesma edição posicional de
verdade (`['solido',{faces:[0]}]`, gravada pelo clique em "marcar sólido")
continua recusada, sem POST e sem download. Um teste extra impede a quarta
cópia de nascer: ele lê os três consumidores e reprova se algum voltar a
declarar a lista de chaves na mão.

**Lição geral:** a mesma regra escrita duas vezes é um defeito com data marcada,
mesmo quando as duas cópias começam idênticas. Vale para qualquer projeto que
valide o mesmo artefato no editor e no CI.

### A-2 — enquadrar montagem e seleção eram a mesma ação

**Correção:** `F` e o botão `Enquadrar tudo` agora usam a raiz da montagem,
enquanto `Focar seleção` continua usando os componentes escolhidos. A seleção
não é apagada em nenhum dos dois casos. A prova headless cobre os dois alvos em
`tools/mecanifica/estado-bancada.test.ts`.

### A-3 — destaque verde encobria material no isolamento

**Correção:** o modo `isolar` conserva a seleção na árvore, mas renderiza as
partes visíveis com seus materiais restaurados. A imagem
`bancada-freio-disco-isometrica-sel-disco-isolar.png` confirma que o disco não é
mais tingido de verde; montagem e contexto ainda usam realce para orientar.
