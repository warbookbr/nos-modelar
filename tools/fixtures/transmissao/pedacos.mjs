/* pedacos.mjs — quantos pedaços separados a malha tem: as faces que dividem vértice (na mesma posição, a 0,1 µm) ficam no
 * mesmo pedaço. Uma peça de família sai num pedaço só; a catraca saiu com uma lasca solta em cada dente, e a aprovação
 * mecânica, que confere a malha fechada, não acusou, porque cada lasca é fechada. */
export function pedacosDaMalha(neutro) {
  const pai = new Map();
  const raiz = (x) => { while (pai.get(x) !== x) { pai.set(x, pai.get(pai.get(x))); x = pai.get(x); } return x; };
  const chave = (v) => neutro.V.get(v).map((c) => Math.round(c * 1e7)).join(',');
  for (const f of neutro.F.values()) {
    const ks = f.vs.map(chave);
    for (const k of ks) if (!pai.has(k)) pai.set(k, k);
    for (const k of ks.slice(1)) pai.set(raiz(k), raiz(ks[0]));
  }
  return new Set([...pai.keys()].map(raiz)).size;
}
