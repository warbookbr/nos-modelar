/* furgao-realista, receita/detalhes.js — os detalhes pequenos da etapa 8 (2026-11-09), aprovados pela pessoa nos esboços de
 * docs/modelar/banco-de-provas/furgao-realista-2026-10-30/detalhes/: a antena do teto, as maçanetas das portas e a ponteira do escapamento.
 * Cada um é uma parte nova que assenta na chapa já pronta, sem mexer nela, e os números vêm da TABELA (`antena_*`, `macaneta_*`, `ponteira_*`)
 * e da forma (`forma`): o teto da frente, a lateral, a traseira e a seção do para-choque. Em milímetro até `passosDosDetalhes`, que converte
 * para metro com `m`.
 *
 * Antena. O pé em gota do esboço (loft de seções em superelipse, de 120 por 60 mm e 35 de altura) é girado pela inclinação do teto no meio dele
 * e assenta nele com a base entrando `antena_embutir` na chapa; como o teto ali é uma curva convexa de raio 1290, a reta da base fica acima
 * dele nas pontas por menos do que isso, e o pé toca a chapa de ponta a ponta. A haste (lathe de 8 mm na base e 4 na ponta) é vertical,
 * inclinada para trás pelo ângulo da TABELA, e nasce dentro do pé, na seção mais alta.
 * Maçanetas. A alça em U (a barra com dois pés, extrudada pela altura da alça) assenta na chapa da porta; em volta dela uma placa rasa
 * em anel, da cor da lataria, faz o papel do rebaixo do esboço: abrir o rebaixo na chapa mudaria a malha da carroceria, e a placa é peça à parte.
 * Ponteira. O tubo reto do esboço, com a boca atrás da face do para-choque, e a frente `ponteira_folga_frente` atrás da linha da chapa da traseira, para não encostar nela.
 */
import { grau, m } from './geometria.js';
import { ANTENA, MACANETAS, PLACAS_DAS_MACANETAS, PONTEIRA } from './nomes.js';

/* a forma do pé do esboço, [z, largura, altura] em proporção do comprimento, da largura e da altura dele (o esboço era de 120 por 60 por 35 mm):
   a gota é fina na frente, larga atrás do meio e se fecha na traseira; a altura máxima fica a 3/8 do comprimento atrás do meio */
const SECOES_DO_PE = [[0.5, 10 / 60, 6 / 35], [0.375, 26 / 60, 9 / 35], [0.25, 42 / 60, 14 / 35], [0.125, 52 / 60, 20 / 35], [0, 58 / 60, 26 / 35],
  [-0.125, 1, 31 / 35], [-0.25, 58 / 60, 34 / 35], [-0.375, 54 / 60, 1], [-55 / 120, 40 / 60, 30 / 35]];
const PONTA_DA_FRENTE = 62 / 120;
const PONTA_DE_TRAS = -0.5;
const Z_DA_ALTURA_MAXIMA = -0.375;

/** O trilho do teto da frente, [z, y], a partir da borda do vão do para-brisa (a altura `para_brisa_topo_y`), com o comprimento acumulado. */
function trilhoDoTeto(T, f) {
  const yBorda = T.para_brisa_topo_y;
  const pts = [[f.zF(yBorda), yBorda], ...f.perfilFrente.filter((p) => p[1] > yBorda)];
  const acum = [0];
  for (let k = 1; k < pts.length; k += 1) acum.push(acum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const ponto = (s) => {
    const k = Math.min(pts.length - 1, Math.max(1, acum.findIndex((a) => a >= s)));
    const t = (s - acum[k - 1]) / (acum[k] - acum[k - 1]);
    return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * t, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * t];
  };
  return { ponto };
}

