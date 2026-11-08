# Textura

Gera em JavaScript puro, sem Blender e sem Three.js, a imagem de cor de um material, como tile contínuo. A entrada é o material do bloco `materiais` do esboço (`{ tipo, cor: [r,g,b] sRGB, desgaste, veio, borda, tabuas, ferrugem }`).

```js
import { gerarTextura, texturaParaPng } from './src/index.js';
const t = gerarTextura({ tipo: 'madeira', cor: [95, 48, 30], desgaste: 0.3, veio: 2 }, { px: 512, semente: 1 });
// { largura, altura, rgba: Uint8ClampedArray (sRGB), metrosPorTile: 0.5 }
const bytes = texturaParaPng(t);
```

O resultado é determinístico: a mesma entrada e a mesma semente dão os mesmos bytes. O tile cobre `metrosPorTile` (0,5 m) de lado e não tem emenda quando repetido. O eixo x da imagem corre ao longo do veio da madeira.

Tipos cobertos: `madeira` (anéis por tábua, fibras, `veio` de 1 a 3, `tabuas`, `borda`), `liso`, `metal` e `tecido`; o `desgaste` (0 a 1) soma tinta envelhecida, sujeira, tinta lascada e ferrugem (`ferrugem`, 0 a 1, baixa o limiar da mancha de ferrugem), e vale para os quatro. Um tile não tem quinas: onde o Blender usa as arestas da peça, aqui valem as juntas entre tábuas e cristas de ruído espalhadas.

O `metal` é pintado (casca de laranja, riscos fracos, escorridos, lascas) ou escovado (fios finos esticados no eixo x, o sentido do veio). Sem `acabamento`, o cinza médio (canais a até 22 níveis entre si e média até 205) sai escovado e o resto pintado, como no Blender; `acabamento: 'pintado' | 'escovado'` decide à mão. O `tecido` tem trama de fios cruzados em xadrez, tom por fio, ondulação, penugem e fibras soltas; o fio tem cerca de px/5 por tile (par), mais grosso que o de 1,8 mm do Blender, porque 512 px não resolvem 278 fios. No `metal` e no `tecido`, `manchas` e `rasgos` (0 a 1) valem como o `_aplicar_estrago` do Blender: mancha irregular com auréola, e fendas finas com enchimento claro.

O `brilho` (0 a 1, opcional) é declarado no material da receita, não é lido por `gerarTextura` e não muda a imagem: a exportação OBJ o grava no `.mtl` como `Ns` e `Ks`. Sem ele, nada muda.

Ignorados sem erro, por nenhuma receita usar: `trancado` (trança de cestaria), `listras`, `desenho`, `podre` e `acabamento` fora do metal. `manchas` e `rasgos` na madeira e no liso também são ignorados. No metal pintado, a sujeira "perto do chão" do Blender vira manchas de ruído lento, porque o tile não tem chão.

A referência de aparência é `materiais.py` do repositório de origem. A prova da madeira para julgamento está em `docs/modelar/banco-de-provas/textura-2026-10-19/`, gerada por `node modulos/textura/scripts/folha-madeira.mjs <pasta>`; a do metal e a do tecido, por `node modulos/textura/scripts/folha-metal-tecido.mjs <pasta> [--blender <pasta>]`, com as amostras em `scripts/amostras-metal-tecido.json`.

## Mapas de relevo e de aspereza

`gerarMapasDoRelevo({ tipo, escala, intensidade }, { px, semente })` devolve, ao lado da cor, a normal (RGBA, espaço tangente, verde para cima), um mapa de aspereza (fator de 0 a 1 no canal verde, como o `roughnessMap` do glTF), a altura em [0, 1] e o `metrosPorTile`. Os tipos são os do material da receita: `prismas` (grade de pirâmides de topo chato, 4 por lado do tile), `bandaDeRodagem` (sulcos transversais inclinados e dois longitudinais, 4 períodos por lado), `letras` (baixo-relevo de `TEXTO_DAS_LETRAS`, uma medida de pneu sem marca, em fonte de 5 x 7 células; a escala é a altura da letra) e `granulado` (ruído fino, 16 grãos por lado). `gerarMapaDeFlocos(flocos, { px, semente })` dá o mapa de aspereza da tinta metálica: pontos que pegam luz, num tile de 4 cm. Valem as regras do módulo: os mesmos bytes para a mesma entrada e semente (só o `granulado` e os flocos dependem da semente), tile sem emenda e escala em metros. A coordenada que leva esses mapas à peça sai de `src/autoria/coordenada-de-textura.js` (projeção `plana`, `cilindrica` ou `caixa` declarada no `relevo` do material), na convenção do glTF (v = 0 é a primeira linha da imagem).
