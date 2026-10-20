#!/usr/bin/env node
/* modelo-de-referencia.mjs — estuda uma malha de terceiros (OBJ, FBX ou glTF) como REFERÊNCIA de forma, sem a levar ao repositório.

   Uso: node tools/mecanifica/modelo-de-referencia.mjs <arquivo.obj|fbx|glb> --saida <pasta> [--comprimento <m>] [--escala <fator>] [--girar <graus>] [--frente +z|-z] [--cor <#rrggbb>]

   A malha é lida no navegador do Playwright com o three.js (OBJLoader, FBXLoader e GLTFLoader), endireitada (o eixo mais comprido na horizontal vira z, o chão em
   y = 0, centrada em x e z) e escalada para que esse comprimento tenha `--comprimento` metros, ou multiplicada por `--escala` (padrão: o que a malha traz). `--girar` gira em torno de y
   depois de endireitar, para pôr a frente em +z. Escreve em `<saida>/`: `vistas.png` (isométrica frente-direita, lateral direita com a frente à esquerda,
   frontal e de cima com a frente embaixo, cada uma em ortográfica) e `partes.json` com a caixa de cada malha da peça (nome, mínimo, máximo e
   triângulos, em metro) mais o campo `frente`: de que lado fica a frente do modelo, tirado das partes nomeadas (rodas, faróis, para-brisa) ou DECLARADO
   com `--frente` (o lado em que a frente fica na malha endireitada, antes de `--girar`; obrigatório quando a malha é uma peça só e o nome não diz). Se a frente não
   fechar em +z, a ferramenta recusa e diz o giro que falta, e não grava nada. Serve para o modelador estudar proporções e partes e comparar a própria receita; nada da malha de terceiros é gravado fora da
   pasta de saída, e `*.obj`, `*.mtl` e `importados/` já ficam fora do git. */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decidirFrente } from './frente-da-fonte.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** As quatro câmeras de `vistas.png`: posição relativa ao centro (a câmera olha para o centro) e vetor para cima. A folha comparativa renderiza a receita com as mesmas. */
export const VISTAS_DA_FONTE = [['isométrica frente-direita', [1, 0.7, 1.2], [0, 1, 0]], ['lateral direita (frente à esquerda)', [1, 0, 0], [0, 1, 0]], ['frontal (de frente)', [0, 0, 1], [0, 1, 0]], ['de cima (frente embaixo)', [0, 1, 0], [0, 0, -1]]];
/** O quadro de cada vista em `vistas.png`, em pixel: 640 por 480, no canto (coluna, linha) da folha de 1280 por 960. */
export const QUADRO_DA_FONTE = { W: 640, H: 480, folga: 1.1 };
/** O centro da caixa e o raio (metade da diagonal) com que as câmeras ortográficas da fonte enquadram: a meia altura visível é `raio * folga`. Entrada: o campo `total` do `partes.json`, em metro. */
export function enquadramentoDaFonte(total) {
  const t = total.tamanho;
  return { centro: [0, 1, 2].map((i) => (total.minimo[i] + total.maximo[i]) / 2), raio: Math.hypot(...t) / 2 };
}

