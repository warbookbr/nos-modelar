#!/usr/bin/env node
/* linhas-do-modelo.mjs — as linhas que o modelo tem numa vista, tiradas da malha e não de uma imagem com luz.
 *
 * POR QUE ELE EXISTE. Na leitura por regiões da traseira da empilhadeira (2026-11-10), o crítico achou a tampa larga, a divisa em arco
 * e a borda do vão, e tomou por sombra a listra que o degrau do bico deixava no laranja. Numa captura com luz, o friso suave e a sombra
 * são a mesma coisa. Na malha não: o contorno, a divisa entre partes, o degrau e a dobra têm medida, e saem aqui como desenho de linha
 * na mesma câmera da vista, para a leitura por regiões pôr sobre a referência e perguntar de cada uma se ela existe lá.
 *
 * O QUE ELE FAZ. Projeta os triângulos na vista (ortográfica, com a caixa do objeto ocupando a imagem inteira), guarda por pixel a
 * parte, a profundidade e a normal da face mais próxima, e marca quatro linhas:
 *   contorno      o pixel do objeto vizinho do fundo;
 *   divisa        dois vizinhos de partes diferentes;
 *   quina         dois vizinhos da mesma parte com a profundidade a mais de `DEGRAU_MM` um do outro, ou com as normais a mais de
 *                 `QUINA_GRAUS` (o degrau, a aresta viva, a borda de um rebaixo);
 *   dobra         as normais a `ALCANCE_MM` de distância, na mesma parte, a mais de `DOBRA_GRAUS`: a curva fechada que na imagem
 *                 aparece como friso ou listra. O ombro largo e a superfície lisa ficam abaixo disso.
 *
 * Uso: npm run linhas:modelo -- <esboço> --vista=<vista> --saida=<png> [--opcao=1] [--largura=1200]
 * O arquivo é o do `esboco:nucleo` (.esboco.json ou módulo). A imagem sai com o contorno e a divisa em vermelho, a quina em azul e a
 * dobra em verde, sobre branco, e é a que `leitura:regioes --linhas=<png>` espera. */
import { writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VISTAS_BANCADA } from '../../src/autoria/vistas-da-bancada.js';
import { imagem, paraPng } from './leitura-por-regioes.mjs';

export const DEGRAU_MM = 12;
export const QUINA_GRAUS = 38;
export const DOBRA_GRAUS = 24;
export const ALCANCE_MM = 10;
export const CORES_DAS_LINHAS = Object.freeze({ contorno: [220, 0, 40], divisa: [220, 0, 40], quina: [0, 80, 230], dobra: [0, 150, 70] });
export const LINHA = Object.freeze({ nada: 0, dobra: 1, quina: 2, divisa: 3, contorno: 4 });

const unit = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A base da câmera de uma vista da bancada: para onde ela olha, a direita e o cima da imagem. */
export function baseDaVista(vista) {
  const definicao = VISTAS_BANCADA[vista];
  if (!definicao) throw new Error(`vista "${vista}" não existe na bancada (${Object.keys(VISTAS_BANCADA).join(', ')})`);
  const direcao = unit([...definicao.direcao]);
  const acima = Math.abs(direcao[1]) > 0.99 ? [0, 0, direcao[1] > 0 ? -1 : 1] : [0, 1, 0];
  const olhar = direcao.map((x) => -x);
  const direita = unit(cruz(olhar, acima));
  return { olhar, direita, cima: unit(cruz(direita, olhar)) };
}

/**
 * Projeta as faces na vista e guarda, por pixel, a parte (0 é o fundo), a profundidade em mm e a normal da face mais próxima.
 * @param {Array<{ pts: number[][], parte: number }>} faces  polígonos convexos em mm, com o índice da parte a partir de 1
 * @param {{ u0: number, u1: number, v0: number, v1: number }} [caixa]  o quadro a usar, em mm na base da vista; sem ele vale a caixa
 *   projetada das próprias faces. Com ele, faces diferentes rasterizadas no mesmo quadro caem nos mesmos pixels (sobra:partes).
 */
