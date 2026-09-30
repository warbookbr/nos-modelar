# @mecanifica/esboco

Desenha esboços de forma a partir de um JSON declarativo: caixas, cilindros e anéis em vista isométrica, frontal, lateral ou superior, várias opções lado a lado na mesma escala, com legendas numeradas e linhas de centro. Serve ao alinhamento, para mostrar à pessoa as opções de forma antes da modelagem 3D; não é a peça final nem prancha cotada. O núcleo (`src/index.js`) não depende de navegador e devolve `{ svg, largura, altura, escala }`; a linha de comando em `tools/mecanifica/esboco.mjs` grava o `.svg` e o `.png`.

## Independência do núcleo do Mecanifica

O módulo não importa o núcleo do Mecanifica e não deve importá-lo por conveniência: o núcleo trabalha com montagem v5, peças com malha, metro e coaxialidade de portas, e nada disso existe num esboço de prismas em milímetro. As duas únicas exceções previstas, ambas de leitura e sem efeito colateral, são as do plano [O esboço sem conta à mão](../../docs/mecanifica/planos/2026-09-29-o-esboco-sem-conta-a-mao.md). A primeira já está em uso: `src/expandir.js` importa `criarResolverNumerico` de `procedural/nucleo/expressoes.js`, que avalia número, nome de parâmetro e `"=a+b*c"` em 92 linhas e sem nenhum import (é a única importação do núcleo do módulo). A segunda ainda não entrou: a função `poseQueEncaixa` de `src/autoria/posicao-por-porta.js`, pura, que calcula o centro e o ângulo de uma haste entre dois pontos. O resto (encostar, espelhar, ponto nomeado, gate de contato) se reimplementa aqui sobre os prismas do esboço. O contrato de declaração do gate é herdado por cópia, com o valor da constante `MINIMO_DO_MOTIVO` escrito em número em `src/contato.js`.

## Como escrever

O arquivo se chama `<assunto>.esboco.json`. A raiz tem `opcoes` (obrigatório), `plano` (texto livre opcional com as decisões do "Pare e planeje", ignorado no desenho e copiado para o manifesto da análise), `vista` (`isometrica`, o padrão, `frontal`, `lateral` ou `superior`), `linhasCentro`, `ocultar`, `legendas` (`colunas`, o padrão, ou `lista`; ver Legendas) e `explosao` (ver Sobreposição na projeção). Cada opção tem `titulo`, `nota` (uma frase curta), `formas` e, opcionalmente, `legendas` e `explosao`, que sobrepõem os da raiz. Todas as opções saem na mesma escala, com uma barra de 100 mm. Medidas em milímetro, y para cima, z para a frente da vista frontal.

```json
{
  "vista": "isometrica",
  "opcoes": [
    {
      "titulo": "Opção A",
      "nota": "Alojamento sobre a base",
      "formas": [
        { "id": "base", "tipo": "caixa", "largura": 120, "altura": 20, "profundidade": 70, "raio": 10, "centro": [0, 10, 0], "cor": "cinza", "rotulo": "base_fixacao" },
        { "id": "alojamento", "tipo": "anel", "diametroExterno": 70, "diametroInterno": 40, "espessura": 40, "eixo": "z", "sobre": "base", "cor": "azul", "rotulo": "alojamento" }
      ]
    }
  ]
}
```

## Como rodar

```bash
npm run esboco -- <arquivo.esboco.json>
npm run esboco -- <arquivo.esboco.json> --ajustar
npm run esboco -- <arquivo.esboco.json> --analise [--centros] [--zoom=<vista>:x0,y0,x1,y1]
npx vitest run modulos/esboco
```

O primeiro comando grava `<arquivo>.svg` e `<arquivo>.png` ao lado do JSON e imprime o tamanho e a escala em px/mm. O segundo gera a matriz de conferência descrita em [`PARE-E-ANALISE.md`](../../docs/mecanifica/usar/PARE-E-ANALISE.md): as quatro vistas, cada uma com e sem legendas, 8 imagens em `<arquivo>-analise/`, sempre sem linhas de centro: a geração força `linhasCentro: false` em todas as opções e formas sem editar o JSON. Com `--centros` gera também as variações com linhas de centro, 16 imagens. Quando o esboço tem algum achado de sobreposição na projeção ou uma `explosao` declarada, a análise gera ainda as variantes `<vista>-explodida-legendas.png` e `<vista>-transparente-legendas.png` nas quatro vistas (8 imagens a mais, ver Sobreposição na projeção); um esboço sem sobreposição gera as mesmas imagens de sempre. O `manifesto.json` traz o hash do JSON, a data, a escala por vista, `centros`, `forcado` (`{ "linhasCentro": false }` no padrão, vazio com `--centros`), o `plano` do esboço quando existe, `projecao` (ver Sobreposição na projeção) e a lista de arquivos. Com `--zoom`, recorta o retângulo em pixels da vista pedida, amplia 3 vezes e grava o par com legendas e sem legendas (com centros ligados no primeiro e desligados no segundo quando há `--centros`). Um erro no JSON sai como "esboço recusado" com a causa.

## Formas

Toda forma tem `id` único, `tipo`, `cor` e, opcionalmente, `rotulo` e `opacidade`, um número de 0 a 1 (padrão 1) que deixa a forma translúcida para ver o que há atrás dela; com 1 ou sem o campo o desenho é o mesmo de sempre. A `cor` é um nome (`cinza`, `azul`, `laranja`, `vermelho`, `verde`, `roxo`, `amarelo`, `preto`, `branco`) ou um hexadecimal.

