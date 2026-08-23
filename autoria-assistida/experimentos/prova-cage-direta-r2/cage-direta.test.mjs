/* Provas da primeira cage R2: quads explícitos, loop local e simetria. */
import { describe, expect, it } from 'vitest';
import { criarCageDireta, espelharCage, moverLoop } from './cage-direta.mjs';

describe('R2 — cage direta de forma global', () => {
  it('é uma malha explícita de quads, não uma varredura gerada por seções', () => {
    const cage = criarCageDireta();
    expect(cage.V.size).toBe(72);
    expect([...cage.F.values()]).toHaveLength(56);
    expect([...cage.F.values()].every((face) => face.vs.length === 4)).toBe(true);
    expect(cage.simetria.autorada).toBe('x >= 0');
  });
  it('uma edição semântica toca somente o loop pedido', () => {
    const cage = criarCageDireta(); const antes = [...cage.V].map(([id, p]) => [id, [...p]]);
    const depois = moverLoop(cage, 'linhaDeOmbro', [0, .025, 0]);
    for (const [id, ponto] of antes) expect(depois.V.get(id)[1] - ponto[1]).toBeCloseTo(cage.loops.linhaDeOmbro.v.includes(id) ? .025 : 0, 12);
  });
  it('separa os controles globais sem criar arestas novas', () => {
    const cage = criarCageDireta();
    expect(Object.keys(cage.loops)).toEqual(expect.arrayContaining(['linhaDeCapo', 'anelPonta', 'anelExpansaoDianteira', 'baseParabrisa', 'teto', 'larguraCabineCentral', 'linhaDeTeto', 'transicaoCabineTraseira', 'quedaTraseira', 'linhaDeOmbro', 'cintura', 'linhaDeSoleira', 'ancaTraseira', 'larguraTampaTraseira', 'contornoNariz']));
    const arestas = new Set([...cage.F.values()].flatMap((face) => face.vs.map((a, i) => { const b = face.vs[(i + 1) % 4]; return a < b ? `${a}|${b}` : `${b}|${a}`; })));
    for (const { v, fechado } of Object.values(cage.loops)) for (let i = 0; i < (fechado ? v.length : v.length - 1); i += 1) {
      const a = v[i], b = v[(i + 1) % v.length]; const chave = a < b ? `${a}|${b}` : `${b}|${a}`;
      expect(arestas.has(chave)).toBe(true);
    }
  });
  it('declara vincos apenas nos controles de caráter da prova', () => {
    const cage = criarCageDireta();
    expect([...cage.vincos.values()]).toEqual(expect.arrayContaining(Array(cage.loops.linhaDeOmbro.v.length - 1).fill(1)));
    expect(cage.vincos.get('130|131')).toBe(1);
    expect(cage.vincos.get('120|130')).toBe(1);
    expect(cage.vincos.get('0|1')).toBe(1);
    expect(cage.vincos.get('0|10')).toBe(1);
    expect(cage.vincos.get('71|81')).toBe(1);
    expect(cage.vincos.get('63|73')).toBe(1);
    expect(cage.V.get(81)[0]).toBeCloseTo(.625, 3);
    expect(cage.V.get(81)[1]).toBeCloseTo(1.19, 3);
  });
  it('declara nariz afilado, cabine recuada e anca traseira dominante', () => {
    const cage = criarCageDireta();
    expect(cage.V.get(1)[0]).toBeLessThan(cage.V.get(21)[0]);
    expect(cage.V.get(72)[0]).toBeLessThan(cage.V.get(101)[0]);
    expect(cage.V.get(101)[0]).toBeGreaterThan(1);
    expect(cage.V.get(51)[2]).toBe(1.325);
    expect(cage.V.get(101)[2]).toBe(-1.325);
  });
  it('espelha a metade autorada sem duplicar a costura central', () => {
    const metade = criarCageDireta(); const inteira = espelharCage(metade);
    expect(inteira.V.size).toBeGreaterThan(metade.V.size);
    expect(new Set(inteira.V.keys()).size).toBe(inteira.V.size);
    expect(new Set(inteira.F.keys()).size).toBe(inteira.F.size);
    expect([...inteira.V.values()].filter(([x]) => x === 0)).toHaveLength(30);
    expect([...inteira.F.values()].some((face) => face.parte === 'assoalho')).toBe(true);
  });
  it('fecha o envelope: toda aresta pertence exatamente a duas faces', () => {
    const inteira = espelharCage(criarCageDireta()); const usos = new Map();
    for (const face of inteira.F.values()) for (let i = 0; i < 4; i += 1) {
      const a = face.vs[i], b = face.vs[(i + 1) % 4]; const chave = a < b ? `${a}|${b}` : `${b}|${a}`;
      usos.set(chave, (usos.get(chave) ?? 0) + 1);
    }
    expect([...usos.values()].filter((total) => total !== 2)).toEqual([]);
  });
});
