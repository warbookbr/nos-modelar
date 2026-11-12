/* solido-inconclusivo.test.js — o relato de contatos diz por que a parte ficou inconclusiva. A face de cantos alinhados que o corte deixa
   fazia o relato escrever só "sólido inconclusivo" e dar travessia com tudo o que fica perto (ciclo 5 do sedã, atrito 4); agora a linha traz
   a parte, a face e o motivo, e a face dos cinco cantos na reta (a que a `limparLascas` não tirava) sai nomeada. */
import { describe, expect, it } from 'vitest';
import { relatoDeContatos, textoDoRelato } from '../src/contatos.js';

function cubo(V, F, ini, fid, x, parte) {
  const c = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  c.forEach((p, k) => V.set(ini + k, [p[0] + x, p[1], p[2]]));
  [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].forEach((f, k) => F.set(fid + k, { id: fid + k, vs: f.map((v) => v + ini), parte }));
}

function neutroComFaceDegenerada(cantos) {
  const V = new Map(); const F = new Map();
  cubo(V, F, 0, 0, 0, 'a'); cubo(V, F, 100, 100, 0.5, 'b');
  const ids = cantos.map((p, k) => { V.set(200 + k, p); return 200 + k; });
  F.set(300, { id: 300, vs: ids, parte: 'b' });
  return { V, F, materiais: {}, avisos: [], orfaos: [] };
}

describe('relato de contatos: o motivo do sólido inconclusivo', () => {
  it('a face de cinco cantos na mesma reta é nomeada, com a parte e os cantos', () => {
    const r = relatoDeContatos(neutroComFaceDegenerada([[0.5, 0, 0], [0.6, 0, 0], [0.7, 0, 0], [0.8, 0, 0], [0.9, 0, 0]]));
    const par = r.pares.find((p) => p.a === 'a' && p.b === 'b');
    expect(par.solido).toBe('inconclusivo');
    expect(par.motivoDoSolido).toHaveLength(1);
    expect(par.motivoDoSolido[0]).toMatch(/^b: b\.F\[300\]: face degenerada não permite triangulação \(5 cantos, área /);
    expect(textoDoRelato(r)).toMatch(/sólido inconclusivo \(b: b\.F\[300\]: face degenerada/);
  });

  it('o triângulo sem área diz qual face o deixou', () => {
    const r = relatoDeContatos(neutroComFaceDegenerada([[0.5, 0, 0], [0.75, 0, 0], [1.5, 0, 0]]));
    expect(textoDoRelato(r)).toMatch(/sólido inconclusivo \(b: triangulo-degenerado: a face b\.F\[300\] tem 3 cantos/);
  });

  it('o sólido conclusivo não leva motivo', () => {
    const V = new Map(); const F = new Map();
    cubo(V, F, 0, 0, 0, 'a'); cubo(V, F, 100, 100, 0.5, 'b');
    const r = relatoDeContatos({ V, F, materiais: {}, avisos: [], orfaos: [] });
    for (const p of r.pares) expect(p.motivoDoSolido).toBeUndefined();
    expect(r.pares[0].solido).not.toBe('inconclusivo');
  });
});
