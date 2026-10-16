/* derivar.js — dos parâmetros do aparelho de caixa (milímetro) à chamada de composição (metro).

   Puro: recebe os parâmetros completos e devolve a composição da combinação (painel, botões, puxador, visor) e os argumentos
   dela, todos gerados por `planoDoAparelho` a partir da geometria em milímetro. A combinação escolhe a composição porque a
   composição v1 só substitui valores. */
import { idDoAparelho, planoDoAparelho } from './composicoes.js';
import { geometriaDoAparelho } from './geometria.js';

export function derivar(parametros) {
  const combo = {
    painel: parametros.painelDeComando,
    giratorios: parametros.botoesGiratorios,
    pressao: parametros.botoesDePressao,
    puxador: parametros.tipoDePuxador,
    visor: parametros.comVisor,
  };
  const { argumentos } = planoDoAparelho(combo, geometriaDoAparelho(parametros));
  return { composicao: idDoAparelho(combo), argumentos };
}
