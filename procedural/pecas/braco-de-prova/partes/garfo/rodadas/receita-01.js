/* braco-de-prova/garfo — o garfo do ombro: duas paredes laranja de 12 mm, a 90 mm uma da outra, presas no topo da base.
 *
 * Segunda etapa da montagem `braco-de-prova/montagem.json`. Do alinhamento (banco de provas braco-de-prova-2026-11-23): o
 * ombro em garfo, com o primeiro elo apoiado de um lado pelo eixo da planetária e do outro por um rolamento; medidas do
 * esboço escolhido (opção C de `elos-opcoes.esboco.mjs`): paredes de 70 × 122 × 12 mm, centros em z = ±45, eixo do ombro a
 * 140 mm do chão.
 *
 * Referencial: o da montagem (ver `../../comum/blocos.mjs`). A parede da frente (+z) leva o furo de passagem do eixo de 14 mm da
 * planetária (folga de 1 mm no raio); a de trás, o furo do pino do elo, que gira no rolamento (folga de 1 mm no raio).
 *
 * Portas: `apoio` (plano, apoia, no chão do garfo, normal −y), `faceDoMotor` (plano, recebe, face de fora da parede da
 * frente, normal +z) e `faceDoRolamento` (plano, recebe, face de fora da parede de trás, normal −z).
 */
import { passosDasFormas, aliasesDasFormas, porta, origemDa, MATERIAIS as CORES } from '../../../comum/blocos.mjs';

export const TABELA = {
  /* Topo da base, onde o garfo se apoia. */
  apoio: 50,
  alturaDoEixo: 140,
  largura: 70,
  /* 122 mm: os M5 de cima da planetária (a 23,6 mm acima do eixo) ficam a 5,7 mm da borda de cima. */
  altura: 122,
  espessura: 12,
  /* Face de dentro de cada parede; as paredes ficam de 39 a 51 mm do plano do braço, centros a 90 mm. */
  vaoInterno: 39,
  /* A passagem da frente recebe o ressalto de saída da planetária (32 mm), com 0,5 mm de folga no raio. */
  raioDaPassagemDoMotor: 16.5,
  raioDaPassagemDoPino: 5,
  chanfro: 3,
  /* Os quatro M5 da planetária no quadrado de 47,14 mm, passantes na parede da frente. */
  passoDosFurosM5: 47.14,
  raioDoFuroM5: 2.75,
  /* Dois M3 de baixo para cima em cada parede, cegos de 12 mm, que prendem o garfo na tampa da base. */
  xDosFurosM3: 25,
  raioDoFuroM3: 1.7,
  fundoDoFuroM3: 12,
  /* As nervuras: uma no meio de cada parede, por fora, do apoio até 50 mm de altura, de 12 mm de largura e 14 mm de saída,
     abaixo da planetária e do rolamento e longe do botão de parada. */
  alturaDaNervura: 50,
  larguraDaNervura: 12,
  saidaDaNervura: 14,
  chanfroDaNervura: 1.5,
};

export const MATERIAIS = CORES;