- `caixa`: `largura` (x), `altura` (y), `profundidade` (z), `raio` de canto opcional. Furos passantes na direção y: `furos: [{ "diametro": 12, "centro": [x, z] }]`, ou um só em `furo`, com `centro` relativo ao centro da caixa.
- `cilindro`: `diametro`, `comprimento`, `eixo` (`x`, `y` ou `z`; padrão `y`) e `achatado: { "lado": "+x", "profundidade": mm }` para uma face plana lateral, num lado perpendicular ao eixo.
- `anel`: `diametroExterno`, `diametroInterno`, `espessura` (ao longo do eixo) e `eixo`.

Não existem tubo, perfil, esfera nem uma forma de furo separada: o furo é atributo da caixa ou o vazio do anel.

## Posicionamento

Sem nenhum dos três modos, a forma fica em `[0, 0, 0]`. Use um só entre `centro`, `sobre` e `ponta`; depois deles `desloca` soma um ajuste.

- `centro: [x, y, z]`: posição absoluta do centro. Também aceita uma âncora de outra forma, em texto: `"<id>.<ancora>"` (por exemplo `"rodaFrente.centro"`, `"motor.-z"`, `"garfo.fim"`), e o `desloca` soma depois. As âncoras de cada forma são `centro`; `inicio` e `fim`, nas pontas do eixo do cilindro e do anel; e o centro de cada face da caixa mínima (`+x`, `-x`, `+y`, `-y`, `+z`, `-z`), na orientação do mundo depois da rotação. A referência (nas âncoras, em `de`/`para`, `encosta` e `alinha`) pode apontar para uma forma declarada depois e para uma forma `oculto`; ciclo, id inexistente ou âncora inexistente são recusados com a referência, a forma e as âncoras válidas. O `desloca` continua sendo vetor.
- `sobre: "<id>"`: apoia a base no topo daquela forma, centrada nela em x e z.
- `ponta: { "id": "<id>", "lado": "+x" }` (ou `["<id>", "+x"]`): encosta a forma na face daquele lado (`+x`, `-x`, `+y`, `-y`, `+z`, `-z`), respeitando o achatado.
- `de` e `para` (cilindro e caixa): a forma vira uma haste entre dois pontos, sem calcular centro, comprimento nem rotação. Cada ponto é um vetor `[x, y, z]`, uma âncora `"<id>.<ancora>"` ou um ponto nomeado de `pontos` (mapa nome para vetor, na raiz ou na opção; a opção sobrepõe a raiz, e o nome também vale em `centro` e em `alinha.com`). O centro é o ponto médio, o comprimento é a distância e a rotação é a menor que leva o eixo da forma ao vetor de `de` a `para`: o eixo declarado do cilindro (padrão `y`) ou, na caixa, o eixo `y` da `altura`. O garfo de (−90, 300, 700) a (−90, 898, 421,5) sai com centro (−90, 599, 560,75) e 24,97° em torno de x, o mesmo sentido de `rotacao: [-24.97, 0, 0]`. Declarar `comprimento` (cilindro) ou `altura` (caixa) junto é recusado, e também `centro`, `sobre`, `ponta`, `rotacao`, `encosta` e `alinha`; o anel não aceita `de`/`para`. O `desloca` soma aos dois pontos, por exemplo `{ "de": "rodaFrente.centro", "para": "cabecote", "desloca": [-90, 0, 0] }` põe o garfo ao lado da roda. A conta é a de `poseQueEncaixa` copiada em vinte linhas, porque esse arquivo importa `vinculos-de-medida.js` e traria o acoplamento que o módulo evita.
- `encosta: { "referencia": "<id>", "direcao": [dx, dy, dz], "folga": mm }` (folga padrão 0): desloca a forma ao longo de `direcao` (normalizada; também aceita um lado, `"-y"`) até tocar a referência, sem mudar as outras coordenadas. O sentido é o do movimento da forma: ela anda em `direcao` e para do lado oposto da referência. `direcao: "-y"` (ou `[0, -1, 0]`) desce a forma até pousar ACIMA da referência; `"+y"` a sobe até ficar embaixo dela; `"+z"` a põe atrás (z menor) e `"-z"` na frente. A conta é t = min proj(referência) − max proj(forma) − folga sobre os vértices dos prismas, e a forma parte do centro que `centro`, `sobre` ou `ponta` deram (sem eles, de `[0, 0, 0]`). O anel entra como o disco externo, então o furo não conta, e o contato é por projeção: numa diagonal ou com as formas deslocadas de lado a projeção toca e o gate ainda pode medir folga entre os corpos. Exemplo: `{ "id": "tanque", "tipo": "caixa", "largura": 300, "altura": 200, "profundidade": 420, "sobre": "quadro", "encosta": { "referencia": "coluna", "direcao": "+z" } }` põe o tanque sobre o quadro e encostado na traseira da coluna. Com o gate ligado, cada forma com `encosta` e folga dentro da tolerância declara o par `encosta` com a referência sem `motivo`; um par escrito em `contato.pares` prevalece, e `de`/`para` não declara nada.
- `alinha: { "com": "<id>", "eixos": ["x", "z"] }`: copia o centro da forma de referência nos eixos listados; `com` também aceita `"<id>.<ancora>"` (`"motor.-z"`) e ponto nomeado. Ordem de aplicação: `centro`, `sobre`, `ponta` ou `de`/`para`; depois `alinha`, `encosta` e `desloca`.
- `desloca: [dx, dy, dz]`: ajuste em mm depois do posicionamento.
- `rotacao: [rx, ry, rz]` em graus (também `{ "eixo": "x", "angulo": 25 }`): ângulo positivo gira pela regra da mão direita em torno do eixo de mundo indicado, de modo que rx=+90 leva +y para +z, ry=+90 leva +z para +x e rz=+90 leva +x para +y. A rotação vale em torno do centro da forma e é aplicada antes de `sobre` e `ponta` medirem a caixa, então esses modos usam a forma já girada.

