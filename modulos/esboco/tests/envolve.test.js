/* A forma `envolve` (faixa que contorna círculos por tangentes e arcos) e o modo `caminho` do `arranja`: correia entre coroa e
   pinhão, esteira em volta de três rodas, faixa aberta e cruzada, e os elos sobre o caminho. */
import { describe, expect, it } from 'vitest';
import { expandirEsboco } from '../src/expandir.js';
import { desenharEsboco, resolverOpcao } from '../src/index.js';
import { verificarContato } from '../src/contato.js';
import { formatarDescricao, medirEsboco } from '../src/descrever.js';
import { verificarProjecao } from '../src/projecao.js';

const resolver = (e) => { const x = expandirEsboco(e); return resolverOpcao(x.opcoes[0], 'o', x.pontos); };
const roda = (id, centro, diametro, extra = {}) => ({ id, tipo: 'cilindro', diametro, comprimento: 30, eixo: 'z', centro, ...extra });
const faixa = (circulos, extra = {}) => ({ id: 'faixa', tipo: 'envolve', largura: 20, espessura: 4, circulos, ...extra });
const esboco = (formas, contato = { usar: true, tolerancia: 2, penetracao: 3, folga: 500 }) => ({ contato, opcoes: [{ titulo: 'T', formas }] });
const comprimento = (pontos) => pontos.slice(1).reduce((s, p, i) => s + Math.hypot(...p.map((x, k) => x - pontos[i][k])), 0);
const distanciaAoCaminho = (linha, p) => Math.min(...linha.slice(1).map((q, i) => { const a = linha[i]; const d = q.map((x, k) => x - a[k]); const l2 = d.reduce((s, x) => s + x * x, 0); const t = Math.max(0, Math.min(1, p.reduce((s, x, k) => s + (x - a[k]) * d[k], 0) / l2)); return Math.hypot(...p.map((x, k) => x - (a[k] + d[k] * t))); }));
const mundo = (r) => r.trilha.pontos.map((q) => q.map((x, i) => x + r.centro[i]));

/* correia entre uma coroa de 200 mm e um pinhão de 80 mm, 250 mm entre os eixos */
const correia = () => esboco([
  roda('coroa', [0, 0, 0], 200), roda('pinhao', [250, 0, 0], 80),
  faixa([{ centro: 'coroa.centro', raio: 100, eixo: 'z' }, { centro: 'pinhao.centro', raio: 40, eixo: 'z' }]),
]);

