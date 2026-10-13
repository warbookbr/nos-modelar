/* contorno.test.js — cada peça do módulo vista num caso construído de
   propósito: duas partes do mesmo cinza separadas pela semente, a pintura com a
   opacidade pedida, a divisa entre vizinhas achada, a medida de borda e o
   limite das rodadas. */
import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { segmentar, sobreposicao, suavizarMascara, anexarSemDono, MAXIMO_DO_DENTE_PX2, ALCANCE_DO_SEM_DONO_PX, svgDoMapa, etiquetasFora, segmentosSeCruzam, divisas, recortesDasDivisas, proximidadeDaBorda, proximaAcao, validarRodada, MINIMO_DO_PEDACO_PX2, MAXIMO_DO_BURACO_PX2, fecharBuracos, silhuetaEmPedacos, contornoDaSilhueta } from '../src/index.js';

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
    /* A ilha de 5 x 5 px tem 25 px² de área de borda subpixel (16 no contorno de pixel de borda), com os cantos
       um pouco cortados pelo meio-tom; a de 3 x 3 px fica abaixo do mínimo e sai. */
    expect(pedacos[2].areaPx).toBeGreaterThan(18);
    expect(pedacos[2].areaPx).toBeLessThanOrEqual(25);
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
    /* Sem a suavização da borda, que preenche como reentrância o pixel (31, 15)
       aberto para o fundo: aqui só vale o fechamento de buracos. */
    const seg = await segmentar(diagonal, { ...config, denteMaximo: 0 });
    expect(seg.buracosFechados.buracos).toBe(3);
    for (const [x, y] of [[30, 16], [49, 16], [48, 17]]) {
      expect(seg.silhueta[y * 120 + x]).toBe(255);
      expect(seg.rotulos[y * 120 + x]).toBe(seg.regioes.esquerda.rotulo);
    }
    expect(seg.silhueta[15 * 120 + 31]).toBe(0);
    /* Com a suavização, o fechamento dos buracos conta igual e o pixel aberto
       para o fundo, uma reentrância de 1 px na borda, também entra. */
    const lisa = await segmentar(diagonal, config);
    expect(lisa.buracosFechados.buracos).toBe(3);
    expect(lisa.silhueta[15 * 120 + 31]).toBe(255);
    expect(lisa.rotulos[15 * 120 + 31]).toBe(lisa.regioes.esquerda.rotulo);
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

