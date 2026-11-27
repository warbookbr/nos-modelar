/* index.js — a família `cabo`: o cabo flexível entre dois pontos, de seção circular, com o comprimento pedido, a curva de menor
   energia de dobra (`curva.js`), o raio mínimo de curva, o caimento opcional, os lados da seção, o desvio máximo da corda e o
   orçamento de faces (`plano.js`). `medidasDoCabo` dá as medidas do cabo que a chamada pede (comprimento de corte, faces, raio). */
import contratoJson from './familia.json' with { type: 'json' };
import { chamar, definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';
import { planejar } from './plano.js';

export const CABO = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });

/** As medidas do cabo de uma chamada, em milímetro: o comprimento de corte (o da curva), o da malha, as faces, o raio mínimo e a flecha da corda. */
export function medidasDoCabo(parametros = {}) {
  chamar(CABO, 'medidas', parametros);
  const doPerfil = contratoJson.perfis[parametros.perfil]?.parametros ?? {};
  const completos = Object.fromEntries(Object.entries(contratoJson.parametros).map(([nome, def]) => [nome, parametros[nome] ?? doPerfil[nome] ?? def.padrao]));
  const plano = planejar(completos);
  return Object.freeze({
    comprimentoDeCorte: plano.comprimentoDaCurva, comprimentoPedido: plano.comprimentoPedido, comprimentoDaMalha: plano.comprimentoDaMalha,
    faces: plano.faces, triangulos: plano.triangulos, trechos: plano.estacoes - 1, lados: plano.lados,
    raioMinimo: plano.raioMinimo, desvioDaCorda: plano.desvioDaCorda, distanciaDeAutocontato: plano.distanciaDeAutocontato,
  });
}
