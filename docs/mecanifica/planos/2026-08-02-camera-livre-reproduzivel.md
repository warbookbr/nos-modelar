# AUT-2026-05 — câmera livre reproduzível

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `05f980c`

## Problema observado

Depois de orbitar na bancada, a câmera fica em `livre`, mas a URL a reduz para
`isometrica`. Assim a foto de uma revisão e o endereço que a acompanha podem
mostrar enquadramentos diferentes. A reprodução e o contorno estão registrados
em A-1.

## Resultado

Qualquer enquadramento livre da bancada pode ser copiado, aberto em outra
sessão e restaurado com a mesma posição, alvo, orientação, projeção e escala.

## Incluído

- formato de URL compacto, determinístico e estritamente validado para câmera
  livre;
- captura e restauração da câmera e do alvo pela bancada, sem identidade de
  runtime;
- compatibilidade literal das URLs canônicas já existentes;
- prova headless do formato e prova real no navegador com uma órbita e recarga.

## Excluído

- favoritos, histórico de câmera, animação de câmera ou novas vistas canônicas;
- mudar foco, isolamento, explosão ou o produto do cliente;
- expor Three.js no formato salvo ou no núcleo procedural.

## Gate de saída

1. uma órbita livre produz uma URL que, ao recarregar, restaura posição, alvo,
   orientação, projeção e escala dentro da precisão declarada;
2. entrada ausente, longa ou inválida falha fechada para a vista canônica, sem
   lançar erro nem amplificar a URL;
3. URLs canônicas continuam byte-idênticas;
4. testes, revisão no navegador, build e gates documentais ficam verdes.

## Fatias

1. congelar o formato, as recusas e a compatibilidade canônica;
2. ligar captura/restauração ao ambiente Three.js;
3. automatizar a prova de navegador e revisar visualmente;
4. documentar, fechar e devolver qualquer melhoria adjacente ao backlog.

## Riscos e parada

- se a projeção ortográfica não puder restaurar o enquadramento sem estado
  interno do `OrbitControls`, a fatia para antes de serializar internals;
- se o endereço exceder um tamanho razoável ou aceitar valores não finitos, o
  formato é redesenhado antes de publicar;
- qualquer mudança que altere URLs canônicas existentes sai deste plano.

## Fechamento

Concluído em 2 de agosto de 2026. A URL livre grava dez números explícitos:
posição, alvo, vetor acima e zoom, todos com cinco casas. O leitor rejeita
estado incompleto, longo, não finito, fora da faixa, sem orientação unitária ou
com câmera sobre o alvo; nesses casos a bancada usa a isométrica segura. O dado
não contém UUID, matriz, índice ou estado interno de `OrbitControls`.

`tools/mecanifica/estado-bancada.test.ts` prova ida e volta, precisão, projeção,
recusa e compatibilidade byte a byte das URLs canônicas. `npm run guarda:camera`
dirige a bancada ortográfica real, orbita, recarrega o endereço e compara a
câmera restaurada dentro da precisão declarada; o gate entrou no CI. A revisão
visual confirmou a mesma vista livre antes e depois da recarga, sem erro no
console. Restaurar explosão inicial deixou de reenquadrar a câmera, pois o
endereço é a autoridade para os dois estados.
