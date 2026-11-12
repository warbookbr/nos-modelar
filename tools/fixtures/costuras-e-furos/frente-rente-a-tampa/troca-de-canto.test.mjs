/* A troca de cantos coincidentes da booleana (fatia 3 do plano "costuras e furos limpos"): a face que o passo mantém inteira passa ao canto representante só onde o id antigo
   deixaria aresta aberta, com o mapa levado às quebras de sombra, e o portão de casca fechada confere os ids que o passo escreve. Os casos são os da revisão adversarial. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../../../../procedural/nucleo/nucleo.js';
import { assinaturaDaForma } from '../../../../src/autoria/assinatura-da-forma.js';
import { medirPeca } from '../medir.mjs';
import { gerarPassos, BASE } from '../tubos-em-t.js';

const sel = (op, id) => ({ origem: { op, id } });
const C = (id, lado, em) => ['cubo', { origemId: id, lado, em }];
const executa = (passos, pontos = {}) => nucleo(passos, pontos, {}, {}, null, []);

function topologia(n) {
  const usos = new Map(), porV = new Map();
  for (const f of n.F.values()) for (let i = 0; i < f.vs.length; i++) {
    const a = f.vs[i], b = f.vs[(i + 1) % f.vs.length];
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    usos.set(k, (usos.get(k) ?? 0) + 1);
    (porV.get(a) ?? porV.set(a, []).get(a)).push([f.vs[(i + f.vs.length - 1) % f.vs.length], b]);
  }
  let naoManifold = 0;
  for (const ar of porV.values()) {
    const pai = new Map(); const raiz = (x) => { while (pai.get(x) !== x) x = pai.get(x); return x; };
    for (const [a, b] of ar) { for (const x of [a, b]) if (!pai.has(x)) pai.set(x, x); pai.set(raiz(a), raiz(b)); }
    if (new Set([...pai.keys()].map(raiz)).size > 1) naoManifold++;
  }
  const quebraOrfa = [...n.F.values()].filter((f) => (f.quebras ?? []).some(([a, b]) => !n.V.has(a) || !n.V.has(b) || !f.vs.includes(a) || !f.vs.includes(b))).length;
  return { soltas: [...usos.values()].filter((x) => x === 1).length, naoManifold, quebraOrfa, orfaos: n.orfaos.length };
}
const fechada = { soltas: 0, naoManifold: 0, quebraOrfa: 0, orfaos: 0 };

describe('troca de cantos coincidentes: a casca fecha onde o id antigo deixaria aresta aberta', () => {
  it('tampas opostas (a face de um cubo sobre a do outro, com os quatro cantos coincidentes): 8 arestas soltas antes, 0 agora', () => {
    expect(topologia(executa([C(1, 1, [0, 0, 0]), C(2, 1, [1, 0, 0]), ['unir', { origemId: 9, solidos: [sel('cubo', 1), sel('cubo', 2)] }]]))).toEqual(fechada);
  });
  it('a troca vale também no subtrair que vem depois da união', () => {
    expect(topologia(executa([C(1, 1, [0, 0, 0]), C(2, 1, [1, 0, 0]), ['unir', { origemId: 9, solidos: [sel('cubo', 1), sel('cubo', 2)] }], C(3, 0.2, [0.5, 0.4, 0]),
      ['subtrair', { origemId: 10, solidos: [sel('unir', 9), sel('cubo', 3)] }]]))).toEqual(fechada);
  });
  it('o caso em que a troca mudaria o número de cantos da face (dois cantos dela coincidem no mesmo canto do outro): era 8 arestas soltas na base, 12 e 3 vértices não manifold na primeira versão, e agora fecha', () => {
    const n = executa([['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [1, 0, 0] }], ['moveV', { v: 1006, d: [-1, 0, 0] }],
      ['unir', { origemId: 9, solidos: [sel('cubo', 1), sel('cubo', 2)] }]]);
    expect(topologia(n)).toEqual(fechada);
  });
  it('o intersectar passa pelo mesmo caminho e fecha com os cantos coincidentes', () => {
    expect(topologia(executa([C(1, 1, [0, 0, 0]), ['cubo', { origemId: 2, larg: 1, alt: 1, prof: 1, em: [0.5, 0, 0] }], ['intersectar', { origemId: 9, solidos: [sel('cubo', 1), sel('cubo', 2)] }]]))).toEqual(fechada);
  });
  it('o arredondarCostura da união de frente rente à tampa (que a fresta fazia recusar) fecha sem órfão nem aresta solta', () => {
    const m = medirPeca({ PASSOS: gerarPassos({ ...BASE, pe: true, avanco: 0, raioDoEncontro: 10 }), PARAMS: {} });
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
  });
  it('sem fresta nada troca: a face de um cubo sobre a face menor de outro (tampas opostas desiguais) fecha com as faces mantidas nos ids de entrada', () => {
    const n = executa([C(1, 1, [0, 0, 0]), ['cubo', { origemId: 2, larg: 1, alt: 0.5, prof: 0.5, em: [1, 0, 0] }], ['unir', { origemId: 9, solidos: [sel('cubo', 1), sel('cubo', 2)] }]]);
    expect(topologia(n)).toEqual(fechada);
    /* as quatro faces do segundo cubo que o passo não corta seguem com os vértices de entrada (ids de 8 a 15) */
    for (const f of n.F.values()) if (f.id >= 6 && f.id < 12) for (const v of f.vs) expect(v < 1000).toBe(true);
  });
});

