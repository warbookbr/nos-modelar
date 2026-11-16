/* booleana-cantos-quase-coincidentes.test.ts — a união de dois sólidos cujos cantos ficam a menos da tolerância de fusão
   (2^-15 da meia-caixa dos operandos) um do outro fecha a malha: cada canto novo a poucos micrômetros de um canto de operando
   vira esse canto, em qualquer ordem, e a recusa do contato real não-manifold continua (troca-de-canto.test.mjs).

   A segunda tentativa da booleana (reforco em booleanas.js) só roda quando a primeira recusaria ou deixa aresta abaixo do piso de precisão; o caso das juntas da bicicleta, que a exercita, está em tools/modelar/juntas-vizinhas-da-bicicleta.test.mjs. O defeito que motivou o teste (varredura das juntas soldadas da bicicleta, plano da costura em nó de tubos, fatia 6): cinco cantos
   novos a menos de 0,5 µm de um canto antigo, cada um barrado pela regra "dois vizinhos em comum" enquanto os outros ainda existiam;
   a diagonal da partição de um pedaço sobre uma aresta que já existe na casca, que dava quatro faces numa aresta; e um canto antigo
   que a fusão de lascas deixava com duas faces. O caso das juntas está em tools/modelar/juntas-vizinhas-da-bicicleta.test.mjs. */
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

/* os cubos de lado 1 têm meia-caixa de uns 0,9: a tolerância de fusão é de uns 27 µm */
describe('união com cantos a menos da tolerância de fusão', () => {
  for (const e of [2e-6, 8e-6, 2e-5, 2.6e-5]) {
    it(`o canto do segundo cubo ${(e * 1e6).toFixed(0)} µm para dentro do canto do primeiro: a malha fecha`, () => {
      const n = executa([['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 0.6, em: [1.3 - e, 1.3 - e, 1.3 - e] }],
        ['unir', { origemId: 9, solidos: [sel('cubo', 1), sel('cubo', 2)] }]]);
      expect(topologia(n)).toEqual(fechada);
    });
  }
  it('o canto do segundo cubo a 8 µm de uma aresta e de uma face do primeiro, em dois eixos: a malha fecha', () => {
    const n = executa([['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 0.6, em: [1.3 - 8e-6, 1.3, 0.2 + 8e-6] }],
      ['unir', { origemId: 9, solidos: [sel('cubo', 1), sel('cubo', 2)] }]]);
    expect(topologia(n)).toEqual(fechada);
  });
  it('o contato real num canto continua recusado (dois cubos que só se tocam num canto)', () => {
    const n = executa([['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [1, 1, 1] }],
      ['unir', { origemId: 9, solidos: [sel('cubo', 1), sel('cubo', 2)] }]]);
    expect(n.orfaos.some((o: any) => o.op === 'unir')).toBe(true);
  });
});
