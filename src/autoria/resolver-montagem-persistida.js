/* resolver-montagem-persistida.js — resolve instâncias de peças sem acesso a arquivo. */

import { lerMontagemPersistida, VERSAO_RELACOES } from './ler-montagem-persistida.js';
import { lerPecaResolvida } from './ler-peca-resolvida.js';
import { validarSeparacaoDirecional } from './separacao-direcional.js';
import { identidadeTransformacaoRigida, comporTransformacoesRigidas, localDaTransformacaoRigida } from './transformacao-rigida.js';
import { resolverPortasDeMontagem, validarEncaixeCilindrico, validarAssentamentoAnular } from './interfaces-montagem.js';
import { ErroVinculoDeMedida, UNIDADES_DE_PARAMETRO, valorDoVinculo } from './vinculos-de-medida.js';
import { interfaceNoMundo, poseQueEncaixa } from './posicao-por-porta.js';

export class ErroResolucaoMontagemPersistida extends Error {
  constructor(codigo, caminho, mensagem, trilha) {
    super(`${caminho}: ${mensagem}`);
    this.name = 'ErroResolucaoMontagemPersistida';
    this.codigo = codigo;
    this.caminho = caminho;
    if (trilha !== undefined) this.trilha = trilha.slice();
  }
}

function falhar(codigo, caminho, mensagem, trilha) {
  throw new ErroResolucaoMontagemPersistida(codigo, caminho, mensagem, trilha);
}

function poseSemEscala(pose) {
  return {
    rotacao: pose.rotacao.map((linha) => linha.slice()),
    deslocamento: pose.deslocamento.slice(),
  };
}

function caminhoDaReferencia(instancia) {
  return `instancias[${instancia.indice}].alvo.ref`;
}

function mensagemDoErro(erro, padrao) {
  if (erro instanceof Error && erro.message) return erro.message;
  if (typeof erro === 'string' && erro) return erro;
  return padrao;
}

function caminhoDaRelacao(indice, lado, campo = '') {
  return `relacoes[${indice}].${lado}${campo ? `.${campo}` : ''}`;
}

function resolverInstanciaEndpoint(montagemResolvida, endpoint, indiceRelacao, lado, trilhaMontagem) {
  let instancias = montagemResolvida.instancias;
  const caminhoBase = caminhoDaRelacao(indiceRelacao, lado, 'caminho');
  const caminhoPercorrido = [];
  let no;

  for (const [indiceSegmento, segmento] of endpoint.caminho.entries()) {
    no = instancias.find((instancia) => instancia.id === segmento);
    caminhoPercorrido.push(segmento);
    if (!no) {
      falhar(
        'endpoint-caminho-inexistente',
        `${caminhoBase}[${indiceSegmento}]`,
        `segmento '${segmento}' não existe neste nível da montagem.`,
        [...trilhaMontagem, ...caminhoPercorrido],
      );
    }
    const ultimo = indiceSegmento === endpoint.caminho.length - 1;
    if (!ultimo && no.alvo.tipo !== 'montagem') {
      falhar(
        'endpoint-travessia-invalida',
        `${caminhoBase}[${indiceSegmento}]`,
        `segmento '${segmento}' aponta para peça e não pode ser atravessado.`,
        [...trilhaMontagem, ...caminhoPercorrido],
      );
    }
    if (!ultimo) {
      if (!Array.isArray(no.montagem?.instancias)) {
        falhar(
          'endpoint-travessia-invalida',
          `${caminhoBase}[${indiceSegmento}]`,
          `montagem '${segmento}' não possui árvore resolvida para travessia.`,
          [...trilhaMontagem, ...caminhoPercorrido],
        );
      }
      instancias = no.montagem.instancias;
    }
  }

  if (no.alvo.tipo !== 'peca') {
    falhar(
      'endpoint-nao-e-peca',
      `${caminhoBase}[${endpoint.caminho.length - 1}]`,
      `endpoint final '${endpoint.caminho.at(-1)}' aponta para montagem.`,
      [...trilhaMontagem, ...endpoint.caminho],
    );
  }
  return no;
}

