/* geometria.js — as medidas de uma polia da família `polia-e-correia`, em milímetro, a partir dos parâmetros.

   A polia é um corpo de revolução em torno de y: o cubo embaixo (y de 0 ao comprimento do cubo), a faixa onde a correia
   assenta acima dele e, na dentada, uma flange de cada lado da faixa. O furo atravessa tudo. A polia dentada tem os canais
   dos dentes da correia tirados da faixa: um canal por dente, em U, do diâmetro externo até a raiz. A polia em V tem os
   canais em V no perfil da revolução, e a lisa só a faixa.

   O diâmetro primitivo da dentada é dentes × passo / π e o externo é o primitivo menos duas vezes a diferença da linha
   primitiva. O canal em V segue a ISO 4183:1989. Flange, cubo e parede em volta do furo não têm norma: são regras da
   família para a peça ficar coerente, e o furo é nominal, sem a tolerância de ajuste. */

/* tipo: 1 dentada, 2 em V, 3 lisa */
export const TIPOS = Object.freeze({ 1: 'dentada', 2: 'v', 3: 'lisa' });

/* correia da dentada: passo, diferença da linha primitiva (pld) e a profundidade e a largura do vão do dente da polia,
   do gerador aberto "Parametric Pulley" (droftarts, 2012), que as tira das tabelas dos fabricantes; o vão GT2 e HTD é
   curvo, com fundo em meia-volta, e o T5 é trapezoidal de 40 graus (DIN 7721). O externo da T5 segue o ajuste do mesmo
   gerador à tabela publicada, e não uma diferença de linha primitiva fixa. */
export const CORREIAS_DENTADAS = Object.freeze({
  1: Object.freeze({ nome: 'GT2', passo: 2, pld: 0.254, profundidade: 0.764, largura: 1.494, forma: 'curva' }),
  2: Object.freeze({ nome: 'HTD 3M', passo: 3, pld: 0.381, profundidade: 1.289, largura: 2.27, forma: 'curva' }),
  3: Object.freeze({ nome: 'HTD 5M', passo: 5, pld: 0.5715, profundidade: 2.199, largura: 3.781, forma: 'curva' }),
  4: Object.freeze({ nome: 'T5', passo: 5, profundidade: 1.19, largura: 3.264, forma: 'trapezio', angulo: 40, externo: (n) => ((1.591 * n ** 1.064) / (0.6523 + n ** 1.064)) * n }),
});

/* seção clássica da correia em V pela ISO 4183:1989, tabelas 2, 4 e 5: largura de referência wd, altura mínima acima
   dela b, profundidade mínima abaixo dela h, distância entre canais e, borda mínima até o eixo do primeiro canal f, o
   diâmetro de referência até o qual o canal tem 34 graus (38 acima) e o diâmetro de referência mínimo */
export const SECOES_V = Object.freeze({
  1: Object.freeze({ nome: 'Z', wd: 8.5, b: 2, h: 7, e: 12, f: 7, ate34: 80, minimo: 50 }),
  2: Object.freeze({ nome: 'A', wd: 11, b: 2.75, h: 8.7, e: 15, f: 9, ate34: 118, minimo: 75 }),
  3: Object.freeze({ nome: 'B', wd: 14, b: 3.5, h: 10.8, e: 19, f: 11.5, ate34: 190, minimo: 125 }),
});

/* o vão do dente sai um pouco para fora do externo, para a subtração não deixar película no topo do dente */
const FOLGA_DO_CANAL = 0.5;
/* pontos do fundo do vão curvo, entre as duas pontas da meia-volta */
export const PONTOS_DO_FUNDO = 3;

const fechar = (pontos) => [...pontos, pontos[0]];
const tan = (graus) => Math.tan((graus * Math.PI) / 180);

/* o vão do dente no eixo x, em [x, z], do lado de fora do externo (ro) até o fundo */
function vaoDoDente(c, ro) {
  const a = c.largura / 2;
  const fora = [[ro + FOLGA_DO_CANAL, a], [ro, a]];
  const volta = [[ro, -a], [ro + FOLGA_DO_CANAL, -a]];
  if (c.forma === 'trapezio') {
    const b = a - c.profundidade * tan(c.angulo / 2);
    return [...fora, [ro - c.profundidade, b], [ro - c.profundidade, -b], ...volta];
  }
  const centro = ro - c.profundidade + a;
  const fundo = Array.from({ length: PONTOS_DO_FUNDO + 2 }, (_, k) => {
    const t = Math.PI / 2 + (Math.PI * k) / (PONTOS_DO_FUNDO + 1);
    return [centro + a * Math.cos(t), a * Math.sin(t)];
  });
  return [...fora, ...fundo, ...volta];
}

