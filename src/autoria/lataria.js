/* lataria.js — se uma peça é de lataria, e quais partes dela são a chapa.
 *
 * Peça de lataria é a de chapa de superfície livre: carroceria, carenagem, invólucro. Nela o defeito que importa é o amassado largo
 * e raso e a quina que ondula, e esse defeito passa pela distância, pelo mapa de distância, pela curvatura de raio curto, pela
 * ondulação e pela vista comum da bancada; só a luz rasante e a curvatura média da lataria o mostram (plano de ajustes no núcleo,
 * fatia 13). Por decisão da pessoa em 2026-10-30, o pacote do crítico de peça de lataria leva as duas vistas, e a rodada de forma
 * não fecha sem elas. Este módulo diz a quem monta o pacote e a quem registra a rodada se a peça é de lataria; não conhece veículo
 * nem família de objeto, só a técnica da superfície e o que a receita declara.
 *
 * COMO SE RECONHECE. Pela geometria declarada: a peça que tem passo `subdivisao` (a superfície livre por gaiola, de que sai a chapa)
 * é de lataria. A lista é lida dos `PASSOS` da receita, sem executar, porque quem pergunta (a ação do laço, o registro da rodada)
 * pergunta a cada chamada. A receita pode também declarar, em `PLANO.lataria`, uma opção validada com o plano:
 *  - `{ partes: [...] }` diz que a peça é de lataria e quais partes do plano são a chapa (as outras, frisos, calhas e abas, saem em
 *    cinza na curvatura e fora da escala dela); serve à carroceria feita por outra técnica que a subdivisão, e à peça de subdivisão
 *    cuja chapa é só parte das partes que saem dela;
 *  - `{ dispensa: '<motivo>' }` diz que a peça tem subdivisão e não é de lataria (um estofado, uma peça orgânica), com o motivo.
 * Sem declaração, as partes de lataria são as que têm face nascida de passo `subdivisao`, e isso pede a malha executada
 * (`partesDaLataria`). A receita feita só de chamadas de composição não tem `PASSOS` próprios, e só a declaração a faz de lataria. */

export const OPERACOES_DE_SUPERFICIE_LIVRE = Object.freeze(['subdivisao']);
export const CAMPOS_DA_LATARIA = Object.freeze(['partes', 'dispensa']);
export const MINIMO_DO_MOTIVO_DA_DISPENSA = 15;

const OPERACAO_NA_PROCEDENCIA = (op) => `mecanifica.operacao.${op}`;

function falhar(quem, mensagem) { throw new TypeError(`${quem}: ${mensagem}`); }

/**
 * Valida e canonicaliza `PLANO.lataria`. `nomesDasPartes` são os nomes das partes do plano: a parte de lataria precisa ser uma
 * delas, porque é pelo nome dela que a curvatura separa a chapa das peças de borda. Devolve `{ partes }` (ordenadas) ou
 * `{ dispensa }`.
 */
export function normalizarLataria(valor, nomesDasPartes, { quem = 'PLANO' } = {}) {
  const campo = 'lataria';
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    falhar(quem, `'${campo}' precisa ser { partes: [...] } (as partes do plano que são a chapa) ou { dispensa: '<motivo>' } (a peça tem subdivisão e não é de lataria).`);
  }
  const chaves = Object.keys(valor);
  const alheias = chaves.filter((c) => !CAMPOS_DA_LATARIA.includes(c));
  if (alheias.length) falhar(quem, `'${campo}.${alheias[0]}' não é permitido; use 'partes' ou 'dispensa'.`);
  if (chaves.length !== 1) falhar(quem, `'${campo}' declara 'partes' ou 'dispensa', uma das duas.`);
  if (Object.hasOwn(valor, 'dispensa')) {
    const motivo = typeof valor.dispensa === 'string' ? valor.dispensa.trim() : '';
    if (motivo.length < MINIMO_DO_MOTIVO_DA_DISPENSA) {
      falhar(quem, `'${campo}.dispensa' precisa dizer, em pelo menos ${MINIMO_DO_MOTIVO_DA_DISPENSA} caracteres, por que a superfície da peça não é chapa de lataria.`);
    }
    if (motivo.length > 240) falhar(quem, `'${campo}.dispensa' excede 240 caracteres.`);
    return { dispensa: motivo };
  }
  const partes = valor.partes;
  if (!Array.isArray(partes) || partes.length === 0 || partes.some((p) => typeof p !== 'string' || p.trim() === '')) {
    falhar(quem, `'${campo}.partes' precisa ser lista não vazia de nomes de parte do plano.`);
  }
  const limpas = partes.map((p) => p.trim());
  if (new Set(limpas).size !== limpas.length) falhar(quem, `'${campo}.partes' não pode repetir parte.`);
  const desconhecidas = limpas.filter((p) => !nomesDasPartes.includes(p));
  if (desconhecidas.length) {
    falhar(quem, `'${campo}.partes' cita ${desconhecidas.map((p) => `'${p}'`).join(', ')}, que não está em 'partes' do plano (${nomesDasPartes.join(', ')}).`);
  }
  return { partes: [...limpas].sort() };
}

