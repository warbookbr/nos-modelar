/* sobreposicao-de-cortes.test.mjs — os cortes do modelo sobre os do sólido do esboço: o corte de uma malha, o desvio entre as duas
   linhas, o desenho e, de ponta a ponta, a receita de prova do bloco furado (o esboço, o sólido da Manifold, a malha da receita) com o
   rasterizador trocado por um que grava o SVG, para o teste não pagar o navegador. A variante que a razão de volume reprova tem de
   aparecer na sobreposição como desvio, e a que a razão aprova não. */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  EIXOS_DOS_CORTES, FRACOES_DOS_CORTES, caixaDosTriangulos, comprimentoRedondo, desvioMaximoEntre, formasLigadas, painelDoCorte, quebrarTexto,
  rasterizarSvg, segmentosDoCorte, sobreposicaoDeCortes, svgDosPaineis, valoresDosCortes,
} from './sobreposicao-de-cortes.mjs';

const area = mkdtempSync(join(tmpdir(), 'sobreposicao-'));
afterAll(() => rmSync(area, { recursive: true, force: true }));

/* o cubo de lado 2 centrado na origem, em 12 triângulos de pontos [x, y, z] */
function cubo(lado = 2, centro = [0, 0, 0]) {
  const h = lado / 2;
  const p = (sx, sy, sz) => [centro[0] + sx * h, centro[1] + sy * h, centro[2] + sz * h];
  const quadrados = [
    [p(-1, -1, -1), p(1, -1, -1), p(1, 1, -1), p(-1, 1, -1)], [p(-1, -1, 1), p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1)],
    [p(-1, -1, -1), p(-1, -1, 1), p(-1, 1, 1), p(-1, 1, -1)], [p(1, -1, -1), p(1, -1, 1), p(1, 1, 1), p(1, 1, -1)],
    [p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1)], [p(-1, 1, -1), p(1, 1, -1), p(1, 1, 1), p(-1, 1, 1)],
  ];
  return quadrados.flatMap(([a, b, c, d]) => [[a, b, c], [a, c, d]]);
}

describe('o corte de uma malha por um plano', () => {
  it('o plano no meio de um cubo dá o quadrado, com quatro segmentos de comprimento igual ao lado', () => {
    const segmentos = segmentosDoCorte(cubo(2), 'z', 0.3);
    expect(segmentos).toHaveLength(8);
    const comprimento = segmentos.reduce((soma, [a, b, c, d]) => soma + Math.hypot(c - a, d - b), 0);
    expect(comprimento).toBeCloseTo(8, 9);
  });

  it('cada eixo vê o plano de frente, como a vista de mesmo lado: z como a frontal, y como a superior (-z para cima), x como a direita (-z à direita)', () => {
    const caixa = cubo(2, [10, 20, 30]);
    const limites = (eixo, valor) => {
      const s = segmentosDoCorte(caixa, eixo, valor).flatMap(([a, b, c, d]) => [[a, b], [c, d]]);
      return [Math.min(...s.map((q) => q[0])), Math.max(...s.map((q) => q[0])), Math.min(...s.map((q) => q[1])), Math.max(...s.map((q) => q[1]))];
    };
    const igual = (lidos, esperados) => esperados.forEach((e, i) => expect(lidos[i]).toBeCloseTo(e, 9));
    /* z = 30: h é x (de 9 a 11) e v é y (de 19 a 21) */
    igual(limites('z', 30.2), [9, 11, 19, 21]);
    /* y = 20: h é x, v é -z, e -z de 29 a 31 vira -31 a -29 */
    igual(limites('y', 20.2), [9, 11, -31, -29]);
    /* x = 10: h é -z (-31 a -29), v é y */
    igual(limites('x', 10.2), [-31, -29, 19, 21]);
  });

  it('o plano sobre a face do cubo, onde os vértices ficam em cima dele, fecha a linha: cada ponta aparece duas vezes', () => {
    const segmentos = segmentosDoCorte(cubo(2), 'x', 1);
    const pontas = segmentos.flatMap(([a, b, c, d]) => [`${a},${b}`, `${c},${d}`]);
    const contagem = new Map();
    for (const p of pontas) contagem.set(p, (contagem.get(p) ?? 0) + 1);
    expect(segmentos.length).toBeGreaterThan(0);
    expect([...contagem.values()].every((n) => n % 2 === 0)).toBe(true);
  });

  it('o plano fora da malha não corta nada, e o eixo desconhecido é recusado', () => {
    expect(segmentosDoCorte(cubo(2), 'y', 5)).toEqual([]);
    expect(() => segmentosDoCorte(cubo(2), 'w', 0)).toThrow(/x, y ou z/);
  });

  it('a caixa da malha e os planos de corte: um quarto, a metade e três quartos de cada eixo', () => {
    const caixa = caixaDosTriangulos(cubo(4, [100, 0, 0]));
    expect(caixa).toEqual({ min: [98, -2, -2], max: [102, 2, 2] });
    expect(FRACOES_DOS_CORTES).toEqual([0.25, 0.5, 0.75]);
    expect(valoresDosCortes(caixa)).toEqual({ x: [99, 100, 101], y: [-1, 0, 1], z: [-1, 0, 1] });
    expect(caixaDosTriangulos([])).toBeNull();
    expect(EIXOS_DOS_CORTES).toEqual(['x', 'y', 'z']);
  });
});