describe('envolve: correia entre coroa e pinhão', () => {
  it('o comprimento da linha de centro é o da correia aberta de duas polias (tangentes mais arcos)', () => {
    const r = resolver(correia()).find((x) => x.id === 'faixa');
    const R1 = 102; const R2 = 42; const L = 250;
    const alfa = Math.asin((R1 - R2) / L);
    const esperado = 2 * Math.sqrt(L * L - (R1 - R2) ** 2) + R1 * (Math.PI + 2 * alfa) + R2 * (Math.PI - 2 * alfa);
    expect(r.trilha.fechado).toBe(true);
    expect(comprimento(mundo(r))).toBeGreaterThan(esperado * 0.997);
    expect(comprimento(mundo(r))).toBeLessThan(esperado * 1.0001);
    /* caixa: de -104 (raio da coroa mais a espessura) a 250 + 44 em x, e a largura de 20 mm em z */
    expect(r.min[0]).toBeCloseTo(-104, 0);
    expect(r.max[0]).toBeCloseTo(294, 0);
    expect(r.max[1]).toBeCloseTo(104, 0);
    expect(r.max[2] - r.min[2]).toBeCloseTo(20, 3);
  });

  it('o gate vê o contato da faixa com as duas rodas e aprova, sem colisão', () => {
    const g = verificarContato(correia());
    expect(g.achados).toEqual([]);
    expect(g.resultado).toBe('aprovado');
    const m = medirEsboco(correia(), { projecao: false });
    const toca = m.descricao.opcoes[0].contatos.map((c) => `${c.a}:${c.b}`);
    expect(toca).toContain('coroa:faixa');
    expect(toca).toContain('pinhao:faixa');
  });

  it('a faixa afastada da roda deixa de tocar e o gate acusa (a faixa voa)', () => {
    const e = esboco([roda('coroa', [0, 0, 0], 200), roda('pinhao', [250, 0, 0], 80), faixa([{ centro: 'coroa.centro', raio: 130, eixo: 'z' }, { centro: 'pinhao.centro', raio: 70, eixo: 'z' }])]);
    expect(verificarContato(e).achados.some((a) => a.tipo === 'voando' || a.tipo === 'longe')).toBe(true);
  });

  it('a leitura em texto (--descrever) diz a faixa, e a projeção e o desenho funcionam nas quatro vistas', () => {
    const e = correia();
    const m = medirEsboco(e, { projecao: false });
    expect(m.descricao.opcoes[0].formas.find((f) => f.id === 'faixa').relacao).toBe('faixa fechada de 20 mm por 4 mm em torno de 2 círculos (raios 100, 40)');
    expect(formatarDescricao(m.descricao)).toContain('forma faixa: envolve');
    expect(m.descricao.opcoes[0].formas.find((f) => f.id === 'faixa').ancoras.inicio).toBeDefined();
    for (const vista of ['isometrica', 'frontal', 'lateral', 'superior']) expect(desenharEsboco({ ...e, vista }).svg).toContain('<path');
    expect(() => verificarProjecao(e, { forcar: true })).not.toThrow();
    expect(desenharEsboco({ ...e, vista: 'isometrica' }).svg).toBe(desenharEsboco({ ...e, vista: 'isometrica' }).svg);
  });
});

