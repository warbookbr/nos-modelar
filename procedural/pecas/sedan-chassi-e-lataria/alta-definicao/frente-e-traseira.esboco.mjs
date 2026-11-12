/* frente-e-traseira.esboco.mjs: o quarto ciclo de alta definição do sedã, levado ao carro inteiro no quinto. No ciclo 5 cada gaiola por
 * estações é a metade x >= 0 com `simetria: 'x'`, os para-choques vão de ponta a ponta com o raio no laço da ponta, e o farol e a lanterna
 * são rebaixos por relevo com a lente que o anel devolve; o texto abaixo é o do ciclo 4.
 *
 * O lado direito inteiro, até o eixo de simetria: os dois andares de
 * `andar-de-cima.esboco.mjs` (que já trazem o capô até a borda da frente e a tampa do porta-malas) mais o painel da frente com a grade e o
 * farol, o painel de trás com a lanterna, os dois para-choques e a tomada de ar do capô.
 *
 * O PAINEL DA FRENTE e o DE TRÁS são chapas próprias de 1 mm, de `gaiolaPorEstacoes` ao longo de x, no plano da borda da chapa de baixo
 * (z 2118 e -2083): a 4 mm do capô e da tampa por cima, a 4 mm do para-lama e da lateral traseira dos lados. A última estação segue a borda
 * do para-lama em cada altura (o terceiro número da coluna desloca o ponto ao longo de x). O FAROL é um vão com um anel de três voltas
 * deslocadas para dentro (o `relevo` dos anéis), que é a tentativa de rebaixo com o que existe: a chapa desce 14 mm até a abertura, com o
 * raio que a subdivisão dá entre as voltas. A lente é uma chapa própria atrás da abertura. A GRADE é um vão que vai até o eixo, com cinco
 * lâminas horizontais de caixa. A LANTERNA é um vão com a lente rente, como os vidros do ciclo 3.
 *
 * OS PARA-CHOQUES são sólidos de `gaiolaPorLacos` ao longo de x, com os laços retangulares de quinas com raio, abertos no eixo (para o
 * espelho) e tampados na ponta; o da frente envolve o canto do para-lama, o de trás fecha em chanfro. A TOMADA DE AR é uma chapa de
 * `gaiolaPorEstacoes` ao longo de z sobre o capô, aberta na frente (a boca) e fundida no capô atrás, pela divisão de colunas do ciclo 4.
 *
 * `HD_CONFERIR=0` tira o corte de conferência dos painéis de baixo, para iterar; `HD_SO=frente` monta só as peças deste arquivo. */
import { gaiolaPorEstacoes } from '../../../nucleo/gaiola-por-estacoes.js';
import { gaiolaPorLacos } from '../../../nucleo/gaiola-por-lacos.js';
import doisAndares from './andar-de-cima.esboco.mjs';
import { GAIOLA as BAIXO } from './caminho-a-gaiola-da-casca.esboco.mjs';
import { curvaDaGaiola } from '../../../nucleo/curva-da-gaiola.js';
import { SIMETRIA } from './caminho-a-gaiola-da-casca.esboco.mjs';
import { espelharGaiola } from './espelho.mjs';
import { T, topoY, ladoX, meia } from './alvo.mjs';

const SO = process.env.HD_SO === 'frente';
const mm = (v) => v / 1000;
const emMm = (pontos) => Object.fromEntries(Object.entries(pontos).map(([k, p]) => [k, p.map((c) => c * 1000)]));
const comRaioEmMm = (passo) => ({ ...passo, vincos: (passo.vincos ?? []).map((v) => (v.raio != null ? { ...v, raio: Array.isArray(v.raio) ? v.raio.map((r) => r * 1000) : v.raio * 1000 } : v)) });
const V = T.vao;

