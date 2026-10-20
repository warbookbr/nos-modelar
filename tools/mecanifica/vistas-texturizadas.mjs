#!/usr/bin/env node
/* vistas-texturizadas.mjs — três vistas de uma peça do acervo COM a textura que a exportação OBJ gera, para quem precisa julgar o
   acabamento (eletrodoméstico, madeira, tecido) e não só a forma.

   Uso: node tools/mecanifica/vistas-texturizadas.mjs <receita.js> [--saida <arquivo.png>]

   A peça é exportada pelo mesmo caminho do Blender (`exportar-obj --com-textura`: .obj, .mtl e uma imagem por material) numa pasta
   temporária, e o navegador do Playwright a abre com o three.js (OBJLoader e MTLLoader) a partir de um servidor local. Então o que se
   vê é o que o Blender receberia, com a mesma coordenada de textura. Quadros: isométrica frente-direita, isométrica trás-esquerda e
   frontal. A frente da peça é +z, y é para cima. */
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportarArquivoObj } from './exportar-obj.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const TIPOS = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.obj': 'text/plain', '.mtl': 'text/plain', '.html': 'text/html' };

const PAGINA = `<!doctype html><html><body style="margin:0;background:#f4f2ee">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
const base = new URLSearchParams(location.search).get('obj');
const W = 560, H = 560;
const mtl = await new MTLLoader().setPath('/obj/').loadAsync(base + '.mtl');
mtl.preload();
for (const m of Object.values(mtl.materials)) { m.side = THREE.DoubleSide; if (m.map) { m.map.colorSpace = THREE.SRGBColorSpace; m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; } }
/* O MTLLoader lê Ns e Ks (brilho do módulo de textura) num MeshPhongMaterial; sem Ks o material fica fosco como antes. */
const objeto = await new OBJLoader().setMaterials(mtl).setPath('/obj/').loadAsync(base + '.obj');
/* O MTLLoader devolve o material antes de as imagens chegarem; renderizar nessa hora pinta a peça de preto. */
const mapas = Object.values(mtl.materials).map((m) => m.map).filter(Boolean);
for (let t = 0; t < 600 && !mapas.every((m) => m.image && m.image.width > 0); t += 1) await new Promise((r) => setTimeout(r, 50));
mapas.forEach((m) => { m.needsUpdate = true; });
const caixa = new THREE.Box3().setFromObject(objeto);
const centro = caixa.getCenter(new THREE.Vector3()); const tam = caixa.getSize(new THREE.Vector3());
const raio = tam.length() / 2;
/* Cada vista leva a normal da face principal: a luz de reflexo é posta no espelhamento da câmera por essa normal, para que o brilho
   (Ks e Ns do .mtl) apareça como reflexo nessa face; o material fosco quase não responde a ela. */
const vistas = [['isométrica frente-direita', [1, 0.8, 1], [0, 0, 1]], ['isométrica trás-esquerda', [-1, 0.8, -1], [0, 0, -1]], ['frontal', [0, 0.15, 1], [0, 0, 1]]];
const render = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
render.setSize(W * 3, H); render.setScissorTest(true); render.setClearColor(0xf4f2ee);
render.outputColorSpace = THREE.SRGBColorSpace;
const cena = new THREE.Scene(); cena.add(objeto);
cena.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 1.6));
const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(2, 4, 3); cena.add(sol);
const sol2 = new THREE.DirectionalLight(0xffffff, 0.7); sol2.position.set(-3, 2, -2); cena.add(sol2);
const reflexo = new THREE.DirectionalLight(0xffffff, 0.4); cena.add(reflexo);
vistas.forEach(([, d, n], i) => {
  const cam = new THREE.OrthographicCamera(-raio * 1.1, raio * 1.1, raio * 1.1, -raio * 1.1, 0.01, raio * 20);
  const dir = new THREE.Vector3(...d).normalize().multiplyScalar(raio * 5);
  cam.position.copy(centro).add(dir); cam.lookAt(centro);
  const v = new THREE.Vector3(...d).normalize(); const nf = new THREE.Vector3(...n);
  reflexo.position.copy(nf.multiplyScalar(2 * v.dot(nf)).sub(v).multiplyScalar(raio * 5).add(centro)); reflexo.target.position.copy(centro); reflexo.target.updateMatrixWorld();
  render.setViewport(i * W, 0, W, H); render.setScissor(i * W, 0, W, H); render.render(cena, cam);
});
document.body.appendChild(render.domElement);
window.__pronto = true;
</script></body></html>`;

export async function vistasTexturizadas(arquivo, saidaPng) {
  const { chromium } = await import('playwright');
  const pasta = mkdtempSync(join(tmpdir(), 'vistas-tex-'));
  const stem = basename(arquivo, extname(arquivo)) === 'receita' ? basename(resolve(arquivo, '..')) : basename(arquivo, extname(arquivo));
  const obj = join(pasta, `${stem}.obj`);
  await exportarArquivoObj({ arquivo, saida: obj, unidade: 'm', comTextura: true, sobrescrever: true });
  const servidor = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let caminho;
    if (url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGINA); return; }
    if (url.pathname.startsWith('/three/')) caminho = join(REPO, 'node_modules/three', url.pathname.slice(7));
    else if (url.pathname.startsWith('/obj/')) caminho = join(pasta, decodeURIComponent(url.pathname.slice(5)));
    if (!caminho || !existsSync(caminho)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[extname(caminho)] ?? 'application/octet-stream' }); res.end(readFileSync(caminho));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  const porta = servidor.address().port;
  const navegador = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const pg = await navegador.newPage({ viewport: { width: 1680, height: 560 } });
    const erros = [];
    pg.on('pageerror', (e) => erros.push(String(e)));
    pg.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
    pg.on('response', (r) => { if (r.status() >= 400) erros.push(`${r.status()} ${r.url().replace(/^http:\/\/127\.0\.0\.1:\d+/, '')}`); });
    await pg.goto(`http://127.0.0.1:${porta}/?obj=${encodeURIComponent(stem)}`);
    await pg.waitForFunction('window.__pronto === true', null, { timeout: 60000 }).catch(() => { throw new Error(`a página não ficou pronta: ${erros.join(' | ')}`); });
    await pg.waitForTimeout(500);
    await pg.screenshot({ path: saidaPng });
    if (erros.length) console.error('avisos da página:', erros.slice(0, 3).join(' | '));
  } finally {
    await navegador.close(); servidor.close(); rmSync(pasta, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const arquivo = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--saida');
  const i = args.indexOf('--saida');
  if (!arquivo) { console.error('uso: node tools/mecanifica/vistas-texturizadas.mjs <receita.js> [--saida <arquivo.png>]'); process.exit(2); }
  const saida = i >= 0 ? args[i + 1] : `${basename(arquivo, '.js')}-textura.png`;
  await vistasTexturizadas(resolve(arquivo), resolve(saida));
  console.log(`vistas: ${saida}`);
}