export function rasterizar(faces, vista, largura = 1200, caixa = null) {
  const { olhar, direita, cima } = baseDaVista(vista);
  let u0 = Infinity; let u1 = -Infinity; let v0 = Infinity; let v1 = -Infinity;
  const proj = faces.map((f) => f.pts.map((p) => {
    const u = dot(p, direita); const v = dot(p, cima);
    if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
    return [u, v, dot(p, olhar)];
  }));
  if (caixa) ({ u0, u1, v0, v1 } = caixa);
  if (!faces.length || !(u1 > u0) || !(v1 > v0)) throw new Error('a malha não tem área nesta vista');
  const mmPorPx = (u1 - u0) / largura;
  const altura = Math.max(1, Math.round((v1 - v0) / mmPorPx));
  const parte = new Uint16Array(largura * altura); const fundo = new Float32Array(largura * altura).fill(Infinity);
  const normal = new Float32Array(largura * altura * 3);
  faces.forEach((f, i) => {
    const q = proj[i].map(([u, v, d]) => [(u - u0) / mmPorPx, (v1 - v) / mmPorPx, d]);
    const n = unit(cruz([f.pts[1][0] - f.pts[0][0], f.pts[1][1] - f.pts[0][1], f.pts[1][2] - f.pts[0][2]], [f.pts[2][0] - f.pts[0][0], f.pts[2][1] - f.pts[0][1], f.pts[2][2] - f.pts[0][2]]));
    for (let t = 1; t < q.length - 1; t += 1) {
      const [a, b, c] = [q[0], q[t], q[t + 1]];
      const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
      if (Math.abs(area) < 1e-9) continue;
      const xa = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))); const xb = Math.min(largura - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      const ya = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))); const yb = Math.min(altura - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      for (let y = ya; y <= yb; y += 1) for (let x = xa; x <= xb; x += 1) {
        const px = x + 0.5; const py = y + 0.5;
        const w0 = ((b[0] - px) * (c[1] - py) - (c[0] - px) * (b[1] - py)) / area;
        const w1 = ((c[0] - px) * (a[1] - py) - (a[0] - px) * (c[1] - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        const d = w0 * a[2] + w1 * b[2] + w2 * c[2]; const o = y * largura + x;
        if (d < fundo[o]) { fundo[o] = d; parte[o] = f.parte; normal[o * 3] = n[0]; normal[o * 3 + 1] = n[1]; normal[o * 3 + 2] = n[2]; }
      }
    }
  });
  return { largura, altura, mmPorPx, parte, profundidade: fundo, normal };
}

/** A linha de cada pixel (`LINHA`), a mais forte entre contorno, divisa, quina e dobra. */
export function linhasDoRaster(r) {
  const { largura: L, altura: A, parte, profundidade, normal, mmPorPx } = r;
  const sai = new Uint8Array(L * A);
  const cosQuina = Math.cos(QUINA_GRAUS * Math.PI / 180); const cosDobra = Math.cos(DOBRA_GRAUS * Math.PI / 180);
  const alcance = Math.max(2, Math.round(ALCANCE_MM / mmPorPx));
  const cos = (a, b) => normal[a * 3] * normal[b * 3] + normal[a * 3 + 1] * normal[b * 3 + 1] + normal[a * 3 + 2] * normal[b * 3 + 2];
  const marca = (o, v) => { if (v > sai[o]) sai[o] = v; };
  for (let y = 0; y < A; y += 1) for (let x = 0; x < L; x += 1) {
    const o = y * L + x;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      if (x + dx >= L || y + dy >= A) { if (parte[o]) marca(o, LINHA.contorno); continue; }
      const p = o + dy * L + dx;
      if (!parte[o] && !parte[p]) continue;
      if (!parte[o] || !parte[p]) { marca(parte[o] ? o : p, LINHA.contorno); continue; }
      if (parte[o] !== parte[p]) { marca(o, LINHA.divisa); continue; }
      if (Math.abs(profundidade[o] - profundidade[p]) > DEGRAU_MM || cos(o, p) < cosQuina) { marca(o, LINHA.quina); continue; }
      const xl = x + dx * alcance; const yl = y + dy * alcance;
      if (xl < L && yl < A) { const q = yl * L + xl; if (parte[q] === parte[o] && cos(o, q) < cosDobra) marca(y * L + x + (dy * L + dx) * (alcance >> 1), LINHA.dobra); }
    }
    if ((x === 0 || y === 0) && parte[o]) marca(o, LINHA.contorno);
  }
  return sai;
}

