# Objetos do projeto externo como famílias do Mecanifica — da receita traduzida ao perfil aprovado

**Estado:** ativo

**Responsável:** Claude, com a pessoa aprovando forma

**Repositório e base:** `warbookbr/nos-mecanifica`, ramo `claude/revisar-plano-ativo-cyj8c3`

## Problema observado

O [plano de material e textura](encerrados/2026-10-19-receitas-com-material-e-textura.md) traduz as receitas do projeto externo para o esboço do
Mecanifica: 59 das 66 receitas e 1.377 das 1.394 peças. O esboço, porém, é um alvo de forma, e não um objeto do acervo: ele não tem
parâmetros, faixas nem aprovação da pessoa, e cada um dos 66 custaria uma peça inteira pelo caminho do avião (de 400 mil a 1,5 milhão de
tokens). O [plano dos aparelhos de caixa](encerrados/2026-10-16-aparelhos-de-caixa.md) mostrou o caminho barato: uma família com perfis,
levada pelo processo leve, custou 294 mil tokens uma vez e de 60 a 100 mil por perfil novo.

As 66 receitas se agrupam por nome em poucas famílias naturais: 22 cadeiras, 7 balcões, 6 fogões, 7 geladeiras e congelador, 3 televisões,
2 lava-louças, 2 micro-ondas, 2 pias, 2 vasos e uns vinte objetos soltos (máquina de lavar, computador, gerador, coifa, rádio, cafeteira). Os
aparelhos de caixa e o `movel-de-caixa` já cobrem uma parte desses grupos, e a cadeira, com 22 receitas, é a família de maior retorno.

## Resultado

As famílias que cobrem os objetos do projeto externo que a pessoa quiser, cada uma com perfis aprovados pela pessoa em imagem, usando o
esboço traduzido como alvo de medida e de forma, e com o custo de cada família medido.

## Filtro Agent-First

- **`aparelho-de-caixa` e `movel-de-caixa`:** ENVOLVER ou REFATORAR, decidido na fatia 2 pela medida: o que couber como opção declarada
  entra neles (geladeira de duas portas, balcão de bancada), e o que pedir geometria nova vira família própria.
- **Processo leve de modelagem:** USAR DIRETO (skill `laco-de-modelagem`, seção do processo leve): um modelador, a família, uma ou duas
  rodadas do crítico visual, parada na terceira.
- **Esboço traduzido como alvo:** USAR DIRETO. O `receita-externa` gera o esboço, e a conferência de silhueta e de medida do módulo do esboço
  o compara com a família.
- **Material e textura:** USAR DIRETO. A família guarda o `material` por peça, e a textura vem do módulo de textura.

## Incluído

- a triagem das 66 receitas por família candidata, com medidas, número de peças e a família do Mecanifica que já cobre ou que falta, sem
  modelar nada, para a pessoa escolher os grupos;
- a família de cadeira, com os perfis que a pessoa escolher entre as 22 receitas, e a família ou opção de cada grupo escolhido depois;
- para cada perfil, a medida contra o esboço traduzido (caixa envolvente e volume) e a prancha para a pessoa aprovar;
- o custo em tokens e em chamadas de cada família, ao lado do dos aparelhos de caixa.

## Excluído

- objetos cujo nome de arquivo ou de receita carrega marca ou nome de fabricante do projeto externo ou do mundo real (`fabricante_a`, `fabricante_b`,
  `fabricante_c`, `fabricante_d`, `fabricante_e`, `fabricante_f`, `fabricante_g`): quando a pessoa escolher o objeto, o perfil recebe nome
  neutro e nenhuma marca entra no repositório;
- as 16 peças com corte, curva ou afinamento e a torneira de `sanitario_quimico`, que seguem no backlog;
- PBR, animação e qualquer imagem do projeto externo; só entram as receitas da pessoa e as imagens que o Mecanifica gera;
- os grupos que a pessoa não escolher na fatia 1.

## Invariantes

Família determinística, versionada e aprovada pelo `familias:check`; IDs internos não são identidade; o núcleo continua sem Three.js; quem
aprova forma é a pessoa; nenhum `.obj` ou `.mtl` entra no repositório.

## Gate de saída

1. a triagem das 66 receitas registrada, e os grupos escolhidos pela pessoa;
2. cada família escolhida aprovada mecanicamente (`familias:check`) e cada perfil aprovado em forma pela pessoa;
3. a medida de cada perfil contra o esboço traduzido registrada, com a diferença de caixa envolvente;
4. o custo de cada família medido e comparado ao dos aparelhos de caixa;
5. `npm run gates` verde, e `--completo` antes do envio à main.

## Fatias

1. **Triagem.** Classificar as 66 receitas por família candidata, com medidas e número de peças, sem modelar, e levar à pessoa a lista dos
   grupos com o retorno de cada um (perfis por família). A pessoa escolhe os grupos e a ordem.
2. **Cadeira.** A família de cadeira pelo processo leve, com os perfis escolhidos, a medida contra o esboço e a prancha para a pessoa
   aprovar. Mede o custo.
3. **Grupos escolhidos.** Um grupo por vez, como opção do `aparelho-de-caixa` ou do `movel-de-caixa` quando couber, ou família nova quando
   não couber, cada um aprovado pela pessoa em prancha.
