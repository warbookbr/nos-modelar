/* leitura-escrita.js — o grafo de leitura e escrita de uma receita, extraído em modo só-leitura (fatia 1 do plano do planejador de
 * execução). Nada aqui executa a receita nem muda o núcleo: recebe a lista de passos, os aliases e o manifesto do registro de
 * operações e devolve contagens. A pergunta é quantos passos o planejador poderia reordenar ou agrupar se confiasse só no manifesto.
 *
 * O que o manifesto diz hoje é grosso: `artefatos.entra` não vazio quer dizer que a operação lê a malha, sem dizer quais seleções, e
 * `artefatos.sai` o que ela publica. Um campo de leitura por seleção não existe nele; por isso nenhum passo que lê tem leitura
 * declarada e todos viram barreira, pela regra do plano. A leitura que se enxerga é a dos argumentos: seleções por `origem`, `alias`
 * ou id. Ela é contada à parte (`extraivel`), porque é o que uma declaração futura no manifesto precisaria acertar.
 *
 * Determinístico e puro: nenhuma leitura de relógio, de disco ou de outro módulo. */

/** Os campos de argumento que citam o que o passo lê (o `origemId` é a escrita, não está aqui). */
export const CAMPOS_DE_REFERENCIA = Object.freeze(['sel', 'de', 'solidos', 'chapa', 'solido', 'derivaDe', 'a', 'b', 'referencia', 'para', 'selPara', 'face', 'faces', 'v', 'vs']);

const ehObjeto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

/** A chave estável de uma origem `{ op, id, de?, ... }`. Todo campo além de `op`, `id` e `de` (`copia`, `nome`, `face`, `tampa`, `parte`, `faixa`,
 *  `parede`...) entra na chave, em ordem alfabética: duas origens que diferem em qualquer um deles citam coisas diferentes. */
function chaveDaOrigem(origem) {
  if (!ehObjeto(origem) || typeof origem.op !== 'string' || origem.id === undefined) return null;
  const de = ehObjeto(origem.de) ? `<${chaveDaOrigem(origem.de) ?? '?'}` : '';
  const extra = Object.keys(origem).filter((k) => k !== 'op' && k !== 'id' && k !== 'de' && origem[k] !== undefined).sort()
    .map((k) => `/${k}=${JSON.stringify(origem[k])}`).join('');
  return `${origem.op}#${origem.id}${de}${extra}`;
}

/** Os aliases como mapa nome -> definição, ignorando entrada malformada (o núcleo é quem a recusa). */
function mapaDeAliases(aliases) {
  const mapa = new Map();
  if (Array.isArray(aliases)) for (const e of aliases) if (Array.isArray(e) && typeof e[0] === 'string') mapa.set(e[0], e[1]);
  return mapa;
}

/**
 * As chaves de leitura de um valor de referência: `{ chaves, dinamica }`. Uma seleção `{ origem }`, um `{ alias }` (resolvido pelos
 * aliases, que valem uma origem ou a união de origens), um id numérico e as listas `{ v }` e `{ f }` de ids literais são estáticos; qualquer outra forma (`onde`, `faces` com
 * critério, expressão) lê a malha pelo que ela contém e é dinâmica.
 */
export function referenciasDoValor(valor, aliases = new Map()) {
  const chaves = [];
  let dinamica = false;
  const visitar = (v) => {
    if (typeof v === 'number') { chaves.push(`id#${v}`); return; }
    if (Array.isArray(v)) { v.forEach(visitar); return; }
    if (!ehObjeto(v)) { dinamica = true; return; }
    const chaveros = Object.keys(v);
    if (chaveros.length === 1 && chaveros[0] === 'origem') {
      const c = chaveDaOrigem(v.origem);
      if (c === null) dinamica = true; else chaves.push(c);
    } else if (chaveros.length === 1 && chaveros[0] === 'alias') {
      const def = aliases.get(v.alias);
      if (def === undefined) { dinamica = true; return; }
      chaves.push(`alias:${v.alias}`);
      if (ehObjeto(def) && Array.isArray(def.unir)) def.unir.forEach((o) => visitar(o));
      else visitar(def);
    } else if (chaveros.length >= 1 && chaveros.every((k) => k === 'v' || k === 'f')
      && chaveros.every((k) => (Number.isSafeInteger(v[k]) || (Array.isArray(v[k]) && v[k].every(Number.isSafeInteger))))) {
      /* `{ v: [ids] }` e `{ f: [ids] }`: vértices e faces por id literal, leitura estática */
      for (const k of chaveros) for (const n of [].concat(v[k])) chaves.push(`${k}#${n}`);
    } else if (chaveros.includes('op') && chaveros.includes('id')) {
      const c = chaveDaOrigem(v);
      if (c === null) dinamica = true; else chaves.push(c);
    } else dinamica = true;
  };
  visitar(valor);
  return { chaves, dinamica };
}

