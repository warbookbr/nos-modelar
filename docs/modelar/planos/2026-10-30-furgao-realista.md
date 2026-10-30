# Furgão realista — uma cópia do furgão do acervo levada a proporções e lataria de veículo real pelo fluxo de modelagem inteiro

**Estado:** rascunho

**Responsável:** Claude, com a pessoa decidindo o alinhamento e aprovando a forma por imagem

**Repositório e base:** `warbookbr/nos-modelar`, main depois do fechamento do plano [ajustes no núcleo dos veículos](encerrados/2026-10-21-ajustes-no-nucleo-dos-veiculos.md), de que este é o sucessor

## Problema observado

O `furgao` do acervo (`procedural/pecas/furgao`) é uma recriação fiel de um modelo estilizado de pacote de licença livre sem exigência de crédito: volume único facetado, rodas de 1060 mm de diâmetro numa carroceria de 4,85 m, para-lamas em cápsula, faróis em casca de 12 mm e nenhuma linha de porta. A folha comparativa dá interseção sobre união de 0,993 a 0,997 contra a fonte, e por isso ele está certo como está e não pode mudar. O que o projeto ainda não provou é o caminho inteiro de uma peça de veículo com aparência de veículo real: lataria lisa em chapa contínua, vãos de janela e porta com moldura conferida, rodas em proporção real, detalhes de borda como peças à parte e as vistas de superfície obrigatórias da lataria, passando pelo alinhamento, pela prancha, pelo laço com o crítico cego e pela aprovação da pessoa.

## Resultado

Uma peça nova `furgao-realista`, partida de uma cópia do `furgao`, aprovada pela pessoa por imagem e pelo crítico cego com nota 8 ou mais no objeto inteiro, com proporções de furgão real cotadas numa prancha, lataria em chapa contínua do nível oficial de carroceria e cada atrito do fluxo registrado e classificado; o `furgao` original sai do plano byte a byte igual.

## Filtro Agent-First

USAR DIRETO o que o projeto já oferece: a skill `alinhar-modelagem` e a `esbocar-opcoes` para fechar o PLANO da receita com a pessoa, a `desenhar-prancha` para a prancha ortográfica cotada, a gaiola por estações ou a rede de curvas (`gaiolaPorRede`) para a chapa, o `friso` com `variacao` para molduras e calhas, a declaração `vaos` com a conferência das molduras, a família `roda-pneu` para as rodas, as vistas de luz rasante e de curvatura obrigatórias da lataria, o `laco-de-modelagem` com o crítico cego, a `auditar-peca` e a `auditar-montagem`. ENVOLVER nada de antemão. REFATORAR só o que bloquear o resultado: o atrito que impede a peça de passar vira correção na ferramenta geral, no gate ou na instrução, nunca no arquivo da peça, com teste que falhava antes. ADIAR o resto, que volta ao backlog com o caso que o mostrou.

## Ferramentas do fluxo

A pessoa pediu o fluxo com tudo o que o projeto oferece e serve a este objeto. Cada ferramenta abaixo entra ou fica de fora pelo motivo dito, e a que entra é usada na fatia indicada; ferramenta nova que o fluxo pedir vira atrito.

