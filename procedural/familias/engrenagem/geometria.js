/* geometria.js — as medidas de uma engrenagem da família `engrenagem`, em milímetro, a partir dos parâmetros.

   A engrenagem é um corpo de revolução em torno de y (o cubo embaixo, de 0 ao comprimento do cubo, e a coroa acima dele,
   no diâmetro de cabeça) com o furo, e os vãos entre os dentes tirados da coroa: um vão por dente, repetido em volta do eixo.

   A engrenagem reta segue o perfil de referência tipo A da ISO 53:1998, tabela 2: ângulo de pressão de 20°, saliência de
   1 módulo, creux de 1,25 módulo e raio de pé de 0,38 módulo. O flanco é a evolvente do círculo de base, de raio
   rp·cos 20°, com rp = m·z/2; abaixo do círculo de base, o flanco segue radial até o raio de pé. A espessura do dente no
   primitivo é meio passo (π·m/2), sem correção de perfil, e por isso a família recusa menos de 17 dentes, o mínimo sem
   rebaixo do pé com 20°. O módulo é livre; a ISO 54 recomenda os da série I (1; 1,25; 1,5; 2; 2,5; 3; 4; 5; 6; 8; 10).

   A catraca não tem norma: dente de serra com a face de trava radial, a profundidade de meio passo no diâmetro de cabeça
   (m·z), uma faixa plana de um décimo do passo no topo e um raio de um quarto da profundidade no fundo, regras da família. */

export const ANGULO_DE_PRESSAO = 20;
export const SALIENCIA = 1;
export const CREUX = 1.25;
export const RAIO_DE_PE = 0.38;
/* o vão sai um pouco para fora da cabeça, para a subtração não deixar película */
const FOLGA_DO_VAO = 0.1;
export const PONTOS_DA_EVOLVENTE = 8;
export const PONTOS_DO_RAIO_DE_PE = 3;
/* pontos do vão: os dois lados (fora, evolvente, tangente, raio de pé e fundo) e o meio do fundo */
export const PONTOS_DO_VAO = 2 * (1 + PONTOS_DA_EVOLVENTE + 1 + PONTOS_DO_RAIO_DE_PE + 1) + 2;
export const PONTOS_DO_VAO_DE_CATRACA = 7;

const inv = (a) => Math.tan(a) - a;
const polar = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
const fechar = (pontos) => [...pontos, pontos[0]];

/* o vão da engrenagem reta, centrado no eixo x, em [x, z]: do lado de fora da cabeça, pelo flanco evolvente, pelo raio de
   pé, ao fundo, e de volta pelo flanco espelhado */
function vaoEvolvente(m, z) {
  const alfa = (ANGULO_DE_PRESSAO * Math.PI) / 180;
  const rp = (m * z) / 2;
  const rb = rp * Math.cos(alfa);
  const ra = rp + SALIENCIA * m;
  const rf = rp - CREUX * m;
  const rho = RAIO_DE_PE * m;
  /* meio ângulo do vão no raio r: meio passo angular menos a meia espessura do dente nesse raio */
  const meiaEspessura = (r) => Math.PI / (2 * z) + inv(alfa) - inv(Math.acos(Math.min(1, rb / Math.max(r, rb))));
  const g = (r) => Math.PI / z - meiaEspessura(r);
  /* o raio de pé: círculo de raio rho tangente ao fundo e ao flanco, tomado como reta radial no ângulo do flanco junto do pé */
  const delta = Math.asin(rho / (rf + rho));
  const rLinha = (rf + rho) * Math.cos(delta);
  const g0 = g(Math.max(rLinha, rb));
  const centro = polar(rf + rho, g0 - delta);
  /* o número de pontos é fixo (a composição só troca valores): sem trecho radial, a evolvente para meio passo acima da tangente */
  const fimDaEvolvente = rb > rLinha ? rb : rLinha + (ra - rLinha) / (2 * (PONTOS_DA_EVOLVENTE - 1));
  /* o primeiro ponto prolonga a evolvente além da cabeça: com um canto no raio de cabeça, o flanco cruzava as facetas do
     corpo de revolução, que ficam até 0,01 mm para dentro do círculo, e deixava uma lasca solta na ponta de cada dente */
  const lado = [polar(ra + FOLGA_DO_VAO, g(ra + FOLGA_DO_VAO))];
  for (let k = 0; k < PONTOS_DA_EVOLVENTE; k += 1) {
    const r = ra - ((ra - fimDaEvolvente) * k) / (PONTOS_DA_EVOLVENTE - 1);
    lado.push(polar(r, g(r)));
  }
  /* abaixo do círculo de base o flanco segue radial até a tangente do raio de pé */
  const tangenteNaLinha = polar(rLinha, g0);
  lado.push(tangenteNaLinha);
  const a0 = Math.atan2(tangenteNaLinha[1] - centro[1], tangenteNaLinha[0] - centro[0]);
  const tangenteNoFundo = polar(rf, g0 - delta);
  let a1 = Math.atan2(tangenteNoFundo[1] - centro[1], tangenteNoFundo[0] - centro[0]);
  while (a1 > a0) a1 -= 2 * Math.PI;
  if (a0 - a1 > Math.PI) a1 += 2 * Math.PI;
  for (let k = 1; k <= PONTOS_DO_RAIO_DE_PE; k += 1) {
    const a = a0 + ((a1 - a0) * k) / (PONTOS_DO_RAIO_DE_PE + 1);
    lado.push([centro[0] + rho * Math.cos(a), centro[1] + rho * Math.sin(a)]);
  }
  lado.push(tangenteNoFundo);
  /* o lado de cima de fora para o fundo, o meio do fundo e o lado de baixo do fundo para fora */
  /* fecha por fora num ponto do meio afastado o bastante para a corda entre os dois lados não entrar no círculo de cabeça:
     com só os dois pontos de fora, a corda de ±4,8° descia a 31,99 mm na cabeça de 32 mm e deixava uma lasca em cada dente */
  const meioAngulo = Math.atan2(lado[0][1], lado[0][0]);
  const fora = [Math.hypot(...lado[0]) / Math.cos(meioAngulo), 0];
  const vao = [...lado, [rf, 0], ...lado.map(([x, zz]) => [x, -zz]).reverse(), fora];
  return { vao, rp, rb, ra, rf };
}

