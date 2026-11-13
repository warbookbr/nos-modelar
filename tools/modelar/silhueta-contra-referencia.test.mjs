import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ajustarAlinhamento, avisoDoAjuste, comoCLI, lerReferencia, medirSilhueta, sobreposicaoEmSvg, ErroDeReferencia } from './silhueta-contra-referencia.mjs';

/* triângulos em mm no plano xz (y = 0) de um polígono convexo ou em leque a partir do primeiro ponto */
const leque = (poli, parte = 'a') => poli.slice(1, -1).map((_, i) => ({ p: [poli[0], poli[i + 1], poli[i + 2]].map(([x, z]) => [x, 0, z]), parte }));
const retangulo = (x0, z0, x1, z1) => leque([[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
/* a referência do retângulo cheio, com o alinhamento em dois cantos */
const refDoRetangulo = { escala: 'mm', alinhamento: [[0, 0], [100, 0]], trechos: { base: [[0, 0], [100, 0]], topo: [[0, 50], [100, 50]], direita: [[100, 0], [100, 50]] } };

describe('silhueta contra a referência', () => {
  it('referência igual à silhueta dá desvio abaixo de 0,05 mm', () => {
    const { resultado } = medirSilhueta({ tris: retangulo(0, 0, 100, 50), referencia: lerReferencia(refDoRetangulo), plano: 'xz' });
    for (const r of resultado) expect(r.maximoDoModuloMm).toBeLessThan(0.05);
  });

  it('o canto cortado do modelo dá o subtrecho, o sinal e o pico certos', () => {
    /* o modelo é o retângulo com o canto (100, 50) cortado em 20 por 20; a referência tem o canto */
    const modelo = leque([[0, 0], [100, 0], [100, 30], [80, 50], [0, 50]]);
    const { resultado } = medirSilhueta({ tris: modelo, referencia: lerReferencia(refDoRetangulo), plano: 'xz' });
    const topo = resultado.find((r) => r.trecho === 'topo');
    expect(topo.acimaDaTolerancia).toHaveLength(1);
    const s = topo.acimaDaTolerancia[0];
    expect(s.sinal).toBe('dentro');
    /* a distância do canto (100, 50) à diagonal de (100, 30) a (80, 50) é 20 / raiz de 2 */
    expect(s.picoMm).toBeGreaterThan(14.14 - 0.1);
    expect(s.picoMm).toBeLessThan(14.14 + 0.1);
    expect(s.picoEm[0]).toBeGreaterThan(98);
    expect(s.inicio[0]).toBeGreaterThan(80);
    expect(resultado.find((r) => r.trecho === 'base').acimaDaTolerancia).toHaveLength(0);
  });

  it('o sinal se inverte quando o modelo sobra', () => {
    /* a referência é o retângulo menor e o modelo tem uma aba de 10 mm a mais no topo */
    const referencia = lerReferencia({ escala: 'mm', alinhamento: [[0, 0], [100, 0]], trechos: { topo: [[0, 50], [100, 50]] } });
    const { resultado } = medirSilhueta({ tris: retangulo(0, 0, 100, 60), referencia, plano: 'xz' });
    const s = resultado[0].acimaDaTolerancia[0];
    expect(s.sinal).toBe('fora');
    expect(Math.abs(s.picoMm - 10)).toBeLessThan(0.1);
    expect(resultado[0].maximoParaFora.mm).toBeCloseTo(10, 1);
    expect(resultado[0].maximoParaDentro).toBeNull();
  });

  it('a silhueta é a união das partes, e --partes a restringe', () => {
    const tris = [...retangulo(0, 0, 50, 50, 'a'), ...retangulo(50, 0, 100, 50).map((t) => ({ ...t, parte: 'b' }))];
    const referencia = lerReferencia(refDoRetangulo);
    expect(medirSilhueta({ tris, referencia, plano: 'xz' }).resultado[0].maximoDoModuloMm).toBeLessThan(0.05);
    expect(() => medirSilhueta({ tris, referencia, plano: 'xz', partes: ['a'] })).toThrow(ErroDeReferencia);
  });

  it('desenha o SVG com os subtrechos coloridos', () => {
    const modelo = leque([[0, 0], [100, 0], [100, 30], [80, 50], [0, 50]]);
    const m = medirSilhueta({ tris: modelo, referencia: lerReferencia(refDoRetangulo), plano: 'xz' });
    const svg = sobreposicaoEmSvg({ aneis: m.aneis, trechos: lerReferencia(refDoRetangulo).trechos, resultado: m.resultado, plano: 'xz', tolerancia: 1 });
    expect(svg).toContain('#1f4fd6');
    expect(svg).toContain('topo');
  });

  it('recusa a referência sem escala e sem alinhamento, dizendo o que recebeu e como consertar', () => {
    const solta = { origem: 'x', base: [[0, 0], [100, 0]] };
    expect(() => lerReferencia(solta, 'ref.json')).toThrow(/não declara a escala.*escala.*"mm"/);
    expect(() => lerReferencia({ escala: 'mm', base: [[0, 0], [1, 0]] }, 'ref.json')).toThrow(/dois pontos de alinhamento.*recebi null/);
    expect(() => lerReferencia({ escala: 'mm', alinhamento: [[0, 0]], base: [[0, 0], [1, 0]] }, 'ref.json')).toThrow(ErroDeReferencia);
  });

  it('aceita a forma solta e a explícita, e ignora chaves que não são trechos', () => {
    const solta = lerReferencia({ escala: 'mm', alinhamento: [[0, 0], [1, 0]], origem: 'foto', base: [[0, 0], [1, 0]] });
    expect(Object.keys(solta.trechos)).toEqual(['base']);
    expect(Object.keys(lerReferencia(refDoRetangulo).trechos)).toEqual(['base', 'topo', 'direita']);
  });

  it('lê quem conferiu a referência, e o campo ausente ou vazio vale null', () => {
    expect(lerReferencia(refDoRetangulo).conferidoPelaPessoa).toBeNull();
    expect(lerReferencia({ ...refDoRetangulo, conferidoPelaPessoa: '  ' }).conferidoPelaPessoa).toBeNull();
    expect(lerReferencia({ ...refDoRetangulo, conferidoPelaPessoa: 'Ana, 2026-11-13' }).conferidoPelaPessoa).toBe('Ana, 2026-11-13');
  });

  it('recusa o alinhamento longe do contorno', () => {
    const referencia = lerReferencia({ ...refDoRetangulo, alinhamento: [[0, 0], [500, 500]] });
    expect(() => medirSilhueta({ tris: retangulo(0, 0, 100, 50), referencia, plano: 'xz' })).toThrow(/500.*mm do contorno/);
  });

  it('é determinística', () => {
    const modelo = leque([[0, 0], [100, 0], [100, 30], [80, 50], [0, 50]]);
    const ref = lerReferencia(refDoRetangulo);
    expect(JSON.stringify(medirSilhueta({ tris: modelo, referencia: ref, plano: 'xz' }))).toBe(JSON.stringify(medirSilhueta({ tris: modelo, referencia: ref, plano: 'xz' })));
  });
});

describe('o alinhamento por ajuste', () => {
  /* o modelo: um pentágono assimétrico; a referência é o mesmo contorno, mas girado em 1,5 grau e deslocado, com o alinhamento declarado nos pontos errados */
  const poli = [[0, 0], [120, 0], [120, 30], [60, 60], [0, 50]];
  const modelo = leque(poli);
  const girar = (p, g, [tx, ty]) => [p[0] * Math.cos(g) - p[1] * Math.sin(g) + tx, p[0] * Math.sin(g) + p[1] * Math.cos(g) + ty];
  const lados = (g, t) => Object.fromEntries(poli.map((a, i) => [`lado${i}`, [a, poli[(i + 1) % poli.length]].map((q) => girar(q, g, t))]));
  const ref = (g, t, nomes = null) => { const todos = lados(g, t); return { escala: 'mm', alinhamento: [girar([0, 0], g, t), girar([120, 0], g, t)].map((q) => [q[0] + 1, q[1] + 1]), trechos: nomes ? Object.fromEntries(nomes.map((n) => [n, todos[n]])) : todos }; };

  it('recupera o giro e o deslocamento de um alinhamento errado de propósito, e o desvio de forma no ajuste fica perto de zero', () => {
    const g = (1.5 * Math.PI) / 180;
    const referencia = lerReferencia(ref(g, [2, -3]));
    const m = medirSilhueta({ tris: modelo, referencia, plano: 'xz', alinhamentoMax: 8, ajustar: true });
    expect(m.ajuste.giroGraus).toBeGreaterThan(-1.5 - 0.05);
    expect(m.ajuste.giroGraus).toBeLessThan(-1.5 + 0.05);
    for (const r of m.resultadoAjustado) expect(r.maximoDoModuloMm).toBeLessThan(0.1);
    expect(Math.max(...m.resultado.map((r) => r.maximoDoModuloMm))).toBeGreaterThan(2);
    expect(m.ajuste.custoRmsFinalMm).toBeLessThan(0.05);
    expect(m.aviso).toMatch(/provavelmente não são o mesmo ponto físico.*mistura posição com forma/);
    expect(JSON.stringify(m.ajuste.translacao)).toBe(JSON.stringify(medirSilhueta({ tris: modelo, referencia, plano: 'xz', alinhamentoMax: 8, ajustar: true }).ajuste.translacao));
  });

  it('não avisa quando o alinhamento declarado já é o melhor, e mantém o desvio de uma forma de fato diferente', () => {
    const certa = lerReferencia({ ...ref(0, [0, 0]), alinhamento: [[0, 0], [120, 0]] });
    const a = medirSilhueta({ tris: modelo, referencia: certa, plano: 'xz', ajustar: true });
    expect(Math.abs(a.ajuste.giroGraus)).toBeLessThan(0.05);
    expect(a.aviso).toBeNull();
    /* o modelo tem o canto (120, 30) cortado em 20 mm; a referência o tem inteiro: a diferença de forma é de 14 mm e o ajuste não a absorve */
    const cortado = leque([[0, 0], [120, 0], [120, 10], [100, 30], [60, 60], [0, 50]]);
    const b = medirSilhueta({ tris: cortado, referencia: certa, plano: 'xz', ajustar: true });
    expect(b.resultadoAjustado.find((r) => r.trecho === 'lado1').maximoDoModuloMm).toBeGreaterThan(5);
  });

  it('ajusta só os trechos pedidos', () => {
    const g = (1.5 * Math.PI) / 180;
    const referencia = lerReferencia(ref(g, [2, -3]));
    const aneis = medirSilhueta({ tris: modelo, referencia, plano: 'xz', alinhamentoMax: 8 }).aneis;
    const so = ajustarAlinhamento({ aneis, referencia, trechos: ['lado0', 'lado2', 'lado4'] });
    expect(Math.abs(so.giroGraus + 1.5)).toBeLessThan(0.2);
    expect(avisoDoAjuste({ giroGraus: 0.1, pontosDeAlinhamentoMm: [0.5, 0.5] })).toBeNull();
  });
});

describe('a linha de comando', () => {
  const capturar = async (argv) => {
    const out = []; const err = [];
    const o = process.stdout.write.bind(process.stdout); const e = process.stderr.write.bind(process.stderr);
    process.stdout.write = (t) => { out.push(String(t)); return true; };
    process.stderr.write = (t) => { err.push(String(t)); return true; };
    try { return { codigo: await comoCLI(argv), out: out.join(''), err: err.join('') }; } finally { process.stdout.write = o; process.stderr.write = e; }
  };

  it('responde a --ajuda', async () => {
    const r = await capturar(['--ajuda']);
    expect(r.codigo).toBe(0);
    expect(r.out).toContain('--referencia=<arquivo>');
    expect(r.out).toContain('--plano=');
  });

  it('recusa o arquivo de referência sem escala, com código 2', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'silhueta-'));
    const arq = join(pasta, 'ref.json');
    writeFileSync(arq, JSON.stringify({ base: [[0, 0], [1, 0]] }));
    const r = await capturar(['qualquer', `--referencia=${arq}`, '--plano=xz']);
    expect(r.codigo).toBe(2);
    expect(r.err).toMatch(/não declara a escala/);
  });

  it('recusa plano inválido', async () => {
    const r = await capturar(['qualquer', '--referencia=x.json', '--plano=ab']);
    expect(r.codigo).toBe(2);
    expect(r.err).toMatch(/--plano espera/);
  });
});