4. **Fechamento.** Custos, achados e a decisão sobre os grupos que sobraram.

## Riscos e parada

Para e volta à pessoa se uma família exigir tantas opções que o modelador erre mais do que acerta; se a cadeira custar mais da metade de
uma peça do avião; ou se a pessoa não reconhecer os objetos como os dela depois de três rodadas de um grupo.

## Fechamento

## Andamento

Fatia 1 feita em 2026-10-19: a [triagem](../banco-de-provas/receitas-externas-2026-10-19/triagem.md) classifica as 66 receitas em dez grupos, com medidas, número de peças, recusas do tradutor e a família candidata, e aguarda a escolha da pessoa dos grupos e da ordem.

A pessoa escolheu a cadeira como primeiro grupo e onze receitas como perfis (`cadeira_fibra_azul`, `cadeira_ripada_marrom`, `cadeira_larga_estofada_clara`, `cadeira_desgastada_madeira`, `cadeira_fibra_roxa`, `cadeira_classica_creme` e `cadeira_classica_vinho`, `cadeira_basica_clara`, `cadeira_almofadada_clara`, `cadeira_ripada_simples` e `cadeira_larga_estofada_amarela`), com dois ajustes: a `cadeira_larga_estofada_clara` passa a branca, e na `cadeira_almofadada_clara` o topo das pernas da frente precisa encostar no assento. As receitas estão em `tools/mecanifica/fixtures/receita-externa-cadeiras/`.

Fatia 2, primeira rodada (2026-10-19): a família `cadeira` (25 parâmetros, 16 restrições, 1.440 combinações de composição) cobre os cinco perfis de encosto alto, com a caixa envolvente dentro de 3% do alvo em quatro e a `cadeira-rustica` em 3,2% na profundidade, porque a família não desenha pregos, rasgos nem pés podres. O crítico visual cego deu nota 8 ao conjunto (9, 9, 8, 6 e 8 por perfil) e não viu parte solta no ar. O custo foi de 231 mil tokens e 63 chamadas, sem contar a leitura do crítico (17 mil). A prancha espera o julgamento da pessoa, e as poltronas e as vitorianas vêm na rodada seguinte.

A pessoa olhou a prancha e achou deslocamentos e peças atravessadas. A medida confirmou que os defeitos vêm das receitas de origem (postes e pernas atravessando o assento, pernas da esquerda 14 mm fora de alinhamento com as da direita), e que o crítico, comparando só com o alvo, não os podia ver. A triagem ganhou a coluna de peças atravessadas, a família passa a construir as uniões por regra e o alvo vale só para proporção, com as [medidas](../banco-de-provas/cadeiras-2026-10-19/medidas.md) refeitas.

Fatia 2, segunda rodada (2026-10-19): a família `cadeira` passou à versão 1.1.0, com as uniões por regra (simetria, poste sobre a perna, topo da perna a 0,5 mm do assento, nenhum atravessamento acima de 1 mm), cada uma medida por teste sobre a geometria e pelo portão de contato do esboço. A caixa envolvente fica dentro de 1% do alvo em quatro perfis e 3,2% na profundidade da `cadeira-rustica`. O crítico visual cego, sem alvo, deu nota 8 ao conjunto (8, 8, 8, 7 e 7), viu as cinco simétricas e sem peça atravessada, e apontou um defeito de pouca margem na `cadeira-trabalhada`. As linhas diagonais da prancha vinham da triangulação da união de sólidos, e a prancha agora desenha só as arestas da forma. O custo da família ficou em 549 mil tokens somando as duas rodadas (231 mil e 318 mil), abaixo da metade de uma peça do avião no limite de parada do plano.

Fatia 2, terceira rodada (2026-10-19): a pessoa circulou na isométrica lascas e degraus de 1 a 2 mm nas uniões (topo dos postes 1 mm acima da travessa, face de trás das travessas 2 mm para dentro da dos postes, travessa 1 mm mais curta que a ripa). Eram de modelagem, não de render: um recuo de 1 a 2 mm que a geometria usava para evitar faces coplanares na união de sólidos criava a saliência. O processo não os pegaria sozinho, porque o teste só reprovava atravessamento acima de 1 mm e o crítico via a prancha no tamanho inteiro. A família ganhou a regra `degrausEntreCaixas` (faces paralelas de peças que se tocam ficam alinhadas, com diferença menor que 0,25 mm, ou diferem por 5 mm ou mais), com teste sobre os cinco perfis e os pontos mínimo, médio e máximo, e a prancha passou a trazer recortes de 3x das uniões. O custo da terceira rodada foi de 366 mil tokens, e a família soma 915 mil, acima do limite de parada do plano (metade de uma peça do avião, de 200 a 750 mil). A pessoa decide se segue; a regra de degrau vale para toda família nova e deve baixar o custo dos perfis seguintes.

A pessoa preferiu converter as cadeiras do esboço traduzido em receita do Mecanifica, em vez da família modelada à mão. A [sonda](../banco-de-provas/receitas-externas-2026-10-19/sonda-passos/RESULTADO.md) mostrou que a conversão é mecânica e sem agente: seis das onze cadeiras saem completas, com a caixa idêntica ao esboço, e as outras cinco pedem traduzir giro, cilindro e extrusão. A família `cadeira` fica no ramo, sem aprovação, como alternativa parametrizada.