/* o vão da catraca, com a face de trava radial no ângulo 0 e a rampa até o dente seguinte */
function vaoDeCatraca(m, z) {
  const ra = (m * z) / 2;
  const passo = (2 * Math.PI) / z;
  const h = (Math.PI * m) / 2;
  const rf = ra - h;
  const topo = passo * 0.1;
  const r = h / 4;
  /* o fundo arredondado entre a face radial e a rampa, aproximado pelo ponto do meio do quarto de volta */
  const meio = polar(rf + r * (1 - Math.SQRT1_2), (r * Math.SQRT1_2) / rf);
  /* o lado de fora do vão passa por um ponto no meio do arco, afastado o bastante para a corda não entrar no círculo de
     cabeça: com só as duas pontas, a corda de 15° passava por dentro e deixava uma lasca solta em cada dente */
  const fora = (ra + FOLGA_DO_VAO) / Math.cos((passo - topo) / 2);
  return { vao: [polar(ra + FOLGA_DO_VAO, 0), polar(rf + r, 0), meio, polar(rf, r / rf), polar(ra, passo - topo), polar(ra + FOLGA_DO_VAO, passo - topo), polar(fora, (passo - topo) / 2)], ra, rf, rp: ra };
}

/** As medidas da engrenagem: `{ tipo, perfil: [[r, y], ...] fechado, vao: [[x, z], ...], ... }`, em mm. */
export function geometriaDaEngrenagem(parametros) {
  const { tipo, modulo: m, dentes: z, largura, furo, diametroDoCubo, comprimentoDoCubo: lc } = parametros;
  const d = tipo === 1 ? vaoEvolvente(m, z) : vaoDeCatraca(m, z);
  const rb = furo / 2;
  const rc = diametroDoCubo / 2;
  const altura = lc + largura;
  const perfil = fechar([[rb, 0], [rc, 0], [rc, lc], [d.ra, lc], [d.ra, altura], [rb, altura]]);
  /* o vão começa 1 mm abaixo da coroa quando o cubo é mais fino que o pé: o vão rente à face entre o cubo e a coroa deixava
     lascas soltas na subtração (a reta de módulo 2 com 30 dentes saía em 27 pedaços); com o cubo mais largo que o pé, o vão
     fica rente para não entalhar o cubo */
  const baseDoVao = rc < d.rf - 0.5 ? lc - 1 : lc;
  return {
    tipo, modulo: m, dentes: z, perfil, altura, raioDoFuro: rb, raioDoCubo: rc, vao: d.vao, baseDoVao, alturaDoVao: altura + 1 - baseDoVao,
    grausEntreDentes: 360 / z, diametroPrimitivo: 2 * d.rp, diametroDeCabeca: 2 * d.ra, diametroDePe: 2 * d.rf, diametroDeBase: d.rb ? 2 * d.rb : null,
  };
}
