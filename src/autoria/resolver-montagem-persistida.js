/* resolver-montagem-persistida.js — resolve instâncias de peças sem acesso a arquivo. */

import { lerMontagemPersistida } from './ler-montagem-persistida.js';
import { lerPecaResolvida } from './ler-peca-resolvida.js';
import { identidadeTransformacaoRigida, comporTransformacoesRigidas } from './transformacao-rigida.js';

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
    return { id: montagem.id, instancias };
  }

  return resolverMontagem(montagemRaiz, identidadeTransformacaoRigida(), [], []);
}
