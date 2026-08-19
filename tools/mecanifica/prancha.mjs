#!/usr/bin/env node
/* prancha.mjs — motor de desenho de pranchas ortográficas alvo. Recebe uma
   especificação declarativa em milímetros e devolve SVG determinístico. Não
   conhece carro: conhece vistas, camadas, cotas e legenda. O vocabulário de
   domínio vive na especificação, nunca aqui. Sem dependência e sem timestamp. */

const n = (v) => Number(v.toFixed(2));

/* Catmull-Rom → bézier: a curva passa exatamente pelos pontos declarados. */
export function suave(pts, fechado = false) {
  if (pts.length < 2) return '';
  const p = fechado ? [...pts, pts[0]] : pts;
  const em = (i) => p[Math.min(Math.max(i, 0), p.length - 1)];
  let d = `M ${n(p[0][0])} ${n(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i += 1) {
    const p0 = fechado ? p[(i - 1 + p.length) % p.length] : em(i - 1);
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = fechado ? p[(i + 2) % p.length] : em(i + 2);
    d += ` C ${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)},`
      + ` ${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)},`
      + ` ${n(p2[0])} ${n(p2[1])}`;
  }
  return d + (fechado ? ' Z' : '');
}

export function reta(pts, fechado = false) {
  return `M ${pts.map(([a, b]) => `${n(a)} ${n(b)}`).join(' L ')}${fechado ? ' Z' : ''}`;
}

/* Cada vista declara como um par de coordenadas de mundo vira pixel. */
function projetores(spec) {
  const s = spec.escala;
  const { zMin, zMax, yMax, xMax } = spec.limites;
  const v = spec.vistas;
  return {
    lateral: ([z, y]) => [v.lateral.x + (z - zMin) * s, v.lateral.y + (yMax - y) * s],
    planta: ([z, x]) => [v.planta.x + (z - zMin) * s, v.planta.y + (x + xMax) * s],
    frontal: ([x, y]) => [v.frontal.x + (x + xMax) * s, v.frontal.y + (yMax - y) * s],
    traseira: ([x, y]) => [v.traseira.x + (xMax - x) * s, v.traseira.y + (yMax - y) * s],
  };
}

const ESTILOS = `
  .contorno{fill:none;stroke:#12233b;stroke-width:2.1;stroke-linejoin:round;stroke-linecap:round}
  .painel{fill:none;stroke:#2f4562;stroke-width:1.25;stroke-linejoin:round;stroke-linecap:round}
  .vidro{fill:none;stroke:#3d6b86;stroke-width:1.35;stroke-linejoin:round}
  .cromo{fill:none;stroke:#8a94a2;stroke-width:1.4;stroke-linejoin:round}
  .roda{fill:none;stroke:#8a94a2;stroke-width:1.6}
  .aro{fill:none;stroke:#c0c6cf;stroke-width:1.1}
  .eixo{fill:none;stroke:#c8ccd2;stroke-width:1;stroke-dasharray:9 4 2 4}
  .carater{fill:none;stroke:#b3593d;stroke-width:1.7;stroke-dasharray:6 3}
  .cota{stroke:#b3593d;stroke-width:1;fill:none}
  .cotat{fill:#b3593d;font-size:11px}
  .lm{fill:#1f6f5c}
  .lmt{fill:#1f6f5c;font-size:9.5px}
  .tit{fill:#12233b;font-size:15px;font-weight:600}
  .sub{fill:#6b7481;font-size:11px}
  .rot{fill:#8b93a0;font-size:10.5px;letter-spacing:.06em}
`;

export function prancha(spec) {
  const proj = projetores(spec);
  const s = spec.escala;
  const O = [];
  const put = (x) => O.push(x);
  const { largura: W, altura: H } = spec.tela;

  put(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="ui-sans-serif, system-ui, sans-serif">`);
  put(`<rect width="${W}" height="${H}" fill="#fbfbfa"/>`);
  put(`<style>${ESTILOS}</style>`);
  put(`<text x="40" y="34" class="tit">${spec.titulo}</text>`);
  put(`<text x="40" y="53" class="sub">${spec.subtitulo}</text>`);

  for (const [nome, vista] of Object.entries(spec.vistas)) {
    if (vista.rotulo) put(`<text x="${vista.x}" y="${vista.y - 12}" class="rot">${vista.rotulo}</text>`);
  }

  for (const c of spec.camadas) {
    const p = proj[c.vista];
    const cls = c.classe ?? 'contorno';
    if (c.tipo === 'circulo') {
      const [cx, cy] = p(c.centro);
      put(`<circle class="${cls}" cx="${n(cx)}" cy="${n(cy)}" r="${n(c.raio * s)}"/>`);
    } else if (c.tipo === 'arcoSuperior') {
      const [ax, ay] = p(c.de);
      const [bx, by] = p(c.ate);
      put(`<path class="${cls}" d="M ${n(ax)} ${n(ay)} A ${n(c.raio * s)} ${n(c.raio * s)} 0 0 1 ${n(bx)} ${n(by)}"/>`);
    } else if (c.tipo === 'reta') {
      put(`<path class="${cls}" d="${reta(c.pts.map(p), c.fechado)}"/>`);
    } else {
      put(`<path class="${cls}" d="${suave(c.pts.map(p), c.fechado)}"/>`);
    }
  }

  for (const c of spec.cotas ?? []) {
    const p = proj[c.vista];
    const [ax, ay] = p(c.de);
    const [bx, by] = p(c.ate);
    const dx = c.desloca?.[0] ?? 0;
    const dy = c.desloca?.[1] ?? 0;
    put(`<path class="cota" d="M ${n(ax + dx)} ${n(ay + dy)} L ${n(bx + dx)} ${n(by + dy)}"/>`);
    const mx = (ax + bx) / 2 + dx;
    const my = (ay + by) / 2 + dy;
    const vert = Math.abs(bx - ax) < Math.abs(by - ay);
    const t = vert
      ? `<text x="${n(mx - 6)}" y="${n(my)}" class="cotat" text-anchor="middle" transform="rotate(-90 ${n(mx - 6)} ${n(my)})">${c.texto}</text>`
      : `<text x="${n(mx)}" y="${n(my - 6)}" class="cotat" text-anchor="middle">${c.texto}</text>`;
    put(t);
  }

  for (const l of spec.landmarks ?? []) {
    const [x, y] = proj[l.vista](l.em);
    put(`<circle class="lm" cx="${n(x)}" cy="${n(y)}" r="2.6"/>`);
    if (l.id) put(`<text class="lmt" x="${n(x + 6)}" y="${n(y + (l.acima === false ? 14 : -6))}">${l.id}</text>`);
  }

  if (spec.legenda) {
    const { x, y, itens, notas = [] } = spec.legenda;
    put(`<text x="${x}" y="${y}" class="rot">LEGENDA</text>`);
    itens.forEach(([cor, txt], i) => {
      const ly = y + 22 + i * 20;
      put(`<line x1="${x}" y1="${ly - 4}" x2="${x + 22}" y2="${ly - 4}" stroke="${cor}" stroke-width="2.2"/>`);
      put(`<text x="${x + 30}" y="${ly}" class="sub">${txt}</text>`);
    });
    notas.forEach((t, i) => put(`<text x="${x}" y="${y + 40 + itens.length * 20 + i * 18}" class="sub">${t}</text>`));
  }

  put(`</svg>`);
  return O.join('\n') + '\n';
}
