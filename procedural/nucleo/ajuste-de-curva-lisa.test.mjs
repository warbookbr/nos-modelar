/* ajuste-de-curva-lisa.test.mjs — o ajuste de curva lisa em curvas analíticas conhecidas (arco, clotoide, elipse, S), limpas e com ruído de leitura, com o número
 * de inflexões certo e o desvio de cada ponto dentro da tolerância; a curva que `gaiolaPorRede` consome; as recusas; e a planta da lataria do carro-fastback,
 * lida da TABELA da receita (só leitura), dentro dos 3 mm; e a leitura exata (`ponto`, `rumoEm`, `valorEm`) contra a reta, o arco e a clotoide em forma fechada. */
import { describe, expect, it } from 'vitest';
import { ajustarCurvaLisa, curvaLisaGuardada } from './ajuste-de-curva-lisa.js';
import { gaiolaPorRede } from './gaiola-por-rede.js';

const ANGULO_AUREO = Math.PI * (3 - Math.sqrt(5));
const ruido = (pontos, amplitude) => pontos.map(([u, v], i) => [u + amplitude * Math.sin(i * ANGULO_AUREO), v + amplitude * Math.cos(i * ANGULO_AUREO * 1.7)]);
const arco = (R, graus, n) => Array.from({ length: n }, (_, i) => { const a = ((i / (n - 1)) * graus * Math.PI) / 180; return [R * Math.sin(a), R * (1 - Math.cos(a))]; });
const clotoide = (n, L, k0, k1) => {
  let x = 0; let y = 0; let th = 0; const h = L / n; const saida = [[0, 0]];
  for (let i = 0; i < n; i += 1) { const k = k0 + ((k1 - k0) * (i + 0.5)) / n; th += (k * h) / 2; x += Math.cos(th) * h; y += Math.sin(th) * h; th += (k * h) / 2; saida.push([x, y]); }
  return saida;
};
const elipse = (a, b, n) => Array.from({ length: n }, (_, i) => { const t = (i / (n - 1)) * (Math.PI / 2) * 0.9; return [a * Math.cos(t), b * Math.sin(t)]; });

const CASOS = [
  { nome: 'arco de 500 mm e 90 graus', pontos: arco(500, 90, 60), inflexoes: 0, clotoides: 1 },
  { nome: 'clotoide de curvatura 1/800 a 1/300', pontos: clotoide(60, 700, 1 / 800, 1 / 300), inflexoes: 0, clotoides: 1 },
  { nome: 'quarto de elipse de 600 por 250 mm', pontos: elipse(600, 250, 70), inflexoes: 0 },
  { nome: 'S de curvatura -1/400 a 1/400 em 800 mm', pontos: clotoide(80, 800, -1 / 400, 1 / 400), inflexoes: 1, clotoides: 1 },
];

