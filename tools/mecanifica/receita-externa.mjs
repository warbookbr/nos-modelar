/* Tradutor da receita do externo (repositório externo da pessoa, `externo/receitas/<id>.json`, já expandida pelo `receita.py`) para o esboço do Mecanifica, e o caminho de volta.
   Núcleo puro: recebe o objeto da receita (ou do esboço) e devolve `{ esboco, recusas }` (ou `{ receita, recusas }`).

   Quadro. A receita é em metro, com x leste, y norte, z para cima e o objeto virado para o sul (frente em -y). O esboço é em milímetro, com y para
   cima e a frente em +z: (x, y, z) vira (x, z, -y). Essa troca é uma rotação própria, então a matriz `P` dela leva a rotação da receita à do esboço
   por `P·R·Pᵀ`, e a volta usa `Pᵀ`.

   Formas. `caixa` vira caixa (com `chanfro` limitado a 20% da menor medida: teto deste tradutor, porque a sonda de 2026-10-19 achou que o esboço
   recusa chanfro perto da metade da menor medida), `cilindro` vira cilindro ou
   cone (`raio_topo`), `prisma` vira extrusão. O cone do esboço dá o `diametro` no início do eixo, e o início cai na ponta de cima da receita quando
   o eixo dela é y (o sentido troca). Se essa ponta tem raio zero, a forma gira 180° em torno de um eixo perpendicular, para o início cair na
   ponta de raio positivo, e o giro vai no `rotacao`.

   Rotação. `rot` da receita (Euler XYZ do Blender, `R = Rz·Ry·Rx`, em torno do centro da peça) vira `rotacao` do esboço com a mesma convenção
   (`angulosDaMatriz` do módulo, medida no caso da caixa: rx = +90 leva +y a +z). A peça com `cortes`, `curva` ou `afinar` ainda não é traduzida, e a
   extrusão cujo perfil se cruza na receita de origem também não; as duas saem em `recusas` com o motivo.

   Materiais. O bloco `realista.materiais` e a tabela `cores` da receita passam para o `materiais` da raiz do esboço sem perda, e cada forma leva o
   nome do seu `material`. O esboço guarda e não interpreta (ver o tópico `materiais` da ajuda do esboço); `materiaisParaReceita` faz o caminho de volta. */

import { angulosDaMatriz } from '../../modulos/esboco/src/giro.js';
import { ehSimples } from '../../procedural/nucleo/contorno.js';

const mm = (v) => Math.round(v * 1e6) / 1e3;
const r3 = (v) => Math.round(v * 1000) / 1000;
const r7 = (v) => Math.round(v * 1e7) / 1e7;
const hex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
const girada = (p) => Boolean(p.rot) && p.rot.some((a) => Math.abs(a) > 1e-6);
const zero = (v) => (Math.abs(v) < 1e-9 ? 0 : v);

const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
/* receita (x, y, z) → esboço (x, z, -y); a inversa Q = Pᵀ faz a volta: esboço (x, y, z) → receita (x, -z, y). */
const P = [[1, 0, 0], [0, 0, 1], [0, -1, 0]];
const Q = [[1, 0, 0], [0, 0, -1], [0, 1, 0]];
/* giro de 180° em torno de cada eixo do esboço, para trocar o início do eixo de um cone sem trocar as pontas */
const VIRA = { x: [[1, 0, 0], [0, -1, 0], [0, 0, -1]], y: [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], z: [[-1, 0, 0], [0, -1, 0], [0, 0, 1]] };
/* eixo da receita ↔ eixo do esboço: x fica, y e z trocam (a troca é a mesma nos dois sentidos) */
const EIXO_TROCADO = { x: 'x', y: 'z', z: 'y' };
const VETOR = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
/* direção do vértice 0 do polígono do cilindro da receita, por eixo da receita (o vértice de ângulo 0 de `verticesDaPeca`) */
const VERTICE_0 = { x: [0, 1, 0], y: [0, 0, 1], z: [1, 0, 0] };
/* o `base(eixo)` do esboço: o eixo do cilindro e a direção u em que o polígono começa (`circuloN` começa em u) */
const BASE_ESBOCO = { x: { e: 0, u: 2 }, y: { e: 1, u: 0 }, z: { e: 2, u: 0 } };
/* o que o caminho de volta não lê: posição por relação, furos, raio de canto e os campos de cone e de extrusão que a tradução não gera */
const RELACOES = ['sobre', 'ponta', 'de', 'para', 'encosta', 'alinha', 'encaixa', 'daInstancia', 'daLigacao', 'subtrai', 'cortador', 'porta', 'espelha', 'arranja', 'arranjoDe', 'caminho', 'substitui'];

