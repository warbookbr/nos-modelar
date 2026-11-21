/* carro-quadrado/lataria — lataria completa da perua quadrada de duas portas (4.050 × 1.670 × 1.390 mm).
 * As medidas vêm de `../../andaime.json` e das quatro fotos em `../../referencias/locais/`.
 * Referencial: x para a direita, y para cima com o chão em 0, z para a frente (-2025 a +2025). */
import { m, derivarChapa, projetarVista, contornoComFilete, fazerArcoD, fazerArcoT } from './receita/chapa.js';
import { derivarParachoques, passosParachoques } from './receita/parachoques.js';
import { ALIASES_FRENTE_TRASEIRA, passosFrenteTraseira } from './receita/frente-traseira.js';

export const TABELA = {
  chapa: { espessura: 8, passo: 200, niveis: 2, anguloMax: 20, liso: false },
  estacoes: [1910, 1550, 1235, 845, 310, -300, -1125, -1530, -1900],
  secoes: {
    1910:    [[775, 255], [800, 425], [800, 595], [760, 775], [650, 785], 790],
    1550:    [[795, 255], [815, 425], [815, 595], [775, 815], [680, 835], 842],
    1235:    [[805, 255], [825, 425], [825, 595], [785, 850], [710, 875], 885],
    845:     [[810, 255], [835, 425], [835, 595], [790, 905], [740, 935], 940],
    310:     [[810, 255], [835, 425], [835, 595], [775, 945], [580, 1365], 1378],
    '-300':  [[810, 255], [835, 425], [835, 595], [775, 945], [580, 1378], 1390],
    '-1125': [[810, 255], [835, 425], [835, 595], [775, 945], [580, 1376], 1388],
    '-1530': [[805, 255], [825, 425], [825, 595], [775, 945], [580, 1375], 1386],
    '-1900': [[780, 270], [805, 425], [805, 585], [765, 950], [715, 1009], 1011],
  },
  frente: [
    [0, 255, 1940],
    [0, 425, 2005],
    [0, 595, 2020],
    [0, 765, 1970],
  ],
  traseira: [
    [0, 315, -1945],
    [0, 430, -2025],
    [0, 560, -2025],
    [0, 955, -1955],
  ],
  vincos: { cintura: 0.35, quina: 0.3 },
  arcos: {
    dianteiro: { z: 1235, y: 290, raio: 350, lados: 32 },
    traseiro: { z: -1125, y: 290, raio: 350, lados: 32 },
  },
  vidros: {
    porta: [[600, 965, 15], [245, 1335, 30], [-335, 1345, 25], [-335, 965, 15]],
    lateralTraseiro: [[-440, 965, 15], [-440, 1340, 25], [-1445, 1335, 25], [-1795, 975, 15], [-1760, 965, 15]],
    paraBrisaVista: [0, 0.77, 0.63],
    paraBrisa: [[-675, 952, 830, 20], [675, 952, 830, 20], [520, 1329, 370, 20], [-520, 1329, 370, 20]],
    traseiroVista: [0, 0.70, -0.71],
    traseiro: [[-520, 1325, -1590, 20], [520, 1325, -1590, 20], [640, 1011, -1900, 20], [-640, 1011, -1900, 20]],
  },
  aberturas: {
    frontal: [[-765, 535, 12], [765, 535, 12], [765, 725, 12], [-765, 725, 12]],
    lanternaTraseira: [[655, 535, 10], [770, 535, 10], [750, 815, 10], [655, 815, 10]],
  },
  parachoqueDianteiro: {
    y0: 215, y1: 515, xTrilho: 785, zFrente: 2025, zLateral: 1585, raioCanto: 95,
    avanco: 60, saia: 22, recuo: -12, frisoY: 455, frisoAlt: 12, frisoSaida: 5,
  },
  parachoqueTraseiro: {
    y0: 250, y1: 515, xTrilho: 790, zTras: -2025, zLateral: -1480, raioCanto: 90,
    avanco: 55, saia: 20, recuo: -12, frisoY: 465, frisoAlt: 12, frisoSaida: 5,
  },
  frisoLateral: {
    yCentro: 515, largura: 56, altura: 18, chanfro: 4, deslocamentoMm: -2,
    entreArcos: [-755, 865],
    traseiro: [-1495, -1920],
  },
  frentePecas: {
    grade: { meiaLarg: 442, y0: 545, y1: 715, zFundo0: 1935, zFundo1: 1985, zMoldura: 2005, zLamina: 2008, laminas: 7, lamY0: 556, lamY1: 696, lamAlt: 8 },
    farol: { x0: 445, x1: 670, y0: 545, y1: 715, zCarc0: 1925, zCarc1: 1966, zLente0: 1950, zLente1: 1982 },
    seta: { x0: 675, x1: 778, y0: 545, y1: 715, z0: 1920, z1: 1962 },
    placa: { larg: 340, alt: 135, yCentro: 352, z0: 2076, z1: 2092 },
    neblina: { xCentro: 520, yCentro: 290, larg: 150, alt: 68, z0: 2036, z1: 2078 },
  },
  traseiraPecas: {
    lanterna: { x0: 655, x1: 776, yRe: [540, 610], yFreio: [610, 735], ySeta: [735, 810], zCarc0: -1955, zCarc1: -1918, zFrente: -1972, zTras: -1924 },
    placa: { larg: 340, alt: 135, yCentro: 695, z0: -2024, z1: -2005 },
    puxador: { larg: 460, alt: 30, yCentro: 795, z0: -2008, z1: -1980 },
    fechadura: { yCentro: 580, raio: 18, z0: -2032, z1: -2017 },
    escapamento: { x: 540, y: 215, raio: 28, z0: -2065, z1: -1880 },
  },
};

