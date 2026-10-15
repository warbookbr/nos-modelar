/* A malha que uma família entrega ao esboço (`src/malha.js`, dado `mecanifica.malha@1`): a leitura recentra, confere e dá o volume; as
   peças convexas deixam livre o furo e o oco que o casco da parte inteira taparia (o motivo da decomposição); o casco por seções que
   a blocagem do nível zero lê passa na conferência de contorno convexo da N2. A malha de prova é um tubo de parede, o que o cilindro
   hidráulico e o cubo da roda do trem do avião têm de oco. */
import { describe, expect, it } from 'vitest';
import { ErroDeEsboco } from '../src/index.js';
import { cascoEmSecoes, eixoDaMalha, fatiarMalha, furoDaMalha, lerMalha, pecasLocaisDaMalha } from '../src/malha.js';
import { cascoConvexo } from '../src/decomposicao-convexa.js';
import { asaDeSecoes, tuboOco } from './malha-de-prova.js';

const norma = (v) => Math.hypot(...v);

describe('lerMalha', () => {
  it('recentra os vértices e as âncoras no centro da caixa, dá o volume pela divergência e a normal de cada face', () => {
    const dado = tuboOco({ centro: [1000, 50, -20], ancoras: { boca: [1050, 50, -20] } });
    const m = lerMalha(dado);
    expect(m.caixa.min).toEqual([-50, -20, -20]);
    expect(m.caixa.max).toEqual([50, 20, 20]);
    expect(m.ancoras.boca).toEqual([50, 0, 0]);
    /* o anel de raio 20 e 10 inscritos em 32 lados: a área da coroa do polígono vezes o comprimento */
    const area = (r) => 16 * r * r * Math.sin((2 * Math.PI) / 32);
    expect(m.volume).toBeCloseTo((area(20) - area(10)) * 100, 3);
    expect(m.normais).toHaveLength(m.faces.length);
    for (const n of m.normais) expect(norma(n)).toBeCloseTo(1, 9);
    expect(m.deslocamento).toEqual([1000, 50, -20]);
  });

  it('inverte a malha inteira cujo volume sai negativo e devolve a mesma leitura do mesmo dado', () => {
    const dado = tuboOco({});
    const contrario = { ...dado, faces: dado.faces.map((f) => [...f].reverse()) };
    expect(lerMalha(contrario).volume).toBeCloseTo(lerMalha(dado).volume, 6);
    expect(lerMalha(dado)).toBe(lerMalha(dado));
  });

  it('recusa com o campo e o que é válido', () => {
    const dado = tuboOco({});
    expect(() => lerMalha(null)).toThrow(/a malha deve ser/);
    expect(() => lerMalha({ ...dado, cor: 'azul' })).toThrow(/a malha não tem o campo "cor"/);
    expect(() => lerMalha({ ...dado, formato: 'outra@1' })).toThrow(/"formato" da malha deve ser "mecanifica.malha@1"/);
    expect(() => lerMalha({ ...dado, vertices: [[0, 0, 0]] })).toThrow(/"vertices" deve ser uma lista de 4 ou mais/);
    expect(() => lerMalha({ ...dado, faces: [[0, 1, 9999], ...dado.faces] })).toThrow(/faces\[0\] deve ter 3 ou mais índices distintos de 0 a/);
    expect(() => lerMalha({ ...dado, partes: [{ nome: 'a', de: 0, ate: 99999 }] })).toThrow(/partes\[0\]/);
    expect(() => lerMalha({ ...dado, ancoras: { 'a.b': [0, 0, 0] } })).toThrow(/a âncora "a.b" não serve/);
    expect(() => lerMalha({ ...dado, ancoras: { centro: [0, 0, 0] } })).toThrow(/não pode ser vazio, ter ponto nem arroba, nem ser um nome da forma/);
    expect(() => lerMalha({ ...dado, eixo: 'w' })).toThrow(/"eixo" da malha deve ser "x", "y" ou "z"/);
    expect(() => lerMalha(null, 'forma "t"')).toThrow(ErroDeEsboco);
  });
});

