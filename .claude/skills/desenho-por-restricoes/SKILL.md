---
name: desenho-por-restricoes
description: Desenha a vista de um objeto sem imagem de referência, por partes, pontos e relações em milímetro que um resolvedor transforma em contorno. Use quando só há a descrição. Não use quando há imagem para traçar (é a contorno-da-imagem).
---

# Desenho por restrições

Você escreve a descrição de uma vista em `<vista>.desenho.json`, e o comando dá a geometria e diz o que está errado. A referência completa do formato é `npm run desenho -- --ajuda`; o README do módulo (`modulos/desenho-por-restricoes/README.md`) tem o exemplo inteiro. Se o brief diz que existe uma imagem escondida do objeto, não abra imagem, contorno nem pasta de peça desse objeto: o que vale é a descrição que a pessoa deu, com as medidas dela. Não invente medida que a descrição não traz; uma medida que você precisa e não tem é pergunta para a pessoa.

## Como escrever

Parta das partes e das medidas da descrição, e escreva relações, não coordenadas.

1. Dê um nome a cada parte (`roda`, `braco`, `cacamba`) e a cada ponto que as define (`C`, `H`). A parte é `circulo`, `barra` (eixo e espessura), `poligono` (os pontos na ordem do contorno) ou `arco`. Escreva `"formato": "mecanifica.desenho@3"` (o @2 e o @1 seguem aceitos, sem os recursos da última seção).
2. Ancore o desenho em referências fixas: um chão (`horizontal`, `v`) e, se precisar, um eixo (`vertical`, `h`). Sem âncora o desenho desliza.
3. Escreva uma relação por fato da descrição, cada uma com um nome que diga o fato ("altura do pegador"): `distancia` com `mm`, `raio`, `sobre`, `tangente`, `paralela`, `perpendicular`, `vertical`, `horizontal`, `angulo` com `graus`, `igual`, `coincidente`. É por esse nome que o relatório fala.
4. O chute de cada ponto em `pontos` é só o ponto de partida, em milímetro, h para a direita e v para cima. Ele não precisa estar certo na medida, mas precisa estar do lado certo: ponha o ponto onde ele ficaria numa folha, grosso modo.
5. Declare o `lado` em toda distância de ponto a reta e em toda tangência a reta (`acima`, `abaixo`, `direita`, `esquerda`; acima é o lado de v maior). O resolvedor aceita os dois lados e o chute decide; o `lado` é o que impede a parte de sair espelhada. Entre dois círculos, `por` é `fora` ou `dentro`.
6. Canto que a descrição diz arredondado leva `raioDoCanto` (mm) na `barra` ou no `poligono`, e não um chanfro de pontos a mais. Os pontos e as relações ficam no canto vivo, como numa cotagem; o arco tangente é traçado depois. Cápsula é barra com `raioDoCanto` igual à metade da `espessura`:

```json
"partes": {
  "placa": { "poligono": ["A", "B", "C", "D"], "raioDoCanto": 10 },
  "capsula": { "barra": ["P", "Q"], "espessura": 40, "raioDoCanto": 20 }
}
```

   `"raioDoCanto": { "A": 10, "C": 4 }` arredonda só os cantos citados, e zero é canto vivo. O raio precisa caber na aresta (dois cantos gastam raio cada um); se não couber, o comando diz qual aresta.
7. Se partes se cobrem, liste `frenteParaFundo` (da que fica à frente para a do fundo); sem a lista, as regiões incluem a sobreposição.

## Como ler o relatório e corrigir

Rode `npm run desenho -- <vista>.desenho.json`. Corrija a relação ou o `lado`, e só mexa no chute quando o relatório disser que o chute escolheu o ramo errado.

