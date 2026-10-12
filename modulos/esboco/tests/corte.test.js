/* `--corte`: a vista da seção. O esboço leva `corte: { eixo, valor, lado }`; o desenho corta cada forma pelo plano, mostra só
   o lado escolhido e preenche a superfície de corte (`<path class="corte" data-forma="...">`) com o contorno por forma. As
   provas são medidas: a área da superfície de corte em mm² (a do polígono desenhado dividida por escala²) contra a área
   analítica da seção de cada tipo de forma. */
import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { desenharEsboco, ErroDeEsboco, VISTAS } from '../src/index.js';
import { lerArgumentos, lerCorteDaLinha, unidadeArquivo, vistasArquivo } from '../../../tools/mecanifica/esboco.mjs';

const esboco = (formas, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], ...extra });
const caixa = (id, centro, l, a, p, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });

/* os anéis do `d` de um path (cada "M...Z"), em pixels */
const aneis = (d) => d.split('M').filter(Boolean).map((s) => s.replace(/Z\s*$/, '').split('L').map((q) => q.split(',').map(Number)));
const areaDoAnel = (a) => Math.abs(a.reduce((s, p, i) => s + p[0] * a[(i + 1) % a.length][1] - a[(i + 1) % a.length][0] * p[1], 0)) / 2;
const dentro = (p, a) => { let c = false; for (let i = 0, j = a.length - 1; i < a.length; j = i++) if ((a[i][1] > p[1]) !== (a[j][1] > p[1]) && p[0] < ((a[j][0] - a[i][0]) * (p[1] - a[i][1])) / (a[j][1] - a[i][1]) + a[i][0]) c = !c; return c; };
/* área par-ímpar: um anel dentro de um número ímpar de outros é furo */
const areaParImpar = (d) => {
  const rs = aneis(d);
  return rs.reduce((s, r, i) => s + (rs.filter((o, k) => k !== i && dentro(r[0], o)).length % 2 === 0 ? 1 : -1) * areaDoAnel(r), 0);
};
/* as superfícies de corte do desenho: { id, mm2 } por forma (o desenho pode ter mais de um path por forma) */
const secoes = (e) => {
  const { svg, escala } = desenharEsboco(e);
  const porForma = {};
  for (const m of svg.matchAll(/<path class="corte" data-forma="([^"]+)" d="([^"]+)"/g)) porForma[m[1]] = (porForma[m[1]] ?? 0) + areaParImpar(m[2]) / (escala * escala);
  return { porForma, svg, escala };
};
const perto = (valor, esperado, tolerancia) => expect(Math.abs(valor - esperado) / esperado).toBeLessThan(tolerancia);