describe('as peças convexas da malha', () => {
  const m = lerMalha(tuboOco({}));
  const pecas = pecasLocaisDaMalha(m);

  it('cortam o tubo em várias peças, na mesma ordem a cada leitura', () => {
    expect(pecas.length).toBeGreaterThan(4);
    expect(pecasLocaisDaMalha(lerMalha(tuboOco({})))).toEqual(pecas);
    for (const p of pecas) {
      expect(p.verts.length).toBeGreaterThanOrEqual(4);
      expect(p.normais.length).toBeGreaterThan(0);
      for (let e = 0; e < 3; e++) { expect(p.min[e]).toBeGreaterThanOrEqual(m.caixa.min[e] - 1e-6); expect(p.max[e]).toBeLessThanOrEqual(m.caixa.max[e] + 1e-6); }
    }
  });

  it('nenhuma peça entra no furo de raio 10 além da concavidade aceita, e a parede de 10 a 20 mm fica coberta', () => {
    /* o casco do tubo inteiro seria o cilindro cheio, com o furo tapado: aqui o raio do ponto de cada peça mais perto do eixo é o do furo
       menos a concavidade (a corda de uma cunha) e nunca zero */
    const raios = pecas.flatMap((p) => p.verts.map((v) => Math.hypot(v[1], v[2])));
    expect(Math.min(...raios)).toBeGreaterThan(8.5);
    expect(Math.max(...raios)).toBeCloseTo(20, 6);
    /* cada vértice da superfície está em alguma peça: o que a malha tem não fica de fora do gate */
    for (const v of m.vertices) {
      const dentro = pecas.some((p) => [0, 1, 2].every((e) => v[e] >= p.min[e] - 1e-6 && v[e] <= p.max[e] + 1e-6));
      expect(dentro).toBe(true);
    }
  });
});

