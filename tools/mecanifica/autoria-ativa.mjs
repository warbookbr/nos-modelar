/* autoria-ativa.mjs — provedores neutros para revisões imutáveis ativas. */
import { executarReceitaDeclarativa, observarAutoriaReceita } from './autoria-receita.mjs';
import { observarAutoriaMontagem } from './autoria-montagem.mjs';

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function idsCanonicos(valores, campo) {
  const resultado = new Set();
  for (const valor of valores ?? []) {
    if (typeof valor !== 'string' || !slug.test(valor)) {
      throw new TypeError(`${campo}: informe somente IDs semânticos canônicos.`);
    }
    resultado.add(valor);
  }
  return resultado;
}

export function criarProvedoresAutoriaAtiva({
  raizRepositorio,
  montagensAutorizadas = [],
  receitasAutorizadas = [],
} = {}) {
  if (typeof raizRepositorio !== 'string' || raizRepositorio.length === 0) {
    throw new TypeError('raizRepositorio: caminho confiável do host é obrigatório.');
  }
  const montagens = idsCanonicos(montagensAutorizadas, 'montagensAutorizadas');
  const receitas = idsCanonicos(receitasAutorizadas, 'receitasAutorizadas');

  async function observarMontagem(id) {
    if (!montagens.has(id)) return { id, revisao: null, autorizada: false, montagem: null };
    const ativa = await observarAutoriaMontagem({ raiz: raizRepositorio, entidade: id });
    return { id, revisao: ativa.revisao, autorizada: true, montagem: ativa.montagem };
  }

  async function observarReceita(id) {
    if (!receitas.has(id)) return { id, revisao: null, autorizada: false, receita: null };
    const ativa = await observarAutoriaReceita({ raiz: raizRepositorio, id });
    return { id, revisao: ativa.revisao, autorizada: true, receita: ativa.receita };
  }

  return Object.freeze({
    async carregarMontagem(id) {
      const ativa = await observarMontagem(id);
      return ativa.montagem;
    },
    async carregarPeca(id) {
      const ativa = await observarReceita(id);
      return ativa.receita ? executarReceitaDeclarativa(ativa.receita).peca : null;
    },
    async estado() {
      const [estadoMontagens, estadoReceitas] = await Promise.all([
        Promise.all([...montagens].sort().map(observarMontagem)),
        Promise.all([...receitas].sort().map(observarReceita)),
      ]);
      const resumir = ({ id, revisao }) => ({
        id,
        revisao,
        fonte: revisao === null ? 'base-estatica' : 'revisao-ativa',
      });
      return {
        formato: 'mecanifica.autoria-ativa',
        versao: 1,
        montagens: estadoMontagens.map(resumir),
        receitas: estadoReceitas.map(resumir),
      };
    },
  });
}

export function criarProvedoresAutoriaInativa() {
  return Object.freeze({
    async carregarMontagem() { return null; },
    async carregarPeca() { return null; },
    async estado() {
      return { formato: 'mecanifica.autoria-ativa', versao: 1, montagens: [], receitas: [] };
    },
  });
}
