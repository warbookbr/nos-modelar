/* dobras-aceitas.js — a dobra, o vinco e o chanfro que a peça declara de propósito, com o motivo.
 *
 * As réguas de superfície (`tools/modelar/dobra-da-superficie.mjs`, de diedro agudo fora de vinco declarado, e `tools/modelar/vinco-oculto.mjs`, de vinco e
 * chanfro que ninguém declarou) acham feições da malha que a receita não pediu em nenhum passo. Parte delas é o desenho: a faceta de um refletor, a quina de
 * uma lataria que se dobra sem vinco de gaiola. A receita as aceita em `PLANO.dobrasAceitas`, ao lado de `criteriosDeReprovacao`, e as réguas deixam de
 * contá-las e as listam como aceitas, com o motivo, para ninguém ter de reler a malha para saber o que foi aceito.
 *
 * O CAMPO. `PLANO.dobrasAceitas: [{ parte, motivo, regiao, tipos? }]`:
 *  - `parte`: o nome de uma parte do plano. O achado vale quando a parte dele é essa (ou uma das que ele junta, `a+b`).
 *  - `motivo`: por que a feição é desenho, em pelo menos 15 caracteres, como o motivo de contato. Campo livre que aceita "ok" é campo que some.
 *  - `regiao`: `{ min: [x, y, z], max: [x, y, z] }`, obrigatória, em milímetro, no referencial da peça. O achado vale quando a cadeia inteira dele (a caixa
 *    dos vértices, `caixaMm`) cabe na caixa; a ponta que sai dela, onde havia nó ou ruga, volta a ser achado (2026-11-12). Aceitar a parte inteira esconderia também o defeito que aparecesse nela depois (decisão da pessoa, 2026-11-08).
 *  - `tipos`: subconjunto de 'dobra', 'vinco' e 'chanfro'; sem ele, os três.
 * O normalizador recusa: lista vazia ou com mais de 64 itens; parte que não está em `partes` do plano; motivo curto, longo, ou com UUID ou caminho
 * absoluto; região com os dois cantos iguais ou invertidos, ou com número que não é finito; tipo desconhecido ou repetido; chave que não é uma
 * das quatro; o mesmo item duas vezes. Plano sem o campo produz a mesma forma canônica de antes.
 *
 * COMO O FURGÃO O DECLARARIA (a receita dele é de outro plano; isto é só o formato). Os refletores do farol e da lanterna têm facetas aprovadas:
 *   dobrasAceitas: [
 *     { parte: 'refletorFarolEsquerdo', tipos: ['dobra', 'vinco'], regiao: { min: [460, 840, 2600], max: [870, 1080, 2750] }, motivo: 'facetas do refletor, aprovadas pela pessoa em 2026-11-07' },
 *     { parte: 'refletorFarolDireito', tipos: ['dobra', 'vinco'], regiao: { min: [-870, 840, 2600], max: [-460, 1080, 2750] }, motivo: 'facetas do refletor, aprovadas pela pessoa em 2026-11-07' },
 *     { parte: 'parachoqueDianteiro', tipos: ['vinco'], regiao: { min: [-1100, 280, 2300], max: [1100, 520, 2800] }, motivo: 'a quina do para-choque é desenho' },
 *   ] */

export const TIPOS_DE_ACHADO = Object.freeze(['dobra', 'vinco', 'chanfro']);
export const CAMPOS_DA_ACEITACAO = Object.freeze(['parte', 'motivo', 'regiao', 'tipos']);
export const MINIMO_DO_MOTIVO = 15;
const LIMITE_TEXTO = 240;
const LIMITE_LISTA = 64;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const ABSOLUTO = /^(?:[a-z]:\\|\\\\|\/|data:)/i;

function falhar(quem, mensagem) { throw new TypeError(`${quem}: ${mensagem}`); }

