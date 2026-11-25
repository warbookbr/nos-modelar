/* braco-de-prova/rolamento — o rolamento do lado de trás do ombro, na face de fora da parede de trás do garfo.
 *
 * Quarta etapa da montagem `braco-de-prova/montagem.json`. Do alinhamento: o primeiro elo apoiado de um lado pelo eixo da
 * planetária e do outro por um rolamento. Medida do esboço escolhido (opção C): 28 mm de diâmetro e 7 mm de largura; o furo
 * de 8 mm recebe o pino do primeiro elo (folga de 0,05 mm no raio). O rolamento não está no pedido inicial e a medida é
 * estimativa (um 608 tem 22 mm; o de 28 mm é o do esboço).
 *
 * Referencial: o da montagem (ver `../../comum/blocos.mjs`).
 *
 * Portas: `face` (plano, apoia, normal +z, na face de dentro do rolamento) e `furo` (cilindro interno, eixo +z).
 */
import { passosDasFormas, aliasesDasFormas, porta, origemDa, MATERIAIS as CORES } from '../../comum/blocos.mjs';

export const TABELA = {
  alturaDoEixo: 140,
  /* Face de fora da parede de trás do garfo. */
  faceDoGarfo: -51,
  raioExterno: 14,
  largura: 7,
  raioDoFuro: 4.05,
};

export const MATERIAIS = CORES;

export function derivar(t = TABELA) {
  const z0 = t.faceDoGarfo - t.largura;
  return [
    { nome: 'rolamento', material: 'aco', eixo: 'z', base: [0, t.alturaDoEixo, z0], comprimento: t.largura, raio: t.raioExterno, lados: 36,
      furos: [{ eixo: 'z', base: [0, t.alturaDoEixo, z0 - 1], comprimento: t.largura + 2, raio: t.raioDoFuro, lados: 18 }] },
  ];
}

export const ALIASES = aliasesDasFormas(derivar(TABELA));

export function gerarPassos(t = TABELA) {
  const formas = derivar(t);
  const { passos } = passosDasFormas(formas);
  passos.push(porta('face', origemDa(formas, 'rolamento'), { forma: 'plano', papel: 'apoia', ponto: [0, t.alturaDoEixo, t.faceDoGarfo], normal: [0, 0, 1], extensao: [28, 28] }));
  passos.push(porta('furo', origemDa(formas, 'rolamento'), {
    forma: 'cilindro', papel: 'interna', eixo: [0, 0, 1], centro: [0, t.alturaDoEixo, t.faceDoGarfo - t.largura], raio: t.raioDoFuro, inicio: 0, fim: t.largura,
  }));
  return passos;
}

const receita = {
  meta: { nome: 'braco-de-prova/rolamento', desc: 'rolamento do ombro do braço de prova: anel de aço de 28 mm por 7 mm com furo de 8 mm, na face de fora da parede de trás do garfo' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'chão, sob o eixo do ombro; y para cima, x ao longo do braço esticado, +z para a frente' },
  PLANO: {
    objeto: 'rolamento do lado de trás do ombro, onde gira o pino do primeiro elo',
    referencias: ['../../../../../docs/modelar/banco-de-provas/braco-de-prova-2026-11-23/elos-opcoes.png'],
    escala: { medida: 'diâmetro externo', milimetros: 28 },
    partes: [
      { nome: 'rolamento', forma: 'anel de 28 mm de diâmetro, 7 mm de largura e furo de 8,1 mm, no eixo do ombro, fora da parede de trás', tecnica: 'cilindro com furo por subtração' },
    ],
    criteriosDeReprovacao: [
      'rolamento fora do eixo do ombro',
      'rolamento solto da parede de trás do garfo ou atravessando-a',
      'furo menor que o pino do elo',
    ],
  },
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
