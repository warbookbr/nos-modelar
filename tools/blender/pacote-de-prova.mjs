/* pacote-de-prova.mjs — monta, sem Blender, um pacote cego desenhado pelo próprio imagens.py a partir do prisma de prova
   (prisma-de-prova.mjs), para os testes das leituras do pacote (leitura-do-pacote.test.mjs e comparar-vincos.test.mjs): os
   cortes com as cotas, os anéis e as linhas de ligação por cima do traço, e as vistas de linhas de frente, lado e topo com a
   grade, o título e a barra por cima, com linhas que caem sobre a grade. Só precisa de python3 com Pillow e numpy. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAIXA, bordaDeCorte, corte, eixosDaCamera, visivel, vincos } from './prisma-de-prova.mjs';

const AQUI = fileURLToPath(new URL('.', import.meta.url));
export const temPillow = spawnSync('python3', ['-I', '-c', 'import PIL, numpy'], { encoding: 'utf8' }).status === 0;
export const W = 1400;
export const H = 1050;
export const CORTES = [{ nome: 'secao', eixo: 'z', valor: 0.5, eixos_uv: ['x', 'y'] }, { nome: 'longitudinal', eixo: 'x', valor: 0.15, eixos_uv: ['z', 'y'] }];
const VISTAS = [
  { nome: 'frente', direcao: [0, 0, -1], cima: [0, 1, 0] },
  { nome: 'lado', direcao: [-1, 0, 0], cima: [0, 1, 0] },
  { nome: 'topo', direcao: [0, -1, 0], cima: [0, 0, -1] },
];

export function py(script, args) {
  const r = spawnSync('python3', ['-I', join(AQUI, script), ...args], { encoding: 'utf8', maxBuffer: 256 << 20 });
  if (r.status !== 0) throw new Error(`${script} saiu com ${r.status}:\n${r.stdout.slice(-2000)}\n${r.stderr.slice(-3000)}`);
  return r.stdout;
}

/** A câmera de cada vista como comum.completar_vistas: o centro da região do recorte e a escala que cabe a caixa com 10%. */
export function cameras() {
  const reg = [[-CAIXA[1], CAIXA[1]], [CAIXA[2], CAIXA[3]], [CAIXA[4], CAIXA[5]]];
  const centro = reg.map(([a, b]) => (a + b) / 2);
  const cantos = [];
  for (const x of reg[0]) for (const y of reg[1]) for (const z of reg[2]) cantos.push([x, y, z]);
  const out = {};
  for (const v of VISTAS) {
    const e = eixosDaCamera(v.direcao, v.cima);
    const px = cantos.map((p) => p.reduce((s, c, i) => s + (c - centro[i]) * e.x[i], 0));
    const pyy = cantos.map((p) => p.reduce((s, c, i) => s + (c - centro[i]) * e.y[i], 0));
    const escala = 1.1 * Math.max(Math.max(...px) - Math.min(...px), ((Math.max(...pyy) - Math.min(...pyy)) * W) / H);
    out[v.nome] = { centro, escala, W, H, x_cam: e.x, y_cam: e.y, z_cam: e.z, direcao: v.direcao, cima: v.cima, meia: false };
  }
  return out;
}

/** Os eixos do mundo da vista alinhada: [horizontal, vertical]. */
export const eixosDaVista = (c) => [c.x_cam, c.y_cam].map((e) => e.findIndex((v) => Math.abs(v) > 0.999));

function paraPixel(c, p) {
  const d = p.map((v, i) => v - c.centro[i]);
  const dx = d.reduce((s, v, i) => s + v * c.x_cam[i], 0);
  const dy = d.reduce((s, v, i) => s + v * c.y_cam[i], 0);
  return [Math.round((W / 2 + (dx / c.escala) * W) * 100) / 100, Math.round((H / 2 - (dy / c.escala) * W) * 100) / 100];
}

/** Pontos a cada 2 mm ao longo da aresta, como linhas_na_vista desenha. */
export function amostrar([a, b]) {
  const L = Math.hypot(...a.map((v, i) => b[i] - v));
  const k = Math.max(1, Math.ceil(L / 0.002));
  return Array.from({ length: k + 1 }, (_, i) => a.map((v, j) => v + ((b[j] - v) * i) / k));
}

/** Grava em <dir>/pacote o pacote do prisma: pacote.json com a simetria, os cortes e as vistas de linhas com a grade. */
export function montarPacote(dir) {
  const p = (...n) => join(dir, ...n);
  const cams = cameras();
  mkdirSync(p('pacote', 'vistas'), { recursive: true });
  mkdirSync(p('pacote', 'cortes'), { recursive: true });
  writeFileSync(p('pacote', 'pacote.json'), JSON.stringify({ simetria_x: true }));
  // os cortes, desenhados com cotas por imagens.py, a partir do contorno exato em metro
  const cortes = CORTES.map((c) => ({ ...c, cadeias: corte(c.eixo, c.valor).map((q) => {
    const P = q.pontos.map((pt) => pt.map((v) => v / 1000));
    return q.fechada ? [...P, P[0]] : P;
  }) }));
  writeFileSync(p('cortes.json'), JSON.stringify({ simetria_x: true, cortes }));
  py('imagens.py', ['cortes', p('cortes.json'), p('pacote', 'cortes')]);
  // as vistas de linhas: os vincos visíveis em preto e a borda do corte da caixa em cinza, depois a grade por cima
  writeFileSync(p('pacote', 'vistas', 'camera.json'), JSON.stringify(cams));
  for (const [nome, c] of Object.entries(cams)) {
    const linhas = { feicao: [], corte: [] };
    for (const [tipo, arestas] of [['feicao', vincos()], ['corte', bordaDeCorte()]]) {
      for (const a of arestas) if (visivel(a, c.direcao)) linhas[tipo].push(amostrar(a.pontos).map((q) => paraPixel(c, q)));
    }
    writeFileSync(p(`linhas-${nome}.json`), JSON.stringify({ W, H, linhas }));
    py('imagens.py', ['linhas', p(`linhas-${nome}.json`), p('pacote', 'vistas', `${nome}-linhas.png`)]);
  }
  const branco = Object.keys(cams).flatMap((n) => ['cinza', 'zebra'].map((t) => p('pacote', 'vistas', `${n}-${t}.png`)));
  spawnSync('python3', ['-I', '-c', `from PIL import Image\nimport sys\nfor a in sys.argv[1:]: Image.new('RGB', (${W}, ${H}), 'white').save(a)`, ...branco]);
  py('imagens.py', ['grade', p('pacote', 'vistas', 'camera.json'), p('pacote', 'vistas') + '/']);
  return cams;
}
