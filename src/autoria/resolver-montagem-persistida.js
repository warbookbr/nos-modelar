/* resolver-montagem-persistida.js — resolve instâncias de peças sem acesso a arquivo. */

import { lerMontagemPersistida } from './ler-montagem-persistida.js';
import { lerPecaResolvida } from './ler-peca-resolvida.js';
import { identidadeTransformacaoRigida, comporTransformacoesRigidas } from './transformacao-rigida.js';

export class ErroResolucaoMontagemPersistida extends Error {
  constructor(codigo, caminho, mensagem) {
    super(`${caminho}: ${mensagem}`);
    this.name = 'ErroResolucaoMontagemPersistida';
    this.codigo = codigo;
    this.caminho = caminho;
  }
}

function falhar(codigo, caminho, mensagem) {
  throw new ErroResolucaoMontagemPersistida(codigo, caminho, mensagem);
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

export async function resolverMontagemPersistida(dado, { carregarPeca } = {}) {
  const montagem = lerMontagemPersistida(dado);
  if (typeof carregarPeca !== 'function') falhar('carregador-invalido', '$', 'carregarPeca precisa ser função.');

  const instancias = montagem.instancias.map((instancia, indice) => ({ ...instancia, indice }));
  const montagemFilha = instancias.find((instancia) => instancia.alvo.tipo === 'montagem');
  if (montagemFilha) {
    falhar('alvo-nao-suportado', caminhoDaReferencia(montagemFilha), 'alvo montagem não é suportado nesta rodada.');
  }

  const referencias = new Map();
  for (const instancia of instancias) {
    if (!referencias.has(instancia.alvo.ref)) referencias.set(instancia.alvo.ref, instancia);
  }
  const definicoes = new Map();
  for (const [ref, instancia] of referencias) {
    let bruto;
    try {
      bruto = await carregarPeca(ref);
    } catch (erro) {
      falhar('referencia-ausente', caminhoDaReferencia(instancia), mensagemDoErro(erro, `referência '${ref}' não foi carregada.`));
    }
    if (bruto === undefined || bruto === null) {
      falhar('referencia-ausente', caminhoDaReferencia(instancia), `referência '${ref}' não foi carregada.`);
    }
    let neutro;
    try {
      neutro = lerPecaResolvida(bruto);
    } catch (erro) {
      falhar('peca-invalida', caminhoDaReferencia(instancia), mensagemDoErro(erro, `peça '${ref}' inválida.`));
    }
    definicoes.set(ref, { ref, neutro });
  }

  const identidade = identidadeTransformacaoRigida();
  return {
    id: montagem.id,
    instancias: instancias.map((instancia) => {
      const poseLocal = poseSemEscala(instancia.pose);
      const poseMundo = poseSemEscala(comporTransformacoesRigidas(
        identidadeTransformacaoRigida(),
        { escala: 1, ...poseLocal },
      ));
      return {
        id: instancia.id,
        caminho: [instancia.id],
        alvo: { tipo: 'peca', ref: instancia.alvo.ref },
        poseLocal,
        poseMundo,
        definicao: definicoes.get(instancia.alvo.ref),
      };
    }),
  };
}
