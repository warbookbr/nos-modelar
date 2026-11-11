/* alvo.mjs: o alvo comum dos dois caminhos do primeiro ciclo de alta definição do sedã (fatia 4c do plano do núcleo para qualquer
 * mecanismo). O trecho é o corpo de baixo do lado direito, da linha de cintura para baixo, do para-lama dianteiro à lateral
 * traseira, mais o topo da frente (a faixa de cima do para-lama e a metade direita do capô, sem a tomada de ar).
 *
 * Os números de `T` são os do rascunho facetado (`../referencias/sedan-chassi-e-lataria.esboco.mjs`): o perfil lateral, a planta, os
 * arcos de roda e as linhas de vão. O que é deste ciclo: a flecha do capô, o bojo da lateral na altura, a quina do ombro do para-lama
 * e os raios pedidos nas arestas de caráter. Não há referência de alta definição; a forma é a do carro facetado com flecha e raio.
 *
 * Eixos do rascunho: x lateral (direita em +x), y altura com o chão em 0, z comprimento com a frente em +z. Tudo em mm.
 *
 * `ladoX(z, y)` é a lateral e `topoY(x, z)` o topo. As duas funções valem para os dois caminhos: o caminho A amostra nelas os pontos da
 * gaiola nas estações da planta do rascunho, e o caminho B amostra nelas os pontos-chave das curvas de feição. */
import { paineisPorVaos } from '../../../nucleo/paineis-por-vaos.js';

export const T = {
  chapa: 1,
  vao: 4,
  /* do rascunho */
  ladoTopo: [[2122, 970], [1879, 1000], [-1421, 1000], [-2087, 972]],
  ladoFundo: [[2122, 419], [-1581, 419], [-2087, 460]],
  planta: [[2122, 770], [2060, 852], [2000, 872], [1700, 926], [1421, 934], [871, 933], [700, 885], [560, 860], [-560, 860], [-700, 885], [-800, 913], [-1237, 928], [-1650, 911], [-1925, 888], [-2087, 880]],
  meiaDaCabine: 860,
  roda: { raio: 364, zFrente: 1249, zTras: -1181, folgaDoArco: 40 },
  zFrente: 1990, zTras: -2000, xCapo: 760, zCapo: 690, zPortas: -45, zLateral: -760, ySoleira: 470,
  /* deste ciclo */
  zPeDoCapo: Number(process.env.HD_ZPE ?? 693),       /* a borda de trás do topo da frente, 1 mm além da lâmina do vão do para-lama com a porta (z 688 a 692): com a borda em 690 a lâmina
                           desenhada na vista de lado cortava a quina arredondada da cintura de topo, a 89 graus, e o ajudante recusava a linha */
  yOmbro: 890,          /* a quina do ombro: acima dela a lateral é a da cabine, abaixo dela o para-lama alarga até a planta */
  yAlargado: 700,       /* a altura em que o alargamento do para-lama chega à planta */
  bojo: 6,              /* flecha da lateral na altura, em mm, com o máximo em y 710 */
  flechaDoCapo: 8,      /* flecha do topo na largura, em mm, com o máximo no meio do carro */
  raioDaCintura: 6,     /* raio pedido na quina do topo com a lateral (a linha de cintura, que na frente é o capô com o para-lama) */
  raioDoOmbro: 3,       /* raio pedido na quina do ombro do para-lama */
};

/* A tabela do rascunho é uma polilinha, com quina em cada vértice (a planta dobra onde o alargamento do para-lama começa). O alvo de alta
   definição passa pelos mesmos vértices com tangente contínua: a cúbica monótona de Fritsch e Carlson, que não ultrapassa os vértices. */