describe('o desvio entre o esboço e o modelo', () => {
  const quadrado = (lado, dx = 0) => segmentosDoCorte(cubo(lado, [dx, 0, 0]), 'z', 0.1);

  it('linhas iguais não têm desvio, e o quadrado deslocado em 3 mm tem 3 mm', () => {
    expect(desvioMaximoEntre(quadrado(10), quadrado(10))).toBeCloseTo(0, 9);
    expect(desvioMaximoEntre(quadrado(10), quadrado(10, 3))).toBeCloseTo(3, 6);
  });

  it('o quadrado menor está a 1 mm nos lados e a 1,41 mm nos cantos, e o desvio é o maior das duas direções', () => {
    expect(desvioMaximoEntre(quadrado(10), quadrado(8))).toBeCloseTo(Math.SQRT2, 6);
    /* um lado só de um quadrado contra o quadrado inteiro: a ponta do quadrado que o outro não tem está longe */
    const um = quadrado(10).slice(0, 1);
    expect(desvioMaximoEntre(um, quadrado(10))).toBeGreaterThan(0);
  });

  it('um lado sem corte não tem desvio a dar', () => {
    expect(desvioMaximoEntre([], quadrado(10))).toBeNull();
    expect(desvioMaximoEntre(quadrado(10), [])).toBeNull();
  });

  it('o painel junta as duas linhas, a caixa delas e o desvio', () => {
    const painel = painelDoCorte({ eixo: 'z', valor: 0.1, triangulosDoEsboco: cubo(10), triangulosDoModelo: cubo(8) });
    expect(painel.esboco).toHaveLength(8);
    expect(painel.modelo).toHaveLength(8);
    expect(painel.caixa).toEqual({ h0: -5, v0: -5, h1: 5, v1: 5 });
    expect(painel.desvioMaximoMm).toBeCloseTo(Math.SQRT2, 6);
    const vazio = painelDoCorte({ eixo: 'z', valor: 50, triangulosDoEsboco: cubo(10), triangulosDoModelo: cubo(8) });
    expect(vazio.caixa).toBeNull();
    expect(vazio.desvioMaximoMm).toBeNull();
  });
});

