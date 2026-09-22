# O motor mora num lugar só

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

Há dois agravantes medidos. O motor mora em `prototipos/procedural/v3/`, e o
projeto inteiro depende dele: 30 arquivos de produção e 38 de teste o importam
por esse caminho. O nome da pasta afirma que é experimento e o uso afirma o
contrário. E `tools/mecanifica` acumulou 144 arquivos com 74 testes, misturando
ferramenta de linha de comando, guarda de navegador e prova de motor na mesma
pasta, sem que o nome distinga qual é qual.

## Resultado

Abrir a pasta de uma operação do motor mostra o que ela faz e o que garante que
ela faz. `tools/` passa a guardar somente o que alguém digita na linha de
comando. Nenhum caminho de import diz `prototipos`.

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

- mover cada teste de motor para junto da operação que ele prova, na mesma
  pasta, com o nome derivado do arquivo provado;
- separar em `tools/mecanifica` o que é ferramenta de linha de comando do que é
  prova de motor, movendo só o segundo;
- tirar o motor de `prototipos/` e pôr num caminho que descreva o que ele é;
- um gate que reprove teste de motor escrito fora da pasta do motor, para a
  arrumação não desfazer sozinha na semana seguinte;
- o mapa gerado (`npm run mapa`) e o INDEX atualizados a cada fatia.

## Excluído

- mudar qualquer comportamento do motor. Renomear arquivo e mover pasta é tudo,
  e uma linha de lógica alterada invalida a prova de que a mudança é neutra;
- reorganizar `src/autoria` e `src/bancada`, que têm outro dono de problema e
  merecem plano próprio;
- reduzir a quantidade de testes, ou substituir peça de rascunho por peça
  gerada. É trabalho real e separado, e misturar com mudança de lugar torna
  impossível dizer qual das duas quebrou algo;
- mexer em `autoria-assistida/`, pelo mesmo motivo.

## Gate de saída

1. `find` na pasta do motor devolve, para cada arquivo de operação, um arquivo
   de teste ao lado;
2. `grep` por `prototipos` em `tools/`, `src/`, `package.json` e nos arquivos de
   configuração não acha import nenhum;
3. os 32 gates verdes ao fim de cada fatia, não só no fim do plano;
4. um gate novo reprova teste que importe o motor e viva fora da pasta dele;
5. `npm run mapa` regenerado e `docs/mecanifica/INDEX.md` descrevendo a árvore
   nova.

## Fatias

Cada fatia é um commit que fecha com a bateria inteira verde. A ordem vai do
mais barato e reversível para o mais caro.

1. **Medir e declarar.** Listar, arquivo por arquivo, qual dos 46 testes em
   `tools/mecanifica` e `tools/oficina` prova o motor e qual prova ferramenta. A
   lista vai para este plano. Sem ela as fatias seguintes movem por palpite.
2. **Mover os testes de motor.** Um grupo por commit, começando pelos que
   importam só o motor e nada mais. Cada teste vai para a pasta da operação que
   ele prova. Teste que prova várias operações fica na raiz do motor.
3. **Separar `tools/mecanifica`.** O que sobrar ali é ferramenta de linha de
   comando e guarda de navegador. Se as duas ainda não se distinguirem pelo
   nome da pasta, esta fatia as separa.
4. **Tirar o motor de `prototipos/`.** É a fatia cara: toca 68 arquivos de
   import, o `vitest.config.ts` e o visor. Vem por último porque é a mais fácil
   de errar e a que mais depende de a bateria estar confiável.
5. **O gate que segura a arrumação.** Reprova teste que importe o motor e esteja
   fora da pasta dele. Entra depois de a árvore estar limpa, senão nasce
   vermelho.

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

## Fechamento

Preencher somente ao concluir ou cancelar.