function suave(tabela) {
  const t = [...tabela].sort((a, b) => a[0] - b[0]);
  const n = t.length;
  const h = []; const d = [];
  for (let i = 0; i + 1 < n; i++) { h.push(t[i + 1][0] - t[i][0]); d.push((t[i + 1][1] - t[i][1]) / h[i]); }
  const m = t.map((_, i) => {
    if (i === 0) return d[0];
    if (i === n - 1) return d[n - 2];
    if (d[i - 1] * d[i] <= 0) return 0;
    const w1 = 2 * h[i] + h[i - 1]; const w2 = h[i] + 2 * h[i - 1];
    return (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  });
  return (z) => {
    if (z <= t[0][0]) return t[0][1];
    if (z >= t[n - 1][0]) return t[n - 1][1];
    let i = 0; while (z > t[i + 1][0]) i++;
    const u = (z - t[i][0]) / h[i]; const u2 = u * u; const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * t[i][1] + (u3 - 2 * u2 + u) * h[i] * m[i] + (-2 * u3 + 3 * u2) * t[i + 1][1] + (u3 - u2) * h[i] * m[i + 1];
  };
}
export const yTopo = suave(T.ladoTopo);
export const yFundo = suave(T.ladoFundo);
export const meia = suave(T.planta);
export const R_ARCO = T.roda.raio + T.roda.folgaDoArco;

/** A lateral: a meia largura em (z, y). */
export function ladoX(z, y) {
  const t = Math.min(1, Math.max(0, (T.yOmbro - y) / (T.yOmbro - T.yAlargado)));
  const alarga = (meia(z) - T.meiaDaCabine) * (1 - (1 - t) ** 2);
  const bojo = T.bojo * Math.max(0, 1 - ((y - 710) / 290) ** 2);
  return T.meiaDaCabine + alarga + bojo;
}
/** O topo da frente: a altura em (x, z), com a flecha na largura. */
export function topoY(x, z) {
  const xc = ladoX(z, yTopo(z));
  return yTopo(z) + T.flechaDoCapo * (1 - (x / xc) ** 2);
}
export const noLado = (z, y) => [ladoX(z, y), y, z];
export const naCintura = (z) => noLado(z, yTopo(z));
export const noTopo = (x, z) => [x, topoY(x, z), z];
/** O ponto do arco de roda no ângulo dado (graus, 0 para a frente, 90 para cima), sobre a lateral. */
export function noArco(zCentro, graus, raio = R_ARCO) {
  const a = (graus * Math.PI) / 180;
  return noLado(zCentro + raio * Math.cos(a), T.roda.raio + raio * Math.sin(a));
}

/* ---- as linhas de vão e os painéis, iguais nos dois caminhos ---- */
const G = T.vao / 2;
const circulo = (zc, R, n = 48) => Array.from({ length: n }, (_, k) => { const a = (2 * Math.PI * k) / n; return [zc + R * Math.cos(a), T.roda.raio + R * Math.sin(a)]; });

/** As linhas de vão do trecho. `arcos: true` abre os arcos de roda pelo corte (caminho A); no caminho B o arco já é borda da chapa. */
export function linhasDeVao({ arcos }) {
  const L = [
    /* de cima ([x, z]): o capô contra a faixa de cima do para-lama */
    { nome: 'capo', eixo: 'y', pontos: [[T.xCapo, T.zPeDoCapo + 0.5], [T.xCapo, T.zFrente - 0.5]], alcance: [900, 1200], alem: 30 },
    /* de lado ([z, y]); o alcance em x começa dentro do vão do capô, para a lâmina não entalhar o capô */
    { nome: 'fimDoParaLama', eixo: 'x', pontos: [[T.zCapo, 1040], [T.zCapo, yFundo(T.zCapo) - 40]], alcance: [T.xCapo - 1, 1100] },
    { nome: 'entrePortas', eixo: 'x', pontos: [[T.zPortas, T.ySoleira], [T.zPortas, 1040]] },
    { nome: 'fimDaPortaTraseira', eixo: 'x', pontos: [[T.zLateral, 1040], [T.zLateral, yFundo(T.zLateral) - 40]] },
    { nome: 'soleira', eixo: 'x', pontos: [[T.zCapo, T.ySoleira], [T.zLateral, T.ySoleira]] },
  ];
  if (arcos) {
    /* o furo fica no modo vista: no modo superfície a volta fechada com `dentro: 'descarta'` deixou o disco de dentro como pedaço sem nome */
    L.push({ nome: 'arcoDianteiro', eixo: 'x', pontos: circulo(T.roda.zFrente, R_ARCO - G), fechada: true, dentro: 'descarta', modo: 'vista' });
    L.push({ nome: 'arcoTraseiro', eixo: 'x', pontos: circulo(T.roda.zTras, R_ARCO - G), fechada: true, dentro: 'descarta', modo: 'vista' });
  }
  return L;
}
export const PAINEIS = [
  { nome: 'capo', eixo: 'y', ponto: [300, 1300] },
  { nome: 'paraLamaDir', eixo: 'x', ponto: [1800, 940], lado: '+' },
  { nome: 'portaDianteiraDir', eixo: 'x', ponto: [300, 700], lado: '+' },
  { nome: 'portaTraseiraDir', eixo: 'x', ponto: [-400, 700], lado: '+' },
  { nome: 'lateralTraseiraDir', eixo: 'x', ponto: [-1800, 940], lado: '+' },
  { nome: 'soleiraDir', eixo: 'x', ponto: [0, 445], lado: '+' },
];
export const CORES = { capo: '#d9483b', paraLamaDir: '#2e86c1', portaDianteiraDir: '#27ae60', portaTraseiraDir: '#f1c40f', lateralTraseiraDir: '#c0392b', soleiraDir: '#7f8c8d' };
/* os vãos que `npm run vao:partes` confere */
export const FOLGAS = [['capo', 'paraLamaDir'], ['paraLamaDir', 'portaDianteiraDir'], ['portaDianteiraDir', 'portaTraseiraDir'], ['portaTraseiraDir', 'lateralTraseiraDir'],
  ['portaDianteiraDir', 'soleiraDir'], ['portaTraseiraDir', 'soleiraDir'], ['paraLamaDir', 'soleiraDir'], ['lateralTraseiraDir', 'soleiraDir']]
  .map((par) => ({ par, esperada: 4.1, tolerancia: 0.1, degrau: 0.3 }));

/** O esboço 2.0 de um caminho, em mm: a chapa de subdivisão com a espessura e, salvo com `HD_PAINEIS=0`, o corte em painéis.
 * `pontos` vem em mm (o `topo` da opção) e `passo` são os campos do passo `subdivisao` por nome. `HD_MODO` troca o modo da lâmina
 * de `paineisPorVaos` ('superficie', o padrão aqui, ou 'vista'). `extras` são passos a mais, em mm, postos depois da chapa e do corte. */
export function esbocoDoCaminho({ titulo, nota, pontos, passo, niveis, arcos, extras = [] }) {
  const chapa = ['subdivisao', { origemId: 1, ...passo, niveis, borda: 'cantos', espessura: T.chapa }];
  const semPaineis = process.env.HD_PAINEIS === '0';
  const modo = process.env.HD_MODO ?? 'superficie';
  let passos; let medidas = null; let avisos = [];
  if (!semPaineis) {
    const g = paineisPorVaos({ chapa: { passos: [chapa], origem: { op: 'subdivisao', id: 1 }, pontos }, vao: T.vao, modo, linhas: linhasDeVao({ arcos }), paineis: PAINEIS });
    passos = [...g.passos];
    for (const p of PAINEIS) passos.push(['pincel', { modo: 'face', sel: { grupo: p.nome }, cor: CORES[p.nome] }]);
    medidas = g.medidas; avisos = g.avisos;
  } else {
    passos = [chapa, ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }]];
  }
  passos.push(...extras);
  const esboco = {
    plano: 'Primeiro ciclo de alta definição do sedã: o corpo de baixo do lado direito e a metade direita do capô, em chapa de 1 mm com vão de 4 mm, como diagnóstico.',
    vista: 'isometrica',
    opcoes: [{ titulo, nota, passos, topo: pontos,
      contatos: semPaineis ? [] : FOLGAS.map(({ par, esperada, tolerancia, degrau }) => ({ par, relacao: 'folga', motivo: 'vão de 4 mm entre painéis da mesma chapa', folga: { esperada, tolerancia, degrau } })) }],
  };
  return { esboco, medidas, avisos };
}
