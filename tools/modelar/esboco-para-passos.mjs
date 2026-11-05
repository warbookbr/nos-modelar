/* esboco-para-passos.mjs — converte as formas de um esboço em passos de uma receita do Modelar (`cubo`, `chamferBox`, `cilindro`, `extrusao`,
   `rotaciona` e `parte`), sem agente: a conversão é mecânica e cada forma é conferida contra o esboço antes de entrar.

   Por que existe. Um objeto que veio como esboço (por exemplo, das receitas do externo traduzidas por `receita-externa.mjs`) vira receita do
   Modelar por esta conversão, em vez de ser modelado de novo. A receita herda a forma do esboço, inclusive o que ele tem de errado; os
   ajustes entram depois como passos explícitos sobre ela.

   O que converte. `caixa` (com `chanfro` vira `chamferBox`), `cilindro`, `cone` não (recusado), `extrusao`, e a rotação de qualquer uma delas
   (a matriz do esboço vira até três `rotaciona` em torno do centro da forma). O esboço é em milímetro e a receita em metro, com o mesmo quadro
   (y para cima).

   Como confere. Cada forma é executada sozinha pelo núcleo e comparada com a do esboço: a caixa envolvente (0,5 mm, ou a tolerância do polígono
   no cilindro) e, na extrusão, o conjunto dos vértices do perfil. A orientação e o sinal que o núcleo usa em `eixo` e em `rotaciona` são
   escolhidos pela própria conferência, entre as variantes possíveis, e a forma que nenhuma variante reproduz sai em `recusas` com o motivo.
   Núcleo puro: recebe o esboço lido e devolve `{ passos, partes, recusas, conferencias }`. */
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { deslocarContorno, ehConvexo } from '../../procedural/nucleo/contorno.js';
import { alinharCaixas } from './esboco-alinhar-caixas.mjs';

const TOLERANCIA_MM = 0.5;
const LADOS_MINIMOS = 12;

const identidade = (m) => m.every((l, i) => l.every((v, j) => Math.abs(v - (i === j ? 1 : 0)) < 1e-9));
const slug = (n) => n.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'peca';

/** Os vértices (mm) da malha de uma execução. */
function verticesDe(passos) {
  const { neutro } = executarReceita({ meta: { nome: 'conferencia' }, PASSOS: passos });
  return [...neutro.V.values()].map((v) => v.map((x) => x * 1000));
}
function caixaDe(vs) {
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const v of vs) for (let k = 0; k < 3; k += 1) { min[k] = Math.min(min[k], v[k]); max[k] = Math.max(max[k], v[k]); }
  return { min, max, centro: min.map((m, k) => (m + max[k]) / 2) };
}
const caixaConfere = (a, b, tol) => [0, 1, 2].every((k) => Math.abs(a.min[k] - b.min[k]) <= tol && Math.abs(a.max[k] - b.max[k]) <= tol);
/** Todo vértice esperado tem um vértice produzido a menos de `tol`. */
const verticesConferem = (esperados, produzidos, tol) => esperados.every((e) => produzidos.some((p) => Math.hypot(p[0] - e[0], p[1] - e[1], p[2] - e[2]) <= tol));

/* ---------- rotação ---------- */

const mult = (a, b) => a.map((l, i) => b[0].map((_, j) => l.reduce((s, _x, k) => s + a[i][k] * b[k][j], 0)));
const Rx = (t) => [[1, 0, 0], [0, Math.cos(t), -Math.sin(t)], [0, Math.sin(t), Math.cos(t)]];
const Ry = (t) => [[Math.cos(t), 0, Math.sin(t)], [0, 1, 0], [-Math.sin(t), 0, Math.cos(t)]];
const Rz = (t) => [[Math.cos(t), -Math.sin(t), 0], [Math.sin(t), Math.cos(t), 0], [0, 0, 1]];
const aplica = (m, v) => m.map((l) => l[0] * v[0] + l[1] * v[1] + l[2] * v[2]);