export const MATERIAIS = {
  lataria: { cor: '#4c5661', metalicidade: 0.35, aspereza: 0.4 },
  plasticoFosco: { cor: '#1b1e22', metalicidade: 0.05, aspereza: 0.8 },
  plasticoPreto: { cor: '#22262b', metalicidade: 0.05, aspereza: 0.72 },
  frisoClaro: { cor: '#b8bec6', metalicidade: 0.55, aspereza: 0.35 },
  lenteFarol: { cor: '#dce4ec', metalicidade: 0.1, aspereza: 0.12 },
  lenteNeblina: { cor: '#cfd8e0', metalicidade: 0.1, aspereza: 0.15 },
  setaAmbar: { cor: '#e08a1e', metalicidade: 0.05, aspereza: 0.2 },
  lanternaRe: { cor: '#dde3e8', metalicidade: 0.05, aspereza: 0.18 },
  lanternaFreio: { cor: '#a81c1c', metalicidade: 0.05, aspereza: 0.2 },
  lanternaSeta: { cor: '#d98218', metalicidade: 0.05, aspereza: 0.2 },
  placa: { cor: '#e8eaed', metalicidade: 0.1, aspereza: 0.35 },
  escapamento: { cor: '#8c929a', metalicidade: 0.75, aspereza: 0.3 },
};

export function derivar(T) {
  const { rede, zs } = derivarChapa(T);
  const varridos = derivarParachoques(T);
  return { rede, zs, varridos };
}

export const ALIASES = [...fazerArcoD(TABELA).aliases, ...fazerArcoT(TABELA).aliases, ...ALIASES_FRENTE_TRASEIRA];

export function gerarPassos(T) {
  const { rede, varridos } = derivar(T);
  const arcoD = fazerArcoD(T);
  const arcoT = fazerArcoT(T);
  const { medidas: _, ...passoRede } = rede.passo;
  const selFinal = { origem: { op: 'aberturaPorContorno', id: 11 } };

  let nid = 12;
  const proxId = () => { const atual = nid; nid += 1; return atual; };

  const passosChapa = [
    ['subdivisao', { origemId: 1, ...passoRede, borda: 'cantos', niveis: T.chapa.niveis, espessura: m(T.chapa.espessura) }],
    ...arcoD.passos,
    ...arcoT.passos,
    ['aberturaPorContorno', { origemId: 6, chapa: { origem: { op: 'subtrair', id: 5 } }, vista: 'x', sentido: '+', simetria: 'x', contorno: contornoComFilete(T.vidros.porta) }],
    ['aberturaPorContorno', { origemId: 7, chapa: { origem: { op: 'aberturaPorContorno', id: 6 } }, vista: 'x', sentido: '+', simetria: 'x', contorno: contornoComFilete(T.vidros.lateralTraseiro) }],
    ['aberturaPorContorno', { origemId: 8, chapa: { origem: { op: 'aberturaPorContorno', id: 7 } }, vista: T.vidros.paraBrisaVista, sentido: '+', contorno: contornoComFilete(projetarVista(T.vidros.paraBrisaVista, T.vidros.paraBrisa)) }],
    ['aberturaPorContorno', { origemId: 9, chapa: { origem: { op: 'aberturaPorContorno', id: 8 } }, vista: T.vidros.traseiroVista, sentido: '+', contorno: contornoComFilete(projetarVista(T.vidros.traseiroVista, T.vidros.traseiro)) }],
    ['aberturaPorContorno', { origemId: 10, chapa: { origem: { op: 'aberturaPorContorno', id: 9 } }, vista: 'z', sentido: '+', contorno: contornoComFilete(T.aberturas.frontal) }],
    ['aberturaPorContorno', { origemId: 11, chapa: { origem: { op: 'aberturaPorContorno', id: 10 } }, vista: 'z', sentido: '-', simetria: 'x', contorno: contornoComFilete(T.aberturas.lanternaTraseira) }],
  ];

  const aliasesChapa = [...arcoD.aliases, ...arcoT.aliases];

  return [
    ...passosChapa,
    ['parte', { nome: 'chapa', sel: selFinal }],
    ['material', { usa: 'lataria', sel: selFinal }],
    ...passosParachoques(T, varridos, proxId, passosChapa, rede.pontos, aliasesChapa),
    ...passosFrenteTraseira(T, proxId),
  ];
}

