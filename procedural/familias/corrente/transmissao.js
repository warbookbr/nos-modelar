/* transmissao.js — a transmissão por corrente: as duas rodas dentadas da família `roda-dentada` e a corrente da família
   `corrente` entre elas, com a distância exata e o giro de cada roda para um vão cair em cada rolo.

   FICHA transmissaoPorCorrente
   serve: a corrente de rolos da ISO 606 série B fechada em volta de duas rodas dentadas: o número par de elos mais perto
     da distância pedida, a distância exata entre os centros e o giro em y de cada roda para os vãos receberem os rolos.
   quando: duas rodas da mesma corrente (06B a 16B), no mesmo plano, a roda 1 no centro e a roda 2 em x = distância.
   unidades: mm; giros em graus, em torno de y.
   campos:
     corrente: '06B', '08B', '10B', '12B' ou '16B'.
     dentes1: os dentes da roda 1.
     dentes2: os dentes da roda 2.
     distancia: a distância aproximada entre os centros.
   devolve: { elos, distancia, parametrosDaCorrente, roda1, roda2 } com cada roda { parametros, pose } para o
     `instanciaDeFamilia` (a pose centra os dentes em y = 0 e gira o vão para o primeiro rolo).
   exemplo:
     transmissaoPorCorrente({ corrente: '08B', dentes1: 18, dentes2: 36, distancia: 300 })
   peça: tools/fixtures/corrente-e-esteira/transmissao.mjs (a 08B com rodas de 18 e 36 dentes).
   FIM DA FICHA */
import { disposicaoDaCorrente } from './geometria.js';
import { medidasDaCorrente } from './tabela.js';
import { parametrosDaRoda } from '../roda-dentada/tabela.js';
import { medidasDaRoda } from '../roda-dentada/geometria.js';

export function transmissaoPorCorrente({ corrente, dentes1, dentes2, distancia }) {
  const c = medidasDaCorrente(corrente);
  const parametrosDaCorrente = { ...c, dentes1, dentes2, distancia };
  const d = disposicaoDaCorrente(parametrosDaCorrente);
  /* o vão 0 da roda fica em +x; o giro em y de γ graus diminui o ângulo no plano [x, z], e −α leva o vão ao ângulo α */
  const roda = (dentes, x, angulo) => {
    const parametros = parametrosDaRoda(corrente, dentes);
    const { largura } = medidasDaRoda(parametros);
    return { parametros, pose: { posicao: [x / 1000, -largura / 2000, 0], giro: [{ eixo: 'y', graus: (-angulo * 180) / Math.PI }] } };
  };
  return { elos: d.elos, distancia: d.distancia, parametrosDaCorrente: { ...parametrosDaCorrente, distancia: d.distancia }, roda1: roda(dentes1, 0, d.alfa), roda2: roda(dentes2, d.distancia, d.beta) };
}
