#!/usr/bin/env node
/* referencia-de-silhueta.mjs — do contorno de uma imagem ao arquivo de trechos que `silhueta:desvio` lê, em milímetro e nos eixos do modelo.
 *
 * FICHA referenciaDeSilhueta
 * serve: levar o contorno que o módulo de contorno da imagem tira de uma foto ao arquivo de trechos (`escala: "mm"`, `alinhamento`, `trechos`)
 *   que `npm run silhueta:desvio` mede, e desenhar a sobreposição do contorno sobre a foto para a pessoa conferir (`npm run silhueta:referencia`).
 * quando: a referência da peça é uma foto ou uma imagem de contorno e não há prancha em milímetro; no lugar de levantar as coordenadas a olho.
 * unidades: entrada em pixel da imagem (x para a direita, y para baixo); escala em mm; saída em mm nos eixos do modelo.
 * campos:
 *   escala: dois pontos da imagem e a distância real entre eles, em mm (`x1,y1,x2,y2,mm`).
 *   alinhar: dois pontos da imagem e os dois pontos do modelo a que correspondem (`x1,y1,a1,b1,x2,y2,a2,b2`); dão a rotação e a posição, e
 *     são o `alinhamento` do arquivo.
 *   cortes: pontos da imagem, no contorno, que o dividem em trechos (`x,y;x,y;...`), com os nomes em `trechos`, um por corte.
 * exemplo:
 *   npm run silhueta:referencia -- --imagem=foto.png --regioes=regioes.json --escala=10,20,300,40,430 --alinhar=10,900,430,1.2,600,300,140,1.6 --cortes=10,900;300,500;600,300 --trechos=dorso,cabo,gume --saida=contorno.json
 * FIM DA FICHA
 *
 * COMO FAZ. O contorno vem do módulo (`--contorno=<contornos.json>` já tirado, ou `--imagem` com `--regioes`, que o tira na hora; as âncoras do arquivo
 * de regiões não entram, a escala é a de `--escala`). A escala dá os mm por pixel; a imagem é girada e posta de modo que os dois pontos de
 * `--alinhar` caiam sobre os do modelo (a escala medida e a distância entre os pontos do modelo devem concordar, e a diferença se reparte entre os dois
 * pontos; acima de `--residuo-max` o comando recusa). Uma foto vista do lado oposto ao do modelo precisa de `--espelhar`. Cada corte vai ao vértice mais
 * próximo do contorno; o contorno é percorrido do primeiro corte ao segundo, e o trecho k vai do corte k ao corte k+1 (o último fecha no primeiro).
 * O arquivo nasce com `conferidoPelaPessoa: null`; a pessoa olha a sobreposição e o comando é repetido com `--conferido="<quem, data>"`. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { carregarOpenCV } from '../../modulos/contorno-da-imagem/src/index.js';
import { lerArgumentos } from './argumentos.mjs';

export const FORMATO = 'mecanifica.referencia-de-silhueta@1';
export class ErroDeSilhueta extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroDeSilhueta'; }
}

const arred = (v, n = 2) => Math.round(v * 10 ** n) / 10 ** n || 0;
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Lê `a,b,c` em números; recusa o que não tem exatamente `n`. */
export function numeros(texto, n, nome, formato) {
  const partes = String(texto ?? '').split(',').map((t) => t.trim());
  const v = partes.map(Number);
  if (partes.length !== n || partes.some((t) => t === '') || !v.every(ehNum)) {
    throw new ErroDeSilhueta(`${nome} recebeu ${JSON.stringify(texto ?? null)}. Esperado: ${n} números separados por vírgula, ${formato}. Conserte a opção.`);
  }
  return v;
}

/** A escala: dois pontos da imagem e a distância real entre eles. */
export function lerEscala(texto) {
  if (texto === null || texto === undefined || texto === '') {
    throw new ErroDeSilhueta('falta --escala (recebi nada). Esperado: --escala=x1,y1,x2,y2,mm, dois pontos da imagem em pixel e a medida real entre eles em mm (o comprimento total de um objeto de medida conhecida, por exemplo). Sem escala o contorno não vira milímetro.');
  }
  const [x1, y1, x2, y2, mm] = numeros(texto, 5, '--escala', 'x1,y1,x2,y2,mm');
  if (!(mm > 0)) throw new ErroDeSilhueta(`--escala traz ${mm} mm entre os dois pontos. Esperado: uma medida real positiva em mm.`);
  const px = Math.hypot(x2 - x1, y2 - y1);
  if (px < 20) throw new ErroDeSilhueta(`--escala traz dois pontos a ${px.toFixed(1)} px um do outro. Esperado: pontos distantes (pelo menos 20 px), para a escala não ser dominada pelo erro de um pixel.`);
  return { a: [x1, y1], b: [x2, y2], mm, px };
}

