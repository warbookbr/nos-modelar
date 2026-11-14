/* saliencias-declaradas.js — a saliência ou o rebaixo de dupla curvatura que a peça desenha de propósito, com a região, a amplitude e o motivo.
 *
 * A régua de ondulação (`tools/modelar/ondulacao-da-superficie.mjs`) lê o desvio de cada vértice contra o ajuste local da própria superfície, e um desenho de
 * dupla curvatura (o para-lama largo que sobe sobre a linha da porta, o rebaixo côncavo em cunha de uma lateral) se parece com um calombo para ela: numa prova
 * de gaiola com estações a cada 200 mm, uma saliência de 60 mm saiu como calombo de 3,57 mm contra o limiar de 0,3 mm, e sumiu com a saliência em zero. As
 * dobras têm `PLANO.dobrasAceitas`; a saliência declarada é o par para a forma de curvatura suave. Ela diz onde a feição está e quanto ela se afasta da
 * superfície em volta, e a régua passa a medir o desvio contra essa feição.
 *
 * O CAMPO. `PLANO.saliencias: [{ regiao, sentido, amplitudeMm, motivo }]`:
 *  - `regiao`: `{ min: [x, y, z], max: [x, y, z] }` em milímetro, no referencial da peça, com volume. Vale o vértice cuja posição cai na caixa.
 *  - `sentido`: 'fora' (saliência) ou 'dentro' (rebaixo). Só o desvio desse sinal é tolerado na região; o do sinal contrário é medido inteiro.
 *  - `amplitudeMm`: quanto a feição se afasta da superfície em volta, em milímetro, maior que zero e até 1000. É a medida que o desenho pediu, e o que a régua
 *    tolera na região é uma fração dela (`FRACAO_DA_SALIENCIA`); o que passa disso, somado a ela, é ondulação.
 *  - `motivo`: por que a feição é desenho, em pelo menos 15 caracteres, como em `dobrasAceitas`.
 * O normalizador recusa, com o que recebeu, o que esperava e o comando que mostra o desvio medido: lista vazia ou com mais de 32 itens; região mal formada ou
 * sem volume; sentido desconhecido; amplitude que não é número finito entre 0 e 1000; motivo curto, longo ou com UUID e caminho absoluto; chave alheia; item
 * repetido. Plano sem o campo produz a mesma forma canônica de antes. */

export const SENTIDOS_DA_SALIENCIA = Object.freeze(['fora', 'dentro']);
export const CAMPOS_DA_SALIENCIA = Object.freeze(['regiao', 'sentido', 'amplitudeMm', 'motivo']);
export const MINIMO_DO_MOTIVO = 15;
export const LIMITE_DA_AMPLITUDE_MM = 1000;
/* as frações da amplitude declarada que a régua tolera como desvio da própria feição: o resíduo que o ajuste local deixa numa lombada cos² de seis
   espaçamentos de largura (medido em `tools/fixtures/saliencia-declarada/`, 7,0 a 7,2% no pico do mesmo sinal, 3,8% no pé do sinal contrário e 1,3% no entorno,
   até onde o ajuste alcança fora da caixa). Feição mais estreita deixa resíduo maior, e a amplitude declarada precisa ser a que a malha tem. */
export const FRACAO_DA_SALIENCIA = 0.075;
export const FRACAO_CONTRARIA_DA_SALIENCIA = 0.04;
export const FRACAO_DO_ENTORNO_DA_SALIENCIA = 0.015;
const LIMITE_TEXTO = 240;
const LIMITE_LISTA = 32;
const COMANDO = 'rode `npm run ondulacao -- <peça>` para ver o calombo medido e a posição dele em mm';
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const ABSOLUTO = /^(?:[a-z]:\\|\\\\|\/|data:)/i;

function falhar(quem, onde, recebido, esperado) {
  throw new TypeError(`${quem}: '${onde}' recebeu ${recebido}; esperado ${esperado}. Para achar a região e a amplitude, ${COMANDO}.`);
}

const mostrar = (x) => { try { return JSON.stringify(x) ?? String(x); } catch { return String(x); } };

