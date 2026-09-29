/* Contato do esboço: gate opt-in de colisão, folga e conjunto conectado entre as
   formas de cada opção. A geometria é a que o desenho já monta (`resolverOpcao`:
   prisma com perfil, furos, eixo e rotação); aqui cada forma vira uma lista de
   peças convexas (prismas) e a distância e a penetração saem dos pares delas.

   Aproximação: caixa (com `raio`), cilindro e `achatado` são um prisma convexo
   exato (o círculo é o polígono de 128 lados que o desenho usa). O anel é cortado
   em 32 setores trapezoidais convexos, com a face interna tangente ao furo, de
   modo que o furo nunca é invadido por excesso; o aro fica no máximo 0,5% do raio
   externo menor que o círculo. A caixa com furos é cortada em triângulos pelo
   earcut. A distância entre peças convexas é exata (GJK) e a penetração é a menor
   sobreposição entre eixos de separação (SAT). Numa forma cortada em várias peças
   a folga é a menor entre elas e a penetração é a maior entre as peças, o que
   subestima um cruzamento que atravesse várias fatias do aro. */
import earcut from 'earcut';
import { ErroDeEsboco, resolverOpcao } from './index.js';

export const TIPOS_DE_PAR = ['atravessa', 'encosta', 'livre'];
const SETORES = 32;
const EPS = 1e-9;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const escala = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const somar = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const norma2 = (a) => dot(a, a);

function girar(m, v) {
  return m ? [dot(m[0], v), dot(m[1], v), dot(m[2], v)] : v;
}

function localParaMundo(b, u, v, w) {
  const p = [0, 0, 0];
  p[b.u] = u; p[b.v] = v; p[b.e] = w;
  return p;
}

function direcaoUnica(d) {
  const n = Math.sqrt(norma2(d));
  if (n < 1e-9) return null;
  let u = escala(d, 1 / n);
  const k = u.findIndex((c) => Math.abs(c) > 1e-9);
  if (u[k] < 0) u = escala(u, -1);
  return u;
}

function unicas(direcoes) {
  const mapa = new Map();
  for (const d of direcoes) {
    const u = direcaoUnica(d);
    if (u) mapa.set(u.map((c) => Math.round(c * 1e6)).join(','), u);
  }
  return [...mapa.values()];
}

/* Peça convexa: prisma de um polígono convexo (u, v) extrudado em w. */
function prismaConvexo(r, poligono) {
  const { b, comprimento: h } = r.prisma;
  const M = r.matriz;
  const mundo = (u, v, w) => somar(r.centro, girar(M, localParaMundo(b, u, v, w)));
  const verts = [];
  for (const w of [-h / 2, h / 2]) for (const [u, v] of poligono) verts.push(mundo(u, v, w));
  const eixo = girar(M, localParaMundo(b, 0, 0, 1));
  const normais = [eixo];
  const arestas = [eixo];
  for (let i = 0; i < poligono.length; i++) {
    const p = poligono[i]; const q = poligono[(i + 1) % poligono.length];
    const du = q[0] - p[0]; const dv = q[1] - p[1];
    normais.push(girar(M, localParaMundo(b, dv, -du, 0)));
    arestas.push(girar(M, localParaMundo(b, du, dv, 0)));
  }
  const min = [0, 1, 2].map((i) => Math.min(...verts.map((p) => p[i])));
  const max = [0, 1, 2].map((i) => Math.max(...verts.map((p) => p[i])));
  return { verts, normais: unicas(normais), arestas: unicas(arestas), min, max };
}

/* Peças convexas de uma forma resolvida. */
function pecasDe(r) {
  const { perfil, furos } = r.prisma;
  if (furos.length === 0) return [prismaConvexo(r, perfil)];
  if (r.forma.tipo === 'anel') {
    const n = perfil.length;
    const passo = n / SETORES;
    /* face interna tangente ao furo: escalar o vértice do polígono inscrito por 1/cos */
    const fator = 1 / Math.cos(Math.PI / SETORES);
    const interno = furos[0].map(([u, v]) => [u * fator, v * fator]);
    const saida = [];
    for (let s = 0; s < SETORES; s++) {
      const i = Math.round(s * passo); const j = Math.round(((s + 1) % SETORES) * passo) % n;
      saida.push(prismaConvexo(r, [perfil[i], perfil[j], interno[j], interno[i]]));
    }
    return saida;
  }
  const plano = [...perfil, ...furos.flat()].flatMap((p) => p);
  const buracos = [];
  let acc = perfil.length;
  for (const f of furos) { buracos.push(acc); acc += f.length; }
  const pontos = [...perfil, ...furos.flat()];
  const idx = earcut(plano, buracos, 2);
  const saida = [];
  for (let i = 0; i < idx.length; i += 3) saida.push(prismaConvexo(r, [pontos[idx[i]], pontos[idx[i + 1]], pontos[idx[i + 2]]]));
  return saida;
}