/** O alinhamento: dois pontos da imagem e os dois do modelo. */
export function lerAlinhar(texto) {
  if (texto === null || texto === undefined || texto === '') {
    throw new ErroDeSilhueta('faltam os dois pontos de alinhamento (recebi nada). Esperado: --alinhar=x1,y1,a1,b1,x2,y2,a2,b2, dois pontos da imagem e as coordenadas do modelo a que correspondem (a ponta e a base de um trecho, por exemplo). Sem eles a imagem não tem rotação nem posição nos eixos do modelo.');
  }
  const v = numeros(texto, 8, '--alinhar', 'x1,y1,a1,b1,x2,y2,a2,b2');
  const pontos = [{ px: [v[0], v[1]], modelo: [v[2], v[3]] }, { px: [v[4], v[5]], modelo: [v[6], v[7]] }];
  if (Math.hypot(v[4] - v[0], v[5] - v[1]) < 20 || Math.hypot(v[6] - v[2], v[7] - v[3]) < 1e-6) {
    throw new ErroDeSilhueta(`--alinhar traz dois pontos coincidentes (imagem ${JSON.stringify([v[0], v[1]])} e ${JSON.stringify([v[4], v[5]])}). Esperado: dois pontos distintos e distantes, que fixam a rotação.`);
  }
  return pontos;
}

export function lerCortes(texto) {
  const itens = String(texto ?? '').split(';').map((t) => t.trim()).filter(Boolean);
  if (itens.length < 2) throw new ErroDeSilhueta(`--cortes recebeu ${JSON.stringify(texto ?? null)}. Esperado: dois ou mais pontos da imagem sobre o contorno, "x,y;x,y;...", que dividem o contorno em trechos.`);
  return itens.map((t) => numeros(t, 2, '--cortes', 'x,y;x,y;...'));
}

/**
 * A transformação da imagem aos eixos do modelo: escala, giro e posição. Devolve `paraModelo([x, y])`, o giro em graus, o desacordo entre a escala
 * medida e os pontos do modelo e o erro em cada ponto de alinhamento (mm).
 */
export function transformacao({ escala, alinhamento, espelhar = false, residuoMax = 0.02 }) {
  const s = escala.mm / escala.px;
  const [p1, p2] = alinhamento;
  const bruto = ([x, y]) => [(espelhar ? -1 : 1) * (x - p1.px[0]) * s, -(y - p1.px[1]) * s];
  const r = bruto(p2.px);
  const t = [p2.modelo[0] - p1.modelo[0], p2.modelo[1] - p1.modelo[1]];
  const comprimentoR = Math.hypot(r[0], r[1]);
  const comprimentoT = Math.hypot(t[0], t[1]);
  const desacordo = (comprimentoT - comprimentoR) / comprimentoT;
  if (Math.abs(desacordo) > residuoMax) {
    throw new ErroDeSilhueta(`a escala medida e os pontos do modelo discordam: os dois pontos de --alinhar distam ${comprimentoR.toFixed(1)} mm na imagem (pela escala de ${s.toFixed(4)} mm/px) e ${comprimentoT.toFixed(1)} mm no modelo, ${(desacordo * 100).toFixed(1)}% de diferença; o limite é ${(residuoMax * 100).toFixed(1)}% (--residuo-max). Esperado: a mesma distância. Confira se os pontos da imagem estão certos, se --escala mede o que diz, ou se as coordenadas do modelo estão em mm.`);
  }
  const giro = Math.atan2(t[1], t[0]) - Math.atan2(r[1], r[0]);
  const [c, sn] = [Math.cos(giro), Math.sin(giro)];
  const meio = [r[0] / 2, r[1] / 2];
  const centro = [(p1.modelo[0] + p2.modelo[0]) / 2, (p1.modelo[1] + p2.modelo[1]) / 2];
  const paraModelo = (p) => {
    const b = bruto(p);
    const u = [b[0] - meio[0], b[1] - meio[1]];
    return [centro[0] + c * u[0] - sn * u[1], centro[1] + sn * u[0] + c * u[1]];
  };
  const paraImagem = ([a, b]) => {
    const u = [a - centro[0], b - centro[1]];
    const bx = c * u[0] + sn * u[1] + meio[0];
    const by = -sn * u[0] + c * u[1] + meio[1];
    return [p1.px[0] + ((espelhar ? -1 : 1) * bx) / s, p1.px[1] - by / s];
  };
  const erros = alinhamento.map((a) => { const m = paraModelo(a.px); return arred(Math.hypot(m[0] - a.modelo[0], m[1] - a.modelo[1])); });
  return { mmPorPx: s, giroGraus: (giro * 180) / Math.PI, espelhado: espelhar, desacordo, erroNosPontosMm: erros, paraModelo, paraImagem };
}

