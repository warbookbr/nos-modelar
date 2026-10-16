/* Importador de `.csg` do OpenSCAD para `.esboco.json`.

   O `.csg` é a árvore que `openscad -o x.csg x.scad` exporta: primitivas, `multmatrix`, `union`, `difference`, `intersection`,
   `linear_extrude` e `rotate_extrude` de `polygon`, `circle` e `square`, sem laço nem função. Este arquivo lê essa árvore e a
   traduz para as formas do esboço (`modulos/esboco`). O que o esboço não expressa é recusado com o nó e a linha do `.csg`; nada
   é aproximado em silêncio.

   Quadro. O OpenSCAD tem z para cima. O esboço tem y para cima e a frente em -z. A conversão é a rotação própria
   (x, y, z)_scad -> (x, z, -y)_esboço (a de Blender para glTF), que mantém a mão do referencial, seguida de um giro em torno de
   y que escolhe qual direção do OpenSCAD é a frente (`frente`: +y, -y, +x ou -x; o padrão +y vira -z). Nenhuma peça é
   espelhada, e a unidade é o milímetro do OpenSCAD.

   Nomes. O `.csg` perde os nomes de módulo e o `.scad` não deixa recuperá-los dele de forma confiável: cada forma sai com id
   posicional (`<tipo>_<caminho na árvore>`), e o esbocista a nomeia depois. `nomes` (`{ idPosicional: nome }`) renomeia na
   importação, para o nome sobreviver a uma nova importação do mesmo `.csg`.

   Diferença vira `subtrai` com `cortador`. Interseção com caixa vira seis cortadores em placa em volta dela. A diferença 2D com furo
   dentro de `linear_extrude` ou de `rotate_extrude` vira a diferença 3D das extrusões (extrude(A - B) = extrude(A) - extrude(B)), e o
   subtraendo que tem furo vira peças convexas. `offset(r=)` e `offset(delta=, chamfer=)` calculam o polígono deslocado, com os arcos
   de `$fn`, `$fa` e `$fs` do nó. `linear_extrude` com `scale` vira cone (círculo), `cilindro` (anel) ou `loft` (polígono convexo).
   `hull` 2D é o casco convexo dos pontos; `hull` 3D de cubos, cilindros e extrusões vira extrusão do casco das bases (todos prismas da
   mesma altura) ou cone, revolução e loft (seções semelhantes em torno do mesmo eixo, pelo envelope côncavo das escalas); `minkowski`
   de cubo com cilindro reto é a extrusão do retângulo arredondado, e de cubo com esfera é a união de 3 caixas, 12 cilindros e 8
   esferas. O resto da interseção, o `hull` que nenhuma dessas formas expressa, o `minkowski` de outras formas, `polyhedron`, o
   cisalhamento, a escala desigual de cilindro e de esfera, a torção, a escala da extrusão sobre polígono côncavo ou círculo
   achatado, o `offset` cujo contorno se cruza e a revolução cujo perfil não sobe são recusados.

   Núcleo puro: recebe o texto e devolve `{ esboco, texto, relatorio }`. A linha de comando fica em `importar-csg.mjs`. */
import { createHash } from 'node:crypto';
import { ehConvexo, ehSimples } from '../../procedural/nucleo/contorno.js';

export class RecusaDeImportacao extends Error {
  constructor(mensagem, recusas = []) { super(mensagem); this.recusas = recusas; }
}

const EPS = 1e-9;
const TOL = 1e-6;
const LADOS_VISIVEIS = 24; // acima disto o cilindro do esboço (48 lados) é o mesmo círculo; abaixo, o polígono é forma
const FRENTES = ['+y', '-y', '+x', '-x'];
const GIROS_DA_FRENTE = { '+y': 0, '-y': 180, '+x': 90, '-x': -90 };

/* ---------- leitura da árvore ---------- */

function* simbolos(texto) {
  let i = 0;
  let linha = 1;
  const n = texto.length;
  while (i < n) {
    const c = texto[i];
    if (c === '\n') { linha++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && texto[i + 1] === '/') { while (i < n && texto[i] !== '\n') i++; continue; }
    if (c === '/' && texto[i + 1] === '*') {
      i += 2;
      while (i < n && !(texto[i] === '*' && texto[i + 1] === '/')) { if (texto[i] === '\n') linha++; i++; }
      i += 2; continue;
    }
    if (c === '"') {
      let j = i + 1; let s = '';
      while (j < n && texto[j] !== '"') { if (texto[j] === '\\' && j + 1 < n) j++; s += texto[j]; j++; }
      yield { t: 'texto', v: s, linha }; i = j + 1; continue;
    }
    const resto = texto.slice(i, i + 48);
    const num = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(resto);
    if (num) { yield { t: 'num', v: Number(num[0]), linha }; i += num[0].length; continue; }
    if (resto.startsWith('-inf')) { yield { t: 'num', v: -Infinity, linha }; i += 4; continue; }
    const id = /^\$?[A-Za-z_][A-Za-z0-9_]*/.exec(resto);
    if (id) { yield { t: 'id', v: id[0], linha }; i += id[0].length; continue; }
    yield { t: c, v: c, linha }; i++;
  }
  yield { t: 'fim', v: null, linha };
}

/* Um nó: { nome, linha, modificador, pos: [valores], nomeados: { campo: valor }, filhos: [nós] | null }. */
export function lerCsg(texto) {
  const fonte = [...simbolos(texto)];
  let p = 0;
  const ver = () => fonte[p];
  const erro = (msg, s = ver()) => { throw new RecusaDeImportacao(`.csg ilegível na linha ${s.linha}: ${msg}`); };
  const come = (t) => { const s = fonte[p]; if (s.t !== t) erro(`esperava "${t}" e veio "${s.v ?? 'fim do arquivo'}"`, s); p++; return s; };

  function valor() {
    const s = ver();
    if (s.t === 'num' || s.t === 'texto') { p++; return s.v; }
    if (s.t === '[') {
      p++;
      const lista = [];
      while (ver().t !== ']') {
        lista.push(valor());
        if (ver().t === ':') erro('intervalo [a:b:c] não existe no .csg exportado');
        if (ver().t === ',') p++; else if (ver().t !== ']') erro('esperava "," ou "]"');
      }
      p++;
      return lista;
    }
    if (s.t === 'id') {
      p++;
      const fixos = { true: true, false: false, undef: undefined, inf: Infinity, nan: NaN };
      if (Object.hasOwn(fixos, s.v)) return fixos[s.v];
      return erro(`valor "${s.v}" desconhecido`, s);
    }
    return erro(`valor inesperado "${s.v ?? 'fim do arquivo'}"`, s);
  }

  function declaracao() {
    let modificador = null;
    if (['%', '#', '!', '*'].includes(ver().t)) { modificador = ver().t; p++; }
    const nomeSimbolo = ver();
    if (nomeSimbolo.t !== 'id') erro(`esperava o nome de um nó e veio "${nomeSimbolo.v ?? 'fim do arquivo'}"`);
    p++;
    const no = { nome: nomeSimbolo.v, linha: nomeSimbolo.linha, modificador, pos: [], nomeados: {}, filhos: null };
    come('(');
    while (ver().t !== ')') {
      if (ver().t === 'id' && fonte[p + 1].t === '=') { const k = ver().v; p += 2; no.nomeados[k] = valor(); } else no.pos.push(valor());
      if (ver().t === ',') p++; else if (ver().t !== ')') erro('esperava "," ou ")"');
    }
    p++;
    if (ver().t === '{') {
      p++;
      no.filhos = [];
      while (ver().t !== '}') { if (ver().t === 'fim') erro('chave "{" sem fechar'); no.filhos.push(declaracao()); }
      p++;
    } else if (ver().t === ';') p++;
    else erro('esperava ";" ou "{"');
    return no;
  }

  const raiz = [];
  while (ver().t !== 'fim') raiz.push(declaracao());
  return raiz;
}

/* ---------- álgebra ---------- */

const I4 = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
const mul4 = (a, b) => a.map((_, i) => [0, 1, 2, 3].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j] + a[i][3] * b[3][j]));
const aplica = (m, q) => [0, 1, 2].map((i) => m[i][0] * q[0] + m[i][1] * q[1] + m[i][2] * q[2] + m[i][3]);
const linear = (m) => [0, 1, 2].map((i) => [m[i][0], m[i][1], m[i][2]]);
const coluna = (a, j) => [a[0][j], a[1][j], a[2][j]];
const norma = (v) => Math.hypot(...v);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const esc = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
const det3 = (a) => a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
const daColunas = (c0, c1, c2) => [0, 1, 2].map((i) => [c0[i], c1[i], c2[i]]);
const rad = (g) => (g * Math.PI) / 180;
const arred = (x) => { const v = Math.round(x * 1e6) / 1e6; return Object.is(v, -0) ? 0 : v; };
const vet = (v) => v.map(arred);

/* x, y, z do OpenSCAD -> x, z, -y; o inverso é a transposta. */
const F_BASE = [[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0], [0, 0, 0, 1]];
const F_BASE_INV = [[1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0], [0, 0, 0, 1]];
const giroEmY = (graus) => {
  const c = Math.round(Math.cos(rad(graus)) * 1e12) / 1e12; const s = Math.round(Math.sin(rad(graus)) * 1e12) / 1e12;
  return [[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1]];
};

/* Os ângulos [rx, ry, rz] em graus da rotação R = Rz·Ry·Rx, a convenção de `rotacao` do esboço. */
function angulosDaRotacao(R) {
  const sy = -R[2][0];
  const ry = Math.asin(Math.max(-1, Math.min(1, sy)));
  let rx; let rz;
  if (Math.abs(sy) < 1 - 1e-9) { rx = Math.atan2(R[2][1], R[2][2]); rz = Math.atan2(R[1][0], R[0][0]); } else { rz = 0; rx = Math.atan2(-R[1][2], R[1][1]); }
  return [rx, ry, rz].map((a) => arred((a * 180) / Math.PI));
}

/* `rotate([rx, ry, rz])` do OpenSCAD, em graus: gira em x, depois em y, depois em z (a matriz Rz·Ry·Rx). */
function matrizDeGiro([rx, ry, rz]) {
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(rad(rx)), Math.sin(rad(rx)), Math.cos(rad(ry)), Math.sin(rad(ry)), Math.cos(rad(rz)), Math.sin(rad(rz))].map((v) => Math.round(v * 1e12) / 1e12);
  return [[cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx, 0], [sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx, 0], [-sy, cy * sx, cy * cx, 0], [0, 0, 0, 1]];
}

/* A rotação do quadro do OpenSCAD ao do esboço, para pôr nele uma malha que o OpenSCAD exportou do mesmo objeto: o giro de `girar`, o
   (x, y, z) -> (x, z, -y) e o giro em y da `frente`. */
export function quadroDoEsboco({ frente = '+y', girar = [0, 0, 0] } = {}) {
  if (!FRENTES.includes(frente)) throw new RecusaDeImportacao(`frente "${frente}" desconhecida; as válidas são ${FRENTES.join(', ')}`);
  return mul4(giroEmY(GIROS_DA_FRENTE[frente]), mul4(F_BASE, matrizDeGiro(girar)));
}