const mmul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const aplicar = (M, v) => M.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const ehIdentidade = (M) => M.every((r, i) => r.every((v, j) => Math.abs(v - (i === j ? 1 : 0)) < 1e-9));
const aEsboco = (v) => aplicar(P, v).map(mm);
const transpor = (M) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => M[j][i]));
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const produto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/* a rotação de `t` radianos em torno do eixo unitário `e` (regra da mão direita) */
const rotacaoEm = (e, t) => {
  const [x, y, z] = e; const c = Math.cos(t); const s = Math.sin(t); const k = 1 - c;
  return [[c + k * x * x, k * x * y - s * z, k * x * z + s * y], [k * x * y + s * z, c + k * y * y, k * y * z - s * x], [k * x * z - s * y, k * y * z + s * x, c + k * z * z]];
};

/* A rotação em torno do eixo do esboço que põe o polígono do cilindro no mesmo lugar que o da receita. Os dois são regulares de n lados, então
   só a fase conta: o vértice 0 da receita, trocado de quadro, cai num ângulo que o `circuloN` do esboço não tem; gira-se o cilindro do esboço
   por esse ângulo, módulo 360°/n (o menor). A volta desfaz essa rotação. Com a fase já igual (por exemplo, n = 24 em eixo y), dá a identidade. */
function faseDoCilindro(eixoR, eixoE, n) {
  const w = aplicar(P, VERTICE_0[eixoR]);
  const u = [0, 1, 2].map((k) => (k === BASE_ESBOCO[eixoE].u ? 1 : 0));
  const e = [0, 1, 2].map((k) => (k === BASE_ESBOCO[eixoE].e ? 1 : 0));
  const passo = (2 * Math.PI) / n;
  const psi = Math.atan2(produto(cruz(u, w), e), produto(u, w));
  return rotacaoEm(e, psi - passo * Math.round(psi / passo));
}