/* ---- o desenho da frente e da traseira, em mm ---- */
export const F = {
  /* o recuo de cada lado é o que o anel aceita para a transição das voltas até a grade (ele diz a faixa que fecha em cada lado) */
  farol: { x: [310, 750], y: [715, 935], recuo: { farolBaixo: 42, farolAlto: 39, farolIni: 36, farolFim: 34 }, voltas: 3, largura: 7, raio: 18, relevo: [-14, -9, -4] },
  grade: { x: 283, y: [760, 930], laminas: 5, espessura: 7, fundo: 28 },
  /* ciclo 5: a lanterna também é rebaixo por relevo, com a lente do anel; o vão é o da abertura (no facetado, x 440 a 840 e y 815 a 925) mais
     o recuo de cada lado, e o alto dele é a altura do ombro, que a coluna dele dá à borda do painel */
  lanterna: { x: [400, 830], y: [715, 890], recuo: { lanternaBaixo: 45, lanternaAlto: 45, lanternaIni: 45, lanternaFim: 43 }, voltas: 3, largura: 7, raio: 18, relevo: [-14, -9, -4] },
  lente: { recuo: 0.8, sobra: 6, espessura: 4 },
  paraChoque: { frente: { y: [413, 745], fundo: 72, raio: 8, raioDeTras: 3, raioDaPonta: Number(process.env.HD_RAIO_PONTA ?? 6), ponta: 860, plano: 790 }, tras: { y: [457, 745], fundo: 72, raio: 8, raioDeTras: 3, raioDaPonta: Number(process.env.HD_RAIO_PONTA ?? 6), ponta: 856, chanfro: 800 } },
  tomada: { z: [790, 1760], zCheia: 880, altura: 70, meia: [230, 420], raio: 6 },
};