function resolverEndpoint(montagemResolvida, endpoint, indiceRelacao, lado, trilhaMontagem) {
  const no = resolverInstanciaEndpoint(montagemResolvida, endpoint, indiceRelacao, lado, trilhaMontagem);
  const portas = no.definicao?.neutro?.portas;
  if (!(portas instanceof Map)) {
    falhar(
      'portas-indisponiveis',
      caminhoDaRelacao(indiceRelacao, lado, 'porta'),
      'a peça resolvida não traz portas publicadas como Map.',
      [...trilhaMontagem, ...endpoint.caminho],
    );
  }
  if (!portas.has(endpoint.porta)) {
    falhar(
      'porta-ausente',
      caminhoDaRelacao(indiceRelacao, lado, 'porta'),
      `porta '${endpoint.porta}' não foi publicada pela peça.`,
      [...trilhaMontagem, ...endpoint.caminho],
    );
  }
  return { caminho: endpoint.caminho.slice(), porta: endpoint.porta, instancia: no };
}

function resolverEndpointRegiao(montagemResolvida, endpoint, indiceRelacao, lado, trilhaMontagem) {
  const no = resolverInstanciaEndpoint(montagemResolvida, endpoint, indiceRelacao, lado, trilhaMontagem);
  const neutro = no.definicao?.neutro;
  let ids;
  if (endpoint.parte === undefined) {
    ids = [...neutro.V.keys()];
  } else {
    ids = [...new Set([...neutro.F.values()]
      .filter((face) => face.parte === endpoint.parte)
      .flatMap((face) => face.vs))];
    if (ids.length === 0) {
      falhar(
        'parte-ausente', caminhoDaRelacao(indiceRelacao, lado, 'parte'),
        `parte '${endpoint.parte}' não possui vértices na peça.`,
        [...trilhaMontagem, ...endpoint.caminho],
      );
    }
  }
  if (ids.length === 0) {
    falhar(
      'regiao-vazia', caminhoDaRelacao(indiceRelacao, lado), 'a região não possui vértices.',
      [...trilhaMontagem, ...endpoint.caminho],
    );
  }
  return {
    caminho: endpoint.caminho.slice(),
    ...(endpoint.parte !== undefined ? { parte: endpoint.parte } : {}),
    instancia: no,
    pontosLocais: ids.map((id) => neutro.V.get(id).slice()),
  };
}

function instanciaTecnica(id, endpoint) {
  const pose = endpoint.instancia.poseMundo;
  const referencial = identidadeTransformacaoRigida();
  return {
    id,
    neutro: endpoint.instancia.definicao.neutro,
    escala: 1,
    rotacao: pose.rotacao.map((linha) => linha.slice()),
    deslocamento: pose.deslocamento.slice(),
    referencial: { rotacao: referencial.rotacao, deslocamento: referencial.deslocamento },
  };
}

function declararEncaixeCilindrico(relacao) {
  return {
    id: relacao.id,
    tipo: 'encaixaCilindrico',
    referencia: `referencia.${relacao.referencia.porta}`,
    movel: `movel.${relacao.movel.porta}`,
    folgaRadial: relacao.especificacao.folgaRadial,
    toleranciaNumerica: relacao.especificacao.toleranciaNumerica,
  };
}

function declararAssentamentoAnular(relacao) {
  return {
    id: relacao.id,
    tipo: 'assentaAnular',
    referencia: `referencia.${relacao.referencia.porta}`,
    movel: `movel.${relacao.movel.porta}`,
    sobreposicaoRadial: relacao.especificacao.sobreposicaoRadial,
    sobreposicaoAxial: relacao.especificacao.sobreposicaoAxial,
    ...(relacao.especificacao.separacaoAxial ? { separacaoAxial: relacao.especificacao.separacaoAxial } : {}),
    toleranciaNumerica: relacao.especificacao.toleranciaNumerica,
  };
}

function portasTecnicasDosEndpoints(referencia, movel) {
  return resolverPortasDeMontagem([
    instanciaTecnica('referencia', referencia),
    instanciaTecnica('movel', movel),
  ]);
}

