/* contorno.test.js — cada peça do módulo vista num caso construído de
   propósito: duas partes do mesmo cinza separadas pela semente, a pintura com a
   opacidade pedida, a divisa entre vizinhas achada, a medida de borda e o
   limite das rodadas. */
import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { segmentar, sobreposicao, svgDoMapa, etiquetasFora, segmentosSeCruzam, divisas, recortesDasDivisas, proximidadeDaBorda, proximaAcao, validarRodada } from '../src/index.js';

/* Fundo branco, dois retângulos do mesmo cinza encostados, com uma linha um
   pouco mais escura entre eles, como a costura de duas partes. */
function imagem() {
  const png = new PNG({ width: 120, height: 60 });
  for (let y = 0; y < 60; y += 1) for (let x = 0; x < 120; x += 1) {
    const o = (y * 120 + x) * 4;
    const dentro = x >= 10 && x < 110 && y >= 15 && y < 45;
    const v = !dentro ? 250 : (x === 60 ? 110 : 150);
    png.data[o] = v; png.data[o + 1] = v; png.data[o + 2] = v; png.data[o + 3] = 255;
  }
  return PNG.sync.write(png);
}
const config = { limiar: 225, regioes: { esquerda: [30, 30], direita: [90, 30] } };

describe('contorno da imagem', () => {
  it('aceita pontos soltos misturados com linhas na mesma semente', async () => {
    const { tracosDaSemente } = await import('../src/index.js');
    expect(tracosDaSemente([[1, 2], [[3, 4], [5, 6]]])).toEqual([[[1, 2]], [[3, 4], [5, 6]]]);
    expect(tracosDaSemente([[1, 2], [3, 4]])).toEqual([[[1, 2], [3, 4]]]);
  });

  it('uma parte em dois pedaços, um de cada lado da vizinha, com duas linhas de semente', async () => {
    const png = new PNG({ width: 120, height: 60 });
    for (let y = 0; y < 60; y += 1) for (let x = 0; x < 120; x += 1) {
      const o = (y * 120 + x) * 4;
      const dentro = x >= 10 && x < 110 && y >= 15 && y < 45;
      const v = !dentro ? 250 : (x === 40 || x === 80 ? 110 : 150);
      png.data[o] = v; png.data[o + 1] = v; png.data[o + 2] = v; png.data[o + 3] = 255;
    }
    const seg = await segmentar(PNG.sync.write(png), { limiar: 225, regioes: { lados: [[[20, 25], [20, 35]], [[100, 25], [100, 35]]], meio: [60, 30] } });
    const dono = (x, y) => seg.rotulos[y * 120 + x];
    expect(dono(15, 30)).toBe(seg.regioes.lados.rotulo);
    expect(dono(105, 30)).toBe(seg.regioes.lados.rotulo);
    expect(dono(60, 30)).toBe(seg.regioes.meio.rotulo);
  });

  it('separa duas partes do mesmo cinza na costura entre elas', async () => {
    const seg = await segmentar(imagem(), config);
    const xs = (nome) => seg.regioes[nome].contornoPx.map(([x]) => x);
    expect(Math.max(...xs('esquerda'))).toBeGreaterThanOrEqual(58);
    expect(Math.max(...xs('esquerda'))).toBeLessThanOrEqual(61);
    expect(Math.min(...xs('direita'))).toBeGreaterThanOrEqual(59);
    expect(Math.min(...xs('direita'))).toBeLessThanOrEqual(62);
    expect(divisas(seg).map(({ a, b }) => [a, b])).toEqual([['direita', 'esquerda']]);
  });

  it('recusa semente fora da silhueta ou mal escrita', async () => {
    await expect(segmentar(imagem(), { regioes: { a: [2, 2] } })).rejects.toThrow(/fora da silhueta/);
    await expect(segmentar(imagem(), { regioes: { a: [30] } })).rejects.toThrow(/semente inválida/);
  });

  it('pinta com a opacidade pedida e recorta cada divisa com o original ao lado', async () => {
    const png = imagem();
    const seg = await segmentar(png, config);
    const pintada = PNG.sync.read(await sobreposicao(png, seg, { opacidade: 0.2, rotular: false }));
    const o = (30 * 120 + 30) * 4;
    const [r, g, b] = pintada.data.slice(o, o + 3);
    /* 80% do cinza 150 mais 20% de uma cor: nenhum canal fica longe de 150. */
    for (const c of [r, g, b]) expect(Math.abs(c - 150)).toBeLessThanOrEqual(0.2 * 255 + 1);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(10);
    const [recorte] = recortesDasDivisas(png, PNG.sync.write(pintada), seg, { zoom: 3 });
    const par = PNG.sync.read(recorte.png);
    const [x0, , x1] = recorte.caixa;
    expect(par.width).toBe((x1 - x0 + 1) * 3 * 2 + 6);
  });

  it('põe os nomes fora da silhueta, sem etiqueta sobreposta nem chamada cruzada', async () => {
    /* Uma parte em U, côncava, e seis partes em fila: nomes demais para a
       altura de cada coluna, que obriga o empilhamento e as trocas. */
    const png = new PNG({ width: 160, height: 80 });
    for (let y = 0; y < 80; y += 1) for (let x = 0; x < 160; x += 1) {
      const o = (y * 160 + x) * 4;
      const u = x >= 2 && x < 40 && y >= 5 && y < 75 && !(x >= 12 && x < 30 && y < 55);
      const fila = x >= 44 && x < 158 && y >= 30 && y < 50;
      const v = !(u || fila) ? 250 : ((x - 44) % 19 === 0 && fila ? 110 : 150);
      png.data[o] = v; png.data[o + 1] = v; png.data[o + 2] = v; png.data[o + 3] = 255;
    }
    const buf = PNG.sync.write(png);
    const regioes = { u: [5, 70] };
    for (let k = 0; k < 6; k += 1) regioes[`parte${k}`] = [54 + 19 * k, 40];
    const seg = await segmentar(buf, { limiar: 225, regioes });
    const arranjo = etiquetasFora(seg);
    const final = PNG.sync.read(await sobreposicao(buf, seg));
    expect([final.width, final.height]).toEqual([arranjo.largura, arranjo.altura]);
    /* O SVG que a ferramenta rasteriza tem o tamanho do arranjo e um texto
       por nome e por número. */
    const svg = svgDoMapa(await sobreposicao(buf, seg, { rotular: false }), arranjo);
    expect(svg).toContain(`viewBox="0 0 ${arranjo.largura} ${arranjo.altura}"`);
    expect(svg.match(/<text /g)).toHaveLength(14);
    expect(arranjo.etiquetas).toHaveLength(7);
    /* O número segue a ordem do arquivo de regiões, e não a alfabética. */
    const porNome = Object.fromEntries(arranjo.etiquetas.map((e) => [e.nome, e.texto]));
    expect(porNome.u).toBe('1- u');
    expect(porNome.parte5).toBe('7- parte5');
    const naSilhueta = (x, y) => { const ox = x - arranjo.dx; const oy = y - arranjo.dy; return ox >= 0 && oy >= 0 && ox < seg.largura && oy < seg.altura && seg.silhueta[oy * seg.largura + ox]; };
    for (const { nome, caixa: [x0, y0, x1, y1], marca } of arranjo.etiquetas) {
      for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) expect(naSilhueta(x, y)).toBeFalsy();
      /* A marca cai num pixel da própria parte, também na parte côncava. */
      expect(seg.rotulos[(marca[1] - arranjo.dy) * seg.largura + marca[0] - arranjo.dx]).toBe(seg.regioes[nome].rotulo);
    }
    const E = arranjo.etiquetas;
    for (let a = 0; a < E.length; a += 1) for (let b = a + 1; b < E.length; b += 1) {
      const [p, q] = [E[a].caixa, E[b].caixa];
      expect(p[0] <= q[2] && q[0] <= p[2] && p[1] <= q[3] && q[1] <= p[3]).toBe(false);
      expect(segmentosSeCruzam(E[a].marca, E[a].ponta, E[b].marca, E[b].ponta)).toBe(false);
    }
  });

  it('mede quanto do contorno segue uma borda da imagem', async () => {
    const png = imagem();
    const medida = await proximidadeDaBorda(png, await segmentar(png, config));
    expect(medida.esquerda).toBeGreaterThan(0.9);
    expect(medida.direita).toBeGreaterThan(0.9);
  });

  it('fecha com nota 9, devolve abaixo disso e chama a pessoa depois da terceira', () => {
    const rodada = (numero, nota) => validarRodada({ numero, regioes: {}, veredito: { nota, defeitos: nota < 9 ? [{ parte: 'a' }] : [] } });
    expect(proximaAcao([]).acao).toBe('desenhar');
    expect(proximaAcao([rodada(1, 7)]).acao).toBe('desenhar');
    expect(proximaAcao([rodada(1, 7), rodada(2, 9)]).acao).toBe('fechou');
    expect(proximaAcao([rodada(1, 7), rodada(2, 8), rodada(3, 8)]).acao).toBe('humano');
    expect(() => validarRodada({ numero: 1, regioes: {}, veredito: { nota: 6, defeitos: [] } })).toThrow(/sem defeito/);
  });

  it('o aceite humano fecha a série com os defeitos e as pendências que ficaram', () => {
    const rodada = validarRodada({ numero: 1, regioes: {}, veredito: { nota: 7, defeitos: [{ parte: 'a' }] } });
    const d = proximaAcao([rodada], { por: 'pessoa', defeitos: [{ parte: 'a' }], pendencias: 'borda' });
    expect(d).toMatchObject({ acao: 'fechou', aceite: true, pendencias: 'borda', defeitos: [{ parte: 'a' }] });
    expect(d.motivo).toMatch(/aceite humano/);
  });
});