/** Euler XYZ do Blender em graus: `R = Rz·Ry·Rx`, a mesma convenção de `rotacao` do esboço. */
export function matrizDeEuler([rx, ry, rz]) {
  const [a, b, c] = [rx, ry, rz].map((v) => (v * Math.PI) / 180);
  const Rx = [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  const Ry = [[Math.cos(b), 0, Math.sin(b)], [0, 1, 0], [-Math.sin(b), 0, Math.cos(b)]];
  const Rz = [[Math.cos(c), -Math.sin(c), 0], [Math.sin(c), Math.cos(c), 0], [0, 0, 1]];
  return mmul(Rz, mmul(Ry, Rx));
}

/* A matriz de um `rotacao` do esboço (lista, `{ eixo, angulo }`, `{ x, y, z }` ou número, que gira em y), como `matrizRotacao` lê. */
function matrizDoEsboco(rot) {
  if (!rot) return I;
  if (Array.isArray(rot)) return matrizDeEuler(rot);
  if (typeof rot === 'number') return matrizDeEuler([0, rot, 0]);
  if (rot.eixo) return matrizDeEuler(['x', 'y', 'z'].map((e) => (e === rot.eixo ? rot.angulo : 0)));
  return matrizDeEuler([rot.x ?? 0, rot.y ?? 0, rot.z ?? 0]);
}

/* Os ângulos [rx, ry, rz] do esboço para uma matriz, ou null quando é a identidade (a peça sem giro não leva o campo). */
const rotacaoDe = (M) => (ehIdentidade(M) ? null : angulosDaMatriz(M).map((v) => zero(Math.round(v * 1e6) / 1e6)));
const comRotacao = (M) => { const r = rotacaoDe(M); return r ? { rotacao: r } : {}; };

/** O bloco de materiais do esboço a partir da receita: `{ nome: { tipo, ...campos de realista.materiais, cor } }`; um nome só de `cores` leva `declarado: false`. */
export function materiaisDaReceita(receita) {
  const real = receita.realista?.materiais ?? {};
  const cores = receita.cores ?? {};
  const saida = {};
  for (const nome of new Set([...Object.keys(real), ...Object.keys(cores), ...receita.pecas.map((p) => p.material ?? receita.material).filter(Boolean)])) {
    const m = real[nome];
    saida[nome] = { tipo: m?.tipo ?? 'liso', ...(m ? Object.fromEntries(Object.entries(m).filter(([k]) => k !== 'tipo')) : { declarado: false }) };
    if (cores[nome]) saida[nome].cor = cores[nome];
  }
  return saida;
}

/** O caminho de volta dos materiais: `{ cores, realista: { materiais }, materialPorPeca }`, com o que a receita tinha. */
export function materiaisParaReceita(esboco) {
  const cores = {}; const real = {};
  for (const [nome, m] of Object.entries(esboco.materiais ?? {})) {
    const { tipo, cor, declarado, ...resto } = m;
    if (cor) cores[nome] = cor;
    if (declarado !== false) real[nome] = { tipo, ...resto };
  }
  const materialPorPeca = {};
  for (const o of esboco.opcoes ?? []) for (const f of o.formas ?? []) if (f.material) materialPorPeca[f.rotulo ?? f.id] = f.material;
  return { cores, realista: { materiais: real }, materialPorPeca };
}

/** O chanfro que o esboço carrega, em mm (0 quando não há): o da receita, limitado a 20% da menor medida da caixa; abaixo de 0,5 mm não entra. */
export function chanfroDoEsboco(p) {
  const ch = (p.chanfro ?? 0) * 1000;
  if (p.forma !== 'caixa' || ch < 0.5) return 0;
  const teto = Math.min(...[0, 1, 2].map((i) => mm(p.max[i] - p.min[i]))) * 0.2;
  return r3(Math.min(ch, teto));
}

/** A receita para esboço: `{ esboco, recusas }`. Cada peça traduzida leva o `rotulo` com o nome da receita. */
export function receitaParaEsboco(receita) {
  const formas = []; const recusas = []; const usados = new Set();
  const id = (n) => { const b = n.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'peca'; let k = b; let i = 2; while (usados.has(k)) k = `${b}_${i++}`; usados.add(k); return k; };
  for (const p of receita.pecas) {
    if (p.cortes || p.curva || p.afinar) { recusas.push({ peca: p.nome, motivo: 'cortes, curva ou afinar' }); continue; }
    if (p.forma === 'prisma' && !ehSimples(p.perfil)) { recusas.push({ peca: p.nome, motivo: 'perfil da extrusão com arestas que se cruzam (na receita de origem)' }); continue; }
    const base = { id: id(p.nome), rotulo: p.nome, material: p.material ?? receita.material };
    const cor = receita.cores?.[base.material];
    if (cor) base.cor = hex(cor);
    /* a rotação da receita trocada para o quadro do esboço, em torno do mesmo centro */
    const Re = mmul(P, mmul(girada(p) ? matrizDeEuler(p.rot) : I, Q));
    if (p.forma === 'caixa') {
      const d = [0, 1, 2].map((i) => p.max[i] - p.min[i]);
      const c = [0, 1, 2].map((i) => (p.min[i] + p.max[i]) / 2);
      const f = { ...base, ...comRotacao(Re), tipo: 'caixa', largura: mm(d[0]), altura: mm(d[2]), profundidade: mm(d[1]), centro: aEsboco(c) };
      const ch = chanfroDoEsboco(p);
      if (ch) f.chanfro = ch;
      formas.push(f);
    } else if (p.forma === 'cilindro') {
      const eixo = p.eixo ?? 'z'; const h = p.altura; const r = p.raio;
      const eixoE = EIXO_TROCADO[eixo];
      const centro = aEsboco(p.centro.map((v, i) => v + (h / 2) * VETOR[eixo][i]));
      if (p.raio_topo !== undefined && Math.abs(p.raio_topo - r) > 1e-9) {
        /* o início do eixo do esboço cai na ponta de cima da receita quando o eixo é y (o sentido troca); o `diametro` vai no início.
           Se a ponta que cai no início tem raio zero, a forma gira 180° em torno de um eixo perpendicular e a outra ponta cai no início */
        const inicioNoTopo = eixo === 'y';
        const rInicio = inicioNoTopo ? p.raio_topo : r; const rFim = inicioNoTopo ? r : p.raio_topo;
        let M = Re; let [dBase, dTopo] = [rInicio, rFim];
        if (rInicio <= 0) { M = mmul(Re, VIRA[eixoE === 'x' ? 'y' : 'x']); [dBase, dTopo] = [rFim, rInicio]; }
        formas.push({ ...base, ...comRotacao(M), tipo: 'cone', diametro: mm(2 * dBase), diametroTopo: mm(2 * dTopo), comprimento: mm(h), eixo: eixoE, centro });
      } else {
        const n = p.segmentos ?? 24;
        formas.push({ ...base, ...comRotacao(mmul(Re, faseDoCilindro(eixo, eixoE, n))), tipo: 'cilindro', diametro: mm(2 * r), comprimento: mm(h), eixo: eixoE, centro, lados: n });
      }
    } else if (p.forma === 'prisma') {
      const us = p.perfil.map((q) => q[0]); const vs = p.perfil.map((q) => q[1]);
      const uc = (Math.min(...us) + Math.max(...us)) / 2; const vc = (Math.min(...vs) + Math.max(...vs)) / 2;
      const L = p.ate - p.de; const lc = (p.de + p.ate) / 2;
      const centro = aEsboco(p.eixo === 'y' ? [uc, lc, vc] : [lc, uc, vc]);
      if (p.eixo === 'y') formas.push({ ...base, ...comRotacao(Re), tipo: 'extrusao', eixo: 'z', perfil: p.perfil.map(([a, z]) => [mm(a), mm(z)]), comprimento: mm(L), centro });
      else formas.push({ ...base, ...comRotacao(Re), tipo: 'extrusao', eixo: 'x', perfil: p.perfil.map(([a, z]) => [mm(-a), mm(z)]), comprimento: mm(L), centro });
    } else recusas.push({ peca: p.nome, motivo: `forma ${p.forma}` });
  }
  return { esboco: { materiais: materiaisDaReceita(receita), opcoes: [{ titulo: receita.id, nota: (receita.nota ?? '').slice(0, 200), formas }], vista: 'isometrica' }, recusas };
}

/* O motivo pelo qual uma forma do esboço não volta para a receita, ou null. */
function motivoDaVolta(f) {
  if (!['caixa', 'cilindro', 'cone', 'extrusao'].includes(f.tipo)) return `forma ${f.tipo} sem caminho de volta`;
  const relacao = RELACOES.find((k) => f[k] !== undefined);
  if (relacao) return `"${relacao}": posição por relação, sem coordenada para a volta`;
  if (!Array.isArray(f.centro) || f.centro.length !== 3 || !f.centro.every(Number.isFinite)) return 'centro sem coordenada numérica';
  if (f.tipo === 'caixa' && (f.raio !== undefined || f.furos !== undefined || f.furo !== undefined)) return 'caixa com raio de canto ou furo, sem volta';
  if ((f.tipo === 'cilindro' || f.tipo === 'cone') && f.achatado !== undefined) return 'cilindro ou cone com face plana, sem volta';
  if (f.tipo === 'extrusao' && f.eixo !== 'z' && f.eixo !== 'x') return `extrusão ao longo de ${f.eixo}, sem volta (a receita só extrui em x ou y)`;
  return null;
}

/** O caminho de volta: o esboço (primeira opção) para `{ receita, recusas }`, com as formas caixa, cilindro, cone e extrusão, a rotação e o bloco de materiais. */
export function esbocoParaReceita(esboco) {
  const opcao = esboco.opcoes?.[0] ?? {};
  const pecas = []; const recusas = [];
  for (const f of opcao.formas ?? []) {
    const nome = f.rotulo ?? f.id;
    const motivo = motivoDaVolta(f);
    if (motivo) { recusas.push({ peca: nome, motivo }); continue; }
    const c = f.centro.map((v, i) => v + (f.desloca?.[i] ?? 0));
    /* a rotação do esboço volta ao quadro da receita, em torno do mesmo centro: Rr = Q·Re·Aᵀ·P, com Q = Pᵀ e A a fase do polígono do
       cilindro (que o caminho de ida pôs no esboço e a volta desfaz) */
    const fase = f.tipo === 'cilindro' && f.lados ? faseDoCilindro(EIXO_TROCADO[f.eixo ?? 'y'], f.eixo ?? 'y', f.lados) : I;
    const Rr = mmul(Q, mmul(mmul(matrizDoEsboco(f.rotacao), transpor(fase)), P));
    const cM = aplicar(Q, c).map((v) => Math.round(v * 1e3) / 1e6);
    const peca = { nome, ...(f.material !== undefined ? { material: f.material } : {}) };
    if (!ehIdentidade(Rr)) peca.rot = angulosDaMatriz(Rr).map((v) => zero(Math.round(v * 1e6) / 1e6));
    if (f.tipo === 'caixa') {
      const d = [f.largura, f.profundidade, f.altura].map((v) => v / 1000);
      Object.assign(peca, { forma: 'caixa', min: cM.map((v, i) => r7(v - d[i] / 2)), max: cM.map((v, i) => r7(v + d[i] / 2)) });
      if (f.chanfro) peca.chanfro = f.chanfro / 1000;
    } else if (f.tipo === 'cilindro' || f.tipo === 'cone') {
      const eixo = EIXO_TROCADO[f.eixo ?? 'y']; const h = f.comprimento / 1000; const u = VETOR[eixo];
      Object.assign(peca, { forma: 'cilindro', centro: cM.map((v, i) => r7(v - (h / 2) * u[i])), altura: h, eixo });
      if (f.tipo === 'cilindro') {
        peca.raio = f.diametro / 2000;
        if (f.lados !== undefined) peca.segmentos = f.lados;
      } else {
        /* com o eixo y, o início do esboço é a ponta de cima da receita, então o `diametro` do esboço é o `raio_topo` (e o inverso) */
        const trocado = eixo === 'y';
        peca.raio = (trocado ? (f.diametroTopo ?? 0) : f.diametro) / 2000;
        peca.raio_topo = (trocado ? f.diametro : (f.diametroTopo ?? 0)) / 2000;
      }
    } else {
      /* a extrusão do esboço tem o perfil centrado na caixa do perfil, a menos que `origem` seja "perfil" */
      const su = f.origem === 'perfil' ? 0 : (Math.min(...f.perfil.map((q) => q[0])) + Math.max(...f.perfil.map((q) => q[0]))) / 2;
      const sv = f.origem === 'perfil' ? 0 : (Math.min(...f.perfil.map((q) => q[1])) + Math.max(...f.perfil.map((q) => q[1]))) / 2;
      const [iu, iv] = f.eixo === 'z' ? [0, 1] : [2, 1];
      const eixoR = f.eixo === 'z' ? 'y' : 'x';
      const L = f.comprimento / 1000; const lc = cM[eixoR === 'y' ? 1 : 0];
      const sinal = f.eixo === 'z' ? 1 : -1;
      const perfil = f.perfil.map(([u, v]) => [r7(sinal * ((u - su + c[iu]) / 1000)), r7((v - sv + c[iv]) / 1000)]);
      Object.assign(peca, { forma: 'prisma', perfil, eixo: eixoR, de: r7(lc - L / 2), ate: r7(lc + L / 2) });
    }
    pecas.push(peca);
  }
  const mat = materiaisParaReceita(esboco);
  const receita = {
    versao: 1, id: opcao.titulo ?? esboco.id ?? 'objeto',
    ...(opcao.nota ? { nota: opcao.nota } : {}),
    ...(Object.keys(mat.cores).length ? { cores: mat.cores } : {}),
    ...(Object.keys(mat.realista.materiais).length ? { realista: mat.realista } : {}),
    pecas,
  };
  return { receita, recusas };
}

/* ---------------------------------------------------------- medidas da receita (para a prova) */

/** Os vértices de uma peça da receita em metro, girados em torno do centro dela (a conta do Blender). Cilindro usa `segmentos` (padrão 24).
    Com `chanfroDoEsboco`, a caixa com chanfro leva o chanfro como o esboço o monta (octógono nas arestas da altura, recuado nas tampas; ver
    o corpo da função). Sem a opção, são os 8 cantos. O Blender arredonda a aresta (três segmentos): a peça real fica perto desses dois, e a
    diferença entre o chanfro do esboço e o arredondado não é medida aqui. */
export function verticesDaPeca(p, { chanfroDoEsboco: reto = false } = {}) {
  let v;
  if (p.forma === 'caixa') {
    const c = reto ? chanfroDoEsboco(p) / 1000 : 0;
    if (c > 0) {
      /* o chanfro do esboço, como ele o monta: as quatro arestas paralelas à altura (recipe z) ficam cortadas num octógono de lado c, e a
         peça é uma casca (loft) de seções: o octógono no meio, e o octógono recuado de c nas duas tampas, que é o mesmo que o esboço faz no
         `loft` do chanfro. A envolvente é a dos vértices dessas quatro seções. */
      const X = (p.max[0] - p.min[0]) / 2; const Y = (p.max[1] - p.min[1]) / 2; const H = (p.max[2] - p.min[2]) / 2;
      const cen = [0, 1, 2].map((k) => (p.min[k] + p.max[k]) / 2);
      const s = Math.SQRT2 * c;
      const cheio = [[X, Y - c], [X, c - Y], [-X, Y - c], [-X, c - Y], [X - c, Y], [X - c, -Y], [c - X, Y], [c - X, -Y]];
      const topo = [[X - c, Y - s], [X - c, s - Y], [c - X, Y - s], [c - X, s - Y], [X - s, Y - c], [X - s, c - Y], [s - X, Y - c], [s - X, c - Y]];
      v = [];
      for (const [secao, z] of [[topo, -H], [cheio, -H + c], [cheio, H - c], [topo, H]]) for (const [a, b] of secao) v.push([cen[0] + a, cen[1] + b, cen[2] + z]);
    } else v = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [0, 1, 2].map((k) => ((i >> k) & 1 ? p.max[k] : p.min[k])));
  } else if (p.forma === 'prisma') {
    v = [];
    for (const t of [p.de, p.ate]) for (const [a, z] of p.perfil) v.push(p.eixo === 'y' ? [a, t, z] : [t, a, z]);
  } else {
    const n = p.segmentos ?? 24; const h = p.altura; const r0 = p.raio; const r1 = p.raio_topo ?? p.raio;
    const perm = { z: (x, y, z) => [x, y, z], x: (x, y, z) => [z, x, y], y: (x, y, z) => [y, z, x] }[p.eixo ?? 'z'];
    v = [];
    for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n; v.push(perm(r0 * Math.cos(a), r0 * Math.sin(a), 0)); }
    for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n; v.push(perm(r1 * Math.cos(a), r1 * Math.sin(a), h)); }
    v = v.map((q) => q.map((x, k) => x + p.centro[k]));
  }
  if (!girada(p)) return v;
  const min = [0, 1, 2].map((k) => Math.min(...v.map((q) => q[k]))); const max = [0, 1, 2].map((k) => Math.max(...v.map((q) => q[k])));
  const c = min.map((x, k) => (x + max[k]) / 2); const R = matrizDeEuler(p.rot);
  return v.map((q) => aplicar(R, q.map((x, k) => x - c[k])).map((x, k) => x + c[k]));
}

