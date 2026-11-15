# Prancha menos manual: desvio medido, leitura combinada de um comando e o que ficou de fora declarado

**Estado:** rascunho

**Território:** nenhum (aguarda aprovação)

**Responsável:** a IA da sessão do carro conduz e mede, e a pessoa julga se o desenho da prancha ficou mais prático.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-14 com o ramo do carro.

Pedido pela pessoa em 2026-11-14, depois da análise do que é manual no desenho da prancha. Espera o fechamento do plano da [leitura por partes](2026-11-14-leitura-por-partes.md), que tem no território `tools/modelar/leitura-por-regioes.mjs`.

## Problema observado

Na prancha frontal do carro (`procedural/pecas/carro-fastback/referencias/frontal.prancha.mjs`), o desenhista converteu a imagem para PNG e mediu a caixa da lataria com scripts à parte, calculou os milímetros por pixel à mão, escreveu um `partes.json` em mm, despachou seis críticos, copiou à mão a resposta de cada um para um arquivo e montou o config do `--consolidar`. Esqueceu o `--fora`, e os críticos citaram como ausente o detalhe deixado de fora de propósito (grade, faróis, entradas, retrovisores), que encheu a consolidação de ruído. Na lateral, várias rodadas corrigiram pontos a olho e a correção oscilou de uma rodada para a outra (o retrovisor e o escape).

O processo não pegaria sozinho o `--fora` esquecido: o `leitura.json` não grava o que ficou de fora, e a prancha declara isso só em comentário e na legenda. A oscilação também não, porque nenhum comando mede a prancha contra o contorno da imagem: `silhueta:desvio` mede malha, `comparar-contornos` mede esboço ou malha, e `compararSilhuetas` de `tools/modelar/prancha/prancha-referencia.mjs` é biblioteca sem comando, só de topo e base.

## Resultado

O desenhista mede o desvio de cada camada da prancha contra o contorno da imagem em mm com sinal, roda a leitura combinada inteira com um comando e guarda a resposta de cada crítico já validada, e a leitura recusa uma prancha de referência raster que não declara o que ficou de fora.

## Filtro Agent-First

- `prancha:desvio`: ENVOLVER `desvioPorTrecho` e `sobreposicaoEmSvg` de `tools/modelar/silhueta-contra-referencia.mjs` num comando em `tools/modelar/prancha/`. Entra o `.prancha.mjs`, a vista e um `*.contornos.json` (de `npm run contorno`) ou os trechos de `silhueta:referencia`; sai, por camada nomeada, o desvio com sinal e posição em mm e um SVG com as duas linhas. Com imagem de IA o resultado sai rotulado como posição de caráter, a tabela prevalece e nada reprova.
- Leitura combinada: ESTENDER `leitura:regioes` com `--combinada`, que roda grade e partes na mesma referência, grava as duas pastas, cria `respostas/` com os nomes esperados e escreve o config; `--consolidar` sem config descobre pela convenção; `--guardar-resposta=<crítico> --de=<texto>` extrai o bloco JSON do texto do crítico e o valida na hora, sem dar escrita ao `critico-visual`.
- O que ficou de fora: campo `foraDoEsqueleto` (lista de texto) na ESPEC da prancha, que a leitura com `--prancha` leva ao pedido, e recusa quando a prancha tem procedência `referencia-raster-derivada` sem o campo nem `--fora`.
- Partes pela prancha: USAR DIRETO o `{ "camadas": [...] }` que `--partes` já aceita com `--prancha`; a skill `desenhar-prancha` passa a citá-lo.
- Calibração da imagem (`referencia:calibrar`) e as opções de camada `espelhar` e `passaPor`: ADIAR para o backlog; ficam para quando as três de cima estiverem em uso.
- Traçado automático da prancha a partir do contorno, ajuste automático de pontos pelo desvio e calibração por rodas como padrão: fora. Com imagem de IA transformariam caráter em medida e tirariam da pessoa a decisão de forma.

## Incluído

- os três comandos ou opções acima, com testes em fixture neutra (uma prancha de caixa com dois recortes e um contorno sintético);
- o passo nas skills `desenhar-prancha` e `prancha-dos-contornos` e no guia `docs/modelar/usar/CONFERIR-CONTRA-REFERENCIA.md`;
- a prova na prancha traseira ou superior do carro.

## Excluído

- calibração da imagem, espelho e `passaPor`, que vão ao backlog;
- mudança no formato da prancha além do campo `foraDoEsqueleto`.

## Gate de saída

1. `prancha:desvio` dá o desvio com sinal por camada numa fixture com deslocamento conhecido, com erro abaixo de 2 mm;
2. `leitura:regioes --combinada` seguido de seis `--guardar-resposta` e `--consolidar` sem config reproduz a consolidação feita à mão na frontal do carro;
3. a leitura recusa prancha raster sem `foraDoEsqueleto` nem `--fora`, e o teste cobre a recusa;
4. skills e guia citam os comandos, e `npm run gates` passa.

## Fatias

1. `foraDoEsqueleto` com a recusa e a linha da skill sobre partes por camadas;
2. `--combinada`, `--guardar-resposta` e `--consolidar` por convenção;
3. `prancha:desvio`, provado numa prancha do carro;
4. fechamento.

## Riscos e parada

Se o desvio contra o contorno de uma imagem de IA variar mais que o erro de leitura a olho (uns 25 mm), o comando fica só como diagnóstico e a fatia 3 para, com o achado.

## Fechamento

Preencher somente ao concluir ou cancelar.