const PAGINA = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#f4f2ee;font-family:sans-serif">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { extensoesPorFatia, fatiasIguais } from '/silhueta.mjs';
const p = new URLSearchParams(location.search);
const arq = p.get('arq'); const comprimento = parseFloat(p.get('comprimento') || '0'); const fator = parseFloat(p.get('fator') || '0'); const girar = parseFloat(p.get('girar') || '0'); const cor = p.get('cor');
const raiz = arq.endsWith('.obj') ? await new OBJLoader().loadAsync('/modelo/' + arq) : (arq.endsWith('.glb') || arq.endsWith('.gltf')) ? (await new GLTFLoader().loadAsync('/modelo/' + arq)).scene : await new FBXLoader().loadAsync('/modelo/' + arq);
raiz.traverse((c) => { if (c.isMesh) { const ms = Array.isArray(c.material) ? c.material : [c.material]; ms.forEach((m) => { if (m) { m.side = THREE.DoubleSide; if (cor && m.color && m.color.getHex() === 0xffffff && !m.map) m.color = new THREE.Color(cor); } }); } });
/* As imagens de textura chegam depois do modelo; renderizar antes disso pinta tudo de cinza. */
const mapas = []; raiz.traverse((c) => { if (c.isMesh) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => { if (m && m.map) mapas.push(m.map); }); });
for (let i = 0; i < 400 && !mapas.every((m) => (m.image && (m.image.width > 0 || m.image.naturalWidth > 0))); i += 1) await new Promise((ok) => setTimeout(ok, 50));
mapas.forEach((m) => { m.needsUpdate = true; });
const grupo = new THREE.Group(); grupo.add(raiz); const cena = new THREE.Scene(); cena.add(grupo);
let b = new THREE.Box3().setFromObject(grupo); let t = b.getSize(new THREE.Vector3());
if (t.x > t.z) grupo.rotation.y = Math.PI / 2;
grupo.rotation.y += girar * Math.PI / 180; grupo.updateMatrixWorld(true);
b = new THREE.Box3().setFromObject(grupo); t = b.getSize(new THREE.Vector3());
const escala = fator > 0 ? fator : comprimento > 0 ? comprimento / t.z : 1; grupo.scale.setScalar(escala); grupo.updateMatrixWorld(true);
b = new THREE.Box3().setFromObject(grupo); const c0 = b.getCenter(new THREE.Vector3()); grupo.position.set(-c0.x, -b.min.y, -c0.z); grupo.updateMatrixWorld(true);
b = new THREE.Box3().setFromObject(grupo); t = b.getSize(new THREE.Vector3()); const centro = b.getCenter(new THREE.Vector3());
const mm = (v) => +v.toFixed(4);
const partes = []; grupo.traverse((c) => { if (c.isMesh) { const bb = new THREE.Box3().setFromObject(c); const pos = c.geometry.attributes.position; const idx = c.geometry.index; partes.push({ nome: c.name || c.parent?.name || 'sem-nome', minimo: bb.min.toArray().map(mm), maximo: bb.max.toArray().map(mm), triangulos: idx ? idx.count / 3 : pos.count / 3 }); } });
/* Silhuetas em fatias, medidas na SUPERFÍCIE: cada triângulo da malha já endireitada é recortado contra os limites da fatia e os pontos resultantes dão a extensão
   (em y e x por fatia em z; em x e z por fatia em y), em metro. Vértices só não bastam: triângulo grande deixa fatias sem vértice. É o alvo numérico que a receita
   compara com comparar-silhueta.mjs. */
const NZ = 48, NY = 24; const tris = []; const va = new THREE.Vector3();
grupo.traverse((c) => { if (!c.isMesh) return; const pos = c.geometry.attributes.position; const idx = c.geometry.index; const n = idx ? idx.count : pos.count;
  const pt = (k) => { va.fromBufferAttribute(pos, idx ? idx.getX(k) : k).applyMatrix4(c.matrixWorld); return [va.x, va.y, va.z]; };
  for (let k = 0; k + 2 < n; k += 3) tris.push([pt(k), pt(k + 1), pt(k + 2)]); });
