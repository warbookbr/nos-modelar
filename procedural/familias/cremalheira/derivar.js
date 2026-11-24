/* derivar.js — dos parâmetros da cremalheira (milímetro) à chamada de composição (metro). */
import { ID_DA_CREMALHEIRA } from './composicoes.js';
import { geometriaDaCremalheira } from './geometria.js';

const m = (mm) => mm / 1000;

export function derivar(parametros) {
  const g = geometriaDaCremalheira(parametros);
  const argumentos = { largura: m(g.largura), alturaDoVao: m(g.alturaDoVao), emVao: [0, -m(1), 0], vaos: g.dentes + 1, passo: [m(g.passo), 0, 0] };
  g.barra.forEach(([x, z], k) => { argumentos[`bx${k}`] = m(x); argumentos[`bz${k}`] = m(z); });
  g.vao.forEach(([x, z], k) => { argumentos[`vx${k}`] = m(x); argumentos[`vz${k}`] = m(z); });
  return { composicao: ID_DA_CREMALHEIRA, argumentos };
}