Referência a id inexistente ou circular é recusada com a lista de ids da opção.

## Parâmetros, expressões e formas herdadas

`parametros` na raiz e na opção é um objeto `{ nome: valor }`, em que o valor é um número, o nome de outro parâmetro ou `"=expressão"` com `+`, `-`, `*`, `/` e parênteses (o resolvedor de `procedural/nucleo/expressoes.js`, sem funções: não há seno nem cosseno, e `de`/`para` e `arranja` radial cobrem o que a trigonometria faria). Os parâmetros da opção sobrepõem os da raiz nome a nome, e um parâmetro da raiz que usa outro nome enxerga o valor da opção (`"dobro": "=lado*2"` vale 100 numa opção com `lado: 50`). Todos os parâmetros são resolvidos ao ler o arquivo, então um ciclo entre eles é recusado mesmo que ninguém o use.

Qualquer campo numérico do esboço aceita número, nome de parâmetro ou `"=expressão"`: as dimensões (`diametro`, `comprimento`, `diametroExterno`, `diametroInterno`, `espessura`, `largura`, `altura`, `profundidade`, `raio`, `opacidade`), cada componente de `centro`, `desloca`, `rotacao`, `de`, `para` e de `pontos`, `achatado.profundidade`, `furo`/`furos`, `encosta.folga` e `encosta.direcao`, `linhaCentro.extensao`, `espelha.pos`, os campos de `arranja`, `contato.tolerancia`, `penetracao`, `folga`, `pares[].max`, `contato.projecao.limiar` e `explosao.fator`. Um texto que é referência (`centro`, `de`, `para` e `alinha.com` como `"rodaFrente.centro"` ou ponto nomeado) continua sendo referência; num componente de vetor, texto é sempre parâmetro ou expressão. O `contato` e a `explosao` da raiz enxergam só os parâmetros da raiz. Parâmetro inexistente, ciclo e expressão inválida interrompem o comando como "esboço recusado", com a opção, a forma, o campo, o parâmetro ou o problema e os parâmetros válidos, por exemplo `opção 1 (A): forma "a": o campo "largura" com o valor "=lado + lardo" usa o parâmetro "lardo", que não existe (parâmetros válidos: lado, alto)`.

```json
{
  "parametros": { "entreEixos": 1400, "raioRoda": 305, "diametroRoda": "=2*raioRoda" },
  "formas": [
    { "id": "rodaFrente", "tipo": "anel", "diametroExterno": "diametroRoda", "diametroInterno": 420, "espessura": 125, "eixo": "x", "centro": [0, "raioRoda", "=entreEixos/2"] }
  ],
  "opcoes": [
    { "titulo": "A. Longa" },
    { "titulo": "B. Curta", "parametros": { "entreEixos": 1300 } }
  ]
}
```

`formas` também pode ficar na raiz: uma opção sem `formas` herda a lista da raiz, com os parâmetros dela, e por isso duas variantes se declaram só com `titulo`, `nota` e `parametros`. Uma opção com `formas` próprias ignora a da raiz (não há mistura das duas listas). Sem `formas` na raiz nem na opção vale a recusa de sempre. Os parâmetros resolvidos de cada opção saem em `--descrever` (linha `parâmetros:`, e `parâmetro alterado:` no `--mudou`) e no manifesto da `--analise` (`parametros`, por título da opção; a chave só existe quando há parâmetros). O arquivo sem nenhum desses recursos gera o mesmo SVG, byte a byte. O exemplo completo é `tests/fixtures/moto-parametros.esboco.json`: as duas opções (naked e café racer) vêm da mesma lista de doze formas da raiz, a B só muda `alturaColuna` e `larguraGuidao`, os garfos e balancins direitos são espelhos e o arquivo tem 41 números escritos à mão, contra 83 da `moto.esboco.json`.

## Espelho e arranjo

`espelha: { "forma": "<id>", "eixo": "x" | "y" | "z", "pos": mm }` numa forma com `id` próprio gera a cópia refletida da forma-fonte no plano perpendicular ao eixo, em `pos` (padrão 0). A reflexão é a do corpo já resolvido: centro, matriz de rotação, `de`/`para`, `ponta`, `sobre`, `encosta` e `alinha` da fonte já viraram posição, e a cópia é o sólido refletido, com as âncoras `inicio`, `fim`, `+x` a `-z` refletidas (o `+x` da cópia espelhada em x é a face que fica do lado de x maior). Vale para caixa, cilindro e anel, inclusive com `achatado`, `furos` e `rotacao`. A fonte pode ser declarada depois e pode ser ela mesma um espelho; ciclo é recusado. A cópia herda `tipo`, dimensões e `cor`, e só aceita `id`, `cor`, `rotulo`, `oculto`, `opacidade` e `desloca` (soma depois da reflexão); qualquer outro campo é recusado com a lista dos aceitos. O `rotulo` só existe se a cópia o declara, então a legenda não repete. Com o gate ligado o par do espelho herda as declarações: `guidao ↔ garfoE` declarado (`atravessa`, `livre` ou `encosta`, com o mesmo `motivo` e `max`) vale também para `guidao ↔ garfoD`, e um `encosta` implícito da fonte (`encosta` na forma) vale para a cópia. Se o outro lado do par também tem um espelho no mesmo eixo e na mesma posição, o par dos dois espelhos herda (`balancimE ↔ rodaE` gera `balancimD ↔ rodaD`) e o cruzado não. Um par declarado à mão para a cópia prevalece, e o par entre a fonte e a cópia (`garfoE ↔ garfoD`) não herda nada: é cobrado como qualquer outro par.

