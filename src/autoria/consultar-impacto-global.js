/* consultar-impacto-global.js — consulta direcionada sobre o mapa v1. */

export const FORMATO = 'mecanifica.impacto-global';
export const VERSAO = 1;

export class ErroImpactoGlobal extends Error {
  constructor(codigo, caminho, mensagem) {
    super(`${caminho}: ${mensagem}`);
    this.name = 'ErroImpactoGlobal';
    this.codigo = codigo;
    this.caminho = caminho;
  }
}

const comparar = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const chave = (alvo) => `${alvo.tipo}:${alvo.id}`;
const chavePasso = (passo) => `${passo.montagem}:${passo.instancia}`;

function falhar(codigo, caminho, mensagem) {
  throw new ErroImpactoGlobal(codigo, caminho, mensagem);
}

function copiar(valor) {
  return JSON.parse(JSON.stringify(valor));
}

function ordenarAlvos(a, b) {
  return comparar(a.tipo, b.tipo) || comparar(a.id, b.id);
}

function validarEntrada(mapa, alvo) {
  if (!mapa || mapa.formato !== 'mecanifica.mapa-dependencias' || mapa.versao !== 1) {
    falhar('mapa-invalido', 'mapa', 'o formato precisa ser mecanifica.mapa-dependencias v1.');
  }
  if (mapa.cobertura?.completa !== true) falhar('cobertura-incompleta', 'mapa.cobertura', 'o mapa não declara cobertura completa.');
  if (!alvo || (alvo.tipo !== 'peca' && alvo.tipo !== 'montagem') || typeof alvo.id !== 'string' || !alvo.id) {
    falhar('alvo-invalido', 'alvo', 'informe tipo peca ou montagem e um ID semântico.');
  }
  const entidade = mapa.entidades?.find((item) => item.tipo === alvo.tipo && item.id === alvo.id);
  if (!entidade) falhar('alvo-ausente', 'alvo.id', `a entidade '${alvo.tipo}:${alvo.id}' não pertence ao mapa.`);
  if (!Array.isArray(mapa.composicao) || !Array.isArray(mapa.ocorrencias) || !Array.isArray(mapa.relacoes)) {
    falhar('mapa-invalido', 'mapa', 'composição, ocorrências e relações precisam ser listas.');
  }
  return entidade;
}

function mapaDeEntidades(mapa) {
  return new Map(mapa.entidades.map((entidade) => [chave(entidade), entidade]));
}

function mapaReverso(mapa) {
  const reverso = new Map(mapa.entidades.map((entidade) => [chave(entidade), []]));
  for (const item of mapa.composicao) {
    const pai = { tipo: 'montagem', id: item.montagem };
    const lista = reverso.get(chave(item.alvo));
    if (!lista) falhar('mapa-invalido', 'composicao', `alvo '${chave(item.alvo)}' não está nas entidades.`);
    lista.push({ pai, instancia: item.instancia });
  }
  for (const lista of reverso.values()) lista.sort((a, b) => ordenarAlvos(a.pai, b.pai) || comparar(a.instancia, b.instancia));
  return reverso;
}

function distancias(mapa, alvo) {
  const reverso = mapaReverso(mapa);
  const resultado = new Map([[chave(alvo), 0]]);
  const fila = [alvo];
  while (fila.length) {
    const atual = fila.shift();
    const distancia = resultado.get(chave(atual));
    for (const { pai } of reverso.get(chave(atual)) ?? []) {
      const proxima = chave(pai);
      if (!resultado.has(proxima)) {
        resultado.set(proxima, distancia + 1);
        fila.push(pai);
      }
    }
  }
  return resultado;
}

function caminhosDa(mapa, alvo) {
  const caminhos = mapa.ocorrencias
    .filter((item) => item.alvo.tipo === alvo.tipo && item.alvo.id === alvo.id)
    .map(({ raiz, caminho }) => ({ raiz, caminho: copiar(caminho) }));
  if (alvo.tipo === 'montagem' && mapa.raizes?.some((raiz) => raiz.id === alvo.id)
    && !caminhos.some((item) => item.raiz === alvo.id)) {
    caminhos.push({ raiz: alvo.id, caminho: [] });
  }
  return caminhos.sort((a, b) => comparar(a.raiz, b.raiz) || comparar(JSON.stringify(a.caminho), JSON.stringify(b.caminho)));
}

