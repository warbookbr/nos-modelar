/* varredura-prova.js — as três peças varridas de prova da `gaiolaVarrida`, desenhadas por código
 *
 * Nenhuma é de um objeto: servem só para provar a função geral. A régua é uma faixa reta de 1000 mm por 100 mm. O friso em arco é uma
 * aba de seção em degrau que sobe em torno de um eixo, com as duas pontas cortadas numa altura. A saia rolada é uma seção de quatro linhas
 * varrida em reta, com uma segunda superfície (o alargamento) em volta de um cilindro, a borda de baixo rolada e o topo aberto.
 * Nenhum número vem de referência externa. */

/** A régua: três linhas de seção, reta em z, estações a cada 100 mm. */
export function regua(extra = {}) {
  return {
    nome: 'regua',
    trilho: [{ reta: { de: [0, 0, 0], ate: [0, 0, 1000] } }],
    quadro: { u: [1, 0, 0] },
    secao: [{ u: 0, v: 0, nome: 'baixo' }, { u: 0, v: 50, nome: 'meio' }, { u: 0, v: 100, nome: 'cima' }],
    estacoes: [{ fracao: 0, nome: 'inicio' }, { passo: 100 }, { fracao: 1, nome: 'fim' }],
    fora: [1, 0, 0],
    ...extra,
  };
}

/** O friso em arco: meia volta em torno do eixo x, de raio 400 mm, cortada em y = 400 (subindo) e em y = 420 (descendo). */
export const ARCO = { centro: [500, 300, 0], raio: 400, corteDeFrente: 400, corteDeTras: 420 };
export function friso(extra = {}) {
  return {
    nome: 'friso',
    trilho: [{ arco: { centro: ARCO.centro, eixo: [1, 0, 0], de: [500, 300, 400], graus: -180 } }],
    quadro: { u: [1, 0, 0], virar: true },
    secao: [{ u: 0, v: 0, nome: 'boca' }, { u: 25, v: 20, nome: 'crista' }, { u: 25, v: 60, nome: 'fora' }],
    estacoes: [
      { plano: { eixo: 'y', valor: ARCO.corteDeFrente }, cruzando: 'subindo', nome: 'frente' },
      { entre: 12 },
      { plano: { eixo: 'y', valor: ARCO.corteDeTras }, cruzando: 'descendo', nome: 'tras' },
    ],
    fora: [1, 0, 0],
    ...extra,
  };
}

/** A saia rolada: reta em z de 1000 mm, alargamento em volta do eixo x por (y = 100, z = 500) com raio de 200 mm. */
export const SAIA = {
  perfil: [[0, 0], [20, 30], [100, 40], [150, 0]],
  cilindro: { eixo: [1, 0, 0], por: [0, 100, 500], raio: 200 },
  rolada: { abaixoDe: 30, razao: 1.5 },
};
export function saia(extra = {}, alargamento = {}) {
  return {
    nome: 'saia',
    trilho: [{ reta: { de: [0, 0, 0], ate: [0, 0, 1000] } }],
    quadro: { u: [1, 0, 0] },
    secao: [{ u: 10, v: 0, nome: 'borda' }, { u: 20, v: 10, nome: 'rolo' }, { u: 20, v: 80, nome: 'face' }, { u: -1, v: 150, nome: 'topo' }],
    estacoes: [{ fracao: 0 }, { passo: 50 }, { fracao: 1 }],
    fora: [1, 0, 0],
    alargamento: { campo: { cilindro: SAIA.cilindro }, perfil: SAIA.perfil, rolada: SAIA.rolada, ...alargamento },
    ...extra,
  };
}
