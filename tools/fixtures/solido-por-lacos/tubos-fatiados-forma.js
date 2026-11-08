/* tubos-fatiados-forma.js — a peça de prova "dois tubos que se cruzam" (a de `tubos-forma.js`) fatiada na horizontal: laços em planos y = constante, eixo
 * Y do `gaiolaPorLacos`, o ponto [u, v] do laço é [x, z]. As medidas são as mesmas: tubo em pé de 156 mm de diâmetro sobre o disco, tubo
 * deitado de mesmo diâmetro com o eixo em y = 117 mm, folga de 39 mm entre o topo do disco (y = 0) e o fundo do tubo deitado, comprimento
 * de 175 mm de x = -78 a x = 97 (rente às costas do tubo em pé e 19 mm à frente dele), chanfro de 2 mm nas pontas.
 *
 * O laço de cada y é a união do círculo do tubo em pé (raio 78, de y = 0 a y = 117) com o retângulo que o tubo deitado faz no plano, de x = -78 a
 * x = 97 e de meia largura c = sqrt(78² - d²), com d = y - 117. O círculo corta a lateral do retângulo em x = ±|d|. Até y = 39 (o fundo do tubo
 * deitado) o laço é o círculo inteiro, e a parede é vertical, rente ao disco; acima dele a volta é sempre a mesma, em 16 trechos: a tampa de trás
 * (reta, em x = -78), o chanfro, a lateral até o filete, o filete do encontro (um arco de Bézier tangente à lateral e ao círculo), o arco do
 * círculo que passa da lateral, o filete, a lateral até a frente, o chanfro e a tampa da frente (reta, em x = 97), e a volta pelo lado -z. Onde o
 * trecho não existe (a tampa abaixo de y = 39, o arco acima de y = 117) ele é um ponto, e os pontos seguidos que coincidem se fundem. Em
 * y = 195, onde a corda do tubo deitado vai a zero, o laço tem área zero (uma linha), que o ajudante trata como lâmina. */
import { gaiolaPorLacos } from '../../../procedural/nucleo/gaiola-por-lacos.js';

export const TABELA = {
  raio: 78,
  alturaDoEixo: 117,
  comprimento: 175,
  alturaDoDisco: 25,
  chanfro: 2,
  fundoDoChanfro: 2.6,
  nitidezDoChanfro: 0.8,
  /* a tangente do filete, em mm sobre a lateral e sobre o círculo, no máximo; onde não cabe, o filete encolhe com a sobra */
  tangenteDoFilete: 10,
  /* os ângulos (graus, a partir do fundo do tubo deitado) dos planos do tubo deitado: o espaçamento nas pontas passa de 2,5 mm */
  angulos: [0, 15, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 165, 180],
  /* os planos da parede do tubo em pé, de y = 0 (o chanfro) até o fundo do tubo deitado */
  planosDaParede: [0, 2.6, 7, 14, 22, 30, 36],
  niveis: 2,
};

const rad = (g) => (g * Math.PI) / 180;
const NOMES = ['capTras', 'bevTrasD', 'ladoTrasD', 'filTrasD', 'arcoD', 'filFrenteD', 'ladoFrenteD', 'bevFrenteD', 'capFrente', 'bevFrenteE',
  'ladoFrenteE', 'filFrenteE', 'arcoE', 'filTrasE', 'ladoTrasE', 'bevTrasE'];
const PONTOS = { capTras: 5, capFrente: 5, bevTrasD: 2, bevTrasE: 2, bevFrenteD: 2, bevFrenteE: 2, ladoTrasD: 2, ladoTrasE: 2, ladoFrenteD: 3, ladoFrenteE: 3,
  filTrasD: 5, filTrasE: 5, filFrenteD: 5, filFrenteE: 5, arcoD: 25, arcoE: 25 };
const ARCO_DENSO = 91;

