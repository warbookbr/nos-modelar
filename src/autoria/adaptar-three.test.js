/* adaptar-three.test.js — a malha da cena carrega de qual vértice neutro cada
   posição veio, que é o que permite a edição devolver o movimento à malha. */
import { describe, expect, it } from 'vitest';
import { adaptarThree, idsDeOrigem } from './adaptar-three.js';

describe('adaptarThree — identidade transitória de face', () => {
  it('carrega em cada triângulo o id da face neutra que o originou', () => {
    const neutro = {
      V: new Map([
        [10, [0, 0, 0]], [11, [1, 0, 0]], [12, [1, 1, 0]], [13, [0, 1, 0]],
      ]),
      F: new Map([[42, { id: 42, parte: 'chapa', vs: [10, 11, 12, 13] }]]),
      partes: { chapa: {} },
      orfaos: [],
    };

    const { partes } = adaptarThree(neutro);
    const malha = partes.get('chapa').children[0];
    const origem = malha.geometry.getAttribute('origemFace');
    const vertices = malha.geometry.getAttribute('origemVertice');

    expect(origem).toBeDefined();
    expect(idsDeOrigem(origem)).toEqual([42, 42, 42, 42, 42, 42]);
    expect(vertices.count).toBe(6);
    expect(new Set(idsDeOrigem(vertices))).toEqual(new Set([10, 11, 12, 13]));
    expect(malha.userData.faces).toEqual([42]);
  });
});

describe('adaptarThree — liso com ângulo limite', () => {
  /* Duas faces que se encontram numa aresta. `dobra` é o ângulo entre elas. */
  function duasFaces(liso, dobra) {
    const a = (dobra * Math.PI) / 180;
    return {
      V: new Map([
        [1, [0, 0, 0]], [2, [1, 0, 0]], [3, [1, 0, 1]], [4, [0, 0, 1]],
        [5, [0, Math.sin(a), 1 + Math.cos(a)]], [6, [1, Math.sin(a), 1 + Math.cos(a)]],
      ]),
      F: new Map([
        [1, { id: 1, parte: 'p', liso, vs: [1, 4, 3, 2] }],
        [2, { id: 2, parte: 'p', liso, vs: [4, 3, 6, 5] }],
      ]),
      partes: { p: {} },
      orfaos: [],
    };
  }
  const normaisNaAresta = (neutro) => {
    const malha = adaptarThree(neutro).partes.get('p').children[0];
    const vertices = idsDeOrigem(malha.geometry.getAttribute('origemVertice'));
    const faces = idsDeOrigem(malha.geometry.getAttribute('origemFace'));
    const normais = malha.geometry.getAttribute('normal').array;
    const saida = [];
    for (let i = 0; i < vertices.length; i++) {
      if (vertices[i] === 4) saida.push({ face: faces[i], n: [...normais.slice(i * 3, i * 3 + 3)].map((x) => +x.toFixed(3)) });
    }
    return saida;
  };

  it('sem ângulo, a quina de 90 graus é borrada: as duas faces tomam a média', () => {
    const [primeira, segunda] = normaisNaAresta(duasFaces(true, 90));
    expect(primeira.n).toEqual(segunda.n);
  });

  it('com ângulo de 30 graus, a quina de 90 fica nítida e cada face mantém a própria normal', () => {
    const normais = normaisNaAresta(duasFaces(30, 90));
    const daFace1 = normais.find((x) => x.face === 1).n;
    const daFace2 = normais.find((x) => x.face === 2).n;
    expect(daFace1).not.toEqual(daFace2);
    expect(Math.abs(daFace1[1])).toBeCloseTo(1, 3);
    expect(Math.abs(daFace2[2])).toBeCloseTo(1, 3);
  });

  it('com ângulo de 30 graus, uma dobra de 10 graus continua lisa', () => {
    const normais = normaisNaAresta(duasFaces(30, 170));
    expect(normais.find((x) => x.face === 1).n).toEqual(normais.find((x) => x.face === 2).n);
  });
});

describe('adaptarThree — contorno válido com cantos colineares', () => {
  /* Dois cantos seguidos no meio de uma aresta reta (o que uma booleana ou um perfil de extrusão deixam): o polígono é válido
     e convexo, mas toda orelha de canto vizinho leva um canto colinear sobre a borda, e a primeira conta recusava todas. */
  const adaptar = (pontos) => {
    const V = new Map(pontos.map((p, i) => [i + 1, p]));
    const F = new Map([[1, { id: 1, parte: 'capo', vs: [...V.keys()], cor: null, material: null, liso: 30, solido: false, tinta: [] }]]);
    return adaptarThree({ V, F, partes: { capo: {} }, orfaos: [] });
  };
  const areaDaMalha = (visual) => {
    const posicao = visual.partes.get('capo').children[0].geometry.getAttribute('position');
    let soma = 0;
    for (let i = 0; i < posicao.count; i += 3) {
      const [a, b, c] = [0, 1, 2].map((k) => [posicao.getX(i + k), posicao.getY(i + k), posicao.getZ(i + k)]);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      soma += Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2;
    }
    return soma;
  };

  it('o contorno do capô do motor do avião (seis cantos, dois colineares) vira malha e cobre a área do polígono', () => {
    const visual = adaptar([
      [0.18677669529663687, 0.9432233047033631, 0.676],
      [0.15694631307311827, 0.9177457514062631, 0.676],
      [0.15555738918630552, 0.9623103900626798, 0.6727163408413738],
      [0.15855926864704892, 0.967196910071524, 0.6725496366453996],
      [0.16040165886416927, 0.970195990073833, 0.6724473226838193],
      [0.16082633236579919, 0.9708872821760235, 0.6724237391736995],
    ]);
    expect(areaDaMalha(visual)).toBeCloseTo(0.0017408028985175187 / 2, 9);
  });

  it('um contorno que cruza a si mesmo continua recusado', () => {
    expect(() => adaptar([[0, 0, 0], [1, 1, 0], [1, 0, 0], [0, 1, 0]])).toThrow(/adaptarThree/);
  });
});
