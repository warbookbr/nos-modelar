/* posicao.test.js — a fatia 5 do esboço 2.0: a posição sem conta (âncora, encosta até a malha tocar, alinha, pivô do giro), a
 * cópia pelo arranja e pelo espelha do núcleo, o relato de contatos com a medida do descrever, a conversão de mm e o exemplo da
 * ajuda, que monta. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { caixaDaMalha, receitaDaOpcao } from '../src/opcao.js';
import { argsEmMetro } from '../src/milimetro.js';
import { distanciaAteTocar } from '../src/geometria.js';
import { relatoDeContatos, textoDoRelato } from '../src/contatos.js';
import { EXEMPLO, montarOpcoes } from '../../../tools/modelar/esboco-nucleo.mjs';

const r3 = (x) => Math.round(x * 1000) / 1000 + 0;
const mm = (c) => ({ min: c.min.map((x) => r3(x * 1000)), max: c.max.map((x) => r3(x * 1000)) });
const caixa = (neutro, parte) => mm(caixaDaMalha(neutro, parte));
const recusa = (opcao) => { try { receitaDaOpcao(opcao); return null; } catch (e) { return e.message; } };
/* um corpo em L, visto de frente: o degrau de cima fica à esquerda, e a caixa do corpo vai até y 300 */
const L = { id: 'l', op: 'extrusao', args: { eixo: 'y', altura: 40, perfil: [[0, 0], [300, 0], [300, 100], [100, 100], [100, 300], [0, 300]] } };

describe('a posição sem conta', () => {
  it('centro por âncora, com "por": a base de uma forma no centro da face de cima de outra', () => {
    const { neutro } = receitaDaOpcao({ titulo: 't', formas: [{ id: 'a', op: 'cubo', args: { larg: 200, alt: 100, prof: 50 } }, { id: 'b', op: 'cubo', args: { lado: 20 }, centro: 'a.+y', por: '-y' }] });
    const a = caixa(neutro, 'a'); const b = caixa(neutro, 'b');
    expect(b.min[1]).toBe(a.max[1]);
    expect(b.min[0] + 10).toBe((a.min[0] + a.max[0]) / 2);
  });

  it('encosta leva a forma até a malha tocar, e não a caixa: no L, o bloco desce ao degrau de baixo', () => {
    /* o perfil [u, v] da extrusão em y vai a (x, z): o L fica no plano x-z; o bloco desce em z sobre o degrau baixo (z 100) */
    const bloco = { id: 'bloco', op: 'cubo', args: { larg: 80, alt: 40, prof: 50 }, encosta: { id: 'l', lado: '+z' }, alinha: { '+x': 'l' } };
    const { neutro, formas } = receitaDaOpcao({ titulo: 't', formas: [L, bloco] });
    const b = caixa(neutro, 'bloco');
    expect(b.max[0]).toBe(300);
    expect(b.min[2]).toBe(100);
    /* o ponta, pela caixa, o deixaria em z 300 */
    const ponta = receitaDaOpcao({ titulo: 't', formas: [L, { ...bloco, encosta: undefined, ponta: { id: 'l', lado: '+z' } }] });
    expect(caixa(ponta.neutro, 'bloco').min[2]).toBe(300);
    /* o relato dá o toque, e o encosta o declara */
    const r = relatoDeContatos(neutro, formas);
    expect(r.encostam.map((p) => [p.a, p.b].sort().join('-'))).toEqual(['bloco-l']);
    expect(r.encostam[0].esperado).toBe('encosta');
    expect(r.atravessam).toEqual([]);
  });

  it('o desloca no eixo do encosta é folga, e o encosta que não toca é recusado', () => {
    const bloco = { id: 'bloco', op: 'cubo', args: { lado: 50 }, encosta: { id: 'l', lado: '+z' }, alinha: { '-x': 'l' }, desloca: [0, 0, 5] };
    const { neutro } = receitaDaOpcao({ titulo: 't', formas: [L, bloco] });
    expect(caixa(neutro, 'bloco').min[2]).toBe(305);
    expect(recusa({ titulo: 't', formas: [L, { ...bloco, desloca: [0, 500, 0] }] })).toMatch(/não toca/);
  });

  it('alinha põe a face rente à da outra, cita outra face por âncora e centra pelo eixo', () => {
    const base = { id: 'a', op: 'cubo', args: { larg: 200, alt: 100, prof: 60 }, centro: [0, 50, 0] };
    const { neutro } = receitaDaOpcao({ titulo: 't', formas: [base, { id: 'b', op: 'cubo', args: { lado: 20 }, sobre: 'a', alinha: { '+z': 'a', '-x': 'a.+x' } }] });
    const a = caixa(neutro, 'a'); const b = caixa(neutro, 'b');
    expect(b.max[2]).toBe(a.max[2]);
    expect(b.min[0]).toBe(a.max[0]);
    expect(recusa({ titulo: 't', formas: [base, { id: 'b', op: 'cubo', args: { lado: 20 }, encosta: ['a', '+y'], alinha: { '-y': 'a' } }] })).toMatch(/é o do "encosta"/);
    expect(recusa({ titulo: 't', formas: [base, { id: 'b', op: 'cubo', args: { lado: 20 }, centro: 'a.+q' }] })).toMatch(/âncora/);
  });

  it('o giro com pivô vem depois da posição e gira em torno do ponto: a aresta do pivô não sai do lugar', () => {
    const braco = { id: 'braco', op: 'cubo', args: { larg: 50, alt: 600, prof: 24 }, centro: [0, 300, 12] };
    const cabeca = { id: 'cabeca', op: 'cubo', args: { larg: 70, alt: 180, prof: 15 }, encosta: { id: 'braco', lado: '+y' }, alinha: { '+z': 'braco' }, rotacao: { eixo: 'x', graus: -12, pivo: 'cabeca.-y-z' } };
    const { neutro, formas } = receitaDaOpcao({ titulo: 't', formas: [braco, cabeca] });
    const c = caixa(neutro, 'cabeca');
    expect(c.min[1]).toBe(600);
    /* o topo vai para trás: 180 mm de cabeça a 12 graus dão 37,42 mm em z */
    expect(r3(9 - c.min[2])).toBeCloseTo(180 * Math.sin((12 * Math.PI) / 180), 2);
    /* a aresta de baixo e de trás (y 600, z 9) é vértice da malha depois do giro */
    expect([...neutro.V.values()].filter((p) => Math.abs(p[1] - 0.6) < 1e-12 && Math.abs(p[2] - 0.009) < 1e-12).length).toBe(2);
    const r = relatoDeContatos(neutro, formas);
    expect(r.encostam).toHaveLength(1);
    expect(r.naoDeclaradas).toEqual([]);
  });
});