describe('envolve: esteira, faixa aberta e cruzada', () => {
  const tres = () => esboco([
    roda('r1', [0, 0, 0], 120), roda('r2', [300, 0, 0], 120), roda('r3', [150, 150, 0], 80),
    faixa([{ centro: 'r1.centro', raio: 60, eixo: 'z' }, { centro: 'r2.centro', raio: 60, eixo: 'z' }, { centro: 'r3.centro', raio: 40, eixo: 'z' }]),
  ]);

  it('a esteira em volta de três rodas toca as três, fecha o laço e o gate aprova', () => {
    const g = verificarContato(tres());
    expect(g.achados).toEqual([]);
    const r = resolver(tres()).find((x) => x.id === 'faixa');
    const p = mundo(r);
    expect(Math.hypot(...p[0].map((x, i) => x - p[p.length - 1][i]))).toBeLessThan(1e-6);
    /* o sentido sai da área dos centros: o laço r1, r2, r3 é anti-horário e a faixa sai de r1 pela parte de baixo, rumo a +x */
    expect(p[0][1]).toBeLessThan(-60);
    expect(p[1][0]).toBeGreaterThan(p[0][0]);
  });

  it('a faixa aberta começa na tangente que sai do primeiro círculo e acaba na que chega ao último, sem arco neles', () => {
    const e = esboco([roda('r1', [0, 0, 0], 120), roda('r2', [300, 0, 0], 120), roda('r3', [150, 150, 0], 80), faixa([{ centro: 'r1.centro', raio: 60, eixo: 'z' }, { centro: 'r2.centro', raio: 60, eixo: 'z' }, { centro: 'r3.centro', raio: 40, eixo: 'z' }], { fechado: false })]);
    const r = resolver(e).find((x) => x.id === 'faixa');
    const p = mundo(r);
    expect(r.trilha.fechado).toBe(false);
    expect(Math.hypot(...p[0].map((x, i) => x - p[p.length - 1][i]))).toBeGreaterThan(50);
    expect(Math.hypot(p[0][0] - 0, p[0][1] - 0)).toBeCloseTo(62, 3);
    expect(Math.hypot(p[p.length - 1][0] - 150, p[p.length - 1][1] - 150)).toBeCloseTo(42, 3);
  });

  it('o "lado": "dentro" inverte a volta de um círculo e a faixa cruza (tangente interna)', () => {
    const e = esboco([roda('a', [0, 0, 0], 100), roda('b', [300, 0, 0], 100), faixa([{ centro: 'a.centro', raio: 50, eixo: 'z' }, { centro: 'b.centro', raio: 50, eixo: 'z', lado: 'dentro' }])], { usar: false });
    const p = mundo(resolver(e).find((x) => x.id === 'faixa'));
    /* as duas tangentes internas se cruzam a meio caminho entre os eixos (raios iguais) */
    expect(distanciaAoCaminho(p, [150, 0, 0])).toBeLessThan(0.5);
    /* e uma faixa de mesmo sentido (externa) não passa por ali */
    const externa = esboco([roda('a', [0, 0, 0], 100), roda('b', [300, 0, 0], 100), faixa([{ centro: 'a.centro', raio: 50, eixo: 'z' }, { centro: 'b.centro', raio: 50, eixo: 'z' }])], { usar: false });
    expect(distanciaAoCaminho(mundo(resolver(externa).find((x) => x.id === 'faixa')), [150, 0, 0])).toBeGreaterThan(40);
  });

  it('recusa o que não fecha, dizendo o que corrigir', () => {
    const base = (circ, extra) => esboco([roda('a', [0, 0, 0], 100), roda('b', [300, 0, 0], 100), faixa(circ, extra)], { usar: false });
    const c = (...extra) => [{ centro: 'a.centro', raio: 50, eixo: 'z' }, { centro: 'b.centro', raio: 50, eixo: 'z', ...(extra[0] ?? {}) }];
    expect(() => resolver(base(c(), { espessura: undefined }))).toThrow(/precisa de "espessura" positiva/);
    expect(() => resolver(base([c()[0]]))).toThrow(/2 ou mais círculos|2 ou mais/);
    expect(() => resolver(base([{ centro: 'a.centro', raio: 50, eixo: 'z' }, { centro: [300, 0, 40], raio: 50, eixo: 'z' }]))).toThrow(/no mesmo plano/);
    expect(() => resolver(base([{ centro: 'a.centro', raio: 50, eixo: 'z' }, { centro: 'b.centro', raio: 50, eixo: 'x' }]))).toThrow(/mesmo "eixo"/);
    expect(() => resolver(base([{ centro: 'a.centro', raio: 400, eixo: 'z' }, { centro: 'b.centro', raio: 50, eixo: 'z' }]))).toThrow(/um dentro do outro/);
    expect(() => resolver(base(c({ lado: 'meio' })))).toThrow(/"lado" deve ser "fora".*"dentro"/);
    expect(() => resolver(base(c(), { centro: [0, 0, 0] }))).toThrow(/retire "centro"/);
    expect(() => expandirEsboco(base(c(), { espessuraa: 3 }))).toThrow(/o campo "espessuraa" não existe/);
  });

  it('o raio do círculo aceita parâmetro e expressão', () => {
    const e = { parametros: { r: 50 }, contato: { usar: false }, opcoes: [{ titulo: 'T', formas: [roda('a', [0, 0, 0], 100), roda('b', [300, 0, 0], 100), faixa([{ centro: 'a.centro', raio: 'r', eixo: 'z' }, { centro: 'b.centro', raio: '=r+0', eixo: 'z' }])] }] };
    expect(resolver(e).find((x) => x.id === 'faixa').max[1]).toBeCloseTo(54, 0);
  });
});