/* Fragmentos de uma circunferência, como `get_fragments_from_r` do OpenSCAD. */
export function fragmentos(r, { $fn = 0, $fa = 12, $fs = 2 } = {}) {
  if (r < 1e-8) return 3;
  if ($fn > 0) return Math.max($fn, 3);
  return Math.ceil(Math.max(Math.min(360 / $fa, (r * 2 * Math.PI) / $fs), 5));
}
/* Os lados que o .scad pediu com `$fn`; sem `$fn`, os lados vêm de `$fa` e `$fs` e são só a tesselação do OpenSCAD, que o esboço não
   toma por forma (o cilindro de raio 3 com o $fs padrão sairia decágono), e o valor é null. */
const ladosPedidos = (no, r) => ((no.nomeados.$fn ?? 0) > 0 ? fragmentos(r, resolucao(no)) : null);
const resolucao = (no) => ({ $fn: no.nomeados.$fn ?? 0, $fa: no.nomeados.$fa ?? 12, $fs: no.nomeados.$fs ?? 2 });
const circulo = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);

/* ---------- geometria 2D ---------- */

const area2 = (p) => p.reduce((acc, q, i) => acc + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0) / 2;
const antiHorario = (p) => (area2(p) < 0 ? [...p].reverse() : p);
const semRepetidos = (p) => p.filter((q, i) => { const a = p[(i + p.length - 1) % p.length]; return Math.hypot(q[0] - a[0], q[1] - a[1]) > 1e-9; });

/* O casco convexo dos pontos, anti-horário, sem vértice colinear (cadeia monótona de Andrew). */
export function cascoConvexo2d(pontos) {
  const ps = [...pontos].sort((a, b) => a[0] - b[0] || a[1] - b[1]).filter((q, i, l) => i === 0 || q[0] !== l[i - 1][0] || q[1] !== l[i - 1][1]);
  if (ps.length < 3) return ps;
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const cadeia = (lista) => { const c = []; for (const q of lista) { while (c.length >= 2 && cruz(c[c.length - 2], c[c.length - 1], q) <= 1e-12) c.pop(); c.push(q); } c.pop(); return c; };
  return [...cadeia(ps), ...cadeia([...ps].reverse())];
}

/* Os pontos de uma matriz afim 4x4 do .csg aplicada a um ponto do plano (o 2D do OpenSCAD só usa x e y). */
const aplica2 = (T, q) => [T[0][0] * q[0] + T[0][1] * q[1] + T[0][3], T[1][0] * q[0] + T[1][1] * q[1] + T[1][3]];
function inversa2(T) {
  const [a, b, c, d] = [T[0][0], T[0][1], T[1][0], T[1][1]];
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-12) return null;
  const [ia, ib, ic, id] = [d / det, -b / det, -c / det, a / det];
  return [[ia, ib, 0, -(ia * T[0][3] + ib * T[1][3])], [ic, id, 0, -(ic * T[0][3] + id * T[1][3])], [0, 0, 1, 0], [0, 0, 0, 1]];
}
/* A escala de uma matriz 2D que só gira, espelha e escala por igual (semelhança); null se estica por eixos diferentes ou cisalha. */
function escalaSemelhante(T) {
  const [c0, c1] = [Math.hypot(T[0][0], T[1][0]), Math.hypot(T[0][1], T[1][1])];
  if (c0 < EPS || Math.abs(c0 - c1) > TOL * Math.max(c0, 1) || Math.abs(T[0][0] * T[0][1] + T[1][0] * T[1][1]) > TOL * c0 * c1) return null;
  return c0;
}

/* Os pontos de um círculo de `n` lados, a partir do ângulo zero, como o OpenSCAD o desenha. */
const pontosDoCirculo = (r, n) => circulo(r, n);

/* O polígono convexo recortado pelo semiplano à esquerda (`lado` 1) ou à direita (`lado` -1) da reta a -> b (Sutherland-Hodgman). */
function recortarPorReta(poligono, a, b, lado) {
  const lado_ = (q) => lado * ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]));
  const saida = [];
  poligono.forEach((q, i) => {
    const r = poligono[(i + 1) % poligono.length];
    const [sq, sr] = [lado_(q), lado_(r)];
    if (sq >= 0) saida.push(q);
    if ((sq > 0 && sr < 0) || (sq < 0 && sr > 0)) { const t = sq / (sq - sr); saida.push([q[0] + t * (r[0] - q[0]), q[1] + t * (r[1] - q[1])]); }
  });
  const limpo = semRepetidos(saida);
  return limpo.length >= 3 && Math.abs(area2(limpo)) > 1e-9 ? limpo : null;
}

/* X - Y, os dois convexos e anti-horários, como peças convexas que não se sobrepõem: a parte de X fora da aresta k de Y e dentro das
   arestas 1 a k-1. */
export function diferencaConvexa(X, Y) {
  const pecas = [];
  let resto = X;
  for (let k = 0; k < Y.length && resto; k++) {
    const [a, b] = [Y[k], Y[(k + 1) % Y.length]];
    const fora = recortarPorReta(resto, a, b, -1);
    if (fora) pecas.push(fora);
    resto = recortarPorReta(resto, a, b, 1);
  }
  return pecas;
}

/* Um loft em seções `{ z, pts }` (`pts` null é a ponta, um ponto na origem do quadro da forma): as seções e o centro da caixa de
   todos os vértices, que é o centro do loft no esboço. */
function pLoft(secoes) {
  const todos = secoes.flatMap((se) => se.pts ?? [[0, 0]]);
  const [xs, ys, zs] = [todos.map((q) => q[0]), todos.map((q) => q[1]), secoes.map((se) => se.z)];
  const meio = (v) => (Math.min(...v) + Math.max(...v)) / 2;
  return { secoes, cs: [meio(xs), meio(ys), meio(zs)] };
}

/* Cruzamento de arestas não vizinhas (polígono que se cruza). */
function seCruza(p) {
  const n = p.length;
  const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (let i = 0; i < n; i++) {
    const [a, b] = [p[i], p[(i + 1) % n]];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const [c, d] = [p[j], p[(j + 1) % n]];
      const [o1, o2, o3, o4] = [orient(a, b, c), orient(a, b, d), orient(c, d, a), orient(c, d, b)];
      if (o1 * o2 < -1e-12 && o3 * o4 < -1e-12) return true;
    }
  }
  return false;
}

/**
 * O polígono deslocado de `delta` como o `offset` do OpenSCAD: `junta` 'round' arredonda o canto que se afasta com arcos de
 * `fn` lados por volta (`offset(r=)`), 'miter' o prolonga até as arestas deslocadas se cruzarem (`offset(delta=)`) e 'square'
 * o chanfra (`chamfer=true`). Vale para polígono simples, convexo ou não; devolve a lista de pontos, `null` se o polígono some
 * (recuo maior que ele) ou o motivo (texto) quando o contorno deslocado se cruza e só um cálculo de interseção de regiões o daria.
 */
export function deslocarPoligono(pontos, delta, { junta = 'round', fn = 32 } = {}) {
  const p = semRepetidos(antiHorario(semRepetidos(pontos)));
  const n = p.length;
  if (n < 3 || Math.abs(area2(p)) < 1e-12) return 'polígono sem área';
  if (Math.abs(delta) < 1e-12) return p;
  const d = p.map((q, i) => { const b = p[(i + 1) % n]; const t = Math.hypot(b[0] - q[0], b[1] - q[1]); return [(b[0] - q[0]) / t, (b[1] - q[1]) / t]; });
  const normal = (v) => [v[1], -v[0]];
  const saida = [];
  const ultimoDoVertice = [];
  const primeiroDoVertice = [];
  for (let i = 0; i < n; i++) {
    const [d0, d1] = [d[(i + n - 1) % n], d[i]];
    const [n0, n1] = [normal(d0), normal(d1)];
    const cruz = d0[0] * d1[1] - d0[1] * d1[0];
    const cos = n0[0] * n1[0] + n0[1] * n1[1];
    const q = p[i];
    const nafora = cruz * delta > 1e-12; // o canto abre um leque: o convexo que cresce ou o côncavo que encolhe
    primeiroDoVertice.push(saida.length);
    if (nafora && junta === 'round') {
      const ang = Math.atan2(cruz, cos);
      const passos = Math.max(Math.round((fn * Math.abs(ang)) / (2 * Math.PI)), 1);
      for (let k = 0; k <= passos; k++) {
        const a = (ang * k) / passos;
        const [c, sn] = [Math.cos(a), Math.sin(a)];
        saida.push([q[0] + delta * (n0[0] * c - n0[1] * sn), q[1] + delta * (n0[0] * sn + n0[1] * c)]);
      }
    } else if (nafora && junta === 'square') {
      // o chanfro do Clipper: a reta tangente ao círculo de raio `delta`, perpendicular à bissetriz
      const t = Math.tan(Math.atan2(cruz, cos) / 4);
      saida.push([q[0] + delta * (n0[0] + t * d0[0]), q[1] + delta * (n0[1] + t * d0[1])], [q[0] + delta * (n1[0] - t * d1[0]), q[1] + delta * (n1[1] - t * d1[1])]);
    } else {
      const k = delta / (1 + cos);
      if (!Number.isFinite(k) || 1 + cos < 1e-9) return 'aresta que volta sobre si mesma no deslocamento';
      saida.push([q[0] + (n0[0] + n1[0]) * k, q[1] + (n0[1] + n1[1]) * k]);
    }
    ultimoDoVertice.push(saida.length - 1);
  }
  // cada aresta deslocada tem de seguir o sentido da original; se todas voltam, o polígono sumiu
  let invertidas = 0;
  for (let i = 0; i < n; i++) {
    const [a, b] = [saida[ultimoDoVertice[i]], saida[primeiroDoVertice[(i + 1) % n]]];
    if ((b[0] - a[0]) * d[i][0] + (b[1] - a[1]) * d[i][1] < -1e-9) invertidas++;
  }
  if (invertidas === n) return null;
  if (invertidas > 0 || seCruza(saida) || area2(saida) <= 0) return 'o contorno deslocado se cruza (aresta mais curta que o deslocamento ou polígono estreito demais)';
  return saida;
}

/* ---------- avaliação da árvore ---------- */

/* O caminho de um nó na árvore: o índice entre irmãos só entra onde o pai tem mais de um filho, porque num pai de filho único o
   índice é sempre 1 e só alongaria o id; dois nós distintos continuam com caminhos distintos. */
const ramo = (caminho, i, n) => (n > 1 ? junta(caminho, String(i + 1)) : caminho);
const junta = (...partes) => partes.filter((x) => x !== '' && x !== undefined).join('_');

const NOS_RECUSADOS = {
  minkowski: 'a soma de Minkowski 2D não existe no esboço',
  polyhedron: 'o poliedro livre não existe no esboço',
  surface: 'a superfície por imagem não existe no esboço',
  import: 'a malha importada não é receita',
  text: 'o texto não existe no esboço',
  offset: 'offset 2D fora de linear_extrude ou rotate_extrude não tem volume',
  projection: 'a projeção 2D de um sólido não existe no esboço',
  resize: 'o redimensionamento por nó não vem como matriz; escreva-o com scale no .scad',
  roof: 'o telhado 2D não existe no esboço',
  skin: 'o nó não existe no esboço',
  glide: 'o nó não existe no esboço',
};

