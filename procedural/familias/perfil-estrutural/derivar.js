/* derivar.js — dos parâmetros do perfil (milímetro) à chamada de composição (metro). O tipo e o corte escolhem a composição. */
import { idDaComposicao } from './composicoes.js';
import { geometriaDoPerfil } from './geometria.js';

const m = (mm) => mm / 1000;

export function derivar(parametros) {
  const g = geometriaDoPerfil(parametros);
  const a = {
    largura: m(g.largura), altura: m(g.altura), comprimentoBruto: m(g.comprimentoBruto), emBarra: [0, m(g.inicio), 0], emFerramenta: g.emFerramenta.map(m), larguraDaFerramenta: m(g.larguraDaFerramenta),
    pontoDoInicio: [0, 0, 0], normalDoInicio: g.normalDoInicio, pontoDoFim: [0, m(parametros.comprimento), 0], normalDoFim: g.normalDoFim,
  };
  g.secao.forEach(([u, v], k) => { a[`su${k}`] = m(u); a[`sv${k}`] = m(v); });
  if (parametros.tipo === 3) a.raioDoFuro = m(g.raioDoFuro);
  if (parametros.corte >= 1) g.corteDoFim.forEach(([u, v], k) => { a[`cfu${k}`] = m(u); a[`cfv${k}`] = m(v); });
  if (parametros.corte >= 2) g.corteDoInicio.forEach(([u, v], k) => { a[`ciu${k}`] = m(u); a[`civ${k}`] = m(v); });
  return { composicao: idDaComposicao(parametros.tipo, parametros.corte), argumentos: a };
}
