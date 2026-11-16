/* booleana-cantos-quase-coincidentes.test.ts — a segunda tentativa reforçada da união (`reforco` em booleanas.js) e o que ela não pode fazer.

   Os casos são cubos de lado 1 cujos cantos ficam a poucos micrômetros de uma aresta ou de um canto um do outro, e cada um foi conferido contra a versão anterior à
   segunda tentativa: (1) a união com o segundo cubo em [2e-7, 0, 0,0192806], que a versão anterior recusava e agora fecha, com o volume de 1,0192806; (2) o contato por
   aresta inteira (em [1, 1, 0]), que continua recusado, porque é contato não-manifold real; (3) a lâmina fina do `intersectar` (espessura de 10 µm), que continua recusada:
   o reforço vale só na união, e ali a tentativa reforçada apagava o canto antigo verdadeiro da lâmina e devolvia um tetraedro com um sexto do volume, sem aviso; (4) o canto
   antigo só sai na fusão de lascas quando está na reta dos vizinhos (até 4 vezes a tolerância de solda). O caso das juntas da bicicleta está em
   tools/modelar/juntas-vizinhas-da-bicicleta.test.mjs. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../nucleo.js';

const sel = (op: string, id: number) => ({ origem: { op, id } });
const executa = (passos: unknown[]) => (nucleo as any)(passos, {}, {}, {}, null, []);

function topologia(n: any) {
  const usos = new Map<string, number>(), porV = new Map<number, number[][]>();
  for (const f of n.F.values()) for (let i = 0; i < f.vs.length; i++) {
    const a = f.vs[i], b = f.vs[(i + 1) % f.vs.length];
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    usos.set(k, (usos.get(k) ?? 0) + 1);
    (porV.get(a) ?? porV.set(a, []).get(a)!).push([f.vs[(i + f.vs.length - 1) % f.vs.length], b]);
  }
  let naoManifold = 0;
  for (const ar of porV.values()) {
    const pai = new Map<number, number>(); const raiz = (x: number): number => { while (pai.get(x) !== x) x = pai.get(x)!; return x; };
    for (const [a, b] of ar) { for (const x of [a, b]) if (!pai.has(x)) pai.set(x, x); pai.set(raiz(a), raiz(b)); }
    if (new Set([...pai.keys()].map(raiz)).size > 1) naoManifold++;
  }
  const dupla = [...usos.values()].filter((x) => x !== 2).length;
  return { arestasSemPar: dupla, naoManifold, orfaos: n.orfaos.length };
}
const fechada = { arestasSemPar: 0, naoManifold: 0, orfaos: 0 };

const volume = (n: any) => {
  let v = 0;
  for (const f of n.F.values()) {
    const P = f.vs.map((k: number) => n.V.get(k));
    for (let t = 1; t < P.length - 1; t++) {
      const [a, b, c] = [P[0], P[t], P[t + 1]];
      v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
  }
  return v;
};
const dois = (op: string, em: number[]) => executa([['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em }],
  [op, { origemId: 9, solidos: [sel('cubo', 1), sel('cubo', 2)] }]]);

describe('segunda tentativa reforçada da booleana', () => {
  it('união com o segundo cubo a 0,2 µm de uma face e deslocado em z: fecha, com o volume da união', () => {
    const n = dois('unir', [2e-7, 0, 0.0192806]);
    expect(topologia(n)).toEqual(fechada);
    expect(Math.abs(volume(n) - 1.0192806)).toBeLessThan(1e-5);
  });
  it('o contato por aresta inteira (dois cubos que só se tocam numa aresta) continua recusado', () => {
    const n = dois('unir', [1, 1, 0]);
    expect(n.orfaos.some((o: any) => o.op === 'unir')).toBe(true);
  });
  it('a lâmina de 10 µm do intersectar recusa, em vez de devolver um tetraedro sem aviso', () => {
    const n = dois('intersectar', [-1 + 1e-5, 1e-7, 0.0141191]);
    expect(n.orfaos.some((o: any) => o.op === 'intersectar')).toBe(true);
  });
});
