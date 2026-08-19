#!/usr/bin/env node
/* prancha-referencia.mjs — lê uma prancha rasterizada de referência, calibra
   pixel→milímetro por duas medidas conhecidas e extrai a silhueta como polilinha
   em milímetros. É o que faltava para comparar desenho com referência por número
   em vez de por impressão.

   A imagem NÃO entra no repositório: só as coordenadas derivadas dela. O
   decodificador é puro Node com zlib, sem navegador e sem dependência nova. */

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

/* --- PNG mínimo: IHDR + IDAT, profundidade 8, cor 0/2/4/6, sem entrelaçamento -- */
export function lerPng(caminho) {
  const buf = readFileSync(caminho);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('não é PNG');
  let i = 8; let ihdr = null; const idat = [];
  while (i < buf.length) {
    const tam = buf.readUInt32BE(i);
    const tipo = buf.toString('ascii', i + 4, i + 8);
    const dados = buf.subarray(i + 8, i + 8 + tam);
    if (tipo === 'IHDR') {
      ihdr = {
        largura: dados.readUInt32BE(0), altura: dados.readUInt32BE(4),
        bits: dados[8], cor: dados[9], entrelace: dados[12],
      };
    } else if (tipo === 'IDAT') idat.push(dados);
    else if (tipo === 'IEND') break;
    i += 12 + tam;
  }
  if (!ihdr) throw new Error('PNG sem IHDR');
  if (ihdr.bits !== 8 || ihdr.entrelace !== 0) throw new Error(`PNG não suportado: ${ihdr.bits} bits, entrelace ${ihdr.entrelace}`);
  const canais = { 0: 1, 2: 3, 4: 2, 6: 4 }[ihdr.cor];
  if (!canais) throw new Error(`tipo de cor ${ihdr.cor} não suportado`);

  const bruto = inflateSync(Buffer.concat(idat));
  const { largura: W, altura: H } = ihdr;
  const passo = W * canais;
  const px = Buffer.alloc(H * passo);
  for (let y = 0; y < H; y += 1) {
    const filtro = bruto[y * (passo + 1)];
    const linha = bruto.subarray(y * (passo + 1) + 1, y * (passo + 1) + 1 + passo);
    for (let x = 0; x < passo; x += 1) {
      const a = x >= canais ? px[y * passo + x - canais] : 0;
      const b = y > 0 ? px[(y - 1) * passo + x] : 0;
      const c = x >= canais && y > 0 ? px[(y - 1) * passo + x - canais] : 0;
      let v = linha[x];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += b;
      else if (filtro === 3) v += (a + b) >> 1;
      else if (filtro === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      px[y * passo + x] = v & 0xff;
    }
  }

  const lum = new Uint8Array(W * H);
  for (let k = 0; k < W * H; k += 1) {
    const o = k * canais;
    lum[k] = canais <= 2 ? px[o] : Math.round(0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2]);
  }
  return { largura: W, altura: H, lum };
}

/* Painéis com tinta, para achar as vistas sem chutar retângulo à mão. */
export function acharPaineis(img, { limiar = 128, vaoMin = 10 } = {}) {
  const { largura: W, altura: H, lum } = img;
  const col = new Array(W).fill(0); const lin = new Array(H).fill(0);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) if (lum[y * W + x] < limiar) { col[x] += 1; lin[y] += 1; }
  }
  const faixas = (arr) => {
    const f = []; let ini = null;
    for (let i = 0; i < arr.length; i += 1) {
      const on = arr[i] > 0;
      if (on && ini === null) ini = i;
      if (!on && ini !== null) { if (i - ini > vaoMin) f.push([ini, i - 1]); ini = null; }
    }
    if (ini !== null) f.push([ini, arr.length - 1]);
    return f;
  };
  return { colunas: faixas(col), linhas: faixas(lin) };
}

/* Mediana móvel. Preserva degrau real — para-choque, aresta de tampa — e mata o
   tremor de um pixel, que a 9 mm/px domina qualquer medida de curvatura. */