`{ "arranja": { "forma": "<id>", "modo": "linear", "total": n, "passo": [dx, dy, dz] } }` e `{ "arranja": { "forma": "<id>", "modo": "radial", "total": n, "eixo": "x" | "y" | "z", "centro": [x, y, z], "graus": 360 } }` são entradas próprias da lista `formas` (sem `id`, e só com o campo `arranja`) que geram cópias da forma-fonte. `total` conta a fonte: ela é a peça 0 e as cópias são `<id>1` a `<id><total-1>`, ou os `nomes: ["a", "b"]` dados (uma lista com `total - 1` nomes distintos; a posição na lista não vira identidade, o nome é o id). O modo linear soma `passo` a cada cópia (`k * passo`). No radial, `centro` é um vetor, um ponto nomeado ou `"<id>.<ancora>"`, o eixo é o de rotação, e cada cópia gira `k` passos em torno dele pela regra da mão direita, com o corpo girado junto. O passo é `graus / total` quando `graus` é 360 ou mais (a última cópia não repete a fonte) e `graus / (total - 1)` num arco menor (a fonte e a última nas duas pontas); `graus` padrão é 360. As cópias herdam `cor` e, como o espelho, ficam sem `rotulo`; entram no gate, no `--descrever` (`relação: cópia 3 de 6 de p, radial, ...`) e nas variantes da `--analise` como qualquer forma, e não herdam par nenhum do gate. Pense em parafusos de flange (radial, `total` 6, `eixo` `y`) e em raios de roda.

## Vistas

`isometrica` olha de `[1, 1, 1]`, com x descendo para a direita e z descendo para a esquerda. `frontal` olha de +z (x para a direita, y para cima). `lateral` olha de +x (o +z aparece à esquerda). `superior` olha de +y (x para a direita, +z para baixo da imagem). A ordem de sobreposição vem da profundidade ao longo do olho, e uma forma que atravessa outra ou passa por um furo é fatiada para a oclusão sair certa. Peças parcialmente enterradas em furos de outras peças são tratadas; interpenetrações gerais entre formas quaisquer não têm garantia.

## Legendas

`rotulo` é um texto ou `{ "texto": "...", "lado": "esquerda" | "direita" }`. Cada rótulo vira balão no ponto da peça mais próximo do lado escolhido, evitando furos e peças na frente, e uma linha de chamada até o texto, empilhado fora do desenho. O número automático (ordem entre as formas rotuladas) é prefixado apenas quando o texto não começa com número seguido de ponto, hífen ou parêntese: "1. base" fica como está, "base" vira "1. base". O número é a ordem entre as formas que têm rótulo, sem saltos.

### Modo `legendas: "lista"`

Com `legendas: "lista"` na raiz ou na opção (a opção vence), cada peça com `rotulo` recebe um balão numerado pequeno (raio de 9 px) diretamente sobre um ponto visível dela, sem linha de chamada, e a chave numerada (número e nome, em ordem crescente, em 1 a 3 colunas conforme a quantidade) ocupa uma faixa abaixo do desenho, dentro do quadro. Não existem colunas laterais: a escala é calculada para a caixa do desenho caber na largura toda (menos 48 px de margem) e na altura do painel, e o quadro cresce em altura o que a chave ocupa, de modo que a escala nunca fica abaixo da do modo padrão. A escala não depende de a legenda estar ligada, então as variantes com e sem legendas da `--analise` têm o mesmo desenho; só o quadro fica mais baixo sem a chave.

O ponto do balão sai de uma grade de 2 px pintada na mesma ordem de sobreposição do desenho, de modo que só conta o que aparece de cada peça. Escolhe-se o ponto de maior distância até a borda da região visível (o interior mais amplo), com desempate pelo centro da região. As peças de região menor escolhem primeiro; se o ponto ideal colide com outro balão (distância entre centros abaixo de 21 px), o balão vai para o ponto visível livre mais próximo. Uma peça sem nenhum ponto visível (totalmente atrás de outra) recebe balão tracejado num ponto da borda da silhueta da peça que a cobre, e a chave acrescenta "(oculta nesta vista)" ao nome. Numeração automática e regra do número próprio no texto valem como no modo padrão (o balão mostra o número que o texto já traz, se houver). `ocultar: ["legendas"]` desliga chave e balões, `numeracao` tira os números (balão vazio e chave só com nomes) e `marcadores` tira os balões e deixa a chave. `desenharEsboco` devolve também `baloes` (`opcao`, `id`, `numero`, `x`, `y` em px, `u`, `v` em mm no plano da vista, `oculta`) quando alguma opção usa a lista. O modo padrão continua idêntico byte a byte.

## Linhas de centro

