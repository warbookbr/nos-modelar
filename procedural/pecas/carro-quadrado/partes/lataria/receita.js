/* carro-quadrado/lataria — lataria completa da perua quadrada de duas portas (4.050 × 1.670 × 1.390 mm).
 * As medidas vêm de `../../andaime.json` e das quatro fotos em `../../referencias/locais/`.
 * Referencial: x para a direita, y para cima com o chão em 0, z para a frente (-2025 a +2025). */
import { m, derivarChapa, projetarVista, contornoComFilete, fazerArcoD, fazerArcoT } from './receita/chapa.js';
import { rebaixoPorContorno } from '../../../../nucleo/rebaixo-por-contorno.js';
import { derivarParachoques, passosParachoques } from './receita/parachoques.js';
import { ALIASES_FRENTE_TRASEIRA, passosFrenteTraseira } from './receita/frente-traseira.js';

export const TABELA = {
  chapa: { espessura: 8, passo: 200, niveis: 2, anguloMax: 20, liso: false },
  estacoes: [1910, 1550, 1235, 845, 310, -300, -1125, -1530, -1730, -1935],
  /* cada seção tem 7 níveis: soleira, baixo, meio (Curva 3 bojo), vinco (ombro/vinco horizontal nítido), cintura, quina, eixo */
  secoes: {
    1910:    [[760, 255], [795, 425], [810, 610], [802, 718], [776, 748], [718, 760], 766],
    1550:    [[780, 255], [810, 425], [825, 615], [818, 738], [786, 796], [730, 814], 822],
    1235:    [[790, 255], [820, 425], [835, 620], [830, 754], [792, 844], [738, 864], 872],
    845:     [[795, 255], [825, 425], [840, 625], [838, 770], [790, 904], [744, 926], 934],
    310:     [[795, 255], [825, 425], [840, 630], [838, 778], [775, 945], [622, 1362], 1374],
    '-300':  [[795, 255], [825, 425], [840, 632], [838, 785], [775, 945], [622, 1384], 1396],
    '-1125': [[795, 255], [825, 425], [840, 632], [838, 792], [775, 945], [622, 1382], 1394],
    '-1530': [[790, 255], [820, 425], [835, 632], [833, 796], [775, 945], [622, 1364], 1376],
    '-1730': [[778, 265], [808, 428], [824, 628], [822, 798], [768, 942], [668, 1170], 1178],
    '-1935': [[762, 285], [792, 430], [810, 625], [808, 800], [755, 932], [716, 962], 966],
  },
  frente: [
    [0, 255, 1945],
    [0, 425, 2000],
    [0, 610, 2018],
    [0, 718, 2014],
    [0, 756, 1994],
  ],
  /* Curva 1 (tuck-under traseiro): vertical no âmbar/vinco (-2022) e tombando para frente em direção ao para-choque (-1982) */
  traseira: [
    [0, 295, -1940],
    [0, 430, -1982],
    [0, 625, -2012],
    [0, 800, -2022],
    [0, 930, -2008],
  ],
  vincos: { lateral: 0.85, cintura: 0.22, quina: 0.30 },
  arcos: {
    dianteiro: { z: 1235, y: 290, raio: 350, lados: 32 },
    traseiro: { z: -1125, y: 290, raio: 350, lados: 32 },
  },
  vidros: {
    /* Coluna A mais vertical e fina, para-brisa mais largo/alto com testa do teto fina e cantos arredondados */
    porta: [[665, 960, 18], [295, 1348, 145], [-355, 1354, 16], [-368, 960, 16]],
    lateralTraseiro: [[-412, 1354, 18], [-1435, 1345, 24], [-1805, 974, 18], [-1770, 960, 18], [-456, 960, 24]],
    paraBrisaVista: [0, 0.77, 0.63],
    paraBrisa: [[-708, 948, 830, 32], [708, 948, 830, 32], [568, 1346, 365, 36], [-568, 1346, 365, 36]],
    traseiroVista: [0, 0.70, -0.71],
    traseiro: [[-555, 1325, -1590, 24], [555, 1325, -1590, 24], [655, 985, -1945, 24], [-655, 985, -1945, 24]],
  },
  aberturas: {
    frontal: [[-742, 568, 12], [742, 568, 12], [742, 700, 12], [-742, 700, 12]],
    /* Curva 4: borda interna acompanha o trapézio da tampa (634 embaixo subindo para 664 em cima) */
    lanternaTraseira: [[634, 530, 8], [776, 530, 10], [758, 842, 16], [664, 842, 10]],
  },
  parachoqueDianteiro: {
    y0: 256, y1: 498, xTrilho: 785, zFrente: 2022, zLateral: 1625, raioCanto: 98,
    avanco: 46, saia: 4, recuo: 25, frisoY: 458, frisoAlt: 7, frisoSaida: 3.5,
  },
  parachoqueTraseiro: {
    y0: 250, y1: 515, xTrilho: 790, zTras: -2025, zLateral: -1515, raioCanto: 90,
    avanco: 55, saia: 20, recuo: 25, frisoY: 465, frisoAlt: 12, frisoSaida: 5,
  },
  frisoLateral: {
    yCentro: 515, largura: 56, altura: 18, chanfro: 4, deslocamentoMm: -2,
    entreArcos: [-755, 865],
    traseiro: [-1495, -1920],
  },
  frentePecas: {
    grade: { meiaLarg: 446, y0: 570, y1: 700, zFundo0: 1950, zFundo1: 1986, zMoldura: 2006, zLamina: 2010, laminas: 7, lamY0: 578, lamY1: 688, lamAlt: 4.8 },
    farol: { x0Base: 432, x0Topo: 444, x1: 696, y0: 568, y1: 702, zCarc0: 1948, zCarc1: 1998, zLente0: 1994, zLente1: 2008 },
    seta: { x0: 700, x1: 792, y0: 570, y1: 700, z0: 1924, z1: 2002 },
    placa: { larg: 356, alt: 120, yCentro: 368, z0: 2054, z1: 2070 },
    neblina: { xCentro: 510, yCentro: 306, larg: 158, alt: 44, z0: 2024, z1: 2058 },
  },
  traseiraPecas: {
    lanterna: { x0: 655, x1: 776, yRe: [540, 610], yFreio: [610, 735], ySeta: [735, 810], zCarc0: -2008, zCarc1: -1918, zFrente: -2020, zTras: -1924 },
    placa: { larg: 340, alt: 135, yCentro: 695, z0: -2026, z1: -2008 },
    puxador: { larg: 460, alt: 30, yCentro: 795, z0: -2030, z1: -1998 },
    fechadura: { yCentro: 580, raio: 18, z0: -2016, z1: -1990 },
    escapamento: { x: 540, y: 215, raio: 28, z0: -2065, z1: -1880 },
  },
};

