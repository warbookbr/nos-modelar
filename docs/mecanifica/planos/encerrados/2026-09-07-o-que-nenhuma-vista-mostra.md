# O que nenhuma vista mostra

**Estado:** concluído

**Versão:** 2, de 2026-09-08. A 1 tratava só a peça escondida dentro de outra;
esta soma interpenetração como veredito e conferência de forma, e inverte a
polaridade da declaração.

**Responsável:** execução por agente · **Base:** `main` em `4c042cf`

## Problema observado

Modelando a bicicleta, duas falhas passaram por todas as verificações.

**A — a forma prometida não foi a entregue.** As rodas eram dois cilindros
concêntricos, e o anel foi *prometido* "pela diferença de raio". O externo é
maciço: engoliu aro, cubo e raios. `--estrito` limpo, malha aprovada, zero
órfãos, e as rodas eram dois discos chapados. Só a imagem pegou.

**B — partes se atravessando.** O arco passou pelo meio da roda dianteira, e
aqui está o pior modo de falha do conjunto: o `descrever` **reportou**
`rodaDianteiraAro ↔ tuboDirecao interpenetra` desde a primeira medição. A
ferramenta funcionou; a informação foi perdida num `grep` que só pedia contagem
de partes e órfãos.

As duas pedem correções opostas. Em A, a medida não existia. Em B, ela existia e
disparou certo — mas "passou" e "reprovou" eram a mesma saída, texto no
`stdout`, que qualquer filtro descarta; interpenetração não tocava o código de
saída.

**B é a mais grave.** Forma errada é erro de modelagem; parte atravessando parte
é erro de montagem, e montagem é para onde o projeto vai. A versão 1 tratou B
como nota de rodapé.

### Instrução não resolve nenhuma das duas

Além do achado filtrado em B, duas evidências da mesma sessão:

- duas skills mandam **"isole por pergunta, não por hábito"**, em destaque.
  Perguntada depois, a IA confirmou ter lido e não ter levado em conta;
- a bancada imprimiu *"silhueta vertical: ocupa 19% da largura"* na primeira
  captura, e foi ignorada — ela dispara em toda peça alta, e dica constante
  vira moldura de tela.

A escala, medida: lembrete em prosa é ignorado, fato na saída é filtrado, e
**estado que muda o veredito não tem como ser filtrado.**

### O prompt mínimo é o teste, não a atenuante

O prompt que produziu a bicicleta foi *"leia as skills e o readme, modele uma
bicicleta"*, sem nada sobre colisão. Isso não absolve o resultado — define o
alvo. Se "não deixe as partes se atravessarem" precisa ser dito, a lista é
infinita: depois vem o pistão saindo do cilindro, o dente da engrenagem
sobrepondo o outro, o parafuso passando pela porca. "Bicicleta" já carrega isso;
o problema é que carregava só na cabeça da IA, e lá não é verificável.

**Consequência de projeto:** com prompt curto o que vale é o padrão, e a IA não
declara o que ninguém pediu. A ausência de declaração tem de ser estrita: se for
permissiva, prompt curto produz silêncio, e a correção não pega justamente o
caso que originou o plano.

## Resultado

A receita declara como as peças se encaixam **antes** de medir: quais pares se
tocam de propósito, e que forma cada parte deve ter. Par que se toque fora da
lista reprova, e forma entregue diferente da prometida reprova. As vistas que a
medida acusa saem como imagem, não como comando a lembrar.

## Filtro Agent-First

Nada de geometria foi inventado: o teste exato de sólido já existia em
`auditar-intersecoes-montagem.js` e a contagem por Euler em `modulos/topologia`.
Reprovar em `--estrito` é REFATORAR, não somar — aviso é ignorável, e esta
sessão provou isso três vezes; veredito não é. As vistas por par saem da mesma
chamada porque comando sugerido é tarefa de casa, e tarefa de casa é esquecida.

## Excluído

- **oclusão de verdade** (contar pixel por parte em cada vista). Responde a
  pergunta certa — "esta parte aparece em alguma vista?" — e custa a bancada
  inteira a cada medição, sem eliminar o caso legítimo: pistão dentro do corpo
  da prensa é invisível e está correto. O que o contato não pega fica como
  limite declarado;
- **texto dentro da imagem.** A imagem é prova: vai para o crítico cego, que
  recebe só o PNG e a pergunta "o que é isto?". Texto ali seria lido como parte
  do objeto e estragaria o instrumento;
- corrigir as receitas antigas do acervo. Elas ganham a declaração do que já
  fazem, sem mudar geometria.

## Invariantes

1. Nenhuma receita existente muda de geometria.
2. **A declaração é contrato, não escapatória.** Ela diz o que se espera, antes
   de medir. Nunca é escrita depois, em resposta a uma reprovação, para calá-la.
   Par ausente da lista que se toque REPROVA — esquecer falha, não silencia.
