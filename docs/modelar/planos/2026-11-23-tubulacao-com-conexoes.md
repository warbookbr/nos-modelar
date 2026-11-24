# Tubulação com conexões: a rede de tubos por traçado e bitola, com as conexões postas sozinhas

**Estado:** ativo

**Território:** `procedural/familias/tubulacao/`, `procedural/familias/index.js`, `tools/fixtures/tubulacao/`, `docs/modelar/banco-de-provas/tubulacao-2026-11-23/`, `docs/modelar/ferramentas-por-objeto.json`, `tools/modelar/capacidade.mjs`.

Ativado pela pessoa em 2026-11-23, para que agentes despachados avancem nas fatias uma a uma.

**Responsável:** a IA da sessão ou o agente despachado de cada fatia; a pessoa aprova a forma de cada conexão por imagem e decide o que está em Decisão da pessoa.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-23.

## Problema observado

O [mapa de ferramentas por objeto](../pesquisas/FERRAMENTAS-POR-OBJETO.md) dá a tubulação com conexões como inexistente, "nem esboço nem núcleo". Ela é pedida por 27 objetos em 11 famílias, entre eles caldeira, compressor, bomba, reservatório, válvula, registro, hidrante, motor a combustão, cilindro hidráulico, ar-condicionado e torre de resfriamento, e é a primeira ferramenta da lista que não existe nem em parte.

A tubulação ainda não foi feita por quatro motivos, e o histórico mostra cada um deles. O primeiro é que o projeto tira as ferramentas do objeto que está sendo modelado (o avião, o carro, o braço), e nenhum objeto do acervo pediu tubo com conexão: o único rastro dela é a peça de prova `_flange-de-tubulacao` do plano mestre de 2026-08, que provou grupos de partes e não tubulação. O segundo é que as peças de que ela depende chegaram há pouco: a `estruturaDeBarras` com tubo redondo de parede (2026-11-21), o tubo oco, o anel e o toro provados por `lathe` no plano das formas que faltavam (2026-11-22), e a união de tubos com costura e o encontro em T exato (`juncaoDeTubos`, 2026-11-15). O terceiro é que o encontro de tubos ainda deixa defeito medido: o backlog registra faces abaixo do piso em 2 de 8 variantes do encontro de tubos e a lasca de 1 a 4 µm junto da costura da união. O quarto é que a bitola precisa de tabela de norma, e o catálogo de normas único que a [análise de 2026-10](../pesquisas/ANALISES-DE-2026-10.md) propõe nunca entrou num plano.

Hoje a IA que precisa de um cano com curva escreve trechos de `friso` ou de barras, calcula à mão onde cada curva começa e termina, e não tem tê, redução, flange nem válvula prontos.

## Resultado

O agente declara o traçado (nós com nome e posição, trechos entre nós), a bitola e o material, e uma chamada da família devolve a rede com cada trecho cortado no comprimento certo, uma curva em cada mudança de direção, um tê em cada nó de três trechos, uma redução onde a bitola muda, flange, válvula ou tampão onde o traçado os declara, e uma porta em cada ponta livre, com o comprimento de corte de cada trecho nas medidas.

## Filtro Agent-First

Rede como família: ENVOLVER. A `tubulacao` é uma família pelo [contrato da família](../contratos/CONTRATO-DA-FAMILIA.md), com perfis, conferência, aprovação e portas, e uma chamada gera a rede inteira. Assim a rede não depende de duas chamadas de família na mesma receita, cujos ids de origem colidem (item "Portas e montagem do fixador e da mola" do backlog).

Cada conexão como peça própria: USAR DIRETO o que o núcleo tem. O trecho é tubo oco de `lathe` com `espessura`; a curva é o toro parcial de seção anular por `lathe` fora do eixo; a redução é o tronco de cone oco por `lathe`; o flange é disco com furação por `arranja` radial; o tampão é calota por `lathe`. Cada uma sai como parte separada que encosta na vizinha pela face de ponta, como a conexão real, que é peça à parte, e o contato é declarado. Com isso a rede não passa pela união de tubos e não herda o defeito de costura do backlog.

