/* serrilhado-da-costura.test.mjs — a régua mede a direção que vira e volta na linha onde as faces do arredondamento encontram o resto. */
import { describe, expect, it } from 'vitest';
import { facesDaCostura, linhasDaCostura, medirSerrilhadoDaCostura } from './serrilhado-da-costura.mjs';

/* uma fita de quadros: a linha y = 0 passa pelos x dados; os quadros de cima (y de 0 a 1) são a costura e os de baixo (y de -1 a 0) são o resto */
function fita(xs) {
  const V = new Map(), F = new Map();
  xs.forEach((x, i) => { V.set(`b${i}`, [x, -1, 0]); V.set(`l${i}`, [x, 0, 0]); V.set(`t${i}`, [x, 1, 0]); });
  const dentro = new Set();
  for (let i = 0; i + 1 < xs.length; i++) {
    F.set(`c${i}`, { id: `c${i}`, vs: [`l${i}`, `l${i + 1}`, `t${i + 1}`, `t${i}`], liso: true });
    F.set(`f${i}`, { id: `f${i}`, vs: [`b${i}`, `b${i + 1}`, `l${i + 1}`, `l${i}`], liso: false });
    dentro.add(`c${i}`);
  }
  return { neutro: { V, F }, dentro };
}

describe('régua de serrilhado da costura', () => {
  it('a linha reta e a curva que só avança dão zero pontas', () => {
    const reta = fita([0, 1, 2, 3, 4, 5, 6]);
    expect(medirSerrilhadoDaCostura(reta.neutro, { faces: reta.dentro })).toMatchObject({ pontas: 0, trechos: 0 });
    const escada = fita([0, 3, 3.3, 6.3, 6.6, 9.6]);
    expect(medirSerrilhadoDaCostura(escada.neutro, { faces: escada.dentro }).pontas).toBe(0);
  });

  it('a linha que vai, volta e segue tem uma ponta em cada meia-volta, e as duas formam um trecho só', () => {
    const { neutro, dentro } = fita([0, 1, 2, 3, 2.5, 3.5, 4.5, 5.5]);
    const m = medirSerrilhadoDaCostura(neutro, { faces: dentro });
    expect(m.linhas).toHaveLength(1);
    expect(m.pontas).toBe(2);
    expect(m.trechos).toBe(1);
    expect(m.linhas[0].vertices).toBe(8);
  });

  it('dois serrilhados longe um do outro são dois trechos', () => {
    const { neutro, dentro } = fita([0, 1, 2, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 6, 7, 8]);
    const m = medirSerrilhadoDaCostura(neutro, { faces: dentro });
    expect(m.pontas).toBe(4);
    expect(m.trechos).toBe(2);
  });

  it('o limite de virada é a meia-volta: 80 graus não conta, 100 graus conta', () => {
    const virar = (graus) => {
      const V = new Map(), F = new Map();
      const a = (graus * Math.PI) / 180;
      const pts = [[0, 0, 0], [1, 0, 0], [1 + Math.cos(a), Math.sin(a), 0]];
      pts.forEach((p, i) => { V.set(`l${i}`, p); V.set(`t${i}`, [p[0], p[1], 1]); V.set(`b${i}`, [p[0], p[1], -1]); });
      for (let i = 0; i < 2; i++) {
        F.set(`c${i}`, { id: `c${i}`, vs: [`l${i}`, `l${i + 1}`, `t${i + 1}`, `t${i}`], liso: true });
        F.set(`f${i}`, { id: `f${i}`, vs: [`b${i}`, `b${i + 1}`, `l${i + 1}`, `l${i}`], liso: false });
      }
      return { neutro: { V, F }, dentro: new Set(['c0', 'c1']) };
    };
    const a80 = virar(80), a100 = virar(100);
    expect(medirSerrilhadoDaCostura(a80.neutro, { faces: a80.dentro }).pontas).toBe(0);
    expect(medirSerrilhadoDaCostura(a100.neutro, { faces: a100.dentro }).pontas).toBe(1);
  });

  it('as faces da costura são as que o passo arredondarCostura criou e deixou lisas', () => {
    const neutro = {
      V: new Map(),
      F: new Map([[1, { id: 1, liso: 45 }], [2, { id: 2, liso: false }], [3, { id: 3, liso: 45 }], [4, { id: 4, liso: 45 }]]),
      procedencia: { faces: [
        [1, [{ passo: 4, operacao: 'mecanifica.operacao.arredondarCostura' }]],
        [2, [{ passo: 4, operacao: 'mecanifica.operacao.arredondarCostura' }]],
        [3, [{ passo: 2, operacao: 'mecanifica.operacao.lathe' }, { passo: 4, operacao: 'mecanifica.operacao.arredondarCostura' }]],
        [4, [{ passo: 7, operacao: 'mecanifica.operacao.arredondarCostura' }]],
      ] },
    };
    expect([...facesDaCostura(neutro)]).toEqual([1, 4]);
    expect([...facesDaCostura(neutro, { passo: 7 })]).toEqual([4]);
  });

  it('sem faces de costura a régua devolve zero, e a cadeia fechada de um anel não tem ponta', () => {
    expect(medirSerrilhadoDaCostura({ V: new Map(), F: new Map(), procedencia: { faces: [] } })).toMatchObject({ pontas: 0, trechos: 0, faces: 0 });
    const n = 12, V = new Map(), F = new Map();
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      V.set(`l${i}`, [Math.cos(a), Math.sin(a), 0]); V.set(`t${i}`, [2 * Math.cos(a), 2 * Math.sin(a), 0]); V.set(`b${i}`, [0.5 * Math.cos(a), 0.5 * Math.sin(a), 0]);
    }
    const dentro = new Set();
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      F.set(`c${i}`, { id: `c${i}`, vs: [`l${i}`, `l${j}`, `t${j}`, `t${i}`], liso: true }); dentro.add(`c${i}`);
      F.set(`f${i}`, { id: `f${i}`, vs: [`b${i}`, `b${j}`, `l${j}`, `l${i}`], liso: false });
    }
    const linhas = linhasDaCostura({ V, F }, dentro);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].fechada).toBe(true);
    expect(linhas[0].ids).toHaveLength(n);
    expect(medirSerrilhadoDaCostura({ V, F }, { faces: dentro })).toMatchObject({ pontas: 0, trechos: 0 });
  });
});
