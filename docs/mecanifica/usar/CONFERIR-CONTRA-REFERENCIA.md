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
que está nele. Ele mora ao lado da imagem que descreve, dentro da pasta de
referências da peça.

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

## No veredito da peça

`npm run descrever -- <peça>` confere a forma contra a referência que a peça tem, depois do que já roda (plano de partes,
refinamento, contatos e formas), e cada item sem referência diz `não conferido: sem referência`, sem aprovar nem barrar. O
`conferir:referencia` acima continua sendo a conferência da borda contra uma foto; estes itens não precisam de foto.

- **G01 sobre a malha.** A receita que refina um andaime declara também o alvo N2 em `REFINA.alvo` (caminho relativo à pasta da
  peça, como `andaime`). O G01 roda com os triângulos da peça no lugar dos do andaime e confere envelope, regiões e as silhuetas
  frontal, direita e superior com os limiares do próprio alvo. Os landmarks e o envelope declarado vêm do andaime, e o orçamento do
  alvo (que limita o andaime) não conta. O G00 do alvo fica bloqueado enquanto a crítica dele não existe, e o veredito olha só as medidas.
- **Contorno por parte.** Todo `*.contornos.json` na pasta da peça (ou numa subpasta, como `referencias/`) é comparado com a malha
  pelo comparador do esboço: razão interseção/união de 0,85 e desvio de até o maior entre 5 mm e 3% da maior dimensão do contorno.
  A vista sai do nome do arquivo (`frontal`, `lateral` ou `superior` no começo), a silhueta inteira é comparada e cada região casa
  com a parte de mesmo nome. A mensagem nomeia a parte, o desvio e a diferença de tamanho e de posição. O contorno de um objeto
  mora na pasta do objeto, fora da de cada parte, e por isso não entra na parte.
- **Razões.** `RAZOES` na receita, ao lado de `PLANO`: `[{ nome, origem, mede: { razao: [A, B], faixa: [min, max] } }]`, com A e B
  as medidas do `--medidas` do esboço (`alturaTotal`, `larguraTotal`, `profundidadeTotal`, `{ caixa, formas }`, `{ distancia,
  eixo }`), em que as formas são as partes da peça. A razão fora da faixa, ou que não se lê, reprova com o valor medido.
- **Forma contra o esboço.** A receita que refina uma forma do esboço declara `REFINA.esboco` (o arquivo do esboço, a opção, a forma de
  cada parte e a razão interseção/união de volume mínima, geral ou por parte). Cada parte é comparada ao sólido da forma, com os recortes,
  as inclinações e a malha de família, e reprova abaixo do mínimo com a parte, as formas, a razão e o mínimo. Só roda quando o campo
  existe, e a linha da seção `REFERÊNCIA DA FORMA` traz a razão de cada parte. `npm run forma:esboco -- <peça>` (o `REFINA.esboco` da receita) ou `npm run forma:esboco -- <peça> --esboco=<arquivo> --mesmo-id`
  mede uma receita que não declara o campo, ligando cada parte à forma de mesmo id.

O laço lê o mesmo veredito: `rodada-de-modelagem.mjs <peça> --acao` mede a receita atual (veredito, `guarda:acervo`,
`guarda:referencial` e `conferir-pontos` quando há `PONTOS`) e devolve `modelar` enquanto a medição não passar; `--registrar` mede
de novo e recusa o veredito do crítico quando ela reprovou.
