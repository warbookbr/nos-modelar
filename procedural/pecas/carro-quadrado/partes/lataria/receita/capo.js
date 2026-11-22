/* carro-quadrado/lataria/receita/capo.js — capô como peça separada real (gaiola quad com vincos longitudinais, dobra frontal de lombada e rasgos de respiro cortados na malha). */
import { gaiolaPorRede } from '../../../../../nucleo/gaiola-por-rede.js';
import { m } from './chapa.js';

const NIVEIS_CAPO = ['borda', 'canal', 'vinco', 'eixo'];

/* altura da superfície do capô alinhada com a chapa nos para-lamas, com ressalto central suave entre os 2 vincos longitudinais */
export function derivarCapo() {
  /* estações longitudinais: 0 = lábio frontal (dobra de lombada), 1 = topo frontal, 2..5 = corpo do capô até a base do para-brisa.
     borda externa segue reta exata de x = 694 (z = 2016) até x = 740 (z = 852), mantendo fenda física uniforme de 4 mm com a chapa. */
  const est = [
    { z: 2002, borda: [694, 704],   canal: [580, 706], vinco: [530, 708], eixo: 710 }, // lábio inferior frontal alinhado com a testa dos para-lamas
    { z: 1994, borda: [694.5, 738], canal: [580, 742], vinco: [532, 748], eixo: 754 }, // dobra frontal de lombada
    { z: 1910, borda: [698.2, 746], canal: [586, 750], vinco: [538, 758], eixo: 764 }, // início do plano do capô
    { z: 1550, borda: [712.4, 804], canal: [612, 808], vinco: [564, 818], eixo: 825 },
    { z: 1235, borda: [724.9, 856], canal: [634, 860], vinco: [590, 870], eixo: 878 },
    { z: 852,  borda: [740, 922],   canal: [656, 925], vinco: [615, 932], eixo: 938 }, // borda traseira junto ao para-brisa
  ];

  const nos = {};
  const nome = (i, j) => `cp${i}_${NIVEIS_CAPO[j]}`;
  const fixo = (p) => p.map((c) => +c.toFixed(3));

  est.forEach((s, i) => {
    /* flecha frontal convexa no centro (+14 mm no lábio, +12 mm na dobra) igual ao contorno frontal da chapa */
    const flecha = i === 0 ? 14 : i === 1 ? 12 : i === 2 ? 6 : 0;
    nos[nome(i, 0)] = fixo([s.borda[0], s.borda[1], s.z]);
    nos[nome(i, 1)] = fixo([s.canal[0], s.canal[1], s.z + flecha * 0.35]);
    nos[nome(i, 2)] = fixo([s.vinco[0], s.vinco[1], s.z + flecha * 0.65]);
    nos[nome(i, 3)] = fixo([0, s.eixo, s.z + flecha]);
  });

  const curvas = [];
  est.forEach((_, i) => {
    curvas.push({ nome: `CS${i}`, pontos: [0, 1, 2, 3].map((j) => nome(i, j)), ...(i === 0 || i === est.length - 1 ? { peso: 0.05 } : {}) });
  });
  NIVEIS_CAPO.forEach((_, j) => {
    const pts = est.map((_, i) => nome(i, j));
    /* vinco longitudinal suave no nível 2 ('vinco') cria o relevo real do capô (linhas laranjas) */
    const vinco = j === 2 ? 0.42 : undefined;
    curvas.push({ nome: `CL${j}`, pontos: pts, ...(vinco ? { vinco } : {}) });
  });

  const retalhos = [];
  const lado = (curva, de, ate) => ({ curva, de, ate });
  for (let i = 0; i < est.length - 1; i += 1) {
    for (let j = 0; j < NIVEIS_CAPO.length - 1; j += 1) {
      retalhos.push({
        nome: `cr${i}_${NIVEIS_CAPO[j]}`,
        borda: [
          lado(`CL${j}`, nome(i, j), nome(i + 1, j)),
          lado(`CS${i + 1}`, nome(i + 1, j), nome(i + 1, j + 1)),
          lado(`CL${j + 1}`, nome(i + 1, j + 1), nome(i, j + 1)),
          lado(`CS${i}`, nome(i, j + 1), nome(i, j)),
        ],
      });
    }
  }

  const rede = gaiolaPorRede({
    passo: 140,
    anguloMax: 18,
    fora: [0, 1, 0],
    simetria: 'x',
    nos,
    curvas,
    retalhos,
    interior: false,
    liso: false,
  });
  return { rede };
}

