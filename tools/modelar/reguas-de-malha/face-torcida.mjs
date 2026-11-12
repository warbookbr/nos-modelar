/* face-torcida.mjs — régua de malha: a face que se cruza e o triângulo virado (plano "costuras e furos limpos", refeitura do `furo` em anéis).

   Duas medidas sobre as faces não degeneradas, ambas no plano da normal de Newell da face (o plano que o adaptador usa):
   - TORCIDA: duas arestas não vizinhas da face se cruzam de verdade (o quadrilátero em gravata);
   - VIRADO: um triângulo que o `adaptarThree` entrega com a normal contra a normal de Newell da face (dobro da área com sinal negativo), o que o
     sombreamento mostra como remendo escuro e que nenhuma régua de fechamento, volume ou degenerada acusa.
   A face que o adaptador recusa por degenerada (módulo da normal de Newell até 1e-12) fica de fora: a régua de face degenerada é que a conta.
   Lê só `V` e `F`. */
import { adaptarThree, idDeOrigem } from '../../../src/autoria/adaptar-three.js';
import { normalDeNewell } from './face-degenerada.mjs';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function newell(pontos) {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i], b = pontos[(i + 1) % pontos.length];
    x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return [x, y, z];
}

/* os cantos no plano da face: duas coordenadas por canto, numa base ortonormal da normal u */
function noPlano(pontos, u) {
  const t = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const e1 = cruz(u, t);
  const l = Math.hypot(...e1);
  const a = [e1[0] / l, e1[1] / l, e1[2] / l];
  const b = cruz(u, a);
  return pontos.map((p) => [dot(p, a), dot(p, b)]);
}

const giro = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

/** Verdadeiro se duas arestas não vizinhas do polígono (2D) se cruzam de verdade (no interior das duas). */
export function seCruza(q) {
  const n = q.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const a = q[i], b = q[(i + 1) % n], c = q[j], d = q[(j + 1) % n];
      if (giro(a, b, c) * giro(a, b, d) < 0 && giro(c, d, a) * giro(c, d, b) < 0) return true;
    }
  }
  return false;
}

/** { torcidas, viradas, faces: [{ id, cantos, torcida, viradas, parte }] }: toda face torcida ou com triângulo virado. */
export function medirFaceTorcida(neutro) {
  const boas = new Map();
  const torcida = new Map();
  for (const face of neutro.F.values()) {
    if (!Array.isArray(face.vs) || face.vs.length < 3) continue;
    const pts = face.vs.map((v) => neutro.V.get(v));
    const modulo = normalDeNewell(pts);
    if (!(modulo != null && modulo > 1e-12)) continue;
    boas.set(face.id, { face, normal: newell(pts) });
    if (face.vs.length > 3) {
      const n = newell(pts);
      const l = Math.hypot(...n);
      if (seCruza(noPlano(pts, [n[0] / l, n[1] / l, n[2] / l]))) torcida.set(face.id, true);
    }
  }
  const viradas = new Map();
  const { raiz } = adaptarThree({ ...neutro, F: new Map([...boas].map(([id, b]) => [id, b.face])), orfaos: [] });
  raiz.traverse((no) => {
    const g = no.geometry;
    if (!g) return;
    const pos = g.getAttribute('position'), origem = g.getAttribute('origemFace');
    const ponto = (i) => [pos.getX(i), pos.getY(i), pos.getZ(i)];
    for (let i = 0; i + 2 < pos.count; i += 3) {
      const id = idDeOrigem(origem, i);
      const b = boas.get(id);
      if (!b) continue;
      const a = ponto(i);
      const n = cruz(sub(ponto(i + 1), a), sub(ponto(i + 2), a));
      if (dot(n, b.normal) < 0) viradas.set(id, (viradas.get(id) ?? 0) + 1);
    }
  });
  const ids = [...new Set([...torcida.keys(), ...viradas.keys()])].sort((x, y) => x - y);
  const faces = ids.map((id) => ({ id, cantos: boas.get(id).face.vs.length, torcida: torcida.has(id), viradas: viradas.get(id) ?? 0, parte: boas.get(id).face.parte ?? null }));
  return { torcidas: torcida.size, viradas: [...viradas.values()].reduce((s, x) => s + x, 0), faces };
}
