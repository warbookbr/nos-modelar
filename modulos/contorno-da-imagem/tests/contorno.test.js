/* contorno.test.js — cada peça do módulo vista num caso construído de
   propósito: duas partes do mesmo cinza separadas pela semente, a pintura com a
   opacidade pedida, a divisa entre vizinhas achada, a medida de borda e o
   limite das rodadas. */
import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { segmentar, sobreposicao, divisas, recortesDasDivisas, proximidadeDaBorda, proximaAcao, validarRodada } from '../src/index.js';

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
    const roteiro = roteiroDoCritico({ alvo: 'a.png', sobreposicao: 's.png', folhas: folhas.map((f, i) => ({ arquivo: `f${i}.png`, pares: f.pares })) });
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
