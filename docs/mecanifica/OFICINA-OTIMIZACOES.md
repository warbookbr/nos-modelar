# Otimizações da Oficina para autoria por IA

Análise e **plano de implementação** das mudanças na linguagem de autoria. A
divisão de trabalho entre os documentos é:

- [`ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md) registra a **dor observada** (A-1 a
  A-14) — é a evidência;
- [`UPSTREAM-NOS.md`](UPSTREAM-NOS.md) registra a **candidatura ao NÓS** (UP-008
  a UP-013) — é a portabilidade;
- este documento decide **o que muda, em que ordem, a que custo e provado como**
  — é o plano.

Escopo: o núcleo de autoria (`prototipos/fps/v3/motor/oficina.js`) e a
documentação que ensina a usá-lo. Os atritos da bancada (A-1, A-2, A-3, A-12,
A-14) ficam no registro de atritos; deste lado entra só o que a autoria precisa
para **medir em vez de olhar** (A-13).

## Diagnóstico

A Oficina tem 26 operações para **fazer** geometria e um mecanismo fraco para
**apontar** para ela. O custo de autoria é dominado pelo endereçamento e pela
conferência, não pela modelagem.

Os números da rodada do freio a disco sustentam isso:

| medida | valor |
|---|---|
| passos que só transportam primitiva da origem até o lugar | 16 de 52 (31%) |
| parâmetros derivados calculados fora do envelope salvo | 21 de 61 |
| geradores que publicam `origem` endereçável | 4 de 8 |
| passos que repetem uma forma já escrita antes na lista | 43 de 52 (83%) |
| leituras de PNG para responder "o eixo está em X?" | 4, nenhum defeito achado |
| linhas do núcleo lidas antes da primeira linha da peça | ≈500 |
| iterações gastas escrevendo a geometria em si | 1 |

As duas últimas linhas juntas são a tese deste plano: **escrever a peça foi
barato; descobrir onde apontar e conferir o resultado foi caro.**

## Calibração desta lista

Os itens O-2, O-3 e O-4 vieram de leitura de código, antes da rodada. Todos os
outros vieram da rodada, e são melhores do que a leitura estática produziu — ela
não sugeriu que a ausência de `origem` em `chamferBox` **decidiria a forma da
peça**, nem que um terço dos passos seria transporte. O método vale mais que a
inspeção; a ordem abaixo é medida, não adivinhada.

## Cobertura

Nenhum atrito de autoria fica sem plano:

| atrito | item | atrito | item |
|---|---|---|---|
| A-4 primitiva presa à origem | O-7 | A-9 geradores sem `origem` | O-6 |
| A-5 sem expressão no passo | O-5 | A-10 porta geométrica | O-12 |
| A-6 `encostar` não existe | O-8 | A-11 partes planas | O-10 |
| A-7 alias resolvido na citação | O-11 | A-13 foto sem escala | O-1 |
| A-8 só se nomeia escalar | O-9 | documentação incompleta | O-0 |

O-2, O-3 e O-4 não têm atrito correspondente: são defeitos achados no código que
a rodada não exercitou. Ficam na Faixa 1 porque são redes de segurança baratas.
O-13 e O-14 saíram da validação deste plano contra o código, descrita abaixo.

## Validação contra o código

Este plano foi conferido linha por linha contra `motor/oficina.js` e as 18 peças
do repositório. Resultado: os números se sustentam, com uma correção e dois itens
novos.

**Medido e confirmado.** 52 passos e 16 de transporte (31%) no freio, em medição
de runtime — a contagem por texto acha 0 `rotaciona` porque um helper local os
gera, e é a medição de runtime que vale. 61 parâmetros, 17 aliases.
`CONTRATOS_ORIGEM` tem exatamente 4 geradores (`cubo`, `cilindro`, `lathe`,
`loft`) mais a transformação `espelha`. `num()` aceita só número ou nome de
parâmetro. Os 7 seletores. `f.parte` string plana. Alias sem encadeamento,
resolvido na citação. A skill sem nenhuma menção a `ALIASES`, `sel:{alias}` ou
`unir`.

**Uma afirmação estava errada** e o O-1 abaixo já está corrigido: `adaptarThree`
**não** calcula caixa por parte — ele calcula caixa por *malha*, via Three.js, que
é o lado errado da fronteira para uma ferramenta headless. O bloco reaproveitável
existe em outro lugar: a função `caixa(parte)` de
`tools/mecanifica/freio-disco-integridade.test.ts` calcula a caixa a partir do
neutro, sem Three. O O-1 é sobretudo **extração**, não construção.

**Dois itens novos:** O-13 (repetição) e O-14 (ops fora da rede do gabarito).

---

## Faixa 0 — documentação, antes de tocar em código

### O-0 — a documentação de autoria omite o caminho semântico

**O que muda:** `.claude/skills/criar-peca/SKILL.md` documenta bem os geradores,
o pivô default e o fato de as primitivas nascerem presas à origem. Mas **não
menciona `ALIASES`, `sel:{alias:...}` nem `unir` uma única vez** — e são
justamente os três recursos que tornam uma peça escrevível sem id de face. Pior:
a skill lista os seletores em dois pontos e os dois omitem `alias`; um deles
recomenda explicitamente "use `grupo`, `origem` ou **ids**" — sugerindo a única
referência que o `CLAUDE.md` proíbe.

**Por que primeiro:** foi o que custou mais tempo na rodada sem produzir nada. O
agente descobriu os aliases por acidente, lendo `pecas/drone-inspecao.js` porque
queria um modelo de arquivo, e só então leu ≈500 linhas do núcleo para decidir
quatro coisas. Se tivesse confiado no manual, teria escrito a peça com listas de
faces — exatamente o resultado que este projeto quer evitar.

**Trade-off:** nenhum. É o item de melhor retorno por minuto do plano inteiro.

**Escopo:** documentar `ALIASES`/`sel:{alias}`/`unir` com exemplo; corrigir as
duas listas de seletores para incluir `alias` e parar de sugerir id cru; registrar
que `origem` sem `face` já seleciona a primitiva inteira (recurso existente que
nenhuma peça legada usa); e apontar quais geradores publicam `origem` — hoje isso
só se descobre lendo `CONTRATOS_ORIGEM`.

---

## Faixa 1 — aditivo, barato, mata classe inteira de retrabalho

Nada aqui muda o formato salvo e nenhum item quebra peça existente. É pré-requisito
das outras faixas: sem O-1 as capacidades seguintes seriam julgadas no olho.

### O-1 — descrição headless mensurável (`descrever`)

**O que muda:** um comando que imprime, por parte semântica, caixa, centro,
dimensões, contagem de faces e a folga ou interpenetração com as outras partes.

**Por que é o primeiro de código:** não por ser barato, mas por ser
**instrumento**. A-13 mediu 4 leituras de PNG e perícia de pixel para responder
uma pergunta geométrica trivial, e a resposta veio de uma medição em Node **fora**
da bancada. Foto não tem escala nem gnômon de eixo. Julgar seleção relacional
(O-8) por foto seria repetir o erro sobre uma mudança bem mais arriscada.

**Trade-off:** nenhum relevante — é ferramenta, não formato. Exige apenas saída
determinística, para virar teste.

**Custo:** baixo, e menor do que parecia: a função `caixa(parte)` de
`tools/mecanifica/freio-disco-integridade.test.ts` já faz a medição headless a
partir do neutro. O trabalho é **extrair** aquilo para um módulo neutro e
consumi-lo do CLI e do painel da bancada. Não usar o `adaptarThree` para isso é
deliberado: a caixa dele é por malha e depende de Three.js.

### O-2 — reatribuir `parte` passa a gritar

**O que muda:** `parte` hoje faz `st.F.get(fid).parte = nome` com "última
atribuição vence", sem diagnóstico. Passa a gritar quando a face já pertence a
outra parte, salvo `substituir: true` explícito.

**Por que:** é a pior classe de defeito — resultado errado que passa. Duas caixas
de região sobrepostas e uma parte perde faces caladamente; a bancada mostra a
*contagem* de faces sem nome, nunca as roubadas.

**Trade-off:** nenhum, e foi medido: instrumentando `parte` e construindo as 18
peças do repositório, **zero faces são reatribuídas**. O comportamento silencioso
nunca é exercido, então o diagnóstico é de graça.

**Custo:** trivial.

### O-3 — `regiao` com `modo: 'toca' | 'contem'`

**O que muda:** `sel.regiao` só seleciona face quando **todos** os vértices estão
na caixa (`f.vs.every(dentro)`); face meio dentro é silenciosamente ignorada.
Entra `modo`, com `contem` como padrão.

**A validação achou o argumento mais forte:** o mesmo seletor já se comporta de
duas maneiras. Vértice entra se estiver dentro; face só entra se **toda** ela
estiver dentro. Ou seja, `regiao` já é `toca` para vértice e `contem` para face —
uma op de vértice e uma op de face com a mesma caixa selecionam conjuntos
diferentes, e nada no formato diz isso. `modo` não inventa comportamento novo:
torna explícito o que já existe implícito.

**Por que:** é a origem clássica do ciclo "alarga a caixa, refotografa". O efeito
apareceu na rodada de forma indireta e pior: o freio não usa `regiao` **nenhuma
vez** — 19 `alias`, 10 `grupo`, 7 `origem`. O autor não consertou a caixa, evitou
o seletor. Nas peças legadas, `parte` é nomeada por `regiao` 18 vezes contra 11
por `alias`.

**Trade-off:** `contem` como padrão preserva o gabarito byte a byte; o custo é uma
chave a mais no formato salvo.

**Custo:** baixo.

### O-4 — gate contra id cru em peça nova

**O que muda:** as formas de coleção de id continuam sendo lidas, mas um gate
reprova **peça nova** que as use.

**Por que:** o `CLAUDE.md` proíbe id posicional como referência persistida e o
formato aceita — 108 usos em 11 peças legadas. A rodada provou que o caminho
semântico basta: o freio tem **0** ids crus.

**Trade-off:** remover de vez quebraria 11 peças e o gabarito. O gate separa
dívida herdada de dívida nova, sem migração forçada.

**Custo:** baixo.

**O que a revisão adversarial corrigiu depois.** A primeira versão do gate media
a coisa errada duas vezes, e as duas com aparência de número exato:

- cobria **três** formas de coleção e declarava que eram todas. O núcleo tem
  **seis** — faltavam `vs:[ids]` do `pesar`, `pontos:[{f}]` do pincel macio e
  `de:[ids]` do `mescla`, esta última declarada como forma *singular* sendo
  coleção. `_oficina-esqueleto` já carregava 24 ids de vértice que a lista
  congelada registrava como `selV: 0`: o gate deixava passar exatamente a classe
  que veio proibir, em toda peça com esqueleto;
- contava **passo**, não id, enquanto o cabeçalho prometia contagem exata nos
  dois sentidos. `faces:[0,1]` e `faces:[0..19]` davam o mesmo número, então a
  `moto` podia decuplicar a dívida sem sair dos 37 passos congelados.

A correção conta id, cobre as seis formas, e trava o inventário com um teste que
varre `a.<chave>` dentro de `OPS`: chave nova no núcleo quebra o teste e obriga a
classificar a chave como coleção, singular ou não-id. A medida verdadeira é
**8244 ids** em 13 peças, não 131 passos. As formas singulares (`face`, `v`,
`a`/`b`, `para`) seguem fora de escopo, agora com a lista completa e verdadeira.

**Onde o O-4 encosta na Oficina (A-15).** A interface só sabe salvar por id
posicional e grava no diretório que o gate varre, então toda peça salva pela
Oficina reprova. A decisão é não afrouxar o gate e não ensinar a interface a
emitir referência semântica aqui — isso é R4/R5. O que se corrigiu foi a
**mensagem**, que mandava endereçar por `sel:{alias|grupo|origem|regiao}` sem
dizer que isso é impossível pela interface e impossível no núcleo para
`vs`/`pontos`/`de`. Remediação inexistente é pior que remediação nenhuma.

### O-11 — diagnóstico de completude de alias

**O que muda:** citar um alias de conjunto antes de todas as suas primitivas
existirem produz órfão correto mas confuso. O diagnóstico passa a dizer *quando* o
alias fica completo: "o alias `discoInteiro` fica completo no passo 31; você citou
no passo 18".

**Por que:** A-7. Foi a única iteração perdida na escrita da peça, e a causa é
modelo mental: o autor pensa "o disco" como uma coisa só, mas o alias só é
conjunto depois do último passo que o compõe. O contorno inflou a peça para 17
aliases servindo 8 partes.

**Trade-off:** a versão barata é só mensagem — aditiva, sem risco. Resolver o
alias **tarde** (exigir completude apenas no fim da lista) é mudança de semântica
do formato salvo e fica para a Faixa 3, se a mensagem não bastar.

**Custo:** baixo na versão diagnóstico.

### O-14 — quatro ops ficam fora da rede do gabarito

**O que muda:** `apagaFace`, `moveA`, `moveF` e `vira` não são usadas por
**nenhuma** das 18 peças do repositório. Ou se prova cada uma numa peça, ou se
remove do vocabulário.

**Por que:** o `gabarito:selecao:check` é a rede que garante que mudança no núcleo
não altera resultado de peça shipada — e ele só cobre o que as peças exercitam.
Essas quatro ops têm teste unitário (`vira` tem bastante), mas nenhuma passa pela
prova de byte-identidade. Numa rodada que mexe no núcleo, são o ponto cego — e as
rodadas R3 a R9 mexem todas no núcleo.

**Trade-off:** provar custa uma peça de exercício por op; remover é mais barato mas
descarta capacidade útil (`apagaFace` é a única forma de abrir um vão, e `vira`
conserta normal invertida). Recomendo **provar `apagaFace` e `vira`** — as duas têm
uso mecânico previsível, e furo é justamente o que falta ao freio — e decidir sobre
`moveA`/`moveF` depois, à luz do O-8: parte do que elas fazem à mão é o que a
restrição relacional passa a fazer sozinha.

**Custo:** baixo.

**O que a revisão adversarial corrigiu depois (ALTA-2).** A skill `criar-peca`
afirmava, em negrito, que **sete** ops de geometria só aceitam id literal e que
**nenhuma** aceita `sel` — listando `apagaFace` entre elas. Medição op por op
contra o núcleo: **seis** das sete estavam certas (`moveV`, `moveF`, `moveA`,
`vira`, `extruda`, `mescla`; `pesar` idem, no skinning) e **uma estava errada**.
`apagaFace` implementa o ramo `sel` completo — resolve a seleção, exige
exatamente uma face, grita em ambiguidade e em seleção vazia — e é justamente a
op que este item mandou provar, pela razão de ser a única que abre um vão. O
manual empurrava para `['apagaFace', { face: 4003 }]` exatamente onde o caminho
semântico existe, e o gate do O-4 não pega porque `face` é forma SINGULAR,
declarada fora de escopo. A skill foi reescrita com o que o código diz, com a
forma semântica no lugar do id, e a afirmação passou a ser **medida**: o teste
`tools/bancadas/skill-criar-peca.test.ts` executa cada op citada só com `sel` e
cobra da prosa — doc que discordar do núcleo quebra o teste. Achado irmão, na
mesma medição: `mescla` com `para` válido e `de` ausente volta **calado** (0
órfão, 0 mudança), o único no-op silencioso das seis; registrado na skill como
armadilha e candidato a grito numa rodada que toque o núcleo.

---

## Faixa 2 — muda a linguagem, alto retorno

Daqui em diante cada item toca o formato salvo ou o contrato de referência. Cada um
pede rodada própria.

### O-5 — expressão dentro do passo

**O que muda:** um passo aceita hoje número literal ou nome de parâmetro
(`num()`), nada mais. Passa a aceitar expressão aritmética sobre parâmetros
nomeados.

**Por que:** A-5. As 21 medidas derivadas do freio vivem num bloco JS no topo do
arquivo, isto é, **fora do envelope salvo** — quem reabrir pela Oficina vê 61
números soltos e não sabe que 21 são consequência dos outros 40; mudar
`folgaPastilha` pela interface não moveria a pastilha. No drone o sintoma é mais
bobo e igualmente revelador: `afastamentoRotorX: 0.78` convive com
`afastamentoRotorXNeg: -0.78`, gêmeo calculado à mão.

**Trade-off:** exige parser aritmético próprio com nomes em lista branca —
**nunca `eval`** — e resultado determinístico em precisão fixa, senão o gabarito
deixa de ser comparável entre sistemas. É o preço de trazer a derivação para dentro
do formato.

**Custo:** médio.

### O-6 — `origem` em todo gerador

**O que muda:** dos 8 geradores, só `cubo`, `cilindro`, `lathe` e `loft` publicam
`origem`. `chamferBox`, `esfera`, `cone` e `plano` não são endereçáveis por nome.

**Por que:** A-9 é o achado mais incômodo da rodada. A pinça e o suporte são peças
fundidas e `chamferBox` é literalmente o gerador do assunto; foram escritas com
`cilindro` e `cubo` porque sem `origem` só sobra caixa de coordenada chutada.
Medido: usar `chamferBox` custaria 3 órfãos e 26 faces sem identidade. **A
ferramenta escolheu a forma da peça** — o pior tipo de decisão.

**Trade-off:** cada gerador precisa declarar seu contrato de faces nomeadas, e
esses nomes passam a ser formato salvo — nomear mal agora custa migração depois.

**Custo:** médio, paralelizável por gerador.

### O-12 — porta semântica no quadro local (`publicarPorta`)

**O que muda:** as portas de uma primitiva têm nome geométrico (`topo`, `fundo`) e
no quadro global. Passa a existir porta com nome do autor, resolvida no quadro
**local** da primitiva, sobrevivendo a transformações.

**Por que:** A-10. As duas pistas de frenagem do disco são, para o núcleo, as
tampas `fundo` e `topo` de um cilindro; depois do `rotaciona z −90`, `fundo` é a
pista de dentro e `topo` a de fora, e nada no documento diz isso. Pintar a pista
errada não muda a silhueta — é erro invisível na foto. O contorno (aliases
`pistaInterna`/`pistaExterna`) funcionou, e é sinal de que a capacidade certa é
justamente essa, promovida a recurso.

**Trade-off:** anda junto com O-6 — os dois definem como um gerador se apresenta.
Fazer separados duplica a decisão de nomenclatura.

**Custo:** médio.

### O-7 — posição e orientação na criação da primitiva

**O que muda:** nenhum gerador aceita posição ou orientação, e as primitivas de
revolução só giram em torno de Y. Como o eixo do freio é X, **toda** peça de
revolução custa o trio criar + `rotaciona` + `transladar`.

**Por que:** A-4. 16 dos 52 passos do freio não descrevem o freio, descrevem
transporte. Uma peça deveria declarar o eixo do conjunto uma vez, não uma vez por
primitiva.

**Trade-off:** aumenta a superfície de argumentos de cada gerador, e o pivô default
(centroide da seleção) continua armadilha carregada em `rotaciona`. A alternativa
mais geral é o `alinhar` do O-8 — mais poderoso e mais caro. Fazer os dois é
redundante: O-7 é o atalho barato, O-8 é a capacidade. Nesta ordem.

**Custo:** médio.

---

## Faixa 3 — capacidade nova

### O-8 — seleção e restrição relacionais (`encostar`, `alinhar`)

**O que muda:** os 7 seletores atuais são `tudo, v, f, grupo, regiao, origem,
alias`. Nenhum expressa relação. Entram `toca`, `oposta`, `normal`, `maisProxima`,
e sobre eles as restrições `encostar` e `alinhar`.

**Por que:** é o exemplo textual do `CLAUDE.md` — "encostar a pastilha no disco"
deve virar capacidade geral. Hoje a intenção não é dado: existe em comentário e em
teste. Mudar `pistaoComprimento` desencosta o pistão sem erro nenhum.

**Trade-off:** o difícil é determinismo. Relação precisa desempate estável (id
ordenado) e ambiguidade precisa **gritar** em vez de escolher, senão a peça deixa
de ser reexecutável — a regra que sustenta o gabarito. Maior retorno e maior risco
do plano: entra depois do O-1, validada por medição, e com revisão adversarial.

**Custo:** alto.

### O-13 — repetição não existe, e mecânica é feita de repetição

**O que muda:** não há nenhuma operação de arranjo. O único mecanismo de repetição
do núcleo é `espelha`, que resolve simetria de duas vias e nada mais. Entram
arranjo radial e linear, com identidade própria por cópia.

**Por que:** foi o achado da validação, e não está no relato da rodada — nem eu
nem o agente havíamos listado. Em toda peça substancial do repositório, entre 65% e
89% dos passos repetem uma forma já escrita antes (drone: 90 de 101; freio: 43 de
52). O número é limite superior, porque a medida compara op mais chaves de
argumento e dois `pincel` diferentes contam como repetição — mas o padrão
qualitativo é inequívoco: os 4 braços do drone são 4 blocos idênticos de 5 passos,
e as 2 orelhas de parafuso do suporte do freio estão escritas duas vezes.

O que isso custou de verdade aparece no que **não** foi modelado: o cubo do freio
não tem prisioneiro de roda e o disco não tem aleta de ventilação. São círculo de
parafusos e arranjo radial — a figura mais comum de peça mecânica, e a que sai
mais caro à mão. Um freio didático sem prisioneiro é uma escolha da ferramenta,
não do assunto, exatamente como em A-9.

**Trade-off:** o risco é gerar cópia anônima. Cada instância precisa de identidade
endereçável, senão o arranjo devolve faces sem nome e desfaz o que O-6 conquista.
O molde já existe no próprio núcleo: `espelha` publica `origem` com `{op, id, de}`,
apontando para a fonte. Um arranjo deve seguir esse contrato, com índice de cópia
na identidade. **Por isso O-13 vem depois de O-6 e O-12**, não antes.

**Custo:** médio-alto.

### O-9 — parâmetro de tipo ponto e caminho

**O que muda:** só se nomeia escalar. 18 dos 61 parâmetros do freio existem para
nomear 6 pontos do caminho da mangueira, e a curva não tem nome — não dá para
dizer "afaste o flexível 5 mm da pinça" (A-8).

**Trade-off:** novo tipo no formato salvo; o validador precisa recusar ponto
malformado com a mesma severidade com que hoje recusa `NaN`.

**Custo:** médio.

### O-10 — hierarquia pai/filho de partes

**O que muda:** `f.parte` é string plana. O freio expõe 8 partes irmãs e não sabe
dizer que a pastilha mora na pinça (A-11) — item que a Fase 3 deixou explicitamente
em aberto.

**Trade-off:** o mais invasivo. `f.parte` é formato salvo; hierarquia exige migração
das 18 peças, regravação do gabarito, e `adaptarThree` e bancada passam a ter
árvore em vez de lista. Vale, mas por último.

**Custo:** alto.

---

## Plano de implementação

Uma rodada por linha. Cada rodada é commit próprio e independente: se uma parar,
as anteriores continuam de pé.

| rodada | itens | toca formato salvo | prova de saída |
|---|---|---|---|
| R1 | O-0 | não | outra sessão escreve peça sem id cru só com o manual |
| R2 | O-1, O-2, O-3, O-4, O-11, O-14 | só chave nova opcional | `descrever` mede os 4 encaixes do freio; `apagaFace` e `vira` entram no gabarito; gabarito das 18 peças byte-idêntico |
| R3 | O-5 | sim | as 21 derivadas do freio voltam para dentro do envelope |
| R4 | O-6, O-12 | sim | pinça e suporte reescritos em `chamferBox`, 0 face sem identidade |
| R5 | O-7 | sim | o freio perde os 16 passos de transporte |
| R6 | O-13 | sim | prisioneiros do cubo e aletas do disco por arranjo radial, cada cópia endereçável por nome |
| R7 | O-8 | sim | `encostar` substitui as derivadas de folga; mexer em um parâmetro não desencosta nada |
| R8 | O-9 | sim | mangueira com 6 pontos nomeados em vez de 18 escalares |
| R9 | O-10 | sim | bancada mostra `pastilhaInterna` dentro de `pinca` |

### Regras que valem para toda rodada

1. **Gabarito.** `npm run gabarito:selecao:check` verde. Quando uma peça é
   reescrita para provar a capacidade (R3 a R7 reescrevem o freio), regravar e
   declarar no commit qual peça mudou de hash e por quê. **Nenhuma peça que não
   foi reescrita pode mudar de hash** — é o que separa mudança aditiva de
   regressão.
2. **Formato salvo entra com validação que grita.** Chave nova aceita valor
   inesperado em silêncio ensina a próxima IA a escrever besteira que passa. É a
   lei que o núcleo já aplica ao resto.
3. **Determinismo.** Precisão fixa na serialização; nada de `Date.now()` ou
   `Math.random()`. Toda relação nova precisa desempate estável e ambiguidade que
   grita.
4. **Prova mensurável, não foto.** A partir de R2 existe `descrever`; de R2 em
   diante a prova de cada rodada é número, e a foto passa a ser conferência
   secundária.
5. **Revisão adversarial** em R7 obrigatoriamente, e em qualquer rodada que mude a
   semântica de referência existente. Medição objetiva de interface dispensa.
6. **Fechar o registro.** Ao terminar, mover o atrito correspondente para "Atritos
   resolvidos" em `ATRITOS-AUTORIA.md` com a evidência, e atualizar o estado da
   linha em `UPSTREAM-NOS.md`.
7. **A peça de prova é o freio a disco.** É a fixture de referência: tem 8 partes,
   0 id cru, 0 face sem identidade e 7 testes de integridade que medem contato por
   nome de parte. Toda capacidade nova se prova reescrevendo um pedaço dele e
   mostrando que os testes continuam verdes.

### Onde R2 encosta na bancada

`descrever` (O-1) responde a mesma pergunta que A-13 levantou na bancada e que
UP-013 registra como capacidade portável. Implementar o relato de caixa por parte
uma vez, num módulo neutro, e consumi-lo dos dois lados — CLI de autoria e painel
de diagnóstico da bancada — evita duas verdades sobre a mesma medida.

## O que deliberadamente não fazer

- **Mais primitivas.** O vocabulário de 26 ops não é o gargalo; o endereçamento é.
  Gerador novo sem `origem` (O-6) só aumenta a dívida.
- **Remover id cru das peças legadas.** 108 usos, 11 peças, gabarito. O gate do
  O-4 resolve o que importa sem migração de risco.
- **`eval` para expressão.** Artefato reproduzível não executa string arbitrária;
  a lista branca do O-5 é o caminho.
- **Corrigir a explosão radial no núcleo.** Explosão autoral é da apresentação,
  não da autoria — está em `BANCADA-E-APRESENTACAO.md`.
- **Fazer O-7 e O-8 na mesma rodada.** Resolvem a mesma dor em níveis diferentes;
  juntos, a rodada não sabe qual dos dois provou o quê.
- **Arranjo (O-13) antes de `origem` universal (O-6/O-12).** Repetir sem identidade
  por cópia produz face anônima em escala — desfaria o ganho, em vez de somar.