/**
 * O aviso da peça que dispensa as vistas de superfície, com o motivo, ou null. A dispensa tira a peça da obrigação da luz rasante e
 * da curvatura da lataria, e quem a lê no `descrever` e no laço de modelagem precisa vê-la toda vez, para que uma chapa não saia
 * da obrigação por uma declaração que ninguém mais relê. `plano` é o `PLANO` normalizado (ou null).
 */
export function avisoDaDispensa(plano) {
  const motivo = plano?.lataria?.dispensa;
  if (!motivo) return null;
  return `PLANO.lataria dispensa a luz rasante e a curvatura da lataria no pacote do crítico: ${motivo}. `
    + 'Se a superfície for chapa, tire a dispensa; a peça com passo subdivisao é de lataria por padrão.';
}

/* O nome da operação de um passo, na forma de lista (`['subdivisao', {...}]`) ou de objeto (`{ op: 'subdivisao' }`). */
function operacaoDoPasso(passo) {
  if (Array.isArray(passo)) return typeof passo[0] === 'string' ? passo[0] : null;
  return passo && typeof passo === 'object' && typeof passo.op === 'string' ? passo.op : null;
}

/**
 * Se a peça é de lataria, pela receita: `plano` é o `PLANO` normalizado (ou null) e `receita` o módulo, de que se leem os `PASSOS`.
 * Devolve `{ lataria, porque, partes }`: `porque` diz em texto de onde veio a decisão (vai às mensagens), e `partes` são as
 * declaradas, ou null quando saem da malha (`partesDaLataria`).
 */
export function latariaDaReceita(receita, plano = null) {
  const declarada = plano?.lataria;
  if (declarada?.dispensa) return { lataria: false, porque: `PLANO.lataria dispensa: ${declarada.dispensa}`, partes: null };
  if (declarada?.partes) return { lataria: true, porque: `PLANO.lataria declara as partes ${declarada.partes.join(', ')}`, partes: declarada.partes };
  let passos = [];
  try { passos = Array.isArray(receita?.PASSOS) ? receita.PASSOS : []; } catch { passos = []; }
  const indices = [];
  passos.forEach((passo, i) => { if (OPERACOES_DE_SUPERFICIE_LIVRE.includes(operacaoDoPasso(passo))) indices.push(i); });
  if (indices.length) {
    return { lataria: true, porque: `a receita tem superfície livre por subdivisão (${indices.map((i) => `PASSOS[${i}]`).join(', ')})`, partes: null };
  }
  return { lataria: false, porque: 'a receita não tem passo subdivisao nem declara PLANO.lataria', partes: null };
}

/**
 * As partes da malha executada que são lataria: as que têm face nascida de um passo de superfície livre, pela procedência do
 * núcleo (`neutro.procedencia`). Ordenadas; vazias quando nenhuma face da malha final veio de um passo desses.
 */
export function partesDaLataria(neutro) {
  const operacoes = new Set(OPERACOES_DE_SUPERFICIE_LIVRE.map(OPERACAO_NA_PROCEDENCIA));
  const partes = new Set();
  for (const passo of neutro?.procedencia?.passos ?? []) {
    if (!operacoes.has(passo.operacao)) continue;
    for (const id of passo.saidas?.faces ?? []) {
      const parte = neutro.F.get(id)?.parte;
      if (typeof parte === 'string' && parte) partes.add(parte);
    }
  }
  return [...partes].sort();
}

