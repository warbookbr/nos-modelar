# Otimizações da Oficina para autoria por IA

Plano ordenado de mudanças na linguagem de autoria, com trade-off explícito. A
divisão de trabalho entre os três documentos é:

- [`ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md) registra a **dor observada** (A-1 a
  A-14) — é a evidência;
- [`UPSTREAM-NOS.md`](UPSTREAM-NOS.md) registra a **candidatura ao NÓS** (UP-008
  a UP-013) — é a portabilidade;
- este documento decide **ordem, custo e trade-off** — é o plano.

Escopo: o núcleo de autoria (`prototipos/fps/v3/motor/oficina.js`). Os atritos da
bancada (A-1, A-2, A-3, A-12, A-13, A-14) ficam no registro de atritos; só entra
aqui o que a autoria precisa para medir em vez de olhar.

## Diagnóstico

A Oficina tem 26 operações para **fazer** geometria e um mecanismo fraco para
**apontar** para ela. O custo de autoria é dominado pelo endereçamento, não pela
modelagem.

Os números da rodada do freio a disco sustentam isso:

| medida | valor |
|---|---|
| passos que só transportam primitiva da origem até o lugar | 16 de 52 (31%) |
| parâmetros derivados calculados fora do envelope salvo | 21 de 61 |
| geradores que publicam `origem` endereçável | 4 de 8 |
| leituras de PNG para responder "o eixo está em X?" | 4, nenhum defeito achado |
| iterações gastas escrevendo a geometria em si | 1 |

A última linha é a mais reveladora: **escrever a peça foi barato; descobrir onde
apontar e conferir o resultado foi caro.**

## Calibração desta lista

Os itens 2, 3 e 4 vieram de leitura de código, antes da rodada. Todos os outros
vieram da rodada e são melhores do que a leitura de código produziu — a sessão de
modelagem real achou mais e achou coisa mais funda (`origem` faltando decidiu a
forma da peça; 31% dos passos serem transporte). O método vale mais que a
inspeção estática; a lista abaixo é ordenada, não adivinhada.

## Faixa 1 — aditivo, barato, mata classe inteira de retrabalho

Nada aqui muda o formato salvo, e nenhum item quebra peça existente. Faixa 1 vem
primeiro por isso.

### O-1 — descrição headless mensurável (`descrever`)

**O que muda:** um comando que imprime, por parte semântica: caixa, centro,
dimensões, contagem de faces, e folga ou interpenetração com as outras partes.

**Por que primeiro:** A-13 mediu 4 leituras de PNG para responder uma pergunta
geométrica trivial, e a resposta veio de uma medição em Node **fora** da bancada.
Foto não tem escala nem eixo. Enquanto conferir custa perícia de pixel, toda
capacidade nova abaixo é validada no olho.

**Trade-off:** nenhum relevante — é ferramenta, não formato. Só exige que a
descrição seja determinística para virar teste.

**Custo:** baixo. O `adaptarThree` já calcula caixa por parte.

### O-2 — reatribuir `parte` passa a gritar

**O que muda:** `parte` hoje faz `st.F.get(fid).parte = nome` com "última
atribuição vence", sem diagnóstico. Passa a gritar quando a face já pertence a
outra parte, salvo `substituir: true` explícito.

**Por que:** é a pior classe de defeito — resultado errado que passa. Duas caixas
de região que se sobrepõem e uma parte perde faces caladamente; a bancada só
mostra a *contagem* de faces sem nome, nunca as roubadas.

**Trade-off:** nenhum, e isso foi medido: instrumentando `parte` e construindo as
18 peças do repositório, **zero faces são reatribuídas**. Nenhuma peça depende do
comportamento silencioso, então o diagnóstico é de graça.

**Custo:** trivial.

### O-3 — `regiao` com `modo: 'toca' | 'contem'`

**O que muda:** `sel.regiao` seleciona face só quando **todos** os vértices estão
na caixa (`f.vs.every(dentro)`). Uma face meio dentro é silenciosamente ignorada.
Adicionar `modo`, mantendo `contem` como padrão.

**Por que:** é a origem clássica do ciclo "alarga a caixa, refotografa". E o
efeito colateral apareceu na rodada de forma indireta e pior: o freio a disco não
usa `regiao` **nenhuma vez** — 19 `alias`, 10 `grupo`, 7 `origem`. O autor não
consertou a caixa, ele evitou o seletor. Nas peças legadas, `parte` é nomeada por
`regiao` 18 vezes contra 11 por `alias`.

**Trade-off:** `contem` como padrão preserva o gabarito byte a byte; o custo é
uma chave a mais no formato salvo.

**Custo:** baixo.

### O-4 — gate contra id cru em peça nova

**O que muda:** `faces: [...]` e `sel: {v|f}` continuam sendo lidos, mas um gate
reprova **peça nova** que os use.

**Por que:** o `CLAUDE.md` proíbe id posicional como referência persistida e o
formato aceita — 108 usos em 11 peças legadas. A rodada provou que o caminho
semântico é suficiente: o freio a disco tem **0** ids crus.

**Trade-off:** remover de vez quebraria 11 peças e o gabarito. O gate separa
dívida herdada de dívida nova, sem migração forçada.

**Custo:** baixo.

## Faixa 2 — muda a linguagem, alto retorno

### O-5 — expressão dentro do passo

**O que muda:** um passo hoje aceita número literal ou nome de parâmetro
(`num()`), nada mais. Passa a aceitar expressão aritmética sobre parâmetros
nomeados.

**Por que:** A-5. As 21 medidas derivadas do freio vivem num bloco JS no topo do
arquivo, isto é, **fora do envelope salvo** — quem reabrir pela Oficina vê 61
números soltos e não sabe que 21 são consequência dos outros 40; mudar
`folgaPastilha` pela interface não moveria a pastilha. No drone o sintoma é mais
bobo e igualmente revelador: `afastamentoRotorX: 0.78` convive com
`afastamentoRotorXNeg: -0.78`, gêmeo calculado à mão.

**Trade-off:** exige parser aritmético próprio com nomes em lista branca —
**nunca `eval`** — e resultado determinístico com precisão fixa, senão o gabarito
deixa de ser comparável entre sistemas. É trabalho real, e é o preço de trazer a
derivação de volta para dentro do formato.

**Custo:** médio.

### O-6 — `origem` em todo gerador

**O que muda:** dos 8 geradores, só `cubo`, `cilindro`, `lathe` e `loft`
publicam `origem`. Os outros — `chamferBox`, `esfera`, `cone`, `plano` — não são
endereçáveis por nome.

**Por que:** A-9 é o achado mais incômodo da rodada. A pinça e o suporte são
peças fundidas, e `chamferBox` é literalmente o gerador do assunto; foram
escritas com `cilindro` e `cubo` porque sem `origem` só sobra caixa de coordenada
chutada. Medido: usar `chamferBox` custaria 3 órfãos e 26 faces sem identidade.
**A ferramenta escolheu a forma da peça** — o pior tipo de decisão.

**Trade-off:** cada gerador precisa declarar seu contrato de faces nomeadas, e
esses nomes passam a ser formato salvo, portanto não podem mudar depois sem
migração. Nomear mal agora é caro depois.

**Custo:** médio, e paralelizável por gerador.

### O-7 — posição e orientação na criação da primitiva

**O que muda:** nenhum gerador aceita posição ou orientação, e as primitivas de
revolução só giram em torno de Y. Como o eixo do freio é X, **toda** peça de
revolução custa o trio criar + `rotaciona` + `transladar`.

**Por que:** A-4. 16 dos 52 passos do freio não descrevem o freio, descrevem
transporte. Uma peça deveria declarar o eixo do conjunto uma vez, não uma vez por
primitiva.

**Trade-off:** aumenta a superfície de argumentos de cada gerador, e o pivô
default (centroide da seleção) continua sendo armadilha carregada em `rotaciona`.
A alternativa mais geral é o `alinhar` relacional do O-8 — mais poderoso e mais
caro. Fazer os dois é redundante; recomendo O-7 como atalho barato e O-8 como
capacidade, na ordem.

**Custo:** médio.

## Faixa 3 — capacidade nova

### O-8 — seleção e restrição relacionais (`encostar`, `alinhar`)

**O que muda:** os 7 seletores atuais são `tudo, v, f, grupo, regiao, origem,
alias`. Nenhum expressa relação. Entram `toca`, `oposta`, `normal`,
`maisProxima`, e sobre eles as restrições `encostar` e `alinhar`.

**Por que:** é o exemplo textual do `CLAUDE.md` — "encostar a pastilha no disco"
deve virar capacidade geral. Hoje a intenção não é dado: existe em comentário e
em teste. Mudar `pistaoComprimento` desencosta o pistão do freio sem erro nenhum.

**Trade-off:** o difícil é determinismo. Relação precisa desempate estável (id
ordenado) e ambiguidade precisa **gritar** em vez de escolher, senão a peça deixa
de ser reexecutável — que é a regra que sustenta o gabarito. É a mudança de maior
retorno e maior risco da lista; deve vir depois do O-1, para ser validada por
medição e não por foto.

**Custo:** alto.

### O-9 — parâmetro de tipo ponto e caminho

**O que muda:** só se nomeia escalar. 18 dos 61 parâmetros do freio existem para
nomear 6 pontos do caminho da mangueira, e a curva em si continua sem nome — não
dá para dizer "afaste o flexível 5 mm da pinça" (A-8).

**Trade-off:** novo tipo no formato salvo; o validador precisa recusar ponto
malformado com a mesma severidade que hoje recusa `NaN`.

**Custo:** médio.

### O-10 — hierarquia pai/filho de partes

**O que muda:** `f.parte` é string plana. O freio expõe 8 partes irmãs e não sabe
dizer que a pastilha mora na pinça (A-11) — item que a Fase 3 deixou em aberto.

**Trade-off:** o mais invasivo da lista. `f.parte` é formato salvo; hierarquia
exige migração das 18 peças e regravação do gabarito, e o `adaptarThree` e a
bancada passam a ter árvore em vez de lista. Vale, mas depois da Faixa 2.

**Custo:** alto.

## O que deliberadamente não fazer

- **Mais primitivas.** O vocabulário de 26 ops não é o gargalo; o endereçamento
  é. Gerador novo sem `origem` (O-6) só aumenta a dívida.
- **Remover id cru das peças legadas.** 108 usos, 11 peças, gabarito. O gate do
  O-4 resolve o que importa sem migração de risco.
- **`eval` para expressão.** Um artefato reproduzível não executa string
  arbitrária; a lista branca do O-5 é o caminho.
- **Corrigir a explosão radial no núcleo.** A explosão autoral é da apresentação,
  não da autoria — está em `BANCADA-E-APRESENTACAO.md`.

## Ordem recomendada

O-1 → O-2 → O-3 → O-4 (todos aditivos e independentes) → O-5 → O-6 → O-7 →
O-8 → O-9 → O-10.

A Faixa 1 inteira pode sair numa rodada. A partir do O-5, cada item muda o
formato salvo ou o contrato de referência, então cada um pede rodada própria com
`gabarito:selecao:check` verde e uma peça de prova.
