/* executar-receita.js — fronteira pura para executar uma receita já carregada.
 *
 * Este módulo não conhece catálogo, caminho, CLI, bancada ou produto. O
 * adaptador que resolve um arquivo carrega um módulo e entrega-o aqui; testes
 * podem entregar uma receita mínima diretamente. Assim, o núcleo recebe dados
 * explícitos e não transforma o catálogo em contrato de execução.
 */
import {
  expandirChamadasDeComposicao,
  nucleo,
} from '../../prototipos/procedural/v3/motor/oficina.js';

export function validarReceita(modulo) {
  if (!modulo || typeof modulo !== 'object' || Array.isArray(modulo)) {
    throw new TypeError('receita: módulo precisa ser um objeto já carregado.');
  }
  const temPassos = Array.isArray(modulo.PASSOS);
  const temComposicoes = Array.isArray(modulo.CHAMADAS_COMPOSICOES);
  if (temPassos === temComposicoes) {
    throw new TypeError(
      'receita: módulo precisa exportar exatamente um envelope: PASSOS ou CHAMADAS_COMPOSICOES.',
    );
  }
}

function prepararReceita(modulo, {
  paramsExtra = null,
  registroComposicoes = null,
  orcamentoComposicoes = null,
} = {}) {
  validarReceita(modulo);
  let passos = modulo.PASSOS;
  let expansao = null;
  if (Array.isArray(modulo.CHAMADAS_COMPOSICOES)) {
    if (!registroComposicoes) {
      throw new TypeError(
        'receita: CHAMADAS_COMPOSICOES exige registroComposicoes explícito.',
      );
    }
    expansao = expandirChamadasDeComposicao(
      registroComposicoes,
      modulo.CHAMADAS_COMPOSICOES,
      orcamentoComposicoes ? { orcamento: orcamentoComposicoes } : {},
    );
    passos = expansao.passos;
  }
  const PARAMS = paramsExtra ? { ...(modulo.PARAMS ?? {}), ...paramsExtra } : (modulo.PARAMS ?? {});
  const entrada = {
    PASSOS: passos,
    PARAMS,
    TOPO: modulo.TOPO ?? {},
    MATERIAIS: modulo.MATERIAIS ?? {},
    ESQUELETO: modulo.ESQUELETO ?? null,
    ALIASES: modulo.ALIASES ?? [],
  };
  if (expansao) {
    entrada.COMPOSICAO = {
      registro: registroComposicoes.assinatura,
      chamadas: modulo.CHAMADAS_COMPOSICOES,
    };
  }
  return { entrada, expansao };
}

export function entradaDaReceita(modulo, opcoes = {}) {
  return prepararReceita(modulo, opcoes).entrada;
}

export function executarReceita(modulo, opcoes = {}) {
  const { entrada, expansao } = prepararReceita(modulo, opcoes);
  const opcoesDoNucleo = opcoes.registroOperacoes
    ? { registroOperacoes: opcoes.registroOperacoes }
    : undefined;
  const neutro = nucleo(
    entrada.PASSOS,
    entrada.PARAMS,
    entrada.TOPO,
    entrada.MATERIAIS,
    entrada.ESQUELETO,
    entrada.ALIASES,
    opcoesDoNucleo,
  );
  return { entrada, neutro, expansao };
}