Tê: ENVOLVER a `juncaoDeTubos` para o tê de 90 graus, que é o caso que ela cobre, e medir na fatia 3 a versão oca. O tê inclinado fica ADIAR.

Tabela de norma: USAR DIRETO a forma da tabela da família `fixador`, com as bitolas como dado da família. O catálogo de normas único fica ADIAR, para quando uma terceira família pedir a mesma tabela.

Traçado: ENVOLVER a forma de nós com nome e barras entre nós da `estruturaDeBarras`, que o agente já conhece, sem índice como identidade.

## Incluído

1. A tabela de bitolas por material, com o diâmetro externo, a parede e o raio da curva: aço carbono pelos diâmetros nominais de 1/2" a 12" com parede da série 40 e curva de raio longo (1,5 vez o diâmetro nominal), e PVC soldável de 20 a 110 mm com o joelho de raio curto. Os valores são números de norma pública, sem marca de fabricante.
2. A leitura do traçado e a conferência dele: nós com nome, trechos entre nós, bitola por trecho; a recusa diz o nó e o motivo quando o trecho é curto demais para as conexões das duas pontas, quando dois trechos se cruzam, quando um nó tem mais de três trechos e quando o ângulo do nó não tem conexão (abaixo de 15 graus de desvio vira trecho reto; o tê fora de 90 graus é recusado).
3. Os trechos cortados e as curvas em cada mudança de direção, com o ângulo que o nó pede, os tampões e as portas nas pontas livres (eixo, face e diâmetro), e o comprimento de corte de cada trecho nas medidas.
4. O tê de 90 graus e a redução concêntrica.
5. O flange de pescoço com a furação da norma e a válvula como acessório no nó (de esfera e de gaveta, com corpo, castelo e alavanca ou volante como volume), com as portas das duas bocas.
6. Uma rede de prova na bancada e no banco de provas, o mapa de ferramentas atualizado e a ficha em `npm run capacidade`.

## Excluído

O tê inclinado, a cruzeta, a curva em gomos, a rosca na ponta do tubo, a solda entre trecho e conexão, a mangueira flexível com caimento (que é a ferramenta `cabo`), o duto de seção retangular (que é a `chapa`), o suporte do tubo, o isolamento térmico, o cálculo de escoamento e de perda de carga, e normas além das duas da tabela. Peça do acervo que hoje desenha tubo à mão não é migrada por este plano.

## Invariantes

O núcleo não ganha nome de objeto nem operação nova, e o acervo sai igual. A família é determinística: a mesma chamada dá a mesma malha em duas execuções. Cada parte da rede é sólido fechado, com cada aresta em duas faces.

## Gate de saída

1. A tabela e a conferência do traçado com teste, incluindo cada recusa da lista do item 2 com o nó e o motivo na mensagem.
2. Cada conexão com perfil, conferência pelo contrato da família, teste e o veredito da pessoa por imagem em `aprovacao.json`.
3. Uma rede de prova de pelo menos oito nós, com três curvas, um tê, uma redução, dois flanges e uma válvula, montada na bancada. Cada encaixe tem contato medido sem atravessar, e o comprimento de corte de cada trecho é igual à distância entre os nós menos o avanço das conexões, até 0,01 mm.
4. A rede de prova abaixo de dez segundos de execução e exportável em STEP e OBJ com as partes nomeadas.
5. `npm run gates` verde e o CI verde.

## Fatias

Cada fatia cabe numa sessão de agente despachado, entrega o teste dela e deixa o andamento escrito abaixo antes de passar à seguinte.

1. Feita em 2026-11-24: a tabela de bitolas, a leitura e a conferência do traçado, com a fixture neutra `tools/fixtures/tubulacao/` e as recusas.
2. Feita em 2026-11-24: os trechos cortados, as curvas e os tampões, com as portas, e a aprovação da pessoa por imagem.
3. Feita em 2026-11-24: o tê de 90 graus e a redução, com a medida da versão oca do tê, e a aprovação da pessoa.
4. O flange e a válvula como acessórios no nó, e a aprovação da pessoa.
5. A rede de prova, o banco de provas, o mapa de ferramentas, a ficha e o fechamento.

## Decisão da pessoa