export function suavizarSerie(serie, { janela = 5 } = {}) {
  const meia = Math.floor(janela / 2);
  /* Extremidade replicada, para a janela nunca ficar par: com contagem par a
     mediana escolhe arbitrariamente o vizinho de cima e a borda ganha um degrau
     que a imagem não tem. */
  const em = (k) => {
    const i = Math.max(0, Math.min(serie.length - 1, k));
    return serie[i];
  };
  return serie.map((v, i) => {
    if (v === null) return null;
    const viz = [];
    for (let k = i - meia; k <= i + meia; k += 1) {
      const w = em(k);
      if (w !== null && w !== undefined) viz.push(w);
    }
    if (viz.length === 0) return v;
    viz.sort((a, b) => a - b);
    return viz[Math.floor(viz.length / 2)];
  });
}

/* Envelope superior e inferior de uma vista, em pixel.
   O limiar padrão é alto de propósito: prancha de linha fina é antialiasada, e a
   128 a linha quase horizontal do teto simplesmente desaparecia em algumas
   colunas — o envelope caía para o detalhe de baixo e produzia um salto de 116 px
   onde o carro não tem salto nenhum. */
export function envelope(img, ret, { limiar = 200, suavizar = 5 } = {}) {
  const { largura: W, lum } = img;
  const topo = []; const base = [];
  for (let x = ret.x0; x <= ret.x1; x += 1) {
    let t = null; let b = null;
    for (let y = ret.y0; y <= ret.y1; y += 1) {
      if (lum[y * W + x] < limiar) { if (t === null) t = y; b = y; }
    }
    topo.push(t); base.push(b);
  }
  return {
    topo: suavizar ? suavizarSerie(topo, { janela: suavizar }) : topo,
    base: suavizar ? suavizarSerie(base, { janela: suavizar }) : base,
    x0: ret.x0,
  };
}

/* Calibração por rodas: as manchas de contato com o solo dão os centros de eixo,
   e a distância entre elas é o entre-eixos conhecido. Duas medidas independentes
   — comprimento e altura — voltam como resíduo, que é a honestidade da escala. */
export function calibrarPorRodas(env, ret, { entreEixos, comprimento, altura, larguraMinima = 4 } = {}) {
  const chao = Math.max(...env.base.filter((v) => v !== null));
  const manchas = []; let ini = null;
  env.base.forEach((b, i) => {
    const on = b !== null && b >= chao - 1;
    if (on && ini === null) ini = i;
    if (!on && ini !== null) { manchas.push([ini, i - 1]); ini = null; }
  });
  if (ini !== null) manchas.push([ini, env.base.length - 1]);
  const largas = manchas.filter(([a, b]) => b - a >= larguraMinima);
  if (largas.length < 2) throw new Error(`achei ${largas.length} contato(s) de roda; preciso de 2`);
  const centros = largas.map(([a, b]) => (a + b) / 2 + env.x0);
  const px = Math.abs(centros[centros.length - 1] - centros[0]);
  const mmPorPx = entreEixos / px;
  /* O resíduo é medido contra a TINTA, não contra o retângulo de recorte: o
     recorte é palpite do chamador e qualquer folga nele viraria erro de escala
     que a imagem não tem. */
  const topoTinta = Math.min(...env.topo.filter((v) => v !== null));
  const colunasComTinta = env.topo
    .map((v, i) => (v === null && env.base[i] === null ? null : i + env.x0))
    .filter((v) => v !== null);
  const residuo = {};
  if (comprimento) {
    const medido = Math.round((colunasComTinta[colunasComTinta.length - 1] - colunasComTinta[0]) * mmPorPx);
    residuo.comprimento = { medido, declarado: comprimento };
  }
  if (altura) residuo.altura = { medido: Math.round((chao - topoTinta) * mmPorPx), declarado: altura };
  for (const r of Object.values(residuo)) r.erroRelativo = Number(((r.medido - r.declarado) / r.declarado).toFixed(4));
  return { mmPorPx, chao, centrosPx: centros, zMeioPx: (centros[0] + centros[centros.length - 1]) / 2, residuo };
}

/* Envelope em pixel → polilinha em milímetro, na convenção da Mecanifica:
   z cresce para a frente, y cresce para cima, origem no meio do entre-eixos e no
   solo. `frenteAEsquerda` espelha pranchas desenhadas com o nariz à esquerda. */
