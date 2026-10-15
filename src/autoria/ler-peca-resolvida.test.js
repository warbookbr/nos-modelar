/* ler-peca-resolvida.test.js — o que o leitor devolve de cada face. */
import { describe, expect, it } from 'vitest';
import { adaptarThree } from './adaptar-three.js';
import { FORMATO, VERSAO, lerPecaResolvida } from './ler-peca-resolvida.js';

/* Um prisma de base quadrada com as seis faces na linha canônica da peça resolvida
   ([id, vs, cor, material, liso, solido, parte]); as faces ficam voltadas para fora. */
function prisma(liso) {
  const V = [[0, 0, 0, 0], [1, 1, 0, 0], [2, 1, 1, 0], [3, 0, 1, 0], [4, 0, 0, 1], [5, 1, 0, 1], [6, 1, 1, 1], [7, 0, 1, 1]];
  const faces = [[3, 2, 1, 0], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  return {
    formato: FORMATO, versao: VERSAO, V, portas: [],
    F: faces.map((vs, i) => [i, vs, null, null, liso, true, 'p']),
  };
}

/* as componentes x das normais que o adaptador entrega nos cantos da quina x = 1, z = 1, onde a lateral +x encontra a tampa +z */
function normaisDaQuina(liso) {
  const visual = adaptarThree(lerPecaResolvida(prisma(liso)), { nome: 'prisma' });
  const geometria = visual.partes.get('p').children[0].geometry;
  const posicao = geometria.getAttribute('position');
  const normal = geometria.getAttribute('normal');
  const lidas = [];
  for (let i = 0; i < posicao.count; i++) {
    if (posicao.getX(i) === 1 && posicao.getZ(i) === 1) lidas.push(+normal.getX(i).toFixed(3));
  }
  return lidas;
}

describe('lerPecaResolvida — o liso de cada face', () => {
  it.each([[30, 30], [true, true], [false, false]])('guarda o liso %s como %s', (gravado, lido) => {
    const { F } = lerPecaResolvida(prisma(gravado));
    expect([...F.values()].map((face) => face.liso)).toEqual(Array(6).fill(lido));
  });

  it('o ângulo gravado chega ao sombreamento: a tampa não entorta a normal da lateral', () => {
    /* com 30 graus a quina de 90 fica nítida e a lateral mantém a normal dela, (1, 0, 0) */
    expect(normaisDaQuina(30)).toContain(1);
    /* sem ângulo, a média das faces que tocam o vértice entorta a normal: nenhum canto fica em x = 1 */
    expect(normaisDaQuina(true)).not.toContain(1);
  });
});