/** Ângulos (radiano) de R = Rz(c)·Ry(b)·Rx(a), com a aplicada primeiro. */
function angulosZYX(m) {
  const b = Math.asin(Math.max(-1, Math.min(1, -m[2][0])));
  if (Math.abs(Math.cos(b)) < 1e-9) return [Math.atan2(-m[1][2], m[1][1]), b, 0];
  return [Math.atan2(m[2][1], m[2][2]), b, Math.atan2(m[1][0], m[0][0])];
}
const grau = (t) => (t * 180) / Math.PI;

function passosDeRotacao(matriz, sinal, pivo, sel) {
  const [a, b, c] = angulosZYX(matriz);
  const passos = [];
  for (const [eixo, ang] of [['x', a], ['y', b], ['z', c]]) {
    if (Math.abs(ang) < 1e-9) continue;
    passos.push(['rotaciona', { eixo, graus: sinal * grau(ang), pivo, sel }]);
  }
  return passos;
}

/* ---------- as formas do esboço em números ----------

   O esboço que chega aqui é o das receitas do externo (`receita-externa.mjs`): caixa (com chanfro), cilindro, cone e extrusão, cada uma
   pelo `centro` absoluto e, quando gira, pela `rotacao` [rx, ry, rz] em graus. Até 2026-11-05 quem as resolvia era o módulo antigo do
   esboço (`formasResolvidas`); ele saiu, e a conta que estas formas pedem ficou aqui, a mesma dele: a matriz M = Rz·Ry·Rx, o prisma
   local de cada tipo (o círculo de 128 lados, ou de `lados`; a caixa chanfrada em quatro seções com a de cima recuada pelo chanfro; o
   cone em duas seções; a extrusão com o perfil centrado na caixa dele e anti-horário) e a caixa envolvente pelos vértices do prisma
   girado. Foi conferida contra o módulo, campo a campo, em todas as receitas do externo versionadas antes de ele sair. A forma de outro
   tipo passa só com o centro, e a conversão a recusa dizendo o tipo; posição por relação (`sobre`, `ponta` e as outras) é recusada aqui,
   porque esse esboço é o do 2.0 (`modulos/esboco-nucleo/`). */

const EIXOS = ['x', 'y', 'z'];
const SEGMENTOS = 128;
const RELACOES = ['sobre', 'ponta', 'encosta', 'alinha', 'desloca', 'de', 'para', 'encaixa', 'espelha', 'arranja', 'usa', 'subtrai', 'ligar'];
const limpo = (x) => (Math.abs(x) < 1e-12 ? 0 : x);
const baseDoEixo = (eixo) => (eixo === 'x' ? { e: 0, u: 2, v: 1 } : eixo === 'z' ? { e: 2, u: 0, v: 1 } : { e: 1, u: 0, v: 2 });
const ponto3 = (b, u, v, w) => { const p = [0, 0, 0]; p[b.u] = u; p[b.v] = v; p[b.e] = w; return p; };
const aplicarMatriz = (v, m) => (m ? [0, 1, 2].map((i) => m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2]) : v);
function circuloN(r, n) {
  const p = [];
  for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n; p.push([r * Math.cos(a), r * Math.sin(a)]); }
  return p;
}
const retanguloChanfrado = (l, p, c) => [[-l / 2 + c, -p / 2], [l / 2 - c, -p / 2], [l / 2, -p / 2 + c], [l / 2, p / 2 - c],
  [l / 2 - c, p / 2], [-l / 2 + c, p / 2], [-l / 2, p / 2 - c], [-l / 2, -p / 2 + c]];

/** A matriz da `rotacao` [rx, ry, rz] em graus (M = Rz·Ry·Rx), ou null sem giro. */
export function matrizDaRotacao(rot) {
  if (!Array.isArray(rot)) return null;
  const [rx = 0, ry = 0, rz = 0] = rot;
  if (!rx && !ry && !rz) return null;
  const [cx, sx, cy, sy, cz, sz] = [rx, ry, rz].flatMap((g) => [Math.cos((g * Math.PI) / 180), Math.sin((g * Math.PI) / 180)]);
  return [
    [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx],
    [sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx],
    [-sy, cy * sx, cy * cx],
  ];
}