function canto(valor, quem, onde) {
  if (!Array.isArray(valor) || valor.length !== 3 || !valor.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    falhar(quem, onde, mostrar(valor), '[x, y, z], três números finitos em milímetro');
  }
  return [...valor];
}

/** Valida e canonicaliza `PLANO.saliencias`. Devolve a lista ordenada por região, sentido e motivo. */
export function normalizarSaliencias(valor, { quem = 'PLANO' } = {}) {
  const campo = 'saliencias';
  if (!Array.isArray(valor) || valor.length === 0 || valor.length > LIMITE_LISTA) {
    falhar(quem, campo, Array.isArray(valor) ? `${valor.length} itens` : mostrar(valor), `lista de 1 a ${LIMITE_LISTA} itens { regiao, sentido, amplitudeMm, motivo }`);
  }
  const itens = valor.map((item, i) => {
    const onde = `${campo}[${i}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) falhar(quem, onde, mostrar(item), 'objeto { regiao, sentido, amplitudeMm, motivo }');
    const alheia = Object.keys(item).find((c) => !CAMPOS_DA_SALIENCIA.includes(c));
    if (alheia) falhar(quem, `${onde}.${alheia}`, 'a chave', `uma de ${CAMPOS_DA_SALIENCIA.join(', ')}`);
    const r = item.regiao;
    if (!r || typeof r !== 'object' || Array.isArray(r) || Object.keys(r).some((c) => c !== 'min' && c !== 'max')) {
      falhar(quem, `${onde}.regiao`, mostrar(r), '{ min: [x, y, z], max: [x, y, z] } em mm, a caixa onde a feição é de propósito');
    }
    const min = canto(r.min, quem, `${onde}.regiao.min`); const max = canto(r.max, quem, `${onde}.regiao.max`);
    if (min.some((x, k) => !(x < max[k]))) falhar(quem, `${onde}.regiao`, `min ${mostrar(min)} e max ${mostrar(max)}`, 'min menor que max nos três eixos, a caixa com volume');
    if (!SENTIDOS_DA_SALIENCIA.includes(item.sentido)) falhar(quem, `${onde}.sentido`, mostrar(item.sentido), `um de ${SENTIDOS_DA_SALIENCIA.join(', ')}`);
    const a = item.amplitudeMm;
    if (typeof a !== 'number' || !Number.isFinite(a) || !(a > 0) || a > LIMITE_DA_AMPLITUDE_MM) falhar(quem, `${onde}.amplitudeMm`, mostrar(a), `número finito maior que 0 e até ${LIMITE_DA_AMPLITUDE_MM} mm`);
    const motivo = typeof item.motivo === 'string' ? item.motivo.trim() : '';
    if (motivo.length < MINIMO_DO_MOTIVO) falhar(quem, `${onde}.motivo`, mostrar(item.motivo), `texto de pelo menos ${MINIMO_DO_MOTIVO} caracteres que diga por que a feição é desenho`);
    if (motivo.length > LIMITE_TEXTO) falhar(quem, `${onde}.motivo`, `${motivo.length} caracteres`, `no máximo ${LIMITE_TEXTO}`);
    if (UUID.test(motivo) || ABSOLUTO.test(motivo)) falhar(quem, `${onde}.motivo`, 'UUID, caminho absoluto ou binário local', 'texto sem identificador de máquina');
    return { regiao: { min, max }, sentido: item.sentido, amplitudeMm: a, motivo };
  });
  if (new Set(itens.map((s) => JSON.stringify(s))).size !== itens.length) falhar(quem, campo, 'item repetido', 'itens distintos');
  return itens.sort((a, b) => a.regiao.min[0] - b.regiao.min[0] || a.regiao.min[1] - b.regiao.min[1] || a.regiao.min[2] - b.regiao.min[2]
    || (a.sentido < b.sentido ? -1 : a.sentido > b.sentido ? 1 : 0) || (a.motivo < b.motivo ? -1 : a.motivo > b.motivo ? 1 : 0));
}

/** As saliências do `PLANO` de uma receita, normalizadas, ou [] quando ele não declara nenhuma. */
export function salienciasDaReceita(receita) {
  const plano = receita?.PLANO;
  if (!plano || plano.saliencias === undefined) return [];
  return normalizarSaliencias(plano.saliencias);
}