export function paraMilimetros(env, cal, { qual = 'topo', frenteAEsquerda = true } = {}) {
  const serie = env[qual];
  const pts = [];
  for (let i = 0; i < serie.length; i += 1) {
    if (serie[i] === null) continue;
    const xPx = i + env.x0;
    const z = (xPx - cal.zMeioPx) * cal.mmPorPx * (frenteAEsquerda ? -1 : 1);
    pts.push([z, (cal.chao - serie[i]) * cal.mmPorPx]);
  }
  pts.sort((a, b) => a[0] - b[0]);
  return pts;
}

/* Reduz a polilinha por Douglas-Peucker: 500 pontos de pixel viram uma dezena de
   estações úteis, sem mover a silhueta além da tolerância pedida. */
export function simplificar(pts, { tolerancia = 6 } = {}) {
  if (pts.length < 3) return pts.map((p) => p.slice());
  const dist = (p, a, b) => {
    const dx = b[0] - a[0]; const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    if (l === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / l;
  };
  const manter = new Array(pts.length).fill(false);
  manter[0] = true; manter[pts.length - 1] = true;
  const pilha = [[0, pts.length - 1]];
  while (pilha.length) {
    const [i, j] = pilha.pop();
    let pior = -1; let d = tolerancia;
    for (let k = i + 1; k < j; k += 1) {
      const dk = dist(pts[k], pts[i], pts[j]);
      if (dk > d) { d = dk; pior = k; }
    }
    if (pior >= 0) { manter[pior] = true; pilha.push([i, pior], [pior, j]); }
  }
  return pts.filter((_, i) => manter[i]).map((p) => [Number(p[0].toFixed(1)), Number(p[1].toFixed(1))]);
}

/* --- comparação ----------------------------------------------------------- */

/* LIMITE MEDIDO, não suposto. Variando a janela de suavização de 1 a 41 px numa
   prancha de 736 px de largura:
     - desvio absoluto médio move de 46 para 39 mm — estável, então COMPARAR
       SILHUETA POR DESVIO É CONFIÁVEL;
     - inversões de curvatura vão de 31 a 51 sem convergir, e suavizar mais piora
       — então CURVATURA VINDA DE RASTER NESTA RESOLUÇÃO É RUÍDO, não forma.
   Use `compararSilhuetas` para julgar proporção e posição. Não conclua nada sobre
   caráter de superfície a partir da curvatura de uma referência rasterizada. */

/* Desvio vertical entre duas silhuetas, estação a estação em z. Só compara onde
   as duas existem; reporta a cobertura para que um trecho faltante não vire
   "erro zero". */
export function compararSilhuetas(referencia, minha, { estacoes = 120 } = {}) {
  const emZ = (pts, z) => {
    let a = null; let b = null;
    for (let i = 1; i < pts.length; i += 1) {
      if (pts[i - 1][0] <= z && pts[i][0] >= z) { a = pts[i - 1]; b = pts[i]; break; }
    }
    if (!a) return null;
    const t = b[0] === a[0] ? 0 : (z - a[0]) / (b[0] - a[0]);
    return a[1] + (b[1] - a[1]) * t;
  };
  const zMin = Math.max(referencia[0][0], minha[0][0]);
  const zMax = Math.min(referencia[referencia.length - 1][0], minha[minha.length - 1][0]);
  const amostras = [];
  for (let i = 0; i <= estacoes; i += 1) {
    const z = zMin + ((zMax - zMin) * i) / estacoes;
    const r = emZ(referencia, z); const m = emZ(minha, z);
    if (r === null || m === null) continue;
    amostras.push({ z, referencia: r, minha: m, desvio: m - r });
  }
  if (amostras.length === 0) throw new Error('as duas silhuetas não se sobrepõem em z');
  const desvios = amostras.map((a) => a.desvio);
  const abs = desvios.map(Math.abs);
  const pior = amostras.reduce((p, a) => (Math.abs(a.desvio) > Math.abs(p.desvio) ? a : p));
  return {
    estacoes: amostras.length,
    faixaZ: [Math.round(zMin), Math.round(zMax)],
    desvioMedio: Number((desvios.reduce((s, v) => s + v, 0) / desvios.length).toFixed(1)),
    desvioAbsMedio: Number((abs.reduce((s, v) => s + v, 0) / abs.length).toFixed(1)),
    desvioMaximo: Number(pior.desvio.toFixed(1)),
    zDoPior: Math.round(pior.z),
    rms: Number(Math.sqrt(desvios.reduce((s, v) => s + v * v, 0) / desvios.length).toFixed(1)),
    amostras,
  };
}
