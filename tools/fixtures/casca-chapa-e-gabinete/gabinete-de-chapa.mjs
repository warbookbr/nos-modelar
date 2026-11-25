/* gabinete-de-chapa.mjs — o gabinete de chapa da fatia 3 do plano de casca, chapa e gabinete, com os cantos abertos do
 * alívio, como sai da dobradeira (sem a solda dos cantos): a base é a caixa de chapa com as abas para cima, e a tampa é a caixa de chapa com as abas para baixo, maior que a base pela espessura e pelo raio
 * das dobras, de modo que as abas da tampa descem por fora das da base e encostam nelas; as abas da base param onde a dobra
 * da tampa começa. */
import { passosDaCaixaDeChapa } from '../../../procedural/extensoes/chapa-dobrada/caixa.js';

export function receitaDoGabineteDeChapa({ largura = 200, profundidade = 120, altura = 80, espessura = 1.5, raioInterno = 2, alturaDaTampa = 25, nome = 'gabinete-de-chapa' } = {}) {
  const t = espessura; const r = raioInterno;
  /* a base: abas para cima até onde a dobra da tampa começa (a face de baixo da tampa fica em altura − t/2, e a dobra dela
     ocupa mais r para baixo), para o canto de cima da aba não entrar no raio da dobra da tampa */
  const base = passosDaCaixaDeChapa({ largura, profundidade, espessura: t, raioInterno: r, alturaDaAba: altura - 2 * r - t }, { origemId: 1, parte: 'base' });
  /* a tampa: a face de fora da aba da base fica a W/2 + r + t do centro, e a de dentro da aba da tampa a L/2 + r; as duas
     coincidem com L = W + 2t */
  const tampa = passosDaCaixaDeChapa({ largura: largura + 2 * t, profundidade: profundidade + 2 * t, espessura: t, raioInterno: r, alturaDaAba: alturaDaTampa, sentido: -1 }, { origemId: base.ultimoId + 1, parte: 'tampa' });
  const PASSOS = [...base.passos, ...tampa.passos];
  PASSOS.push(['transladar', { d: [0, altura / 1000, 0], sel: { origem: tampa.origem } }]);
  return { receita: { meta: { nome }, PASSOS, contatos: [{ par: ['base', 'tampa'], motivo: 'as abas da tampa descem por fora das abas da base e encostam nelas' }] }, base: base.geometria, tampa: tampa.geometria };
}