export const CONTATOS = [
  { par: ['chapa', 'parachoqueDianteiro'], motivo: 'para-choque dianteiro envolve e apoia na chapa frontal e lateral' },
  { par: ['chapa', 'parachoqueTraseiro'], motivo: 'para-choque traseiro envolve e apoia na chapa traseira e lateral' },
  { par: ['chapa', 'frisoLateral'], motivo: 'friso lateral embute na chapa da lateral' },
  { par: ['frisoLateral', 'parachoqueTraseiro'], motivo: 'friso lateral traseiro encosta no topo do para-choque traseiro' },
  { par: ['chapa', 'gradeFrontal'], motivo: 'fundo da grade encosta na borda interna do vão frontal' },
  { par: ['chapa', 'farol'], motivo: 'carcaça do farol encosta na borda interna do vão frontal' },
  { par: ['chapa', 'setaDianteira'], motivo: 'seta dianteira assenta no canto externo do vão frontal' },
  { par: ['parachoqueDianteiro', 'placaDianteira'], motivo: 'placa dianteira apoia na face frontal do para-choque' },
  { par: ['parachoqueDianteiro', 'farolNeblina'], motivo: 'faróis de neblina embutem na saia inferior do para-choque dianteiro' },
  { par: ['chapa', 'lanternaTraseira'], motivo: 'lanternas traseiras assentam nos vãos traseiros da chapa' },
  { par: ['chapa', 'placaTraseira'], motivo: 'placa traseira apoia na tampa traseira' },
  { par: ['chapa', 'puxadorTampa'], motivo: 'puxador apoia na tampa traseira acima da placa' },
  { par: ['chapa', 'fechaduraTampa'], motivo: 'fechadura embute na tampa traseira abaixo da placa' },
];

export const PONTOS = [
  { nome: 'nariz', parte: 'chapa', medida: 'maximo', em: [835, 1390, 2025], toleranciaMm: 20 },
  { nome: 'fundo-traseiro', parte: 'chapa', medida: 'minimo', em: [-835, 255, -2025], toleranciaMm: 20 },
];

