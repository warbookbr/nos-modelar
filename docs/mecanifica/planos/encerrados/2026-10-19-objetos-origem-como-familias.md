# Objetos do projeto externo como famílias do Mecanifica — da receita traduzida ao perfil aprovado

**Estado:** concluído

**Responsável:** Claude, com a pessoa aprovando forma

**Repositório e base:** `warbookbr/nos-mecanifica`, ramo `claude/revisar-plano-ativo-cyj8c3`

## Problema observado

O [plano de material e textura](./2026-10-19-receitas-com-material-e-textura.md) traduz as receitas do projeto externo para o esboço do
Mecanifica: 59 das 66 receitas e 1.377 das 1.394 peças. O esboço, porém, é um alvo de forma, e não um objeto do acervo: ele não tem
parâmetros, faixas nem aprovação da pessoa, e cada um dos 66 custaria uma peça inteira pelo caminho do avião (de 400 mil a 1,5 milhão de
tokens). O [plano dos aparelhos de caixa](./2026-10-16-aparelhos-de-caixa.md) mostrou o caminho barato: uma família com perfis,
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

O plano seguinte é o de [veículos de referência livre](../2026-10-20-veiculos-de-referencia-livre.md), que cobre veículos a partir de malhas com licença livre sem exigência de crédito. O resto do projeto de origem (fogões e fornos, geladeiras grandes, eletrônicos, louças sanitárias e as cadeiras que a pessoa não escolheu) entra quando a pessoa enviar mais receitas, e o [backlog](../BACKLOG.md) guarda as pendências.

## Andamento

Fatia 1 feita em 2026-10-19: a [triagem](../../banco-de-provas/receitas-externas-2026-10-19/triagem.md) classifica as 66 receitas em dez grupos, com medidas, número de peças, recusas do tradutor e a família candidata, e aguarda a escolha da pessoa dos grupos e da ordem.

A pessoa escolheu a cadeira como primeiro grupo e onze receitas como perfis (`cadeira_fibra_azul`, `cadeira_ripada_marrom`, `cadeira_larga_estofada_clara`, `cadeira_desgastada_madeira`, `cadeira_fibra_roxa`, `cadeira_classica_creme` e `cadeira_classica_vinho`, `cadeira_basica_clara`, `cadeira_almofadada_clara`, `cadeira_ripada_simples` e `cadeira_larga_estofada_amarela`), com dois ajustes: a `cadeira_larga_estofada_clara` passa a branca, e na `cadeira_almofadada_clara` o topo das pernas da frente precisa encostar no assento. As receitas estão em `tools/mecanifica/fixtures/receita-externa-cadeiras/`.

Fatia 2, primeira rodada (2026-10-19): a família `cadeira` (25 parâmetros, 16 restrições, 1.440 combinações de composição) cobre os cinco perfis de encosto alto, com a caixa envolvente dentro de 3% do alvo em quatro e a `cadeira-rustica` em 3,2% na profundidade, porque a família não desenha pregos, rasgos nem pés podres. O crítico visual cego deu nota 8 ao conjunto (9, 9, 8, 6 e 8 por perfil) e não viu parte solta no ar. O custo foi de 231 mil tokens e 63 chamadas, sem contar a leitura do crítico (17 mil). A prancha espera o julgamento da pessoa, e as poltronas e as vitorianas vêm na rodada seguinte.

A pessoa olhou a prancha e achou deslocamentos e peças atravessadas. A medida confirmou que os defeitos vêm das receitas de origem (postes e pernas atravessando o assento, pernas da esquerda 14 mm fora de alinhamento com as da direita), e que o crítico, comparando só com o alvo, não os podia ver. A triagem ganhou a coluna de peças atravessadas, a família passa a construir as uniões por regra e o alvo vale só para proporção, com as [medidas](../../banco-de-provas/cadeiras-2026-10-19/medidas.md) refeitas.

Fatia 2, segunda rodada (2026-10-19): a família `cadeira` passou à versão 1.1.0, com as uniões por regra (simetria, poste sobre a perna, topo da perna a 0,5 mm do assento, nenhum atravessamento acima de 1 mm), cada uma medida por teste sobre a geometria e pelo portão de contato do esboço. A caixa envolvente fica dentro de 1% do alvo em quatro perfis e 3,2% na profundidade da `cadeira-rustica`. O crítico visual cego, sem alvo, deu nota 8 ao conjunto (8, 8, 8, 7 e 7), viu as cinco simétricas e sem peça atravessada, e apontou um defeito de pouca margem na `cadeira-trabalhada`. As linhas diagonais da prancha vinham da triangulação da união de sólidos, e a prancha agora desenha só as arestas da forma. O custo da família ficou em 549 mil tokens somando as duas rodadas (231 mil e 318 mil), abaixo da metade de uma peça do avião no limite de parada do plano.

