# O refino depois da entrega

Apoio da skill [`laco-de-modelagem`](SKILL.md). Leia quando o modelador entregou, a medição passou e começa uma rodada de refino com o crítico cego, antes de despachar o refinador.

Depois que o modelador entrega e a medição passa, uma rodada de refino com o crítico cego é etapa fixa do método. Num refino medido de uma carroceria o ganho veio quase todo na primeira rodada, e rodadas a mais ficam com a decisão da pessoa. O crítico julga a entrega só pelo pacote e, além dos defeitos, lista no veredito o que já está certo e não deve ser mexido, com as posições lidas da grade do pacote. Essa lista, escrita só em texto, não impediu que o refinador baixasse uns 45 mm a janela lateral que o crítico tinha dado como certa, e por isso cada rodada de refino passa por uma conferência que a compara com a anterior.

Você tira do veredito anterior as zonas certas e as escreve num `zonas.json` ao lado da rodada, uma caixa em milímetro por faixa de x, y e z, com nome, no quadro do pacote, e com folga em volta de cada feição ao menos igual ao deslocamento que se quer pegar. Você só transcreve o que o crítico leu; não decide o que é certo, não acrescenta zona e não edita o veredito. Quando o veredito, dentro de uma zona dada como certa, pede uma mudança (por exemplo, a posição da janela está certa e a ponta dela deve ser arredondada), você a transcreve como `pedido` da zona: uma caixa menor, em milímetro, só do trecho que o crítico nomeou, com a folga do raio pedido e não mais, e a `descricao` com as palavras do veredito. A mudança pedida sai da conta da zona e, sem o pedido, a conferência acusaria o refinador por cumpri-la. Você não escreve pedido para uma mudança que o crítico não pediu, nem alarga a caixa para cobrir o que o refinador fez a mais. Com a candidata que o crítico julgou e a que o refinador entregou depois, rode:

```bash
blender -b --factory-startup --python tools/blender/conferir-refino.py -- \
  --anterior <candidata julgada> --nova <candidata refinada> --zonas <zonas.json> --saida <pasta> [--caixa <seis números>]
```

```json
{ "tolerancia_mm": 3,
  "zonas": [ { "nome": "janela-lateral", "x": [280, 720], "y": [230, 470], "z": [-20, 20],
               "pedido": [ { "descricao": "arredondar a ponta esquerda da janela", "x": [295, 335], "y": [245, 285] } ] } ] }
```

Com a receita (`.js`) nas duas rodadas, a conferência compara só as partes que estão nas duas, que são a lataria que o crítico julgou, e não acusa a peça que a rodada de refino acrescentou por cima (um friso de lábio, uma moldura em volta do vão): ela sai à parte, em `conferencia-notas.md`, como parte nova, com a zona em que cai, e a que sumiu sai do mesmo modo. `--partes chapa,teto` escolhe as partes por nome e `--todas-as-partes` compara tudo. Com OBJ, que não traz partes, a comparação inclui tudo e a nota diz isso; nesse caso o friso acrescentado aparece como superfície nova na zona, e convém dar a conferência com a receita. As notas são suas e não vão ao modelador nem ao crítico. Se uma parte nova e uma sumida caem na mesma zona, pode ser a lataria renomeada, e você roda de novo com `--todas-as-partes`.

A conferência devolve em `conferencia.json` o deslocamento entre as duas superfícies, no total e por zona, e em `mexidas` cada zona certa em que a superfície andou mais que a tolerância (3 mm por padrão, declarável no arquivo, na zona ou na linha de comando), com o lugar e o quanto; `conferencia-<vista>.png` traz o mapa do deslocamento com sinal e as zonas desenhadas. As opções, o sinal e o que ela não enxerga estão em [`REGUA-E-PACOTE-CEGO.md`](../../../docs/modelar/blender/REGUA-E-PACOTE-CEGO.md). Se alguma zona saiu mexida, você não chama o crítico: devolve ao modelador o texto de `conferencia.md`, que diz a zona, o quanto, onde e para que lado, pede a zona de volta à posição anterior e roda a conferência de novo sobre a candidata que ele devolver. O crítico só é chamado quando nenhuma zona está mexida, e não recebe a conferência nem a lista de zonas, porque contar como a rodada foi conduzida faz revisão virar concordância. Se o modelador responde que a zona teve de andar para corrigir outro defeito, você não decide: registra a zona, o quanto e o motivo dele no `atrito` da rodada e leva o caso à pessoa. Escreva no mesmo `atrito` quantas devoluções a rodada teve.
