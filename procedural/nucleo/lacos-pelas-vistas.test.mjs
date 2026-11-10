/* lacos-pelas-vistas.test.mjs — os laços tirados de três vistas: a ponta acompanha a planta em toda altura, a gaiola por laços os aceita e
   as entradas que não dão laço são recusadas com a medida. */
import { createHash } from 'node:crypto';
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

  it("com cantos 'fixos' o canto da planta fica no lugar em toda altura e só o meio da ponta acompanha a silhueta", () => {
    const { lacos } = lacosPelasVistas(vistas({ perfil: [[0, 500], [500, 500]], cantos: 'fixos' }));
    const fimDoLado = [600, 620, 640, 600, 568, 560];
    lacos.forEach((laco, r) => {
      expect(doCentro(laco.trechos.fim)[1]).toBeCloseTo(fimDoLado[r], 1);
      /* o canto da planta está a 200 mm do extremo dela (640): fica em 440 em toda altura */
      expect(laco.trechos.fim[0][1]).toBeCloseTo(440, 0);
    });
    /* a silhueta 250 mm aquém do extremo, mais que os 200 do canto: a ponta fica reta */
    const reto = lacosPelasVistas(vistas({ lado: [[0, 0], [640, 0], [640, 250], [390, 250], [390, 500], [0, 500]], perfil: [[0, 500], [500, 500]],
      cantos: 'fixos', estacoes: [0, 200, 300, 500] })).lacos[3].trechos.fim;
    for (const p of reto) expect(p[1]).toBeCloseTo(390, 3);
    /* extremos troca a referência: o corpo que fica 100 mm aquém de um maior usa o extremo dele, e o recuo cai à metade */
    const menor = lacosPelasVistas(vistas({ lado: [[300, 0], [540, 0], [540, 500], [300, 500]], perfil: [[0, 500], [500, 500]], cantos: 'fixos',
      extremos: { fim: 640 }, estacoes: [0, 500] })).lacos[0].trechos.fim;
    expect(doCentro(menor)[1]).toBeCloseTo(540, 1);
    expect(menor[0][1]).toBeCloseTo(540 - 200 * 0.5, 0);
    expect(() => lacosPelasVistas(vistas({ cantos: 'soltos' }))).toThrow("cantos é 'acompanham' ou 'fixos'");
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

  it("com curto: 'fim' a aba de 60 mm acompanha a planta curva e mede 60 em toda a lateral, sem aviso; 'inicio' é o espelho", () => {
    const lado = [[540, 0], [600, 0], [600, 200], [0, 200], [0, 150], [540, 150]];
    const planta = PLANTA.map(([l, c]) => [l, c - 40]);
    const r = lacosPelasVistas({ lado, perfil: [[0, 480], [200, 480]], planta, estacoes: [0, 100, 160, 200], curto: 'fim' });
    expect(r.avisos).toEqual([]);
    for (const laco of r.lacos.slice(0, 2)) {
      const { inicio, fim } = laco.trechos;
      const fimNaOrdem = [...fim].reverse();
      inicio.forEach(([l, c], i) => { expect(fimNaOrdem[i][0]).toBe(l); expect(fimNaOrdem[i][1] - c).toBeCloseTo(60, 9); });
      /* o fim é o da planta: 600 no centro e 400 no canto (o recuo de 184 mm em l = 480) */
      expect(doCentro(fim)[1]).toBeCloseTo(600, 6);
      expect(emLateral(fim, 480)[1]).toBeCloseTo(600 - 184, 1);
      expect(laco.trechos.direita[1][1] - laco.trechos.direita[0][1]).toBeCloseTo(60, 9);
    }
    /* as alturas que não são curtas saem como no padrão */
    const padrao = lacosPelasVistas({ lado, perfil: [[0, 480], [200, 480]], planta, estacoes: [0, 100, 160, 200] });
    expect(r.lacos.slice(2)).toEqual(padrao.lacos.slice(2));
    /* o espelho: a aba no início, sob um corpo que vai até 600, com a planta arredondada no início */
    const espelho = (pts) => pts.map(([l, c]) => [l, 600 - c]);
    const ladoI = lado.map(([c, a]) => [600 - c, a]);
    const ri = lacosPelasVistas({ lado: ladoI, perfil: [[0, 480], [200, 480]], planta: espelho(planta), estacoes: [0, 100, 160, 200], curto: 'inicio' });
    expect(ri.avisos).toEqual([]);
    ri.lacos.forEach((laco, n) => {
      const fimNaOrdem = [...r.lacos[n].trechos.fim].reverse();
      laco.trechos.inicio.forEach(([l, c], i) => { expect(l).toBeCloseTo(fimNaOrdem[i][0], 9); expect(c).toBeCloseTo(600 - fimNaOrdem[i][1], 9); });
    });
    expect(() => lacosPelasVistas({ lado, perfil: [[0, 480], [200, 480]], planta, estacoes: [0, 200], curto: 'corta' })).toThrow("curto é 'encolhe', 'fim' ou 'inicio'");
  });

  it("o padrão de curto é 'encolhe' e dá a saída de antes do campo, byte a byte", () => {
    /* o sha256 do JSON da saída, tirado do código anterior ao campo curto: a aba do fim e uma aba no início, ambas curtas */
    const resumo = (r) => createHash('sha256').update(JSON.stringify(r)).digest('hex').slice(0, 16);
    const aba = { lado: [[540, 0], [600, 0], [600, 200], [0, 200], [0, 150], [540, 150]], perfil: [[0, 480], [200, 480]], planta: PLANTA.map(([l, c]) => [l, c - 40]), estacoes: [0, 100, 160, 200] };
    const base = { lado: [[0, 0], [60, 0], [60, 200], [600, 200], [600, 250], [0, 250]], perfil: [[0, 480], [250, 480]], planta: PLANTA, estacoes: [0, 100, 190, 250] };
    expect(resumo(lacosPelasVistas(aba))).toBe('09b6edc3d7cdd0f4');
    expect(resumo(lacosPelasVistas({ ...aba, curto: 'encolhe' }))).toBe('09b6edc3d7cdd0f4');
    expect(resumo(lacosPelasVistas(base))).toBe('c11264eb0b6480a6');
  });

  it('com centro 0 a saída é idêntica à de antes, byte a byte, e o corpo deslocado dá os mesmos laços somados do centro', () => {
    /* o sha256 do JSON da saída, tirado do código anterior ao campo centro, com os mesmos casos (o terceiro tem aviso de perfil) */
    const ANTES = ['a7ab0986ece6d1cf', 'c1d41ad8e14c6bb5', '4dada21f8d90cbc6'];
    const resumo = (r) => createHash('sha256').update(JSON.stringify(r)).digest('hex').slice(0, 16);
    [{}, { cantos: 'fixos', perfil: [[0, 500], [500, 500]] }, { perfil: [[0, 600], [500, 600]] }].forEach((mais, i) => {
      expect(resumo(lacosPelasVistas(vistas(mais)))).toBe(ANTES[i]);
      expect(resumo(lacosPelasVistas(vistas({ ...mais, centro: 0 })))).toBe(ANTES[i]);
      const deslocado = lacosPelasVistas(vistas({ ...mais, centro: 400, planta: PLANTA.map(([l, c]) => [l + 400, c]) }));
      const base = lacosPelasVistas(vistas(mais));
      expect(deslocado.avisos).toEqual(base.avisos);
      expect(deslocado.meiaPlanta).toBe(base.meiaPlanta);
      expect(deslocado.trechos).toEqual(base.trechos);
      deslocado.lacos.forEach((laco, r) => {
        for (const n of ['inicio', 'direita', 'fim', 'esquerda']) {
          const esperado = base.lacos[r].trechos[n];
          laco.trechos[n].forEach(([l, c], i) => { expect(l).toBeCloseTo(esperado[i][0] + 400, 9); expect(c).toBeCloseTo(esperado[i][1], 9); });
        }
      });
    });
    expect(() => lacosPelasVistas(vistas({ centro: 'meio' }))).toThrow('centro precisa ser um número');
  });

  it('a planta que não é simétrica em torno do centro declarado vai aos avisos com a medida', () => {
    /* a planta deslocada 20 mm sem declarar o centro: vai 520 mm para um lado e 480 para o outro */
    const r = lacosPelasVistas(vistas({ planta: PLANTA.map(([l, c]) => [l + 20, c]) }));
    expect(r.avisos).toEqual(['a planta não é simétrica em torno do centro 0 mm: vai 520 mm para um lado e 480 mm para o outro (o meio dela está em 20 mm); o laço vai do centro para os dois lados com a meia largura do perfil, e do lado mais curto a ponta fica a da borda da planta']);
    expect(r.meiaPlanta).toBe(520);
    /* o centro declarado a 30 mm do meio da planta */
    const torto = lacosPelasVistas(vistas({ centro: 430, planta: PLANTA.map(([l, c]) => [l + 400, c]) }));
    expect(torto.avisos[0]).toContain('em torno do centro 430 mm: vai 470 mm para um lado e 530 mm para o outro (o meio dela está em 400 mm)');
    /* a planta simétrica não avisa, com o centro em qualquer lugar */
    expect(lacosPelasVistas(vistas({ centro: -250, planta: PLANTA.map(([l, c]) => [l - 250, c]) })).avisos).toEqual([]);
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
