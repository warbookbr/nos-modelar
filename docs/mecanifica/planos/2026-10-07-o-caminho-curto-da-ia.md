# O caminho curto da IA

**Estado:** ativo

**Responsável:** Claude, com o aceite da pessoa

**Repositório e base:** `warbookbr/nos-mecanifica`, branch da sessão sobre a `main`

## Problema observado

A IA que chega ao repositório gasta boa parte do custo antes de fazer o que veio
fazer. A leitura obrigatória antes de gerar forma passa de 60 mil caracteres, com
mais documentos sob demanda, e muita regra vive só em prosa, valendo apenas se
for lida e lembrada. No [banco de
provas](../banco-de-provas/BANCO-DE-PROVAS.md), um objeto simples de esboço no
nível médio custou de 136 mil a 247 mil tokens, e só uma parte disso foi
modelar: o esbocista lê a skill inteira, reescreve o JSON para mudar uma forma e
abre quatro imagens grandes a cada conferência. O `CLAUDE.md` já separa a
entrada por tipo de tarefa e as skills carregam sob demanda, mas a separação para
no primeiro nível e devolve documentos, que a IA ainda precisa traduzir em ação.

## Resultado

A IA entra pelo que veio fazer e recebe só o que aquela tarefa pede. Um comando
de entrada, também exposto como ferramenta no MCP, recebe a intenção (trabalhar
no projeto, modelar, trabalhar na documentação, pesquisar) e devolve, em níveis
sob demanda, os arquivos, a skill, os comandos e o estado atual (plano ativo,
tarefa aberta, estágio do Condutor); para modelar, devolve também as primitivas,
os componentes e as ferramentas disponíveis. Acima disso, ele olha o estado do
trabalho e diz o passo seguinte: o comando exato, o que ler só para ele e o que
será conferido no fim, como o Condutor do esboço já faz dentro do esboço. Para a
IA não esquecer o que não leu, o esquema é híbrido: uma página curta de
invariantes vale para toda intenção e é sempre lida, e toda regra verificável
sai do texto e vira gate ou recusa cuja mensagem traz o comando que resolve. O
esboço fica mais barato pelo que a medição mostrar.

## Incluído

- a medição de onde vão os tokens nas transcrições dos quatro esbocistas do
  banco de provas (leitura da skill e do README, escrita do JSON, `--descrever`
  e `--analise`, imagens abertas, voltas com o gate);
- a página de invariantes sempre lida e os roteiros por intenção como dados
  versionados, com um gate que confere que todo arquivo citado existe e que cada
  roteiro cabe num orçamento de leitura;
- o comando de entrada (`npm run comecar -- <intenção>`) e a ferramenta MCP
  equivalente, com os níveis sob demanda e o passo seguinte lido do estado;
- o `CLAUDE.md` reduzido a roteador e invariantes, a leitura obrigatória
  medida antes e depois, e as regras verificáveis da leitura obrigatória
  convertidas em gate ou recusa com o comando que resolve;
- o esboço mais barato pelo que a [medição](../banco-de-provas/MEDICAO-DE-TOKENS-2026-10.md)
  mostrou: o `modulos/esboco/README.md`, lido quase inteiro em todo objeto, foi
  44% do que entrou no contexto, e as imagens abertas foram 27%, enquanto a skill
  pesou 6% e a escrita do JSON 3%. Por isso a referência do JSON passa a ser
  consultada por tópico (`npm run esboco -- --ajuda <tópico>`, também no MCP),
  com o agente e a skill apontando para ela em vez do README, e a conferência
  passa a usar uma imagem composta e menor das quatro vistas, abrindo a vista
  inteira só quando o gate ou o crítico pedir. Como o custo é o contexto vezes os
  turnos (de 15 a 44 por objeto), o passo seguinte do Condutor também conta;
- os reforços que fazem a divulgação progressiva funcionar: cada item do índice
  (tópico ou roteiro) diz em uma frase o que contém e quando usar; um gate limita
  o tamanho de cada tópico, para que seção grande seja dividida; toda recusa do
  gate ou do comando aponta o tópico que resolve (`veja --ajuda tubo`), para a
  leitura acontecer quando a IA precisa e não antes por precaução; o uso fica
  registrado (tópicos pedidos e recusas repetidas), para mostrar onde o índice
  falha; e as descrições das skills, carregadas em toda sessão no piso de 42,5 mil
  tokens de cada agente, ficam curtas;
- os quatro objetos de esboço do banco refeitos pelo caminho curto, comparados
  com a medição de 2026-10-07.

## Excluído

- as fatias 2 a 9 de [as ferramentas de
  modelagem](congelados/2026-10-07-as-ferramentas-de-modelagem.md), congelado
  até este plano fechar;
- as primitivas 2.0, que ficam naquele plano e vão baratear depois as peças que
  se repetem;
- mudar o núcleo procedural, o formato de receita ou a montagem;
- apagar documento por estar fora de um roteiro: o que não entra em roteiro
  continua consultável e é revisto à parte.

## Gate de saída

1. A medição dos tokens está registrada, com a parte de cada etapa.
2. O comando de entrada e a ferramenta MCP devolvem roteiro e passo seguinte
   para cada intenção, com teste.
3. Os roteiros são dados com gate de existência e de orçamento de leitura.
4. A leitura obrigatória de cada intenção é menor que a de hoje, medida pelo
   gate `leitura:obrigatoria`.
5. Os quatro objetos de esboço refeitos custam menos tokens que na medição de
   2026-10-07, com nota final igual ou maior, e o esbocista não lê o README do
   módulo para escrever o JSON.
6. `npm run gates --completo` passa.

## Fatias

1. Medir onde vão os tokens nas transcrições dos quatro esbocistas. Feita em
   2026-10-07: [a medição](../banco-de-provas/MEDICAO-DE-TOKENS-2026-10.md).
2. O esboço mais barato: a referência do JSON por tópico no lugar do README e a
   imagem composta na conferência, com a frase de cada tópico e o teto de tamanho
   por tópico. Vem antes das outras por ser o maior ganho medido e não depender
   delas.
3. A página de invariantes e os roteiros por intenção como dados, com gate.
   Feita em 2026-10-08: [os roteiros](../roteiros/ROTEIROS.md), com a linha de
   base de cada intenção, e o gate `leitura:obrigatoria` passou a conferir
   todos os roteiros. Dos onze invariantes, só o do mapa tem gate; os outros
   ficam para a fatia 5.
4. O comando de entrada e a ferramenta MCP, com o passo seguinte pelo estado.
5. O `CLAUDE.md` como roteador, as regras verificáveis convertidas em gate, as
   recusas apontando o tópico, o registro de uso e as descrições das skills
   enxutas.
6. Os quatro objetos refeitos e o fechamento.

## Riscos e desvios

O risco maior é a IA pular algo importante por não estar no roteiro dela. O
desvio é o esquema híbrido: os invariantes são sempre lidos, as regras
verificáveis viram gate, e o comando de entrada lista o que existe fora do
roteiro, sem carregar. O segundo risco é os roteiros envelhecerem; o gate de
existência e de orçamento os confere a cada mudança. O terceiro é baratear o
esboço à custa da nota; o gate de saída exige nota igual ou maior.

## Fechamento

A preencher.

## Depois deste plano

[As ferramentas de modelagem](congelados/2026-10-07-as-ferramentas-de-modelagem.md)
voltam a partir da fatia 2, com o banco de provas refeito por este caminho como
o novo "antes".
