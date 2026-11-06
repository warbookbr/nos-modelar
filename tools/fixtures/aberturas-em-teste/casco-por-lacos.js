/* casco-por-lacos.js — peça de teste do plano da abertura em qualquer direção: a chapa feita por outra gaiola, a gaiola por laços.
 *
 * O casco é um elipsoide fechado de 800 mm de comprimento em x e semieixos de 100 mm em y e 150 mm em z, feito por `gaiolaPorLacos`
 * (um laço elíptico a cada 100 mm, os das pontas reduzidos a um ponto) e subdividido em dois níveis com 2 mm de espessura: um corpo
 * fechado, que a reta do eixo z atravessa duas vezes. O vão é um retângulo de 300 por 80 mm na vista z, com `sentido` '+', no topo do
 * casco. Nada vem de referência externa. */
import { gaiolaPorLacos } from '../../../procedural/nucleo/gaiola-por-lacos.js';
import { dosPassos, m, passoDaAbertura, receitaDe, retangulo } from './chapas.js';

export const COMPRIMENTO = 800;
export const SEMI_Y = 100;
export const SEMI_Z = 150;
const ESTACOES = 9;

/* o laço elíptico do plano x, em [y, z] mm: quatro quartos de elipse em sentido anti-horário */
function laco(x) {
  const t = (x - COMPRIMENTO / 2) / (COMPRIMENTO / 2);
  const s = Math.sqrt(Math.max(0, 1 - t * t));
  const quarto = (de) => Array.from({ length: 5 }, (_, k) => { const a = ((de + (90 * k) / 4) * Math.PI) / 180; return [SEMI_Y * s * Math.cos(a), SEMI_Z * s * Math.sin(a)]; });
  return { em: x, trechos: { q1: quarto(0), q2: quarto(90), q3: quarto(180), q4: quarto(270) } };
}

export function casco() {
  const trechos = ['q1', 'q2', 'q3', 'q4'].map((nome) => ({ nome, pontos: 5 }));
  const lacos = Array.from({ length: ESTACOES }, (_, k) => laco((COMPRIMENTO * k) / (ESTACOES - 1)));
  return gaiolaPorLacos({ nome: 'cs', eixo: 'x', trechos, lacos, tampa: { de: 'q1', ate: 'q3' } });
}

/** O vão de 300 por 80 mm no topo do casco (z > 0), em x de 250 a 550 e y de -40 a 40. */
export const VAO = retangulo(250, -40, 550, 40);

export function passosDe(abertura = { sentido: '+' }) {
  const g = casco();
  const passos = [['subdivisao', { origemId: 1, ...g.passo, niveis: 2, espessura: m(2) }]];
  if (abertura) passos.push(passoDaAbertura(2, dosPassos('subdivisao', 1), { vista: 'z', contorno: VAO, ...abertura }));
  return { TOPO: g.pontos, PASSOS: passos };
}

const padrao = passosDe();
export default receitaDe({ nome: 'casco-por-lacos', desc: 'elipsoide fechado de 800 mm feito por gaiolaPorLacos, com um vão de 300 por 80 mm no topo' }, padrao.TOPO, padrao.PASSOS, { lentes: [2] });
