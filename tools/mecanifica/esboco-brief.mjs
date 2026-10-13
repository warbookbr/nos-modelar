/* O que o brief do crítico cego do esboço junta às imagens da unidade, do Marco e do objeto: o arquivo `brief.md` ao lado das
   imagens (o brief só saía na tela, e o do Marco não se reimprimia) e a referência que a pessoa escolheu, inteira ou recortada
   em torno da unidade (o crítico julgava sem ela e reprovou duas vezes o cone de cauda do avião como agulha, e o esbocista o
   alargou de 12% a 100% além da `topo.png`). Lê e grava arquivo; o desenho das vistas continua em `esboco.mjs`. */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { PNG } from 'pngjs';
import { VISTAS_TODAS } from '../../modulos/esboco/src/index.js';
import { lerPlano } from '../../modulos/esboco/src/plano.js';
import { linhaDaVista } from '../../modulos/esboco/src/lados.js';
import { vistaDoMesmoOlho } from '../../modulos/esboco/src/referencia.js';

export const MARCA_DO_BRIEF = '--- brief para o crítico cego ---';
export const FIM_DO_BRIEF = '--- fim do brief ---';

/* `brief.md` na pasta das imagens: o texto entre as marcas, que é o que o agente `critico-visual` recebe (as linhas antes
   delas são do despacho). Devolve o caminho. */
export function gravarBrief(pasta, linhas) {
  const i = linhas.indexOf(MARCA_DO_BRIEF);
  const j = linhas.lastIndexOf(FIM_DO_BRIEF);
  const destino = join(pasta, 'brief.md');
  writeFileSync(destino, `${linhas.slice(i < 0 ? 0 : i, j < 0 ? linhas.length : j + 1).join('\n')}\n`);
  return destino;
}

/* As vistas de outros lados que a unidade pede em `unidades.<id>.vistas` do esboço mestre (lista vazia sem o campo). */
export const vistasDaUnidade = (bruto, id) => (Array.isArray(bruto?.unidades?.[id]?.vistas) ? bruto.unidades[id].vistas : []);

/* O `plano.orientacao` do esboço (a frente do objeto), ou null. */
export const orientacaoDoEsboco = (bruto) => lerPlano(bruto?.plano)?.orientacao ?? null;

/* (h, v) da referência para (u, w) da tela do esboço, e o contrário (cada um é o seu próprio inverso): ver `referencia.js`. */
const TELA = { frontal: (a, b) => [a, -b], lateral: (a, b) => [-a, -b], superior: (a, b) => [a, -b] };
/* O eixo do mundo que cada direção da referência mede em cada vista. */
const EIXOS = { frontal: { h: 'x', v: 'y' }, lateral: { h: 'z', v: 'y' }, superior: { h: 'x', v: 'z' } };

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

/* A imagem PNG que um JSON de contornos veio de ler: o PNG que tem o hash gravado em `imagem.sha256`, procurado ao lado do JSON,
   ao lado do esboço e nas pastas `referencias` deles (no avião o contorno de conferência fica junto do esboço e as imagens em
   `../referencias`). Null quando nenhum bate. */
export function pngDoContorno(json, caminhoDoJson, pastaDoEsboco) {
  const hash = json?.imagem?.sha256;
  if (typeof hash !== 'string') return null;
  const aqui = dirname(caminhoDoJson);
  const pastas = [...new Set([aqui, pastaDoEsboco, join(aqui, 'referencias'), join(aqui, '..', 'referencias'), join(pastaDoEsboco, 'referencias'), join(pastaDoEsboco, '..', 'referencias')].map((p) => resolve(p)))];
  for (const pasta of pastas) {
    let nomes;
    try { nomes = readdirSync(pasta).filter((n) => extname(n).toLowerCase() === '.png').sort(); } catch { continue; }
    for (const n of nomes) { if (sha256(readFileSync(join(pasta, n))) === hash) return join(pasta, n); }
  }
  return null;
}

/* O ajuste linear de px para mm de um JSON de contornos, pelos pontos da silhueta (`contornoPx` e `contornoMm` são o mesmo
   contorno nas duas unidades): h = ah * px + bh e v = av * py + bv, ou null sem os pares. Mínimos quadrados em cada eixo. */
export function calibracaoDoContorno(json) {
  const px = json?.silhueta?.contornoPx;
  const mm = json?.silhueta?.contornoMm;
  if (!Array.isArray(px) || !Array.isArray(mm) || px.length !== mm.length || px.length < 2) return null;
  const ajuste = (k) => {
    const n = px.length;
    let sx = 0; let sy = 0; let sxx = 0; let sxy = 0;
    for (let i = 0; i < n; i++) { const x = px[i][k]; const y = mm[i][k]; sx += x; sy += y; sxx += x * x; sxy += x * y; }
    const den = n * sxx - sx * sx;
    if (Math.abs(den) < 1e-9) return null;
    const a = (n * sxy - sx * sy) / den;
    return Number.isFinite(a) && a !== 0 ? [a, (sy - a * sx) / n] : null;
  };
  const h = ajuste(0);
  const v = ajuste(1);
  return h && v ? { ah: h[0], bh: h[1], av: v[0], bv: v[1] } : null;
}

