#!/usr/bin/env node
/* render.mjs — desenho sólido da malha compilada, por pintor. Sem dependência e
   sem navegador: projeta, ordena por profundidade e preenche com sombreado da
   normal. É evidência da prova P2, não visor de produto. */

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { construirQuartoDianteiro } from './quarto-dianteiro.mjs';
import { espelhar } from './cage.mjs';
import { subdividir } from './subdividir.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* Câmeras: direção de visão e o par de eixos da tela. */
const CAMERAS = {
  lateral: { olhar: [1, 0, 0], u: [0, 0, -1], v: [0, -1, 0] },
  frontal: { olhar: [0, 0, -1], u: [-1, 0, 0], v: [0, -1, 0] },
  superior: { olhar: [0, -1, 0], u: [0, 0, -1], v: [-1, 0, 0] },
  isometrica: { olhar: unit([0.72, -0.46, -0.52]), u: unit([-0.58, 0, -0.81]), v: unit([-0.37, -0.89, 0.27]) },
};

export function desenhar(malha, { largura = 620, altura = 440, camera = 'isometrica', luz = unit([0.4, 0.8, 0.5]), fio = false } = {}) {
  const cam = CAMERAS[camera];
  const faces = [...malha.F.values()];
  const proj = (p) => [ponto(p, cam.u), ponto(p, cam.v)];
  const prof = (p) => -ponto(p, cam.olhar);

  const preparadas = faces.map((f) => {
    const ps = f.vs.map((v) => malha.V.get(v));
    const n = unit(cruz(sub(ps[1], ps[0]), sub(ps[2], ps[0])));
    const c = ps.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
    return { f, ps: ps.map(proj), z: prof(c), lambert: Math.max(0, ponto(n, luz)), frente: ponto(n, cam.olhar) < 0 };
  }).sort((a, b) => (a.frente === b.frente ? a.z - b.z : (a.frente ? 1 : -1)));
  /* Duas passadas em vez de ordenação pura por profundidade. Numa casca aberta,
     face de dentro e de fora quase se tocam perto da tangente, e o algoritmo do
     pintor alterna qual fica por cima — o resultado é uma serrilha na silhueta
     que parece defeito de geometria e não é. Verificado: o loop da crista é
     monótono nos dados. */

  const xs = preparadas.flatMap((q) => q.ps.map((p) => p[0]));
  const ys = preparadas.flatMap((q) => q.ps.map((p) => p[1]));
  const escala = Math.min((largura - 40) / (Math.max(...xs) - Math.min(...xs)), (altura - 40) / (Math.max(...ys) - Math.min(...ys)));
  const dx = 20 - Math.min(...xs) * escala;
  const dy = 20 - Math.min(...ys) * escala;
  const tela = ([x, y]) => `${(x * escala + dx).toFixed(1)},${(y * escala + dy).toFixed(1)}`;

  const cor = (q) => {
    const t = 0.30 + 0.62 * q.lambert;
    const base = q.f.parte === 'arcoDianteiroRetorno' ? [150, 90, 70]
      : q.f.parte === 'capo' ? [70, 96, 140]
        : q.f.parte === 'paralamaDianteiro' ? [86, 112, 152]
          : [104, 124, 158];
    return `rgb(${base.map((c) => Math.round(c * t + 255 * (1 - t) * 0.30)).join(',')})`;
  };

  const O = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}">`,
    `<rect width="${largura}" height="${altura}" fill="#f6f6f4"/>`];
  for (const q of preparadas) {
    /* Traço da MESMA cor do preenchimento. Perto da silhueta a face é vista de
       topo e vira uma lasca; sem traço, a face de trás aparece pelas frestas e a
       borda sai serrilhada. Medido: no nível 2 a silhueta da malha tem zero
       inversão — a serrilha era do desenho, não da geometria. */
    const c = cor(q);
    O.push(`<polygon points="${q.ps.map(tela).join(' ')}" fill="${c}"`
      + (fio ? ' stroke="#2a3a52" stroke-width="0.35"' : ` stroke="${c}" stroke-width="0.7"`) + '/>');
  }
  O.push(`<text x="14" y="${altura - 12}" font-family="ui-sans-serif,system-ui" font-size="12" fill="#6b7481">${camera}</text>`);
  O.push('</svg>');
  return O.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('render.mjs')) {
  const nivel = Number(process.argv[2] ?? 2);
  const cage = espelhar(construirQuartoDianteiro());
  const malha = nivel === 0 ? cage : subdividir(cage, nivel);
  const dir = path.join(AQUI, 'evidencias');
  mkdirSync(dir, { recursive: true });
  const partes = [];
  for (const camera of ['isometrica', 'lateral', 'frontal', 'superior']) {
    const svg = desenhar(malha, { camera, fio: nivel <= 1 });
    const arq = path.join(dir, `nivel-${nivel}-${camera}.svg`);
    writeFileSync(arq, `${svg}\n`);
    partes.push(path.relative(process.cwd(), arq));
  }
  console.log(`nível ${nivel}: ${malha.F.size} faces`);
  for (const p of partes) console.log(`  ${p}`);
}
