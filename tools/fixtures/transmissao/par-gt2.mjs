/* par-gt2.mjs — o par GT2 de 20 e 80 dentes com a correia fechada, a prova da fatia 3 do plano de engrenagem, polia e
 * correia. As duas polias entram pelo `instanciaDeFamilia`, a segunda na distância entre centros que a correia de número
 * inteiro de dentes dá, e a correia pelos passos da família. `receitaDoPar(distancia)` devolve a receita e as medidas; `desvioDoGiro` gira a polia movida
 * para fora do encaixe, a sonda que prova que a medida de contatos acusa o dente da correia dentro da polia. */
import { instanciaDeFamilia } from '../../modelar/instancia-de-familia.mjs';
import { POLIA_E_CORREIA } from '../../../procedural/familias/polia-e-correia/index.js';
import { geometriaDaCorreia, passosDaCorreia, transmissaoDentada } from '../../../procedural/familias/polia-e-correia/correia.js';

const completos = (perfil, extra = {}) => ({
  ...Object.fromEntries(Object.entries(POLIA_E_CORREIA.contrato.parametros).map(([nome, d]) => [nome, d.padrao])),
  ...POLIA_E_CORREIA.contrato.perfis[perfil].parametros, ...extra,
});

export function receitaDoPar(distancia = 150, perfis = ['gt2-20', 'gt2-80'], { desvioDoGiro = 0, parametros2 = {} } = {}) {
  const transmissao = transmissaoDentada(completos(perfis[0]), completos(perfis[1], parametros2), distancia);
  const correia = geometriaDaCorreia(transmissao);
  const m = (mm) => mm / 1000;
  const motora = instanciaDeFamilia({ familia: 'polia-e-correia', perfil: perfis[0], nomes: 'motora', id: 'motora', portaPrefixo: 'motora', portas: true, pose: { posicao: [0, 0, 0], giro: { eixo: 'y', graus: correia.giro1 } } });
  const movida = instanciaDeFamilia({
    familia: 'polia-e-correia', perfil: perfis[1], parametros: parametros2, nomes: 'movida', id: 'movida', portaPrefixo: 'movida', portas: true, base: motora.origem,
    pose: { posicao: [m(transmissao.distanciaEntreCentros), m(correia.alturaDaSegunda), 0], giro: { eixo: 'y', graus: correia.giro2 + desvioDoGiro } },
  });
  const PASSOS = [...motora.passos, ...movida.passos, ...passosDaCorreia(correia, { origemId: movida.origem + 1 })];
  return { receita: { meta: { nome: 'par-gt2' }, PASSOS }, transmissao, correia };
}
