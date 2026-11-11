/* andar-de-cima.esboco.mjs: o terceiro ciclo de alta definição do sedã. O andar de baixo do segundo ciclo (o corpo de baixo do lado direito
 * e a metade direita do capô, de `caminho-a-gaiola-da-casca.esboco.mjs`) com a cabine por cima: o peitoril, a lateral com as colunas A,
 * B e C, o teto, o para-brisa e o vidro traseiro até o meio do carro, as três janelas laterais, os cinco vidros e as cinco molduras.
 *
 * A CABINE é uma chapa própria, de `gaiolaPorEstacoes` ao longo de z, com a cintura do andar de baixo como fronteira: o peitoril começa
 * 4 mm para dentro da borda da faixa de baixo, no mesmo plano dela, e esse é o vão entre as portas e o teto. As colunas da seção vão do
 * peitoril ao pé da lateral, sobem a lateral (o pé e o topo das janelas) até a quina da cabine e atravessam o topo até o meio do carro.
 * O topo das janelas corre a 103 mm abaixo da quina, e por isso, onde a quina desce com o para-brisa ou com o vidro traseiro, ele desce
 * junto: a coluna A e a coluna C saem inclinadas sem borda escrita à mão. Perto das pontas da cabine, onde a lateral é baixa, o pé e o
 * topo das janelas encolhem com a altura dela. As quinas têm raio em milímetro no vinco: o pé da lateral, a quina da cabine (a coluna A,
 * a calha do teto e a coluna C) e as duas quinas do teto com o para-brisa e com o vidro traseiro, essas ao longo de uma estação.
 *
 * AS JANELAS são vãos da gaiola. As laterais tiram as faces entre o pé e o topo da janela; o para-brisa e o vidro traseiro, que chegam
 * ao meio do carro, são vãos de borda livre: as colunas do meio terminam numa estação e recomeçam em outra. A MOLDURA é um `friso` sobre a
 * borda do vão (`bordaDoVao`), de 14 por 3,9 mm, que desce 0,9 mm na chapa. O VIDRO é uma chapa própria de 4 mm, com a face de fora a
 * 0,8 mm para dentro da pele, que passa 12 mm da borda do vão por baixo da chapa: a moldura e a chapa o tocam por cima.
 *
 * `HD_CONFERIR=0` tira o corte de conferência dos painéis de baixo, para iterar; `HD_CABINE=so` monta só a cabine com os vidros. */
import { gaiolaPorEstacoes } from '../../../nucleo/gaiola-por-estacoes.js';
import baixo from './caminho-a-gaiola-da-casca.esboco.mjs';
import { T, C, topoY, yQuina, xCabine, yTopoDaCabine, zDoParaBrisa, zDoVidroTraseiro } from './alvo.mjs';

const NIVEIS = 2;
const SO_CABINE = process.env.HD_CABINE === 'so';
const mm = (v) => v / 1000;

/* ---- as estações da cabine ---- */
const [w1a, w1b] = C.pontasDasJanelas.dianteira; const [w2a, w2b] = C.pontasDasJanelas.traseira; const [w3a, w3b] = C.pontasDasJanelas.vigia;
const NOMEADAS = [
  ['tras', C.zTras], ['vtBaixo', zDoVidroTraseiro(C.vidroTraseiro.y0)], ['vigiaTras', w3b], ['vtAlto', zDoVidroTraseiro(C.vidroTraseiro.y1)],
  ['topoDoVidroTraseiro', C.zTopoDoVidroTraseiro], ['vigiaFrente', w3a], ['portaTraseiraTras', w2b], ['portaTraseiraFrente', w2a],
  ['portaDianteiraTras', w1b], ['topoDoParaBrisa', C.zTopoDoParaBrisa], ['pbAlto', zDoParaBrisa(C.paraBrisa.y1)], ['portaDianteiraFrente', w1a],
  ['pbBaixo', zDoParaBrisa(C.paraBrisa.y0)], ['frente', C.zFrente],
];
/* entre duas nomeadas, estações de preenchimento a até 80 mm uma da outra */
const ESTACOES = [];
NOMEADAS.forEach(([nome, z], i) => {
  ESTACOES.push({ nome, z });
  if (i + 1 < NOMEADAS.length) {
    const z1 = NOMEADAS[i + 1][1]; const n = Math.ceil((z1 - z) / 80);
    for (let k = 1; k < n; k++) ESTACOES.push({ nome: `${nome}_${k}`, z: z + ((z1 - z) * k) / n });
  }
});
const dentro = (z, a, b) => z > Math.min(a, b) + 1e-6 && z < Math.max(a, b) - 1e-6;
const zDe = (nome) => NOMEADAS.find(([n]) => n === nome)[1];

