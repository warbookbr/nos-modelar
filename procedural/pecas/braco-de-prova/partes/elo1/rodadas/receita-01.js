/* braco-de-prova/elo1 — o primeiro elo, um perfil em U aberto em cima, cinza-escuro, de 150 mm entre o eixo do ombro e o do
 * cotovelo, girando entre as paredes do garfo.
 *
 * Quinta etapa da montagem `braco-de-prova/montagem.json`. Do alinhamento (banco de provas braco-de-prova-2026-11-23): a
 * opção C, perfil em U aberto com a correia à mostra; o NEMA 17 preso perto do ombro, com as polias GT2 de 20 e 80 dentes e a
 * correia dentro do U até o cotovelo.
 *
 * O U tem duas paredes de 6 mm (faces de fora em z = ±26) e o fundo de 6 mm por baixo; o vão de dentro, de 40 mm, deixa
 * 17 mm de folga de cada lado da correia de 6 mm, e o fundo fica 3 mm abaixo do ponto mais baixo da correia. Na face de fora da parede
 * da frente, o cubo do ombro recebe 12 mm do eixo de saída da planetária, preso por um M3 radial; da parede de trás sai o pino de 8 mm que passa pelo garfo e gira
 * no rolamento. A parede de trás tem o furo de 23 mm onde assenta o ressalto do NEMA 17, com os quatro M3 da flange, e as duas paredes têm o furo de
 * 10 mm do eixo do cotovelo, que é do segundo elo.
 *
 * Referencial: o da montagem (ver `../../comum/blocos.mjs`); o braço esticado na horizontal, ao longo de +x.
 *
 * Portas: `juntaDoOmbro` (cilindro interno, eixo +z, no eixo do ombro, o furo do cubo a partir da face de fora da parede da frente), onde o eixo de
 * saída da planetária se prende; `assentoDoMotor` (plano, recebe, normal −z, na face de fora da parede de trás, no eixo do
 * NEMA 17) e `juntaDoCotovelo` (cilindro interno, eixo +z, centro no eixo do cotovelo na face de fora da parede de trás).
 */
import { passosDasFormas, aliasesDasFormas, porta, origemDa, MATERIAIS as CORES } from '../../../comum/blocos.mjs';

export const TABELA = {
  alturaDoEixo: 140,
  entreEixos: 150,
  /* Quanto o perfil passa do eixo do ombro para trás e do eixo do cotovelo para a frente. */
  sobraAtras: 30,
  sobraAFrente: 30,
  /* Metade do vão de dentro do U, espessura das paredes e do fundo. */
  meioVao: 20,
  parede: 6,
  fundo: 6,
  /* Faixa vertical do perfil: o fundo começa em y = 104 e as paredes sobem até y = 176. */
  baixo: 104,
  alto: 176,
  /* Eixo do NEMA 17, a 80 mm do ombro, e o furo por onde o eixo de 5 mm dele entra no U. */
  eixoDoMotor: 80,
  /* A passagem recebe o ressalto de 22 mm do NEMA 17, com 0,5 mm de folga no raio; os quatro M3 da flange, no quadrado de
     31 mm, atravessam a parede. */
  raioDaPassagemDoMotor: 11.5,
  passoDosFurosM3: 31,
  raioDoFuroM3: 1.7,
  /* As nervuras de dentro: uma aba de 6 × 6 mm no alto de cada parede, de ponta a ponta do perfil, que endurece a chapa
     longa; a 14 mm da correia em z. */
  aba: 6,
  raioDaPassagemDoCotovelo: 5,
  /* Pino do lado de trás do ombro: 8 mm, da parede até a face de fora do rolamento. */
  raioDoPino: 4,
  fimDoPino: -58,
  chanfro: 2,
  /* Cubo do ombro, na face de fora da parede da frente: recebe o eixo de saída de 14 mm da planetária com 0,05 mm de folga
     no raio, parede de 3,95 mm, e abraça 12 mm do eixo, parando a 1 mm da face de dentro do garfo (z = 39). O furo radial
     de 2,5 mm, de cima, é o do parafuso de aperto M3 (rosca no cubo), no meio do comprimento. */
  raioDoFuroDoCubo: 7.05,
  raioDoCubo: 11,
  comprimentoDoCubo: 12,
  raioDoFuroDeAperto: 1.25,
};