| Ferramenta | Entra? | Onde e por quê |
|---|---|---|
| `alinhar-modelagem` e `esbocar-opcoes` | sim | fatia 1: o PLANO da receita e as escolhas de forma em imagem |
| `medidas-da-fonte.mjs` e `comparar-silhueta.mjs` sobre a fonte do `furgao` | sim | fatia 2: a cópia confere com a fonte antes de mudar, e as proporções de partida saem dela |
| `desenhar-prancha` | sim | fatia 3: o furgão realista sai das proporções da fonte, então o alvo medido passa a ser a prancha cotada com as medidas de classe; sem medida independente ela fica bloqueada, como a skill exige |
| `comparar-silhueta` e a comparação por número da prancha | sim | fatias 4 a 6: a silhueta contra a prancha, na tolerância do alinhamento |
| gaiola por estações ou `gaiolaPorRede`, `friso` com `variacao`, `vaos` | sim | fatia 4: a chapa contínua e as molduras conferidas, com toda abertura declarada |
| `npm run ondulacao`, `npm run alisar`, vincos da rede e das linhas | sim | fatia 4: ondulação, alisamento e vincos medidos antes do crítico |
| cortes ampliados do pacote cego do Blender e `ler-perfil` | sim | fatias 4 e 5: o perfil das molduras, calhas e lábios lido no corte |
| `vistas:critica` e `vistas:superficie` | sim | fatias 4 a 6: o pacote do crítico, com luz rasante e curvatura obrigatórias da lataria |
| `laco-de-modelagem`, `critico-visual` e `rodada-de-modelagem` | sim | fatias 4 a 6: as rodadas registradas e a regra de três rodadas |
| família `roda-pneu` | sim | fatia 5: as rodas na proporção real |
| `conferir-malha`, `descrever-peca`, `guarda:acervo`, `auditar-peca` e `auditar-montagem` | sim | fatia 6: malha, contatos, vãos e montagem antes da aprovação |
| `folha-comparativa` | sim | fatia 6: o `furgao` e o realista lado a lado, na mesma câmera e escala, para a pessoa |
| `retrato:acervo` | sim | toda fatia: o acervo, o `furgao` incluso, sai igual |
| `absorver` (`absorver-ajuste-da-bancada`) | se a pessoa ajustar | quando a pessoa mexer na peça na bancada, o ajuste volta para a receita |
| `contorno-da-imagem` e `prancha-dos-contornos` | só com imagem | entram se a pessoa trouxer imagem de caráter e quiser o mapa de partes dela; a imagem não vira medida |
| `conferir:referencia` | não | mede contra foto, e foto de furgão real traz marca e não entra no repositório |
| esboço detalhado (`laco-do-esboco`) | não | é para objeto sem forma de referência, e aqui a referência existe |

## Incluído

A cópia `procedural/pecas/furgao-realista/` com receita, `referencias/alvo.md`, a prancha cotada e as medidas; o PLANO da receita fechado no alinhamento; a lataria, os vidros, as rodas, os para-choques, a grade, os faróis, as lanternas, os retrovisores, as maçanetas e as linhas de porta que o alinhamento listar; o registro de atritos do fluxo, num ATRITOS.md que a fatia 2 cria na pasta do furgão realista em `docs/modelar/banco-de-provas/`, com cada atrito classificado em corrigido no plano, gate ou instrução nova, ou devolvido ao backlog; as correções gerais que um atrito bloqueante pedir, cada uma com teste e nota em `docs/modelar/UPSTREAM-NOS.md`.

## Excluído

Mudar o `furgao` original, que é peça aprovada; interior da cabine e do baú, salvo decisão da pessoa no alinhamento; PBR e paleta nova, que pedem plano próprio pela regra do projeto (a peça usa os materiais por peça da receita e o módulo de textura); imagem de referência com marca, logotipo ou nome de fabricante, e prancha de terceiro, das quais entram só as coordenadas derivadas; imagem gerada por IA como medida (ela vale só como caráter da forma); migrar outras peças do acervo para as técnicas usadas aqui.

## Invariantes

O `furgao` e as outras 53 peças do acervo saem com o retrato igual ao de antes (`node tools/modelar/retrato-do-acervo.mjs --comparar` com saída 0). O núcleo continua sem domínio de veículo; o que só serve ao furgão entra como opção declarada sobre a ferramenta geral. A receita nova é determinística, versionada e reexecutável, e nenhuma métrica aprova forma sozinha: quem aprova é a pessoa.

## Gate de saída

