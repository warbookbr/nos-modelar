/* definicao.js — a família `cabo` carregada e as medidas do cabo que uma chamada pede; o `index.js` a reexporta junto com o pedido (`pedido.js`). */
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
    raioMinimo: plano.raioMinimo, raioLiso: plano.raioLiso, desvioDaCorda: plano.desvioDaCorda, distanciaDeAutocontato: plano.distanciaDeAutocontato,
  });
}
