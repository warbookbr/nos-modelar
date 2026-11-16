/* derivar.js — dos parâmetros do componente eletrônico (milímetro) à chamada de composição (metro).

   Puro: recebe os parâmetros completos, escolhe a variante (o encapsulamento e, no resistor e na barra, o que muda a
   quantidade de passos) e devolve a composição dela com os argumentos gerados por `planoDoComponente`, o mesmo código que
   montou a composição. Os materiais não entram: ficam nos padrões da composição até a receita escolher com `comMateriais`. */
import { idDoComponente, planoDoComponente, varianteDe } from './composicoes.js';

export function derivar(parametros) {
  const variante = varianteDe(parametros);
  const { argumentos } = planoDoComponente(variante, parametros);
  return { composicao: idDoComponente(variante), argumentos };
}
