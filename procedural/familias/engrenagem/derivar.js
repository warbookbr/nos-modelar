/* derivar.js — dos parâmetros da engrenagem (milímetro) à chamada de composição (metro). O tipo escolhe a composição. */
import { ID_POR_TIPO } from './composicoes.js';
import { geometriaDaEngrenagem } from './geometria.js';

const m = (mm) => mm / 1000;

export function derivar(parametros) {
  const g = geometriaDaEngrenagem(parametros);
  const argumentos = { raioDoFuro: m(g.raioDoFuro), raioDoCubo: m(g.raioDoCubo), altura: m(g.altura) };
  g.perfil.forEach(([r, y], k) => { argumentos[`r${k}`] = m(r); argumentos[`y${k}`] = m(y); });
  g.vao.forEach(([x, z], k) => { argumentos[`vx${k}`] = m(x); argumentos[`vz${k}`] = m(z); });
  Object.assign(argumentos, { alturaDoVao: m(g.alturaDoVao), emVao: [0, m(g.baseDoVao), 0], dentes: g.dentes, grausEntreDentes: g.grausEntreDentes });
  return { composicao: ID_POR_TIPO[g.tipo], argumentos };
}
