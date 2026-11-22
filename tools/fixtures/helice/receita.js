/* helice — a peça de teste neutra do caminho helicoidal: o fio redondo de uma mola de espiras encostadas nas pontas e o filete
 * triangular de uma rosca sobre um cilindro, os dois varridos pelo `friso` ao longo de `caminhoHelicoidal`. As medidas são de
 * prova, em milímetro, e nenhuma vem de referência externa. */
import { caminhoHelicoidal } from '../../../procedural/nucleo/caminho-helicoidal.js';

const m = (mm) => mm / 1000;

export const TABELA = {
  fio: { raio: 20, passo: 8, voltas: 6, pontas: { voltas: 1, passo: 3.2 }, diametro: 3, centro: [-40, 0, 0] },
  filete: { raio: 4.4, passo: 1.25, voltas: 12, altura: 0.68, centro: [40, 2, 0] },
  nucleo: { raio: 4.4, altura: 19 },
};

export function gerarPassos(T) {
  const fio = caminhoHelicoidal({ raio: T.fio.raio, passo: T.fio.passo, voltas: T.fio.voltas, pontas: T.fio.pontas, centro: T.fio.centro });
  const filete = caminhoHelicoidal({ raio: T.filete.raio, passo: T.filete.passo, voltas: T.filete.voltas, centro: T.filete.centro });
  /* o filete: triângulo de base de 80% do passo, com a base 0,1 mm dentro do núcleo para encostar nele */
  const meia = 0.4 * T.filete.passo;
  return [
    fio.friso({ origemId: 1, perfil: { circulo: { raio: T.fio.diametro / 2 } }, nome: 'fio' }),
    ['parte', { nome: 'fio', sel: { origem: { op: 'friso', id: 1 } } }],
    ['cilindro', { origemId: 2, raio: m(T.nucleo.raio), altura: m(T.nucleo.altura), lados: 48, em: [m(T.filete.centro[0]), 0, m(T.filete.centro[2])] }],
    ...[undefined, 'fundo', 'topo'].map((tampa) => ['parte', { nome: 'nucleo', sel: { origem: { op: 'cilindro', id: 2, ...(tampa ? { tampa } : {}) } } }]),
    filete.friso({ origemId: 3, perfil: [[-meia, -0.1], [meia, -0.1], [0, T.filete.altura]], nome: 'filete' }),
    ['parte', { nome: 'filete', sel: { origem: { op: 'friso', id: 3 } } }],
  ];
}

export default {
  meta: { nome: 'helice', desc: 'fio de mola e filete de rosca varridos ao longo do caminho helicoidal' },
  TABELA,
  PARAMS: TABELA,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};