function corDe(no) {
  const c = no.pos[0] ?? no.nomeados.c;
  if (Array.isArray(c) && c.length >= 3 && c.every(Number.isFinite)) {
    const hex = c.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0')).join('');
    return { cor: `#${hex}`, opacidade: c.length > 3 && c[3] < 1 ? arred(c[3]) : undefined };
  }
  return null;
}

function matrizDe(no) {
  const m = no.pos[0] ?? no.nomeados.m;
  const ok = Array.isArray(m) && m.length === 4 && m.every((l) => Array.isArray(l) && l.length === 4 && l.every(Number.isFinite));
  if (!ok) return null;
  if (Math.abs(m[3][0]) + Math.abs(m[3][1]) + Math.abs(m[3][2]) > TOL || Math.abs(m[3][3] - 1) > TOL) return null;
  return m;
}

const vec3 = (v, padrao) => (Array.isArray(v) && v.length === 3 && v.every(Number.isFinite) ? v : padrao);

class Avaliador {
  constructor({ frente }) {
    this.frente = frente;
    this.yaw = giroEmY(GIROS_DA_FRENTE[frente]);
    this.todas = [];
    this.recusas = [];
    this.avisos = [];
    this.contagem = {};
  }

  recusar(no, caminho, motivo) {
    this.recusas.push({ no: no.nome, linha: no.linha, caminho, motivo });
    return [];
  }

  aviso(no, caminho, texto) { this.avisos.push({ no: no.nome, linha: no.linha, caminho, texto }); }

  novo(tipo, no, caminho, M, cor, p) {
    const s = { tipo, no, caminho, M, cor, p, cortes: [], cortador: false, consumida: false, id: null, g: null };
    this.todas.push(s);
    return s;
  }

  /* --- 3D --- */
  filhos(no, M, cor, caminho) {
    const n = (no.filhos ?? []).length;
    return (no.filhos ?? []).flatMap((f, i) => this.avaliar(f, M, cor, ramo(caminho, i, n)));
  }

  avaliar(no, M, cor, caminho) {
    this.contagem[no.nome] = (this.contagem[no.nome] ?? 0) + 1;
    if (no.modificador === '%') { this.aviso(no, caminho, 'objeto de fundo (%) ignorado, como o OpenSCAD o ignora na renderização'); return []; }
    switch (no.nome) {
      case 'group': case 'union': case 'render': return this.filhos(no, M, cor, caminho);
      case 'multmatrix': {
        const m = matrizDe(no);
        if (!m) return this.recusar(no, caminho, 'matriz que não é 4x4 afim');
        return this.filhos(no, mul4(M, m), cor, caminho);
      }
      case 'color': return this.filhos(no, M, corDe(no) ?? cor, caminho); // a cor mais interna manda
      case 'cube': return this.cubo(no, M, cor, caminho);
      case 'cylinder': return this.cilindro(no, M, cor, caminho);
      case 'sphere': return this.esfera(no, M, cor, caminho);
      case 'difference': return this.diferenca(no, M, cor, caminho);
      case 'hull': return this.casco(no, M, cor, caminho);
      case 'minkowski': return this.minkowski(no, M, cor, caminho);
      case 'intersection': return this.intersecao(no, M, cor, caminho);
      case 'linear_extrude': return this.extrusaoLinear(no, M, cor, caminho);
      case 'rotate_extrude': return this.extrusaoRotativa(no, M, cor, caminho);
      case 'circle': case 'square': case 'polygon': return this.recusar(no, caminho, `${no.nome} 2D fora de linear_extrude ou rotate_extrude não tem volume`);
      default:
        return this.recusar(no, caminho, NOS_RECUSADOS[no.nome] ?? `nó "${no.nome}" desconhecido do importador`);
    }
  }

  cubo(no, M, cor, caminho) {
    const tam = no.nomeados.size ?? no.pos[0];
    const size = typeof tam === 'number' ? [tam, tam, tam] : vec3(tam, null);
    if (!size) return this.recusar(no, caminho, 'cube sem size numérico');
    if (size.some((x) => !(x > 0))) { this.aviso(no, caminho, 'cube com medida nula ou negativa: o OpenSCAD o descarta e o importador também'); return []; }
    const centrado = (no.nomeados.center ?? no.pos[1]) === true;
    const cs = centrado ? [0, 0, 0] : size.map((x) => x / 2);
    return [this.novo('caixa', no, caminho, M, cor, { size, cs })];
  }

  cilindro(no, M, cor, caminho) {
    const h = no.nomeados.h ?? no.pos[0];
    let r1 = no.nomeados.r1 ?? no.nomeados.r; let r2 = no.nomeados.r2 ?? no.nomeados.r;
    if (no.nomeados.d1 !== undefined) r1 = no.nomeados.d1 / 2;
    if (no.nomeados.d2 !== undefined) r2 = no.nomeados.d2 / 2;
    if (no.nomeados.d !== undefined) { r1 = no.nomeados.d / 2; r2 = no.nomeados.d / 2; }
    if (![h, r1, r2].every(Number.isFinite)) return this.recusar(no, caminho, 'cylinder sem h, r1 e r2 numéricos');
    if (!(h > 0) || (r1 <= 0 && r2 <= 0) || r1 < 0 || r2 < 0) { this.aviso(no, caminho, 'cylinder sem volume: o OpenSCAD o descarta e o importador também'); return []; }
    const centrado = no.nomeados.center === true;
    return [this.novo(Math.abs(r1 - r2) < TOL ? 'cilindro' : 'cone', no, caminho, M, cor, { h, r1, r2, cs: [0, 0, centrado ? 0 : h / 2], lados: ladosPedidos(no, Math.max(r1, r2)) })];
  }

  esfera(no, M, cor, caminho) {
    const r = no.nomeados.d !== undefined ? no.nomeados.d / 2 : (no.nomeados.r ?? no.pos[0]);
    if (!Number.isFinite(r)) return this.recusar(no, caminho, 'sphere sem r numérico');
    if (!(r > 0)) { this.aviso(no, caminho, 'sphere sem volume: descartada'); return []; }
    return [this.novo('esfera', no, caminho, M, cor, { r, cs: [0, 0, 0] })];
  }

  diferenca(no, M, cor, caminho) {
    const n = (no.filhos ?? []).length;
    const filhos = (no.filhos ?? []).map((f, i) => this.avaliar(f, M, cor, ramo(caminho, i, n)));
    const [positivos = [], ...cortes] = filhos;
    const cortadores = cortes.flat();
    for (const c of cortadores) c.cortador = true;
    for (const s of positivos) s.cortes.push(...cortadores);
    return positivos;
  }

  /* Interseção: cada operando que é uma caixa limpa vira seis placas cortadoras em volta dela; o operando que não é caixa é o
     que se corta. Duas formas que não são caixa não se cruzam no esboço. */
  intersecao(no, M, cor, caminho) {
    const n = (no.filhos ?? []).length;
    const operandos = (no.filhos ?? []).map((f, i) => this.avaliar(f, M, cor, ramo(caminho, i, n)));
    if (operandos.length === 0) return [];
    const eCaixa = (l) => l.length === 1 && l[0].tipo === 'caixa' && l[0].cortes.length === 0;
    const bases = operandos.filter((l) => !eCaixa(l));
    if (bases.length >= 2) return this.recusar(no, caminho, 'interseção entre dois sólidos que não são caixa: o esboço só recorta, e só expressa a interseção com uma caixa');
    const base = bases.length === 1 ? bases[0] : operandos[0];
    const recortes = bases.length === 1 ? operandos.filter((l) => l !== base) : operandos.slice(1);
    for (const [k, [caixa]] of recortes.entries()) {
      caixa.consumida = true;
      const placas = this.placasEmVolta(caixa, base, no, junta(caminho, `c${k + 1}`));
      for (const s of base) s.cortes.push(...placas);
    }
    return base;
  }

  placasEmVolta(caixa, base, no, caminho) {
    const g = this.geometria(caixa);
    if (!g) return [];
    const cantos = base.filter((s) => this.geometria(s)).flatMap((s) => { const a = this.geometria(s).aabb; return [0, 1].flatMap((i) => [0, 1].flatMap((j) => [0, 1].map((k) => [a.min[0] + i * (a.max[0] - a.min[0]), a.min[1] + j * (a.max[1] - a.min[1]), a.min[2] + k * (a.max[2] - a.min[2])]))); });
    const alcance = Math.max(...cantos.map((q) => norma(soma(q, esc(g.centro, -1))))) + norma(g.dims) / 2 + 1;
    const T = 2 * alcance;
    const placas = [];
    let n = 0;
    for (let i = 0; i < 3; i++) {
      for (const sinal of [-1, 1]) {
        n++;
        const eixo = coluna(g.R, i);
        const dims = [T, T, T];
        const centro = soma(g.centro, esc(eixo, sinal * (g.dims[i] / 2 + T / 2)));
        const s = this.novo('caixa', no, junta(caminho, `placa${n}`), null, null, {});
        s.cortador = true;
        s.sintetico = true;
        s.g = { forma: { tipo: 'caixa', largura: arred(dims[0]), altura: arred(dims[1]), profundidade: arred(dims[2]), centro: vet(centro), ...(g.forma.rotacao ? { rotacao: g.forma.rotacao } : {}) }, centro, R: g.R, dims, aabb: aabbDeCaixa(centro, g.R, dims) };
        placas.push(s);
      }
    }
    return placas;
  }

