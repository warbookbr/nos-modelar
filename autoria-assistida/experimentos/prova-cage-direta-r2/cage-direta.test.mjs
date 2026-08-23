/* Provas da primeira cage R2: quads explícitos, loop local e simetria. */
import { describe, expect, it } from 'vitest';
import { criarCageDireta, espelharCage, moverLoop } from './cage-direta.mjs';

describe('R2 — cage direta de forma global', () => {
  it('é uma malha explícita de quads, não uma varredura gerada por seções', () => {
    const cage = criarCageDireta();
    expect(cage.V.size).toBe(100);
    expect([...cage.F.values()]).toHaveLength(81);
    expect([...cage.F.values()].every((face) => face.vs.length === 4)).toBe(true);
    expect(cage.simetria.autorada).toBe('x >= 0');
  });
  it('uma edição semântica toca somente o loop pedido', () => {
    const cage = criarCageDireta(); const antes = [...cage.V].map(([id, p]) => [id, [...p]]);
    const depois = moverLoop(cage, 'linhaDeOmbro', [0, .025, 0]);
    for (const [id, ponto] of antes) expect(depois.V.get(id)[1] - ponto[1]).toBeCloseTo(cage.loops.linhaDeOmbro.v.includes(id) ? .025 : 0, 12);
  });
  it('insere a faixa sem reindexar os controles R2 já publicados', () => {
    const cage = criarCageDireta();
    const existentes = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 150, 100, 110, 120, 130, 140].flatMap((id) => [id, id + 1, id + 2, id + 3, id + 4]);
    expect([...cage.V.keys()]).toEqual(expect.arrayContaining(existentes));
    const antes = [...cage.V].map(([id, ponto]) => [id, [...ponto]]);
    const depois = moverLoop(cage, 'faixaVertical', [.01, -.02, .03]);
    for (const [id, ponto] of antes) depois.V.get(id).forEach((valor, eixo) => expect(valor - ponto[eixo]).toBeCloseTo(cage.loops.faixaVertical.v.includes(id) ? [.01, -.02, .03][eixo] : 0, 12));
  });
  it('aceita calibração descartável sem mudar a topologia autoral', () => {
    const base = criarCageDireta(); const calibrada = criarCageDireta({ pontos: { '1:1': [.36, .48] }, faixas: { 1: [.34, .39] }, z: { 1: 2.16 }, compensacao: { x: 1.08 } });
    expect(calibrada.V.get(11)[0]).toBeCloseTo(.36 * 1.08, 12);
    expect(calibrada.V.get(16)[1]).toBeCloseTo(.105 + (.39 - .105) * 1.0451535219747141, 12);
    expect(calibrada.V.get(11)[2]).toBe(2.16);
    expect(calibrada.F).toEqual(base.F);
    expect(calibrada.loops).toEqual(base.loops);
  });
  it('separa os controles globais sem criar arestas novas', () => {
    const cage = criarCageDireta();
    expect(Object.keys(cage.loops)).toEqual(expect.arrayContaining(['linhaDeCapo', 'anelAjustePonta', 'anelPonta', 'anelExpansaoDianteira', 'baseParabrisa', 'teto', 'larguraCabineCentral', 'linhaDeTeto', 'anelAjusteAnca', 'transicaoCabineTraseira', 'transicaoAncaTraseira', 'quedaTraseira', 'linhaDeOmbro', 'faixaVertical', 'cintura', 'linhaDeSoleira', 'ancaTraseira', 'larguraTampaTraseira', 'contornoNariz']));
    const arestas = new Set([...cage.F.values()].flatMap((face) => face.vs.map((a, i) => { const b = face.vs[(i + 1) % 4]; return a < b ? `${a}|${b}` : `${b}|${a}`; })));
    for (const { v, fechado } of Object.values(cage.loops)) for (let i = 0; i < (fechado ? v.length : v.length - 1); i += 1) {
      const a = v[i], b = v[(i + 1) % v.length]; const chave = a < b ? `${a}|${b}` : `${b}|${a}`;
      expect(arestas.has(chave)).toBe(true);
    }
  });
  it('declara vincos apenas nos controles de caráter da prova', () => {
    const cage = criarCageDireta();
    expect([...cage.vincos.values()]).toEqual(expect.arrayContaining(Array(cage.loops.linhaDeOmbro.v.length - 1).fill(1)));
    expect(cage.vincos.get('140|141')).toBe(1);
    expect(cage.vincos.get('130|140')).toBe(1);
    expect(cage.vincos.get('0|1')).toBe(1);
    expect(cage.vincos.get('0|10')).toBe(1);
    expect(cage.vincos.get('81|91')).toBe(1);
    expect(cage.vincos.get('73|83')).toBe(1);
    expect(cage.V.get(91)[0]).toBeCloseTo(.5740234375 * 1.0803511141120665, 12);
    expect(cage.V.get(91)[1]).toBeCloseTo(1.19, 3);
  });
  it('declara nariz afilado, cabine recuada e anca traseira dominante', () => {
    const cage = criarCageDireta();
    expect(cage.V.get(1)[0]).toBeLessThan(cage.V.get(31)[0]);
    expect(cage.V.get(82)[0]).toBeLessThan(cage.V.get(111)[0]);
    expect(cage.V.get(111)[0]).toBeGreaterThan(1);
    expect(cage.V.get(61)[2]).toBe(1.325);
    expect(cage.V.get(111)[2]).toBe(-1.325);
  });
  it('espelha a metade autorada sem duplicar a costura central', () => {
    const metade = criarCageDireta(); const inteira = espelharCage(metade);
    expect(inteira.V.size).toBeGreaterThan(metade.V.size);
    expect(new Set(inteira.V.keys()).size).toBe(inteira.V.size);
    expect(new Set(inteira.F.keys()).size).toBe(inteira.F.size);
    expect([...inteira.V.values()].filter(([x]) => x === 0)).toHaveLength(36);
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