describe('arranja no modo caminho: os elos sobre a faixa', () => {
  const comElos = (total = 40, extra = {}) => esboco([
    roda('coroa', [0, 0, 0], 200), roda('pinhao', [250, 0, 0], 80),
    faixa([{ centro: 'coroa.centro', raio: 100, eixo: 'z' }, { centro: 'pinhao.centro', raio: 40, eixo: 'z' }]),
    { id: 'elo', tipo: 'caixa', largura: 8, altura: 12, profundidade: 4, centro: 'faixa.inicio', ...extra },
    { arranja: { forma: 'elo', modo: 'caminho', caminho: 'faixa', total } },
  ], { usar: false });

  it('as cópias ficam sobre a linha de centro, espaçadas por igual, e giram com a tangente', () => {
    const rs = resolver(comElos());
    const faixaR = rs.find((x) => x.id === 'faixa');
    const linha = mundo(faixaR);
    const elos = rs.filter((r) => /^elo\d*$/.test(r.id));
    expect(elos).toHaveLength(40);
    const distancia = (p) => distanciaAoCaminho(linha, p);
    /* a fonte está em faixa.inicio (a tangente de saída da coroa, o ponto 0 do caminho); as cópias têm a mesma distância */
    for (const e of elos.slice(1)) expect(distancia(e.centro)).toBeLessThan(0.6);
    /* na volta de retorno (a tangente de baixo vai para +x e a de cima volta para -x) a cópia gira 180 graus em torno de z */
    expect(elos.some((e) => e.matriz && e.matriz[0][0] < -0.99)).toBe(true);
    const total = comprimento(linha);
    const passo = total / 40;
    const saltos = elos.slice(1).map((e, i) => Math.hypot(...e.centro.map((x, k) => x - elos[i].centro[k])));
    expect(Math.max(...saltos)).toBeLessThan(passo * 1.05);
  });

  it('com `passo` e `desde` as cópias andam por distância, e passar do fim do caminho aberto é recusado', () => {
    const e = esboco([
      roda('a', [0, 0, 0], 100), roda('b', [300, 0, 0], 100),
      faixa([{ centro: 'a.centro', raio: 50, eixo: 'z' }, { centro: 'b.centro', raio: 50, eixo: 'z' }, { centro: [150, 200, 0], raio: 20, eixo: 'z' }], { fechado: false }),
      { id: 'elo', tipo: 'caixa', largura: 8, altura: 12, profundidade: 4, centro: 'faixa.inicio' },
      { arranja: { forma: 'elo', modo: 'caminho', caminho: 'faixa', total: 3, passo: 100 } },
    ], { usar: false });
    const rs = resolver(e);
    expect(Math.hypot(...rs.find((r) => r.id === 'elo1').centro.map((x, k) => x - rs.find((r) => r.id === 'elo').centro[k]))).toBeCloseTo(100, 0);
    const longe = JSON.parse(JSON.stringify(e)); longe.opcoes[0].formas[4].arranja.passo = 5000;
    expect(() => resolver(longe)).toThrow(/cai a .* mm do começo do caminho de "faixa"/);
  });

  it('recusa um caminho que não é tubo nem faixa, e a descrição diz que a cópia segue o caminho', () => {
    const e = comElos(); e.opcoes[0].formas[4].arranja.caminho = 'coroa';
    expect(() => resolver(e)).toThrow(/não é um tubo nem uma faixa "envolve"/);
    const m = medirEsboco(comElos(3), { projecao: false });
    expect(m.descricao.opcoes[0].formas.find((f) => f.id === 'elo1').relacao).toContain('cópia 1 de 3 de elo, ao longo do caminho de faixa');
  });

  it('o tubo também serve de caminho', () => {
    const e = esboco([
      { id: 'cano', tipo: 'tubo', diametro: 10, ponta: true, caminho: [[0, 0, 0], [100, 0, 0], [100, 100, 0]] },
      { id: 'elo', tipo: 'caixa', largura: 4, altura: 8, profundidade: 4, centro: 'cano.inicio' },
      { arranja: { forma: 'elo', modo: 'caminho', caminho: 'cano', total: 5 } },
    ], { usar: false });
    const rs = resolver(e);
    expect(rs.find((r) => r.id === 'elo4').centro[1]).toBeCloseTo(100, 0);
    expect(rs.find((r) => r.id === 'elo4').centro[0]).toBeCloseTo(100, 0);
  });
});
