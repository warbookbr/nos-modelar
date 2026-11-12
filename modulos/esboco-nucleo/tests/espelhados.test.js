/* espelhados.test.js — o par de partes Dir e Esq que medem diferente aparece como assimetria no relato de contatos. O sedã de alta definição
   chegou ao modo estrito com o montante C direito em folga com a porta e o esquerdo em travessia de 4,107 mm, e a recusa parecia de uma
   declaração; a causa era a medida de contatos dar vereditos diferentes a dois lados que são imagem um do outro (ciclo 5, atrito 4). */
import { describe, expect, it } from 'vitest';
import { relatoDeContatos, textoDoRelato } from '../src/contatos.js';

function cubo(V, F, ini, fid, x0, parte, lado = 1) {
  const c = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  c.forEach((p, k) => V.set(ini + k, [x0 + p[0] * lado, p[1], p[2]]));
  [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].forEach((f, k) => F.set(fid + k, { id: fid + k, vs: (lado > 0 ? f : [...f].reverse()).map((v) => v + ini), parte }));
}
/* a e b do lado direito se atravessam (b entra 0,5 em a); do lado esquerdo, b fica a `vao` de a (a unidade é o metro) */
function neutro(vao) {
  const V = new Map(); const F = new Map();
  cubo(V, F, 0, 0, 0, 'aDir'); cubo(V, F, 10, 10, 0.5, 'bDir');
  cubo(V, F, 20, 20, 0, 'aEsq', -1); cubo(V, F, 30, 30, -(1 + vao), 'bEsq', -1);
  return { V, F, materiais: {}, avisos: [], orfaos: [] };
}

describe('relato de contatos: os pares espelhados medem igual', () => {
  it('o par que atravessa de um lado e fica a uma folga do outro sai como assimétrico, com os dois vereditos', () => {
    const r = relatoDeContatos(neutro(0.3));
    /* os pares de lados trocados (aDir com bEsq, aEsq com bDir) também diferem, porque a geometria do exemplo é assimétrica */
    expect(r.assimetricas.find((d) => d.a === 'aDir' && d.b === 'bDir')).toMatchObject({ tipo: 'atravessa', espelho: { a: 'aEsq', b: 'bEsq', tipo: 'folga' } });
    expect(textoDoRelato(r)).toMatch(/ASSIMÉTRICO aDir e bDir: atravessa.*; o par espelhado, aEsq e bEsq: folga/);
  });

  it('os dois lados iguais não dão assimetria', () => {
    const V = new Map(); const F = new Map();
    cubo(V, F, 0, 0, 0, 'aDir'); cubo(V, F, 10, 10, 0.5, 'bDir');
    cubo(V, F, 20, 20, 0, 'aEsq', -1); cubo(V, F, 30, 30, -0.5, 'bEsq', -1);
    expect(relatoDeContatos({ V, F, materiais: {}, avisos: [], orfaos: [] }).assimetricas).toEqual([]);
  });

  it('a folga que muda mais de 0,5 mm de um lado ao outro é assimetria', () => {
    const V = new Map(); const F = new Map();
    cubo(V, F, 0, 0, 0, 'aDir'); cubo(V, F, 10, 10, 1.3, 'bDir');
    cubo(V, F, 20, 20, 0, 'aEsq', -1); cubo(V, F, 30, 30, -1.31, 'bEsq', -1);
    const r = relatoDeContatos({ V, F, materiais: {}, avisos: [], orfaos: [] });
    expect(r.assimetricas.find((d) => d.a === 'aDir' && d.b === 'bDir')).toMatchObject({ tipo: 'folga', espelho: { a: 'aEsq', b: 'bEsq', tipo: 'folga' } });
  });
});