  /* --- hull e minkowski ---
     O casco só sai quando um sólido do esboço o expressa exatamente. Cada filho (cube, cylinder, linear_extrude) é um prismatoide de
     seções paralelas, e o casco de prismatoides de eixos paralelos é:
     - uma extrusão do casco 2D das bases, se todos são prismas da mesma faixa de altura (dois cilindros lado a lado, caixas);
     - um loft (ou cone, ou revolução, se a base é círculo) cujas seções são a base comum escalada pelo envelope côncavo superior das
       escalas ao longo da altura, se todas as seções são semelhantes entre si em torno do mesmo eixo (o casco de dois discos de raios
       diferentes, o de dois troncos opostos).
     O resto (esfera, eixos que se afastam com alturas diferentes, seções não semelhantes) é recusado com o motivo. */
  casco(no, M, cor, caminho) {
    const itens = [];
    let falha = null;
    const rejeitar = (motivo) => { falha = falha ?? motivo; };
    const filhosDe = (n, Mrel, cam) => { const k = (n.filhos ?? []).length; (n.filhos ?? []).forEach((f, i) => coletar(f, Mrel, ramo(cam, i, k))); };
    const coletar = (n, Mrel, cam) => {
      if (falha) return;
      this.contagem[n.nome] = (this.contagem[n.nome] ?? 0) + 1;
      if (n.modificador === '%') { this.aviso(n, cam, 'objeto de fundo (%) ignorado, como o OpenSCAD o ignora na renderização'); return; }
      switch (n.nome) {
        case 'group': case 'union': case 'color': case 'render': filhosDe(n, Mrel, cam); return;
        case 'multmatrix': {
          const m = matrizDe(n);
          if (!m) { rejeitar('matriz que não é 4x4 afim'); return; }
          filhosDe(n, mul4(Mrel, m), cam);
          return;
        }
        case 'cube': {
          const tam = n.nomeados.size ?? n.pos[0];
          const size = typeof tam === 'number' ? [tam, tam, tam] : vec3(tam, null);
          if (!size) { rejeitar('cube sem size numérico'); return; }
          if (size.some((x) => !(x > 0))) return;
          const o = (n.nomeados.center ?? n.pos[1]) === true ? size.map((x) => -x / 2) : [0, 0, 0];
          const base = [[o[0], o[1]], [o[0] + size[0], o[1]], [o[0] + size[0], o[1] + size[1]], [o[0], o[1] + size[1]]];
          itens.push({ Mrel, niveis: [{ z: o[2], pts: base }, { z: o[2] + size[2], pts: base }] });
          return;
        }
        case 'cylinder': {
          const h = n.nomeados.h ?? n.pos[0];
          let r1 = n.nomeados.r1 ?? n.nomeados.r; let r2 = n.nomeados.r2 ?? n.nomeados.r;
          if (n.nomeados.d1 !== undefined) r1 = n.nomeados.d1 / 2;
          if (n.nomeados.d2 !== undefined) r2 = n.nomeados.d2 / 2;
          if (n.nomeados.d !== undefined) { r1 = n.nomeados.d / 2; r2 = n.nomeados.d / 2; }
          if (![h, r1, r2].every(Number.isFinite)) { rejeitar('cylinder sem h, r1 e r2 numéricos'); return; }
          if (!(h > 0) || (r1 <= 0 && r2 <= 0) || r1 < 0 || r2 < 0) return;
          const nl = fragmentos(Math.max(r1, r2), resolucao(n));
          const z0 = n.nomeados.center === true ? -h / 2 : 0;
          itens.push({ Mrel, lados: ladosPedidos(n, Math.max(r1, r2)), niveis: [{ z: z0, pts: r1 > EPS ? pontosDoCirculo(r1, nl) : null }, { z: z0 + h, pts: r2 > EPS ? pontosDoCirculo(r2, nl) : null }] });
          return;
        }
        case 'linear_extrude': {
          const h = n.nomeados.height ?? n.pos[0];
          if (!(h > 0)) { rejeitar('linear_extrude sem height positivo'); return; }
          const esc2 = n.nomeados.scale;
          let [sx, sy] = [1, 1];
          if (typeof esc2 === 'number') [sx, sy] = [esc2, esc2];
          else if (Array.isArray(esc2) && esc2.length === 2 && esc2.every(Number.isFinite)) [sx, sy] = esc2;
          else if (esc2 !== undefined) { rejeitar('linear_extrude com scale que não é número nem [x, y]'); return; }
          if (sx < 0 || sy < 0 || (Math.abs(sx) < 1e-9) !== (Math.abs(sy) < 1e-9)) { rejeitar('linear_extrude com scale negativo ou zero num eixo só'); return; }
          if (Math.abs(n.nomeados.twist ?? 0) > TOL) { rejeitar('linear_extrude com twist'); return; }
          const z0 = n.nomeados.center === true ? -h / 2 : 0;
          for (const r of this.regioesDosFilhos(n, cam, false)) {
            const base = this.pontosDaRegiao(r).map((q) => aplica2(r.T, q));
            const ponta = Math.abs(sx) < 1e-9;
            itens.push({ Mrel, lados: r.tipo === 'circulo' ? r.n : undefined, niveis: [{ z: z0, pts: base }, { z: z0 + h, pts: ponta ? null : base.map(([x, y]) => [x * sx, y * sy]) }] });
          }
          return;
        }
        default: rejeitar(`${n.nome} dentro do hull: o casco exato só entende cube, cylinder e linear_extrude`);
      }
    };
    filhosDe(no, I4, caminho);
    const recusa = (motivo) => this.recusar(no, caminho, `hull: ${motivo}`);
    if (falha) return recusa(falha);
    if (itens.length === 0) return [];

    // o quadro do casco: o eixo é o z do primeiro filho, e as seções de todos têm de ser perpendiculares a ele
    const A0 = linear(itens[0].Mrel);
    const na = norma(coluna(A0, 2));
    if (na < EPS) return recusa('filho com o eixo colapsado');
    const a = esc(coluna(A0, 2), 1 / na);
    const c0 = coluna(A0, 0); const c1 = coluna(A0, 1);
    let e1 = soma(c0, esc(a, -dot(c0, a)));
    if (norma(e1) < 1e-9) e1 = soma(c1, esc(a, -dot(c1, a)));
    e1 = esc(e1, 1 / norma(e1));
    const e2 = [a[1] * e1[2] - a[2] * e1[1], a[2] * e1[0] - a[0] * e1[2], a[0] * e1[1] - a[1] * e1[0]];
    const O = [itens[0].Mrel[0][3], itens[0].Mrel[1][3], itens[0].Mrel[2][3]];
    const proj = (q) => { const d = [q[0] - O[0], q[1] - O[1], q[2] - O[2]]; return [dot(d, e1), dot(d, e2), dot(d, a)]; };
    for (const it of itens) {
      for (const nv of it.niveis) {
        const ps = (nv.pts ?? [[0, 0]]).map(([x, y]) => proj(aplica(it.Mrel, [x, y, nv.z])));
        nv.zc = ps[0][2];
        if (ps.some((q) => Math.abs(q[2] - nv.zc) > 1e-6)) return recusa('filhos de eixos que não são paralelos: as bases não ficam em planos perpendiculares a um eixo só');
        nv.xy = ps.map((q) => [q[0], q[1]]);
        nv.ponto = nv.pts === null;
      }
      it.o2 = proj(aplica(it.Mrel, [0, 0, 0])).slice(0, 2);
    }
    const mesmoConjunto = (P, Q) => P.length === Q.length && P.every((p) => Q.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6));
    const quadroDaForma = (origem2) => {
      const Ok = [0, 1, 2].map((i) => O[i] + e1[i] * origem2[0] + e2[i] * origem2[1]);
      return mul4(M, [[e1[0], e2[0], a[0], Ok[0]], [e1[1], e2[1], a[1], Ok[1]], [e1[2], e2[2], a[2], Ok[2]], [0, 0, 0, 1]]);
    };

    // 1) prismas da mesma faixa de altura: extrusão do casco 2D
    const prismas = itens.every((it) => it.niveis.length === 2 && !it.niveis[0].ponto && !it.niveis[1].ponto && mesmoConjunto(cascoConvexo2d(it.niveis[0].xy), cascoConvexo2d(it.niveis[1].xy)));
    if (prismas) {
      const faixas = itens.map((it) => [Math.min(it.niveis[0].zc, it.niveis[1].zc), Math.max(it.niveis[0].zc, it.niveis[1].zc)]);
      if (faixas.every(([lo, hi]) => Math.abs(lo - faixas[0][0]) < 1e-6 && Math.abs(hi - faixas[0][1]) < 1e-6)) {
        const casco = cascoConvexo2d(itens.flatMap((it) => it.niveis[0].xy));
        if (casco.length < 3 || !(faixas[0][1] > faixas[0][0])) return recusa('casco sem volume');
        const [lo, hi] = faixas[0];
        return [this.novo('extrusao', no, caminho, quadroDaForma([0, 0]), cor, { pontos: casco, h: hi - lo, cs: [0, 0, (lo + hi) / 2] })];
      }
    }

