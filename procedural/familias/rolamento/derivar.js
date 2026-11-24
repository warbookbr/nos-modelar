/* derivar.js — dos parâmetros do rolamento (milímetro) à chamada de composição (metro). A forma escolhe a composição. */
import { ID_POR_FORMA, solidosDoRolamento } from './composicoes.js';
import { geometriaDoRolamento } from './geometria.js';

const m = (mm) => mm / 1000;

export function derivar(q) {
  const g = geometriaDoRolamento(q);
  const a = { raioDoFuro: m(q.furo / 2), raioDoAnel: m(g.primitivo - 0.35 * g.raioDaEsfera), largura: m(q.largura), pontoDeApoio: g.apoio.ponto.map(m), normalDeApoio: g.apoio.normal, extensaoDeApoio0: m(g.apoio.extensao[0]), extensaoDeApoio1: m(g.apoio.extensao[1]) };
  solidosDoRolamento(g).forEach((s, k) => {
    a[`s${k}em`] = s.em.map(m);
    s.perfil.forEach(([r, y], i) => { a[`s${k}r${i}`] = m(r); a[`s${k}y${i}`] = m(y); });
    if (s.op === 'extrusao') a[`s${k}altura`] = m(s.altura);
    if (s.copias) { a[`s${k}total`] = s.copias.total; a[`s${k}graus`] = s.copias.graus; }
  });
  return { composicao: ID_POR_FORMA[q.forma], argumentos: a };
}
