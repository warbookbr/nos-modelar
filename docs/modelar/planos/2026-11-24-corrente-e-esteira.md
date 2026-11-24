# Corrente e esteira: roda dentada, corrente de rolos e esteira de sapatas em volta de rodas

**Estado:** ativo

**Território:** `procedural/familias/roda-dentada/`, `procedural/familias/corrente/`, `procedural/familias/esteira/`, `procedural/familias/index.js`, `tools/fixtures/corrente-e-esteira/`, `docs/modelar/banco-de-provas/corrente-e-esteira-2026-11-24/`, `docs/modelar/ferramentas-por-objeto.json`, `tools/modelar/capacidade.mjs`.

Ativado pela pessoa em 2026-11-24, para que agentes despachados avancem nas fatias uma a uma.

**Responsável:** a IA da sessão ou o agente despachado de cada fatia; a pessoa aprova a forma de cada família por imagem e decide o que está em Decisão da pessoa.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-24.

## Problema observado

O [mapa de ferramentas por objeto](../pesquisas/FERRAMENTAS-POR-OBJETO.md) dá os elos ao longo de caminho fechado como inexistentes, "nem esboço nem núcleo". Eles são pedidos por 19 objetos: moto, bicicleta, triciclo, escavadeira, trator de esteira, empilhadeira, plantadeira, enfardadeira, robô cartesiano, robô de esteira, drone terrestre, correia, corrente, coroa e pinhão, escada rolante, esteira rolante, balanço e os dois relógios. Entre as ferramentas pedidas pelas máquinas industriais, pesadas e agrícolas, é a mais pedida das que ainda não existem.

Ela ainda não foi feita por três motivos que o histórico mostra. O primeiro é que a única corrente do acervo foi feita dentro da própria receita da `bicicleta-urbana`: elos de caixa repetidos por `arranja` linear nos trechos retos e por `arranja` radial nos enrolamentos, com a coroa e a catraca como `lathe` de um lado por dente. A solução ficou no arquivo do objeto e não virou ferramenta, e a corrente não tem rolo, placa nem pino, e a roda não tem o dente da norma. O segundo é que o dente da roda dentada não é o evolvente da família `engrenagem`: a ISO 606 dá o dente pelo assento do rolo, e nenhuma família faz esse perfil. O terceiro é que a esteira de trator pede uma roda motriz, uma roda guia, roletes e uma sapata com garra, e nenhum objeto do acervo é máquina de esteira.

A família `polia-e-correia` resolveu um problema parecido em 2026-11-24: `transmissaoDentada` acha o número inteiro de dentes da correia mais perto da distância pedida, recalcula a distância e põe os dentes da correia nos vãos das polias. A corrente e a esteira são o mesmo problema com elos rígidos no lugar dos dentes.

## Resultado

O agente pede a roda dentada pela norma, número de dentes e série da corrente; pede a corrente de rolos entre duas rodas pela distância aproximada e recebe o número inteiro de elos, a distância recalculada e a corrente fechada com cada rolo assentado num vão; e pede a esteira de sapatas em volta da roda motriz e da roda guia, com os roletes por baixo. Cada uma é família do contrato, com perfis, conferência, aprovação e portas nos furos das rodas.

## Filtro Agent-First

Roda dentada como família: ENVOLVER. É uma família com a tabela da ISO 606 como dado, como a `engrenagem` e a `polia-e-correia`; o perfil do dente é a extrusão de um contorno calculado, com o assento do rolo e o flanco da norma.

Corrente e esteira como composição de estrutura fixa: ENVOLVER a técnica da bicicleta como ferramenta geral. A composição tem dois trechos retos e dois enrolamentos, cada um com o elo repetido por `arranja` (linear no reto, radial no enrolamento), e o número de elos de cada trecho é parâmetro. Assim a corrente de cem elos custa os sólidos de quatro elos mais as cópias, e não cem chamadas de família.