`linhasCentro: true` no topo vale para todas as opções; `linhasCentro` dentro de uma opção sobrepõe o topo (inclusive `false`), e `linhaCentro: true | false | { "extensao": mm }` numa forma sobrepõe os dois. Saem em traço-ponto no eixo de cilindros e anéis e no centro de cada furo de caixa, com fusão de segmentos colineares. A linha passa 8 mm, ou 12% do diâmetro se maior, além do sólido, e leva um contorno claro para aparecer sobre peças escuras.

## Ocultar elementos

`ocultar` é uma lista de nomes, aceita no topo, na opção e na forma; o nível mais interno que a declara vence e `[]` religa tudo. Nomes: `linhasCentro`, `legendas` (balão, linha de chamada e texto; no modo lista, balão e chave), `numeracao` (tira só o "n. " automático), `marcadores` (a bolinha da chamada), `escala` (a barra de 100 mm, some só se todas as opções a ocultarem), `titulo` e `nota`. Nome desconhecido interrompe o desenho com a lista dos válidos. `ocultar: ["linhasCentro"]` vence `linhasCentro: true`. Na forma valem `legendas`, `numeracao`, `marcadores` e `linhasCentro`; `escala`, `titulo` e `nota` só têm efeito no topo e na opção. O módulo não desenha hachura.

`oculto: true` numa forma a esconde sem apagá-la: não é desenhada, não recebe legenda, não oclui as outras e não entra no enquadramento, mas continua servindo de referência para `sobre` e `ponta`.

```json
{
  "ocultar": ["linhasCentro"],
  "opcoes": [
    { "titulo": "Limpa", "ocultar": ["legendas", "escala"], "formas": [ ... ] },
    { "titulo": "Com legendas", "ocultar": [], "formas": [
      { "id": "apoio", "tipo": "caixa", "largura": 40, "altura": 10, "profundidade": 40, "oculto": true },
      { "id": "eixo", "tipo": "cilindro", "diametro": 20, "comprimento": 80, "eixo": "x", "sobre": "apoio", "rotulo": "eixo", "ocultar": ["numeracao"] }
    ] }
  ]
}
```

## Contato

Gate opt-in, feito em `src/contato.js` (`verificarContato`). Na raiz, e por opção (que sobrepõe a raiz):

```json
"contato": {
  "usar": true,
  "tolerancia": 2,
  "penetracao": 2,
  "folga": 30,
  "pares": [
    { "a": "alojamento", "b": "eixo", "tipo": "atravessa", "max": 25, "motivo": "o eixo passa pelo furo do alojamento" },
    { "a": "base", "b": "alojamento", "tipo": "encosta" },
    { "a": "base", "b": "enfeite", "tipo": "livre", "motivo": "o enfeite é só um conceito solto sobre a base" }
  ]
}
```

Sem `usar: true` nada muda, e nenhuma das exigências de declaração abaixo é cobrada. Há três limiares, todos em mm. `tolerancia` é a folga máxima para duas peças contarem como ligadas e para `encosta`; o padrão é 1% da maior dimensão do conjunto (mínimo 1 mm). `penetracao` é a sobreposição máxima aceita entre peças que não são `atravessa`, e também a de `encosta`; o padrão é 0,3% da maior dimensão (mínimo 1 mm), pois uma sobreposição de 1% já se vê na imagem como uma peça dentro da outra. `folga` é a distância máxima até a peça mais próxima; o padrão é 10% da maior dimensão. Cada um pode ser declarado na raiz e na opção, que sobrepõe a raiz. Um JSON que dependia de a tolerância aceitar penetração passa a reprovar até declarar `penetracao` maior ou desenhar as peças encostadas.

### Contrato de declaração

Toda exceção declara por quê, como no Mecanifica. Com `contato.usar` verdadeiro, um par `atravessa` ou `livre` exige `motivo`, um texto de pelo menos 15 caracteres (espaços nas pontas não contam), e um par `atravessa` exige também `max`, a penetração máxima em mm que a passagem justifica. O par `encosta` não exige `motivo`. Par sem isso interrompe o comando como "esboço recusado", com uma mensagem que diz o par, o campo que falta e um exemplo de correção, por exemplo `esboço recusado: esboço: o par garfoE ↔ guidao (tipo atravessa) precisa de "max", a penetração máxima em mm que a passagem justifica; sem ele o par nunca reprova. Exemplo: { "a": "garfoE", "b": "guidao", "tipo": "atravessa", "max": 15, "motivo": "a presilha do guidão abraça a bengala" }`. A regra vale para os pares da raiz e para os das opções ativas; com o contato desligado o JSON não é cobrado.

### O que cada tipo faz

`atravessa` isenta o par de reprovação e conta como ligação, mas a profundidade da sobreposição é sempre medida e reportada em `atravessamentos` (`{ opcao, a, b, penetracao_mm, max_mm }`, do maior para o menor). Um par `atravessa` que só encosta não entra. Se a penetração medida passa de `max` (mm, só vale em `atravessa`), o achado é `atravessa-excedido` e reprova. `encosta` exige folga dentro da tolerância e penetração dentro de `penetracao`. `livre` continua ignorando o par (nem colisão, nem ligação, nem folga, nem atravessamento), mas deixa de calar em silêncio: o par entra em `silenciados` (`{ opcao, a, b, motivo }`) com o motivo declarado, e `npm run esboco` o imprime em "pares silenciados:" logo depois dos atravessamentos declarados. Peças `oculto` não entram. Achados por opção: `colisao`, `longe`, `voando` (fora do maior grupo em que duas peças são vizinhas se a folga é no máximo a tolerância ou o par é `atravessa`), `par-nao-encosta` e `atravessa-excedido`. `npm run esboco` imprime os achados, `aprovado` ou `reprovado` e, quando houver, as listas "atravessamentos declarados:" e "pares silenciados:"; `--estrito` termina com código 1 se reprovado e o manifesto da `--analise` ganha `contato` (`usar`, `tolerancia`, `penetracao`, `folga`, `achados`, `atravessamentos`, `silenciados`, `resultado`, `opcoes`). Sem `contato` o bloco do manifesto é o mesmo de antes. A imagem não muda.

