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

### A-16 — a régua por envelopes não reconhece encaixe oco

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

**Evidência:** quem modela em `prototipos/fps/v3/oficina.html` e clica Salvar
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

**Estado (Fundação de autoria v1 — CONTINUA ABERTO):** a Oficina agora recusa
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

O atrito fecha quando a interface souber gravar `sel:{alias|origem|porta|...}`
no momento em que grava o passo — não antes.

**Provado pelo botão real, e o que a prova achou.** `npm run guarda:salvar`
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

**Correção (ciclo Endereços semânticos v1):** uma regra só, em
`prototipos/fps/v3/motor/referencia-posicional.js`, importada pelos três.
Consertar a terceira cópia teria funcionado até a próxima divergência; a chave
`de` já tinha divergido duas vezes.

**Onde o módulo mora, e por quê:** dentro de `prototipos/fps/v3/`, não em
`src/autoria/`. A Oficina é uma página servida com RAIZ em `prototipos/fps/v3/`
(`tools/servir.mjs`), e um import que suba para `src/` sai da raiz servida e
404 no navegador — medido antes de escolher o caminho. Módulo compartilhado que
a página não consegue carregar não é regra única: é a quarta cópia. O arquivo
não importa nada, nem Three.js nem o núcleo, e roda igual em Node e no
navegador.

**O que o harness passou a ser:** ele prova a INSTALAÇÃO da guarda — que o botão
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
