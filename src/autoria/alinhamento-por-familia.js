/* alinhamento-por-familia.js — as perguntas do alinhamento de uma família de objeto.
 *
 * O alinhamento antes de modelar levanta com a pessoa o que o objeto é; as regras de desenho da família (o campo `regras` de
 * `procedural/criterios/<família>.json`) acrescentam o que um objeto daquela família costuma esquecer. Cada regra traz a própria pergunta
 * do alinhamento, e a condição dela diz a que parte do objeto a pergunta se refere: com as partes já declaradas, só entram as regras cuja
 * parte existe; sem partes, entram todas. Objeto sem família usa o conjunto genérico daqui, curto de propósito.
 *
 * Puro: não lê arquivo. Quem lê o plano ou o alinhamento escrito é `tools/modelar/perguntas-do-alinhamento.mjs`. */
import { regrasDaFamilia } from './perguntas-do-critico.js';

/* O conjunto de reserva do objeto sem família. */
export const PERGUNTAS_GENERICAS = Object.freeze([
  Object.freeze({ id: 'como-funciona', pergunta: 'O que o objeto faz, o que se move em relação a quê e em que ordem uma pessoa o montaria?' }),
  Object.freeze({ id: 'carater-da-referencia', pergunta: 'Qual é o caráter de cada referência que não pode entrar no repositório (marca, prancha de terceiro), dito em uma frase literal?' }),
  Object.freeze({ id: 'partes-que-se-tocam', pergunta: 'Quais partes se tocam, por qual superfície e com que folga?' }),
  Object.freeze({ id: 'linhas-vizinhas', pergunta: 'Quais linhas de fresta, emenda e borda passam perto umas das outras?' }),
  Object.freeze({ id: 'o-que-reprova', pergunta: 'O que faria a pessoa reprovar este objeto à primeira vista?' }),
]);

/* As palavras de um texto escrito, em minúsculas, para a condição das regras casar com o que o alinhamento já cita. */
export function palavrasDoTexto(texto) {
  return [...new Set(String(texto).toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) ?? [])];
}

/* As perguntas do alinhamento: `criterios` é o arquivo da família (ou null), `presentes` são { componentes, formas } do objeto (ou null
   quando as partes ainda não existem). Cada item traz `id`, `pergunta`, `regra` (a frase literal) e `conferencia` quando houver. */
export function perguntasDoAlinhamento(criterios, presentes = null) {
  if (criterios === null || criterios === undefined || (criterios.regras ?? []).length === 0) {
    return { familia: criterios?.id ?? null, generico: true, itens: PERGUNTAS_GENERICAS.map((p) => ({ id: p.id, pergunta: p.pergunta })) };
  }
  const itens = regrasDaFamilia(criterios, presentes).map((r) => ({
    id: r.id, pergunta: r.perguntaDoAlinhamento, regra: r.texto, ...(r.conferencia === undefined ? {} : { conferencia: r.conferencia }),
  }));
  return { familia: criterios.id, generico: false, itens };
}

/* O texto que o comando imprime. */
export function textoDoAlinhamento({ familia, generico, itens }, { fonte = null } = {}) {
  const cabeca = generico
    ? `Perguntas gerais do alinhamento (${familia === null ? 'objeto sem família' : `a família '${familia}' ainda não tem regras`})${fonte ? `, para ${fonte}` : ''}:`
    : `Perguntas do alinhamento da família '${familia}' (${itens.length} regra(s) que valem para ${fonte ?? 'o objeto'}), além das fixas da skill:`;
  if (itens.length === 0) return `${cabeca}\n  nenhuma regra da família vale para as partes declaradas.`;
  return [cabeca, ...itens.map((it, i) => `  ${i + 1}. ${it.pergunta}${generico ? '' : `\n     regra [${it.id}]: ${it.regra}${it.conferencia ? ` (conferência: ${it.conferencia})` : ''}`}`)].join('\n');
}