/* O prisma local da forma: a base dos eixos, o perfil, o comprimento e, na caixa chanfrada e no cone, as seções. */
function prismaDaForma(f, onde) {
  if (f.tipo === 'caixa') {
    if (f.raio !== undefined || f.furo !== undefined || f.furos !== undefined) throw new Error(`${onde}: caixa com raio de canto ou furo não é desta conversão`);
    if (f.chanfro !== undefined) {
      const c = f.chanfro;
      const cheio = retanguloChanfrado(f.largura, f.profundidade, c);
      const topo = deslocarContorno(cheio, c);
      const h = f.altura / 2;
      return { b: baseDoEixo('y'), perfil: cheio, comprimento: f.altura, secoes: [{ w: -h, perfil: topo }, { w: -h + c, perfil: cheio }, { w: h - c, perfil: cheio }, { w: h, perfil: topo }] };
    }
    const [l, p] = [f.largura / 2, f.profundidade / 2];
    return { b: baseDoEixo('y'), perfil: [[-l, -p], [l, -p], [l, p], [-l, p]], comprimento: f.altura };
  }
  if (f.tipo === 'cilindro') {
    if (f.achatado !== undefined) throw new Error(`${onde}: cilindro achatado não é desta conversão`);
    return { b: baseDoEixo(f.eixo ?? 'y'), perfil: circuloN(f.diametro / 2, f.lados || SEGMENTOS), comprimento: f.comprimento };
  }
  if (f.tipo === 'cone') {
    const h = f.comprimento / 2;
    const base0 = circuloN(f.diametro / 2, SEGMENTOS);
    return { b: baseDoEixo(f.eixo ?? 'y'), perfil: base0, comprimento: f.comprimento, secoes: [{ w: -h, perfil: base0 }, { w: h, perfil: circuloN((f.diametroTopo ?? 0) / 2, SEGMENTOS) }] };
  }
  /* extrusão: o perfil centrado na caixa dele (ou na origem dele, com `origem: "perfil"`), anti-horário */
  const doPerfil = f.origem === 'perfil';
  const us = f.perfil.map((q) => q[0]); const vs = f.perfil.map((q) => q[1]);
  const cu = doPerfil ? 0 : (Math.min(...us) + Math.max(...us)) / 2;
  const cv = doPerfil ? 0 : (Math.min(...vs) + Math.max(...vs)) / 2;
  const area = f.perfil.reduce((acc, q, i) => acc + q[0] * f.perfil[(i + 1) % f.perfil.length][1] - f.perfil[(i + 1) % f.perfil.length][0] * q[1], 0);
  const centrado = f.perfil.map((q) => [q[0] - cu, q[1] - cv]);
  return { b: baseDoEixo(f.eixo ?? 'y'), perfil: area >= 0 ? centrado : [...centrado].reverse(), comprimento: f.comprimento, naoConvexo: !ehConvexo(f.perfil) };
}

function caixaLocal(pr, m) {
  if (!pr.secoes && !m) {
    const min = [0, 0, 0]; const max = [0, 0, 0];
    min[pr.b.e] = -pr.comprimento / 2; max[pr.b.e] = pr.comprimento / 2;
    min[pr.b.u] = Math.min(...pr.perfil.map((p) => p[0])); max[pr.b.u] = Math.max(...pr.perfil.map((p) => p[0]));
    min[pr.b.v] = Math.min(...pr.perfil.map((p) => p[1])); max[pr.b.v] = Math.max(...pr.perfil.map((p) => p[1]));
    return { min, max };
  }
  const h = pr.comprimento / 2;
  const secoes = pr.secoes ?? [{ w: -h, perfil: pr.perfil }, { w: h, perfil: pr.perfil }];
  const vs = secoes.flatMap((sc) => sc.perfil.map(([u, v]) => aplicarMatriz(ponto3(pr.b, u, v, sc.w), m)));
  return { min: [0, 1, 2].map((i) => Math.min(...vs.map((p) => p[i]))), max: [0, 1, 2].map((i) => Math.max(...vs.map((p) => p[i]))) };
}

