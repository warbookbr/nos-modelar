/* variantes.js — as variantes de uma receita: a mesma receita rodada com trocas de valores na TABELA, para a pessoa escolher entre
 * opções de forma pelo que a peça consegue ser.
 *
 * A receita declara `VARIANTES` (export nomeado do módulo ou campo da receita): `[{ nome, nota, tabela: { chave: valor, ... } }]`.
 * A chave é o nome de um campo da TABELA, ou o caminho com ponto de um campo dentro de um objeto dela (`chapa.espessura`), e o
 * valor substitui o da tabela inteiro. A chave que não existe na tabela é recusada com as chaves que existem, para a variante não
 * sair igual à aceita por um nome errado.
 *
 * A troca não toca a receita: cada variante é uma cópia por descritores com `PARAMS` novo (a regra da skill criar-peca, porque
 * `PASSOS` é getter e `{ ...receita }` o avaliaria com a tabela velha), e a tabela da cópia é um clone da original com as trocas.
 * A variante com os valores da receita dá a mesma malha da receita, pelo hash do neutroCanonico, e é o que o teste do gate 2 do
 * plano confere. Núcleo puro: recebe o módulo já importado. */
import { executarReceita } from '../../../src/autoria/executar-receita.js';

const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export class RecusaDaVariante extends Error {
  constructor(motivo) { super(motivo); this.name = 'RecusaDaVariante'; }
}

/** A receita e a tabela de um módulo de receita. */
export function receitaETabela(modulo) {
  const receita = modulo.default ?? Object.values(modulo).find((v) => ehObjeto(v) && 'PASSOS' in v);
  if (!receita) throw new RecusaDaVariante('o módulo não exporta uma receita com PASSOS');
  const tabela = receita.PARAMS ?? receita.TABELA ?? modulo.TABELA;
  if (!ehObjeto(tabela)) throw new RecusaDaVariante('a receita não tem TABELA (PARAMS) para trocar valores');
  return { receita, tabela };
}

/** As variantes declaradas, validadas. */
export function lerVariantes(modulo) {
  const { receita } = receitaETabela(modulo);
  const variantes = modulo.VARIANTES ?? receita.VARIANTES;
  if (!Array.isArray(variantes) || !variantes.length) throw new RecusaDaVariante('a receita não declara VARIANTES: [{ nome, nota, tabela: { chave: valor } }]');
  const nomes = new Set();
  variantes.forEach((v, i) => {
    if (!ehObjeto(v) || typeof v.nome !== 'string' || !v.nome.trim()) throw new RecusaDaVariante(`VARIANTES[${i}] precisa de "nome"`);
    if (nomes.has(v.nome)) throw new RecusaDaVariante(`VARIANTES[${i}]: nome "${v.nome}" repetido`);
    nomes.add(v.nome);
    if (!ehObjeto(v.tabela)) throw new RecusaDaVariante(`VARIANTES[${i}] ("${v.nome}") precisa de "tabela": { chave: valor }`);
    for (const k of Object.keys(v)) if (!['nome', 'nota', 'tabela'].includes(k)) throw new RecusaDaVariante(`VARIANTES[${i}] ("${v.nome}"): campo "${k}" não existe (nome, nota e tabela)`);
  });
  return variantes;
}

/** A tabela com as trocas: um clone, com cada chave (ou caminho com ponto) substituída. */
export function aplicarTrocas(tabela, trocas, rotulo = 'variante') {
  const nova = structuredClone(tabela);
  for (const [chave, valor] of Object.entries(trocas)) {
    const caminho = chave.split('.');
    let alvo = nova;
    for (const [i, parte] of caminho.entries()) {
      if (!ehObjeto(alvo) || !(parte in alvo)) {
        const onde = caminho.slice(0, i).join('.');
        throw new RecusaDaVariante(`${rotulo}: a chave "${chave}" não existe na TABELA${onde ? ` (em ${onde})` : ''}; as chaves são ${Object.keys(ehObjeto(alvo) ? alvo : {}).join(', ')}`);
      }
      if (i === caminho.length - 1) alvo[parte] = structuredClone(valor);
      else alvo = alvo[parte];
    }
  }
  return nova;
}

/** A cópia da receita com outra tabela, por descritores. */
export function receitaComTabela(receita, tabela) {
  const copia = Object.defineProperties({}, Object.getOwnPropertyDescriptors(receita));
  Object.defineProperty(copia, 'PARAMS', { value: tabela, enumerable: true, writable: true, configurable: true });
  if ('TABELA' in receita) Object.defineProperty(copia, 'TABELA', { value: tabela, enumerable: true, writable: true, configurable: true });
  return copia;
}

/** As receitas das variantes, executadas: `[{ nome, nota, trocas, receita, neutro }]`. */
export function receitasDasVariantes(modulo) {
  const { receita, tabela } = receitaETabela(modulo);
  return lerVariantes(modulo).map((v) => {
    const copia = receitaComTabela(receita, aplicarTrocas(tabela, v.tabela, `variante "${v.nome}"`));
    const { neutro } = executarReceita(copia);
    if (neutro.orfaos?.length) throw new RecusaDaVariante(`variante "${v.nome}": o núcleo recusou: ${neutro.orfaos.slice(0, 2).map((o) => `${o.op}: ${o.motivo}`).join('; ')}`);
    return { nome: v.nome, nota: v.nota ?? '', trocas: v.tabela, receita: copia, neutro };
  });
}
