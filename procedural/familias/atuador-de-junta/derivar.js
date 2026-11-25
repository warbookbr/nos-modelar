/* derivar.js — dos parâmetros do atuador (milímetro) à chamada de composição (metro). */
import { ID_POR_FORMA } from './composicoes.js';
import { geometriaDoAtuador } from './geometria.js';

const m = (mm) => mm / 1000;

export function derivar(q) {
  const g = geometriaDoAtuador(q);
  const a = {
    emCabo: g.cabo.em.map(m), emFuroF: g.furosDoFlange.em.map(m), emFuroS: g.furosDaSaida.em.map(m),
    furosF: g.furosDoFlange.total, grausF: g.furosDoFlange.graus, furosS: g.furosDaSaida.total, grausS: g.furosDaSaida.graus,
    diametroF: m(q.diametroDoFuroDoFlange), raioF: m(q.circuloDoFlange / 2), anguloF: g.furosDoFlange.anguloInicial,
    diametroS: m(q.diametroDoFuroDaSaida), raioS: m(q.circuloDaSaida / 2), anguloS: g.furosDaSaida.anguloInicial, topo: [0, m(g.topo), 0],
  };
  for (const [prefixo, pts] of [['c', g.carcaca], ['s', g.saida], ['k', g.cabo.perfil], ['ff', g.furosDoFlange.perfil], ['fs', g.furosDaSaida.perfil]]) pts.forEach(([r, y], k) => { a[`${prefixo}r${k}`] = m(r); a[`${prefixo}y${k}`] = m(y); });
  return { composicao: ID_POR_FORMA[q.forma ?? 1], argumentos: a };
}
