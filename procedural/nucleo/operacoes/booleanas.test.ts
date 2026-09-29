/* booleanas.test.ts — fatias 1 a 3 do plano "União de sólidos"
   (docs/mecanifica/planos/2026-09-28-uniao-de-solidos.md). A fixture é neutra:
   dois cubos de lado 1 que se cruzam num cubo de 0,5 de lado. O primeiro
   bloco é a LINHA DE BASE: sem a operação, cada cubo tem face dentro do
   outro, que é o vinco que o render mostrou no ombro. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo, neutroCanonico } from '../entrada.js';

type N = any;
const A = { op: 'cubo', id: 1 };
const B = { op: 'cubo', id: 2 };
const DOIS_CUBOS: any[] = [
  ['cubo', { origemId: 1, lado: 1 }],                       // x,z ∈ [-0,5; 0,5], y ∈ [0; 1]
  ['cubo', { origemId: 2, lado: 1, em: [0.5, 0.5, 0.5] }],  // x,z ∈ [0; 1],     y ∈ [0,5; 1,5]
];
const CAIXA_A = { min: [-0.5, 0, -0.5], max: [0.5, 1, 0.5] };
const CAIXA_B = { min: [0, 0.5, 0], max: [1, 1.5, 1] };
const com = (op: string, solidos: any[] = [{ origem: A }, { origem: B }], base: any[] = DOIS_CUBOS) =>
  [...base, [op, { origemId: 9, solidos }]];

const pos = (n: N, v: number) => n.V.get(v);
/* volume pelo teorema da divergência, com o mesmo leque do adaptador */
function volume(n: N) {
  let s = 0;
  for (const f of n.F.values()) {
    const p0 = pos(n, f.vs[0]);
    for (let k = 1; k < f.vs.length - 1; k++) {
      const p1 = pos(n, f.vs[k]), p2 = pos(n, f.vs[k + 1]);
      s += p0[0] * (p1[1] * p2[2] - p1[2] * p2[1]) - p0[1] * (p1[0] * p2[2] - p1[2] * p2[0]) + p0[2] * (p1[0] * p2[1] - p1[1] * p2[0]);
    }
  }
  return s / 6;
}
/* fechada: toda aresta dirigida tem exatamente uma oposta, e nenhum canto
   solto no meio de uma aresta vizinha (sem junção em T): mesma posição = mesmo
   id não é exigido, então a checagem é por posição. */
function arestasAbertas(n: N) {
  const chave = (v: number) => pos(n, v).map((c: number) => c.toFixed(7)).join(',');
  const dirigidas = new Map<string, number>();
  for (const f of n.F.values()) for (let k = 0; k < f.vs.length; k++) {
    const a = chave(f.vs[k]), b = chave(f.vs[(k + 1) % f.vs.length]);
    if (a === b) continue;
    dirigidas.set(`${a}>${b}`, (dirigidas.get(`${a}>${b}`) ?? 0) + 1);
  }
  let abertas = 0;
  for (const [c, q] of dirigidas) { const [a, b] = c.split('>'); if (q !== 1 || dirigidas.get(`${b}>${a}`) !== 1) abertas++; }
  return abertas;
}
const dentroEstrito = (p: number[], cx: any, e = 1e-6) => p.every((c, k) => c > cx.min[k] + e && c < cx.max[k] - e);
/* face dentro: algum ponto de uma grade baricêntrica 12×12 sobre o leque da
   face cai estritamente dentro da caixa. O centroide sozinho não basta: a face
   de cima do cubo A tem só um quarto dentro de B. */
function faceDentro(n: N, f: any, caixa: any) {
  const p0 = pos(n, f.vs[0]);
  for (let k = 1; k < f.vs.length - 1; k++) {
    const p1 = pos(n, f.vs[k]), p2 = pos(n, f.vs[k + 1]);
    for (let u = 0; u <= 12; u++) for (let w = 0; u + w <= 12; w++) {
      const a = u / 12, b = w / 12, c = 1 - a - b;
      if (dentroEstrito([0, 1, 2].map((e) => c * p0[e] + a * p1[e] + b * p2[e]), caixa)) return true;
    }
  }
  return false;
}
const facesDentro = (n: N, caixa: any) => [...n.F.values()].filter((f) => faceDentro(n, f, caixa)).length;


