/* lataria-de-prova — a peça de ensaio da obrigação das vistas de superfície: uma chapa de superfície livre por subdivisão, com uma
 * nervura como peça de borda à parte. É a chapa curva com vão de `procedural/nucleo/fixtures/friso-prova.js` (800 por 800 mm, 2 mm de
 * espessura) com só a nervura, desenhada por código; a peça é de lataria pelo passo `subdivisao`, e a parte de lataria é a `chapa`,
 * a única com face nascida dele. Os testes de `vistas-de-superficie.test.mjs` a usam. */
import { CONTATOS, NERVURA, VAOS, gaiola, linhaDaNervura, pontos } from '../../../procedural/nucleo/fixtures/friso-prova.js';

export default {
  meta: { nome: 'lataria-de-prova', desc: 'chapa curva por subdivisão com um vão e uma nervura, para provar as vistas de superfície' },
  PARAMS: {},
  TOPO: { origem: 'canto da gaiola em x = 0 e z = 0, y para cima', ...pontos() },
  PASSOS: [
    ['subdivisao', { origemId: 1, ...gaiola(), niveis: 2 }],
    ['friso', { origemId: 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'nervura', pontos: linhaDaNervura() }, perfil: { retangulo: { largura: NERVURA.largura, profundidade: NERVURA.profundidade, centro: [0, NERVURA.centro] } }, ponta: 'aberta' }],
    ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    ['parte', { nome: 'nervura', sel: { origem: { op: 'friso', id: 2 } } }],
  ],
  contatos: CONTATOS.filter(({ par }) => par.includes('nervura')),
  vaos: VAOS,
  PLANO: {
    objeto: 'chapa curva de 800 por 800 mm com um vão no meio e uma nervura ao longo de uma linha',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'largura da chapa em x', milimetros: 800 },
    partes: [
      { nome: 'chapa', forma: 'chapa de 2 mm de duas curvaturas com um vão quadrado de 200 mm no meio', tecnica: 'subdivisao com medidas e espessura' },
      { nome: 'nervura', forma: 'nervura retangular de 8 por 5 mm ao longo de uma linha da chapa', tecnica: 'friso sobre a superfície' },
    ],
    criteriosDeReprovacao: ['a chapa tem amassado, ondulação ou dobra que a forma não pede'],
  },
};
