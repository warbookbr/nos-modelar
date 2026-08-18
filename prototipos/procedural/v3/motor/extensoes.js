/* extensoes.js — SDK nativo: manifesta, limita e combina extensões sem estado global. */
import { criarRegistroOperacoes } from './registro.js';
export const FORMATO_EXTENSAO_NATIVA = 'mecanifica.extensao-nativa@1';
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export class ErroExtensaoNativa extends Error { constructor(mensagem) { super(`extensão nativa: ${mensagem}`); this.name = 'ErroExtensaoNativa'; } }
const plano = (v) => v && typeof v === 'object' && !Array.isArray(v);
function conferir(manifesto, implementacao) {
  if (!plano(manifesto) || manifesto.formato !== FORMATO_EXTENSAO_NATIVA || typeof manifesto.id !== 'string' || !SEMVER.test(manifesto.versao) || !plano(manifesto.operacao)) throw new ErroExtensaoNativa('manifesto inválido');
  const op = manifesto.operacao;
  if (typeof op.id !== 'string' || typeof op.nome !== 'string' || !SEMVER.test(op.versao) || !plano(op.artefatos) || !Array.isArray(op.artefatos.entra) || !Array.isArray(op.artefatos.sai) || !Array.isArray(op.efeitos) || typeof op.identidade !== 'string') throw new ErroExtensaoNativa(`manifesto '${manifesto.id}' não descreve operação completa`);
  if (typeof implementacao !== 'function') throw new ErroExtensaoNativa(`manifesto '${manifesto.id}' exige implementação nativa`);
}
export function criarOperacaoNativa(manifesto, implementacao) {
  conferir(manifesto, implementacao);
  const executar = (contexto, argumentos) => implementacao(contexto, argumentos);
  Object.defineProperty(executar, 'nativaMecanifica', { value: true });
  return Object.freeze({ ...manifesto.operacao, executar, extensao: manifesto.id });
}
export function criarRegistroComExtensoes({ registroBase, extensoes } = {}) {
  if (!registroBase || typeof registroBase.listar !== 'function' || !Array.isArray(extensoes) || !extensoes.length) throw new ErroExtensaoNativa('registro base e extensões explícitas são obrigatórios');
  const modulos = new Map();
  for (const op of registroBase.listar()) {
    const modulo = modulos.get(op.modulo) ?? { id: op.modulo, versao: '1.0.0', requer: [], operacoes: [] };
    modulo.operacoes.push(op); modulos.set(op.modulo, modulo);
  }
  for (const extensao of extensoes) {
    if (!plano(extensao)) throw new ErroExtensaoNativa('extensão inválida');
    const operacao = criarOperacaoNativa(extensao.manifesto, extensao.implementacao);
    modulos.set(extensao.manifesto.id, { id: extensao.manifesto.id, versao: extensao.manifesto.versao, requer: [{ id: 'mecanifica.motor.nucleo', versao: '1.0.0' }], operacoes: [operacao] });
  }
  return criarRegistroOperacoes({ modulos: [...modulos.values()] });
}
export function diagnosticarExtensaoAusente(registro, nome) {
  if (!registro || typeof registro.resolver !== 'function') throw new ErroExtensaoNativa('diagnóstico exige registro de operações');
  return registro.resolver(nome) ? null : Object.freeze({ formato: 'mecanifica.diagnostico-extensao@1', capacidade: nome, estado: 'ausente', acao: 'instale a extensão nativa compatível antes de expandir ou executar a receita' });
}
