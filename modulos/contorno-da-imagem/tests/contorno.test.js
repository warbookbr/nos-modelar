/* contorno.test.js — cada peça do módulo vista num caso construído de
   propósito: duas partes do mesmo cinza separadas pela semente, a pintura com a
   opacidade pedida, a divisa entre vizinhas achada, a medida de borda e o
   limite das rodadas. */
import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { segmentar, sobreposicao, svgDoMapa, etiquetasFora, segmentosSeCruzam, divisas, recortesDasDivisas, proximidadeDaBorda, proximaAcao, validarRodada, MINIMO_DO_PEDACO_PX2, MAXIMO_DO_BURACO_PX2, fecharBuracos, silhuetaEmPedacos, contornoDaSilhueta } from '../src/index.js';

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
  it('pinta partes vizinhas em matizes distantes, mesmo quando os nomes caem em índices de tom parecido', async () => {
    const { matizesPorVizinhanca } = await import('../src/index.js');
    /* Faixa de quatro partes lado a lado, 2-3-4-5, e uma sexta isolada. Na
       ordem dada, os rótulos 2 e 3 recebiam pelo ângulo de ouro os índices 0 e
       5, que ficam a 47° um do outro. */
    const largura = 10;
    const rotulos = Int32Array.from({ length: 30 }, (_, p) => { const x = p % largura; return x < 2 ? 2 : x < 4 ? 3 : x < 6 ? 4 : x < 8 ? 5 : 6; });
    const ordem = [2, 6, 7, 8, 9, 3, 4, 5];
    const matiz = matizesPorVizinhanca(rotulos, largura, ordem);
    const d = (a, b) => { const x = Math.abs(matiz.get(a) - matiz.get(b)) % 360; return Math.min(x, 360 - x); };
    for (const [a, b] of [[2, 3], [3, 4], [4, 5], [5, 6]]) expect(d(a, b)).toBeGreaterThanOrEqual(90);
    expect(matizesPorVizinhanca(rotulos, largura, ordem)).toEqual(matiz);
  });

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

  it('guarda todos os pedaços de uma parte, o maior primeiro, e descarta só o que é ruído', async () => {
    /* Como a hélice do avião: a parte aparece dos dois lados da vizinha. Abaixo da faixa, duas ilhas da mesma parte, uma de
       5 x 5 px (área de contorno 16, a menor que o avião tem) e outra de 3 x 3 (área 4, ruído do watershed). */
    const png = new PNG({ width: 120, height: 60 });
    for (let y = 0; y < 60; y += 1) for (let x = 0; x < 120; x += 1) {
      const o = (y * 120 + x) * 4;
      const faixa = x >= 10 && x < 110 && y >= 15 && y < 45;
      const ilha = (x >= 38 && x < 43 && y >= 50 && y < 55) || (x >= 19 && x < 22 && y >= 51 && y < 54);
      const v = !(faixa || ilha) ? 250 : (faixa && (x === 40 || x === 80) ? 110 : 150);
      png.data[o] = v; png.data[o + 1] = v; png.data[o + 2] = v; png.data[o + 3] = 255;
    }
    const seg = await segmentar(PNG.sync.write(png), { limiar: 225, regioes: { lados: [[[20, 25], [20, 35]], [[100, 25], [100, 35]], [40, 52], [20, 52]], meio: [60, 30] } });
    const { pedacos, areaPx, contornoPx } = seg.regioes.lados;
    expect(pedacos).toHaveLength(3);
    expect(pedacos.map((p) => p.areaPx)).toEqual([...pedacos.map((p) => p.areaPx)].sort((a, b) => b - a));
    expect(pedacos[2].areaPx).toBe(16);
    expect(MINIMO_DO_PEDACO_PX2).toBeGreaterThan(4);
    expect(MINIMO_DO_PEDACO_PX2).toBeLessThanOrEqual(16);
    /* O campo de sempre continua sendo o do maior pedaço, e uma parte inteira num pedaço só tem um. */
    expect(areaPx).toBe(pedacos[0].areaPx);
    expect(contornoPx).toEqual(pedacos[0].contornoPx);
    const xs = (p) => p.contornoPx.map(([x]) => x);
    expect(pedacos.slice(0, 2).map((p) => [Math.min(...xs(p)) < 40, Math.max(...xs(p)) > 80]).sort()).toEqual([[false, true], [true, false]]);
    expect(seg.regioes.meio.pedacos).toHaveLength(1);
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

/* Imagem em tons de cinza a partir de uma função (x, y) -> cinza. */
function imagemDe(largura, altura, cinza) {
  const png = new PNG({ width: largura, height: altura });
  for (let y = 0; y < altura; y += 1) for (let x = 0; x < largura; x += 1) {
    const o = (y * largura + x) * 4; const v = cinza(x, y);
    png.data[o] = v; png.data[o + 1] = v; png.data[o + 2] = v; png.data[o + 3] = 255;
  }
  return PNG.sync.write(png);
}

describe('buraco de reflexo cercado pela silhueta', () => {
  /* Como a lateral do avião: logo abaixo da linha escura do topo da fuselagem, um
     fio de reflexo de 19 x 2 px, de cinza 240 (mais claro que o fundo, 232 no
     avião; aqui 250), cercado pelo corpo. À direita, uma janela vazada de 14 x 14
     px, que é vão de verdade. */
  const reflexo = (x, y) => x >= 20 && x < 39 && y >= 20 && y < 22;
  const janela = (x, y) => x >= 75 && x < 89 && y >= 25 && y < 39;
  const png = imagemDe(120, 60, (x, y) => {
    if (reflexo(x, y)) return 240;
    if (janela(x, y)) return 250;
    const dentro = x >= 10 && x < 110 && y >= 15 && y < 45;
    return !dentro ? 250 : (x === 60 ? 110 : 150);
  });
  const config = { limiar: 225, regioes: { esquerda: [30, 30], direita: [95, 30] } };
  const pixels = (f) => { const l = []; for (let y = 0; y < 60; y += 1) for (let x = 0; x < 120; x += 1) if (f(x, y)) l.push(y * 120 + x); return l; };

  it('sem fechar, o reflexo fica fora da silhueta, como o atrito do avião (o defeito reproduzido)', async () => {
    const seg = await segmentar(png, { ...config, buracoMaximo: 0 });
    expect(pixels(reflexo).every((p) => seg.silhueta[p] === 0)).toBe(true);
    expect(seg.buracosFechados).toEqual({ buracos: 0, pixels: 0 });
  });

  it('fecha o reflexo, dá dono a cada pixel dele e deixa a janela vazada como fundo', async () => {
    const seg = await segmentar(png, config);
    expect(pixels(reflexo)).toHaveLength(38);
    expect(pixels(reflexo).every((p) => seg.silhueta[p] === 255)).toBe(true);
    expect(pixels(reflexo).every((p) => seg.rotulos[p] === seg.regioes.esquerda.rotulo)).toBe(true);
    expect(pixels(janela).every((p) => seg.silhueta[p] === 0)).toBe(true);
    expect(seg.buracosFechados).toEqual({ buracos: 1, pixels: 38 });
    /* O que sobra sem dono são os cantos do corpo, que o fechamento não toca. */
    expect(seg.semDono).toBe((await segmentar(png, { ...config, buracoMaximo: 0 })).semDono);
    /* A janela continua furo: a pintura não a cobre. */
    const pintada = PNG.sync.read(await sobreposicao(png, seg, { opacidade: 0.5, rotular: false }));
    const [o, j] = [(20 * 120 + 30) * 4, (30 * 120 + 80) * 4];
    expect(pintada.data[o]).not.toBe(240);
    expect(pintada.data[j]).toBe(250);
  });

  it('o pixel claro ligado ao fundo só pela diagonal fica fechado e com dono, e não na divisa do watershed', async () => {
    /* O reflexo no corte do corpo: (31, 15) é fundo, e (30, 16) só o toca pela
       diagonal; o watershed o deixava na divisa (-1), sem cor na pintura. */
    const claros = [[31, 15], [30, 16], [49, 16], [48, 17]];
    const diagonal = imagemDe(120, 60, (x, y) => {
      if (claros.some(([a, b]) => a === x && b === y)) return 250;
      const dentro = x >= 10 && x < 110 && y >= 15 && y < 45;
      return !dentro ? 250 : (x === 60 ? 110 : 150);
    });
    const seg = await segmentar(diagonal, config);
    expect(seg.buracosFechados.buracos).toBe(3);
    for (const [x, y] of [[30, 16], [49, 16], [48, 17]]) {
      expect(seg.silhueta[y * 120 + x]).toBe(255);
      expect(seg.rotulos[y * 120 + x]).toBe(seg.regioes.esquerda.rotulo);
    }
    expect(seg.silhueta[15 * 120 + 31]).toBe(0);
  });

  it('o tamanho máximo é de 64 px²: 8 x 8 fecha, 65 não, e o furo que toca a borda nunca fecha', () => {
    expect(MAXIMO_DO_BURACO_PX2).toBe(64);
    const mascara = (furo) => { const m = new Uint8Array(30 * 30).fill(255); for (const [x, y] of furo) m[y * 30 + x] = 0; return m; };
    const retangulo = (x0, y0, l, a) => Array.from({ length: l * a }, (_, k) => [x0 + (k % l), y0 + Math.floor(k / l)]);
    const oito = mascara(retangulo(5, 5, 8, 8));
    expect(fecharBuracos(oito, 30, 30)).toMatchObject({ buracos: 1, pixels: 64 });
    expect(oito.every((v) => v === 255)).toBe(true);
    const longo = mascara(retangulo(5, 5, 13, 5));
    expect(fecharBuracos(longo, 30, 30)).toMatchObject({ buracos: 0, pixels: 0 });
    const naBorda = mascara(retangulo(0, 10, 3, 3));
    expect(fecharBuracos(naBorda, 30, 30)).toMatchObject({ buracos: 0 });
    /* Um buraco ligado ao fundo só pela diagonal não é fundo: a silhueta se liga em 8 vizinhos, e o furo também fecha. */
    const diagonal = mascara([[10, 10], [11, 11]]);
    expect(fecharBuracos(diagonal, 30, 30)).toMatchObject({ buracos: 2 });
  });
});

describe('silhueta em pedaços', () => {
  /* Como a frontal do avião: uma asa de ponta a ponta com uma parte fora do
     modelo no meio, mais alta que ela (o corpo escuro). Tirada a parte, a asa fica
     em dois pedaços, e um pontinho solto de 3 x 3 px é ruído. */
  const png = imagemDe(170, 60, (x, y) => {
    const asa = x >= 10 && x < 141 && y >= 20 && y < 40;
    const corpo = x >= 70 && x < 90 && y >= 12 && y < 48;
    const ponto = x >= 155 && x < 158 && y >= 30 && y < 33;
    if (!(asa || corpo || ponto)) return 250;
    return corpo ? 90 : (x === 69 || x === 90 ? 110 : 150);
  });
  const config = { limiar: 225, regioes: { asa: [[[20, 30], [60, 30]], [[100, 30], [135, 30]]], corpo: [80, 30] } };

  it('com a parte fora do modelo tirada, guarda os dois pedaços da asa, o maior primeiro, e descarta o ponto', async () => {
    const seg = await segmentar(png, config);
    const { pedacos, linhasDeFora } = await silhuetaEmPedacos(seg, { sem: ['corpo'] });
    expect(pedacos).toHaveLength(2);
    expect(pedacos[0].areaPx).toBeGreaterThan(pedacos[1].areaPx);
    expect(pedacos[1].areaPx).toBeGreaterThanOrEqual(MINIMO_DO_PEDACO_PX2);
    const xs = (p) => p.contornoPx.map(([x]) => x);
    expect(Math.min(...xs(pedacos[0]))).toBeLessThan(15);
    expect(Math.max(...xs(pedacos[0]))).toBeLessThan(70);
    expect(Math.min(...xs(pedacos[1]))).toBeGreaterThan(88);
    expect(Math.max(...xs(pedacos[1]))).toBeGreaterThanOrEqual(139);
    /* A linha de fora vem por pedaço, e o ponto não ganha linha. */
    expect(linhasDeFora).toHaveLength(2);
  });

  it('só o maior pedaço perdia a ponta: o contorno de um anel só (como antes) vai até onde o maior vai', async () => {
    const seg = await segmentar(png, config);
    const anel = await contornoDaSilhueta(seg, { sem: ['corpo'] });
    const { pedacos } = await silhuetaEmPedacos(seg, { sem: ['corpo'] });
    expect(anel).toEqual(pedacos[0].contornoPx);
    expect(Math.max(...anel.map(([x]) => x))).toBeLessThan(70);
  });

  it('sem parte fora do modelo a silhueta é um pedaço só, com o ponto solto também descartado', async () => {
    const seg = await segmentar(png, config);
    const { pedacos, linhasDeFora } = await silhuetaEmPedacos(seg);
    expect(pedacos).toHaveLength(1);
    expect(linhasDeFora).toHaveLength(1);
  });

  it('o maior pedaço fica mesmo abaixo do mínimo, para a silhueta não sumir', async () => {
    const pequena = imagemDe(40, 30, (x, y) => (x >= 15 && x < 18 && y >= 10 && y < 13 ? 100 : 250));
    const seg = await segmentar(pequena, { limiar: 225, regioes: { a: [16, 11] } });
    const { pedacos } = await silhuetaEmPedacos(seg);
    expect(pedacos).toHaveLength(1);
    expect(pedacos[0].areaPx).toBeLessThan(MINIMO_DO_PEDACO_PX2);
  });
});