- **conflito**: as relações citadas não cabem juntas. Apague uma ou corrija o valor de uma, a que a descrição não sustenta. Não ajuste coordenada para fazer caber.
- **solto**: o relatório diz o grau de liberdade e as partes e os pontos que ainda se movem. Cada grau pede uma relação a mais que os prenda (uma distância, um ângulo, `vertical`, `horizontal`, `sobre` uma referência), tirada da descrição.
- **lado trocado**: a relação, o lado pedido e o lado em que ficou. Ou o chute do ponto está do lado errado (o relatório dá o chute refletido que resolve), ou o `lado` que você escreveu é que está errado; decida pela descrição.
- **resolvido**: lê as medidas derivadas, que você não escreveu (a altura de uma parte, a posição de uma ponta, a caixa da vista), e compara com a descrição. Uma medida derivada que contraria a descrição quer dizer que falta ou sobra uma relação, mesmo com zero grau de liberdade. Aviso de redundância pede que se apague a relação repetida; aviso de sobreposição pede `frenteParaFundo`.

Resolvido, o comando grava `<vista>.contornos.json` e `<vista>.png` (a vista em traço, com os nomes fora do desenho). O contorno é lido pelo esboço (`plano.referencia`) e pela prancha (`npm run contorno:prancha -- <vista>.contornos.json`) como o de uma imagem. A forma é julgada pelo crítico e pela pessoa: o relatório mostra que as relações valem, e não que o objeto se parece com o que se descreveu.

## Parâmetros, peças e famílias

Uma medida que se repete vai para `parametros` (`"parametros": { "largura": 120, "meia": "=largura/2" }`) e é citada pelo nome em qualquer campo numérico, inclusive no chute de um ponto, para a forma acompanhar o valor. A expressão aceita `+ - * /`, parênteses, `sin`, `cos`, `tan`, `atan`, `atan2`, `sqrt` e `min` e `max` (o menor e o maior de dois ou mais valores: `"=min(a, b)"`, e não a raiz do quadrado da diferença). As relações a mais do @3: `simetrico` (`["P", "Q", reta]` ou duas partes), `distancia` só em h ou só em v (`"eixo": "h"` com `"lado"` `esquerda` ou `direita`, ou `"v"` com `acima` ou `abaixo`: o primeiro ponto fica daquele lado do segundo), `construcao` (um círculo ou uma reta que amarra relações sem virar parte) e o centro com nome do canto arredondado, `"raioDoCanto": { "KF": { "raio": 20, "centro": "CKF" } }`, que dá o ponto `CKF` para dizer concêntrico (`coincidente` com o centro de um furo) ou medir o entre-eixos. A ajuda (`npm run desenho -- --ajuda`) traz a forma de cada uma.

Uma forma que o objeto repete vira peça, com parâmetros de entrada e pontos de ligação, e o desenho a chama com valores. O uso põe o prefixo no nome de tudo o que é da peça, e o desenho cita só as ligações:

```json
"pecas": { "pilha": {
  "parametros": { "diametro": null, "comprimento": 100 },
  "pontos": { "P": [0, 0], "Q": [0, 100] },
  "partes": { "corpo": { "barra": ["P", "Q"], "espessura": "=diametro" } },
  "relacoes": [ { "nome": "comprimento", "distancia": ["P", "Q"], "mm": "comprimento" } ],
  "ligacoes": { "inicio": "P", "fim": "Q", "corpo": "corpo" } } },
"usos": { "mastro": { "peca": "pilha", "parametros": { "diametro": 60 }, "origem": [500, 0] } },
"relacoes": [ { "nome": "mastro a prumo", "vertical": ["mastro.inicio", "mastro.fim"] } ]
```

`origem` desloca só os chutes, `nomeiaPartes` dá à parte um nome final sem prefixo (o nome de uma região da referência) e, em `frenteParaFundo`, o nome do uso vale pelas partes dele. Uma peça não usa outra peça. O catálogo de peças fica num arquivo `mecanifica.pecas-de-desenho@1` carregado com `--pecas=<arquivo>`, ou declarado pela família em `"catalogo"`.

A peça que serve em mais de uma direção recebe a orientação do uso, e o uso escreve para onde ela aponta. O `eixo`, o `lado` e o `por` de uma relação aceitam o nome de um parâmetro que vale uma palavra (`"sentido": "abaixo"`), e o `lado` de uma distância com `eixo` aceita também um sinal (positivo é direita ou acima, negativo esquerda ou abaixo, e o mesmo número vira os chutes e o lado). A peça escreve `{ "nome": "comprimento", "distancia": ["Q", "P"], "mm": "comprimento", "eixo": "eixo", "lado": "sentido" }`, e o uso diz `"eixo": "h", "sentido": "direita", "angulo": 0`. O `angulo` e a `origem` só chutam e têm de apontar para o mesmo lado: a peça pedida abaixo e chutada para cima resolve, mas o relatório traz o aviso de peça virada (uso, peça, lado pedido e lado do chute) e a prova da família reprova. Sem o `lado` no uso, o punho pendurado para cima passa na prova sem ninguém ver.