/** Divide o anel (lista de pontos, fechado implicitamente) nos cortes pedidos; cada corte vai ao vértice mais próximo. */
export function dividirAnel(anel, cortes, nomes, { distanciaMax = 15 } = {}) {
  const n = anel.length;
  if (n < 3) throw new ErroDeSilhueta(`o contorno tem ${n} ponto(s). Esperado: um anel de pelo menos 3 pontos; confira a região (--parte) e a imagem.`);
  if (nomes.length !== cortes.length) {
    throw new ErroDeSilhueta(`--trechos traz ${nomes.length} nome(s) e --cortes traz ${cortes.length} corte(s). Esperado: um nome por corte, porque o último trecho fecha no primeiro corte. Nomes: ${JSON.stringify(nomes)}.`);
  }
  if (new Set(nomes).size !== nomes.length) throw new ErroDeSilhueta(`--trechos repete nome (${JSON.stringify(nomes)}). Esperado: nomes distintos.`);
  const indices = cortes.map((c, k) => {
    let melhor = 0; let d = Infinity;
    for (let i = 0; i < n; i++) { const e = Math.hypot(anel[i][0] - c[0], anel[i][1] - c[1]); if (e < d) { d = e; melhor = i; } }
    if (d > distanciaMax) throw new ErroDeSilhueta(`o corte ${k + 1} ${JSON.stringify(c)} cai a ${d.toFixed(1)} px do contorno (o limite é ${distanciaMax} px). Esperado: um ponto sobre a borda da forma. Confira a sobreposição ou mova o ponto.`);
    return melhor;
  });
  if (new Set(indices).size !== indices.length) throw new ErroDeSilhueta(`dois cortes caem no mesmo vértice do contorno (${JSON.stringify(cortes)}). Esperado: cortes separados; afaste-os.`);
  const frente = indices.map((i) => (i - indices[0] + n) % n);
  const sobe = frente.every((v, k) => k === 0 || v > frente[k - 1]);
  const desce = frente.slice(1).every((v, k) => v < (k === 0 ? n : frente[k]));
  let ordem;
  if (sobe) ordem = anel;
  else if (desce) ordem = [...anel].reverse();
  else throw new ErroDeSilhueta(`os cortes ${JSON.stringify(cortes)} não seguem a ordem em volta do contorno (posições ${JSON.stringify(frente)} de ${n}). Esperado: os cortes na ordem em que o contorno os atravessa, num sentido só, sem pular nenhum.`);
  const idx = cortes.map((c) => {
    let melhor = 0; let d = Infinity;
    for (let i = 0; i < n; i++) { const e = Math.hypot(ordem[i][0] - c[0], ordem[i][1] - c[1]); if (e < d) { d = e; melhor = i; } }
    return melhor;
  });
  const trechos = {};
  idx.forEach((ini, k) => {
    const fim = idx[(k + 1) % idx.length];
    const pts = [];
    for (let i = ini; ; i = (i + 1) % n) { pts.push(ordem[i]); if (i === fim && pts.length > 1) break; }
    trechos[nomes[k]] = pts;
  });
  return { trechos, vertices: idx.map((i) => ordem[i]) };
}

const distanciaAoSegmento = (p, a, b) => {
  const dx = b[0] - a[0]; const dy = b[1] - a[1];
  const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy);
};

/**
 * Troca a polilinha por uma curva suave: filtro gaussiano de desvio `sigmaMm` ao longo do comprimento de arco, sobre a polilinha reamostrada a cada
 * sigma/6, com as pontas fixas (reflexão ímpar em torno de cada ponta, que mantém a ponta e a inclinação). Devolve a curva e o desvio entre o contorno
 * bruto e ela (distância de cada vértice bruto à curva): máximo e média, em mm.
 */
export function alisarTrecho(pontos, sigmaMm) {
  const acum = [0];
  for (let i = 1; i < pontos.length; i++) acum.push(acum[i - 1] + Math.hypot(pontos[i][0] - pontos[i - 1][0], pontos[i][1] - pontos[i - 1][1]));
  const total = acum[acum.length - 1];
  const h = sigmaMm / 6;
  const n = Math.max(2, Math.ceil(total / h));
  const em = (t) => {
    let i = 1;
    while (i < acum.length - 1 && acum[i] < t) i++;
    const u = acum[i] === acum[i - 1] ? 0 : (t - acum[i - 1]) / (acum[i] - acum[i - 1]);
    return [pontos[i - 1][0] + u * (pontos[i][0] - pontos[i - 1][0]), pontos[i - 1][1] + u * (pontos[i][1] - pontos[i - 1][1])];
  };
  const uniforme = Array.from({ length: n + 1 }, (_, k) => em((total * k) / n));
  const passo = total / n;
  const m = Math.ceil((3 * sigmaMm) / passo);
  const ponto = (k) => {
    if (k < 0) { const q = uniforme[Math.min(n, -k)]; return [2 * uniforme[0][0] - q[0], 2 * uniforme[0][1] - q[1]]; }
    if (k > n) { const q = uniforme[Math.max(0, 2 * n - k)]; return [2 * uniforme[n][0] - q[0], 2 * uniforme[n][1] - q[1]]; }
    return uniforme[k];
  };
  const curva = uniforme.map((_, i) => {
    let w = 0; let x = 0; let y = 0;
    for (let j = -m; j <= m; j++) {
      const k = Math.exp(-((j * passo) ** 2) / (2 * sigmaMm * sigmaMm));
      const q = ponto(i + j);
      w += k; x += k * q[0]; y += k * q[1];
    }
    return [x / w, y / w];
  });
  curva[0] = [...pontos[0]]; curva[n] = [...pontos[pontos.length - 1]];
  let max = 0; let soma = 0;
  for (const p of pontos) {
    let d = Infinity;
    for (let i = 1; i < curva.length; i++) d = Math.min(d, distanciaAoSegmento(p, curva[i - 1], curva[i]));
    max = Math.max(max, d); soma += d;
  }
  return { curva, desvioMaxMm: max, desvioMedioMm: soma / pontos.length };
}