/* ---- os painéis: a chapa vertical no plano z, de x 0 à borda do para-lama menos o vão ---- */
function painel({ nome, z, sinal, yFundo, colunasY, estacoesX, vaos, aneis, cantos, estacao, meioDoLado, soNaBorda = [], ajuste = 0 }) {
  /* a borda da chapa de baixo na estação da ponta, tirada da superfície dela (`curvaDaGaiola`), e não da fórmula do alvo: a subdivisão
     encolhe a chapa e arredonda o ombro, e o painel feito pela fórmula ficava de 0,1 a 5,7 mm do para-lama. O lado da borda vai do fundo à
     cintura, o alto da cintura ao eixo; o painel acaba 4 mm para dentro da pele de dentro dela */
  const borda = curvaDaGaiola(BAIXO, { estacao, de: 'fundo', ate: 'centro' }, { niveis: 2, borda: 'cantos' }).curva;
  const iQuina = borda.reduce((m, p, i) => (p[1] > borda[m][1] - 1e-9 && i < borda.length - 1 && p[0] > 700 ? i : m), 0);
  const lado = borda.slice(0, iQuina + 1); const alto = borda.slice(iQuina).reverse();
  const interp = (pts, a, b, v) => { for (let i = 1; i < pts.length; i++) { const p = pts[i - 1]; const q = pts[i]; if ((v - p[a]) * (v - q[a]) <= 0 && p[a] !== q[a]) return p[b] + ((q[b] - p[b]) * (v - p[a])) / (q[a] - p[a]); } return pts.at(-1)[b]; };
  /* `ajuste`: na chapa oblíqua do canto a pele de dentro não fica 1 mm atrás da de fora em x; o vão medido sobrava 1,2 mm na frente e
     0,35 atrás, e o ajuste é essa sobra (contorno, CICLO-4.md) */
  const xFim = (y) => interp(lado, 1, 0, y) - T.chapa - V + ajuste;
  const yTopo = (x) => interp(alto, 0, 1, x) - T.chapa - V;
  const est = estacoesX.map(([n, x], i) => {
    const ultima = i === estacoesX.length - 1;
    /* na última estação, uma coluna a mais no meio do vão do farol ou da lanterna, para o lado do painel seguir a borda curva do
       para-lama ali (ela só existe na borda, e a face antes dela fecha um pentágono) */
    let lista = ultima && meioDoLado ? [...colunasY.slice(0, meioDoLado[0]), ['meioDoLado', meioDoLado[1], { comeca: true }], ...colunasY.slice(meioDoLado[0])] : colunasY;
    /* a coluna que só a borda tem (o ombro atrás, que o vão da lanterna cruza por dentro) */
    lista = ultima ? lista.map(([c, y, extra]) => (soNaBorda.includes(c) ? [c, y, { ...extra, comeca: true }] : [c, y, extra])) : lista.filter(([c]) => !soNaBorda.includes(c));
    const colunas = lista.map(([c, y, extra = {}]) => {
      const yy = c === 'topo' ? yTopo(ultima ? xFim(y) : x) : c === 'fundo' ? yFundo : y;
      const xx = ultima ? xFim(yy) : x;
      return { nome: c, em: [mm(yy), mm(z), mm(xx - x)], ...extra };
    });
    return { nome: n, em: mm(x), colunas };
  });
  /* com as estações ao longo de +x e as colunas de baixo para cima, a normal sai para -z: a frente vira, a traseira não */
  return gaiolaPorEstacoes({ eixo: 'x', estacoes: est, vaos, aneis, cantos, prefixo: `${nome}_`, virar: sinal > 0, fora: [0, 0, sinal], ...SIMETRIA });
}
const fa = F.farol; const gr = F.grade; const la = F.lanterna;
export const PAINEL_DA_FRENTE = painel({
  nome: 'painelDianteiro', z: T.zBico, sinal: 1, yFundo: 430, estacao: 'bico', meioDoLado: [5, 825], ajuste: 1.1,
  colunasY: [['fundo', 430], ['meio', 545], ['sob', 625], ['faixa', 685], ['farolBaixo', fa.y[0]], ['farolAlto', fa.y[1]], ['topo', 0]],
  estacoesX: [['eixo', 0], ['g1', 95], ['g2', 190], ['gradeFim', gr.x], ['farolIni', fa.x[0]], ...[355, 405, 455, 505, 555, 605, 655, 705].map((x, k) => [`f${k + 1}`, x]), ['farolFim', fa.x[1]], ['borda', 760]],
  vaos: [{ nome: 'grade', estacoes: ['eixo', 'gradeFim'], colunas: ['farolBaixo', 'farolAlto'] }, { nome: 'farol', estacoes: ['farolIni', 'farolFim'], colunas: ['farolBaixo', 'farolAlto'] }],
  aneis: [{ nome: 'farol', vao: 'farol', recuo: fa.recuo, voltas: fa.voltas, largura: fa.largura, raio: fa.raio, relevo: fa.relevo, lente: { folga: F.lente.recuo, sobra: F.lente.sobra, espessura: F.lente.espessura } }],
  /* os cantos da borda do painel e os dois cantos da grade no fim dela; sem eles a subdivisão arredonda o canto do vão no tamanho da face */
  cantos: [{ estacao: 'eixo', coluna: 'fundo' }, { estacao: 'borda', coluna: 'fundo' }, { estacao: 'eixo', coluna: 'topo' }, { estacao: 'borda', coluna: 'topo' },
    { estacao: 'gradeFim', coluna: 'farolBaixo' }, { estacao: 'gradeFim', coluna: 'farolAlto' }],
});
const LX = Array.from({ length: 8 }, (_, k) => la.x[0] + ((la.x[1] - la.x[0]) * (k + 1)) / 9);
export const PAINEL_DE_TRAS = painel({
  nome: 'painelTraseiro', z: T.zTraseira, sinal: -1, yFundo: 470, estacao: 'traseira', meioDoLado: [4, 802], ajuste: 0.3,
  /* colunas no alargado e no ombro, para o lado do painel seguir o degrau de 20 mm do ombro da lateral; em volta do vão, a 45 mm dele */
  colunasY: [['fundo', 470], ['alargado', T.yAlargado], ['faixa', la.y[0] - 45], ['lanternaBaixo', la.y[0]], ['lanternaAlto', la.y[1]], ['acima', la.y[1] + 45], ['topo', 0]],
  estacoesX: [['eixo', 0], ['t1', 120], ['t2', 240], ['t3', la.x[0] - 50], ['lanternaIni', la.x[0]], ...LX.map((x, k) => [`l${k + 1}`, x]), ['lanternaFim', la.x[1]], ['borda', 870]],
  vaos: [{ nome: 'lanterna', estacoes: ['lanternaIni', 'lanternaFim'], colunas: ['lanternaBaixo', 'lanternaAlto'] }],
  aneis: [{ nome: 'lanterna', vao: 'lanterna', recuo: la.recuo, voltas: la.voltas, largura: la.largura, raio: la.raio, relevo: la.relevo, lente: { folga: F.lente.recuo, sobra: F.lente.sobra, espessura: F.lente.espessura } }],
  cantos: [{ estacao: 'eixo', coluna: 'fundo' }, { estacao: 'borda', coluna: 'fundo' }, { estacao: 'eixo', coluna: 'topo' }, { estacao: 'borda', coluna: 'topo' }],
});

