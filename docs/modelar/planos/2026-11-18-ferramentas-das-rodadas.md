# Ferramentas das rodadas: a decisão da pessoa e o esperado da medida ficam gravados, a medida usa o cache, o pente segue a zebra e cada rodada guarda as próprias imagens

**Estado:** concluído

**Território:** `tools/modelar/rodada-de-modelagem.mjs`, `tools/modelar/rodada-de-modelagem.test.mjs`, `src/autoria/laco-de-modelagem.js`, `src/autoria/laco-de-modelagem.test.js`, `tools/modelar/conferir-pontos.mjs`, `tools/modelar/entrada-de-medida.mjs`, `tools/modelar/entrada-de-medida.test.mjs`, `tools/modelar/pente-de-curvatura.mjs`, `tools/modelar/pente-de-curvatura.test.mjs`, `tools/modelar/vistas-para-critica.mjs`, `tools/modelar/vistas-para-critica.test.mjs`, `tools/modelar/etapas-da-montagem.mjs` e `tools/modelar/fluxo-do-objeto.mjs` (só a leitura da decisão gravada), `tools/modelar/guardas/guarda-acervo.mjs` e `tools/modelar/guardas/guarda-referencial.mjs` (só a opção de execução pelo cache, desligada por padrão), `docs/modelar/banco-de-provas/ferramentas-das-rodadas-2026-11-18/`.

**Responsável:** a IA da sessão implementa; Tiago aprovou em 2026-11-18 as recomendações do debate das melhorias tiradas das rodadas 6 e 7 do quarto traseiro do carro.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-18, ativado pela pessoa em 2026-11-18 com três planos ativos.

## Problema observado

As rodadas 6 e 7 do quarto traseiro do `carro-fastback` mostraram quatro faltas nas ferramentas em volta do laço, conferidas no código pelo debate de 2026-11-18. A ferramenta das rodadas manda parar sem convergência e nada grava que a pessoa mandou seguir (`src/autoria/laco-de-modelagem.js`, só o limite tem extensão por escrito em `rodadas/limite.json`). O modelador redeclarou o esperado de um ponto de `PONTOS` depois de a medida reprovar, e o esperado de outro ponto é calculado da própria curva que ele confere, de modo que muda sozinho a cada rodada; nada compara `PONTOS` entre rodadas. Cada medida refaz a receita inteira (de 1 a 6 minutos; mais de 40 minutos de espera numa rodada), embora o cache por passo exista em `entrada-de-medida.mjs`. O pente de curvatura mede um corte por execução, escolhido à mão, e as imagens de cada rodada sobrescrevem as da anterior, sem o antes e depois na mesma câmera.

## Resultado

A decisão da pessoa de seguir sem limite ou depois de uma parada sem convergência fica gravada e a ferramenta a respeita; mudar o esperado de um ponto pede motivo e quem decidiu, e o esperado derivado que muda sozinho sai como aviso; as ferramentas de medida usam o cache e aceitam variante de parâmetros; o pente corta em vários planos numa execução, pelos pontos que a zebra numérica acha ou numa grade; e cada rodada guarda as próprias imagens, com a anterior.

## Filtro Agent-First

`--acao` e `--registrar` da ferramenta das rodadas são USAR DIRETO e ganham as duas guardas sem mudar de nome. O cache nas medidas é ENVOLVER sobre `executarReceitaGuardada`. O pente com vários cortes é REFATORAR pequeno sobre o pente atual. A pasta por rodada é USAR DIRETO em `vistas-para-critica`.

## Incluído

- `limite.json` aceita "sem limite" declarado e a rodada a partir da qual a convergência volta a contar, com `por` e `motivo`;
- o registro guarda o esperado resolvido de cada ponto, recusa a mudança sem motivo e sem quem decidiu, e avisa o esperado derivado que mudou sem o texto de `PONTOS` mudar;
- as ferramentas de medida (zebra numérica, descrever e vista rápida) sobre o cache existente, com `--params` na chave do cache e a recusa da receita que deriva pontos da TABELA fora de função;
- o pente com uma lista de cortes por execução, guiada pelas ilhas da zebra numérica ou em grade, com a saída em tabela de saltos e trocas de sinal;
- as imagens da rodada numa pasta por rodada, fora do git, com a última e a anterior e a resolução gravada no pacote.

## Excluído

- a medida da variação de curvatura na superfície inteira, que só volta como plano próprio se a zebra e os cortes guiados não acharem o defeito;
- a cópia de receita de rodada antiga pelo número, que `git show` já dá.

## Gate de saída

1. Testes de cada guarda nos dois sentidos: a decisão gravada libera, a ausência dela segue parando; a mudança de esperado sem motivo é recusada e com motivo passa.
2. A zebra numérica da lataria do carro medida duas vezes seguidas, com a segunda pelo cache, e o tempo das duas no banco de provas.
3. O pente guiado pela zebra na lataria do carro, com a tabela de cortes no banco de provas.
4. Revisão adversarial sem bloqueio nas duas guardas.

## Fatias

1. As duas guardas da ferramenta das rodadas.
2. O cache e `--params` nas medidas.
3. O pente com vários cortes.
4. A pasta por rodada, e o fechamento.

## Riscos e parada

Se a guarda do esperado recusar mudança legítima em mais de uma peça do acervo, ela passa a aviso e volta à pessoa. Se o cache der resultado diferente da execução direta em alguma medida, a ligação para e o caso vai ao plano do cache.

## Fechamento

Concluído em 2026-11-18, com as provas em `docs/modelar/banco-de-provas/ferramentas-das-rodadas-2026-11-18/`. Gate 1: as duas guardas têm testes nos dois sentidos, e cada ataque da revisão virou teste (`rodada-de-modelagem.test.mjs`, `laco-de-modelagem.test.js`, `fluxo-do-objeto.test.mjs`); toda mudança de esperado pede `--motivo-dos-pontos`, e todo `limite.json` pede quem, data e as palavras da pessoa. Gate 2: a zebra da lataria leva 80 s com a receita executada e 2,8 s pelo cache, com o JSON idêntico, e o `--acao` cai de 514 para 105 s. Gate 3: o pente guiado pela zebra corta 24 planos da lataria em 2,6 s e, em grade, mostrou no flanco da porta a faixa que a zebra não conta. Gate 4: a revisão adversarial bloqueou a guarda dos pontos na primeira versão; os quatro furos foram fechados e testados, e a parte da decisão da pessoa passou com dois ajustes. Ficam no backlog as réguas de dobra e vinco fora do cache (76 s por `--acao`), o teto de tamanho do cache, a lataria que não aceita `--params` enquanto lê a tabela direto, e os pesos dos testes lentos a medir de novo numa bateria inteira.