/** `gume:3,dorso:2` em `[{ trecho, sigmaMm }]`. */
export function lerAlisar(texto, nomes) {
  if (texto === null || texto === undefined) return [];
  return String(texto).split(',').map((t) => t.trim()).filter(Boolean).map((t) => {
    const [trecho, mm, resto] = t.split(':');
    const sigmaMm = Number(mm);
    if (resto !== undefined || !trecho || !(sigmaMm > 0) || !Number.isFinite(sigmaMm)) {
      throw new ErroDeSilhueta(`--alisar recebeu ${JSON.stringify(t)}. Esperado: <trecho>:<mm>, com mm positivo, separados por vírgula (gume:3,dorso:2).`);
    }
    if (!nomes.includes(trecho)) throw new ErroDeSilhueta(`--alisar cita o trecho '${trecho}', que não existe. Trechos: ${JSON.stringify(nomes)}.`);
    return { trecho, sigmaMm };
  });
}

/** O arquivo de trechos e o que o gerou, sem ler nem gravar nada. */
export function referenciaDeSilhueta({ anelPx, escala, alinhamento, cortes, nomes, espelhar = false, residuoMax = 0.02, conferido = null, imagemSha256 = null, alisar = [], alisarMax = 1, segmentacao = null }) {
  const tf = transformacao({ escala, alinhamento, espelhar, residuoMax });
  const { trechos: emPx, vertices } = dividirAnel(anelPx, cortes, nomes);
  const trechos = {};
  for (const [nome, pts] of Object.entries(emPx)) trechos[nome] = pts.map((p) => tf.paraModelo(p).map((v) => arred(v)));
  const brutosMm = {};
  const alisados = [];
  const alisadosPx = {};
  for (const { trecho, sigmaMm } of alisar) {
    const r = alisarTrecho(trechos[trecho], sigmaMm);
    if (r.desvioMaxMm > alisarMax) {
      throw new ErroDeSilhueta(`alisar '${trecho}' com ${sigmaMm} mm afasta a curva até ${r.desvioMaxMm.toFixed(2)} mm do contorno bruto, e o limite é ${alisarMax} mm (--alisar-max). Esperado: um alisamento que só tire a ondulação; use um mm menor, ou eleve o limite se o desvio for mesmo aceitável.`);
    }
    brutosMm[trecho] = trechos[trecho];
    trechos[trecho] = r.curva.map((p) => p.map((v) => arred(v)));
    alisadosPx[trecho] = trechos[trecho].map((p) => tf.paraImagem(p));
    alisados.push({ trecho, sigmaMm, metodo: 'gaussiano ao longo do arco, pontas fixas', pontosBrutos: brutosMm[trecho].length, pontos: trechos[trecho].length, desvioMaxMm: arred(r.desvioMaxMm), desvioMedioMm: arred(r.desvioMedioMm) });
  }
  const referencia = {
    formato: FORMATO,
    escala: 'mm',
    conferidoPelaPessoa: conferido && String(conferido).trim() ? String(conferido).trim() : null,
    origem: {
      imagemSha256,
      eixos: 'a abscissa e a ordenada do plano do modelo, em mm (a primeira é a de silhueta:desvio --plano)',
      mmPorPx: arred(tf.mmPorPx, 5),
      giroGraus: arred(tf.giroGraus, 2),
      espelhado: espelhar,
      escalaMedida: { pontosPx: [escala.a, escala.b], mm: escala.mm },
      alinhamentoPx: alinhamento.map((a) => a.px),
      erroNosPontosDeAlinhamentoMm: tf.erroNosPontosMm,
      cortesPx: vertices,
      ...(segmentacao ? { segmentacao } : {}),
      ...(alisados.length ? { alisados, alisarMaxMm: alisarMax } : {}),
    },
    alinhamento: alinhamento.map((a) => a.modelo),
    trechos,
  };
  return { referencia, transformacao: tf, trechosPx: emPx, alisadosPx, vertices };
}

const PALETA = [[214, 39, 40], [31, 79, 214], [44, 160, 44], [255, 127, 14], [148, 103, 189], [0, 150, 160], [200, 30, 150], [140, 86, 75]];