describe('ajustarCurvaLisa nas curvas analíticas', () => {
  for (const caso of CASOS) {
    for (const [rotulo, pontos, tolerancia] of [['limpa', caso.pontos, 0.5], ['com ruído de 0,3 mm', ruido(caso.pontos, 0.3), 1]]) {
      it(`${caso.nome}, ${rotulo}: ${caso.inflexoes} inflexão(ões) e todo ponto dentro de ${tolerancia} mm`, () => {
        const a = ajustarCurvaLisa(pontos, { tolerancia });
        expect(a.cabe).toBe(true);
        expect(a.inflexoes).toBe(caso.inflexoes);
        expect(Math.max(...a.desvios.map(Math.abs))).toBeLessThanOrEqual(tolerancia);
        expect(a.desvioMaximo).toBeLessThanOrEqual(tolerancia);
        expect(a.desvios).toHaveLength(pontos.length);
        if (caso.clotoides) expect(a.clotoides.length).toBeLessThanOrEqual(caso.clotoides + 1);
        expect(a.trechos.length).toBeLessThanOrEqual(3);
      });
    }
  }

  it('recupera as curvaturas do arco e da clotoide', () => {
    const a = ajustarCurvaLisa(arco(500, 90, 60), { tolerancia: 0.5 });
    expect(a.joelhos.every((j) => Math.abs(j.k - 1 / 500) < 2e-5)).toBe(true);
    const c = ajustarCurvaLisa(clotoide(60, 700, 1 / 800, 1 / 300), { tolerancia: 0.5 });
    expect(c.joelhos[0].k).toBeCloseTo(1 / 800, 4);
    expect(c.joelhos[c.joelhos.length - 1].k).toBeCloseTo(1 / 300, 4);
    expect(c.trechos[0].sentido).toBe('cresce');
  });

  it('a curva de duas cristas e uma inflexão cabe em poucos trechos', () => {
    /* curvatura: sobe a +1/300 e cai a 0, passa a -1/500 e volta a 0 */
    let x = 0; let y = 0; let th = 0; const pontos = [[0, 0]]; const L = 1600; const n = 160; const h = L / n;
    const kDe = (s) => { const f = s / L; if (f < 0.15) return 0; if (f < 0.3) return ((f - 0.15) / 0.15) / 300; if (f < 0.45) return (1 - (f - 0.3) / 0.15) / 300; if (f < 0.55) return (-(f - 0.45) / 0.1) / 500; if (f < 0.8) return -1 / 500; if (f < 0.9) return (-(0.9 - f) / 0.1) / 500; return 0; };
    for (let i = 0; i < n; i += 1) { const k = kDe((i + 0.5) * h); th += (k * h) / 2; x += Math.cos(th) * h; y += Math.sin(th) * h; th += (k * h) / 2; pontos.push([x, y]); }
    const a = ajustarCurvaLisa(ruido(pontos, 0.2), { tolerancia: 1, maximoDeClotoides: 10 });
    expect(a.cabe).toBe(true);
    expect(a.inflexoes).toBe(1);
    expect(a.clotoides.length).toBeLessThanOrEqual(9);
  });

  it('é determinística: o mesmo ajuste, bit a bit', () => {
    const pontos = ruido(arco(500, 60, 40), 0.3);
    const a = ajustarCurvaLisa(pontos, { tolerancia: 1 }); const b = ajustarCurvaLisa(pontos, { tolerancia: 1 });
    expect(a.joelhos).toEqual(b.joelhos); expect(a.desvios).toEqual(b.desvios);
  });

  it('recusa o que não entende, dizendo o que recebeu', () => {
    expect(() => ajustarCurvaLisa([[0, 0], [1, 1]])).toThrow(/pontos espera uma lista de 3 pontos ou mais, e veio 2 ponto/);
    expect(() => ajustarCurvaLisa(arco(500, 90, 10), { tolerancia: 0 })).toThrow(/tolerancia espera um número maior que zero.*veio 0/);
    expect(() => ajustarCurvaLisa(arco(500, 90, 10), { maximoDeClotoides: 0 })).toThrow(/maximoDeClotoides espera um inteiro/);
    expect(() => ajustarCurvaLisa(arco(500, 90, 10), { duros: [10] })).toThrow(/duros espera índices de 0 a 9/);
    expect(() => ajustarCurvaLisa([[0, 0], [1, 1], [NaN, 2]])).toThrow(/o ponto 2 precisa ser/);
    expect(() => ajustarCurvaLisa(arco(500, 90, 10), { eixos: [1, 1] })).toThrow(/eixos espera dois/);
  });

  it('o teto de trechos devolve a curva com cabe falso e o desvio que ficou', () => {
    const planta = clotoide(80, 800, -1 / 400, 1 / 400).map(([x, y], i) => [x, y + 8 * Math.sin(i / 6)]);
    const a = ajustarCurvaLisa(planta, { tolerancia: 0.5, maximoDeClotoides: 1 });
    expect(a.cabe).toBe(false);
    expect(a.desvioMaximo).toBeGreaterThan(0.5);
    expect(a.clotoides).toHaveLength(1);
  });
});

describe('a curva que a rede consome', () => {
  it('os pontos-chave de pontosDaRede, postos como curva de gaiolaPorRede, dão uma linha que fica a menos de 0,3 mm da curva ajustada', () => {
    const a = ajustarCurvaLisa(arco(600, 80, 60).map(([x, y]) => [x, 0, y]), { tolerancia: 0.5, eixos: [0, 2] });
    const curva = a.pontosDaRede(60, { nome: 'baixo' });
    expect(curva.pontos[0]).toHaveLength(3);
    expect(curva.pontos.every((p) => Math.abs(p[1]) < 1e-9)).toBe(true);
    const ponta = curva.pontos[curva.pontos.length - 1];
    const g = gaiolaPorRede({
      passo: 50, fora: [0, 1, 0],
      nos: { A: curva.pontos[0], B: ponta, C: [ponta[0], 0, ponta[2] + 200], D: [curva.pontos[0][0], 0, curva.pontos[0][2] + 200] },
      curvas: [{ nome: 'baixo', pontos: ['A', ...curva.pontos.slice(1, -1), 'B'] }, { nome: 'direita', pontos: ['B', 'C'] }, { nome: 'cima', pontos: ['C', 'D'] }, { nome: 'esquerda', pontos: ['D', 'A'] }],
      retalhos: [{ nome: 'placa', borda: ['baixo', 'direita', 'cima', 'esquerda'] }],
    });
    const fina = a.amostrar(0.5);
    const noFio = g.linha('baixo').map((nome) => g.pontos[nome].map((c) => c * 1000));
    expect(noFio.length).toBeGreaterThan(10);
    for (const [x, , z] of noFio) { const d = Math.min(...fina.map(([u, v]) => Math.hypot(u - x, v - z))); expect(d).toBeLessThan(0.3); }
  });
});

