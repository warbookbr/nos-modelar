/* esqueleto-de-bolas.js — a peça de bolas e bastões de um esqueleto de proporção, as poses e o aviso de membro que atravessa outro.
 *
 * Plano `2026-11-26-esqueleto-de-proporcao`, fatia 2. Este módulo é puro (sem disco, sem relógio, sem sorteio): recebe o esqueleto
 * resolvido que `npm run esqueleto -- --escrever` grava (`mecanifica.esqueleto@1`, lido pela receita por import estático de JSON) e
 * devolve três coisas com as mesmas operações que as peças já usam (esfera, cilindro, rotaciona, transladar, parte e material):
 *
 *   posarEsqueleto     põe o esqueleto numa pose: cada junta gira a subárvore em torno do próprio eixo, da raiz para as folhas.
 *                      O ângulo é em graus, pela regra da mão direita em torno do eixo da junta (o eixo de uma junta espelhada já
 *                      vem refletido como pseudovetor, então o mesmo ângulo flexiona os dois lados para o mesmo lado). A junta
 *                      não move a si mesma nem o bastão que a liga ao pai: gira o que pende dela.
 *   avisosDaPose       a interpenetração de pares de elementos (bola ou bastão) e o elemento abaixo do chão declarado. Conta
 *                      analítica: a bola é uma esfera, o bastão é uma cápsula (o segmento do pai até a junta, com o raio do bastão),
 *                      e a distância entre segmentos dá a folga. A cápsula é um pouco mais gorda que o cilindro de ponta plana
 *                      da peça, então o aviso é conservador nas pontas. Pares vizinhos na árvore ficam fora da conta, pois se
 *                      tocam por construção: elementos que compartilham uma junta (a bola e os bastões que chegam a ela ou saem
 *                      dela, os bastões irmãos) e as bolas de pai e filho ou de irmãos.
 *   receitaDoEsqueleto a receita procedural: uma bola `bola-<id>` por junta e um bastão `bastao-<id>` por membro, cada um uma parte
 *                      nomeada com o id do andaime em camelCase (`bola-ombro-direito` vira `bolaOmbroDireito`), na pose pedida.
 */

export const TOLERANCIA_DO_CONTATO_MM = 0.01;
export const ANEIS_DA_BOLA = 8;
export const LADOS_DA_BOLA = 16;
export const LADOS_DO_BASTAO = 16;
export const MATERIAIS_DO_ESQUELETO = {
  junta: { cor: '#e8731c', aspereza: 0.55 },
  membro: { cor: '#8d9196', aspereza: 0.4 },
};

const m = (mm) => mm / 1000;
const arred = (n) => Number(n.toFixed(6));
const soma = (a, b) => a.map((x, i) => x + b[i]);
const menos = (a, b) => a.map((x, i) => x - b[i]);
const esc = (a, k) => a.map((x) => x * k);
const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const IDENTIDADE = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const aplicar = (R, v) => R.map((linha) => ponto(linha, v));
const multiplicar = (A, B) => A.map((linha) => [0, 1, 2].map((j) => linha[0] * B[0][j] + linha[1] * B[1][j] + linha[2] * B[2][j]));

/** Matriz de rotação (regra da mão direita) de `graus` em torno do eixo unitário `e`, pela fórmula de Rodrigues. */
export function rotacao(e, graus) {
  const t = (graus * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), k = 1 - c;
  const [x, y, z] = e;
  return [
    [c + x * x * k, x * y * k - z * s, x * z * k + y * s],
    [y * x * k + z * s, c + y * y * k, y * z * k - x * s],
    [z * x * k - y * s, z * y * k + x * s, c + z * z * k],
  ];
}

/** O nome da parte de um elemento (`bola-ombro-direito` vira `bolaOmbroDireito`): o PLANO só aceita letras e dígitos. */
export const nomeDaParte = (idDoElemento) => idDoElemento.split('-').map((t, i) => (i ? t[0].toUpperCase() + t.slice(1) : t)).join('');

const porId = (arvore) => new Map(arvore.juntas.map((j) => [j.id, j]));