describe('linha de base — dois cubos cruzados sem booleana', () => {
  it('cada cubo tem faces dentro do outro, e a soma dos volumes conta o encontro duas vezes', () => {
    const n = nucleo(DOIS_CUBOS);
    expect(n.orfaos).toEqual([]);
    expect(facesDentro(n, CAIXA_A) + facesDentro(n, CAIXA_B)).toBeGreaterThan(0);
    expect(volume(n)).toBeCloseTo(2, 9);
  });
});

describe('unir', () => {
  const antes = nucleo(DOIS_CUBOS);
  const n = () => nucleo(com('unir'));

  it('sai fechada, sem órfão, com o volume da união dentro de 0,1%', () => {
    const r = n();
    expect(r.orfaos).toEqual([]);
    expect(arestasAbertas(r)).toBe(0);
    expect(Math.abs(volume(r) - 1.875) / 1.875).toBeLessThan(1e-3);
  });

  it('nenhuma face fica dentro do outro sólido', () => {
    const r = n();
    expect(facesDentro(r, CAIXA_A)).toBe(0);
    expect(facesDentro(r, CAIXA_B)).toBe(0);
  });

  it('a mesma receita duas vezes dá a mesma malha, byte a byte', () => {
    expect(JSON.stringify(neutroCanonico(n()))).toBe(JSON.stringify(neutroCanonico(n())));
  });

  it('toda face vem de uma face de entrada ou do bloco do passo, e a origem publicada cobre todas', () => {
    const r = n();
    for (const id of r.F.keys()) expect(antes.F.has(id) || (id >= 2000 && id < 3000)).toBe(true);
    const pintada = nucleo([...com('unir'), ['pincel', { modo: 'face', sel: { origem: { op: 'unir', id: 9 } }, cor: '#ff0000' }]]);
    expect(pintada.orfaos).toEqual([]);
    for (const f of pintada.F.values()) expect(f.cor).toBe('#ff0000');
  });

  it('face não tocada mantém id e cantos; face cortada mantém o id', () => {
    const r = n();
    // A: fundo(0), tras(2), esquerda(5); B: topo(1001), direita(1003), frente(1004)
    for (const id of [0, 2, 5, 1001, 1003, 1004]) expect(r.F.get(id).vs).toEqual(antes.F.get(id).vs);
    // cortadas: A topo(1), direita(3), frente(4); B fundo(1000), tras(1002), esquerda(1005)
    for (const id of [1, 3, 4, 1000, 1002, 1005]) expect(r.F.has(id)).toBe(true);
  });

  it('pedaço a mais herda material e parte da face de onde veio', () => {
    const r = nucleo([...DOIS_CUBOS,
      ['parte', { sel: { origem: A }, nome: 'coluna' }], ['parte', { sel: { origem: B }, nome: 'braco' }],
      ['unir', { origemId: 9, solidos: [{ origem: A }, { origem: B }] }]]);
    expect(r.orfaos).toEqual([]);
    for (const f of r.F.values()) {
      if (f.id < 1000) expect(f.parte).toBe('coluna');
      else if (f.id < 2000) expect(f.parte).toBe('braco');
      else expect(['coluna', 'braco']).toContain(f.parte);
    }
    expect([...r.F.keys()].some((id) => id >= 2000)).toBe(true);
  });

  it('a costura é selecionável e só tem faces que tocam o encontro', () => {
    const r = nucleo([...com('unir'), ['pincel', { modo: 'face', sel: { origem: { op: 'unir', id: 9, costura: true } }, cor: '#00ff00' }]]);
    expect(r.orfaos).toEqual([]);
    const verdes = [...r.F.values()].filter((f) => f.cor === '#00ff00');
    expect(verdes.length).toBeGreaterThan(0);
    for (const id of [0, 2, 5, 1001, 1003, 1004]) expect(r.F.get(id).cor).toBeNull();
  });

  it('costura com valor que não seja true grita', () => {
    const r = nucleo([...com('unir'), ['pincel', { modo: 'face', sel: { origem: { op: 'unir', id: 9, costura: 1 } }, cor: '#00ff00' }]]);
    expect(r.orfaos.some((o: any) => /costura opcional/.test(o.motivo))).toBe(true);
  });
});