function geometriaDoTipo(f, pr) {
  const eixo = EIXOS[pr.b.e];
  if (f.tipo === 'caixa') return { eixo, largura: f.largura, altura: pr.comprimento, profundidade: f.profundidade, ...(f.chanfro !== undefined ? { chanfro: f.chanfro } : {}) };
  if (f.tipo === 'cilindro') return { eixo, diametro: f.diametro, comprimento: pr.comprimento, ...(f.lados !== undefined ? { lados: f.lados } : {}) };
  if (f.tipo === 'cone') return { eixo, diametro: f.diametro, diametroTopo: f.diametroTopo ?? 0, comprimento: pr.comprimento };
  return { eixo, eixosDoPerfil: [EIXOS[pr.b.u], EIXOS[pr.b.v]], comprimento: pr.comprimento, convexo: pr.naoConvexo !== true, perfil: pr.perfil };
}

/**
 * As formas da opção `opcao` (número a partir de 1, ou o título) de um esboço de receita do externo, como o módulo antigo as resolvia
 * (`mecanifica.formas-resolvidas@1`, sem recorte nem componente): `{ formato, opcao, parametros, pontos, formas }`, cada forma com
 * `geometria` { centro, caixa, matriz, eixo, medidas do tipo, ancoras }.
 */
export function formasDoEsbocoSimples(esboco, opcao = 1) {
  if (!esboco || !Array.isArray(esboco.opcoes) || esboco.opcoes.length === 0) throw new Error('o esboço precisa de "opcoes": [{ titulo, nota, formas }]');
  const indice = typeof opcao === 'string' ? esboco.opcoes.findIndex((o) => o?.titulo === opcao) : opcao - 1;
  if (!Number.isInteger(indice) || indice < 0 || indice >= esboco.opcoes.length) throw new Error(`a opção ${JSON.stringify(opcao)} não existe (o esboço tem ${esboco.opcoes.length})`);
  const o = esboco.opcoes[indice];
  if (esboco.parametros !== undefined || o.parametros !== undefined) throw new Error('parâmetros e expressões são do esboço antigo, que saiu; escreva os números');
  const formas = (o.formas ?? []).map((f, k) => {
    const onde = `forma ${f.id ?? k + 1}`;
    const relacao = RELACOES.find((r) => f[r] !== undefined);
    if (relacao) throw new Error(`${onde}: "${relacao}" posiciona por relação, e esta conversão lê só o centro absoluto e a rotação; para opções de forma use o esboço 2.0 (npm run esboco:nucleo)`);
    if (!Array.isArray(f.centro) || f.centro.length !== 3 || !f.centro.every(Number.isFinite)) throw new Error(`${onde}: "centro" precisa ser [x, y, z] em mm`);
    const comuns = { id: f.id, tipo: f.tipo, oculto: f.oculto === true, ...(f.cor !== undefined ? { cor: f.cor } : {}), ...(f.rotulo !== undefined ? { rotulo: f.rotulo } : {}), unidade: null, parte: null, origem: null };
    const centro = [...f.centro];
    if (!['caixa', 'cilindro', 'cone', 'extrusao'].includes(f.tipo)) {
      return { ...comuns, geometria: { centro, caixa: { min: centro, max: centro }, matriz: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], ancoras: { centro } } };
    }
    const m = matrizDaRotacao(f.rotacao);
    const pr = prismaDaForma(f, onde);
    const local = caixaLocal(pr, m);
    const ancoras = { centro };
    if (f.tipo !== 'caixa') {
      for (const [nome, w] of [['inicio', -pr.comprimento / 2], ['fim', pr.comprimento / 2]]) {
        const d = aplicarMatriz(ponto3(pr.b, 0, 0, w), m);
        ancoras[nome] = [centro[0] + d[0], centro[1] + d[1], centro[2] + d[2]];
      }
    }
    return {
      ...comuns,
      geometria: {
        centro,
        caixa: { min: local.min.map((v, i) => v + centro[i]), max: local.max.map((v, i) => v + centro[i]) },
        matriz: m ? m.map((linha) => linha.map(limpo)) : [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        ...geometriaDoTipo(f, pr),
        ancoras,
      },
    };
  });
  return { formato: 'mecanifica.formas-resolvidas@1', opcao: { numero: indice + 1, ...(o.titulo ? { titulo: o.titulo } : {}) }, parametros: {}, pontos: { ...(esboco.pontos ?? {}), ...(o.pontos ?? {}) }, formas };
}

