/* cache-da-execucao.js — a malha que a receita produz, guardada no navegador para a próxima abertura da mesma peça.
 *
 * A bancada executava a receita do zero em cada carga; a peça com muitos furos leva dezenas de segundos só nisso. O que a bancada
 * consome depois de executar é o estado neutro (`executarReceita(...).neutro`), e ele é dado puro (Map, Array, objeto, número),
 * que o IndexedDB guarda por clonagem estruturada. A malha do Three.js sai do neutro por `adaptarThree`, que roda a cada carga e
 * custa pouco perto da execução.
 *
 * A CHAVE vem do servidor (`tools/bancadas/impressao-das-fontes.mjs`): o hash da receita e de tudo o que ela importa, o hash do
 * motor (o que `executarReceita` importa, mais a versão do manifold-3d) e o que mais mudar a execução (`extras`). Mudou um byte
 * de receita, módulo importado, família ou núcleo, a chave muda e a receita executa de novo. Sem a impressão (página estática
 * sem o arquivo, servidor fora) ou sem IndexedDB (janela privada, cota, navegador sem suporte), não há cache e a receita executa
 * como sempre: o cache nunca é pré-requisito. Cada receita tem uma vaga só, então a versão antiga é sobrescrita e o espaço não
 * cresce. */

/* sobe quando a FORMA do que se guarda mudar */
export const VERSAO_DO_FORMATO = 1;
const BANCO = 'modelar-bancada-cache';
const LOJA = 'execucoes';

/** A chave de uma execução. Determinística: mesma impressão e mesmos extras, mesma chave. */
export function chaveDaExecucao({ motor, receita, extras = {} }) {
  const fixos = Object.keys(extras).sort().map((nome) => `${nome}=${JSON.stringify(extras[nome])}`).join('&');
  return `v${VERSAO_DO_FORMATO}|motor:${motor}|receita:${receita}|${fixos}`;
}

/* O Chrome recusa valor de IndexedDB acima de uns 128 MiB, e o neutro do furgão realista passa disso (146 MB). O registro vai em
   pedaços: cada campo do neutro é um pedaço, e as tabelas grandes (`Map`) se partem em fatias de `ENTRADAS_POR_PEDACO`. */
export const ENTRADAS_POR_PEDACO = 20_000;

/** `{ chave, neutro }` -> `{ meta, pedacos }`. Reversível por `juntarRegistro`. */
export function fatiarRegistro({ chave, neutro }) {
  const pedacos = [];
  for (const [nome, valor] of Object.entries(neutro)) {
    if (valor instanceof Map && valor.size > ENTRADAS_POR_PEDACO) {
      const entradas = [...valor];
      for (let inicio = 0; inicio < entradas.length; inicio += ENTRADAS_POR_PEDACO) {
        pedacos.push({ tipo: 'tabela', nome, entradas: entradas.slice(inicio, inicio + ENTRADAS_POR_PEDACO) });
      }
    } else {
      pedacos.push({ tipo: 'campo', nome, valor });
    }
  }
  return { meta: { chave, pedacos: pedacos.length }, pedacos };
}

export function juntarRegistro({ meta, pedacos }) {
  const neutro = {};
  for (const pedaco of pedacos) {
    if (pedaco.tipo === 'campo') neutro[pedaco.nome] = pedaco.valor;
    else {
      neutro[pedaco.nome] ??= new Map();
      for (const [k, v] of pedaco.entradas) neutro[pedaco.nome].set(k, v);
    }
  }
  return { chave: meta.chave, neutro };
}