function apoio(verts, d) {
  let melhor = verts[0]; let m = dot(melhor, d);
  for (let i = 1; i < verts.length; i++) { const t = dot(verts[i], d); if (t > m) { m = t; melhor = verts[i]; } }
  return melhor;
}

/* Ponto da envoltória afim de `pts` mais perto da origem, se os pesos forem todos >= 0. */
function subconjunto(pts) {
  const n = pts.length;
  if (n === 1) return pts[0];
  if (n === 2) {
    const [a, b] = pts; const ab = sub(b, a); const d = norma2(ab);
    if (d < 1e-24) return null;
    const t = -dot(a, ab) / d;
    return t < 0 || t > 1 ? null : somar(a, escala(ab, t));
  }
  if (n === 3) {
    const [a, b, c] = pts; const ab = sub(b, a); const ac = sub(c, a);
    const nn = cross(ab, ac); const d = norma2(nn);
    if (d < 1e-24) return null;
    const p = escala(nn, dot(a, nn) / d);
    const pa = sub(p, a);
    const u = dot(cross(pa, ac), nn) / d; const v = dot(cross(ab, pa), nn) / d;
    return u < -1e-12 || v < -1e-12 || u + v > 1 + 1e-12 ? null : p;
  }
  const [a, b, c, d4] = pts;
  const det = (p, q, r) => dot(p, cross(q, r));
  const ab = sub(b, a); const ac = sub(c, a); const ad = sub(d4, a);
  const total = det(ab, ac, ad);
  if (Math.abs(total) < 1e-18) return null;
  const na = escala(a, -1);
  const mb = det(na, ac, ad) / total; const mc = det(ab, na, ad) / total; const md = det(ab, ac, na) / total;
  const pesos = [1 - mb - mc - md, mb, mc, md];
  return pesos.every((x) => x >= -1e-12) ? [0, 0, 0] : null;
}

function subconjuntos(pts) {
  const n = pts.length; let melhor = null;
  for (let mask = 1; mask < (1 << n); mask++) {
    const sel = []; for (let i = 0; i < n; i++) if (mask & (1 << i)) sel.push(i);
    const p = subconjunto(sel.map((i) => pts[i]));
    if (!p) continue;
    const d = norma2(p);
    if (!melhor || d < melhor.d - 1e-15 || (Math.abs(d - melhor.d) <= 1e-15 && sel.length < melhor.sel.length)) melhor = { p, d, sel };
  }
  return melhor;
}

/* Distância entre duas peças convexas (0 se se tocam ou se cruzam). GJK. */
function distanciaConvexa(A, B) {
  let d = sub(A.verts[0], B.verts[0]);
  let simplex = [sub(apoio(A.verts, d), apoio(B.verts, escala(d, -1)))];
  let v = simplex[0];
  for (let it = 0; it < 100; it++) {
    const r = subconjuntos(simplex);
    v = r.p; simplex = r.sel.map((i) => simplex[i]);
    const v2 = norma2(v);
    if (v2 < 1e-18 || simplex.length === 4) return 0;
    const w = sub(apoio(A.verts, escala(v, -1)), apoio(B.verts, v));
    if (v2 - dot(v, w) <= 1e-10 * v2) return Math.sqrt(v2);
    if (simplex.some((s) => norma2(sub(s, w)) < 1e-20)) return Math.sqrt(v2);
    simplex.push(w);
  }
  return Math.sqrt(norma2(v));
}

/* Menor sobreposição entre eixos de separação (peças que se cruzam). SAT. */
function penetracaoConvexa(A, B) {
  const eixos = [...A.normais, ...B.normais];
  for (const ea of A.arestas) for (const eb of B.arestas) eixos.push(cross(ea, eb));
  let menor = Infinity;
  for (const e of unicas(eixos)) {
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const p of A.verts) { const t = dot(p, e); if (t < a0) a0 = t; if (t > a1) a1 = t; }
    for (const p of B.verts) { const t = dot(p, e); if (t < b0) b0 = t; if (t > b1) b1 = t; }
    const s = Math.min(a1 - b0, b1 - a0);
    if (s < 0) return 0;
    if (s < menor) menor = s;
  }
  return menor === Infinity ? 0 : menor;
}

function folgaAABB(a, b) {
  let q = 0;
  for (let i = 0; i < 3; i++) { const g = Math.max(a.min[i] - b.max[i], b.min[i] - a.max[i], 0); q += g * g; }
  return Math.sqrt(q);
}

