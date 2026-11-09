/* lacos-pelas-vistas.test.mjs — os laços tirados de três vistas: a ponta acompanha a planta em toda altura, a gaiola por laços os aceita e
   as entradas que não dão laço são recusadas com a medida. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorLacos } from './gaiola-por-lacos.js';
import { lacosPelasVistas } from './lacos-pelas-vistas.js';
import { nucleo } from './nucleo.js';

/* um capô: a ponta do fim tem um bico (640 a 300 de altura) e recua no alto; a planta arredonda o fim em 200 mm */
const LADO = [[0, 0], [600, 0], [640, 300], [560, 500], [0, 500]];
const PERFIL = [[0, 480], [380, 500], [500, 420]];
const PLANTA = [[-500, 0], [500, 0], [500, 440], [300, 600], [0, 640], [-300, 600], [-500, 440]];
const ESTACOES = [0, 150, 300, 400, 480, 500];
const vistas = (mais = {}) => ({ lado: LADO, perfil: PERFIL, planta: PLANTA, estacoes: ESTACOES, ...mais });
const doCentro = (trecho) => trecho.reduce((m, p) => (Math.abs(p[0]) < Math.abs(m[0]) ? p : m));
const emLateral = (trecho, l) => trecho.reduce((m, p) => (Math.abs(p[0] - l) < Math.abs(m[0] - l) ? p : m));

describe('lacosPelasVistas', () => {
  it('a ponta do fim acompanha a planta: o recuo de cada lateral é o mesmo em toda altura', () => {
    const { lacos } = lacosPelasVistas(vistas({ perfil: [[0, 480], [500, 480]] }));
    const fimDoLado = [600, 620, 640, 600, 568, 560];
    lacos.forEach((laco, r) => {
      expect(laco.em).toBe(ESTACOES[r]);
      expect(doCentro(laco.trechos.fim)[1]).toBeCloseTo(fimDoLado[r], 1);
      /* a planta fica 37,3 mm aquém da ponta em l = 280 (40 * 280/300) e 184 mm em l = 480 (640 menos 440 + 160 * 20/200) */
      expect(doCentro(laco.trechos.fim)[1] - emLateral(laco.trechos.fim, 280)[1]).toBeCloseTo(37.33, 1);
      expect(doCentro(laco.trechos.fim)[1] - emLateral(laco.trechos.fim, 480)[1]).toBeCloseTo(184, 1);
      /* o início da planta é reto, e o laço começa em c = 0 em toda a largura */
      for (const p of laco.trechos.inicio) expect(p[1]).toBeCloseTo(0, 3);
    });
  });

  it('a meia largura de cada laço é a do perfil na altura dele', () => {
    const { lacos, meiaPlanta } = lacosPelasVistas(vistas());
    expect(meiaPlanta).toBe(500);
    const meias = lacos.map((laco) => Math.max(...laco.trechos.fim.map((p) => p[0])));
    [480, 487.9, 495.8, 486.7, 433.3, 420].forEach((w, r) => expect(meias[r]).toBeCloseTo(w, 1));
  });

  it('os laços fecham e entram em gaiolaPorLacos sem aviso, e a subdivisão sai fechada', () => {
    const { meiaPlanta, avisos, ...lacos } = lacosPelasVistas(vistas());
    expect(avisos).toEqual([]);
    for (const laco of lacos.lacos) {
      const nomes = ['inicio', 'direita', 'fim', 'esquerda'];
      nomes.forEach((n, i) => {
        const trecho = laco.trechos[n];
        const seguinte = laco.trechos[nomes[(i + 1) % 4]];
        expect(trecho[trecho.length - 1]).toEqual(seguinte[0]);
      });
    }
    const g = gaiolaPorLacos({ nome: 'capo', eixo: 'y', ...lacos });
    expect(g.avisos).toEqual([]);
    const neutro = nucleo([['subdivisao', { origemId: 1, ...g.passo, niveis: 1 }]], g.pontos, {}, {}, null, []);
    const arestas = new Map();
    for (const f of neutro.F.values()) for (let k = 0; k < f.vs.length; k += 1) {
      const a = f.vs[k]; const b = f.vs[(k + 1) % f.vs.length];
      const chave = a < b ? `${a}-${b}` : `${b}-${a}`;
      arestas.set(chave, (arestas.get(chave) ?? 0) + 1);
    }
    expect([...arestas.values()].every((n) => n === 2)).toBe(true);
  });

  it('no laço curto os recuos encolhem por igual e a altura vai aos avisos', () => {
    /* uma aba de 60 mm de comprimento sob um corpo de 600: os recuos da planta (200 mm no canto) não cabem nela */
    const lado = [[540, 0], [600, 0], [600, 200], [0, 200], [0, 150], [540, 150]];
    const r = lacosPelasVistas({ lado, perfil: [[0, 480], [200, 480]], planta: PLANTA.map(([l, c]) => [l, c - 40]), estacoes: [0, 100, 160, 200] });
    expect(r.avisos).toHaveLength(2);
    expect(r.avisos[0]).toContain('na altura 0 mm o intervalo (60 mm) é curto');
    const aba = r.lacos[0].trechos;
    expect(aba.direita[1][1] - aba.direita[0][1]).toBeCloseTo(2, 3);
    expect(Math.min(...aba.fim.map((p) => p[1]))).toBeGreaterThan(540);
  });

  it('recusa com a medida o que não dá laço', () => {
    expect(() => lacosPelasVistas(vistas({ estacoes: [0, 600] }))).toThrow('a estação 600 mm está fora da silhueta de lado, que vai de 0 a 500 mm');
    expect(() => lacosPelasVistas(vistas({ estacoes: [0, 300, 200] }))).toThrow('estacoes fora de ordem: 200 vem depois de 300');
    expect(() => lacosPelasVistas(vistas({ perfil: [[0, 480], [0, 500]] }))).toThrow('perfil fora de ordem');
    expect(() => lacosPelasVistas(vistas({ planta: [[0, 0], [1, 1]] }))).toThrow('planta precisa ser um polígono');
    /* um U deitado: a altura 250 corta a silhueta em dois intervalos */
    const u = [[0, 0], [600, 0], [600, 500], [400, 500], [400, 200], [200, 200], [200, 500], [0, 500]];
    expect(() => lacosPelasVistas(vistas({ lado: u, estacoes: [0, 250, 500] }))).toThrow('corta a silhueta de lado em mais de um intervalo');
    /* a silhueta que acaba em ponta: o laço do topo não tem comprimento */
    expect(() => lacosPelasVistas(vistas({ lado: [[0, 0], [600, 0], [300, 500]] }))).toThrow('menos que a espessuraMinima');
  });
});