/** O desenho das linhas: contorno e divisa em vermelho, quina em azul e dobra em verde, com `espessura` px, sobre branco. */
export function desenharLinhas(r, linhas, espessura = 2) {
  const im = imagem(r.largura, r.altura);
  const cor = { [LINHA.contorno]: CORES_DAS_LINHAS.contorno, [LINHA.divisa]: CORES_DAS_LINHAS.divisa, [LINHA.quina]: CORES_DAS_LINHAS.quina, [LINHA.dobra]: CORES_DAS_LINHAS.dobra };
  for (const nivel of [LINHA.dobra, LINHA.quina, LINHA.divisa, LINHA.contorno]) {
    for (let y = 0; y < r.altura; y += 1) for (let x = 0; x < r.largura; x += 1) {
      if (linhas[y * r.largura + x] !== nivel) continue;
      for (let dy = 0; dy < espessura; dy += 1) for (let dx = 0; dx < espessura; dx += 1) {
        const xx = Math.min(r.largura - 1, x + dx); const yy = Math.min(r.altura - 1, y + dy); const o = (yy * r.largura + xx) * 3;
        im.dados[o] = cor[nivel][0]; im.dados[o + 1] = cor[nivel][1]; im.dados[o + 2] = cor[nivel][2];
      }
    }
  }
  return im;
}

/** As faces de um neutro em mm, com o índice da parte de cada uma (a partir de 1, na ordem de `partes`). */
export function facesDoNeutro(neutro, partes) {
  const indice = new Map(partes.map((n, i) => [n, i + 1]));
  return [...neutro.F.values()].sort((a, b) => a.id - b.id).map((f) => ({ pts: f.vs.map((v) => neutro.V.get(v).map((c) => c * 1000)), parte: indice.get(f.parte) ?? partes.length + 1 }));
}

const AJUDA = `npm run linhas:modelo -- <esboço> --vista=<vista> --saida=<png> [--opcao=1] [--largura=1200]

Desenha as linhas que o modelo tem na vista, tiradas da malha: contorno e divisa de partes em vermelho, quina e degrau em azul,
dobra fechada em verde. A imagem tem a caixa do objeto inteira e é a que leitura:regioes --linhas=<png> espera.`;

export async function executar(argv) {
  const valor = (nome) => { const a = argv.find((x) => x.startsWith(`--${nome}=`)); return a === undefined ? null : a.slice(nome.length + 3); };
  const arquivo = argv.find((a) => !a.startsWith('--'));
  if (argv.includes('--ajuda') || argv.includes('--help') || !arquivo) return { codigo: arquivo ? 0 : (argv.length ? 2 : 0), stdout: `${AJUDA}\n`, stderr: '' };
  if (!valor('vista') || !valor('saida')) return { codigo: 2, stdout: '', stderr: 'linhas:modelo: faltam --vista e --saida\n' };
  const { lerArquivoDeEsboco, montarOpcoes } = await import('./esboco-nucleo.mjs');
  const montado = montarOpcoes(await lerArquivoDeEsboco(resolve(arquivo)), { nome: basename(arquivo), relato: false });
  if (montado.recusas?.length) return { codigo: 1, stdout: '', stderr: `linhas:modelo: o esboço foi recusado:\n${montado.recusas.map((r) => `- ${r}`).join('\n')}\n` };
  const painel = montado.paineis[Number(valor('opcao') ?? 1) - 1];
  if (!painel) return { codigo: 2, stdout: '', stderr: `linhas:modelo: o esboço tem ${montado.paineis.length} opções\n` };
  const r = rasterizar(facesDoNeutro(painel.neutro, painel.partes), valor('vista'), Number(valor('largura') ?? 1200));
  const linhas = linhasDoRaster(r);
  writeFileSync(resolve(valor('saida')), paraPng(desenharLinhas(r, linhas)));
  const conta = [0, 0, 0, 0, 0]; for (const v of linhas) conta[v] += 1;
  return { codigo: 0, stdout: `${r.largura} x ${r.altura} px, ${r.mmPorPx.toFixed(2)} mm por px; contorno ${conta[4]}, divisa ${conta[3]}, quina ${conta[2]}, dobra ${conta[1]} px\n${resolve(valor('saida'))}\n`, stderr: '' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await executar(process.argv.slice(2));
  process.stdout.write(r.stdout); process.stderr.write(r.stderr); process.exitCode = r.codigo;
}
