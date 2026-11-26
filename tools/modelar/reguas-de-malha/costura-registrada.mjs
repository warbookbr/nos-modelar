#!/usr/bin/env node
/* costura-registrada.mjs — régua: a costura que o `unir` registra (`arestas` do registro de origem) contra a costura geométrica da malha que ele
   entregou (plano "costuras e furos limpos", fatia 2). A costura geométrica são as arestas que duas faces de operandos diferentes dividem
   (`donos` do registro). Aresta geométrica sem registro é costura perdida: o `arredondarCostura` não a arredonda e, onde ela some entre arestas
   registradas, o trecho vira tubo curto com tampa, que dá dentes no fim do arredondamento. Lê o neutro de uma peça executada (`V`, `F`,
   `origens`); mede o registro de uma origem de booleana por vez, e a peça tem de acabar nessa booleana, porque um passo depois dela (o
   próprio `arredondarCostura`) corta as faces e muda as arestas.

   Pela linha de comando (`npm run costura:registrada -- <peça>`), cada passo `unir` da receita é medido com a receita cortada logo depois dele,
   e o comando sai com 1 quando alguma costura tem aresta perdida ou de sobra. */

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

/** Os passos `unir` de uma receita, cada um medido com a receita cortada logo depois dele (a peça tem de acabar na booleana medida).
    `executar` é o `executarReceita`; vem de fora para a régua continuar sem importar o núcleo. */
export function medirCosturasDaReceita(receita, executar) {
  const passos = receita.PASSOS ?? [];
  const linhas = [];
  passos.forEach((p, i) => {
    if (p[0] !== 'unir' || !p[1]?.origemId) return;
    const origem = p[1].origemId;
    try {
      const { neutro } = executar({ ...receita, PASSOS: passos.slice(0, i + 1) });
      linhas.push({ passo: i, origem, ...medirCosturaRegistrada(neutro, origem) });
    } catch (erro) { linhas.push({ passo: i, origem, motivo: String(erro.message).split('\n')[0] }); }
  });
  return linhas;
}

const AJUDA = `costura-registrada: compara a costura que cada \`unir\` da receita registra com a costura geométrica da malha que ele entrega.

  npm run costura:registrada -- <peça>     uma linha por passo unir: arestas registradas, geométricas, perdidas e de sobra
  --json                                   a saída em JSON
  --ajuda                                  esta mensagem

Aresta perdida é costura que o arredondarCostura não vê e vira dente no fim do arredondamento. Cada unir é medido com a receita
cortada logo depois dele, então a peça é executada uma vez por unir. Sai com 1 quando há aresta perdida ou de sobra, e com 2 no erro de uso.`;

if (process.argv[1] && process.argv[1].endsWith('costura-registrada.mjs')) {
  const [{ lerArgumentos }, { importarReceita, receitaDoModulo }, { resolverCaminhoReceita }, { executarReceita }] = await Promise.all([
    import('../argumentos.mjs'), import('../importar-receita.mjs'), import('../resolver-caminho-receita.mjs'), import('../../../src/autoria/executar-receita.js'),
  ]);
  let codigo = 0;
  try {
    const lido = lerArgumentos(process.argv.slice(2), { bandeiras: ['json', 'ajuda'], posicional: { nome: 'a peça', obrigatorio: false } });
    if (lido.bandeira('ajuda')) console.log(AJUDA);
    else if (!lido.posicional) { console.error(`costura-registrada: diga a peça.\n\n${AJUDA}`); codigo = 2; }
    else {
      const receita = receitaDoModulo(await importarReceita(resolverCaminhoReceita(lido.posicional)));
      if (!Array.isArray(receita.PASSOS)) throw new Error(`'${lido.posicional}' não exporta PASSOS; a régua mede só receita de passos.`);
      const linhas = medirCosturasDaReceita(receita, executarReceita);
      if (lido.bandeira('json')) console.log(JSON.stringify(linhas, null, 1));
      else if (!linhas.length) console.log(`${lido.posicional}: nenhum passo unir com origemId.`);
      else for (const l of linhas) console.log(l.motivo ? `passo ${l.passo} (${l.origem}): não mediu: ${l.motivo}` : `passo ${l.passo} (${l.origem}): ${l.registradas} registradas, ${l.geometricas} geométricas, ${l.perdidas.length} perdidas, ${l.sobras.length} de sobra`);
      if (linhas.some((l) => l.motivo || l.perdidas.length || l.sobras.length)) codigo = 1;
    }
  } catch (erro) { console.error(`costura-registrada: ${erro.message}`); codigo = 2; }
  process.exitCode = codigo;
}