export const MATERIAIS = CORES;

export function derivar(t = TABELA) {
  const x = [-t.sobraAtras, t.entreEixos + t.sobraAFrente];
  const fora = t.meioVao + t.parede;
  const y = t.alturaDoEixo;
  const furo = (cx, z0, raio) => ({ eixo: 'z', base: [cx, y, z0], comprimento: t.parede + 2, raio });
  return [
    { nome: 'fundo', material: 'estrutura', chanfro: t.chanfro, caixa: [...x, t.baixo, t.baixo + t.fundo, -fora, fora] },
    { nome: 'paredeDaFrente', material: 'estrutura', chanfro: t.chanfro, caixa: [...x, t.baixo + t.fundo, t.alto, t.meioVao, fora],
      furos: [furo(t.entreEixos, t.meioVao - 1, t.raioDaPassagemDoCotovelo)] },
    { nome: 'paredeDeTras', material: 'estrutura', chanfro: t.chanfro, caixa: [...x, t.baixo + t.fundo, t.alto, -fora, -t.meioVao],
      furos: [furo(t.entreEixos, -fora - 1, t.raioDaPassagemDoCotovelo), { ...furo(t.eixoDoMotor, -fora - 1, t.raioDaPassagemDoMotor), lados: 36 },
        ...[-1, 1].flatMap((sx) => [-1, 1].map((sy) => ({
          eixo: 'z', base: [t.eixoDoMotor + (sx * t.passoDosFurosM3) / 2, y + (sy * t.passoDosFurosM3) / 2, -fora - 1], comprimento: t.parede + 2, raio: t.raioDoFuroM3, lados: 12,
        })))] },
    { nome: 'abaDaFrente', material: 'estrutura', chanfro: 1, caixa: [...x, t.alto - t.aba, t.alto, t.meioVao - t.aba, t.meioVao] },
    { nome: 'abaDeTras', material: 'estrutura', chanfro: 1, caixa: [...x, t.alto - t.aba, t.alto, -t.meioVao, -t.meioVao + t.aba] },
    { nome: 'cuboDoOmbro', material: 'aco', eixo: 'z', base: [0, y, fora], comprimento: t.comprimentoDoCubo, raio: t.raioDoCubo, lados: 36,
      furos: [{ eixo: 'z', base: [0, y, fora - 1], comprimento: t.comprimentoDoCubo + 2, raio: t.raioDoFuroDoCubo, lados: 36 },
        { eixo: 'y', base: [0, y + t.raioDoFuroDoCubo - 1, fora + t.comprimentoDoCubo / 2], comprimento: t.raioDoCubo - t.raioDoFuroDoCubo + 2, raio: t.raioDoFuroDeAperto, lados: 12 }] },
    { nome: 'pino', material: 'aco', eixo: 'z', base: [0, y, t.fimDoPino], comprimento: -fora - t.fimDoPino, raio: t.raioDoPino, lados: 18 },
  ];
}

export const ALIASES = aliasesDasFormas(derivar(TABELA));

export function gerarPassos(t = TABELA) {
  const formas = derivar(t);
  const { passos } = passosDasFormas(formas);
  const fora = t.meioVao + t.parede;
  passos.push(porta('juntaDoOmbro', origemDa(formas, 'cuboDoOmbro'), {
    forma: 'cilindro', papel: 'interna', eixo: [0, 0, 1], centro: [0, t.alturaDoEixo, fora], raio: t.raioDoFuroDoCubo, inicio: 0, fim: t.comprimentoDoCubo,
  }));
  passos.push(porta('assentoDoMotor', origemDa(formas, 'paredeDeTras'), { forma: 'plano', papel: 'recebe', ponto: [t.eixoDoMotor, t.alturaDoEixo, -fora], normal: [0, 0, -1], extensao: [42.3, 42.3] }));
  passos.push(porta('juntaDoCotovelo', origemDa(formas, 'paredeDeTras'), {
    forma: 'cilindro', papel: 'interna', eixo: [0, 0, 1], centro: [t.entreEixos, t.alturaDoEixo, -fora], raio: t.raioDaPassagemDoCotovelo, inicio: 0, fim: 2 * fora,
  }));
  return passos;
}

