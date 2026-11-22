/* derivar.js — dos parâmetros da mola (milímetro) à chamada de composição (metro). A forma escolhe a composição. */
import { ID_POR_FORMA } from './composicoes.js';
import { geometriaDaMola } from './geometria.js';

const m = (mm) => mm / 1000;
const vm = (v) => v.map(m);

export function derivar(parametros) {
  const g = geometriaDaMola(parametros);
  const argumentos = {
    raioDoFio: m(g.d / 2), raio: m(g.helice.raio), passo: m(g.helice.passo), voltas: g.helice.voltas, centro: [0, m(g.helice.base), 0],
  };
  if (g.helice.pontas) argumentos.passoDaPonta = m(g.helice.pontas.passo);
  const juntas = { Cima: g.fim, Baixo: g.inicio };
  const pontas = (prefixo, lista, normalDe) => {
    ['Cima', 'Baixo'].forEach((quem, j) => {
      lista[j].pontos.forEach((pt, k) => { argumentos[`${prefixo}${quem}${k}`] = vm(pt); });
      argumentos[`normal${quem}`] = normalDe(lista[j]);
      argumentos[`apoioDaJunta${quem}`] = vm([juntas[quem][0], juntas[quem][1] - g.d / 2, juntas[quem][2]]);
    });
  };
  if (g.ganchos) pontas('gancho', g.ganchos, (gancho) => gancho.normal);
  if (g.bracos) pontas('braco', g.bracos.map((pontos) => ({ pontos })), () => [0, 1, 0]);
  return { composicao: ID_POR_FORMA[parametros.forma], argumentos };
}
