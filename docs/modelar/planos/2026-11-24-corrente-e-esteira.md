# Corrente e esteira: roda dentada, corrente de rolos e esteira de sapatas em volta de rodas

**Estado:** concluído

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

1. Feita em 2026-11-24: a roda dentada da ISO 606, com a aprovação da pessoa.
2. Feita em 2026-11-24: a corrente de rolos e `transmissaoPorCorrente`, com a transmissão de prova e a aprovação da pessoa.
3. Feita em 2026-11-24: a esteira de sapatas com a roda motriz, a guia e os roletes, com a aprovação da pessoa.
4. Feita em 2026-11-24: o trem de esteira de prova, o banco de provas, o mapa de ferramentas, as fichas e o fechamento.

## Decisão da pessoa

Decidido em 2026-11-24: a corrente começa pela série B europeia (06B a 16B); a esteira começa pela sapata de aço de trator; e a roda motriz da esteira usa o mesmo dente da roda dentada da ISO 606.

## Riscos e parada

Se a corrente de cem elos passar de dez segundos com placas, pino e rolo, o elo sai com menos detalhe (placa sem a cintura) e a fatia volta à pessoa com a medida. Se a tabela da ISO 606 não tiver extrato público com o perfil do dente, o perfil segue as fórmulas abertas da norma citadas pelas fontes, e a fatia diz quais. Se o rolo assentado no vão der contato atravessado pela faceta, a fatia mede o número de lados que resolve e o custo.

## Andamento

Fatia 1, em 2026-11-24. A família `roda-dentada` faz a roda simples das correntes 06B a 16B, de 9 a 80 dentes, com a forma de vão mínimo da ISO 606 (assento de 0,505 d1 abrindo 140° − 90°/z, flanco de 0,12 d1 (z + 2), ponta no meio da faixa da norma, largura de 0,93 ou 0,95 b1), pelas fórmulas reproduzidas no guia aberto da Planichapa e no catálogo DIN 8187 / ISO 606 da Top Machinery; p, d1 e b1 da tabela aberta BS/ISO da BEP. O cubo e o furo padrão são regra da família. A coroa é torneada e o vão de um dente sai repetido por `arranja` radial, como na `engrenagem`; com a tampa do vão larga, os vãos vizinhos se tocavam fora da ponta e a roda de 80 dentes custava 38 s, e com a tampa no setor do dente custa 0,5 s, que o teste cobra abaixo de 2 s. A camada mecânica foi gravada depois da aprovação da pessoa por imagem.
Fatia 2, em 2026-11-24. A família `corrente` faz a corrente de rolos simples 06B a 16B (passo, rolo, largura interna, pino, altura e espessura das placas da tabela aberta BS/ISO da BEP) fechada em volta de duas rodas: o polígono de N elos tem os rolos nos vértices, sobre o círculo primitivo de cada roda nos enrolamentos e a cada passo nos trechos retos, e cada um dos quatro trechos é um rolo, um pino e quatro placas repetidos por `arranja`, de modo que a corrente de 74 elos monta em 1,3 s. `transmissaoPorCorrente` acha os elos abraçados e os do trecho reto por uma busca pequena em volta da tangente comum, com N par e o primeiro rolo de cada trecho reto fora do círculo primitivo, e dá a distância exata e o giro de cada roda. A medição pegou três defeitos antes da imagem: os abraços das rodas trocados (o rolo entrava 2,9 mm no dente da roda grande), o arredondamento que deixava o trecho reto entrar no círculo primitivo e o assento de 7 pontos, cuja corda entrava 0,04 mm no rolo, mais que a folga de 0,005 d1 da norma; a roda dentada passou a 13 pontos no assento e foi regravada. O rolo fica com a folga de 0,02 mm no vão ou entra até 0,08 mm no flanco onde a corrente sai da roda, e o pino entra 0,01 a 0,02 mm na placa nas voltas, porque a placa gira de dois em dois elos e as facetas não casam; nada atravessa, e o teste cobra isso. A camada mecânica foi gravada depois da aprovação da pessoa por imagem.
Fatia 3, em 2026-11-24. A família `esteira` monta numa chamada a esteira de sapatas de aço com garra em volta da motriz (com o dente da roda dentada da ISO 606, decisão da pessoa) e da guia do mesmo tamanho, com os roletes por baixo, nos passos 101,6, 135 e 171, por regra da família, porque não há norma pública de esteira de trator. A disposição dos elos é a da corrente; cada trecho é a bucha, os dois trilhos e a sapata repetidos por `arranja`, e a esteira de passo 135 monta em 0,5 s. A medição pegou três defeitos antes da imagem: a ponta do dente da motriz furava a sapata (passou a ficar 3 mm abaixo do lado de fora dos trilhos no meio da corda do elo), a guia e os roletes ficavam entre os trilhos com 3,75 mm de vão (passaram à largura dos trilhos) e, na conferência mecânica, a bucha fina para o passo cruzava os flancos do dente (restrição de 0,33 passo). Todos os encontros só encostam, e a bucha fica no vão com 0,13 mm de folga. A camada mecânica foi gravada depois da aprovação da pessoa por imagem.

Fatia 4, em 2026-11-24. A transmissão por corrente e a esteira de prova saem abaixo de dez segundos e em STEP e OBJ com as partes nomeadas (`tools/fixtures/corrente-e-esteira/exportacao.test.mjs`), as fichas `parametrosDaRoda`, `transmissaoPorCorrente` e `parametrosDaEsteira` estão em `npm run capacidade`, e o mapa de ferramentas dá os elos como parciais.

## Fechamento

Concluído em 2026-11-24. O gate de saída está cumprido: as três famílias têm tabela, teste das recusas, perfis, conferência e o veredito da pessoa por imagem; a transmissão de prova tem os rolos nos vãos sem atravessar e a esteira de prova tem cada encontro só encostando; as duas provas saem abaixo de dez segundos e exportáveis com as partes nomeadas. O banco de provas está em `docs/modelar/banco-de-provas/corrente-e-esteira-2026-11-24/`. Ficaram fora, como o plano exclui, a corrente dupla e tripla, a série A, a esteira de borracha, o porta-cabos, os degraus de escada rolante e o tensionador. A corrente da bicicleta, que foi feita dentro da receita dela, pode passar para a família `corrente`; a migração mexe em peça aceita e fica para a pessoa decidir.