/** A foto com o contorno por cima: trechos em cores com o nome, os cortes e os dois pontos de alinhamento marcados. Devolve o PNG. */
export async function sobreposicaoPng(pngBuffer, { trechosPx, alisadosPx = {}, alinhamento, referencia }) {
  const { cv } = await carregarOpenCV();
  const png = PNG.sync.read(pngBuffer);
  const mat = cv.matFromImageData({ data: png.data, width: png.width, height: png.height });
  const cor = (c) => new cv.Scalar(c[0], c[1], c[2], 255);
  const texto = (t, x, y, c, escala = 0.55) => {
    cv.putText(mat, t, new cv.Point(Math.round(x), Math.round(y)), cv.FONT_HERSHEY_SIMPLEX, escala, cor([255, 255, 255]), 4, cv.LINE_AA);
    cv.putText(mat, t, new cv.Point(Math.round(x), Math.round(y)), cv.FONT_HERSHEY_SIMPLEX, escala, cor(c), 1, cv.LINE_AA);
  };
  try {
    Object.entries(trechosPx).forEach(([nome, pts], k) => {
      const c = PALETA[k % PALETA.length];
      for (let i = 1; i < pts.length; i++) cv.line(mat, new cv.Point(Math.round(pts[i - 1][0]), Math.round(pts[i - 1][1])), new cv.Point(Math.round(pts[i][0]), Math.round(pts[i][1])), cor(c), 3, cv.LINE_AA);
      const lisa = alisadosPx[nome];
      if (lisa) for (let i = 1; i < lisa.length; i++) cv.line(mat, new cv.Point(Math.round(lisa[i - 1][0]), Math.round(lisa[i - 1][1])), new cv.Point(Math.round(lisa[i][0]), Math.round(lisa[i][1])), cor([0, 0, 0]), 1, cv.LINE_AA);
      const m = pts[Math.floor(pts.length / 2)];
      const dx = m[0] > png.width / 2 ? -10 : 10;
      texto(nome, m[0] + (dx < 0 ? -8 * nome.length : dx), m[1] + 4, c);
      const ini = pts[0];
      cv.circle(mat, new cv.Point(Math.round(ini[0]), Math.round(ini[1])), 5, cor([0, 0, 0]), -1, cv.LINE_AA);
      cv.circle(mat, new cv.Point(Math.round(ini[0]), Math.round(ini[1])), 3, cor(c), -1, cv.LINE_AA);
    });
    alinhamento.forEach((a, k) => {
      const [x, y] = a.px.map(Math.round);
      cv.line(mat, new cv.Point(x - 12, y), new cv.Point(x + 12, y), cor([0, 0, 0]), 3, cv.LINE_AA);
      cv.line(mat, new cv.Point(x, y - 12), new cv.Point(x, y + 12), cor([0, 0, 0]), 3, cv.LINE_AA);
      cv.line(mat, new cv.Point(x - 12, y), new cv.Point(x + 12, y), cor([255, 215, 0]), 1, cv.LINE_AA);
      cv.line(mat, new cv.Point(x, y - 12), new cv.Point(x, y + 12), cor([255, 215, 0]), 1, cv.LINE_AA);
      texto(`alinhamento ${k + 1}: [${a.modelo.join('; ')}] mm`, Math.min(x + 14, png.width - 230), Math.min(png.height - 8, y + 20), [0, 0, 0], 0.5);
    });
    texto(referencia.conferidoPelaPessoa ? `conferido: ${referencia.conferidoPelaPessoa}` : 'NAO CONFERIDO pela pessoa', 8, 18, [0, 0, 0], 0.5);
    const saida = new PNG({ width: png.width, height: png.height });
    Buffer.from(mat.data).copy(saida.data);
    return PNG.sync.write(saida);
  } finally { mat.delete(); }
}

/**
 * Recortes ampliados de um trecho, para ver a linha sobre a borda: janelas de `janela` px de lado ao longo do trecho, a cada `janela` px de arco,
 * ampliadas `ampliacao` vezes sem suavizar o pixel. O contorno bruto vai em vermelho, com um ponto em cada vértice, e a curva alisada, quando há, em azul.
 * Devolve `[{ numero, png }]`.
 */
