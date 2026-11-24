# Encaixe cilíndrico parcial: o eixo que entra só em parte no furo

**Estado:** rascunho

**Território:** nenhum (aguarda aprovação)

**Responsável:** a IA da sessão implementa; a pessoa aprova o plano.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-24.

Escrito a pedido da pessoa em 2026-11-24, que escolheu corrigir a regra geral em vez de encurtar a porta do motor do braço de prova.

## Problema observado

A relação `encaixaCilindrico` (`src/autoria/interfaces-montagem.js`) só aprova quando o cilindro interno cobre o externo de ponta a ponta no eixo: a sobra do início e a do fim têm de ser maiores ou iguais a zero. Um eixo que atravessa uma parede e só depois entra no cubo da peça que ele aciona não cabe nessa regra. No braço de prova, o eixo de saída da redução do ombro tem 25 mm, 13 mm passam pelo furo da parede do garfo e 12 mm entram no cubo do primeiro elo; a relação `eixoDeSaidaNoCuboDoElo1` volta reprovada com sobra de fim de −13 mm, e a fixação da etapa `elo1` é recusada com `etapa-com-junta-reprovada`. A peça está certa: o defeito é a regra, que voltaria em qualquer eixo de motor com polia, engrenagem ou cubo curto.

## Resultado

A especificação do `encaixaCilindrico` aceita um campo opcional que declara o encaixe parcial com o comprimento mínimo de sobreposição, e a relação passa quando o interno inteiro está sobre o externo e a sobreposição alcança esse mínimo; sem o campo, a regra de hoje vale sem mudança.

## Filtro Agent-First

Encaixe parcial: ENVOLVER a medida que já existe (`sobreposicaoAxial`) com um campo declarado na especificação da relação, `encaixeAxial: { modo: 'parcial', sobreposicaoMinima }` em metro. O modo `parcial` troca a exigência de que o interno cubra o externo pela de que o interno fique inteiro dentro do intervalo do externo, com a sobreposição no mínimo declarado, e o diagnóstico novo `sobreposicao-insuficiente` diz o medido, o mínimo e a relação. A opção é declarada na montagem, e a ferramenta não conhece o objeto.

## Incluído

- o campo na especificação, a leitura e a validação dele na montagem persistida, e o diagnóstico novo;
- a fixture geral de eixo com cubo curto, uma que passa e uma que falha pela sobreposição, com teste;
- o contrato `MONTAGEM-PERSISTIDA.md` com o campo;
- a prova no braço de prova, cujo uso em `eixoDeSaidaNoCuboDoElo1` com 12 mm e a fixação das cinco etapas que faltam, com o aceite que a pessoa já deu, correm pelo plano do braço de prova, dono daquela pasta.

## Excluído

- o mesmo modo para outras relações (plano apoiado, rosca);
- o acabamento das peças do braço de prova, que fica para a etapa posterior que a pessoa pediu.

## Gate de saída

1. A fixture de eixo com cubo curto passa com o modo parcial e falha sem ele, e falha com sobreposição menor que a mínima.
2. As montagens que já existem resolvem com as mesmas medidas e o mesmo resultado, byte a byte nas impressões fixadas.
3. As nove etapas do braço de prova ficam fixas.
4. `npm run gates` e o CI verdes.

## Fatias

1. O teste que falha com a fixture de eixo com cubo curto.
2. O campo, a validação e o diagnóstico, com o contrato.
3. O uso no braço de prova e a fixação das etapas.
4. Fechamento.

## Riscos e parada

Se o campo novo mudar a impressão de alguma etapa já fixada em outro objeto, o plano para antes de reabrir qualquer etapa e volta à pessoa.

## Fechamento

A preencher.
