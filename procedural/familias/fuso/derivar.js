/* derivar.js — dos parâmetros do fuso (milímetro) à chamada de composição (metro). O filete do trapezoidal tem quatro
   pontos e repete o último para chegar aos seis da composição, que são os do de esferas. */
import { ID_DO_FUSO, PONTOS_DO_FILETE } from './composicoes.js';
import { geometriaDoFuso } from './geometria.js';

const m = (mm) => mm / 1000;

export function derivar(q) {
  const g = geometriaDoFuso(q);
  const a = {
    raioDoFilete: m(g.filete.raio), passo: m(g.filete.passo), voltas: g.filete.voltas, centroDoFilete: g.filete.centro.map(m), fechamento: m(g.filete.fechamento),
    emCastanha: g.emCastanha.map(m), emFuro: g.emFuro.map(m), raioDoNucleo: m(g.raioDoNucleo), pontoDoFlange: [0, m(q.posicaoDaCastanha), m((g.raioDoFlange + q.diametro / 2) / 2)], diametroDoFlange: m(2 * g.raioDoFlange),
  };
  const filete = g.filete.perfil.length === PONTOS_DO_FILETE ? g.filete.perfil : interpolar(g.filete.perfil);
  for (const [prefixo, pts] of [['n', g.nucleo], ['f', filete], ['c', g.castanha], ['h', g.furo]]) pts.forEach(([u, v], k) => { a[`${prefixo}u${k}`] = m(u); a[`${prefixo}v${k}`] = m(v); });
  return { composicao: ID_DO_FUSO, argumentos: a };
}

/* o trapézio de quatro pontos com um ponto no meio de cada flanco, para o filete ter sempre seis pontos */
function interpolar([a, b, c, dd]) {
  const meio = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
  return [a, b, meio(b, c), c, dd, meio(dd, a)];
}