/* ---- as lentes: a chapa de 4 mm que o anel devolve (`lente`), 0,8 mm atrás da abertura do rebaixo e 6 mm maior que ela de cada lado;
   a do lado esquerdo é a cópia espelhada ---- */
const daLente = (g, anel) => { const l = g.aneis[anel].lente; return { pontosMm: emMm(l.pontos), passo: l.passo, espessura: l.espessuraMm }; };
export const LENTE_DO_FAROL = daLente(PAINEL_DA_FRENTE, 'farol');
export const LENTE_DA_LANTERNA = daLente(PAINEL_DE_TRAS, 'lanterna');

/* ---- os para-choques ---- */
/* o contorno da frente do corpo em planta, na altura y: o painel em z 2118 até a borda dele, e dali o canto do para-lama pela planta */
function zDoCorpoNaFrente(x, y) {
  if (x <= ladoX(T.zBico - 1, y) - 2) return T.zBico;
  let a = 1990; let b = T.zBico;                               /* o z em que a lateral do para-lama chega a x, por bisseção */
  for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ladoX(m, y) > x) a = m; else b = m; }
  return (a + b) / 2;
}
/* o fundo da barra na ponta, em fração do fundo: com 0,45 (32 mm) o ponto do meio ficava a 16 mm das quinas e o raio de 8 mm não cabia
   (`raioNaoCabe`), e a lista de raios que o aviso deixa não acompanha os pontos que o cruzamento da ponta põe na linha (CICLO-5.md) */
