/* braco-de-prova/garfo — o garfo do ombro: duas paredes laranja de 12 mm, a 90 mm uma da outra, presas no topo da base.
 *
 * Segunda etapa da montagem `braco-de-prova/montagem.json`. Do alinhamento (banco de provas braco-de-prova-2026-11-23): o
 * ombro em garfo, com o primeiro elo apoiado de um lado pelo eixo da planetária e do outro por um rolamento; medidas do
 * esboço escolhido (opção C de `elos-opcoes.esboco.mjs`): paredes de 70 × 115 × 12 mm, centros em z = ±45, eixo do ombro a
 * 140 mm do chão.
 *
 * Referencial: o da montagem (ver `../../comum/blocos.mjs`). A parede da frente (+z) leva o furo de passagem do eixo de 14 mm da
 * planetária (folga de 1 mm no raio); a de trás, o furo do pino do elo, que gira no rolamento (folga de 1 mm no raio).
 *
 * Portas: `apoio` (plano, apoia, no chão do garfo, normal −y), `faceDoMotor` (plano, recebe, face de fora da parede da
 * frente, normal +z) e `faceDoRolamento` (plano, recebe, face de fora da parede de trás, normal −z).
 */
import { passosDasFormas, aliasesDasFormas, porta, origemDa, MATERIAIS as CORES } from '../../comum/blocos.mjs';

export const TABELA = {
  /* Topo da base, onde o garfo se apoia. */
  apoio: 50,
  alturaDoEixo: 140,
  largura: 70,
  altura: 115,
  espessura: 12,
  /* Face de dentro de cada parede; as paredes ficam de 39 a 51 mm do plano do braço, centros a 90 mm. */
  vaoInterno: 39,
  raioDaPassagemDoMotor: 8,
  raioDaPassagemDoPino: 5,
  chanfro: 3,
};

export const MATERIAIS = CORES;

export function derivar(t = TABELA) {
  const x = [-t.largura / 2, t.largura / 2];
  const y = [t.apoio, t.apoio + t.altura];
  const fora = t.vaoInterno + t.espessura;
  const passagem = (z0, raio) => ({ eixo: 'z', base: [0, t.alturaDoEixo, z0], comprimento: t.espessura + 2, raio });
  return [
    { nome: 'paredeDaFrente', material: 'laranja', chanfro: t.chanfro, caixa: [...x, ...y, t.vaoInterno, fora], furos: [passagem(t.vaoInterno - 1, t.raioDaPassagemDoMotor)] },
    { nome: 'paredeDeTras', material: 'laranja', chanfro: t.chanfro, caixa: [...x, ...y, -fora, -t.vaoInterno], furos: [passagem(-fora - 1, t.raioDaPassagemDoPino)] },
  ];
}

export const ALIASES = aliasesDasFormas(derivar(TABELA));

export function gerarPassos(t = TABELA) {
  const formas = derivar(t);
  const { passos } = passosDasFormas(formas);
  const fora = t.vaoInterno + t.espessura;
  passos.push(porta('apoio', origemDa(formas, 'paredeDaFrente'), { forma: 'plano', papel: 'apoia', ponto: [0, t.apoio, 0], normal: [0, -1, 0], extensao: [120, 120] }));
  passos.push(porta('faceDoMotor', origemDa(formas, 'paredeDaFrente'), { forma: 'plano', papel: 'recebe', ponto: [0, t.alturaDoEixo, fora], normal: [0, 0, 1], extensao: [57, 57] }));
  passos.push(porta('faceDoRolamento', origemDa(formas, 'paredeDeTras'), { forma: 'plano', papel: 'recebe', ponto: [0, t.alturaDoEixo, -fora], normal: [0, 0, -1], extensao: [28, 28] }));
  return passos;
}

const receita = {
  meta: { nome: 'braco-de-prova/garfo', desc: 'garfo do ombro do braço de prova: duas paredes laranja de 70 × 115 × 12 mm, a 90 mm uma da outra, com a passagem do eixo da planetária na da frente e a do pino do elo na de trás' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'chão, sob o eixo do ombro; y para cima, x ao longo do braço esticado, +z para a frente' },
  PLANO: {
    objeto: 'garfo do ombro do braço de prova, duas paredes paralelas presas no topo da base',
    referencias: ['../../../../../docs/modelar/banco-de-provas/braco-de-prova-2026-11-23/elos-opcoes.png'],
    escala: { medida: 'distância entre os centros das paredes', milimetros: 90 },
    partes: [
      { nome: 'paredeDaFrente', forma: 'parede de 70 × 115 × 12 mm, de z 39 a 51, com o furo de 16 mm do eixo da planetária no eixo do ombro', tecnica: 'caixa chanfrada com furo por subtração' },
      { nome: 'paredeDeTras', forma: 'parede de 70 × 115 × 12 mm, de z −51 a −39, com o furo de 10 mm do pino do elo no eixo do ombro', tecnica: 'caixa chanfrada com furo por subtração' },
    ],
    criteriosDeReprovacao: [
      'paredes com espessura diferente de 12 mm ou a outra distância entre elas',
      'parede fora do topo da base ou solta dela',
      'furo da parede fora do eixo do ombro, ou sem folga para o eixo que passa nele',
      'garfo em outra cor que não o laranja',
    ],
  },
  contatos: [],
  /* As duas paredes só se ligam pela base, na montagem. */
  ilhas: [{ contem: 'paredeDeTras', motivo: 'as paredes do garfo são presas uma a uma no topo da base, e só a base as liga' }],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
