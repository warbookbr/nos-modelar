/* liso-por-angulo.js — a normal suave de um canto de face, com ângulo limite.

   `liso` sem ângulo faz a média das normais de TODAS as faces lisas que tocam
   o vértice. Numa quina de quase 90° entre duas faces lisas, a média entorta
   a normal das duas e a sombra vira um degradê escuro: foi o que apareceu nas
   costas do ombro do braço robótico, e o modelador precisou inventar uma tira
   de 0,3 mm na quina do "V" para separar vértices só por causa da sombra.

   `liso` com `angulo` (graus) é o "smooth by angle" do Blender: no canto de
   uma face, entram na média só as faces lisas cuja normal fica a menos de
   `angulo` graus da normal dessa face. A quina mais fechada que o limite fica
   nítida, e cada lado continua liso por dentro. A malha não muda; só a sombra.

   `entradas` é a lista das faces lisas que tocam o vértice, cada uma com a
   normal unitária `u` e o peso `n` (a normal já multiplicada pelo que o
   adaptador usa como peso). Devolve a normal unitária, ou null. */
export function normalLisaDoCanto(uFace, liso, entradas) {
  const limite = typeof liso === 'number' ? Math.cos((liso * Math.PI) / 180) : -Infinity;
  let x = 0; let y = 0; let z = 0;
  for (const { u, n } of entradas) {
    if (u[0] * uFace[0] + u[1] * uFace[1] + u[2] * uFace[2] < limite) continue;
    x += n[0]; y += n[1]; z += n[2];
  }
  const t = Math.hypot(x, y, z);
  return t > 1e-12 ? [x / t, y / t, z / t] : null;
}

/* As quebras de sombra. A face lisa pode trazer `quebras`, a lista de arestas suas, como pares de ids de vértice, em que
   a sombra lisa se divide qualquer que seja o ângulo: é o vinco vivo de uma superfície subdividida, que continua dobra
   onde o diedro cai abaixo do ângulo do liso. Em volta de um vértice, as faces lisas se juntam em setores pelas arestas
   que elas dividem e que não são quebra, e a média do canto só soma as faces do setor dele (e, com ângulo, só as que
   ficam a menos do ângulo, como antes). A quebra declarada por uma das duas faces da aresta vale para as duas.

   `chaveDoCantoLiso(faces)` devolve a função (face, v) -> a chave com que o adaptador soma a normal do canto: o próprio
   v quando nenhuma quebra toca o vértice, de modo que a peça sem quebra soma exatamente como antes, e `v:<id>` com o
   menor id de face do setor quando alguma toca. A conta só visita os vértices das quebras. */
const chaveDaAresta = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);

export function chaveDoCantoLiso(entrada) {
  const faces = [...entrada];
  const quebras = new Set(); const tocados = new Set();
  for (const f of faces) {
    if (!f.liso || !Array.isArray(f.quebras)) continue;
    for (const [a, b] of f.quebras) { quebras.add(chaveDaAresta(a, b)); tocados.add(a); tocados.add(b); }
  }
  if (!quebras.size) return (_face, v) => v;
  const emVolta = new Map();
  for (const f of faces) {
    if (!f.liso) continue;
    for (const v of f.vs) if (tocados.has(v)) { if (!emVolta.has(v)) emVolta.set(v, []); emVolta.get(v).push(f); }
  }
  const setor = new Map();
  for (const [v, lista] of emVolta) {
    lista.sort((p, q) => p.id - q.id);
    const pai = lista.map((_, k) => k);
    const raiz = (k) => { while (pai[k] !== k) { pai[k] = pai[pai[k]]; k = pai[k]; } return k; };
    const porAresta = new Map();
    lista.forEach((f, k) => {
      const n = f.vs.length; const j = f.vs.indexOf(v);
      for (const w of [f.vs[(j + 1) % n], f.vs[(j - 1 + n) % n]]) {
        const c = chaveDaAresta(v, w);
        if (quebras.has(c)) continue;
        if (!porAresta.has(c)) { porAresta.set(c, k); continue; }
        const r1 = raiz(porAresta.get(c)); const r2 = raiz(k);
        if (r1 !== r2) pai[Math.max(r1, r2)] = Math.min(r1, r2);
      }
    });
    lista.forEach((f, k) => setor.set(`${f.id}:${v}`, `${v}:${lista[raiz(k)].id}`));
  }
  return (face, v) => setor.get(`${face.id}:${v}`) ?? v;
}

/* O valor gravado em `face.liso`: `true` sem ângulo, o número com ângulo. */
export function valorDoLiso(angulo) {
  if (angulo === undefined || angulo === null) return true;
  if (typeof angulo !== 'number' || !Number.isFinite(angulo) || angulo <= 0 || angulo >= 180) {
    throw new TypeError(`liso: 'angulo' precisa ser número de graus entre 0 e 180, recebeu ${angulo}.`);
  }
  return angulo;
}