/* ---- as colunas da cabine, do peitoril ao meio do carro ---- */
const DO_TOPO = [['faixaDoTeto', 35], ['borda', C.colunaA], ['t140', 140], ['t260', 260], ['t420', 420]];
const DO_MEIO = new Set(['t140', 't260', 't420', 'centro']);   /* as que somem no vão do para-brisa e no do vidro traseiro */
function colunasDe(nome, z) {
  const yPe = topoY(C.xPe, z); const yQ = yQuina(z); const h = yQ - yPe;
  const yJb = yPe + Math.min(C.peitorilDaJanela, 0.36 * h); const yJa = yQ - Math.min(C.quadroDeCima, 0.5 * h);
  const xQ = xCabine(yQ);
  const col = [
    { nome: 'base', em: [mm(C.xBase), mm(topoY(C.xBase, z))] },
    { nome: 'pe', em: [mm(C.xPe), mm(yPe)] },
    { nome: 'janelaBaixo', em: [mm(xCabine(yJb)), mm(yJb)] },
    { nome: 'janelaAlto', em: [mm(xCabine(yJa)), mm(yJa)] },
    { nome: 'quina', em: [mm(xQ), mm(yQ)] },
    ...DO_TOPO.map(([n, d]) => ({ nome: n, em: [mm(xQ - d), mm(yTopoDaCabine(xQ - d, z))] })),
    { nome: 'centro', em: [0, mm(yTopoDaCabine(0, z))] },
  ];
  const noVao = dentro(z, zDe('pbAlto'), zDe('pbBaixo')) || dentro(z, zDe('vtBaixo'), zDe('vtAlto'));
  /* a lista vai do meio do carro ao peitoril: o vão de borda livre só aceita que falte a primeira coluna dele */
  col.reverse();
  return col.flatMap((c) => {
    if (!DO_MEIO.has(c.nome)) return [c];
    if (noVao) return [];
    if (nome === 'pbAlto' || nome === 'vtBaixo') return [{ ...c, termina: true }];
    if (nome === 'pbBaixo' || nome === 'vtAlto') return [{ ...c, comeca: true }];
    return [c];
  });
}
const estacoes = ESTACOES.map(({ nome, z }) => ({ nome, em: mm(z), colunas: colunasDe(nome, z) }));

const JANELAS = [['janelaDianteira', 'portaDianteiraTras', 'portaDianteiraFrente'], ['janelaTraseira', 'portaTraseiraTras', 'portaTraseiraFrente'], ['vigia', 'vigiaTras', 'vigiaFrente']];
const vaos = [
  ...JANELAS.map(([nome, de, ate]) => ({ nome, estacoes: [de, ate], colunas: ['janelaAlto', 'janelaBaixo'] })),
  { nome: 'paraBrisa', estacoes: ['pbAlto', 'pbBaixo'], colunas: ['centro', 'borda'], livre: true },
  { nome: 'vidroTraseiro', estacoes: ['vtBaixo', 'vtAlto'], colunas: ['centro', 'borda'], livre: true },
];
/* A quina da cabine corta as estações na diagonal na coluna A e na coluna C, e o ajudante põe os apoios no plano da estação: medido por
   `raio:aresta`, o raio pedido de 4 mm saiu com 2,8 na coluna A e com 2,0 na coluna C (CICLO-3.md, atrito 2). O contorno é pedir em cada
   estação o raio dividido pela razão medida em cada trecho, e deixar 4 mm nas duas estações das quinas do teto. `HD_QUINA=4` volta ao
   raio único. */
const RAZAO_MEDIDA = { colunaA: 0.70, colunaC: 0.50 };
const RAIO_DA_QUINA = process.env.HD_QUINA ? Number(process.env.HD_QUINA)
  : ESTACOES.map(({ z }) => (z > C.zTopoDoParaBrisa + 1e-6 ? C.raioDaQuina / RAZAO_MEDIDA.colunaA : z < C.zTopoDoVidroTraseiro - 1e-6 ? C.raioDaQuina / RAZAO_MEDIDA.colunaC : C.raioDaQuina));
const vincos = [
  { nome: 'peDaCabine', coluna: 'pe', raio: C.raioDoPe },
  { nome: 'quinaDaCabine', coluna: 'quina', raio: RAIO_DA_QUINA },
  { nome: 'topoDoParaBrisa', estacao: 'topoDoParaBrisa', de: 'centro', ate: 'faixaDoTeto', raio: C.raioDoTopo },
  { nome: 'topoDoVidroTraseiro', estacao: 'topoDoVidroTraseiro', de: 'centro', ate: 'faixaDoTeto', raio: C.raioDoTopo },
];
const cantos = [['tras', 'base'], ['frente', 'base'], ['tras', 'centro'], ['frente', 'centro']].map(([estacao, coluna]) => ({ estacao, coluna }));
export const CABINE = gaiolaPorEstacoes({ eixo: 'z', estacoes, vaos, vincos, cantos, niveis: NIVEIS, prefixo: 'cab_', virar: process.env.HD_VIRAR !== '0' });