/* os planos y, em mm, com o tipo: 'base' (o círculo da face de baixo, com o chanfro), 'parede' (círculo inteiro), 'tubo' (com o retângulo) e 'topo' (a lâmina) */
export function planosDeCorte(t = TABELA) {
  const eixo = t.alturaDoEixo; const r = t.raio;
  const fundo = eixo - r;
  const lista = t.planosDaParede.map((y, k) => ({ y: y === 0 ? 0 : y, tipo: k === 0 ? 'base' : 'parede' }));
  if (lista[lista.length - 1].y > fundo - 2.5) throw new Error('tubos-fatiados-forma: o último plano da parede fica a menos de 2,5 mm do fundo do tubo deitado');
  t.angulos.forEach((g, k) => lista.push({ y: eixo - r * Math.cos(rad(g)), tipo: k === 0 ? 'parede' : k === t.angulos.length - 1 ? 'topo' : 'tubo', angulo: g }));
  return lista;
}

const arco = (de, ate, n, raio) => Array.from({ length: n }, (_, k) => { const a = de + ((ate - de) * k) / (n - 1); return [raio * Math.cos(a), raio * Math.sin(a)]; });
const bezier = (p1, ctrl, p2, n = 13) => Array.from({ length: n }, (_, k) => {
  const s = k / (n - 1);
  return [(1 - s) ** 2 * p1[0] + 2 * (1 - s) * s * ctrl[0] + s * s * p2[0], (1 - s) ** 2 * p1[1] + 2 * (1 - s) * s * ctrl[1] + s * s * p2[1]];
});

/* O laço do plano `y`, em mm: { em, trechos }. */
export function lacoNoPlano(t, { y, tipo }) {
  const r = t.raio; const x0 = -r; const x1 = -r + t.comprimento; const ch = t.chanfro;
  const sobreOTubo = tipo === 'tubo' || tipo === 'topo';
  const d = Math.min(r, Math.abs(y - t.alturaDoEixo));
  const noAlto = y > t.alturaDoEixo;
  const c = sobreOTubo ? Math.sqrt(Math.max(0, r * r - d * d)) : 0;
  const cTampa = sobreOTubo ? Math.sqrt(Math.max(0, (r - ch) ** 2 - d * d)) : 0;
  const raioDoCirculo = tipo === 'base' ? r - ch : r;
  /* o círculo corta a lateral em x = ±dc: abaixo do fundo do tubo deitado (sem retângulo) ele é inteiro, e acima do eixo some */
  const dc = sobreOTubo ? (noAlto ? 0 : d) : raioDoCirculo;
  const alfa = Math.atan2(c, dc);
  const temFilete = sobreOTubo && c > 0;
  const salaT = sobreOTubo ? (-dc) - x0 : 0;
  const salaF = sobreOTubo ? x1 - dc : 0;
  const bevT = Math.min(ch, 0.35 * salaT); const bevF = Math.min(ch, 0.35 * salaF);
  const tlT = temFilete ? Math.max(0, Math.min(t.tangenteDoFilete, 0.55 * (salaT - bevT))) : 0;
  const tlF = temFilete ? Math.max(0, Math.min(t.tangenteDoFilete, 0.55 * (salaF - bevF))) : 0;
  const folgaDoArco = temFilete ? Math.max(0, Math.PI - 2 * alfa) : Math.PI;
  const dAng = temFilete ? Math.min(t.tangenteDoFilete / r, 0.45 * folgaDoArco) : 0;
  const tr = {};
  /* sem o retângulo: as pontas dos trechos de tampa, chanfro, lateral e filete são o ponto do círculo em z = 0, atrás e na frente */
  if (!sobreOTubo) {
    const B = [-raioDoCirculo, 0]; const F = [raioDoCirculo, 0];
    for (const n of NOMES) tr[n] = [[...F]];
    for (const n of ['capTras', 'bevTrasD', 'ladoTrasD', 'filTrasD', 'bevTrasE', 'ladoTrasE', 'filTrasE']) tr[n] = [[...B]];
    tr.arcoD = arco(Math.PI, 0, ARCO_DENSO, raioDoCirculo);
    tr.arcoE = arco(0, -Math.PI, ARCO_DENSO, raioDoCirculo);
    return { em: y, trechos: tr };
  }
  const ponto = (a) => [r * Math.cos(a), r * Math.sin(a)];
  /* a metade +z, da tampa de trás para a da frente; a -z sai do espelho (z -> -z) na ordem contrária */
  const aTras = Math.PI - alfa; const aFrente = alfa;
  const Cb = [-dc, c]; const Cf = [dc, c];
  const P1b = [-dc - tlT, c]; const P1f = [dc + tlF, c];
  const P2b = !noAlto ? ponto(aTras - dAng) : [-dc, c];
  const P2f = !noAlto ? ponto(aFrente + dAng) : [dc, c];
  const noAltoOuSemArco = noAlto;
  tr.capTras = [[x0, -cTampa], [x0, cTampa]];
  tr.bevTrasD = [[x0, cTampa], [x0 + bevT, c]];
  tr.ladoTrasD = [[x0 + bevT, c], noAltoOuSemArco ? [-tlT, c] : P1b];
  tr.filTrasD = noAltoOuSemArco ? [[-tlT, c], [0, c]] : bezier(P1b, Cb, P2b);
  tr.arcoD = noAltoOuSemArco ? [[0, c]] : arco(aTras - dAng, aFrente + dAng, ARCO_DENSO, r);
  tr.filFrenteD = noAltoOuSemArco ? [[0, c], [tlF, c]] : bezier(P2f, Cf, P1f);
  tr.ladoFrenteD = [noAltoOuSemArco ? [tlF, c] : P1f, [x1 - bevF, c]];
  tr.bevFrenteD = [[x1 - bevF, c], [x1, cTampa]];
  tr.capFrente = [[x1, cTampa], [x1, -cTampa]];
  const espelho = (poli) => poli.map(([u, v]) => [u, -v]);
  tr.bevFrenteE = espelho([[x1, cTampa], [x1 - bevF, c]]);
  tr.ladoFrenteE = espelho([...tr.ladoFrenteD].reverse());
  tr.filFrenteE = espelho([...tr.filFrenteD].reverse());
  tr.arcoE = espelho([...tr.arcoD].reverse());
  tr.filTrasE = espelho([...tr.filTrasD].reverse());
  tr.ladoTrasE = espelho([...tr.ladoTrasD].reverse());
  tr.bevTrasE = espelho([...tr.bevTrasD].reverse());
  return { em: y, trechos: tr };
}