describe('o desenho dos painéis', () => {
  const paineisDe = (eixo, valores, esboco = cubo(10), modelo = cubo(8)) => valores.map((valor) => painelDoCorte({ eixo, valor, triangulosDoEsboco: esboco, triangulosDoModelo: modelo }));

  it('comprimento redondo: 1, 2 ou 5 vezes uma potência de dez, o maior que cabe', () => {
    expect(comprimentoRedondo(130)).toBe(100);
    expect(comprimentoRedondo(240)).toBe(200);
    expect(comprimentoRedondo(730)).toBe(500);
    expect(comprimentoRedondo(0.34)).toBe(0.2);
    expect(comprimentoRedondo(0)).toBe(1);
  });

  it('o texto quebra entre as palavras na largura pedida', () => {
    expect(quebrarTexto('um dois três quatro', 9)).toEqual(['um dois', 'três', 'quatro']);
    expect(quebrarTexto('palavra-muito-comprida cabe', 5)).toEqual(['palavra-muito-comprida', 'cabe']);
  });

  it('cada painel diz o corte, o lado de onde olha, as cores e a escala, o esboço grosso e vermelho e o modelo fino e azul', () => {
    const { svg, escalas, disposicao } = svgDosPaineis(paineisDe('y', [-2, 0, 2]), { orientacao: { frente: '-z', nomeDaFrente: 'a proa', nomeDeTras: 'a cauda' } });
    expect(disposicao).toMatch(/^(coluna|linha)$/);
    expect(escalas).toHaveLength(3);
    expect(escalas.every((e) => e > 0)).toBe(true);
    expect(svg.match(/corte em y = /g)).toHaveLength(3);
    expect(svg).toContain('corte em y = -2,0 mm, visto de cima (vista superior)');
    expect(svg).toContain('olha de +y; +x à direita, -z (proa) em cima');
    expect(svg).toContain('vermelho grosso: esboço; azul fino: modelo');
    expect(svg).toMatch(/escala \d+,\d\d px\/mm/);
    expect(svg).toMatch(/stroke="#d41f1f" stroke-width="4"/);
    expect(svg).toMatch(/stroke="#1f4fe0" stroke-width="1.5"/);
    expect(svg.indexOf('#d41f1f')).toBeLessThan(svg.indexOf('#1f4fe0'));
    expect(svg).toMatch(/>\d+ mm<\/text>/);
  });

  it('o painel sem corte diz que o plano não corta, e o que só um lado corta diz qual', () => {
    const { svg, escalas } = svgDosPaineis(paineisDe('z', [50]));
    expect(escalas).toEqual([null]);
    expect(svg).toContain('o plano não corta nem o esboço nem o modelo');
    const so = svgDosPaineis([painelDoCorte({ eixo: 'z', valor: 0.1, triangulosDoEsboco: cubo(10), triangulosDoModelo: cubo(2, [100, 0, 0]) })]);
    expect(so.svg).not.toContain('o plano não corta o modelo');
    const semModelo = svgDosPaineis([painelDoCorte({ eixo: 'z', valor: 0.1, triangulosDoEsboco: cubo(10), triangulosDoModelo: [] })]);
    expect(semModelo.svg).toContain('o plano não corta o modelo');
  });

  it('o painel alto fica em linha e o largo em coluna, e a imagem não passa de 1568 px', () => {
    const fino = (lado) => cubo(1).map((t) => t.map(([x, y, z]) => [x * lado[0], y * lado[1], z * lado[2]]));
    const alto = svgDosPaineis(paineisDe('z', [-1, 0, 1], fino([20, 2000, 20]), fino([20, 2000, 20])));
    const largo = svgDosPaineis(paineisDe('z', [-1, 0, 1], fino([2000, 20, 20]), fino([2000, 20, 20])));
    expect(alto.disposicao).toBe('linha');
    expect(largo.disposicao).toBe('coluna');
    for (const { largura, altura } of [alto, largo]) expect(Math.max(largura, altura)).toBeLessThanOrEqual(1568);
  });

  it('sem painel não há desenho', () => {
    expect(() => svgDosPaineis([])).toThrow(/sem painéis/);
  });
});