    // 2) seções semelhantes em torno do mesmo eixo: loft pelo envelope côncavo das escalas
    const o2 = itens[0].o2;
    if (itens.some((it) => Math.hypot(it.o2[0] - o2[0], it.o2[1] - o2[1]) > 1e-6)) return recusa('filhos com eixos afastados e alturas diferentes: o casco não é uma extrusão nem um loft de seções semelhantes');
    const niveis = itens.flatMap((it) => it.niveis.map((nv) => ({ z: nv.zc, ponto: nv.ponto, xy: nv.xy, Q: nv.ponto ? [[0, 0]] : cascoConvexo2d(nv.xy.map((q) => [q[0] - o2[0], q[1] - o2[1]])) })));
    const ref = niveis.find((nv) => !nv.ponto);
    if (!ref || ref.Q.length < 3) return recusa('casco sem seção com área');
    const Q0 = ref.Q;
    const A = area2(Q0);
    const noOrigem = Q0.every((p, i) => { const b = Q0[(i + 1) % Q0.length]; return (b[0] - p[0]) * (0 - p[1]) - (b[1] - p[1]) * (0 - p[0]) >= -1e-9; });
    if (!noOrigem) return recusa('a base não contém o eixo do casco: o casco não é o escalonamento dela');
    const amostras = [];
    for (const nv of niveis) {
      if (nv.ponto) {
        if (Math.hypot(nv.xy[0][0] - o2[0], nv.xy[0][1] - o2[1]) > 1e-6) return recusa('ponta fora do eixo do casco');
        amostras.push([nv.z, 0]);
        continue;
      }
      if (nv.Q.length !== Q0.length) return recusa('seções que não são semelhantes: contagens de vértices diferentes');
      const s = Math.sqrt(area2(nv.Q) / A);
      const tol = 1e-5 * Math.max(1, s * Math.max(...Q0.map((q) => Math.hypot(...q))));
      if (!Q0.every((v) => nv.Q.some((w) => Math.hypot(w[0] - s * v[0], w[1] - s * v[1]) < tol))) return recusa('seções que não são semelhantes em torno do eixo (bases de formas diferentes)');
      amostras.push([nv.z, s]);
    }
    amostras.sort((p, q) => p[0] - q[0] || q[1] - p[1]);
    const unicas = amostras.filter((q, i) => i === 0 || Math.abs(q[0] - amostras[i - 1][0]) > 1e-9);
    const env = [];
    for (const q of unicas) {
      while (env.length >= 2 && (env[env.length - 1][0] - env[env.length - 2][0]) * (q[1] - env[env.length - 2][1]) - (env[env.length - 1][1] - env[env.length - 2][1]) * (q[0] - env[env.length - 2][0]) >= -1e-12) env.pop();
      env.push(q);
    }
    if (env.length < 2) { this.aviso(no, caminho, 'hull sem altura: descartado'); return []; }
    const [z0, zN] = [env[0][0], env[env.length - 1][0]];
    const Mnovo = quadroDaForma(o2);
    const R0 = Math.hypot(...Q0[0]);
    const eCirculo = Q0.length >= 8 && Q0.every((q, i) => {
      if (Math.abs(Math.hypot(...q) - R0) > 1e-6 * Math.max(R0, 1)) return false;
      const d = Math.atan2(q[1], q[0]) - Math.atan2(Q0[0][1], Q0[0][0]) - (2 * Math.PI * i) / Q0.length;
      return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < 1e-6;
    });
    const lados = itens.map((it) => it.lados).find((x) => typeof x === 'number') ?? null;
    if (eCirculo && (lados === null || lados > LADOS_VISIVEIS)) {
      if (env.length === 2) {
        const [r1, r2] = [env[0][1] * R0, env[1][1] * R0];
        return [this.novo(Math.abs(r1 - r2) < TOL ? 'cilindro' : 'cone', no, caminho, Mnovo, cor, { h: zN - z0, r1, r2, cs: [0, 0, (z0 + zN) / 2], lados })];
      }
      return [this.novo('revolucao', no, caminho, Mnovo, cor, { perfil: env.map(([z, s]) => [s * R0, z - z0]), h: zN - z0, cs: [0, 0, (z0 + zN) / 2], lados })];
    }
    if (env.length === 2 && Math.abs(env[0][1] - env[1][1]) < TOL) {
      return [this.novo('extrusao', no, caminho, Mnovo, cor, { pontos: Q0.map(([x, y]) => [x * env[0][1], y * env[0][1]]), h: zN - z0, cs: [0, 0, (z0 + zN) / 2] })];
    }
    const secoes = env.map(([z, s]) => ({ z, pts: s < 1e-9 ? null : Q0.map(([x, y]) => [x * s, y * s]) }));
    return [this.novo('loft', no, caminho, Mnovo, cor, pLoft(secoes))];
  }

  /* minkowski(cubo, esfera) é a união de três caixas, doze cilindros nas arestas e oito esferas nos cantos; minkowski(cubo, cilindro)
     é a extrusão do retângulo deslocado do raio. Os dois são exatos. Qualquer outra soma é recusada. */
  minkowski(no, M, cor, caminho) {
    const recusa = (motivo) => this.recusar(no, caminho, `soma de Minkowski: ${motivo}`);
    const filhos = no.filhos ?? [];
    if (filhos.length !== 2) return recusa('só a soma de dois filhos (um cubo e uma esfera ou um cilindro) sai exata');
    const desembrulhar = (n) => {
      let t = [0, 0, 0]; let atual = n;
      while (atual && ['group', 'union', 'render', 'multmatrix'].includes(atual.nome)) {
        if (atual.nome === 'multmatrix') {
          const m = matrizDe(atual);
          const pura = m && [0, 1, 2].every((i) => [0, 1, 2].every((j) => Math.abs(m[i][j] - (i === j ? 1 : 0)) < TOL));
          if (!pura) return null;
          t = soma(t, [m[0][3], m[1][3], m[2][3]]);
        }
        if ((atual.filhos ?? []).length !== 1) return null;
        [atual] = atual.filhos;
      }
      return atual ? { n: atual, t } : null;
    };
    const [fa, fb] = filhos.map(desembrulhar);
    if (!fa || !fb) return recusa('os filhos têm de ser um cubo e uma esfera ou um cilindro, só com translação por fora');
    const eCubo = (f) => f.n.nome === 'cube';
    const ePequeno = (f) => ['sphere', 'cylinder'].includes(f.n.nome);
    const [cubo, pequeno] = eCubo(fa) && ePequeno(fb) ? [fa, fb] : (eCubo(fb) && ePequeno(fa) ? [fb, fa] : [null, null]);
    if (!cubo) return recusa('só a soma de um cubo com uma esfera ou um cilindro sai exata');
    for (const f of [cubo, pequeno]) this.contagem[f.n.nome] = (this.contagem[f.n.nome] ?? 0) + 1;
    const tam = cubo.n.nomeados.size ?? cubo.n.pos[0];
    const size = typeof tam === 'number' ? [tam, tam, tam] : vec3(tam, null);
    if (!size || size.some((x) => !(x > 0))) return recusa('cubo sem size positivo');
    const o = (cubo.n.nomeados.center ?? cubo.n.pos[1]) === true ? size.map((x) => -x / 2) : [0, 0, 0];
    const c = soma(cubo.t, pequeno.t);
    const [x0, y0, z0] = [o[0] + c[0], o[1] + c[1], o[2] + c[2]];
    const [x1, y1, z1] = [x0 + size[0], y0 + size[1], z0 + size[2]];
    const res = { $fn: pequeno.n.nomeados.$fn, $fa: pequeno.n.nomeados.$fa, $fs: pequeno.n.nomeados.$fs };
    const semUndef = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
    if (pequeno.n.nome === 'cylinder') {
      const h = pequeno.n.nomeados.h ?? pequeno.n.pos[0];
      let [r1, r2] = [pequeno.n.nomeados.r1 ?? pequeno.n.nomeados.r, pequeno.n.nomeados.r2 ?? pequeno.n.nomeados.r];
      if (pequeno.n.nomeados.d !== undefined) { r1 = pequeno.n.nomeados.d / 2; r2 = r1; }
      if (![h, r1, r2].every(Number.isFinite) || !(h > 0) || !(r1 > 0) || Math.abs(r1 - r2) > TOL) return recusa('o cilindro da soma tem de ser reto (r1 = r2) e ter h e r positivos');
      const zc0 = pequeno.n.nomeados.center === true ? -h / 2 : 0;
      const pontos = deslocarPoligono([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], r1, { junta: 'round', fn: fragmentos(r1, resolucao(pequeno.n)) });
      if (!Array.isArray(pontos)) return recusa('o retângulo deslocado não saiu');
      const [lo, hi] = [z0 + zc0, z1 + zc0 + h];
      return [this.novo('extrusao', no, caminho, M, cor, { pontos, h: hi - lo, cs: [0, 0, (lo + hi) / 2] })];
    }
    const r = pequeno.n.nomeados.d !== undefined ? pequeno.n.nomeados.d / 2 : (pequeno.n.nomeados.r ?? pequeno.n.pos[0]);
    if (!(r > 0)) return recusa('esfera sem r positivo');
    const no3 = (nome, nomeados, pos = []) => ({ nome, linha: no.linha, modificador: null, pos, nomeados, filhos: null });
    const move = (m, filho) => ({ ...no3('multmatrix', {}, [m]), filhos: [filho] });
    const T = (x, y, z) => [[1, 0, 0, x], [0, 1, 0, y], [0, 0, 1, z], [0, 0, 0, 1]];
    const partes = [];
    const caixa = (x, y, z, w, d, hh) => move(T(x, y, z), no3('cube', { size: [w, d, hh], center: false }));
    partes.push(caixa(x0 - r, y0, z0, size[0] + 2 * r, size[1], size[2]), caixa(x0, y0 - r, z0, size[0], size[1] + 2 * r, size[2]), caixa(x0, y0, z0 - r, size[0], size[1], size[2] + 2 * r));
    const cil = (len) => no3('cylinder', semUndef({ h: len, r, center: false, ...res }));
    for (const y of [y0, y1]) for (const z of [z0, z1]) partes.push(move([[0, 0, 1, x0], [0, 1, 0, y], [-1, 0, 0, z], [0, 0, 0, 1]], cil(size[0])));
    for (const x of [x0, x1]) for (const z of [z0, z1]) partes.push(move([[1, 0, 0, x], [0, 0, 1, y0], [0, -1, 0, z], [0, 0, 0, 1]], cil(size[1])));
    for (const x of [x0, x1]) for (const y of [y0, y1]) partes.push(move(T(x, y, z0), cil(size[2])));
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) partes.push(move(T(x, y, z), no3('sphere', semUndef({ r, ...res }))));
    const antes = { ...this.contagem };
    const formas = partes.flatMap((p, i) => this.avaliar(p, M, cor, junta(caminho, `m${i + 1}`)));
    this.contagem = antes;
    return formas;
  }

  /* --- 2D --- */
  regioesDosFilhos(no, caminho, paraRevolucao) {
    const n = (no.filhos ?? []).length;
    return (no.filhos ?? []).flatMap((f, i) => this.regioes(f, I4, ramo(caminho, i, n), paraRevolucao));
  }

  /* Os pontos do contorno externo de uma região, no quadro dela (antes de `T`). */
  pontosDaRegiao(r) {
    if (r.tipo === 'circulo') return pontosDoCirculo(r.r, r.nFrag);
    if (r.tipo === 'anel') return pontosDoCirculo(r.R, r.nFrag);
    if (r.tipo === 'retangulo') {
      const [w, hh] = r.size;
      const [ox, oy] = r.centrado ? [-w / 2, -hh / 2] : [0, 0];
      return [[ox, oy], [ox + w, oy], [ox + w, oy + hh], [ox, oy + hh]];
    }
    return r.pontos;
  }

  regioes(no, T, caminho, paraRevolucao) {
    this.contagem[no.nome] = (this.contagem[no.nome] ?? 0) + 1;
    const nf = (no.filhos ?? []).length;
    const filhos = () => (no.filhos ?? []).flatMap((f, i) => this.regioes(f, T, ramo(caminho, i, nf), paraRevolucao));
    switch (no.nome) {
      case 'group': case 'union': case 'color': case 'render': return filhos();
      case 'multmatrix': {
        const m = matrizDe(no);
        if (!m) return this.recusar(no, caminho, 'matriz que não é 4x4 afim');
        if (Math.abs(m[2][0]) + Math.abs(m[2][1]) + Math.abs(m[0][2]) + Math.abs(m[1][2]) > TOL) return this.recusar(no, caminho, 'matriz 2D que mistura o plano com z');
        const plana = [[m[0][0], m[0][1], 0, m[0][3]], [m[1][0], m[1][1], 0, m[1][3]], [0, 0, 1, 0], [0, 0, 0, 1]];
        return (no.filhos ?? []).flatMap((f, i) => this.regioes(f, mul4(T, plana), ramo(caminho, i, nf), paraRevolucao));
      }
      case 'circle': {
        const r = no.nomeados.d !== undefined ? no.nomeados.d / 2 : (no.nomeados.r ?? no.pos[0]);
        if (!Number.isFinite(r)) return this.recusar(no, caminho, 'circle sem r numérico');
        if (!(r > 0)) { this.aviso(no, caminho, 'circle sem área: o OpenSCAD o descarta e o importador também'); return []; }
        return [{ tipo: 'circulo', r, n: ladosPedidos(no, r), nFrag: fragmentos(r, resolucao(no)), T, no, caminho }];
      }
      case 'square': {
        const tam = no.nomeados.size ?? no.pos[0];
        const size = typeof tam === 'number' ? [tam, tam] : (Array.isArray(tam) && tam.length === 2 && tam.every(Number.isFinite) ? tam : null);
        if (!size || size.some((x) => !(x > 0))) return this.recusar(no, caminho, 'square sem size positivo');
        return [{ tipo: 'retangulo', size, centrado: (no.nomeados.center ?? no.pos[1]) === true, T, no, caminho }];
      }
      case 'polygon': {
        const pontos = no.nomeados.points ?? no.pos[0];
        if (!Array.isArray(pontos) || pontos.length < 3 || !pontos.every((q) => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite))) return this.recusar(no, caminho, 'polygon sem points [x, y]');
        const caminhos = no.nomeados.paths ?? no.pos[1];
        if (!Array.isArray(caminhos)) return [{ tipo: 'poligono', pontos, T, no, caminho }];
        const lacos = caminhos.map((c) => (Array.isArray(c) ? c.map((k) => pontos[k]) : null));
        if (lacos.some((l) => !l || l.length < 3 || l.some((q) => !q))) return this.recusar(no, caminho, 'polygon com paths que não indicam pontos de points');
        // cada caminho dentro de outro é furo (regra par-ímpar do OpenSCAD); um furo dentro de furo é uma ilha, que o perfil não tem
        const dentro = (q, laco) => { let ok = false; for (let i = 0, j = laco.length - 1; i < laco.length; j = i++) if ((laco[i][1] > q[1]) !== (laco[j][1] > q[1]) && q[0] < ((laco[j][0] - laco[i][0]) * (q[1] - laco[i][1])) / (laco[j][1] - laco[i][1]) + laco[i][0]) ok = !ok; return ok; };
        const prof = lacos.map((l, i) => lacos.filter((o, j) => j !== i && dentro(l[0], o)).length);
        if (prof.some((x) => x > 1)) return this.recusar(no, caminho, 'polygon com ilha dentro de furo: o perfil do esboço tem um contorno e furos, sem ilha dentro deles');
        const externos = lacos.map((l, i) => i).filter((i) => prof[i] === 0);
        return externos.map((i, k) => ({ tipo: 'poligono', pontos: lacos[i], furos: lacos.flatMap((m, j) => (prof[j] === 1 && dentro(m[0], lacos[i]) ? [{ tipo: 'poligono', pontos: m, T, no, caminho }] : [])), T, no, caminho: externos.length > 1 ? junta(caminho, `i${k + 1}`) : caminho }));
      }
      case 'difference': {
        const partes = (no.filhos ?? []).map((f, i) => this.regioes(f, T, ramo(caminho, i, nf), paraRevolucao));
        const [a = [], ...resto] = partes;
        const b = resto.flat();
        if (a.length === 0 || b.length === 0) return a;
        const anel = a.length === 1 && b.length === 1 && resto.length === 1 && a[0].tipo === 'circulo' && b[0].tipo === 'circulo' && !a[0].furos && !b[0].furos && a[0].r > b[0].r && a[0].T.every((l, i) => l.every((v, j) => Math.abs(v - b[0].T[i][j]) < TOL));
        if (anel) return [{ tipo: 'anel', R: a[0].r, r: b[0].r, n: a[0].n, nFrag: a[0].nFrag, T, no, caminho }];
        const cortes = b.flatMap((x) => (x.furos?.length ? this.semFuros(x) : [x]));
        if (cortes === null || cortes.some((x) => x === null)) return this.recusar(no, caminho, 'diferença 2D cujo subtraendo tem furo e não é convexo: o subtraendo (X - Y) só vira peças convexas quando X e Y são convexos');
        return a.map((r) => ({ ...r, furos: [...(r.furos ?? []), ...cortes] }));
      }
      case 'offset': return this.deslocamento(no, T, caminho, filhos());
      case 'hull': {
        const regioes = filhos();
        if (regioes.length === 0) return [];
        const casco = cascoConvexo2d(regioes.flatMap((r) => this.pontosDaRegiao(r).map((q) => aplica2(r.T, q))));
        if (casco.length < 3) return this.recusar(no, caminho, 'hull 2D sem área');
        return [{ tipo: 'poligono', pontos: casco, T: I4, no, caminho }];
      }
      case 'intersection': return this.recusar(no, caminho, 'interseção 2D não existe no esboço');
      default: return this.recusar(no, caminho, NOS_RECUSADOS[no.nome] ?? `nó 2D "${no.nome}" desconhecido do importador`);
    }
  }

  /* Uma região com furo, usada como subtraendo, em peças convexas sem furo (X - Y = união das peças): [null] se X ou um furo não é convexo. */
  semFuros(x) {
    const noQuadro = (r) => antiHorario(semRepetidos(this.pontosDaRegiao(r).map((q) => aplica2(r.T, q))));
    const X = noQuadro(x);
    if (!ehConvexo(X)) return [null];
    let pecas = [X];
    for (const fu of x.furos) {
      const Y = noQuadro(fu);
      if (!ehConvexo(Y)) return [null];
      pecas = pecas.flatMap((p) => diferencaConvexa(p, Y));
    }
    return pecas.map((pontos, i) => ({ tipo: 'poligono', pontos, T: I4, no: x.no, caminho: junta(x.caminho, `p${i + 1}`) }));
  }

  /* `offset(r=)` e `offset(delta=, chamfer=)` de uma região: o círculo continua círculo (de raio somado), e o polígono vira o polígono
     deslocado, com os arcos dos cantos em `$fn`, `$fa` e `$fs` do nó. O deslocamento vale no quadro do nó, antes das matrizes de fora. */
  deslocamento(no, T, caminho, regioes) {
    if (regioes.length === 0) return [];
    if (regioes.length > 1 || regioes[0].furos?.length) return this.recusar(no, caminho, 'offset de várias regiões ou de região com furo: o contorno deslocado dependeria de unir ou recortar as regiões');
    const raio = no.nomeados.r ?? (no.nomeados.delta === undefined ? no.pos[0] : undefined);
    const delta = no.nomeados.delta;
    const valor = raio ?? delta;
    if (!Number.isFinite(valor)) return this.recusar(no, caminho, 'offset sem r nem delta numérico');
    const junta = raio !== undefined ? 'round' : (no.nomeados.chamfer === true ? 'square' : 'miter');
    const [r0] = regioes;
    const dentro = inversa2(T);
    const rel = dentro ? mul4(dentro, r0.T) : null;
    if (!rel) return this.recusar(no, caminho, 'offset sob matriz singular');
    if (r0.tipo === 'circulo' && (r0.n === null || r0.n > LADOS_VISIVEIS)) { // círculo de verdade; com poucos lados é o polígono, que se desloca como polígono
      const k = escalaSemelhante(rel);
      if (k !== null) {
        const nr = r0.r + valor / k;
        if (!(nr > EPS)) { this.aviso(no, caminho, 'offset que encolhe o círculo até sumir: o OpenSCAD o descarta e o importador também'); return []; }
        return [{ ...r0, r: nr }];
      }
    }
    if (r0.tipo === 'anel') return this.recusar(no, caminho, 'offset de anel (círculo com furo concêntrico): o deslocamento do furo não vira anel');
    const pontos = this.pontosDaRegiao(r0).map((q) => aplica2(rel, q));
    const res = deslocarPoligono(pontos, valor, { junta, fn: fragmentos(Math.abs(valor), resolucao(no)) });
    if (res === null) { this.aviso(no, caminho, 'offset que encolhe o polígono até sumir: o OpenSCAD o descarta e o importador também'); return []; }
    if (typeof res === 'string') return this.recusar(no, caminho, `offset: ${res}`);
    return [{ tipo: 'poligono', pontos: res, T, no, caminho }];
  }

  /* Uma região 2D estendida entre as alturas de `ctx` com a escala linear do `linear_extrude`: prisma (cilindro, caixa, anel, extrusão)
     quando a escala é 1, e cone ou loft quando muda. O furo da região vira a mesma extrusão como cortador, porque extrude(A - B) =
     extrude(A) - extrude(B); o cortador passa um pouco das duas faces para o recorte não deixar película. */
  extrudar(r0, ctx, M, cor, cortador) {
    const { z0, z1, h, sx, sy } = ctx;
    const escalaEm = (z) => [1 + ((sx - 1) * (z - z0)) / h, 1 + ((sy - 1) * (z - z0)) / h];
    let [za, zb] = [z0, z1];
    if (cortador) {
      const folga = Math.min(0.01, h * 0.01);
      if (escalaEm(z0 - folga).every((v) => v > 1e-6)) za = z0 - folga;
      if (escalaEm(z1 + folga).every((v) => v > 1e-6)) zb = z1 + folga;
    }
    const [[ax, ay], [bx, by]] = [escalaEm(za), escalaEm(zb)];
    const hh = zb - za;
    const zc = (za + zb) / 2;
    const prisma = [ax, ay, bx, by].every((v) => Math.abs(v - 1) < TOL);
    const ponta = Math.abs(bx) < 1e-9 && Math.abs(by) < 1e-9; // escala 0: a seção do topo é um ponto
    // a escala é em torno da origem da extrusão: só um círculo com o centro nela continua círculo (cone); o resto vai para o quadro da extrusão
    const centrada = Math.abs(r0.T[0][3]) < TOL && Math.abs(r0.T[1][3]) < TOL && escalaSemelhante(r0.T) !== null;
    let r = r0;
    if (!prisma && r0.tipo === 'anel' && !centrada) r = { ...r0, tipo: 'circulo', r: r0.R, furos: [{ tipo: 'circulo', r: r0.r, n: r0.n, nFrag: r0.nFrag, T: r0.T, no: r0.no, caminho: r0.caminho }, ...(r0.furos ?? [])] };
    const noQuadroDaExtrusao = !prisma && !(['circulo', 'anel'].includes(r.tipo) && centrada);
    const Mr = noQuadroDaExtrusao ? M : mul4(M, r.T);
    const poeFuros = (positivos) => {
      const cortes = positivos.length === 0 ? [] : (r.furos ?? []).flatMap((fu, k) => this.extrudar(fu, ctx, M, cor, true).map((c, j) => { c.caminho = junta(r.caminho, `f${k + 1}${j > 0 ? `_${j + 1}` : ''}`); return c; }));
      for (const c of cortes) c.cortador = true;
      for (const s of positivos) s.cortes.push(...cortes);
      return positivos;
    };
    const emLoft = (pontos) => {
      if ((Math.abs(bx) < 1e-9) !== (Math.abs(by) < 1e-9)) return this.recusar(r.no, r.caminho, 'linear_extrude com scale zero num eixo só: a seção do topo seria um segmento');
      if (!ehConvexo(pontos) || !ehSimples(pontos)) return this.recusar(r.no, r.caminho, 'linear_extrude com scale sobre polígono côncavo: a seção do loft do esboço é convexa');
      const base = antiHorario(pontos);
      const secoes = [{ z: za, pts: base.map(([x, y]) => [x * ax, y * ay]) }, { z: zb, pts: ponta ? null : base.map(([x, y]) => [x * bx, y * by]) }];
      return [this.novo('loft', r.no, r.caminho, Mr, cor, pLoft(secoes))];
    };
    if (noQuadroDaExtrusao) return poeFuros(emLoft(this.pontosDaRegiao(r).map((q) => aplica2(r.T, q))));
    switch (r.tipo) {
      case 'circulo': {
        if (!prisma && (Math.abs(ax - ay) > TOL || Math.abs(bx - by) > TOL)) return this.recusar(r.no, r.caminho, 'linear_extrude com scale diferente em x e em y sobre um círculo: a seção seria uma elipse, e o cone do esboço é circular');
        const [r1, r2] = [r.r * ax, r.r * bx];
        return poeFuros([this.novo(Math.abs(r1 - r2) < TOL ? 'cilindro' : 'cone', r.no, r.caminho, Mr, cor, { h: hh, r1, r2, cs: [0, 0, zc], lados: r.n })]);
      }
      case 'retangulo':
        return poeFuros([this.novo('caixa', r.no, r.caminho, Mr, cor, { size: [...r.size, hh], cs: [r.centrado ? 0 : r.size[0] / 2, r.centrado ? 0 : r.size[1] / 2, zc] })]);
      case 'anel': {
        if (prisma) return poeFuros([this.novo('anel', r.no, r.caminho, Mr, cor, { R: r.R, r: r.r, h: hh, cs: [0, 0, zc], lados: r.n })]);
        if (Math.abs(ax - ay) > TOL || Math.abs(bx - by) > TOL) return this.recusar(r.no, r.caminho, 'linear_extrude com scale diferente em x e em y sobre um anel: a seção seria uma elipse');
        const tipoCone = Math.abs(ax - bx) < TOL ? 'cilindro' : 'cone';
        const cone = this.novo(tipoCone, r.no, r.caminho, Mr, cor, { h: hh, r1: r.R * ax, r2: r.R * bx, cs: [0, 0, zc], lados: r.n });
        const furo = this.novo(tipoCone, r.no, junta(r.caminho, 'furo'), Mr, cor, { h: hh, r1: r.r * ax, r2: r.r * bx, cs: [0, 0, zc], lados: r.n });
        furo.cortador = true;
        cone.cortes.push(furo);
        return poeFuros([cone]);
      }
      default:
        return poeFuros([this.novo('extrusao', r.no, r.caminho, Mr, cor, { pontos: r.pontos, h: hh, cs: [0, 0, zc] })]);
    }
  }

  extrusaoLinear(no, M, cor, caminho) {
    const h = no.nomeados.height ?? no.pos[0];
    if (!(h > 0)) return this.recusar(no, caminho, 'linear_extrude sem height positivo');
    const escala = no.nomeados.scale;
    let [sx, sy] = [1, 1];
    if (typeof escala === 'number') [sx, sy] = [escala, escala];
    else if (Array.isArray(escala) && escala.length === 2 && escala.every(Number.isFinite)) [sx, sy] = escala;
    else if (escala !== undefined) return this.recusar(no, caminho, 'linear_extrude com scale que não é número nem [x, y]');
    if (sx < 0 || sy < 0) return this.recusar(no, caminho, 'linear_extrude com scale negativo: espelha a seção ao longo da altura');
    if (Math.abs(no.nomeados.twist ?? 0) > TOL) return this.recusar(no, caminho, 'linear_extrude com twist: a torção não existe no esboço');
    const z0 = no.nomeados.center === true ? -h / 2 : 0;
    const ctx = { z0, z1: z0 + h, h, sx, sy };
    return this.regioesDosFilhos(no, caminho, false).flatMap((r) => this.extrudar(r, ctx, M, cor, false));
  }

  extrusaoRotativa(no, M, cor, caminho) {
    const angulo = no.nomeados.angle ?? 360;
    if (Math.abs(angulo - 360) > TOL) return this.recusar(no, caminho, 'rotate_extrude com angle diferente de 360: a revolução parcial não existe no esboço');
    return this.regioesDosFilhos(no, caminho, true).flatMap((r) => {
      const positivos = this.revolver(r, no, M, cor);
      if (positivos.length === 0 || !r.furos?.length) return positivos;
      // revolve(A - B) = revolve(A) - revolve(B)
      const cortes = r.furos.flatMap((fu) => this.revolver(fu, no, M, cor));
      for (const c of cortes) c.cortador = true;
      for (const s of positivos) s.cortes.push(...cortes);
      return positivos;
    });
  }

  revolver(r, no, M, cor) {
    let pontos;
    if (r.tipo === 'circulo') return this.recusar(r.no, r.caminho, 'rotate_extrude de círculo (toro): a revolução do esboço tem raio sobre o eixo e perfil que só sobe, e o toro tem furo e volta atrás');
    if (r.tipo === 'anel') return this.recusar(r.no, r.caminho, 'rotate_extrude de anel 2D: sem equivalente');
    pontos = r.tipo === 'retangulo' ? this.pontosDaRegiao(r) : r.pontos;
    pontos = pontos.map((q) => aplica2(r.T, q));
    if (pontos.some((q) => q[0] < -TOL)) return this.recusar(r.no, r.caminho, 'rotate_extrude com perfil em x negativo: o OpenSCAD também o recusa');
    const xs = [...new Set(pontos.map((q) => arred(q[0])))]; const ys = [...new Set(pontos.map((q) => arred(q[1])))];
    const eRetangulo = pontos.length === 4 && xs.length === 2 && ys.length === 2;
    const n = ladosPedidos(no, Math.max(...pontos.map((q) => q[0])));
    if (eRetangulo && Math.min(...xs) > TOL) {
      return [this.novo('anel', r.no, r.caminho, M, cor, { R: Math.max(...xs), r: Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), cs: [0, 0, (Math.max(...ys) + Math.min(...ys)) / 2], lados: n })];
    }
    const perfil = perfilDeRevolucao(pontos);
    if (typeof perfil === 'string') return this.recusar(r.no, r.caminho, perfil);
    const a0 = perfil[0][1]; const a1 = perfil[perfil.length - 1][1];
    return [this.novo('revolucao', r.no, r.caminho, M, cor, { perfil: perfil.map(([x, y]) => [x, y - a0]), h: a1 - a0, cs: [0, 0, (a0 + a1) / 2], lados: n })];
  }

  /* --- geometria no quadro do esboço --- */
  geometria(s) {
    if (s.g || s.falhou) return s.g;
    const Me = mul4(this.yaw, mul4(F_BASE, mul4(s.M, F_BASE_INV)));
    const A = linear(Me);
    const cols = [0, 1, 2].map((j) => coluna(A, j));
    const sc = cols.map(norma);
    const recusa = (motivo) => { this.recusar(s.no, s.caminho, motivo); s.falhou = true; return null; };
    if (sc.some((x) => x < EPS)) return recusa('matriz singular: a forma colapsa num plano ou numa reta');
    for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) if (Math.abs(dot(cols[a], cols[b])) > TOL * sc[a] * sc[b] * 1e3) return recusa(`cisalhamento: os eixos da forma deixam de ser perpendiculares e o esboço só gira e estica ao longo dos eixos`);
    let R = daColunas(...cols.map((c, i) => esc(c, 1 / sc[i])));
    const espelhada = det3(R) < 0;
    if (espelhada) R = daColunas(esc(coluna(R, 0), -1), coluna(R, 1), coluna(R, 2));
    const cs = s.p.cs;
    const cl = [cs[0], cs[2], -cs[1]];
    const centro = aplica(Me, cl);
    const p = s.p;
    const iguais = (a, b) => Math.abs(a - b) <= TOL * Math.max(a, b, 1);
    let forma; let comprimentoDoEixo = 0; let rMax = 0; let nucleo = null;
    switch (s.tipo) {
      case 'caixa': {
        const dims = [p.size[0] * sc[0], p.size[2] * sc[1], p.size[1] * sc[2]];
        forma = { tipo: 'caixa', largura: arred(dims[0]), altura: arred(dims[1]), profundidade: arred(dims[2]) };
        nucleo = { dims };
        break;
      }
      case 'esfera': {
        if (!iguais(sc[0], sc[1]) || !iguais(sc[1], sc[2])) return recusa('esfera com escala desigual (elipsoide): a esfera do esboço tem um diâmetro só');
        forma = { tipo: 'esfera', diametro: arred(2 * p.r * sc[0]) };
        nucleo = { raio: p.r * sc[0] };
        break;
      }
      case 'cilindro': case 'cone': {
        if (!iguais(sc[0], sc[2])) return recusa('cilindro ou cone com escala radial desigual (elíptico): o do esboço tem um diâmetro só');
        const comprimento = p.h * sc[1];
        let [r1, r2] = [p.r1 * sc[0], p.r2 * sc[0]];
        if (r1 < r2) { // a ponta do cone no início: gira 180° em torno de x
          [r1, r2] = [r2, r1];
          R = daColunas(coluna(R, 0), esc(coluna(R, 1), -1), esc(coluna(R, 2), -1));
        }
        forma = s.tipo === 'cilindro'
          ? { tipo: 'cilindro', diametro: arred(2 * r1), comprimento: arred(comprimento), eixo: 'y' }
          : { tipo: 'cone', diametro: arred(2 * r1), diametroTopo: arred(2 * r2), comprimento: arred(comprimento), eixo: 'y' };
        if (p.lados !== null && p.lados <= LADOS_VISIVEIS) {
          forma.lados = p.lados;
          if (p.lados < 8) this.aviso(s.no, s.caminho, `$fn = ${p.lados}: o esboço desenha o polígono, mas a blocagem N2 da receita só aceita de 8 a 128 lados`);
        }
        comprimentoDoEixo = comprimento; rMax = r1;
        break;
      }
      case 'anel': {
        if (!iguais(sc[0], sc[2])) return recusa('anel com escala radial desigual: o do esboço é circular');
        const comprimento = p.h * sc[1];
        forma = { tipo: 'anel', diametroExterno: arred(2 * p.R * sc[0]), diametroInterno: arred(2 * p.r * sc[0]), espessura: arred(comprimento), eixo: 'y' };
        if (p.lados !== null && p.lados < 32) return recusa(`anel com $fn = ${p.lados}: o anel do esboço tem de 32 lados em diante`);
        comprimentoDoEixo = comprimento; rMax = p.R * sc[0];
        break;
      }
      case 'extrusao': {
        const comprimento = p.h * sc[1];
        const flip = espelhada ? -1 : 1;
        const perfil = p.pontos.map(([u, v]) => [arred(flip * u * sc[0]), arred(-v * sc[2])]);
        forma = { tipo: 'extrusao', perfil, comprimento: arred(comprimento), eixo: 'y', origem: 'perfil' };
        nucleo = { pontos2d: perfil, comprimento };
        break;
      }
      case 'loft': {
        const [cx, cy, cz] = p.cs;
        const flip = espelhada ? -1 : 1;
        const secoes = p.secoes.map((se) => {
          const pos = arred((se.z - cz) * sc[1]);
          if (!se.pts) return { pos, forma: 'retangulo', tamanho: [0, 0], centro: [arred(flip * -cx * sc[0]), arred(cy * sc[2])] };
          return { pos, forma: 'poligono', perfil: se.pts.map(([x, y]) => [arred(flip * (x - cx) * sc[0]), arred(-(y - cy) * sc[2])]) };
        });
        forma = { tipo: 'loft', eixo: 'y', secoes };
        nucleo = { camadas: secoes.map((se) => ({ w: se.pos, pts: se.perfil ?? [se.centro] })) };
        break;
      }
      case 'revolucao': {
        if (!iguais(sc[0], sc[2])) return recusa('revolução com escala radial desigual: a do esboço é circular');
        const perfil = p.perfil.map(([x, y]) => [arred(x * sc[0]), arred(y * sc[1])]);
        forma = { tipo: 'revolucao', perfil, eixo: 'y' };
        if (p.lados !== null && p.lados <= LADOS_VISIVEIS) {
          if (p.lados < 6) return recusa(`revolução com $fn = ${p.lados}: a do esboço tem de 6 a 128 lados`);
          forma.lados = p.lados;
        }
        comprimentoDoEixo = p.h * sc[1]; rMax = Math.max(...perfil.map((q) => q[0]));
        break;
      }
      default: return recusa('tipo interno desconhecido');
    }
    forma.centro = vet(centro);
    const rot = angulosDaRotacao(R);
    if (rot.some((a) => Math.abs(a) > 1e-6)) forma.rotacao = rot;
    s.g = { forma, centro, R, ...aabbDoSolido(s.tipo, forma, centro, R, { comprimentoDoEixo, rMax, nucleo }) };
    return s.g;
  }
}

