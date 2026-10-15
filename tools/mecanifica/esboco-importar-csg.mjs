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

   Diferença vira `subtrai` com `cortador`. Interseção com caixa vira seis cortadores em placa em volta dela. O resto da
   interseção, `hull`, `minkowski`, `polyhedron`, o cisalhamento, a escala desigual de cilindro e de esfera, a torção e a
   escala da extrusão, o polígono com furo e a revolução cujo perfil não sobe são recusados.

   Núcleo puro: recebe o texto e devolve `{ esboco, texto, relatorio }`. A linha de comando fica em `importar-csg.mjs`. */
import { createHash } from 'node:crypto';

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

/* ---------- avaliação da árvore ---------- */

/* O caminho de um nó na árvore: o índice entre irmãos só entra onde o pai tem mais de um filho, porque num pai de filho único o
   índice é sempre 1 e só alongaria o id; dois nós distintos continuam com caminhos distintos. */
const ramo = (caminho, i, n) => (n > 1 ? junta(caminho, String(i + 1)) : caminho);
const junta = (...partes) => partes.filter((x) => x !== '' && x !== undefined).join('_');

const NOS_RECUSADOS = {
  hull: 'o casco convexo de formas não existe no esboço',
  minkowski: 'a soma de Minkowski não existe no esboço',
  polyhedron: 'o poliedro livre não existe no esboço',
  surface: 'a superfície por imagem não existe no esboço',
  import: 'a malha importada não é receita',
  text: 'o texto não existe no esboço',
  offset: 'o deslocamento de contorno 2D não existe no esboço',
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

  /* --- 2D --- */
  regioesDosFilhos(no, caminho, paraRevolucao) {
    const n = (no.filhos ?? []).length;
    return (no.filhos ?? []).flatMap((f, i) => this.regioes(f, I4, ramo(caminho, i, n), paraRevolucao));
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
        if (!(r > 0)) return this.recusar(no, caminho, 'circle sem r positivo');
        return [{ tipo: 'circulo', r, n: ladosPedidos(no, r), T, no, caminho }];
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
        let seq = pontos;
        if (Array.isArray(caminhos)) {
          if (caminhos.length !== 1) return this.recusar(no, caminho, 'polígono com mais de um caminho (furo): o perfil do esboço é um polígono simples');
          seq = caminhos[0].map((k) => pontos[k]);
        }
        return [{ tipo: 'poligono', pontos: seq, T, no, caminho }];
      }
      case 'difference': {
        const partes = (no.filhos ?? []).map((f, i) => this.regioes(f, T, ramo(caminho, i, nf), paraRevolucao));
        const [a, b, ...mais] = partes;
        const ok = a?.length === 1 && b?.length === 1 && mais.length === 0 && a[0].tipo === 'circulo' && b[0].tipo === 'circulo' && a[0].r > b[0].r && a[0].T.every((l, i) => l.every((v, j) => Math.abs(v - b[0].T[i][j]) < TOL));
        if (!ok) return this.recusar(no, caminho, 'diferença 2D que não é um círculo menos outro concêntrico (anel): o perfil do esboço é um polígono simples, sem furo');
        return [{ tipo: 'anel', R: a[0].r, r: b[0].r, n: a[0].n, T, no, caminho }];
      }
      case 'intersection': return this.recusar(no, caminho, 'interseção 2D não existe no esboço');
      default: return this.recusar(no, caminho, NOS_RECUSADOS[no.nome] ?? `nó 2D "${no.nome}" desconhecido do importador`);
    }
  }

  extrusaoLinear(no, M, cor, caminho) {
    const h = no.nomeados.height ?? no.pos[0];
    if (!(h > 0)) return this.recusar(no, caminho, 'linear_extrude sem height positivo');
    const escala = no.nomeados.scale;
    const semEscala = escala === undefined || escala === 1 || (Array.isArray(escala) && escala.every((x) => Math.abs(x - 1) < TOL));
    if (!semEscala) return this.recusar(no, caminho, 'linear_extrude com scale: a seção que muda ao longo da altura não é uma extrusão (seria um loft)');
    if (Math.abs(no.nomeados.twist ?? 0) > TOL) return this.recusar(no, caminho, 'linear_extrude com twist: a torção não existe no esboço');
    const centrado = no.nomeados.center === true;
    return this.regioesDosFilhos(no, caminho, false).flatMap((r) => {
      const Mr = mul4(M, r.T);
      const zc = centrado ? 0 : h / 2;
      if (r.tipo === 'circulo') return [this.novo('cilindro', r.no, r.caminho, Mr, cor, { h, r1: r.r, r2: r.r, cs: [0, 0, zc], lados: r.n })];
      if (r.tipo === 'retangulo') return [this.novo('caixa', r.no, r.caminho, Mr, cor, { size: [...r.size, h], cs: [r.centrado ? 0 : r.size[0] / 2, r.centrado ? 0 : r.size[1] / 2, zc] })];
      if (r.tipo === 'anel') return [this.novo('anel', r.no, r.caminho, Mr, cor, { R: r.R, r: r.r, h, cs: [0, 0, zc], lados: r.n })];
      return [this.novo('extrusao', r.no, r.caminho, Mr, cor, { pontos: r.pontos, h, cs: [0, 0, zc] })];
    });
  }

  extrusaoRotativa(no, M, cor, caminho) {
    const angulo = no.nomeados.angle ?? 360;
    if (Math.abs(angulo - 360) > TOL) return this.recusar(no, caminho, 'rotate_extrude com angle diferente de 360: a revolução parcial não existe no esboço');
    return this.regioesDosFilhos(no, caminho, true).flatMap((r) => {
      let pontos;
      if (r.tipo === 'circulo') return this.recusar(r.no, r.caminho, 'rotate_extrude de círculo (toro): a revolução do esboço tem raio sobre o eixo e perfil que só sobe, e o toro tem furo e volta atrás');
      if (r.tipo === 'anel') return this.recusar(r.no, r.caminho, 'rotate_extrude de anel 2D: sem equivalente');
      if (r.tipo === 'retangulo') { const [w, hh] = r.size; const ox = r.centrado ? -w / 2 : 0; const oy = r.centrado ? -hh / 2 : 0; pontos = [[ox, oy], [ox + w, oy], [ox + w, oy + hh], [ox, oy + hh]]; } else pontos = r.pontos;
      pontos = pontos.map((q) => { const t = [r.T[0][0] * q[0] + r.T[0][1] * q[1] + r.T[0][3], r.T[1][0] * q[0] + r.T[1][1] * q[1] + r.T[1][3]]; return t; });
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
    });
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
  if (tipo === 'extrusao') {
    const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
    for (const w of [-0.5, 0.5]) for (const [u, v] of nucleo.pontos2d) {
      const q = soma(centro, soma(esc(coluna(R, 0), u), soma(esc(eixo, w * nucleo.comprimento), esc(coluna(R, 2), v))));
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
