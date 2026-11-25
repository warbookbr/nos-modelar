/* braco-de-prova/motor-cotovelo — o NEMA 17 do cotovelo, preso do lado de fora da parede de trás do primeiro elo, perto do
 * ombro, com o eixo entrando no U.
 *
 * Sexta etapa da montagem `braco-de-prova/montagem.json`. Componente comprado como bloco com o eixo (filtro do plano: a
 * caixa e o eixo do item `componente`). Medidas do pedido inicial da mecatrônica: 42,3 × 42,3 × 40 mm, eixo de 5 × 24 mm.
 * Posição do alinhamento: na ponta de trás do primeiro elo, a 80 mm do ombro, como no esboço escolhido (opção C).
 *
 * Referencial: o da montagem (ver `../../comum/blocos.mjs`).
 *
 * Portas: `face` (plano, apoia, normal +z, na face do eixo) e `eixo` (cilindro externo, eixo +z, com o centro na face do
 * motor), onde a polia pequena se prende.
 */
import { passosDasFormas, aliasesDasFormas, porta, origemDa, MATERIAIS as CORES } from '../../comum/blocos.mjs';

export const TABELA = {
  alturaDoEixo: 140,
  eixoDoMotor: 80,
  /* Face de fora da parede de trás do primeiro elo. */
  faceDoElo: -26,
  lado: 42.3,
  comprimento: 40,
  raioDoEixo: 2.5,
  comprimentoDoEixo: 24,
  chanfro: 2,
  /* A flange do NEMA 17 (NEMA ICS 16): quatro furos M3 no quadrado de 31 mm, 4,5 mm de fundo, e o ressalto de 22 mm por
     2 mm em volta do eixo. */
  passoDosFuros: 31,
  raioDoFuroM3: 1.5,
  fundoDoFuro: 4.5,
  raioDoRessalto: 11,
  alturaDoRessalto: 2,
};

export const MATERIAIS = CORES;

/* Os quatro furos cegos da flange, abertos na face do eixo. */
const furosDaFlange = (t) => [-1, 1].flatMap((sx) => [-1, 1].map((sy) => ({
  eixo: 'z', base: [t.eixoDoMotor + (sx * t.passoDosFuros) / 2, t.alturaDoEixo + (sy * t.passoDosFuros) / 2, t.faceDoElo - t.fundoDoFuro],
  comprimento: t.fundoDoFuro + 1, raio: t.raioDoFuroM3, lados: 12,
})));

export function derivar(t = TABELA) {
  const h = t.lado / 2;
  return [
    { nome: 'motor', material: 'motor', chanfro: t.chanfro, caixa: [t.eixoDoMotor - h, t.eixoDoMotor + h, t.alturaDoEixo - h, t.alturaDoEixo + h, t.faceDoElo - t.comprimento, t.faceDoElo],
      furos: furosDaFlange(t) },
    { nome: 'ressalto', material: 'motor', eixo: 'z', base: [t.eixoDoMotor, t.alturaDoEixo, t.faceDoElo], comprimento: t.alturaDoRessalto, raio: t.raioDoRessalto, lados: 36 },
    { nome: 'eixo', material: 'aco', eixo: 'z', base: [t.eixoDoMotor, t.alturaDoEixo, t.faceDoElo], comprimento: t.comprimentoDoEixo, raio: t.raioDoEixo, lados: 18 },
  ];
}

export const ALIASES = aliasesDasFormas(derivar(TABELA));

export function gerarPassos(t = TABELA) {
  const formas = derivar(t);
  const { passos } = passosDasFormas(formas);
  passos.push(porta('face', origemDa(formas, 'motor'), { forma: 'plano', papel: 'apoia', ponto: [t.eixoDoMotor, t.alturaDoEixo, t.faceDoElo], normal: [0, 0, 1], extensao: [42.3, 42.3] }));
  passos.push(porta('eixo', origemDa(formas, 'eixo'), {
    forma: 'cilindro', papel: 'externa', eixo: [0, 0, 1], centro: [t.eixoDoMotor, t.alturaDoEixo, t.faceDoElo], raio: t.raioDoEixo, inicio: 0, fim: t.comprimentoDoEixo,
  }));
  return passos;
}

const receita = {
  meta: { nome: 'braco-de-prova/motor-cotovelo', desc: 'motor do cotovelo do braço de prova: NEMA 17 de 42,3 × 42,3 × 40 mm com eixo de 5 × 24 mm, preso fora da parede de trás do primeiro elo, a 80 mm do ombro' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'chão, sob o eixo do ombro; y para cima, x ao longo do braço esticado, +z para a frente' },
  PLANO: {
    objeto: 'NEMA 17 do cotovelo, como bloco com o eixo, preso no primeiro elo perto do ombro',
    referencias: ['../../../../../docs/modelar/banco-de-provas/braco-de-prova-2026-11-23/elos-opcoes.png'],
    escala: { medida: 'lado da caixa do NEMA 17', milimetros: 42.3 },
    partes: [
      { nome: 'motor', forma: 'bloco de 42,3 × 42,3 × 40 mm encostado na parede de trás do primeiro elo, com os quatro furos M3 da flange no quadrado de 31 mm', tecnica: 'caixa chanfrada com furos cegos por subtração' },
      { nome: 'ressalto', forma: 'ressalto de 22 × 2 mm em volta do eixo, dentro do furo da parede do elo', tecnica: 'cilindro' },
      { nome: 'eixo', forma: 'eixo de 5 × 24 mm, pelo furo da parede, até dentro da polia pequena', tecnica: 'cilindro' },
    ],
    criteriosDeReprovacao: [
      'caixa ou eixo com medida diferente da folha do pedido inicial',
      'motor solto da parede do elo ou atravessando-a',
      'motor em outra cor que não o preto',
    ],
  },
  contatos: [
    { par: ['eixo', 'motor'], motivo: 'o eixo sai da face do motor' },
    { par: ['eixo', 'ressalto'], motivo: 'o eixo passa pelo meio do ressalto da flange' },
    { par: ['motor', 'ressalto'], motivo: 'o ressalto sai da face do motor' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
