# Laboratório computacional para investigação por IA

**Estado:** concluído
**Aberto em:** 2026-09-01, por decisão do usuário · **Base:** `main` em `b6367ed`
**Responsável:** Codex (desenho e R0) · Claude (integração e governança)
**Dossiê vinculante:** [`../../DOSSIE-LABORATORIO-IA.md`](../../DOSSIE-LABORATORIO-IA.md)
**Execução detalhada:** removida em 2026-09-11 junto com `docs/superpowers/`; o
subsistema `laboratorio/` saiu deste repositório em 2026-09-03
**Relato por fatia:** [`../../LABORATORIO-IA-PROGRESSO.md`](../../LABORATORIO-IA-PROGRESSO.md)

## O que este plano autoriza, e o que não

Autoriza **incubar** o laboratório dentro deste repositório, como subsistema
isolado em `laboratorio/`, com a guarda de independência ligada desde o primeiro
dia. Não autoriza promovê-lo: a seção 17 do dossiê lista onze condições para uma
proposta de integração ao núcleo existir, e **nenhuma delas está cumprida hoje**.

A distinção importa porque foi ela que permitiu trazer isto para a `main` sem
contradizer o próprio desenho. O que entrou é documentação, fronteira e
esqueleto vazio — não capacidade científica. O gate `arquitetura:lab:check` é o
que torna essa promessa verificável em vez de declarada.

## Por que na `main` e não na branch

O desenho nasceu dizendo-se restrito à branch `experimento/laboratorio-ia`. A
decisão do usuário em 2026-09-01 mudou isso, e a razão é boa: incubação em
branch longa apodrece — ela não roda nos gates, não aparece para quem lê o
INDEX, e diverge do núcleo a cada mudança. Incubar na `main` atrás de uma
fronteira testada expõe o custo real desde o começo.

O preço é que a fronteira precisa ser levada a sério. Se `arquitetura:lab:check`
ficar vermelho, o laboratório sai — não se afrouxa a guarda.

## Foco

**O laboratório estuda materiais.** Criação de ligas e misturas, propriedades
mecânicas, resistência, rigidez, estabilidade, e o custo de conseguir aquilo na
prática.

Isto está escrito porque a versão anterior deste plano dizia apenas "o
laboratório é geral", e generalidade sem assunto não é escopo — é ausência de
escopo com nome bonito. Sete módulos de infraestrutura foram construídos antes
de alguém cobrar qual era a pergunta. A maquinaria serviu; a falta de foco quase
levou a apagar o módulo de fontes, que é central para materiais e parecia
supérfluo para um laboratório de nada.

Generalidade continua valendo como FORMA, não como assunto: os contratos, a
proveniência e a validação não conhecem materiais, e é por isso que outro
domínio caberia depois. Mas o domínio de trabalho é um só, e é este.

A Mecanifica é instrumento **opcional**: geometria entra quando o estudo precisa
de forma, e muitos estudos são só número e algoritmo.

## Onde cada coisa roda

Parte do trabalho não cabe neste ambiente, e fingir que cabe seria planejar
contra a realidade:

- **aqui (efêmero, CPU, sem garantia de rede):** contratos, planejamento,
  análise, modelos baratos, dinâmica molecular pequena, e os testes;
- **na máquina do usuário:** cálculo quântico, varredura longa, qualquer coisa
  medida em horas.

Consequências que o desenho tem de honrar: resultado é salvo **por ponto**, nunca
só no fim, porque execução longa pode morrer no meio; e o armazém por conteúdo
existe para que conta cara rode **uma vez** e nunca mais. Os gates automáticos
rodam apenas casos minúsculos, o suficiente para provar que o instrumento
funciona — nunca a conta real.

## Limite honesto

O laboratório não substitui ensaio físico e não prevê liga nova do zero. O que
ele faz: calcular por modelos estabelecidos dentro da faixa em que valem,
comparar candidatas com o trade-off explícito, achar quais variáveis realmente
importam, e reunir valor publicado com condição e contradição preservadas. A
ponte entre o átomo e a peça é o problema difícil da ciência de materiais, não
uma peça de código que falta.

