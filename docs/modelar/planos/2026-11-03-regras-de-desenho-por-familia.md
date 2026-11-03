# Regras de desenho por família — o que a pessoa corrige vira regra que o próximo objeto lê

**Estado:** pronto

**Execução:** em paralelo ao plano ativo, autorizada pela pessoa em 2026-11-03, antes da etapa 4 do furgão realista.

**Responsável:** sessão principal, com implementador e modelador despachados

**Repositório e base:** `warbookbr/nos-modelar`, ramo de trabalho do furgão realista

## Problema observado

Na etapa 3 do [furgão realista](2026-10-30-furgao-realista.md), a pessoa pediu sete correções depois de ver as imagens, e cada uma custou um ciclo de prancha, modelo e crítico cego. Nenhuma é própria daquele furgão: todas são regras de como um veículo real é desenhado, e nenhuma estava no alinhamento, na prancha ou nas perguntas do crítico. O crítico não apontou nenhuma, porque compara o modelo com a prancha, e a prancha carregava os mesmos palpites. Os registros estão no [alinhamento](../banco-de-provas/furgao-realista-2026-10-30/ALINHAMENTO.md) e nos atritos 14 a 17 do [registro de atritos](../banco-de-provas/furgao-realista-2026-10-30/ATRITOS.md).

| Pedido da pessoa | Regra de veículo que faltava |
|---|---|
| Faixa mais alta e coluna do para-brisa mais grossa | Largura mínima da coluna dianteira vista de lado e faixa de teto acima da porta |
| Para-choques, saia e arcos lineares demais | O plástico de proteção sai da lataria com seção própria, não é pintura |
| Arco como o da foto | Arco de veículo de trabalho tem alargamento que se funde ao painel |
| Alargamento maior | Faixa da largura e da saída do alargamento em proporção ao pneu |
| A curva continuar no plástico | O contorno em volta da roda é contínuo; só a cor muda |
| Divisões próximas | Linhas vizinhas de fresta, emenda e borda a 30 mm ou mais |
| Saia sobre as portas | Peça fixa não cobre porta; o corte segue as frestas |

A seção varrida ao longo da lataria, o alargamento de arco e a fresta que contorna o arco também foram feitos à mão dentro da receita do furgão, que passou de 1.700 linhas, e o próximo veículo teria de refazê-los.

## Resultado

As regras de desenho de veículo ficam num catálogo em dados que o alinhamento, a prancha e o crítico leem da mesma fonte; as peças de carroceria do furgão viram famílias que outro veículo chama por parâmetro; e cada pedido de alteração da pessoa fica registrado com a regra que faltou, de modo que o número de pedidos por etapa se meça de um veículo para o outro.

## Filtro Agent-First

- **Catálogo de regras (ENVOLVER):** o `procedural/criterios/<família>.json` já existe e já leva perguntas ao crítico; ele ganha a lista `regras`, cada uma com a pergunta do alinhamento, a pergunta de forma do crítico e, quando houver medida, o nome da conferência que a cobra. Uma fonte só evita três listas que divergem.
- **Skill de alinhamento (REFATORAR):** a `alinhar-modelagem` passa a ler as regras da família declarada e a pôr cada uma como pergunta, sem lista escrita na própria skill; objeto sem família usa um conjunto genérico curto.
- **Conferências da prancha (USAR DIRETO):** a distância mínima entre linhas (`divisoes`) e o corte da saia pelas portas já existem no motor e na especificação; as regras que têm medida apontam para elas.
- **Operação de varredura (REFATORAR):** a seção varrida ao longo da lataria e o alargamento de arco saem da receita do furgão para uma operação geral do núcleo que varre uma seção dada ao longo de um caminho dado, com estações, borda rolada e pontas cortadas numa altura; a fresta que contorna o arco vira parâmetro da lataria. O modelador mostrou em 2026-11-03 que o [contrato da família](../CONTRATO-DA-FAMILIA.md) não carrega essas malhas (parâmetro sem lista, receita sem como chamar família no meio dos passos, continuação do alargamento na malha da saia), e a pessoa escolheu a operação geral no mesmo dia.
- **Registro de pedidos (ENVOLVER):** a ferramenta de rodada ganha o campo dos pedidos da pessoa, com o pedido, a regra que faltou e onde ela passou a morar, e conta os pedidos por etapa.
- **Priors de proporção (ADIAR):** as faixas medidas em veículos reais entram como valores das regras quando houver; o [dossiê de priors por família](../DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md) segue como direção, fora deste plano.

## Incluído

- o formato `regras` em `procedural/criterios/`, com validação e as sete regras do veículo acima, mais as que os atritos do furgão já registram;
- a skill de alinhamento e o pedido do crítico lendo as regras;
- a operação geral de varredura no núcleo, com testes próprios, e a receita do furgão passando a usá-la com o resultado igual;
- o campo dos pedidos no registro da rodada e a contagem por etapa.

## Excluído

- regras de outras famílias além do veículo, que entram quando um objeto delas for modelado;
- mudança de forma no furgão: a extração das famílias não pode mudar a peça;
- motor genérico de perguntas sem família, além do conjunto curto de reserva.

## Gate de saída

1. Prova retroativa: rodar a skill de alinhamento sobre o alinhamento do furgão de 2026-10-30 faz aparecer as sete perguntas da tabela.
2. As regras com medida reprovam a prancha antiga da etapa 3 nos pontos em que a pessoa pediu correção, e passam na prancha aprovada.
3. A receita do furgão usando a operação de varredura gera a mesma peça: silhueta e ondulação iguais às da última rodada aceita, e o retrato do acervo com as outras 54 peças iguais.
4. O registro da rodada aceita os pedidos e a ferramenta conta os pedidos por etapa.
5. `npm run gates` verde e as decisões acima registradas.

## Fatias

1. **Catálogo e skill.** O formato `regras`, a validação, as regras do veículo, a skill de alinhamento e o pedido do crítico lendo o catálogo, com a prova retroativa.
2. **Regras medidas.** Cada regra medível ligada à conferência que a cobra, com a reprovação da prancha antiga e a aprovação da nova.
3. **Operação de varredura.** A operação geral no núcleo, pelo implementador, com testes em peça de fixture; depois a receita do furgão passando a usá-la, pelo modelador, com a prova de que a peça não mudou.
4. **Pedidos como medida.** O campo no registro da rodada, a contagem e os sete pedidos da etapa 3 registrados.
5. **Fechamento.** Atritos, backlog e o plano movido para `encerrados/`.

## Riscos e parada

Se a migração para a operação de varredura mudar a peça além da tolerância da silhueta, a fatia 3 para e volta à pessoa com a medida. Se as regras forem tantas que o alinhamento fique longo demais para a pessoa, elas passam a ser filtradas pelas partes declaradas no plano da peça antes de virar pergunta.

## Fechamento

A preencher ao concluir ou cancelar.
