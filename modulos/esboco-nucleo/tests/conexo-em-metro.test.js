/* conexo-em-metro.test.js — o conversor de mm para metro do esboço e os passos `parte` com `onde.conexo` que `paineisPorVaos` devolve:
   `de` e `ate` são medidas e viram metro, `dir` é só direção, e a execução em metro dá as mesmas faces por parte que a execução em mm. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../../../procedural/nucleo/entrada.js';
import { paineisPorVaos } from '../../../procedural/nucleo/paineis-por-vaos.js';
import { RecusaDoEsboco, argsEmMetro, passoEmMetro } from '../src/milimetro.js';

const PLACA = { passos: [['cubo', { origemId: 1, larg: 600, alt: 1, prof: 400 }]], origem: { op: 'cubo', id: 1 } };
const ENTRADA = {
  chapa: PLACA, vao: 4,
  linhas: [{ eixo: 'y', pontos: [[0, -300], [0, 300]] }],
  paineis: [{ nome: 'e', eixo: 'y', ponto: [-150, 0] }, { nome: 'd', eixo: 'y', ponto: [150, 0] }],
};
const facesPorParte = (st) => {
  const n = {};
  for (const f of st.F.values()) if (f.parte) n[f.parte] = (n[f.parte] ?? 0) + 1;
  return n;
};

describe('o conversor de mm para metro e o conexo', () => {
  it('converte de e ate, deixa dir livre e não deixa passar o resto de onde com número', () => {
    const conexo = { de: [10, 20, 30], dir: [0, -1, 0], ate: 5 };
    const [, a] = passoEmMetro(['parte', { nome: 'p', sel: { origem: { op: 'subtrair', id: 9 }, onde: { conexo } } }]);
    expect(a.sel.onde.conexo).toEqual({ de: [0.01, 0.02, 0.03], dir: [0, -1, 0], ate: 0.005 });
    expect(a.sel.origem).toEqual({ op: 'subtrair', id: 9 });
    expect(() => argsEmMetro('parte', { nome: 'p', sel: { onde: { conexo, extremo: { eixo: 'y', lado: 'max', tol: 1 } } } })).toThrow(RecusaDoEsboco);
    expect(() => argsEmMetro('parte', { nome: 'p', sel: { onde: { normal: { dir: [0, 1, 0], ate: 5 } } } })).toThrow(RecusaDoEsboco);
  });

  it('os passos do ajudante em mm passam pelo conversor, e a execução em metro dá as mesmas faces por parte', () => {
    const g = paineisPorVaos(ENTRADA);
    const metro = g.passos.map((p) => passoEmMetro(p));
    const emMm = nucleo(g.passos, {}, {});
    const emM = nucleo(metro, {}, {});
    expect(emM.orfaos).toEqual([]);
    expect(facesPorParte(emM)).toEqual(facesPorParte(emMm));
    expect(Object.keys(facesPorParte(emM)).sort()).toEqual(['d', 'e']);
  });

  it("saida: 'metro' dá os mesmos passos que o conversor dá aos de mm", () => {
    const mm = paineisPorVaos(ENTRADA);
    const m = paineisPorVaos({ ...ENTRADA, saida: 'metro' });
    const convertidos = mm.passos.slice(PLACA.passos.length).map((p) => passoEmMetro(p));
    const a = JSON.stringify(convertidos); const b = JSON.stringify(m.passos);
    expect(JSON.parse(b)).toEqual(JSON.parse(a).map(([op, args]) => [op, args]));
  });
});
