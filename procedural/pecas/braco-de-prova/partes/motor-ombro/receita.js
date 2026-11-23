/* braco-de-prova/motor-ombro — o NEMA 23 com a redução planetária de 5:1, deitados no eixo do ombro, do lado de fora da
 * parede da frente do garfo.
 *
 * Terceira etapa da montagem `braco-de-prova/montagem.json`. Componentes comprados, como blocos com o eixo (filtro do plano
 * do braço de prova: a caixa e o eixo do item `componente`, sem família nova). Medidas do pedido inicial da mecatrônica:
 * NEMA 23 de 57 × 57 × 76 mm com eixo de 8 × 21 mm; planetária de 57 × 57 × 55 mm com eixo de saída de 14 × 25 mm.
 *
 * Referencial: o da montagem (ver `../../comum/blocos.mjs`). A face de saída da planetária (a flange) se apoia na face de fora da
 * parede da frente do garfo; o eixo de saída atravessa o furo da parede e encosta na parede da frente do primeiro elo. O
 * eixo do NEMA 23 entra num furo cego da planetária, do tamanho dele, e não atravessa nada.
 *
 * Portas: `flange` (plano, apoia, normal −z, na face de saída da planetária) e `eixoDeSaida` (cilindro externo, eixo +z, com o
 * centro na ponta do eixo de saída), onde o primeiro elo se prende.
 */
import { passosDasFormas, aliasesDasFormas, porta, origemDa, MATERIAIS as CORES } from '../../comum/blocos.mjs';

export const TABELA = {
  alturaDoEixo: 140,
  /* Face de fora da parede da frente do garfo, onde a flange da planetária se apoia. */
  faceDoGarfo: 51,
  ladoDaCaixa: 57,
  comprimentoDaPlanetaria: 55,
  comprimentoDoMotor: 76,
  raioDoEixoDeSaida: 7,
  comprimentoDoEixoDeSaida: 25,
  raioDoEixoDoMotor: 4,
  comprimentoDoEixoDoMotor: 21,
  chanfro: 2,
};

export const MATERIAIS = CORES;

export function derivar(t = TABELA) {
  const h = t.ladoDaCaixa / 2;
  const y = [t.alturaDoEixo - h, t.alturaDoEixo + h];
  const zPlanetaria = [t.faceDoGarfo, t.faceDoGarfo + t.comprimentoDaPlanetaria];
  const zMotor = [zPlanetaria[1], zPlanetaria[1] + t.comprimentoDoMotor];
  const baseDoEixoDoMotor = zPlanetaria[1] - t.comprimentoDoEixoDoMotor;
  return [
    { nome: 'planetaria', material: 'motor', chanfro: t.chanfro, caixa: [-h, h, ...y, ...zPlanetaria],
      furos: [{ eixo: 'z', base: [0, t.alturaDoEixo, baseDoEixoDoMotor], comprimento: t.comprimentoDoEixoDoMotor + 1, raio: t.raioDoEixoDoMotor, lados: 18 }] },
    { nome: 'motor', material: 'motor', chanfro: t.chanfro, caixa: [-h, h, ...y, ...zMotor] },
    { nome: 'eixoDeSaida', material: 'aco', eixo: 'z', base: [0, t.alturaDoEixo, t.faceDoGarfo - t.comprimentoDoEixoDeSaida], comprimento: t.comprimentoDoEixoDeSaida, raio: t.raioDoEixoDeSaida, lados: 18 },
    { nome: 'eixoDoMotor', material: 'aco', eixo: 'z', base: [0, t.alturaDoEixo, baseDoEixoDoMotor], comprimento: t.comprimentoDoEixoDoMotor, raio: t.raioDoEixoDoMotor, lados: 18 },
  ];
}

export const ALIASES = aliasesDasFormas(derivar(TABELA));

export function gerarPassos(t = TABELA) {
  const formas = derivar(t);
  const { passos } = passosDasFormas(formas);
  passos.push(porta('flange', origemDa(formas, 'planetaria'), { forma: 'plano', papel: 'apoia', ponto: [0, t.alturaDoEixo, t.faceDoGarfo], normal: [0, 0, -1], extensao: [57, 57] }));
  passos.push(porta('eixoDeSaida', origemDa(formas, 'eixoDeSaida'), {
    forma: 'cilindro', papel: 'externa', eixo: [0, 0, 1], centro: [0, t.alturaDoEixo, t.faceDoGarfo - t.comprimentoDoEixoDeSaida],
    raio: t.raioDoEixoDeSaida, inicio: 0, fim: t.comprimentoDoEixoDeSaida,
  }));
  return passos;
}

const receita = {
  meta: { nome: 'braco-de-prova/motor-ombro', desc: 'motor do ombro do braço de prova: NEMA 23 de 57 × 57 × 76 mm com a planetária de 5:1 de 57 × 57 × 55 mm, como blocos com os eixos, do lado de fora da parede da frente do garfo' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'chão, sob o eixo do ombro; y para cima, x ao longo do braço esticado, +z para a frente' },
  PLANO: {
    objeto: 'NEMA 23 com redução planetária de 5:1 no eixo do ombro, como blocos com flange e eixo',
    referencias: ['../../../../../docs/modelar/banco-de-provas/braco-de-prova-2026-11-23/elos-opcoes.png'],
    escala: { medida: 'lado da caixa do NEMA 23', milimetros: 57 },
    partes: [
      { nome: 'planetaria', forma: 'bloco de 57 × 57 × 55 mm, face de saída (flange) apoiada na parede da frente do garfo, com furo cego para o eixo do motor', tecnica: 'caixa chanfrada com furo por subtração' },
      { nome: 'motor', forma: 'bloco de 57 × 57 × 76 mm atrás da planetária', tecnica: 'caixa chanfrada' },
      { nome: 'eixoDeSaida', forma: 'eixo de 14 × 25 mm no eixo do ombro, pela passagem do garfo até o primeiro elo', tecnica: 'cilindro' },
      { nome: 'eixoDoMotor', forma: 'eixo de 8 × 21 mm dentro do furo cego da planetária', tecnica: 'cilindro' },
    ],
    criteriosDeReprovacao: [
      'caixa ou eixo com medida diferente da folha do pedido inicial',
      'eixo de saída fora do eixo do ombro',
      'planetária solta da parede do garfo ou atravessando-a',
      'motor em outra cor que não o preto',
    ],
  },
  contatos: [
    { par: ['eixoDeSaida', 'planetaria'], motivo: 'o eixo de saída sai da face da planetária' },
    { par: ['eixoDoMotor', 'motor'], motivo: 'o eixo sai da face do motor' },
    { par: ['eixoDoMotor', 'planetaria'], motivo: 'o eixo do motor entra justo no furo cego da planetária' },
    { par: ['motor', 'planetaria'], motivo: 'o motor é aparafusado na face de entrada da planetária' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