describe('corte: a superfície de corte medida', () => {
  it('a caixa cortada ao meio mostra a seção inteira na lateral e a seção encurtada pela projeção na isométrica', () => {
    const f = [caixa('c', [0, 0, 0], 40, 40, 40)];
    const lateral = secoes(esboco(f, { vista: 'lateral', corte: { eixo: 'x', valor: 0 } }));
    perto(lateral.porForma.c, 1600, 0.01);
    /* na projeção isométrica do módulo (y com escala 1, x e z a 30 graus) o quadrado do plano x tem a área multiplicada por cos 30 */
    const iso = secoes(esboco(f, { vista: 'isometrica', corte: { eixo: 'x', valor: 0 } }));
    perto(iso.porForma.c, 1600 * Math.cos(Math.PI / 6), 0.01);
  });

  it('o lado padrão tira a metade do observador e deixa a seção de frente; o lado do observador a esconde', () => {
    const f = [caixa('c', [0, 0, 0], 40, 40, 40)];
    const padrao = desenharEsboco(esboco(f, { vista: 'frontal', corte: { eixo: 'z', valor: 0 } }));
    expect(padrao.svg).toContain('class="corte"');
    const doObservador = desenharEsboco(esboco(f, { vista: 'frontal', corte: { eixo: 'z', valor: 0, lado: '+' } }));
    expect(doObservador.svg).not.toContain('class="corte"');
    /* cada metade é uma caixa de 40 x 40 x 20: o quadro encolhe na profundidade, mas a frente tem os mesmos 40 x 40 */
    expect(padrao.largura).toBe(doObservador.largura);
  });

  it('eixo no cubo: o corte pelo plano do eixo dá duas tiras no cubo e um retângulo no eixo, cada um com a área exata', () => {
    const f = [
      { id: 'cubo', tipo: 'anel', diametroExterno: 60, diametroInterno: 20, espessura: 40, eixo: 'x', centro: [0, 0, 0], cor: 'azul' },
      { id: 'eixo', tipo: 'cilindro', diametro: 20, comprimento: 80, eixo: 'x', centro: [0, 0, 0], cor: 'cinza' },
    ];
    const r = secoes(esboco(f, { vista: 'frontal', corte: { eixo: 'z', valor: 0 } }));
    /* o cubo: duas tiras de 20 (y de 10 a 30) por 40 (x); o eixo: 20 por 80; com 128 lados a flecha é de 0,01 mm */
    perto(r.porForma.cubo, 2 * 20 * 40, 0.005);
    perto(r.porForma.eixo, 20 * 80, 0.005);
    /* cada forma tem o contorno e a hachura da própria superfície */
    expect((r.svg.match(/class="corte-hachura"/g) ?? []).length).toBe(2);
  });

  it('pneu sobre aro: o corte radial mostra o furo do pneu ocupado pelo aro, sem que um cubra o outro', () => {
    const f = [
      { id: 'pneu', tipo: 'anel', diametroExterno: 300, diametroInterno: 220, espessura: 60, eixo: 'x', centro: [0, 0, 0], cor: 'preto' },
      { id: 'aro', tipo: 'anel', diametroExterno: 220, diametroInterno: 60, espessura: 30, eixo: 'x', centro: [0, 0, 0], cor: 'cinza' },
    ];
    const r = secoes(esboco(f, { vista: 'lateral', corte: { eixo: 'x', valor: 0 } }));
    perto(r.porForma.pneu, (Math.PI * (150 ** 2 - 110 ** 2)), 0.01);
    perto(r.porForma.aro, (Math.PI * (110 ** 2 - 30 ** 2)), 0.01);
  });

  const casos = [
    ['caixa', caixa('f', [0, 0, 0], 40, 30, 20), { eixo: 'x', valor: 0 }, 'lateral', 30 * 20, 0.005],
    ['cilindro', { id: 'f', tipo: 'cilindro', diametro: 40, comprimento: 60, eixo: 'y', centro: [0, 0, 0] }, { eixo: 'y', valor: 0 }, 'superior', Math.PI * 400, 0.005],
    ['anel', { id: 'f', tipo: 'anel', diametroExterno: 60, diametroInterno: 20, espessura: 30, eixo: 'z', centro: [0, 0, 0] }, { eixo: 'z', valor: 0 }, 'frontal', Math.PI * (900 - 100), 0.005],
    ['cone (seção do meio, diâmetro 30)', { id: 'f', tipo: 'cone', diametro: 40, diametroTopo: 20, comprimento: 60, eixo: 'y', centro: [0, 0, 0] }, { eixo: 'y', valor: 0 }, 'superior', Math.PI * 225, 0.01],
    ['esfera', { id: 'f', tipo: 'esfera', diametro: 50, centro: [0, 0, 0] }, { eixo: 'y', valor: 0 }, 'superior', Math.PI * 625, 0.03],
    ['extrusão', { id: 'f', tipo: 'extrusao', perfil: [[0, 0], [100, 0], [0, 100]], comprimento: 20, eixo: 'z', centro: [0, 0, 0] }, { eixo: 'z', valor: 0 }, 'frontal', 5000, 0.005],
    ['loft (seção a 50% de um tronco 100x60 para 40x20)', { id: 'f', tipo: 'loft', eixo: 'z', secoes: [{ pos: 0, tamanho: [100, 60] }, { pos: 100, tamanho: [40, 20] }], centro: [0, 0, 0] }, { eixo: 'z', valor: 0 }, 'frontal', 70 * 40, 0.01],
    ['revolução (cilindro de raio 50)', { id: 'f', tipo: 'revolucao', eixo: 'y', perfil: [[50, 10], [50, 110]], centro: [0, 60, 0] }, { eixo: 'y', valor: 60 }, 'superior', Math.PI * 2500, 0.01],
    ['tubo reto de 10 mm', { id: 'f', tipo: 'tubo', diametro: 10, caminho: [[0, 0, 0], [100, 0, 0]] }, { eixo: 'x', valor: 50 }, 'lateral', Math.PI * 25, 0.01],
  ];
  for (const [nome, forma, corte, vista, esperado, tolerancia] of casos) {
    it(`${nome}: a área da seção é a analítica`, () => {
      const r = secoes(esboco([forma], { vista, corte }));
      perto(r.porForma.f, esperado, tolerancia);
    });
  }

  it('o envolve (correia) é cortado e a seção sai com área positiva', () => {
    const f = [
      { id: 'a', tipo: 'cilindro', diametro: 100, comprimento: 30, eixo: 'z', centro: [0, 0, 0] },
      { id: 'b', tipo: 'cilindro', diametro: 40, comprimento: 30, eixo: 'z', centro: [150, 0, 0] },
      { id: 'correia', tipo: 'envolve', largura: 20, espessura: 4, circulos: [{ centro: 'a.centro', raio: 52, eixo: 'z' }, { centro: 'b.centro', raio: 22, eixo: 'z' }] },
    ];
    const r = secoes(esboco(f, { vista: 'frontal', corte: { eixo: 'z', valor: 0 } }));
    expect(r.porForma.correia).toBeGreaterThan(0);
    expect(r.porForma.a).toBeGreaterThan(0);
  });

  it('o valor aceita parâmetro e âncora; o título diz o corte', () => {
    const f = [caixa('c', [30, 0, 0], 40, 40, 40)];
    const fixo = secoes(esboco(f, { vista: 'lateral', corte: { eixo: 'x', valor: 30 } }));
    const porParametro = secoes({ ...esboco(f, { vista: 'lateral', corte: { eixo: 'x', valor: 'meio' } }), parametros: { meio: 30 } });
    const porAncora = secoes(esboco(f, { vista: 'lateral', corte: { eixo: 'x', valor: 'c.centro' } }));
    expect(porParametro.porForma.c).toBeCloseTo(fixo.porForma.c, 6);
    expect(porAncora.porForma.c).toBeCloseTo(fixo.porForma.c, 6);
    expect(fixo.svg).toContain('corte x=30');
  });

  it('o corte que não toca nada do lado escolhido, o eixo ou o valor inválidos dizem o que corrigir', () => {
    const f = [caixa('c', [0, 0, 0], 40, 40, 40)];
    expect(() => desenharEsboco(esboco(f, { corte: { eixo: 'x', valor: 500 } }))).toThrow(/não atravessa nenhuma forma/);
    expect(() => desenharEsboco(esboco(f, { corte: { eixo: 'w', valor: 0 } }))).toThrow(ErroDeEsboco);
    expect(() => desenharEsboco(esboco(f, { corte: { eixo: 'x', valor: 'x' } }))).toThrow(/valor/);
    expect(() => desenharEsboco(esboco(f, { corte: { eixo: 'x', valor: 0, lado: 'm' } }))).toThrow(/lado/);
  });

  it('sem corte o desenho é o de sempre, byte a byte', () => {
    const f = [caixa('c', [0, 0, 0], 40, 40, 40), { id: 'r', tipo: 'cilindro', diametro: 20, comprimento: 60, eixo: 'y', centro: [0, 0, 0] }];
    const a = desenharEsboco(esboco(f)).svg;
    expect(a).not.toContain('corte');
    expect(Object.keys(VISTAS)).toContain('lateral');
  });
});