/** A antena: o pé (seções e pose) e a haste (perfil e pose), em milímetro. */
export function derivarAntena(T, f) {
  const L = T.antena_pe_comprimento; const W = T.antena_pe_largura; const H = T.antena_pe_altura;
  const { ponto } = trilhoDoTeto(T, f);
  const sCentro = T.antena_recuo_borda + L / 2;
  const centro = ponto(sCentro);
  /* a inclinação do teto no meio do pé, pela corda de 10 mm em torno do centro: sobe para trás, com a frente em +z */
  const a = ponto(sCentro - 5); const b = ponto(sCentro + 5);
  const alfa = Math.atan2(b[1] - a[1], a[0] - b[0]) / grau;
  const normal = [Math.cos(alfa * grau), Math.sin(alfa * grau)]; /* [y, z] */
  const origem = [centro[1] - T.antena_embutir * normal[0], centro[0] - T.antena_embutir * normal[1]]; /* [y, z] */
  const lados = T.antena_lados;
  const secao = (zf, wf, hf) => {
    const w = wf * W; const h = hf * H;
    const contorno = Array.from({ length: lados }, (_, k) => {
      const t = (2 * Math.PI * k) / lados;
      const c = Math.cos(t); const s = Math.sin(t);
      return [(w / 2) * Math.sign(c) * Math.abs(c) ** (2 / 3), h / 2 + (h / 2) * Math.sign(s) * Math.abs(s) ** (2 / 3)];
    });
    return { z: zf * L, contorno };
  };
  const secoes = SECOES_DO_PE.map(([zf, wf, hf]) => secao(zf, wf, hf));
  /* a haste nasce dentro do pé, `antena_haste_embutir` abaixo do alto da seção mais alta, e sobe vertical, inclinada para trás */
  const baseLocal = [H - T.antena_haste_embutir, Z_DA_ALTURA_MAXIMA * L]; /* [y, z] no quadro do pé */
  const cA = Math.cos(alfa * grau); const sA = Math.sin(alfa * grau);
  const base = [origem[0] + baseLocal[0] * cA - baseLocal[1] * sA, origem[1] + baseLocal[0] * sA + baseLocal[1] * cA]; /* [y, z] */
  const comprimento = T.antena_haste_comprimento + T.antena_haste_embutir;
  return {
    alfa, origem, base, comprimento, secoes, pontaDaFrente: PONTA_DA_FRENTE * L, pontaDeTras: PONTA_DE_TRAS * L,
    haste: { raioBase: T.antena_haste_raio_base, raioPonta: T.antena_haste_raio_ponta, inclinacao: T.antena_haste_inclinacao, lados: T.antena_haste_lados },
  };
}

/** As cinco maçanetas, cada uma com a alça (o contorno em U no plano da alça) e a placa, em milímetro. */
export function derivarMacanetas(T, f) {
  const yc = T.macaneta_y;
  const A = T.macaneta_alca_comprimento / 2;
  const pc = T.macaneta_pe_afastamento; const pf = T.macaneta_pe_largura / 2;
  const e = T.macaneta_embutir; const N = T.macaneta_alca_fora; const n0 = N - T.macaneta_alca_espessura; const c = T.macaneta_chanfro;
  /* o U da alça em [a, n]: a ao longo da alça, n para fora da porta; os pés entram `e` na chapa */
  const U = [[-(pc + pf), -e], [-(pc - pf), -e], [-(pc - pf), n0], [pc - pf, n0], [pc - pf, -e], [pc + pf, -e], [pc + pf, n0], [A, n0], [A, N - c], [A - c, N],
    [-(A - c), N], [-A, N - c], [-A, n0], [-(pc + pf), n0]];
  const placaA = T.macaneta_rebaixo_comprimento + 2 * T.macaneta_placa_borda;
  const placaB = T.macaneta_rebaixo_largura + 2 * T.macaneta_placa_borda;
  const meiaFresta = T.fresta / 2;
  /* as bordas das portas que abrem: a traseira da porta da cabine e a frente da de correr, no meio da fresta e a meia fresta para dentro da chapa da porta */
  const zTrasCabine = T.porta_cabine_tras_z - meiaFresta;
  const zFrenteCorrer = T.porta_cabine_tras_z - T.coluna_do_meio + meiaFresta;
  const xs = f.xs(yc);
  const zs = f.zTras + T.traseira_recuo;
  const lista = [
    { id: 0, nome: 'CabineEsquerda', tipo: 'lateral', s: 1, c: zTrasCabine + T.macaneta_borda_porta + placaA / 2 },
    { id: 1, nome: 'CabineDireita', tipo: 'lateral', s: -1, c: zTrasCabine + T.macaneta_borda_porta + placaA / 2 },
    { id: 2, nome: 'Correr', tipo: 'lateral', s: -1, c: zFrenteCorrer - T.macaneta_borda_porta - placaA / 2 },
    { id: 3, nome: 'TraseiraEsquerda', tipo: 'traseira', s: 1, c: meiaFresta + T.macaneta_borda_porta + placaB / 2 },
    { id: 4, nome: 'TraseiraDireita', tipo: 'traseira', s: -1, c: -(meiaFresta + T.macaneta_borda_porta + placaB / 2) },
  ];
  return lista.map((h) => ({ ...h, yc, xs, zs, U, placaA, placaB, alturaDaAlca: T.macaneta_alca_altura, alcaFora: N, placaAltura: T.macaneta_placa_altura, embutir: e }));
}