/* ---- os vidros: chapas de 4 mm, a face de fora 0,8 mm para dentro da pele, passando 12 mm da borda do vão ---- */
/* a pele da cabine em (u, z): na lateral u é a altura y, no topo u é a meia largura x; o ponto recua pela normal dela */
const normalDaLateral = (() => { const n = Math.hypot(1, C.inclinacao); return [1 / n, C.inclinacao / n, 0]; })();
function pontoDoTopo(x, z, recuo) {
  const e = 0.5; const y = yTopoDaCabine(x, z);
  const fx = (yTopoDaCabine(x + e, z) - yTopoDaCabine(x - e, z)) / (2 * e); const fz = (yTopoDaCabine(x, z + e) - yTopoDaCabine(x, z - e)) / (2 * e);
  const n = Math.hypot(fx, 1, fz); return [x + (recuo * fx) / n, y - recuo / n, z + (recuo * fz) / n];
}
const pontoDaLateral = (y, z, recuo) => [xCabine(y) - recuo * normalDaLateral[0], y - recuo * normalDaLateral[1], z];
const yDaJanela = (z) => { const yPe = topoY(C.xPe, z); const yQ = yQuina(z); const h = yQ - yPe; return [yPe + Math.min(C.peitorilDaJanela, 0.36 * h), yQ - Math.min(C.quadroDeCima, 0.5 * h)]; };
const { recuo: R, sobra: S } = C.vidro;
function vidroLateral(nome, de, ate) {
  const z0 = zDe(de) - S; const z1 = zDe(ate) + S;
  const zs = [z0, ...ESTACOES.map((e) => e.z).filter((z) => z > z0 + 5 && z < z1 - 5), z1];
  const est = zs.map((z, i) => {
    const [yb, ya] = yDaJanela(Math.min(Math.max(z, zDe(de)), zDe(ate)));
    const pts = [yb - S, (yb + ya) / 2, ya + S].map((y) => pontoDaLateral(y, z, R));
    return { nome: `s${i}`, em: mm(z), colunas: pts.map((p, k) => ({ nome: `c${k}`, em: [mm(p[0]), mm(p[1])] })) };
  });
  return gaiolaPorEstacoes({ eixo: 'z', estacoes: est, cantos: [{ estacao: est[0].nome }, { estacao: est.at(-1).nome }], prefixo: `${nome}_`, virar: process.env.HD_VIRAR_VIDRO === '1' });
}
function vidroDoTopo(nome, de, ate) {
  const z0 = Math.min(zDe(de), zDe(ate)) - S; const z1 = Math.max(zDe(de), zDe(ate)) + S;
  const zs = [z0, ...ESTACOES.map((e) => e.z).filter((z) => z > z0 + 5 && z < z1 - 5), z1];
  const est = zs.map((z, i) => {
    const xb = xCabine(yQuina(z)) - C.colunaA + S;
    const pts = [xb, (2 * xb) / 3, xb / 3, 0].map((x) => pontoDoTopo(x, z, R));
    pts[3][0] = 0;
    return { nome: `s${i}`, em: mm(z), colunas: pts.map((p, k) => ({ nome: `c${k}`, em: [mm(p[0]), mm(p[1]), mm(p[2] - z)] })) };
  });
  return gaiolaPorEstacoes({ eixo: 'z', estacoes: est, cantos: [{ estacao: est[0].nome }, { estacao: est.at(-1).nome }], prefixo: `${nome}_`, virar: process.env.HD_VIRAR_VIDRO === '1' });
}
export const VIDROS = [
  ['vidroDianteiroDir', vidroLateral('vidroDianteiroDir', 'portaDianteiraTras', 'portaDianteiraFrente'), 'janelaDianteira'],
  ['vidroTraseiroDaPortaDir', vidroLateral('vidroTraseiroDaPortaDir', 'portaTraseiraTras', 'portaTraseiraFrente'), 'janelaTraseira'],
  ['vigiaDir', vidroLateral('vigiaDir', 'vigiaTras', 'vigiaFrente'), 'vigia'],
  ['paraBrisa', vidroDoTopo('paraBrisa', 'pbAlto', 'pbBaixo'), 'paraBrisa'],
  ['vidroTraseiro', vidroDoTopo('vidroTraseiro', 'vtBaixo', 'vtAlto'), 'vidroTraseiro'],
];

