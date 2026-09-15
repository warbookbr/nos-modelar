/* origem-de-parametro.js — de onde veio cada número da tabela.
 *
 * O risco que este módulo existe para conter tem nome no plano ativo: deriva de
 * parâmetro. A rodada de absorção lê o que a pessoa deixou na bancada e
 * reescreve a receita para chegar lá. Acertar um alvo é fácil se for permitido
 * inventar números — basta acrescentar um termo a cada rodada até a conta
 * fechar. Depois de algumas rodadas a `TABELA` tem quarenta entradas e nenhuma
 * delas corresponde a coisa nenhuma que se possa medir no objeto real, e a
 * receita deixou de ser legível exatamente para quem ela deveria servir.
 *
 * `ORIGENS` é a declaração que impede isso. Cada parâmetro diz de onde saiu:
 * medido no recorte lateral, herdado de norma, escolhido por convenção de
 * fabricação. Parâmetro sem essa frase não entra.
 *
 * ADESÃO É POR RECEITA, E COMPLETA. Uma receita pode não declarar `ORIGENS` —
 * o acervo é anterior a esta regra e obrigar todo mundo de uma vez seria outro
 * trabalho. Mas declarar pela metade é pior que não declarar: passa a impressão
 * de que a lista foi conferida quando ela só cobre o que era fácil. Então quem
 * declara, declara tudo, e o gate cobra isso.
 *
 * COORDENADA CONTA COMO UMA. `pontoSelimTopo` é o ponto de solda medido na
 * folha, e as suas duas casas vieram da mesma medição: exigir uma frase para
 * `pontoSelimTopo.0` e outra para `pontoSelimTopo.1` produziria duas cópias da
 * mesma frase. Uma entrada na chave de cima cobre as casas dela. */

import { listarParametrosDeclarados } from './parametros-declarados.js';
import { lerCaminho } from './parametros-vivos.js';

const raizDoId = (id) => String(id).split('.')[0];

function origemDe(origens, id) {
  const direta = origens?.[id];
  if (typeof direta === 'string' && direta.trim()) return direta.trim();
  const daRaiz = origens?.[raizDoId(id)];
  if (typeof daRaiz === 'string' && daRaiz.trim()) return daRaiz.trim();
  return null;
}

/**
 * Confere a declaração de origem de UMA receita.
 *
 * Devolve `{ declara, ok, semOrigem, sobrando }`. `semOrigem` são parâmetros
 * declarados que nenhuma frase explica; `sobrando` são frases que explicam
 * parâmetro que não existe mais — restos de uma rodada anterior, que enganam
 * quem lê a tabela procurando saber o que ainda vale.
 */
export function conferirOrigens(receita) {
  const origens = receita?.ORIGENS ?? null;
  if (!origens || typeof origens !== 'object') {
    return { declara: false, ok: true, semOrigem: [], sobrando: [] };
  }

  const declarados = listarParametrosDeclarados(receita).map((p) => p.id);
  const semOrigem = declarados.filter((id) => !origemDe(origens, id)).sort();

  /* Frase que explica parâmetro inexistente é resto de rodada anterior, e
     engana quem lê a tabela procurando saber o que ainda vale. A chave é
     legítima quando aponta para algo que existe em `PARAMS` — inclusive as
     curvas, como as duas bordas do tubo inferior, que têm origem para declarar
     mesmo não sendo sondadas uma casa por vez. */
  const sobrando = Object.keys(origens)
    .filter((chave) => lerCaminho(receita?.PARAMS, chave.split('.')) === undefined)
    .sort();

  return { declara: true, ok: semOrigem.length === 0 && sobrando.length === 0, semOrigem, sobrando };
}

/**
 * Parâmetros que a receita nova tem e a antiga não tinha.
 *
 * É o que a rodada de absorção precisa saber para não deixar passar número
 * inventado: acertar o alvo com um parâmetro novo só vale se ele disser de onde
 * veio.
 */
export function parametrosNovos(antiga, nova) {
  const antes = new Set(listarParametrosDeclarados(antiga).map((p) => p.id));
  return listarParametrosDeclarados(nova).map((p) => p.id).filter((id) => !antes.has(id)).sort();
}

/**
 * A regra da rodada de absorção: parâmetro novo sem origem declarada reprova.
 *
 * Separada de `conferirOrigens` porque a pergunta é outra. Aquela pergunta se a
 * receita está inteira; esta pergunta se a REESCRITA inventou número às
 * escondidas, e ela vale mesmo para receita que ainda não declara `ORIGENS`:
 * quem acrescenta parâmetro numa rodada de absorção diz de onde ele veio,
 * independentemente do que havia antes.
 */
export function conferirAbsorcao(antiga, nova) {
  const novos = parametrosNovos(antiga, nova);
  const semOrigem = novos.filter((id) => !origemDe(nova?.ORIGENS, id));
  return { ok: semOrigem.length === 0, novos, semOrigem };
}