A geometria vem do prisma que o desenho monta. Caixa (com `raio`), cilindro e `achatado` são prismas convexos exatos, com o círculo de 128 lados; a distância é exata (GJK) e a penetração é a menor sobreposição entre eixos de separação (SAT). O anel é cortado em 32 setores convexos com a face interna tangente ao furo (um cilindro menor no furo não colide; um que cruza o aro sim), e a caixa com furos em triângulos. Numa forma cortada em peças a penetração é a maior entre elas, o que subestima um cruzamento que atravessa várias fatias do aro, e o raio externo do anel fica até 0,5% menor.

### Conserto proposto e `--ajustar`

Cada achado de contato traz `sugestao` (`forma`, `fonte`, `delta` em mm, `mm`, `texto`, `motivo`, `aplicavel`), impressa como "sugestão: mova <forma> em [dx dy dz] mm (<motivo>)" abaixo do achado, ao lado dele no `--descrever` e por achado em `sugestoes` no manifesto da `--analise`. O vetor sai da medição do gate. Em `colisao`, a forma anda ao longo do eixo de separação mínima do SAT (na peça de maior penetração) pela penetração mais uma margem, que é metade da `penetracao` aceita, no mínimo 1 mm e no máximo 90% da tolerância (uma folga maior que a tolerância trocaria a colisão por `voando`). Em `voando`, a peça anda em direção ao vizinho mais próximo do maior grupo, pelo segmento entre os pontos mais próximos, por folga menos metade da tolerância; `longe` faz o mesmo até a folga ficar em metade da tolerância. Em `par-nao-encosta`, anda até o contato (pela folga, ou pela penetração para afastar), e em `atravessa-excedido`, pela penetração que passa do `max` mais 0,1 mm de folga de arredondamento. Os deslocamentos saem arredondados a 0,1 mm.

Nos achados de par, quem se move é a forma que não arrasta a outra. Se uma forma se posiciona por relação com a outra (`sobre`, `ponta`, `encosta`, `alinha`, `de`/`para`, `centro` por âncora, espelho ou arranjo, direta ou encadeada), mover a referência levaria a dependente junto e o par ficaria como estava, então a dependente é a que se move. Se nenhuma depende da outra, move-se a de menor volume (caixa envolvente) e o texto diz os dois volumes. Se as duas se movem juntas (uma é cópia da fonte da outra), a sugestão sai como `aplicavel: false` e o texto pede o ajuste da relação. Uma cópia de `espelha` ou `arranja` nunca é editada: a sugestão aponta para a fonte, com a componente do eixo do espelho invertida ou o vetor girado de volta no arranjo radial (`fonte` difere de `forma`), e as outras cópias andam junto.

`npm run esboco -- <arquivo.esboco.json> --ajustar` aplica as sugestões de contato e grava `<nome>.ajustado.esboco.json` ao lado, sem tocar o original. Em cada forma movida altera só o campo de posição: `centro`, quando é uma lista de números e a forma não tem relação de posição; do contrário `desloca`, somado ao existente (um elemento numérico soma, um parâmetro ou expressão vira `"=(expressão)+d"`) ou criado. Parâmetros, expressões, relações, notas e as outras formas ficam como estavam, e o recuo do arquivo é mantido. Em cada rodada aplica no máximo uma sugestão por forma, sem juntar duas que se arrastem, e reexecuta o gate; repete até 5 rodadas e para quando o gate aprova, quando uma rodada não reduz os achados (essa rodada é descartada) ou no limite, e diz qual. Imprime o que moveu, a parada e o gate do resultado, e sai com 1 se o gate ainda reprova. As sugestões de projeção não são aplicadas: o achado `sobreposicao-na-projecao` ganha em `sugestao` (na `--analise`) o menor deslocamento, em mm e ao longo de um eixo do mundo, de uma das duas formas que zera a cobertura na vista do achado, só como informação, porque afastar peças contraria a montagem. O eixo é escolhido pela medida, pois mover na direção do olho não muda a silhueta.

Limites do conserto: o vetor resolve o par medido e não olha para as outras formas, então mover pode criar outro achado (a iteração do `--ajustar` cobre esse caso, e para sem progresso quando não cobre); numa forma cortada em peças o eixo é o da peça de maior penetração; uma forma declarada em `formas` na raiz e herdada pelas opções é editada na raiz e anda em todas elas; o arquivo ajustado é regravado com `JSON.stringify` no mesmo recuo do original, e por isso um JSON escrito com listas em linha volta com listas expandidas.

## Sobreposição na projeção

O gate de contato mede colisão, folga e ligação em três dimensões, e uma peça a 10 mm da outra pode parecer sobre ela numa vista, como o garfo sobre a roda ou o braço do balancim diante do motor. `verificarProjecao` (`src/projecao.js`) mede isso sem que ninguém declare camadas. Cada forma visível vira uma silhueta numa grade de células, com a mesma projeção e as mesmas faces que o desenho usa e com a forma inteira, inclusive a parte encoberta por outras: um anel visto de frente deixa o furo livre. A grade tem 320 células no maior lado da vista, equivalente às células de 2 px do balão. Para cada par o resultado traz a área em que as silhuetas se cobrem, a fração da menor silhueta que é coberta, e qual fica na frente, pela profundidade média na região de cobertura. `medirProjecaoDaOpcao(formas, vista)` devolve esse número bruto, por vista.