const FUNDO_MINIMO = 0.5;
function paraChoque(nome, lado) {
  const P = F.paraChoque[lado]; const sinal = lado === 'frente' ? 1 : -1; const [y0, y1] = P.y; const ym = (y0 + y1) / 2;
  /* ciclo 5: a barra vai de ponta a ponta, de -ponta a +ponta, e a ponta tem o vinco com raio no próprio laço (o núcleo cruza as quinas
     da barra com ele). O laço seguinte fica a 4 raios ou mais da ponta (32 mm), e os laços de apoio à mão a 4 e 10 mm do ciclo 4 saíram */
  const meiaBarra = lado === 'frente' ? [0, 160, 320, 480, 620, 720, 780, ...(P.plano ? [P.plano] : []), 805, P.ponta - 32, P.ponta] : [0, 160, 320, 480, 620, 720, 780, P.chanfro, P.ponta - 32, P.ponta];
  const xs = [...meiaBarra.slice(1).reverse().map((x) => -x), ...meiaBarra];
  const lacos = xs.map((xx) => {
    const x = Math.abs(xx);
    let zb; let zf;
    /* no canto, o fundo do para-choque fica onde o para-lama já é 6 mm mais estreito que ele, em toda a altura da barra */
    /* nos últimos 32 mm a face de trás não acompanha mais o canto do para-lama, que recua 0,75 mm por mm ali: enviesada, ela dobrava 123 graus
       com a tampa da ponta, e o raio da ponta não cabia na volta recuada da tampa */
    const xFundo = lado === 'frente' ? Math.min(x, P.ponta - 32) : x;
    if (lado === 'frente') {
      /* o fundo do para-choque na altura x, sem o plano: de 780 em diante ele acompanha o canto do para-lama */
      const zbDe = (xf) => (xf <= 780 ? T.zBico + V : Math.max(...[y0, ym - 80, ym, ym + 80, y1].map((y) => zDoCorpoNaFrente(xf - 6, y)), 1990) + V);
      const zfDe = (xv, xf) => zbDe(xf) + P.fundo * Math.max(FUNDO_MINIMO, 1 - Math.max(0, xv - 770) / 160);
      zb = zbDe(xFundo); zf = zfDe(x, xFundo);
      /* o laço do plano: o fundo fica em z do painel mais o vão, como em 780, até onde o painel acaba (x 776); sem ele a barra, que de 780 a 805 recua para abraçar o canto do
         para-lama, já recua 2 mm na superfície de subdivisão em x 775, e o vão do painel com a barra cai de 4 para 2 mm na quina do painel. A face da frente
         fica onde a barra a tinha: a frente do laço é a interpolada entre os de 780 e 805. */
      if (P.plano && x === P.plano) { zb = T.zBico + V; const k = (x - 780) / (805 - 780); zf = zfDe(780, 780) + (zfDe(805, 805) - zfDe(780, 780)) * k; }
    } else { zb = T.zTraseira - V; const ch = Math.max(0, x - P.chanfro) / (P.ponta - P.chanfro); zf = zb - P.fundo * (1 - (1 - FUNDO_MINIMO) * ch); }
    const [za, zc] = sinal > 0 ? [zb, zf] : [zf, zb];               /* za < zc */
    /* o ponto do meio de cima e de baixo fica a um terço do fundo a partir da quina de dentro (raio 3), para o apoio da quina de fora
       (raio 8, 11,8 mm) caber na metade da face até ele também na ponta, onde a barra tem 36 mm de fundo */
    const zm = sinal > 0 ? za + 0.33 * (zc - za) : zc - 0.33 * (zc - za);
    return { em: xx, trechos: {
      baixo: [[y0, za], [y0, zm], [y0, zc]], frente: [[y0, zc], [ym - 60, zc], [ym + 60, zc], [y1, zc]],
      cima: [[y1, zc], [y1, zm], [y1, za]], tras: [[y1, za], [ym + 60, za], [ym - 60, za], [y0, za]] } };
  });
  /* a face de fora é a de z maior na frente e a de z menor atrás: o raio grande vai nas quinas dela */
  const fora = sinal > 0 ? 'frente' : 'tras'; const dentro = sinal > 0 ? 'tras' : 'frente';
  return gaiolaPorLacos({ nome, eixo: 'x', tampa: { de: 'baixo', ate: 'cima' },
    trechos: [{ nome: 'baixo', pontos: 3 }, { nome: 'frente', pontos: 4 }, { nome: 'cima', pontos: 3 }, { nome: 'tras', pontos: 4 }], lacos,
    vincos: [{ nome: `${nome}QuinaDeCima`, entre: [fora === 'frente' ? 'frente' : 'cima', fora === 'frente' ? 'cima' : 'tras'], raio: P.raio },
      { nome: `${nome}QuinaDeBaixo`, entre: [fora === 'frente' ? 'baixo' : 'tras', fora === 'frente' ? 'frente' : 'baixo'], raio: P.raio },
      { nome: `${nome}QuinaDeTrasCima`, entre: [dentro === 'tras' ? 'cima' : 'frente', dentro === 'tras' ? 'tras' : 'cima'], raio: P.raioDeTras },
      { nome: `${nome}QuinaDeTrasBaixo`, entre: [dentro === 'tras' ? 'tras' : 'baixo', dentro === 'tras' ? 'baixo' : 'frente'], raio: P.raioDeTras },
      { nome: `${nome}PontaEsq`, laco: 'primeiro', raio: P.raioDaPonta }, { nome: `${nome}PontaDir`, laco: 'ultimo', raio: P.raioDaPonta }] });
}
/* o cruzamento das quinas na ponta põe pontos sem o nome da gaiola (`canto5_3_1_1`), e os do para-choque de trás sobrescreviam os da frente
   no topo comum, que ganhava um espinho até z 99 (CICLO-5.md); cada ponto sem o prefixo da peça o recebe aqui */