/** As referências de leitura de um passo: `{ chaves, dinamica, campos }`, na ordem dos argumentos. */
export function leituraDosArgumentos(args, aliases = new Map()) {
  const chaves = [];
  const campos = [];
  let dinamica = false;
  if (!ehObjeto(args)) return { chaves, dinamica, campos };
  for (const campo of CAMPOS_DE_REFERENCIA) {
    if (!Object.hasOwn(args, campo) || args[campo] === undefined || args[campo] === null) continue;
    campos.push(campo);
    const r = referenciasDoValor(args[campo], aliases);
    chaves.push(...r.chaves);
    if (r.dinamica) dinamica = true;
  }
  return { chaves, dinamica, campos };
}

/** O manifesto do registro como mapa nome -> operação. */
export function operacoesDoManifesto(manifesto) {
  const mapa = new Map();
  for (const modulo of manifesto ?? []) for (const op of modulo.operacoes ?? []) mapa.set(op.nome, op);
  return mapa;
}

/**
 * Classifica cada passo pelo manifesto.
 * - `categoria`: 'criadora' (`artefatos.entra` vazio: lê só parâmetros e escreve geometria nova), 'le-malha' (`entra` não vazio) ou
 *   'desconhecida' (a operação não está no manifesto).
 * - `leituraDeclarada`: o manifesto traz um campo `leitura` para a operação. Hoje nenhuma traz.
 * - `barreira`: lê a malha sem leitura declarada, ou operação desconhecida; o planejador não reordena em torno dele.
 * - `extraivel`: toda referência de leitura dos argumentos é estática (origem, alias ou id).
 */
export function analisarPassos(passos, { manifesto, aliases = [] } = {}) {
  const porNome = operacoesDoManifesto(manifesto);
  const mapaDeAlias = mapaDeAliases(aliases);
  return passos.map((passo, i) => {
    const [op, args = {}] = Array.isArray(passo) ? passo : [];
    const declarada = porNome.get(op);
    const categoria = !declarada ? 'desconhecida' : (declarada.artefatos?.entra ?? []).length ? 'le-malha' : 'criadora';
    const leituraDeclarada = Boolean(declarada) && Object.hasOwn(declarada, 'leitura') && declarada.leitura != null;
    const referencias = leituraDosArgumentos(args, mapaDeAlias);
    const barreira = categoria === 'desconhecida' || (categoria === 'le-malha' && !leituraDeclarada);
    return { i, op, categoria, leituraDeclarada, barreira, referencias: referencias.chaves, dinamica: referencias.dinamica, extraivel: !referencias.dinamica };
  });
}

/** A soma por operação do grafo: quantos passos, quantos leem, quantos têm leitura declarada, quantos viram barreira, quantos têm leitura extraível dos argumentos. */
export function resumoPorOperacao(analise) {
  const porOp = new Map();
  for (const p of analise) {
    const r = porOp.get(p.op) ?? { op: p.op, passos: 0, leMalha: 0, leituraDeclarada: 0, barreiras: 0, extraiveis: 0, dinamicos: 0 };
    r.passos += 1;
    if (p.categoria === 'le-malha') r.leMalha += 1;
    if (p.leituraDeclarada) r.leituraDeclarada += 1;
    if (p.barreira) r.barreiras += 1;
    if (p.categoria === 'le-malha') { if (p.extraivel) r.extraiveis += 1; else r.dinamicos += 1; }
    porOp.set(p.op, r);
  }
  return [...porOp.values()].sort((a, b) => b.passos - a.passos || (a.op < b.op ? -1 : 1));
}

export function totaisDoGrafo(analise) {
  const lem = analise.filter((p) => p.categoria === 'le-malha');
  return {
    passos: analise.length,
    criadoras: analise.filter((p) => p.categoria === 'criadora').length,
    leMalha: lem.length,
    leituraDeclarada: analise.filter((p) => p.leituraDeclarada).length,
    barreiras: analise.filter((p) => p.barreira).length,
    leituraExtraivel: lem.filter((p) => p.extraivel).length,
    leituraDinamica: lem.filter((p) => !p.extraivel).length,
  };
}