describe('o casco por seções, para a blocagem do nível zero', () => {
  const m = lerMalha(tuboOco({ eixo: 'x' }));
  const c = cascoEmSecoes(m, { secoes: 8, raios: 48 });

  it('tem as seções do eixo principal, em posição crescente e com o mesmo número de pontos', () => {
    expect(eixoDaMalha(m)).toBe('x');
    expect(c.eixo).toBe('x');
    expect(c.eixosDoPerfil).toEqual(['z', 'y']);
    expect(c.comprimento).toBe(100);
    expect(c.secoes).toHaveLength(8);
    expect(c.secoes[0].w).toBe(-50);
    expect(c.secoes[7].w).toBe(50);
    c.secoes.forEach((s, i) => { if (i > 0) expect(s.w).toBeGreaterThan(c.secoes[i - 1].w); expect(s.perfil).toHaveLength(48); });
  });

  it('cada seção envolve o tubo (raio 20 em 32 lados) sem furo, e passa na conferência de contorno convexo da N2', () => {
    for (const s of c.secoes) {
      const raios = s.perfil.map(([u, v]) => Math.hypot(u, v));
      expect(Math.max(...raios)).toBeCloseTo(20, 1);
      expect(Math.min(...raios)).toBeGreaterThan(19);
      /* a conferência da N2 (forma-global.js): cada trio de pontos seguidos com área acima de 1e-9 vira para o mesmo lado */
      let sinal = 0;
      for (let i = 0; i < s.perfil.length; i++) {
        const a = s.perfil[i]; const b = s.perfil[(i + 1) % s.perfil.length]; const d = s.perfil[(i + 2) % s.perfil.length];
        const cruz = (b[0] - a[0]) * (d[1] - b[1]) - (b[1] - a[1]) * (d[0] - b[0]);
        if (Math.abs(cruz) <= 1e-9) continue;
        if (sinal !== 0) expect(Math.sign(cruz)).toBe(sinal);
        sinal = Math.sign(cruz);
      }
    }
  });

  it('um contorno de aresta reta (a placa) também passa: os raios sobre a reta repetem o ponto anterior em vez de ficarem colineares', () => {
    const placa = lerMalha({
      formato: 'mecanifica.malha@1',
      vertices: [[0, 0, 0], [60, 0, 0], [60, 20, 0], [0, 20, 0], [0, 0, 40], [60, 0, 40], [60, 20, 40], [0, 20, 40]],
      faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]],
      eixo: 'z',
    });
    const cp = cascoEmSecoes(placa, { secoes: 3, raios: 32 });
    for (const s of cp.secoes) {
      expect(s.perfil).toHaveLength(32);
      expect(new Set(s.perfil.map((q) => q.join(','))).size).toBeLessThan(32);
      const xs = s.perfil.map((q) => q[0]); const ys = s.perfil.map((q) => q[1]);
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(60, 3);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(20, 3);
    }
  });

  it('sem `eixo` declarado o eixo principal é o da maior extensão', () => {
    expect(eixoDaMalha(lerMalha(tuboOco({})))).toBe('x');
  });

  /* a área de um polígono (shoelace), em valor absoluto */
  const areaDe = (p) => Math.abs(p.reduce((a, q, i) => a + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0)) / 2;

  it('sem número de seções pedido, o casco tem uma seção em cada nível de nervura da malha e planos entre as nervuras que passam da faixa máxima', () => {
    const asa = lerMalha(asaDeSecoes({ secoes: 5, n: 60 }));
    const c = cascoEmSecoes(asa);
    const niveis = [...new Set(asa.vertices.map((v) => Math.round(v[0] * 1000) / 1000))].sort((a, b) => a - b);
    expect(niveis).toHaveLength(5);
    for (const w of niveis) expect(c.secoes.map((sc) => sc.w), `a nervura em ${w}`).toContain(w);
    const ws = c.secoes.map((sc) => sc.w);
    for (let i = 1; i < ws.length; i++) {
      expect(ws[i]).toBeGreaterThan(ws[i - 1]);
      expect(ws[i] - ws[i - 1], `a faixa até ${ws[i]}`).toBeLessThanOrEqual(c.comprimento / 23 + 1e-3);
    }
    /* a seção do nível de uma nervura é o contorno dela: a corda e a espessura da elipse da nervura de meio de envergadura */
    const meio = c.secoes.find((sc) => Math.abs(sc.w - niveis[2]) < 1e-3);
    const larg = (i) => Math.max(...meio.perfil.map((q) => q[i])) - Math.min(...meio.perfil.map((q) => q[i]));
    const corda = 700 * (1 - 0.5 * 0.5);
    const espessura = 160 * (1 - 0.5 * 0.5);
    expect(Math.max(larg(0), larg(1))).toBeCloseTo(corda, 1);
    expect(Math.min(larg(0), larg(1))).toBeCloseTo(espessura, 1);
  });

  it('com o número de seções pedido, os planos são uniformes (o número pedido é o que vale)', () => {
    const asa = lerMalha(asaDeSecoes({ secoes: 5, n: 60 }));
    const c = cascoEmSecoes(asa, { secoes: 7, raios: 48 });
    expect(c.secoes).toHaveLength(7);
    expect(c.secoes[1].w - c.secoes[0].w).toBeCloseTo(c.comprimento / 6, 2);
  });

  it('a seção fina e comprida guarda os quatro cantos: o ponto de cada direção é o vértice mais extremo, e não o corte do raio a partir do centro', () => {
    /* uma placa de 200 por 6 mm girada 4 graus no plano da seção: os cantos caem entre dois raios de 7,5 graus */
    const a = (4 * Math.PI) / 180;
    const gira = ([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    const base = [[-100, -3], [100, -3], [100, 3], [-100, 3]].map(gira);
    const placa = lerMalha({
      formato: 'mecanifica.malha@1',
      vertices: [...base.map(([x, y]) => [x, y, 0]), ...base.map(([x, y]) => [x, y, 40])],
      faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]],
      eixo: 'z',
    });
    for (const raios of [48, 32]) {
      const c = cascoEmSecoes(placa, { secoes: 3, raios });
      for (const sc of c.secoes) {
        expect(areaDe(sc.perfil), `${raios} pontos, seção em ${sc.w}`).toBeGreaterThan(0.999 * 200 * 6);
        for (const canto of base) {
          const dist = Math.min(...sc.perfil.map((q) => Math.hypot(q[0] - canto[0], q[1] - canto[1])));
          expect(dist, `canto ${canto.map((x) => x.toFixed(1))}`).toBeLessThan(1e-3);
        }
      }
    }
  });
});

describe('o furo que atravessa a malha ao longo do eixo', () => {
  it('o tubo de parede tem o furo do raio interno (o apótema do polígono de 32 lados), centrado, que o casco convexo fecha', () => {
    const m = lerMalha(tuboOco({ n: 32, rExt: 20, rInt: 10 }));
    const furo = furoDaMalha(m);
    expect(furo.centro).toEqual([0, 0]);
    expect(furo.raio).toBeCloseTo(10 * Math.cos(Math.PI / 32), 2);
    expect(furo.raio).toBeLessThanOrEqual(10 * Math.cos(Math.PI / 32));
    expect(furoDaMalha(m)).toBe(furo);
    const casco = cascoEmSecoes(m, { secoes: 4, raios: 48 });
    for (const s of casco.secoes) expect(Math.min(...s.perfil.map(([u, v]) => Math.hypot(u, v)))).toBeGreaterThan(19);
  });

  it('o furo menor que a folga entre as faces não conta, e a superfície com tampas não tem furo', () => {
    expect(furoDaMalha(lerMalha(asaDeSecoes({ secoes: 5, n: 60 })))).toBeNull();
    expect(furoDaMalha(lerMalha(tuboOco({ n: 32, rExt: 20, rInt: 0.4 })))).toBeNull();
  });
});

