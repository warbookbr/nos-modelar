# Perna estreita: a perna do humanoide numa coluna da largura de uma perna

**Estado:** concluído

**Núcleo:** não

**Território:** `procedural/familias/atuador-de-junta/`, `procedural/familias/elo-entre-juntas/`, `tools/fixtures/atuador-de-junta/`, `tools/fixtures/elo-entre-juntas/`, `tools/modelar/capacidade.mjs`, `docs/modelar/banco-de-provas/perna-estreita-2026-11-27/`

Ativado pela pessoa em 2026-11-27, com a frase "sim, pode ativar ele e depois começar", depois do fechamento do plano do elo entre juntas.

**Responsável:** a IA da sessão ou o agente despachado de cada fatia; a pessoa escolhe o caminho e aprova a forma por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-27.

## Problema observado

A perna de prova do plano do elo entre juntas (`tools/fixtures/elo-entre-juntas/perna-de-prova.mjs`) monta, dobra e exporta, mas sai com 387 mm de largura e em zigue-zague, onde a perna de um humanoide de 1.750 mm teria uns 150 mm. O elo em U põe cada atuador entre a coxa e a canela, que se curvam para lados opostos, e a boca de 124 mm que cobre a flange de fixação do atuador de 100 mm pede curvas de 155 mm de raio, 2,5 vezes a meia largura, para a parede não fechar por dentro. Nenhuma escolha de sentido dos eixos estreita a perna (medido no banco de provas do elo).

A flange de fixação do atuador cilíndrico fica atrás da carcaça e precisa passar do corpo para os furos (`flange-maior-que-o-corpo`), então só diminuí-la estreita a perna em poucos milímetros. Os caminhos que mudam a largura são três: a fixação pela face de trás da carcaça, com os furos dentro do corpo e a boca do elo do tamanho do corpo ou menor; a curva mais fechada, com a parede reforçada por dentro da curva; e o elo de chapa reta preso ao lado do atuador, como nos robôs reais.

## Resultado

A perna de prova, nos eixos, alturas e cursos do esqueleto aprovado, numa coluna de no máximo 180 mm de largura, sem nada a menos de 20 mm da linha do meio, montada só pelas portas, sem peça atravessada, com o curso de cada junta conferido e exportável, aprovada pela pessoa por imagem.

## Filtro Agent-First

A fixação pela face: ENVOLVER a família do atuador com uma opção declarada de fixação, com o padrão de hoje saindo igual bit a bit. A curva mais fechada: ENVOLVER a restrição da curva do elo com o reforço declarado. O elo de chapa: só se os outros dois não chegarem à largura, como forma nova da família do elo, com a aprovação da pessoa. A perna: USAR DIRETO a montagem pelas portas e as conferências da perna de prova de hoje.

## Incluído

- a medida da largura da perna com cada caminho, em conta e numa montagem grosseira, mostrada à pessoa antes de implementar;
- o caminho escolhido pela pessoa, com recusas testadas, aprovação mecânica e o padrão de hoje igual;
- a perna estreita, com as conferências e a exportação da perna de hoje.

## Excluído

- o tronco, o pé e a outra perna;
- a carenagem que cobre a junta e o acabamento de superfície;
- mudar o esqueleto aprovado.

## Gate de saída

1. A perna estreita tem no máximo 180 mm de largura e nada a menos de 20 mm da linha do meio, na pose zero e dobrada.
2. Só as flanges encostam, nada atravessa, o curso de cada junta passa e a perna exporta em STEP e OBJ com as partes nomeadas.
3. O atuador e o elo com os padrões de hoje saem iguais bit a bit, e o acervo não muda.
4. A pessoa aprova a perna por imagem.
5. `npm run gates` e o CI verdes, e a main andou com cada envio.

## Fatias

1. A medida dos três caminhos (largura, folga da linha do meio, o que muda em cada família), com imagens grosseiras, e a escolha da pessoa.
2. O caminho escolhido nas famílias, com recusas, aprovação mecânica e o padrão igual.
3. A perna estreita, com as conferências, a exportação e a aprovação da pessoa por imagem.
4. O banco de provas, a ficha e o fechamento.

## Riscos e parada

Se nenhum caminho chegar a 180 mm sem mudar o esqueleto, o plano para e volta à pessoa com a menor largura medida. Se o caminho escolhido mudar a geometria do atuador ou do elo com o padrão de hoje, ele para antes de juntar.

## Andamento

Fatia 1 feita em 2026-11-27: a medida dos caminhos, no banco de provas do plano. A fixação pela face leva a perna a 344 mm, a curva mais fechada a 287 mm sem reforço, as duas juntas a 255 mm, e só o elo de chapa reta chega à meta, com 85 mm. A pessoa escolheu a chapa reta em 2026-11-27 ("Pode ser a reta"). A chapa é uma forma nova da família do elo; o atuador não muda, e o joelho desliza ao longo do eixo para as faces de apoio ficarem no mesmo plano, sem mudar eixos, alturas nem cursos do esqueleto.

Fatia 2 feita em 2026-11-27: a chapa como `forma` 2 da família do elo (`espessuraDaChapa`, `larguraDaChapa`, `passagemDaChapa`), com as recusas testadas, os pontos mínimo e médio da aprovação mecânica iguais e as restrições da carenagem valendo só na forma 1; a coxa em chapa montada pelas portas, com 79 mm ao longo do eixo e o joelho de 0 a 140 graus sem colisão. A pessoa aprovou por imagem em 2026-11-27 ("Sim, pode prosseguir"). O garfo de duas chapas foi ao backlog.

Fatia 3 feita em 2026-11-27: a perna estreita em chapa, com 85 mm de largura e 86 mm de folga da linha do meio, as conferências e a exportação, aprovada pela pessoa por imagem ("E aprovo a perna, pode prosseguir").

Fatia 4 feita em 2026-11-27: o banco de provas com as medidas e as imagens aprovadas, e o teste de exportação da perna entre os testes lentos.

## Fechamento

Concluído em 2026-11-27 no ramo `claude/admiring-rubin-h9zjwx`, sem PR, com `npm run gates` verde em cada envio. A família do elo ganhou a forma de chapa reta, e a perna do humanoide passou de 387 mm a 85 mm de largura sem mudar o esqueleto, aprovada pela pessoa por imagem. Ficaram no backlog o garfo de duas chapas, a sonda de combinações reais nas famílias e a rigidez da chapa, que não foi calculada; a ficha da forma de chapa no catálogo de capacidade fica para quem mexer nele de novo.