function canto(valor, quem, campo) {
  if (!Array.isArray(valor) || valor.length !== 3 || !valor.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    falhar(quem, `'${campo}' precisa ser [x, y, z], três números finitos em milímetro.`);
  }
  return [...valor];
}

/**
 * Valida e canonicaliza `PLANO.dobrasAceitas`. `nomesDasPartes` são os nomes das partes do plano. Devolve a lista ordenada por parte e motivo.
 */
export function normalizarDobrasAceitas(valor, nomesDasPartes, { quem = 'PLANO' } = {}) {
  const campo = 'dobrasAceitas';
  if (!Array.isArray(valor) || valor.length === 0 || valor.length > LIMITE_LISTA) {
    falhar(quem, `'${campo}' precisa ser lista não vazia com no máximo ${LIMITE_LISTA} itens, cada um { parte, motivo, regiao, tipos? }.`);
  }
  const itens = valor.map((item, i) => {
    const onde = `${campo}[${i}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) falhar(quem, `'${onde}' precisa ser objeto { parte, motivo, regiao, tipos? }.`);
    const alheia = Object.keys(item).find((c) => !CAMPOS_DA_ACEITACAO.includes(c));
    if (alheia) falhar(quem, `'${onde}.${alheia}' não é permitido; use ${CAMPOS_DA_ACEITACAO.join(', ')}.`);
    if (typeof item.parte !== 'string' || !nomesDasPartes.includes(item.parte.trim())) {
      falhar(quem, `'${onde}.parte' cita ${JSON.stringify(item.parte)}, que não está em 'partes' do plano (${nomesDasPartes.join(', ')}).`);
    }
    const motivo = typeof item.motivo === 'string' ? item.motivo.trim() : '';
    if (motivo.length < MINIMO_DO_MOTIVO) falhar(quem, `'${onde}.motivo' precisa dizer, em pelo menos ${MINIMO_DO_MOTIVO} caracteres, por que a feição é desenho.`);
    if (motivo.length > LIMITE_TEXTO) falhar(quem, `'${onde}.motivo' excede ${LIMITE_TEXTO} caracteres.`);
    if (UUID.test(motivo) || ABSOLUTO.test(motivo)) falhar(quem, `'${onde}.motivo' não pode conter UUID, caminho absoluto ou binário local.`);
    const aceita = { parte: item.parte.trim(), motivo };
    if (item.regiao === undefined) falhar(quem, `'${onde}.regiao' é obrigatória: a caixa { min: [x, y, z], max: [x, y, z] } em mm onde a feição é de propósito; aceitar a parte inteira esconderia o defeito que aparecesse nela depois.`);
    {
      if (!item.regiao || typeof item.regiao !== 'object' || Array.isArray(item.regiao) || Object.keys(item.regiao).some((c) => c !== 'min' && c !== 'max')) {
        falhar(quem, `'${onde}.regiao' precisa ser { min: [x, y, z], max: [x, y, z] }.`);
      }
      const min = canto(item.regiao.min, quem, `${onde}.regiao.min`); const max = canto(item.regiao.max, quem, `${onde}.regiao.max`);
      if (min.some((x, k) => !(x < max[k]))) falhar(quem, `'${onde}.regiao' tem min não menor que max em algum eixo; a caixa precisa ter volume.`);
      aceita.regiao = { min, max };
    }
    if (item.tipos !== undefined) {
      if (!Array.isArray(item.tipos) || item.tipos.length === 0) falhar(quem, `'${onde}.tipos' precisa ser lista não vazia de ${TIPOS_DE_ACHADO.join(', ')}.`);
      const ruim = item.tipos.find((t) => !TIPOS_DE_ACHADO.includes(t));
      if (ruim !== undefined) falhar(quem, `'${onde}.tipos' traz ${JSON.stringify(ruim)}; os tipos são ${TIPOS_DE_ACHADO.join(', ')}.`);
      if (new Set(item.tipos).size !== item.tipos.length) falhar(quem, `'${onde}.tipos' não pode repetir tipo.`);
      aceita.tipos = [...item.tipos].sort();
    }
    return aceita;
  });
  const chave = (a) => JSON.stringify(a);
  if (new Set(itens.map(chave)).size !== itens.length) falhar(quem, `'${campo}' não pode repetir item.`);
  return itens.sort((a, b) => (a.parte < b.parte ? -1 : a.parte > b.parte ? 1 : a.motivo < b.motivo ? -1 : a.motivo > b.motivo ? 1 : 0));
}

/**
 * A extensão de uma cadeia de arestas: `pontasMm` são os dois vértices mais distantes entre si (o mais longe do centro, e o mais longe dele) e `caixaMm` é a
 * caixa dos vértices, arredondada para fora na casa de 0,1 mm, para a borda de uma região justa não cair por arredondamento. `pontos` são em metro.
 */
export function extensaoDaCadeia(pontos) {
  const mm = pontos.map((p) => p.map((x) => x * 1000));
  const centro = [0, 1, 2].map((j) => mm.reduce((s, p) => s + p[j], 0) / mm.length);
  const maisLonge = (de) => mm.reduce((m, p) => (Math.hypot(p[0] - de[0], p[1] - de[1], p[2] - de[2]) > Math.hypot(m[0] - de[0], m[1] - de[1], m[2] - de[2]) ? p : m), mm[0]);
  const a = maisLonge(centro); const b = maisLonge(a);
  const lim = (f, k) => f(...mm.map((p) => p[k]));
  const fora = (x, f) => { const r = f(x * 10) / 10; return Object.is(r, -0) ? 0 : r; };
  const um = (x) => { const r = Math.round(x * 10) / 10; return Object.is(r, -0) ? 0 : r; };
  return {
    pontasMm: [a, b].sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2]).map((p) => p.map(um)),
    caixaMm: { min: [0, 1, 2].map((k) => fora(lim(Math.min, k), Math.floor)), max: [0, 1, 2].map((k) => fora(lim(Math.max, k), Math.ceil)) },
  };
}

/** A aceitação que cobre o achado `{ tipo, parte, posicaoMm, caixaMm? }`, ou null. Com `caixaMm` (a caixa da cadeia inteira), a região vale quando contém a caixa
 *  toda, e a ponta da cadeia que sai dela é achado; sem `caixaMm`, vale a posição, como antes. */
export function aceitacaoDe(aceitas, achado) {
  const partes = String(achado.parte ?? '').split('+');
  for (const a of aceitas ?? []) {
    if (!partes.includes(a.parte)) continue;
    if (a.tipos && !a.tipos.includes(achado.tipo)) continue;
    const pontos = achado.caixaMm ? [achado.caixaMm.min, achado.caixaMm.max] : [achado.posicaoMm];
    if (a.regiao && !pontos.every((p) => p.every((x, k) => x >= a.regiao.min[k] && x <= a.regiao.max[k]))) continue;
    return a;
  }
  return null;
}

/** Separa os achados em `{ aceitos: [{ ...achado, motivo }], restantes }`. */
export function separarAceitos(aceitas, achados) {
  const aceitos = []; const restantes = [];
  for (const a of achados) {
    const c = aceitacaoDe(aceitas, a);
    if (c) aceitos.push({ ...a, motivo: c.motivo }); else restantes.push(a);
  }
  return { aceitos, restantes };
}

/** As aceitações do `PLANO` de uma receita, normalizadas, ou [] quando ele não declara nenhuma. */
export function aceitasDaReceita(receita) {
  const plano = receita?.PLANO;
  if (!plano || plano.dobrasAceitas === undefined) return [];
  const nomes = Array.isArray(plano.partes) ? plano.partes.map((p) => p?.nome).filter((n) => typeof n === 'string') : [];
  return normalizarDobrasAceitas(plano.dobrasAceitas, nomes);
}
