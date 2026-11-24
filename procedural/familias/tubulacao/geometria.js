/* geometria.js — as medidas de uma peça da família `tubulacao`, em milímetro: o trecho reto, a curva e o tampão, ocos.

   Toda peça tem a boca de entrada no plano y = 0, centrada na origem, com o eixo em +y. O trecho é o tubo de parede
   `parede` e comprimento `comprimento`. A curva começa na origem para +y e dobra para +x em volta do centro (raio, 0, 0)
   pelo ângulo pedido; o tubo dela é a varredura do círculo de fora menos a do de dentro, e a de dentro passa um pouco das
   duas bocas para a subtração não deixar película. O tampão é um copo: a parede do tubo, o fundo da espessura da parede e
   um chanfro de uma vez e meia a parede na borda do fundo, no comprimento `comprimentoDoTampao`; a ASME B16.9 dá o
   comprimento, e o fundo elíptico dela fica como o fundo chanfrado, regra da família. */

export const PONTOS_DO_ARCO = 13;
/* os lados do tubo (o `lathe` da composição) e da seção da curva, iguais para as bocas casarem */
export const LADOS_DA_SECAO = 48;

export function geometriaDaPeca({ forma, diametroExterno: de, parede, comprimento, raio, angulo, fase, comprimentoDoTampao: e, centroABoca: cab, diametroMenor: dm, paredeMenor: pm, comprimentoDaReducao: h, ...acessorio }) {
  if (forma >= 6) return geometriaDoAcessorio(forma, de, parede, acessorio);
  const ro = de / 2;
  const ri = ro - parede;
  if (forma === 1) return { forma, ro, ri, perfil: [[ri, 0], [ro, 0], [ro, comprimento], [ri, comprimento], [ri, 0]], altura: comprimento };
  if (forma === 2) {
    /* a boca reta: a varredura corta a primeira seção na bissetriz do primeiro trecho, e a boca saía inclinada; cada ponta
       ganha um trecho reto de `toco` mm, e o arco encolhe o raio para o centro à boca continuar raio·tan(ângulo/2) */
    const a = (angulo * Math.PI) / 180;
    const passoDoArco = a / (PONTOS_DO_ARCO - 1);
    const toco = 1.5 * ro * Math.tan(passoDoArco / 2) + 0.2;
    const r = raio - toco / Math.tan(a / 2);
    const ponto = (t) => [r - r * Math.cos(t), toco + r * Math.sin(t), 0];
    const arco = Array.from({ length: PONTOS_DO_ARCO }, (_, k) => ponto((a * k) / (PONTOS_DO_ARCO - 1)));
    const fimT = [Math.sin(a), Math.cos(a), 0];
    const fimDoArco = arco[arco.length - 1];
    const ao = (d) => fimDoArco.map((x, k) => x + d * fimT[k]);
    const fora = [[0, 0, 0], ...arco, ao(toco)];
    /* a de dentro passa um toco além de cada boca, reta, para a subtração não deixar película */
    const dentro = [[0, -toco, 0], ...arco, ao(2 * toco)];
    /* a seção é o polígono de LADOS do tubo, girado de `fase` graus, para os vértices da boca caírem sobre os do tubo */
    const secao = (raioDaSecao) => Array.from({ length: LADOS_DA_SECAO }, (_, k) => {
      const t = (((fase ?? 0) + (360 * k) / LADOS_DA_SECAO) * Math.PI) / 180;
      return [raioDaSecao * Math.cos(t), raioDaSecao * Math.sin(t)];
    });
    return { forma, ro, ri, fora, dentro, secaoDeFora: secao(ro), secaoDeDentro: secao(ri), toco, raioDoArco: r, saida: { centro: ao(toco), eixo: fimT } };
  }
  if (forma === 4) {
    /* o tê reto: a passagem ao longo de y, de 0 a 2·C, e a derivação ao longo de +x, do eixo da passagem até C; os dois
       cilindros maciços unidos, menos os dois furos, que passam das bocas */
    const passa = Math.max(1, parede);
    return {
      forma, ro, ri, altura: 2 * cab,
      passagem: [[0, 0], [ro, 0], [ro, 2 * cab], [0, 2 * cab]], derivacao: [[0, 0], [ro, 0], [ro, cab], [0, cab]],
      furoDaPassagem: [[0, -passa], [ri, -passa], [ri, 2 * cab + passa], [0, 2 * cab + passa]], furoDaDerivacao: [[0, 0], [ri, 0], [ri, cab + passa], [0, cab + passa]],
      emDerivacao: [0, cab, 0],
    };
  }
  if (forma === 5) {
    /* a redução concêntrica: o tronco de cone oco da boca maior (y = 0) à menor (y = h) */
    const rom = dm / 2;
    const rim = rom - pm;
    return { forma, ro, ri, altura: h, perfil: [[ri, 0], [ro, 0], [rom, h], [rim, h], [ri, 0]] };
  }
  const c = Math.min(1.5 * parede, e / 4, ro / 2);
  /* a linha aberta toca o eixo só nas duas pontas (o fundo de fora e o de dentro), como o lathe pede */
  return { forma, ro, ri, perfil: [[0, e], [ro - c, e], [ro, e - c], [ro, 0], [ri, 0], [ri, e - parede], [0, e - parede]], altura: e };
}

