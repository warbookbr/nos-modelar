# AUT-2026-06 — interfaces mensuráveis de encaixe

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `ecf64d5`

## Problema observado

O aro e o pneu têm envelopes que se sobrepõem corretamente, mas a régua só
enxerga caixas. Ela não sabe distinguir essa cavidade válida de uma colisão e
também não prova que a abertura do aro recebe o cubo. O cubo atual ainda não
separa piloto de flange. As evidências são A-16, A-32 e o nível 0–2 de
[`MONTAGENS-SEMANTICAS.md`](../MONTAGENS-SEMANTICAS.md).

## Resultado

Duas peças resolvidas podem publicar interfaces cilíndricas internas ou
externas e declarar um `encaixa` dirigido que mede folga radial e axial na pose
já existente, explicando por dados por que passa ou reprova — sem mover peça.

## Incluído

- corrigir o piloto e o flange do cubo do freio, mantendo a roda como ativo
  separado;
- estender uma porta existente com dados opcionais de interface cilíndrica,
  resolvidos de forma determinística e sem alterar portas antigas;
- declaração de montagem versionada e uma validação neutra, read-only, para um
  encaixe cilíndrico dirigido;
- diagnóstico ordenado de eixos, folga radial, posição axial e causa da recusa;
- prova equivalente em pino e luva não automotivos, além da roda no cubo;
- testes headless, revisão da bancada nas vistas necessárias e documentação.

## Excluído

- reposicionamento automático, pose derivada, solver ou múltiplas restrições;
- quadro geral completo, espelho, instância, hierarquia e grafo incremental;
- detector universal de colisão, exceção para envelopes ou alteração do produto
  `warbookbr/mecanica`;
- exportar montagem para `pecas-resolvidas` antes de haver consumidor e contrato
  de formato próprios.

## Gate de saída

1. roda/cubo declara piloto e cavidade, passa com folgas radiais e axiais
   explícitas; uma mutação de raio e outra de posição axial reprovam com causas
   diferentes;
2. pino/luva prova o mesmo contrato sem vocabulário automotivo;
3. interfaces e diagnósticos são determinísticos, não dependem de Three.js,
   UUID, índice de array ou posição de passo; portas existentes permanecem
   canônicas quando não recebem interface;
4. a forma corrigida do cubo passa nas vistas ortográficas e nos gates de
   integridade, mapa, links, tipos, build e seleção.

## Fatias

1. congelar medidas, pose manual atual, folgas desejadas e mutações de falha;
2. corrigir piloto/flange e publicar as interfaces mínimas pelas portas;
3. criar o validador neutro, a declaração dirigida e a fixture pino/luva;
4. ligar o diagnóstico ao `descrever`, testar e revisar em bancada;
5. registrar evidência, atualizar mapa/atritos e encerrar sem absorver o
   Recorte B.

## Riscos e parada

- se a interface exigir inferir geometria, escolher porta por proximidade ou
  guardar coordenada de runtime, a fatia para e redesenha o dado declarado;
- se o encaixe exigir resolver ou alterar pose para ser medido, ele volta ao
  Recorte B, fora deste plano;
- se estender `publicarPorta` mudar a forma canônica de portas sem interface ou
  hashes de peças não tocadas, a compatibilidade vem antes da ampliação;
- se a prova neutra precisar de conhecimento automotivo, o contrato geral não
  está pronto e o plano não avança.

## Fechamento

Concluído em 2 de agosto de 2026. O piloto do `freio-disco` foi separado do
flange e a roda/cubo agora publicam interfaces cilíndricas. A montagem
`roda-no-freio` mede 3,05 mm de folga radial e distingue mutações radial, axial,
direção e descentro; `pino-e-luva` prova o mesmo contrato fora do automotivo.
O escopo continuou read-only: nenhuma peça recebeu pose derivada, hierarquia,
solver ou regra global que esconda colisão.

O gate de exportação revelou que `freio-disco` já é peça publicada. Em vez de
remover a interface ou deixar o produto recebê-la muda, as portas passaram a
viajar como campo opcional e compatível do artefato v1; o leitor as preserva e
continua recusando esqueleto. Isso não exporta uma montagem nem altera a UI do
produto, mas mantém a fronteira verificável.

Gates verdes: 978 testes, tipos, build, gabarito de seleção, ID cru, guardas de
portas e câmera, revisão ortográfica de freio/roda, exportação, mapa, links,
TOC e planos. As sobras são o quadro completo, rotação/espelho/instância,
detector de colisão, pose derivada, hierarquia e solver; permanecem no Recorte
B e nos níveis seguintes de `MONTAGENS-SEMANTICAS.md`.
