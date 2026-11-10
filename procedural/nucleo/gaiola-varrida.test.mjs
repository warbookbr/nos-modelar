/* gaiola-varrida.test.mjs — a gaiola varrida: uma régua em reta, um friso em arco com as pontas cortadas numa altura, uma seção com
 * borda rolada e alargamento, os recortes e os vincos, a entrega ao passo `subdivisao` e os gritos de dado ruim com o campo.
 *
 * A prova é numérica: posição de cada ponto contra a conta feita à mão, raio a cada ponto do arco, altura das pontas, o máximo e o limite
 * da borda rolada contra a fórmula escrita no teste, normais para fora e mesma saída byte a byte. As peças são as de
 * `fixtures/varredura-prova.js`. */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ErroGaiolaVarrida, gaiolaVarrida } from './gaiola-varrida.js';
import { nucleo } from './entrada.js';
import { ARCO, SAIA, friso, regua, saia } from './fixtures/varredura-prova.js';

const MM = 1000;
const perto = (a, b, tol = 1e-9) => a.every((x, k) => Math.abs(x - b[k]) <= tol);
const grito = (fn) => { try { fn(); } catch (e) { return e; } throw new Error('não gritou'); };
const distAoEixoX = (p, c) => Math.hypot(p[1] - c[1], p[2] - c[2]);
const normal = (g, f) => {
  const ps = f.map((n) => g.posicoes.get(n)); let n = [0, 0, 0];
  ps.forEach((p, k) => { const q = ps[(k + 1) % ps.length]; n = [n[0] + (p[1] - q[1]) * (p[2] + q[2]), n[1] + (p[2] - q[2]) * (p[0] + q[0]), n[2] + (p[0] - q[0]) * (p[1] + q[1])]; });
  const c = ps.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
  return { n, c };
};
/* a soma das arestas: quantas faces cada aresta tem, e o volume assinado (mm³ na gaiola, m³ no neutro) */
const usoDasArestas = (faces) => {
  const m = new Map();
  for (const f of faces) f.forEach((a, k) => { const b = f[(k + 1) % f.length]; const c = a < b ? `${a}|${b}` : `${b}|${a}`; m.set(c, (m.get(c) ?? 0) + 1); });
  return [...new Set(m.values())].sort();
};
const volumeAssinado = (faces, ponto) => faces.reduce((v, f) => {
  const a = ponto(f[0]);
  for (let k = 1; k + 1 < f.length; k++) { const b = ponto(f[k]); const c = ponto(f[k + 1]); v += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6; }
  return v;
}, 0);
const assinatura = (g) => createHash('sha256').update(JSON.stringify({ ...g, posicoes: [...g.posicoes] })).digest('hex');
const entrega = (g, extra = {}) => nucleo([['subdivisao', { vertices: g.vertices, faces: g.faces, vincos: g.vincos, cantos: g.cantos, niveis: 1, ...extra }]], {}, g.pontos);