export function trechosDaVolta() {
  return NOMES.map((nome) => ({ nome, pontos: PONTOS[nome] }));
}

export function argumentosDaGaiola(t = TABELA) {
  const planos = planosDeCorte(t);
  const lacos = planos.map((p) => lacoNoPlano(t, p));
  const iFundo = planos.findIndex((p) => p.tipo === 'tubo') - 1;
  const nome = (i) => `l${i}`;
  const entre = (a, b) => ({ nome: `${a}_${b}`, entre: [a, b], lacos: [nome(iFundo), 'ultimo'], nitidez: t.nitidezDoChanfro });
  const vincos = [
    { nome: 'faceBase', laco: 'primeiro', nitidez: t.nitidezDoChanfro },
    entre('capTras', 'bevTrasD'), entre('bevTrasD', 'ladoTrasD'), entre('ladoFrenteD', 'bevFrenteD'), entre('bevFrenteD', 'capFrente'),
    entre('capFrente', 'bevFrenteE'), entre('bevFrenteE', 'ladoFrenteE'), entre('ladoTrasE', 'bevTrasE'), entre('bevTrasE', 'capTras'),
  ];
  return { nome: 'k', eixo: 'y', tampa: { de: 'capTras', ate: 'capFrente' }, trechos: trechosDaVolta(), lacos, vincos };
}

export function derivar(t = TABELA, ajudante = gaiolaPorLacos) {
  const a = argumentosDaGaiola(t);
  const g = ajudante(a);
  return { planos: a.lacos.map((l) => l.em), ...g };
}