/** Poses declaradas, a zero primeiro: [{ nome, angulos }]. */
export function posesDoEsqueleto(arvore) {
  const declaradas = (arvore.poses ?? []).filter((p) => p.nome !== 'zero');
  return [{ nome: 'zero', angulos: {} }, ...declaradas];
}

/** Posição de cada junta (e da raiz) na pose dada, em mm: Map id -> [x, y, z]. */
export function posarEsqueleto(arvore, angulos = {}) {
  const juntas = porId(arvore);
  const posicoes = new Map([[arvore.raiz.id, arvore.raiz.posicao.slice()]]);
  const giros = new Map([[arvore.raiz.id, IDENTIDADE]]);
  const resolver = (id) => {
    if (posicoes.has(id)) return;
    const j = juntas.get(id);
    resolver(j.pai);
    const R = giros.get(j.pai);
    posicoes.set(id, soma(posicoes.get(j.pai), aplicar(R, esc(j.direcao, j.comprimento))));
    const graus = angulos[id] ?? 0;
    giros.set(id, j.eixo && graus !== 0 ? multiplicar(R, rotacao(j.eixo, graus)) : R);
  };
  for (const j of arvore.juntas) resolver(j.id);
  return posicoes;
}

/** Os elementos da pose: bolas (esfera) e bastões (cápsula), na ordem raiz, depois cada junta (bola, bastão). */
export function elementosDaPose(arvore, angulos = {}) {
  const pos = posarEsqueleto(arvore, angulos);
  const elementos = [{ id: `bola-${arvore.raiz.id}`, tipo: 'bola', nos: [arvore.raiz.id], pai: null, a: pos.get(arvore.raiz.id), raio: arvore.raiz.raioDaBola }];
  for (const j of arvore.juntas) {
    elementos.push({ id: `bola-${j.id}`, tipo: 'bola', nos: [j.id], pai: j.pai, a: pos.get(j.id), raio: j.raioDaBola });
    elementos.push({ id: `bastao-${j.id}`, tipo: 'bastao', nos: [j.pai, j.id], pai: null, a: pos.get(j.pai), b: pos.get(j.id), raio: j.raioDoBastao });
  }
  return elementos;
}

/* Distância mínima entre dois segmentos (Ericson, "Real-Time Collision Detection", 5.1.9). */
function distanciaEntreSegmentos(p1, q1, p2, q2) {
  const d1 = menos(q1, p1), d2 = menos(q2, p2), r = menos(p1, p2);
  const a = ponto(d1, d1), e = ponto(d2, d2), f = ponto(d2, r);
  const grampo = (x) => Math.min(1, Math.max(0, x));
  let s, t;
  if (a <= 1e-12 && e <= 1e-12) { s = 0; t = 0; } else if (a <= 1e-12) { s = 0; t = grampo(f / e); } else {
    const c = ponto(d1, r);
    if (e <= 1e-12) { t = 0; s = grampo(-c / a); } else {
      const b = ponto(d1, d2), den = a * e - b * b;
      s = den > 1e-12 ? grampo((b * f - c * e) / den) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = grampo(-c / a); } else if (t > 1) { t = 1; s = grampo((b - c) / a); }
    }
  }
  const c1 = soma(p1, esc(d1, s)), c2 = soma(p2, esc(d2, t));
  return Math.hypot(...menos(c1, c2));
}

const extremos = (e) => (e.tipo === 'bola' ? [e.a, e.a] : [e.a, e.b]);
const distancia = (x, y) => { const [p1, q1] = extremos(x), [p2, q2] = extremos(y); return distanciaEntreSegmentos(p1, q1, p2, q2); };

function vizinhos(x, y) {
  if (x.nos.some((n) => y.nos.includes(n))) return true;
  if (x.tipo === 'bola' && y.tipo === 'bola') return x.pai === y.nos[0] || y.pai === x.nos[0] || (x.pai !== null && x.pai === y.pai);
  return false;
}

