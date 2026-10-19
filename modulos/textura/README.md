# Textura

Gera em JavaScript puro, sem Blender e sem Three.js, a imagem de cor de um material, como tile contínuo. A entrada é o material do bloco `materiais` do esboço (`{ tipo, cor: [r,g,b] sRGB, desgaste, veio, borda, tabuas, ferrugem }`).

```js
import { gerarTextura, texturaParaPng } from './src/index.js';
const t = gerarTextura({ tipo: 'madeira', cor: [95, 48, 30], desgaste: 0.3, veio: 2 }, { px: 512, semente: 1 });
// { largura, altura, rgba: Uint8ClampedArray (sRGB), metrosPorTile: 0.5 }
const bytes = texturaParaPng(t);
```

O resultado é determinístico: a mesma entrada e a mesma semente dão os mesmos bytes. O tile cobre `metrosPorTile` (0,5 m) de lado e não tem emenda quando repetido. O eixo x da imagem corre ao longo do veio da madeira.

Tipos cobertos: `madeira` (anéis por tábua, fibras, `veio` de 1 a 3, `tabuas`, `borda`) e `liso`; o `desgaste` (0 a 1) soma tinta envelhecida, sujeira, tinta lascada e ferrugem. `metal` e `tecido` lançam `ErroDeTextura` até existirem. Um tile não tem quinas: onde o Blender usa as arestas da peça, aqui valem as juntas entre tábuas e cristas de ruído espalhadas. `manchas`, `podre` e `rasgos` ainda são ignorados.

A referência de aparência é `materiais.py` do repositório de origem. A prova da madeira para julgamento está em `docs/mecanifica/banco-de-provas/textura-2026-10-19/`, gerada por `node modulos/textura/scripts/folha-madeira.mjs <pasta>`.
