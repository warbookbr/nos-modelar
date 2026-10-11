/* razoes-da-peca.js — as razões que a receita declara, medidas na malha da peça executada.
 *
 * Uma razão é `mede: { razao: [A, B], faixa: [min, max] }` com A e B as medidas que o `--medidas` do esboço já conhece (as
 * mesmas de `medidas-na-blocagem.js`: `alturaTotal`, `larguraTotal`, `profundidadeTotal`, `{ caixa, formas }`, `{ distancia, eixo }`),
 * para a proporção que a ficha ou a foto dão sem dar o tamanho: a picape cuja altura é de 0,30 a 0,40 do comprimento. A receita as
 * escreve em `RAZOES`, ao lado de `PLANO`:
 *
 *   RAZOES: [
 *     { nome: 'alturaPeloComprimento', origem: 'ficha', mede: { razao: ['alturaTotal', 'profundidadeTotal'], faixa: [0.30, 0.40] } },
 *   ]
 *
 * AS FORMAS DA MEDIDA SÃO AS PARTES DA PEÇA. `{ caixa: 'y', formas: ['corpo', 'cabine*'] }` mede o envelope das partes com esse nome
 * (id ou padrão com `*`), em milímetro, sobre os vértices das faces delas; `<parte>.+y` e as outras cinco faces valem o meio da
 * face do envelope da parte, `<parte>.centro` o centro dele, e um ponto pode ser um vetor [x, y, z] em milímetro. É a conta de
 * `lerMedidasNoDado`, a mesma que o esboço faz sobre as caixas das formas dele, com as partes no lugar das formas: nada é medido
 * duas vezes por duas implementações.
 *
 * UMA RAZÃO QUE NÃO SE LÊ (parte que não existe, âncora que a parte não tem, denominador zero) não é aprovada nem ignorada: o
 * resultado traz `lida: false` com o motivo, e o veredito a trata como declaração errada. Puro e determinístico. */
import { lerMedidasNoDado } from './medidas-na-blocagem.js';

export const ORIGENS_DA_RAZAO = Object.freeze(['ficha', 'foto', 'ia', 'referencia']);
const MM_POR_METRO = 1000;
const EIXOS = ['x', 'y', 'z'];
const TOTAIS = ['alturaTotal', 'larguraTotal', 'profundidadeTotal'];

const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const falhar = (onde, mensagem) => { throw new TypeError(`RAZOES${onde}: ${mensagem}`); };

/* Uma expressão que a razão aceita como operando. A conta de verdade e os motivos de não leitura são de `medidas-na-blocagem.js`. */
function operando(q, onde) {
  if (typeof q === 'string') {
    if (!TOTAIS.includes(q)) falhar(onde, `'${q}' não é uma medida (${TOTAIS.join(', ')}, { caixa, formas } ou { distancia, eixo }).`);
    return q;
  }
  if (!objeto(q)) falhar(onde, 'cada operando é uma medida: "alturaTotal", { caixa, formas } ou { distancia, eixo }.');
  if (q.razao !== undefined) falhar(onde, 'uma razão não entra em outra razão; A e B são medidas em milímetro.');
  if (q.caixa !== undefined) {
    if (!EIXOS.includes(q.caixa)) falhar(onde, `'caixa' precisa ser um eixo (x, y ou z); recebeu ${JSON.stringify(q.caixa)}.`);
    if (q.formas !== undefined && !(Array.isArray(q.formas) && q.formas.length > 0 && q.formas.every((f) => typeof f === 'string' && f))) {
      falhar(onde, "'formas' precisa ser uma lista de nomes de parte (ou padrões com *), ou faltar para medir a peça toda.");
    }
    return { caixa: q.caixa, ...(q.formas ? { formas: [...q.formas] } : {}) };
  }
  if (q.distancia !== undefined) {
    const ponto = (p) => typeof p === 'string' || (Array.isArray(p) && p.length === 3 && p.every(Number.isFinite));
    if (!(Array.isArray(q.distancia) && q.distancia.length === 2 && q.distancia.every(ponto))) falhar(onde, "'distancia' precisa ser [A, B], com cada ponto '<parte>.<ancora>' ou um vetor [x, y, z] em milímetro.");
    if (q.eixo !== undefined && !EIXOS.includes(q.eixo)) falhar(onde, `'eixo' precisa ser x, y ou z; recebeu ${JSON.stringify(q.eixo)}.`);
    return { distancia: [...q.distancia], ...(q.eixo ? { eixo: q.eixo } : {}) };
  }
  return falhar(onde, `o operando ${JSON.stringify(q)} não é uma medida (use alturaTotal, { caixa, formas } ou { distancia, eixo }).`);
}

