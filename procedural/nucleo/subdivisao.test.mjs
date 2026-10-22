/* subdivisao.test.mjs — a subdivisão Catmull-Clark e a operação `subdivisao` contra a saída congelada do oráculo, com determinismo, ponto limite, interpolação, vincos nomeados e vértice sem face. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { subdividirCatmullClark, espelharGaiolaEmX, nitidezDoVinco, limitesDaGaiola, refinarGaiola, ajustarGaiolaAsMedidas, ErroDasMedidas, GANHO_MAXIMO_DAS_MEDIDAS, NITIDEZ_VIVA, fatorarLU, resolverLU } from './subdivisao.js';
import { enderecosPorIndice } from './operacoes/subdivisao.js';
import { neutroCanonico, nucleo } from './entrada.js';

const oraculo = JSON.parse(readFileSync(new URL('./fixtures/subdivisao-oraculo-blender.json', import.meta.url)));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const desvio = (P, Q) => Math.max(...P.map((p) => Math.min(...Q.map((q) => dist(p, q)))));

/* Um caso por índice da fixture escrito como receita nomeada: o ponto k vira 'p<k>' e cada aresta vincada vira um vinco
   de dois pontos, com o vinco do Blender como nitidez da receita. */
const receitaDoCaso = (caso) => {
  const nome = (k) => `p${k}`;
  return {
    pontos: Object.fromEntries(caso.vertices.map((p, k) => [nome(k), p])),
    passo: {
      vertices: caso.vertices.map((_, k) => nome(k)), faces: caso.faces.map((f) => f.map(nome)), borda: caso.borda ?? 'suave',
      vincos: caso.vincos.map(([a, b, c], k) => ({ nome: `v${k}`, pontos: [nome(a), nome(b)], nitidez: c })),
    },
  };
};

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
        const { pontos, passo } = receitaDoCaso(caso);
        const passos = [['subdivisao', { origemId: 1, ...passo, niveis: n }]];
        const neutro = nucleo(passos, pontos);
        expect(neutro.orfaos).toEqual([]);
        const P = [...neutro.V.values()];
        const b = oraculo.blender[`${caso.nome}@${n}`];
        expect(P.length).toBe(b.length);
        expect(Math.max(desvio(P, b), desvio(b, P))).toBeLessThan(1e-6);
        expect(JSON.stringify(neutroCanonico(nucleo(passos, pontos)))).toBe(JSON.stringify(neutroCanonico(neutro)));
      });
    }
  }

  it('a operação subdivisao publica as faces da superfície como origem', () => {
    const { pontos, passo } = receitaDoCaso(oraculo.casos[1]);
    const neutro = nucleo([['subdivisao', { origemId: 1, ...passo, vincos: passo.vincos.map((v) => ({ ...v, nitidez: 'viva' })), niveis: 2 }]], pontos);
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

    /* A eliminação pula o multiplicador zero e a coluna zero da linha do pivô; as operações que sobram são as da
       eliminação densa, na mesma ordem, e o resultado tem de ser o mesmo valor a valor. A matriz é esparsa como a das
       medidas, com pivô fora da diagonal para exercitar a troca de linhas. */
    it('a eliminação esparsa dá o mesmo resultado da densa, valor a valor', () => {
      const densa = (A) => {
        const n = A.length; const M = A.map((r) => [...r]); const perm = [...Array(n).keys()];
        for (let k = 0; k < n; k++) {
          let p = k;
          for (let r = k + 1; r < n; r++) if (Math.abs(M[r][k]) > Math.abs(M[p][k])) p = r;
          if (p !== k) { [M[p], M[k]] = [M[k], M[p]]; [perm[p], perm[k]] = [perm[k], perm[p]]; }
          for (let r = k + 1; r < n; r++) { const f = M[r][k] / M[k][k]; M[r][k] = f; for (let c = k + 1; c < n; c++) M[r][c] -= f * M[k][c]; }
        }
        const resolver = (b) => {
          const y = perm.map((i) => b[i]);
          for (let r = 0; r < n; r++) for (let c = 0; c < r; c++) y[r] -= M[r][c] * y[c];
          for (let r = n - 1; r >= 0; r--) { for (let c = r + 1; c < n; c++) y[r] -= M[r][c] * y[c]; y[r] /= M[r][r]; }
          return y;
        };
        return { M, perm, resolver };
      };
      let semente = 7;
      const sorteio = () => { semente = (semente * 48271) % 2147483647; return semente / 2147483647; };
      const n = 80;
      const A = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (__, c) => {
        if (c === (r + 3) % n) return 1 + sorteio();
        return Math.abs(r - c) <= 4 && sorteio() < 0.5 ? sorteio() - 0.5 : 0;
      }));
      const esparsa = fatorarLU(A); const ref = densa(A);
      expect(esparsa.singularEm).toBe(-1);
      expect(esparsa.perm).toEqual(ref.perm);
      const iguais = (u, v) => u.length === v.length && u.every((x, k) => x === v[k]);
      expect(esparsa.M.every((linha, r) => iguais(linha, ref.M[r]))).toBe(true);
      for (let t = 0; t < 5; t++) {
        const b = Array.from({ length: n }, (_, k) => (k % (t + 2) === 0 ? sorteio() - 0.5 : 0));
        expect(iguais(resolverLU(esparsa, b), ref.resolver(b))).toBe(true);
      }
    });

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
    const passo = (extra) => [['subdivisao', { origemId: 1, vertices: nomes, faces: c.faces.map((f) => f.map((k) => nomes[k])), niveis: 2, vincos: [{ nome: 'aroDeCima', pontos: ['p4', 'p5', 'p6', 'p7', 'p4'], nitidez: 'viva' }], ...extra }]];

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
      const neutro = nucleo([['subdivisao', { origemId: 1, simetria: 'x', vertices: nm, faces: meia.faces.map((f) => f.map((k) => nm[k])), niveis: 1, medidas: ['m4', 'm3'] }]], Object.fromEntries(nm.map((n, k) => [n, meia.vertices[k]])));
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

  /* Receitas do oráculo escritas só com nomes: a gaiola, as faces, os vincos e os cantos citam pontos por nome, e o
     Blender recebeu a nitidez da receita como vinco (a 'viva' como vinco 1) e o canto como vinco de vértice 1. */
  describe('vincos nomeados contra o oráculo', () => {
    // a gaiola por índice que a operação monta a partir dos nomes, para conferir a superfície limite pela função pura
    const gaiolaDaReceita = (r, nitidez) => {
      const k = new Map(r.passo.vertices.map((n, i) => [n, i]));
      const vincos = r.passo.vincos.flatMap((v) => v.pontos.slice(1).map((q, j) => [k.get(v.pontos[j]), k.get(q), nitidezDoVinco(nitidez ?? v.nitidez)]));
      return { vertices: r.passo.vertices.map((n) => r.pontos[n]), faces: r.passo.faces.map((f) => f.map((n) => k.get(n))), vincos, cantos: (r.passo.cantos ?? []).map((n) => k.get(n)), borda: r.passo.borda ?? 'suave' };
    };
    const receita = (nome) => oraculo.receitas.find((x) => x.nome === nome);

    it('as receitas cobrem vinco de nitidez 0,25, 0,5, 0,75 e vivo, e nenhuma endereça a gaiola por índice', () => {
      const nitidezes = new Set(oraculo.receitas.flatMap((r) => r.passo.vincos.map((v) => v.nitidez)));
      for (const n of [0.25, 0.5, 0.75, 'viva']) expect(nitidezes.has(n)).toBe(true);
      for (const r of oraculo.receitas) {
        expect(enderecosPorIndice(r.passo)).toEqual([]);
        expect(JSON.stringify([r.passo.vertices, r.passo.faces, r.passo.vincos.map((v) => v.pontos), r.passo.cantos ?? []])).not.toMatch(/[[,]-?\d/);
      }
      // o detector acusa a forma por índice
      expect(enderecosPorIndice({ vertices: [[0, 0, 0], 'a'], faces: [[0, 1, 'a']], vincos: [[0, 1, 2], { nome: 'v', pontos: ['a', 3] }], cantos: [4], medidas: ['a'] }))
        .toEqual(['vertices[0]', 'faces[0][0]', 'faces[0][1]', 'vincos[0][0]', 'vincos[0][1]', 'vincos[0][2]', 'vincos[1].pontos[1]', 'cantos[0]']);
    });

    for (const r of oraculo.receitas) {
      for (const n of r.niveis) {
        it(`a operação com vincos nomeados confere com o Blender: ${r.nome}, ${n} nível(is)`, () => {
          const passos = [['subdivisao', { origemId: 1, ...r.passo, niveis: n }]];
          const neutro = nucleo(passos, r.pontos);
          expect(neutro.orfaos).toEqual([]);
          const P = [...neutro.V.values()];
          const b = oraculo.blender[`${r.nome}@${n}`];
          expect(P.length).toBe(b.length);
          expect(Math.max(desvio(P, b), desvio(b, P))).toBeLessThan(1e-6);
          expect(JSON.stringify(neutroCanonico(nucleo(passos, r.pontos)))).toBe(JSON.stringify(neutroCanonico(neutro)));
        });
      }
      for (const n of r.limite) {
        it(`a superfície limite confere com a do Blender (use_limit_surface): ${r.nome}, ${n} nível(is)`, () => {
          const L = subdividirCatmullClark({ ...gaiolaDaReceita(r), niveis: n, aoLimite: true }).vertices;
          const b = oraculo.blender[`${r.nome}@${n}@limite`];
          expect(Math.max(desvio(L, b), desvio(b, L))).toBeLessThan(1e-6);
        });
      }
    }

    it('o vinco 1 do Blender é vivo: a superfície limite dele não confere com a nitidez finita logo abaixo de 10', () => {
      const r = receita('cubo-1m-arestas-viva');
      const g = gaiolaDaReceita(r);
      expect(nitidezDoVinco(1)).toBe(Infinity);
      expect(subdividirCatmullClark({ ...g, vincos: g.vincos.map(([a, b]) => [a, b, NITIDEZ_VIVA]), niveis: 2, aoLimite: true })).toEqual(subdividirCatmullClark({ ...g, niveis: 2, aoLimite: true }));
      const quase = subdividirCatmullClark({ ...g, vincos: g.vincos.map(([a, b]) => [a, b, NITIDEZ_VIVA - 0.01]), niveis: 2, aoLimite: true }).vertices;
      const b = oraculo.blender[`${r.nome}@2@limite`];
      expect(Math.max(desvio(quase, b), desvio(b, quase))).toBeGreaterThan(1e-4);
    });

    /* Raio de borda: no cubo de 1 m com as 12 arestas vincadas, o meio da aresta cai na superfície limite à folga g da
       quina, medida na diagonal, e o filete circular de mesma folga tem raio g / (√2 - 1). */
    it('a nitidez dá o raio de borda: 107 mm em 0,5, 12,2 mm em 0,75, 2,1 mm em 0,9 e zero no vinco vivo, no cubo de 1 m', () => {
      const r = receita('cubo-1m-arestas-viva');
      const raio = (n) => {
        const g = refinarGaiola(gaiolaDaReceita(r, n));
        const L = limitesDaGaiola(g);
        const meio = g.vertices.findIndex((p) => dist(p, [0, 0.5, 0.5]) < 1e-12);
        return dist(L[meio], [0, 0.5, 0.5]) / (Math.SQRT2 - 1);
      };
      expect(raio(0.5)).toBeCloseTo(0.10669, 5);
      expect(raio(0.75)).toBeCloseTo(0.012227, 5);
      expect(raio(0.9)).toBeCloseTo(0.002113, 5);
      expect(raio('viva')).toBe(0);
    });

    it('medidas continuam passando pela superfície com vincos nomeados, bit a bit', () => {
      const casos = [['cubo-1m-arestas-05', ['c000', 'c100', 'c110', 'c010', 'c001', 'c101', 'c111', 'c011']], ['cubo-1m-arestas-075', ['c000', 'c110', 'c011']], ['cubo-1m-arestas-viva', ['c000', 'c111']], ['chapa-vincos-025-05-075', ['g1_2', 'g4_3', 'g3_1', 'g2_2', 'g0_0', 'g5_4']], ['chapa-vinco-vivo-borda-cantos', ['g1_2', 'g3_2', 'g4_3', 'g2_1']]];
      for (const [nome, medidas] of casos) {
        const r = receita(nome);
        const passos = [['subdivisao', { origemId: 1, ...r.passo, niveis: 2, medidas }]];
        expect(enderecosPorIndice(passos[0][1])).toEqual([]);
        const neutro = nucleo(passos, r.pontos);
        expect(neutro.orfaos).toEqual([]);
        const P = [...neutro.V.values()];
        for (const m of medidas) expect(Math.min(...P.map((p) => dist(p, r.pontos[m])))).toBeLessThan(1e-6);
        expect(JSON.stringify(neutroCanonico(nucleo(passos, r.pontos)))).toBe(JSON.stringify(neutroCanonico(neutro)));
      }
    });
  });

  describe('vincos e cantos nomeados gritam com os nomes', () => {
    const r = oraculo.receitas.find((x) => x.nome === 'chapa-vincos-025-05-075');
    const grito = (extra) => {
      const neutro = nucleo([['subdivisao', { origemId: 1, ...r.passo, niveis: 1, ...extra }]], { ...r.pontos, solto: [9, 9, 9] });
      expect(neutro.V.size).toBe(0);
      expect(neutro.orfaos).toHaveLength(1);
      return neutro.orfaos[0];
    };

    it('recusa vinco por índice de aresta e mostra a forma nomeada', () => {
      const o = grito({ vincos: [[0, 1, 0.5]] });
      expect(o).toMatchObject({ op: 'subdivisao', ref: 'vincos' });
      expect(o.motivo).toMatch(/índice de aresta não é aceito/);
      expect(o.motivo).toContain("pontos: ['a', 'b', 'c']");
      expect(o.motivo).toContain("'viva'");
    });

    it('recusa canto por índice de vértice e mostra a forma nomeada', () => {
      const o = grito({ cantos: [3] });
      expect(o).toMatchObject({ ref: 'cantos' });
      expect(o.motivo).toMatch(/canto por índice de vértice não é aceito/);
      expect(grito({ cantos: ['g9_9'] }).motivo).toContain("'g9_9'");
    });

    it('par de pontos consecutivos que não é aresta da gaiola grita com os nomes', () => {
      expect(grito({ vincos: [{ nome: 'diagonal', pontos: ['g0_0', 'g1_1'], nitidez: 0.5 }] }).motivo).toBe("o vinco 'diagonal' liga 'g0_0' a 'g1_1', que não formam aresta da gaiola");
      expect(grito({ vincos: [{ nome: 'parado', pontos: ['g0_0', 'g0_0'], nitidez: 0.5 }] }).motivo).toContain("liga 'g0_0' a 'g0_0'");
    });

    it('ponto inexistente, nome de vinco repetido e aresta em dois vincos gritam', () => {
      expect(grito({ vincos: [{ nome: 'dobra', pontos: ['g0_0', 'g9_9'], nitidez: 0.5 }] }).motivo).toBe("o vinco 'dobra' cita o ponto 'g9_9', que não é ponto nomeado da gaiola");
      expect(grito({ vincos: [{ nome: 'dobra', pontos: ['g0_0', 'solto'], nitidez: 0.5 }] }).motivo).toContain("'solto'");
      expect(grito({ vincos: [{ nome: 'a', pontos: ['g0_0', 'g1_0'], nitidez: 1 }, { nome: 'a', pontos: ['g1_0', 'g2_0'], nitidez: 1 }] }).motivo).toBe("o nome de vinco 'a' aparece mais de uma vez");
      expect(grito({ vincos: [{ nome: 'a', pontos: ['g0_0', 'g1_0'], nitidez: 1 }, { nome: 'b', pontos: ['g2_0', 'g1_0', 'g0_0'], nitidez: 1 }] }).motivo).toBe("a aresta 'g1_0'-'g0_0' está nos vincos 'a' e 'b'");
    });

    it('nitidez fora de 0 a 1, ausente ou com campo desconhecido grita', () => {
      expect(grito({ vincos: [{ nome: 'a', pontos: ['g0_0', 'g1_0'], nitidez: 1.5 }] }).motivo).toMatch(/nitidez vai de 0 a 1/);
      expect(grito({ vincos: [{ nome: 'a', pontos: ['g0_0', 'g1_0'] }] }).motivo).toMatch(/precisa de nitidez/);
      expect(grito({ vincos: [{ nome: 'a', pontos: ['g0_0', 'g1_0'], nitidez: 1, aresta: 3 }] }).motivo).toMatch(/campo desconhecido 'aresta'/);
    });

    it('ponto repetido na gaiola e face com ponto inexistente gritam', () => {
      expect(grito({ vertices: [...r.passo.vertices, 'g0_0'] }).motivo).toBe("o ponto 'g0_0' aparece mais de uma vez na gaiola");
      expect(grito({ faces: [...r.passo.faces, ['g0_0', 'g1_0', 'nenhum']] }).motivo).toContain("cita o ponto 'nenhum'");
    });

    it('a nitidez aceita nome de PARAMS', () => {
      const passo = { ...r.passo, vincos: r.passo.vincos.map((v) => ({ ...v, nitidez: v.nitidez === 0.5 ? 'nitidezDaDobra' : v.nitidez })) };
      const a = nucleo([['subdivisao', { origemId: 1, ...passo, niveis: 1 }]], { ...r.pontos, nitidezDaDobra: 0.5 });
      const b = nucleo([['subdivisao', { origemId: 1, ...r.passo, niveis: 1 }]], r.pontos);
      expect(a.orfaos).toEqual([]);
      expect(JSON.stringify(neutroCanonico(a))).toBe(JSON.stringify(neutroCanonico(b)));
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