/* ---------- a emenda sombreada ----------
 *
 * A luz rasante vale também para a peça que não é de lataria e tem sombreamento suave sobre a emenda de uma fusão. Por decisão da
 * pessoa em 2026-11-03: o ombro do braço tinha degraus de sombra e uma quina no encontro de dois sólidos fundidos por `unir`, com
 * `liso` por cima, e as marcas passaram por oito rodadas porque nenhuma vista comum as mostra; só a luz rasante as mostra.
 *
 * COMO SE RECONHECE. Pela receita, sem executar: um passo `liso` (com ângulo maior que zero, ou sem ângulo, que suaviza tudo) cuja
 * seleção alcança o resultado de uma operação de fusão ou de corte, seja pela origem `{ op, id }` da operação, seja pelo nome de uma
 * parte que um passo `parte` tirou dessa origem. A regra não vê `liso` por região ou por `onde`, que pode ou não cobrir a emenda sem
 * a malha executada. A dispensa de `PLANO.lataria` tira a peça desta obrigação como da lataria. A curvatura da lataria continua só
 * da lataria: ela mede a chapa de superfície livre, e na peça de emenda o que se vê é a sombra, que a luz rasante mostra. */
export const OPERACOES_DE_FUSAO = Object.freeze(['unir', 'subtrair', 'intersectar', 'arredondarCostura']);

const argumentosDoPasso = (passo) => (Array.isArray(passo) ? passo[1] : passo);

/* Todos os `origem` e `parte` citados numa seleção, em qualquer profundidade (a seleção pode compor outras). */
function citacoesDaSelecao(sel, achadas = { origens: [], partes: [] }) {
  if (Array.isArray(sel)) { for (const item of sel) citacoesDaSelecao(item, achadas); return achadas; }
  if (!sel || typeof sel !== 'object') return achadas;
  if (sel.origem && typeof sel.origem === 'object' && typeof sel.origem.op === 'string') achadas.origens.push(sel.origem.op);
  if (typeof sel.parte === 'string') achadas.partes.push(sel.parte);
  for (const valor of Object.values(sel)) if (valor && typeof valor === 'object') citacoesDaSelecao(valor, achadas);
  return achadas;
}

/**
 * Se a peça tem sombreamento suave sobre a emenda de uma fusão, pela receita (sem executar): `{ emenda, porque }`, com os índices
 * dos passos `liso` que alcançam a fusão.
 */
export function emendaSombreadaDaReceita(receita) {
  let passos = [];
  try { passos = Array.isArray(receita?.PASSOS) ? receita.PASSOS : []; } catch { passos = []; }
  const partesDeFusao = new Set();
  const liso = [];
  passos.forEach((passo, i) => {
    const op = operacaoDoPasso(passo);
    const args = argumentosDoPasso(passo);
    if (op === 'parte' && typeof args?.nome === 'string' && citacoesDaSelecao(args.sel).origens.some((o) => OPERACOES_DE_FUSAO.includes(o))) {
      partesDeFusao.add(args.nome);
    }
    if (op !== 'liso' || args?.angulo === 0) return;
    const { origens, partes } = citacoesDaSelecao(args?.sel);
    if (origens.some((o) => OPERACOES_DE_FUSAO.includes(o)) || partes.some((p) => partesDeFusao.has(p))) liso.push(i);
  });
  if (!liso.length) return { emenda: false, porque: 'nenhum passo liso alcança o resultado de unir, subtrair, intersectar ou arredondarCostura' };
  return { emenda: true, porque: `sombreamento suave (liso em ${liso.map((i) => `PASSOS[${i}]`).join(', ')}) sobre a emenda de uma fusão` };
}

/**
 * O que a peça deve levar ao pacote do crítico, pela receita: `{ lataria, luzRasante, porque, partes }`. A peça de lataria leva a luz
 * rasante e a curvatura; a de emenda sombreada leva só a luz rasante (`lataria` falso, `luzRasante` verdadeiro); a dispensa de
 * `PLANO.lataria` tira as duas.
 */
export function superficieDaReceita(receita, plano = null) {
  const decidida = latariaDaReceita(receita, plano);
  if (decidida.lataria) return { ...decidida, luzRasante: true };
  if (plano?.lataria?.dispensa) return { ...decidida, luzRasante: false };
  const emenda = emendaSombreadaDaReceita(receita);
  return emenda.emenda ? { ...decidida, luzRasante: true, porque: emenda.porque } : { ...decidida, luzRasante: false };
}