const receita = {
  meta: { nome: 'braco-de-prova/elo1', desc: 'primeiro elo do braço de prova: perfil em U aberto em cima, cinza-escuro, 150 mm entre o ombro e o cotovelo, com o NEMA 17 preso atrás e a correia à mostra dentro' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'chão, sob o eixo do ombro; y para cima, x ao longo do braço esticado, +z para a frente' },
  PLANO: {
    objeto: 'primeiro elo do braço de prova, perfil em U aberto em cima, entre as paredes do garfo do ombro e o cotovelo',
    referencias: ['../../../../../docs/modelar/banco-de-provas/braco-de-prova-2026-11-23/elos-opcoes.png'],
    escala: { medida: 'distância entre o eixo do ombro e o do cotovelo', milimetros: 150 },
    partes: [
      { nome: 'fundo', forma: 'fundo de 210 × 6 × 52 mm sob as paredes, 3 mm abaixo da correia', tecnica: 'caixa chanfrada' },
      { nome: 'paredeDaFrente', forma: 'parede de 210 × 66 × 6 mm, de z 20 a 26, com o furo de 10 mm do eixo do cotovelo', tecnica: 'caixa chanfrada com furo por subtração' },
      { nome: 'paredeDeTras', forma: 'parede de 210 × 66 × 6 mm, de z −26 a −20, com o furo do cotovelo, o furo de 23 mm do ressalto do NEMA 17 e os quatro M3 dele', tecnica: 'caixa chanfrada com furos por subtração' },
      { nome: 'abaDaFrente', forma: 'aba de 210 × 6 × 6 mm no alto da parede da frente, por dentro', tecnica: 'caixa chanfrada' },
      { nome: 'abaDeTras', forma: 'aba de 210 × 6 × 6 mm no alto da parede de trás, por dentro', tecnica: 'caixa chanfrada' },
      { nome: 'cuboDoOmbro', forma: 'cubo de 22 × 12 mm na face de fora da parede da frente, no eixo do ombro, com o furo de 14,1 mm do eixo de saída da planetária e o furo radial M3 do parafuso de aperto, parando a 1 mm da parede do garfo', tecnica: 'cilindro com furos por subtração' },
      { nome: 'pino', forma: 'pino de 8 mm no eixo do ombro, da parede de trás até a face de fora do rolamento', tecnica: 'cilindro' },
    ],
    criteriosDeReprovacao: [
      'distância entre o eixo do ombro e o do cotovelo diferente de 150 mm',
      'parede ou fundo com menos de 2 mm',
      'correia com menos de 2 mm de folga até as paredes ou o fundo',
      'elo encostando no garfo, ou o U fechado em cima escondendo a correia',
      'elo em outra cor que não o cinza-escuro',
    ],
  },
  contatos: [
    { par: ['fundo', 'paredeDaFrente'], motivo: 'a parede sobe do fundo do U' },
    { par: ['fundo', 'paredeDeTras'], motivo: 'a parede sobe do fundo do U' },
    { par: ['abaDaFrente', 'paredeDaFrente'], motivo: 'a aba endurece o alto da parede, por dentro' },
    { par: ['abaDeTras', 'paredeDeTras'], motivo: 'a aba endurece o alto da parede, por dentro' },
    { par: ['cuboDoOmbro', 'paredeDaFrente'], motivo: 'o cubo do ombro sai da face de fora da parede da frente' },
    { par: ['paredeDeTras', 'pino'], motivo: 'o pino sai da face de fora da parede de trás' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
