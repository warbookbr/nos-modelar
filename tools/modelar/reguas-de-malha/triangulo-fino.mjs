/* triangulo-fino.mjs — régua de malha: o triângulo fino e longo numa região plana (plano "costuras e furos limpos", fatia 1).

   Triangula cada face como o `adaptarThree` triangula (a régua chama o próprio adaptador e lê os triângulos que ele entrega, com o id da face
   neutra de cada um em `origemFace`), e não repete a triangulação. A razão de aspecto de um triângulo é o maior lado sobre a altura relativa a ele:
   o equilátero dá 1,155 e o quadrado cortado na diagonal, 2.

   A razão sozinha não separa o defeito do inevitável. A lateral de um tubo (um quadro de 3,4 por 190 mm) tem diagonal de razão 56 e nenhuma outra
   escolha, e as orelhas de um polígono regular de 144 lados têm razão 91,7 em qualquer triangulação; nenhum dos dois dá estria. O que dá é o
   triângulo que atravessa a região plana muito além da resolução do contorno dela: o leque de um centro às bordas de uma tampa, o leque que o
   `furo` refaz em volta de cada furo. Por isso a régua trabalha por REGIÃO PLANA, o conjunto de faces planas ligadas por aresta, de mesmo plano
   (normais a menos de 1e-4 rad e planos a menos de 1 µm). Um triângulo é FINO quando tem razão acima de `LIMITE_DA_RAZAO` e o maior lado acima de
   `FATOR_DO_LADO` vezes a aresta média do contorno da região (as arestas que a região não divide com outra face dela). Com isso a orelha de um
   polígono regular (maior lado 2 vezes a aresta) e a diagonal de um quadro estreito (o contorno dele tem arestas de 3,4 e de 190 mm, média 96,7)
   ficam de fora. Ainda assim uma tampa de 144 lados com vértices só no contorno, como a do flange, não tem como evitar os triângulos de corda
   longa (21 acima de razão 50): a régua os conta, e quem os tira são os vértices dentro da região, que a fatia 4 do plano põe em anéis.
   Face curva fica fora das regiões: nela a triangulação segue a superfície.

   O limite 10 vem da medida: no flange (disco de 154 mm com nove furos) a região do tampo com os furos tem 322 triângulos, 286 acima de razão 10
   e o pior com 13 898; o leque de um centro às bordas de um disco de 77 mm e 144 lados dá 22,6. O limite fica acima do equilátero (1,155) e do
   quadro cortado na diagonal (2) com folga, e abaixo do leque.

   A face degenerada (que o adaptador recusa) fica de fora da triangulação; a régua de face degenerada é que a conta. Lê só `V` e `F`. */
import { adaptarThree, idDeOrigem } from '../../../src/autoria/adaptar-three.js';
import { normalDeNewell } from './face-degenerada.mjs';

export const LIMITE_DA_RAZAO = 10;
export const FATOR_DO_LADO = 4;
const ANGULO = 1e-4;
const PLANO = 1e-6;
const PLANA = 1e-3;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const comp = (a, b) => Math.hypot(...sub(b, a));

/** A razão de aspecto (maior lado sobre a altura relativa a ele) do triângulo; Infinity se a área é nula. */
export function razaoDoTriangulo(a, b, c) {
  const maior = Math.max(comp(a, b), comp(b, c), comp(c, a));
  const dobroDaArea = Math.hypot(...cruz(sub(b, a), sub(c, a)));
  return dobroDaArea > 0 ? (maior * maior) / dobroDaArea : Infinity;
}

/* a normal unitária e o plano de uma face, ou null se ela é degenerada ou torta */
function planoDaFace(pontos) {
  let nx = 0, ny = 0, nz = 0, maior = 0;
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i], b = pontos[(i + 1) % pontos.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]);
    maior = Math.max(maior, comp(a, b));
  }
  const n = Math.hypot(nx, ny, nz);
  if (!(n > 1e-12)) return null;
  const u = [nx / n, ny / n, nz / n];
  const o = pontos[0];
  if (!pontos.every((p) => Math.abs(dot(sub(p, o), u)) <= PLANA * maior)) return null;
  return { u, d: dot(u, o) };
}