describe('a receita de prova contra o esboço', () => {
  const PECA = 'tools/fixtures/forma-do-esboco';
  const gravarSvg = (saida) => async (svg, largura, altura, arquivo) => {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(arquivo.replace(/\.png$/, '.svg'), svg, 'utf8');
    saida.push({ arquivo, largura, altura });
  };

  it('a receita que reproduz o esboço dá nove painéis, três imagens, e o desvio de milímetro', async () => {
    const imagens = [];
    const pasta = join(area, 'ok');
    const feito = await sobreposicaoDeCortes({ peca: `${PECA}/ok/receita.js`, saida: pasta, dependencias: { rasterizar: gravarSvg(imagens) } });
    expect(feito.arquivos.map((a) => a.slice(pasta.length + 1))).toEqual(['sobreposicao-x.png', 'sobreposicao-y.png', 'sobreposicao-z.png']);
    expect(imagens).toHaveLength(3);
    expect(feito.paineis).toHaveLength(9);
    expect(feito.partes).toEqual(['bloco', 'viga']);
    expect(feito.formas).toEqual(['bloco', 'viga']);
    /* dois dos cortes em y caíam no vão entre o bloco e a viga e iam vazios; agora vão ao material, e todo painel tem desvio */
    expect(feito.notas).toHaveLength(2);
    for (const nota of feito.notas) expect(nota).toMatch(/^o corte em y = .* não cruzava o modelo e foi para y = /);
    for (const painel of feito.paineis) expect(painel.desvioMaximoMm).toBeLessThan(1);
    const svg = readFileSync(join(pasta, 'sobreposicao-z.svg'), 'utf8');
    expect(svg).toContain('vermelho grosso: esboço; azul fino: modelo');
  }, 60_000);

  it('o bloco com 90% das medidas, que a razão de volume reprova, aparece como desvio de pelo menos 10 mm em algum corte', async () => {
    const feito = await sobreposicaoDeCortes({ peca: `${PECA}/menor/receita.js`, saida: join(area, 'menor'), dependencias: { rasterizar: gravarSvg([]) } });
    const maior = Math.max(...feito.paineis.map((p) => p.desvioMaximoMm ?? 0));
    expect(maior).toBeGreaterThan(10);
  }, 60_000);

  it('o bloco deslocado 20 mm em x aparece com desvio de 20 mm no corte que passa por ele', async () => {
    const feito = await sobreposicaoDeCortes({ peca: `${PECA}/deslocada/receita.js`, saida: join(area, 'deslocada'), dependencias: { rasterizar: gravarSvg([]) } });
    const emZ = feito.paineis.filter((p) => p.eixo === 'z' && p.desvioMaximoMm !== null);
    expect(Math.max(...emZ.map((p) => p.desvioMaximoMm))).toBeGreaterThan(15);
  }, 60_000);

  it('a receita sem REFINA.esboco não tem esboço para sobrepor e devolve null, sem rodar nada', async () => {
    let rasterizou = false;
    const feito = await sobreposicaoDeCortes({
      peca: 'tools/fixtures/refina-forma-global/ok/receita.js', saida: join(area, 'sem'), dependencias: { rasterizar: async () => { rasterizou = true; } },
    });
    expect(feito).toBeNull();
    expect(rasterizou).toBe(false);
  });

  it('as formas ligadas saem sem repetir e em ordem, e com o mínimo próprio também', () => {
    expect(formasLigadas({ asa: ['asaD', 'pontaD'], porta: { formas: ['porta'], minimo: 0.9 }, outra: ['asaD'] })).toEqual(['asaD', 'pontaD', 'porta']);
  });
});

describe('o PNG do desenho', () => {
  it('o Chromium rasteriza o SVG no tamanho pedido, em PNG', async () => {
    const { svg, largura, altura } = svgDosPaineis([painelDoCorte({ eixo: 'z', valor: 0.1, triangulosDoEsboco: cubo(10), triangulosDoModelo: cubo(8) })]);
    const arquivo = join(area, 'painel.png');
    const png = await rasterizarSvg(svg, largura, altura, arquivo);
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png.readUInt32BE(16)).toBe(largura);
    expect(png.readUInt32BE(20)).toBe(altura);
    expect(readFileSync(arquivo).equals(png)).toBe(true);
  }, 60_000);
});

describe('planos com material', () => {
  it('o corte que cai no vão de uma peça de dois lados vai ao triângulo mais perto, e o que cruza fica', async () => {
    const { planosComMaterial } = await import('./sobreposicao-de-cortes.mjs');
    const tri = (x) => [[x, 0, 0], [x + 10, 0, 0], [x, 10, 5]];
    const triangulos = [tri(-1960), tri(1950)];
    const { valores, mudancas } = planosComMaterial({ x: [-1000, 0, 1955] }, triangulos);
    expect(valores.x[0]).toBeCloseTo(-1960 + 10 / 3);
    expect(valores.x[2]).toBe(1955);
    expect(mudancas.map((m) => m.de)).toEqual([-1000, 0]);
    expect(Math.abs(valores.x[1])).toBeGreaterThan(1900);
    expect(new Set(valores.x).size).toBe(3);
  });
});