export function comPrefixo(g, nome) {
  const r = (n) => (n.startsWith(`${nome}_`) ? n : `${nome}_${n}`);
  const passo = { ...g.passo, vertices: g.passo.vertices.map(r), faces: g.passo.faces.map((f) => f.map(r)),
    ...(g.passo.vincos ? { vincos: g.passo.vincos.map((v) => ({ ...v, pontos: v.pontos.map(r) })) } : {}), ...(g.passo.cantos ? { cantos: g.passo.cantos.map(r) } : {}) };
  return { ...g, passo, pontosMm: Object.fromEntries(Object.entries(g.pontosMm).map(([n, q]) => [r(n), q])) };
}
export const PARA_CHOQUE_DA_FRENTE = comPrefixo(paraChoque('paraChoqueDianteiro', 'frente'), 'paraChoqueDianteiro');
export const PARA_CHOQUE_DE_TRAS = comPrefixo(paraChoque('paraChoqueTraseiro', 'tras'), 'paraChoqueTraseiro');

/* ---- a tomada de ar: a chapa sobre o capô, de z 790 a 1760, aberta na frente e fundida no capô atrás ---- */
function tomada() {
  const t = F.tomada; const [z0, z1] = t.z;
  const meiaEm = (z) => t.meia[0] + ((t.meia[1] - t.meia[0]) * (z - z0)) / (z1 - z0);
  const alturaEm = (z) => { const u = Math.min(1, Math.max(0, (z - z0) / (t.zCheia - z0))); return t.altura * u * u * (3 - 2 * u); };
  const zs = [z0, z0 + 12, z0 + 24, z0 + 36, 840, t.zCheia, 1000, 1150, 1300, 1450, 1600, z1];
  const est = zs.map((z, i) => {
    const w = meiaEm(z); const h = alturaEm(z); const yb = topoY(w, z) - T.chapa; const yq = topoY(w - 12, z) + h;
    const lado = (n, y, extra = {}) => ({ nome: n, em: [mm(w - 12 * ((y - yb) / Math.max(h, 1e-6))), mm(y)], ...extra });
    const nomeDaColuna = { 0: [lado('p', yb)], 1: [lado('base', yb, { de: ['p'] }), lado('qm', yb + 0.6 * Math.max(h, 2), { de: ['p'] })], 2: [lado('base', yb), lado('meio', yb + 0.4 * h, { de: ['qm'] }), lado('quina', yq, { de: ['qm'] })] }[i]
      ?? [lado('base', yb), lado('meio', yb + 0.4 * h), lado('quina', yq)];
    const topo = [['topoBorda', w - 40], ['topoMeio', w / 2], ['centro', 0]].map(([n, x]) => ({ nome: n, em: [mm(x), mm(topoY(x, z) + h - (topoY(w - 12, z) - topoY(x, z)) * 0)] }));
    return { nome: `t${i}`, em: mm(z), colunas: [...nomeDaColuna.map((c) => ({ ...c, em: [c.em[0], c.em[1]] })), ...topo] };
  });
  return gaiolaPorEstacoes({ eixo: 'z', estacoes: est, prefixo: 'tomada_', fora: [0, 1, 0], ...SIMETRIA, vincos: [{ nome: 'quinaDaTomada', coluna: 'quina', raio: t.raio }],
    cantos: [{ estacao: `t${zs.length - 1}`, coluna: 'base' }, { estacao: `t${zs.length - 1}`, coluna: 'centro' }, { estacao: 't0', coluna: 'centro' }] });
}
export const TOMADA = tomada();

