# O núcleo mora num lugar só, e se chama núcleo

**Estado:** concluído

**Responsável:** Tiago (autoria) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-mecanifica`, base `a82ed587` na main.

## Problema observado

O motor procedural tem 26 arquivos e 8.596 linhas, e nenhum teste dentro dele.
As provas do que ele garante estão em outras três árvores: 23 arquivos de teste
em `tools/mecanifica`, 22 em `tools/oficina` e 1 em `src/autoria`. Nada diz
onde procurar. Para saber se a operação `furo` está protegida, é preciso varrer
as três pastas e ler o conteúdo de cada arquivo, porque o nome também não diz.

O efeito é o mesmo que a peça sofria antes de 2026-09-11, com a mesma solução
conhecida. Quem mexe numa operação descobre a cada sessão onde mora a prova
dela, e quem escreve uma operação nova escolhe a pasta por conveniência, que foi
como as três se formaram.

Há três agravantes medidos. O primeiro é o caminho: ele mora em
`procedural/`, e o projeto inteiro depende dele, com 30 arquivos
de produção e 38 de teste importando por aí. O nome da pasta afirma que é
experimento e o uso afirma o contrário.

O segundo é o nome. A pasta se chama `motor`, e a palavra já nomeia três coisas
aqui: este programa, o "motor de prancha" que desenha contorno em 2D, e a peça
mecânica que vai dentro de um carro — sentido que o próprio README usou até
2026-09-22. Num repositório de modelagem mecânica a terceira é a que o leitor
encontra primeiro, e uma peça chamada `motor` no acervo colidiria com a pasta do
programa. O projeto já usa outro nome para a mesma coisa, dezessete vezes nos
documentos de entrada: núcleo. O `CLAUDE.md` escreve "o núcleo de autoria é
independente de Three.js", e dentro de `motor/` existe um `nucleo.js`.

O terceiro é que `tools/mecanifica` acumulou 144 arquivos com 74 testes,
misturando ferramenta de linha de comando, guarda de navegador e prova do núcleo
sem que o nome distinga qual é qual.

## Resultado

Abrir a pasta de uma operação do núcleo mostra o que ela faz e o que garante que
ela faz. `tools/` passa a guardar somente o que alguém digita na linha de
comando. Nenhum caminho de import diz `prototipos`, e a palavra `motor` deixa de
nomear programa, ficando livre para a peça mecânica.

## Filtro Agent-First

**REFATORAR.** Não há capacidade nova aqui, e mesmo assim é a decisão certa
porque o custo que ela baixa é de contexto, o recurso mais caro de quem trabalha
aqui por sessão: responder "o que protege esta operação" exigia ler três
árvores, e passa a exigir abrir uma pasta. Adiar tem custo crescente, porque
cada operação nova nasce com a prova em mais um lugar arbitrário. Mover arquivo
não muda comportamento, então a prova de que nada quebrou é a bateria inteira
verde em cada fatia, e não o julgamento de quem moveu.

## Incluído

- mover cada teste do núcleo para junto da operação que ele prova, na mesma
  pasta, com o nome derivado do arquivo provado;
- separar em `tools/mecanifica` o que é ferramenta de linha de comando do que é
  prova do núcleo, movendo só o segundo;
- tirar o núcleo de `prototipos/` e renomear a pasta `motor` para `nucleo`, na
  mesma fatia, porque as duas mudanças tocam exatamente os mesmos imports e
  separá-las custaria o dobro por nenhum ganho de revisão;
- na mesma fatia, os nomes de arquivo que a fatia 2 deixou visíveis ao pôr tudo
  lado a lado, listados em "Nomes a corrigir na fatia 4";
- um gate que reprove teste do núcleo escrito fora da pasta dele, para a
  arrumação não desfazer sozinha na semana seguinte;
- o mapa gerado (`npm run mapa`) e o INDEX atualizados a cada fatia.

## Excluído

- mudar qualquer comportamento do núcleo. Renomear e mover é tudo, e uma linha
  de lógica alterada invalida a prova de que a mudança é neutra;
- renomear o "motor de prancha", que é o segundo uso ambíguo da palavra. É
  pequeno, é em `tools/`, e entra sozinho depois, sem disputar revisão com um
  diff de 68 arquivos;
- reorganizar `src/autoria` e `src/bancada`, que têm outro dono de problema e
  merecem plano próprio;
- reduzir a quantidade de testes ou substituir peça de rascunho por peça gerada:
  misturar com mudança de lugar torna impossível dizer qual das duas quebrou;
- mexer em `autoria-assistida/`, pelo mesmo motivo.

## Gate de saída

1. `find` na pasta do núcleo devolve, para cada arquivo de operação, um arquivo
   de teste ao lado;
2. `grep` por `prototipos` e por `v3/motor` em `tools/`, `src/`, `package.json` e
   nos arquivos de configuração não acha import nenhum;
3. os 32 gates verdes ao fim de cada fatia, não só no fim do plano;
4. um gate novo reprova teste que importe o núcleo e viva fora da pasta dele;
5. `npm run mapa` regenerado e `docs/mecanifica/INDEX.md` descrevendo a árvore
   nova.

## Fatias

Cada fatia é um commit que fecha com a bateria inteira verde. A ordem vai do
mais barato e reversível para o mais caro.

1. **Medir e declarar.** Listar, arquivo por arquivo, qual dos 46 testes em
   `tools/mecanifica` e `tools/oficina` prova o núcleo e qual prova ferramenta. A
   lista vai para este plano. Sem ela as fatias seguintes movem por palpite.
2. **Mover os testes do núcleo.** Um grupo por commit, começando pelos que
   importam só o núcleo e nada mais. Cada teste vai para a pasta da operação que
   ele prova. Teste que prova várias operações fica na raiz.
3. **Separar `tools/mecanifica`.** O que sobrar ali é ferramenta de linha de
   comando e guarda de navegador. Se as duas ainda não se distinguirem pelo
   nome da pasta, esta fatia as separa.
4. **Tirar de `prototipos/` e renomear para `nucleo`.** É a fatia cara: toca 68
   arquivos de import, o `vitest.config.ts` e o visor. Vem por último porque é a
   mais fácil de errar e a que mais depende de a bateria estar confiável. O
   caminho novo e o nome novo entram no mesmo commit, porque são a mesma linha
   de import reescrita.
5. **O gate que segura a arrumação.** Reprova teste que importe o núcleo e
   esteja fora da pasta dele, e reprova a palavra `motor` como nome de pasta de
   programa. Entra depois de a árvore estar limpa, senão nasce vermelho.

## Medido na fatia 1 — quem prova o núcleo

Dos 46 arquivos de teste em `tools/mecanifica` e `tools/oficina`, 24 importam
somente de `procedural/`; os outros 22 importam ferramenta junto e
ficam até a fatia 3. Dois dos 24 não são de núcleo apesar do import:
`conferir-juntas` e `exportar-peca` testam a ferramenta ao lado e usam o núcleo
só para fabricar a malha de entrada.

**A contagem automática de operações não serve para decidir o destino.** Medi
quantas vezes cada teste cita cada operação e o resultado põe `encostar` em
`primitivas-basicas`, porque ele constrói dezoito cubos para ter o que encostar.
O que um teste prova é o assunto dele, não a operação que usa de andaime. O
destino foi lido arquivo por arquivo e hoje está no repositório.

Cinco testes ficam em `operacoes/estruturais.js`, que já tem seis operações
dentro. Se ler esse arquivo tiver ficado pior, a resposta é uma pasta por
operação em vez de um arquivo por grupo — decisão que só se toma com os testes
já ao lado.

## Feito na fatia 2 — os testes ao lado do que provam

Os 22 entraram na pasta do núcleo, junto com `corpus-motor-r00.mjs`, que é dado
de linha de base e não ferramenta, e o arquivo de base que ele lê. O nome do
teste ficou como estava, em vez de derivar do arquivo provado como a seção
"Incluído" dizia: cinco provam `estruturais.js` e virariam cinco arquivos de
mesmo nome.

Três coisas quebraram, e as três eram acoplamento que só a mudança revela.

`vitest.config.ts` incluía `prototipos/**/*.test.js` e `.test.mjs`, e não
`.test.ts`. Quinze dos arquivos movidos são `.test.ts`, e teriam parado de rodar
em silêncio — o próprio arquivo tem um comentário dizendo que isso já aconteceu
uma vez. A extensão entrou.

`corpus-motor-r00.mjs` resolve o arquivo de base por caminho montado à mão a
partir de `import.meta.dirname`, e mover quebrou o caminho: é o risco previsto.

E `conferir-malha.ts`, usado por três testes do núcleo, importa
`src/autoria/adaptar-three.js`, contra o acordo de trabalho, que manda o núcleo
ser independente de Three.js. Ficou em `tools/oficina/`, com os três apontando
para lá; é dívida declarada e não resolvida aqui.

E `docs:citacoes:check` acusou uma skill citando o caminho antigo de um teste.

## Feito na fatia 3 — `tools/mecanifica` separada por papel

A pasta tinha 133 arquivos soltos. Saíram duas famílias inteiras:

`guardas/` com os onze guardas de navegador e o teste de um deles. São os que
sobem a bancada de verdade, e cada um tem comando próprio no `package.json`.

`prancha/` com os oito arquivos do motor de prancha e os três testes deles. É um
subsistema fechado, que desenha contorno em 2D antes de existir geometria 3D.

O que ficou na raiz é ferramenta de linha de comando — 36 arquivos com comando
próprio — e as bibliotecas que elas importam. A distinção entre essas duas ainda
não está no nome da pasta, e fica para quando doer.

Quebrou o de sempre: caminho montado à mão. Os onze guardas calculam a raiz do
repositório contando pastas para trás, com `resolve(AQUI, '../..')`, e descer um
nível quebrou os onze de uma vez. `guarda:gesto` chamava um arquivo irmão por
`join(HERE, ...)`, e o irmão deixou de ser irmão. `guarda:edicao` importava com
um `..` só, caso que a substituição automática não pegou porque ela tratou `./`
e `../../`. E `docs:citacoes:check` acusou quatro citações à pasta de prancha na
skill que a usa.

Em três fatias seguidas, o que quebrou foi sempre caminho montado à mão em vez
de import. Os gates pegaram os três, e nenhum seria pego por leitura.

## Nomes a corrigir na fatia 4

A fatia 2 pôs teste e módulo na mesma pasta, e isso revelou nome que antes
passava. Entram junto com a reescrita de import, que é a mesma linha.

`oficina.js` é a porta de entrada do núcleo e quase todo teste importa dele. A
Oficina era a aplicação para pessoas, removida do repositório, e o acordo de
trabalho registra a remoção: o nome aponta para o que não existe. Vira
`entrada.js`.

`canon-linha-de-base.test.ts` e `corpus-motor-r00.test.mjs` guardam os dois uma
fotografia do resultado para acusar mudança. Uma usa "canon", anglicismo, e a
outra "r00", número de rodada de um plano encerrado em agosto; dois nomes para a
mesma função escondem que é a mesma função. Viram `linha-de-base-*.test.*`.

Seis testes carregam sufixo que era necessário quando moravam longe do módulo e
agora repete o vizinho: `artefatos-procedencia`, `catalogo-capacidades`,
`composicoes-procedurais`, `lacunas-capacidade`, `registro-operacoes` e
`extensoes-nativas`. O sufixo sai e fica o nome do módulo provado.

`tex.js`, `geo.js` e `mat4.js` ficam: são abreviações que precisam de comentário
no topo, mas são convenção de computação gráfica e trocar não se paga.

## Riscos e parada

O risco principal é a refatoração revelar acoplamento escondido, como aconteceu
três vezes ao paralelizar os gates em 2026-09-22 e mais três na fatia 2. Um
teste pode depender da posição do arquivo por caminho montado à mão em vez de
import.

O risco que obriga parar: se mover um teste mudar o que ele afirma, o plano
parou de ser neutro e virou mudança de comportamento disfarçada. Nesse caso a
fatia volta atrás e o caso vira item próprio, com plano próprio.

Um risco de conveniência, que não obriga parar mas deve ser dito: a fatia 4
reescreve caminho em 68 arquivos e vai gerar um diff enorme e ilegível. Ela deve
ser um commit sozinho, sem nenhuma outra mudança junto, para que revisar seja
possível.

Um risco do renome: `motor` aparece em texto corrido com os três sentidos
misturados, então trocar tudo por busca e substituição renomearia também a peça
mecânica e o motor de prancha. A troca é só de caminho e nome de pasta.

## Fechamento

**Concluído em 2026-09-22.** O núcleo mora em `procedural/nucleo/`, se chama
núcleo e tem os testes dele ao lado das operações que eles provam. As quatro
primeiras fatias moveram os testes, separaram guardas de prancha em
`tools/mecanifica` e tiraram a pasta de `prototipos/`. Cada uma revelou caminho
montado à mão que só quebrava quando o arquivo mudava de lugar.

A fatia 5 entrou como teste, `procedural/nucleo/arrumacao.test.mjs`, que roda
dentro do gate `test`. A regra escrita na fatia, "teste que importe o núcleo
fora da pasta dele", reprovaria dezesseis testes legítimos: ferramentas usam o
núcleo para montar a entrada do que elas provam. O critério medido é outro. É
recusado o teste fora do núcleo cujos imports locais apontam todos para
`procedural/` e que não lê arquivo nenhum, porque esse prova só o núcleo. Hoje
nenhum teste cai nisso. O teste também recusa pasta chamada `motor` e recusa
em voz alta varredura vazia ou raiz errada. Foi provado com uma isca: um teste
falso em `tools/oficina` e uma pasta `tools/motor` fizeram as duas recusas
dispararem.

Fica de fora, como já estava: `conferir-malha.ts` continua em `tools/oficina`
porque importa Three.js, e o motor de prancha ainda leva a palavra no nome.