export async function recortesDePerto(pngBuffer, { pontosPx, alisadoPx = null, janela = 100, ampliacao = 6 }) {
  const { cv } = await carregarOpenCV();
  const png = PNG.sync.read(pngBuffer);
  const mat = cv.matFromImageData({ data: png.data, width: png.width, height: png.height });
  const saida = [];
  try {
    const centros = [];
    let acum = 0; let proximo = 0;
    for (let i = 0; i < pontosPx.length; i++) {
      if (i) acum += Math.hypot(pontosPx[i][0] - pontosPx[i - 1][0], pontosPx[i][1] - pontosPx[i - 1][1]);
      if (acum >= proximo) { centros.push(pontosPx[i]); proximo += janela; }
    }
    centros.forEach((c, numero) => {
      const x0 = Math.max(0, Math.min(png.width - janela, Math.round(c[0] - janela / 2)));
      const y0 = Math.max(0, Math.min(png.height - janela, Math.round(c[1] - janela / 2)));
      const w = Math.min(janela, png.width); const h = Math.min(janela, png.height);
      const roi = mat.roi(new cv.Rect(x0, y0, w, h));
      const grande = new cv.Mat();
      cv.resize(roi, grande, new cv.Size(w * ampliacao, h * ampliacao), 0, 0, cv.INTER_NEAREST);
      const q = ([x, y]) => new cv.Point(Math.round((x - x0 + 0.5) * ampliacao), Math.round((y - y0 + 0.5) * ampliacao));
      const linha = (pts, c1, esp) => { for (let i = 1; i < pts.length; i++) cv.line(grande, q(pts[i - 1]), q(pts[i]), new cv.Scalar(...c1, 255), esp, cv.LINE_AA); };
      linha(pontosPx, [214, 39, 40], 1);
      for (const p of pontosPx) cv.circle(grande, q(p), 2, new cv.Scalar(214, 39, 40, 255), -1, cv.LINE_AA);
      if (alisadoPx) linha(alisadoPx, [31, 79, 214], 2);
      cv.putText(grande, `x ${x0}-${x0 + w}  y ${y0}-${y0 + h}  ${ampliacao}x`, new cv.Point(6, 16), cv.FONT_HERSHEY_SIMPLEX, 0.5, new cv.Scalar(0, 150, 0, 255), 1, cv.LINE_AA);
      const out = new PNG({ width: w * ampliacao, height: h * ampliacao });
      Buffer.from(grande.data).copy(out.data);
      saida.push({ numero: numero + 1, png: PNG.sync.write(out) });
      roi.delete(); grande.delete();
    });
  } finally { mat.delete(); }
  return saida;
}

const AJUDA = `npm run silhueta:referencia -- --imagem=<foto.png> (--regioes=<regioes.json> | --contorno=<contornos.json>) --escala=x1,y1,x2,y2,mm --alinhar=x1,y1,a1,b1,x2,y2,a2,b2 --cortes="x,y;x,y;..." --trechos=n1,n2,... --saida=<arquivo.json> [opções]

Leva o contorno que o módulo de contorno da imagem tira de uma imagem ao arquivo de trechos em mm, nos eixos do modelo, que \`npm run silhueta:desvio\` lê,
e desenha a sobreposição do contorno sobre a foto para a pessoa conferir. Todos os pontos da imagem são em pixel (x para a direita, y para baixo).

  --imagem=<png>             a foto; obrigatória com --regioes e para a sobreposição
  --regioes=<json>           o arquivo de regiões do módulo (sementes, limiar); o contorno é tirado na hora (as âncoras dele não valem, a escala é --escala)
  --contorno=<json>          o <imagem>.contornos.json já tirado (com --imagem, o hash dela tem de ser o do arquivo)
  --parte=<nome>             o contorno a dividir: "silhueta" (padrão) ou o nome de uma região
  --escala=x1,y1,x2,y2,mm    dois pontos da imagem e a distância real entre eles, em mm
  --alinhar=...              dois pontos da imagem e os dois pontos do modelo a que correspondem (rotação e posição; viram o "alinhamento" do arquivo)
  --limiar=<0-255>           o limiar de cinza da segmentação, no lugar do "limiar" do arquivo de regiões (só com --regioes); fica gravado em origem.segmentacao
  --alisar=<trecho>:<mm>     troca o trecho (ou vários, separados por vírgula) por uma curva suave: filtro gaussiano de desvio <mm> ao longo do arco, pontas fixas;
                             o desvio máximo entre o contorno bruto e a curva fica em origem.alisados, e acima de --alisar-max o comando recusa
  --alisar-max=<mm>          o desvio máximo aceito do alisamento (1)
  --sobreposicao-de-perto=<trecho>   além da sobreposição, grava recortes ampliados (6x) do trecho, de 100 px em 100 px de arco, com o contorno bruto em
                             vermelho e a curva alisada em azul (vários trechos, separados por vírgula)
  --prefixo-de-perto=<caminho>  o começo do nome dos recortes (<prefixo>-<trecho>-NN.png); padrão: a --sobreposicao sem .png mais -de-perto
  --espelhar                 a foto vê o objeto do lado oposto ao dos eixos do modelo (a rotação sozinha não os leva a coincidir)
  --residuo-max=<fração>     desacordo máximo entre a escala medida e a distância dos pontos do modelo (0.02)
  --cortes="x,y;x,y;..."     pontos sobre o contorno que o dividem, na ordem em volta; o último trecho fecha no primeiro corte
  --trechos=n1,n2,...        o nome de cada trecho, um por corte: o trecho k vai do corte k ao corte k+1
  --saida=<json>             o arquivo de trechos (obrigatório)
  --sobreposicao=<png>       a foto com o contorno, os trechos nomeados e os pontos de alinhamento (precisa de --imagem)
  --conferido="<quem, data>" preenche conferidoPelaPessoa; sem ele o arquivo nasce com null e silhueta:desvio avisa
  --ajuda                    esta mensagem

Código de saída: 0 gravou, 2 uso errado ou entrada recusada. Quem confere o contorno sobre a foto é a pessoa.
`;