function executarSeparacaoDirecional(relacao, poseMontagem) {
  const validada = validarSeparacaoDirecional({
    pontosReferencia: relacao.referencia.pontosLocais,
    poseReferencia: relacao.referencia.instancia.poseMundo,
    pontosMovel: relacao.movel.pontosLocais,
    poseMovel: relacao.movel.instancia.poseMundo,
    eixoLocal: relacao.especificacao.eixo,
    poseMontagem,
    separacaoMinima: relacao.especificacao.separacaoMinima,
    toleranciaNumerica: relacao.especificacao.toleranciaNumerica,
  });
  const limparEndpoint = ({ caminho, parte, instancia }) => ({
    caminho,
    ...(parte !== undefined ? { parte } : {}),
    instancia,
  });
  return {
    id: relacao.id,
    tipo: relacao.tipo,
    referencia: limparEndpoint(relacao.referencia),
    movel: limparEndpoint(relacao.movel),
    especificacao: relacao.especificacao,
    ...validada,
  };
}

function executarRelacao(relacao, indice, trilhaMontagem, poseMontagem) {
  try {
    if (relacao.tipo === 'mantemSeparacaoDirecional') return executarSeparacaoDirecional(relacao, poseMontagem);
    const portas = portasTecnicasDosEndpoints(relacao.referencia, relacao.movel);
    const declarar = relacao.tipo === 'encaixaCilindrico'
      ? declararEncaixeCilindrico
      : declararAssentamentoAnular;
    const validar = relacao.tipo === 'encaixaCilindrico'
      ? validarEncaixeCilindrico
      : validarAssentamentoAnular;
    const validada = validar(declarar(relacao), portas);
    return {
      id: relacao.id,
      tipo: relacao.tipo,
      referencia: relacao.referencia,
      movel: relacao.movel,
      especificacao: relacao.especificacao,
      satisfeita: validada.satisfeita,
      medidas: validada.medidas,
      diagnosticos: validada.diagnosticos,
    };
  } catch (erro) {
    falhar(
      'validacao-relacao-invalida',
      `relacoes[${indice}]`,
      mensagemDoErro(erro, 'a validação da relação falhou.'),
      trilhaMontagem,
    );
  }
}

function resolverRelacoes(montagem, montagemResolvida, trilhaMontagem, poseMontagem) {
  if (montagem.versao < VERSAO_RELACOES) return montagemResolvida;
  const relacoes = montagem.relacoes.map((relacao, indice) => {
    const resolver = relacao.tipo === 'mantemSeparacaoDirecional' ? resolverEndpointRegiao : resolverEndpoint;
    const resolvida = {
      id: relacao.id,
      tipo: relacao.tipo,
      referencia: resolver(montagemResolvida, relacao.referencia, indice, 'referencia', trilhaMontagem),
      movel: resolver(montagemResolvida, relacao.movel, indice, 'movel', trilhaMontagem),
      especificacao: relacao.especificacao,
    };
    return executarRelacao(resolvida, indice, trilhaMontagem, poseMontagem);
  });
  return {
    ...montagemResolvida,
    relacoes,
    ...(montagem.auditoriaIntersecoes !== undefined
      ? { auditoriaIntersecoes: montagem.auditoriaIntersecoes }
      : {}),
    ...(montagem.apoioNoChao !== undefined ? { apoioNoChao: montagem.apoioNoChao } : {}),
  };
}

/* `carregarPecaComParametros(ref, params)` só é exigido quando uma montagem v5
   declara vínculos: ele executa a receita da peça com os parâmetros derivados
   das vizinhas e devolve a peça resolvida. As peças sem vínculo continuam
   vindo de `carregarPeca`, como antes. */