/** A caixa envolvente de cada forma da opção em centésimos de milímetro, `{ id, caixa: { x: [min, max], y, z } }`, como a leitura em texto
 *  do módulo antigo (`descreverEsboco`) a dava. */
export function caixasDoEsboco(esboco, opcao = 1) {
  const r2 = (x) => Math.round(x * 100) / 100;
  return formasDoEsbocoSimples(esboco, opcao).formas.map(({ id, geometria: { caixa } }) => ({
    id, caixa: Object.fromEntries(EIXOS.map((e, k) => [e, [r2(caixa.min[k]), r2(caixa.max[k])]])),
  }));
}

/* ---------- uma forma ---------- */

/** Os vértices esperados (mm) de uma forma, no quadro do esboço, antes da rotação, centrados em `centro`. */
function esperadosDaExtrusao(g) {
  const idx = { x: 0, y: 1, z: 2 };
  const us = g.perfil.map((p) => p[0]); const vs = g.perfil.map((p) => p[1]);
  const uc = (Math.min(...us) + Math.max(...us)) / 2; const vc = (Math.min(...vs) + Math.max(...vs)) / 2;
  const [eu, ev] = g.eixosDoPerfil.map((e) => idx[e]);
  const ee = idx[g.eixo];
  const saida = [];
  for (const [u, v] of g.perfil) for (const t of [-g.comprimento / 2, g.comprimento / 2]) {
    const p = [0, 0, 0]; p[eu] = u - uc; p[ev] = v - vc; p[ee] = t;
    saida.push(p);
  }
  return saida;
}

function tentarVariantes(variantes, confere) {
  for (const v of variantes) {
    let produzidos;
    try { produzidos = verticesDe(v.passos); } catch { continue; }
    if (confere(produzidos, v)) return v;
  }
  return null;
}

