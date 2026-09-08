# O que nenhuma vista mostra

**Estado:** ativo

**Versão:** 2, de 2026-09-08. A 1 tratava só a peça escondida dentro de outra;
esta soma interpenetração como veredito e conferência de forma, e inverte a
polaridade da declaração.

**Responsável:** execução por agente

**Repositório e base:** `warbookbr/nos-mecanifica`, `main` em `4c042cf`

## Problema observado

Modelando a bicicleta, duas falhas passaram por todas as verificações.

**A — a forma prometida não foi a entregue.** As rodas eram dois cilindros
concêntricos, e o anel foi *prometido* "pela diferença de raio". O cilindro
externo é maciço: engoliu aro, cubo e raios. `descrever --estrito` limpo, malha
aprovada, zero órfãos — e as rodas eram dois discos chapados. Só a imagem pegou,
e só porque alguém abriu a imagem.

**B — partes se atravessando.** O arco passou pelo meio da roda dianteira, e
aqui está o pior modo de falha do conjunto: o `descrever` **reportou**
`rodaDianteiraAro ↔ tuboDirecao interpenetra` desde a primeira medição. A
ferramenta funcionou; a informação foi perdida porque a saída foi estreitada por
um `grep` que só pedia contagem de partes e órfãos.

As duas pedem correções opostas. Em A, a medida não existia. Em B, ela existia e
disparou certo — mas "passou" e "reprovou" eram a mesma saída, texto no
`stdout`, que qualquer filtro descarta. Hoje `--estrito` só reprova por face sem
identidade semântica; interpenetração não toca o código de saída.

**B é a mais grave.** Forma errada é erro de modelagem; parte atravessando parte
é erro de montagem, e montagem é para onde o projeto vai — carro, motor, robôs.
A versão 1 tratou B como nota de rodapé.

### Instrução não resolve nenhuma das duas

Além do achado filtrado em B, duas evidências da mesma sessão:

- duas skills mandam **"isole por pergunta, não por hábito"**, em destaque.
  Perguntada depois, a IA confirmou ter lido e não ter levado em conta: a
  bicicleta foi julgada inteira numa vista só, e o crítico cego recebeu a peça
  toda;
- a bancada imprimiu *"silhueta vertical: ocupa 19% da largura"* na primeira
  captura, e foi ignorada — ela dispara em toda peça alta, e dica constante
  vira moldura de tela.

A escala, medida e não suposta: lembrete em prosa é ignorado; fato na saída é
filtrado; **estado que muda o veredito não tem como ser filtrado.**

### O prompt mínimo é o teste, não a atenuante

O prompt que produziu a bicicleta foi *"leia as skills e o readme, modele uma
bicicleta"*, sem nada sobre colisão. Isso não absolve o resultado — define o
alvo. Se "não deixe as partes se atravessarem" precisa ser dito, a lista é
infinita: depois vem o pistão saindo do cilindro, o dente da engrenagem
sobrepondo o outro, o parafuso passando pela porca. Quem pede a peça não pode
ser o portador desse requisito a cada vez. "Bicicleta" já carrega isso; o
problema é que carregava só na cabeça da IA, e lá não é verificável.

**Consequência de projeto:** com prompt curto, o que vale é o padrão, e a IA
não declara o que ninguém pediu. A ausência de declaração tem de ser estrita:
se for permissiva, prompt curto produz silêncio — e a correção não pega
justamente o caso que originou o plano.

## Resultado

A receita declara como as peças se encaixam **antes** de medir: quais pares se
tocam de propósito, e que forma cada parte deve ter. Par que se toque fora dessa
lista reprova, e parte cuja forma entregue não seja a prometida reprova. As
vistas que a medida acusa saem como imagem, não como comando a lembrar.

## Filtro Agent-First

- **Contato declarado como contrato — ENVOLVER.** `expectativaDoPar` já existe
  em `src/autoria/auditar-intersecoes-montagem.js`, indexado por par, para
  montagem. Falta para peça. Mecanismo reusado, não inventado.
- **Reprovar em `--estrito` — REFATORAR.** Aviso é ignorável, e esta sessão
  provou isso três vezes. É veredito, como órfão já é.
- **Forma prometida contra entregue — ENVOLVER.**
  `modulos/topologia/src/analisar.js` já conta vértices, arestas, faces e
  bordas. V−E+F sai daí.
- **Vistas por par — ENVOLVER.** Saem como imagem, junto das já pedidas.
  Comando sugerido é tarefa de casa, e tarefa de casa é esquecida.
- **Dica condicional — ADIAR até R03.** A mais fraca das três.

## Excluído

- **oclusão de verdade** (contar pixel por parte em cada vista). Responde a
  pergunta certa — "esta parte aparece em alguma vista?" — e custa a bancada
  inteira a cada medição, sem eliminar o caso legítimo: pistão dentro do corpo
  da prensa é invisível e está correto. Contato declarado é o atalho barato que
  pega o caso real; o que ele não pega fica como limite declarado;
