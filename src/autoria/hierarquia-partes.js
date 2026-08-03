/* hierarquia-partes.js — consultas puras e determinísticas da árvore semântica.
   Não conhece Three.js, geometria ou domínio mecânico. */

function exigirNome(nome, quem) {
  if (typeof nome !== 'string' || !nome) {
    throw new Error(`${quem}: nome de parte precisa ser texto não vazio.`);
  }
}

function indiceDaHierarquia(hierarquia, quem) {
  if (!Array.isArray(hierarquia)) {
    throw new Error(`${quem}: hierarquia precisa ser uma lista de {nome, pai}.`);
  }

  const porNome = new Map();
  for (const item of hierarquia) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`${quem}: item de hierarquia inválido.`);
    }
    exigirNome(item.nome, quem);
    if (item.pai !== null && item.pai !== undefined) exigirNome(item.pai, quem);
    if (porNome.has(item.nome)) {
      throw new Error(`${quem}: parte '${item.nome}' aparece mais de uma vez na hierarquia.`);
    }
    porNome.set(item.nome, item.pai ?? null);
  }

  const filhos = new Map([...porNome.keys()].map((nome) => [nome, []]));
  for (const [nome, pai] of porNome) {
    if (pai === null) continue;
    if (pai === nome) throw new Error(`${quem}: parte '${nome}' não pode ser pai de si mesma.`);
    if (!porNome.has(pai)) throw new Error(`${quem}: parte '${nome}' declara pai inexistente '${pai}'.`);
    filhos.get(pai).push(nome);
  }
  /* Todo o dado precisa ser árvore antes de qualquer consulta. Um ciclo num
     ramo que não foi pedido ainda é corrupção do mesmo contrato, não licença
     para devolver uma seleção aparentemente válida de outro ramo. */
  for (const origem of porNome.keys()) {
    const caminho = new Set();
    let cursor = origem;
    while (cursor !== null) {
      if (caminho.has(cursor)) throw new Error(`${quem}: ciclo de hierarquia em '${cursor}'.`);
      caminho.add(cursor);
      cursor = porNome.get(cursor);
    }
  }
  for (const lista of filhos.values()) lista.sort();
  return { porNome, filhos };
}

/**
 * Devolve a raiz seguida dos descendentes, em percurso determinístico. A consulta
 * valida a árvore recebida para que um adaptador não transforme metadado corrompido
 * em seleção parcial silenciosa.
 */
export function nomesDaSubarvore(hierarquia, raiz) {
  const quem = 'nomesDaSubarvore';
  exigirNome(raiz, quem);
  const { porNome, filhos } = indiceDaHierarquia(hierarquia, quem);
  if (!porNome.has(raiz)) throw new Error(`${quem}: não existe parte '${raiz}'.`);

  const resultado = [];
  const visitar = (nome) => {
    resultado.push(nome);
    for (const filho of filhos.get(nome)) visitar(filho);
  };
  visitar(raiz);
  return resultado;
}
