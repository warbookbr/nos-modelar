/* braco-de-prova/elo1 — o primeiro elo, um perfil em U aberto em cima, cinza-escuro, de 150 mm entre o eixo do ombro e o do
 * cotovelo, girando entre as paredes do garfo.
 *
 * Quinta etapa da montagem `braco-de-prova/montagem.json`. Do alinhamento (banco de provas braco-de-prova-2026-11-23): a
 * opção C, perfil em U aberto com a correia à mostra; o NEMA 17 preso perto do ombro, com as polias GT2 de 20 e 80 dentes e a
 * correia dentro do U até o cotovelo.
 *
 * O U tem duas paredes de 6 mm (faces de fora em z = ±26) e o fundo de 6 mm por baixo; o vão de dentro, de 40 mm, deixa
 * 17 mm de folga de cada lado da correia de 6 mm, e o fundo fica 3 mm abaixo do ponto mais baixo da correia. A parede da
 * frente encosta na ponta do eixo de saída da planetária; da parede de trás sai o pino de 8 mm que passa pelo garfo e gira
 * no rolamento. A parede de trás tem o furo de 8 mm por onde o eixo do NEMA 17 entra no U, e as duas paredes têm o furo de
 * 10 mm do eixo do cotovelo, que é do segundo elo.
 *
 * Referencial: o da montagem (ver `../../comum/blocos.mjs`); o braço esticado na horizontal, ao longo de +x.
 *
 * Portas: `juntaDoOmbro` (cilindro interno, eixo +z, no eixo do ombro, na face de fora da parede da frente), onde o eixo de
 * saída da planetária se prende; `assentoDoMotor` (plano, recebe, normal −z, na face de fora da parede de trás, no eixo do
 * NEMA 17) e `juntaDoCotovelo` (cilindro interno, eixo +z, centro no eixo do cotovelo na face de fora da parede de trás).
 */
import { passosDasFormas, aliasesDasFormas, porta, origemDa, MATERIAIS as CORES } from '../../comum/blocos.mjs';

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
  raioDaPassagemDoMotor: 4,
  raioDaPassagemDoCotovelo: 5,
  /* Pino do lado de trás do ombro: 8 mm, da parede até a face de fora do rolamento. */
  raioDoPino: 4,
  fimDoPino: -58,
  chanfro: 1.5,
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
      furos: [furo(t.entreEixos, -fora - 1, t.raioDaPassagemDoCotovelo), furo(t.eixoDoMotor, -fora - 1, t.raioDaPassagemDoMotor)] },
    { nome: 'pino', material: 'aco', eixo: 'z', base: [0, y, t.fimDoPino], comprimento: -fora - t.fimDoPino, raio: t.raioDoPino, lados: 18 },
  ];
}

export const ALIASES = aliasesDasFormas(derivar(TABELA));

export function gerarPassos(t = TABELA) {
  const formas = derivar(t);
  const { passos } = passosDasFormas(formas);
  const fora = t.meioVao + t.parede;
  passos.push(porta('juntaDoOmbro', origemDa(formas, 'paredeDaFrente'), {
    forma: 'cilindro', papel: 'interna', eixo: [0, 0, 1], centro: [0, t.alturaDoEixo, fora], raio: 7, inicio: -t.parede, fim: 0,
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
      { nome: 'paredeDeTras', forma: 'parede de 210 × 66 × 6 mm, de z −26 a −20, com o furo do cotovelo e o furo de 8 mm do eixo do NEMA 17', tecnica: 'caixa chanfrada com furos por subtração' },
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
    { par: ['paredeDeTras', 'pino'], motivo: 'o pino sai da face de fora da parede de trás' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