/* integração independente (Runge-Kutta de quarto grau, passo de um milésimo do arco) da curva devolvida, para medir o desvio real dos pontos sem usar o código do ajuste */
function curvaIndependente(a) {
  const L = a.comprimento; const N = 20000; const h = L / N;
  const kEm = (s) => { const j = a.joelhos; let i = 1; while (i < j.length - 1 && j[i].s < s) i += 1; const t = (s - j[i - 1].s) / (j[i].s - j[i - 1].s); return j[i - 1].k + (j[i].k - j[i - 1].k) * Math.min(1, Math.max(0, t)); };
  let [x, y] = a.inicio; let th = a.rumo; const saida = [[x, y]];
  for (let i = 0; i < N; i += 1) {
    const s = i * h; const k1 = kEm(s); const k2 = kEm(s + h / 2); const k3 = kEm(s + h);
    const f = (t, kk) => [Math.cos(t), Math.sin(t), kk];
    const a1 = f(th, k1); const a2 = f(th + (h / 2) * a1[2], k2); const a3 = f(th + (h / 2) * a2[2], k2); const a4 = f(th + h * a3[2], k3);
    x += (h / 6) * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]); y += (h / 6) * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]);
    th += (h / 6) * (a1[2] + 2 * a2[2] + 2 * a3[2] + a4[2]);
    saida.push([x, y]);
  }
  return saida;
}
const desvioReal = (a, pontos) => {
  const c = curvaIndependente(a);
  const aoSegmento = (u, v, [x0, y0], [x1, y1]) => { const ex = x1 - x0; const ey = y1 - y0; const t = Math.max(0, Math.min(1, ((u - x0) * ex + (v - y0) * ey) / (ex * ex + ey * ey))); return Math.hypot(u - x0 - ex * t, v - y0 - ey * t); };
  return Math.max(...pontos.map(([u, v]) => { let m = Infinity; for (let i = 0; i < c.length - 1; i += 1) m = Math.min(m, aoSegmento(u, v, c[i], c[i + 1])); return m; }));
};

describe('ajustarCurvaLisa: ruído comparável ao espaçamento', () => {
  for (const [amplitude, passo, tolerancia] of [[6, 10, 12.7], [2, 3, 4.2], [1, 2, 2.1], [4, 10, 8.5], [10, 20, 21]]) {
    it(`arco de 600 mm de raio e 900 mm, ruído de ${amplitude} mm a cada ${passo} mm, tolerância ${tolerancia}: uma clotoide e nenhuma inflexão`, () => {
      const n = Math.round(900 / passo) + 1;
      const pontos = ruido(Array.from({ length: n }, (_, i) => { const a = (i * passo) / 600; return [600 * Math.sin(a), 600 * (1 - Math.cos(a))]; }), amplitude);
      const a = ajustarCurvaLisa(pontos, { tolerancia });
      expect(a.cabe).toBe(true);
      expect(a.inflexoes).toBe(0);
      expect(a.clotoides.length).toBeLessThanOrEqual(2);
    });
  }
});

