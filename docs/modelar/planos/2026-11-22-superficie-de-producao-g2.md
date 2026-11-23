# Superfície de produção (G2): a chapa de subdivisão sem a ondulação que o crítico acusa, sem sair da forma

**Estado:** ativo

**Território:** `procedural/nucleo/subdivisao.js`, `procedural/nucleo/subdivisao.test.mjs`, `procedural/nucleo/algebra-esparsa.js`, `procedural/nucleo/algebra-esparsa.test.mjs`, `procedural/nucleo/subdivisao-energia-de-curvatura.test.mjs`, `tools/fixtures/correcao-de-superficie/`, `tools/modelar/distancia-a-pele.mjs`, `tools/modelar/distancia-a-pele.test.mjs`, `tools/modelar/zebra-numerica.mjs`, `tools/modelar/zebra-numerica.test.mjs`, `procedural/nucleo/gaiola-por-rede.js`, `procedural/nucleo/gaiola-por-rede.test.mjs`, `procedural/nucleo/uso-operacoes.js`, `tools/modelar/preenchimento-da-rede.mjs`, `tools/modelar/preenchimento-da-rede.test.mjs`, `docs/modelar/banco-de-provas/superficie-g2-2026-11-22/`

Ativado pela pessoa em 2026-11-22, depois do fechamento do plano do ajuste esparso. A energia de curvatura (`alisarSuperficie`) e o preenchimento do miolo moram em `procedural/nucleo/gaiola-por-rede.js`, que a fatia 3 do plano das formas que faltavam (a curva paralela na rede de curvas) também usa. A pessoa decidiu no mesmo dia que o G2 vai antes: o arquivo entra neste território, e a curva paralela espera o fechamento deste plano. A ficha da `gaiolaPorRede` em `procedural/nucleo/uso-operacoes.js` entra junto, porque o plano da hélice, que tinha o arquivo, fechou.

**Responsável:** a IA da sessão implementa e mede; a pessoa ativa o plano, decide os pontos marcados nas fatias e julga a forma por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main do dia da ativação.

## Problema observado

A lataria do carro-fastback ficou com nota 6 a 7 nas rodadas do quarto traseiro, e o defeito que o crítico repete é a ondulação do flanco. A pessoa aceitou a fatia 2 com esse defeito aberto, que deve voltar na porta e no para-lama dianteiro. O plano de correção de superfície (encerrado em 2026-11-21) deixou o diagnóstico no banco de provas `correcao-de-superficie-2026-11-16`:

- a subdivisão já é C2 ao longo das curvas fora dos vértices extraordinários e dos vincos; o que se lê como salto é rampa de curvatura numa gaiola de 70 mm;
- em volta de um vértice extraordinário a curvatura varia de cinco a doze vezes mais que num retalho regular, que é o limite G1 da subdivisão;
- a energia de variação de curvatura (`alisarSuperficie`) ficou no núcleo desligada e experimental, porque piora a forma em dois casos medidos: a grade de espaçamento desigual (o paraboloide vai de 0,89 a 3,27 mm), em que o degrau do espaçamento conta como curvatura, e a calota assimétrica, em que o preenchimento do miolo erra 1,26 mm e o peso que o segura não se sustenta fora de uma janela estreita;
- no quarto traseiro, nenhuma das três ondas testadas serve: a padrão melhora o quarto na zebra e piora a porta, o ombro, a coluna, a tampa e a traseira, com a chapa a 4,7 mm da pele; a de 400 mm alisa o rebaixo e o alargamento para fora da forma, até 8,6 mm.

A correção exata apontada lá é a curvatura normal linearizada, com a normal e a métrica da gaiola declarada congeladas por aresta. Ela é nula na esfera, no cilindro e no plano e não depende do parâmetro, mas pede o sistema com os três eixos juntos. Na eliminação densa de hoje isso custaria umas 27 vezes mais, e é por isso que este plano vem depois do solver esparso.

As medidas daquele diagnóstico saíram de cópias instrumentadas e de roteiros de rascunho: a distância à pele, a contagem de lados sem vizinho no preenchimento e a zebra de variante. Nenhum gate junta a zebra à distância à forma, e o critério da zebra sozinho aprovaria a onda de 400 mm, que tira a chapa 8,6 mm da forma.

## Resultado

