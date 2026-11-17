#!/usr/bin/env node
/* medir-montagem.mjs — onde a prancha modelo e foto é montada (fatia 1 do plano de comparar com a referência): no Chromium, que
 * decodifica jpg, webp e png, ou em Node, com `pngjs` e a foto convertida para PNG antes (aqui pelo `ffmpeg` do sistema, porque o
 * projeto não declara decodificador de jpg nem de webp).
 *
 * As duas montam a mesma prancha: a foto escalada para a altura da vista e a vista ao lado, gravadas em `<saída>/prancha-navegador.png`
 * e `<saída>/prancha-node.png`. Imprime o tempo de cada etapa em ms. Com `--fidelidade`, compara também os pixels da foto decodificada
 * pelo Chromium (com e sem conversão de cor do perfil ICC) contra os do PNG do `ffmpeg`, em diferença média e máxima por canal; a
 * cópia dos pixels para fora da página pesa no tempo do navegador, que então não vale como medida de tempo.
 *
 * Uso: node docs/modelar/banco-de-provas/comparar-com-a-referencia-2026-11-16/medir-montagem.mjs <foto.jpg|webp> <vista.png> <saída>
 *        [--fidelidade]
 * A foto é de terceiro e fica fora do repositório; a saída também. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { lancarChromium } from '../../../../tools/modelar/navegador.mjs';

const args = process.argv.slice(2);
const fidelidade = args.includes('--fidelidade');
const [foto, vista, saida] = args.filter((a) => !a.startsWith('--'));
if (!saida) { console.log('uso: medir-montagem.mjs <foto.jpg|webp> <vista.png> <saída> [--fidelidade]'); process.exit(1); }
mkdirSync(saida, { recursive: true });
const mime = foto.endsWith('.webp') ? 'image/webp' : foto.endsWith('.png') ? 'image/png' : 'image/jpeg';
const agora = () => performance.now();
const res = {};

/* No navegador: a página sem WebGL, as duas imagens por data URL, a montagem num OffscreenCanvas e o PNG de volta em base64. */
let t = agora();
const browser = await lancarChromium(chromium, { webgl: false });
res.navegador_lancar = agora() - t;
t = agora();
const page = await browser.newPage();
const url = (arquivo, tipo) => `data:${tipo};base64,${readFileSync(arquivo).toString('base64')}`;
const r = await page.evaluate(async ([fotoUrl, vistaUrl, comPixels]) => {
  const carregar = async (u, conv) => createImageBitmap(await (await fetch(u)).blob(), { colorSpaceConversion: conv });
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
  const t0 = performance.now();
  const f = await carregar(fotoUrl, 'default');
  const v = await carregar(vistaUrl, 'none');
  const t1 = performance.now();
  const k = v.height / f.height;
  const fw = Math.round(f.width * k);
  const c = new OffscreenCanvas(fw + v.width, v.height);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(f, 0, 0, fw, v.height);
  g.drawImage(v, fw, 0);
  const png = await c.convertToBlob({ type: 'image/png' });
  const t2 = performance.now();
  const pngB64 = b64(new Uint8Array(await png.arrayBuffer()));
  const t3 = performance.now();
  const pixels = async (conv) => {
    const bm = await carregar(fotoUrl, conv);
    const cc = new OffscreenCanvas(bm.width, bm.height); const gg = cc.getContext('2d'); gg.drawImage(bm, 0, 0);
    return b64(new Uint8Array(gg.getImageData(0, 0, bm.width, bm.height).data.buffer));
  };
  return { decodificar: t1 - t0, compor: t2 - t1, saida: t3 - t2, png: pngB64,
    padrao: comPixels ? await pixels('default') : null, semConversao: comPixels ? await pixels('none') : null };
}, [url(foto, mime), url(vista, 'image/png'), fidelidade]);
res.navegador_decodificar = r.decodificar; res.navegador_compor = r.compor; res.navegador_saida = r.saida;
res.navegador_pagina = agora() - t;
res.navegador_total = res.navegador_lancar + res.navegador_pagina;
writeFileSync(join(saida, 'prancha-navegador.png'), Buffer.from(r.png, 'base64'));
await browser.close();

/* Em Node: a foto convertida para PNG antes, lida pelo pngjs, escalada por interpolação bilinear e colada ao lado da vista. */
t = agora();
const fotoPng = join(saida, 'foto-convertida.png');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', foto, fotoPng]);
res.node_converter = agora() - t;
t = agora();
const fp = PNG.sync.read(readFileSync(fotoPng));
const vp = PNG.sync.read(readFileSync(vista));
res.node_decodificar = agora() - t;
t = agora();
const k = vp.height / fp.height;
const fw = Math.round(fp.width * k);
const out = new PNG({ width: fw + vp.width, height: vp.height });
for (let y = 0; y < vp.height; y++) {
  for (let x = 0; x < fw; x++) {
    const sx = (x + 0.5) / k - 0.5; const sy = (y + 0.5) / k - 0.5;
    const x0 = Math.max(0, Math.floor(sx)); const y0 = Math.max(0, Math.floor(sy));
    const x1 = Math.min(fp.width - 1, x0 + 1); const y1 = Math.min(fp.height - 1, y0 + 1);
    const dx = Math.min(1, Math.max(0, sx - x0)); const dy = Math.min(1, Math.max(0, sy - y0));
    for (let c = 0; c < 4; c++) {
      const p = (xx, yy) => fp.data[(yy * fp.width + xx) * 4 + c];
      out.data[(y * out.width + x) * 4 + c] = Math.round(p(x0, y0) * (1 - dx) * (1 - dy) + p(x1, y0) * dx * (1 - dy)
        + p(x0, y1) * (1 - dx) * dy + p(x1, y1) * dx * dy);
    }
  }
  vp.data.copy(out.data, (y * out.width + fw) * 4, y * vp.width * 4, (y + 1) * vp.width * 4);
}
writeFileSync(join(saida, 'prancha-node.png'), PNG.sync.write(out));
res.node_compor = agora() - t;
res.node_total = res.node_converter + res.node_decodificar + res.node_compor;

const medida = Object.fromEntries(Object.entries(res).map(([n, v]) => [`${n}_ms`, Math.round(v)]));
if (fidelidade) {
  const dif = (b64) => {
    const a = Buffer.from(b64, 'base64'); let soma = 0; let max = 0; let n = 0;
    for (let i = 0; i < a.length; i++) { if (i % 4 === 3) continue; const d = Math.abs(a[i] - fp.data[i]); soma += d; max = Math.max(max, d); n++; }
    return { media: Number((soma / n).toFixed(3)), max };
  };
  medida.pixels_navegador_contra_ffmpeg = dif(r.padrao);
  medida.pixels_navegador_sem_icc_contra_ffmpeg = dif(r.semConversao);
}
console.log(JSON.stringify({ foto: foto.split('/').pop(), largura: out.width, altura: out.height, ...medida }));
