/* par-por-atrito.mjs — duas polias em V ou duas lisas com a correia fechada, a prova da fatia 3 para as correias sem
 * dentes. `receitaDoParPorAtrito(perfis, distancia, parametros)` devolve a receita e a transmissão. */
import { instanciaDeFamilia } from '../../modelar/instancia-de-familia.mjs';
import { POLIA_E_CORREIA } from '../../../procedural/familias/polia-e-correia/index.js';
import { passosDaCorreiaPorAtrito, transmissaoPorAtrito } from '../../../procedural/familias/polia-e-correia/correia.js';

const completos = (perfil, extra) => ({
  ...Object.fromEntries(Object.entries(POLIA_E_CORREIA.contrato.parametros).map(([nome, d]) => [nome, d.padrao])),
  ...POLIA_E_CORREIA.contrato.perfis[perfil].parametros, ...extra,
});

export function receitaDoParPorAtrito(perfis, distancia, [extra1 = {}, extra2 = {}] = [], { deslocarCorreia = 0 } = {}) {
  const p1 = completos(perfis[0], extra1);
  const p2 = completos(perfis[1], extra2);
  const transmissao = transmissaoPorAtrito(p1, p2, distancia);
  const m = (mm) => mm / 1000;
  const motora = instanciaDeFamilia({ familia: 'polia-e-correia', perfil: perfis[0], parametros: extra1, nomes: 'motora', id: 'motora', portaPrefixo: 'motora', portas: true });
  const correia = passosDaCorreiaPorAtrito(transmissao, { origemId: 0 });
  const movida = instanciaDeFamilia({
    familia: 'polia-e-correia', perfil: perfis[1], parametros: extra2, nomes: 'movida', id: 'movida', portaPrefixo: 'movida', portas: true, base: motora.origem,
    pose: { posicao: [m(distancia), m(correia.alturaDaSegunda + deslocarCorreia), 0] },
  });
  const { passos } = passosDaCorreiaPorAtrito(transmissao, { origemId: movida.origem + 1 });
  return { receita: { meta: { nome: 'par-por-atrito' }, PASSOS: [...motora.passos, ...movida.passos, ...passos] }, transmissao, secao: correia.secao };
}