function aabbDeCaixa(centro, R, dims) {
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const q = soma(centro, soma(esc(coluna(R, 0), sx * dims[0] / 2), soma(esc(coluna(R, 1), sy * dims[1] / 2), esc(coluna(R, 2), sz * dims[2] / 2))));
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], q[i]); max[i] = Math.max(max[i], q[i]); }
  }
  return { min, max };
}

/* A caixa envolvente alinhada aos eixos de uma forma já posta, só para decidir quais cortadores a tocam. */
function aabbDoSolido(tipo, forma, centro, R, { comprimentoDoEixo, rMax, nucleo }) {
  if (tipo === 'caixa') return { dims: nucleo.dims, aabb: aabbDeCaixa(centro, R, nucleo.dims) };
  if (tipo === 'esfera') return { dims: [nucleo.raio * 2, nucleo.raio * 2, nucleo.raio * 2], aabb: { min: centro.map((c) => c - nucleo.raio), max: centro.map((c) => c + nucleo.raio) } };
  const eixo = coluna(R, 1);
  if (tipo === 'extrusao' || tipo === 'loft') {
    const camadas = tipo === 'loft' ? nucleo.camadas : [-0.5, 0.5].map((w) => ({ w: w * nucleo.comprimento, pts: nucleo.pontos2d }));
    const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
    for (const { w, pts } of camadas) for (const [u, v] of pts) {
      const q = soma(centro, soma(esc(coluna(R, 0), u), soma(esc(eixo, w), esc(coluna(R, 2), v))));
      for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], q[i]); max[i] = Math.max(max[i], q[i]); }
    }
    return { dims: [0, 0, 0], aabb: { min, max } };
  }
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const w of [-0.5, 0.5]) {
    const extremo = soma(centro, esc(eixo, w * comprimentoDoEixo));
    for (let i = 0; i < 3; i++) {
      const folga = rMax * Math.sqrt(Math.max(0, 1 - eixo[i] * eixo[i]));
      min[i] = Math.min(min[i], extremo[i] - folga); max[i] = Math.max(max[i], extremo[i] + folga);
    }
  }
  return { dims: [0, 0, 0], aabb: { min, max } };
}

