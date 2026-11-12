/* paineis-por-vaos-separa.test.ts — a prova de separação de cada linha, a curva que corre sobre a borda, o fundo da lâmina contra a pele de dentro e as mensagens do corte.
   Fixtures sem domínio: uma chapa de sela subdividida de 1 mm de espessura, a lâmina de estações escritas à mão e a chapa em L de `fixtures/chapa-em-l-prova.js`. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { paineisPorVaos } from './paineis-por-vaos.js';
// @ts-expect-error — núcleo em JavaScript.
import { varrer } from './lamina-sobre-a-superficie.js';
// @ts-expect-error — fixture em JavaScript.
import { chapaEmL } from './fixtures/chapa-em-l-prova.js';
// @ts-expect-error — núcleo em JavaScript.
import { curvaDaGaiola } from './curva-da-gaiola.js';

const casca = (f: (x: number, z: number) => number, N = 9, niveis = 2) => {
  const vertices: number[][] = []; const faces: number[][] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x = -200 + (400 * i) / (N - 1); const z = -200 + (400 * j) / (N - 1); vertices.push([x, f(x, z), z]); }
  for (let i = 0; i < N - 1; i++) for (let j = 0; j < N - 1; j++) { const a = i * N + j; faces.push([a, a + 1, a + N + 1, a + N]); }
  return { passos: [['subdivisao', { origemId: 1, vertices, faces, niveis, espessura: 1 }]], origem: { op: 'subdivisao', id: 1 } };
};
const sela = (x: number, z: number) => (x * x - z * z) / 300;
const reta = (x0: number, z0: number, x1: number, z1: number, n = 30) => Array.from({ length: n + 1 }, (_, k) => { const x = x0 + ((x1 - x0) * k) / n; const z = z0 + ((z1 - z0) * k) / n; return [x, sela(x, z), z]; });
const grito = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as Error).message; } throw new Error('não gritou'); };
const A = { nome: 'a', eixo: 'y', ponto: [-150, 0] }; const B = { nome: 'b', eixo: 'y', ponto: [150, 0] };

describe('cada linha prova que separa', () => {
  const C = casca(sela);
  const separa = { nome: 'vista', eixo: 'y', pontos: [[100, -300], [100, 300]] };
  const meio = { nome: 'meio', curva: reta(-50, -200, -50, 50), alem: [20, 0] };

  it('a curva que para no meio da chapa é recusada mesmo quando outra linha separa, nomeando a linha e o ponto da ponte', () => {
    const msg = grito(() => paineisPorVaos({ chapa: C, vao: 4, linhas: [meio, separa], paineis: [A, B] }));
    expect(msg).toMatch(/a linha 'meio' não separa os dois lados dela/);
    expect(msg).toMatch(/perto de \[-49,\d+, /);
  });

  it('separa: false declara o rasgo, e a linha que separa prova os pares em medidas.separacao', () => {
    const g = paineisPorVaos({ chapa: C, vao: 4, linhas: [{ ...meio, separa: false }, separa], paineis: [A, B] });
    expect(g.medidas.pedacos).toBe(2);
    expect(g.medidas.separacao.map((s: any) => s.nome)).toEqual(['vista']);
    expect(g.medidas.separacao[0].pares).toBeGreaterThan(5);
    expect(g.medidas.separacao[0].ponte).toBeNull();
    expect(grito(() => paineisPorVaos({ chapa: C, vao: 4, linhas: [{ ...meio, separa: 'nao' }, separa], paineis: [A, B] }))).toMatch(/separa da linha 'meio' é true ou false/);
  });

  it('a curva de borda a borda e a volta fechada provam; com conferir: false o aviso naoConferiu já diz que não conferiu', () => {
    const borda = paineisPorVaos({ chapa: C, vao: 4, linhas: [{ nome: 'x0', curva: reta(0, -200, 0, 200), alem: 20 }], paineis: [A, B] });
    expect(borda.medidas.separacao[0].ponte).toBeNull();
    const volta = (r: number) => Array.from({ length: 24 }, (_, k) => { const a = (2 * Math.PI * k) / 24; const x = 20 + r * Math.cos(a); const z = 10 + r * Math.sin(a); return [x, sela(x, z), z]; });
    const fechada = paineisPorVaos({ chapa: C, vao: 4, linhas: [{ nome: 'o', curva: volta(12), fechada: true }], paineis: [{ nome: 'fora', eixo: 'y', ponto: [-150, 0] }, { nome: 'dentro', eixo: 'y', ponto: [20, 10] }] });
    expect(fechada.medidas.separacao[0]).toMatchObject({ nome: 'o', ponte: null });
    const sem = paineisPorVaos({ chapa: C, vao: 4, linhas: [meio, separa], paineis: [A, B], conferir: false });
    expect(sem.avisos.map((a: any) => a.ref)).toContain('naoConferiu');
  });

  it('a curva que corre sobre a borda da chapa é recusada, e a que a cruza é aceita', () => {
    const msg = grito(() => paineisPorVaos({ chapa: C, vao: 4, linhas: [{ nome: 'rente', curva: reta(-199, -150, -199, 150), alem: 0 }], paineis: [A, B] }));
    expect(msg).toMatch(/a curva 'rente' corre sobre a borda da chapa por \d+/);
  });
});

describe('o fundo da lâmina contra a pele de dentro', () => {
  /* a linha reta em x sobre y = 0, normal +y, espessura lida de 1 mm; `alemDaPele` é a pele de dentro: o ponto está além dela quando fica abaixo de y = -4 */
  const estacoes = (n: number) => Array.from({ length: n }, (_, i) => ({ c: [10 * i, 0, 0], n: [0, 1, 0], cima: [0, 1, 0], esp: 1, mIn: [0, 0, -1], mOut: [0, 0, -1] }));
  const base = { fechada: false, largura: 4, profundidade: null, descarta: false, nome: 'l', cima: null };
  const fundo = (r: any) => Math.min(...r.vertices.map((p: number[]) => p[1]));

  it('onde o fundo fica antes da pele de dentro a profundidade cresce até passar dela', () => {
    const sem = varrer({ ...base, estacoes: estacoes(4) });
    const com = varrer({ ...base, estacoes: estacoes(4), alemDaPele: (p: number[]) => p[1] < -4 });
    expect(fundo(sem)).toBeGreaterThan(-4);
    expect(fundo(com)).toBeLessThan(-4);
  });

  it('sem profundidade que alcance a pele, a lâmina é recusada com a linha, o ponto e a causa', () => {
    const msg = grito(() => varrer({ ...base, estacoes: estacoes(4), alemDaPele: () => false }));
    expect(msg).toMatch(/a lâmina da linha 'l' não atravessou a chapa perto de \[/);
    expect(msg).toMatch(/o fundo dela fica sobre a pele de dentro/);
  });

  it('a pele conferida na chapa em L: a curva sobre a quina de raio 6 passa sem a cascata "origem subtrair inexistente"', () => {
    const L = chapaEmL({ raio: 6 });
    const curva = curvaDaGaiola(L.gaiola, { estacao: 2.43, de: 'a', ate: 'b' }).curva;
    const g = paineisPorVaos({ chapa: L.chapa, vao: 4, linhas: [{ nome: 'p', curva, alem: 20 }], paineis: [{ nome: 'a', eixo: 'y', ponto: [-20, 20] }, { nome: 'b', eixo: 'y', ponto: [-20, 70] }] });
    expect(g.medidas.pedacos).toBe(2);
    expect(g.medidas.separacao[0].ponte).toBeNull();
  });
});

describe('as mensagens da chapa e do corte', () => {
  it('o raio pedido de 1,5 com chapa de 1 mm recusa dizendo o raio pedido e o menor que cabe, sem o eco da origem que não nasceu', () => {
    const L = chapaEmL({ raio: 1.5 });
    const msg = grito(() => paineisPorVaos({ chapa: L.chapa, vao: 4, linhas: [{ nome: 'p', curva: [[0, 40, 0], [0, 40, 80]], alem: 5 }], paineis: [{ nome: 'a', eixo: 'y', ponto: [-20, 20] }] }));
    expect(msg).toMatch(/o vinco 'quina' pede raio 0\.0015/);
    expect(msg).toMatch(/o menor pedido que cabe com essa espessura é 0\.00159/);
    expect(msg).not.toMatch(/inexistente ou ainda não criada/);
  });
});