/** Valida a lista `RAZOES` de uma receita. `undefined` e `null` significam que ela não declara razão nenhuma e voltam `null`. */
export function normalizarRazoesDaPeca(valor) {
  if (valor === undefined || valor === null) return null;
  if (!Array.isArray(valor) || valor.length === 0) falhar('', 'precisa ser uma lista com ao menos uma razão, ou faltar.');
  const nomes = new Set();
  return valor.map((r, i) => {
    const onde = `[${i}]`;
    if (!objeto(r)) falhar(onde, 'cada razão é um objeto { nome, origem, mede: { razao: [A, B], faixa: [min, max] } }.');
    for (const k of Object.keys(r)) if (!['nome', 'origem', 'mede'].includes(k)) falhar(onde, `o campo '${k}' não existe; uma razão tem nome, origem e mede (sem valor, unidade nem tolerância: a faixa diz o que vale).`);
    if (typeof r.nome !== 'string' || !r.nome.trim()) falhar(onde, "falta o 'nome', texto curto que identifica a razão.");
    if (nomes.has(r.nome)) falhar(onde, `o nome '${r.nome}' está repetido.`);
    nomes.add(r.nome);
    if (!ORIGENS_DA_RAZAO.includes(r.origem)) falhar(`${onde} ('${r.nome}')`, `'origem' precisa ser uma de ${ORIGENS_DA_RAZAO.join(', ')}; recebeu ${JSON.stringify(r.origem)}.`);
    if (!objeto(r.mede) || !Array.isArray(r.mede.razao) || r.mede.razao.length !== 2) falhar(`${onde} ('${r.nome}')`, "'mede' precisa ser { razao: [A, B], faixa: [min, max] }.");
    for (const k of Object.keys(r.mede)) if (!['razao', 'faixa'].includes(k)) falhar(`${onde} ('${r.nome}')`, `'mede.${k}' não existe; uma razão tem razao e faixa.`);
    const faixa = r.mede.faixa;
    if (!(Array.isArray(faixa) && faixa.length === 2 && faixa.every((x) => typeof x === 'number' && Number.isFinite(x)) && faixa[0] >= 0 && faixa[0] < faixa[1])) {
      falhar(`${onde} ('${r.nome}')`, `'mede.faixa' precisa ser [min, max] com 0 <= min < max; recebeu ${JSON.stringify(faixa)}.`);
    }
    return { nome: r.nome.trim(), origem: r.origem, mede: { razao: r.mede.razao.map((q, j) => operando(q, `${onde} ('${r.nome}').mede.razao[${j}]`)), faixa: [...faixa] } };
  });
}

/* As partes da peça como as formas que a leitura do esboço conhece: a caixa do envelope e o centro, em milímetro. */
function formasDasPartes(neutro) {
  const caixas = new Map();
  for (const face of neutro.F.values()) {
    if (!face.parte) continue;
    if (!caixas.has(face.parte)) caixas.set(face.parte, { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
    const c = caixas.get(face.parte);
    for (const v of face.vs) {
      const p = neutro.V.get(v);
      if (!p) continue;
      for (let i = 0; i < 3; i++) { const mm = p[i] * MM_POR_METRO; if (mm < c.min[i]) c.min[i] = mm; if (mm > c.max[i]) c.max[i] = mm; }
    }
  }
  return [...caixas.keys()].sort().map((id) => {
    const caixa = caixas.get(id);
    return { id, tipo: 'parte', oculto: false, geometria: { caixa, ancoras: { centro: caixa.min.map((m, i) => (m + caixa.max[i]) / 2) } } };
  });
}

/** Mede as razões na malha da peça. Devolve `{ ok, medidas, resumo }`; cada medida traz `nome`, `origem`, `faixa` e, lida, `medido`,
 *  `a_mm`, `b_mm`, `ok` e `desvio` (até a faixa, zero dentro dela); a que não se lê traz `lida: false` e o `motivo`. `ok` só vale
 *  quando todas se leram e estão na faixa. */
export function conferirRazoesDaPeca({ razoes, neutro }) {
  const dados = { opcao: { numero: 1 }, pontos: {}, formas: formasDasPartes(neutro) };
  const leitura = lerMedidasNoDado({ dados, medidas: razoes });
  return { ok: leitura.medidas.every((m) => m.lida && m.ok), medidas: leitura.medidas, resumo: leitura.resumo };
}

const pt = (x) => String(x).replace('.', ',');

/** A razão que não se leu ou ficou fora da faixa, em uma frase. */
export function textoDaRazao(m) {
  if (!m.lida) return `${m.nome}: não pôde ser lida (${m.motivo})`;
  return `${m.nome}: razão ${pt(m.medido)} (${pt(m.a_mm)} mm sobre ${pt(m.b_mm)} mm) ${m.ok ? 'dentro' : `${m.desvio < 0 ? 'abaixo' : 'acima'} da faixa ${pt(m.faixa[0])} a ${pt(m.faixa[1])} por ${pt(Math.abs(m.desvio))}`} (origem: ${m.origem})`;
}
