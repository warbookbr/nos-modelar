# O núcleo mora num lugar só, e se chama núcleo

**Estado:** ativo

**Responsável:** Tiago (autoria) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-mecanifica`, base `a82ed587` na main.

## Problema observado

O motor procedural tem 26 arquivos e 8.596 linhas, e nenhum teste dentro dele.
As provas do que ele garante estão em outras três árvores: 23 arquivos de teste
em `tools/mecanifica`, 22 em `tools/oficina` e 1 em `src/autoria`. Nada diz
onde procurar. Para saber se a operação `furo` está protegida, é preciso varrer
as três pastas e ler o conteúdo de cada arquivo, porque o nome também não diz.

O efeito é o mesmo que a peça sofria antes de 2026-09-11, e a solução conhecida
é a mesma. Quem vai mexer numa operação precisa descobrir a cada sessão onde
mora a prova dela, e quem escreve uma operação nova não tem onde pôr a prova
sem escolher uma pasta por conveniência, que foi como as três se formaram.

Há três agravantes medidos. O primeiro é o caminho: ele mora em
`prototipos/procedural/v3/`, e o projeto inteiro depende dele, com 30 arquivos
de produção e 38 de teste importando por aí. O nome da pasta afirma que é
experimento e o uso afirma o contrário.

O segundo é o nome. A pasta se chama `motor`, e a palavra já nomeia três coisas
distintas aqui: este programa, o "motor de prancha" que desenha contorno em 2D,
e a peça mecânica que vai dentro de um carro — sentido que o próprio README usou
até 2026-09-22. Num repositório de modelagem mecânica, a terceira acepção é a
que qualquer leitor encontra primeiro, e uma peça chamada `motor` no acervo
colidiria com a pasta do programa. O projeto já tem outro nome para a mesma
coisa e o usa dezessete vezes nos documentos de entrada: núcleo. O `CLAUDE.md`
escreve "o núcleo de autoria é independente de Three.js", e dentro da pasta
`motor/` existe um `nucleo.js`. A pasta tem um nome, a documentação usa outro, e
o da pasta é o ambíguo.

O terceiro é que `tools/mecanifica` acumulou 144 arquivos com 74 testes,
misturando ferramenta de linha de comando, guarda de navegador e prova do núcleo
na mesma pasta, sem que o nome distinga qual é qual.

## Resultado

Abrir a pasta de uma operação do núcleo mostra o que ela faz e o que garante que
ela faz. `tools/` passa a guardar somente o que alguém digita na linha de
comando. Nenhum caminho de import diz `prototipos`, e a palavra `motor` deixa de
nomear programa, ficando livre para a peça mecânica.

## Filtro Agent-First

**REFATORAR.** Não há capacidade nova aqui, e é a decisão certa mesmo assim
porque o custo que ela baixa é de contexto, que é o recurso mais caro de quem
trabalha neste repositório por sessão. Hoje responder "o que protege esta
operação" exige ler três árvores; depois exige abrir uma pasta. Adiar tem custo
crescente: cada operação nova nasce com a prova em mais um lugar arbitrário.

O risco de refatoração pura é conhecido e é o motivo de este plano existir por
escrito: mover arquivo não muda comportamento, então a prova de que nada
quebrou é a bateria inteira verde em cada fatia, e não o julgamento de quem
moveu.

## Incluído

- mover cada teste do núcleo para junto da operação que ele prova, na mesma
  pasta, com o nome derivado do arquivo provado;
- separar em `tools/mecanifica` o que é ferramenta de linha de comando do que é
  prova do núcleo, movendo só o segundo;
- tirar o núcleo de `prototipos/` e renomear a pasta `motor` para `nucleo`, na
  mesma fatia, porque as duas mudanças tocam exatamente os mesmos imports e
  separá-las custaria o dobro por nenhum ganho de revisão;
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
- reduzir a quantidade de testes, ou substituir peça de rascunho por peça
  gerada. É trabalho real e separado, e misturar com mudança de lugar torna
  impossível dizer qual das duas quebrou algo;
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

## Riscos e parada

O risco principal é a refatoração revelar acoplamento escondido, como já
aconteceu três vezes ao paralelizar os gates em 2026-09-22. Um teste pode
depender da posição relativa do arquivo, por caminho montado à mão em vez de
import. A fatia 1 existe para encontrar isso antes de mover qualquer coisa.

O risco que obriga parar: se mover um teste mudar o que ele afirma, o plano
parou de ser neutro e virou mudança de comportamento disfarçada. Nesse caso a
fatia volta atrás e o caso vira item próprio, com plano próprio.

Um risco de conveniência, que não obriga parar mas deve ser dito: a fatia 4
reescreve caminho em 68 arquivos e vai gerar um diff enorme e ilegível. Ela deve
ser um commit sozinho, sem nenhuma outra mudança junto, para que revisar seja
possível.

Um risco do renome: `motor` aparece em texto corrido de documento, comentário e
mensagem de commit, com os três sentidos misturados. Trocar tudo por busca e
substituição renomearia também a peça mecânica e o motor de prancha. A troca é
só de caminho de import e de nome de pasta; texto corrido é lido um a um.

## Fechamento

Preencher somente ao concluir ou cancelar.