/** Os avisos de uma pose: [{ tipo: 'atravessa', a, b, penetracao }, { tipo: 'abaixo-do-chao', elemento, abaixo }], penetração e queda em mm. */
export function avisosDaPose(arvore, angulos = {}) {
  const el = elementosDaPose(arvore, angulos);
  const avisos = [];
  for (let i = 0; i < el.length; i++) {
    for (let k = i + 1; k < el.length; k++) {
      if (vizinhos(el[i], el[k])) continue;
      const penetracao = el[i].raio + el[k].raio - distancia(el[i], el[k]);
      if (penetracao > TOLERANCIA_DO_CONTATO_MM) avisos.push({ tipo: 'atravessa', a: el[i].id, b: el[k].id, penetracao: Number(penetracao.toFixed(2)) });
    }
  }
  if (typeof arvore.chao === 'number') {
    for (const e of el) {
      const abaixo = arvore.chao - (Math.min(...extremos(e).map((p) => p[1])) - e.raio);
      if (abaixo > TOLERANCIA_DO_CONTATO_MM) avisos.push({ tipo: 'abaixo-do-chao', elemento: e.id, abaixo: Number(abaixo.toFixed(2)), chao: arvore.chao });
    }
  }
  return avisos;
}

/** Uma linha por aviso, para o terminal. */
export function textoDoAviso(pose, a) {
  return a.tipo === 'atravessa'
    ? `pose '${pose}': ${a.a} atravessa ${a.b} em ${a.penetracao} mm`
    : `pose '${pose}': ${a.elemento} passa ${a.abaixo} mm abaixo do chão (y = ${a.chao})`;
}

/* ---------- a peça ---------- */

/* Rotações que levam o eixo y da forma recém-criada à direção unitária `d`: z por t (acos de dy) e depois y por s. */
function giroParaADirecao(d) {
  const h = Math.hypot(d[0], d[2]);
  const t = (Math.acos(Math.max(-1, Math.min(1, d[1]))) * 180) / Math.PI;
  const s = h < 1e-9 ? 0 : (Math.atan2(d[2], -d[0]) * 180) / Math.PI;
  return { t, s };
}

const inteiroDe = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });

/** Os passos da peça na pose e os apelidos de seleção (o cilindro inteiro, laterais e tampas, de cada bastão): ids de origem 10, 11, 12...
 * (uma bola ou um bastão cada). */
export function passosEApelidosDoEsqueleto(arvore, angulos = {}) {
  const pos = posarEsqueleto(arvore, angulos);
  const passos = [];
  const apelidos = [];
  let id = 10;
  const bola = (nome, centro, raio) => {
    const origemId = id++;
    passos.push(['esfera', { origemId, raio: m(raio), aneis: ANEIS_DA_BOLA, lados: LADOS_DA_BOLA, em: [m(centro[0]), m(centro[1] - raio), m(centro[2])] }]);
    const sel = { origem: { op: 'esfera', id: origemId } };
    passos.push(['parte', { nome: nomeDaParte(nome), sel }], ['material', { usa: 'junta', sel }]);
  };
  const bastao = (nome, de, para, raio) => {
    const origemId = id++;
    const v = menos(para, de), comprimento = Math.hypot(...v), d = esc(v, 1 / comprimento);
    passos.push(['cilindro', { origemId, raio: m(raio), altura: m(comprimento), lados: LADOS_DO_BASTAO }]);
    apelidos.push([`cilindro${origemId}`, inteiroDe(origemId)]);
    const sel = { alias: `cilindro${origemId}` };
    const { t, s } = giroParaADirecao(d);
    if (Math.abs(t) > 1e-9) passos.push(['rotaciona', { eixo: 'z', graus: arred(t), pivo: [0, 0, 0], sel }]);
    if (Math.abs(s) > 1e-9) passos.push(['rotaciona', { eixo: 'y', graus: arred(s), pivo: [0, 0, 0], sel }]);
    passos.push(['transladar', { d: de.map((x) => m(x)), sel }]);
    passos.push(['parte', { nome: nomeDaParte(nome), sel }], ['material', { usa: 'membro', sel }]);
  };
  bola(`bola-${arvore.raiz.id}`, pos.get(arvore.raiz.id), arvore.raiz.raioDaBola);
  for (const j of arvore.juntas) {
    bola(`bola-${j.id}`, pos.get(j.id), j.raioDaBola);
    bastao(`bastao-${j.id}`, pos.get(j.pai), pos.get(j.id), j.raioDoBastao);
  }
  return { passos, apelidos };
}