- **texto dentro da imagem.** A imagem é prova: tem hash, é comparada e vai para
  o crítico cego, que recebe só o PNG e a pergunta "o que é isto?". Texto ali
  seria lido como parte do objeto e estragaria o instrumento;
- corrigir as receitas antigas do acervo, que são material de prova e não
  produto. Elas ganham a declaração do que já fazem, sem mudar geometria.

## Invariantes

1. Nenhuma receita existente muda de geometria.
2. **A declaração é contrato, não escapatória.** Ela diz o que se espera, antes
   de medir. Nunca é escrita depois, em resposta a uma reprovação, para calá-la.
   Par ausente da lista que se toque REPROVA — esquecer falha, não silencia.
3. Contato é medido contra o SÓLIDO, nunca contra a caixa. A bicicleta de hoje
   tem aro dentro da caixa do pneu e fora do sólido dele, porque o pneu virou
   anel — caixa acusaria a peça correta.
4. Nenhum passo novo para quem já usa: as vistas por par saem da mesma chamada.
5. A leitura obrigatória continua ≤ 70 KB.

## Rodadas

### R00 — contato não declarado reprova

A receita declara os contatos intencionais, no formato que a montagem já usa:

```js
contatos: [
  { par: ['eixoDianteiro', 'cuboDianteiro'], motivo: 'o eixo passa pelo cubo' },
  { par: ['aro', 'pneu'], motivo: 'o pneu assenta no aro' },
]
```

Todo par que se toque fora dessa lista reprova `--estrito`, com código de saída
diferente de zero. Contenção total entra como o caso extremo de interpenetração
— mesma medida, mesma tabela, mesma declaração — e não como mecanismo separado.

**Gate:** três fixtures. A roda como foi feita primeiro — cilindro maciço com
aro, cubo e raios dentro — reprova. O arco atravessando a roda reprova. A
bicicleta de hoje, com os contatos declarados, acusa **zero**. Nos dois
primeiros o processo sai com código diferente de zero, verificado pelo código e
não pelo texto.

### R01 — forma prometida contra forma entregue

A parte declara a forma que deve ter (`solido`, `anel`, `tubo`, ou o número de
furos direto). A medida calcula V−E+F sobre a malha e compara.

Existe porque R00 não basta: contato é relação entre duas partes. Se o pneu
sair maciço e aro, cubo e raios não forem modelados, não há segunda parte para
acusar contato — a peça é um disco sólido e passa limpa. Mesma falha, forma
mais simples, invisível para R00.

**Gate:** o pneu declarado `anel` que sai maciço reprova; o mesmo pneu correto
passa. Peça sem declaração de forma não reprova por isso — forma é opcional
onde contato não é.

### R02 — a vista do par sai como imagem

Os pares que a medida acusa passam a ser capturados junto das vistas pedidas,
com orçamento declarado de quantos. Sem comando novo, sem bandeira nova.

**Gate:** na bicicleta, uma chamada de bancada produz as vistas pedidas mais os
pares acusados, e o teto de capturas é respeitado em vez de a peça virar 276
imagens.

### R03 — dica que aparece quando se aplica

Junto do retorno da captura, nunca dentro da imagem, e só quando há o que dizer:
peça com muitas partes, pares abaixo do limiar, cores que não separam. Repetir a
mesma linha em toda execução é como a dica de resolução morreu.

**Gate:** não aparece numa peça de três partes sem achado; aparece na bicicleta;
e o texto nomeia o achado concreto, não a regra genérica.

## O gate que fecha o plano

As fixtures provam que a medida funciona. Elas não provam que o laço funciona —
e foi o laço que falhou, não a aritmética. O gate de fechamento é o prompt
mínimo, repetido: *"leia as skills e o readme, modele uma bicicleta"*, sem
menção a colisão. O resultado tem de ser bicicleta correta **ou** veredito
vermelho. Nunca verde e errada.

Quem executar este gate não pode ser quem construiu a ferramenta.

## Riscos e parada

- **Custo da medição.** Testar todo ponto de cada parte contra o sólido das
  outras é O(n²) em partes e O(v) em vértices. Mitigação: caixa filtra
  candidatos, o teste exato roda só neles, e o custo entra medido no diário.
  V−E+F, de R01, é O(V+F) e não entra nesta conta.
- **Falso positivo condena peça boa.** É o risco que mata a porta: reprovação
  errada ensina a ignorar reprovação. Por isso a fixture da bicicleta corrigida
  é gate, e a declaração existe desde a primeira rodada, não depois.
- **A declaração vira carimbo.** Risco de projeto, não de código: se declarar
  ficar mais barato que corrigir, a IA declara tudo e o veredito morre. Alarme:
  receita cujos contatos declarados crescem sem a geometria mudar. O laboratório
  deste projeto já viveu isso — o revisor dizia "aprovado" deixando passar 91%
  dos números inventados.
- **Parar se** o teste exato acusar contato não declarado na bicicleta de hoje
  depois de os legítimos serem declarados: aí a medida está errada, e ligar
  reprovação em cima dela quebraria a confiança no veredito antes de ela existir.

## Fechamento

Preencher ao concluir: estado final, commit, gates, resultado e candidatos
devolvidos ao backlog.
