# Laboratório computacional para investigação por IA

**Estado:** ativo
**Aberto em:** 2026-09-01, por decisão do usuário · **Base:** `main` em `b6367ed`
**Responsável:** Codex (desenho e R0) · Claude (integração e governança)
**Dossiê vinculante:** [`../DOSSIE-LABORATORIO-IA.md`](../DOSSIE-LABORATORIO-IA.md)
**Execução detalhada:** [`../../superpowers/plans/2026-08-31-laboratorio-computacional-ia.md`](../../superpowers/plans/2026-08-31-laboratorio-computacional-ia.md)
**Relato por fatia:** [`../LABORATORIO-IA-PROGRESSO.md`](../LABORATORIO-IA-PROGRESSO.md)

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
| R6 | dois pilotos verticais em domínios diferentes | não iniciada |
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
- **A falta de foco custou caro e pode voltar.** Este plano passou de 2026-09-01
  sem dizer o que se estuda, e o preço foi maquinaria construída sem pergunta.
  A seção "Foco" existe para que a próxima frente seja cobrada contra ela.

## Arquivos reservados

`laboratorio/**`, `tools/arquitetura/independencia-laboratorio*`,
`docs/mecanifica/DOSSIE-LABORATORIO-IA.md` e
`docs/superpowers/plans/2026-08-31-laboratorio-computacional-ia.md`.

Trabalho de autoria e de núcleo da Mecanifica segue livre: é justamente o que a
fronteira existe para garantir.