export function derivar(t = TABELA) {
  const x = [-t.largura / 2, t.largura / 2];
  const y = [t.apoio, t.apoio + t.altura];
  const fora = t.vaoInterno + t.espessura;
  const passagem = (z0, raio) => ({ eixo: 'z', base: [0, t.alturaDoEixo, z0], comprimento: t.espessura + 2, raio, lados: 36 });
  const m5 = [-1, 1].flatMap((sx) => [-1, 1].map((sy) => ({
    eixo: 'z', base: [(sx * t.passoDosFurosM5) / 2, t.alturaDoEixo + (sy * t.passoDosFurosM5) / 2, t.vaoInterno - 1], comprimento: t.espessura + 2, raio: t.raioDoFuroM5, lados: 12,
  })));
  const m3 = (zc) => [-1, 1].map((sx) => ({ eixo: 'y', base: [sx * t.xDosFurosM3, t.apoio - 1, zc], comprimento: t.fundoDoFuroM3 + 1, raio: t.raioDoFuroM3, lados: 12 }));
  const meio = t.vaoInterno + t.espessura / 2;
  const nervura = (nome, sz) => {
    const xs = [-t.larguraDaNervura / 2, t.larguraDaNervura / 2];
    const zs = sz > 0 ? [fora, fora + t.saidaDaNervura] : [-fora - t.saidaDaNervura, -fora];
    return { nome, material: 'laranja', chanfro: t.chanfroDaNervura, caixa: [...xs, t.apoio, t.apoio + t.alturaDaNervura, ...zs] };
  };
  return [
    { nome: 'paredeDaFrente', material: 'laranja', chanfro: t.chanfro, caixa: [...x, ...y, t.vaoInterno, fora], furos: [passagem(t.vaoInterno - 1, t.raioDaPassagemDoMotor), ...m5, ...m3(meio)] },
    { nome: 'paredeDeTras', material: 'laranja', chanfro: t.chanfro, caixa: [...x, ...y, -fora, -t.vaoInterno], furos: [passagem(-fora - 1, t.raioDaPassagemDoPino), ...m3(-meio)] },
    nervura('nervuraDaFrente', 1),
    nervura('nervuraDeTras', -1),
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
  meta: { nome: 'braco-de-prova/garfo', desc: 'garfo do ombro do braço de prova: duas paredes laranja de 70 × 122 × 12 mm, a 90 mm uma da outra, com a passagem do eixo da planetária na da frente e a do pino do elo na de trás' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'chão, sob o eixo do ombro; y para cima, x ao longo do braço esticado, +z para a frente' },
  PLANO: {
    objeto: 'garfo do ombro do braço de prova, duas paredes paralelas presas no topo da base',
    referencias: ['../../../../../docs/modelar/banco-de-provas/braco-de-prova-2026-11-23/elos-opcoes.png'],
    escala: { medida: 'distância entre os centros das paredes', milimetros: 90 },
    partes: [
      { nome: 'paredeDaFrente', forma: 'parede de 70 × 122 × 12 mm, de z 39 a 51, com o furo de 33 mm do ressalto da planetária no eixo do ombro, os quatro M5 dela e dois M3 de baixo', tecnica: 'caixa chanfrada com furos por subtração' },
      { nome: 'paredeDeTras', forma: 'parede de 70 × 122 × 12 mm, de z −51 a −39, com o furo de 10 mm do pino do elo no eixo do ombro e dois M3 de baixo', tecnica: 'caixa chanfrada com furos por subtração' },
      { nome: 'nervuraDaFrente', forma: 'nervura de 12 × 50 × 14 mm no meio da parede da frente, por fora, abaixo da planetária', tecnica: 'caixa chanfrada' },
      { nome: 'nervuraDeTras', forma: 'nervura de 12 × 50 × 14 mm no meio da parede de trás, por fora, abaixo do rolamento', tecnica: 'caixa chanfrada' },
    ],
    criteriosDeReprovacao: [
      'paredes com espessura diferente de 12 mm ou a outra distância entre elas',
      'parede fora do topo da base ou solta dela',
      'furo da parede fora do eixo do ombro, ou sem folga para o eixo que passa nele',
      'garfo em outra cor que não o laranja',
    ],
  },
  contatos: [
    { par: ['nervuraDaFrente', 'paredeDaFrente'], motivo: 'a nervura escora a parede por fora' },
    { par: ['nervuraDeTras', 'paredeDeTras'], motivo: 'a nervura escora a parede por fora' },
  ],
  /* As duas paredes só se ligam pela base, na montagem. */
  ilhas: [{ contem: 'paredeDeTras', motivo: 'as paredes do garfo são presas uma a uma no topo da base, e só a base as liga' }],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
