/* carregar-sessao.js — processa o payload de uma sessão ativa (peça ou montagem) para a cena Three.js. */
import { adaptarThree } from '../../autoria/adaptar-three.js';
import { adaptarMontagemThree } from '../../autoria/adaptar-montagem-three.js';
import { caixasPorParte, portasPublicadas } from '../../autoria/descrever-partes.js';
import { executarReceita } from '../../autoria/executar-receita.js';
import { resolverMontagemPersistida } from '../../autoria/resolver-montagem-persistida.js';
import { FORMATO_DO_NEUTRO_EM_TEXTO, impressaoDaReceita, lerNeutroEmTexto, neutroDoTexto } from '../../../procedural/nucleo/planejador/neutro-em-texto.js';

/* A captura da bancada executava a receita duas vezes: na ativação, no Node, e aqui, na página. A ativação grava agora, ao lado do arquivo
   da sessão, o neutro que ela executou (`procedural/nucleo/planejador/neutro-em-texto.js`), e a página o lê em vez de executar. */
export { FORMATO_DO_NEUTRO_EM_TEXTO, neutroDoTexto };

/* A leitura do neutro gravado ao lado da sessão, síncrona: o processamento do payload é síncrono no sincronizador (`aplicarPayload`),
   e a captura espera o modelo entrar na cena. Devolve `{ neutro, impressao }`, ou `{ motivo }` quando não leu (fora do navegador, nome
   inválido, resposta que não é 200, texto ilegível); nesse caso a receita executa aqui, e `processarPayloadSessao` avisa. */
function lerNeutroDaSessao(arquivo) {
  if (typeof XMLHttpRequest === 'undefined') return { motivo: 'sem XMLHttpRequest (fora do navegador)' };
  if (typeof arquivo !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]*\.json$/.test(arquivo) || arquivo.includes('..')) return { motivo: `nome de arquivo inválido (${JSON.stringify(arquivo)})` };
  try {
    const pedido = new XMLHttpRequest();
    pedido.open('GET', `${import.meta.env?.BASE_URL ?? './'}${arquivo}`, false);
    pedido.send();
    if (pedido.status !== 200) return { motivo: `o servidor respondeu ${pedido.status}` };
    return lerNeutroEmTexto(pedido.responseText);
  } catch (erro) {
    return { motivo: erro?.message ?? String(erro) };
  }
}

/* O neutro que a ativação gravou, quando é desta receita: `{ neutro, arquivo }`, ou `{ motivo, arquivo }` quando a página tem de executar.
   Só a impressão da entrada (o hash da receita) decide: o neutro de outra receita, ou de outra versão dela, é recusado. */
function neutroGravadoDaSessao(payload, lerNeutro) {
  const citado = payload.neutro;
  if (!citado) return { motivo: 'a sessão não traz o neutro da ativação' };
  const arquivo = citado.arquivo ?? null;
  if (citado.formato !== FORMATO_DO_NEUTRO_EM_TEXTO) return { motivo: `formato do neutro desconhecido (${JSON.stringify(citado.formato)})`, arquivo };
  let lido;
  try { lido = lerNeutro(arquivo); } catch (erro) { lido = { motivo: erro?.message ?? String(erro) }; }
  if (!lido?.neutro) return { motivo: lido?.motivo ?? 'o neutro não carregou', arquivo };
  if (lido.impressao !== impressaoDaReceita(payload.receita)) return { motivo: 'o neutro gravado é de outra entrada (a impressão da receita não confere)', arquivo };
  return { neutro: lido.neutro, arquivo };
}

/* `neutro` é o resultado de uma execução já feita (o cache da bancada, `cache-da-execucao.js`, ou o neutro que a ativação gravou ao lado
   da sessão); sem ele, a receita executa aqui. O modelo diz de onde veio o neutro em `origemDoNeutro`: `gravado` (lido do arquivo da
   ativação), `fornecido` (entregue por quem chamou) ou `executado` (a receita executou na página; `motivo` diz por que o gravado não serviu). */
export function processarReceitaSessao(receita, { nome = 'Sessão Ativa', neutro: neutroPronto = null, origemDoNeutro = null } = {}) {
  if (!receita || !Array.isArray(receita.PASSOS)) {
    throw new Error('sessão: receita precisa expor PASSOS procedurais.');
  }
  const materiais = receita.MATERIAIS ?? {};
  const origem = origemDoNeutro ?? (neutroPronto ? { origem: 'fornecido' } : { origem: 'executado' });
  const neutro = neutroPronto ?? executarReceita(receita).neutro;
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
    origemDoNeutro: origem,
    materiais,
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

export function processarPayloadSessao(payload, { lerNeutro = lerNeutroDaSessao } = {}) {
  if (!payload) throw new Error('sessão: payload vazio.');

  if (payload.receita) {
    /* o neutro que a ativação executou, quando ela o gravou ao lado da sessão (`payload.neutro.arquivo`) e é desta receita */
    const gravado = neutroGravadoDaSessao(payload, lerNeutro);
    if (!gravado.neutro && payload.neutro) console.warn(`sessão: o neutro gravado${gravado.arquivo ? ` em ${gravado.arquivo}` : ''} não serviu (${gravado.motivo}); a receita executa na página.`);
    return processarReceitaSessao(payload.receita, {
      nome: payload.alvo?.nome ?? payload.receita.meta?.nome ?? 'Peça Ativa',
      neutro: gravado.neutro ?? null,
      origemDoNeutro: gravado.neutro ? { origem: 'gravado', arquivo: gravado.arquivo } : { origem: 'executado', motivo: gravado.motivo, ...(gravado.arquivo ? { arquivo: gravado.arquivo } : {}) },
    });
  }

  if (payload.montagem) {
    return processarMontagemSessao(payload.montagem);
  }

  throw new Error('sessão: o payload não contém receita nem montagem válida.');
}
