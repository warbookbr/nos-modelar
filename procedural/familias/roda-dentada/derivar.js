/* derivar.js — dos parâmetros da roda dentada (milímetro) à chamada de composição (metro). */
import { ID_DA_RODA } from './composicoes.js';
import { geometriaDaRoda } from './geometria.js';

const m = (mm) => mm / 1000;

export function derivar(q) {
  const g = geometriaDaRoda(q);
  const a = {
    alturaDoVao: m(g.alturaDoVao), emVao: g.emVao.map(m), dentes: q.dentes, passoAngular: 360 / q.dentes,
    raioDoFuro: m(q.furo / 2), raioDoCubo: m(q.diametroDoCubo / 2), comprimentoTotal: m(g.largura + q.comprimentoDoCubo), pontaDoCubo: [0, m(g.largura + q.comprimentoDoCubo), 0],
  };
  for (const [prefixo, pts] of [['g', g.vao], ['c', g.coroa]]) pts.forEach(([u, v], k) => { a[`${prefixo}u${k}`] = m(u); a[`${prefixo}v${k}`] = m(v); });
  return { composicao: ID_DA_RODA, argumentos: a };
}