Uma família é o desenho de uma classe de objeto com a faixa de cada parâmetro. O parâmetro é escrito uma vez, na família, e o desenho o lê por nome:

```json
{ "formato": "mecanifica.familia-de-desenho@1", "id": "mastro", "versao": "1.0.0", "catalogo": "pecas.json",
  "parametros": { "diametro": { "unidade": "mm", "padrao": 60, "minimo": 40, "medio": 60, "maximo": 100 } },
  "perfis": { "grosso": { "parametros": { "diametro": 90 } } },
  "desenho": { "formato": "mecanifica.desenho@3", "...": "um desenho @3 que usa diametro" } }
```

`"catalogo"` é o caminho do catálogo de peças que o desenho usa, relativo ao arquivo da família (ou uma lista deles), e `familia` e `--provar` o carregam sozinhos. `"restricoes"` são relações de ordem entre parâmetros (`"capo < painel - 5"`, duas somas comparadas por `<`, `<=`, `>` ou `>=`, com `min` e `max` se couber): a faixa de cada parâmetro vale sozinha, e a relação tira da família a combinação incoerente, que é recusada antes de desenhar. Escreva a relação para o que a prova mostrou que não cabe e para o que o objeto não tem (a coluna de cima mais larga que o ombro), e não estreite a faixa para esconder a combinação.

`npm run desenho -- familia <arquivo> --valores=diametro=80 --grava=<pasta>` gera o desenho para os valores, e `--perfil=minimo`, `--perfil=medio` e `--perfil=maximo` (que toda família tem) põem todos os parâmetros naquele ponto da faixa sem escrever cada valor. Antes de dar a família por pronta, rode `npm run desenho -- familia <arquivo> --provar`: ela desenha com todos os parâmetros no mínimo, no médio e no máximo, com cada um nos três, com cada par de parâmetros nos extremos cruzados (o mínimo de um com o máximo do outro) e com cada perfil, e cada conjunto precisa resolver sem conflito, parte solta, lado trocado, polígono cruzado, parte escondida nem peça virada. O conjunto que fere uma relação de ordem sai como recusa, com a relação, e não reprova. O que falha só no extremo é amarração que valia perto do padrão: o chute fixo que deixa de estar do lado certo quando o parâmetro muda (escreva o chute como expressão do parâmetro), a relação que o extremo contradiz e o raio de canto que não cabe na aresta. Corrija a amarração, escreva a relação de ordem ou estreite a faixa, e prove de novo. Grave a pasta de cada perfil que a família entrega ao lado dela (`--perfil=referencia --grava=<pasta>/referencia`, e `minimo`, `medio`, `maximo` se quiser): `npm run desenho -- conferir` (o gate `npm run familias-de-desenho:check`) prova toda família de `procedural/familias-de-desenho` e confere que essas pastas ainda são o que a família gera, nos bytes do desenho e dos contornos. A prova diz que a família resolve; a forma é julgada pelo crítico e pela pessoa.

A faixa de cada parâmetro vem das referências, e uma referência só não basta: a família da carcaça, feita de uma foto, deixou doze dos quinze parâmetros de outra empilhadeira da mesma classe fora das faixas. Para cada referência com contorno, rode `npm run desenho -- familia <arquivo> --ajustar=<referencia.contornos.json>`, que procura os valores da família mais próximos dela e diz quais ficaram no limite da faixa, e, se algum ficar, `--abrir=0.4`, que diz quanto a faixa precisa crescer. A faixa de cada parâmetro cobre o valor de todas as referências, e cada referência entra como perfil com o nome dela. O que nem a faixa aberta alcança (a razão que não sobe, a região que fica baixa no `razao --partes`) é forma que a família não tem, e vira peça ou opção declarada, não faixa maior.
