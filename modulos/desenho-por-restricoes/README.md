# @mecanifica/desenho-por-restricoes

Desenha a vista de um objeto que não tem imagem de referência. A IA declara pontos nomeados, partes feitas desses pontos e relações entre eles (a tantos milímetros, paralela, tangente, vertical, a tantos graus), e um resolvedor de restrições dá a geometria. A saída tem o formato dos contornos que o contorno da imagem grava, de modo que o esboço, a prancha dos contornos e o crítico a leem como leem a de uma imagem. O resolvedor é o [planegcs](https://github.com/Salusoft89/planegcs) 1.3.0, o resolvedor do Sketcher do FreeCAD compilado para WebAssembly (LGPL-2.0 ou posterior, usado sem modificação como dependência de desenvolvimento fixada no `package.json` da raiz). A escolha e a medida contra outros resolvedores estão no [levantamento](../../docs/mecanifica/LEVANTAMENTO-DESENHO-SEM-REFERENCIA.md); o fluxo para a IA que desenha está na skill `.claude/skills/desenho-por-restricoes`.

O módulo não importa Three.js, o núcleo de autoria nem outro módulo do repositório. Importa só os próprios arquivos, `node:crypto`, `@salusoft89/planegcs` e `manifold-3d` (a união e a diferença de polígonos, que já é dependência da raiz); `tests/modulo.test.js` confere. O núcleo puro recebe o JSON da descrição e devolve o relatório, os contornos e a vista em traço em SVG; quem lê e grava arquivo é a porta de linha de comando, `tools/mecanifica/desenho.mjs`.

## O formato `mecanifica.desenho@2`

A descrição fica em `<pasta do objeto>/<vista>.desenho.json`, e é o que a IA escreve e o que se versiona. A identidade de tudo é o nome: o relatório cita a relação pelo nome que a IA escreveu, e a ordem das relações e dos pontos no arquivo não muda o resultado. Este é o carrinho de mão que os testes usam, com 17 relações que fecham o desenho:

```json
{
  "formato": "mecanifica.desenho@2",
  "objeto": "carrinho de mão",
  "vista": "lateral",
  "olhando": "do lado esquerdo, roda à esquerda",
  "referencias": { "chao": { "reta": "horizontal", "v": 0 }, "eixoDaRoda": { "reta": "vertical", "h": 0 } },
  "pontos": {
    "C": [10, 180], "H": [1400, 700], "F": [1000, 500], "G": [1000, 10],
    "A": [260, 300], "B": [900, 500], "D": [900, 850], "E": [0, 850]
  },
  "partes": {
    "roda": { "circulo": { "centro": "C" } },
    "braco": { "barra": ["C", "H"], "espessura": 40 },
    "pe": { "barra": ["F", "G"], "espessura": 30 },
    "cacamba": { "poligono": ["A", "B", "D", "E"] }
  },
  "relacoes": [
    { "nome": "raio da roda", "raio": "roda", "mm": 200 },
    { "nome": "roda no chão", "tangente": ["roda", "chao"], "lado": "acima" },
    { "nome": "roda no eixo", "sobre": ["C", "eixoDaRoda"] },
    { "nome": "comprimento do braço", "distancia": ["C", "H"], "mm": 1500 },
    { "nome": "altura do pegador", "distancia": ["H", "chao"], "mm": 650, "lado": "acima" },
    { "nome": "pé preso no braço", "sobre": ["F", "braco"] },
    { "nome": "posição do pé", "distancia": ["C", "F"], "mm": 1050 },
    { "nome": "pé no chão", "sobre": ["G", "chao"] },
    { "nome": "pé a prumo", "vertical": ["F", "G"] },
    { "nome": "folga do fundo", "distancia": ["A", "braco"], "mm": 80, "lado": "acima" },
    { "nome": "frente do fundo", "distancia": ["A", "eixoDaRoda"], "mm": 250, "lado": "direita" },
    { "nome": "fundo junto do braço", "paralela": [["A", "B"], "braco"] },
    { "nome": "comprimento do fundo", "distancia": ["A", "B"], "mm": 650 },
    { "nome": "traseira a prumo", "vertical": ["B", "D"] },
    { "nome": "altura da borda", "distancia": ["D", "chao"], "mm": 900, "lado": "acima" },
    { "nome": "borda de nível", "horizontal": ["D", "E"] },
    { "nome": "inclinação da frente", "angulo": [["A", "B"], ["A", "E"]], "graus": 120 }
  ]
}
```

A versão 2 acrescenta o `raioDoCanto` da barra e do polígono (abaixo). O `mecanifica.desenho@1` segue aceito, sem esse campo, e uma descrição gravada em 1 resolve e grava o mesmo que antes; o `raioDoCanto` num arquivo @1 é recusado pedindo para trocar o `formato`. Os campos da raiz são `formato`, `objeto`, `vista` (`lateral`, `topo` ou `frontal`), `olhando` (texto livre, opcional), `referencias`, `pontos`, `partes`, `frenteParaFundo` (opcional) e `relacoes`. Um campo desconhecido é recusado, para a grafia errada de um nome não passar calada. Coordenada em milímetro, com h para a direita e v para cima, como no arquivo de contornos.

**Pontos.** `"A": [h, v]` é o chute inicial do ponto, e não a posição final: o resolvedor o move até as relações valerem. O chute escolhe o ramo da solução quando a relação admite mais de uma, então ele deve estar do lado certo. Um ponto que nenhuma parte nem relação usa é recusado, porque ficaria solto.

**Referências.** Retas fixas: `{ "reta": "horizontal", "v": 0 }` (um chão) e `{ "reta": "vertical", "h": 0 }` (um eixo). Elas ancoram o desenho: sem nenhuma, o desenho inteiro pode deslizar.

**Partes.** `circulo` (`{ "centro": "P" }`, com `"chute"` opcional para o raio inicial; o raio vem de uma relação `raio`), `barra` (`["P", "Q"]` com `espessura`: o retângulo em volta do eixo, e a espessura não entra no resolvedor), `poligono` (a lista de pontos na ordem do contorno) e `arco` (`{ "centro", "inicio", "fim" }`, do início ao fim no sentido anti-horário, com `"fecha": "corda"` (padrão) ou `"centro"`). **Canto arredondado.** `"raioDoCanto": 8` na `barra` ou no `poligono` arredonda os cantos com um arco de 8 mm tangente às duas arestas; no polígono, `"raioDoCanto": { "A": 8, "C": 3 }` arredonda só os cantos citados. O raio não passa pelo resolvedor: as relações valem para os pontos de canto vivo, como numa cotagem (a largura de uma placa é a distância entre os pontos, antes de arredondar), e o arco é traçado depois de resolver, de modo que acompanha a medida quando uma relação muda. A cápsula é uma barra com `raioDoCanto` igual à metade da `espessura` (as pontas ficam semicirculares e a caixa continua o comprimento do eixo por espessura); um raio maior que isso é recusado na validação. O raio precisa caber na geometria resolvida: se as tangentes de dois cantos somam mais que a aresta, o comando sai com 3 dizendo a aresta, quanto ela mede e quanto os cantos pedem. O canto reentrante de um polígono também arredonda. Fazer o mesmo com `arco` e `tangente` pede um centro, dois pontos e três relações por canto, e deixa cada canto como uma parte separada (a `tangente` não recebe arco), o que não é um contorno só. `"foraDoModelo": true` tira a parte da silhueta e a mantém nos contornos com essa marca, como o cabo de uma peça. `frenteParaFundo` é a lista das partes da que fica à frente para a que fica ao fundo: com ela, uma parte escondida fica só com o pedaço visível, que é como o contorno da imagem define a região; sem ela, as partes não se escondem e o relatório avisa as que se sobrepõem.

**Relações.** Cada uma tem um `nome` único e um tipo. Uma reta é o nome de uma referência, o nome de uma barra (o eixo dela) ou dois pontos `["P", "Q"]`, na ordem que dá o sentido.

| tipo | forma | o que diz |
|---|---|---|
| `sobre` | `["P", reta ou círculo ou arco]` | o ponto fica sobre a reta ou a curva |
| `coincidente` | `["P", "Q"]` | os dois pontos são um só |
| `distancia` | `["P", "Q"], mm` | distância entre pontos |
| `distancia` | `["P", reta], mm, lado` | distância de um ponto a uma reta |
| `raio` | `"círculo ou arco", mm` | raio |
| `tangente` | `["círculo", reta], lado` | o círculo toca a reta, com o centro do lado dito |
| `tangente` | `["círculo", "círculo"], por` | tocam-se por `"fora"` ou por `"dentro"` |
| `paralela`, `perpendicular` | `[reta, reta]` | direção |
| `vertical`, `horizontal` | `["P", "Q"]` | os dois pontos têm o mesmo h, ou o mesmo v |
| `angulo` | `[reta, reta], graus` | da primeira reta para a segunda, no sentido anti-horário |
| `igual` | `[reta, reta]` ou `[círculo, círculo]` | mesmo comprimento ou mesmo raio |

**O lado.** A distância de um ponto a uma reta e a tangência de um círculo a uma reta valem dos dois lados, e o planegcs não tem sinal para elas: com o chute de um ponto do lado errado ele devolveu sucesso, zero grau de liberdade e a caçamba do carrinho espelhada para baixo do braço, sem nenhum aviso. Por isso o `lado` (`acima`, o lado de v maior; `abaixo`; `direita`, o de h maior; `esquerda`) é obrigatório nessas relações e é conferido depois de resolver. A distância entre dois pontos, o ângulo e as relações de direção não pedem lado; onde uma relação de direção deixa duas posições possíveis (um ponto à esquerda ou à direita de outro na mesma horizontal), o chute decide, e a forma de fixar é uma distância a uma reta de referência com `lado`.

## O que o relatório diz

`desenhar` (e `npm run desenho`) devolve o estado, que é um de quatro, e o que corrigir, sempre pela relação que a IA escreveu:

- **resolvido**: zero grau de liberdade, relações todas satisfeitas e todos os lados certos. É o único estado em que algo é gravado, e o relatório traz as medidas derivadas que a IA não escreveu e precisa conferir: a caixa da vista, os pontos resolvidos, e por parte a caixa, o comprimento e o ângulo da barra, o raio e os lados do polígono (no carrinho, a altura do pé, 515 mm, e a frente da caçamba, 336 mm à frente do eixo da roda, que vêm do ângulo de 120 graus e da borda a 900 mm).
- **conflito**: as relações que não cabem juntas, pelo nome (a altura do pegador escrita duas vezes). O planegcs chama de conflito também a redundância que ele não consegue resolver, conforme a ordem das restrições (o carrinho com uma relação repetida falha em parte das ordens); por isso, para cada relação do grupo, o módulo tira a relação, resolve o resto e confere se a relação tirada ainda vale: se vale, ela só repetia as outras, e o desenho resolve com um aviso; se não vale, ela contradiz de verdade.
- **solto**: o grau de liberdade, e as partes e os pontos que ainda se movem, achados prendendo uma coordenada de cada vez no valor resolvido (se estava determinada, a restrição nova é redundante e o grau não cai; se estava solta, o grau cai em um). No carrinho sem a altura da borda: a caçamba, com o ponto D na vertical e o E nos dois eixos.
- **lado trocado**: a relação, o lado pedido e o lado em que o ponto ficou. O módulo tenta uma vez de novo com o chute do ponto refletido pela reta, só para dizer qual chute resolve; o desenho que a IA escreveu não é mudado por baixo dela, e nada é gravado.

Redundância é aviso, e não erro: a relação que repete o que as outras já fixam é nomeada, e o desenho é gravado. Saem também como aviso o polígono que se cruza, a parte toda escondida e as partes que se sobrepõem sem `frenteParaFundo`. Além do estado do resolvedor, o módulo confere cada relação na geometria resolvida (distância, raio, ângulo, paralela e as outras), de modo que um sucesso declarado com uma relação não satisfeita vira conflito.

## A saída

`<vista>.contornos.json` no formato `mecanifica.contornos@1`, com `origem` (`{ desenho, sha256, resolvedor: "planegcs@1.3.0" }`) no lugar de `imagem`, sem `mmPorPx`, `residuo`, `semente` nem campos de pixel, que nenhum consumidor lê. Fica o que o esboço (`lerContornos`) e a prancha leem: `silhueta` com `contornoMm`, `linhaDeForaMm`, `pedacos` e `linhasDeForaMm`, e por região `contornoMm`, `pedacos`, `areaMm2` e `foraDoModelo`. O círculo e o arco saem com 16 segmentos por quarto de volta. Só o anel externo de cada pedaço é gravado, como no contorno da imagem. Os números saem arredondados a 0,001 mm, o zero negativo vira zero, as partes saem em ordem de nome e cada anel começa no menor ponto, anti-horário; a mesma descrição dá o mesmo arquivo byte a byte.

`<vista>.png` é a vista em traço (`vistaEmTraco`): o contorno de cada parte, a silhueta mais grossa, as referências tracejadas e os nomes das partes numa coluna de cada lado, fora do desenho, ligados por uma linha de chamada. O título, o subtítulo (com o `olhando`) e a legenda das referências quebram em linhas na largura da folha, e a folha só alarga quando uma palavra sozinha é mais larga que ela, de modo que nenhum texto passa do `viewBox`; a largura vem de uma estimativa por classe de caractere que erra para mais. É o alvo que o roteiro da prancha procura. O SVG é texto puro e igual a cada execução; o PNG sai da rasterização dele pelo Chromium, e os bytes dependem das fontes da máquina que rasteriza (nas duas execuções da mesma máquina são iguais, o que o teste da porta confere).

A prancha dos contornos (`npm run contorno:prancha -- <vista>.contornos.json`) lê o arquivo sem mudança de contrato e, quando ele traz `origem`, escreve a procedência do desenho (`medidas-declaradas`, o arquivo, o resolvedor e o início do sha256) em vez de "referência raster, calibrada por duas âncoras", e o subtítulo diz "partes do desenho por restrições" em vez de "pelo watershed com sementes".

## Linha de comando

```
npm run desenho -- <vista>.desenho.json [--so-relatorio] [--json]
npm run desenho -- razao <a.contornos.json> <b.contornos.json> [--parte-a=<nome>] [--parte-b=<nome>] [--ponto-a=h,v --ponto-b=h,v] [--json]
npm run desenho -- --ajuda
```

O primeiro resolve, imprime o relatório e, resolvido, grava `<vista>.contornos.json` e `<vista>.png` ao lado da descrição. Nos outros estados nada é gravado e os arquivos de uma execução anterior ficam como estavam (o `origem.sha256` do contorno diz de qual descrição ele veio). Código de saída: 0 resolvido; 2 uso errado ou arquivo ilegível; 3 descrição inválida, com cada correção listada; 4 não resolvido; 1 erro inesperado.

`razao` mede um desenho contra uma referência que o desenhista não viu: a razão interseção/união entre dois contornos (a silhueta, ou uma região pelo nome em cada um com `--parte-a` e `--parte-b`), calculada sobre os polígonos e sem rasterizar. Sai de três jeitos: sem alinhar (as origens como estão), alinhada pelo ponto declarado em cada contorno (`--ponto-a`, `--ponto-b`, por exemplo o canto de baixo da base) e alinhada pela melhor translação, que separa o erro de posição do erro de forma. A busca da melhor translação é determinística e parte dos centros, das caixas, do ponto declarado e da origem.

## O que o módulo não faz

Curva livre (spline com restrição), furo na região (só o anel externo vai para o arquivo), restrição de desigualdade e relação entre mais de dois objetos de uma vez ficam de fora; o planegcs tem a spline, e entra quando um objeto a pedir. As famílias de objeto 3D e os perfis do esboço também não entram: a relação entre aro e pneu, por exemplo, a IA escreve como relação declarada. A razão interseção/união mede a forma, e quem aprova a forma é a pessoa.

## Testes

`npx vitest run modulos/desenho-por-restricoes tools/mecanifica/desenho.test.mjs`. O carrinho (`tests/carrinho.js`) fixa os valores em que o planegcs, a libslvs do SolveSpace, o Sketcher do FreeCAD e a linha de comando do CADCraft concordaram até o milésimo de milímetro, com os quatro cenários (completo, conflito, faltando, redundante) e o chute espelhado; `tests/formas.js` traz a chapa com furo, a meia-lua e as duas rodas, que cobrem o arco, a tangência entre círculos e as outras relações, e a placa de cantos arredondados com a cápsula, que `tests/cantos.test.js` mede sobre os anéis gravados. `tests/traco.test.js` confere que todo texto da vista em traço cabe na folha, e o teste da porta confere a estimativa de largura contra as caixas que o Chromium mede. Todos os objetos dos testes são sintéticos.