## Fatias

Herdadas do dossiê (seção 15) e do documento de execução (12 tasks). Uma fatia
só abre com a anterior verde.

| fatia | entrega verificável | estado |
| --- | --- | --- |
| R0 | esqueleto isolado, guarda de dependência, contratos e hashing canônico | **entregue**: identidade canônica, cinco contratos mínimos e o primeiro estudo real |
| R1 | artefatos, proveniência e reprodução | **parcial**: armazém, proveniência e verificação de reprodução entregues; RO-Crate adiado |
| R2 | registro de instrumentos, DAG validado e runner confinado | **entregue**: registro, planejador que prova o grafo antes de executar e executor com limites e confinamento declarado |
| R3 | pesquisa, fontes e grafo de alegações | **parcial por decisão**: grafo de fontes, alegações e conflitos entregue; conectores de rede adiados por não haver como prová-los |
| R4 | unidades, V&V, incerteza e sensibilidade | **parcial por decisão**: grandezas com dimensão e composição de pareceres entregues; incerteza adiada por não haver instrumento estocástico |
| R5 | ponte neutra da Mecanifica | **entregue**: adaptador fora do núcleo, revisão fixada por conteúdo, recomendação sem aplicação automática e guarda de direção |
| M1 | material, escolha do próximo experimento, trocas, leis e bancos públicos | **entregue**: as cinco frentes do foco em materiais |
| R6 | dois pilotos verticais em domínios diferentes | **piloto 1 entregue**: cabo de pá, com viga, incerteza propagada, trocas e recomendação; piloto 2 não iniciado |
| R7 | serviços Agent-First, CLI/MCP e prova caixa-preta | não iniciada |

## Gates

Cada um precisa ser visto **vermelho** antes de ser aceito. Gate que nunca falhou
é decoração — a regra é do repositório e vale aqui igual.

- **L1 — independência.** `npm run arquitetura:lab:check` recusa qualquer import
  de `laboratorio/` a partir de `src/`, `tools/`, `prototipos/` ou `modulos/`.
  Já entregue, com teste que constrói a violação e exige código não-zero.
  **Visto vermelho na integração**, com o arquivo e a linha nomeados. Limite
  conhecido: ele varre `git ls-files`, então uma violação em arquivo ainda não
  rastreado passa — protege a `main`, não o meio da edição.
- **L2 — o núcleo não carrega o laboratório.** Uso simples da Mecanifica (criar
  peça, conferir malha, abrir bancada) não importa nada de `laboratorio/`.
- **L3 — contrato antes de instrumento.** Nenhum instrumento é registrado sem
  manifesto validado; importar módulo ou achar executável no `PATH` não concede
  capacidade.
- **L4 — canário antes de piloto.** Um instrumento que erra problema de resposta
  conhecida não participa de piloto (dossiê, 16.2).
- **L5 — sem verdade.** Nenhuma hipótese recebe estado `verdadeira` e nenhuma
  síntese emite escalar universal de confiança.

## Condição de parada

Este plano encerra, preservando relatório e evidências, se qualquer uma ocorrer
— são as do dossiê (seção 18), repetidas aqui porque condição de parada que mora
só no anexo não para nada:

1. o segundo domínio exigir reescrever os contratos fundamentais;
2. a Mecanifica precisar importar o laboratório para funcionar;
3. reprodução depender sistematicamente da conversa ou de estado oculto;
4. o custo de confinamento e proveniência superar o valor experimental;
5. não for possível evitar conclusão indevidamente forte na interface da IA;
6. licenças impedirem composição sustentável.

## Passivo declarado

Coisas que estão erradas ou faltando **agora**, escritas para não serem
descobertas como surpresa:

- **Baseline não é verde de verdade.** O dossiê (seção 19) registra quatro
  provas que falharam no Windows por `EPERM` ao criar symlink, antes de
  exercitar o comportamento. Precisam rodar em ambiente com permissão de symlink
  antes de qualquer alegação de baseline íntegra. Em Linux a suíte passa.