describe('folhas das divisas e roteiro', () => {
  it('poucas divisas vão uma por etapa, muitas se agrupam até seis por folha', async () => {
    const { recortesPorFolha } = await import('../src/index.js');
    expect([1, 5, 6, 7, 12, 19, 36, 50].map(recortesPorFolha)).toEqual([1, 1, 1, 2, 2, 4, 6, 6]);
  });

  it('o número de folhas acompanha o número de divisas, sem reduzir o recorte', async () => {
    const { folhasDasDivisas, roteiroDoCritico } = await import('../src/index.js');
    const png = imagem();
    const seg = await segmentar(png, config);
    const pintada = await sobreposicao(png, seg, { rotular: false });
    const recortes = recortesDasDivisas(png, pintada, seg);
    const repetidos = Array.from({ length: 7 }, () => recortes[0]);
    const folhas = await folhasDasDivisas(repetidos, pintada, { porFolha: 6 });
    expect(folhas.map((f) => f.pares.length)).toEqual([6, 1]);
    const largura = PNG.sync.read(recortes[0].png).width;
    expect(PNG.sync.read(folhas[0].png).width).toBeGreaterThanOrEqual(largura);
    const roteiro = roteiroDoCritico({ alvo: 'a.png', mapaDePartes: 's.png', folhas: folhas.map((f, i) => ({ arquivo: `f${i}.png`, pares: f.pares })) });
    expect(roteiro).toMatch(/Etapa 1 — visão geral/);
    expect(roteiro).toMatch(/Etapa 3 — divisas, folha 2 de 2/);
    expect(roteiro).toMatch(/Etapa 4 — fechamento/);
  });
});

describe('realce da divisa', () => {
  it('com realce, a costura fraca entre duas partes do mesmo cinza continua achada', async () => {
    const png = new PNG({ width: 120, height: 60 });
    for (let y = 0; y < 60; y += 1) for (let x = 0; x < 120; x += 1) {
      const o = (y * 120 + x) * 4;
      const dentro = x >= 10 && x < 110 && y >= 15 && y < 45;
      const v = !dentro ? 250 : (x === 60 ? 144 : 150);
      png.data[o] = v; png.data[o + 1] = v; png.data[o + 2] = v; png.data[o + 3] = 255;
    }
    const seg = await segmentar(PNG.sync.write(png), { ...config, realce: true });
    const xs = seg.regioes.esquerda.contornoPx.map(([x]) => x);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(57);
    expect(Math.max(...xs)).toBeLessThanOrEqual(62);
  });
});