/* O perfil `[raio, altura]` de uma revolução a partir do polígono 2D (x = raio, y = altura): o contorno visto do lado de fora, do
   pé ao topo do eixo. Devolve a lista, ou o motivo da recusa. */
function perfilDeRevolucao(pontos) {
  const n = pontos.length;
  const noEixo = pontos.map((q) => Math.abs(q[0]) < TOL);
  if (noEixo.filter(Boolean).length !== 2) return 'rotate_extrude de polígono que não toca o eixo em exatamente uma aresta (perfil oco): a revolução do esboço é maciça, e só o retângulo afastado do eixo vira anel';
  const k = pontos.findIndex((_, i) => noEixo[i] && noEixo[(i + 1) % n]);
  if (k < 0) return 'rotate_extrude cujos dois pontos do eixo não formam uma aresta';
  let cadeia = Array.from({ length: n }, (_, i) => pontos[(k + 1 + i) % n]);
  if (cadeia[0][1] > cadeia[n - 1][1]) cadeia = cadeia.reverse();
  for (let i = 1; i < n; i++) if (cadeia[i][1] < cadeia[i - 1][1] - TOL) return 'rotate_extrude com perfil que desce e sobe em z: a revolução do esboço só aceita altura que sobe';
  for (let i = 1; i < n - 1; i++) if (cadeia[i][0] < TOL) return 'rotate_extrude com ponto interior sobre o eixo: a revolução do esboço só fecha no polo da primeira e da última altura';
  if (!(cadeia[n - 1][1] - cadeia[0][1] > TOL)) return 'rotate_extrude sem altura';
  return cadeia.map(([x, y]) => [arred(x), arred(y)]);
}