Decidido em 2026-11-23: a rede sai oca, com a parede visível nas pontas, e a tabela começa com aço carbono e PVC soldável; o cobre entra depois, se um objeto pedir.

## Riscos e parada

Se o tê oco por `juncaoDeTubos` não sair sólido fechado, ou passar de dois segundos, ele sai maciço com a boca aberta só nas três pontas, e a fatia volta à pessoa com a medida antes de seguir. Se a curva de toro parcial der lasca na junta com o trecho reto, a fatia mede o número de segmentos que a resolve e o custo, e para se o custo passar do gate 4. Se a tabela pedir um valor de norma que não seja público, ele sai da tabela.

## Andamento

Fatia 1, em 2026-11-24. `procedural/familias/tubulacao/tabela.js` traz o aço carbono de 1/2" a 8" (diâmetro externo e parede da série 40 da ASME B36.10M, lidos na tabela métrica da Engineering Toolbox; centro à boca da curva de raio longo, do tê, comprimento da redução concêntrica e do tampão da ASME B16.9-2018, lidos no extrato público das tabelas 6.1-1, 6.1-7, 6.1-11 e 6.1-10) e o PVC soldável de 20 a 110 mm (diâmetro externo e parede da NBR 5648/99, lidos no catálogo da Plastubos). 10" e 12" ficaram fora, porque a tabela aberta da parede não os traz, e as conexões de PVC seguem regras da família, porque as fontes abertas não dão a medida delas. `tracado.js` lê o traçado, dá a cada nó a ponta, a curva (de 15° a 90°, avanço R·tan(desvio/2)), a continuação, a redução ou o tê reto, calcula o corte de cada trecho e recusa, dizendo o nó ou o trecho, o nome repetido ou que falta, a bitola fora da tabela, o trecho curto, o cruzamento, o nó de quatro trechos, o desvio de 1° a 15°, a curva acima de 90°, a curva ou o tê entre bitolas e o tê inclinado (`tools/fixtures/tubulacao/tracado.test.mjs`). Uma mudança de desenho: a família do contrato só recebe números, e o traçado é uma lista; a rede passa a ser um ajudante que lê o traçado e põe as peças, e as conexões e os trechos vêm de uma família de números, como a correia sobre as polias.

Fatia 2, em 2026-11-24. A família `tubulacao` faz o trecho, a curva e o tampão ocos por diâmetro externo e parede, e `rede.js` (`pecasDaRede`) lê o traçado e devolve cada peça com a pose; a receita põe as peças pelo `instanciaDeFamilia` (`tools/fixtures/tubulacao/rede.mjs`). O zigue-zague de aço de 2" com três curvas e o tampão sai sem órfão, com o primeiro tubo de 424 mm (500 menos o avanço de 76 da curva). A pessoa viu a costura na emenda da curva com o tubo: a boca da curva saía inclinada, porque o `friso` corta a primeira seção na bissetriz, e a seção dela tinha outra fase. A curva ganhou um toco reto em cada boca, com o raio do arco encolhido para o centro à boca continuar o da ASME B16.9, e a seção passou a ser o polígono de 48 lados do tubo, com a fase que a rede passa de peça em peça; os sete encontros só encostam, e o teste exige isso. A conversão do quadro em três giros caía na trava de cardã com o tubo ao longo de x, e o teste dos giros cobre o caso. A camada mecânica foi gravada depois da aprovação da pessoa por imagem.
Fatia 3, em 2026-11-24. A família ganhou o tê reto (forma 4: a passagem e a derivação maciças por `lathe`, unidas, menos os dois furos) e a redução concêntrica (forma 5: o tronco de cone oco por `lathe`), com o centro à boca e o comprimento da ASME B16.9. O tê oco saiu sólido fechado num pedaço só, sem passar pela `juncaoDeTubos`, e a rede de aço com duas curvas, o tê e a redução monta em 0,6 s. A rede passou a tomar o tê como fonte do ângulo das seções: os tubos da passagem têm os vértices a partir da derivação, e o da derivação, a partir da passagem; os dez encontros só encostam, e o teste exige isso. Quando dois tês pedem ângulos diferentes ao mesmo tubo, o par sai em `desencontros`. A camada mecânica foi gravada depois da aprovação da pessoa por imagem.

## Fechamento
