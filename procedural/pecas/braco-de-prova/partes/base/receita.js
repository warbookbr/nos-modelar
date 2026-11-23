/* braco-de-prova/base — a base redonda e baixa do braço de prova, oca, com a eletrônica dentro e o botão de parada no topo.
 *
 * Primeira etapa da montagem `braco-de-prova/montagem.json`. O combinado com a pessoa está no banco de provas
 * `docs/modelar/banco-de-provas/braco-de-prova-2026-11-23/README.md` (base redonda de 90 mm de raio e 50 de altura, a fonte,
 * o Arduino e os dois drivers dentro, o botão de parada de cogumelo vermelho de uns 22 mm no topo, na frente, longe do
 * caminho do braço). As medidas dos componentes são as do pedido inicial da mecatrônica: fonte 111 × 78 × 36, Arduino Uno
 * 68,6 × 53,4 × 15 e DRV8825 15,2 × 20,3 (a altura de 12 mm com o dissipador é estimativa).
 *
 * Referencial: o da montagem (ver `../../comum/blocos.mjs`): origem no chão, sob o eixo do ombro; y para cima, +z é a frente.
 * Técnica: o casco é um cilindro esvaziado pela `casca`, aberto em cima; a tampa é um disco de 3 mm com o furo do botão;
 * os componentes são caixas apoiadas no fundo do casco.
 *
 * Portas: `topo` — plano que recebe, no centro da face de cima da tampa, normal +y; o garfo do ombro se apoia nele.
 */
import { passosDasFormas, aliasesDasFormas, porta, origemDa, MATERIAIS as CORES } from '../../comum/blocos.mjs';

export const TABELA = {
  raio: 90,
  altura: 50,
  /* Parede e fundo do casco, e a tampa; o mínimo impresso é 2 mm. */
  parede: 3,
  tampa: 3,
  /* Botão de parada: centro no topo, na frente e à esquerda do motor do ombro; cogumelo de 22 mm, haste de 16 mm. */
  botaoX: -45,
  botaoZ: 60,
  raioDoCogumelo: 11,
  alturaDoCogumelo: 8,
  raioDaHaste: 8,
  alturaDaHaste: 10,
  /* Componentes, cantos [x0, x1, z0, z1] no fundo e altura. */
  fonte: { x: [-55.5, 55.5], z: [-60, 18], altura: 36 },
  arduino: { x: [-34.3, 34.3], z: [22, 75.4], altura: 15 },
  driverOmbro: { x: [38, 53.2], z: [22, 42.3], altura: 12 },
  driverCotovelo: { x: [38, 53.2], z: [46, 66.3], altura: 12 },
};

export const MATERIAIS = CORES;

const naBase = (t, c, nome, material) => ({ nome, material, caixa: [c.x[0], c.x[1], t.parede, t.parede + c.altura, c.z[0], c.z[1]] });

export function derivar(t = TABELA) {
  const topo = t.altura;
  return [
    { nome: 'casco', material: 'estrutura', eixo: 'y', base: [0, 0, 0], comprimento: topo - t.tampa, raio: t.raio, lados: 72, oca: { espessura: t.parede } },
    { nome: 'tampa', material: 'estrutura', eixo: 'y', base: [0, topo - t.tampa, 0], comprimento: t.tampa, raio: t.raio, lados: 72,
      furos: [{ eixo: 'y', base: [t.botaoX, topo - t.tampa - 1, t.botaoZ], comprimento: t.tampa + 2, raio: t.raioDaHaste }] },
    naBase(t, t.fonte, 'fonte', 'fonte'),
    naBase(t, t.arduino, 'arduino', 'placaArduino'),
    naBase(t, t.driverOmbro, 'driverOmbro', 'placaDriver'),
    naBase(t, t.driverCotovelo, 'driverCotovelo', 'placaDriver'),
    { nome: 'hasteDoBotao', material: 'vermelho', eixo: 'y', base: [t.botaoX, topo - t.alturaDaHaste, t.botaoZ], comprimento: t.alturaDaHaste, raio: t.raioDaHaste, lados: 18 },
    { nome: 'botaoDeParada', material: 'vermelho', eixo: 'y', base: [t.botaoX, topo, t.botaoZ], comprimento: t.alturaDoCogumelo, raio: t.raioDoCogumelo, lados: 36, chanfro: 0 },
  ];
}