describe('casos difíceis', () => {
  it('sólidos que só encostam numa face: fecha, volume 2, as faces de contato são consumidas', () => {
    const base = [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [1, 0, 0] }]];
    const r = nucleo(com('unir', undefined, base));
    expect(r.orfaos).toEqual([]);
    expect(arestasAbertas(r)).toBe(0);
    expect(Math.abs(volume(r) - 2) / 2).toBeLessThan(1e-3);
    expect(r.F.has(3)).toBe(false);      // direita de A
    expect(r.F.has(1005)).toBe(false);   // esquerda de B
    const citada = nucleo([...com('unir', undefined, base), ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 1, face: 'direita' } }, cor: '#000000' }]]);
    expect(citada.orfaos.some((o: any) => /consumida pelo unir do passo 2/.test(o.motivo))).toBe(true);
  });

  it('faces coplanares: fundo e topo no mesmo plano, fecha e dá 1,75', () => {
    const base = [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [0.5, 0, 0.5] }]];
    const r = nucleo(com('unir', undefined, base));
    expect(r.orfaos).toEqual([]);
    expect(arestasAbertas(r)).toBe(0);
    expect(Math.abs(volume(r) - 1.75) / 1.75).toBeLessThan(1e-3);
  });

  it('união de três sólidos', () => {
    const base = [...DOIS_CUBOS, ['cubo', { origemId: 3, lado: 1, em: [-0.5, 0.5, 0.5] }]];
    const r = nucleo(com('unir', [{ origem: A }, { origem: B }, { origem: { op: 'cubo', id: 3 } }], base));
    expect(r.orfaos).toEqual([]);
    expect(arestasAbertas(r)).toBe(0);
    // A ∪ B = 1,875; C cruza A em 0,5·0,5·0,5 = 0,125 e B em 0 (só encosta), total 2,75
    expect(Math.abs(volume(r) - 2.75) / 2.75).toBeLessThan(1e-3);
  });

  it('subtração passante: um furo quadrado atravessa o cubo, a malha fecha com genus 1', () => {
    const base = [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, larg: 0.4, alt: 2, prof: 0.4, em: [0, -0.5, 0] }]];
    const r = nucleo(com('subtrair', undefined, base));
    expect(r.orfaos).toEqual([]);
    expect(arestasAbertas(r)).toBe(0);
    expect(Math.abs(volume(r) - 0.84) / 0.84).toBeLessThan(1e-3);
    expect(facesDentro(r, { min: [-0.2, 0, -0.2], max: [0.2, 1, 0.2] })).toBe(0);
    // fundo e topo de B ficaram fora da peça: consumidas
    expect(r.F.has(1000)).toBe(false);
    expect(r.F.has(1001)).toBe(false);
  });

  it('subtrair: as faces de A que não encostam em B mantêm id e cantos', () => {
    const antes = nucleo(DOIS_CUBOS);
    const r = nucleo(com('subtrair'));
    expect(r.orfaos).toEqual([]);
    expect(arestasAbertas(r)).toBe(0);
    expect(Math.abs(volume(r) - 0.875) / 0.875).toBeLessThan(1e-3);
    for (const id of [0, 2, 5]) expect(r.F.get(id).vs).toEqual(antes.F.get(id).vs);
  });

  it('intersectar: fica só o cubo comum de 0,5', () => {
    const r = nucleo(com('intersectar'));
    expect(r.orfaos).toEqual([]);
    expect(arestasAbertas(r)).toBe(0);
    expect(Math.abs(volume(r) - 0.125) / 0.125).toBeLessThan(1e-3);
    const citada = nucleo([...com('intersectar'), ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 1, face: 'fundo' } }, cor: '#000000' }]]);
    expect(citada.orfaos.some((o: any) => /consumida pelo intersectar do passo 2/.test(o.motivo))).toBe(true);
  });

  it('interseção vazia grita e não muda a malha', () => {
    const base = [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [5, 0, 0] }]];
    const r = nucleo(com('intersectar', undefined, base));
    expect(r.orfaos.map((o: any) => o.motivo).join()).toMatch(/interseção é vazia/);
    expect(JSON.stringify(neutroCanonico({ ...r, orfaos: [] }))).toBe(JSON.stringify(neutroCanonico({ ...nucleo(base), orfaos: [] })));
  });

  it('sólido aberto grita e o passo não muda nada', () => {
    const base = [['cubo', { origemId: 1, lado: 1 }], ['plano', { origemId: 2, largura: 1, profundidade: 1, em: [0, 0.5, 0] }]];
    const r = nucleo(com('unir', [{ origem: A }, { origem: { op: 'plano', id: 2 } }], base));
    expect(r.orfaos.map((o: any) => o.motivo).join()).toMatch(/não é fechado/);
    expect(r.F.size).toBe(nucleo(base).F.size);
  });

  it('seleções que dividem face gritam', () => {
    const r = nucleo(com('unir', [{ origem: A }, { tudo: true }]));
    expect(r.orfaos.map((o: any) => o.motivo).join()).toMatch(/cada face pertence a um sólido só/);
  });

  it('origemId e duas seleções são obrigatórios', () => {
    expect(nucleo([...DOIS_CUBOS, ['unir', { solidos: [{ origem: A }, { origem: B }] }]]).orfaos[0].motivo).toMatch(/origemId é obrigatório/);
    expect(nucleo([...DOIS_CUBOS, ['unir', { origemId: 9, solidos: [{ origem: A }] }]]).orfaos[0].motivo).toMatch(/duas ou mais/);
  });

  it('um sólido soldado de faces com cantos repetidos (esfera, cilindro por alias) entra', () => {
    const base = [['cubo', { origemId: 1, lado: 1 }], ['cilindro', { origemId: 2, raio: 0.3, altura: 2, lados: 16, em: [0.5, -0.5, 0] }]];
    const alias = [['cil', { unir: [{ origem: { op: 'cilindro', id: 2 } }, { origem: { op: 'cilindro', id: 2, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: 2, tampa: 'topo' } }] }]];
    const r = nucleo([...base, ['unir', { origemId: 9, solidos: [{ origem: A }, { alias: 'cil' }] }]], {}, {}, {}, null, alias);
    expect(r.orfaos).toEqual([]);
    expect(arestasAbertas(r)).toBe(0);
  });
});