export const MATERIAIS = {
  lataria: { cor: '#4c5661', metalicidade: 0.35, aspereza: 0.4 },
  plasticoFosco: { cor: '#1b1e22', metalicidade: 0.05, aspereza: 0.8 },
  plasticoPreto: { cor: '#22262b', metalicidade: 0.05, aspereza: 0.72 },
  frisoClaro: { cor: '#b8bec6', metalicidade: 0.55, aspereza: 0.35 },
  lenteFarol: {
    cor: '#dce4ec', metalicidade: 0.04, aspereza: 0.05, mistura: 'transparente', opacidade: 0.42,
    verniz: 1.0, asperezaDoVerniz: 0.015, indiceDeRefracao: 1.52,
  },
  lenteNeblina: {
    cor: '#dce5ed', metalicidade: 0.02, aspereza: 0.08, mistura: 'transparente', opacidade: 0.46,
    verniz: 0.96, asperezaDoVerniz: 0.02, indiceDeRefracao: 1.52,
    relevo: { tipo: 'prismas', escala: 2.8, intensidade: 0.62, projecao: 'caixa' },
  },
  setaAmbar: {
    cor: '#e88208', metalicidade: 0.04, aspereza: 0.08,
    verniz: 0.96, asperezaDoVerniz: 0.03, transmissao: 0.64, tomDoVidro: '#f28a0a', indiceDeRefracao: 1.49,
    relevo: { tipo: 'prismas', escala: 2.8, intensidade: 0.22, projecao: 'caixa' },
  },
  mascaraPrataFarol: { cor: '#dce4ec', metalicidade: 0.80, aspereza: 0.14, verniz: 0.85 },
  refletorFarol: { cor: '#66707c', metalicidade: 0.96, aspereza: 0.11 },
  refletorNucleo: { cor: '#9aa4b0', metalicidade: 0.94, aspereza: 0.12 },
  calotaLampada: { cor: '#4a525c', metalicidade: 0.88, aspereza: 0.20 },
  bordaVidroFarol: { cor: '#aab4be', metalicidade: 0.30, aspereza: 0.18, verniz: 0.90 },
  lanternaRe: {
    cor: '#e6ecf2', metalicidade: 0.04, aspereza: 0.10,
    verniz: 0.95, asperezaDoVerniz: 0.04, transmissao: 0.66, tomDoVidro: '#dfe6ee', indiceDeRefracao: 1.49,
    relevo: { tipo: 'prismas', escala: 2.8, intensidade: 0.48, projecao: 'caixa' },
  },
  lanternaFreio: {
    cor: '#9c0c14', metalicidade: 0.04, aspereza: 0.08,
    verniz: 0.96, asperezaDoVerniz: 0.03, transmissao: 0.60, tomDoVidro: '#b80c16', indiceDeRefracao: 1.49,
    relevo: { tipo: 'prismas', escala: 3.0, intensidade: 0.45, projecao: 'caixa' },
  },
  lanternaSeta: {
    cor: '#e27806', metalicidade: 0.04, aspereza: 0.08,
    verniz: 0.96, asperezaDoVerniz: 0.03, transmissao: 0.62, tomDoVidro: '#ee8208', indiceDeRefracao: 1.49,
    relevo: { tipo: 'prismas', escala: 3.0, intensidade: 0.45, projecao: 'caixa' },
  },
  lanternaSulco: {
    cor: '#3a1b04', metalicidade: 0.06, aspereza: 0.35, verniz: 0.6, asperezaDoVerniz: 0.12,
  },
  refletorLanterna: { cor: '#cfd6de', metalicidade: 0.92, aspereza: 0.14 },
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
  const { medidas: _, cantos: cantosRede, ...passoRede } = rede.passo;
  const cantosChapa = (cantosRede ?? []).filter((c) => c !== 'f_cintura' && c !== 't_cintura');

  let nid = 12;
  const proxId = () => { const atual = nid; nid += 1; return atual; };

  const plT = T.traseiraPecas.placa;
  const rebaixoPlaca = rebaixoPorContorno({
    corpo: { origem: { op: 'aberturaPorContorno', id: 11 } },
    vista: 'z',
    sentido: '-',
    profundidade: 4,
    centroDaVista: -2000,
    comprimento: 600,
    contorno: contornoComFilete([
      [-232, plT.yCentro - plT.alt / 2 - 20, 14],
      [232, plT.yCentro - plT.alt / 2 - 20, 14],
      [252, plT.yCentro + plT.alt / 2 + 24, 14],
      [-252, plT.yCentro + plT.alt / 2 + 24, 14],
    ]),
    ids: { copia: proxId(), prisma: proxId(), ferramenta: proxId(), subtrair: proxId() },
  });
  const selFinal = { origem: rebaixoPlaca.origem };

  const passosChapa = [
    ['subdivisao', { origemId: 1, ...passoRede, cantos: cantosChapa, borda: 'cantos', niveis: T.chapa.niveis, espessura: m(T.chapa.espessura), costuraExata: true }],
    ...arcoD.passos,
    ...arcoT.passos,
    ['aberturaPorContorno', { origemId: 6, chapa: { origem: { op: 'subtrair', id: 5 } }, vista: 'x', sentido: '+', simetria: 'x', contorno: contornoComFilete(T.vidros.porta) }],
    ['aberturaPorContorno', { origemId: 7, chapa: { origem: { op: 'aberturaPorContorno', id: 6 } }, vista: 'x', sentido: '+', simetria: 'x', contorno: contornoComFilete(T.vidros.lateralTraseiro) }],
    ['aberturaPorContorno', { origemId: 8, chapa: { origem: { op: 'aberturaPorContorno', id: 7 } }, vista: T.vidros.paraBrisaVista, sentido: '+', contorno: contornoComFilete(projetarVista(T.vidros.paraBrisaVista, T.vidros.paraBrisa)) }],
    ['aberturaPorContorno', { origemId: 9, chapa: { origem: { op: 'aberturaPorContorno', id: 8 } }, vista: T.vidros.traseiroVista, sentido: '+', contorno: contornoComFilete(projetarVista(T.vidros.traseiroVista, T.vidros.traseiro)) }],
    ['aberturaPorContorno', { origemId: 10, chapa: { origem: { op: 'aberturaPorContorno', id: 9 } }, vista: 'z', sentido: '+', contorno: contornoComFilete(T.aberturas.frontal) }],
    ['aberturaPorContorno', { origemId: 11, chapa: { origem: { op: 'aberturaPorContorno', id: 10 } }, vista: 'z', sentido: '-', simetria: 'x', contorno: contornoComFilete(T.aberturas.lanternaTraseira) }],
    ...rebaixoPlaca.passos,
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
  { par: ['chapa', 'gradeFrontal'], motivo: 'fundo da grade encosta na borda interna do vão frontal' },
  { par: ['chapa', 'farol'], motivo: 'carcaça do farol encosta na borda interna do vão frontal' },
  { par: ['gradeFrontal', 'farol'], motivo: 'a grade frontal encosta na borda interna inclinada dos faróis' },
  { par: ['chapa', 'setaDianteira'], motivo: 'seta dianteira assenta no canto externo do vão frontal' },
  { par: ['parachoqueDianteiro', 'placaDianteira'], motivo: 'placa dianteira apoia na face frontal do para-choque' },
  { par: ['parachoqueDianteiro', 'farolNeblina'], motivo: 'faróis de neblina embutem na saia inferior do para-choque dianteiro' },
  { par: ['chapa', 'lanternaTraseira'], motivo: 'lanternas traseiras assentam nos vãos traseiros da chapa' },
  { par: ['chapa', 'placaTraseira'], motivo: 'placa traseira apoia na tampa traseira' },
  { par: ['chapa', 'puxadorTampa'], motivo: 'puxador apoia na tampa traseira acima da placa' },
  { par: ['chapa', 'fechaduraTampa'], motivo: 'fechadura embute na tampa traseira abaixo da placa' },
  { par: ['chapa', 'fendaCapo'], motivo: 'fenda do capô conforma sobre a chapa nas bordas laterais e traseira do capô' },
  { par: ['chapa', 'churrasqueira'], motivo: 'entradas de ventilação assentam no painel do torpedo à frente do para-brisa' },
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
      origem: 'centro do carro no chão: x para a direita, y para cima, frente em +z',
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
      { nome: 'fendaCapo', forma: 'Fenda escura contornando as bordas laterais e traseira do capô', tecnica: 'conformarNaChapa na vista superior sobre a chapa' },
      { nome: 'churrasqueira', forma: 'Par de grades de ventilação com aletas escuras no torpedo à frente do para-brisa', tecnica: 'Subdivisão de blocos inclinados espelhados em x' },
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
  get vaos() {
    return [
      { nome: 'vidroDaPorta', superficie: { op: 'aberturaPorContorno', id: 6 }, semMoldura: { motivo: 'vidro e borracha da porta são da etapa de vidros' } },
      { nome: 'vidroLateralTraseiro', superficie: { op: 'aberturaPorContorno', id: 7 }, semMoldura: { motivo: 'vidro e borracha lateral traseiro são da etapa de vidros' } },
      { nome: 'paraBrisa', superficie: { op: 'aberturaPorContorno', id: 8 }, semMoldura: { motivo: 'para-brisa e borracha são da etapa de vidros' } },
      { nome: 'vidroTraseiro', superficie: { op: 'aberturaPorContorno', id: 9 }, semMoldura: { motivo: 'vidro traseiro e borracha são da etapa de vidros' } },
      { nome: 'vaoFrontal', superficie: { op: 'aberturaPorContorno', id: 10 }, semMoldura: { motivo: 'grade, faróis e setas fecham o vão frontal diretamente' } },
      { nome: 'vaoLanternaTraseira', superficie: { op: 'aberturaPorContorno', id: 11 }, semMoldura: { motivo: 'as lanternas traseiras fecham o vão diretamente' } },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