No quarto traseiro do carro, com a opção ligada pela receita, nenhuma região da zebra numérica sobe, a tampa e o ombro caem em laços esperados, a chapa fica a até 1,5 mm da pele analítica no flanco, e o crítico e a pessoa julgam a ondulação do flanco resolvida ou menor.

## Filtro Agent-First

ENVOLVER a medida da distância à pele e o diagnóstico do preenchimento como ferramentas com saída legível, no lugar dos roteiros de rascunho. A receita declara a pele que já calcula, e a ferramenta compara. REFATORAR a energia de curvatura para a curvatura normal linearizada, mantendo a opção `alisarSuperficie` da `gaiolaPorRede` como interface única de receita. ADIAR os retalhos de grau 5 a 7 com G2 explícita (o padrão de estúdio, o degrau 6 da análise), que fica como plano sucessor reaproveitando a tampa da fatia 4.

## Incluído

- a distância da superfície limite à pele declarada, como ferramenta, e o gate que junta a zebra numérica à distância numa peça;
- o diagnóstico do preenchimento na saída da `gaiolaPorRede`: quantos lados ficaram sem vizinho e por quê;
- a curvatura normal linearizada no lugar da derivada do vetor posição, com as chapas marcadas como CONHECIDAS nos testes de energia passando a caber;
- um preenchimento do miolo que não erre a dupla curvatura em 1 mm num retalho de 300 mm, ou a cota do miolo trocada por outra que não dependa de uma janela de peso;
- a tampa G2 de N lados em volta de cada vértice extraordinário, amostrada nos mesmos vértices da gaiola;
- a prova no quarto traseiro, com a receita repassando a opção, pelo laço de modelagem.

## Excluído

- a ordem de custo do sistema, que é do plano do ajuste esparso;
- as bordas dos vãos cortados depois da subdivisão, cujos 16 vértices de valência 5 vêm da booleana e não da gaiola;
- os retalhos de grau 5 a 7 (degrau 6) e o ajuste de B-spline sobre a malha (degrau 7);
- mudar a receita do carro além de repassar a opção e escolher a onda, o que o plano do carro conduz.

## Invariantes

Desligada, a opção dá a mesma gaiola de hoje, bit a bit. As cotas exatas continuam a 1e-6 m. A interface de receita é a opção `alisarSuperficie` da `gaiolaPorRede`, com a faixa de `onda` de 2 a 64 passos. Nenhuma métrica aprova a forma sozinha: a zebra, a distância e o pente são juntos o critério da ferramenta, e quem aprova a forma é a pessoa.

## Gate de saída

1. Nas chapas analíticas e nas de prova, com a opção ligada, o desvio a mais de 100 mm da borda é igual ou menor que sem a opção, com folga de 0,05 mm (decisão da pessoa em 2026-11-22), inclusive na grade de razão 2 e na calota assimétrica, e as marcas CONHECIDAS saem dos testes.
2. A quadrática inclinada na própria gaiola tem energia nula, e a esfera, o cilindro e o plano também.
3. No quarto traseiro a zebra não sobe em nenhuma região, a distância à pele no flanco fica até 1,5 mm e a silhueta não incha mais que 0,5 mm, medidas pelas ferramentas novas.
4. O custo da subdivisão com a opção ligada fica dentro do dobro do custo sem ela, medido no ensaio de escala.
5. O crítico cego e a pessoa julgam a rodada do quarto traseiro com a opção.
6. `npm run gates` verde e o CI verde.

## Fatias

1. Os instrumentos: a distância à pele, o diagnóstico do preenchimento e o gate que junta zebra e distância, provados no quarto traseiro de hoje, que vira a linha de base.
2. A curvatura normal linearizada. Ponto de decisão da pessoa, com as medidas das duas formas: as três coordenadas como incógnitas juntas, ou só o deslocamento na direção da normal, que é mais barato e deixa a cota exata escorregar na tangente.
3. O miolo: um preenchimento melhor ou outra cota, provado na calota assimétrica e no toro.
4. A tampa G2 de N lados nos extraordinários. Antes de escrever, conferir as referências que a análise citou de memória (Karčiauskas e Peters 2021, Gregory G2 e Reif 1996) e registrar a escolha. Prova na rede de prova com o vértice de valência 5 e no `c_tampa` do quarto, de valência 3.
5. A prova no quarto traseiro, pelo laço de modelagem com crítico cego, e a pessoa decide se a opção sai de experimental.
6. Fechamento, com o degrau 6 levado ao backlog como plano sucessor e as medidas de antes e depois no banco de provas.

