/* executar-receita.js — fronteira pura para executar uma receita já carregada.
 *
 * Este módulo não conhece catálogo, caminho, CLI, bancada ou produto. O
 * adaptador que resolve um arquivo carrega um módulo e entrega-o aqui; testes
 * podem entregar uma receita mínima diretamente. Assim, o núcleo recebe dados
 * explícitos e não transforma o catálogo em contrato de execução.
 */
import {
  REGISTRO_OPERACOES,
  criarRegistroComExtensoes,
  expandirChamadasDeComposicao,
  nucleo,
} from '../../procedural/nucleo/entrada.js';
import { confiarNaMemoriaDoRegistro } from '../../procedural/nucleo/memoria-de-execucao.js';
import { MANIFESTO as MANIFESTO_BARRAS } from '../../procedural/extensoes/estrutura-de-barras/manifesto.js';
import { implementar as implementarBarras } from '../../procedural/extensoes/estrutura-de-barras/implementacao.js';
import { MANIFESTO as MANIFESTO_CASCA } from '../../procedural/extensoes/casca/manifesto.js';
import { implementar as implementarCasca } from '../../procedural/extensoes/casca/implementacao.js';
import { normalizarIntencaoPeca } from './intencao-peca.js';

/* O registro de operações da receita de peça: as operações do núcleo e a `estruturaDeBarras`, o tubo entre dois pontos. A estrutura de
   barras só carregava no registro com extensões das famílias, e a receita comum montava cada tubo como um loft de duas seções com o polo
   escrito à mão. A operação fecha as pontas do tubo por conta própria. A `casca`, a parede de espessura constante de um sólido com as
   faces abertas escolhidas, estava no mesmo caso até 2026-11-22: só as famílias a tinham, e a bacia e o tubo oco de uma receita comum
   não tinham como sair fechados. Quem passa `registroOperacoes` escolhe o seu. */
export const REGISTRO_DA_RECEITA = criarRegistroComExtensoes({
  registroBase: REGISTRO_OPERACOES,
  extensoes: [
    Object.freeze({ manifesto: MANIFESTO_BARRAS, implementacao: implementarBarras }),
    Object.freeze({ manifesto: MANIFESTO_CASCA, implementacao: implementarCasca }),
  ],
});
confiarNaMemoriaDoRegistro(REGISTRO_DA_RECEITA);

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
  /* `CHAMADAS_COMPOSICOES` pode ser um `get` que monta a chamada (e recusa) a cada leitura: lê-se uma vez aqui, depois da leitura
     que `validarReceita` faz, e o valor serve às três vezes seguintes */
  const chamadas = modulo.CHAMADAS_COMPOSICOES;
  let passos = modulo.PASSOS;
  let expansao = null;
  if (Array.isArray(chamadas)) {
    if (!registroComposicoes) {
      throw new TypeError(
        'receita: CHAMADAS_COMPOSICOES exige registroComposicoes explícito.',
      );
    }
    expansao = expandirChamadasDeComposicao(
      registroComposicoes,
      chamadas,
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
  const intencao = normalizarIntencaoPeca(modulo.INTENCAO);
  /* Ausência não cria uma chave artificial: isso preserva a assinatura das
     receitas históricas. Quando declarada, a forma já é canônica e entra na
     impressão da entrada usada por exportação/revisão. */
  if (intencao !== null) entrada.INTENCAO = intencao;
  if (expansao) {
    entrada.COMPOSICAO = {
      registro: registroComposicoes.assinatura,
      chamadas,
    };
  }
  return { entrada, expansao };
}

export function entradaDaReceita(modulo, opcoes = {}) {
  return prepararReceita(modulo, opcoes).entrada;
}

export function executarReceita(modulo, opcoes = {}) {
  const { entrada, expansao } = prepararReceita(modulo, opcoes);
  /* `memoria`, de `criarMemoriaDeExecucao`, faz a receita cujo prefixo de passos não mudou recomeçar do estado guardado. */
  const opcoesDoNucleo = {
    registroOperacoes: opcoes.registroOperacoes ?? REGISTRO_DA_RECEITA,
    ...(opcoes.memoria ? { memoria: opcoes.memoria } : {}),
    /* `retrato` ('rapido', 'completo' ou 'conferido') e `aoRastrear` são do núcleo e valem só quando passados: medição e prova, desligadas por padrão. */
    ...(opcoes.retrato ? { retrato: opcoes.retrato } : {}),
    ...(typeof opcoes.aoRastrear === 'function' ? { aoRastrear: opcoes.aoRastrear } : {}),
  };
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
