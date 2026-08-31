/* otimizar.js — reduz malha na CAMADA DE SAÍDA, sem mover um único ponto.
 *
 * O LIMIAR FOI DECLARADO ANTES DE MEDIR, e é o mais duro possível: a silhueta
 * não pode mudar NADA. Não "quase nada", não "dentro de um por cento" — a caixa
 * envolvente e a área de superfície têm de sair idênticas até 1e-9.
 *
 * Isso não é rigor decorativo: é o que separa este módulo de um decimador. Um
 * decimador escolhe o que sacrificar, e escolher o que sacrificar é decisão de
 * forma, que neste repositório pertence a quem autora. As três operações aqui
 * não sacrificam nada — elas removem redundância que já era redundância:
 *
 *   1. SOLDAR vértices coincidentes. Dois pontos no mesmo lugar são um ponto.
 *      Só dentro da mesma PARTE: soldar entre partes fundiria peças que
 *      apenas se encostam, e uma perna colada no assento deixa de ser perna.
 *   2. FUNDIR faces coplanares adjacentes. Duas faces no mesmo plano com uma
 *      aresta em comum descrevem a mesma superfície que uma face só.
 *   3. DESCARTAR vértice que nenhuma face cita. Peso de arquivo, zero forma.
 *
 * O QUE ELE NÃO FAZ, dito porque silêncio sobre cobertura é mentira sobre
 * cobertura: não decima, não colapsa aresta curta, não reprojeta, não gera
 * nível de detalhe e não toca em nada que mude a silhueta. Se a peça precisa
 * de menos vértice do que isto entrega, a redução é decisão de autoria e a
 * receita é que muda.
 */

export const FORMATO = 'mecanifica.otimizacao-malha@1';

const EPS_PLANO = 1e-9;
const EPS_MEDIDA = 1e-9;