/* A caixa da unidade na imagem da referência, em pixel [x0, y0, x1, y1] (arredondada para fora, presa à imagem), com a mesma
   margem do enquadramento da vista (15% do maior lado, no mínimo 5 mm). `caixa` é { min, max } em mm do mundo, `deslocamento` o
   da entrada (o valor soma à coordenada da referência para trazê-la à origem do esboço). Null quando a caixa não cai na imagem. */
export function caixaNaImagem({ caixa, vista, calibracao, deslocamento = {}, largura, altura }) {
  const e = EIXOS[vista];
  const cantos = [];
  for (const x of [caixa.min[0], caixa.max[0]]) for (const y of [caixa.min[1], caixa.max[1]]) for (const z of [caixa.min[2], caixa.max[2]]) cantos.push([x, y, z]);
  const pontos = cantos.map((c) => { const [u, w] = VISTAS_TODAS[vista].p(c); return TELA[vista](u, w); });
  /* esboço = referência + deslocamento; na superior o v é menos z, e somar z a uma posição subtrai de v */
  const dh = deslocamento[e.h] ?? 0;
  const dv = vista === 'superior' ? -(deslocamento.z ?? 0) : (deslocamento[e.v] ?? 0);
  const hs = pontos.map((p) => p[0] - dh);
  const vs = pontos.map((p) => p[1] - dv);
  const [h0, h1, v0, v1] = [Math.min(...hs), Math.max(...hs), Math.min(...vs), Math.max(...vs)];
  const margem = Math.max(5, 0.15 * Math.max(h1 - h0, v1 - v0));
  const xs = [(h0 - margem - calibracao.bh) / calibracao.ah, (h1 + margem - calibracao.bh) / calibracao.ah];
  const ys = [(v0 - margem - calibracao.bv) / calibracao.av, (v1 + margem - calibracao.bv) / calibracao.av];
  const x0 = Math.max(0, Math.floor(Math.min(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const x1 = Math.min(largura - 1, Math.ceil(Math.max(...xs)));
  const y1 = Math.min(altura - 1, Math.ceil(Math.max(...ys)));
  return x1 > x0 && y1 > y0 ? [x0, y0, x1, y1] : null;
}

/* O recorte [x0, y0, x1, y1] (inclusive) de um PNG, ampliado por interpolação bilinear em `fator` vezes: uma unidade de 1,7 m numa
   imagem de 23 mm por pixel tem 70 px de largura, e o crítico a leria como um borrão sem a ampliação. */
export function recortarPng(png, [x0, y0, x1, y1], fator = 1) {
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const saida = new PNG({ width: w * fator, height: h * fator });
  const px = (x, y, k) => png.data[((Math.min(y1, Math.max(y0, y)) * png.width + Math.min(x1, Math.max(x0, x))) << 2) + k];
  for (let j = 0; j < h * fator; j++) {
    for (let i = 0; i < w * fator; i++) {
      const fx = x0 + (i + 0.5) / fator - 0.5;
      const fy = y0 + (j + 0.5) / fator - 0.5;
      const ix = Math.floor(fx); const iy = Math.floor(fy);
      const tx = fx - ix; const ty = fy - iy;
      const o = (j * w * fator + i) << 2;
      for (let k = 0; k < 4; k++) {
        const a = px(ix, iy, k) * (1 - tx) + px(ix + 1, iy, k) * tx;
        const b = px(ix, iy + 1, k) * (1 - tx) + px(ix + 1, iy + 1, k) * tx;
        saida.data[o + k] = Math.round(a * (1 - ty) + b * ty);
      }
      saida.data[o + 3] = 255;
    }
  }
  return saida;
}

/* A ampliação do recorte: o maior lado chega perto de 900 px, em no máximo 8 vezes. */
const fatorDoRecorte = (w, h) => Math.max(1, Math.min(8, Math.round(900 / Math.max(w, h))));

/* As entradas de `plano.referencia` que valem para a primeira opção (a que o brief mostra). */
function entradasDaReferencia(bruto) {
  const titulo = bruto?.opcoes?.[0]?.titulo;
  return (lerPlano(bruto?.plano)?.referencia ?? []).filter((e) => e.opcoes === undefined || e.opcoes.some((q) => q === 1 || q === titulo));
}

/* As vistas de outros lados que as referências do plano pedem para ter par: a vista de mesmo olho que cada imagem (ver
   `vistaDoMesmoOlho`), quando não é uma das quatro de sempre, sem repetir. Cada brief as junta às imagens que desenha (as da
   unidade, ou as do objeto inteiro), para o crítico comparar a referência com a vista que olha do lado dela sem inferir nada. */
export function vistasDaReferencia(bruto) {
  const orientacao = orientacaoDoEsboco(bruto);
  return [...new Set(entradasDaReferencia(bruto).map((e) => vistaDoMesmoOlho(e.vista, orientacao)).filter((o) => o.oposta).map((o) => o.vista))];
}

/* A linha que diz com qual vista do esboço a imagem se compara: a de mesmo olho que ela, com o que essa vista vê e onde caem os
   eixos, e, quando não é a de mesmo nome, que a de mesmo nome olha do lado contrário. */
function linhaDeComparacao(entrada, orientacao) {
  const o = vistaDoMesmoOlho(entrada.vista, orientacao);
  const descricao = linhaDaVista(o.vista, orientacao).slice(o.vista.length + 2);
  if (!o.oposta) return `    compare com a vista ${o.vista} do esboço (${descricao})`;
  return `    compare com a vista ${o.vista} do esboço (${descricao}); ${o.motivo}. A vista ${entrada.vista} olha do lado contrário e não é a desta imagem`;
}

/* A referência no brief: para cada entrada de `plano.referencia`, a imagem (a do PNG declarado, ou a que o JSON de contornos
   veio de ler) inteira, ou recortada em torno da unidade quando há `caixa` (a caixa da unidade em mm do mundo) e o contorno
   permite calibrar. Grava os recortes em `pasta` como `referencia-<vista><sufixo>.png`. Devolve { linhas, arquivos } (linhas
   vazias sem `plano.referencia`, e então o brief fica como era). `base` é a pasta do esboço, de onde saem os caminhos. */
export function referenciaDoBrief({ bruto, base, pasta, caixa = null, sufixo = '' }) {
  const entradas = entradasDaReferencia(bruto);
  if (entradas.length === 0) return { linhas: [], arquivos: [] };
  const aqui = (c) => (isAbsolute(c) ? c : resolve(base, c));
  const orientacao = orientacaoDoEsboco(bruto);
  const linhas = [`Referência (o alvo da forma: a imagem que a pessoa escolheu, de outra escala e sem a divisão em unidades; cada uma está na orientação da vista do esboço que a linha dela manda comparar, a que olha do mesmo lado que a imagem, e que não é sempre a de mesmo nome). Onde a vista concorda com ela, o que parece estranho na imagem é a forma pedida e não defeito; aponte onde a silhueta ou a proporção se afastam dela${caixa ? ' (as imagens estão recortadas em torno da unidade, com a margem de sempre, e ampliadas)' : ''}:`];
  const arquivos = [];
  for (const e of entradas) {
    const caminho = aqui(e.arquivo);
    let png = null;
    let calibracao = null;
    if (existsSync(caminho)) {
      if (extname(caminho).toLowerCase() === '.png') png = caminho;
      else {
        let json = null;
        try { json = JSON.parse(readFileSync(caminho, 'utf8')); } catch { /* o gate da referência já recusa um JSON ilegível */ }
        png = json ? pngDoContorno(json, caminho, base) : null;
        calibracao = json ? calibracaoDoContorno(json) : null;
      }
    }
    if (png === null) { linhas.push(`  ${e.vista}: a imagem de "${e.arquivo}" não foi achada (declare o PNG em plano.referencia.arquivo, ou ponha o PNG ao lado do contorno ou em uma pasta referencias)`); continue; }
    const compara = linhaDeComparacao(e, orientacao);
    if (caixa && calibracao && e.recorte === undefined) {
      const lida = PNG.sync.read(readFileSync(png));
      const px = caixaNaImagem({ caixa, vista: e.vista, calibracao, deslocamento: e.deslocamento ?? {}, largura: lida.width, altura: lida.height });
      if (px !== null) {
        const f = fatorDoRecorte(px[2] - px[0] + 1, px[3] - px[1] + 1);
        const destino = join(pasta, `referencia-${e.vista}${sufixo}.png`);
        writeFileSync(destino, PNG.sync.write(recortarPng(lida, px, f)));
        linhas.push(`  ${e.vista}, recortada em torno da unidade: ${destino}`, compara);
        arquivos.push(destino);
        continue;
      }
    }
    if (e.recorte !== undefined) {
      /* o `recorte` declarado é a área da imagem que conta (a do contorno), em pixels */
      const lida = PNG.sync.read(readFileSync(png));
      const r = [Math.max(0, e.recorte[0]), Math.max(0, e.recorte[1]), Math.min(lida.width - 1, e.recorte[2]), Math.min(lida.height - 1, e.recorte[3])];
      const destino = join(pasta, `referencia-${e.vista}${sufixo}.png`);
      writeFileSync(destino, PNG.sync.write(recortarPng(lida, r, 1)));
      linhas.push(`  ${e.vista}, recortada na área declarada em plano.referencia: ${destino}`, compara);
      arquivos.push(destino);
      continue;
    }
    linhas.push(`  ${e.vista}, inteira: ${png}`, compara);
    arquivos.push(png);
  }
  return { linhas, arquivos };
}