export const ALIASES = aliasesDasFormas(derivar(TABELA));

export function gerarPassos(t = TABELA) {
  const formas = derivar(t);
  const { passos } = passosDasFormas(formas);
  passos.push(porta('topo', origemDa(formas, 'tampa'), { forma: 'plano', papel: 'recebe', ponto: [0, t.altura, 0], normal: [0, 1, 0], extensao: [120, 120] }));
  return passos;
}

const receita = {
  meta: { nome: 'braco-de-prova/base', desc: 'base redonda do braço de prova: casco oco de 90 mm de raio e 50 de altura, com a fonte, o Arduino e os dois drivers dentro e o botão de parada vermelho no topo, na frente' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'chão, sob o eixo do ombro; y para cima, x ao longo do braço esticado, +z para a frente' },
  PLANO: {
    objeto: 'base redonda e baixa do braço de prova, oca, com a eletrônica dentro e o botão de parada no topo',
    referencias: ['../../../../../docs/modelar/banco-de-provas/braco-de-prova-2026-11-23/elos-opcoes.png'],
    escala: { medida: 'diâmetro da base', milimetros: 180 },
    partes: [
      { nome: 'casco', forma: 'cilindro de 90 mm de raio e 47 mm de altura, oco, parede e fundo de 3 mm, aberto em cima', tecnica: 'cilindro esvaziado pela casca' },
      { nome: 'tampa', forma: 'disco de 3 mm no topo do casco, com o furo de 16 mm da haste do botão', tecnica: 'cilindro com furo por subtração' },
      { nome: 'fonte', forma: 'bloco de 111 × 36 × 78 mm no fundo do casco', tecnica: 'caixa' },
      { nome: 'arduino', forma: 'bloco de 68,6 × 15 × 53,4 mm no fundo, na frente', tecnica: 'caixa' },
      { nome: 'driverOmbro', forma: 'bloco de 15,2 × 12 × 20,3 mm no fundo', tecnica: 'caixa' },
      { nome: 'driverCotovelo', forma: 'bloco de 15,2 × 12 × 20,3 mm no fundo', tecnica: 'caixa' },
      { nome: 'hasteDoBotao', forma: 'haste de 16 mm de diâmetro que passa pelo furo da tampa', tecnica: 'cilindro' },
      { nome: 'botaoDeParada', forma: 'cogumelo vermelho de 22 mm de diâmetro e 8 mm de altura sobre a tampa, na frente', tecnica: 'cilindro' },
    ],
    criteriosDeReprovacao: [
      'raio diferente de 90 mm ou altura diferente de 50 mm',
      'parede, fundo ou tampa com menos de 2 mm',
      'fonte, Arduino ou driver atravessando a parede, a tampa ou outro componente',
      'botão de parada fora da frente da base ou embaixo do braço ou do motor do ombro',
    ],
  },
  contatos: [
    { par: ['arduino', 'casco'], motivo: 'a placa assenta no fundo do casco' },
    { par: ['botaoDeParada', 'hasteDoBotao'], motivo: 'o cogumelo fica no topo da haste' },
    { par: ['botaoDeParada', 'tampa'], motivo: 'o cogumelo assenta na tampa' },
    { par: ['casco', 'driverCotovelo'], motivo: 'o driver assenta no fundo do casco' },
    { par: ['casco', 'driverOmbro'], motivo: 'o driver assenta no fundo do casco' },
    { par: ['casco', 'fonte'], motivo: 'a fonte assenta no fundo do casco' },
    { par: ['casco', 'tampa'], motivo: 'a tampa fecha o topo do casco' },
    { par: ['hasteDoBotao', 'tampa'], motivo: 'a haste passa justa pelo furo da tampa' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
