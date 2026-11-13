/* ponto-perdido/receita.js — peça de prova da porta de avisos das operações de composição: um cilindro de 40 pontos por fatia feito por `corpoPorFatias` com a volta
 * de 8 pontos, de modo que a reamostragem deixa pontos dados longe da volta. A receita exporta o resultado em `COMPOSICOES`, e o `descrever` mostra o aviso `pontoPerdido`. */
import { corpoPorFatias } from '../../../../procedural/nucleo/corpo-por-fatias.js';

const circulo = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
export const TABELA = { raio: 30, comprimento: 50, pontosDados: 40, pontosDaVolta: 8 };

export function corpo(T = TABELA) {
  return corpoPorFatias({
    nome: 'c', eixo: 'x', pontos: T.pontosDaVolta,
    fatias: [{ em: 0, contorno: circulo(T.raio, T.pontosDados) }, { em: T.comprimento, contorno: circulo(T.raio, T.pontosDados) }],
  });
}

export default {
  meta: { nome: 'corpo-por-fatias/ponto-perdido', desc: 'cilindro por fatias com a volta pobre, para o aviso de ponto perdido chegar ao descrever' },
  TABELA,
  PARAMS: TABELA,
  get TOPO() { return { ...corpo(this.PARAMS).pontos }; },
  get PASSOS() { return [['subdivisao', { origemId: 1, ...corpo(this.PARAMS).passo, niveis: 1 }], ['parte', { nome: 'corpo', sel: { origem: { op: 'subdivisao', id: 1 } } }]]; },
  get COMPOSICOES() { return [{ operacao: 'corpoPorFatias', resultado: corpo(this.PARAMS), parte: 'corpo' }]; },
};
