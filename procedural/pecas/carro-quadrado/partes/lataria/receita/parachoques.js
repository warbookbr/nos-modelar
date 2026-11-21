/* carro-quadrado/lataria/receita/parachoques.js — para-choques envolventes com friso claro e frisos laterais conformados na chapa. */
import { m } from './chapa.js';
import { nucleo } from '../../../../../nucleo/nucleo.js';
import { gaiolaVarrida } from '../../../../../nucleo/gaiola-varrida.js';
import { conformarNaChapa } from '../../../../../nucleo/conformar-na-chapa.js';

export function derivarParachoques(T) {
  const pd = T.parachoqueDianteiro;
  const yd = (pd.y0 + pd.y1) / 2;
  const hd = (pd.y1 - pd.y0) / 2;
  const trilhoD = {
    pontos: [
      [-pd.xTrilho, yd, pd.zLateral],
      [-pd.xTrilho, yd, pd.zFrente],
      [pd.xTrilho, yd, pd.zFrente],
      [pd.xTrilho, yd, pd.zLateral],
    ],
    raios: pd.raioCanto,
  };
  const pcD = gaiolaVarrida({
    nome: 'pcD',
    trilho: trilhoD,
    quadro: { v: [0, 1, 0], virar: true },
    secao: [
      { u: -pd.recuo, v: -hd, nome: 'baseIn' },
      { u: pd.saia, v: -hd, nome: 'baseOut' },
      { u: pd.avanco - 14, v: -hd * 0.45, nome: 'saiaMeio' },
      { u: pd.avanco - 2, v: -hd * 0.05, nome: 'faixaBaixo' },
      { u: pd.avanco, v: hd * 0.78, nome: 'ombro' },
      { u: pd.avanco - 10, v: hd, nome: 'topoOut' },
      { u: -pd.recuo, v: hd, nome: 'topoIn' },
    ],
    fechada: true,
    tampas: true,
    vincos: [
      { linha: 'baseOut', nitidez: 0.6 },
      { linha: 'ombro', nitidez: 0.7 },
      { linha: 'topoOut', nitidez: 0.7 },
      { linha: 'topoIn', nitidez: 0.9 },
      { linha: 'baseIn', nitidez: 0.9 },
    ],
    estacoes: { passo: 120, graus: 15, flecha: 1.5 },
  });

  const yfd = pd.frisoY;
  const hfd = pd.frisoAlt / 2;
  const pcDFriso = gaiolaVarrida({
    nome: 'pcDFriso',
    trilho: {
      pontos: [
        [-pd.xTrilho, yfd, pd.zLateral + 6],
        [-pd.xTrilho, yfd, pd.zFrente],
        [pd.xTrilho, yfd, pd.zFrente],
        [pd.xTrilho, yfd, pd.zLateral + 6],
      ],
      raios: pd.raioCanto,
    },
    quadro: { v: [0, 1, 0], virar: true },
    secao: [
      { u: pd.avanco - 8, v: -hfd, nome: 'bIn' },
      { u: pd.avanco + pd.frisoSaida, v: -hfd, nome: 'bOut' },
      { u: pd.avanco + pd.frisoSaida, v: hfd, nome: 'tOut' },
      { u: pd.avanco - 8, v: hfd, nome: 'tIn' },
    ],
    fechada: true,
    tampas: true,
    vincos: [
      { linha: 'bOut', nitidez: 0.8 },
      { linha: 'tOut', nitidez: 0.8 },
    ],
    estacoes: { passo: 120, graus: 15, flecha: 1.5 },
  });

  const pt = T.parachoqueTraseiro;
  const yt = (pt.y0 + pt.y1) / 2;
  const ht = (pt.y1 - pt.y0) / 2;
  const pcT = gaiolaVarrida({
    nome: 'pcT',
    trilho: {
      pontos: [
        [pt.xTrilho, yt, pt.zLateral],
        [pt.xTrilho, yt, pt.zTras],
        [-pt.xTrilho, yt, pt.zTras],
        [-pt.xTrilho, yt, pt.zLateral],
      ],
      raios: pt.raioCanto,
    },
    quadro: { v: [0, 1, 0], virar: true },
    secao: [
      { u: -pt.recuo, v: -ht, nome: 'baseIn' },
      { u: pt.saia, v: -ht, nome: 'baseOut' },
      { u: pt.avanco - 10, v: -ht * 0.42, nome: 'saiaMeio' },
      { u: pt.avanco, v: ht * 0.78, nome: 'ombro' },
      { u: pt.avanco - 10, v: ht, nome: 'topoOut' },
      { u: -pt.recuo, v: ht, nome: 'topoIn' },
    ],
    fechada: true,
    tampas: true,
    vincos: [
      { linha: 'baseOut', nitidez: 0.6 },
      { linha: 'ombro', nitidez: 0.7 },
      { linha: 'topoOut', nitidez: 0.7 },
      { linha: 'topoIn', nitidez: 0.9 },
      { linha: 'baseIn', nitidez: 0.9 },
    ],
    estacoes: { passo: 120, graus: 15, flecha: 1.5 },
  });

  const yft = pt.frisoY;
  const hft = pt.frisoAlt / 2;
  const pcTFriso = gaiolaVarrida({
    nome: 'pcTFriso',
    trilho: {
      pontos: [
        [pt.xTrilho, yft, pt.zLateral - 6],
        [pt.xTrilho, yft, pt.zTras],
        [-pt.xTrilho, yft, pt.zTras],
        [-pt.xTrilho, yft, pt.zLateral - 6],
      ],
      raios: pt.raioCanto,
    },
    quadro: { v: [0, 1, 0], virar: true },
    secao: [
      { u: pt.avanco - 8, v: -hft, nome: 'bIn' },
      { u: pt.avanco + pt.frisoSaida, v: -hft, nome: 'bOut' },
      { u: pt.avanco + pt.frisoSaida, v: hft, nome: 'tOut' },
      { u: pt.avanco - 8, v: hft, nome: 'tIn' },
    ],
    fechada: true,
    tampas: true,
    vincos: [
      { linha: 'bOut', nitidez: 0.8 },
      { linha: 'tOut', nitidez: 0.8 },
    ],
    estacoes: { passo: 120, graus: 15, flecha: 1.5 },
  });

  return { pcD, pcDFriso, pcT, pcTFriso };
}