describe('ajustarCurvaLisa: entrada degenerada, escala, ordem e custo', () => {
  it('recusa pontos todos iguais e curva de comprimento desprezível perto da tolerância', () => {
    expect(() => ajustarCurvaLisa([[5, 5], [5, 5], [5, 5], [5, 5]], { tolerancia: 1 })).toThrow(/ajustarCurvaLisa: .*comprimento/);
    expect(() => ajustarCurvaLisa([[0, 0], [0.5, 0], [1, 0.1], [1.5, 0]], { tolerancia: 1 })).toThrow(/comprimento .* 1,6.*tolerância 1|comprimento/);
  });

  it('o desvio devolvido vale na escala de milímetros e na de dezenas de metros, medido por integração independente', () => {
    for (const [R, graus, tolerancia] of [[3, 90, 0.02], [50000, 20, 5], [200, 120, 0.05]]) {
      const n = 60; const pontos = Array.from({ length: n }, (_, i) => { const t = ((i / (n - 1)) * graus * Math.PI) / 180; return [R * Math.sin(t), R * (1 - Math.cos(t))]; });
      const a = ajustarCurvaLisa(pontos, { tolerancia });
      expect(a.cabe).toBe(true);
      expect(desvioReal(a, pontos)).toBeLessThanOrEqual(tolerancia * 1.02);
      expect(Math.abs(a.desvioMaximo - desvioReal(a, pontos))).toBeLessThan(tolerancia * 0.1);
    }
  });

  it('pontos fora de ordem ao longo da curva dão cabe falso', () => {
    const n = 40; const pontos = Array.from({ length: n }, (_, i) => { const t = (i / (n - 1)) * (Math.PI / 2); return [500 * Math.sin(t), 500 * (1 - Math.cos(t))]; });
    const embaralhados = [...pontos.slice(0, 10), ...pontos.slice(20, 30), ...pontos.slice(10, 20), ...pontos.slice(30)];
    expect(ajustarCurvaLisa(embaralhados, { tolerancia: 1 }).cabe).toBe(false);
  });

  it('pontos que vão e voltam sobre a mesma curva, ou uma curva bem mais longa que a poligonal, dão cabe falso', () => {
    const n = 30; const ida = Array.from({ length: n }, (_, i) => { const t = (i / (n - 1)) * (Math.PI / 2); return [500 * Math.sin(t), 500 * (1 - Math.cos(t))]; });
    expect(ajustarCurvaLisa([...ida, ...[...ida].reverse().slice(1)], { tolerancia: 1 }).cabe).toBe(false);
  });

  it('um arco de 1 km de raio com 3000 pontos e ruído leva poucos segundos', () => {
    const n = 3001; const pontos = ruido(Array.from({ length: n }, (_, i) => { const t = (i * 0.5) / 1000; return [1000 * Math.sin(t), 1000 * (1 - Math.cos(t))]; }), 0.3);
    const t0 = Date.now(); const a = ajustarCurvaLisa(pontos, { tolerancia: 1 });
    expect(a.cabe).toBe(true); expect(a.clotoides.length).toBeLessThanOrEqual(2); expect(a.inflexoes).toBe(0);
    expect(Date.now() - t0).toBeLessThan(8000);
  });
});

describe('ajustarCurvaLisa: a contagem de inflexões mede a sagita na curva integrada', () => {
  const porCurvatura = (kDe, L, n) => { let x = 0; let y = 0; let th = 0; const h = L / n; const saida = [[0, 0]]; for (let i = 0; i < n; i += 1) { const k = kDe((i + 0.5) * h); th += (k * h) / 2; x += Math.cos(th) * h; y += Math.sin(th) * h; th += (k * h) / 2; saida.push([x, y]); } return saida; };
  const comLobulo = (fundo) => (s) => { const base = 1 / 400; if (s < 300 || s > 600) return base; const t = 1 - Math.abs(s - 450) / 150; return base - (base - fundo) * t; };
  it('um lóbulo triangular fundo conta duas inflexões, e o raso que a tolerância não distingue some', () => {
    const fundo = ajustarCurvaLisa(porCurvatura(comLobulo(-1 / 250), 900, 180), { tolerancia: 1, maximoDeClotoides: 10 });
    expect(fundo.cabe).toBe(true); expect(fundo.inflexoes).toBe(2);
    const raso = ajustarCurvaLisa(porCurvatura(comLobulo(-1 / 40000), 900, 180), { tolerancia: 1, maximoDeClotoides: 10 });
    expect(raso.cabe).toBe(true); expect(raso.inflexoes).toBe(0);
  });
});

describe('ajustarCurvaLisa: a entrada recusada diz o que recebeu', () => {
  const ok = Array.from({ length: 10 }, (_, i) => [i * 10, i * i]);
  it('mistura de pontos de 2 e de 3 componentes, tolerância em texto, duros que não é lista e coordenada livre que varia', () => {
    expect(() => ajustarCurvaLisa([[0, 0], [1, 1, 0], [2, 3], [3, 7]])).toThrow(/ajustarCurvaLisa: .*2 e 3 componentes.*ponto 1/);
    expect(() => ajustarCurvaLisa(ok, { tolerancia: '5' })).toThrow(/ajustarCurvaLisa: tolerancia espera .*veio "5"/);
    expect(() => ajustarCurvaLisa(ok, { duros: 3 })).toThrow(/ajustarCurvaLisa: duros espera uma lista.*veio 3/);
    expect(() => ajustarCurvaLisa(ok.map(([x, y], i) => [x, 5 * i, y]), { tolerancia: 1, eixos: [0, 2] })).toThrow(/ajustarCurvaLisa: .*coordenada livre.*varia/);
  });
});

