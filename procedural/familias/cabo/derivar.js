/* derivar.js — dos parâmetros do cabo (milímetro) à chamada de composição (metro). O plano (`plano.js`) escolhe a composição pelo
   número de estações; as pontas viram as portas `ponta-a` e `ponta-b`. Os acessórios são chamadas próprias (`pedido.js`). */
import { ID_DO_CABO } from './composicoes.js';
import { planejar } from './plano.js';

const m = (mm) => mm / 1000;
const vm = (v) => v.map(m);

export function derivar(parametros) {
  const plano = planejar(parametros);
  const argumentos = { raio: m(plano.raio), segmentosArco: plano.lados / 4 };
  plano.pontos.forEach((q, k) => { argumentos[`p${k}`] = vm(q); argumentos[`n${k}`] = [...plano.normais[k]]; });
  argumentos.aCentro = vm(plano.A); argumentos.aEixo = [...plano.dA]; argumentos.aFim = m(plano.trechoA);
  argumentos.bCentro = vm(plano.B); argumentos.bEixo = [...plano.dB]; argumentos.bFim = m(plano.trechoB);
  return { composicao: ID_DO_CABO(plano.estacoes), argumentos };
}