O achado `sobreposicao-na-projecao` sai do par cuja fração passa do limiar (`contato.projecao.limiar`, padrão 0,15) e que cumpre as condições seguintes: a penetração 3D não passa da `penetracao` do gate, o par não é `atravessa`, a folga 3D é de pelo menos 1 mm (peças que se tocam se cobrem sem enganar ninguém, e as que se cruzam já são assunto do gate) e a folga não passa da espessura da mais fina das duas peças, ou da `tolerancia` do gate se maior (mais longe que isso, a distância explica a sobreposição, como uma roda atrás da outra na vista frontal). Sem o corte de distância a moto de prova dava 46 achados, quase todos alinhamentos triviais; com ele dá 14. Peças `oculto` não entram, e pares `livre` não são poupados. O achado diz, por exemplo, "na vista isometrica, rodaFrente cobre garfoE em 38% (a folga real entre elas é 12,0 mm); na vista frontal elas não se cobrem", com a vista, dentre as quatro, em que o par cobre menos, desde que cubra até o limiar, ou a indicação de olhar a vista explodida quando as quatro passam do limiar. A porcentagem é da menor silhueta.

```json
"contato": { "usar": true, "projecao": { "limiar": 0.15, "reprova": false } }
```

`limiar` e `reprova` valem na raiz e na opção, que sobrepõe a raiz. O achado é informativo: `npm run esboco` o imprime em "sobreposição na projeção" logo depois do relato do contato e o resultado é `aviso`; com `reprova: true` o resultado é `reprovado` e `--estrito` termina com código 1. A medida só roda com `contato.usar` verdadeiro ou na `--analise`, que a roda sempre. `verificarProjecao(esboco, { forcar, sugerir })` devolve `{ usar, limiar, reprova, resultado, achados, porVista, explosao, opcoes }`; cada achado traz `opcao`, `vista`, `pecas`, `cobre`, `coberta`, `fracao`, `area_mm2`, `folga_mm` e `alternativa` (`{ vista, fracao }` ou nulo). O manifesto da análise ganha `projecao` com `usar`, `limiar`, `reprova`, `resultado`, `porVista` (os achados de cada vista), `explosao` e `variantes` (os arquivos novos).

### Explosão e opacidade

`explosao: { "eixo": "x", "fator": 1.6 }`, na raiz ou na opção (que sobrepõe a raiz), afasta cada forma do centro do conjunto (a caixa que envolve as formas visíveis) ao longo do eixo, multiplicando por `fator` (maior ou igual a 1) a distância do centro dela ao do conjunto. Vale só no desenho: o gate de contato e a medida de projeção usam a geometria real, de modo que declarar `explosao` não cala nenhum achado. `opacidade` numa forma a desenha num grupo translúcido, composto de uma vez, sem escurecer onde as faces da própria forma se tocam. Nas legendas em lista o balão continua seguindo a oclusão opaca, então uma peça atrás de uma translúcida aparece como oculta.

Na `--analise` as variantes normais saem sem a `explosao` do arquivo (o manifesto anota `forcado.explosao: false`), e duas variantes novas mostram a sobreposição, nas quatro vistas, com legendas e sem linhas de centro, só quando há achado de projeção ou `explosao` declarada. As duas variantes forçam `legendas: "lista"` (balões sobre a peça e chave abaixo, sem linhas de chamada cruzando o quadro) qualquer que seja o modo do arquivo, e o manifesto anota `forcado.legendasExplodidaTransparente: "lista"`. A `explodida` usa a `explosao` declarada ou, na falta, a sugerida: em cada eixo (x, y, z) o menor fator, testado de 1,2 a 2,4 em passos de 0,2 e mais 2,5, que zera os achados de projeção; vale o eixo que zera com o menor fator (empate: menor sobreposição total nas quatro vistas). Se nenhum fator até 2,5 zera, vale o eixo e o fator que deixam menos achados (empate: menor fator) e o resíduo fica em `achados_depois`. Depois a análise mede a escala da explodida contra a da normal da mesma vista e, se alguma cair abaixo de 60%, a explosão sugerida perde 0,2 de fator por vez até caber (mínimo 1,2); se nem assim couber, ou se a explosão é declarada (mantida como está), o manifesto traz `aviso`. O manifesto diz em `projecao.explosao` o eixo, o fator escolhido, o `fator_sugerido` antes do ajuste de escala, a `origem` (`declarada` ou `sugerida`), a `escala_relativa` por vista e quantos achados restam (`achados_antes`, `achados_depois`), medidos e não vistos. O quadro se ajusta às peças afastadas, com o painel fixo de sempre, então sobra espaço vertical quando o desenho é largo. A `transparente` desenha todas as formas com `opacidade` 0,55.

Arestas ocultas tracejadas (`ocultas: "tracejadas"`) ficaram de fora. O renderizador descarta as faces de trás e desenha apenas silhuetas e vincos da parte visível, então uma aresta oculta correta pede as faces de trás e um teste de visibilidade de cada aresta contra as peças da frente, o que equivale a escrever um removedor de linhas ocultas. Tracejar o contorno convexo da silhueta da peça coberta mostraria só as arestas de silhueta e esconderia as de dentro (a quina de trás de uma caixa, o furo de um anel), justamente as que a pessoa procura. A variante transparente e a explodida cobrem o mesmo uso.