export function passosParachoques(T, varridos, proxId, passosChapa, pontosChapa, aliasesChapa = []) {
  const passos = [];
  const sub = (g, niveis = 1) => {
    const id = proxId();
    passos.push(['subdivisao', {
      origemId: id, vertices: g.vertices, faces: g.faces, vincos: g.vincos, cantos: g.cantos, borda: 'cantos', niveis,
    }]);
    return { op: 'subdivisao', id };
  };

  const oPcD = sub(varridos.pcD, 1);
  const oPcDFriso = sub(varridos.pcDFriso, 1);
  passos.push(['parte', { nome: 'parachoqueDianteiro', sel: { origem: oPcD }, material: 'plasticoPreto' }]);
  passos.push(['parte', { nome: 'parachoqueDianteiro', sel: { origem: oPcDFriso }, material: 'frisoClaro' }]);

  const oPcT = sub(varridos.pcT, 1);
  const oPcTFriso = sub(varridos.pcTFriso, 1);
  passos.push(['parte', { nome: 'parachoqueTraseiro', sel: { origem: oPcT }, material: 'plasticoPreto' }]);
  passos.push(['parte', { nome: 'parachoqueTraseiro', sel: { origem: oPcTFriso }, material: 'frisoClaro' }]);

  const fl = T.frisoLateral;
  const secaoFriso = { largura: fl.largura, altura: fl.altura, chanfro: fl.chanfro };
  const stChapa = nucleo([passosChapa[0]], {}, pontosChapa, {}, null, []);
  const baseFriso = {
    malha: { st: stChapa },
    vista: 'x',
    sentido: '+',
    simetria: 'x',
    unidade: 'm',
    secao: secaoFriso,
    deslocamentoMm: fl.deslocamentoMm,
    parte: 'frisoLateral',
    material: 'plasticoPreto',
  };
  const frisoMeio = conformarNaChapa({
    ...baseFriso,
    nome: 'frisoMeio',
    trilho: [[m(fl.yCentro), m(fl.entreArcos[0])], [m(fl.yCentro), m(fl.entreArcos[1])]],
    origemId: proxId(),
  });
  const frisoTras = conformarNaChapa({
    ...baseFriso,
    nome: 'frisoTras',
    trilho: [[m(fl.yCentro), m(fl.traseiro[0])], [m(fl.yCentro), m(fl.traseiro[1])]],
    origemId: proxId(),
  });
  passos.push(...frisoMeio.passos, ...frisoTras.passos);

  return passos;
}