/* Os acessórios de aço (formas 6 a 8) como uma lista de sólidos: os `cheios` se unem, e as `ferramentas` (o furo e os
   furos dos parafusos, cada um repetido em volta do eixo y por `arranja` radial) saem deles. O número de pontos de cada
   sólido é fixo por forma, e a composição sai dessa lista. */
const torno = (perfil, eixo = 'y', em = [0, 0, 0]) => ({ op: 'lathe', eixo, perfil, em });
const caixa = (x0, x1, z0, z1, y0, comprimento) => ({ op: 'extrusao', perfil: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], altura: comprimento, em: [0, y0, 0] });
const furoDeParafuso = (circulo, furo, furos, giro, y0, y1) => {
  const a = (giro * Math.PI) / 180;
  return { ...torno([[0, y0], [furo / 2, y0], [furo / 2, y1], [0, y1]], 'y', [(circulo / 2) * Math.cos(a), 0, (circulo / 2) * Math.sin(a)]), copias: { total: furos, graus: 360 / furos } };
};

function geometriaDoAcessorio(forma, de, parede, q) {
  const ro = de / 2;
  const ri = ro - parede;
  const rF = q.diametroDoFlange / 2;
  const T = q.espessuraDoFlange;
  const rH = q.diametroDoCubo / 2;
  if (forma === 6) {
    /* o flange de pescoço: a boca de solda em y = 0, o cubo afinando até o disco e a face em y = comprimento pelo pescoço */
    const Y = q.comprimentoDoPescoco;
    return {
      forma, ro, ri, altura: Y, parte: 'flange',
      cheios: [torno([[0, 0], [ro, 0], [rH, Y - T], [rF, Y - T], [rF, Y], [0, Y]])],
      ferramentas: [torno([[0, -1], [ri, -1], [ri, Y + 1], [0, Y + 1]]), furoDeParafuso(q.circuloDeFuracao, q.diametroDoFuro, q.furos, q.giroDosFuros, Y - T - 1, Y + 1)],
    };
  }
  /* a válvula flangeada: a face de entrada em y = 0 e a de saída em y = face a face; o corpo é um torneado com os dois
     flanges, o pescoço do diâmetro do cubo e o bojo no meio; a haste sobe em +x, com a alavanca (esfera) ou o castelo e o
     volante (gaveta) */
  const L = q.faceAFace;
  const Rb = Math.max(rH + 2, q.circuloDeFuracao / 2 - q.diametroDoFuro / 2 - 2);
  const ay = L / 2 - T - 3;
  const f0 = Math.acos(Math.min(1, rH / Rb));
  const bojo = Array.from({ length: 9 }, (_, k) => { const f = -f0 + (2 * f0 * k) / 8; return [Rb * Math.cos(f), L / 2 + ay * Math.sin(f) * (forma === 8 ? 0.8 : 1)]; });
  const corpo = torno([[0, 0], [rF, 0], [rF, T], [rH, T], ...bojo, [rH, L - T], [rF, L - T], [rF, L], [0, L]]);
  const rs = Math.max(2, 0.2 * rH);
  const meio = [0, L / 2, 0];
  const comum = [torno([[0, -1], [ri, -1], [ri, L + 1], [0, L + 1]]), furoDeParafuso(q.circuloDeFuracao, q.diametroDoFuro, q.furos, q.giroDosFuros, -1, T + 1), furoDeParafuso(q.circuloDeFuracao, q.diametroDoFuro, q.furos, q.giroDosFuros, L - T - 1, L + 1)];
  if (forma === 7) {
    const topo = rF + 0.15 * L;
    const w = Math.max(6, 0.25 * rF);
    const e = Math.max(3, 0.08 * rF);
    return {
      forma, ro: rF, ri, altura: L, parte: 'valvula',
      cheios: [corpo, torno([[0, 0], [rs, 0], [rs, topo + e / 2], [0, topo + e / 2]], 'x', meio), caixa(topo, topo + e, -w / 2, w / 2, L / 2 - w / 2, 1.5 * L)],
      ferramentas: comum,
    };
  }
  const rC = 0.5 * Rb;
  const hC = Rb + 0.5 * L;
  const topo = hC + 0.35 * L;
  const Rw = 0.45 * L;
  const tw = 0.04 * L + 1;
  const anel = Array.from({ length: 13 }, (_, k) => { const a = (k * 2 * Math.PI) / 12; return [Rw + tw * Math.cos(a), topo - tw + tw * Math.sin(a)]; });
  return {
    forma, ro: rF, ri, altura: L, parte: 'valvula',
    cheios: [corpo, torno([[0, 0], [rC, 0], [rC, hC], [0, hC]], 'x', meio), torno([[0, 0], [rs, 0], [rs, topo], [0, topo]], 'x', meio), torno(anel, 'x', meio),
      caixa(topo - 2 * tw, topo, -Rw, Rw, L / 2 - tw, 2 * tw), caixa(topo - 2 * tw, topo, -tw, tw, L / 2 - Rw, 2 * Rw)],
    ferramentas: comum,
  };
}
