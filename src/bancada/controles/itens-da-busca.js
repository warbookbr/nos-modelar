/* itens-da-busca.js — o que a busca de comandos lista para um termo: as ações da tela, os comandos de teclado e as partes da peça, em grupos; contas puras, sem DOM.
 *
 * As ações da tela (`extras`) são as que não têm tecla própria na tabela dos comandos, como abrir uma janela, trocar o
 * tema ou ligar a grade. Os comandos vêm da mesma tabela que o menu Controles e o teclado leem (`comandos.js`), com a
 * tecla em vigor, então a busca não guarda uma segunda lista do que a bancada sabe fazer. As partes entram só quando há
 * termo: com o campo vazio a lista mostra as ações, e quem procura uma parte digita o nome dela. */
import { formatarNome } from '../formatar.js';

/** O texto em minúsculas e sem acento, para "visao" achar "Visão". */
export function normalizarBusca(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();
}

/**
 * Os grupos da busca para `termo`, cada um `{ grupo, itens }`, sem grupo vazio. Cada item tem `id`, `rotulo`, `grupo`,
 * `tecla` (a combinação, ou nada), `ligado` (para o que liga e desliga), `valor` (um texto curto à direita) e `executar`.
 */
export function itensDaBusca({ termo = '', extras = [], comandos = [], teclas = {}, partes = [], selecionar = () => {} }) {
  const procurado = normalizarBusca(termo);
  const casa = (item) => !procurado
    || normalizarBusca(item.rotulo).includes(procurado)
    || normalizarBusca(item.grupo).includes(procurado);

  const daTela = extras.map((extra) => ({
    id: extra.id,
    rotulo: extra.rotulo,
    grupo: extra.grupo,
    tecla: extra.tecla ?? null,
    ligado: typeof extra.ligado === 'function' ? Boolean(extra.ligado()) : null,
    valor: typeof extra.valor === 'function' ? extra.valor() : null,
    executar: extra.executar,
  }));
  const deTeclado = procurado ? comandos.map((comando) => ({
    id: comando.id,
    rotulo: comando.rotulo,
    grupo: comando.grupo,
    tecla: teclas[comando.id] ?? comando.padrao ?? null,
    ligado: null,
    valor: null,
    executar: comando.executar,
  })) : [];
  const dasPartes = procurado ? partes.map(({ nome }) => ({
    id: `parte-${nome}`,
    rotulo: formatarNome(nome),
    grupo: 'Partes',
    tecla: null,
    ligado: null,
    valor: null,
    executar: () => selecionar(nome),
  })) : [];

  const grupos = [];
  for (const item of [...daTela, ...deTeclado, ...dasPartes]) {
    if (!casa(item)) continue;
    const grupo = grupos.find((candidato) => candidato.grupo === item.grupo);
    if (grupo) grupo.itens.push(item);
    else grupos.push({ grupo: item.grupo, itens: [item] });
  }
  return grupos;
}
