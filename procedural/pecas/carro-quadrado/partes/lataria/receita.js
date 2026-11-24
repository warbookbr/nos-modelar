/* carro-quadrado/lataria — lataria completa da perua quadrada de duas portas (4.050 × 1.670 × 1.390 mm).
 * As medidas vêm de `../../andaime.json` e das quatro fotos em `../../referencias/locais/`.
 * Referencial: x para a direita, y para cima com o chão em 0, z para a frente (-2025 a +2025). */
import { m, derivarChapa, projetarVista, contornoComFilete } from './receita/chapa.js';
import { rebaixoPorContorno } from '../../../../nucleo/rebaixo-por-contorno.js';
import { derivarParachoques, passosParachoques } from './receita/parachoques.js';
import { ALIASES_FRENTE_TRASEIRA, passosFrenteTraseira } from './receita/frente-traseira.js';
import { derivarCapo, passosCapo, passoVaoCapoNaChapa } from './receita/capo.js';
import { passosAcabamentos } from './receita/acabamentos.js';
import { passosRetrovisores } from './receita/retrovisor.js';

export const TABELA = {
  chapa: { espessura: 8, passo: 200, niveis: 2, anguloMax: 20, liso: false },
  estacoes: [1910, 1720, 832, 310, -300, -620, -1620, -1730, -1935],
  /* cada seção tem 7 níveis: soleira, baixo, meio (Curva 3), vinco (lateral), cintura (topo do chanfro), quina (coluna A / borda do teto), eixo */
  secoes: {
    1910:    [[760, 290], [795, 425], [810, 610], [804, 708], [768, 738], [696, 746], 750],
    1720:    [[771, 263], [803, 425], [818, 613], [811, 721], [767, 768], [702, 777], 782],
    832:     [[795, 255], [825, 425], [840, 625], [838, 770], [776, 909], [728, 924], 934],
    310:     [[795, 255], [825, 425], [840, 630], [838, 778], [775, 945], [612, 1362], 1380],
    '-300':  [[795, 255], [825, 425], [840, 632], [838, 785], [775, 945], [612, 1382], 1398],
    '-620':  [[795, 255], [825, 425], [840, 632], [838, 788], [775, 945], [612, 1381], 1397],
    '-1620': [[785, 258], [815, 426], [830, 630], [828, 797], [772, 944], [634, 1280], 1295],
    '-1730': [[778, 265], [808, 428], [824, 628], [822, 798], [768, 942], [664, 1170], 1180],
    '-1935': [[762, 285], [792, 430], [810, 625], [808, 800], [755, 932], [714, 962], 968],
  },
  /* estações intermediárias preservadas nas curvas superiores (apoio..eixo) acima dos vãos dos arcos para manter alinhamento exato com o capô */
  secoesIntermediarias: {
    1550:    [[780, 255], [810, 425], [825, 615], [818, 732], [766, 794], [708, 804], 810],
    1235:    [[790, 255], [820, 425], [835, 620], [830, 750], [774, 846], [718, 856], 864],
    '-1125': [[795, 255], [825, 425], [840, 632], [838, 792], [775, 945], [612, 1380], 1396],
  },
  frente: [
    [0, 290, 1945],
    [0, 425, 2000],
    [0, 610, 2018],
    [0, 712, 2018],
    [0, 744, 2000],
  ],
  /* Curva 1 (tuck-under traseiro): vertical no âmbar/vinco (-2022) e tombando para frente em direção ao para-choque (-1982) */
  traseira: [
    [0, 295, -1940],
    [0, 430, -1982],
    [0, 625, -2012],
    [0, 800, -2022],
    [0, 930, -2008],
  ],
  vincos: { lateral: 0.85, cintura: 0.28, quina: 0.14 },
  arcos: {
    dianteiro: { z: 1235, y: 290, raio: 350, lados: 32 },
    traseiro: { z: -1125, y: 290, raio: 350, lados: 32 },
  },
  vidros: {
    /* Coluna A fixa intacta no para-brisa + quadro completo da porta + Coluna B mais larga e paralela (~98 mm total) */
    porta: [[635, 962, 18], [255, 1310, 105], [-346, 1312, 16], [-356, 962, 16]],
    lateralTraseiro: [[-442, 1312, 18], [-1435, 1312, 24], [-1805, 974, 18], [-1770, 960, 18], [-456, 960, 24]],
    paraBrisaVista: [0, 0.77, 0.63],
    paraBrisa: [[-678, 948, 830, 34], [678, 948, 830, 34], [548, 1344, 365, 38], [-548, 1344, 365, 38]],
    traseiroVista: [0, 0.70, -0.71],
    traseiro: [[-516, 1312, -1605, 26], [516, 1312, -1605, 26], [586, 985, -1945, 24], [-586, 985, -1945, 24]],
  },
  aberturas: {
    /* contorno real da porta (vista x): soleira contínua em y = 255..328, coluna A fixa na frente com curva ampla (r = 135 mm concêntrica ao vidro), calha do teto em y = 1342 e coluna B fixa atrás */
    porta: [[820, 328, 16], [818, 918, 18], [745, 938, 18], [280, 1342, 135], [-388, 1342, 16], [-398, 945, 14], [-390, 328, 16]],
    /* contorno real do porta-malas (vista z '-'): acima do para-choque, acompanhando Curva 4 interna das lanternas e preservando colunas D fixas */
    tampaTraseira: [[-628, 524, 14], [628, 524, 14], [656, 842, 18], [570, 1348, 28], [-570, 1348, 28], [-656, 842, 18]],
    /* vão frontal para grade + faróis; o recorte do capô (topo + lábio até y = 700) entra via subtrair dedicado */
    frontal: [[-742, 568, 12], [742, 568, 12], [742, 700, 12], [-742, 700, 12]],
    /* Curva 4: borda interna acompanha o trapézio da tampa (634 embaixo subindo para 664 em cima) */
    lanternaTraseira: [[634, 530, 8], [776, 530, 10], [758, 842, 16], [664, 842, 10]],
    /* portinhola real do tanque de combustível na lateral traseira direita (+x) com cantos arredondados */
    tampaTanque: [[-1355, 655, 16], [-1505, 655, 16], [-1505, 795, 16], [-1355, 795, 16]],
  },
  parachoqueDianteiro: {
    y0: 282, y1: 524, xTrilho: 785, zFrente: 2022, zLateral: 1635, raioCanto: 98,
    avanco: 46, saia: 4, recuo: 25, frisoY: 484, frisoAlt: 7, frisoSaida: 3.5,
  },
  parachoqueTraseiro: {
    y0: 278, y1: 515, xTrilho: 790, zTras: -2025, zLateral: -1525, raioCanto: 90,
    avanco: 50, saia: 10, recuo: 25, frisoY: 480, frisoAlt: 7, frisoSaida: 3.5,
  },
  frisoLateral: {
    yCentro: 515, largura: 56, altura: 18, chanfro: 4, deslocamentoMm: -2,
    entreArcos: [-755, 865],
    traseiro: [-1495, -1920],
  },
  frentePecas: {
    grade: { meiaLarg: 446, y0: 568, y1: 702, zFundo0: 1950, zFundo1: 1988, zMoldura: 2009, zLamina: 2012, laminas: 7, lamY0: 578, lamY1: 688, lamAlt: 4.8 },
    farol: { x0Base: 432, x0Topo: 444, x1: 696, y0: 568, y1: 702, zCarc0: 1948, zCarc1: 1998, zLente0: 1994, zLente1: 2008 },
    seta: { x0: 700, x1: 792, y0: 567.5, y1: 702.5, z0: 1924, z1: 2002 },
    placa: { larg: 356, alt: 120, yCentro: 394, z0: 2054, z1: 2070 },
    neblina: { xCentro: 510, yCentro: 332, larg: 158, alt: 44, z0: 2024, z1: 2058 },
  },
  traseiraPecas: {
    lanterna: { x0: 655, x1: 776, yRe: [540, 610], yFreio: [610, 735], ySeta: [735, 810], zCarc0: -2008, zCarc1: -1918, zFrente: -2020, zTras: -1924 },
    placa: { larg: 340, alt: 135, yCentro: 695, z0: -2026, z1: -2008 },
    puxador: { larg: 460, alt: 30, yCentro: 795, z0: -2030, z1: -1998 },
    fechadura: { yCentro: 580, raio: 18, z0: -2016, z1: -1990 },
    escapamento: { x: 540, y: 236, raio: 26, z0: -2062, z1: -1880 },
  },
};