Fatia 2, terceira rodada (2026-10-19): a pessoa circulou na isométrica lascas e degraus de 1 a 2 mm nas uniões (topo dos postes 1 mm acima da travessa, face de trás das travessas 2 mm para dentro da dos postes, travessa 1 mm mais curta que a ripa). Eram de modelagem, não de render: um recuo de 1 a 2 mm que a geometria usava para evitar faces coplanares na união de sólidos criava a saliência. O processo não os pegaria sozinho, porque o teste só reprovava atravessamento acima de 1 mm e o crítico via a prancha no tamanho inteiro. A família ganhou a regra `degrausEntreCaixas` (faces paralelas de peças que se tocam ficam alinhadas, com diferença menor que 0,25 mm, ou diferem por 5 mm ou mais), com teste sobre os cinco perfis e os pontos mínimo, médio e máximo, e a prancha passou a trazer recortes de 3x das uniões. O custo da terceira rodada foi de 366 mil tokens, e a família soma 915 mil, acima do limite de parada do plano (metade de uma peça do avião, de 200 a 750 mil). A pessoa decide se segue; a regra de degrau vale para toda família nova e deve baixar o custo dos perfis seguintes.

A pessoa preferiu converter as cadeiras do esboço traduzido em receita do Mecanifica, em vez da família modelada à mão. A [sonda](../../banco-de-provas/receitas-externas-2026-10-19/sonda-passos/RESULTADO.md) mostrou que a conversão é mecânica e sem agente: seis das onze cadeiras saem completas, com a caixa idêntica ao esboço, e as outras cinco pedem traduzir giro, cilindro e extrusão. A família `cadeira` fica no ramo, sem aprovação, como alternativa parametrizada.

A conversão foi estendida (`tools/mecanifica/esboco-para-passos.mjs`): giro, cilindro, extrusão e chanfro. As onze cadeiras convertem sem recusa e com a caixa envolvente idêntica à do esboço, sem agente.

Correção das onze cadeiras (2026-10-19): a pessoa marcou trinta e cinco defeitos nas imagens. A família `cadeira` ficou de lado, no ramo, sem aprovação, e as cadeiras seguiram pela conversão do esboço em receita do Mecanifica (`esboco-para-passos.mjs`), com o alinhamento mecânico das caixas (`esboco-alinhar-caixas.mjs`: simetria, grupos regulares, colunas, degrau, contato e folga, com limite de 45 mm de mudança por face) e os ajustes por cadeira. Onze agentes Sonnet cegos marcaram os defeitos em folhas de seis vistas com peça por cor e a tabela de medidas (`defeitos-marcados/`), e onze corretores Sonnet decidiram cada achado entre corrigido, já resolvido, falso alarme e não tratável, e gravaram os ajustes em `<id>.ajustes.json` com o motivo de cada um; os relatos, as folhas antes e depois e a [comparação das onze](../../banco-de-provas/receitas-externas-2026-10-19/cadeiras-ajustadas/antes-depois.png) estão em `cadeiras-ajustadas/`. Dois erros nossos apareceram no caminho: o renderizador das imagens estava espelhado da esquerda para a direita (corrigido e as imagens regeradas), e o alinhamento esticou uma ripa em cascata (corrigido com o limite de mudança e o tratamento de grupos). Um teste (`cadeiras-ajustadas.test.mjs`) confere que cada arquivo de ajustes aplica sem recusa, não muda a caixa envolvente além de 15 mm e não cria peça atravessada. O que ficou sem tratamento é peça girada, cilindro ou extrusão (a vitoriana quase toda, a almofada do encosto das de vime, os pregos da rústica), e os discos que aparecem pretos nas vitorianas, provável face invertida do cilindro no núcleo.


## Entrada no acervo

A primeira cadeira entra como peça do acervo, e não como família: `procedural/pecas/cadeira-madeira/receita.js`, com a receita que o Haiku refez em passos do núcleo ([relatório](../../banco-de-provas/receitas-externas-2026-10-19/remodelagem-cadeira-ripada-simples/RELATORIO.md), 200 mil tokens, a conferência de simetria, contato e atravessamento falha de verdade quando a peça é quebrada de propósito), o plano de modelagem, 26 contatos declarados com motivo e nenhum atravessamento. O `guarda:acervo` mede a peça e passa. Os centros das ripas passaram de 60,5 para 60 e de 120,5 para 120, para os vãos ficarem iguais. As outras sete cadeiras limpas seguem o mesmo caminho depois da aprovação da forma pela pessoa.

