/* leitura-do-passo.js — o que um passo lê de fato da malha, registrado durante a execução (fatia 2 do plano do cache por passo).
 *
 * O cache por passo precisa saber de que passos anteriores um passo depende, e isso é o que ele lê do estado: as entradas de `st.V` e
 * `st.F` que já existiam antes dele e os registros de `st.origens` que ele consulta. O registro abaixo instala, só durante a função da
 * operação, uma leitura rastreada nesses três mapas (`get`, `has`, a iteração e o `size`), e devolve no fim um resumo do passo. Ele é
 * ligado por `OPCOES.leitura: 'conferido'` ou `OPCOES.aoLer` do núcleo e fica desligado por padrão: o núcleo sem ele roda como sempre.
 *
 * A leitura feita para RESOLVER a seleção do passo (`resolverSelecao`, `resolverOrigem`) vai para um balde à parte. Uma seleção por
 * origem, alias ou id lê só as faces que cita; uma por `onde`, `regiao`, `grupo`, `v` ou `tudo` varre a malha, e essa varredura é da
 * citação, não da operação (é o `dinamica` de `leitura-escrita.js`). O que a resolução devolve são os CITADOS do passo: as faces
 * resolvidas e os vértices delas. A declaração de cada operação (`leitura-declarada.js`) diz o que ela lê além da resolução, em termos
 * desses citados, e a conferência compara as duas coisas.
 *
 * O registro não muda o que o passo faz: cada leitura rastreada chama o método do próprio `Map.prototype` e devolve o mesmo valor, e a
 * restauração apaga as propriedades instaladas na instância, num `finally` de quem chama. Determinístico: nenhum relógio nem disco. */

const { get: obter, has: contem, keys: chaves, values: valores, entries: entradas, forEach: paraCada } = Map.prototype;
const iterar = Map.prototype[Symbol.iterator];
const tamanhoDoMapa = Object.getOwnPropertyDescriptor(Map.prototype, 'size').get;
const METODOS = ['get', 'has', 'keys', 'values', 'entries', 'forEach', Symbol.iterator, 'size'];

function balde() { return { lidos: new Set(), varreu: false, tamanho: false }; }