export const MATERIAIS = {
  lataria: { cor: '#4c5661', metalicidade: 0.35, aspereza: 0.4 },
  plasticoFosco: { cor: '#1b1e22', metalicidade: 0.05, aspereza: 0.8 },
  plasticoPreto: { cor: '#22262b', metalicidade: 0.05, aspereza: 0.72 },
  frisoClaro: { cor: '#b8bec6', metalicidade: 0.55, aspereza: 0.35 },
  lenteFarol: {
    cor: '#eef5fb', metalicidade: 0.03, aspereza: 0.03, mistura: 'transparente', opacidade: 0.32,
    verniz: 1.0, asperezaDoVerniz: 0.015, indiceDeRefracao: 1.52,
  },
  lenteNeblina: {
    cor: '#e8f0f6', metalicidade: 0.02, aspereza: 0.04, mistura: 'transparente', opacidade: 0.34,
    verniz: 0.98, asperezaDoVerniz: 0.02, indiceDeRefracao: 1.52,
  },
  setaAmbar: {
    cor: '#e86800', metalicidade: 0.03, aspereza: 0.05, mistura: 'transparente', opacidade: 0.68, emissivo: 0.08,
    verniz: 1.0, asperezaDoVerniz: 0.02, indiceDeRefracao: 1.49,
  },
  mascaraPrataFarol: { cor: '#e4ecf4', metalicidade: 0.85, aspereza: 0.10, verniz: 0.90 },
  refletorFarol: { cor: '#dce6f0', metalicidade: 0.96, aspereza: 0.06 },
  refletorNucleo: { cor: '#f4f8fc', metalicidade: 0.96, aspereza: 0.05 },
  calotaLampada: { cor: '#5a6470', metalicidade: 0.90, aspereza: 0.14 },
  bordaVidroFarol: { cor: '#b4bec8', metalicidade: 0.30, aspereza: 0.16, verniz: 0.92 },
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
  borrachaVidro: { cor: '#181b1f', metalicidade: 0.03, aspereza: 0.85 },
  espelhoRetrovisor: { cor: '#dce6ee', metalicidade: 0.98, aspereza: 0.04 },
  vidroAutomotivo: {
    cor: '#8cb4ae', metalicidade: 0.04, aspereza: 0.03, mistura: 'transparente', opacidade: 0.28,
    verniz: 1.0, asperezaDoVerniz: 0.015, indiceDeRefracao: 1.52,
  },
};

