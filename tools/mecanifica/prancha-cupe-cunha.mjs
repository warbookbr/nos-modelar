#!/usr/bin/env node
/* prancha-cupe-cunha.mjs — prova R5 do plano do motor de prancha: uma carroceria
   ficcional desenhada do zero com âncora proporcional, traçado por filete e
   julgada pelo relatório antes de qualquer render. Cupê de cunha, motor central.
   Alvo de desenho, não geometria: nada aqui vira malha. */

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prancha, criarAncoras, imprimirRelatorio } from './prancha.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAIDA = path.join(REPO, 'docs', 'mecanifica', 'img', 'cupe-cunha-prancha.svg');

/* --- 1. calibrar: medidas rígidas e as duas verificações da skill ---------- */
const D = {
  comprimento: 4400, largura: 2040, altura: 1120, entreEixos: 2500,
  balancoD: 880, balancoT: 1020, bitolaD: 1640, bitolaT: 1690, alturaLivre: 100,
};
const RD = { z: 1250, x: 820, raio: 330, arco: 375, larg: 245 };
const RT = { z: -1250, x: 845, raio: 350, arco: 390, larg: 315 };
const zMax = D.entreEixos / 2 + D.balancoD;
const zMin = -(D.entreEixos / 2 + D.balancoT);
const xMax = D.largura / 2;

if (D.balancoD + D.entreEixos + D.balancoT !== D.comprimento) throw new Error('balanços e entre-eixos não somam o comprimento');
for (const [nome, r, meia] of [['traseira', RT, 1020], ['dianteira', RD, 975]]) {
  const fora = r.x + r.larg / 2;
  if (fora >= meia) throw new Error(`pneu ${nome} ultrapassa a carroceria: ${fora} >= ${meia}`);
}

/* Terceira verificação da skill, nascida deste desenho: o topo do arco de roda
   precisa caber sob a linha do capô, senão a roda fura a carroceria. */
const cristaDianteira = 0.70 * D.altura;
if (RD.raio + RD.arco >= cristaDianteira) throw new Error(`arco dianteiro ${RD.raio + RD.arco} não cabe sob a crista ${cristaDianteira}`);

const A = criarAncoras({ entreEixos: D.entreEixos, altura: D.altura, meiaLargura: xMax });
const { fz, fy } = A;

/* --- 2. silhueta: retas longas ligadas por raios curtos -------------------- */
/* A cunha é o caso extremo do que o filete existe para desenhar: capô, para-brisa,
   teto e tampa são praticamente planos, e o caráter mora nas quebras entre eles. */
/* A crista do para-lama precisa passar acima do arco de roda: o topo do arco
   dianteiro é 705 mm e a primeira versão punha o capô em 642 mm — a roda furava
   a carroceria. O relatório pegou como "corteCapo fora do contorno", porque o
   arco tinha virado a fronteira inferior naquela estação. */
const TOPO = [
  [zMax, fy(0.34)],
  [fz(1.05), fy(0.70), 1200],
  [fz(0.804), fy(0.777), 260],
  [fz(0.436), fy(1.00), 110],
  [fz(0.28), fy(0.998), 420],
  [fz(-0.18), fy(0.90), 700],
  [zMin, fy(0.87)],
];
const BASE = [
  /* Trecho reto na altura livre: filete aplicado num mínimo local sempre levanta
     a curva, e era por isso que a lateral parava em 115 mm enquanto as vistas
     verticais diziam 100. A coerência entre vistas acusou os 15 mm. */
  [[zMax, fy(0.34)], [2100, 168, 60], [2000, 100, 50], [1800, 100, 90], [RD.z + RD.arco, RD.raio]],
  [[RD.z - RD.arco, RD.raio], [700, 165, 90], [0, 150], [-700, 168, 90], [RT.z + RT.arco, RT.raio]],
  [[RT.z - RT.arco, RT.raio], [-1900, 175, 100], [-2150, 180, 120], [zMin, 320, 90], [zMin, fy(0.87)]],
];

/* --- 3. aberturas ---------------------------------------------------------- */
/* O canto dianteiro do vidro segue a linha do para-brisa: 748 mm ficava acima
   dela, e o relatório pegou. */
const VIDRO = [
  [730, 862, 40], [fz(0.475), 1070, 50], [fz(0.20), 1048, 60], [fz(0.17), 796, 40],
];
const GRELHAS = [0, 1, 2].map((i) => [
  [fz(0.20) - i * 150, 1050 - i * 18], [fz(0.02) - i * 150, 1010 - i * 18],
]);

/* --- 4. cortes de painel e caráter ---------------------------------------- */
/* Os cortes de porta param na soleira. Levá-los a 240 mm os punha abaixo da
   linha inferior, que já sobe para o arco nessas estações. */
