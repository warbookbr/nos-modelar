/* A `roda` com raios, flanges e pneu de seção arredondada, e os perfis `gerar` de pneu, de raios e de disco de freio (plano "O esboço
   detalhado coerente", fatia 2). A roda de antes (disco maciço) continua saindo igual por padrão. */
import { describe, expect, it } from 'vitest';
import { expandirEsboco } from '../src/expandir.js';
import { desenharEsboco, resolverOpcao } from '../src/index.js';
import { verificarContato } from '../src/contato.js';
import { GERADORES, gerarPerfil } from '../src/perfis.js';

const area = (p) => Math.abs(p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0)) / 2;
const esboco = (parametros) => ({ contato: { usar: true }, opcoes: [{ titulo: 'T', formas: [{ id: 'r', usa: 'roda', centro: [0, 305, 0], ...(parametros ? { parametros } : {}) }] }] });
const formasDe = (e) => expandirEsboco(e).opcoes[0].formas;
const resolvidas = (e) => { const x = expandirEsboco(e); return resolverOpcao(x.opcoes[0], 'o', x.pontos); };
const num = (v) => v;

describe('a roda por padrão (disco maciço)', () => {
  it('sai com as mesmas quatro formas de antes, e o gate aprova', () => {
    const f = formasDe(esboco());
    expect(f.map((x) => `${x.id}:${x.tipo}`)).toEqual(['r.pneu:anel', 'r.disco:cilindro', 'r.cuboE:cilindro', 'r.cuboD:cilindro']);
    expect(f[0]).toMatchObject({ diametroExterno: 610, diametroInterno: 420, espessura: 125 });
    expect(f[1]).toMatchObject({ diametro: 420, comprimento: 125 / 3 });
    expect(verificarContato(esboco()).achados).toEqual([]);
  });
});

describe('a roda com raios', () => {
  it.each([3, 5, 12])('com %i raios o disco vira cubo e raios, entra o aro, e o gate aprova', (n) => {
    const e = esboco({ raios: n });
    const f = formasDe(e);
    expect(f.map((x) => x.id)).toEqual(['r.pneu', 'r.disco', 'r.aro', 'r.cuboE', 'r.cuboD']);
    const disco = f.find((x) => x.id === 'r.disco');
    expect(disco.tipo).toBe('extrusao');
    /* cada raio traz 4 pontos e o arco do cubo entre dois raios traz 3 pontos a mais (4 passos) */
    expect(disco.perfil).toHaveLength(n * 7);
    const g = verificarContato(e);
    expect(g.achados).toEqual([]);
    expect(g.resultado).toBe('aprovado');
  });

  it('o cubo dos raios fica no centro do pneu com qualquer número de raios (`origem: "perfil"` na extrusão)', () => {
    for (const n of [3, 5, 7]) {
      const rs = resolvidas(esboco({ raios: n }));
      const d = rs.find((x) => x.id === 'r.disco'); const p = rs.find((x) => x.id === 'r.pneu');
      expect(d.centro.map((c, i) => Math.round((c - p.centro[i]) * 1000) / 1000)).toEqual([0, 0, 0]);
    }
    const e = { contato: { usar: false }, opcoes: [{ titulo: 'T', formas: [{ id: 'x', tipo: 'extrusao', comprimento: 5, perfil: [[0, 0], [10, 0], [0, 10]], origem: 'meio' }] }] };
    expect(() => resolvidas(e)).toThrow(/"origem" da extrusao deve ser "caixa".*"perfil"/);
  });

  it('a área dos raios é a do cubo mais n raios de 14 mm até o aro (conta à parte), e a janela entre os raios fica aberta', () => {
    const f = formasDe(esboco({ raios: 5 })).find((x) => x.id === 'r.disco');
    const rout = 210 - 12;
    expect(area(f.perfil)).toBeGreaterThan(Math.PI * 45 * 45 + 5 * 14 * (rout - 45) * 0.97);
    expect(area(f.perfil)).toBeLessThan(Math.PI * 45 * 45 + 5 * 14 * (rout - 40) * 1.03);
    expect(area(f.perfil)).toBeLessThan(Math.PI * rout * rout * 0.2);
    for (const vista of ['isometrica', 'lateral', 'frontal']) expect(desenharEsboco({ ...esboco({ raios: 5 }), vista }).svg).toContain('<path');
  });

  it('o raio do cubo e a largura do raio são parâmetros, e o raio muda o desenho', () => {
    const a = formasDe(esboco({ raios: 6, raioCubo: 40, larguraRaio: 10 })).find((x) => x.id === 'r.disco');
    const b = formasDe(esboco({ raios: 6, raioCubo: 40, larguraRaio: 20 })).find((x) => x.id === 'r.disco');
    expect(area(b.perfil)).toBeGreaterThan(area(a.perfil));
    expect(Math.max(...a.perfil.map((p) => Math.hypot(...p)))).toBeCloseTo(Math.hypot(198, 5), 1);
  });

  it('com flanges entram um flange em cada ponta do cubo, e o gate aprova', () => {
    const e = esboco({ raios: 5, flanges: 2 });
    const f = formasDe(e);
    expect(f.map((x) => x.id)).toEqual(['r.pneu', 'r.disco', 'r.aro', 'r.cuboE', 'r.cuboD', 'r.flangeE', 'r.flangeD']);
    const rs = resolvidas(e);
    const flangeE = rs.find((x) => x.id === 'r.flangeE');
    const cuboE = rs.find((x) => x.id === 'r.cuboE');
    expect(flangeE.max[0]).toBeCloseTo(cuboE.min[0], 3);
    expect(verificarContato(e).achados).toEqual([]);
    expect(formasDe(esboco({ flanges: 1 })).map((x) => x.id)).toContain('r.flangeD');
  });
});