describe('borda lisa da silhueta', () => {
  /* Como a borda de ataque das asas do avião no topo: a borda reta do corpo com
     um espigão de 1 x 3 px para fora, uma reentrância de 1 px para dentro, e um
     dente de 2 x 2 px, que o limiar da borda de pouco contraste deixa de forma
     intermitente. Mais um fio escuro de 2 px de altura por 40 de comprimento (o
     chão da frontal e da lateral), que é forma da imagem e não dente. */
  const espigao = (x, y) => x === 40 && y >= 12 && y < 15;
  const reentrancia = (x, y) => x === 70 && y === 44;
  const dente = (x, y) => x >= 90 && x < 92 && y >= 13 && y < 15;
  const fio = (x, y) => x >= 30 && x < 70 && y >= 52 && y < 54;
  const png = imagemDe(120, 60, (x, y) => {
    const corpo = x >= 10 && x < 110 && y >= 15 && y < 45 && !reentrancia(x, y);
    if (!(corpo || espigao(x, y) || dente(x, y) || fio(x, y))) return 250;
    return x === 60 ? 110 : 150;
  });
  const config = { limiar: 225, regioes: { esquerda: [30, 30], direita: [90, 30], chao: [[31, 52], [60, 52]] }, foraDoModelo: ['chao'] };
  const aceso = (seg, [x, y]) => seg.silhueta[y * 120 + x] === 255;

  it('o defeito reproduzido: sem a suavização, o espigão, o dente e a reentrância ficam na silhueta', async () => {
    const seg = await segmentar(png, { ...config, denteMaximo: 0 });
    expect(aceso(seg, [40, 12])).toBe(true);
    expect(aceso(seg, [90, 13])).toBe(true);
    expect(aceso(seg, [70, 44])).toBe(false);
    expect(seg.mascaraSuavizada).toEqual({ tirados: 0, postos: 0 });
  });

  it('tira o espigão e o dente, enche a reentrância, e o corpo fica com o mesmo retângulo, cantos inclusive', async () => {
    const seg = await segmentar(png, config);
    for (const p of [[40, 12], [40, 13], [40, 14], [90, 13], [91, 14]]) expect(aceso(seg, p)).toBe(false);
    expect(aceso(seg, [70, 44])).toBe(true);
    for (const [x, y] of [[10, 15], [109, 15], [10, 44], [109, 44]]) expect(aceso(seg, [x, y])).toBe(true);
    /* O corpo é exatamente o retângulo: a extensão não se mexe nem 1 px. A linha
       subpixel passa pela borda do pixel, meio pixel para fora do centro do
       pixel de borda, e o espigão e o dente não a empurram para fora. */
    const { pedacos } = await silhuetaEmPedacos(seg, { sem: ['chao'] });
    expect(pedacos).toHaveLength(1);
    const xs = pedacos[0].contornoPx.map(([x]) => x); const ys = pedacos[0].contornoPx.map(([, y]) => y);
    [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)].forEach((v, i) => expect(v).toBeCloseTo([9.5, 109.5, 14.5, 44.5][i], 1));
    expect(seg.mascaraSuavizada.tirados).toBe(3 + 4);
    expect(seg.mascaraSuavizada.postos).toBe(1);
  });

  it('com bordaSubpixel: false o corpo é o retângulo de pixel de borda, de 10 a 109 e de 15 a 44', async () => {
    const seg = await segmentar(png, { ...config, bordaSubpixel: false });
    const { pedacos } = await silhuetaEmPedacos(seg, { sem: ['chao'] });
    const xs = pedacos[0].contornoPx.map(([x]) => x); const ys = pedacos[0].contornoPx.map(([, y]) => y);
    expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]).toEqual([10, 109, 15, 44]);
  });

  it('o fio de 2 px é forma da imagem: fica inteiro, com a semente dentro', async () => {
    const seg = await segmentar(png, config);
    for (let x = 30; x < 70; x += 1) for (const y of [52, 53]) expect(aceso(seg, [x, y])).toBe(true);
  });

  it('a semente protege o pixel dela: numa ponta de 3 x 2 px o dente não leva o ponto da semente', async () => {
    const ponta = imagemDe(60, 40, (x, y) => ((x >= 10 && x < 40 && y >= 10 && y < 30) || (x >= 40 && x < 43 && y >= 19 && y < 21) ? 150 : 250));
    const seg = await segmentar(ponta, { limiar: 225, regioes: { a: [20, 20], ponta: [[41, 19], [42, 20]] } });
    expect(seg.silhueta[19 * 60 + 41]).toBe(255);
    expect(seg.silhueta[20 * 60 + 42]).toBe(255);
  });

  it('suavizarMascara, direto: o que é de até o máximo sai, o maior volta, e o protegido não sai', () => {
    expect(MAXIMO_DO_DENTE_PX2).toBe(9);
    const m = (rotulo) => { const v = new Uint8Array(30 * 20); for (let y = 5; y < 15; y += 1) for (let x = 5; x < 25; x += 1) v[y * 30 + x] = 255; rotulo(v); return v; };
    const cru = m((v) => { v[3 * 30 + 10] = 255; v[4 * 30 + 10] = 255; });
    const a = Uint8Array.from(cru);
    expect(suavizarMascara(a, 30, 20)).toEqual({ tirados: 2, postos: 0 });
    expect(a[3 * 30 + 10]).toBe(0);
    const comprido = m((v) => { for (let x = 6; x < 20; x += 1) v[3 * 30 + x] = 255; });
    const b = Uint8Array.from(comprido);
    expect(suavizarMascara(b, 30, 20).tirados).toBe(0);
    expect(b).toEqual(comprido);
    const c = Uint8Array.from(cru);
    expect(suavizarMascara(c, 30, 20, MAXIMO_DO_DENTE_PX2, [3 * 30 + 10, 4 * 30 + 10]).tirados).toBe(0);
    expect(c).toEqual(cru);
    const d = Uint8Array.from(cru);
    suavizarMascara(d, 30, 20);
    expect(suavizarMascara(Uint8Array.from(d), 30, 20)).toEqual({ tirados: 0, postos: 0 });
  });
});

