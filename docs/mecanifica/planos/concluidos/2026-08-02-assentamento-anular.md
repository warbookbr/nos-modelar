# AUT-2026-11 — assentamento anular declarado

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `63d9fd0`

## Problema observado

O aro e o pneu da roda são partes concêntricas com uma zona de assentamento
intencional. A régua atual só enxerga suas caixas e chama a sobreposição de
`interpenetra`; ela não tem uma relação local que diga que a faixa foi declarada
nem que meça seu alcance. A-16 e o nível 4 registram a diferença entre alerta
amplo e contato local.

## Resultado

Uma faixa anular declarada mede, por identidade, alinhamento, alcance axial e
sobreposição radial de um assentamento. O alerta amplo das partes continua no
relatório e não é silenciado pela relação.

## Incluído

- interface `anel` com raio interno, externo, eixo, centro, intervalo axial e
  escopo semântico de parte opcional;
- relação read-only `assentaAnular` entre uma faixa que recebe e outra que ocupa;
- piloto aro↔pneu e fixture não automotiva;
- relatório combinado de contato local e alerta amplo por escopo declarado.

## Excluído

- colisão de malha, borracha, pressão, deformação, cálculo de carga;
- "ignorar colisão", hierarquia, várias relações resolvidas juntas, pose
  derivada, persistência ou solver;
- inferir a faixa por material, aparência ou proximidade.

## Gate de saída

1. uma faixa anular válida relata unidades, sobreposição radial/axial e eixo;
2. aro↔pneu e uma fixture geral passam pelo mesmo contrato;
3. uma invasão radial, eixos desalinhados e falta de alcance falham por causas
   diferentes;
4. a relação local não apaga o alerta amplo das partes, nem altera a entrada.

## Fatias

1. congelar formato, papéis e o limite entre faixa declarada e colisão;
2. resolver a interface no núcleo e no leitor puro;
3. medir a relação e o escopo de parte no alerta amplo;
4. provar fixture, piloto e mutações; documentar e encerrar.

## Riscos e parada

- se a medição exigir inferir superfície ou material, parar: a faixa precisa ser
  declarada;
- se um caso exigir deformação ou pressão, devolvê-lo ao backlog físico;
- se o alerta amplo deixar de existir ou for suprimido, o recorte falha;
- se a relação precisar mover a peça, abrir plano de pose separado.

## Fechamento

Concluído em 2 de agosto de 2026. A interface `anel` carrega faixa radial,
intervalo axial, eixo, papel (`recebe`/`ocupa`) e parte semântica opcional.
`validarAssentamentoAnular` mede sobreposição radial/axial, alinhamento e
decentro; o diagnóstico continua mostrando o alerta amplo por caixa.

O piloto `aro-no-pneu` mede 40 mm radiais e 233,6 mm axiais na escala declarada,
enquanto o relatório amplo ainda acusa as caixas de aro e pneu. A fixture neutra
`anel-e-faixa` atravessa o mesmo contrato. As mutações exercitam faixa radial,
eixo e alcance axial; não há correção automática nem mutação da entrada.

O próximo passo, se priorizado, precisa ser uma nova natureza de contato ou a
separação explícita de tolerância de fabricação. Deformação, pressão, colisão de
malha, hierarquia e solver permanecem fora deste plano.
