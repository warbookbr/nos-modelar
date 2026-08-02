# AUT-2026-02 — discretização por concordância

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `5dee138`

## Problema observado

`lathe`, o contorno do `loft` e os contornos do `inflate` aceitam várias
concordâncias, mas `segmentosCurva` vale para o passo inteiro. Um perfil com
curvas de tamanhos diferentes precisa pagar o custo da maior em todas elas.
A evidência e a fronteira estão no A-35 de
[`ATRITOS-AUTORIA.md`](../ATRITOS-AUTORIA.md).

## Resultado

Cada ponto pode conservar `[a,b,raio]` ou declarar
`[a,b,{raio,segmentos}]`. Quando `segmentos` não é local, continua valendo
`segmentosCurva` do passo.

## Incluído

- forma aditiva nos três consumidores atuais da concordância;
- contagem local por ponto, resolvida antes de criar geometria;
- compatibilidade byte a byte das formas antigas;
- validação fechada da nova forma;
- prova com duas concordâncias de discretizações diferentes.

## Excluído

- derivação automática por tolerância; isso exige um contrato próprio para o
  ângulo do arco e não bloqueia a forma local;
- alterar peças existentes automaticamente;
- mudar a numeração das formas antigas;
- criar concordâncias em operações que hoje não aceitam a alça.

## Gate de saída

1. número no terceiro elemento e `segmentosCurva` continuam byte-idênticos;
2. duas concordâncias no mesmo passo geram exatamente `N1+1` e `N2+1` pontos;
3. `lathe`, `loft` e `inflate` aceitam a forma local;
4. chave desconhecida, raio ausente e segmentos inválidos abortam antes da
   primeira face ou vértice;
5. replay é determinístico e os gates completos ficam verdes;
6. contrato, skill, A-35 e upstream descrevem a capacidade e seus limites.

## Fatias

1. fixar a nova forma e a compatibilidade em testes;
2. centralizar a resolução da alça e integrar nos três consumidores;
3. medir custo e determinismo;
4. atualizar documentação e encerrar.

## Riscos e parada

- `segmentos` é topológico: mudar o valor pode renumerar o restante do passo;
- a nova forma não pode transformar objeto desconhecido em no-op;
- se a compatibilidade antiga mudar, a entrega para e é redesenhada.

## Fechamento

Concluído em 2 de agosto de 2026. A forma numérica histórica permaneceu
byte-idêntica e a forma local foi provada nos três consumidores: duas curvas
com custos distintos no `lathe`, contorno expandido do `loft` e voxelização do
`inflate`. A validação recusa forma inválida e orçamento excessivo antes de
criar geometria.

Evidência final: 43 arquivos/929 testes verdes, `typecheck`, `build`,
gabarito, ids crus, portas, mapa, sumário, links, planos e exportação verdes.
Não sobrou trabalho dentro do escopo; escolher segmentos por tolerância de arco
permanece explicitamente fora dele.