describe('a roda com pneu de seção arredondada', () => {
  it('o pneu vira uma revolução com o ombro, sem o disco de dentro, a largura e o diâmetro certos, e o gate aprova', () => {
    const e = esboco({ ombro: 35 });
    const f = formasDe(e);
    expect(f.map((x) => `${x.id}:${x.tipo}`)).toEqual(['r.pneu:revolucao', 'r.cuboE:cilindro', 'r.cuboD:cilindro']);
    const pneu = resolvidas(e).find((x) => x.id === 'r.pneu');
    expect(pneu.max[0] - pneu.min[0]).toBeCloseTo(125, 3);
    expect(pneu.max[1] - pneu.min[1]).toBeCloseTo(610, 0);
    const g = verificarContato(e);
    expect(g.achados).toEqual([]);
    expect(desenharEsboco(e).svg).toContain('<path');
  });

  it('o ombro sem raios só vale com a roda de disco: com raios o pneu continua anel', () => {
    expect(formasDe(esboco({ ombro: 35, raios: 5 })).find((x) => x.id === 'r.pneu').tipo).toBe('anel');
  });
});

describe('os perfis gerar de pneu, de raios e de disco de freio', () => {
  it('pneu: parede, ombro arredondado e banda; sem ombro é o cilindro; recusa o ombro grande demais', () => {
    const p = gerarPerfil({ gerar: 'pneu', raio: 305, raioAro: 210, largura: 125, ombro: 40 }, num, 'perfil', 'x');
    expect(p[0]).toEqual([210, -62.5]);
    expect(p[p.length - 1]).toEqual([210, 62.5]);
    expect(Math.max(...p.map((q) => q[0]))).toBe(305);
    /* o ombro é um arco de raio 40: todos os pontos dele ficam a 40 mm do centro (265, -22,5) */
    const arco = p.filter((q) => q[1] > -62.5 && q[1] < -22.5 && q[0] > 265);
    expect(arco.length).toBeGreaterThanOrEqual(4);
    for (const q of arco) expect(Math.hypot(q[0] - 265, q[1] + 22.5)).toBeCloseTo(40, 2);
    expect(gerarPerfil({ gerar: 'pneu', raio: 305, raioAro: 210, largura: 125 }, num, 'perfil', 'x')).toEqual([[210, -62.5], [305, -62.5], [305, 62.5], [210, 62.5]]);
    expect(() => gerarPerfil({ gerar: 'pneu', raio: 305, raioAro: 210, largura: 125, ombro: 70 }, num, 'perfil', 'x')).toThrow(/"ombro" é o raio do arredondamento em mm, de 0 a 62,5|de 0 a 62.5/);
  });

  it('raios: polígono simples e recusa o que não cabe no cubo', () => {
    const p = GERADORES.raios.gerar({ n: 8, rin: 45, rout: 190, largura: 14 }, 'x');
    expect(p).toHaveLength(8 * 7);
    expect(() => GERADORES.raios.gerar({ n: 24, rin: 45, rout: 190, largura: 14 }, 'x')).toThrow(/não cabem no cubo/);
    expect(() => gerarPerfil({ gerar: 'raios', n: 5, rin: 45, rout: 190 }, num, 'perfil', 'x')).toThrow(/precisa do campo "largura"/);
  });

  it('disco de freio com furos e ranhuras: polígono simples (a extrusão o aceita), área do anel menos furos e ranhuras', () => {
    const spec = { gerar: 'disco', raioExterno: 150, raioInterno: 70, furos: 12, raioFuro: 5, ranhuras: 6, larguraRanhura: 4, profundidadeRanhura: 18 };
    const p = gerarPerfil(spec, num, 'perfil', 'x');
    const esperado = Math.PI * (150 ** 2 - 70 ** 2) - 12 * Math.PI * 25 - 6 * 4 * 18;
    expect(area(p)).toBeGreaterThan(esperado * 0.99 - 40);
    expect(area(p)).toBeLessThan(esperado * 1.01);
    const e = { contato: { usar: false }, opcoes: [{ titulo: 'T', formas: [{ id: 'd', tipo: 'extrusao', eixo: 'x', comprimento: 8, perfil: spec, centro: [0, 0, 0] }] }] };
    expect(resolvidas(e)).toHaveLength(1);
    expect(desenharEsboco(e).svg).toContain('<path');
    /* o mesmo pedido dá sempre a mesma lista */
    expect(gerarPerfil(spec, num, 'perfil', 'x')).toEqual(p);
  });

  it('disco liso (sem furos nem ranhuras) é o anel com a fenda, e o gate o mede por peças convexas', () => {
    const p = gerarPerfil({ gerar: 'disco', raioExterno: 150, raioInterno: 70 }, num, 'perfil', 'x');
    expect(area(p)).toBeGreaterThan(Math.PI * (150 ** 2 - 70 ** 2) * 0.99 - 40);
    const e = { contato: { usar: true }, opcoes: [{ titulo: 'T', formas: [
      { id: 'cubo', tipo: 'cilindro', diametro: 140, comprimento: 20, eixo: 'x', centro: [0, 0, 0] },
      { id: 'd', tipo: 'extrusao', eixo: 'x', comprimento: 6, perfil: { gerar: 'disco', raioExterno: 150, raioInterno: 70, furos: 6, raioFuro: 6 }, ponta: { id: 'cubo', lado: '+x' } },
    ] }] };
    expect(verificarContato(e).achados).toEqual([]);
  });

  it('recusa furos que não cabem, ranhura sem profundidade e campo inexistente', () => {
    expect(() => GERADORES.disco.gerar({ raioExterno: 150, raioInterno: 70, furos: 6, raioFuro: 60 }, 'x')).toThrow(/não cabem entre 70 e 150 mm/);
    expect(() => GERADORES.disco.gerar({ raioExterno: 150, raioInterno: 70, ranhuras: 4, larguraRanhura: 4 }, 'x')).toThrow(/profundidadeRanhura/);
    expect(() => gerarPerfil({ gerar: 'disco', raioExterno: 150, raioInterno: 70, buracos: 3 }, num, 'perfil', 'x')).toThrow(/não tem o campo "buracos"/);
  });
});