const CORTE_PORTA_D = [[700, 852], [692, 560], [686, 300]];
const CORTE_PORTA_T = [[-790, 784], [-782, 520], [-774, 330]];
const CORTE_CAPO = [[1950, 440], [1400, 742, 700], [820, 836]];
/* Tomada lateral à frente da roda traseira: aresta viva, que é o ponto da cunha. */
/* A tomada precisa caber à frente do arco traseiro: além de z = −860 ela caía
   dentro da abertura da roda. */
const TOMADA = [
  [-350, 700, 30], [-780, 672, 30], [-820, 520, 30], [-390, 470, 30],
];
const CUNHA = [[2060, 424], [fz(0.60), 706, 900], [fz(0.02), 736], [fz(-0.14), 764]];
const SOLEIRA = [[700, 215], [0, 205], [-700, 220]];

/* --- 5. vistas de topo ----------------------------------------------------- */
/* A planta precisa cobrir a PEGADA da roda, não só o centro do eixo: a versão
   anterior estreitava rápido demais depois do eixo e o pneu aparecia para fora
   nas duas extremidades de cada roda. O relatório pegou assim que parei de
   silenciar a checagem. */
const PLANTA = [
  [2130, 480], [1900, 862, 400], [1600, 968, 600], [RD.z, 978, 500], [600, 950],
  [0, 960], [-900, 1020, 700], [-1600, 1014, 900], [-1900, 986, 600], [-2270, 830],
];
const FRONTAL = [
  [100, 900], [300, 962, 120], [620, 978, 300], [740, 975, 90],
  [800, 890, 70], [950, 790, 200], [1090, 640], [1120, 560],
];
const TRASEIRA = [
  [100, 890], [300, 955, 120], [650, 1010, 300], [800, 1020, 90],
  [870, 950, 70], [960, 860, 160], [980, 800],
];

const espelhoZ = (pts) => pts.map(([z, w, r]) => (r === undefined ? [z, -w] : [z, -w, r]));
const perfilV = (pts, k) => pts.map(([y, w, r]) => (r === undefined ? [k * w, y] : [k * w, y, r]));
/* Na lateral a roda desce legitimamente abaixo da soleira e passa por dentro do
   arco, que é abertura: aqui `foraDoContorno` tem razão de existir. */
const rodaLateral = (r) => [
  { vista: 'lateral', tipo: 'circulo', classe: 'roda', foraDoContorno: true, motivoForaDoContorno: 'roda atravessa a abertura do arco e fica abaixo da soleira na projeção lateral', centro: [r.z, r.raio], raio: r.raio },
  { vista: 'lateral', tipo: 'circulo', classe: 'aro', foraDoContorno: true, motivoForaDoContorno: 'aro acompanha a roda através da abertura do arco na projeção lateral', centro: [r.z, r.raio], raio: r.raio * 0.66 },
  { vista: 'lateral', tipo: 'arco', contorno: true, centro: [r.z, r.raio], raio: r.arco },
];
/* Na planta, roda fora da carroceria é o defeito que se quer pegar — foi assim
   que o pneu traseiro passou 12 mm para fora sem ninguém ver. Sem silenciamento. */
const rodaPlanta = (r) => [1, -1].map((k) => ({
  vista: 'planta', tipo: 'poli', classe: 'roda', fechado: true,
  pts: [[r.z - r.raio, k * r.x - r.larg / 2], [r.z + r.raio, k * r.x - r.larg / 2],
    [r.z + r.raio, k * r.x + r.larg / 2], [r.z - r.raio, k * r.x + r.larg / 2]],
}));
/* Nas vistas verticais o pneu aparece abaixo da soleira, fora do contorno do
   corpo: escape legítimo, mesmo caso da lateral. */
const rodaVertical = (vista, r) => [1, -1].map((k) => ({
  vista, tipo: 'poli', classe: 'roda', fechado: true, foraDoContorno: true, motivoForaDoContorno: 'roda aparece abaixo do contorno da carroceria nas vistas verticais',
  pts: [[k * r.x - r.larg / 2, 0], [k * r.x + r.larg / 2, 0],
    [k * r.x + r.larg / 2, r.raio * 1.6], [k * r.x - r.larg / 2, r.raio * 1.6]],
}));