describe('o portão de casca fechada confere os representantes e os ids escritos', () => {
  const grita = (passos) => executa(passos).orfaos.filter((o) => o.op === 'unir').map((o) => o.motivo);
  it('dois cubos que só se tocam num canto gritam no unir, com a conta de sempre (0 arestas sem par, 1 vértice com vínculo que não é um laço)', () => {
    const [m] = grita([C(1, 1, [0, 0, 0]), C(2, 1, [1, 1, 1]), ['unir', { origemId: 9, solidos: [sel('cubo', 1), sel('cubo', 2)] }]]);
    expect(m).toMatch(/0 aresta\(s\) dirigida\(s\) sem par, 1 vértice\(s\) com vínculo que não é um laço só/);
  });
  it('dois cubos que só se tocam numa aresta gritam no unir, com a conta de sempre (2 arestas sem par, 2 vértices)', () => {
    const [m] = grita([C(1, 1, [0, 0, 0]), C(2, 1, [1, 1, 0]), ['unir', { origemId: 9, solidos: [sel('cubo', 1), sel('cubo', 2)] }]]);
    expect(m).toMatch(/2 aresta\(s\) dirigida\(s\) sem par, 2 vértice\(s\) com vínculo que não é um laço só/);
  });
});

describe('troca de cantos coincidentes: as quebras de sombra vão pelo mesmo mapa', () => {
  const P = {
    a0: [-0.5, 0, -0.5], a1: [0.5, 0, -0.5], a2: [0.5, 0, 0.5], a3: [-0.5, 0, 0.5], b0: [-0.5, 1, -0.5], b1: [0.5, 1, -0.5], b2: [0.5, 1, 0.5], b3: [-0.5, 1, 0.5],
    mN: [0, 1, -0.5], mE: [0.5, 1, 0], mS: [0, 1, 0.5], mW: [-0.5, 1, 0], C: [0, 1, 0],
  };
  const faces = [['a0', 'a1', 'a2', 'a3'], ['b0', 'mW', 'C', 'mN'], ['mN', 'C', 'mE', 'b1'], ['C', 'mS', 'b2', 'mE'], ['mW', 'b3', 'mS', 'C'],
    ['b0', 'mN', 'b1', 'a1', 'a0'], ['b1', 'mE', 'b2', 'a2', 'a1'], ['b2', 'mS', 'b3', 'a3', 'a2'], ['b3', 'mW', 'b0', 'a0', 'a3']];
  const vivo = (nome, pontos) => ({ nome, pontos, nitidez: 'viva' });
  const sub = ['subdivisao', { origemId: 2, vertices: Object.keys(P), faces, niveis: 1, cantos: ['a0', 'a1', 'a2', 'a3', 'b0', 'b1', 'b2', 'b3'],
    vincos: [vivo('cruz', ['mW', 'C', 'mE']), vivo('topo', ['b0', 'mN', 'b1', 'mE', 'b2', 'mS', 'b3', 'mW', 'b0']), vivo('fundo', ['a0', 'a1', 'a2', 'a3', 'a0']),
      vivo('l1', ['a0', 'b0']), vivo('l2', ['a1', 'b1']), vivo('l3', ['a2', 'b2']), vivo('l4', ['a3', 'b3'])] }];
  it('o polo de um cone sobre o centro da tampa de uma gaiola subdividida: nenhuma quebra aponta vértice que não existe, e a assinatura da forma sai', () => {
    const cone = ['lathe', { origemId: 1, lados: 12, perfil: [[0, 0], [0.1, 0], [0, 0.2]], em: [0, 0.8, 0] }];
    const n = executa([cone, sub, ['unir', { origemId: 9, solidos: [sel('lathe', 1), sel('subdivisao', 2)] }]], P);
    expect(topologia(n)).toEqual(fechada);
    expect(() => assinaturaDaForma(n)).not.toThrow();
  });
  it('uma caixa rente ao centro da tampa da gaiola (os cantos coincidem): a casca fecha, nenhuma quebra sai da face nem deixa de ser aresta dela, e o adaptador abre', async () => {
    const { adaptarThree } = await import('../../../../src/autoria/adaptar-three.js');
    const caixa = ['cubo', { origemId: 1, larg: 0.3, alt: 0.3, prof: 0.3, em: [0.15, 0.7, 0.15] }];
    const n = executa([caixa, sub, ['unir', { origemId: 9, solidos: [sel('cubo', 1), sel('subdivisao', 2)] }]], P);
    expect(topologia(n)).toEqual(fechada);
    for (const f of n.F.values()) for (const [a, b] of f.quebras ?? []) {
      const i = f.vs.indexOf(a), j = f.vs.indexOf(b);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(j).toBeGreaterThanOrEqual(0);
      expect([1, f.vs.length - 1]).toContain(Math.abs(i - j));
    }
    expect(() => adaptarThree(n)).not.toThrow();
  });
});