function uso(mensagem) {
  process.stderr.write(`silhueta:referencia: ${mensagem}\n(--ajuda para o uso completo)\n`);
  return 2;
}

export async function comoCLI(argv) {
  if (argv.includes('--ajuda')) { process.stdout.write(AJUDA); return 0; }
  let lido;
  try {
    lido = lerArgumentos(argv, {
      opcoes: ['imagem', 'regioes', 'contorno', 'parte', 'escala', 'alinhar', 'residuo-max', 'cortes', 'trechos', 'saida', 'sobreposicao', 'conferido', 'limiar', 'alisar', 'alisar-max', 'sobreposicao-de-perto', 'prefixo-de-perto'],
      bandeiras: ['espelhar'],
      posicional: null,
    });
  } catch (erro) { return uso(erro.message); }
  try {
    const escala = lerEscala(lido.opcao('escala'));
    const alinhamento = lerAlinhar(lido.opcao('alinhar'));
    const cortes = lerCortes(lido.opcao('cortes'));
    const nomes = String(lido.opcao('trechos') ?? '').split(',').map((t) => t.trim()).filter(Boolean);
    const saida = lido.opcao('saida');
    if (!saida) throw new ErroDeSilhueta('falta --saida=<arquivo.json> (recebi nada). Esperado: onde gravar o arquivo de trechos.');
    const residuoMax = lido.opcao('residuo-max') === null ? 0.02 : Number(lido.opcao('residuo-max'));
    if (!(residuoMax > 0)) throw new ErroDeSilhueta(`--residuo-max recebeu ${JSON.stringify(lido.opcao('residuo-max'))}. Esperado: uma fração positiva, como 0.02.`);
    const caminhoImagem = lido.opcao('imagem');
    const png = caminhoImagem ? readFileSync(resolve(caminhoImagem)) : null;
    const hash = png ? createHash('sha256').update(png).digest('hex') : null;
    const parte = lido.opcao('parte') ?? 'silhueta';
    const alisarMax = lido.opcao('alisar-max') === null ? 1 : Number(lido.opcao('alisar-max'));
    if (!(alisarMax > 0)) throw new ErroDeSilhueta(`--alisar-max recebeu ${JSON.stringify(lido.opcao('alisar-max'))}. Esperado: um desvio positivo em mm, como 1.`);
    const alisar = lerAlisar(lido.opcao('alisar'), nomes);
    const dePerto = String(lido.opcao('sobreposicao-de-perto') ?? '').split(',').map((t) => t.trim()).filter(Boolean);
    for (const t of dePerto) if (!nomes.includes(t)) throw new ErroDeSilhueta(`--sobreposicao-de-perto cita o trecho '${t}', que não existe. Trechos: ${JSON.stringify(nomes)}.`);
    if (dePerto.length && !png) throw new ErroDeSilhueta('--sobreposicao-de-perto precisa de --imagem=<foto.png> (recebi nada). Esperado: a foto de que se recorta.');
    const limiar = lido.opcao('limiar') === null ? null : Number(lido.opcao('limiar'));
    if (limiar !== null && !(limiar >= 0 && limiar <= 255)) throw new ErroDeSilhueta(`--limiar recebeu ${JSON.stringify(lido.opcao('limiar'))}. Esperado: um número de 0 a 255.`);
    if (limiar !== null && !lido.opcao('regioes')) throw new ErroDeSilhueta('--limiar só vale com --regioes (recebi --contorno, que já traz o contorno tirado). Esperado: --imagem e --regioes, para o contorno ser tirado de novo no limiar pedido.');
    let segmentacao = null;
    let contornos;
    if (lido.opcao('regioes')) {
      if (!png) throw new ErroDeSilhueta('--regioes precisa de --imagem=<foto.png> (recebi só as regiões). Esperado: a foto de que o contorno é tirado.');
      const { contornosDaImagem } = await import('./contorno-da-imagem.mjs');
      const config = JSON.parse(readFileSync(resolve(lido.opcao('regioes')), 'utf8'));
      /* o módulo calibra por âncoras alinhadas aos eixos; só o contorno em pixel vale aqui, e o mm vem de `transformacao` */
      const ancoras = [{ nome: 'escala-a', px: [0, 0], mm: [0, 0] }, { nome: 'escala-b', px: [100, 0], mm: [(100 * escala.mm) / escala.px, 0] }];
      const usada = { ...config, ...(limiar !== null ? { limiar } : {}), ancoras };
      segmentacao = { limiar: usada.limiar ?? 225, limiarDe: limiar !== null ? '--limiar' : config.limiar !== undefined ? 'arquivo de regiões' : 'padrão do módulo', realce: usada.realce ?? false, bordaSubpixel: usada.bordaSubpixel ?? true, regioes: usada.regioes };
      contornos = (await contornosDaImagem(png, usada)).resultado;
    } else if (lido.opcao('contorno')) {
      contornos = JSON.parse(readFileSync(resolve(lido.opcao('contorno')), 'utf8'));
      if (hash && contornos.imagem?.sha256 && contornos.imagem.sha256 !== hash) {
        throw new ErroDeSilhueta(`o contorno ${lido.opcao('contorno')} foi tirado de outra imagem (sha256 ${String(contornos.imagem.sha256).slice(0, 12)}, e --imagem tem ${hash.slice(0, 12)}). Esperado: o contorno da mesma imagem; tire-o de novo com --regioes.`);
      }
    } else {
      throw new ErroDeSilhueta('falta de onde tirar o contorno (recebi nem --regioes nem --contorno). Esperado: --imagem=<png> --regioes=<json>, ou --contorno=<imagem.contornos.json>.');
    }
    const fonte = parte === 'silhueta' ? contornos.silhueta : contornos.regioes?.[parte];
    if (!fonte?.contornoPx) throw new ErroDeSilhueta(`o contorno '${parte}' não existe (recebi --parte=${parte}). Esperado: "silhueta" ou uma de ${JSON.stringify(Object.keys(contornos.regioes ?? {}))}.`);
    const { referencia, transformacao: tf, trechosPx, alisadosPx } = referenciaDeSilhueta({
      anelPx: fonte.contornoPx, escala, alinhamento, cortes, nomes, espelhar: lido.bandeira('espelhar'), residuoMax, conferido: lido.opcao('conferido'), alisar, alisarMax, segmentacao, imagemSha256: hash ?? contornos.imagem?.sha256 ?? null,
    });
    mkdirSync(dirname(resolve(saida)), { recursive: true });
    writeFileSync(resolve(saida), `${JSON.stringify(referencia)}\n`);
    const o = [`referência gravada em ${saida}: ${tf.mmPorPx.toFixed(4)} mm/px, giro ${tf.giroGraus.toFixed(2)} graus${tf.espelhado ? ', espelhada' : ''}, desacordo escala/modelo ${(tf.desacordo * 100).toFixed(2)}%, erro nos pontos de alinhamento ${tf.erroNosPontosMm.join(' e ')} mm`];
    for (const [nome, pts] of Object.entries(referencia.trechos)) {
      let c = 0; for (let i = 1; i < pts.length; i++) c += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      o.push(`  trecho ${nome}: ${pts.length} pontos, ${c.toFixed(1)} mm, de [${pts[0].join('; ')}] a [${pts[pts.length - 1].join('; ')}]`);
    }
    if (lido.opcao('sobreposicao')) {
      if (!png) throw new ErroDeSilhueta('--sobreposicao precisa de --imagem=<foto.png> (recebi nada). Esperado: a foto sobre a qual desenhar.');
      mkdirSync(dirname(resolve(lido.opcao('sobreposicao'))), { recursive: true });
      writeFileSync(resolve(lido.opcao('sobreposicao')), await sobreposicaoPng(png, { trechosPx, alisadosPx, alinhamento, referencia }));
      o.push(`sobreposição em ${lido.opcao('sobreposicao')}`);
    }
    for (const a of referencia.origem.alisados ?? []) o.push(`alisado ${a.trecho}: sigma ${a.sigmaMm} mm, ${a.pontosBrutos} para ${a.pontos} pontos, desvio do bruto até ${a.desvioMaxMm} mm (média ${a.desvioMedioMm} mm)`);
    for (const t of dePerto) {
      const prefixo = lido.opcao('prefixo-de-perto') ? resolve(lido.opcao('prefixo-de-perto')) : resolve(lido.opcao('sobreposicao') ?? saida).replace(/\.[a-z]+$/i, '') + '-de-perto';
      mkdirSync(dirname(prefixo), { recursive: true });
      const rs = await recortesDePerto(png, { pontosPx: trechosPx[t], alisadoPx: alisadosPx[t] ?? null });
      for (const r of rs) writeFileSync(`${prefixo}-${t}-${String(r.numero).padStart(2, '0')}.png`, r.png);
      o.push(`de perto ${t}: ${rs.length} recorte(s) em ${prefixo}-${t}-NN.png`);
    }
    o.push(referencia.conferidoPelaPessoa ? `conferido por: ${referencia.conferidoPelaPessoa}` : 'NÃO CONFERIDO: a pessoa olha a sobreposição, e o comando se repete com --conferido="<quem, data>"; até lá silhueta:desvio avisa.');
    process.stdout.write(`${o.join('\n')}\n`);
    return 0;
  } catch (erro) {
    if (erro instanceof ErroDeSilhueta || erro.code === 'ENOENT' || erro instanceof SyntaxError) return uso(erro.code === 'ENOENT' ? `não achei o arquivo ${erro.path}.` : erro.message);
    throw erro;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await comoCLI(process.argv.slice(2));
}