export const passosDoEsqueleto = (arvore, angulos = {}) => passosEApelidosDoEsqueleto(arvore, angulos).passos;

/* Os contatos por construção: bola e bastão, ou dois bastões, que compartilham uma junta. O par é o que o aviso de atravessamento ignora. */
function contatosDoEsqueleto(arvore) {
  const el = elementosDaPose(arvore);
  const contatos = [];
  for (let i = 0; i < el.length; i++) {
    for (let k = i + 1; k < el.length; k++) {
      if (!vizinhos(el[i], el[k]) || (el[i].tipo === 'bola' && el[k].tipo === 'bola')) continue;
      contatos.push({ par: [nomeDaParte(el[i].id), nomeDaParte(el[k].id)].sort(), penetracaoMaxima: m(el[i].raio + el[k].raio), motivo: `se tocam na junta que compartilham, por construção do esqueleto; entram no máximo a soma dos raios, ${arred(el[i].raio + el[k].raio)} mm` });
    }
  }
  return contatos.sort((x, y) => x.par.join().localeCompare(y.par.join()));
}

/** A receita da peça de bolas e bastões do esqueleto resolvido `arvore`, na pose `pose` (nome declarado; `zero` por padrão).
 * `referencias` são os arquivos, relativos à receita, de onde as medidas vêm (o `proporcoes.json` do esqueleto). */
export function receitaDoEsqueleto(arvore, { pose = 'zero', referencias = ['./proporcoes.json'] } = {}) {
  const declarada = posesDoEsqueleto(arvore).find((p) => p.nome === pose);
  if (!declarada) {
    const nomes = posesDoEsqueleto(arvore).map((p) => p.nome).join(', ');
    throw new Error(`esqueleto '${arvore.id}': pose '${pose}' não existe; esperava uma de ${nomes}; conserte com: npm run esqueleto -- --proporcoes=<proporcoes.json> (a seção esqueleto.poses lista as poses)`);
  }
  const partes = [{ nome: nomeDaParte(`bola-${arvore.raiz.id}`), forma: `bola de ${arvore.raiz.raioDaBola} mm de raio na raiz`, tecnica: 'esfera' }];
  for (const j of arvore.juntas) {
    partes.push({ nome: nomeDaParte(`bola-${j.id}`), forma: `bola de ${j.raioDaBola} mm de raio na junta ${j.id}`, tecnica: 'esfera' });
    partes.push({ nome: nomeDaParte(`bastao-${j.id}`), forma: `bastão de ${j.raioDoBastao} mm de raio e ${arred(j.comprimento)} mm de comprimento, do pai até ${j.id}`, tecnica: 'cilindro girado' });
  }
  return {
    meta: { nome: `esqueleto-${arvore.id}`, desc: `esqueleto de proporção ${arvore.id} em bolas e bastões, na pose ${pose}` },
    PARAMS: { pose },
    MATERIAIS: MATERIAIS_DO_ESQUELETO,
    TOPO: { origem: 'o referencial do esqueleto: y para cima, a raiz na altura declarada, +z para a frente' },
    PLANO: {
      objeto: `esqueleto de proporção ${arvore.id}: uma bola por junta e um bastão por membro, na pose ${pose}`,
      referencias,
      escala: { medida: 'altura da raiz', milimetros: arvore.raiz.posicao[1] },
      partes,
      criteriosDeReprovacao: ['membro com comprimento diferente do declarado em proporcoes.json', 'junta fora da posição que a pose dá'],
    },
    contatos: contatosDoEsqueleto(arvore),
    get ALIASES() { return passosEApelidosDoEsqueleto(arvore, declarada.angulos).apelidos; },
    get PASSOS() { return passosDoEsqueleto(arvore, declarada.angulos); },
  };
}