/** Os passos de uma forma (sem o `parte`), ou `null` com o motivo. `origemId` e `parte` são do chamador. */
function passosDaForma(f, origemId) {
  const g = f.geometria;
  const girada = !identidade(g.matriz);
  const sel = { origem: { op: null, id: origemId } };
  const centroM = g.centro.map((v) => v / 1000);
  let gerador; // { op, args, esperados (mm, centrados, antes da rotação) | null, caixaLocal (mm, tamanho) }

  if (f.tipo === 'caixa') {
    const op = g.chanfro > 0 ? 'chamferBox' : 'cubo';
    sel.origem.op = op;
    const args = { origemId, larg: g.largura / 1000, alt: g.altura / 1000, prof: g.profundidade / 1000, ...(op === 'chamferBox' ? { chanfro: g.chanfro / 1000 } : {}) };
    const meio = [g.largura / 2, g.altura / 2, g.profundidade / 2];
    gerador = { variantes: [{ passos: [[op, { ...args, em: [0, 0, 0] }]], op }], esperados: null, caixaLocal: { min: meio.map((v) => -v), max: meio } };
  } else if (f.tipo === 'cilindro') {
    sel.origem.op = 'cilindro';
    const lados = Math.max(g.lados ?? 48, LADOS_MINIMOS);
    const eixos = { x: 0, y: 1, z: 2 };
    const ee = eixos[g.eixo];
    const meio = [g.diametro / 2, g.diametro / 2, g.diametro / 2]; meio[ee] = g.comprimento / 2;
    const variantes = ['x', 'y', 'z'].map((e) => ({ passos: [['cilindro', { origemId, raio: g.diametro / 2000, altura: g.comprimento / 1000, lados, eixo: e, em: [0, 0, 0] }]], eixoDoNucleo: e }));
    gerador = { variantes, esperados: null, caixaLocal: { min: meio.map((v) => -v), max: meio }, cilindro: true, lados };
  } else if (f.tipo === 'extrusao') {
    sel.origem.op = 'extrusao';
    const esperados = esperadosDaExtrusao(g);
    const meio = esperados.reduce((m, p) => m.map((v, k) => Math.max(v, Math.abs(p[k]))), [0, 0, 0]);
    const variantes = [];
    for (const eixoDoNucleo of ['y', 'x', 'z']) for (const troca of [false, true]) for (const sa of [1, -1]) for (const sb of [1, -1]) {
      const perfil = g.perfil.map(([u, v]) => { const [p, q] = troca ? [v, u] : [u, v]; return [(sa * p) / 1000, (sb * q) / 1000]; });
      variantes.push({ passos: [['extrusao', { origemId, eixo: eixoDoNucleo, altura: g.comprimento / 1000, perfil, em: [0, 0, 0] }]], eixoDoNucleo });
    }
    gerador = { variantes, esperados, caixaLocal: { min: meio.map((v) => -v), max: meio } };
  } else return { motivo: `forma ${f.tipo} ainda não é convertida` };

  /* a variante do gerador: a que, sem rotação e centrada na origem, reproduz a forma local */
  const local = tentarVariantes(gerador.variantes, (vs) => {
    const c = caixaDe(vs);
    const centrada = vs.map((v) => v.map((x, k) => x - c.centro[k]));
    const cx = { min: c.min.map((m, k) => m - c.centro[k]), max: c.max.map((m, k) => m - c.centro[k]) };
    const tol = gerador.cilindro ? Math.max(TOLERANCIA_MM, (g.diametro / 2) * (1 - Math.cos(Math.PI / gerador.lados)) + 0.01) : TOLERANCIA_MM;
    if (!caixaConfere(cx, gerador.caixaLocal, tol)) return false;
    return gerador.esperados ? verticesConferem(gerador.esperados, centrada, TOLERANCIA_MM) : true;
  });
  if (!local) return { motivo: 'nenhuma orientação do núcleo reproduz a forma local' };

  /* a posição: leva o centro da caixa local ao centro do esboço */
  const vsLocal = verticesDe(local.passos);
  const c0 = caixaDe(vsLocal).centro;
  const em = g.centro.map((v, k) => (v - c0[k]) / 1000);
  const base = local.passos.map(([op, a]) => [op, { ...a, em }]);
  const tolDaForma = gerador.cilindro ? Math.max(TOLERANCIA_MM, (g.diametro / 2) * (1 - Math.cos(Math.PI / gerador.lados)) + 0.01) : TOLERANCIA_MM;
  if (!girada) {
    if (!caixaConfere(caixaDe(verticesDe(base)), g.caixa, Math.max(tolDaForma, 1))) return { motivo: 'a posição não reproduz a caixa envolvente do esboço' };
    return { passos: base, sel };
  }

  /* a rotação em torno do centro da forma: o sinal sai da conferência da caixa envolvente do esboço */
  for (const sinal of [1, -1]) {
    const passos = [...base, ...passosDeRotacao(g.matriz, sinal, centroM, sel)];
    let vs; try { vs = verticesDe(passos); } catch { continue; }
    const tol = gerador.cilindro ? Math.max(TOLERANCIA_MM, (g.diametro / 2) * (1 - Math.cos(Math.PI / gerador.lados)) + 0.01) : TOLERANCIA_MM;
    if (caixaConfere(caixaDe(vs), g.caixa, Math.max(tol, 1))) return { passos, sel };
  }
  return { motivo: 'nenhum sinal de rotação reproduz a caixa envolvente do esboço' };
}

/**
 * Os passos da receita de uma opção do esboço.
 * @returns {{ passos: Array, partes: string[], recusas: Array<{forma:string,motivo:string}>, conferencias: Array }}
 */
/**
 * Aplica à lista de formas resolvidas os ajustes da pessoa, em milímetro, sobre caixas sem giro. Cada ajuste é um objeto:
 *   { forma, face: { eixo: 'x'|'y'|'z', lado: 'min'|'max', para } }   leva uma face da caixa à posição `para`;
 *   { forma, deslocar: [dx, dy, dz] }                                   desloca a caixa inteira;
 *   { forma, remover: true }                                            tira a forma da receita.
 * Uma forma que não existe, que não é caixa reta ou uma face que inverte a caixa é erro, com a mensagem do ajuste.
 */
