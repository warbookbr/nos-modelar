/* peca-com-parametros.mjs — executa uma receita com parâmetros trocados e
   devolve a peça resolvida que o resolvedor de montagem lê.

   É o carregador que a montagem v5 pede quando uma peça deriva medidas das
   vizinhas (`carregarPecaComParametros`). Duas armadilhas conhecidas moram
   aqui, num lugar só:

   - `PASSOS` costuma ser um getter que lê `this.PARAMS`. Copiar a receita com
     `{ ...receita }` avalia o getter uma vez, com a tabela velha, e o valor
     novo não teria efeito nenhum. A cópia é feita por descritores.
   - Parâmetro que a receita não declara é recusado. Aceitar em silêncio faria
     um vínculo com nome errado passar sem mudar nada na peça. */
import { neutroCanonico } from '../../procedural/nucleo/entrada.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { FORMATO, VERSAO, parteDaFace } from '../../src/autoria/ler-peca-resolvida.js';

export function receitaComParametros(receita, parametros) {
  const base = receita.PARAMS ?? {};
  const desconhecidos = Object.keys(parametros).filter((nome) => !Object.hasOwn(base, nome)).sort();
  if (desconhecidos.length) {
    throw new Error(`a receita não declara o(s) parâmetro(s) ${desconhecidos.join(', ')}.`);
  }
  const copia = Object.defineProperties({}, Object.getOwnPropertyDescriptors(receita));
  Object.defineProperty(copia, 'PARAMS', { value: { ...base, ...parametros }, enumerable: true });
  return copia;
}

export function pecaResolvidaComParametros(ref, receita, parametros = {}) {
  const { neutro: bruto } = executarReceita(receitaComParametros(receita, parametros));
  if (bruto.orfaos.length) throw new Error(`${ref}: a receita deixou ${bruto.orfaos.length} órfão(s).`);
  const neutro = neutroCanonico(bruto);
  return {
    formato: FORMATO,
    versao: VERSAO,
    peca: ref,
    meta: { nome: receita.meta?.nome ?? ref },
    materiais: receita.MATERIAIS ?? {},
    partes: [...new Set(neutro.F.map(parteDaFace).filter(Boolean))].sort(),
    portas: [...bruto.portas.values()],
    V: neutro.V,
    F: neutro.F,
  };
}

/* Os dois carregadores do resolvedor a partir de um mapa ref → receita. */
export function carregadoresDeReceitas(receitas) {
  const receitaDe = (ref) => {
    if (!Object.hasOwn(receitas, ref)) throw new Error(`receita '${ref}' não existe.`);
    return receitas[ref];
  };
  return {
    carregarPeca: async (ref) => pecaResolvidaComParametros(ref, receitaDe(ref)),
    carregarPecaComParametros: async (ref, parametros) => pecaResolvidaComParametros(ref, receitaDe(ref), parametros),
  };
}
