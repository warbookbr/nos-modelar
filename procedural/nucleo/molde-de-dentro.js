/* molde-de-dentro.js — o volume que fica por dentro de uma chapa, a `folga` da pele de dentro dela: o molde com que `aparar` corta um sólido.
 *
 * Função pura sobre a superfície refinada da chapa (vértices e faces por índice, a da `subdivisao` antes da espessura), sem passo, sem Manifold
 * e sem domínio de objeto. A chapa de espessura `espessura` tem a superfície declarada como pele de fora; a pele de dentro está a `espessura`
 * dela, e o molde é o que sobra aquém de uma pele a `espessura + folga`. A pele do molde é a de dentro deslocada pelo MESMO `espessarSuperficie`
 * que a chapa usa (a esquadria dos cantos e a dobra local são as da chapa, e a espessura que passa do raio local grita como lá). A abertura da
 * chapa, uma borda só, fecha por paredes retas, paralelas ao eixo de `fecha`, que descem de cada aresta da borda até o plano `{ eixo, em }`, e
 * por uma tampa plana nele. O molde sai fechado, orientado para fora e em triângulos (a tampa por earcut), pronto para a booleana.
 *
 * O QUE ELE RECUSA, antes de devolver malha: a superfície com mais de uma borda (um vão ou uma abertura a mais, que a tampa não fecha sem
 * inventar volume), a borda que se toca num vértice, a borda que atravessa o plano da tampa (vértice dos dois lados dele) e a tampa que a
 * borda projetada deixa sem área ou cruzada. */
import earcut from 'earcut';
import { espessarSuperficie, ErroDaEspessura } from './espessura.js';

export class ErroDoMolde extends Error {
  constructor(motivo, extra = {}) { super(`aparar: ${motivo}`); this.motivo = motivo; Object.assign(this, extra); }
}

const EIXOS = { x: 0, y: 1, z: 2 };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** As bordas da superfície: o laço de vértices na ordem em que as faces percorrem a aresta de borda (a face fica à esquerda do laço). */
function lacosDaBorda(faces) {
  const dirigidas = new Set();
  for (const f of faces) for (let k = 0; k < f.length; k += 1) dirigidas.add(`${f[k]}>${f[(k + 1) % f.length]}`);
  const proximo = new Map();
  for (const f of faces) {
    for (let k = 0; k < f.length; k += 1) {
      const a = f[k]; const b = f[(k + 1) % f.length];
      if (dirigidas.has(`${b}>${a}`)) continue;
      if (proximo.has(a)) return { erro: `a borda se toca no vértice ${a}` };
      proximo.set(a, b);
    }
  }
  const lacos = []; const vistos = new Set();
  for (const inicio of proximo.keys()) {
    if (vistos.has(inicio)) continue;
    const laco = [];
    let v = inicio;
    while (v !== undefined && !vistos.has(v)) { vistos.add(v); laco.push(v); v = proximo.get(v); }
    if (v !== inicio) return { erro: 'a borda não fecha um laço' };
    lacos.push(laco);
  }
  return { lacos };
}

/**
 * moldeDeDentro({ vertices, faces, espessura, lado, folga, fecha }) -> { vertices, triangulos, folgaDaChapa }
 *   vertices, faces: a superfície refinada da chapa (a pele de fora, antes da espessura);
 *   espessura: a da chapa (0 ou nula quando ela é só uma superfície, que então é a própria pele de dentro);
 *   lado: o da chapa, 'contraNormal' (o padrão: a normal aponta para fora do carro) ou 'normal' (aponta para dentro);
 *   folga: a distância, maior ou igual a zero, entre a pele de dentro e a do molde;
 *   fecha: { eixo: 'x'|'y'|'z', em: número }, o plano da tampa.
 * `triangulos` são trios de índices de `vertices`, com a normal para fora do molde.
 */
