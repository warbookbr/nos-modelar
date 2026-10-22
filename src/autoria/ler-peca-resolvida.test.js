/* ler-peca-resolvida.test.js — o que o leitor devolve de cada face. */
import { describe, expect, it } from 'vitest';
import { adaptarThree } from './adaptar-three.js';
import { FORMATO, VERSAO, lerPecaResolvida } from './ler-peca-resolvida.js';
import { neutroCanonico, nucleo } from '../../procedural/nucleo/entrada.js';

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

  it('a quebra de sombra vai e volta pela cauda da linha, e a cena sai com as mesmas normais', () => {
    /* um cubo subdividido com o aro de cima vivo e liso de 120 graus, que sem a quebra suavizaria o aro de 90 graus */
    const P = { a: [0, 0, 0], b: [1, 0, 0], c: [1, 1, 0], d: [0, 1, 0], e: [0, 0, 1], f: [1, 0, 1], g: [1, 1, 1], h: [0, 1, 1] };
    const neutro = nucleo([['subdivisao', {
      origemId: 1, vertices: Object.keys(P), niveis: 2, liso: 120,
      faces: [['a', 'd', 'c', 'b'], ['e', 'f', 'g', 'h'], ['a', 'b', 'f', 'e'], ['b', 'c', 'g', 'f'], ['c', 'd', 'h', 'g'], ['d', 'a', 'e', 'h']],
      vincos: [{ nome: 'aro', pontos: ['e', 'f', 'g', 'h', 'e'], nitidez: 'viva' }],
    }]], P);
    expect(neutro.orfaos).toEqual([]);
    const canon = neutroCanonico(neutro);
    const lido = lerPecaResolvida({ formato: FORMATO, versao: VERSAO, V: canon.V, F: canon.F, portas: [] });
    const comQuebra = [...neutro.F.values()].filter((f) => f.quebras);
    /* as 4 arestas do aro viram 16 em nível 2, e cada uma é declarada pelas duas faces que a dividem */
    expect(comQuebra.reduce((soma, f) => soma + f.quebras.length, 0)).toBe(32);
    for (const f of neutro.F.values()) expect(lido.F.get(f.id).quebras).toEqual(f.quebras);
    const normais = (n) => [...adaptarThree(n, { nome: 'cubo' }).partes.get('estrutura-sem-nome').children].map((m) => [...m.geometry.getAttribute('normal').array]);
    expect(normais(lido)).toEqual(normais(neutro));
    for (const f of lido.F.values()) delete f.quebras;
    expect(normais(lido)).not.toEqual(normais(neutro));
  });
});
