# Conferir a peça contra uma foto de referência

`npm run conferir:referencia` devolve, em milímetro, a distância entre a
silhueta lateral de partes de uma peça e a borda correspondente de uma foto.
Serve para o caso em que existe foto e não existe prancha desenhada: sem ele, a
comparação é olhar, ajustar e chutar de novo, e "está baixo" não é medida que
alguém possa conferir depois.

Ele não substitui o crítico visual nem a prancha. A prancha é o alvo desenhado
com autoria declarada; esta ferramenta mede contra a foto crua, que é fonte mais
fraca. Quem aprova forma continua sendo o usuário.

## Uso

```
npm run conferir:referencia -- <peça> --imagem=<png> --ancoras=<json>
  [--partes=a,b] [--qual=topo|base] [--recorte=x0,y0,x1,y1]
  [--tolerancia=25] [--estacoes=40] [--limiar=248] [--completo]
```

O arquivo de âncoras carrega os padrões, e bandeira na linha de comando vence o
que está nele. Exemplo publicado:
`docs/mecanifica/referencias/bicicleta-29/ancoras-lateral.json`.

```json
{
  "ancoras": [
    { "nome": "centro do cubo traseiro", "px": [100, 177.5], "mm": [-499.5, 367] },
    { "nome": "centro do movimento central", "px": [215, 189], "mm": [0, 317] }
  ],
  "recorte": [194, 30, 304, 200],
  "qual": "topo", "partes": ["tuboSuperior"], "tolerancia": 25
}
```

`px` é pixel na foto, x para a direita e y para baixo. `mm` é o plano lateral da
Mecanifica, z para a frente e y para cima, na origem da peça.

## Por que a silhueta do modelo não vem de um render

As faces são projetadas no plano lateral e o envelope sai por interseção de
aresta com a vertical de cada estação. Medir pixel de render traria de volta o
erro de câmera, de enquadramento e de antialias, que são justamente as coisas
que a medida existe para eliminar. Como não há render, a conferência roda em
milissegundos e pode ser repetida a cada ajuste.

## Por que a calibração é por âncora e não pelas rodas

`calibrarPorRodas` acha as manchas de contato com o solo e deriva a escala do
entre-eixos. Ela já produziu escala de 16,7 mm por pixel numa bicicleta que
ocupava 430 pixels, sem alertar, porque o recorte tinha pego a legenda da folha
e as letras viraram o chão. Aqui o chamador declara dois pontos que sabe
localizar na foto e as coordenadas deles no modelo. As duas âncoras dão escala e
origem, e a escala implícita em z e a implícita em y voltam como resíduo:
resíduo acima de 2% reprova antes de qualquer comparação, porque escala errada
faz todo desvio virar ficção.

## Como ler a saída

O desvio positivo é malha acima da foto. O que decide não é só o máximo:

- média perto de zero com máximo alto é erro de **inclinação**, e a correção é
  girar a peça, não subir;
- média igual ao máximo é erro de **altura**, e a correção é transladar;
- cobertura baixa quer dizer que boa parte da peça ficou fora do recorte e não
  foi conferida — média baixa aí não é aprovação.

Foi assim que o tubo superior do quadro da bicicleta saiu de 32,6 mm de desvio
máximo para 4,6 numa correção só: a tabela mostrou +17 mm atrás e −33 na frente,
que é assinatura de inclinação, e não de altura.

## Limite

A ferramenta compara uma borda por execução, no plano lateral. Ela não vê
largura, não vê profundidade e não julga a região que o recorte não cobre. Onde
a foto tem um cabo, um guidão ou uma legenda por cima da borda, a extração pega
o obstáculo: o recorte é declaração de onde a medida vale, e escolhê-lo mal
produz número confiante e errado.