const camadas = [
  { vista: 'lateral', tipo: 'poli', classe: 'eixo', pts: [[zMin - 80, 0], [zMax + 80, 0]] },
  {
    vista: 'lateral', contorno: true, nome: 'silhuetaSuperior', pts: TOPO,
    esperado: { concentracaoMax: 0.22, inversoesMax: 4, raioMinMin: 100 },
  },
  ...BASE.map((pts) => ({ vista: 'lateral', contorno: true, pts })),
  ...rodaLateral(RD), ...rodaLateral(RT),
  { vista: 'lateral', classe: 'vidro', nome: 'vidroLateral', pts: VIDRO, fechado: true },
  ...GRELHAS.map((pts, i) => ({ vista: 'lateral', tipo: 'poli', classe: 'painel', nome: `grelha${i}`, pts })),
  { vista: 'lateral', classe: 'painel', nome: 'cortePortaD', pts: CORTE_PORTA_D },
  { vista: 'lateral', classe: 'painel', nome: 'cortePortaT', pts: CORTE_PORTA_T },
  { vista: 'lateral', classe: 'painel', nome: 'corteCapo', pts: CORTE_CAPO },
  { vista: 'lateral', classe: 'painel', nome: 'tomadaLateral', pts: TOMADA, fechado: true },
  {
    vista: 'lateral', classe: 'carater', nome: 'linhaDaCunha', pts: CUNHA, foraDoContorno: true, motivoForaDoContorno: 'linha de caráter projetada no flanco pode ficar fora da silhueta do plano central',
    esperado: { concentracaoMax: 0.20, inversoesMax: 1 },
  },
  { vista: 'lateral', classe: 'painel', nome: 'soleira', pts: SOLEIRA },

  { vista: 'planta', tipo: 'poli', classe: 'eixo', pts: [[zMin - 80, 0], [zMax + 80, 0]] },
  { vista: 'planta', contorno: true, nome: 'plantaDireita', pts: PLANTA, esperado: { concentracaoMax: 0.45 } },
  { vista: 'planta', contorno: true, pts: espelhoZ(PLANTA) },
  { vista: 'planta', contorno: true, tipo: 'poli', pts: [[2130, 480], [2130, -480]] },
  { vista: 'planta', contorno: true, tipo: 'poli', pts: [[-2270, 830], [-2270, -830]] },
  ...rodaPlanta(RD), ...rodaPlanta(RT),
  { vista: 'planta', classe: 'vidro', pts: [[fz(0.804), 706], [fz(0.436), 566], [fz(0.436), -566], [fz(0.804), -706]] },
  { vista: 'planta', tipo: 'poli', classe: 'painel', pts: [[fz(0.20), 800], [fz(0.20), -800]] },
  { vista: 'planta', classe: 'painel', pts: [[1950, 560], [fz(1.06), 700, 600], [fz(0.804), 692]] },
  { vista: 'planta', classe: 'painel', pts: espelhoZ([[1950, 560], [fz(1.06), 700, 600], [fz(0.804), 692]]) },

  { vista: 'frontal', tipo: 'poli', classe: 'eixo', pts: [[0, -60], [0, D.altura + 40]] },
  ...rodaVertical('frontal', RD),
  ...[1, -1].map((k) => ({ vista: 'frontal', contorno: true, pts: perfilV(FRONTAL, k) })),
  { vista: 'frontal', contorno: true, tipo: 'poli', pts: [[-900, 100], [900, 100]] },
  { vista: 'frontal', contorno: true, tipo: 'poli', pts: [[-560, 1120], [560, 1120]] },
  { vista: 'frontal', classe: 'vidro', tipo: 'poli', pts: [[-560, 1108], [560, 1108]] },
  { vista: 'frontal', classe: 'painel', pts: [[-930, 752], [0, 726, 400], [930, 752]] },
  ...[1, -1].map((k) => ({
    vista: 'frontal', classe: 'cromo', tipo: 'poli', fechado: true,
    pts: [[k * 420, 640], [k * 880, 700], [k * 880, 790], [k * 420, 760]],
  })),
  { vista: 'frontal', classe: 'cromo', tipo: 'poli', fechado: true, pts: [[-380, 300], [380, 300], [340, 420], [-340, 420]] },

  { vista: 'traseira', tipo: 'poli', classe: 'eixo', pts: [[0, -60], [0, D.altura + 40]] },
  ...rodaVertical('traseira', RT),
  ...[1, -1].map((k) => ({ vista: 'traseira', contorno: true, pts: perfilV(TRASEIRA, k) })),
  { vista: 'traseira', contorno: true, tipo: 'poli', pts: [[-890, 100], [890, 100]] },
  /* A vista traseira precisa incluir o teto no contorno: sem ele o vidro
     traseiro ficava fora da região fechada. */
  ...[1, -1].map((k) => ({ vista: 'traseira', contorno: true, tipo: 'poli', pts: [[k * 800, 980], [k * 560, 1118]] })),
  { vista: 'traseira', contorno: true, tipo: 'poli', pts: [[-560, 1118], [560, 1118]] },
  { vista: 'traseira', classe: 'vidro', tipo: 'poli', pts: [[-540, 1106], [540, 1106], [560, 1004], [-560, 1004]] },
  { vista: 'traseira', classe: 'cromo', tipo: 'poli', fechado: true, pts: [[-780, 800], [780, 800], [780, 880], [-780, 880]] },
  { vista: 'traseira', classe: 'painel', tipo: 'poli', pts: [[-620, 300], [620, 300], [560, 460], [-560, 460]], fechado: true },
];

