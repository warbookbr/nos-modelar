# Mecanifica — acordo de trabalho

Este repositório usa o Atelier v3 do NÓS como base experimental para construir a
Mecanifica: uma oficina 3D interativa que explica sistemas automotivos a clientes.

## Entrada de contexto

Antes de planejar ou implementar uma rodada, leia
`docs/mecanifica/INDEX.md` e `docs/mecanifica/PLANO.md`. O índice informa quais
outros documentos são necessários para cada tipo de tarefa; não carregue toda a
documentação por padrão.

Os documentos antigos em `docs/uso/`, `docs/rumo/` e `docs/historico/` pertencem
à base herdada do NÓS. Consulte-os quando tocar no código legado, mas não os use
como roteiro de produto da Mecanifica. Em caso de divergência,
`docs/mecanifica/` prevalece.

## Fronteiras

- `prototipos/fps/v3/` é o Atelier legado e deve permanecer executável durante a
  migração.
- O novo produto nasce em módulos próprios, sem acrescentar mais responsabilidades
  ao `jogo.html` legado.
- O núcleo de autoria não pode importar Three.js nem conhecer freios, carros ou
  interface. Renderização e domínio entram por adaptadores.
- Regras automotivas não viram operações geométricas. Uma necessidade como
  “encostar a pastilha no disco” deve produzir uma capacidade geral como
  `encostar`, reutilizável fora da Mecanifica.

## Regras de autoria

- IDs internos do Three.js, índices de arrays e posição de passos nunca são
  referências persistidas.
- Toda parte relevante recebe identidade semântica estável.
- Referência inválida, ambígua ou vazia falha com diagnóstico; nunca vira no-op
  silencioso.
- Conteúdo salvo deve ser determinístico, versionado, reexecutável e validável.
- Uma crítica deve poder alterar a peça existente sem regenerá-la inteira.
- `Date.now()` e `Math.random()` crus não entram em artefatos reproduzíveis.
- Modele e revise na bancada neutra antes de levar a peça ao galpão; registre na
  URL a seleção, vista e projeção usadas como evidência.

## Trabalho que pode voltar ao NÓS

Mudanças gerais de autoria ficam isoladas de Three.js e da Mecanifica, com testes
headless e commits próprios. Toda capacidade candidata é registrada em
`docs/mecanifica/UPSTREAM-NOS.md`, incluindo dependências, provas e instruções de
extração.

## Qualidade

- Texto, nomes de domínio e documentação em pt-BR.
- Mudança de comportamento vem acompanhada de teste proporcional ao risco.
- Trabalho visual é conferido no navegador em mais de um enquadramento.
- Testes verdes não substituem inspeção visual; inspeção visual não substitui
  determinismo e validação.
- Atualize o roteiro e o registro upstream quando uma rodada mudar o estado real.
- Atualize `docs/mecanifica/INDEX.md` quando mudar a estrutura principal, a
  hierarquia documental ou a próxima entrega.