export function aplicarAjustes(formas, ajustes) {
  const saida = formas.map((f) => ({ ...f, geometria: { ...f.geometria, caixa: { min: [...f.geometria.caixa.min], max: [...f.geometria.caixa.max] } } }));
  const feitos = [];
  for (const a of ajustes) {
    const i = saida.findIndex((f) => f.id === a.forma);
    if (i < 0) throw new Error(`ajuste: a forma "${a.forma}" não existe (formas: ${saida.map((f) => f.id).join(', ')})`);
    if (a.remover) { saida.splice(i, 1); feitos.push(a); continue; }
    const f = saida[i]; const g = f.geometria;
    if (f.tipo !== 'caixa' || (!a.deslocar && !identidade(g.matriz))) throw new Error(`ajuste: a forma "${a.forma}" não é uma caixa sem giro (só \`deslocar\` aceita caixa girada)`);
    const c = g.caixa;
    if (a.face) {
      const k = { x: 0, y: 1, z: 2 }[a.face.eixo];
      if (k === undefined || !['min', 'max'].includes(a.face.lado) || !Number.isFinite(a.face.para)) throw new Error(`ajuste: face inválida em "${a.forma}": ${JSON.stringify(a.face)}`);
      c[a.face.lado][k] = a.face.para;
    } else if (a.deslocar) {
      if (!Array.isArray(a.deslocar) || a.deslocar.length !== 3 || !a.deslocar.every(Number.isFinite)) throw new Error(`ajuste: deslocar inválido em "${a.forma}"`);
      for (let k = 0; k < 3; k += 1) { c.min[k] += a.deslocar[k]; c.max[k] += a.deslocar[k]; }
    } else throw new Error(`ajuste: "${a.forma}" sem face, deslocar nem remover`);
    if ([0, 1, 2].some((k) => c.max[k] - c.min[k] <= 0)) throw new Error(`ajuste: a caixa "${a.forma}" ficou sem volume`);
    if (identidade(g.matriz)) {
      g.centro = [0, 1, 2].map((k) => (c.min[k] + c.max[k]) / 2);
      g.largura = c.max[0] - c.min[0]; g.altura = c.max[1] - c.min[1]; g.profundidade = c.max[2] - c.min[2];
    } else g.centro = g.centro.map((v, k) => v + a.deslocar[k]);
    feitos.push(a);
  }
  return { formas: saida, feitos };
}

export function passosDoEsboco(esboco, { opcao = 1, alinhar = false, ajustes = [] } = {}) {
  const dados = formasDoEsbocoSimples(esboco, opcao);
  let alteracoes = [];
  if (alinhar) { const r = alinharCaixas(dados.formas); dados.formas = r.formas; alteracoes = r.alteracoes; }
  if (ajustes.length) dados.formas = aplicarAjustes(dados.formas, ajustes).formas;
  const passos = []; const partes = []; const recusas = []; const conferencias = [];
  const usados = new Set();
  let id = 1;
  for (const f of dados.formas) {
    const r = passosDaForma(f, id);
    if (r.motivo) { recusas.push({ forma: f.id, motivo: r.motivo }); continue; }
    let nome = slug(f.id); let k = 2; while (usados.has(nome)) nome = `${slug(f.id)}_${k++}`; usados.add(nome);
    passos.push(...r.passos, ['parte', { nome, sel: { origem: r.sel.origem } }]);
    partes.push(nome);
    conferencias.push({ forma: f.id, tipo: f.tipo, girada: !identidade(f.geometria.matriz) });
    id += 1;
  }
  return { passos, partes, recusas, conferencias, dados, alteracoes };
}

/** A caixa envolvente (mm) da malha dos passos, para o chamador comparar com a do esboço. */
export function caixaDosPassos(passos) {
  return caixaDe(verticesDe(passos));
}