/** As regiões planas: { regiao: Map id da face -> índice, contorno: [aresta média do contorno de cada região] }. Só faces planas e não degeneradas entram. */
export function regioesPlanas(neutro) {
  const plano = new Map();
  for (const face of neutro.F.values()) {
    if (!Array.isArray(face.vs) || face.vs.length < 3) continue;
    const p = planoDaFace(face.vs.map((v) => neutro.V.get(v)));
    if (p) plano.set(face.id, p);
  }
  const pai = new Map([...plano.keys()].map((id) => [id, id]));
  const raiz = (x) => { while (pai.get(x) !== x) { pai.set(x, pai.get(pai.get(x))); x = pai.get(x); } return x; };
  const arestas = new Map();
  for (const face of neutro.F.values()) {
    if (!plano.has(face.id)) continue;
    const n = face.vs.length;
    for (let i = 0; i < n; i++) {
      const a = face.vs[i], b = face.vs[(i + 1) % n];
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      const e = arestas.get(k);
      if (e) e.ids.push(face.id); else arestas.set(k, { a, b, ids: [face.id] });
    }
  }
  const mesmoPlano = (f, g) => {
    const p = plano.get(f), q = plano.get(g);
    const c = dot(p.u, q.u);
    return Math.acos(Math.min(1, Math.abs(c))) <= ANGULO && c > 0 && Math.abs(p.d - q.d) <= PLANO;
  };
  for (const { ids } of arestas.values()) if (ids.length === 2 && mesmoPlano(ids[0], ids[1])) pai.set(raiz(ids[0]), raiz(ids[1]));
  const indice = new Map();
  const regiao = new Map();
  for (const id of plano.keys()) {
    const r = raiz(id);
    if (!indice.has(r)) indice.set(r, indice.size);
    regiao.set(id, indice.get(r));
  }
  /* o contorno de cada região: as arestas de uma face dela cuja outra face não é da região */
  const soma = new Array(indice.size).fill(0), conta = new Array(indice.size).fill(0);
  for (const { a, b, ids } of arestas.values()) {
    const donos = ids.map((id) => regiao.get(id));
    const fora = ids.length === 1 || (ids.length === 2 && donos[0] !== donos[1]);
    if (!fora) continue;
    const va = neutro.V.get(a), vb = neutro.V.get(b);
    for (const r of new Set(donos)) { soma[r] += comp(va, vb); conta[r]++; }
  }
  return { regiao, contorno: soma.map((s, i) => (conta[i] ? s / conta[i] : 0)), regioes: indice.size };
}

/** { triangulos, finos, regioes, pior, porRegiao: [{ regiao, faces, triangulos, finos, pior }] }: os finos só existem em região plana. */
export function medirTrianguloFino(neutro, { limite = LIMITE_DA_RAZAO, fator = FATOR_DO_LADO } = {}) {
  const boas = new Map();
  for (const face of neutro.F.values()) {
    if (!Array.isArray(face.vs) || face.vs.length < 3) continue;
    const normal = normalDeNewell(face.vs.map((v) => neutro.V.get(v)));
    if (normal != null && normal > 1e-12) boas.set(face.id, face);
  }
  const { regiao, contorno } = regioesPlanas({ ...neutro, F: boas });
  const { raiz } = adaptarThree({ ...neutro, F: boas, orfaos: [] });
  const porRegiao = new Map();
  let triangulos = 0, finos = 0, pior = 0;
  raiz.traverse((no) => {
    const g = no.geometry;
    if (!g) return;
    const pos = g.getAttribute('position'), origem = g.getAttribute('origemFace');
    const ponto = (i) => [pos.getX(i), pos.getY(i), pos.getZ(i)];
    for (let i = 0; i + 2 < pos.count; i += 3) {
      triangulos++;
      const r = regiao.get(idDeOrigem(origem, i));
      if (r === undefined) continue;
      const a = ponto(i), b = ponto(i + 1), c = ponto(i + 2);
      const razao = razaoDoTriangulo(a, b, c);
      const longo = Math.max(comp(a, b), comp(b, c), comp(c, a)) > fator * contorno[r];
      const e = porRegiao.get(r) ?? { regiao: r, faces: new Set(), triangulos: 0, finos: 0, pior: 0 };
      e.faces.add(idDeOrigem(origem, i));
      e.triangulos++;
      if (razao > limite && longo) { e.finos++; finos++; e.pior = Math.max(e.pior, razao); pior = Math.max(pior, razao); }
      porRegiao.set(r, e);
    }
  });
  const regioes = [...porRegiao.values()].filter((e) => e.finos > 0).map((e) => ({ ...e, faces: e.faces.size })).sort((a, b) => b.finos - a.finos || a.regiao - b.regiao);
  return { triangulos, finos, regioes: regioes.length, pior, porRegiao: regioes };
}
