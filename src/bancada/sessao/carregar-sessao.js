/* carregar-sessao.js — processa o payload de uma sessão ativa (peça ou montagem) para a cena Three.js. */
import { adaptarThree } from '../../autoria/adaptar-three.js';
import { adaptarMontagemThree } from '../../autoria/adaptar-montagem-three.js';
import { caixasPorParte, portasPublicadas } from '../../autoria/descrever-partes.js';
import { executarReceita } from '../../autoria/executar-receita.js';
import { resolverMontagemPersistida } from '../../autoria/resolver-montagem-persistida.js';

export function processarReceitaSessao(receita, { nome = 'Sessão Ativa' } = {}) {
  if (!receita || !Array.isArray(receita.PASSOS)) {
    throw new Error('sessão: receita precisa expor PASSOS procedurais.');
  }
  const materiais = receita.MATERIAIS ?? {};
  const { neutro } = executarReceita(receita);
  const { caixas, facesSemParte } = caixasPorParte(neutro);
  const portas = portasPublicadas(neutro);
  const rotulo = receita.meta?.nome ?? nome;

  const adaptado = adaptarThree(neutro, { nome: rotulo, materiais });

  return {
    tipo: 'peca',
    nome: rotulo,
    rotulo,
    medida: { partes: caixas, facesSemParte, portas },
    estatisticas: adaptado.estatisticas,
    partes: adaptado.partes,
    raiz: adaptado.raiz,
    receita,
    neutro,
  };
}

export function processarMontagemSessao(montagemDefinicao, { catalogo = [] } = {}) {
  if (!montagemDefinicao?.id) {
    throw new Error('sessão: definição de montagem precisa de um id.');
  }
  const montagemResolvida = resolverMontagemPersistida(montagemDefinicao, catalogo);
  const adaptado = adaptarMontagemThree(montagemResolvida);

  // Mapeia instâncias para o formato esperado pelo controlador de partes
  const partes = new Map();
  for (const [chave, item] of adaptado.instancias.entries()) {
    const nome = item.caminho.join('/');
    partes.set(nome, item.visual.raiz);
  }

  return {
    tipo: 'montagem',
    nome: montagemDefinicao.id,
    rotulo: montagemDefinicao.rotulo ?? montagemDefinicao.id,
    medida: { partes: new Map(), facesSemParte: [], portas: [] },
    estatisticas: { facesNeutras: 0, verticesNeutros: 0 },
    partes,
    raiz: adaptado.raiz,
    montagem: montagemDefinicao,
    montagemResolvida,
  };
}

export function processarPayloadSessao(payload) {
  if (!payload) throw new Error('sessão: payload vazio.');

  if (payload.receita) {
    return processarReceitaSessao(payload.receita, {
      nome: payload.alvo?.nome ?? payload.receita.meta?.nome ?? 'Peça Ativa',
    });
  }

  if (payload.montagem) {
    return processarMontagemSessao(payload.montagem);
  }

  throw new Error('sessão: o payload não contém receita nem montagem válida.');
}