describe('a cópia pelo núcleo', () => {
  it('repete linear e radial é o arranja, e espelha é o espelha, com as cópias na parte da forma', () => {
    const pino = { id: 'pino', op: 'extrusao', args: { eixo: 'y', altura: 30, perfil: { circulo: { raio: 5 } } }, centro: [100, 0, 0], repete: { total: 3, d: [0, 0, 40] }, espelha: 'x' };
    const { receita, neutro } = receitaDaOpcao({ titulo: 't', formas: [pino] });
    expect(receita.PASSOS.map((p) => p[0])).toEqual(['extrusao', 'parte', 'transladar', 'arranja', 'espelha']);
    const c = caixa(neutro, 'pino');
    expect([c.min[0], c.max[0], c.min[2], c.max[2]]).toEqual([-105, 105, -5, 85]);
    const roda = { id: 'raio', op: 'cubo', args: { larg: 100, alt: 10, prof: 10 }, centro: [60, 0, 0], repete: { total: 4, eixo: 'y', volta: 360 } };
    const r = receitaDaOpcao({ titulo: 't', formas: [roda] });
    const q = caixa(r.neutro, 'raio');
    expect([q.min[0], q.max[0], q.min[2], q.max[2]]).toEqual([-110, 110, -110, 110]);
    expect(recusa({ titulo: 't', formas: [{ id: 'c', op: 'cilindro', args: { raio: 5, altura: 10 }, repete: { total: 2, d: [20, 0, 0] } }] })).toMatch(/extrusao de \{ circulo \}/);
  });
});

