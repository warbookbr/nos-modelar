import { describe, it, expect } from 'vitest';
import { descreverGesto } from './descricao-do-gesto.js';

/* Uma caixa de 1 m de lado com um anel no meio da altura, numa parte só. O anel
   existe porque sem ele a caixa tem dois níveis em y, e com dois níveis um
   arqueio e um esticão produzem exatamente os mesmos deslocamentos: nenhuma
   classificação separaria os dois, e a prova da dobra estaria medindo sorte. */
function caixa(nome = 'corpo') {
  const V = new Map();
  let id = 1;
  const cantos = [];
  for (const x of [0, 1]) for (const y of [0, 0.5, 1]) for (const z of [0, 1]) {
    V.set(id, [x, y, z]);
    cantos.push(id);
    id += 1;
  }
  const F = new Map([[1, { id: 1, vs: cantos, parte: nome }]]);
  return { V, F };
}

const mover = (neutro, fn) => ({
  V: new Map([...neutro.V].map(([id, p]) => [id, fn(p, id)])),
  F: new Map([...neutro.F].map(([id, f]) => [id, { ...f, vs: [...f.vs] }])),
});

const doCorpo = (resultado) => resultado.partes.find((p) => p.parte === 'corpo');

describe('descreverGesto', () => {
  it('malha intocada sai como parada', () => {
    const antes = caixa();
    const resultado = descreverGesto(antes, mover(antes, (p) => [...p]));
    expect(doCorpo(resultado).tipo).toBe('parada');
    expect(resultado.mexidas).toEqual([]);
  });

  it('translação pura sai como translação, com o deslocamento em milímetro', () => {
    const antes = caixa();
    const depois = mover(antes, ([x, y, z]) => [x + 0.02, y, z - 0.005]);
    const corpo = doCorpo(resultado(antes, depois));
    expect(corpo.tipo).toBe('translacao');
    expect(corpo.deslocamentoMm).toEqual([20, 0, -5]);
    expect(corpo.quantosAndaram).toBe(12);
  });

  it('giro de 90° em torno de y sai como rotação, com o ângulo certo', () => {
    const antes = caixa();
    const c = [0.5, 0.5, 0.5];
    const depois = mover(antes, ([x, y, z]) => [
      c[0] + (z - c[2]), y, c[2] - (x - c[0]),
    ]);
    const corpo = doCorpo(resultado(antes, depois));
    expect(corpo.tipo).toBe('rotacao');
    expect(corpo.eixo).toBe('y');
    expect(Math.abs(corpo.grausDoGiro)).toBeCloseTo(90, 3);
  });

  it('escala num eixo só sai como escala, e não como esticão', () => {
    const antes = caixa();
    const depois = mover(antes, ([x, y, z]) => [x, 0.5 + (y - 0.5) * 1.5, z]);
    const corpo = doCorpo(resultado(antes, depois));
    expect(corpo.tipo).toBe('escala');
    expect(corpo.fatores).toEqual([1, 1.5, 1]);
  });

  it('esticão com a base presa sai como esticão, dizendo qual ponta ficou', () => {
    const antes = caixa();
    const depois = mover(antes, ([x, y, z]) => [x + 0.03 * y, y, z]);
    const corpo = doCorpo(resultado(antes, depois));
    expect(corpo.tipo).toBe('esticao');
    expect(corpo.eixo).toBe('y');
    expect(corpo.pontaPresa).toBe('menor');
    expect(corpo.deslocamentoDaPontaMm).toEqual([30, 0, 0]);
  });

  it('arqueio sai como dobra, e não como esticão', () => {
    const antes = caixa();
    const depois = mover(antes, ([x, y, z]) => [x + 0.04 * y * y, y, z]);
    const corpo = doCorpo(resultado(antes, depois));
    expect(corpo.tipo).toBe('dobra');
    expect(corpo.eixo).toBe('y');
    expect(corpo.flechaMm).toBeCloseTo(40, 3);
  });

  it('com dois níveis no eixo, arqueio e esticão são os mesmos números, e sai esticão', () => {
    const chata = { V: new Map(), F: new Map() };
    let id = 1;
    const cantos = [];
    for (const x of [0, 1]) for (const y of [0, 1]) for (const z of [0, 1]) {
      chata.V.set(id, [x, y, z]); cantos.push(id); id += 1;
    }
    chata.F.set(1, { id: 1, vs: cantos, parte: 'corpo' });
    const depois = mover(chata, ([x, y, z]) => [x + 0.04 * y * y, y, z]);
    expect(doCorpo(resultado(chata, depois)).tipo).toBe('esticao');
  });

  it('vértices puxados cada um para um lado saem como sem padrão', () => {
    const antes = caixa();
    const sortidos = [[0.01, 0, 0], [0, -0.02, 0], [0, 0, 0.015], [0.004, 0.009, -0.003]];
    let i = 0;
    const depois = mover(antes, (p) => {
      const d = sortidos[i % sortidos.length];
      i += 1;
      return [p[0] + d[0], p[1] + d[1], p[2] + d[2]];
    });
    expect(doCorpo(resultado(antes, depois)).tipo).toBe('sem padrao');
  });

  it('parte que nasceu e parte que sumiu aparecem separadas do movimento', () => {
    const antes = caixa('tubo');
    const depois = caixa('aba');
    const saida = descreverGesto(antes, depois);
    expect(saida.nascidas).toEqual(['aba']);
    expect(saida.sumidas).toEqual(['tubo']);
    expect(saida.partes).toEqual([]);
  });

  it('a malha de entrada nunca é tocada', () => {
    const antes = caixa();
    const copia = new Map([...antes.V].map(([id, p]) => [id, [...p]]));
    descreverGesto(antes, mover(antes, ([x, y, z]) => [x + 0.5, y, z]));
    for (const [id, p] of copia) expect(antes.V.get(id)).toEqual(p);
  });
});

function resultado(antes, depois) {
  return descreverGesto(antes, depois);
}
