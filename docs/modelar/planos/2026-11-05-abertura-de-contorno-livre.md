# Abertura de contorno livre — a chapa ganha um vão pela curva que a receita desenha, sem depender das linhas da gaiola

**Estado:** ativo

**Território:** `procedural/nucleo/operacoes/abertura-por-contorno.js`, `procedural/nucleo/operacoes/abertura-por-contorno.test.ts`, `procedural/nucleo/nucleo.js`, `procedural/nucleo/uso-operacoes.js`, `procedural/nucleo/operacoes/friso.js`, `src/autoria/molduras-do-vao.js`, `tools/fixtures/abertura-de-prova/`, `docs/modelar/banco-de-provas/abertura-de-contorno-2026-11-05/`

**Responsável:** sessão de trabalho do furgão, a pedido da pessoa em 2026-11-05

**Repositório e base:** este repositório, a partir da main de 2026-11-05

## Problema observado

Uma abertura na chapa de subdivisão só segue as linhas da gaiola: as estações e as colunas. No furgão, em 2026-11-05, o farol escolhido pela pessoa no esboço tinha a ponta de dentro em bico e o topo numa linha só; na peça, o bico saiu como uma cápsula, porque a diagonal só cabe a 45 graus de canto a canto de uma célula e a subdivisão arredonda os cantos do vão, e o topo ganhou um degrau, porque a borda tinha de pular de um anel ao outro. A pessoa notou que o esboço promete formas que o núcleo não entrega. O catálogo de capacidades não tem operação que corte a chapa por um contorno livre; o `friso` só dobra a aba da borda que a gaiola já deu.

## Resultado

Uma receita declara um vão por um contorno fechado de pontos numa vista, projetado sobre a chapa, com cantos vivos ou arredondados por ponto, e recebe a chapa com a abertura, a aba dobrada ao longo da borda e o pedaço retirado para virar lente, numa peça de teste neutra que não conhece veículo.

## Filtro Agent-First

- O corte da chapa pelo contorno: **ENVOLVER** a booleana que o núcleo já tem (`booleanas.js`, com o Manifold) numa operação nova, `aberturaPorContorno`, em vez de escrever corte de malha à mão. Se a fatia 1 mostrar que cortar depois da subdivisão deixa a malha ruim junto da borda, a decisão passa a **REFATORAR** para cortar a gaiola antes, e fica registrada com a medida.
- A aba ao longo da borda: **USAR DIRETO** o `friso`, que já aceita polilinha; se ele não aceitar a borda que o corte devolve, a mudança mínima entra em `friso.js`.
- O vão na conferência de moldura: **USAR DIRETO** `molduras-do-vao.js`, que precisa reconhecer a abertura nova como vão declarado.
- O uso no furgão: **ADIAR** para o plano do furgão, depois que este fechar.

## Incluído

- a operação, com o contrato no catálogo de capacidades e as recusas com mensagem que diz o que fazer (contorno que não fecha, que se cruza, que sai da chapa);
- a peça de teste neutra em `tools/fixtures/abertura-de-prova/`, uma chapa curva de subdivisão com espessura e um contorno com bico, curva e reta;
- a aba seguindo a borda e o pedaço retirado como sólido próprio;
- a moldura do vão reconhecendo a abertura.

## Excluído

- aplicar no furgão, que é do plano dele;
- vão que atravessa uma emenda de duas chapas;
- contorno em três dimensões livre (o contorno é desenhado numa vista e projetado).

## Gate de saída

1. Na peça de teste, a chapa com a abertura sai fechada: nenhuma aresta sem par, nenhum vínculo não manifold, nenhum triângulo de área zero, conferidos pelas ferramentas do repositório.
2. O contorno sai como foi desenhado: o desvio entre a borda do vão e o contorno projetado fica abaixo de 0,5 mm, e o bico declarado vivo tem ângulo dentro de 2 graus do desenhado.
3. A mesma receita dá a mesma malha, byte a byte, e os ids das faces fora do vão não mudam.
4. A pessoa aprova a forma da peça de teste por imagem.
5. O retrato do acervo dá as mesmas peças, e `npm run gates` fica verde.

## Fatias

1. Linha de base e escolha da técnica: a peça de teste, o corte por booleana depois da subdivisão e a medida da malha junto da borda; se reprovar, o corte da gaiola antes da subdivisão, com a mesma medida, e a decisão escrita.
2. A operação com o contrato, as recusas e os testes do gate 1 a 3.
3. A aba pelo `friso` e o pedaço retirado como lente.
4. A moldura do vão, o catálogo regerado e a imagem para a pessoa.
5. Fechamento.

## Riscos e parada

Se nem o corte depois nem o corte antes da subdivisão passarem no gate 1 na peça de teste, o plano para e volta à pessoa com as duas medidas, sem tentar uma terceira técnica sozinho. Se a operação exigir mudar o formato salvo das receitas existentes, para também.

## Andamento

A fatia 1 fechou em 2026-11-05 sem técnica aprovada, com as medidas nas [provas](../banco-de-provas/abertura-de-contorno-2026-11-05/README.md): o corte depois da subdivisão acerta a forma e deixa triângulos sem área junto da costura, e o corte na gaiola sai limpo mas afasta a chapa quase 3 mm e se dobra em 4 de 10 posições. A recomendação levada à pessoa é o corte depois com uma limpeza da costura dentro da operação nova.

## Fechamento

Preencher ao concluir ou cancelar.