Em seguida, sete agentes Haiku em paralelo levaram as outras sete cadeiras limpas ao acervo (`cadeira-branca-simples`, `cadeira-branca-madeira`, `cadeira-artesanal`, `poltrona-vime-azul`, `poltrona-vime-roxa`, `poltrona-moderna-amarela` e `poltrona-moderna-branca`), cada uma com tabela em milímetro, plano e contatos declarados, e a diferença de caixa contra a conversão de no máximo 0,5 mm, salvo recentros de simetria declarados no cabeçalho de cada receita. O `guarda:acervo` mede as 21 peças e passa. Ficam por decidir a travessa baixa solta da `cadeira-branca-madeira`, as pernas de 69,5 por 66 mm da `cadeira-artesanal`, os embutidos de 40 e 60 mm das poltronas de vime e a cor branca da `poltrona-moderna-branca`. A imagem das oito peças está em `cadeiras-ajustadas/acervo-oito-cadeiras.png`.

## Balcões

Do grupo de balcão e mesa entram duas peças, aprovadas pela pessoa em imagem: `meio-balcao-vitrine-aquecida` (a `balcao_inox_vitrine`, entendida como metade de um balcão de vitrine aquecida, com o vidro da frente inclinado do trilho superior até a borda da frente do tampo, corrigido a pedido) e `balcao-em-l` (a `balcao_canto_escuro_reto`, refeita como um sólido em L por camada, com a extrusão de um contorno de seis pontos em vez de dois blocos encostados). As outras receitas em L foram deixadas de fora, porque o L passa a ser uma peça única e não uma montagem de dois balcões. As oito receitas do grupo, convertidas e alinhadas, ficam em `tools/mecanifica/fixtures/receita-externa-balcoes/`, e a imagem de triagem em `balcoes-e-mesa/triagem-visual.png`. Os três balcões retos (`balcao-de-bar`, `balcao-de-bar-escuro` e `balcao-liso`) e a `mesa-quadrada-escura` (mesa de 98 por 98 por 72 cm, com pés retos porque o afinamento de 12 mm do pé fica no backlog) entraram em seguida, por agentes Haiku, e a imagem das seis peças está em `balcoes-e-mesa/acervo-seis-pecas.png`.

## Eletrodomésticos

Cinco eletrodomésticos entram, aprovados pela pessoa em imagem com textura: `lavadora-secadora-branca`, `lava-loucas-compacta-branca`, `micro-ondas-branco`, `geladeira-compacta-branca` e `freezer-horizontal`. As duas primeiras foram modeladas do zero por agentes Sonnet a partir de imagens que a pessoa forneceu (a lavadora com rebaixo para o painel, porta redonda, pés e rasgos laterais por subtração; a lava-louças com porta, painel, rodapé, borracha e puxador curvo em arco facetado), e o micro-ondas branco partiu da conversão da receita e ganhou porta maior, painel detalhado, arredondamento em segmentos e puxador vertical. As lava-louças convertidas da origem e a lavadora azul foram descartadas por pedido da pessoa. Treze receitas de geladeira, micro-ondas, lava-louças e lavadora, convertidas e alinhadas, ficam em `tools/mecanifica/fixtures/receita-externa-eletro/`; A geladeira compacta foi modelada do zero a partir de duas imagens da pessoa (porta com puxador no topo de canaleta na face de cima, pés de 15 mm), e o freezer partiu da conversão da receita e ganhou branco liso, tampa de 96 mm e arredondamento em segmentos. O `micro-ondas-cromado` foi modelado, a pessoa não gostou, e a peça foi descartada. O painel de cada uma das três peças é parte a alterar quando o módulo de textura ganhar escrita (backlog).

Para a pessoa julgar eletrodoméstico com acabamento, a exportação OBJ passou a ler `MATERIAIS` da receita do acervo (cada entrada com `tipo`, `cor` e opcionalmente `acabamento` e `desgaste`) e a gerar a textura pelo módulo de textura, e `tools/mecanifica/vistas-texturizadas.mjs` mostra a peça exportada por esse caminho, o mesmo que o Blender recebe. O achado: o exportador só tinha sido testado com um módulo de textura falso, e com uma peça real falhava; o teste novo cobre a leitura de `MATERIAIS`.

## Resultado final