/* { folga, penetracao } entre duas formas (listas de peças convexas). */
export function medirPar(pecasA, pecasB) {
  let folga = Infinity; let penetracao = 0;
  for (const a of pecasA) for (const b of pecasB) {
    if (folgaAABB(a, b) >= folga && folga > 0) continue;
    const d = distanciaConvexa(a, b);
    if (d > 1e-7) { if (d < folga) folga = d; continue; }
    folga = 0;
    const p = penetracaoConvexa(a, b);
    if (p > penetracao) penetracao = p;
  }
  return { folga, penetracao };
}

const numMm = (v, onde) => {
  if (v === undefined) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new ErroDeEsboco(`${onde}: deve ser um número em mm, finito e maior ou igual a zero`);
  return v;
};

function lerContato(c, onde) {
  if (c === undefined) return null;
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw new ErroDeEsboco(`${onde}: "contato" deve ser um objeto { usar, tolerancia, folga, pares }`);
  if (c.usar !== undefined && typeof c.usar !== 'boolean') throw new ErroDeEsboco(`${onde}: "contato.usar" deve ser true ou false`);
  const pares = [];
  if (c.pares !== undefined) {
    if (!Array.isArray(c.pares)) throw new ErroDeEsboco(`${onde}: "contato.pares" deve ser uma lista de { a, b, tipo }`);
    for (const [i, p] of c.pares.entries()) {
      if (!p || typeof p.a !== 'string' || typeof p.b !== 'string' || p.a === p.b) throw new ErroDeEsboco(`${onde}: contato.pares[${i}] precisa de "a" e "b", ids diferentes`);
      if (!TIPOS_DE_PAR.includes(p.tipo)) throw new ErroDeEsboco(`${onde}: contato.pares[${i}].tipo deve ser um de ${TIPOS_DE_PAR.join(', ')}`);
      pares.push({ a: p.a, b: p.b, tipo: p.tipo });
    }
  }
  return {
    usar: c.usar, tolerancia: numMm(c.tolerancia, `${onde}: contato.tolerancia`), folga: numMm(c.folga, `${onde}: contato.folga`), pares,
  };
}

const arred = (x) => Math.round(x * 10) / 10;

/* Verifica o contato de todas as opções. Devolve
   { usar, tolerancia, folga, achados, resultado, opcoes }. Sem `contato` no JSON
   (ou com `usar` falso em todas as opções) devolve `resultado: 'desligado'` sem medir. */
