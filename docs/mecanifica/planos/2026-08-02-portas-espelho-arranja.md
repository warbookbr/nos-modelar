# AUT-2026-15 — portas sob espelho e arranja

**Estado:** ativo

**Responsável:** Codex

**Repositório e base:** warbookbr/nos-mecanifica, branch
`codex/concluir-pendencias-autoria`, base `9263774`.

## Problema observado

Uma porta já tem identidade estável, rótulo e quadro cilíndrico, mas o contrato
não declara o que acontece quando a geometria é copiada por `espelha` ou
`arranja`. Espelho muda a mão do quadro; um arranjo cria cópias endereçáveis da
geometria, mas ainda não define como uma interface passa a existir em cada cópia.
Aceitar um quadro aparentemente válido sem essa regra pode fazer uma relação
medir ou pré-visualizar a peça errada.

## Resultado

O núcleo declara uma regra explícita e verificável para portas de interface sob
espelho e arranjo: cada porta efetiva é citável por identidade derivada estável,
seu quadro tem orientação conhecida, e uma transformação que o contrato ainda
não sabe representar é recusada antes de medir ou oferecer prévia.

## Incluído

- mapear, em fixture neutra, o comportamento atual de porta publicada antes e
  depois de `espelha` e dos dois modos de `arranja`;
- escolher e implementar a menor regra segura para identidade, eixo, referência
  e rótulo das portas efetivas;
- distinguir transformação própria de espelho: preservar a mão corretamente ou
  recusar de forma explicável, sem fingir que é uma rotação comum;
- provar cópias de arranjo com identidades determinísticas, sem UUID, índice de
  array ou posição de passo persistidos;
- cobrir leitura, exportação, diagnóstico de montagem e uma fixture não
  automotiva.

## Excluído

- pai semântico, árvore de composição, reparenting ou hierarquia visual;
- solver de montagem, múltiplas relações, rollback e persistência de montagem;
- inferir portas por aparência, converter espelho em escala negativa solta ou
  criar uma biblioteca geral de simetria;
- novas naturezas de interface além das já declaradas.

## Gate de saída

1. a mesma receita resolve as mesmas portas efetivas em execuções repetidas;
2. duas cópias de `arranja` nunca publicam a mesma chave efetiva, e uma relação
   cita a cópia certa sem depender de posição de array;
3. para espelho, o diagnóstico informa a mão/orientação resultante ou recusa a
   relação antes de calcular medidas e prévia;
4. a forma histórica de porta continua byte-idêntica quando a peça não usa
   espelho nem arranjo;
5. fixture neutra exporta, lê e reexecuta; testes e bancada provam o efeito que
   chega à pessoa e à IA.

## Fatias

1. montar baseline adversarial de quadro, identidade e diagnóstico para espelho,
   arranjo linear e arranjo radial;
2. definir o formato mínimo de porta efetiva e a política segura para espelho;
3. implementar a propagação ou a recusa fechada no núcleo e no resolvedor de
   montagem;
4. transportar por descrição, leitor, exportação e bancada;
5. provar compatibilidade, determinismo e o caso não automotivo; encerrar.

## Riscos e parada

Se o menor contrato exigir árvore de instâncias, escala não uniforme, solver ou
migração de receitas existentes, parar: isso pertence aos níveis de hierarquia
ou persistência. Se a mão de um quadro espelhado não puder ser preservada sem
inventar uma convenção, a saída correta deste plano é recusar explicitamente a
interface espelhada e registrar o suporte positivo como candidato futuro.

## Fechamento

A preencher após os gates.
