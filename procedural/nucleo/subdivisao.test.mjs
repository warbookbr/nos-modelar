/* subdivisao.test.mjs — a subdivisão Catmull-Clark e a operação `subdivisao` contra a saída congelada do oráculo, com determinismo, ponto limite, interpolação e vértice sem face. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { subdividirCatmullClark, espelharGaiolaEmX, nitidezDoVinco, limitesDaGaiola, refinarGaiola, ajustarGaiolaAsMedidas, ErroDasMedidas, GANHO_MAXIMO_DAS_MEDIDAS } from './subdivisao.js';
import { neutroCanonico, nucleo } from './entrada.js';

const oraculo = JSON.parse(readFileSync(new URL('./fixtures/subdivisao-oraculo-blender.json', import.meta.url)));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const desvio = (P, Q) => Math.max(...P.map((p) => Math.min(...Q.map((q) => dist(p, q)))));

describe('subdivisão Catmull-Clark com vincos', () => {
  for (const caso of oraculo.casos) {
    for (const n of caso.niveis) {
      it(`confere com o Blender: ${caso.nome}, ${n} nível(is)`, () => {
        const r = subdividirCatmullClark({
          vertices: caso.vertices, faces: caso.faces, niveis: n, borda: caso.borda ?? 'suave',
          vincos: caso.vincos.map(([a, b, c]) => [a, b, nitidezDoVinco(c)]),
        });
        const b = oraculo.blender[`${caso.nome}@${n}`];
        expect(r.vertices.length).toBe(b.length);
        expect(Math.max(desvio(r.vertices, b), desvio(b, r.vertices))).toBeLessThan(1e-6);
      });
    }
  }

  it('é determinística: a mesma gaiola dá a mesma saída, byte a byte', () => {
    const c = oraculo.casos[2];
    const f = () => JSON.stringify(subdividirCatmullClark({ vertices: c.vertices, faces: c.faces, vincos: c.vincos.map(([a, b, v]) => [a, b, nitidezDoVinco(v)]), niveis: 3 }));
    expect(f()).toBe(f());
  });

  it('espelhar a gaiola antes de subdividir dá a costura lisa, igual à gaiola inteira', () => {
    // faixa de 2 x 1 quads, metade x >= 0, com a costura em x = 0
    const meia = { vertices: [[0, 0, 0], [0.5, 0.1, 0], [1, 0, 0], [0, 0.2, 1], [0.5, 0.3, 1], [1, 0.1, 1]], faces: [[0, 3, 4, 1], [1, 4, 5, 2]] };
    const inteira = espelharGaiolaEmX(meia);
    const r = subdividirCatmullClark({ ...inteira, niveis: 2 });
    // o ponto da costura no meio da borda de cima fica em x = 0 e com a altura da média lisa, não da regra de borda
    const costura = r.vertices.filter((p) => Math.abs(p[0]) < 1e-12);
    expect(costura.length).toBeGreaterThan(0);
    const simetrica = r.vertices.every((p) => r.vertices.some((q) => dist(q, [-p[0], p[1], p[2]]) < 1e-12));
    expect(simetrica).toBe(true);
  });

  it('recusa aresta de vinco que não existe na gaiola', () => {
    expect(() => subdividirCatmullClark({ vertices: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], faces: [[0, 3, 2, 1]], vincos: [[0, 2, 1]], niveis: 1 })).toThrow(/não existe/);
  });

  for (const caso of oraculo.casos) {
    for (const n of caso.niveis) {
      it(`a operação subdivisao confere com o Blender: ${caso.nome}, ${n} nível(is)`, () => {
        const passos = [['subdivisao', { origemId: 1, vertices: caso.vertices, faces: caso.faces, vincos: caso.vincos.map(([a, b, c]) => [a, b, nitidezDoVinco(c)]), niveis: n, borda: caso.borda ?? 'suave' }]];
        const neutro = nucleo(passos, {});
        expect(neutro.orfaos).toEqual([]);
        const P = [...neutro.V.values()];
        const b = oraculo.blender[`${caso.nome}@${n}`];
        expect(P.length).toBe(b.length);
        expect(Math.max(desvio(P, b), desvio(b, P))).toBeLessThan(1e-6);
        expect(JSON.stringify(neutroCanonico(nucleo(passos, {})))).toBe(JSON.stringify(neutroCanonico(neutro)));
      });
    }
  }

  it('a operação subdivisao publica as faces da superfície como origem', () => {
    const c = oraculo.casos[1];
    const neutro = nucleo([['subdivisao', { origemId: 1, vertices: c.vertices, faces: c.faces, vincos: c.vincos.map(([a, b]) => [a, b]), niveis: 2 }]], {});
    expect(neutro.orfaos).toEqual([]);
    expect(neutro.V.size).toBe(98);
    expect(neutro.F.size).toBe(96);
  });

  describe('ponto limite e medidas', () => {
    const gaiolaDo = (c) => ({ vertices: c.vertices, faces: c.faces, borda: c.borda ?? 'suave', vincos: c.vincos.map(([a, b, x]) => [a, b, nitidezDoVinco(x)]) });
    const gaiolas = oraculo.casos.map((c) => [c.nome, gaiolaDo(c)]);
    const cubo = gaiolaDo(oraculo.casos[0]);
    // vinco vivo de verdade (nitidez infinita); os vincos da fixture têm nitidez finita, até 10, e alguns fracionários
    gaiolas.push(['grade-aberta com vinco infinito', { ...gaiolaDo(oraculo.casos[4]), vincos: oraculo.casos[4].vincos.map(([a, b]) => [a, b, Infinity]) }]);
    gaiolas.push(['cubo com topo de vinco infinito', { ...cubo, vincos: [[4, 5, Infinity], [5, 6, Infinity], [6, 7, Infinity], [7, 4, Infinity]] }]);
    gaiolas.push(['cubo com vinco fracionário de nitidez 0,4', { ...cubo, vincos: [[4, 5, 0.4], [5, 6, 0.4], [6, 7, 0.4]] }]);
    gaiolas.push(['cubo com dardo vivo', { ...cubo, vincos: [[4, 5, Infinity]] }]);
    // a estrela de um vértice, como gaiola, com o vértice no índice 0: o refino dela dá a estrela do mesmo vértice
    const estrela = (g, i) => {
      const mapa = new Map([[i, 0]]); const vertices = [g.vertices[i]]; const faces = [];
      for (const f of g.faces) if (f.includes(i)) faces.push(f.map((j) => { if (!mapa.has(j)) { mapa.set(j, vertices.length); vertices.push(g.vertices[j]); } return mapa.get(j); }));
      const vincos = (g.vincos ?? []).filter(([a, b]) => (a === i && mapa.has(b)) || (b === i && mapa.has(a))).map(([a, b, s]) => [mapa.get(a), mapa.get(b), s]);
      return { vertices, faces, vincos, cantos: (g.cantos ?? []).includes(i) ? [0] : [], borda: g.borda };
    };
    const limiteRefinado = (g, i, niveis) => { let e = estrela(g, i); for (let k = 0; k < niveis; k++) e = estrela(refinarGaiola(e), 0); return e.vertices[0]; };

    for (const [nome, g] of gaiolas) {
      it(`a fórmula do ponto limite confere com a estrela refinada 80 níveis e não muda com o refino: ${nome}`, () => {
        const L = limitesDaGaiola(g);
        expect(Math.max(...L.map((p, i) => dist(p, limiteRefinado(g, i, 80))))).toBeLessThan(1e-12);
        let gk = g;
        for (let k = 0; k < 3; k++) {
          gk = refinarGaiola(gk);
          const Lk = limitesDaGaiola(gk);
          expect(Math.max(...L.map((p, i) => dist(p, Lk[i])))).toBeLessThan(1e-12);
        }
      });
    }

    it('o ponto limite do dardo vivo sai do autovetor da estrela e não da máscara lisa', () => {
      const cubo = gaiolaDo(oraculo.casos[0]);
      const dardo = { ...cubo, vincos: [[4, 5, Infinity]] };
      const L = limitesDaGaiola(dardo);
      const refinado = limiteRefinado(dardo, 4, 80);
      expect(dist(L[4], refinado)).toBeLessThan(1e-12);
      // a máscara lisa daria o mesmo ponto do cubo liso, longe do limite verdadeiro do dardo
      expect(dist(limitesDaGaiola(cubo)[4], refinado)).toBeGreaterThan(1e-2);
    });

    /* Medidas: a distância de cada ponto marcado à superfície limite é medida duas vezes, pela fórmula do ponto limite na
       gaiola ajustada e pela estrela do ponto refinada 80 níveis, que não usa fórmula nenhuma. */
    const singulares = new Set(['cubo-liso', 'cubo com dardo vivo']);
    for (const [nome, g] of gaiolas) {
      const todos = g.vertices.map((_, k) => k);
      const conjuntos = [['metade dos pontos', todos.filter((k) => k % 2 === 0)]];
      if (!singulares.has(nome)) conjuntos.push(['todos os pontos', todos]);
      for (const [rotulo, M] of conjuntos) {
        it(`com medidas em ${rotulo}, cada um fica a menos de 1e-6 m do limite e os outros não se movem: ${nome}`, () => {
          const r = ajustarGaiolaAsMedidas(g, M);
          expect(JSON.stringify(ajustarGaiolaAsMedidas(g, M))).toBe(JSON.stringify(r));
          expect(r.ganho).toBeLessThanOrEqual(GANHO_MAXIMO_DAS_MEDIDAS);
          const ajustada = { ...g, vertices: r.vertices };
          const L = limitesDaGaiola(ajustada);
          for (const k of M) {
            expect(dist(L[k], g.vertices[k])).toBeLessThan(1e-6);
            expect(dist(limiteRefinado(ajustada, k, 80), g.vertices[k])).toBeLessThan(1e-6);
          }
          for (const k of todos) if (!M.includes(k)) expect(r.vertices[k]).toEqual(g.vertices[k]);
        });
      }
    }

    it('medidas que o limite não separa falham com os pontos envolvidos, e as mal condicionadas também', () => {
      const cubo = gaiolaDo(oraculo.casos[0]);
      const todos = cubo.vertices.map((_, k) => k);
      expect(() => ajustarGaiolaAsMedidas(cubo, todos)).toThrow(ErroDasMedidas);
      try { ajustarGaiolaAsMedidas(cubo, todos); } catch (e) { expect(e.motivo).toMatch(/singular/); expect(e.indices).toEqual(todos); }
      const fraco = { ...cubo, vincos: [[4, 5, 0.1], [5, 6, 0.1]] };
      try { ajustarGaiolaAsMedidas(fraco, todos); expect.unreachable(); } catch (e) { expect(e.motivo).toMatch(/mal condicionado \(ganho 459/); expect(e.indices.length).toBeGreaterThan(0); }
    });
  });

  describe('a operação subdivisao com medidas', () => {
    const c = oraculo.casos[0];
    const nomes = c.vertices.map((_, k) => `p${k}`);
    const pontos = Object.fromEntries(nomes.map((n, k) => [n, c.vertices[k]]));
    const passo = (extra) => [['subdivisao', { origemId: 1, vertices: nomes, faces: c.faces, niveis: 2, vincos: [[4, 5], [5, 6], [6, 7], [7, 4]], ...extra }]];

    it('ajusta só os pontos medidos, entrega a malha no limite e põe cada ponto medido nela, bit a bit', () => {
      const medidas = ['p4', 'p6', 'p1'];
      const neutro = nucleo(passo({ medidas }), pontos);
      expect(neutro.orfaos).toEqual([]);
      const g = { vertices: c.vertices, faces: c.faces, vincos: [[4, 5, Infinity], [5, 6, Infinity], [6, 7, Infinity], [7, 4, Infinity]] };
      const ajustada = ajustarGaiolaAsMedidas(g, [4, 6, 1]);
      const esperado = subdividirCatmullClark({ ...g, vertices: ajustada.vertices, niveis: 2, aoLimite: true }).vertices;
      const entregue = [...neutro.V.values()];
      expect(JSON.stringify(entregue)).toBe(JSON.stringify(esperado));
      expect(JSON.stringify(neutroCanonico(nucleo(passo({ medidas }), pontos)))).toBe(JSON.stringify(neutroCanonico(neutro)));
      // na malha exportada, cada ponto medido é um vértice a menos de 1e-6 m da cota
      for (const k of [4, 6, 1]) expect(Math.min(...entregue.map((p) => dist(p, c.vertices[k])))).toBeLessThan(1e-6);
    });

    it('aoLimite põe cada vértice do nível final no seu ponto limite, conferido pela estrela refinada 60 níveis', () => {
      const g = { vertices: c.vertices, faces: c.faces, vincos: [[4, 5, Infinity], [5, 6, 0.4]] };
      let g2 = g; for (let k = 0; k < 2; k++) g2 = refinarGaiola(g2);
      const r = subdividirCatmullClark({ ...g, niveis: 2, aoLimite: true });
      expect(r.faces).toEqual(subdividirCatmullClark({ ...g, niveis: 2 }).faces);
      const estrelaDe = (gg, i) => {
        const mapa = new Map([[i, 0]]); const vertices = [gg.vertices[i]]; const faces = [];
        for (const f of gg.faces) if (f.includes(i)) faces.push(f.map((j) => { if (!mapa.has(j)) { mapa.set(j, vertices.length); vertices.push(gg.vertices[j]); } return mapa.get(j); }));
        const vincos = gg.vincos.filter(([a, b]) => (a === i && mapa.has(b)) || (b === i && mapa.has(a))).map(([a, b, s]) => [mapa.get(a), mapa.get(b), s]);
        return { vertices, faces, vincos };
      };
      for (let k = 0; k < r.vertices.length; k += 3) {
        let e = estrelaDe(g2, k); for (let n = 0; n < 60; n++) e = estrelaDe(refinarGaiola(e), 0);
        expect(dist(r.vertices[k], e.vertices[0])).toBeLessThan(1e-12);
      }
    });

    it('na simetria em x, a imagem do ponto medido também passa pela superfície', () => {
      const meia = { vertices: [[0, 0, 0], [0.5, 0.1, 0], [1, 0, 0], [0, 0.2, 1], [0.5, 0.3, 1], [1, 0.1, 1]], faces: [[0, 3, 4, 1], [1, 4, 5, 2]] };
      const nm = meia.vertices.map((_, k) => `m${k}`);
      const neutro = nucleo([['subdivisao', { origemId: 1, simetria: 'x', vertices: nm, faces: meia.faces, niveis: 1, medidas: ['m4', 'm3'] }]], Object.fromEntries(nm.map((n, k) => [n, meia.vertices[k]])));
      expect(neutro.orfaos).toEqual([]);
      const inteira = espelharGaiolaEmX(meia);
      const ajustada = ajustarGaiolaAsMedidas(inteira, [4, 3, inteira.imagem[4], inteira.imagem[3]]);
      const L = limitesDaGaiola({ ...inteira, vertices: ajustada.vertices });
      expect(dist(L[inteira.imagem[4]], [-0.5, 0.3, 1])).toBeLessThan(1e-6);
      expect(JSON.stringify([...neutro.V.values()])).toBe(JSON.stringify(subdividirCatmullClark({ ...inteira, vertices: ajustada.vertices, niveis: 1, aoLimite: true }).vertices));
    });

    it('grita com os nomes dos pontos quando o sistema é singular, e não gera malha', () => {
      const neutro = nucleo(passo({ vincos: [], medidas: nomes }), pontos);
      expect(neutro.orfaos).toHaveLength(1);
      expect(neutro.orfaos[0]).toMatchObject({ op: 'subdivisao', ref: 'medidas' });
      expect(neutro.orfaos[0].motivo).toMatch(/singular/);
      for (const n of nomes) expect(neutro.orfaos[0].motivo).toContain(`'${n}'`);
      expect(neutro.V.size).toBe(0);
    });

    it('grita quando a medida não é ponto da gaiola', () => {
      const neutro = nucleo(passo({ medidas: ['outro'] }), { ...pontos, outro: [9, 9, 9] });
      expect(neutro.orfaos[0].motivo).toContain("'outro'");
      expect(neutro.V.size).toBe(0);
    });
  });

  describe('vértice de gaiola sem face', () => {
    const quad = [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]];

    it('grita com o nome do ponto e não gera malha', () => {
      const neutro = nucleo([['subdivisao', { origemId: 1, vertices: [...quad, 'pontoSolto'], faces: [[0, 3, 2, 1]], niveis: 1 }]], { pontoSolto: [5, 5, 5] });
      expect(neutro.orfaos).toHaveLength(1);
      expect(neutro.orfaos[0]).toMatchObject({ op: 'subdivisao', ref: 'vertices' });
      expect(neutro.orfaos[0].motivo).toContain("'pontoSolto'");
      expect(neutro.V.size).toBe(0);
    });

    it('sem nome, grita com a posição do vértice', () => {
      const neutro = nucleo([['subdivisao', { origemId: 1, vertices: [...quad, [5, 6, 7]], faces: [[0, 3, 2, 1]], niveis: 1 }]], {});
      expect(neutro.orfaos).toHaveLength(1);
      expect(neutro.orfaos[0].motivo).toContain('[5, 6, 7]');
      expect(neutro.V.size).toBe(0);
    });

    it('na simetria em x, grita com o nome do ponto da metade declarada', () => {
      const neutro = nucleo([['subdivisao', { origemId: 1, simetria: 'x', vertices: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1], 'pontoSolto'], faces: [[0, 3, 2, 1]], niveis: 1 }]], { pontoSolto: [2, 2, 2] });
      expect(neutro.orfaos).toHaveLength(1);
      expect(neutro.orfaos[0].motivo).toContain("'pontoSolto'");
    });
  });
});