Número de elos e distância: USAR DIRETO a forma de `transmissaoDentada` num ajudante `transmissaoPorCorrente`, com a ficha em `npm run capacidade`.

Migrar a corrente da bicicleta para a família: ADIAR. O plano não mexe em peça aceita; a migração vira item do backlog no fechamento, se a família cobrir o caso.

## Incluído

1. A roda dentada simples da ISO 606, série B europeia, para as correntes 06B, 08B, 10B, 12B e 16B, de 9 a 80 dentes, com o perfil do dente da norma (raio de assento do rolo, raio do flanco e chanfro lateral), o cubo e o furo.
2. A corrente de rolos simples das mesmas séries, com placa interna, placa externa, pino e rolo como volume, e `transmissaoPorCorrente` com o número par de elos, a distância recalculada e o giro de cada roda.
3. A esteira de sapatas de aço com garra, em volta de uma roda motriz com o dente da roda dentada da ISO 606 e de uma roda guia, com dois ou mais roletes por baixo, por passo e largura de sapata declarados, e o ajudante que calcula o número de sapatas e a tensão por distância.
4. Uma transmissão por corrente e um trem de esteira de prova na bancada e no banco de provas, o mapa de ferramentas atualizado e as fichas.

## Excluído

A corrente dupla e tripla, a série A (ANSI), a corrente de elo comum de içamento, a esteira de borracha, o porta-cabos, os degraus da escada rolante, a pulseira de relógio, o tensionador, a catena com caimento (que é a ferramenta `cabo`) e o cálculo de carga e de vida. A corrente da bicicleta não é migrada.

## Invariantes

O núcleo não ganha nome de objeto nem operação nova, e o acervo sai igual. Cada família é determinística, e cada parte é sólido fechado, sem lasca, pela conferência que já corre em toda família. Os valores das tabelas são números de norma pública, sem marca de fabricante; o que a norma não dá (a sapata da esteira, os roletes) segue regra declarada da família.

## Gate de saída

1. Cada família com tabela e teste de cada recusa (série ou tamanho fora da tabela, dentes demais ou de menos, distância que não fecha a corrente), dizendo o recebido e o aceito.
2. Cada família com perfil, conferência pelo contrato da família e o veredito da pessoa por imagem em `aprovacao.json`.
3. A transmissão de prova com cada rolo assentado no vão da roda, sem atravessar, e a esteira de prova com cada sapata encostada na roda motriz e na guia onde enrola, sem atravessar.
4. Cada prova abaixo de dez segundos e exportável em STEP e OBJ com as partes nomeadas.
5. `npm run gates` verde e o CI verde.

## Fatias

Cada fatia cabe numa sessão de agente despachado, entrega o teste dela e deixa o andamento escrito abaixo antes de passar à seguinte.

1. A roda dentada da ISO 606, com a aprovação da pessoa.
2. A corrente de rolos e `transmissaoPorCorrente`, com a transmissão de prova e a aprovação da pessoa.
3. A esteira de sapatas com a roda motriz, a guia e os roletes, com a aprovação da pessoa.
4. O trem de esteira de prova, o banco de provas, o mapa de ferramentas, as fichas e o fechamento.

## Decisão da pessoa

Decidido em 2026-11-24: a corrente começa pela série B europeia (06B a 16B); a esteira começa pela sapata de aço de trator; e a roda motriz da esteira usa o mesmo dente da roda dentada da ISO 606.

## Riscos e parada

Se a corrente de cem elos passar de dez segundos com placas, pino e rolo, o elo sai com menos detalhe (placa sem a cintura) e a fatia volta à pessoa com a medida. Se a tabela da ISO 606 não tiver extrato público com o perfil do dente, o perfil segue as fórmulas abertas da norma citadas pelas fontes, e a fatia diz quais. Se o rolo assentado no vão der contato atravessado pela faceta, a fatia mede o número de lados que resolve e o custo.

## Andamento

## Fechamento