## Ler o esboço em texto

`npm run esboco -- <arquivo.esboco.json> --descrever` não desenha nem abre navegador: lê o JSON, resolve as posições e imprime, por opção e na ordem de declaração, uma linha por fato em pt-BR. Cada forma sai com id, tipo, centro em mm, extensão nos três eixos, eixo e rotação quando há, a relação de posição usada (`de`/`para`, `encosta`, `alinha`) quando há, e a caixa mínima em x, y e z; abaixo dela vêm as âncoras (`centro`, `inicio` e `fim`, `+x` a `-z`). Depois vêm o grafo de contatos 3D (`contato: a toca b`, com a folga ou a penetração em mm, para os pares com folga até a `tolerancia`), as formas `solta:` (fora do maior grupo conectado), as `sobreposição 3D:` (penetração acima do limite do gate) e as `sobreposição na vista <vista>:` (par, vista, fração da menor silhueta coberta, quem cobre, folga real). Com `contato.usar` a leitura usa a tolerância e a penetração declaradas e lista os achados do gate; sem ele calcula com os padrões do gate e diz "sem gate declarado". `--json` imprime a mesma leitura em JSON.

`--descrever --mudou` grava a leitura em `<arquivo>.descrever.json` ao lado do esboço (o repositório ignora `*.descrever.json`) e imprime só a diferença contra a gravação anterior: formas novas, removidas, movidas (com o delta em mm) e redimensionadas, pares que passaram a tocar ou deixaram de tocar, formas que ficaram soltas ou deixaram de ficar, e achados de contato, de projeção e sobreposições 3D novos ou resolvidos. Na primeira execução avisa que não havia gravação anterior e imprime o estado completo; sem mudança imprime "sem mudanças". Só o `--mudou` grava o arquivo; o `--descrever` sozinho não tem efeito colateral. A moto de doze formas sai em cerca de 0,4 s medidos dentro do processo (cerca de 0,6 s com a partida do node).

## Formato v2 e compatibilidade

O formato do JSON cresce por versões de fato, sem campo de versão, e as regras são três. Todo campo novo é opcional. O arquivo antigo, sem nenhum campo novo, gera o mesmo desenho byte a byte e o mesmo bloco `contato` do manifesto (com o contato desligado, `{"usar":false,"tolerancia":null,"folga":null,"achados":[],"resultado":"desligado","opcoes":[]}`), o que `tests/contato.test.js` confere contra o `casa.svg` guardado. Um recurso que só se consegue à custa de mudar o desenho de um arquivo antigo não altera o campo existente: ganha um nome novo. A exigência de `motivo` e `max` do contrato de declaração vale só para quem liga `contato.usar`, e por isso é a única mudança de comportamento do gate que recusa arquivos que antes passavam; um JSON com o gate ligado e pares `atravessa` ou `livre` sem esses campos precisa ser corrigido, como no exemplo da mensagem. Já entraram, sob essas mesmas regras, `explosao`, `opacidade` e `contato.projecao`: sem eles o SVG e o bloco `contato` do manifesto são os de antes, e o que muda é o manifesto da `--analise`, que ganha a chave `projecao` e, se houver sobreposição, os arquivos das variantes. Também entraram `pontos`, `de`/`para`, `encosta`, `alinha`, `parametros` com expressões, `formas` na raiz, `espelha` e `arranja`; `parametros`, `formas` da raiz e `arranja` são resolvidos antes de tudo (`src/expandir.js`), de modo que as leituras seguintes vêem só números, e um arquivo que não os usa não muda em nada (os hashes do SVG, da leitura em texto e do bloco `contato` de `casa`, `mancal-eixo`, `moto`, `teste-cubo` e `moto-relacoes` estão travados em `tests/parametros.test.js`). A leitura `--descrever` acrescenta `, relação: ...` à linha da forma que usa `de`/`para`, `alinha`, `encosta`, `espelha` ou é cópia de `arranja`, e só nela, e a linha `parâmetros:` de uma opção só existe quando ela tem parâmetros.

## Limites conhecidos

O esboço só conhece caixa, cilindro e anel. No modo padrão (`colunas`) o desenho degrada com muitas formas: numa moto de exemplo com 10 formas as legendas se cruzam, a escala fica pequena (0,15 px/mm na isométrica) e as linhas de chamada atravessam o desenho; o SVG passou de 2,6 MB e o desenho levou 6 a 11 s. Com mais de uns 6 formas por opção use `legendas: "lista"` (na mesma moto a escala isométrica sobe para 0,28 px/mm e a lateral de 0,14 para 0,26). Esboce só o que está em disputa e olhe a imagem antes de mostrá-la. O painel de cada opção tem 620 px de largura e 720 px de altura (no modo lista a altura cresce o que a chave ocupa). Na lista, o balão tem 18 px de diâmetro: peças mais finas que isso ficam cobertas pelo balão, que continua com o centro sobre a peça, e o balão de uma peça oculta aponta a silhueta de quem a cobre, sem dizer o que há entre as duas. Só a grade de 2 px decide o que é visível, então uma peça visível em menos de uma célula pode sair como oculta. No modo padrão a posição da legenda é heurística e pode cair no elemento errado numa vista de topo ou frontal; a matriz de `--analise` existe para pegar isso.