Concluído em 2026-10-20. O plano nasceu para fazer famílias do Mecanifica a partir das 66 receitas do projeto externo e terminou fazendo peças do acervo, uma por objeto, e não famílias. A família `cadeira` feita à mão custou 915 mil tokens, e a conversão automática do esboço para passos do núcleo, com ajustes por face, mostrou-se o caminho barato. Entraram 19 peças em `procedural/pecas/`, todas aprovadas pela pessoa em imagem: oito cadeiras e poltronas (`cadeira-madeira`, `cadeira-branca-simples`, `cadeira-branca-madeira`, `cadeira-artesanal`, `poltrona-vime-azul`, `poltrona-vime-roxa`, `poltrona-moderna-amarela`, `poltrona-moderna-branca`), seis balcões e mesa (`balcao-de-bar`, `balcao-de-bar-escuro`, `balcao-liso`, `mesa-quadrada-escura`, `balcao-em-l`, `meio-balcao-vitrine-aquecida`) e cinco eletrodomésticos (`lavadora-secadora-branca`, `lava-loucas-compacta-branca`, `micro-ondas-branco`, `geladeira-compacta-branca`, `freezer-horizontal`). Três foram modeladas do zero por agentes a partir de imagens que a pessoa forneceu: a lava-louças, a lavadora-secadora e a geladeira compacta.

Por pedido da pessoa foram descartados o micro-ondas cromado, as duas lava-louças convertidas, a lavadora azul e a geladeira mini convertida. Ficaram de fora as cadeiras vitorianas e a `cadeira_desgastada_madeira` (defeitos nos cilindros e discos), 10 cadeiras que a pessoa não escolheu, as geladeiras grandes, os fogões e fornos, os eletrônicos e as louças sanitárias.

Custo medido, aproximado e só dos agentes: a família `cadeira` à mão, 915 mil tokens; a remodelagem da `cadeira-madeira` por Haiku, 203 mil; sete cadeiras por Haiku, de 94 a 140 mil cada; balcões e mesa por Haiku, de 113 a 203 mil cada; eletrodomésticos por Haiku (seis peças) e por Sonnet (lava-louças, lavadora e geladeira compacta, de 98 a 250 mil por rodada de ajuste). No total, uma ordem de 6 milhões de tokens para as 19 peças.

Achados e se o processo os teria pego:

1. O painter de vistas ordenava polígonos pela profundidade média e desenhava pontas e cantos falsos, o que levou a marcar e a corrigir defeitos que não existiam. O processo não pegou, e as vistas passaram a usar profundidade por pixel (`tools/mecanifica/vistas-de-passos.mjs`).
2. O exportador de OBJ com textura só tinha sido testado com um módulo de textura falso e falhava com peça real do acervo: perdia `MATERIAIS` e passava o nome do material no lugar da especificação. O processo não pegou. Agora o exportador lê `MATERIAIS` com `tipo`, `cor`, `acabamento` e `desgaste`, há teste, e `tools/mecanifica/vistas-texturizadas.mjs` mostra a peça pelo caminho do Blender.
3. A junção da worktree levou um atalho para `node_modules` ao versionamento porque o `.gitignore` ignorava só pasta (`node_modules/`), o que apagou a pasta real. O gate não pegaria, e o `.gitignore` passou a ignorar também o atalho.
4. A folha de vistas contava só as recusas de um passo e escondeu quatro pés da mesa que o tradutor recusou (afinamento). O processo não pegou, e a folha agora avisa as peças fora dela.
5. O diagnóstico de parâmetros do acervo passou de 90 s por rodada com 30 peças e o teste da porta MCP estourou o teto. O processo pegou, porque o teste reprovou; o teto subiu para 360 s e o custo foi ao backlog.
6. O alinhamento automático movia faces demais em peças com muitas partes (422 alterações na lava-louças de metal). O processo não pegou, e as peças passaram a usar a conversão sem alinhamento como medida.
7. O teto de 30 s da bateria rápida reprovou um teste de textura que passou a ser lento. O processo pegou, pois o gate reprovou.
8. Brilho no material (lustro) não existe no módulo de textura e exige plano porque é PBR. O acordo do repositório já barrava a mudança, e a pendência foi ao backlog.

Pendências no backlog: texto sobre o objeto, afinamento do pé da mesa e custo do diagnóstico (linhas que já existiam), e quatro linhas novas, sobre o brilho do material, as faces finas e n-gons da malha em peças com `subtrair` e `arredondarAresta`, o arredondamento verdadeiro em volta de polígonos facetados e a traseira lisa da geladeira compacta.