describe('ajustarCurvaLisa: invariância de escala, lombada, coordenada livre e curva fechada', () => {
  /* reta de 200, filete de 90 graus de raio 20, reta de 200, pontos a cada 1 */
  const filete = () => {
    const p = []; for (let i = 0; i <= 200; i += 1) p.push([i, 0]);
    const n = Math.round((Math.PI / 2) * 20); for (let i = 1; i <= n; i += 1) { const a = (i / n) * (Math.PI / 2); p.push([200 + 20 * Math.sin(a), 20 * (1 - Math.cos(a))]); }
    for (let i = 1; i <= 200; i += 1) p.push([220, 20 + i]);
    return p;
  };
  const esse = () => clotoide(300, 300, -1 / 60, 1 / 60);
  for (const [nome, gerar, inflexoes] of [['filete de 90 graus entre duas retas', filete, 0], ['S de curvatura variável', esse, 1]]) {
    it(`${nome}: o mesmo cabe e as mesmas inflexões a ×1e-3, ×1 e ×1e3`, () => {
      const lidos = [1e-3, 1, 1e3].map((S) => ajustarCurvaLisa(gerar().map(([x, y]) => [x * S, y * S]), { tolerancia: 0.5 * S }));
      for (const a of lidos) { expect(a.cabe, a.motivo).toBe(true); expect(a.inflexoes).toBe(inflexoes); }
      expect(lidos[0].clotoides.length).toBe(lidos[1].clotoides.length);
      expect(lidos[2].clotoides.length).toBe(lidos[1].clotoides.length);
    });
  }

  /* uma lombada gaussiana de 3 mm e sigma 40 sobre um arco de raio 20000: a curvatura troca de sinal duas vezes, com sagita de 1,18 mm acima da tolerância */
  const lombada = (passo) => Array.from({ length: Math.round(400 / passo) + 1 }, (_, i) => { const x = i * passo - 200; return [x, (x * x) / 40000 + 3 * Math.exp(-(x * x) / (2 * 40 * 40))]; });
  it('a lombada de 3 mm sobre um arco de 20 m: duas inflexões e cabe, a 15, 5 e 1 mm de espaçamento', () => {
    for (const passo of [15, 5, 1]) {
      const a = ajustarCurvaLisa(lombada(passo), { tolerancia: 1, maximoDeClotoides: 10 });
      expect(a.cabe, `passo ${passo}: ${a.motivo}`).toBe(true);
      expect(a.inflexoes, `passo ${passo}`).toBe(2);
    }
  });

  it('a coordenada livre em rampa de 0 a 0,5 com tolerância 0,5: o desvio 3D até a curva da rede fica dentro da tolerância', () => {
    const elipse2d = elipse(600, 250, 70); const n = elipse2d.length;
    const pontos = elipse2d.map(([x, y], i) => [x, y, (0.5 * i) / (n - 1)]);
    const a = ajustarCurvaLisa(pontos, { tolerancia: 0.5, eixos: [0, 1] });
    expect(a.cabe, a.motivo).toBe(true);
    expect(a.desvioMaximo).toBeLessThanOrEqual(0.5);
    const rede = a.pontosDaRede(0.5).pontos;
    const ao3d = ([px, py, pz]) => { let m = Infinity; for (let i = 0; i < rede.length - 1; i += 1) { const [ax, ay, az] = rede[i]; const [bx, by, bz] = rede[i + 1]; const ex = bx - ax; const ey = by - ay; const ez = bz - az; const t = Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey + (pz - az) * ez) / (ex * ex + ey * ey + ez * ez))); m = Math.min(m, Math.hypot(px - ax - ex * t, py - ay - ey * t, pz - az - ez * t)); } return m; };
    expect(Math.max(...pontos.map(ao3d))).toBeLessThanOrEqual(0.5);
    expect(() => ajustarCurvaLisa(elipse2d.map(([x, y], i) => [x, y, (2 * i) / (n - 1)]), { tolerancia: 0.5 })).toThrow(/coordenada livre.*gasta a tolerância/);
  });

  it('a curva fechada sai cabe falso dizendo o motivo, e coordenada enorme é recusada com o valor', () => {
    const circulo = Array.from({ length: 41 }, (_, i) => [300 * Math.cos((i / 40) * 2 * Math.PI), 300 * Math.sin((i / 40) * 2 * Math.PI)]);
    const a = ajustarCurvaLisa(circulo, { tolerancia: 1 });
    expect(a.cabe).toBe(false);
    expect(a.motivo).toMatch(/último ponto se projeta|não estão em ordem|primeiro ponto se projeta/);
    expect(() => ajustarCurvaLisa([[0, 0], [1, 1], [2, 4], [1e300, 5]], { tolerancia: 1 })).toThrow(/ponto 3 tem coordenada de módulo acima de 1e100.*1e\+300/);
    expect(ajustarCurvaLisa(arco(500, 90, 30), { tolerancia: 0.5 }).motivo).toBe(null);
  });
});