1. A pessoa aprova a forma do `furgao-realista` por imagens sólidas, com luz de cima e câmera acima, de três quartos, lateral, frente, traseira e de cima, ao lado do `furgao` na mesma escala.
2. O crítico cego dá 8 ou mais ao objeto inteiro, com as vistas de superfície no pacote, e a última rodada está registrada pelo `rodada-de-modelagem`.
3. A silhueta lateral, frontal e de cima fica dentro da tolerância que o alinhamento fixar contra a prancha cotada, medida por `comparar-silhueta`.
4. Os vãos de janela e porta estão declarados em `vaos` e a conferência das molduras passa; os contatos declarados passam; o `descrever` não traz aviso sem resposta.
5. O retrato do acervo sai com 0, e `npm run gates -- --completo` passa.
6. O `ATRITOS.md` tem cada atrito com o comando que o reproduz e o destino dado, e cada achado diz se o processo o teria pego sozinho.

## Fatias

1. **Alinhamento.** Pela `alinhar-modelagem`, com a pessoa: o nível de realismo, a classe e as medidas de furgão real (comprimento, entre-eixos, altura, bitola, diâmetro de roda, sem marca), as partes e quais portas e vãos existem, os contatos, os critérios de reprovação e a tolerância da silhueta; as escolhas de forma em disputa vão em imagem pela `esbocar-opcoes`. Sai o PLANO da receita e o `alvo.md`.
2. **Cópia.** `procedural/pecas/furgao-realista/` nasce como cópia do `furgao` com o nome e a origem trocados e a forma igual, e o retrato confirma o original intocado. É a base de comparação das fatias seguintes.
3. **Prancha.** Pela `desenhar-prancha`, a prancha ortográfica cotada com as medidas do alinhamento: silhueta, aberturas, painéis, linhas de porta e rodas nas vistas lateral, frontal, traseira e de cima.
4. **Lataria.** A carroceria em chapa contínua pela gaiola por estações ou pela rede de curvas, com os vãos e as molduras declarados e conferidos, pelo `laco-de-modelagem` com o crítico cego e as vistas de superfície, até 8 ou à parada da regra de três rodadas.
5. **Rodas e detalhes.** As rodas pela família `roda-pneu` na proporção do alinhamento, e os detalhes de borda e de frente e traseira como peças à parte, cada unidade pelo laço com o crítico.
6. **Objeto inteiro.** Crítico do objeto, auditoria da peça e da montagem, imagens para a pessoa e aprovação.
7. **Fechamento.** Atritos classificados, backlog, `UPSTREAM-NOS.md` com as correções gerais, guia de veículos e skills atualizados onde o fluxo mostrou lacuna, bateria completa e o plano movido para `encerrados/`.

## Decisões que dependem da pessoa

1. **Nível de realismo.** Recomendo lataria lisa com linhas de porta, vincos e molduras, vidros rentes, rodas reais e detalhes de frente e traseira, sem interior; é o nível oficial de carroceria aplicado a um veículo inteiro.
2. **Classe e medidas.** Recomendo um furgão médio de teto alto, com medidas de classe tiradas de fichas públicas sem marca e conferidas contra as proporções do `furgao`, que fica como referência de caráter.
3. **Referência visual.** Recomendo as vistas do `furgao` e a prancha cotada como alvo de medida, e imagem gerada por IA só para caráter, se a pessoa quiser.

## Riscos e parada

O risco maior é a lataria inteira de um veículo passar do que o nível oficial de carroceria provou num trecho: se a chapa não chegar a 7 no crítico em três rodadas na mesma região, o plano para e volta à pessoa com o registro. Para também se uma correção geral pedir mudança em peça do acervo, se uma fatia passar de dois dias, ou se o alinhamento pedir PBR, interior ou outra coisa que este plano exclui.

## Andamento

Rascunho escrito em 2026-10-30, a pedido da pessoa, como sucessor do plano dos ajustes no núcleo dos veículos. Ativa quando esse plano fechar e a pessoa responder às decisões acima.