/* ---- os passos ---- */
const opBaixo = doisAndares.opcoes[0];
const maior = (passos) => passos.reduce((m, p) => (Array.isArray(p) && Number.isSafeInteger(p[1]?.origemId) ? Math.max(m, p[1].origemId) : m), 0);
let id = (SO ? 0 : maior(opBaixo.passos)) + 1;
const passos = SO ? [] : [...opBaixo.passos];
const topo = SO ? {} : { ...opBaixo.topo };
const contatos = SO ? [] : [...opBaixo.contatos];
const COR = { painelDianteiro: '#8e44ad', painelTraseiro: '#16a085', lente: '#f4f1d0', lanterna: '#a93226', grade: '#2c2f33', paraChoque: '#bdc3c7', tomadaDeAr: '#d9483b' };
function chapa(nome, g, { espessura = T.chapa, niveis = 2, cor, lacos = false }) {
  Object.assign(topo, lacos ? g.pontosMm ?? emMm(g.pontos) : emMm(g.pontos));
  const i = id++;
  passos.push(['subdivisao', { origemId: i, ...(lacos ? comRaioEmMm(g.passo) : comRaioEmMm(g.passo)), niveis, borda: 'cantos', ...(espessura ? { espessura } : {}) }],
    ['parte', { nome, sel: { origem: { op: 'subdivisao', id: i } } }], ['pincel', { modo: 'face', sel: { origem: { op: 'subdivisao', id: i } }, cor }]);
  return i;
}
const ID_DA_FRENTE = chapa('painelDianteiro', PAINEL_DA_FRENTE, { cor: COR.painelDianteiro });
chapa('painelTraseiro', PAINEL_DE_TRAS, { cor: COR.painelTraseiro });
/* cada lente nos dois lados: a do anel à direita e a cópia espelhada à esquerda */
for (const [nome, L, cor] of [['lenteDoFarol', LENTE_DO_FAROL, COR.lente], ['lanterna', LENTE_DA_LANTERNA, COR.lanterna]]) {
  const lados = [['Dir', L], ...(SIMETRIA.simetria ? [['Esq', espelharGaiola(L, (n) => `${n}_esq`)]] : [])];
  for (const [lado, g] of lados) {
    Object.assign(topo, g.pontosMm ?? g.pontos);
    const i = id++;
    passos.push(['subdivisao', { origemId: i, ...g.passo, niveis: 1, borda: 'cantos', espessura: L.espessura }],
      ['parte', { nome: `${nome}${lado}`, sel: { origem: { op: 'subdivisao', id: i } } }], ['pincel', { modo: 'face', sel: { origem: { op: 'subdivisao', id: i } }, cor }]);
  }
}
chapa('paraChoqueDianteiro', PARA_CHOQUE_DA_FRENTE, { espessura: null, cor: COR.paraChoque, lacos: true });
chapa('paraChoqueTraseiro', PARA_CHOQUE_DE_TRAS, { espessura: null, cor: COR.paraChoque, lacos: true });
chapa('tomadaDeAr', TOMADA, { cor: COR.tomadaDeAr });
/* as lâminas da grade: caixas de 7 mm de altura e 28 de fundo, que passam 17 mm além da borda do vão, por trás da chapa, e encostam na
   face de dentro dela */