/** Instala a leitura rastreada nos mapas `{ V, F, origens }`. Devolve o registro do passo. */
export function criarLeituraDoPasso(mapas) {
  const nomes = Object.keys(mapas);
  const daOperacao = Object.fromEntries(nomes.map((n) => [n, balde()]));
  const daResolucao = Object.fromEntries(nomes.map((n) => [n, balde()]));
  const citadosF = new Set();
  const citadosV = new Set();
  let profundidade = 0;
  let ativo = true;
  const atual = (nome) => (profundidade > 0 ? daResolucao : daOperacao)[nome];
  const citar = (faces, vertices) => {
    for (const fid of faces ?? []) {
      citadosF.add(fid);
      const f = mapas.F ? obter.call(mapas.F, fid) : null;
      if (f && Array.isArray(f.vs)) for (const v of f.vs) citadosV.add(v);
    }
    for (const v of vertices ?? []) citadosV.add(v);
  };
  /* A operação que consulta um registro de origem por conta própria (o `friso` lê a costura assim) cita as faces dele, com os vértices,
     no momento da consulta, como as que a resolução devolve. O registro guarda face por id em listas, direto ou um nível abaixo, como
     `resolverOrigemSemVida` do núcleo as percorre. */
  const citarRegistro = (registros) => {
    const faces = [];
    const poe = (x) => { if (Number.isSafeInteger(x)) faces.push(x); };
    for (const reg of Array.isArray(registros) ? registros : []) {
      for (const v of Object.values(reg ?? {})) {
        if (Array.isArray(v)) v.forEach(poe);
        else if (v && typeof v === 'object' && !(v instanceof Map)) for (const w of Object.values(v)) { if (Array.isArray(w)) w.forEach(poe); else poe(w); }
      }
    }
    citar(faces, null);
  };
  for (const nome of nomes) {
    const mapa = mapas[nome];
    const varrer = () => { if (ativo) atual(nome).varreu = true; };
    Object.defineProperties(mapa, {
      get: { configurable: true, writable: true, value(id) {
        const valor = obter.call(this, id);
        if (ativo) { atual(nome).lidos.add(id); if (nome === 'origens' && profundidade === 0) citarRegistro(valor); }
        return valor;
      } },
      has: { configurable: true, writable: true, value(id) { if (ativo) atual(nome).lidos.add(id); return contem.call(this, id); } },
      keys: { configurable: true, writable: true, value() { varrer(); return chaves.call(this); } },
      values: { configurable: true, writable: true, value() { varrer(); return valores.call(this); } },
      entries: { configurable: true, writable: true, value() { varrer(); return entradas.call(this); } },
      forEach: { configurable: true, writable: true, value(...a) { varrer(); return paraCada.apply(this, a); } },
      [Symbol.iterator]: { configurable: true, writable: true, value() { varrer(); return iterar.call(this); } },
      size: { configurable: true, get() { if (ativo) atual(nome).tamanho = true; return tamanhoDoMapa.call(this); } },
    });
  }
  return {
    /** A resolução da seleção começa: as leituras até `sairDaResolucao` são dela. Aninha (um alias resolve cada termo). */
    entrarNaResolucao() { profundidade += 1; },
    sairDaResolucao() { profundidade -= 1; },
    /** As faces e os vértices que a resolução devolveu; os vértices de cada face citada entram também. */
    citar,
    /** Para de registrar (o despacho ainda roda a pose de criação depois da operação, e essa leitura não é dela). */
    parar() { ativo = false; },
    restaurar() { for (const nome of nomes) for (const m of METODOS) delete mapas[nome][m]; },
    /**
     * O resumo do passo, contra as chaves que cada mapa tinha antes dele (`existentes`, nome -> Set): a leitura de uma entrada que o
     * próprio passo criou não é dependência de passo anterior e sai da conta.
     */
    resumo(existentes) {
      const resumir = (b, nome) => {
        const antes = existentes[nome];
        const lidos = [...b.lidos].filter((id) => !antes || antes.has(id));
        return { lidos, varreu: b.varreu, tamanho: b.tamanho };
      };
      return {
        operacao: Object.fromEntries(nomes.map((n) => [n, resumir(daOperacao[n], n)])),
        resolucao: Object.fromEntries(nomes.map((n) => [n, resumir(daResolucao[n], n)])),
        citados: { F: [...citadosF], V: [...citadosV] },
      };
    },
  };
}

/**
 * O nível da leitura que a operação fez num mapa de malha, fora da resolução: 'nada' (nenhuma entrada que existia antes), 'citados'
 * (só entradas citadas pela seleção do passo) ou 'malha' (alguma outra, ou a varredura do mapa, ou o tamanho dele).
 */
export function nivelDaLeitura(leitura, citados) {
  if (leitura.varreu || leitura.tamanho) return 'malha';
  if (!leitura.lidos.length) return 'nada';
  const c = new Set(citados);
  return leitura.lidos.every((id) => c.has(id)) ? 'citados' : 'malha';
}

/** Os níveis do passo pelo resumo: `{ V, F, selecaoVarreu }`. `selecaoVarreu` diz que a resolução da seleção varreu a malha. */
export function niveisDoPasso(resumo) {
  const { operacao, resolucao, citados } = resumo;
  return {
    V: nivelDaLeitura(operacao.V, citados.V),
    F: nivelDaLeitura(operacao.F, citados.F),
    selecaoVarreu: Boolean(resolucao.V?.varreu || resolucao.F?.varreu || resolucao.V?.tamanho || resolucao.F?.tamanho),
  };
}