export function moldeDeDentro({ vertices, faces, espessura = 0, lado = 'contraNormal', folga, fecha }) {
  if (!Number.isFinite(folga) || folga < 0) throw new ErroDoMolde(`a folga é um número maior ou igual a zero, e veio ${folga}`);
  if (!fecha || !(fecha.eixo in EIXOS) || !Number.isFinite(fecha.em)) throw new ErroDoMolde("fecha é { eixo: 'x' | 'y' | 'z', em: número }, o plano da tampa");
  const e = EIXOS[fecha.eixo];
  /* a pele cuja normal aponta para fora do volume: a declarada quando ela aponta para fora do carro, a invertida quando aponta para dentro */
  const pele = lado === 'normal' ? faces.map((f) => [...f].reverse()) : faces.map((f) => [...f]);
  const t = (espessura ?? 0) + folga;
  let pontos = vertices.map((p) => [...p]);
  if (t > 0) {
    let s;
    try { s = espessarSuperficie({ vertices, faces: pele, espessura: t, lado: 'contraNormal' }); } catch (erro) {
      if (erro instanceof ErroDaEspessura) throw new ErroDoMolde(`a pele de dentro a ${t} da pele de fora se dobra sobre si: ${erro.motivo}`, { lugares: erro.lugares, raio: erro.raio });
      throw erro;
    }
    pontos = s.vertices.slice(vertices.length).map((p) => [...p]);
  }
  const { lacos, erro } = lacosDaBorda(pele);
  if (erro) throw new ErroDoMolde(`a chapa não tem uma borda que se feche: ${erro}`);
  if (lacos.length !== 1) throw new ErroDoMolde(lacos.length ? `a chapa tem ${lacos.length} bordas e a tampa fecha uma só; feche os outros vãos antes, ou apare por uma chapa de uma abertura só` : 'a chapa não tem borda: ela já é fechada e não há abertura para a tampa fechar');
  const laco = lacos[0];
  /* o lado do volume: o da pele em relação à borda, ao longo do eixo da tampa; `fora(c)` é a coordenada vista de dentro para fora do volume */
  const mediaDaBorda = laco.reduce((m, v) => m + pontos[v][e], 0) / laco.length;
  const mediaDaPele = pontos.reduce((m, p) => m + p[e], 0) / pontos.length;
  const sentido = mediaDaPele >= mediaDaBorda ? 1 : -1;
  const alem = (c) => sentido * (fecha.em - c);
  const passou = Math.max(...laco.map((v) => alem(pontos[v][e])));
  /* o deslocamento move o vértice da borda até t, de modo que a borda sai um pouco do plano; mais que isso, o plano não é o da abertura */
  if (passou > t + 1e-9) throw new ErroDoMolde(`a borda da chapa fica a ${passou} do plano da tampa (${fecha.eixo} = ${fecha.em}), mais que o deslocamento da pele (${t}): o plano não é o da abertura`);
  /* a tampa fica no plano quando a borda cabe aquém dele; quando algum vértice da borda sai do plano para fora, as paredes descem até o mais fora
     deles e o plano passa a ser a face de um semiespaço que a booleana intersecta (`corte`), porque a tampa no plano cruzaria a pele */
  const maisFora = Math.min(...laco.map((v) => sentido * pontos[v][e])) * sentido;
  const corte = passou > 1e-9;
  const planoDaTampa = corte ? maisFora : fecha.em;

  const V = pontos;
  const T = [];
  for (const f of pele) for (let k = 1; k + 1 < f.length; k += 1) T.push([f[0], f[k], f[k + 1]]);
  /* a projeção de cada vértice da borda no plano; o que já está nele fica como está */
  const projetado = new Map();
  for (const v of laco) {
    if (Math.abs(pontos[v][e] - planoDaTampa) <= 1e-9) { projetado.set(v, v); continue; }
    const p = [...pontos[v]]; p[e] = planoDaTampa;
    projetado.set(v, V.length); V.push(p);
  }
  /* a parede sob cada aresta de borda a→b, percorrida de b para a, e a tampa percorre o laço ao contrário */
  for (let k = 0; k < laco.length; k += 1) {
    const a = laco[k]; const b = laco[(k + 1) % laco.length];
    const quad = [b, a, projetado.get(a), projetado.get(b)].filter((v, j, l) => v !== l[(j + 1) % l.length]);
    for (let j = 1; j + 1 < quad.length; j += 1) T.push([quad[0], quad[j], quad[j + 1]]);
  }
  const outros = [0, 1, 2].filter((c) => c !== e);
  const volta = [...laco].reverse().map((v) => projetado.get(v));
  const plano = volta.flatMap((v) => [V[v][outros[0]], V[v][outros[1]]]);
  const tampa = earcut(plano);
  if (!tampa.length) throw new ErroDoMolde('a borda projetada no plano da tampa não tem área: a tampa não fecha o molde');
  /* a tampa percorre o laço como a parede espera; cada triângulo do earcut segue o sentido do polígono, que é o da soma de Newell */
  const bordaDaTampa = volta.map((v) => V[v]);
  const normalDaTampa = [0, 0, 0];
  for (let k = 0; k < bordaDaTampa.length; k += 1) {
    const p = bordaDaTampa[k]; const q = bordaDaTampa[(k + 1) % bordaDaTampa.length];
    normalDaTampa[0] += (p[1] - q[1]) * (p[2] + q[2]); normalDaTampa[1] += (p[2] - q[2]) * (p[0] + q[0]); normalDaTampa[2] += (p[0] - q[0]) * (p[1] + q[1]);
  }
  for (let k = 0; k < tampa.length; k += 3) {
    let tri = [volta[tampa[k]], volta[tampa[k + 1]], volta[tampa[k + 2]]];
    if (dot(cruz(sub(V[tri[1]], V[tri[0]]), sub(V[tri[2]], V[tri[0]])), normalDaTampa) < 0) tri = [tri[0], tri[2], tri[1]];
    T.push(tri);
  }
  /* o molde fechado: toda aresta dirigida tem a oposta, uma vez; senão a tampa ficou cruzada */
  const dirigidas = new Map();
  for (const tri of T) for (let k = 0; k < 3; k += 1) { const c = `${tri[k]}>${tri[(k + 1) % 3]}`; dirigidas.set(c, (dirigidas.get(c) ?? 0) + 1); }
  let sem = 0;
  for (const [c, q] of dirigidas) { const [a, b] = c.split('>'); if (q !== 1 || dirigidas.get(`${b}>${a}`) !== 1) sem += 1; }
  if (sem) throw new ErroDoMolde(`o molde não fechou: ${sem} aresta(s) sem par oposto; a borda projetada no plano da tampa se cruza, ou a tampa saiu virada`);
  /* a normal para fora: o volume com sinal positivo; negativo, a pele da chapa aponta para dentro do volume */
  let volume = 0;
  for (const [a, b, c] of T) volume += dot(V[a], cruz(V[b], V[c])) / 6;
  if (!(volume > 0)) throw new ErroDoMolde(`o molde saiu com a normal para dentro (volume ${volume}): a normal da chapa aponta para o lado contrário do declarado em lado ('${lado}'), ou a tampa fica do lado errado da borda`);
  return { vertices: V, triangulos: T, corte: corte ? { eixo: fecha.eixo, em: fecha.em, sentido } : null };
}