/* ---------- da árvore ao esboço ---------- */

const sobrepoe = (a, b) => [0, 1, 2].every((i) => a.min[i] <= b.max[i] + TOL && b.min[i] <= a.max[i] + TOL);

/**
 * @param {string} texto o conteúdo do `.csg`
 * @param {{ frente?: string, nomes?: Record<string,string>, parcial?: boolean, arquivo?: string }} [opcoes]
 */
export function importarCsg(texto, { frente = '+y', girar = [0, 0, 0], nomes = {}, parcial = false, arquivo = 'objeto.csg' } = {}) {
  if (!Array.isArray(girar) || girar.length !== 3 || !girar.every(Number.isFinite)) throw new RecusaDeImportacao('girar deve ser [rx, ry, rz] em graus');
  if (!FRENTES.includes(frente)) throw new RecusaDeImportacao(`frente "${frente}" desconhecida; as válidas são ${FRENTES.join(', ')}`);
  const raiz = lerCsg(texto);
  const av = new Avaliador({ frente });
  const M0 = matrizDeGiro(girar);
  raiz.forEach((no, i) => av.avaliar(no, M0, null, ramo('', i, raiz.length)));
  for (const s of av.todas) if (!s.consumida && !s.sintetico) av.geometria(s);

  if (av.recusas.length > 0 && !parcial) {
    const linhas = av.recusas.map((r) => `  ${r.no} (linha ${r.linha}, nó ${r.caminho}): ${r.motivo}`);
    throw new RecusaDeImportacao(`o esboço não expressa ${av.recusas.length} nó${av.recusas.length > 1 ? 's' : ''} do .csg, e nada foi gravado:\n${linhas.join('\n')}`, av.recusas);
  }

  // positivos primeiro, para saber quais cortadores alguém usa
  const prontas = av.todas.filter((s) => !s.consumida && s.g);
  const usados = new Set();
  const cortesDe = new Map();
  const visitar = (s) => {
    const meus = s.cortes.filter((c) => c.g && !c.consumida && sobrepoe(s.g.aabb, c.g.aabb));
    cortesDe.set(s, meus);
    for (const c of meus) if (!usados.has(c)) { usados.add(c); visitar(c); }
  };
  for (const s of prontas.filter((x) => !x.cortador)) visitar(s);
  const emitidas = prontas.filter((s) => !s.cortador || usados.has(s));
  const semEfeito = prontas.filter((s) => s.cortador && !usados.has(s) && !s.sintetico).length;

  const contagemDeTipos = {};
  for (const s of emitidas) {
    const rotuloTipo = `${s.cortador ? 'corte_' : ''}${s.g.forma.tipo}`;
    contagemDeTipos[rotuloTipo] = (contagemDeTipos[rotuloTipo] ?? 0) + 1;
    s.idPosicional = junta(rotuloTipo, s.caminho);
  }
  const ids = new Set();
  for (const s of emitidas) {
    s.id = nomes[s.idPosicional] ?? s.idPosicional;
    if (ids.has(s.id)) throw new RecusaDeImportacao(`o id "${s.id}" se repete: dois nomes do mapa de nomes apontam para a mesma forma ou o nome colide com um id posicional`);
    ids.add(s.id);
  }
  const derivadas = emitidas.filter((s) => ['cilindro', 'cone', 'anel', 'revolucao'].includes(s.g.forma.tipo) && s.p.lados === null && !s.sintetico).length;
  if (derivadas > 0) av.avisos.push({ no: '(várias)', linha: null, caminho: '', texto: `${derivadas} forma(s) redonda(s) sem $fn: os lados vinham de $fa e $fs, que são a tesselação do OpenSCAD, e o esboço as tomou por círculo (com $fn explícito de até ${LADOS_VISIVEIS} o polígono é mantido)` });
  const semUso = Object.keys(nomes).filter((k) => !emitidas.some((s) => s.idPosicional === k));
  if (semUso.length > 0) throw new RecusaDeImportacao(`o mapa de nomes cita ids posicionais que a importação não produz: ${semUso.join(', ')}`);

  const formas = emitidas.map((s) => {
    const f = { id: s.id, ...s.g.forma };
    if (s.cor) { f.cor = s.cor.cor; if (s.cor.opacidade !== undefined) f.opacidade = s.cor.opacidade; }
    const meus = cortesDe.get(s) ?? [];
    if (meus.length > 0) f.subtrai = meus.map((c) => c.id);
    if (s.cortador) f.cortador = true;
    return f;
  });

  const giro = girar.some((g) => g !== 0);
  const nome = arquivo.replace(/^.*[\\/]/, '').replace(/\.csg$/i, '');
  const sha = createHash('sha256').update(texto).digest('hex');
  const nPositivas = formas.filter((f) => !f.cortador).length;
  const nCortadoras = formas.length - nPositivas;
  const partes = [
    `Importado de ${nome}.csg (sha256 ${sha.slice(0, 16)}) por importar-csg, sem desenhar à mão. Quadro: o z do OpenSCAD é o y do esboço (para cima), e a direção ${frente} do OpenSCAD é a frente do esboço, em -z; é uma rotação própria, sem espelhar nem escalar, em milímetro.${giro ? ` Antes disso o objeto foi girado [${girar.join(', ')}] graus no quadro do OpenSCAD (opção girar), como o rotate() do OpenSCAD, porque a fonte o desenha em outra posição.` : ''}`,
    `Formas: ${nPositivas} sólidas e ${nCortadoras} cortadoras (molde de recorte), com id posicional pela árvore do .csg, porque o .csg perde os nomes de módulo: quem nomeia as partes é o esbocista, e nada aqui é nome de parte.`,
    'O contato fica desligado porque a união do OpenSCAD sobrepõe as partes de propósito; o contrato de relações e as exceções são do esbocista.',
  ];
  if (av.recusas.length > 0) partes.push(`Importação parcial: ${av.recusas.length} nó(s) do .csg que o esboço não expressa ficaram de fora (${av.recusas.map((r) => `${r.no} na linha ${r.linha}`).join('; ')}); a forma está incompleta nesses pontos.`);

  const relatorio = {
    fonte: { arquivo: `${nome}.csg`, sha256: sha },
    quadro: { frente, girar, regra: '(x, y, z)_scad -> (x, z, -y), girado em torno de y para a frente escolhida ficar em -z; o giro de `girar` vem antes, no quadro do OpenSCAD' },
    nos: av.contagem,
    formas: emitidas.map((s) => ({ id: s.id, idPosicional: s.idPosicional, tipo: s.g.forma.tipo, cortador: s.cortador, no: s.no.nome, linha: s.no.linha, caminho: s.caminho })),
    sinteticas: emitidas.filter((s) => s.sintetico).length,
    cortadoresSemEfeito: semEfeito,
    recusas: av.recusas,
    avisos: av.avisos,
    tipos: contagemDeTipos,
  };
  const esboco = {
    plano: { texto: partes.join(' ') },
    contato: { usar: false },
    opcoes: [{ titulo: nome, nota: `Importado do .csg: ${nPositivas} formas e ${nCortadoras} cortadores`, formas }],
  };
  return { esboco, texto: serializar(esboco), relatorio };
}

/* Uma forma por linha, para o diff e a leitura. */
export function serializar(esboco) {
  const [opcao] = esboco.opcoes;
  const linhas = opcao.formas.map((f) => `        ${JSON.stringify(f)}`).join(',\n');
  return `{\n  "plano": ${JSON.stringify(esboco.plano)},\n  "contato": ${JSON.stringify(esboco.contato)},\n  "opcoes": [\n    {\n      "titulo": ${JSON.stringify(opcao.titulo)},\n      "nota": ${JSON.stringify(opcao.nota)},\n      "formas": [\n${linhas}\n      ]\n    }\n  ]\n}\n`;
}
