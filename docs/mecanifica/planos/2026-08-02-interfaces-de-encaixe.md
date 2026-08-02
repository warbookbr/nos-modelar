# AUT-2026-06 — interfaces mensuráveis de encaixe

**Estado:** ativo

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

Preencher somente ao concluir ou cancelar: estado final, commits, gates,
evidência visual e as sobras devolvidas ao backlog.