describe('fatiarMalha', () => {
  it('devolve só as faces voltadas para quem olha, com a silhueta e o vinco como linhas', () => {
    const m = lerMalha(tuboOco({}));
    const r = { prisma: { malha: m }, matriz: null, centro: [0, 0, 0] };
    const blocos = fatiarMalha(r, [0, 0, 1], { semFatias: true });
    expect(blocos).toHaveLength(1);
    const lados = blocos[0].lados;
    expect(lados.length).toBeGreaterThan(0);
    expect(lados.length).toBeLessThan(m.faces.length);
    for (const f of lados) expect(f.n[2]).toBeGreaterThan(0);
    expect(blocos[0].linhas.length).toBeGreaterThan(0);
    /* de dentro do eixo, olhando ao longo dele, vê-se a coroa da tampa e a parede do furo, e a malha inteira vai nos blocos do desenho */
    const emBlocos = fatiarMalha(r, [1, 0, 0]);
    expect(emBlocos.length).toBeGreaterThanOrEqual(1);
    expect(emBlocos.flatMap((b) => b.lados).length).toBeGreaterThan(0);
  });
});

describe('a superfície de seções planas, como a asa de 12 m do avião', () => {
  const dado = asaDeSecoes({});
  const m = lerMalha(dado);

  it('o casco tem no máximo 2n - 4 triângulos, com cada seção de 60 pontos no mesmo plano', () => {
    const pontos = m.vertices;
    const casco = cascoConvexo(pontos);
    expect(casco.faces.length).toBeLessThanOrEqual(2 * pontos.length - 4);
    /* o casco envolve todos os vértices, a menos do deslocamento de posição geral (1e-7 da extensão, 0,0012 mm nesta asa) */
    for (const v of pontos) for (const pl of casco.planos) expect(pl.n[0] * v[0] + pl.n[1] * v[1] + pl.n[2] * v[2]).toBeLessThanOrEqual(pl.d + 3);
  });

  it('a decomposição fecha dentro do orçamento de peças, cobre cada vértice e mede o casco por seções ao longo da envergadura', () => {
    const pecas = pecasLocaisDaMalha(m);
    expect(pecas.length).toBeGreaterThan(1);
    expect(pecas.length).toBeLessThanOrEqual(160);
    for (const v of m.vertices) expect(pecas.some((p) => [0, 1, 2].every((e) => v[e] >= p.min[e] - 1e-6 && v[e] <= p.max[e] + 1e-6))).toBe(true);
    const c = cascoEmSecoes(m);
    expect(c.eixo).toBe('x');
    expect(c.comprimento).toBe(12000);
  }, 30_000);
});

describe('a superfície fina de perfil em seções, como a deriva do avião', () => {
  /* 30 seções de perfil simétrico de 8% (20 pontos por lado), a corda afinando de 2000 para 1000 mm em 3 m de altura. Com o
     deslocamento de posição geral de 1e-7 da extensão, o casco desta nuvem saía com 129 mil triângulos em 6 s, e o da deriva do
     avião, com 1828 pontos, com 257 mil em 17 s. */
  const pontos = [];
  for (let s = 0; s < 30; s++) {
    const t = s / 29; const y = -1500 + 3000 * t; const corda = 2000 - 1000 * t; const z0 = 600 * t;
    for (let i = 0; i < 20; i++) {
      const u = (1 - Math.cos((Math.PI * i) / 19)) / 2;
      const meia = 5 * 0.08 * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1015 * u ** 4) * corda;
      const x = Math.round(meia * 1e6) / 1e6;
      pontos.push([x, y, z0 + u * corda]);
      if (i > 0 && i < 19) pontos.push([-x, y, z0 + u * corda]);
    }
  }

  it('o casco tem no máximo 2n - 4 triângulos e envolve todos os pontos', () => {
    const casco = cascoConvexo(pontos);
    expect(casco.faces.length).toBeLessThanOrEqual(2 * pontos.length - 4);
    for (const v of pontos) for (const pl of casco.planos) expect(pl.n[0] * v[0] + pl.n[1] * v[1] + pl.n[2] * v[2]).toBeLessThanOrEqual(pl.d + 0.1);
  });
});
