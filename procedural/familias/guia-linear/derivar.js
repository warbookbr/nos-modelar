/* derivar.js — dos parâmetros da guia (milímetro) à chamada de composição (metro). */
import { ID_DA_GUIA } from './composicoes.js';
import { geometriaDaGuia } from './geometria.js';

const m = (mm) => mm / 1000;

export function derivar(q) {
  const g = geometriaDaGuia(q);
  const a = {
    comprimento: m(q.comprimento), furos: g.furos, passo: [0, m(q.passo), 0], emFuro: [0, m(g.primeiro), 0], emCarro: [0, m(g.posicaoDoCarro), 0], comprimentoDoCarro: m(g.comprimentoDoCarro),
    pontoDaBase: [0, m(q.comprimento / 2), 0], larguraDoTrilho: m(q.larguraDoTrilho), pontoDaMesa: [0, m(g.posicaoDoCarro + g.comprimentoDoCarro / 2), m(q.alturaDeMontagem)], larguraDoCarro: m(q.larguraDoCarro),
  };
  for (const [prefixo, pts] of [['t', g.trilho], ['f', g.furo], ['c', g.carro], ['r', g.roscado]]) pts.forEach(([u, v], k) => { a[`${prefixo}u${k}`] = m(u); a[`${prefixo}v${k}`] = m(v); });
  g.centrosDoCarro.forEach((c, k) => { a[`emRosca${k}`] = c.map(m); });
  return { composicao: ID_DA_GUIA, argumentos: a };
}