describe('--corte na linha de comando', () => {
  it('lê <eixo>=<valor> e --lado', () => {
    expect(lerCorteDaLinha('x=50', '-')).toEqual({ eixo: 'x', valor: 50, lado: '-' });
    expect(lerCorteDaLinha('z=-12.5', undefined)).toEqual({ eixo: 'z', valor: -12.5 });
    expect(lerCorteDaLinha('y=meio', '+')).toEqual({ eixo: 'y', valor: 'meio', lado: '+' });
    expect(() => lerCorteDaLinha('50', undefined)).toThrow(/--corte precisa/);
    expect(() => lerCorteDaLinha('x=50', 'm')).toThrow(/--lado/);
    const a = lerArgumentos(['m.esboco.json', '--corte', 'x=50', '--lado', '+']);
    expect(a.valor('--corte')).toBe('x=50');
    expect(a.valor('--lado')).toBe('+');
  });

  it('grava o corte do esboço inteiro e o da unidade nas vistas pedidas, com --largura e --saida', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'corte-'));
    const arq = join(pasta, 'roda.esboco.json');
    writeFileSync(arq, JSON.stringify({
      vista: 'isometrica',
      opcoes: [{ titulo: 'T', formas: [
        { id: 'pneu', tipo: 'anel', diametroExterno: 300, diametroInterno: 220, espessura: 60, eixo: 'x', centro: [0, 0, 0], unidade: 'roda' },
        { id: 'aro', tipo: 'anel', diametroExterno: 220, diametroInterno: 60, espessura: 30, eixo: 'x', centro: [0, 0, 0], unidade: 'roda' },
        { id: 'base', tipo: 'caixa', largura: 80, altura: 10, profundidade: 80, centro: [0, -200, 0], unidade: 'chao' },
      ] }],
    }));
    const inteiro = await vistasArquivo(arq, { vista: 'lateral', corte: { eixo: 'x', valor: 0 }, largura: 900, saida: join(pasta, 'out') });
    expect(inteiro.destinos).toHaveLength(1);
    expect(inteiro.destinos[0]).toContain(join(pasta, 'out'));
    expect(inteiro.destinos[0]).toMatch(/-900px-corte-x0-lateral\.png$/);
    expect(existsSync(inteiro.destinos[0])).toBe(true);
    const unidade = await unidadeArquivo(arq, 'roda', { vista: 'frontal', corte: { eixo: 'z', valor: 0 }, largura: 800 });
    expect(unidade.destinos[0]).toMatch(/-unidade-roda-800px-corte-z0-frontal\.png$/);
    expect(readFileSync(unidade.destinos[0]).length).toBeGreaterThan(1000);
  });
});