/* ---- os passos ---- */
const emMm = (pontos) => Object.fromEntries(Object.entries(pontos).map(([k, p]) => [k, p.map((c) => c * 1000)]));
const comRaioEmMm = (passo) => ({ ...passo, vincos: (passo.vincos ?? []).map((v) => (v.raio != null ? { ...v, raio: Array.isArray(v.raio) ? v.raio.map((r) => r * 1000) : v.raio * 1000 } : v)) });
const opBaixo = baixo.opcoes[0];
const maior = (passos) => passos.reduce((m, p) => (Array.isArray(p) && Number.isSafeInteger(p[1]?.origemId) ? Math.max(m, p[1].origemId) : m), 0);
let id = (SO_CABINE ? 0 : maior(opBaixo.passos)) + 1;
const ID_CABINE = id++;
const passos = SO_CABINE ? [] : [...opBaixo.passos];
const topo = SO_CABINE ? {} : { ...opBaixo.topo };
Object.assign(topo, emMm(CABINE.pontos));
passos.push(['subdivisao', { origemId: ID_CABINE, ...comRaioEmMm(CABINE.passo), niveis: NIVEIS, borda: 'cantos', espessura: T.chapa }],
  ['parte', { nome: 'teto', sel: { origem: { op: 'subdivisao', id: ID_CABINE } } }], ['pincel', { modo: 'face', sel: { origem: { op: 'subdivisao', id: ID_CABINE } }, cor: '#ec7063' }]);
const MOLDURA = { retangulo: { largura: C.moldura.largura, profundidade: C.moldura.altura + 0.9, centro: [0, (C.moldura.altura - 0.9) / 2] } };
const contatos = SO_CABINE ? [] : [...opBaixo.contatos];
for (const [nome, g, vao] of VIDROS) {
  Object.assign(topo, emMm(g.pontos));
  const idV = id++; const idM = id++; const moldura = `moldura${nome[0].toUpperCase()}${nome.slice(1)}`;
  passos.push(['subdivisao', { origemId: idV, ...g.passo, niveis: 1, borda: 'cantos', espessura: C.vidro.espessura }],
    ['parte', { nome, sel: { origem: { op: 'subdivisao', id: idV } } }], ['pincel', { modo: 'face', sel: { origem: { op: 'subdivisao', id: idV } }, cor: '#20262d' }],
    ['friso', { origemId: idM, superficie: { op: 'subdivisao', id: ID_CABINE }, linha: { nome: moldura, pontos: CABINE.bordaDoVao(vao) }, perfil: MOLDURA }],
    ['parte', { nome: moldura, sel: { origem: { op: 'friso', id: idM } } }], ['pincel', { modo: 'face', sel: { origem: { op: 'friso', id: idM } }, cor: '#2c2f33' }]);
  contatos.push({ par: [nome, 'teto'], relacao: 'atravessa', motivo: 'o vidro passa 12 mm por baixo da borda do vão e é colado na chapa: a face de fora fica 0,2 mm dentro da pele de dentro' },
    { par: [moldura, 'teto'], relacao: 'atravessa', motivo: 'a moldura de borracha assenta na borda do vão e desce 0,9 mm na chapa' },
    { par: [moldura, nome], relacao: 'atravessa', motivo: 'a moldura assenta no vidro: o pé dela desce 0,1 mm abaixo da face de fora do vidro' });
}
if (!SO_CABINE) {
  for (const p of ['paraLamaDir', 'portaDianteiraDir', 'portaTraseiraDir', 'lateralTraseiraDir']) {
    contatos.push({ par: [p, 'teto'], relacao: 'folga', motivo: 'vão de 4 mm na cintura, entre o peitoril de baixo e o de cima', folga: { esperada: 4.1, tolerancia: 0.1, degrau: 0.3 } });
  }
}

export const AVISOS = { cabine: CABINE.avisos ?? [], vidros: VIDROS.flatMap(([n, g]) => (g.avisos ?? []).map((a) => ({ vidro: n, ...a }))) };
export const RAIOS = CABINE.raios ?? null;
export default {
  plano: 'Terceiro ciclo de alta definição do sedã: o andar de baixo do segundo ciclo com a cabine por cima, do mesmo lado, com as colunas, o teto, as janelas com moldura e os vidros.',
  vista: 'isometrica',
  opcoes: [{
    titulo: 'caminho A, ciclo 3: andar de baixo e cabine',
    nota: 'a cabine é uma gaiola por estações com raio no vinco, as janelas são vãos dela, a moldura é friso sobre a borda do vão e cada vidro é uma chapa própria',
    passos, topo, contatos,
  }],
};