/* Regressões da revisão adversarial de 2026-09-29. */
describe('revisão adversarial', () => {
  const planoDe = (n: N, vs: number[]) => {
    let x = 0, y = 0, z = 0;
    for (let k = 0; k < vs.length; k++) {
      const c = pos(n, vs[k]), d = pos(n, vs[(k + 1) % vs.length]);
      x += (c[1] - d[1]) * (c[2] + d[2]); y += (c[2] - d[2]) * (c[0] + d[0]); z += (c[0] - d[0]) * (c[1] + d[1]);
    }
    const l = Math.hypot(x, y, z), nn = [x / l, y / l, z / l], p = pos(n, vs[0]);
    return { n: nn, d: nn[0] * p[0] + nn[1] * p[1] + nn[2] * p[2] };
  };
  const dist = (pl: any, p: number[]) => Math.abs(pl.n[0] * p[0] + pl.n[1] * p[1] + pl.n[2] * p[2] - pl.d);

  it('operando fora da precisão do Float32 grita em vez de sumir em silêncio', () => {
    const base = [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [1e12, 0, 0] }]];
    const r = nucleo(com('unir', undefined, base));
    expect(r.orfaos.map((o: any) => o.motivo).join()).toMatch(/precisão útil/);
    expect(r.F.size).toBe(12);
  });

  it('peça deslocada para longe da origem é unida em coordenada local', () => {
    const base = [['cubo', { origemId: 1, lado: 10, em: [3000, 0, 0] }], ['cubo', { origemId: 2, lado: 0.0005, em: [3004, 9.9999, 0] }]];
    const r = nucleo(com('unir', undefined, base));
    expect(r.orfaos).toEqual([]);
    expect(arestasAbertas(r)).toBe(0);
    expect(r.F.size).toBeGreaterThan(6);
  });

  for (const d of [0, 1000]) it(`toda face resultante fica no plano da face de origem dentro de 1e-12 (deslocamento ${d})`, () => {
    const base = [['cubo', { origemId: 1, lado: 1, em: [0.1 + d, 0.1, 0.1] }], ['cubo', { origemId: 2, lado: 1, em: [0.6 + d, 0.6, 0.6] }]];
    for (const op of ['unir', 'subtrair', 'intersectar']) {
      const antes = nucleo(base);
      const planos = [...antes.F.values()].map((f: any) => [f.id, planoDe(antes, f.vs)] as const);
      const r = nucleo(com(op, undefined, base));
      expect(r.orfaos).toEqual([]);
      for (const f of r.F.values()) {
        const candidatos = f.id < 2000 ? planos.filter(([id]) => id === f.id) : planos;
        const melhor = Math.min(...candidatos.map(([, pl]) => Math.max(...f.vs.map((v: number) => dist(pl, pos(r, v))))));
        expect(melhor, `${op}: face ${f.id}`).toBeLessThan(1e-12);
      }
    }
  });

  it('sólidos idênticos: vence o primeiro, 6 faces e 8 cantos, e moveF não rasga', () => {
    const base = [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1 }]];
    const r = nucleo(com('unir', undefined, base));
    expect(r.orfaos).toEqual([]);
    expect(r.F.size).toBe(6);
    expect(r.V.size).toBe(8);
    expect([...r.F.keys()].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5]);
    const m = nucleo([...com('unir', undefined, base), ['moveF', { face: 1, d: [0, 0.3, 0] }]]);
    expect(m.orfaos).toEqual([]);
    expect(arestasAbertas(m)).toBe(0);
    expect(Math.abs(volume(m) - 1.3)).toBeLessThan(1e-9);
  });

  it('face coplanar sobreposta: a do primeiro operando vence e a do segundo é consumida', () => {
    const base = [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [0.5, 0, 0] }]];
    const r = nucleo(com('unir', undefined, base));
    expect(r.orfaos).toEqual([]);
    expect(arestasAbertas(r)).toBe(0);
    expect(Math.abs(volume(r) - 1.5)).toBeLessThan(1e-9);
    for (const f of r.F.values()) {
      if (f.id >= 1000 && f.id < 2000) {
        // face de B que sobrou não pode estar no plano de fundo/topo/tras/frente de A dentro de A
        const c = [0, 1, 2].map((k) => f.vs.reduce((s: number, v: number) => s + pos(r, v)[k], 0) / f.vs.length);
        expect(c[0] > 0.5 - 1e-9 || c[0] < -0.5 + 1e-9).toBe(true);
      }
    }
  });

  it('face degenerada de lathe (anel colapsado no polo) longe da costura fica como estava', () => {
    const base = [['lathe', { origemId: 1, perfil: [[0, 0], [1e-12, 0], [0.3, 0], [0.3, 1], [0, 1]], lados: 8 }], ['cubo', { origemId: 2, lado: 0.4, em: [0.3, 0.3, 0] }]];
    const antes = nucleo(base);
    const r = nucleo([...base, ['unir', { origemId: 9, solidos: [{ origem: { op: 'lathe', id: 1 } }, { origem: B }] }]]);
    expect(r.orfaos).toEqual([]);
    for (let id = 0; id < 8; id++) expect(r.F.get(id)?.vs).toEqual(antes.F.get(id).vs);
  });
});
