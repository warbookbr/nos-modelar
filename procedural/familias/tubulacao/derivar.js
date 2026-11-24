/* derivar.js — dos parâmetros da peça de tubulação (milímetro) à chamada de composição (metro). A forma escolhe a composição. */
import { ID_POR_FORMA, solidosDoAcessorio } from './composicoes.js';
import { geometriaDaPeca } from './geometria.js';

const m = (mm) => mm / 1000;
const vm = (v) => v.map(m);

export function derivar(parametros) {
  const g = geometriaDaPeca(parametros);
  const argumentos = { ri: m(g.ri), ro: m(g.ro) };
  if (g.forma === 2) {
    argumentos.altura = m(parametros.diametroExterno);
    g.fora.forEach((pt, k) => { argumentos[`a${k}`] = vm(pt); });
    g.dentro.forEach((pt, k) => { argumentos[`d${k}`] = vm(pt); });
    g.secaoDeFora.forEach(([u, v], k) => { argumentos[`fu${k}`] = m(u); argumentos[`fv${k}`] = m(v); });
    g.secaoDeDentro.forEach(([u, v], k) => { argumentos[`iu${k}`] = m(u); argumentos[`iv${k}`] = m(v); });
  } else if (g.forma >= 6) {
    argumentos.altura = m(g.altura);
    solidosDoAcessorio(g).forEach((s, k) => {
      argumentos[`s${k}em`] = vm(s.em);
      s.perfil.forEach(([r, y], i) => { argumentos[`s${k}r${i}`] = m(r); argumentos[`s${k}y${i}`] = m(y); });
      if (s.op === 'extrusao') argumentos[`s${k}altura`] = m(s.altura);
      if (s.copias) { argumentos[`s${k}total`] = s.copias.total; argumentos[`s${k}graus`] = s.copias.graus; }
    });
  } else if (g.forma === 4) {
    argumentos.altura = m(g.altura);
    argumentos.emDerivacao = vm(g.emDerivacao);
    for (const [prefixo, perfil] of [['p', g.passagem], ['d', g.derivacao], ['fp', g.furoDaPassagem], ['fd', g.furoDaDerivacao]]) perfil.forEach(([r, y], k) => { argumentos[`${prefixo}r${k}`] = m(r); argumentos[`${prefixo}y${k}`] = m(y); });
  } else {
    argumentos.altura = m(g.altura);
    g.perfil.forEach(([r, y], k) => { argumentos[`r${k}`] = m(r); argumentos[`y${k}`] = m(y); });
  }
  return { composicao: ID_POR_FORMA[g.forma], argumentos };
}
