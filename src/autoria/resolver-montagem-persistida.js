/* resolver-montagem-persistida.js — resolve instâncias de peças sem acesso a arquivo. */

import { lerMontagemPersistida, VERSAO_ATUAL } from './ler-montagem-persistida.js';
import { lerPecaResolvida } from './ler-peca-resolvida.js';
import { identidadeTransformacaoRigida, comporTransformacoesRigidas } from './transformacao-rigida.js';
import { resolverPortasDeMontagem, validarEncaixeCilindrico } from './interfaces-montagem.js';

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

function resolverEndpoint(montagemResolvida, endpoint, indiceRelacao, lado, trilhaMontagem) {
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
      [...trilhaMontagem, ...caminhoPercorrido],
    );
  }
  const portas = no.definicao?.neutro?.portas;
  if (!(portas instanceof Map)) {
    falhar(
      'portas-indisponiveis',
      caminhoDaRelacao(indiceRelacao, lado, 'porta'),
      'a peça resolvida não traz portas publicadas como Map.',
      [...trilhaMontagem, ...caminhoPercorrido],
    );
  }
  if (!portas.has(endpoint.porta)) {
    falhar(
      'porta-ausente',
      caminhoDaRelacao(indiceRelacao, lado, 'porta'),
      `porta '${endpoint.porta}' não foi publicada pela peça.`,
      [...trilhaMontagem, ...caminhoPercorrido],
    );
  }
  return { caminho: endpoint.caminho.slice(), porta: endpoint.porta, instancia: no };
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

function validarRelacaoCilindrica(relacao, indice, trilhaMontagem) {
  const referencia = resolverEndpoint(trilhaMontagem.montagem, relacao.referencia, indice, 'referencia', trilhaMontagem.trilha);
  const movel = resolverEndpoint(trilhaMontagem.montagem, relacao.movel, indice, 'movel', trilhaMontagem.trilha);
  try {
    const portas = resolverPortasDeMontagem([
      instanciaTecnica('referencia', referencia),
      instanciaTecnica('movel', movel),
    ]);
    const validada = validarEncaixeCilindrico(
      declararEncaixeCilindrico({ ...relacao, referencia, movel }),
      portas,
    );
    return {
      id: relacao.id,
      tipo: relacao.tipo,
      referencia,
      movel,
      especificacao: relacao.especificacao,
      satisfeita: validada.satisfeita,
      medidas: validada.medidas,
      diagnosticos: validada.diagnosticos,
    };
  } catch (erro) {
    falhar(
      'validacao-relacao-invalida',
      `relacoes[${indice}]`,
      mensagemDoErro(erro, 'a validação da relação cilíndrica falhou.'),
      trilhaMontagem.trilha,
    );
  }
}

function resolverRelacoes(montagem, montagemResolvida, trilhaMontagem) {
  if (montagem.versao !== VERSAO_ATUAL) return montagemResolvida;
  const relacoes = montagem.relacoes.map((relacao, indice) => ({
    id: relacao.id,
    tipo: relacao.tipo,
    referencia: resolverEndpoint(montagemResolvida, relacao.referencia, indice, 'referencia', trilhaMontagem),
    movel: resolverEndpoint(montagemResolvida, relacao.movel, indice, 'movel', trilhaMontagem),
    especificacao: relacao.especificacao,
  }));
  const resolvidas = relacoes.map((relacao, indice) => relacao.tipo === 'encaixaCilindrico'
    ? validarRelacaoCilindrica(relacao, indice, { montagem: montagemResolvida, trilha: trilhaMontagem })
    : relacao);
  return { ...montagemResolvida, relacoes: resolvidas };
}

export async function resolverMontagemPersistida(dado, { carregarPeca, carregarMontagem } = {}) {
  const montagemRaiz = lerMontagemPersistida(dado);
  const pecas = new Map();
  const montagens = new Map();

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
    const instancias = [];
    for (const [indice, instanciaBase] of montagem.instancias.entries()) {
      const instancia = { ...instanciaBase, indice };
      const trilha = [...caminhoPai, instancia.id];
      const poseLocalCompleta = { escala: 1, ...instancia.pose };
      const poseMundoCompleta = comporTransformacoesRigidas(posePai, poseLocalCompleta);
      const poseLocal = poseSemEscala(poseLocalCompleta);
      const poseMundo = poseSemEscala(poseMundoCompleta);
      const caminho = trilha.slice();
      if (instancia.alvo.tipo === 'peca') {
        const definicao = await obterPeca(instancia.alvo.ref, instancia, trilha);
        instancias.push({
          id: instancia.id,
          caminho,
          alvo: { tipo: 'peca', ref: instancia.alvo.ref },
          poseLocal,
          poseMundo,
          definicao,
        });
      } else {
        const filha = await obterMontagem(instancia.alvo.ref, instancia, trilha, pilha);
        const resolvida = await resolverMontagem(
          filha,
          poseMundoCompleta,
          caminho,
          [...pilha, instancia.alvo.ref],
        );
        instancias.push({
          id: instancia.id,
          caminho,
          alvo: { tipo: 'montagem', ref: instancia.alvo.ref },
          poseLocal,
          poseMundo,
          montagem: resolvida,
        });
      }
    }
    return resolverRelacoes(montagem, { id: montagem.id, instancias }, caminhoPai);
  }

  return resolverMontagem(montagemRaiz, identidadeTransformacaoRigida(), [], []);
}