export function derivar(T) {
  const { rede, zs } = derivarChapa(T);
  const varridos = derivarParachoques(T);
  const capo = derivarCapo();
  return { rede, zs, varridos, capo };
}

export const ALIASES = [...ALIASES_FRENTE_TRASEIRA];

export function gerarPassos(T) {
  const { rede, varridos, capo } = derivar(T);
  const { medidas: _, cantos: cantosRede, ...passoRede } = rede.passo;
  const cantosChapa = (cantosRede ?? []).filter((c) => c !== 'f_cintura' && c !== 't_cintura');

  let nid = 16;
  const proxId = () => { const atual = nid; nid += 1; return atual; };

  const vaoCapo = passoVaoCapoNaChapa(proxId, { op: 'aberturaPorContorno', id: 15 });
  const selFinal = { origem: vaoCapo.origem };

  const plT = T.traseiraPecas.placa;
  const rebaixoPlaca = rebaixoPorContorno({
    corpo: { origem: { op: 'aberturaPorContorno', id: 14 } },
    vista: 'z',
    sentido: '-',
    profundidade: 5.5,
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

  /* borrachas de vedação (friso nativo sobre cada aberturaPorContorno) + vidros translúcidos (lente: true) */
  const perfBorracha = { retangulo: { largura: m(22), profundidade: m(9), centro: [0, m(-1.5)], cantos: m(2) } };
  const perfBorrachaPorta = { retangulo: { largura: m(18), profundidade: m(8.5), centro: [0, m(-1.5)], cantos: m(2) } };
  const idFrLat = proxId();
  const idFrPb = proxId();
  const idFrPd = proxId();
  const idFrPe = proxId();
  const idFrTr = proxId();

  const passosChapa = [
    ['subdivisao', { origemId: 1, ...passoRede, cantos: cantosChapa, borda: 'cantos', niveis: T.chapa.niveis, espessura: m(T.chapa.espessura), costuraExata: true }],
    /* recorta as duas portas como peças próprias (lente: true com recuoDaLente: 4 mm = fenda física real preservando 100% da curvatura da lataria) */
    ['aberturaPorContorno', { origemId: 6, chapa: { origem: { op: 'subdivisao', id: 1 } }, vista: 'x', sentido: '+', lente: true, recuoDaLente: m(4), contorno: contornoComFilete(T.aberturas.porta) }],
    ['aberturaPorContorno', { origemId: 7, chapa: { origem: { op: 'aberturaPorContorno', id: 6 } }, vista: 'x', sentido: '-', lente: true, recuoDaLente: m(4), contorno: contornoComFilete(T.aberturas.porta) }],
    /* abre os demais vãos na carroceria fixa (chapa) + recorta o porta-malas como peça separada (id: 10) */
    ['aberturaPorContorno', { origemId: 8, chapa: { origem: { op: 'aberturaPorContorno', id: 7 } }, vista: 'x', sentido: '+', simetria: 'x', lente: true, recuoDaLente: m(7), contorno: contornoComFilete(T.vidros.lateralTraseiro) }],
    ['aberturaPorContorno', { origemId: 9, chapa: { origem: { op: 'aberturaPorContorno', id: 8 } }, vista: T.vidros.paraBrisaVista, sentido: '+', lente: true, recuoDaLente: m(7), contorno: contornoComFilete(projetarVista(T.vidros.paraBrisaVista, T.vidros.paraBrisa)) }],
    /* gera a borracha do para-brisa logo após a abertura 9, antes de vaoCapo tocar as faces vizinhas */
    ['friso', { origemId: idFrPb, superficie: { op: 'aberturaPorContorno', id: 9 }, linha: { nome: 'borrachaParaBrisa' }, perfil: perfBorracha }],
    ['aberturaPorContorno', { origemId: 10, chapa: { origem: { op: 'aberturaPorContorno', id: 9 } }, vista: 'z', sentido: '-', lente: true, recuoDaLente: m(4), contorno: contornoComFilete(T.aberturas.tampaTraseira) }],
    ['aberturaPorContorno', { origemId: 11, chapa: { origem: { op: 'aberturaPorContorno', id: 10 } }, vista: 'z', sentido: '-', simetria: 'x', contorno: contornoComFilete(T.aberturas.lanternaTraseira) }],
    ['aberturaPorContorno', { origemId: 15, chapa: { origem: { op: 'aberturaPorContorno', id: 11 } }, vista: 'x', sentido: '+', lente: true, recuoDaLente: m(2.5), contorno: contornoComFilete(T.aberturas.tampaTanque) }],
    ...vaoCapo.passos,
  ];

  /* abre o vão do vidro dentro de cada porta independente (quadro completo) + vidro traseiro e rebaixo da placa na tampaTraseira + portinhola do tanque */
  const passosPortas = [
    ['aberturaPorContorno', { origemId: 12, chapa: { origem: { op: 'aberturaPorContorno', id: 6, parte: 'lente' } }, vista: 'x', sentido: '+', lente: true, recuoDaLente: m(6), contorno: contornoComFilete(T.vidros.porta) }],
    ['parte', { nome: 'portaDireita', material: 'lataria', sel: { origem: { op: 'aberturaPorContorno', id: 12 } } }],
    ['parte', { nome: 'portaDireita', material: 'vidroAutomotivo', sel: { origem: { op: 'aberturaPorContorno', id: 12, parte: 'lente' } } }],
    ['friso', { origemId: idFrPd, superficie: { op: 'aberturaPorContorno', id: 12 }, linha: { nome: 'borrachaPortaDireita' }, perfil: perfBorrachaPorta }],
    ['parte', { nome: 'portaDireita', material: 'borrachaVidro', sel: { origem: { op: 'friso', id: idFrPd } } }],

    /* vista [-1, 0, 0] tem exatamente u=+z, v=+y e eixo apontando para -x (fora da porta esquerda!), garantindo borda.fora na pele externa */
    ['aberturaPorContorno', { origemId: 13, chapa: { origem: { op: 'aberturaPorContorno', id: 7, parte: 'lente' } }, vista: [-1, 0, 0], sentido: '+', lente: true, recuoDaLente: m(6), contorno: contornoComFilete(T.vidros.porta) }],
    ['parte', { nome: 'portaEsquerda', material: 'lataria', sel: { origem: { op: 'aberturaPorContorno', id: 13 } } }],
    ['parte', { nome: 'portaEsquerda', material: 'vidroAutomotivo', sel: { origem: { op: 'aberturaPorContorno', id: 13, parte: 'lente' } } }],
    ['friso', { origemId: idFrPe, superficie: { op: 'aberturaPorContorno', id: 13 }, linha: { nome: 'borrachaPortaEsquerda' }, perfil: perfBorrachaPorta }],
    ['parte', { nome: 'portaEsquerda', material: 'borrachaVidro', sel: { origem: { op: 'friso', id: idFrPe } } }],

    ['aberturaPorContorno', { origemId: 14, chapa: { origem: { op: 'aberturaPorContorno', id: 10, parte: 'lente' } }, vista: T.vidros.traseiroVista, lente: true, recuoDaLente: m(7), contorno: contornoComFilete(projetarVista(T.vidros.traseiroVista, T.vidros.traseiro)) }],
    ...rebaixoPlaca.passos,
    ['parte', { nome: 'tampaTraseira', material: 'lataria', sel: { origem: rebaixoPlaca.origem } }],
    ['parte', { nome: 'tampaTraseira', material: 'vidroAutomotivo', sel: { origem: { op: 'aberturaPorContorno', id: 14, parte: 'lente' } } }],
    ['friso', { origemId: idFrTr, superficie: { op: 'aberturaPorContorno', id: 14 }, linha: { nome: 'borrachaVidroTraseiro' }, perfil: perfBorracha }],
    ['parte', { nome: 'tampaTraseira', material: 'borrachaVidro', sel: { origem: { op: 'friso', id: idFrTr } } }],

    ['parte', { nome: 'tampaTanque', material: 'lataria', sel: { origem: { op: 'aberturaPorContorno', id: 15, parte: 'lente' } } }],

    /* vidros e borrachas fixos na carroceria (para-brisa e laterais traseiros) */
    ['parte', { nome: 'vidros', material: 'vidroAutomotivo', sel: { origem: { op: 'aberturaPorContorno', id: 8, parte: 'lente' } } }],
    ['parte', { nome: 'vidros', material: 'vidroAutomotivo', sel: { origem: { op: 'aberturaPorContorno', id: 9, parte: 'lente' } } }],
    ['friso', { origemId: idFrLat, superficie: { op: 'aberturaPorContorno', id: 8 }, linha: { nome: 'borrachaLateralTraseiro' }, perfil: perfBorracha }],
    ['parte', { nome: 'borrachaVidros', material: 'borrachaVidro', sel: { origem: { op: 'friso', id: idFrLat } } }],
    ['parte', { nome: 'borrachaVidros', material: 'borrachaVidro', sel: { origem: { op: 'friso', id: idFrPb } } }],
  ];

  const aliasesChapa = [];

  return [
    ...passosChapa,
    ['parte', { nome: 'chapa', sel: selFinal }],
    ['material', { usa: 'lataria', sel: selFinal }],
    ...passosPortas,
    ...passosCapo(capo, proxId),
    ...passosParachoques(T, varridos, proxId, passosChapa, rede.pontos, aliasesChapa),
    ...passosFrenteTraseira(T, proxId),
    ...passosAcabamentos(T, proxId),
    ...passosRetrovisores(proxId),
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
  { par: ['chapa', 'borrachaVidros'], motivo: 'guarnições de borracha abraçam as bordas dos vãos do para-brisa e vidros laterais traseiros' },
  { par: ['borrachaVidros', 'vidros'], motivo: 'vidros fixos assentam dentro das guarnições de borracha preta' },
  { par: ['portaDireita', 'retrovisorDireito'], motivo: 'base triangular do retrovisor direito encaixa no canto dianteiro da janela da porta direita' },
  { par: ['portaEsquerda', 'retrovisorEsquerdo'], motivo: 'base triangular do retrovisor esquerdo encaixa no canto dianteiro da janela da porta esquerda' },
  { par: ['tampaTraseira', 'placaTraseira'], motivo: 'placa traseira apoia no rebaixo da tampa traseira' },
  { par: ['tampaTraseira', 'puxadorTampa'], motivo: 'puxador apoia na tampa traseira acima da placa' },
  { par: ['tampaTraseira', 'fechaduraTampa'], motivo: 'fechadura embute na tampa traseira abaixo da placa' },
];

export const PONTOS = [
  { nome: 'nariz', parte: 'chapa', medida: 'maximo', em: [835, 1390, 2025], toleranciaMm: 20 },
  { nome: 'fundo-traseiro', parte: 'chapa', medida: 'minimo', em: [-835, 255, -2025], toleranciaMm: 20 },
];

const receita = {
  meta: { nome: 'carro-quadrado/lataria', desc: 'Lataria, capô, frente, traseira, para-choques e friso lateral da perua quadrada' },
  PARAMS: TABELA,
  ALIASES,
  MATERIAIS,
  get TOPO() {
    const d = derivar(this.PARAMS);
    return {
      origem: 'centro do carro no chão: x para a direita, y para cima, frente em +z',
      ...d.rede.pontos,
      ...d.capo.rede.pontos,
      ...d.varridos.pcD.pontos,
      ...d.varridos.pcDFriso.pontos,
      ...d.varridos.pcT.pontos,
      ...d.varridos.pcTFriso.pontos,
    };
  },
  PLANO: {
    objeto: 'Lataria, capô separado, frente, traseira, para-choques e friso lateral da perua quadrada (4050 x 1670 x 1390 mm)',
    referencias: [
      '../../referencias/frontal.prancha.svg',
      '../../referencias/lateral.prancha.svg',
      '../../referencias/superior.prancha.svg',
      '../../referencias/traseira.prancha.svg',
    ],
    escala: { medida: 'comprimento total da chapa, de z -2025 a +2025 mm', milimetros: 4050 },
    partes: [
      { nome: 'chapa', forma: 'Casco contínuo com arcos de roda, vãos das portas, vãos dos vidros, vão do capô, vão frontal e vãos das lanternas', tecnica: 'Subdivisão de gaiolaPorRede com furoPassante, aberturaPorContorno e subtrair' },
      { nome: 'portaDireita', forma: 'Porta direita de quadro completo recortada da chapa com fenda física de 4 mm, friso lateral e maçaneta', tecnica: 'lente de aberturaPorContorno (+x, recuoDaLente 4 mm) com vão do vidro recortado, friso conformado e maçaneta' },
      { nome: 'portaEsquerda', forma: 'Porta esquerda de quadro completo recortada da chapa com fenda física de 4 mm, friso lateral e maçaneta', tecnica: 'lente de aberturaPorContorno (-x, recuoDaLente 4 mm) com vão do vidro recortado, friso conformado e maçaneta' },
      { nome: 'tampaTraseira', forma: 'Tampa traseira (porta-malas) separada com fenda física de 4 mm, vão do vidro traseiro e rebaixo trapezoidal da placa', tecnica: 'lente de aberturaPorContorno (-z, recuoDaLente 4 mm) com vão do vidro traseiro e rebaixoPorContorno da placa' },
      { nome: 'tampaTanque', forma: 'Portinhola real do tanque de combustível recortada na lateral traseira direita com cantos arredondados e fenda de 2,5 mm', tecnica: 'lente de aberturaPorContorno (+x, recuoDaLente 2,5 mm)' },
      { nome: 'arcosEstampados', forma: 'Abas circulares estampadas salientes na cor da lataria em volta dos 4 arcos de roda', tecnica: 'Subdivisão paramétrica amostrando a pele lateral da chapa e espelhada em x' },
      { nome: 'borrachaVidros', forma: 'Guarnições de borracha preta fosca contornando o para-brisa e os vidros laterais traseiros', tecnica: 'friso nativo sobre aberturaPorContorno com perfil retangular arredondado' },
      { nome: 'vidros', forma: 'Para-brisa e vidros laterais traseiros translúcidos levemente esverdeados', tecnica: 'lente de aberturaPorContorno em material vidroAutomotivo' },
      { nome: 'retrovisorDireito', forma: 'Retrovisor externo direito com base triangular, pedestal curto, concha aerodinâmica oca varrida e espelho embutido', tecnica: 'Malha paramétrica superelíptica em subdivisao + espelho recuado na cavidade' },
      { nome: 'retrovisorEsquerdo', forma: 'Retrovisor externo esquerdo espelhado com base triangular, pedestal curto, concha aerodinâmica oca varrida e espelho embutido', tecnica: 'Espelho em x do retrovisorDireito' },
      { nome: 'capo', forma: 'Capô como peça separada com dois vincos longitudinais, dobra frontal de lombada e 24 rasgos reais de respiro', tecnica: 'Subdivisão própria de gaiolaPorRede com espessura e subtrair dos rasgos de ventilação' },
      { nome: 'parachoqueDianteiro', forma: 'Corpo envolvente preto na frente com friso claro horizontal', tecnica: 'Subdivisão de gaiolaVarrida fechada contornando a frente até o arco dianteiro' },
      { nome: 'parachoqueTraseiro', forma: 'Corpo envolvente preto na traseira com friso claro horizontal', tecnica: 'Subdivisão de gaiolaVarrida fechada contornando a traseira até o arco traseiro' },
      { nome: 'frisoLateral', forma: 'Barras pretas laterais em y 515 entre os arcos', tecnica: 'conformarNaChapa em trilho sobre a chapa com simetria em x' },
      { nome: 'gradeFrontal', forma: 'Caixa escura recuada com 7 lâminas horizontais no centro do vão frontal', tecnica: 'Subdivisão trapezoidal acompanhando a inclinação dos faróis' },
      { nome: 'farol', forma: 'Par de faróis trapezoidais com máscara prata, parábola refletora 3D e lente estriada vertical', tecnica: 'Subdivisão espelhada em x com lente transparente estriada' },
      { nome: 'setaDianteira', forma: 'Par de setas âmbar curvas nos cantos externos da frente com estrias horizontais', tecnica: 'Subdivisão curva envolvente espelhada em x' },
      { nome: 'placaDianteira', forma: 'Placa retangular clara com cantos arredondados apoiada no para-choque dianteiro', tecnica: 'Subdivisão com cantos arredondados e moldura preta fina' },
      { nome: 'farolNeblina', forma: 'Par de faróis de neblina trapezoidais com bacia refletora 3D e lente estriada', tecnica: 'Subdivisão trapezoidal espelhada em x' },
      { nome: 'lanternaTraseira', forma: 'Par de lanternas envolventes de faixas empilhadas nos cantos traseiros', tecnica: 'Subdivisão curva envolvente 3D com lentes prismáticas translúcidas' },
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
    { contem: 'portaDireita', motivo: 'porta direita é peça móvel separada com fenda física real de 4 mm em relação à carroceria' },
    { contem: 'portaEsquerda', motivo: 'porta esquerda é peça móvel separada com fenda física real de 4 mm em relação à carroceria' },
    { contem: 'tampaTraseira', motivo: 'tampa traseira é peça móvel separada com fenda física real de 4 mm em relação à carroceria' },
    { contem: 'tampaTanque', motivo: 'portinhola do tanque é peça móvel separada com fenda física real de 2,5 mm no lado direito' },
    { contem: 'capo', motivo: 'capô é peça móvel separada com fenda física real de 4 mm em relação à lataria' },
    { contem: 'escapamento', motivo: 'tubo do escapamento fica sob o para-choque traseiro e liga ao chassi em etapa futura' },
  ],
  PONTOS,
  get vaos() {
    return [
      { nome: 'vaoPortaDireita', superficie: { op: 'aberturaPorContorno', id: 6 }, semMoldura: { motivo: 'a porta direita separada fecha o vão com fenda física real de 4 mm' } },
      { nome: 'vaoPortaEsquerda', superficie: { op: 'aberturaPorContorno', id: 7 }, semMoldura: { motivo: 'a porta esquerda separada fecha o vão com fenda física real de 4 mm' } },
      { nome: 'vidroLateralTraseiro', superficie: { op: 'aberturaPorContorno', id: 8 }, frisos: ['borrachaLateralTraseiro'] },
      { nome: 'paraBrisa', superficie: { op: 'aberturaPorContorno', id: 9 }, frisos: ['borrachaParaBrisa'] },
      { nome: 'vaoTampaTraseira', superficie: { op: 'aberturaPorContorno', id: 10 }, semMoldura: { motivo: 'a tampa traseira separada fecha o vão com fenda física real de 4 mm' } },
      { nome: 'vaoLanternaTraseira', superficie: { op: 'aberturaPorContorno', id: 11 }, semMoldura: { motivo: 'as lanternas traseiras fecham o vão diretamente' } },
      { nome: 'vidroPortaDireita', superficie: { op: 'aberturaPorContorno', id: 12 }, frisos: ['borrachaPortaDireita'] },
      { nome: 'vidroPortaEsquerda', superficie: { op: 'aberturaPorContorno', id: 13 }, frisos: ['borrachaPortaEsquerda'] },
      { nome: 'vidroTraseiro', superficie: { op: 'aberturaPorContorno', id: 14 }, frisos: ['borrachaVidroTraseiro'] },
      { nome: 'vaoTampaTanque', superficie: { op: 'aberturaPorContorno', id: 15 }, semMoldura: { motivo: 'a portinhola separada fecha o vão do tanque com fenda física real de 2,5 mm' } },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
