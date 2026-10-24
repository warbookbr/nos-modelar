/* gaiola-por-rede-prova.js — a chapa lateral desenhada por código para a prova da gaiola por rede de curvas
 *
 * A chapa tem 1000 mm de comprimento (x) por uns 600 mm de altura (z), a normal para fora em +y. A superfície é conhecida só por esta função
 * (`altura`): o abaulamento em x e em z, uma dobra viva na cintura (z = 250 mm, a chapa de cima inclina 10 graus para dentro) e uma dobra de
 * quina ao longo da aresta de trás da coluna, que cresce da cintura para o teto. Nenhum número vem de referência externa.
 *
 * A rede tem 19 curvas e 10 retalhos, dois deles de cinco lados: a janela em gota (230 mm de altura na parte larga, ponta arredondada de raio 20 mm), o arco da roda
 * (semicírculo de raio 140 mm aberto na soleira), a cintura, a linha do teto, as duas arestas da coluna inclinada e as ligações que levam
 * a janela aos cantos da região à volta dela. As curvas são amostras da superfície em pontos-chave; os nós, os pontos-chave onde elas se
 * encontram. A receita não declara índice, nem canto, e dá a cada retalho só a lista de curvas que o fecham. */
import { gaiolaPorRede } from '../gaiola-por-rede.js';

export const COMPRIMENTO = 1000;
export const CINTURA = 250;
export const TOPO = (x) => 600 - 20 * ((x - 500) / 500) ** 2;
export const BAIXO_DA_COLUNA = { A: [780, 850], B: [880, 950] };
export const ARCO = { centro: 310, raio: 140 };
export const GOTA = { larga: { centro: [200, 430], raio: 115 }, ponta: { centro: [640, 440], raio: 20 } };

const ramo = (t) => { const s = Math.min(1, Math.max(0, t)); return s * s * (3 - 2 * s); };
/* a distância assinada (mm) de (x, z) à reta da aresta de trás da coluna, positiva para trás */
const retaB = () => {
  const [x0, z0] = [BAIXO_DA_COLUNA.B[0], TOPO(BAIXO_DA_COLUNA.B[0])]; const [x1, z1] = [BAIXO_DA_COLUNA.B[1], CINTURA];
  const dx = x1 - x0, dz = z1 - z0; const l = Math.hypot(dx, dz);
  return (x, z) => ((x - x0) * dz - (z - z0) * dx) / l * -1;
};
const distB = retaB();

/** altura(x, z): a posição y (mm) da chapa. */
export function altura(x, z) {
  const coroa = 50 * (1 - ((x - 500) / 520) ** 2);
  const bojo = -((z - CINTURA) ** 2) / (2 * 3500);
  const cintura = -0.18 * Math.max(0, z - CINTURA);
  const quina = -0.10 * Math.max(0, distB(x, z)) * ramo((z - CINTURA) / 350);
  return coroa + bojo + cintura + quina;
}
const P = (x, z) => [x, altura(x, z), z];
const caminho = (valores, f) => valores.map(f);

/** uma curva reta no plano (x, z), com pontos-chave a cada fração dada, e os nós dados por nome nos extremos e nos meios */
const reta = (a, b, fracoes, nos = {}) => [a, ...fracoes.map((t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]), b].map(([x, z], k, todos) => nos[k] ?? P(x, z));

/**
 * a gota: o contorno fechado dos dois círculos e das tangentes externas. Quatro nós ficam nos cantos da região à volta, onde as ligações
 * chegam quase perpendiculares ao contorno: U1 e L1 a 135 e 225 graus do círculo largo, U2 e L2 a 45 e -45 graus do círculo da ponta. Outros quatro,
 * T1 a T4, ficam onde cada tangente encosta num círculo: a curvatura salta ali, e o nó dá ao arco da reta e ao do círculo as suas divisões.
 */