/** O IndexedDB como armazém de uma vaga por receita (meta em `vaga`, pedaços em `vaga#i`). Toda falha vira `null`/`false`, nunca exceção. */
export function criarArmazemIndexedDB({ indexedDB: fabrica = globalThis.indexedDB } = {}) {
  let abertura = null;
  /* o cache é opcional, mas falha muda precisa deixar rastro: um aviso no console por falha */
  const avisarFalha = (erro) => console.warn('cache da execução: o IndexedDB recusou a operação:', erro?.name ?? '', erro?.message ?? erro);

  function abrir() {
    if (!fabrica) return Promise.resolve(null);
    abertura ??= new Promise((resolver) => {
      try {
        const pedido = fabrica.open(BANCO, 1);
        pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA);
        pedido.onsuccess = () => resolver(pedido.result);
        pedido.onerror = () => resolver(null);
        pedido.onblocked = () => resolver(null);
      } catch {
        resolver(null);
      }
    });
    return abertura;
  }

  const chaveDoPedaco = (vaga, i) => `${vaga}#${i}`;

  return {
    async ler(vaga) {
      const banco = await abrir();
      if (!banco) return null;
      try {
        const tx = banco.transaction(LOJA, 'readonly');
        const loja = tx.objectStore(LOJA);
        const pedir = (chave) => new Promise((resolver, rejeitar) => {
          const pedido = loja.get(chave);
          pedido.onsuccess = () => resolver(pedido.result ?? null);
          pedido.onerror = () => rejeitar(pedido.error);
        });
        const meta = await pedir(vaga);
        if (!meta?.chave || !Number.isInteger(meta.pedacos)) return null;
        const pedacos = [];
        for (let i = 0; i < meta.pedacos; i += 1) {
          const pedaco = await pedir(chaveDoPedaco(vaga, i));
          if (!pedaco) return null;
          pedacos.push(pedaco);
        }
        return juntarRegistro({ meta, pedacos });
      } catch (erro) {
        avisarFalha(erro);
        return null;
      }
    },
    async gravar(vaga, registro) {
      const banco = await abrir();
      if (!banco) return null;
      return new Promise((resolver) => {
        try {
          const { meta, pedacos } = fatiarRegistro(registro);
          const tx = banco.transaction(LOJA, 'readwrite');
          const loja = tx.objectStore(LOJA);
          loja.delete(IDBKeyRange.bound(`${vaga}#`, `${vaga}#￿`));
          pedacos.forEach((pedaco, i) => loja.put(pedaco, chaveDoPedaco(vaga, i)));
          loja.put(meta, vaga);
          tx.oncomplete = () => resolver(true);
          const falhou = () => { avisarFalha(tx.error); resolver(false); };
          tx.onerror = falhou;
          tx.onabort = falhou;
        } catch (erro) {
          avisarFalha(erro);
          resolver(false);
        }
      });
    },
  };
}

/** Um armazém em memória com a mesma interface, para o teste e para quem não tem IndexedDB. */
export function criarArmazemEmMemoria() {
  const vagas = new Map();
  return {
    vagas,
    ler: async (vaga) => (vagas.has(vaga) ? structuredClone(vagas.get(vaga)) : null),
    gravar: async (vaga, registro) => { vagas.set(vaga, structuredClone(registro)); return true; },
  };
}

/**
 * Lê a impressão da receita no servidor: `{ motor, receita }`, ou `null` se o servidor não a dá.
 * Servidor de desenvolvimento responde por `?caminho=`; o pacote publicado traz o arquivo com todas as receitas.
 */
export async function lerImpressaoDoServidor(caminho, { buscar = globalThis.fetch, base = '/' } = {}) {
  if (typeof buscar !== 'function') return null;
  try {
    const resposta = await buscar(`${base}impressao-das-fontes.json?caminho=${encodeURIComponent(caminho)}`, { cache: 'no-store' });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    const receita = dados.receita ?? dados.receitas?.[caminho];
    return dados.motor && receita ? { motor: dados.motor, receita } : null;
  } catch {
    return null;
  }
}

/**
 * Devolve o neutro da receita, do cache se a chave bate e executando se não.
 *
 * `vaga` identifica a receita (o caminho dela); `impressao` é `{ motor, receita }` ou null; `executar` roda a receita e devolve o
 * neutro. Resultado: `{ neutro, origem: 'cache' | 'executada', ms, chave, gravacao }`, em que `gravacao` é a promessa da gravação
 * (quem não precisa dela, a ignora; o teste a espera).
 */
export async function neutroComCache({
  vaga, impressao, extras = {}, executar, armazem, agora = () => performance.now(),
}) {
  const inicio = agora();
  const chave = impressao ? chaveDaExecucao({ ...impressao, extras }) : null;
  if (chave && armazem) {
    try {
      const guardado = await armazem.ler(vaga);
      if (guardado && guardado.chave === chave && guardado.neutro) {
        return { neutro: guardado.neutro, origem: 'cache', ms: agora() - inicio, chave, gravacao: Promise.resolve(false) };
      }
    } catch { /* leitura falhou: executa */ }
  }
  const neutro = executar();
  const ms = agora() - inicio;
  let gravacao = Promise.resolve(false);
  if (chave && armazem) {
    gravacao = Promise.resolve()
      .then(() => armazem.gravar(vaga, { chave, neutro }))
      .catch(() => false);
  }
  return { neutro, origem: 'executada', ms, chave, gravacao };
}

/** "do cache, 42 ms" / "executada, 3,1 s": o texto que a bancada mostra. */
export function textoDaExecucao({ origem, ms }) {
  const tempo = ms >= 1000 ? `${(ms / 1000).toFixed(1).replace('.', ',')} s` : `${Math.round(ms)} ms`;
  return `${origem === 'cache' ? 'do cache' : 'executada'}, ${tempo}`;
}