/** A ponteira: o tubo reto sob o para-choque traseiro, do lado esquerdo (+x), em milímetro. */
export function derivarPonteira(T, f) {
  const R = T.ponteira_diametro / 2;
  const secao = T.secao_parachoque_traseiro;
  const fundo = secao[0][1]; /* a altura do fundo do para-choque, onde ele sai da chapa */
  const saida = Math.max(...secao.map((p) => p[0]));
  const zFace = f.zTras - saida;
  const zBoca = zFace - T.ponteira_recuo_boca;
  const zFrente = f.zTras - T.ponteira_folga_frente;
  return { x: T.ponteira_x, y: fundo + T.ponteira_embutir - R, zBoca, zFrente, comprimento: zFrente - zBoca, raio: R, parede: T.ponteira_parede, zFace };
}

export function derivarDetalhes(T, f) {
  return { antena: derivarAntena(T, f), macanetas: derivarMacanetas(T, f), ponteira: derivarPonteira(T, f) };
}

/* ---------- os passos, em metro ---------- */

const IDS = { pe: 2000, haste: 2001, ponteira: 2002, alca: 2010, placa: 2020 };

/** Os passos das três famílias de detalhe, com os ids a partir de 2000, depois de todos os outros: nenhuma parte que já existia muda. */
export function passosDosDetalhes(T, f) {
  const { antena, macanetas, ponteira } = derivarDetalhes(T, f);
  const passos = [];
  const peca = (nome, op, id, material, liso) => {
    const sel = { origem: { op, id } };
    passos.push(['parte', { nome, sel }]);
    passos.push(['material', { sel, usa: material }]);
    if (liso) passos.push(['liso', { angulo: liso, sel }]);
  };

  /* a antena */
  const selPe = { origem: { op: 'loft', id: IDS.pe } };
  passos.push(['loft', {
    origemId: IDS.pe, lados: T.antena_lados, orientacao: [1, 0, 0],
    secoes: [{ pos: [0, 0, m(antena.pontaDaFrente)], raio: 0 },
      ...antena.secoes.map(({ z, contorno }) => ({ pos: [0, 0, m(z)], contorno: contorno.map(([u, v]) => [m(u), m(v)]) })),
      { pos: [0, 0, m(antena.pontaDeTras)], raio: 0 }],
  }]);
  passos.push(['rotaciona', { eixo: 'x', graus: antena.alfa, pivo: [0, 0, 0], sel: selPe }]);
  passos.push(['transladar', { d: [0, m(antena.origem[0]), m(antena.origem[1])], sel: selPe }]);
  peca(ANTENA[0], 'loft', IDS.pe, 'plasticoLiso', T.antena_liso_angulo);
  const selHaste = { origem: { op: 'lathe', id: IDS.haste } };
  passos.push(['lathe', {
    origemId: IDS.haste, eixo: 'y', lados: antena.haste.lados,
    perfil: [[0, 0], [m(antena.haste.raioBase), 0], [m(antena.haste.raioPonta), m(antena.comprimento)], [0, m(antena.comprimento)]],
  }]);
  passos.push(['rotaciona', { eixo: 'x', graus: -antena.haste.inclinacao, pivo: [0, 0, 0], sel: selHaste }]);
  passos.push(['transladar', { d: [0, m(antena.base[0]), m(antena.base[1])], sel: selHaste }]);
  peca(ANTENA[1], 'lathe', IDS.haste, 'plasticoLiso', T.antena_liso_angulo);

  /* as maçanetas: a alça em U e a placa em anel */
  const ret = (largura, profundidade, centro, cantos) => ({ retangulo: { largura: m(largura), profundidade: m(profundidade), centro: centro.map(m), cantos: m(cantos) } });
  for (const h of macanetas) {
    const idAlca = IDS.alca + h.id; const idPlaca = IDS.placa + h.id;
    const lado = h.tipo === 'lateral';
    if (lado) {
      /* porta lateral: a normal é ±x, a alça é horizontal (eixo y) e o contorno U vai a [x, z] */
      const pts = h.U.map(([a, n]) => [m(h.s * (h.xs + n)), m(h.c + a)]);
      passos.push(['extrusao', { origemId: idAlca, eixo: 'y', altura: m(h.alturaDaAlca), perfil: pts, em: [0, m(h.yc - h.alturaDaAlca / 2), 0] }]);
      const x0 = h.s > 0 ? h.xs - h.embutir : -h.xs - h.placaAltura;
      passos.push(['extrusao', {
        origemId: idPlaca, eixo: 'x', altura: m(h.placaAltura + h.embutir), segmentosArco: 1,
        perfil: ret(h.placaB, h.placaA, [-h.yc, h.c], T.macaneta_placa_cantos),
        furos: [ret(T.macaneta_rebaixo_largura, T.macaneta_rebaixo_comprimento, [-h.yc, h.c], T.macaneta_placa_cantos / 2)],
        em: [m(x0), 0, 0],
      }]);
    } else {
      /* porta traseira: a normal é -z, a alça é vertical (eixo x) e o contorno U vai a [-y, z] */
      const pts = h.U.map(([a, n]) => [m(-(h.yc + a)), m(h.zs - n)]);
      passos.push(['extrusao', { origemId: idAlca, eixo: 'x', altura: m(h.alturaDaAlca), perfil: pts, em: [m(h.c - h.alturaDaAlca / 2), 0, 0] }]);
      passos.push(['extrusao', {
        origemId: idPlaca, eixo: 'z', altura: m(h.placaAltura + h.embutir), segmentosArco: 1,
        perfil: ret(h.placaB, h.placaA, [h.c, -h.yc], T.macaneta_placa_cantos),
        furos: [ret(T.macaneta_rebaixo_largura, T.macaneta_rebaixo_comprimento, [h.c, -h.yc], T.macaneta_placa_cantos / 2)],
        em: [0, 0, m(h.zs - h.placaAltura)],
      }]);
    }
    peca(MACANETAS[h.id], 'extrusao', idAlca, 'plasticoLiso');
    peca(PLACAS_DAS_MACANETAS[h.id], 'extrusao', idPlaca, 'azul');
  }

  /* a ponteira */
  passos.push(['extrusao', {
    origemId: IDS.ponteira, eixo: 'z', altura: m(ponteira.comprimento), segmentosArco: T.ponteira_segmentos,
    perfil: { circulo: { raio: m(ponteira.raio) } }, furos: [{ circulo: { raio: m(ponteira.raio - ponteira.parede) } }],
    em: [m(ponteira.x), m(ponteira.y), m(ponteira.zBoca)],
  }]);
  peca(PONTEIRA, 'extrusao', IDS.ponteira, 'acoEscuro', T.ponteira_liso_angulo);
  return passos;
}
