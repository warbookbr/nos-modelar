# @mecanifica/esboco

Desenha esboços de forma a partir de um JSON declarativo: caixas, cilindros e anéis em vista isométrica, frontal, lateral ou superior, várias opções lado a lado na mesma escala, com legendas numeradas e linhas de centro. Serve ao alinhamento, para mostrar à pessoa as opções de forma antes da modelagem 3D; não é a peça final nem prancha cotada. O núcleo (`src/index.js`) não depende de navegador e devolve `{ svg, largura, altura, escala }`; a linha de comando em `tools/mecanifica/esboco.mjs` grava o `.svg` e o `.png`.

## Como escrever

O arquivo se chama `<assunto>.esboco.json`. A raiz tem `opcoes` (obrigatório), `plano` (texto livre opcional com as decisões do "Pare e planeje", ignorado no desenho e copiado para o manifesto da análise), `vista` (`isometrica`, o padrão, `frontal`, `lateral` ou `superior`), `linhasCentro`, `ocultar` e `legendas` (`colunas`, o padrão, ou `lista`; ver Legendas). Cada opção tem `titulo`, `nota` (uma frase curta), `formas` e, opcionalmente, `legendas`, que sobrepõe o da raiz. Todas as opções saem na mesma escala, com uma barra de 100 mm. Medidas em milímetro, y para cima, z para a frente da vista frontal.

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
npm run esboco -- <arquivo.esboco.json> --analise [--centros] [--zoom=<vista>:x0,y0,x1,y1]
npx vitest run modulos/esboco
```

O primeiro comando grava `<arquivo>.svg` e `<arquivo>.png` ao lado do JSON e imprime o tamanho e a escala em px/mm. O segundo gera a matriz de conferência descrita em [`PARE-E-ANALISE.md`](../../docs/mecanifica/usar/PARE-E-ANALISE.md): as quatro vistas, cada uma com e sem legendas, 8 imagens em `<arquivo>-analise/`, sempre sem linhas de centro: a geração força `linhasCentro: false` em todas as opções e formas sem editar o JSON. Com `--centros` gera também as variações com linhas de centro, 16 imagens. O `manifesto.json` traz o hash do JSON, a data, a escala por vista, `centros`, `forcado` (`{ "linhasCentro": false }` no padrão, vazio com `--centros`), o `plano` do esboço quando existe e a lista de arquivos. Com `--zoom`, recorta o retângulo em pixels da vista pedida, amplia 3 vezes e grava o par com legendas e sem legendas (com centros ligados no primeiro e desligados no segundo quando há `--centros`). Um erro no JSON sai como "esboço recusado" com a causa.

## Formas

Toda forma tem `id` único, `tipo`, `cor` e, opcionalmente, `rotulo`. A `cor` é um nome (`cinza`, `azul`, `laranja`, `vermelho`, `verde`, `roxo`, `amarelo`, `preto`, `branco`) ou um hexadecimal.

- `caixa`: `largura` (x), `altura` (y), `profundidade` (z), `raio` de canto opcional. Furos passantes na direção y: `furos: [{ "diametro": 12, "centro": [x, z] }]`, ou um só em `furo`, com `centro` relativo ao centro da caixa.
- `cilindro`: `diametro`, `comprimento`, `eixo` (`x`, `y` ou `z`; padrão `y`) e `achatado: { "lado": "+x", "profundidade": mm }` para uma face plana lateral, num lado perpendicular ao eixo.
- `anel`: `diametroExterno`, `diametroInterno`, `espessura` (ao longo do eixo) e `eixo`.

Não existem tubo, perfil, esfera nem uma forma de furo separada: o furo é atributo da caixa ou o vazio do anel.

## Posicionamento

Sem nenhum dos três modos, a forma fica em `[0, 0, 0]`. Use um só entre `centro`, `sobre` e `ponta`; depois deles `desloca` soma um ajuste.

- `centro: [x, y, z]`: posição absoluta do centro.
- `sobre: "<id>"`: apoia a base no topo daquela forma, centrada nela em x e z.
- `ponta: { "id": "<id>", "lado": "+x" }` (ou `["<id>", "+x"]`): encosta a forma na face daquele lado (`+x`, `-x`, `+y`, `-y`, `+z`, `-z`), respeitando o achatado.
- `desloca: [dx, dy, dz]`: ajuste em mm depois do posicionamento.
- `rotacao: [rx, ry, rz]` em graus (também `{ "eixo": "x", "angulo": 25 }`): ângulo positivo gira pela regra da mão direita em torno do eixo de mundo indicado, de modo que rx=+90 leva +y para +z, ry=+90 leva +z para +x e rz=+90 leva +x para +y. A rotação vale em torno do centro da forma e é aplicada antes de `sobre` e `ponta` medirem a caixa, então esses modos usam a forma já girada.

Referência a id inexistente ou circular é recusada com a lista de ids da opção.

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
  "folga": 30,
  "pares": [
    { "a": "alojamento", "b": "eixo", "tipo": "atravessa" },
    { "a": "base", "b": "alojamento", "tipo": "encosta" },
    { "a": "base", "b": "enfeite", "tipo": "livre" }
  ]
}
```

