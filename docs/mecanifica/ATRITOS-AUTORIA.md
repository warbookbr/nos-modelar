# Atritos de autoria — o que dói ao modelar

Registro das dificuldades observadas quando alguém — pessoa ou agente — modela
de verdade. Existe porque o `PLANO.md` manda que capacidade nova nasça de
dificuldade observada, não de lista especulativa de operações.

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

## Atritos abertos

### A-1 — enquadramento livre não volta pela URL

**Onde dói:** bancada.

**Evidência:** ao orbitar, `vistaAtual` vira `livre` e
`salvarEstadoNaUrl` grava `isometrica` no lugar
(`src/bancada/main.js`). `npm run bancada -- --focar` avisa que o recorte
fotografado não está no endereço que ele mesmo imprime.

**Contorno:** só usar as sete vistas canônicas como evidência compartilhável.

**Capacidade candidata:** registrar câmera e alvo na URL com precisão fixa, para
que qualquer enquadramento — não apenas os canônicos — seja reproduzível. Vale
para qualquer inspetor 3D, não só para a Mecanifica.

### A-2 — não há como reenquadrar o conjunto com algo selecionado

**Onde dói:** bancada.

**Evidência:** `btnEnquadrar` ("Enquadrar", `F`) e `btnFocarSelecao`
("Focar seleção") chamam a mesma `focarSelecao()`. O contrato em
`BANCADA-E-APRESENTACAO.md` pede enquadramento do conjunto **ou** da seleção;
hoje é preciso limpar a seleção para rever o todo, e aí se perde a seleção.

**Contorno:** anotar os nomes à mão antes de limpar.

**Capacidade candidata:** separar "enquadrar tudo" de "enquadrar seleção", sem
que uma ação destrua o estado da outra.

### A-3 — destaque verde encobre o material da peça isolada

**Onde dói:** bancada.

**Evidência:** `bancada-drone-inspecao-direita-sel-lente-isolar-focado.png` — a
lente isolada aparece inteira em verde, então a inspeção de forma e material
acontece sobre uma cor que não é a da peça.

**Contorno:** olhar a mesma vista sem isolamento para conferir cor.

**Capacidade candidata:** quando a seleção é a única coisa visível, o destaque é
redundante; o realce deveria virar contorno em vez de tingir a superfície.

## Rodada 1 — freio a disco

Sessão de modelagem de `prototipos/fps/v3/pecas/freio-disco.js` (Fase 3), sem
navegador: só a Oficina para escrever e `npm run bancada` para olhar. Regra da
rodada: **não consertar a ferramenta**, apenas contornar e registrar.

Números da peça, para dar escala ao que vem abaixo: 52 passos, 13 primitivas,
61 parâmetros (28 independentes, 12 nós do caminho da mangueira, 21 derivados),
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

**Escrita da peça (1 vez, sem reescrever nada).** Escrevi o arquivo inteiro de
uma vez e ele rodou na primeira execução com **6 órfãos** — todos da mesma
causa: o alias `discoInteiro` (pista + chapéu) foi citado num `transladar` que
acontece **antes** de o chapéu existir. Alias é resolvido no momento da citação,
então um nome de conjunto não pode ser escrito antes de todas as suas peças
existirem. Corrigi criando dois aliases por primitiva (`discoPistaInteira`,
`discoChapeuInteiro`) e usando o agregado só no `parte`. **1 iteração.** Depois
disso: 0 órfãos, 266 V, 180 F, contagem batendo com a conta feita no papel.

**Coordenada chutada: quase nenhuma, e isso foi de propósito.** Não fiquei
mexendo em número e conferindo na foto. Montei um bloco de 21 medidas
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

**Evidência:** 21 dos 61 parâmetros da peça são derivados, e todos são
calculados em JS puro num bloco `DERIVADAS` no topo do arquivo, porque um passo
só aceita nome de parâmetro ou número literal — não há como escrever
`-($discoEspessura/2 + $folgaPastilha + $pastilhaEspessura/2)` onde ela é usada.
O efeito colateral é sério: essas 21 medidas **não são editáveis pela Oficina**.
Quem reabrir o arquivo pela ferramenta vê 61 números soltos e não sabe que 21
deles são consequência dos outros 40 — e mudar `folgaPastilha` pela interface
não moveria a pastilha.

**Contorno:** o bloco `DERIVADAS`, com um comentário por linha dizendo qual
encaixe cada derivada garante, e 7 testes que reprovam se a derivação romper.

**Capacidade candidata:** `derivarParametro` com expressão validada e ciclo
detectado (item 5 das regras do `AUTORIA-IA.md`), guardada no documento — de
modo que a derivação seja formato salvo e não código de acompanhamento. É a
capacidade mais reaproveitável desta rodada: nada nela sabe o que é um freio.

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

Nada ainda. Uma entrada sai de "abertos" quando a mudança está no repositório e
provada; a evidência da prova fica junto.