const spec = {
  titulo: 'Cupê de cunha, motor central — prancha ortográfica alvo',
  subtitulo: 'Carroceria ficcional. Milímetros. x = largura, y = altura, z = frente positiva. Escala 1:6,25.',
  escala: 0.16,
  tela: { largura: 1360, altura: 900 },
  limites: { zMin, zMax, yMax: D.altura, xMax },
  vistas: {
    lateral: { x: 46, y: 96, rotulo: 'LATERAL — plano x = 0, frente à direita' },
    traseira: { x: 830, y: 96, rotulo: 'TRASEIRA', leitura: 'projecao' },
    planta: { x: 46, y: 452, rotulo: 'SUPERIOR — frente à direita' },
    /* Seção no eixo dianteiro, não projeção do corpo inteiro: a anca traseira é
       mais larga e apareceria atrás numa prancha de convenção. Declarado, a
       coerência exige apenas que caiba dentro do corpo. */
    frontal: { x: 830, y: 452, rotulo: 'FRONTAL — seção no eixo dianteiro', leitura: 'secao' },
  },
  camadas,
  envelope: { comprimento: D.comprimento, largura: D.largura, altura: D.altura },
  cotas: [
    { vista: 'lateral', de: [RT.z, 0], ate: [RD.z, 0], desloca: [0, 34], texto: `entre-eixos ${D.entreEixos}` },
    { vista: 'lateral', de: [zMin, 0], ate: [zMax, 0], desloca: [0, 58], texto: `comprimento ${D.comprimento}` },
    { vista: 'lateral', de: [zMax, 0], ate: [zMax, D.altura], desloca: [34, 0], texto: `altura ${D.altura}` },
    { vista: 'traseira', de: [-xMax, 0], ate: [xMax, 0], desloca: [0, 34], texto: `largura ${D.largura}` },
    { vista: 'traseira', de: [-RT.x, 0], ate: [RT.x, 0], desloca: [0, 56], texto: `bitola tras. ${D.bitolaT}` },
    { vista: 'frontal', de: [-RD.x, 0], ate: [RD.x, 0], desloca: [0, 34], texto: `bitola diant. ${D.bitolaD}` },
  ],
  landmarks: [
    { vista: 'lateral', em: [zMax, fy(0.34)], id: 'C01', sobre: 'silhuetaSuperior' },
    { vista: 'lateral', em: [fz(0.804), fy(0.777)], id: 'C02', sobre: 'silhuetaSuperior' },
    { vista: 'lateral', em: [fz(0.436), fy(1.00)], id: 'C03', sobre: 'silhuetaSuperior', tolerancia: 12 },
    { vista: 'lateral', em: [fz(0.28), fy(0.998)], id: 'C04', sobre: 'silhuetaSuperior' },
    { vista: 'lateral', em: [fz(-0.18), fy(0.90)], id: 'C05', sobre: 'silhuetaSuperior', tolerancia: 12 },
    { vista: 'lateral', em: [zMin, fy(0.87)], id: 'C06', sobre: 'silhuetaSuperior' },
    { vista: 'lateral', em: [RD.z, RD.raio + RD.arco], id: 'C07', abaixo: true },
    { vista: 'lateral', em: [RT.z, RT.raio + RT.arco], id: 'C08', abaixo: true },
    { vista: 'planta', em: [-900, 1020], id: 'C09', sobre: 'plantaDireita' },
    { vista: 'planta', em: [RD.z, 975], id: 'C10', sobre: 'plantaDireita' },
  ],
  legenda: {
    x: 830, y: 700,
    itens: [
      ['#12233b', 'silhueta alvo, traçada por filete'],
      ['#3d6b86', 'envidraçado — para-brisa e janela lateral'],
      ['#2f4562', 'corte de painel, tomada e grelhas'],
      ['#8a94a2', 'roda, farol e lanterna'],
      ['#b3593d', 'linha da cunha e cotas'],
    ],
    notas: [
      'Prova R5 do plano do motor de prancha.',
      'Alvo de desenho, não geometria. Nada foi modelado.',
    ],
  },
};

const { svg, relatorio } = prancha(spec);
mkdirSync(path.dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, svg);
console.log(`prancha-cupe-cunha: ${path.relative(REPO, SAIDA)}`);
console.log(imprimirRelatorio(relatorio));