const fat = (eixo, lo, hi, n, ch) => { const fs = fatiasIguais(lo, hi, n); const ex = extensoesPorFatia(tris, eixo, fs); return fs.map((f, i) => ({ de: mm(f.de), ate: mm(f.ate), ...Object.fromEntries(ch.map(([k, tipo, e]) => [k, ex[i] ? mm(ex[i][tipo][e]) : null])) })); };
window.__silhueta = { metodo: 'superficie', porFatiaEmZ: fat(2, b.min.z, b.max.z, NZ, [['ymin', 'min', 1], ['ymax', 'max', 1], ['xmin', 'min', 0], ['xmax', 'max', 0]]), porFatiaEmY: fat(1, b.min.y, b.max.y, NY, [['xmin', 'min', 0], ['xmax', 'max', 0], ['zmin', 'min', 2], ['zmax', 'max', 2]]) };
window.__partes = { escala: mm(escala), total: { minimo: b.min.toArray().map(mm), maximo: b.max.toArray().map(mm), tamanho: t.toArray().map(mm) }, partes };
cena.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.5)); const d = new THREE.DirectionalLight(0xffffff, 1.8); d.position.set(3, 5, 4); cena.add(d);
const W = ${QUADRO_DA_FONTE.W}, H = ${QUADRO_DA_FONTE.H}; const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W * 2, H * 2); r.setScissorTest(true); r.setClearColor(0xf4f2ee); r.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(r.domElement);
const raio = t.length() / 2;
const vistas = ${JSON.stringify(VISTAS_DA_FONTE)};
vistas.forEach(([, dir, up], i) => {
  const cam = new THREE.OrthographicCamera(-raio * ${QUADRO_DA_FONTE.folga} * W / H, raio * ${QUADRO_DA_FONTE.folga} * W / H, raio * ${QUADRO_DA_FONTE.folga}, -raio * ${QUADRO_DA_FONTE.folga}, 0.01, raio * 30);
  cam.up.set(...up); cam.position.copy(centro).add(new THREE.Vector3(...dir).normalize().multiplyScalar(raio * 5)); cam.lookAt(centro);
  const x = (i % 2) * W, y = (1 - Math.floor(i / 2)) * H; r.setViewport(x, y, W, H); r.setScissor(x, y, W, H); r.render(cena, cam);
  const e = document.createElement('div'); e.textContent = vistas[i][0]; e.style.cssText = 'position:absolute;background:#f4f2eecc;padding:2px 6px;font-size:14px;left:' + (x + 6) + 'px;top:' + (Math.floor(i / 2) * H + 6) + 'px'; document.body.appendChild(e);
});
window.__ok = true;
</script></body></html>`;

export async function modeloDeReferencia(arquivo, pastaSaida, { comprimento = 0, fator = 0, girar = 0, cor = '', frente = null } = {}) {
  const { chromium } = await import('playwright');
  const abs = resolve(arquivo); const raizDoArquivo = dirname(abs); const nome = abs.slice(raizDoArquivo.length + 1);
  const servidor = createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); let c;
    if (u.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    if (u.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGINA); return; }
    if (u.pathname === '/silhueta.mjs') c = join(REPO, 'tools/mecanifica/silhueta-da-superficie.mjs');
    else if (u.pathname.startsWith('/three/')) c = join(REPO, 'node_modules/three', u.pathname.slice(7));
    else if (u.pathname.startsWith('/modelo/')) c = join(raizDoArquivo, decodeURIComponent(u.pathname.slice(8)));
    if (!c || !existsSync(c)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png' }[extname(c)] ?? 'application/octet-stream' }); res.end(readFileSync(c));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  const navegador = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const pg = await navegador.newPage({ viewport: { width: 1280, height: 960 } });
    const erros = []; pg.on('pageerror', (e) => erros.push(String(e)));
    await pg.goto(`http://127.0.0.1:${servidor.address().port}/?arq=${encodeURIComponent(nome)}&comprimento=${comprimento}&fator=${fator}&girar=${girar}&cor=${encodeURIComponent(cor)}`);
    await pg.waitForFunction('window.__ok === true', null, { timeout: 120000 }).catch(() => { throw new Error(`a página não ficou pronta: ${erros.join(' | ')}`); });
    await pg.waitForTimeout(500);
    const partes = await pg.evaluate('window.__partes'); const silhueta = await pg.evaluate('window.__silhueta');
    /* A frente é decidida ANTES de gravar qualquer coisa: fonte com a frente fora de +z ou sem frente conferida não produz arquivo. */
    const frenteDecidida = decidirFrente(partes.partes, { declarada: frente, girar });
    mkdirSync(pastaSaida, { recursive: true });
    await pg.screenshot({ path: join(pastaSaida, 'vistas.png') });
    writeFileSync(join(pastaSaida, 'partes.json'), `${JSON.stringify({ arquivo: nome, comprimentoMetros: comprimento || null, frente: frenteDecidida, ...partes, silhueta }, null, 1)}\n`);
    return partes;
  } finally { await navegador.close(); servidor.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2); const valor = (f) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : null; };
  const arquivo = a.find((x, i) => !x.startsWith('--') && !['--saida', '--comprimento', '--escala', '--girar', '--cor', '--frente'].includes(a[i - 1]));
  if (!arquivo || !valor('--saida')) { console.error('uso: node tools/mecanifica/modelo-de-referencia.mjs <arquivo.obj|fbx> --saida <pasta> [--comprimento <m>] [--escala <fator>] [--girar <graus>] [--frente +z|-z] [--cor <#rrggbb>]'); process.exit(2); }
  let r;
  try { r = await modeloDeReferencia(arquivo, resolve(valor('--saida')), { comprimento: parseFloat(valor('--comprimento') ?? '0'), fator: parseFloat(valor('--escala') ?? '0'), girar: parseFloat(valor('--girar') ?? '0'), cor: valor('--cor') ?? '', frente: valor('--frente') }); } catch (e) { console.error(`modelo-de-referencia: ${e.message}`); process.exit(2); }
  console.log(`${r.partes.length} malhas; tamanho total (m): x ${r.total.tamanho[0]}, y ${r.total.tamanho[1]}, z ${r.total.tamanho[2]}; escala ${r.escala}`);
}
