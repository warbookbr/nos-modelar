# Gaiola que segue as feições — anéis de gaiola em volta de vãos e arcos para a carroceria ter moldura, calha e lábio

**Estado:** ativo

**Responsável:** Claude, com a pessoa aprovando a forma no teste cego e decidindo a alternativa se os anéis não bastarem

**Repositório e base:** `warbookbr/nos-modelar`, main depois do fechamento do plano [carroceria por subdivisão](encerrados/2026-10-21-carroceria-por-subdivisao.md)

## Problema observado

No sétimo teste cego do plano de carroceria por subdivisão, as duas entregas seguiram os cortes a 2,3 e 1,4 mm de distância mediana, mas os vincos ficaram com F1 de 0,02 e 0,22 a 5 mm e o crítico deu 6 e 4. A entrega lisa perdeu a moldura da janela, a calha do teto e o lábio do vão traseiro; a que tentou os detalhes com estações e colunas apertadas saiu rugosa. A vista em arame sem raio X mostrou a causa: na referência as arestas seguem as feições, com anéis em volta do arco, laços contornando a janela e faixas estreitas ao longo da moldura e da calha, e a gaiola por estações é uma grade de estações e colunas que nenhuma feição segue. A moldura não tem laço em que morar, o arco corta a grade na diagonal e o vão só pode ser retangular na grade. O registro está no Andamento das fatias 24 a 26 do plano encerrado.

Três achados do mesmo teste somam ao problema. A entrega B passou exatamente por todos os pontos lidos, com erro de leitura de 1,6 a 2,9 mm, e amontoou seis estações-chave a até 4 mm uma da outra, e a superfície copiou o erro em rugas. A ferramenta de vincos dos modeladores conta dobra a partir de 25 graus e a régua a partir de 40, e a entrega A mediu 0,34 de cobertura onde a régua mediu 0,02. A opção `aba` do `friso` exige espessura, e o pacote cego é só a pele, então nenhuma entrega a usou.

## Resultado

Uma receita de carroceria declara anéis de gaiola que contornam um vão ou um arco por nome, a moldura, a calha, a aba e o lábio se fazem nesses anéis, e o oitavo teste cego mede se isso leva os vincos acima do critério sem rugas.

## Filtro Agent-First

Os anéis são **ENVOLVER** sobre a gaiola por estações: a receita continua declarando estações e colunas por nome, e o anel é opção declarada sobre um vão ou uma borda nomeados, com largura e número de voltas, sem índice como identidade. As regras contra a rugosidade são **REFATORAR** do ajudante e da instrução, porque o padrão atual deixa a medida exata ser o caminho fácil. A aba sem espessura é **ENVOLVER** sobre a opção `aba`. O limiar da ferramenta de vincos é **USAR DIRETO** o da régua. A gaiola por retalhos entre linhas de feição fica **ADIAR**, como alternativa decidida pela pessoa depois do oitavo teste.

## Incluído

- anéis de gaiola em volta de vão e de borda nomeada (arco), costurados à grade ao redor, com vincos e medidas nos anéis por nome;
- dado lido de imagem com peso por padrão no ajudante e na instrução, e aviso do ajudante quando duas estações-chave ficam mais próximas do que o erro de leitura sustenta;
- `aba` em chapa sem espessura;
- `comparar-vincos` e `ler-linhas` medindo pelo mesmo limiar de dobra da régua;
- o refino medido da entrega A do sétimo teste, em laço com o crítico cego;
- o oitavo teste cego com o pacote do sétimo e o brief com o método novo.

## Excluído

- a gaiola por retalhos entre linhas de feição, salvo decisão da pessoa depois do oitavo teste;
- vão de forma livre fora do que o anel resolve;
- a velocidade do alisamento e do comparador de vincos, que ficam no backlog;
- qualquer mudança de malha nas peças aprovadas do acervo.

## Invariantes

O núcleo continua sem Three.js, sem domínio automotivo e sem ferramenta externa. Mesma receita, mesma malha, bit a bit. Nenhum índice vira identidade salva. As peças do acervo regeneram iguais e a linha de base do motor não muda sem motivo escrito.

## Gate de saída