function subarvoreDeMontagem(mapa, alvo) {
  const resultado = new Set([chave(alvo)]);
  const fila = [alvo];
  while (fila.length) {
    const atual = fila.shift();
    for (const item of mapa.composicao) {
      if (item.montagem === atual.id && item.alvo.tipo === 'montagem' && !resultado.has(chave(item.alvo))) {
        resultado.add(chave(item.alvo));
        fila.push(item.alvo);
      }
    }
  }
  return resultado;
}

function endpointAtinge(endpoint, ocorrencia, alvo, passos) {
  if (endpoint.alvo?.tipo === alvo.tipo && endpoint.alvo.id === alvo.id) return true;
  const caminho = [...(ocorrencia?.caminho ?? []), ...(endpoint.caminho ?? [])];
  return caminho.some((passo) => passos.get(chavePasso(passo))?.tipo === alvo.tipo
    && passos.get(chavePasso(passo))?.id === alvo.id);
}

function relacaoAtingida(relacao, alvo, mapa, passos, subarvore) {
  if (alvo.tipo === 'montagem' && subarvore.has(`montagem:${relacao.montagem}`)) return true;
  return relacao.ocorrencias.some((ocorrencia) => endpointAtinge(relacao.referencia, ocorrencia, alvo, passos)
    || endpointAtinge(relacao.movel, ocorrencia, alvo, passos));
}

export function consultarImpactoGlobal(mapa, alvo) {
  const entidade = validarEntrada(mapa, alvo);
  const entidades = mapaDeEntidades(mapa);
  const distancia = distancias(mapa, alvo);
  const dependentesDiretos = [];
  const dependentesTransitivos = [];
  for (const [id, nivel] of distancia.entries()) {
    if (nivel === 0) continue;
    const item = entidades.get(id);
    if (nivel === 1) dependentesDiretos.push({ tipo: item.tipo, id: item.id });
    else dependentesTransitivos.push({ tipo: item.tipo, id: item.id, distancia: nivel });
  }
  dependentesDiretos.sort(ordenarAlvos);
  dependentesTransitivos.sort((a, b) => a.distancia - b.distancia || ordenarAlvos(a, b));
  const afetadas = new Set(distancia.keys());
  const roteiro = [...distancia.entries()]
    .map(([id, nivel]) => ({ entidade: entidades.get(id), nivel }))
    .filter(({ entidade }) => entidade.tipo === 'montagem')
    .sort((a, b) => a.nivel - b.nivel || ordenarAlvos(a.entidade, b.entidade))
    .map(({ entidade, nivel }, indice) => ({
      ordem: indice + 1,
      tipo: 'montagem',
      id: entidade.id,
      motivo: nivel === 0 ? 'alvo' : nivel === 1 ? 'dependente-direto' : 'dependente-transitivo',
      proveniencia: copiar(entidade.proveniencia),
      caminhos: caminhosDa(mapa, entidade),
    }));

  const passos = new Map(mapa.composicao.map((item) => [
    chavePasso({ montagem: item.montagem, instancia: item.instancia }), item.alvo,
  ]));
  const subarvore = alvo.tipo === 'montagem' ? subarvoreDeMontagem(mapa, alvo) : new Set();
  const relacoes = mapa.relacoes
    .filter((relacao) => relacaoAtingida(relacao, alvo, mapa, passos, subarvore))
    .map(copiar)
    .sort((a, b) => comparar(a.montagem, b.montagem) || comparar(a.id, b.id));
  const caminhos = caminhosDa(mapa, alvo);
  const raizesAfetadas = new Set(caminhos.map((item) => item.raiz));
  for (const item of roteiro) for (const caminho of item.caminhos) raizesAfetadas.add(caminho.raiz);
  const raizes = (mapa.raizes ?? []).map((item) => item.id).sort(comparar);

  return copiar({
    formato: FORMATO,
    versao: VERSAO,
    alvo: { tipo: entidade.tipo, id: entidade.id },
    dependentesDiretos,
    dependentesTransitivos,
    raizesAfetadas: [...raizesAfetadas].sort(comparar),
    raizesNaoAfetadas: raizes.filter((id) => !raizesAfetadas.has(id)),
    caminhos,
    relacoes,
    roteiroRevalidacao: roteiro,
    cobertura: {
      completa: mapa.cobertura.completa,
      universo: mapa.universo?.id ?? null,
      entidadesConsideradas: mapa.entidades.length,
      entidadesAfetadas: afetadas.size,
    },
    limitacoes: [
      'nao-executa-revalidacao',
      'usos-fora-do-universo-nao-verificados',
      'relacoes-nao-inferidas-por-geometria',
    ],
  });
}
