/* costura-registrada.mjs — régua: a costura que o `unir` registra (`arestas` do registro de origem) contra a costura geométrica da malha que ele
   entregou (plano "costuras e furos limpos", fatia 2). A costura geométrica são as arestas que duas faces de operandos diferentes dividem
   (`donos` do registro). Aresta geométrica sem registro é costura perdida: o `arredondarCostura` não a arredonda e, onde ela some entre arestas
   registradas, o trecho vira tubo curto com tampa, que dá dentes no fim do arredondamento. Lê o neutro de uma peça executada (`V`, `F`,
   `origens`); mede o registro de uma origem de booleana por vez, e a peça tem de acabar nessa booleana, porque um passo depois dela (o
   próprio `arredondarCostura`) corta as faces e muda as arestas. */

const chave = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** A costura geométrica de um registro de booleana: as arestas entre duas faces vivas de operandos diferentes. */
export function costuraGeometrica(neutro, registro) {
  const donos = registro.donos ?? {};
  const lados = new Map();
  for (const f of neutro.F.values()) {
    const dono = donos[f.id];
    if (dono === undefined) continue;
    for (let i = 0; i < f.vs.length; i++) {
      const a = f.vs[i], b = f.vs[(i + 1) % f.vs.length];
      const k = chave(a, b);
      if (!lados.has(k)) lados.set(k, new Set());
      lados.get(k).add(dono);
    }
  }
  return new Set([...lados].filter(([, d]) => d.size > 1).map(([k]) => k));
}

/** Compara a costura registrada da origem `origemId` com a geométrica: `{ registradas, geometricas, perdidas, sobras }`. */
export function medirCosturaRegistrada(neutro, origemId) {
  const registro = (neutro.origens?.get(origemId) ?? []).find((r) => r.donos && r.arestas);
  if (!registro) throw new Error(`origem ${origemId} não tem registro de booleana com costura`);
  const reg = new Set(registro.arestas.map(([a, b]) => chave(a, b)));
  const geo = costuraGeometrica(neutro, registro);
  const perdidas = [...geo].filter((k) => !reg.has(k)).sort();
  const sobras = [...reg].filter((k) => !geo.has(k)).sort();
  return { registradas: reg.size, geometricas: geo.size, perdidas, sobras };
}