describe('o relato de contatos', () => {
  it('a travessia não declarada sai com a profundidade do descrever, e a declarada não', () => {
    const a = { id: 'a', op: 'cubo', args: { lado: 100 }, centro: [0, 0, 0] };
    const b = { id: 'b', op: 'cubo', args: { lado: 100 }, centro: [90, 0, 0] };
    const montar = (extra) => { const r = receitaDaOpcao({ titulo: 't', formas: [a, { ...b, ...extra }] }); return relatoDeContatos(r.neutro, r.formas); };
    const sem = montar({});
    expect(sem.atravessam).toHaveLength(1);
    expect(r3(sem.atravessam[0].mm)).toBe(10);
    expect(sem.naoDeclaradas).toHaveLength(1);
    expect(textoDoRelato(sem)).toMatch(/atravessa {2}a e b: 10,000 mm pelo eixo x \(NÃO DECLARADA\)/);
    expect(montar({ contato: { a: 'atravessa' } }).naoDeclaradas).toEqual([]);
    /* o esperado que a malha não dá */
    const longe = montar({ centro: [115, 0, 0], contato: { a: 'encosta' } });
    expect(longe.folgas[0].mm).toBeCloseTo(15, 9);
    expect(longe.faltam).toEqual([{ a: 'a', b: 'b', esperado: 'encosta', dado: 'folga' }]);
  });

  it('a guitarra da prova: o braço no corpo, a cabeça no braço e a ponte no corpo, sem travessia, nas duas opções', () => {
    const esboco = JSON.parse(readFileSync(new URL('../../../docs/modelar/banco-de-provas/esboco-pelo-nucleo-2026-11-05/guitarra.esboco.json', import.meta.url), 'utf8'));
    const r = montarOpcoes(esboco);
    expect(r.recusas).toEqual([]);
    for (const p of r.paineis) {
      expect(p.contatos.encostam.map((q) => `${q.a}-${q.b}`).sort()).toEqual(['braco-cabeca', 'braco-corpo', 'corpo-ponte']);
      expect(p.contatos.atravessam).toEqual([]);
      expect(p.contatos.faltam).toEqual([]);
    }
  });
});

describe('o 2.0 em mm', () => {
  it('a medida se divide por mil e o resto passa; o campo com número que a tabela não conhece é recusado', () => {
    expect(argsEmMetro('extrusao', { origemId: 3, eixo: 'z', altura: 45, segmentosSpline: 8, perfil: { contorno: { inicio: [30, 330], trechos: [{ arco: { centro: [0, 0], angulo: 90 } }, { spline: [[100, 0]] }] } } }))
      .toEqual({ origemId: 3, eixo: 'z', altura: 0.045, segmentosSpline: 8, perfil: { contorno: { inicio: [0.03, 0.33], trechos: [{ arco: { centro: [0, 0], angulo: 90 } }, { spline: [[0.1, 0]] }] } } });
    expect(argsEmMetro('transladar', { d: [10, 0, 0], sel: { grupo: 'a', regiao: { min: [0, 0, 0], max: [1000, 1000, 1000] } } }).sel.regiao.max).toEqual([1, 1, 1]);
    const costura = argsEmMetro('arredondarCostura', { de: { op: 'unir', id: 1 }, raio: 10, raioMinimo: 3, afinarPontas: 40, regiao: { min: [0, 0, 0], max: [100, 200, 300] } });
    expect([costura.raio, costura.raioMinimo, costura.afinarPontas, costura.regiao.max]).toEqual([0.01, 0.003, 0.04, [0.1, 0.2, 0.3]]);
    expect(() => argsEmMetro('displace', { amplitude: 2 })).toThrow(/não está na tabela/);
    expect(() => argsEmMetro('cubo', { lado: ['*', 'a', 2] })).toThrow(/expressão/);
  });

  it('o exemplo da ajuda monta, com o braço e a cabeça encostados e nenhuma travessia', () => {
    const r = montarOpcoes(JSON.parse(EXEMPLO));
    expect(r.recusas).toEqual([]);
    const c = r.paineis[0].contatos;
    expect(c.encostam.map((q) => `${q.a}-${q.b}`).sort()).toEqual(['braco-cabeca', 'braco-corpo']);
    expect(c.atravessam).toEqual([]);
  });
});

describe('a distância até tocar', () => {
  it('aresta com aresta: duas barras cruzadas em x se tocam pelo meio, onde nenhum vértice cai sobre face', () => {
    const barra = (comp, eixo, z0) => {
      const [hx, hy] = eixo === 'x' ? [comp / 2, 1] : [1, comp / 2];
      const pts = []; for (const z of [z0, z0 + 2]) for (const [x, y] of [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]]) pts.push([x, y, z]);
      return { pts, faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]] };
    };
    /* duas barras em cruz, finas, giradas 45 graus em torno de z para que as arestas de baixo e de cima se cruzem */
    const girar = (m) => ({ ...m, pts: m.pts.map(([x, y, z]) => [(x - y) * Math.SQRT1_2, (x + y) * Math.SQRT1_2, z]) });
    expect(distanciaAteTocar(girar(barra(20, 'x', 10)), barra(20, 'x', 0), 'z', -1)).toBeCloseTo(8, 12);
    /* sem cruzamento na projeção não há toque */
    const longe = { pts: [[100, 100, 0], [101, 100, 0], [100, 101, 0]], faces: [[0, 1, 2]] };
    expect(distanciaAteTocar(barra(20, 'x', 10), longe, 'z', -1)).toBe(null);
  });
});