/** As medidas da polia: `{ tipo, perfil: [[r, y], ...] fechado, altura, raioDoFuro, raioDoCubo, ... }`, em mm. */
export function geometriaDaPolia(parametros) {
  const { tipo, correia, dentes, diametro, largura, canais, flanges, furo, diametroDoCubo, comprimentoDoCubo } = parametros;
  const rb = furo / 2;
  const rc = diametroDoCubo / 2;
  const lc = comprimentoDoCubo;
  if (tipo === 1) {
    const c = CORREIAS_DENTADAS[correia];
    const primitivo = (dentes * c.passo) / Math.PI;
    const ro = (c.externo ? c.externo(dentes) : primitivo - 2 * c.pld) / 2;
    const raiz = ro - c.profundidade;
    const faixa = largura + 1;
    const comFlanges = flanges === 1;
    const espessuraDaFlange = comFlanges ? c.passo / 2 : 0;
    const rf = ro + Math.max(1.5, 1.5 * c.profundidade + 0.5);
    const baseDaFaixa = lc + espessuraDaFlange;
    const topoDaFaixa = baseDaFaixa + faixa;
    const altura = topoDaFaixa + espessuraDaFlange;
    const perfil = comFlanges
      ? [[rb, 0], [rc, 0], [rc, lc], [rf, lc], [rf, baseDaFaixa], [ro, baseDaFaixa], [ro, topoDaFaixa], [rf, topoDaFaixa], [rf, altura], [rb, altura]]
      : [[rb, 0], [rc, 0], [rc, lc], [ro, lc], [ro, altura], [rb, altura]];
    /* sem flanges o vão passa do topo da faixa; com flanges vai de uma flange à outra */
    const alturaDoCanal = comFlanges ? faixa : faixa + 1;
    return {
      tipo, correia: c.nome, forma: c.forma, perfil: fechar(perfil), altura, raioDoFuro: rb, raioDoCubo: rc, comFlanges,
      diametroPrimitivo: primitivo, diametroExterno: 2 * ro, diametroDaRaiz: 2 * raiz, passo: c.passo, dentes,
      canal: vaoDoDente(c, ro), baseDoCanal: baseDaFaixa, alturaDoCanal, grausEntreDentes: 360 / dentes,
    };
  }
  if (tipo === 2) {
    /* o diâmetro da polia em V é o de referência (dd), na largura de referência wd; o externo fica b acima e o fundo h abaixo */
    const s = SECOES_V[correia];
    const angulo = diametro <= s.ate34 ? 34 : 38;
    const rd = diametro / 2;
    const rExterno = rd + s.b;
    const meioTopo = s.wd / 2 + s.b * tan(angulo / 2);
    const meioFundo = s.wd / 2 - s.h * tan(angulo / 2);
    const faixa = 2 * s.f + (canais - 1) * s.e;
    const altura = lc + faixa;
    const perfil = [[rb, 0], [rc, 0], [rc, lc], [rExterno, lc]];
    for (let k = 0; k < canais; k += 1) {
      const y = lc + s.f + k * s.e;
      perfil.push([rExterno, y - meioTopo], [rd - s.h, y - meioFundo], [rd - s.h, y + meioFundo], [rExterno, y + meioTopo]);
    }
    perfil.push([rExterno, altura], [rb, altura]);
    return { tipo, correia: s.nome, perfil: fechar(perfil), altura, raioDoFuro: rb, raioDoCubo: rc, diametroDeReferencia: diametro, diametroExterno: 2 * rExterno, angulo, canais, diametroDoFundo: diametro - 2 * s.h };
  }
  const ro = diametro / 2;
  const altura = lc + largura;
  return { tipo, perfil: fechar([[rb, 0], [rc, 0], [rc, lc], [ro, lc], [ro, altura], [rb, altura]]), altura, raioDoFuro: rb, raioDoCubo: rc, diametroExterno: diametro };
}
