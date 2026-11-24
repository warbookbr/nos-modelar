/* lascas-da-malha.mjs — os pedaços finos demais para serem de propósito: a lasca que uma subtração deixa solta.
 *
 * A malha é separada em pedaços conectados (faces que dividem vértice na mesma posição, a 0,1 µm), e a espessura de cada
 * pedaço é estimada por 2 × volume / área, que numa placa fina dá a espessura dela. Pedaço abaixo de ESPESSURA_MINIMA é
 * lasca. A catraca e a engrenagem reta da família `engrenagem` saíram com uma lasca de 0,004 a 0,01 mm na ponta de cada
 * dente, e a aprovação, que conferia só a malha fechada, não acusou, porque cada lasca é fechada. Nas 13 famílias de
 * 2026-11-24, o pedaço mais fino de propósito tem 0,068 mm (o bordo de fuga da superfície aerodinâmica) e o seguinte
 * 0,12 mm (um terminal de componente eletrônico). A malha em metro; a espessura em milímetro. */
export const ESPESSURA_MINIMA = 0.02;

/** Os pedaços da malha com espessura abaixo de `espessuraMinima` (mm): `[{ espessura, volume, faces, caixa }]`, do mais fino ao mais grosso. */
export function lascasDaMalha(neutro, { espessuraMinima = ESPESSURA_MINIMA } = {}) {
  const pai = new Map();
  const raiz = (x) => { while (pai.get(x) !== x) { pai.set(x, pai.get(pai.get(x))); x = pai.get(x); } return x; };
  const chave = (v) => neutro.V.get(v).map((c) => Math.round(c * 1e7)).join(',');
  for (const f of neutro.F.values()) {
    const ks = f.vs.map(chave);
    for (const k of ks) if (!pai.has(k)) pai.set(k, k);
    for (const k of ks.slice(1)) pai.set(raiz(k), raiz(ks[0]));
  }
  const pedacos = new Map();
  for (const f of neutro.F.values()) {
    const r = raiz(chave(f.vs[0]));
    const p = pedacos.get(r) ?? { volume: 0, area: 0, faces: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    const P = f.vs.map((v) => neutro.V.get(v).map((c) => c * 1000));
    for (let i = 1; i + 1 < P.length; i += 1) {
      const [a, b, c] = [P[0], P[i], P[i + 1]];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      p.area += Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2;
      p.volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
    for (const q of P) for (let k = 0; k < 3; k += 1) { p.min[k] = Math.min(p.min[k], q[k]); p.max[k] = Math.max(p.max[k], q[k]); }
    p.faces += 1;
    pedacos.set(r, p);
  }
  return [...pedacos.values()]
    .map((p) => ({ espessura: p.area > 0 ? (2 * Math.abs(p.volume)) / p.area : 0, volume: Math.abs(p.volume), faces: p.faces, caixa: { min: p.min, max: p.max } }))
    .filter((p) => p.espessura < espessuraMinima)
    .sort((a, b) => a.espessura - b.espessura);
}