/* a curva dada direto pelos joelhos, sem ajuste: o que a leitura exata lê */
const curvaDe = ({ inicio = [0, 0], rumo = 0, comprimento, joelhos }) => curvaLisaGuardada({ inicio, rumo, comprimento, joelhos, tolerancia: 1 });
/* a clotoide pura (curvatura c s, do início [0, 0] e rumo 0) pela série de Fresnel: x = soma (-1)^n (c/2)^(2n) s^(4n+1) / ((2n)! (4n+1)), y = soma (-1)^n (c/2)^(2n+1) s^(4n+3) / ((2n+1)! (4n+3)) */
const fresnel = (c, s) => {
  const z = (c / 2) * s * s; let x = 0; let y = 0; let termo = 1;
  for (let n = 0; n < 60; n += 1) { x += ((n % 2 ? -1 : 1) * termo * s) / (4 * n + 1); termo *= z / (2 * n + 1); y += ((n % 2 ? -1 : 1) * termo * s) / (4 * n + 3); termo *= z / (2 * n + 2); }
  return [x, y];
};
const fracoesDoArco = [0, 0.001, 0.137, 0.25, 0.5, 0.61803, 0.9, 0.999, 1];

describe('a leitura exata da curva: ponto, rumoEm e valorEm', () => {
  it('a reta: o ponto e o rumo a menos de 1e-9 do comprimento, nas escalas de 1e-3, 1 e 1e3', () => {
    for (const e of [1e-3, 1, 1e3]) {
      const L = 1000 * e; const c = curvaDe({ inicio: [5 * e, -2 * e], rumo: 0.3, comprimento: L, joelhos: [{ f: 0, k: 0 }, { f: 1, k: 0 }] });
      for (const f of fracoesDoArco) {
        const [x, y] = c.ponto(f * L);
        expect(Math.hypot(x - (5 * e + f * L * Math.cos(0.3)), y - (-2 * e + f * L * Math.sin(0.3))) / L).toBeLessThan(1e-9);
        expect(c.rumoEm(f * L)).toBeCloseTo(0.3, 12);
      }
    }
  });

  it('o arco de 250 de raio e 3,6 rad: o ponto e o rumo a menos de 1e-9, nas três escalas', () => {
    for (const e of [1e-3, 1, 1e3]) {
      const R = 250 * e; const L = 900 * e; const th0 = 0.7; const c = curvaDe({ inicio: [3 * e, 4 * e], rumo: th0, comprimento: L, joelhos: [{ f: 0, k: 1 / R }, { f: 1, k: 1 / R }] });
      for (const f of fracoesDoArco) {
        const s = f * L; const [x, y] = c.ponto(s);
        expect(Math.hypot(x - (3 * e + R * (Math.sin(th0 + s / R) - Math.sin(th0))), y - (4 * e - R * (Math.cos(th0 + s / R) - Math.cos(th0)))) / L).toBeLessThan(1e-9);
        expect(Math.abs(c.rumoEm(s) - (th0 + s / R))).toBeLessThan(1e-9);
      }
    }
  });

  it('a clotoide pura, de curvatura 0 a 1/100 em 1000 (5 rad): o ponto contra a série de Fresnel e o rumo a menos de 1e-9, nas três escalas', () => {
    for (const e of [1e-3, 1, 1e3]) {
      const L = 1000 * e; const k1 = 1 / (100 * e); const c = curvaDe({ comprimento: L, joelhos: [{ f: 0, k: 0 }, { f: 1, k: k1 }] });
      for (const f of fracoesDoArco) {
        const s = f * L; const [x, y] = c.ponto(s); const [fx, fy] = fresnel(k1 / L, s);
        expect(Math.hypot(x - fx, y - fy) / L).toBeLessThan(1e-9);
        expect(Math.abs(c.rumoEm(s) - (0.5 * (k1 / L) * s * s))).toBeLessThan(1e-9);
      }
    }
  });

  it('a cadeia de três clotoides: o ponto e o rumo iguais aos da integração independente quebrada nos joelhos, e as pontas valem fora do arco', () => {
    const L = 1200; const J = [{ f: 0, k: 1 / 900 }, { f: 0.3141, k: 1 / 120 }, { f: 0.72, k: -1 / 300 }, { f: 1, k: 1 / 2000 }];
    const c = curvaDe({ inicio: [10, 20], rumo: -0.4, comprimento: L, joelhos: J });
    /* Simpson de 4000 passos por clotoide sobre o rumo em forma fechada */
    const referencia = (alvo) => {
      let x = 10; let y = 20; let th = -0.4;
      for (let j = 0; j < J.length - 1; j += 1) {
        const de = J[j].f * L; const ate = Math.min(alvo, J[j + 1].f * L); if (ate <= de) break;
        const dk = (J[j + 1].k - J[j].k) / ((J[j + 1].f - J[j].f) * L); const rumo = (u) => th + J[j].k * u + 0.5 * dk * u * u; const N = 4000; const h = (ate - de) / N;
        for (let i = 0; i <= N; i += 1) { const w = (i === 0 || i === N ? 1 : i % 2 ? 4 : 2) * (h / 3); x += w * Math.cos(rumo(i * h)); y += w * Math.sin(rumo(i * h)); }
        th = rumo(ate - de);
      }
      return [x, y, th];
    };
    for (const f of [...fracoesDoArco, 0.3141, 0.72, 0.3142, 0.7199]) {
      const s = f * L; const [x, y] = c.ponto(s); const [rx, ry, rth] = referencia(s);
      expect(Math.hypot(x - rx, y - ry) / L).toBeLessThan(1e-9);
      expect(Math.abs(c.rumoEm(s) - rth)).toBeLessThan(1e-9);
    }
    expect(c.ponto(-5)).toEqual(c.ponto(0)); expect(c.ponto(L + 5)).toEqual(c.ponto(L)); expect(c.ponto(0)).toEqual([10, 20]);
    expect(c.rumoEm(-5)).toBe(-0.4); expect(c.rumoEm(L + 5)).toBe(c.rumoEm(L));
    const amostra = c.amostrar(100); expect(amostra).toHaveLength(13); expect(amostra[5]).toEqual(c.ponto(500));
  });

  it('o resultado do ajuste traz a mesma leitura da curva guardada, e rumoEm(0) é o rumo do início', () => {
    const a = ajustarCurvaLisa(arco(500, 60, 60), { tolerancia: 0.5 }); const g = curvaLisaGuardada(JSON.parse(JSON.stringify(a.guardado)));
    expect(a.rumoEm(0)).toBe(a.rumo); expect(a.ponto(0)).toEqual(a.inicio);
    for (const f of fracoesDoArco) { const s = f * a.comprimento; expect(g.ponto(s)).toEqual(a.ponto(s)); expect(g.rumoEm(s)).toBe(a.rumoEm(s)); }
    expect(g.valorEm(200)).toBe(a.valorEm(200));
    /* o ponto exato fica sobre o arco de 500: a corda entre amostras ficava para dentro dele */
    expect(Math.abs(a.valorEm(200) - (500 - Math.sqrt(500 * 500 - 200 * 200)))).toBeLessThan(0.5);
  });

  it('valorEm nos dois eixos e nos dois sentidos, no quarto de arco de 400 de raio', () => {
    const R = 400; const L = (Math.PI / 2) * R;
    /* x cresce e y cresce: do [0, 0], rumo 0, virando à esquerda */
    const sobe = curvaDe({ comprimento: L, joelhos: [{ f: 0, k: 1 / R }, { f: 1, k: 1 / R }] });
    /* a mesma curva andada ao contrário: x cai e y cai */
    const cai = curvaDe({ inicio: [R, R], rumo: -Math.PI / 2, comprimento: L, joelhos: [{ f: 0, k: -1 / R }, { f: 1, k: -1 / R }] });
    for (const c of [sobe, cai]) {
      for (const x of [0.5, 37, 200, 399]) expect(Math.abs(c.valorEm(x) - (R - Math.sqrt(R * R - x * x))) / R).toBeLessThan(1e-9);
      for (const y of [0.5, 37, 200, 399]) expect(Math.abs(c.valorEm(y, { eixo: 1 }) - Math.sqrt(R * R - (R - y) * (R - y))) / R).toBeLessThan(1e-9);
    }
    expect(sobe.valorEm(0)).toBe(0); expect(sobe.valorEm(sobe.ponto(L)[0])).toBe(sobe.ponto(L)[1]); expect(Math.abs(sobe.ponto(L)[1] - R)).toBeLessThan(1e-9);
  });

  it('valorEm fora das pontas: recusa com a faixa e o pedido, e com fora ponta devolve a ponta mais perto', () => {
    const c = curvaDe({ inicio: [100, 7], rumo: Math.PI, comprimento: 80, joelhos: [{ f: 0, k: 0.001 }, { f: 1, k: 0.002 }] });
    const [xFim, yFim] = c.ponto(80);
    expect(() => c.valorEm(100.5)).toThrow(/valorEm: a coordenada 0 da curva vai de 100 a .*, e o pedido 100\.5 cai fora; passe \{ fora: 'ponta' \}/);
    expect(() => c.valorEm(xFim - 1, { fora: 'recusa' })).toThrow(/cai fora/);
    expect(c.valorEm(100.5, { fora: 'ponta' })).toBe(7); expect(c.valorEm(xFim - 1, { fora: 'ponta' })).toBe(yFim);
    expect(Math.abs(c.valorEm(60, { fora: 'ponta' }) - c.valorEm(60))).toBe(0);
  });

  it('valorEm recusa a curva que não é função da coordenada pedida, dizendo entre quais arcos o rumo cruza', () => {
    /* meia volta: x sobe e desce, y só sobe */
    const meia = curvaDe({ comprimento: Math.PI * 100, joelhos: [{ f: 0, k: 0.01 }, { f: 1, k: 0.01 }] });
    expect(() => meia.valorEm(50)).toThrow(/valorEm: a coordenada 0 não cresce nem cai sempre ao longo da curva, que por isso não é função dela: entre os arcos \d.* e \d.* o rumo/);
    expect(Math.abs(meia.valorEm(100, { eixo: 1 }) - 100)).toBeLessThan(1e-9);
    /* a reta ao longo do eixo 1 não é função da coordenada 0 */
    const reta = curvaDe({ rumo: Math.PI / 2, comprimento: 50, joelhos: [{ f: 0, k: 0 }, { f: 1, k: 0 }] });
    expect(() => reta.valorEm(0)).toThrow(/não cresce nem cai sempre/); expect(Math.abs(reta.valorEm(20, { eixo: 1 }))).toBeLessThan(1e-12);
    /* o S que só cruza a perpendicular no meio de uma clotoide, onde a curvatura passa por zero: as duas pontas têm o rumo do mesmo lado */
    const s = curvaDe({ rumo: -Math.PI / 2 + 0.05, comprimento: 400, joelhos: [{ f: 0, k: -0.001 }, { f: 1, k: 0.002 }] });
    expect(Math.cos(s.rumoEm(0))).toBeGreaterThan(0); expect(Math.cos(s.rumoEm(400))).toBeGreaterThan(0);
    expect(() => s.valorEm(1)).toThrow(/não cresce nem cai sempre/);
  });

  it('a leitura recusa o pedido que não entende, dizendo o que recebeu', () => {
    const c = curvaDe({ comprimento: 100, joelhos: [{ f: 0, k: 0 }, { f: 1, k: 0.001 }] });
    expect(() => c.ponto('10')).toThrow(/ponto espera o comprimento de arco, um número finito de 0 a 100, e veio "10"/);
    expect(() => c.rumoEm(NaN)).toThrow(/rumoEm espera o comprimento de arco, um número finito de 0 a 100, e veio NaN/);
    expect(() => c.amostrar(0)).toThrow(/passo espera um número maior que zero .*, e veio 0/);
    expect(() => c.valorEm(10, { eixo: 2 })).toThrow(/valorEm espera eixo 0 ou 1 .*, e veio 2/);
    expect(() => c.valorEm(10, { fora: 'corta' })).toThrow(/valorEm espera fora 'recusa' ou 'ponta' .*, e veio "corta"/);
    expect(() => c.valorEm(undefined)).toThrow(/valorEm espera o valor da coordenada 0, um número finito, e veio undefined/);
  });
});
