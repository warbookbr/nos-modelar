/* normal-da-gaiola.test.ts — o aviso de normal ao contrário: `fora` declarado em gaiolaPorEstacoes e o volume da gaiola fechada. Fixtures sem domínio: um painel de
   estações ao longo de x, um painel curvo e um cubo. A ficha é a do comando `capacidade`, conferida pelo mesmo `lerFicha`. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { conferirNormalDaGaiola } from './normal-da-gaiola.js';
// @ts-expect-error — núcleo em JavaScript.
import { gaiolaPorEstacoes } from './gaiola-por-estacoes.js';
// @ts-expect-error — ferramenta em JavaScript.
import { lerFicha } from '../../tools/modelar/capacidade.mjs';

type V3 = [number, number, number];
/* um painel ao longo de x, colunas de baixo para cima (v) no plano y = 0: com as colunas nesta ordem a normal sai para +y, e `virar: true` a leva a -y */
const painel = (extra: Record<string, unknown> = {}) => gaiolaPorEstacoes({ eixo: 'x', ...extra,
  estacoes: [0, 0.1, 0.2, 0.3].map((x, i) => ({ nome: `e${i}`, em: x, colunas: [{ nome: 'a', em: [0, 0] }, { nome: 'b', em: [0, 0.1] }, { nome: 'c', em: [0, 0.2] }] })) });
const refs = (g: any) => (g.avisos ?? []).map((a: any) => a.ref);

describe('fora declarado em gaiolaPorEstacoes', () => {
  it('a normal que olha para o lado contrário do fora avisa, com o cosseno, a área contra e o que fazer; a que olha para o fora e a sem fora não avisam', () => {
    const contra = painel({ fora: [0, -1, 0] });
    expect(refs(contra)).toEqual(['normalContrariaAoFora']);
    const a = contra.avisos[0];
    expect(a).toMatchObject({ cosseno: -1, areaContraria: 1 });
    expect(a.texto).toMatch(/olha para o lado contrário do `fora` declarado \[0, -1, 0\].*cosseno médio.*-1.*100% da área.*ponha `virar: true`/);
    expect(refs(painel({ fora: [0, 1, 0] }))).toEqual([]);
    expect(refs(painel())).toEqual([]);
  });
  it('com virar o aviso troca de lado, e a mensagem diz para tirá-lo', () => {
    expect(refs(painel({ fora: [0, -1, 0], virar: true }))).toEqual([]);
    const g = painel({ fora: [0, 1, 0], virar: true });
    expect(refs(g)).toEqual(['normalContrariaAoFora']);
    expect(g.avisos[0].texto).toMatch(/tire `virar: true`/);
  });
  it('a gaiola não é virada sozinha: o passo e os pontos são os mesmos com e sem `fora`', () => {
    const com = painel({ fora: [0, -1, 0] }); const sem = painel();
    expect(com.passo).toEqual(sem.passo);
    expect(com.pontos).toEqual(sem.pontos);
  });
  it('o painel curvo com a normal média para o fora não avisa', () => {
    /* um arco em y ao longo de v: as colunas sobem e a chapa dobra para -y no alto; a normal média continua para +y */
    const arco = gaiolaPorEstacoes({ eixo: 'x', fora: [0, 1, 0],
      estacoes: [0, 0.1, 0.2].map((x, i) => ({ nome: `e${i}`, em: x, colunas: [{ nome: 'a', em: [0, 0] }, { nome: 'b', em: [-0.05, 0.1] }, { nome: 'c', em: [-0.2, 0.15] }, { nome: 'd', em: [-0.4, 0.1] }] })) });
    expect(refs(arco)).toEqual([]);
  });
  it('fora que não é [x, y, z] (ou é zero) é recusado', () => {
    expect(() => painel({ fora: [0, 1] })).toThrow(/fora precisa ser \[x, y, z\]/);
    expect(() => painel({ fora: [0, 0, 0] })).toThrow(/fora precisa ser \[x, y, z\]/);
  });
});

describe('o volume da gaiola fechada', () => {
  const cubo = (virado: boolean) => {
    const P: Record<string, V3> = {}; const nome = (c: number[]) => `p${c.join('')}`;
    for (const x of [0, 1]) for (const y of [0, 1]) for (const z of [0, 1]) P[nome([x, y, z])] = [x, y, z];
    const faces: string[][] = [];
    for (const ax of [0, 1, 2]) for (const s of [0, 1]) {
      const u = (ax + 1) % 3; const v = (ax + 2) % 3;
      const q = (i: number, j: number) => { const c = [0, 0, 0]; c[ax] = s; c[u] = i; c[v] = j; return nome(c); };
      const f = [q(0, 0), q(1, 0), q(1, 1), q(0, 1)]; faces.push(s === 1 ? f : [...f].reverse());
    }
    return { pontos: P, faces: virado ? faces.map((f) => [...f].reverse()) : faces };
  };
  it('a normal para dentro do cubo avisa normalParaDentro com o volume com sinal; para fora não avisa', () => {
    const fora = conferirNormalDaGaiola(cubo(false));
    expect(fora.volume).toBeCloseTo(1, 9);
    expect(fora.avisos).toEqual([]);
    const dentro = conferirNormalDaGaiola({ ...cubo(true), corrige: 'ponha `virar: true`' });
    expect(dentro.volume).toBeCloseTo(-1, 9);
    expect(dentro.avisos.map((a: any) => a.ref)).toEqual(['normalParaDentro']);
    expect(dentro.avisos[0].texto).toMatch(/olha para dentro do volume.*é -1,.*ponha `virar: true`/);
  });
  it('a gaiola aberta (um painel) não tem volume, e o `fora` sozinho decide', () => {
    const r = conferirNormalDaGaiola({ pontos: { a: [0, 0, 0], b: [1, 0, 0], c: [1, 1, 0], d: [0, 1, 0] }, faces: [['a', 'b', 'c', 'd']], fora: [0, 0, -1] });
    expect(r.volume).toBeNull();
    expect(r.avisos.map((a: any) => a.ref)).toEqual(['normalContrariaAoFora']);
    expect(conferirNormalDaGaiola({ pontos: { a: [0, 0, 0], b: [1, 0, 0], c: [1, 1, 0], d: [0, 1, 0] }, faces: [['a', 'b', 'c', 'd']], fora: [0, 0, 1] }).avisos).toEqual([]);
  });
  it('a ficha do cabeçalho passa pelo mesmo leitor do comando capacidade', () => {
    const f = lerFicha(readFileSync(new URL('./normal-da-gaiola.js', import.meta.url), 'utf8'));
    expect(f.erros ?? []).toEqual([]);
  });
});