export class ErroOtimizacao extends Error {
  constructor(codigo, mensagem, detalhes = null) {
    super(mensagem);
    this.name = 'ErroOtimizacao';
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

function ler(malha) {
  const brutos = malha?.vertices ?? malha?.V;
  const brutasFaces = malha?.faces ?? malha?.F;
  if (!brutos || !brutasFaces) throw new ErroOtimizacao('malha-invalida', 'Malha precisa declarar vertices e faces.');
  const vertices = new Map();
  for (const [id, p] of (brutos instanceof Map ? brutos.entries() : Object.entries(brutos))) {
    vertices.set(Number(id), p.slice(0, 3));
  }
  const faces = [];
  for (const [id, f] of (brutasFaces instanceof Map ? [...brutasFaces.entries()] : Object.entries(brutasFaces))) {
    faces.push({ id: Number(id), vs: (f.vs ?? f).map(Number), parte: f.parte ?? null, material: f.material ?? null });
  }
  return { vertices, faces };
}

function normalDaFace(vertices, vs) {
  let nx = 0; let ny = 0; let nz = 0;
  for (let k = 0; k < vs.length; k++) {
    const a = vertices.get(vs[k]);
    const b = vertices.get(vs[(k + 1) % vs.length]);
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const n = Math.hypot(nx, ny, nz);
  return n <= 0 ? null : [nx / n, ny / n, nz / n, n / 2];
}

export function medirMalha(malha) {
  const { vertices, faces } = ler(malha);
  const mn = [Infinity, Infinity, Infinity];
  const mx = [-Infinity, -Infinity, -Infinity];
  for (const p of vertices.values()) for (let k = 0; k < 3; k++) { if (p[k] < mn[k]) mn[k] = p[k]; if (p[k] > mx[k]) mx[k] = p[k]; }
  let area = 0;
  let triangulos = 0;
  for (const f of faces) {
    const n = normalDaFace(vertices, f.vs);
    if (n) area += n[3];
    triangulos += f.vs.length - 2;
  }
  return { vertices: vertices.size, faces: faces.length, triangulos, area, caixa: { min: mn, max: mx } };
}

/* Duas faces são fundíveis quando têm a MESMA normal, o mesmo plano, a mesma
   parte, o mesmo material, e compartilham exatamente uma aresta. Exigir a mesma
   parte não é conservadorismo: fundir através da fronteira apagaria a identidade
   semântica que o repositório inteiro existe para preservar. */
function planoDaFace(vertices, vs) {
  const n = normalDaFace(vertices, vs);
  if (!n) return null;
  const p0 = vertices.get(vs[0]);
  return { n: [n[0], n[1], n[2]], d: n[0] * p0[0] + n[1] * p0[1] + n[2] * p0[2] };
}

function mesmoPlano(a, b) {
  return Math.abs(a.n[0] - b.n[0]) < EPS_PLANO
    && Math.abs(a.n[1] - b.n[1]) < EPS_PLANO
    && Math.abs(a.n[2] - b.n[2]) < EPS_PLANO
    && Math.abs(a.d - b.d) < EPS_PLANO;
}

function fundirDuas(vsA, vsB, a, b) {
  /* Costura os dois ciclos pela aresta comum (a,b): percorre A até `a`, entra
     em B a partir de `b` e volta. O resultado é um ciclo só, na mesma
     orientação, sem a aresta interna. */
  const iA = vsA.indexOf(a);
  const iB = vsB.indexOf(b);
  if (iA < 0 || iB < 0) return null;
  if (vsA[(iA + 1) % vsA.length] !== b) return null;
  if (vsB[(iB + 1) % vsB.length] !== a) return null;
  const saida = [];
  for (let k = 0; k < vsA.length - 1; k++) saida.push(vsA[(iA + 1 + k) % vsA.length]);
  for (let k = 1; k < vsB.length; k++) saida.push(vsB[(iB + 1 + k - 1) % vsB.length]);
  const unicos = new Set(saida);
  if (unicos.size !== saida.length) return null;    // costura que se morde: recusa
  return saida;
}

/* A guarda é função exportada, e não um `if` enterrado no meio do fluxo, por um
   motivo prático: assim ela pode ser vista REPROVANDO num teste, com um "depois"
   fabricado. Guarda que nunca foi vista disparar é um ramo que ninguém sabe se
   funciona — e esta é justamente a que impede o módulo de virar decimador. */
export function conferirInvariante(antes, depois) {
  const deltaArea = Math.abs(depois.area - antes.area);
  const deltaCaixa = Math.max(
    ...[0, 1, 2].map((k) => Math.max(
      Math.abs(depois.caixa.min[k] - antes.caixa.min[k]),
      Math.abs(depois.caixa.max[k] - antes.caixa.max[k]),
    )),
  );
  if (deltaArea > EPS_MEDIDA * Math.max(1, antes.area) || deltaCaixa > EPS_MEDIDA) {
    throw new ErroOtimizacao('silhueta-mudou',
      `A otimização mudou a forma: área ${deltaArea}, caixa ${deltaCaixa}. Nenhuma saída foi devolvida.`,
      { deltaArea, deltaCaixa });
  }
  return { deltaArea, deltaCaixa };
}

export function otimizarMalha(malhaBruta, { soldar = true, fundirCoplanares = true, tolerancia = 1e-9 } = {}) {
  const antes = medirMalha(malhaBruta);
  const { vertices, faces } = ler(malhaBruta);

  /* --- 1. soldar coincidentes, dentro da mesma parte --- */
  let soldados = 0;
  if (soldar) {
    const q = (x) => Math.round(x / Math.max(tolerancia, Number.MIN_VALUE));
    const balde = new Map();
    const troca = new Map();
    for (const f of faces) {
      for (const v of f.vs) {
        const p = vertices.get(v);
        const ch = `${f.parte ?? ''}|${q(p[0])}|${q(p[1])}|${q(p[2])}`;
        if (!balde.has(ch)) balde.set(ch, v);
        else if (balde.get(ch) !== v && !troca.has(v)) { troca.set(v, balde.get(ch)); soldados++; }
      }
    }
    if (troca.size) for (const f of faces) f.vs = f.vs.map((v) => troca.get(v) ?? v);
  }

  /* --- 2. fundir faces coplanares adjacentes --- */
  let fundidas = 0;
  if (fundirCoplanares) {
    const vivas = new Map(faces.map((f) => [f.id, f]));
    const planos = new Map();
    for (const f of faces) { const pl = planoDaFace(vertices, f.vs); if (pl) planos.set(f.id, pl); }
    let mudou = true;
    while (mudou) {
      mudou = false;
      const porAresta = new Map();
      for (const f of vivas.values()) {
        for (let k = 0; k < f.vs.length; k++) {
          const a = f.vs[k]; const b = f.vs[(k + 1) % f.vs.length];
          const ch = a < b ? `${a}:${b}` : `${b}:${a}`;
          if (!porAresta.has(ch)) porAresta.set(ch, []);
          porAresta.get(ch).push(f.id);
        }
      }
      for (const [ch, ids] of porAresta) {
        if (ids.length !== 2) continue;
        const [idA, idB] = ids;
        const fA = vivas.get(idA); const fB = vivas.get(idB);
        if (!fA || !fB) continue;
        if (fA.parte !== fB.parte || fA.material !== fB.material) continue;
        const plA = planos.get(idA); const plB = planos.get(idB);
        if (!plA || !plB || !mesmoPlano(plA, plB)) continue;
        const [a, b] = ch.split(':').map(Number);
        const juntas = fundirDuas(fA.vs, fB.vs, a, b) ?? fundirDuas(fA.vs, fB.vs, b, a);
        if (!juntas) continue;
        fA.vs = juntas;
        vivas.delete(idB);
        planos.set(idA, planoDaFace(vertices, juntas) ?? plA);
        fundidas++; mudou = true;
        break;
      }
    }
    faces.length = 0;
    for (const f of vivas.values()) faces.push(f);
  }

  /* --- 3. descartar vértice sem uso --- */
  const usados = new Set();
  for (const f of faces) for (const v of f.vs) usados.add(v);
  let descartados = 0;
  for (const v of [...vertices.keys()]) if (!usados.has(v)) { vertices.delete(v); descartados++; }

  const saida = {
    vertices,
    faces: new Map(faces.map((f) => [f.id, { vs: f.vs, parte: f.parte, material: f.material }])),
  };
  const depois = medirMalha(saida);

  /* --- o limiar, conferido aqui e não confiado ---
     Se a caixa ou a área mudaram, a otimização deixou de ser lossless e não
     pode sair silenciosamente: ela lança. Verificar o próprio invariante é o
     que impede este módulo de virar um decimador disfarçado. */
  conferirInvariante(antes, depois);

  return {
    formato: FORMATO,
    malha: saida,
    antes,
    depois,
    ganho: {
      vertices: antes.vertices - depois.vertices,
      faces: antes.faces - depois.faces,
      triangulos: antes.triangulos - depois.triangulos,
      percentualTriangulos: antes.triangulos ? (antes.triangulos - depois.triangulos) / antes.triangulos : 0,
    },
    operacoes: { soldados, fundidas, descartados },
  };
}
