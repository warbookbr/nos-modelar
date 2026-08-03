# AUT-2026-10 — contato local cilíndrico e alerta global

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `e34c37d`

## Problema observado

Uma caixa ampla acusa sobreposição tanto para uma invasão real quanto para um
pino dentro de uma luva ou o cubo dentro da roda. Já o encaixe cilíndrico mede
folga, mas ainda não relata o contato físico local nem mostra, no mesmo
resultado, que o alerta amplo continua existindo. A-16 e o nível 4 registram
esse limite.

## Resultado

Uma montagem cilíndrica devolve duas leituras independentes: contato local
(`folga`, `encosta`, `interferência` e alcance axial) e alerta global por caixa.
Uma leitura local válida não apaga a outra.

## Incluído

- classificador puro de contato radial/alcance axial sobre as medidas já
  declaradas;
- caixa ampla de cada instância, resolvida no mesmo espaço neutro da montagem;
- relatório combinado para roda/cubo e pino/luva, com ambos os resultados;
- mutações de folga, contato, interferência e falta de alcance.

## Excluído

- interseção de malha contra malha, cavidade anular do aro/pneu, borracha,
  deformação, exceção genérica de colisão ou alteração da régua de partes;
- novo tipo de porta, solver, hierarquia, persistência ou UI.

## Gate de saída

1. folga, contato, interferência e ausência de alcance são distintos por medida
   local, unidade e tolerância numérica;
2. pino/luva e roda/cubo exibem alerta amplo mesmo com encaixe local válido;
3. mutação inválida muda a leitura local sem esconder o alerta global;
4. tudo é determinístico, headless e sem Three.js, UUID ou alteração da entrada.

## Fatias

1. congelar semântica de contato local e o papel limitado da caixa ampla;
2. medir caixas de instância no mundo neutro e compor relatório;
3. provar fixture e piloto com mutações;
4. documentar e encerrar, devolvendo aro/pneu ao próximo recorte próprio.

## Riscos e parada

- se a caixa ampla virar veredito de sólido, o plano para: ela é apenas alerta;
- se a interface cilíndrica não bastar para a medida, o caso vira novo tipo de
  porta, fora deste escopo;
- se contato local precisar escolher tolerância de fabricação ou material, a
  regra precisa de dado explícito e não será inferida.

## Fechamento

Concluído em 2 de agosto de 2026. `classificarContatoLocalCilindrico` deriva
`folga`, `encosta` ou `interferencia` e o alcance axial das medidas já
validadas; `diagnosticarEncaixeCilindrico` preserva em paralelo a relação ampla
das caixas das duas instâncias. O relatório imprime as duas leituras sem fazer
uma passar por cima da outra.

`tools/mecanifica/interfaces-montagem.test.ts` prova roda/cubo e pino/luva,
os três estados radiais, ausência de alcance e uma interface inválida cuja
leitura local muda sem esconder o alerta global. `npm test`, typecheck, build,
gabarito, guardas, exportação e verificações documentais passam no fechamento.

O próximo recorte, se priorizado, precisa abrir porta e métrica explícitas para
cavidade anular aro/pneu ou para uma nova natureza de contato. Não cabe estender
este plano com colisão de malha, hierarquia ou solver.