/** A caixa envolvente de uma peça da receita: `{ min: [x, y, z], max: [x, y, z] }` em metro (opções de `verticesDaPeca`). */
export function envolventeDaPeca(p, opcoes = {}) {
  const v = verticesDaPeca(p, opcoes);
  return { min: [0, 1, 2].map((k) => Math.min(...v.map((q) => q[k]))), max: [0, 1, 2].map((k) => Math.max(...v.map((q) => q[k]))) };
}

/** A caixa que o esboço devolve (`caixa` de `descreverEsboco`, em mm e com y para cima) no quadro da receita, em metro. */
export function caixaDoEsboco(caixa) {
  const { x, y, z } = caixa;
  return { min: [x[0], -z[1], y[0]].map((v) => v / 1000), max: [x[1], -z[0], y[1]].map((v) => v / 1000) };
}

/** O volume da peça da receita em metro cúbico. Cilindro e cone são analíticos. A caixa com chanfro perde 2·c²·(dx+dy+dz), que conta as doze
    arestas e não a sobreposição nos cantos (aproximado, o mesmo cálculo dos dois lados da volta). Com `chanfroDoEsboco`, usa o chanfro que o esboço carrega. */
export function volumeDaPeca(p, { chanfroDoEsboco: efetivo = false } = {}) {
  if (p.forma === 'caixa') {
    const [dx, dy, dz] = [0, 1, 2].map((k) => p.max[k] - p.min[k]);
    const c = efetivo ? chanfroDoEsboco(p) / 1000 : (p.chanfro ?? 0);
    return dx * dy * dz - 2 * c * c * (dx + dy + dz);
  }
  if (p.forma === 'prisma') {
    const n = p.perfil.length; let area = 0;
    for (let i = 0; i < n; i++) { const [a0, z0] = p.perfil[i]; const [a1, z1] = p.perfil[(i + 1) % n]; area += a0 * z1 - a1 * z0; }
    return Math.abs(area) / 2 * (p.ate - p.de);
  }
  const r0 = p.raio; const r1 = p.raio_topo ?? p.raio;
  return (Math.PI * p.altura * (r0 * r0 + r0 * r1 + r1 * r1)) / 3;
}
