/* transmissao.mjs — a transmissão por corrente de prova: as duas rodas dentadas e a corrente da `transmissaoPorCorrente`,
 * postas pelo `instanciaDeFamilia`, com os contatos que a corrente tem por dentro (rolo no pino, pino nas placas, placa na
 * placa e rolo na placa interna) e o rolo no vão de cada roda. O assento da ISO 606 tem 0,005 d1 de folga sobre o rolo, e
 * as facetas do rolo e do assento ficam na casa de centésimos de milímetro: o rolo pode só encostar, entrar um pouco no
 * flanco onde o trecho reto sai da roda ou ficar com essa folga, e o teste cobra que nenhum atravesse. */
import { instanciaDeFamilia } from '../../modelar/instancia-de-familia.mjs';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { transmissaoPorCorrente } from '../../../procedural/familias/corrente/transmissao.js';

export function receitaDaTransmissao({ corrente = '08B', dentes1 = 18, dentes2 = 36, distancia = 300, nome = 'transmissao-por-corrente' } = {}) {
  const registro = criarRegistroDeFamilias();
  const t = transmissaoPorCorrente({ corrente, dentes1, dentes2, distancia });
  const PASSOS = [];
  let base = 0;
  const partes = {};
  const por = (familia, parametros, nomes, pose) => {
    const inst = instanciaDeFamilia({ familia, registro, parametros, nomes, id: nomes.toLowerCase(), portas: true, portaPrefixo: nomes.toLowerCase(), base, pose });
    PASSOS.push(...inst.passos);
    partes[nomes] = inst.partes.map((p) => p.nome);
    base = inst.origem;
  };
  por('roda-dentada', t.roda1.parametros, 'roda1', t.roda1.pose);
  por('roda-dentada', t.roda2.parametros, 'roda2', t.roda2.pose);
  por('corrente', t.parametrosDaCorrente, 'corrente', { posicao: [0, 0, 0] });
  const c = (a, b, motivo) => ({ par: [a, b], motivo });
  const contatos = [
    c('correnteRolos', 'correntePinos', 'o rolo gira em volta do pino'),
    c('correntePinos', 'correntePlacasInternas', 'o pino passa pelo furo da placa interna'),
    c('correntePinos', 'correntePlacasExternas', 'o pino é cravado na placa externa'),
    c('correntePlacasExternas', 'correntePlacasInternas', 'a placa externa encosta na interna, no pino'),
    c('correnteRolos', 'correntePlacasInternas', 'a ponta do rolo encosta na placa interna'),
    c('correnteRolos', 'roda1Roda', 'o rolo assenta no vão do dente da roda 1, com a folga da norma'),
    c('correnteRolos', 'roda2Roda', 'o rolo assenta no vão do dente da roda 2, com a folga da norma'),
  ];
  return { receita: { meta: { nome }, PASSOS, contatos }, transmissao: t, partes };
}
