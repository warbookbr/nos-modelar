# AUT-2026-09 — estados explicáveis de encaixe cilíndrico

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `b316971`

## Problema observado

O validador cilíndrico já mede causas específicas, mas sua resposta principal é
apenas `satisfeita`. Uma IA não distingue, por um campo estável, um encaixe
correto porém subdeterminado de uma divergência corrigível ou de uma relação
estruturalmente impossível. A lacuna é o checklist aberto do nível 2 em
[`MONTAGENS-SEMANTICAS.md`](../MONTAGENS-SEMANTICAS.md).

## Resultado

Todo `encaixaCilindrico` recebe um estado ordenado e explícito: `satisfeita`,
`subdeterminada`, `divergente` ou `impossivel`, com graus de liberdade ou
diagnósticos que justificam a classificação.

## Incluído

- classificador puro sobre o diagnóstico cilíndrico já existente;
- dois graus restantes declarados quando não há pose canônica: giro no eixo e
  posição axial dentro da cavidade;
- regra estável: incompatibilidade de forma/direção é impossível; medidas fora
  do contrato são divergência; encaixe mensurado sem pose canônica é
  subdeterminado; encaixe completo é satisfeito;
- cobertura em roda/cubo e pino/luva, CLI e documentação curta.

## Excluído

- novo tipo de relação, escolha automática de porta, correção automática,
  múltiplas relações, colisão global ou alteração de geometria;
- prometer esses quatro estados para outras formas antes de uma fixture própria.

## Gate de saída

1. os quatro estados têm exemplos executáveis e causas ou graus de liberdade
   determinísticos;
2. o estado não troca ao repetir a entrada, não oculta o diagnóstico anterior e
   não muta a montagem;
3. CLI informa estado e próximo dado faltante sem linguagem automotiva;
4. testes, tipos, build, exportação, mapa e documentação geral passam.

## Fatias

1. congelar classificação e precedência;
2. implementar o relatório puro e ligá-lo ao texto curto;
3. provar os quatro estados no piloto e na fixture neutra;
4. documentar e encerrar sem absorver colisão ou solver.

## Riscos e parada

- se dois diagnósticos exigirem uma prioridade não explicável, ela precisa virar
  regra documentada ou o plano para;
- se `subdeterminada` começar a escolher uma pose, isso é solver e fica fora;
- se um estado depender de UUID, ordem de Map, foto ou inferência de domínio,
  ele não entra no contrato.

## Fechamento

Concluído em 2 de agosto de 2026. `avaliarEstadoDeEncaixeCilindrico()` preserva
o diagnóstico de medidas e acrescenta uma classificação estável: incompatibilidade
de forma/direção é `impossivel`; medidas fora do contrato são `divergente`; uma
medição válida sem `poseCanonica` é `subdeterminada`, com giro axial e posição
axial declarados como dados faltantes; e a relação completa é `satisfeita`.

Pino/luva prova os quatro estados, inclusive porta com forma incompatível e
quadro ausente; roda/cubo aparece no CLI com "medição" e "estado do encaixe"
separados. Nenhum resultado escolhe porta, pose ou correção e a entrada fica
imutável.

Gates verdes: 987 testes, tipos, build, gabarito de seleção, ID cru, guardas de
portas e câmera, exportação, mapa, TOC, links e planos. Colisão local/global,
outros tipos de porta, múltiplas relações, hierarquia e solver permanecem fora
do recorte.