describe('a régua varrida em reta', () => {
  const g = gaiolaVarrida(regua());

  it('tem uma estação a cada 100 mm e cada ponto na conta feita à mão', () => {
    expect(g.estacoes).toHaveLength(11);
    expect(g.vertices).toHaveLength(33);
    expect(g.faces).toHaveLength(20);
    expect(g.comprimento).toBeCloseTo(1000, 9);
    for (let i = 0; i <= 10; i++) {
      [0, 50, 100].forEach((v, j) => expect(perto(g.posicoes.get(g.nomeDe(i, j)), [0, v, 100 * i])).toBe(true));
    }
  });

  it('sai em metro nos pontos, em mm nas posições, e as faces olham para o lado de fora', () => {
    expect(g.pontos[g.nomeDe(10, 2)]).toEqual([0, 0.1, 1]);
    for (const f of g.faces) expect(normal(g, f).n[0]).toBeGreaterThan(0);
    const contra = gaiolaVarrida(regua({ fora: [-1, 0, 0] }));
    for (const f of contra.faces) expect(normal(contra, f).n[0]).toBeLessThan(0);
  });

  it('o passo subdivisao aceita a gaiola e devolve a superfície sobre a faixa', () => {
    const neutro = entrega(g);
    const ys = [...neutro.V.values()].map((p) => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(0, 9);
    expect(Math.max(...ys)).toBeCloseTo(0.1, 9);
    expect(neutro.F.size).toBe(g.faces.length * 4);
  });

  it('mesma definição, mesma saída, byte a byte', () => {
    expect(JSON.stringify(gaiolaVarrida(regua()))).toBe(JSON.stringify(g));
  });

  it('um marco em mm, uma divisão em n partes e um trilho em polilinha dão a mesma régua', () => {
    const b = gaiolaVarrida(regua({ trilho: { pontos: [[0, 0, 0], [0, 0, 1000]] }, estacoes: [{ em: 0 }, { entre: 10 }, { em: 1000 }] }));
    expect(b.vertices).toEqual(g.vertices);
    for (const n of g.vertices) expect(perto(b.posicoes.get(n), g.posicoes.get(n), 1e-9)).toBe(true);
  });
});

describe('o friso em arco com as pontas cortadas', () => {
  const g = gaiolaVarrida(friso());

  it('cada linha fica no raio da seção em torno do eixo, em todas as estações', () => {
    const raios = [ARCO.raio, ARCO.raio + 20, ARCO.raio + 60];
    g.estacoes.forEach((_, i) => raios.forEach((r, j) => expect(distAoEixoX(g.posicoes.get(g.nomeDe(i, j)), ARCO.centro)).toBeCloseTo(r, 6)));
  });

  it('as pontas acabam na altura pedida em todas as linhas, uma subindo e a outra descendo', () => {
    const ult = g.estacoes.length - 1;
    for (let j = 0; j < 3; j++) {
      const a = g.posicoes.get(g.nomeDe(0, j)); const b = g.posicoes.get(g.nomeDe(ult, j));
      expect(a[1]).toBeCloseTo(ARCO.corteDeFrente, 6);
      expect(b[1]).toBeCloseTo(ARCO.corteDeTras, 6);
      expect(a[2]).toBeGreaterThan(0); // a frente do arco
      expect(b[2]).toBeLessThan(0); // a traseira
    }
  });

  it('a seção sai em x pela aresta u, e as faces olham para o lado de fora', () => {
    expect(g.posicoes.get(g.nomeDe(3, 1))[0]).toBeCloseTo(525, 9);
    expect(g.posicoes.get(g.nomeDe(3, 0))[0]).toBeCloseTo(500, 9);
    for (const f of g.faces) expect(normal(g, f).n[0]).toBeGreaterThan(0);
  });

  it('as estações andam em ângulo igual entre as pontas, e a superfície subdivide', () => {
    expect(g.estacoes).toHaveLength(13);
    const ang = (i) => Math.atan2(g.posicoes.get(g.nomeDe(i, 0))[1] - 300, g.posicoes.get(g.nomeDe(i, 0))[2]);
    const passo = ang(1) - ang(0);
    for (let i = 1; i < 12; i++) expect(ang(i + 1) - ang(i)).toBeCloseTo(passo, 9);
    const neutro = entrega(g);
    expect(neutro.F.size).toBe(g.faces.length * 4);
    const ys = [...neutro.V.values()].map((p) => p[1] * MM);
    expect(Math.max(...ys)).toBeLessThanOrEqual(300 + ARCO.raio + 60 + 1e-6);
  });

  it('um marco que a linha não cruza grita com o marco e a linha', () => {
    const e = grito(() => gaiolaVarrida(friso({ estacoes: [{ plano: { eixo: 'y', valor: 400 }, cruzando: 'subindo' }, { plano: { eixo: 'y', valor: 5000 }, nome: 'alto' }] })));
    expect(e).toBeInstanceOf(ErroGaiolaVarrida);
    expect(e.message).toMatch(/linha 'boca' da seção não cruza o corte 'alto'/);
  });
});

describe('a seção com borda rolada e alargamento', () => {
  const g = gaiolaVarrida(saia());
  const perfil = (d) => {
    const p = SAIA.perfil;
    if (d <= p[0][0] || d >= p.at(-1)[0]) return 0;
    let k = 1; while (p[k][0] < d) k++;
    return p[k - 1][1] + ((p[k][1] - p[k - 1][1]) * (d - p[k - 1][0])) / (p[k][0] - p[k - 1][0]);
  };
  const dFora = (z, y) => Math.hypot(y - SAIA.cilindro.por[1], z - SAIA.cilindro.por[2]) - SAIA.cilindro.raio;
  const proprio = { borda: 10, rolo: 20, face: 20, topo: -1 };
  const vs = { borda: 0, rolo: 10, face: 80, topo: 150 };

  it('cada linha sai pelo maior entre a seção e o perfil, e a borda de baixo fica limitada à razão', () => {
    let tocouNoAlargamento = 0; let tocouNoLimite = 0;
    g.estacoes.forEach((_, i) => ['borda', 'rolo', 'face'].forEach((nome, j) => {
      const p = g.posicoes.get(g.nomeDe(i, j));
      const s = perfil(dFora(p[2], vs[nome]));
      let esperado = s > 0 ? Math.max(s, proprio[nome]) : proprio[nome];
      if (s > 0 && vs[nome] < SAIA.rolada.abaixoDe) esperado = Math.min(esperado, SAIA.rolada.razao * proprio[nome]);
      expect(p[0]).toBeCloseTo(esperado, 9);
      expect(p[1]).toBeCloseTo(vs[nome], 9);
      if (s > proprio[nome]) tocouNoAlargamento += 1;
      if (s > 0 && vs[nome] < SAIA.rolada.abaixoDe && SAIA.rolada.razao * proprio[nome] < Math.max(s, proprio[nome])) tocouNoLimite += 1;
    }));
    expect(tocouNoAlargamento).toBeGreaterThan(0);
    expect(tocouNoLimite).toBeGreaterThan(0);
  });

  it('a linha que encosta na chapa fica nela, e com topoAberto sobe com o alargamento', () => {
    g.estacoes.forEach((_, i) => expect(g.posicoes.get(g.nomeDe(i, 3))[0]).toBeCloseTo(-1, 9));
    const aberto = gaiolaVarrida(saia({}, { topoAberto: true }));
    let subiu = 0;
    aberto.estacoes.forEach((_, i) => {
      const p = aberto.posicoes.get(aberto.nomeDe(i, 3));
      const s = perfil(dFora(p[2], 150));
      expect(p[0]).toBeCloseTo(s > 0 ? Math.max(s, proprio.topo) : proprio.topo, 9);
      if (s > 0) subiu += 1;
    });
    expect(subiu).toBeGreaterThan(0);
  });

  it('sem o limite rolado a borda de baixo acompanha o perfil inteiro', () => {
    const livre = gaiolaVarrida(saia({}, { rolada: undefined }));
    const maior = (gg) => Math.max(...gg.estacoes.map((_, i) => gg.posicoes.get(gg.nomeDe(i, 0))[0]));
    expect(maior(livre)).toBeGreaterThan(maior(g) + 1);
    expect(maior(g)).toBeCloseTo(SAIA.rolada.razao * proprio.borda, 9);
  });

  it('uma lista de alargamentos dá a cada ponto o maior entre as suas saídas', () => {
    const outro = { campo: { cilindro: { ...SAIA.cilindro, por: [0, 100, 900] } }, perfil: SAIA.perfil, rolada: SAIA.rolada };
    const um = gaiolaVarrida(saia());
    const dois = gaiolaVarrida(saia({ alargamento: [saia().alargamento, outro] }));
    const so = gaiolaVarrida(saia({ alargamento: outro }));
    let maisLargo = 0;
    um.estacoes.forEach((_, i) => ['borda', 'rolo', 'face'].forEach((nome, j) => {
      const x = (gg) => gg.posicoes.get(gg.nomeDe(i, j))[0];
      expect(x(dois)).toBeCloseTo(Math.max(x(um), x(so)), 9);
      if (x(dois) > x(um) + 1e-9) maisLargo += 1;
    }));
    expect(maisLargo).toBeGreaterThan(0);
  });

  it('o passo medido na linha citada põe o mesmo número de estações em todas as linhas', () => {
    const base = friso({ estacoes: [{ plano: { eixo: 'y', valor: 400 }, cruzando: 'subindo' }, { passo: 5 * Math.PI / 180 * ARCO.raio, linha: 'boca' }, { plano: { eixo: 'y', valor: 420 }, cruzando: 'descendo' }] });
    const g = gaiolaVarrida(base);
    const alcance = (nome) => { const s = g.estacoes; const j = g.linhas.indexOf(nome); return s.at(-1).s[j] - s[0].s[j]; };
    expect(g.estacoes).toHaveLength(Math.ceil(alcance('boca') / (5 * Math.PI / 180 * ARCO.raio) - 1e-9) + 1);
    const e = grito(() => gaiolaVarrida(friso({ estacoes: [base.estacoes[0], { passo: 5, linha: 'nada' }, base.estacoes[2]] })));
    expect(e.message).toMatch(/estacoes\[1\]\.linha cita 'nada', que não é nome de linha da seção/);
  });

  it('o passo subdivisao aceita a malha com o alargamento', () => {
    const neutro = entrega(g, { liso: false });
    expect(neutro.F.size).toBe(g.faces.length * 4);
  });
});

describe('os recortes, os vincos e a escala', () => {
  it('remover tira só as células entre os marcos e as linhas citadas, e o vinco para onde a aresta perde a vizinha', () => {
    const base = regua({ estacoes: [{ fracao: 0, nome: 'a' }, { entre: 4 }, { em: 500, nome: 'b' }, { entre: 4 }, { fracao: 1, nome: 'c' }], vincos: [{ linha: 'meio', nitidez: 'viva' }] });
    const inteira = gaiolaVarrida(base);
    const recortada = gaiolaVarrida({ ...base, remover: [{ estacoes: ['b', 'c'], linhas: ['baixo', 'cima'] }] });
    expect(inteira.faces).toHaveLength(16);
    expect(recortada.faces).toHaveLength(8);
    expect(recortada.vertices.every((n) => n.startsWith('regua_'))).toBe(true);
    expect(inteira.vincos).toHaveLength(1);
    expect(inteira.vincos[0].pontos).toHaveLength(9);
    expect(recortada.vincos[0].pontos).toHaveLength(5);
    const so = gaiolaVarrida({ ...base, remover: [{ estacoes: ['b', 'c'], linhas: ['baixo', 'cima'] }] });
    expect(so.vertices).toEqual(recortada.vertices);
    expect(entrega(recortada).F.size).toBe(recortada.faces.length * 4);
  });

  it('a escala dos marcos faz a seção sair menos numa ponta e anda em linha reta entre eles', () => {
    const g = gaiolaVarrida(regua({
      secao: [{ u: 0, v: 0 }, { u: 40, v: 100 }],
      estacoes: [{ fracao: 0, escala: 1 }, { entre: 5 }, { fracao: 1, escala: 0.5 }],
    }));
    const xs = g.estacoes.map((_, i) => g.posicoes.get(g.nomeDe(i, 1))[0]);
    expect(xs[0]).toBeCloseTo(40, 9);
    expect(xs[5]).toBeCloseTo(20, 9);
    expect(xs[2]).toBeCloseTo(32, 9);
  });

  it('o trilho em segmentos de reta e arco se emenda: uma planta de reta, quina e reta', () => {
    const g = gaiolaVarrida({
      nome: 'planta',
      trilho: [{ reta: { de: [-300, 0, 0], ate: [0, 0, 0] } }, { arco: { centro: [0, 0, 100], eixo: [0, 1, 0], de: [0, 0, 0], graus: -90 } }, { reta: { de: [100, 0, 100], ate: [100, 0, 400] } }],
      quadro: { v: [0, 1, 0], virar: true },
      secao: [{ u: 0, v: 0 }, { u: 20, v: 0 }, { u: 20, v: 50 }],
      estacoes: [{ fracao: 0 }, { passo: 50 }, { fracao: 1 }],
      fora: { centro: [0, 0, 100], semEixo: 'y' },
    });
    expect(g.comprimento).toBeCloseTo(300 + (Math.PI / 2) * 100 + 300, 6);
    const ultimo = g.estacoes.length - 1;
    expect(perto(g.posicoes.get(g.nomeDe(0, 0)), [-300, 0, 0], 1e-6)).toBe(true);
    expect(perto(g.posicoes.get(g.nomeDe(ultimo, 0)), [100, 0, 400], 1e-6)).toBe(true);
    const ponta = g.posicoes.get(g.nomeDe(ultimo, 1));
    expect(Math.abs(ponta[0] - 100)).toBeCloseTo(20, 6);
    // o v fixo é a vertical e o u sai pelo lado do centro da quina: nenhuma face olha para o centro (as da aba plana olham para cima ou para baixo)
    for (const f of g.faces) {
      const { n, c } = normal(g, f);
      expect(n[0] * (c[0] - 0) + n[2] * (c[2] - 100)).toBeGreaterThanOrEqual(-1e-3);
    }
  });
});

describe('sem fechada e sem tampas a saída é a de antes delas', () => {
  /* as assinaturas foram tiradas da gaiolaVarrida antes de fechada e tampas existirem: o furgão usa a saída aberta */
  it('a régua com vinco, o friso cortado e a saia com topo aberto dão as mesmas assinaturas, byte a byte', () => {
    expect(assinatura(gaiolaVarrida(regua({ vincos: [{ linha: 'meio', nitidez: 'viva' }] })))).toBe('002c1a545f19aaa2a8f04b380cff883164119574ef05eba44c087be8418567fc');
    expect(assinatura(gaiolaVarrida(friso()))).toBe('852df2088f6c511c2109b9f2f6296d70c34294a87d8d6dca78618213c1a009fd');
    expect(assinatura(gaiolaVarrida(saia({}, { topoAberto: true })))).toBe('0854b5c16b7cb5fb05d4afc7cfb2527333bfc818072c8ac9017e58d55c99d445');
    expect(JSON.stringify(gaiolaVarrida(regua({ fechada: false, tampas: false })))).toBe(JSON.stringify(gaiolaVarrida(regua())));
  });
});

describe('o tubo de seção fechada com tampas', () => {
  /* um tubo de seção quadrada de 70 mm varrido por um L com dobra de raio 60 mm: sobe 500 mm, dobra 90 graus e corre 400 mm em -z */
  const L = [{ reta: { de: [0, 0, 0], ate: [0, 500, 0] } }, { arco: { centro: [0, 500, -60], eixo: [1, 0, 0], de: [0, 500, 0], graus: -90 } }, { reta: { de: [0, 560, -60], ate: [0, 560, -460] } }];
  const tubo = (extra = {}) => ({
    nome: 'tubo', trilho: L, quadro: { u: [1, 0, 0] },
    secao: [{ u: -35, v: -35, nome: 'a' }, { u: 35, v: -35, nome: 'b' }, { u: 35, v: 35, nome: 'c' }, { u: -35, v: 35, nome: 'd' }],
    fechada: true, tampas: true, estacoes: [{ fracao: 0 }, { passo: 25 }, { fracao: 1 }], ...extra,
  });
  const g = gaiolaVarrida(tubo());

  it('fecha: toda aresta fica em duas faces, o volume assinado é positivo e dá a seção vezes o comprimento do eixo', () => {
    expect(g.comprimento).toBeCloseTo(500 + (Math.PI / 2) * 60 + 400, 9);
    expect(usoDasArestas(g.faces)).toEqual([2]);
    const v = volumeAssinado(g.faces, (n) => g.posicoes.get(n));
    expect(v).toBeGreaterThan(0);
    /* na dobra o quadrado gira em volta do eixo, e o volume de um tubo dobrado é a área vezes o comprimento do eixo (Pappus); a dobra
       em cordas tira um pouco, menos de 0,5 % */
    expect(Math.abs(v / (70 * 70 * g.comprimento) - 1)).toBeLessThan(0.005);
    expect(g.faces).toHaveLength(4 * (g.estacoes.length - 1) + 2);
  });

  it('a seção tem 70 mm em toda estação, nas duas direções', () => {
    g.estacoes.forEach((_, i) => {
      const p = (j) => g.posicoes.get(g.nomeDe(i, j));
      const d = (a, b) => Math.hypot(...p(a).map((x, k) => x - p(b)[k]));
      expect(d(0, 1)).toBeCloseTo(70, 9);
      expect(d(1, 2)).toBeCloseTo(70, 9);
      expect(d(0, 2)).toBeCloseTo(70 * Math.SQRT2, 9);
    });
  });

  it('a seção dada no sentido contrário sai com as normais para fora do mesmo jeito', () => {
    const contra = gaiolaVarrida(tubo({ secao: [...tubo().secao].reverse() }));
    expect(usoDasArestas(contra.faces)).toEqual([2]);
    expect(volumeAssinado(contra.faces, (n) => contra.posicoes.get(n))).toBeCloseTo(volumeAssinado(g.faces, (n) => g.posicoes.get(n)), 6);
  });

  it('sem tampas é o tubo aberto nas pontas, com as mesmas faces do lado, e com vincos nas quinas o passo subdivisao fecha', () => {
    const aberto = gaiolaVarrida(tubo({ tampas: false }));
    expect(aberto.faces).toEqual(g.faces.slice(0, aberto.faces.length));
    expect(aberto.faces).toHaveLength(g.faces.length - 2);
    const vivo = gaiolaVarrida(tubo({ vincos: ['a', 'b', 'c', 'd'].map((linha) => ({ linha, nitidez: 'viva' })) }));
    expect(vivo.vincos.map((v) => v.pontos.length)).toEqual([...[0, 1, 2, 3].map(() => vivo.estacoes.length), 5, 5]);
    const neutro = entrega(vivo, { niveis: 2 });
    const faces = [...neutro.F.values()].map((f) => f.vs);
    expect(usoDasArestas(faces)).toEqual([2]);
    expect(volumeAssinado(faces, (k) => neutro.V.get(k))).toBeGreaterThan(0);
  });

  it('com tampas: true o aro de cada tampa é vinco vivo, e a subdivisão deixa as pontas no lugar; redondas encurta', () => {
    expect(g.vincos.map((v) => [v.nome, v.pontos.length, v.nitidez])).toEqual([['tubo_tampa_0', 5, 'viva'], ['tubo_tampa_1', 5, 'viva']]);
    const redondas = gaiolaVarrida(tubo({ tampas: 'redondas' }));
    expect(redondas.faces).toEqual(g.faces);
    expect(redondas.vincos).toEqual([]);
    /* as pontas medidas ao longo do trilho: a de baixo pelo menor y (o trilho sobe em +y desde y 0) e a do fim pelo menor z (ele
       corre em -z até z -460) */
    const pontas = (gg) => {
      const ps = [...entrega(gg, { niveis: 2 }).V.values()].map((p) => p.map((x) => x * MM));
      return [Math.min(...ps.map((p) => p[1])), Math.min(...ps.map((p) => p[2]))];
    };
    const [baixo, fim] = pontas(g);
    expect(Math.abs(baixo - 0)).toBeLessThan(1);
    expect(Math.abs(fim + 460)).toBeLessThan(1);
    const [baixoR, fimR] = pontas(redondas);
    expect(baixoR).toBeGreaterThan(1);
    expect(fimR).toBeGreaterThan(-460 + 1);
  });

  it('mesma definição, mesma saída, byte a byte', () => {
    expect(assinatura(gaiolaVarrida(tubo()))).toBe(assinatura(g));
  });
});

describe('o perfil em U, de seção aberta, com espessura no passo e arco no trilho', () => {
  /* um U de 60 por 40 mm, boca para baixo, varrido por uma reta de 300 mm e um quarto de volta de raio 200 mm */
  const u = gaiolaVarrida({
    nome: 'perfilU',
    trilho: [{ reta: { de: [0, 0, 0], ate: [0, 0, 300] } }, { arco: { centro: [200, 0, 300], eixo: [0, 1, 0], de: [0, 0, 300], graus: 90 } }],
    quadro: { v: [0, 1, 0] },
    secao: [{ u: -30, v: 0, nome: 'abaEsq' }, { u: -30, v: 40, nome: 'quinaEsq' }, { u: 30, v: 40, nome: 'quinaDir' }, { u: 30, v: 0, nome: 'abaDir' }],
    estacoes: [{ fracao: 0 }, { passo: 20 }, { fracao: 1 }],
    fora: [0, 1, 0],
    vincos: [{ linha: 'quinaEsq', nitidez: 'viva' }, { linha: 'quinaDir', nitidez: 'viva' }],
  });

  it('a gaiola é a faixa aberta de três células, com as abas no raio pedido em toda a curva', () => {
    expect(u.comprimento).toBeCloseTo(300 + (Math.PI / 2) * 200, 9);
    expect(u.estacoes).toHaveLength(Math.ceil(u.comprimento / 20 - 1e-9) + 1);
    expect(u.faces).toHaveLength(3 * (u.estacoes.length - 1));
    expect(usoDasArestas(u.faces)).toEqual([1, 2]);
    const ultimo = u.estacoes.length - 1;
    /* no fim do arco a tangente é +x, e as abas ficam a 30 mm do centro do trilho em z */
    expect(perto(u.posicoes.get(u.nomeDe(ultimo, 0)), [200, 0, 470], 1e-6) || perto(u.posicoes.get(u.nomeDe(ultimo, 0)), [200, 0, 530], 1e-6)).toBe(true);
    u.estacoes.forEach((e, i) => {
      if (e.s[0] <= 300) return;
      [0, 3].forEach((j) => { const p = u.posicoes.get(u.nomeDe(i, j)); expect(Math.hypot(p[0] - 200, p[2] - 300)).toBeCloseTo(j === 0 ? 230 : 170, 6); });
    });
  });

  it('com espessura no passo subdivisao vira sólido fechado, com toda aresta em duas faces', () => {
    const neutro = entrega(u, { espessura: 0.003 });
    const faces = [...neutro.F.values()].map((f) => f.vs);
    expect(usoDasArestas(faces)).toEqual([2]);
    expect(faces.length).toBeGreaterThan(u.faces.length * 4 * 2);
  });
});

describe('o dado ruim grita com o campo', () => {
  const diz = (def, trecho) => {
    const e = grito(() => gaiolaVarrida(def));
    expect(e).toBeInstanceOf(ErroGaiolaVarrida);
    expect(e.message).toMatch(trecho);
  };

  it('campos que faltam ou sobram', () => {
    const { fora, ...semFora } = regua();
    diz(semFora, /fora é obrigatório/);
    diz(regua({ cor: 'azul' }), /a definição tem campo desconhecido 'cor'/);
    diz(regua({ nome: '' }), /nome precisa ser texto/);
    const { secao, ...semSecao } = regua();
    diz(semSecao, /secao é obrigatória/);
  });

  it('trilho', () => {
    diz(regua({ trilho: [] }), /trilho precisa ser lista/);
    diz(regua({ trilho: [{ reta: { de: [0, 0, 0], ate: [0, 0, 0] } }] }), /trilho\[0\]\.reta tem a ponta igual ao começo/);
    diz(regua({ trilho: [{ reta: { de: [0, 0, 0], ate: [0, 0, 10] } }, { reta: { de: [5, 0, 10], ate: [5, 0, 20] } }] }), /trilho\[1\] começa em \[5,0,10\]/);
    diz(regua({ trilho: [{ arco: { centro: [0, 0, 0], eixo: [1, 0, 0], de: [0, 0, 5], graus: 0 } }] }), /trilho\[0\]\.arco\.graus/);
    diz(regua({ trilho: [{ arco: { centro: [0, 0, 0], eixo: [0, 0, 0], de: [0, 0, 5], graus: 90 } }] }), /trilho\[0\]\.arco\.eixo é o vetor nulo/);
    diz(regua({ trilho: [{ reta: { de: [0, 0, 0], ate: [0, 0, 'x'] } }] }), /trilho\[0\]\.reta\.ate precisa ser \[x, y, z\]/);
    diz(regua({ trilho: [{ reta: { de: [0, 0, 0], ate: [0, 0, 1] }, arco: {} }] }), /trilho\[0\] precisa ter reta ou arco, um só/);
  });

  it('quadro e seção', () => {
    diz(regua({ quadro: { u: [1, 0, 0], v: [0, 1, 0] } }), /quadro precisa ter u ou v, um só/);
    diz(regua({ quadro: { u: [0, 0, 1] } }), /quadro é paralelo ao trilho/);
    diz(regua({ secao: [[0, 0]] }), /secao precisa ser lista de pelo menos duas linhas/);
    diz(regua({ secao: [[0, 0], [0, 0]] }), /secao\[1\] repete o ponto de secao\[0\]/);
    diz(regua({ secao: [{ u: 0, v: 0, nome: 'a' }, { u: 0, v: 1, nome: 'a' }] }), /o nome de linha 'a' aparece mais de uma vez/);
    diz(regua({ secao: [[0, 0], [0, 'alto']] }), /secao\[1\]\.v precisa ser número finito/);
  });

  it('estações', () => {
    diz(regua({ estacoes: [{ fracao: 0 }] }), /estacoes precisa ser lista com pelo menos dois marcos/);
    diz(regua({ estacoes: [{ entre: 3 }, { fracao: 1 }] }), /estacoes\[0\] divide um trecho e precisa ficar entre dois marcos/);
    diz(regua({ estacoes: [{ fracao: 0 }, { entre: 0 }, { fracao: 1 }] }), /estacoes\[1\]\.entre precisa ser maior que 0/);
    diz(regua({ estacoes: [{ fracao: 0 }, { entre: 2 }, { passo: 3 }, { fracao: 1 }] }), /estacoes\[2\] vem logo depois de outra divisão/);
    diz(regua({ estacoes: [{ fracao: 0, em: 1 }, { fracao: 1 }] }), /estacoes\[0\] precisa ter um só corte/);
    diz(regua({ estacoes: [{ fracao: 2 }, { fracao: 1 }] }), /estacoes\[0\]\.fracao precisa estar entre 0 e 1/);
    diz(regua({ estacoes: [{ em: 5000 }, { fracao: 1 }] }), /estacoes\[0\] está em 5000 mm, fora do trilho/);
    diz(regua({ estacoes: [{ fracao: 0.6, nome: 'x' }, { fracao: 0.4, nome: 'y' }] }), /os cortes 'x' e 'y' caem no mesmo lugar ou fora de ordem/);
    diz(regua({ estacoes: [{ fracao: 0, nome: 'x' }, { fracao: 1, nome: 'x' }] }), /o nome de estação 'x' aparece mais de uma vez/);
    diz(regua({ estacoes: [{ plano: { eixo: 'w', valor: 1 } }, { fracao: 1 }] }), /estacoes\[0\]\.plano\.eixo precisa ser 'x', 'y' ou 'z'/);
    diz(regua({ estacoes: [{ fracao: 0, cruzando: 'subindo' }, { fracao: 1 }] }), /estacoes\[0\]\.cruzando só vale com plano ou cilindro/);
  });

  it('alargamento, recortes e vincos', () => {
    diz(saia({}, { perfil: [[0, 0], [0, 5]] }), /alargamento\.perfil\[1\] tem d = 0, que não passa do anterior/);
    diz(saia({}, { perfil: [[0, 0]] }), /alargamento\.perfil precisa ser lista de pelo menos dois pontos/);
    diz(saia({}, { rolada: { abaixoDe: -5, razao: 1.5 } }), /alargamento\.rolada\.abaixoDe = -5 fica abaixo de todas as linhas/);
    diz(saia({}, { rolada: { abaixoDe: 5, razao: 0 } }), /alargamento\.rolada\.razao precisa ser maior que 0/);
    diz(saia({}, { campo: { cilindro: { eixo: [1, 0, 0], por: [0, 0, 0] } } }), /alargamento\.campo\.cilindro\.raio precisa ser número finito/);
    diz(regua({ remover: [{ estacoes: ['inicio', 'fim'], linhas: ['baixo', 'nao'] }] }), /remover\[0\]\.linhas cita 'nao', que não é nome de linha declarado/);
    diz(regua({ remover: [{ estacoes: ['fim', 'inicio'], linhas: ['baixo', 'cima'] }] }), /remover\[0\]\.estacoes vai de 'fim' a 'inicio', que não está depois dele/);
    diz(regua({ remover: [{ estacoes: ['inicio', 'fim'], linhas: ['baixo', 'cima'] }] }), /os recortes tiram todas as faces/);
    diz(regua({ vincos: [{ linha: 'topo', nitidez: 1 }] }), /vincos\[0\]\.linha precisa ser o nome de uma linha da seção/);
    diz(regua({ vincos: [{ linha: 'baixo', nitidez: 2 }] }), /vincos\[0\]\.nitidez precisa ser de 0 a 1, ou 'viva'/);
    diz(regua({ fora: { centro: [0, 0, 0], semEixo: 'q' } }), /fora\.semEixo precisa ser/);
  });

  it('fechada e tampas', () => {
    const { fora, ...semFora } = regua();
    const quadrado = [[0, 0], [10, 0], [10, 10], [0, 10]];
    diz(regua({ tampas: true }), /tampas pede fechada: true/);
    diz({ ...semFora, secao: quadrado, tampas: true, fechada: false }, /tampas pede fechada: true/);
    diz({ ...semFora, secao: [[0, 0], [10, 0]], fechada: true }, /a seção fechada precisa de pelo menos três linhas, e veio com 2/);
    diz({ ...semFora, secao: [[0, 0], [10, 0], [10, 10], [0, 0]], fechada: true }, /secao\[3\] repete o ponto de secao\[0\]/);
    diz({ ...semFora, secao: [[0, 0], [10, 0], [20, 0]], fechada: true, tampas: true }, /a seção fechada não encerra volume/);
    diz(regua({ secao: quadrado, fechada: true }), /fora não vale com fechada/);
    diz(regua({ fechada: 'sim' }), /fechada precisa ser true ou false, e veio "sim"/);
    diz({ ...semFora, secao: quadrado, fechada: true, tampas: 'planas' }, /tampas precisa ser true, false ou 'redondas', e veio "planas"/);
    diz({ ...semFora, secao: quadrado, tampas: 'redondas' }, /tampas pede fechada: true/);
    diz(semFora, /fora é obrigatório/);
  });
});