3. Contato é medido contra o SÓLIDO, nunca contra a caixa. A bicicleta tem aro
   dentro da caixa do pneu e fora do sólido dele — caixa acusaria peça correta.
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
Entregue em `src/autoria/contatos-da-peca.js`; as fixtures e o que elas provam
estão em `contatos-da-peca.test.mjs`.

### R01 — forma prometida contra forma entregue

A parte declara a forma que deve ter, e a medida calcula V−E+F sobre a malha.
Existe porque R00 não basta: contato é relação entre DUAS partes, e se o pneu
sai maciço com nada modelado dentro não há segunda parte para acusar — a peça é
um disco sólido e passa limpa. Entregue em `src/autoria/forma-da-parte.js`.

O vocabulário oferece `solido` e `anel` e não `tubo`: tubo e anel são a mesma
topologia, e a palavra a mais prometeria distinção que a régua não faz.

### R02 — a vista do par sai como imagem

Os pares que a medida acusa são capturados junto das vistas pedidas, com teto
declarado. Sem comando novo, sem bandeira nova. Entregue em
`tools/mecanifica/olhar-bancada.mjs`.

### R03 — dica que aparece quando se aplica

Junto do retorno da captura, nunca dentro da imagem, e só quando há o que dizer.
Repetir a mesma linha em toda execução é como a dica de resolução morreu: cada
dica tem chave, junta as vistas em que apareceu e sai uma vez só.

## O gate que fecha o plano

As fixtures provam que a medida funciona, não que o laço funciona — e foi o laço
que falhou, não a aritmética. O gate é o prompt mínimo repetido, *"leia as skills
e o readme, modele uma bicicleta"*, sem menção a colisão: o resultado tem de ser
peça correta **ou** veredito vermelho, nunca verde e errada. Quem o executa não
pode ser quem construiu a ferramenta.

## Riscos e parada

- **Custo da medição.** O(n²) em partes e O(v) em vértices, mitigado pela caixa
  filtrando candidatos: 525 ms na bicicleta inteira. V−E+F é O(V+F).
- **Falso positivo condena peça boa.** Reprovação errada ensina a ignorar
  reprovação; por isso a declaração existe desde a primeira rodada, não depois.
- **A declaração vira carimbo.** Risco de projeto, não de código: se declarar
  ficar mais barato que corrigir, a IA declara tudo e o veredito morre. Alarme:
  contatos declarados crescendo sem a geometria mudar. O laboratório deste
  projeto já viveu isso — o revisor dizia "aprovado" deixando passar 91% dos
  números inventados.
- **Parar se** o teste exato acusar contato não declarado na bicicleta de hoje
  depois de os legítimos serem declarados: aí a medida está errada, e ligar
  reprovação em cima dela quebraria a confiança no veredito antes de ela existir.

## Fechamento

**As quatro rodadas foram entregues** em 2026-09-08, 19/19 gates verdes em cada
uma: R00 em `f3a2aad`, R01 em `8e1f097`, R02 em `f231ac3`. Duas medidas não
precisaram ser escritas, só ligadas, e o núcleo extraído para
`contato-de-solidos.js` fez a auditoria de montagem cair de 340 para 108 linhas
sem mudar comportamento.

**O gate de fechamento PASSOU**, em `563106c`. Rodou num subagente frio, que não
viu as rodadas serem feitas e não sabia que declaração de contato existe, com o
prompt literal do plano e sem uma palavra sobre colisão.

`bicicleta-prova` sai com código 0, e verde por estar certa — conferido na medida,
não no relato do agente: 22 contatos todos declarados, ZERO
`intersecao-de-superficies` (a bicicleta original tinha uma, e era o defeito),
zero declaração fictícia, motivos mecânicos de verdade. O agente ainda achou dois
defeitos e CORRIGIU a geometria em vez de declarar — o risco que mataria a porta
não se realizou.

**O que a execução ensinou, e não estava previsto:**

- o acervo tinha 23 contatos legítimos não declarados; todos ganharam declaração
  sem mudar geometria. O custo é real: a pelve da armadura tem cinco;
- a bicicleta tem 28 pares acusados, não os 13 estimados antes de medir;
- ordenar por gravidade não bastou: 22 dos 28 são interpenetração e o defeito
  real ficava fora de um teto de três. O que o separou foi o MÉTODO —
  `intersecao-de-superficies` sai só quando nenhum vértice está dentro do outro,
  assinatura de peça atravessando peça contra peça assentada. Um em 28, e é o
  defeito. Heurística de ordem, não lei;
- relato de agente não substitui rodar o gate: o subagente deu por concluído com
  `mapa:check` e `malha:conferir` verdes, e os gates completos davam 16/19.

**Backlog:** menores folgas como pares acusados; `catalogo:check` fora de `gates`
e do CI; e se a leitura obrigatória, em 69.986 de um teto de 70.000 bytes, ainda
se paga — a bicicleta com defeito saiu depois de lê-la toda.