/**
 * As sequências de `subtrair` sobre o mesmo alvo. Um `subtrair` continua a sequência do anterior quando o primeiro sólido dele é o
 * resultado do anterior (`subtrair#origemId`) ou o mesmo primeiro sólido. `estrita` exige passos vizinhos na receita; `relaxada`
 * aceita no meio passos criadores (`artefatos.entra` vazio), que não leem o alvo e podem ser levados para antes do corte sem mudar nada.
 * `ferramentasDependem` marca a sequência em que alguma ferramenta cita o resultado de um corte anterior da mesma sequência, caso em
 * que unir as ferramentas não vale. Devolve só as sequências de 2 ou mais cortes, com `inicio`, `passos` (os índices), `tamanho`,
 * `intermediarios` (quantos passos criadores entre eles) e `ferramentas` (quantas ferramentas ao todo).
 */
export function sequenciasDeSubtrair(passos, { manifesto, aliases = [], modo = 'estrita' } = {}) {
  const porNome = operacoesDoManifesto(manifesto);
  const mapaDeAlias = mapaDeAliases(aliases);
  const criadora = (op) => { const m = porNome.get(op); return Boolean(m) && (m.artefatos?.entra ?? []).length === 0; };
  const primeiro = (args) => {
    const s = Array.isArray(args?.solidos) ? args.solidos[0] : undefined;
    return s === undefined ? null : referenciasDoValor(s, mapaDeAlias).chaves[0] ?? null;
  };
  const ferramentas = (args) => (Array.isArray(args?.solidos) ? args.solidos.slice(1).flatMap((s) => referenciasDoValor(s, mapaDeAlias).chaves) : []);
  const sequencias = [];
  let atual = null;
  const fechar = () => { if (atual && atual.passos.length >= 2) sequencias.push(finalizar(atual)); atual = null; };
  const finalizar = (s) => {
    const resultados = new Set();
    let dependem = false;
    let totalFerramentas = 0;
    for (const idx of s.passos) {
      const args = passos[idx][1];
      const fs = ferramentas(args);
      totalFerramentas += fs.length;
      if (fs.some((c) => resultados.has(c))) dependem = true;
      resultados.add(`subtrair#${args.origemId}`);
    }
    return { inicio: s.passos[0], fim: s.passos[s.passos.length - 1], passos: s.passos, tamanho: s.passos.length, intermediarios: s.intermediarios, ferramentas: totalFerramentas, ferramentasDependem: dependem };
  };
  for (let i = 0; i < passos.length; i += 1) {
    const [op, args] = Array.isArray(passos[i]) ? passos[i] : [];
    if (op === 'subtrair') {
      const alvo = primeiro(args);
      const continua = atual && alvo !== null
        && (alvo === `subtrair#${passos[atual.passos[atual.passos.length - 1]][1].origemId}` || alvo === atual.alvo);
      if (continua) { atual.passos.push(i); atual.intermediarios += atual.pendentes; atual.pendentes = 0; continue; }
      fechar();
      atual = { alvo, passos: [i], intermediarios: 0, pendentes: 0 };
    } else if (atual && modo === 'relaxada' && criadora(op)) {
      atual.pendentes += 1;
    } else fechar();
  }
  fechar();
  return sequencias;
}

/**
 * O perfil de tempo de uma execução: `tempos` é o mapa passo -> { op, ms } (o do cronometrador do `descrever`). Devolve o total, a
 * soma por operação (com a parte do total) e os `maisCaros` passos. A soma por operação e a dos passos são a mesma conta, só agrupada.
 */
export function resumirPerfil(tempos, { maisCaros = 20 } = {}) {
  const lista = [...tempos].map(([i, t]) => ({ i, op: t.op, ms: t.ms })).sort((a, b) => a.i - b.i);
  const totalMs = lista.reduce((s, p) => s + p.ms, 0);
  const porOp = new Map();
  for (const p of lista) {
    const r = porOp.get(p.op) ?? { op: p.op, passos: 0, ms: 0, maiorMs: 0 };
    r.passos += 1; r.ms += p.ms; r.maiorMs = Math.max(r.maiorMs, p.ms);
    porOp.set(p.op, r);
  }
  const porOperacao = [...porOp.values()].map((r) => ({ ...r, parte: totalMs > 0 ? r.ms / totalMs : 0 })).sort((a, b) => b.ms - a.ms || (a.op < b.op ? -1 : 1));
  const topo = [...lista].sort((a, b) => b.ms - a.ms || a.i - b.i).slice(0, maisCaros);
  return { totalMs, passos: lista.length, porOperacao, maisCaros: topo };
}

/** O tempo que um conjunto de passos soma num perfil (`tempos`), por índice. */
export function tempoDosPassos(tempos, indices) {
  return indices.reduce((s, i) => s + (tempos.get(i)?.ms ?? 0), 0);
}