export function contornoDaGota() {
  const [cw, rw] = [GOTA.larga.centro, GOTA.larga.raio]; const [ct, rt] = [GOTA.ponta.centro, GOTA.ponta.raio];
  const dx = ct[0] - cw[0], dz = ct[1] - cw[1]; const d = Math.hypot(dx, dz); const beta = Math.atan2(dz, dx); const fi = Math.acos((rw - rt) / d);
  const g = Math.PI / 180; const alfaCima = beta + fi; const alfaBaixo = beta - fi;
  const pt = (c, r, a) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  const noArco = (c, r, graus) => pt(c, r, graus * g);
  const reta = (p, q) => [1 / 3, 2 / 3].map((t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
  const caminho = []; const marcas = {};
  const poe = (p, marca) => { if (marca) marcas[marca] = caminho.length; caminho.push(p); };
  const baixoG = alfaBaixo + 2 * Math.PI;
  /* os pontos-chave do círculo largo incluem o topo (90 graus) e o fundo (270 graus), de modo que a altura da janela é a de projeto */
  poe(noArco(cw, rw, 135), 'U1'); for (const a of [157.5, 180, 202.5]) caminho.push(noArco(cw, rw, a)); poe(noArco(cw, rw, 225), 'L1');
  for (const a of [250, 270]) caminho.push(noArco(cw, rw, a)); poe(pt(cw, rw, baixoG), 'T1');
  caminho.push(...reta(pt(cw, rw, baixoG), pt(ct, rt, alfaBaixo))); poe(pt(ct, rt, alfaBaixo), 'T2');
  caminho.push(noArco(ct, rt, -58.5)); poe(noArco(ct, rt, -45), 'L2');
  for (const a of [-27, -9, 9, 27]) caminho.push(noArco(ct, rt, a)); poe(noArco(ct, rt, 45), 'U2');
  caminho.push(noArco(ct, rt, 60)); poe(pt(ct, rt, alfaCima), 'T3');
  caminho.push(...reta(pt(ct, rt, alfaCima), pt(cw, rw, alfaCima))); poe(pt(cw, rw, alfaCima), 'T4');
  for (const a of [90, 112.5]) caminho.push(noArco(cw, rw, a));
  return { U1: caminho[marcas.U1], L1: caminho[marcas.L1], L2: caminho[marcas.L2], U2: caminho[marcas.U2], T1: caminho[marcas.T1], T2: caminho[marcas.T2], T3: caminho[marcas.T3], T4: caminho[marcas.T4], caminho, marcas };
}

/** definicao({ passo, ... }): a definição da rede para `gaiolaPorRede`. `extra` troca ou acrescenta campos da definição. */
export function definicao({ passo = 40, extra = {} } = {}) {
  const [xA0, xA1] = BAIXO_DA_COLUNA.A; const [xB0, xB1] = BAIXO_DA_COLUNA.B;
  const gota = contornoDaGota();
  const noArco = (graus) => { const a = graus * Math.PI / 180; return P(ARCO.centro + ARCO.raio * Math.cos(a), ARCO.raio * Math.sin(a)); };
  const nos = {
    A0: P(0, 0), FB: P(0, CINTURA), D: P(0, TOPO(0)), tP1: P(xA0, TOPO(xA0)), tP2: P(xB0, TOPO(xB0)), C: P(COMPRIMENTO, TOPO(COMPRIMENTO)),
    BR: P(COMPRIMENTO, CINTURA), B0: P(COMPRIMENTO, 0), b1: P(xA1, CINTURA), b2: P(xB1, CINTURA),
    s1: noArco(180), a1: noArco(135), a2: noArco(45), s2: noArco(0), cL: P(140, CINTURA), cR: P(480, CINTURA), c7: P(700, CINTURA), s7: P(700, 0),
    U1: P(...gota.U1), L1: P(...gota.L1), L2: P(...gota.L2), U2: P(...gota.U2), T1: P(...gota.T1), T2: P(...gota.T2), T3: P(...gota.T3), T4: P(...gota.T4),
  };
  const sobre = (xs, z) => xs.map((x) => P(x, typeof z === 'function' ? z(x) : z));
  const arco = (graus) => graus.map(noArco);
  const janela = gota.caminho.map((q, k) => {
    const marca = Object.entries(gota.marcas).find(([, i]) => i === k);
    return marca ? marca[0] : P(...q);
  });
  const reta2 = (nomeA, nomeB, ...fr) => reta([nos[nomeA][0], nos[nomeA][2]], [nos[nomeB][0], nos[nomeB][2]], fr, { 0: nomeA, [fr.length + 1]: nomeB });
  return {
    passo, fora: [0, 1, 0],
    nos,
    curvas: [
      { nome: 'frenteBaixa', pontos: ['A0', P(0, 125), 'FB'] },
      { nome: 'frenteAlta', pontos: ['FB', P(0, 325), P(0, 450), 'D'] },
      { nome: 'teto', pontos: ['D', ...sobre([150, 300, 450, 600, 700], TOPO), 'tP1', 'tP2', 'C'] },
      { nome: 'traseiraBaixa', pontos: ['B0', P(COMPRIMENTO, 125), 'BR'] },
      { nome: 'traseiraAlta', pontos: ['BR', P(COMPRIMENTO, 325), P(COMPRIMENTO, 450), 'C'] },
      { nome: 'soleiraFrente', pontos: ['A0', P(85, 0), 's1'] },
      { nome: 'arco', pontos: ['s1', ...arco([165, 150]), 'a1', ...arco([120, 105, 90, 75, 60]), 'a2', ...arco([30, 15]), 's2'] },
      { nome: 'soleiraTras', pontos: ['s2', P(575, 0), 's7', P(850, 0), 'B0'] },
      { nome: 'cintura', pontos: ['FB', P(70, CINTURA), 'cL', P(310, CINTURA), 'cR', P(590, CINTURA), 'c7', P(775, CINTURA), 'b1', 'b2', 'BR'], vinco: 'viva' },
      { nome: 'ligA1', pontos: reta2('cL', 'a1', 0.5) },
      { nome: 'ligA2', pontos: reta2('cR', 'a2', 0.5) },
      { nome: 'ligR', pontos: reta2('c7', 's7', 0.5) },
      { nome: 'colunaA', pontos: reta2('tP1', 'b1', 0.33, 0.66) },
      { nome: 'colunaB', pontos: reta2('tP2', 'b2', 0.33, 0.66), vinco: 'viva' },
      { nome: 'ligU1', pontos: reta2('D', 'U1', 0.5) },
      { nome: 'ligU2', pontos: reta2('tP1', 'U2', 0.5) },
      { nome: 'ligL2', pontos: reta2('b1', 'L2', 0.5) },
      { nome: 'ligL1', pontos: reta2('FB', 'L1', 0.5) },
      { nome: 'janela', pontos: janela, fechada: true },
    ],
    retalhos: [
      { nome: 'topo', borda: [{ curva: 'teto', de: 'D', ate: 'tP1' }, 'ligU2', { curva: 'janela', de: 'U2', ate: 'U1' }, 'ligU1'] },
      { nome: 'ponta', borda: ['colunaA', 'ligL2', { curva: 'janela', de: 'L2', ate: 'U2' }, 'ligU2'] },
      { nome: 'baixo', borda: [{ curva: 'cintura', de: 'FB', ate: 'b1' }, 'ligL2', { curva: 'janela', de: 'L1', ate: 'L2' }, 'ligL1'] },
      { nome: 'frente', borda: ['frenteAlta', 'ligU1', { curva: 'janela', de: 'U1', ate: 'L1' }, 'ligL1'] },
      { nome: 'antesDoArco', borda: ['frenteBaixa', { curva: 'cintura', de: 'FB', ate: 'cL' }, 'ligA1', { curva: 'arco', de: 'a1', ate: 's1' }, 'soleiraFrente'] },
      { nome: 'sobreOArco', borda: [{ curva: 'cintura', de: 'cL', ate: 'cR' }, 'ligA2', { curva: 'arco', de: 'a1', ate: 'a2' }, 'ligA1'] },
      { nome: 'depoisDoArco', borda: [{ curva: 'cintura', de: 'cR', ate: 'c7' }, 'ligR', { curva: 'soleiraTras', de: 's2', ate: 's7' }, { curva: 'arco', de: 'a2', ate: 's2' }, 'ligA2'] },
      { nome: 'fundoDeTras', borda: [{ curva: 'cintura', de: 'c7', ate: 'BR' }, 'traseiraBaixa', { curva: 'soleiraTras', de: 's7', ate: 'B0' }, 'ligR'] },
      { nome: 'coluna', borda: [{ curva: 'teto', de: 'tP1', ate: 'tP2' }, 'colunaB', { curva: 'cintura', de: 'b1', ate: 'b2' }, 'colunaA'] },
      { nome: 'atrasDaColuna', borda: [{ curva: 'teto', de: 'tP2', ate: 'C' }, 'traseiraAlta', { curva: 'cintura', de: 'b2', ate: 'BR' }, 'colunaB'] },
    ],
    ...extra,
  };
}

export function montagem(opcoes = {}) {
  const d = definicao(opcoes);
  return Object.assign(gaiolaPorRede(d), { definicao: d });
}

/** receita(opcoes, niveis): a receita { PARAMS, TOPO, PASSOS } da chapa, para as ferramentas que leem a receita. */
export function receita(opcoes = {}, niveis = 2) {
  const g = montagem(opcoes);
  return {
    PARAMS: {},
    TOPO: g.pontos,
    PASSOS: [
      ['subdivisao', { origemId: 1, ...g.passo, niveis }],
      ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    ],
  };
}

/** A moldura de 10 mm de largura e 3,5 mm de altura sobre a curva da janela, que entra 0,5 mm na chapa de 1,5 mm de espessura. */
export const ESPESSURA = 0.0015;
export const MOLDURA = { largura: 0.010, profundidade: 0.0035, centro: 0.00125 };

/** receitaComMoldura(opcoes, niveis): a chapa com espessura, a moldura como `friso` sobre a linha da janela e as partes; `CONTATOS` é o contato declarado. */
export function receitaComMoldura(opcoes = {}, niveis = 2) {
  const g = montagem(opcoes);
  return {
    PARAMS: {},
    TOPO: g.pontos,
    PASSOS: [
      ['subdivisao', { origemId: 1, ...g.passo, espessura: ESPESSURA, niveis }],
      ['friso', { origemId: 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'molduraDaJanela', pontos: g.linha('janela') }, perfil: { retangulo: { largura: MOLDURA.largura, profundidade: MOLDURA.profundidade, centro: [0, MOLDURA.centro] } } }],
      ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
      ['parte', { nome: 'moldura', sel: { origem: { op: 'friso', id: 2 } } }],
    ],
  };
}
export const CONTATOS = [{ par: ['chapa', 'moldura'], motivo: 'a moldura entra 0,5 mm na chapa pela base do perfil, menos que a espessura' }];

export default receita();