## Riscos e parada

Se na fatia 2 nenhuma das duas formas passar nas chapas da revisão de 2026-11-19, parar e levar à pessoa antes da tampa. Se a tampa da fatia 4 não ficar dentro de 0,1 mm da gaiola regular fora da zona do extraordinário, parar. Se o quarto traseiro melhorar na zebra e sair da pele mais de 1,5 mm, a opção continua experimental: é o caso da onda de 400 mm, e o gate da fatia 1 existe para pegá-lo.

## Andamento

Fatia 1, primeira parte, feita em 2026-11-22, com as medidas em `docs/modelar/banco-de-provas/superficie-g2-2026-11-22/`. A distância à pele é a ferramenta `tools/modelar/distancia-a-pele.mjs`, que mede a superfície limite contra a pele que a receita exporta em `PELE(PARAMS)`, e com `--zebra --contra` dá o veredito que junta as duas medidas contra uma linha de base. O carro-fastback exporta a pele do flanco, e a linha de base do quarto traseiro está gravada: no flanco, longe da borda da soleira e sem o arco, a chapa fica a até 1,79 mm da pele, acima do 1,5 mm do gate 3, que a receita registrava com roteiro de rascunho sobre outra faixa. A decisão de manter o 1,5 mm ou medi-lo contra a linha de base fica para a fatia 5, com a pessoa. A segunda parte, o diagnóstico do preenchimento, foi feita no mesmo dia: com `alisarSuperficie`, a `gaiolaPorRede` publica `preenchimento`, o motivo de cada lado de cada retalho de quatro lados, e `tools/modelar/preenchimento-da-rede.mjs` o mostra de qualquer receita, ligando a opção só para medir. No quarto traseiro de hoje são 69 retalhos e 276 lados: 174 com vizinho, 8 cortados pela razão de cordas, 61 por vinco, 17 por borda livre, 15 no plano de simetria e 1 por retalho de n lados ao lado, o mesmo quadro da cópia instrumentada de 2026-11-21 com a receita de hoje. A fatia 1 está feita.

Fatia 2, decisão da pessoa em 2026-11-22, com as medidas do protótipo no banco de provas: a cota completa, refeita sobre a gaiola do ajuste anterior (quatro iterações), e não a cota só na normal, que tira a cota exata do lugar. Na mesma recomendação aceita, o gate 1 ganha folga de 0,05 mm, porque a sela, cuja curvatura normal varia de fato no espaço, fica até 0,021 mm pior que sem a opção com qualquer forma. O gate 2 cobra energia nula na quadrática inclinada, que é a propriedade da energia de hoje e não a da curvatura normal (nula na esfera, no cilindro e no plano, e não na inclinada, cuja curvatura varia de fato); a correção do texto vai à pessoa.

Fatia 2 levada ao núcleo em 2026-11-22: a opção usa a cota completa refeita quatro vezes, igual ao protótipo, e as dezoito analíticas, a grade de razão 2 e oito dos dez retalhos da chapa lateral de prova ficam dentro do gate 1; os retalhos `coluna` e `atrasDaColuna` seguem CONHECIDOS, por 0,02 mm. O custo no quarto traseiro reprova o gate 4: 5,2 vezes o de sem a opção no passo 70 e 8,1 no passo 35, com dois terços na conferência do ganho, uma resolução por cota. As medidas estão no banco de provas. Baixar o custo fica antes da fatia 5.

O custo baixou no mesmo dia, por decisão da pessoa ("baixar o custo"): sem cota exata, o ganho sai da estimativa de Hager e Higham, uma cota inferior que acerta o exato ou fica acima de 92% dele nas grades de prova, e a conta exata só roda quando ela passa de 10, um décimo do limite; a ordem de eliminação e a análise simbólica da primeira conta servem às outras três, a matriz se monta pela metade, e a normal do vértice regular sai da fórmula fechada. Pelo menor de três tempos, a subdivisão com a opção custa 1,76 vez a de sem ela no passo 70 e no passo 35, e o gate 4 passa.

## Fechamento

Preencher ao concluir ou cancelar: estado final, commit e PR, gates, resultado observado e candidatos devolvidos ao backlog.