const receita = {
  meta: { nome: 'carro-quadrado/lataria', desc: 'Lataria, frente, traseira, para-choques e friso lateral da perua quadrada' },
  PARAMS: TABELA,
  ALIASES,
  MATERIAIS,
  get TOPO() {
    const d = derivar(this.PARAMS);
    return {
      origem: 'centro do carro no chão: +x direita, +y cima, +z frente',
      ...d.rede.pontos,
      ...d.varridos.pcD.pontos,
      ...d.varridos.pcDFriso.pontos,
      ...d.varridos.pcT.pontos,
      ...d.varridos.pcTFriso.pontos,
    };
  },
  PLANO: {
    objeto: 'Lataria, frente, traseira, para-choques e friso lateral da perua quadrada (4050 x 1670 x 1390 mm)',
    referencias: [
      '../../referencias/frontal.prancha.svg',
      '../../referencias/lateral.prancha.svg',
      '../../referencias/superior.prancha.svg',
      '../../referencias/traseira.prancha.svg',
    ],
    escala: { medida: 'comprimento total da chapa, de z -2025 a +2025 mm', milimetros: 4050 },
    partes: [
      { nome: 'chapa', forma: 'Casco contínuo com arcos de roda, vãos dos vidros, vão frontal e vãos das lanternas', tecnica: 'Subdivisão de gaiolaPorRede com furoPassante e aberturaPorContorno' },
      { nome: 'parachoqueDianteiro', forma: 'Corpo envolvente preto na frente com friso claro horizontal em y 455', tecnica: 'Subdivisão de gaiolaVarrida fechada contornando a frente até o arco dianteiro' },
      { nome: 'parachoqueTraseiro', forma: 'Corpo envolvente preto na traseira com friso claro horizontal em y 465', tecnica: 'Subdivisão de gaiolaVarrida fechada contornando a traseira até o arco traseiro' },
      { nome: 'frisoLateral', forma: 'Barras pretas laterais em y 515 entre os arcos e atrás do arco traseiro', tecnica: 'conformarNaChapa em trilho sobre a chapa com simetria em x' },
      { nome: 'gradeFrontal', forma: 'Caixa escura recuada com 7 lâminas horizontais no centro do vão frontal', tecnica: 'Cubos com arranja linear em plástico preto fosco' },
      { nome: 'farol', forma: 'Par de faróis retangulares com carcaça recuada e lente clara', tecnica: 'Cubo e chamferBox espelhados em x' },
      { nome: 'setaDianteira', forma: 'Par de setas âmbar nos cantos externos da frente', tecnica: 'chamferBox espelhada em x' },
      { nome: 'placaDianteira', forma: 'Placa retangular clara de 340 por 135 mm no centro do para-choque dianteiro', tecnica: 'chamferBox apoiada na face frontal do para-choque' },
      { nome: 'farolNeblina', forma: 'Par de faróis de neblina retangulares embutidos na saia dianteira', tecnica: 'chamferBox espelhada em x' },
      { nome: 'lanternaTraseira', forma: 'Par de lanternas verticais de três faixas empilhadas nos cantos traseiros', tecnica: 'Cubo de fundo e três chamferBox por lado espelhadas em x' },
      { nome: 'placaTraseira', forma: 'Placa retangular clara de 340 por 135 mm na tampa traseira', tecnica: 'chamferBox centrada em y 695' },
      { nome: 'puxadorTampa', forma: 'Barra preta horizontal acima da placa traseira em y 795', tecnica: 'chamferBox centrada acima da placa' },
      { nome: 'fechaduraTampa', forma: 'Cilindro pequeno preto abaixo da placa traseira em y 580', tecnica: 'Cilindro em z com tampas' },
      { nome: 'escapamento', forma: 'Tubo metálico sob o para-choque traseiro no lado esquerdo', tecnica: 'Cilindro em z em x +540 e y 215' },
    ],
    criteriosDeReprovacao: [
      'Dimensões da chapa fora de 4050 x 1670 x 1390 mm além da tolerância',
      'Peças de frente, traseira, para-choques ou friso flutuando ou atravessando errado',
    ],
  },
  contatos: CONTATOS,
  ilhas: [
    { contem: 'escapamento', motivo: 'tubo do escapamento fica sob o para-choque traseiro e liga ao chassi em etapa futura' },
  ],
  PONTOS,
  vaos: [
    { nome: 'vidroDaPorta', superficie: { op: 'aberturaPorContorno', id: 6 }, semMoldura: { motivo: 'vidro e borracha da porta são da etapa de vidros' } },
    { nome: 'vidroLateralTraseiro', superficie: { op: 'aberturaPorContorno', id: 7 }, semMoldura: { motivo: 'vidro e borracha lateral traseiro são da etapa de vidros' } },
    { nome: 'paraBrisa', superficie: { op: 'aberturaPorContorno', id: 8 }, semMoldura: { motivo: 'para-brisa e borracha são da etapa de vidros' } },
    { nome: 'vidroTraseiro', superficie: { op: 'aberturaPorContorno', id: 9 }, semMoldura: { motivo: 'vidro traseiro e borracha são da etapa de vidros' } },
    { nome: 'vaoFrontal', superficie: { op: 'aberturaPorContorno', id: 10 }, semMoldura: { motivo: 'grade, faróis e setas fecham o vão frontal diretamente' } },
    { nome: 'vaoLanternaTraseira', superficie: { op: 'aberturaPorContorno', id: 11 }, semMoldura: { motivo: 'as lanternas traseiras fecham o vão diretamente' } },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