1. Numa chapa desenhada por código com um vão de cantos arredondados e um arco, os anéis seguem a borda a menos de 0,5 mm, a malha sai só de quadriláteros fora dos vértices extraordinários declarados e uma moldura em relevo de 10 mm declarada nos anéis aparece com o diedro pedido.
2. Numa gaiola com ruído de leitura plantado de ±2 mm, o padrão com peso sai sem falha de ondulação acima do limiar, e duas estações-chave a menos que o espaçamento mínimo saem com aviso pelo nome.
3. A aba sai numa chapa sem espessura, contínua com a borda e sem face dobrada.
4. `comparar-vincos` dá, para a mesma candidata, a cobertura que a régua dá, a 0,02.
5. No oitavo teste cego, a distância mediana total fica abaixo de 3 mm, o F1 dos vincos a 5 mm sem as omitidas acima de 0,3 nas duas entregas com diferença abaixo de 0,15, sem falha de ondulação que o alisamento tire, com a curvatura por região dentro do limite de 15 1/m em no máximo 10% dos pontos, e a pessoa aprova a forma pelas vistas por região.
6. `npm run gates -- --completo` verde.

## Fatias

1. **Anéis em volta de vão e arco.** A gaiola por estações aceita, sobre um vão ou uma borda nomeados, anéis que contornam a borda com largura e número de voltas declarados e se costuram à grade ao redor. Vincos, cantos e medidas se declaram nos anéis por nome. Pronto quando o gate 1 passa.
2. **Contra a rugosidade.** O ajudante passa a marcar com peso as medidas que vêm de leitura de imagem por padrão, e avisa pelo nome quando duas estações-chave ficam mais próximas do que o erro de leitura sustenta; a instrução de carroceria escreve a regra. Pronto quando o gate 2 passa.
3. **Aba sem espessura e limiar único.** A `aba` funciona na chapa sem espessura, e `comparar-vincos` e `ler-linhas` usam o limiar de dobra da régua. Pronto quando os gates 3 e 4 passam.
4. **Refino medido.** Um agente pega a entrega A do sétimo teste e faz três rodadas de laço de modelagem com o crítico cego, vendo só o pacote (vistas, cortes e ficha) e o veredito do crítico, que julga contra as vistas do pacote; a régua, que usa a referência, mede cada rodada de fora. Pronto quando as três rodadas estão medidas e a pessoa decide se o refino vira etapa do método.
5. **Método e oitavo teste cego.** A instrução de carroceria escreve o método: superfície base lisa com poucas colunas e os detalhes nos anéis. O pacote do sétimo teste é refeito por dois modeladores com o brief novo, e a régua, a vista em arame e o crítico cego vão à pessoa. Pronto quando o gate 5 é medido e a pessoa decide.
6. **Fechamento.** `UPSTREAM-NOS.md`, backlog, `npm run gates -- --completo` e o plano movido para `encerrados/`. O plano seguinte é o da [leitura por demanda e limpeza](2026-10-22-leitura-por-demanda-e-limpeza.md), e depois dele o de [ajustes no núcleo dos veículos](2026-10-21-ajustes-no-nucleo-dos-veiculos.md).

## Decisões da pessoa

1. **Anéis antes de retalhos.** Aprovada em 2026-10-23: a gaiola atual ganha anéis em volta das feições, porque a mudança é contida e aproveita régua, alisamento, aba e leitura; se o oitavo teste não for bom, a pessoa analisa a gaiola por retalhos entre linhas de feição, que é mudança grande, ou outras melhorias pontuais ou grandes.
2. **Plano novo.** Aprovada em 2026-10-23: o plano de carroceria por subdivisão fechou com o sétimo teste, e este plano leva o que ele mostrou, apontando para o da leitura por demanda como seguinte.

3. **Refino medido.** Aprovada em 2026-10-23: em vez de esperar tudo da primeira entrega, mede-se quanto um laço de refino aproxima a entrega A do alvo, com o refinador vendo só o que uma pessoa teria em mãos.

## Riscos e parada

O risco maior é a costura do anel com a grade criar vértices extraordinários que ondulam a superfície perto do vão; a fatia 1 para e volta à pessoa se a chapa de prova não sair lisa na zona da costura. Também para se uma fatia passar de dois dias, se o núcleo precisar de dependência externa ou se o oitavo teste não subir os vincos, caso em que a pessoa decide entre a gaiola por retalhos e outra rota.

## Andamento

Escrito e ativado em 2026-10-23, com as duas primeiras decisões aprovadas, sem implementação; a fatia 4, do refino medido, entrou no mesmo dia com a terceira decisão.