const laminas = [];
for (let k = 0; k < gr.laminas; k++) {
  const y = gr.y[0] + ((gr.y[1] - gr.y[0]) * (k + 0.5)) / gr.laminas; const i = id++; const nome = `laminaDaGrade${k + 1}`;
  passos.push(['cubo', { origemId: i, larg: 2 * (gr.x + 17), alt: gr.espessura, prof: gr.fundo, em: [0, y - gr.espessura / 2, T.zBico - T.chapa - gr.fundo / 2 + 0.2] }],
    ['parte', { nome, sel: { origem: { op: 'cubo', id: i } } }], ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: i } }, cor: COR.grade }]);
  laminas.push(nome);
}
void ID_DA_FRENTE;

/* ---- os contatos e os vãos ---- */
const folga = (par, motivo) => ({ par, relacao: 'folga', motivo, folga: { esperada: 4.1, tolerancia: 0.1, degrau: 0.3 } });
const atravessa = (par, motivo) => ({ par, relacao: 'atravessa', motivo });
const LADOS = SIMETRIA.simetria ? ['Dir', 'Esq'] : ['Dir'];
if (!SO) {
  contatos.push(folga(['capo', 'painelDianteiro'], 'vão de 4 mm entre a borda da frente do capô e o alto do painel'),
    ...LADOS.flatMap((L) => [folga([`paraLama${L}`, 'painelDianteiro'], 'vão de 4 mm entre a borda da frente do para-lama e o lado do painel'),
      folga([`lateralTraseira${L}`, 'painelTraseiro'], 'vão de 4 mm entre a borda de trás da lateral e o lado do painel')]),
    folga(['tampaDoPortaMalas', 'painelTraseiro'], 'vão de 4 mm entre a borda de trás da tampa e o alto do painel'),
    folga(['capo', 'teto'], 'vão de 4 mm entre o pé do capô e o do para-brisa, no mesmo plano'),
    folga(['tampaDoPortaMalas', 'teto'], 'vão de 4 mm entre o pé da tampa e o do vidro traseiro, no mesmo plano'),
    atravessa(['tomadaDeAr', 'capo'], 'a tomada de ar assenta no capô, com a borda 1 mm dentro da chapa'));
}
contatos.push(...LADOS.flatMap((L) => [atravessa([`lenteDoFarol${L}`, 'painelDianteiro'], 'a lente do anel fica 0,8 mm atrás da abertura do rebaixo, e a sobra de 6 mm dela passa por trás da parede dele'),
  atravessa([`lanterna${L}`, 'painelTraseiro'], 'a lente do anel fica 0,8 mm atrás da abertura do rebaixo, e a sobra de 6 mm dela passa por trás da parede dele')]),
  ...laminas.map((n) => atravessa([n, 'painelDianteiro'], 'a lâmina passa por trás da borda do vão da grade e encosta na face de dentro do painel')),
  folga(['paraChoqueDianteiro', 'painelDianteiro'], 'o para-choque fica 4 mm à frente do painel; o suporte fica fora do esboço'),
  folga(['paraChoqueTraseiro', 'painelTraseiro'], 'o para-choque fica 4 mm atrás do painel; o suporte fica fora do esboço'));

export const AVISOS = Object.fromEntries([['painelDianteiro', PAINEL_DA_FRENTE], ['painelTraseiro', PAINEL_DE_TRAS], ['paraChoqueDianteiro', PARA_CHOQUE_DA_FRENTE], ['paraChoqueTraseiro', PARA_CHOQUE_DE_TRAS], ['tomadaDeAr', TOMADA]].map(([n, g]) => [n, g.avisos ?? []]));
export default {
  plano: 'Quinto ciclo de alta definição do sedã: a lataria inteira pela simetria das gaiolas, com a cabine, o capô com a tomada de ar, os painéis da frente e de trás com grade, farol e lanterna em rebaixo, e os para-choques de ponta a ponta.',
  vista: 'isometrica',
  opcoes: [{
    titulo: 'caminho A, ciclo 5: a lataria inteira',
    nota: 'dois andares por gaiola de estações com raio no vinco; painéis, lentes e tomada por gaiola de estações; para-choques por laços',
    passos, topo, contatos,
  }],
};
void meia;