/* gera uma malha fechada composta por um único bloco de prismas verticais para cortar rasgos reais de respiro na chapa do capô */
function passosRasgosRespiro(proxId, origemCapo) {
  const passos = [];
  /* 12 rasgos finos por lado (24 ao todo) em x = ±96..±430, z = 868..904 (totalmente dentro do capô) */
  const verts = [];
  const faces = [];
  const addCaixa = (x0, x1, y0, y1, z0, z1) => {
    const b = verts.length;
    verts.push(
      [m(x0), m(y0), m(z0)], [m(x1), m(y0), m(z0)], [m(x1), m(y0), m(z1)], [m(x0), m(y0), m(z1)],
      [m(x0), m(y1), m(z0)], [m(x1), m(y1), m(z0)], [m(x1), m(y1), m(z1)], [m(x0), m(y1), m(z1)],
    );
    faces.push(
      [b + 0, b + 1, b + 2, b + 3],
      [b + 7, b + 6, b + 5, b + 4],
      [b + 0, b + 4, b + 5, b + 1],
      [b + 1, b + 5, b + 6, b + 2],
      [b + 2, b + 6, b + 7, b + 3],
      [b + 3, b + 7, b + 4, b + 0],
    );
  };
  for (const sinal of [-1, 1]) {
    for (let k = 0; k < 12; k += 1) {
      const xa = (98 + k * 28) * sinal;
      const xb = (98 + k * 28 + 13) * sinal;
      addCaixa(Math.min(xa, xb), Math.max(xa, xb), 895, 965, 868, 904);
    }
  }
  const idFerr = proxId();
  passos.push(['subdivisao', { origemId: idFerr, niveis: 0, vertices: verts, faces }]);
  const idSub = proxId();
  passos.push(['subtrair', {
    origemId: idSub,
    solidos: [{ origem: origemCapo }, { origem: { op: 'subdivisao', id: idFerr } }],
  }]);
  return { passos, origem: { op: 'subtrair', id: idSub } };
}

/* recorta na chapa o vão frontal (grade/faróis) e o vão real do capô (topo + lábio frontal até y = 700),
   deixando fenda física exata de 4 mm em volta da peça separada `capo` */
export function passoVaoCapoNaChapa(proxId, origemChapa) {
  const faces = [
    [0, 1, 2, 3], [7, 6, 5, 4],
    [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0],
  ];
  /* 1) vão frontal completo (grade + faróis + alojamento envolvente das setas nos cantos: x = ±840, y = 568..702, z = 1946..2040) */
  const idFerrF = proxId();
  const idSubF = proxId();
  const vF = [
    [m(-840), m(568), m(1946)], [m(840), m(568), m(1946)], [m(840), m(568), m(2040)], [m(-840), m(568), m(2040)],
    [m(-840), m(702), m(1946)], [m(840), m(702), m(1946)], [m(840), m(702), m(2040)], [m(-840), m(702), m(2040)],
  ];
  /* 2) vão real do capô (topo + lábio frontal até y = 700, fenda física de 4 mm em volta de `capo`) */
  const idFerrC = proxId();
  const idSubC = proxId();
  const xF = 698; // em z = 2040 (alinhado com x = 694 do capô + 4 mm de fenda)
  const xT = 744; // em z = 848  (alinhado com x = 740 do capô + 4 mm de fenda)
  const vC = [
    [m(-xT), m(700), m(848)], [m(xT), m(700), m(848)], [m(xF), m(700), m(2040)], [m(-xF), m(700), m(2040)],
    [m(-xT), m(990), m(848)], [m(xT), m(990), m(848)], [m(xF), m(990), m(2040)], [m(-xF), m(990), m(2040)],
  ];
  return {
    passos: [
      ['subdivisao', { origemId: idFerrF, niveis: 0, vertices: vF, faces }],
      ['subtrair', { origemId: idSubF, solidos: [{ origem: origemChapa }, { origem: { op: 'subdivisao', id: idFerrF } }] }],
      ['subdivisao', { origemId: idFerrC, niveis: 0, vertices: vC, faces }],
      ['subtrair', { origemId: idSubC, solidos: [{ origem: { op: 'subtrair', id: idSubF } }, { origem: { op: 'subdivisao', id: idFerrC } }] }],
    ],
    origem: { op: 'subtrair', id: idSubC },
  };
}

export function passosCapo(capoDerivado, proxId) {
  const passos = [];
  const { medidas: _, cantos: cantosRede, ...passoRede } = capoDerivado.rede.passo;
  /* remove pontos interiores do eixo x=0 dos cantos para o centro do capô ficar 100% liso sem losango */
  const cantosCapo = (cantosRede ?? []).filter((c) => !c.endsWith('_eixo'));

  const idSub = proxId();
  const oBase = { op: 'subdivisao', id: idSub };
  passos.push(['subdivisao', {
    origemId: idSub,
    ...passoRede,
    cantos: cantosCapo,
    borda: 'cantos',
    niveis: 2,
    espessura: m(6),
    costuraExata: true,
  }]);

  /* abre os 24 rasgos reais de respiro diretamente na malha do capô */
  const rasgos = passosRasgosRespiro(proxId, oBase);
  passos.push(...rasgos.passos);
  passos.push(['parte', { nome: 'capo', material: 'lataria', sel: { origem: rasgos.origem } }]);

  return passos;
}
