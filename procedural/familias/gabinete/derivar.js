/* derivar.js — dos parâmetros do gabinete (milímetro) à chamada de composição (metro). */
import { ID_DO_GABINETE } from './composicoes.js';
import { geometriaDoGabinete } from './geometria.js';

const m = (mm) => mm / 1000;

export function derivar(q) {
  const g = geometriaDoGabinete(q);
  const a = { raioDoRessalto: m(g.raioDoRessalto), raioDoFuro: m(g.raioDoFuro), altura: m(q.altura), pontoDoTopo: [0, m(q.altura), 0], diametroDoFuro: m(q.diametroDoFuro) };
  for (const prefixo of ['externo', 'interno', 'labio']) { a[`${prefixo}Largura`] = m(g[prefixo].largura); a[`${prefixo}Profundidade`] = m(g[prefixo].profundidade); a[`${prefixo}Cantos`] = m(g[prefixo].cantos); }
  const faixa = (nome, { de, ate }) => { a[`${nome}Altura`] = m(ate - de); a[`${nome}Em`] = [0, m(de), 0]; };
  faixa('base', g.base); faixa('vaoDaBase', g.vaoDaBase); faixa('labioY', g.labioY); faixa('labioVao', { de: g.labioY.de - 1, ate: g.labioY.ate + 1 });
  faixa('tampa', g.tampa); faixa('vaoDaTampa', g.vaoDaTampa); faixa('rebaixo', g.rebaixo);
  g.centros.forEach(([x, z], k) => {
    a[`centro${k}`] = [m(x), 0, m(z)];
    for (const [nome, f] of [['ressaltoDaBase', g.ressaltoDaBase], ['furoDaBase', g.furoDaBase], ['ressaltoDaTampa', g.ressaltoDaTampa], ['furoDaTampa', g.furoDaTampa]]) { a[`${nome}${k}Em`] = [m(x), m(f.de), m(z)]; a[`${nome}${k}Altura`] = m(f.ate - f.de); }
  });
  return { composicao: ID_DO_GABINETE, argumentos: a };
}