- **`lab:test` não era portátil, em dois níveis.** O script vinha com caminho
  fixo de Windows (`laboratorio\.venv\Scripts\python.exe`), que não roda em
  Linux, macOS nem no CI; e mesmo corrigido, os testes só importavam o pacote se
  alguém tivesse criado e instalado uma venv antes. Um teste que depende de passo
  manual não documentado é um teste que não roda. Resolvido com `conftest.py`
  pondo `src/` no caminho, que funciona em qualquer sistema sem preparo.
- **Python é linguagem nova neste repositório.** Dobra a superfície de CI e de
  manutenção. A aposta está declarada no dossiê (seção 13) e o custo aparece
  quando R1 trouxer a primeira dependência de verdade.
- **Restrição nova não foi passada nas linhas velhas.** A parede mínima prática
  do estudo do cabo nasceu na varredura de variantes e nunca alcançou a tabela de
  geometrias: aço (1,2 mm) e alumínio (2,0 mm) a violam desde antes de ela
  existir, e rodavam sem que nada acusasse. Ficam como estão — metal já está
  reprovado por vibração — mas agora nomeadas em `PAREDES_ANTERIORES_A_MINIMA`,
  presas por teste, e marcadas em cada resultado da consulta. **A regra vale além
  deste estudo:** restrição nova precisa ser passada nas linhas velhas, ou vira
  regra só para quem chegou depois.
- **A falta de foco custou caro e pode voltar.** Este plano passou de 2026-09-01
  sem dizer o que se estuda, e o preço foi maquinaria construída sem pergunta.
  A seção "Foco" existe para que a próxima frente seja cobrada contra ela.

## Arquivos reservados

`laboratorio/**`, `tools/arquitetura/independencia-laboratorio*` e
`docs/mecanifica/DOSSIE-LABORATORIO-IA.md`.

Trabalho de autoria e de núcleo da Mecanifica segue livre: é justamente o que a
fronteira existe para garantir.

## Encerramento — 2026-09-03: o laboratório saiu deste repositório

A incubação provou o ponto que o dossiê levantava (seção 9): manter ciência de
materiais e autoria 3D no mesmo repositório obriga qualquer leitura — humana ou
de IA — a atravessar os dois domínios para entender qualquer um dos dois. A
fronteira testada por `arquitetura:lab:check` provava que o núcleo não dependia
do laboratório, mas não resolvia o custo de leitura do lado de quem só queria
um dos dois.

**Decisão do usuário:** migrar `laboratorio/` inteiro, com histórico, para
[`warbookbr/nos-ciencia`](https://github.com/warbookbr/nos-ciencia), via
`git subtree split`. A separação é **sem conhecimento em nenhum sentido**: este
repositório não importa nem referencia nada do laboratório, e o laboratório não
importa o motor de receitas. Quem quiser cruzar as duas coisas — criar uma peça
aqui a partir de um resultado de lá, ou levar um dado medido daqui pra lá —
faz isso manualmente, citando versão e commit do lado citado.

O único arquivo que dependia de fato do motor —
`adaptadores/mecanifica-node/medir-torcao.mjs`, que executava
`executarReceita` para medir torção de malha — não podia atravessar a
separação como estava: um instrumento que roda o motor tem que morar onde o
motor mora. Ele virou `tools/mecanifica/medir-torcao.mjs`, aqui. O estudo
Python que julga a medida (`torcao_do_machado.py`, agora em `nos-ciencia`)
nunca invocava esse instrumento diretamente — sempre recebia um pacote JSON já
pronto — então a separação não quebrou o julgamento, só o transporte do dado
entre os dois lados, que passa a ser manual.

Removidos deste repositório: `laboratorio/` inteiro, `tools/arquitetura/independencia-laboratorio*`,
os passos `arquitetura:lab:check`/`lab:test`/`lab:*` do `package.json` e do CI.
O dossiê e o relato de progresso deste plano (`DOSSIE-LABORATORIO-IA.md`,
`LABORATORIO-IA-PROGRESSO.md`) ficam como registro histórico do desenho e da
incubação — não descrevem mais código presente nesta árvore.