export async function resolverMontagemPersistida(dado, { carregarPeca, carregarMontagem, carregarPecaComParametros } = {}) {
  const montagemRaiz = lerMontagemPersistida(dado);
  const pecas = new Map();
  const pecasComParametros = new Map();
  const montagens = new Map();

  async function obterPecaComParametros(ref, parametros, instancia, trilha) {
    if (typeof carregarPecaComParametros !== 'function') {
      falhar('carregador-invalido', caminhoDaReferencia(instancia),
        'a montagem declara vínculos e carregarPecaComParametros precisa ser função.', trilha);
    }
    /* A mesma receita com parâmetros diferentes é outra peça: a chave inclui os
       valores, em ordem de nome, para a reexecução ser determinística. */
    const chave = `${ref}\u0000${JSON.stringify(Object.entries(parametros).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))}`;
    if (pecasComParametros.has(chave)) return pecasComParametros.get(chave);
    let bruto;
    try {
      bruto = await carregarPecaComParametros(ref, { ...parametros });
    } catch (erro) {
      falhar('vinculo-execucao-falhou', caminhoDaReferencia(instancia), mensagemDoErro(erro, `peça '${ref}' não executou com os parâmetros derivados.`), trilha);
    }
    let neutro;
    try {
      neutro = lerPecaResolvida(bruto);
    } catch (erro) {
      falhar('peca-invalida', caminhoDaReferencia(instancia), mensagemDoErro(erro, `peça '${ref}' inválida.`), trilha);
    }
    const definicao = { ref, neutro, parametros: { ...parametros } };
    pecasComParametros.set(chave, definicao);
    return definicao;
  }

  function parametrosDerivados(montagem, instanciaId, prontas, trilha) {
    const derivados = [];
    for (const vinculo of montagem.vinculos ?? []) {
      if (vinculo.alvo.instancia !== instanciaId) continue;
      const caminho = `vinculos.${vinculo.id}`;
      const origem = prontas.get(vinculo.de.instancia);
      const porta = origem?.definicao?.neutro?.portas?.get(vinculo.de.porta);
      if (!porta) {
        falhar('vinculo-porta-ausente', caminho, `a peça '${vinculo.de.instancia}' não publica a porta '${vinculo.de.porta}'.`, trilha);
      }
      const medida = porta.interface?.[vinculo.de.medida];
      if (medida === undefined) {
        falhar('vinculo-medida-ausente', caminho, `a porta '${vinculo.de.porta}' não tem a medida '${vinculo.de.medida}'.`, trilha);
      }
      let valor;
      try { valor = valorDoVinculo(vinculo, medida); } catch (erro) {
        if (erro instanceof ErroVinculoDeMedida) falhar(erro.codigo, caminho, erro.message, trilha);
        throw erro;
      }
      derivados.push({ vinculo: vinculo.id, param: vinculo.alvo.param, valor, unidade: vinculo.unidade });
    }
    return derivados;
  }

  async function obterPeca(ref, instancia, trilha) {
    if (typeof carregarPeca !== 'function') {
      falhar('carregador-invalido', caminhoDaReferencia(instancia), 'carregarPeca precisa ser função.', trilha);
    }
    if (pecas.has(ref)) return pecas.get(ref);
    let bruto;
    try {
      bruto = await carregarPeca(ref);
    } catch (erro) {
      falhar('referencia-ausente', caminhoDaReferencia(instancia), mensagemDoErro(erro, `referência '${ref}' não foi carregada.`), trilha);
    }
    if (bruto === undefined || bruto === null) {
      falhar('referencia-ausente', caminhoDaReferencia(instancia), `referência '${ref}' não foi carregada.`, trilha);
    }
    let neutro;
    try {
      neutro = lerPecaResolvida(bruto);
    } catch (erro) {
      falhar('peca-invalida', caminhoDaReferencia(instancia), mensagemDoErro(erro, `peça '${ref}' inválida.`), trilha);
    }
    const definicao = { ref, neutro };
    pecas.set(ref, definicao);
    return definicao;
  }

  async function obterMontagem(ref, instancia, trilha, pilha) {
    if (pilha.includes(ref)) {
      const ciclo = [...pilha, ref];
      falhar('ciclo', caminhoDaReferencia(instancia), `ciclo de montagens: ${ciclo.join(' -> ')}`, trilha);
    }
    if (typeof carregarMontagem !== 'function') {
      falhar('carregador-invalido', caminhoDaReferencia(instancia), 'carregarMontagem precisa ser função.', trilha);
    }
    if (montagens.has(ref)) return montagens.get(ref);
    let bruto;
    try {
      bruto = await carregarMontagem(ref);
    } catch (erro) {
      falhar('referencia-ausente', caminhoDaReferencia(instancia), mensagemDoErro(erro, `referência '${ref}' não foi carregada.`), trilha);
    }
    if (bruto === undefined || bruto === null) {
      falhar('referencia-ausente', caminhoDaReferencia(instancia), `referência '${ref}' não foi carregada.`, trilha);
    }
    let validada;
    try {
      validada = lerMontagemPersistida(bruto);
    } catch (erro) {
      falhar('montagem-invalida', caminhoDaReferencia(instancia), mensagemDoErro(erro, `montagem '${ref}' inválida.`), trilha);
    }
    montagens.set(ref, validada);
    return validada;
  }

  async function resolverMontagem(montagem, posePai, caminhoPai, pilha) {
    /* Na v5 as instâncias são construídas na ordem das etapas, para que cada
       vínculo encontre a vizinha já pronta. A lista devolvida mantém a ordem da
       montagem, que é a que os consumidores já conhecem. */
    const indices = new Map(montagem.instancias.map((instancia, indice) => [instancia.id, indice]));
    const ordem = montagem.etapas ?? montagem.instancias.map((instancia) => instancia.id);
    const prontas = new Map();
    for (const id of ordem) {
      const indice = indices.get(id);
      const instancia = { ...montagem.instancias[indice], indice };
      const trilha = [...caminhoPai, instancia.id];
      let poseLocalCompleta = { escala: 1, ...instancia.pose };
      let poseMundoCompleta = comporTransformacoesRigidas(posePai, poseLocalCompleta);
      let poseLocal = poseSemEscala(poseLocalCompleta);
      let poseMundo = poseSemEscala(poseMundoCompleta);
      const caminho = trilha.slice();
      if (instancia.alvo.tipo === 'peca') {
        const derivados = parametrosDerivados(montagem, instancia.id, prontas, trilha);
        const definicao = derivados.length
          ? await obterPecaComParametros(
            instancia.alvo.ref,
            Object.fromEntries(derivados.map(({ param, valor }) => [param, valor])),
            instancia,
            trilha,
          )
          : await obterPeca(instancia.alvo.ref, instancia, trilha);
        const posicao = (montagem.posicoes ?? []).find((item) => item.instancia === instancia.id);
        let posicaoDerivada;
        if (posicao) {
          const caminhoPosicao = `posicoes.${posicao.id}`;
          const propria = definicao.neutro.portas.get(posicao.porta);
          if (!propria) falhar('posicao-porta-ausente', caminhoPosicao, `a peça '${instancia.id}' não publica a porta '${posicao.porta}'.`, trilha);
          const vizinha = prontas.get(posicao.em.instancia);
          const portaVizinha = vizinha?.definicao?.neutro?.portas?.get(posicao.em.porta);
          if (!portaVizinha) falhar('posicao-porta-ausente', caminhoPosicao, `a peça '${posicao.em.instancia}' não publica a porta '${posicao.em.porta}'.`, trilha);
          const afastamento = posicao.afastamento / UNIDADES_DE_PARAMETRO[posicao.unidade];
          const { pose, giroDefinido } = poseQueEncaixa(
            propria.interface,
            interfaceNoMundo(portaVizinha.interface, vizinha.poseMundo),
            afastamento,
          );
          poseMundoCompleta = pose;
          poseLocalCompleta = localDaTransformacaoRigida(posePai, pose);
          poseLocal = poseSemEscala(poseLocalCompleta);
          poseMundo = poseSemEscala(poseMundoCompleta);
          posicaoDerivada = { posicao: posicao.id, em: { ...posicao.em }, porta: posicao.porta, giroDefinido };
        }
        prontas.set(instancia.id, {
          id: instancia.id,
          caminho,
          alvo: { tipo: 'peca', ref: instancia.alvo.ref },
          poseLocal,
          poseMundo,
          definicao,
          ...(derivados.length ? { parametrosDerivados: derivados } : {}),
          ...(posicaoDerivada ? { posicaoDerivada } : {}),
        });
      } else {
        const filha = await obterMontagem(instancia.alvo.ref, instancia, trilha, pilha);
        const resolvida = await resolverMontagem(
          filha,
          poseMundoCompleta,
          caminho,
          [...pilha, instancia.alvo.ref],
        );
        prontas.set(instancia.id, {
          id: instancia.id,
          caminho,
          alvo: { tipo: 'montagem', ref: instancia.alvo.ref },
          poseLocal,
          poseMundo,
          montagem: resolvida,
        });
      }
    }
    const instancias = montagem.instancias.map((instancia) => prontas.get(instancia.id));
    return resolverRelacoes(montagem, { id: montagem.id, instancias }, caminhoPai, poseSemEscala(posePai));
  }

  return resolverMontagem(montagemRaiz, identidadeTransformacaoRigida(), [], []);
}