describe('pixel sem dono vizinho de uma parte', () => {
  /* Como a borda do avião: o corpo cinza com a linha escura do contorno (60), de
     1 px, e por fora dela o halo claro (215, que o limiar de 225 ainda pega) de
     2 px. O watershed põe a divisa na linha escura e dá o halo ao fundo: as partes
     paravam na linha, 3 px aquém da silhueta. */
  const corpo = (x, y) => x >= 15 && x < 105 && y >= 18 && y < 42;
  const contorno = (x, y) => x >= 14 && x < 106 && y >= 17 && y < 43 && !corpo(x, y);
  const halo = (x, y) => x >= 12 && x < 108 && y >= 15 && y < 45 && !corpo(x, y) && !contorno(x, y);
  const png = imagemDe(120, 60, (x, y) => (contorno(x, y) ? 60 : halo(x, y) ? 215 : corpo(x, y) ? (x === 60 ? 110 : 150) : 250));
  const config = { limiar: 225, regioes: { esquerda: [35, 30], direita: [85, 30] } };
  const largura = 120;
  const extensao = (seg, nome) => { const xs = seg.regioes[nome].contornoPx.map(([x]) => x); const ys = seg.regioes[nome].contornoPx.map(([, y]) => y); return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]; };

  it('o defeito reproduzido: sem passar o sem dono, as partes param na linha escura e o halo fica sem dono', async () => {
    const seg = await segmentar(png, { ...config, alcanceSemDono: 0 });
    expect(seg.semDono).toBeGreaterThan(300);
    expect(extensao(seg, 'esquerda')[0]).toBeGreaterThanOrEqual(14);
    expect(seg.semDonoAnexados).toBe(0);
    /* Com o contorno de pixel de borda o corpo para em 15, o pixel de dentro da linha escura. */
    const mascara = await segmentar(png, { ...config, alcanceSemDono: 0, bordaSubpixel: false });
    expect(extensao(mascara, 'esquerda')[0]).toBe(15);
  });

  it('cada pixel sem dono vizinho de uma parte passa a ela, e as partes chegam à borda da silhueta', async () => {
    const seg = await segmentar(png, config);
    expect(seg.semDono).toBe(0);
    expect(seg.semDonoAnexados).toBeGreaterThan(300);
    const sil = []; for (let y = 0; y < 60; y += 1) for (let x = 0; x < largura; x += 1) if (seg.silhueta[y * largura + x]) sil.push([x, y]);
    const silhueta = [Math.min(...sil.map(([x]) => x)), Math.max(...sil.map(([x]) => x)), Math.min(...sil.map(([, y]) => y)), Math.max(...sil.map(([, y]) => y))];
    expect(silhueta).toEqual([12, 107, 15, 44]);
    /* Com a linha subpixel as partes chegam ao meio-tom da linha escura, que está
       dentro da máscara, entre o halo de 215 e o corpo: a máscara vai a 12 e o meio-tom
       a 13,4 (o halo de 2 px tem tom de meio-fundo, não de desenho). */
    const e = extensao(seg, 'esquerda'); const d = extensao(seg, 'direita');
    [e[0], e[2], e[3]].forEach((v, i) => expect(v).toBeCloseTo([13.4, 16.4, 42.6][i], 1));
    [d[1], d[2], d[3]].forEach((v, i) => expect(v).toBeCloseTo([105.6, 16.4, 42.6][i], 1));
    for (const v of [e[0], d[1]]) expect(v).toBeGreaterThanOrEqual(silhueta[0] - 0.5);
    /* Com o contorno de pixel de borda a parte vai até a borda da máscara. */
    const mascara = await segmentar(png, { ...config, bordaSubpixel: false });
    const em = extensao(mascara, 'esquerda'); const dm = extensao(mascara, 'direita');
    expect([em[0], em[2], em[3]]).toEqual([silhueta[0], silhueta[2], silhueta[3]]);
    expect([dm[1], dm[2], dm[3]]).toEqual([silhueta[1], silhueta[2], silhueta[3]]);
    /* Nenhum pixel fica no rótulo do fundo dentro da silhueta. */
    for (const [x, y] of sil) expect(seg.rotulos[y * largura + x]).not.toBe(1);
  });

  it('a divisa entre as duas partes continua uma linha, sem ser dada a nenhuma', async () => {
    const seg = await segmentar(png, config);
    const divisa = []; for (let y = 20; y < 40; y += 1) divisa.push(seg.rotulos[y * largura + 60]);
    expect(divisa.every((r) => r === -1)).toBe(true);
    expect(divisas(seg).map(({ a, b }) => [a, b].sort().join('-'))).toEqual(['direita-esquerda']);
  });

  it('o corte de uma parte fora do modelo continua cortando: a onda do sem dono não atravessa a divisa dela', async () => {
    /* A asa de ponta a ponta com o corpo no meio, mais alto que ela, tudo com
       linha escura e halo: tirada a parte, a asa fica em dois pedaços, e o halo
       de cima e de baixo de cada metade não passa por cima do corpo. */
    const asa = (x, y) => x >= 20 && x < 150 && y >= 25 && y < 45;
    const centro = (x, y) => x >= 70 && x < 100 && y >= 15 && y < 55;
    const dentro = (x, y) => asa(x, y) || centro(x, y);
    const linha = (x, y) => !dentro(x, y) && (dentro(x - 1, y) || dentro(x + 1, y) || dentro(x, y - 1) || dentro(x, y + 1));
    const aureola = (x, y) => !dentro(x, y) && !linha(x, y) && [-2, -1, 0, 1, 2].some((d) => [-2, -1, 0, 1, 2].some((e) => linha(x + d, y + e)));
    const img = imagemDe(170, 70, (x, y) => (linha(x, y) ? 60 : aureola(x, y) ? 215 : centro(x, y) ? 90 : asa(x, y) ? 150 : 250));
    const cfg = { limiar: 225, regioes: { asa: [[[40, 35], [60, 35]], [[110, 35], [140, 35]]], corpo: [85, 35] }, foraDoModelo: ['corpo'] };
    const seg = await segmentar(img, cfg);
    const { pedacos, linhasDeFora } = await silhuetaEmPedacos(seg, { sem: ['corpo'] });
    expect(pedacos).toHaveLength(2);
    expect(linhasDeFora).toHaveLength(2);
    const asaRotulo = seg.regioes.asa.rotulo;
    for (let y = 0; y < 70; y += 1) for (let x = 72; x < 98; x += 1) expect(seg.rotulos[y * 170 + x]).not.toBe(asaRotulo);
    /* Os dois pedaços ficam um de cada lado do corpo (x de 70 a 99), sem ponte por cima dele. */
    for (const { contornoPx } of pedacos) expect(contornoPx.some(([x]) => x >= 72 && x <= 97)).toBe(false);
    const lados = pedacos.map(({ contornoPx }) => Math.max(...contornoPx.map(([x]) => x)) < 72).sort();
    expect(lados).toEqual([false, true]);
  });

  it('não inventa parte onde não há semente: um bloco escuro longe de qualquer parte continua sem dono', async () => {
    const solto = imagemDe(160, 60, (x, y) => {
      if (x >= 120 && x < 150 && y >= 15 && y < 45) return 150;
      return corpo(x, y) ? (x === 60 ? 110 : 150) : 250;
    });
    const seg = await segmentar(solto, config);
    expect(seg.semDono).toBe(30 * 30);
    for (let y = 15; y < 45; y += 1) for (let x = 120; x < 150; x += 1) expect(seg.rotulos[y * 160 + x]).toBe(1);
  });

  it('anexarSemDono, direto: a onda anda de camada em camada, pára no alcance, e a divisa entre partes não é cruzada', () => {
    expect(ALCANCE_DO_SEM_DONO_PX).toBe(4);
    /* Uma linha: parte 2, divisa de contorno (-1), cinco pixels de halo (1). */
    const rotulos = Int32Array.from([2, 2, -1, 1, 1, 1, 1, 1]);
    const silhueta = new Uint8Array(8).fill(255);
    expect(anexarSemDono(rotulos, silhueta, 8, 1, 3)).toBe(3);
    expect([...rotulos]).toEqual([2, 2, 2, 2, 2, 1, 1, 1]);
    /* Duas partes separadas por uma divisa de dentro (-1 entre 2 e 3, sem fundo ao lado): não muda. */
    const duas = Int32Array.from([2, 2, -1, 3, 3]);
    expect(anexarSemDono(duas, new Uint8Array(5).fill(255), 5, 1)).toBe(0);
    expect([...duas]).toEqual([2, 2, -1, 3, 3]);
    /* Fora da silhueta não há dono a dar. */
    const fora = Int32Array.from([2, -1, 1, 1]);
    expect(anexarSemDono(fora, Uint8Array.from([255, 255, 0, 0]), 4, 1)).toBe(1);
    expect([...fora]).toEqual([2, 2, 1, 1]);
    /* O pixel que duas partes disputam fica com a de mais votos, e no empate com a de menor rótulo. */
    const disputa = Int32Array.from([3, 1, 2]);
    anexarSemDono(disputa, new Uint8Array(3).fill(255), 3, 1);
    expect([...disputa]).toEqual([3, 2, 2]);
  });
});
