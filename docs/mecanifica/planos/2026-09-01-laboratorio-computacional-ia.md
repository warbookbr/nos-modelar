# Laboratório computacional para investigação por IA

**Estado:** ativo
**Aberto em:** 2026-09-01, por decisão do usuário · **Base:** `main` em `b6367ed`
**Responsável:** Codex (desenho e R0) · Claude (integração e governança)
**Dossiê vinculante:** [`../DOSSIE-LABORATORIO-IA.md`](../DOSSIE-LABORATORIO-IA.md)
**Execução detalhada:** [`../../superpowers/plans/2026-08-31-laboratorio-computacional-ia.md`](../../superpowers/plans/2026-08-31-laboratorio-computacional-ia.md)

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

## Escopo

O laboratório é **geral**: formula estudos, pesquisa evidências, planeja e
executa experimentos, valida modelos e quantifica incerteza. A Mecanifica é um
instrumento **opcional** dele. Uma IA que só quer modelar continua usando a
Mecanifica sem saber que o laboratório existe.

Fora de escopo, e escrito para não voltar por analogia: o laboratório não vira
dependência do núcleo, não edita peça, não promove recomendação a autoria, e não
executa código arbitrário.

## Fatias

Herdadas do dossiê (seção 15) e do documento de execução (12 tasks). Uma fatia
só abre com a anterior verde.

| fatia | entrega verificável | estado |
| --- | --- | --- |
| R0 | esqueleto isolado, guarda de dependência, contratos e hashing canônico | **entregue**: identidade canônica, cinco contratos mínimos e o primeiro estudo real |
| R1 | artefatos, proveniência e reprodução | **parcial**: armazém, proveniência e verificação de reprodução entregues; RO-Crate adiado |
| R2 | registro de instrumentos, DAG validado e runner confinado | não iniciada |
| R3 | pesquisa, fontes e grafo de alegações | não iniciada |
| R4 | unidades, V&V, incerteza e sensibilidade | não iniciada |
| R5 | ponte neutra da Mecanifica | não iniciada |
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

## R0 — o que o primeiro estudo devolveu

A Task 2 pedia "contratos v1 e identidade canônica". Ela foi feita **ao
contrário do plano, de propósito**: em vez de desenhar os nove contratos do
dossiê e depois procurar uso, rodei um estudo real e deixei que ele pedisse os
campos. Saíram cinco documentos, e cada campo existe porque o estudo usa.

A pergunta veio da modelagem, não de exercício: *dá para baixar a torção das
faces da cabeça do machado abaixo de 1% mexendo em `lados` e `expoenteSecao`,
sem mudar a forma?*

**A resposta é não.** A torção cai monotonicamente com `expoenteSecao`
(sustentada no domínio testado), mas o mínimo alcançável é 1,8% — nenhuma
configuração chega ao alvo com a forma preservada. Hipótese **contradita**, e
esse era um dos desfechos previstos por escrito antes de medir.

### O que o estudo achou que eu não fui procurar

**`lados` não é parâmetro livre nesta peça.** A primeira varredura devolveu 21
de 25 execuções gritando. A causa não era ruído: o furo do olho precisa CABER
numa face, e aumentar `lados` estreita a face. Dos cinco valores testados, só
`14` mantém o olho furável. A pergunta estava mal-posta, e foi o instrumento que
mostrou.

Isso também expôs um defeito latente na receita: `LADO_TOPO` e `LADO_FUNDO`
eram os literais 3 e 10, derivados à mão de `lados: 14`. Agora são calculados de
`lados`. Quem mexesse nesse número herdaria um furo fora do lugar, em silêncio.

### E um defeito no próprio instrumento, que o canário pegou

A primeira versão trocava `receita.PARAMS` — mas a receita calcula os argumentos
no carregamento do módulo, então o parâmetro não chegava a lugar nenhum e as 25
medidas saíram **idênticas**, com cara de varredura. Instrumento que não mede
nada e responde mesmo assim é o pior tipo. Agora ele tem um canário que compara
duas configurações que TÊM de diferir e se derruba se vierem iguais.

### O laboratório se pagou nesta rodada?

**Em parte, e vale ser exato.** O que mudou o resultado foi disciplina barata:
declarar o critério de refutação antes de medir, separar quem mede de quem
julga, e recusar conclusão vinda de execução que gritou. Nada disso precisou de
DAG, proveniência ou RO-Crate.

O que ainda não se pagou é a maquinaria pesada das fatias R1 a R7. Ela continua
justificada pelo dossiê, não por evidência deste estudo — e essa distinção fica
escrita para a próxima rodada cobrar.

## R1 — o que entrou, e o que ficou de fora com motivo

O buraco veio do R0, por uso: a síntese concluiu sobre a torção da cabeça do
machado **sem dizer qual cabeça**, e a receita mudou no meio do estudo. Quem
lesse a conclusão depois não teria como saber que objeto foi medido.

Entrou o que fecha isso:

- **armazém por conteúdo** — o id do artefato é o hash dele. Guardar o mesmo
  conteúdo duas vezes é no-op; conteúdo trocado por baixo é recusado na leitura,
  porque o nome prometia um hash que o conteúdo não tem;
- **proveniência** — commit, árvore limpa ou suja, e hash dos BYTES de cada
  entrada. Ela **recusa** chamar de reproduzível o que não é: sem commit, com
  árvore suja ou sem entrada identificada, ela diz não e diz por quê;
- **verificação de reprodução**, em três níveis separados de propósito. Entrada
  diferente é `nao-comparavel` — o caso mais perigoso é justamente aquele em que
  os números batem e não significam nada. Medida diferente com a mesma entrada é
  achado, não ruído. Conclusão diferente é o único nível que invalida a síntese.

**RO-Crate ficou de fora, e isso é decisão.** Ele é formato de EXPORTAÇÃO e não
existe consumidor: ninguém, dentro nem fora, pede um pacote nesse formato hoje.
Construí-lo agora seria adivinhar o que um leitor futuro quer — o mesmo erro que
esta fatia acabou de evitar ao deixar os contratos nascerem do estudo. Entra
quando houver quem leia.

Prova de ponta a ponta: duas execuções do instrumento, guardadas por conteúdo,
avaliadas e comparadas — veredito `reproduzido`. E a proveniência da rodada saiu
**não confiável**, corretamente, porque a árvore estava suja na hora.

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
- **O CI do repositório não aloca runner desde 2026-08-26.** Enquanto isso durar,
  nenhum gate deste plano é verificado automaticamente — só localmente. Isso não
  é passivo do laboratório, mas ele herda o risco.

## Arquivos reservados

`laboratorio/**`, `tools/arquitetura/independencia-laboratorio*`,
`docs/mecanifica/DOSSIE-LABORATORIO-IA.md` e
`docs/superpowers/plans/2026-08-31-laboratorio-computacional-ia.md`.

Trabalho de autoria e de núcleo da Mecanifica segue livre: é justamente o que a
fronteira existe para garantir.