export function verificarContato(esboco) {
  const raiz = lerContato(esboco?.contato, 'esboço');
  const opcoes = Array.isArray(esboco?.opcoes) ? esboco.opcoes : [];
  const lidas = opcoes.map((o, i) => lerContato(o.contato, `opção ${i + 1}`));
  const ativa = (i) => (lidas[i]?.usar ?? raiz?.usar) === true;
  const desligado = { usar: false, tolerancia: null, folga: null, achados: [], resultado: 'desligado', opcoes: [] };
  if (!opcoes.some((_, i) => ativa(i))) return desligado;

  const resolvidas = opcoes.map((o, i) => resolverOpcao(o, `opção ${i + 1}${o.titulo ? ` (${o.titulo})` : ''}`).filter((r) => r.forma.oculto !== true));
  const todosIds = new Set(resolvidas.flat().map((r) => r.id));
  for (const [c, onde] of [[raiz, 'esboço'], ...lidas.map((l, i) => [l, `opção ${i + 1}`])]) {
    for (const p of c?.pares ?? []) for (const id of [p.a, p.b]) {
      if (!todosIds.has(id)) throw new ErroDeEsboco(`${onde}: contato.pares cita "${id}", que não é uma forma visível (ids: ${[...todosIds].join(', ')})`);
    }
  }
  /* dimensão do conjunto: a maior aresta da caixa que envolve todas as formas visíveis */
  let dimensao = 0;
  for (const rs of resolvidas) {
    if (rs.length === 0) continue;
    for (let e = 0; e < 3; e++) dimensao = Math.max(dimensao, Math.max(...rs.map((r) => r.max[e])) - Math.min(...rs.map((r) => r.min[e])));
  }
  const padraoTol = Math.max(1, dimensao * 0.01);
  const padraoFolga = dimensao * 0.1;
  const tolRaiz = raiz?.tolerancia ?? padraoTol;
  const folgaRaiz = raiz?.folga ?? padraoFolga;

  const achados = [];
  const resumo = [];
  opcoes.forEach((o, i) => {
    const titulo = o.titulo ?? `Opção ${i + 1}`;
    if (!ativa(i)) { resumo.push({ opcao: titulo, usar: false, resultado: 'desligado' }); return; }
    const tol = lidas[i]?.tolerancia ?? tolRaiz;
    const folgaMax = lidas[i]?.folga ?? folgaRaiz;
    const tipos = new Map();
    const chave = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
    for (const p of [...(raiz?.pares ?? []), ...(lidas[i]?.pares ?? [])]) tipos.set(chave(p.a, p.b), p.tipo);
    const rs = resolvidas[i];
    const pecas = rs.map(pecasDe);
    const n = rs.length;
    const achadosDaOpcao = [];
    const ligados = Array.from({ length: n }, () => []);
    const menorFolga = Array(n).fill(Infinity);
    const folgas = Array.from({ length: n }, () => Array(n).fill(Infinity));
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const tipo = tipos.get(chave(rs[a].id, rs[b].id));
      if (tipo === 'livre') continue;
      const { folga, penetracao } = medirPar(pecas[a], pecas[b]);
      folgas[a][b] = folgas[b][a] = folga;
      if (folga < menorFolga[a]) menorFolga[a] = folga;
      if (folga < menorFolga[b]) menorFolga[b] = folga;
      if (tipo === 'atravessa' || folga <= tol) { ligados[a].push(b); ligados[b].push(a); }
      const par = [rs[a].id, rs[b].id];
      if (tipo === 'encosta') {
        if (folga > tol) achadosDaOpcao.push({ opcao: titulo, tipo: 'par-nao-encosta', pecas: par, mm: arred(folga), detalhe: 'folga' });
        else if (penetracao > tol) achadosDaOpcao.push({ opcao: titulo, tipo: 'par-nao-encosta', pecas: par, mm: arred(penetracao), detalhe: 'penetracao' });
      } else if (tipo !== 'atravessa' && penetracao > tol) {
        achadosDaOpcao.push({ opcao: titulo, tipo: 'colisao', pecas: par, mm: arred(penetracao) });
      }
    }
    for (let a = 0; a < n; a++) {
      if (n > 1 && menorFolga[a] !== Infinity && menorFolga[a] > folgaMax) {
        achadosDaOpcao.push({ opcao: titulo, tipo: 'longe', pecas: [rs[a].id], mm: arred(menorFolga[a]) });
      }
    }
    /* grupos conectados; o maior (empate: o que contém a primeira forma) é o principal */
    const grupo = Array(n).fill(-1); const grupos = [];
    for (let a = 0; a < n; a++) {
      if (grupo[a] >= 0) continue;
      const fila = [a]; grupo[a] = grupos.length; const membros = [];
      while (fila.length) { const x = fila.pop(); membros.push(x); for (const y of ligados[x]) if (grupo[y] < 0) { grupo[y] = grupos.length; fila.push(y); } }
      grupos.push(membros);
    }
    const principal = grupos.reduce((m, g) => (g.length > m.length ? g : m), grupos[0] ?? []);
    for (let a = 0; a < n; a++) {
      if (principal.includes(a)) continue;
      let ate = Infinity;
      for (const b of principal) {
        if (tipos.get(chave(rs[a].id, rs[b].id)) === 'livre') continue;
        ate = Math.min(ate, folgas[a][b]);
      }
      achadosDaOpcao.push({ opcao: titulo, tipo: 'voando', pecas: [rs[a].id], mm: Number.isFinite(ate) ? arred(ate) : null });
    }
    achados.push(...achadosDaOpcao);
    resumo.push({ opcao: titulo, usar: true, tolerancia: arred(tol), folga: arred(folgaMax), resultado: achadosDaOpcao.length ? 'reprovado' : 'aprovado' });
  });
  return {
    usar: true, tolerancia: arred(tolRaiz), folga: arred(folgaRaiz), achados, resultado: achados.length ? 'reprovado' : 'aprovado', opcoes: resumo,
  };
}

const NOMES = { colisao: 'colisão', longe: 'longe', voando: 'voando', 'par-nao-encosta': 'par não encosta' };
const mm = (x) => x.toFixed(1).replace('.', ',');

/* Linha legível de um achado. */
export function descreverAchado(a) {
  const p = a.pecas;
  const base = `[${a.opcao}] ${NOMES[a.tipo]}: `;
  if (a.tipo === 'colisao') return `${base}${p[0]} e ${p[1]} se penetram ${mm(a.mm)} mm`;
  if (a.tipo === 'longe') return `${base}${p[0]} fica a ${mm(a.mm)} mm da peça mais próxima`;
  if (a.tipo === 'voando') return `${base}${p[0]} fora do grupo conectado${a.mm === null ? '' : `, a ${mm(a.mm)} mm dele`}`;
  return `${base}${p[0]} e ${p[1]} deviam encostar, ${a.detalhe === 'penetracao' ? `mas se penetram ${mm(a.mm)} mm` : `mas há ${mm(a.mm)} mm de folga`}`;
}
