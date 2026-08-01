# Experimento A/B — o fluxo ajuda a IA a modelar?

**Estado: CONCLUÍDO em 1º de agosto de 2026.** Este experimento mede o efeito do
fluxo; ele não reabre o ciclo que o implementou e as duas peças continuam fora
do produto.

## Pergunta

Um Sol com o pacote de modelagem assistida produz uma peça melhor ou chega ao
resultado com menos atrito que outro Sol trabalhando a partir do mesmo pedido,
mas sem o pacote, os guias e o ciclo formal de revisão?

## Protocolo

Dois Sols, em worktrees isoladas sobre o mesmo commit, receberam o mesmo alvo
inédito: uma dobradiça vertical de portão com duas folhas, três gomos alternados
e um pino, exatamente nas partes `folhaFixa`, `folhaMovel`, `barrilFixo`,
`barrisMoveis` e `pino`. Não houve imagem nem referência externa.

- **condição assistida:** recebeu briefing versionado, perfil
  `tecnicoDidatico` F2, três guias combináveis, orçamento, checklist e comandos
  de revisão;
- **condição crua:** recebeu somente o pedido comum e acesso normal às APIs do
  repositório; foi proibida de ler o material da outra condição;
- nenhum modelador recebeu crítica externa antes de entregar;
- depois da entrega, as evidências foram normalizadas sem corrigir os modelos;
- dois Terra avaliaram A e B sem código, histórico ou pareamento. A divergência
  de veredito acionou um terceiro Terra árbitro, também cego.

Pareamento revelado somente depois dos pareceres: **A = assistida; B = crua**.

A regra foi fixada antes da execução: há evidência de ajuda se a condição
assistida vencer a mediana por pelo menos 3/16, ou empatar em pontos, ganhar ao
menos dois gates binários e não exigir mais tentativas.

## Resultado

| medida | assistida (A) | crua (B) |
|---|---:|---:|
| notas cegas | 14, 15, 14 | 14, 12, 14 |
| mediana cega | **14/16** | **14/16** |
| faces / vértices | 430 / 560 | 326 / 384 |
| partes / materiais | 5 / 3 | 5 / 3 |
| faces sem identidade / órfãos | 0 / 0 | 0 / 0 |
| portas semânticas | 3 | 0 |
| altura total | 1,22 — atende | 1,38 — não atende |
| quatro vistas aceitas pelo gate | 4/4 | 3/4; superior recusada |
| fonte | 191 linhas; 6,5 KB | 242 linhas; 11 KB |
| rodadas visuais reportadas pelo modelador | 8 tentativas do comando de revisão | 3 rodadas |

O árbitro fixou **empate em 14/16**. A condição assistida perdeu legibilidade do
pino e utilidade das vistas direita/superior. A condição crua perdeu o limite de
altura e a validade da vista superior. Os dois isolamentos semânticos passaram
nas duas condições.

Pela regra prévia, **não foi demonstrado ganho líquido de modelagem**: A ganhou
dois gates objetivos — envelope dimensional e revisão 4/4 —, mas precisou de
mais tentativas. Portanto, este teste não sustenta a frase “o fluxo faz o Sol
modelar melhor” nem a frase “o fluxo torna a criação mais rápida”.

## O que ajudou de verdade

- **integração e rastreabilidade:** A publicou três portas de montagem e gerou
  revisão assinada com partes, materiais, relações e vistas; B não deixou prova
  equivalente;
- **aderência formal:** A respeitou a altura e completou o gate visual; B passou
  do envelope e deixou uma vista inválida;
- **manutenção:** A expressou a intenção em uma fonte cerca de 41% menor;
- **honestidade do processo:** o gate tornou visível a vista insuficiente em B
  em vez de aceitar qualquer screenshot como revisão.

Isso ajuda a IA a entregar um artefato integrável, inspecionável e retomável por
outro agente. É diferente de aumentar automaticamente sua habilidade de forma.

## O que atrapalhou ou ficou sem prova

- a condição assistida repetiu a revisão oito vezes; sete recusas apagaram as
  imagens temporárias e a última expirou. A revisão final só foi materializada
  na coleta pós-teste, sem mudar o modelo;
- o gate mistura qualidade do modelo com ocupação de câmera: uma peça fina pode
  estar legível e ainda entrar num ciclo caro de reenquadramento;
- a revisão de A registra cerca de 5,9 mm de sobreposição da folha móvel com os
  dois grupos de barris. O pacote preservou a evidência, mas não impediu a
  incoerência;
- a régua por caixas também chama o pino dentro do barril oco de
  `interpenetra`; falta distinguir cavidade legítima de colisão real;
- A usa faixas numéricas do perfil do `lathe` em um seletor. Funciona hoje, mas
  é mais frágil a mudança topológica que uma região semanticamente nomeada;
- B foi mais leve e modelou furos/abas locais de modo mecanicamente mais
  explícito, embora tenha falhado em dimensão, enquadramento e portas.

## Auditoria do contexto consumido

A releitura do briefing, dos três guias e do gate separou quatro efeitos:

- **útil:** partes exatas, orçamento, isolamento e identidade orientaram A para
  uma entrega integrável e mais curta;
- **tecnicamente conflitante:** folhas de 1,20 m, altura total máxima de 1,26 m
  e pino “visível além das duas extremidades” deixam no máximo 15 mm por lado.
  A respeitou a medida e perdeu legibilidade; B mostrou o pino e perdeu a
  medida. O empate cego nasceu em parte do próprio teste;
- **aplicado cedo demais:** “uma mudança por hipótese” é adequado depois de uma
  revisão comparável. Na criação inicial, favoreceu chamadas formais a cada
  microajuste sem haver imagem anterior;
- **sem valor para este alvo:** o guia de material não tinha referência nem
  critério específico de acabamento. Não há evidência de dano direto, mas ele
  consumiu contexto sem decidir a dobradiça.

A causa principal das oito execuções continua sendo a ferramenta: sete rodadas
tinham imagens apagadas por enquadramento e a oitava expirou. As instruções
amplificaram o problema ao pressionar mudanças na peça quando a falha era da
câmera.

## Recorte executado depois do experimento

**Revisão visual econômica v1 foi concluída**, sem alterar as duas geometrias:

- cada vista recebe enquadramento próprio;
- timeout de prontidão recebe uma repetição automática;
- recusas preservam imagens, relatório e diagnóstico por assinatura semântica;
- câmera, modelo e ferramenta são categorias distintas;
- a dobradiça assistida passou uma nova revisão em **uma execução**;
- a dobradiça crua passou sua antiga vista superior em **uma execução**,
  confirmando que aquela recusa era de câmera.

O próximo candidato continua separado: preflight de montagem para cavidades e
contatos, mais alerta de seletor topologicamente frágil. Nada disso reabre este
experimento.

## Artefatos

- `autoria-assistida/experimentos/ab-fluxo-ia-dobradica/cego/` — rubrica,
  evidências, doze imagens e três pareceres cegos;
- `autoria-assistida/experimentos/ab-fluxo-ia-dobradica/fontes/` — as duas
  definições procedurais congeladas e o briefing da condição assistida;
- `autoria-assistida/experimentos/ab-fluxo-ia-dobradica/apos-correcao/` — as
  duas revisões aceitas em uma execução e suas quatro vistas.
