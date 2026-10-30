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