Sem `usar: true` nada muda. Os padrões são `tolerancia` de 1% da maior dimensão do conjunto (mínimo 1 mm) e `folga` de 10% dela, ambas em mm. `atravessa` permite sobreposição e conta como ligação; `encosta` exige folga e penetração dentro da tolerância; `livre` ignora o par (nem colisão, nem ligação, nem folga). Peças `oculto` não entram. Achados por opção: `colisao`, `longe`, `voando` (fora do maior grupo em que duas peças são vizinhas se a folga é no máximo a tolerância ou o par é `atravessa`) e `par-nao-encosta`. `npm run esboco` imprime os achados e `aprovado` ou `reprovado`, `--estrito` termina com código 1 se reprovado e o manifesto da `--analise` ganha `contato`. A imagem não muda.

A geometria vem do prisma que o desenho monta. Caixa (com `raio`), cilindro e `achatado` são prismas convexos exatos, com o círculo de 128 lados; a distância é exata (GJK) e a penetração é a menor sobreposição entre eixos de separação (SAT). O anel é cortado em 32 setores convexos com a face interna tangente ao furo (um cilindro menor no furo não colide; um que cruza o aro sim), e a caixa com furos em triângulos. Numa forma cortada em peças a penetração é a maior entre elas, o que subestima um cruzamento que atravessa várias fatias do aro, e o raio externo do anel fica até 0,5% menor.

## Limites conhecidos

O esboço só conhece caixa, cilindro e anel. No modo padrão (`colunas`) o desenho degrada com muitas formas: numa moto de exemplo com 10 formas as legendas se cruzam, a escala fica pequena (0,15 px/mm na isométrica) e as linhas de chamada atravessam o desenho; o SVG passou de 2,6 MB e o desenho levou 6 a 11 s. Com mais de uns 6 formas por opção use `legendas: "lista"` (na mesma moto a escala isométrica sobe para 0,28 px/mm e a lateral de 0,14 para 0,26). Esboce só o que está em disputa e olhe a imagem antes de mostrá-la. O painel de cada opção tem 620 px de largura e 720 px de altura (no modo lista a altura cresce o que a chave ocupa). Na lista, o balão tem 18 px de diâmetro: peças mais finas que isso ficam cobertas pelo balão, que continua com o centro sobre a peça, e o balão de uma peça oculta aponta a silhueta de quem a cobre, sem dizer o que há entre as duas. Só a grade de 2 px decide o que é visível, então uma peça visível em menos de uma célula pode sair como oculta. No modo padrão a posição da legenda é heurística e pode cair no elemento errado numa vista de topo ou frontal; a matriz de `--analise` existe para pegar isso.
