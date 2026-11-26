/* descrever-partes.test.mjs — a relação entre partes confirmada corpo a corpo.
 *
 * A parte inteira vira um só sólido, e isso erra quando dois corpos da mesma parte se sobrepõem (a contagem de cruzamentos do raio se anula) e quando um corpo
 * de malha aberta torna a parte inteira inconclusiva mesmo longe da outra parte. Quando a parte inteira diz `interpenetram` ou `inconclusivo`, a relação é
 * refeita corpo a corpo, só nos pares de corpos cujas caixas se tocam. Os corpos aqui são prismas; o corpo em L é não convexo, e por isso a caixa dele
 * invade a outra parte enquanto o sólido só a encosta.
 */
import { describe, expect, it } from 'vitest';
import { descreverPeca } from './descrever-partes.js';

const retangulo = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const L = [[0, 0], [4, 0], [4, 1], [1, 1], [1, 4], [0, 4]];

/* cada corpo é [parte, polígono no plano xy (anti-horário), z0, z1, semTopo?]; corpos não compartilham vértice */
function criarNeutro(corpos) {
  const V = new Map(); const F = new Map();
  let v = 0; let f = 0;
  for (const [parte, poligono, z0, z1, semTopo = false] of corpos) {
    const n = poligono.length; const base = v;
    for (const [x, y] of poligono) V.set(v++, [x, y, z0]);
    for (const [x, y] of poligono) V.set(v++, [x, y, z1]);
    F.set(f, { id: f, vs: Array.from({ length: n }, (_, i) => base + n - 1 - i), parte }); f += 1;
    if (!semTopo) { F.set(f, { id: f, vs: Array.from({ length: n }, (_, i) => base + n + i), parte }); f += 1; }
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      F.set(f, { id: f, vs: [base + i, base + j, base + n + j, base + n + i], parte }); f += 1;
    }
  }
  return { V, F };
}

const relacao = (neutro) => descreverPeca(neutro).relacoes.find((r) => r.a === 'a' && r.b === 'b');

describe('relação entre partes corpo a corpo', () => {
  it('dois corpos sobrepostos de uma parte, com a outra parte só encostando no nicho do L, encostam', () => {
    const r = relacao(criarNeutro([
      ['a', L, 0, 4],
      ['a', retangulo(1.5, 0.2, 3.5, 0.8), 1, 3],
      ['b', retangulo(2, 1, 3, 2), 1, 2],
    ]));
    expect(r.caixa.tipo).toBe('interpenetra');
    expect(r.solido).toBe('encostam');
    expect(r.tipo).toBe('encosta');
  });

  it('um corpo aberto longe da outra parte não torna a relação inconclusiva', () => {
    const r = relacao(criarNeutro([
      ['a', L, 0, 4],
      ['a', retangulo(20, 0, 21, 1), 0, 1, true],
      ['b', retangulo(2, 1, 3, 2), 1, 2],
    ]));
    expect(r.caixa.tipo).toBe('interpenetra');
    expect(r.solido).toBe('encostam');
    expect(r.tipo).toBe('encosta');
    expect(r.porCorpo).toBe(true);
    expect(r.motivoDoSolido).toBeUndefined();
  });

  it('um corpo aberto que toca a outra parte continua inconclusivo, com o motivo do corpo', () => {
    const r = relacao(criarNeutro([
      ['a', retangulo(0, 0, 4, 4), 0, 1, true],
      ['b', retangulo(2, 2, 3, 3), 0.5, 2],
    ]));
    expect(r.solido).toBe('inconclusivo');
    expect(r.motivoDoSolido.length).toBeGreaterThan(0);
  });

  it('a interpenetração real entre um corpo e a outra parte continua interpenetrando', () => {
    const r = relacao(criarNeutro([
      ['a', L, 0, 4],
      ['a', retangulo(1.5, 0.2, 3.5, 0.8), 1, 3],
      ['b', retangulo(2, 0.5, 3, 2), 1, 2],
    ]));
    expect(r.solido).toBe('interpenetram');
    expect(r.tipo).toBe('interpenetra');
  });

  it('o corpo B inteiro dentro de dois corpos sobrepostos de A, que a parte inteira dava como separadas, interpenetra', () => {
    const r = relacao(criarNeutro([
      ['a', L, 0, 4],
      ['a', retangulo(1.5, 0.2, 3.5, 0.8), 1, 3],
      ['b', retangulo(2, 0.3, 3, 0.7), 1.2, 1.8],
    ]));
    expect(r.caixa.tipo).toBe('interpenetra');
    expect(r.solido).toBe('interpenetram');
    expect(r.tipo).toBe('interpenetra');
    expect(r.porCorpo).toBe(true);
  });

  it('a relação refeita corpo a corpo é determinística', () => {
    const n = () => criarNeutro([
      ['a', L, 0, 4],
      ['a', retangulo(20, 0, 21, 1), 0, 1, true],
      ['b', retangulo(2, 1, 3, 2), 1, 2],
    ]);
    expect(descreverPeca(n())).toEqual(descreverPeca(n()));
  });
});
