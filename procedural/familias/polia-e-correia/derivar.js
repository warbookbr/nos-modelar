/* derivar.js — dos parâmetros da polia (milímetro) à chamada de composição (metro). O tipo, as flanges e os canais escolhem a composição. */
import { ID_DA_LISA, idDaDentada, idDaV } from './composicoes.js';
import { geometriaDaPolia } from './geometria.js';

const m = (mm) => mm / 1000;

export function derivar(parametros) {
  const g = geometriaDaPolia(parametros);
  const argumentos = { raioDoFuro: m(g.raioDoFuro), raioDoCubo: m(g.raioDoCubo), altura: m(g.altura) };
  g.perfil.forEach(([r, y], k) => { argumentos[`r${k}`] = m(r); argumentos[`y${k}`] = m(y); });
  if (g.tipo === 1) {
    g.canal.forEach(([x, z], k) => { argumentos[`cx${k}`] = m(x); argumentos[`cz${k}`] = m(z); });
    Object.assign(argumentos, { alturaDoCanal: m(g.alturaDoCanal), emCanal: [0, m(g.baseDoCanal), 0], dentes: g.dentes, grausEntreDentes: g.grausEntreDentes });
    return { composicao: idDaDentada(g.forma, g.comFlanges), argumentos };
  }
  return { composicao: g.tipo === 2 ? idDaV(g.canais) : ID_DA_LISA, argumentos };
}
