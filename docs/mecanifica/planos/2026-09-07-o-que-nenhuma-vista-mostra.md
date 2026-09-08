# O que nenhuma vista mostra

**Estado:** ativo

**Responsável:** execução por agente

**Repositório e base:** `warbookbr/nos-mecanifica`, `main` em `03e2d74`

## Problema observado

Modelando a bicicleta, as rodas foram feitas com dois cilindros concêntricos e a
leitura de anel foi *prometida* "pela diferença de raio". O cilindro externo é
maciço: ele engoliu aro, cubo e raios. `descrever --estrito` limpo, malha
aprovada, identidade perfeita, zero órfãos — e as rodas eram dois discos
chapados. **Só a imagem pegou, e só porque alguém abriu a imagem.**

É a última família conhecida de "erra e mede limpo". As outras três já têm porta:
`PARAMS` decorativo virou `npm run parametros`, argumento fora do contrato virou
grito, e a paleta que confundia o crítico passou a nomear o que não separa.
Nenhuma medida atual pergunta o que uma parte esconde da outra.

Duas evidências de que instrução não resolve isto, ambas desta mesma sessão:

- duas skills mandam **"isole por pergunta, não por hábito"**, em destaque, com
  a tabela dos três modos. Foram lidas e não foram seguidas: a bicicleta foi
  julgada inteira numa vista só, e o crítico cego recebeu a peça toda;
- a bancada imprimiu *"silhueta vertical: ocupa 19% da largura"* junto da
  primeira captura. A dica estava na saída que já estava sendo lida, e foi
  ignorada — ela dispara em toda captura de peça alta, e dica constante vira
  moldura de tela.

E há um modo de falha pior que os dois: o `descrever` **reportou**
`rodaDianteiraAro ↔ tuboDirecao interpenetra` desde a primeira medição, e a
saída foi estreitada por um `grep` que só pedia contagem de partes e órfãos.
Nem fato na saída padrão sobrevive a quem filtra a própria leitura.

A escala, medida e não suposta: lembrete em prosa é ignorado; fato na saída é
filtrado; **estado que muda o veredito não tem como ser filtrado.**

## Resultado

Uma parte que some inteira dentro de outra reprova `--estrito`, a menos que a
receita declare que aquilo é intencional. E as vistas que a medida pede saem
como imagem, não como comando para alguém lembrar de rodar.

## Filtro Agent-First

- **Contenção total — ENVOLVER.** A caixa por corpo e a relação corpo a corpo já
  existem; falta a pergunta "esta parte tem algum ponto fora daquela".
- **Reprovar em `--estrito` — REFATORAR.** Não é aviso: aviso é ignorável e esta
  sessão provou isso duas vezes. É veredito, como órfão já é.
- **Declaração de contenção esperada — ENVOLVER.** `expectativa` existe para
  montagem (`auditoriaIntersecoes.expectativas`) e **não existe para peça**. O
  mecanismo é reusado, não inventado.
- **Vistas por par — ENVOLVER.** Sair como imagem, junto das que já foram
  pedidas. Comando sugerido é tarefa de casa, e tarefa de casa é esquecida.
- **Dica condicional — ADIAR até R02.** É a mais fraca das três e só se paga se
  disparar quando se aplica, dizendo algo que ainda não se sabe.

## Excluído

- **oclusão de verdade** (contar pixel por parte em cada vista). Responde a
  pergunta certa — "esta parte aparece em alguma vista?" — e custa a bancada
  inteira a cada medição, sem eliminar o caso legítimo: pistão dentro do corpo
  da prensa é invisível e está correto. Contenção é o atalho barato que pega o
  caso real; o que ela não pega fica declarado como limite, não escondido;
- **texto desenhado dentro da imagem.** A imagem é prova: tem hash, é comparada
  e vai para o crítico cego que recebe só o PNG e a pergunta "o que é isto?".
  Texto ali dentro seria lido como parte do objeto e estragaria o instrumento;
- corrigir as receitas antigas do acervo, que são material de prova e não
  produto.

## Invariantes

1. Nenhuma receita existente muda de geometria.
2. **Contenção relata, não julga.** Reprovar só acontece quando a contenção NÃO
   está declarada. Pistão dentro do corpo da prensa é legítimo, e a receita diz
   isso uma vez em vez de a ferramenta adivinhar toda vez.
3. Contenção é medida contra o SÓLIDO, nunca contra a caixa. A bicicleta de hoje
   tem aro dentro da caixa do pneu e fora do sólido dele, porque o pneu virou
   anel — caixa acusaria a peça correta.
4. Nenhum passo novo para quem já usa: as vistas por par saem da mesma chamada.
5. A leitura obrigatória continua ≤ 70 KB.

## Rodadas

### R00 — parte contida reprova, salvo declaração

Contenção total entre partes, medida por sólido, na tabela que o `descrever` já
imprime. Contenção não declarada reprova `--estrito`. A receita declara as
intencionais pelo mesmo formato que a montagem usa hoje, `{ id, motivo }`.

**Gate:** duas fixtures, uma de cada lado. A roda como foi feita primeiro —
cilindro maciço com aro, cubo e raios dentro — acusa três contenções e reprova.
A bicicleta de hoje, com o pneu em anel, acusa **zero**: a mesma medida não pode
condenar a peça corrigida.

### R01 — a vista do par sai como imagem

Os pares que a medida acusa — interpenetração não declarada e as menores folgas
— passam a ser capturados junto das vistas pedidas, com orçamento declarado de
quantos. Sem comando novo, sem bandeira nova.

**Gate:** na bicicleta, uma chamada de bancada produz as vistas pedidas mais os
pares acusados, e o teto de capturas é respeitado em vez de a peça inteira virar
276 imagens.

### R02 — dica que aparece quando se aplica

Junto do retorno da captura, nunca dentro da imagem, e só quando há o que dizer:
peça com muitas partes, pares abaixo do limiar, cores que não separam. Repetir a
mesma linha em toda execução é como a dica de resolução morreu.

**Gate:** a dica não aparece numa peça de três partes sem achado; aparece na
bicicleta; e o texto nomeia o achado concreto, não a regra genérica.

## Riscos e parada

- **Custo da medição.** Testar todo ponto de cada parte contra o sólido de todas
  as outras é O(n²) em partes e O(v) em vértices. Mitigação: caixa filtra
  candidatos, o teste exato roda só neles, e o custo entra medido no diário como
  qualquer ferramenta do laço.
- **Falso positivo condena peça boa.** É o risco que mata a porta: uma reprovação
  errada ensina a ignorar a reprovação. Por isso a fixture da bicicleta corrigida
  é gate, e por isso a declaração existe desde a primeira rodada, e não depois.
- **Parar se** o teste exato acusar contenção na bicicleta de hoje: aí a medida
  está errada, e ligar reprovação em cima dela quebraria a confiança no veredito
  antes de ela existir.

## Fechamento

Preencher ao concluir: estado final, commit, gates, resultado observado e
candidatos devolvidos ao backlog.
