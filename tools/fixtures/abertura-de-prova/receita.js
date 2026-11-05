/* abertura-de-prova — a peça de teste neutra do plano da abertura de contorno livre: uma chapa curva de subdivisão com 2 mm
 * de espessura e um vão de contorno livre desenhado na vista superior, com um bico vivo, um trecho reto e um trecho curvo (a
 * chapa e o contorno estão em `chapa.js`). O vão sai pelo corte da chapa já subdividida (`passosDoCorteDepois` do protótipo):
 * o prisma do contorno projetado em y, tirado da chapa pelo `subtrair` do núcleo. É a técnica que o plano envolve primeiro; a
 * outra, o corte da gaiola antes da subdivisão, é `corte-na-gaiola.js`. A fatia 1 mediu as duas, e nenhuma passou no gate 1
 * de forma estável: a medida está em `docs/modelar/banco-de-provas/abertura-de-contorno-2026-11-05/README.md`. Nenhum dado vem
 * de referência externa. */
import { passosDoCorteDepois } from '../../../procedural/nucleo/operacoes/abertura-por-contorno.js';
import { PLANO, TABELA, derivar, m, parteEmVolta, passoDaChapa } from './chapa.js';

export { TABELA };

export function gerarPassos(T = TABELA) {
  const d = derivar(T);
  return [
    ['subdivisao', { origemId: 1, ...passoDaChapa(T, d) }],
    ...passosDoCorteDepois({ chapa: { origem: { op: 'subdivisao', id: 1 } }, contorno: d.trechos, vista: 'superior', alcance: [m(T.prisma.de), m(T.prisma.ate)], segmentosArco: T.contorno.segmentosArco, idPrisma: 2, idCorte: 3 }),
    ['parte', { nome: 'chapa', sel: { origem: { op: 'subtrair', id: 3 } } }],
    parteEmVolta(T),
  ];
}

export default {
  meta: { nome: 'abertura-de-prova', desc: 'chapa curva por subdivisão com um vão de contorno livre de bico, reta e curva, cortado depois da subdivisão' },
  TABELA,
  PARAMS: TABELA,
  get TOPO() { return { origem: 'canto da gaiola em x = 0 e z = 0, y para cima', ...derivar(this.PARAMS).pontos }; },
  get PASSOS() { return gerarPassos(this.PARAMS); },
  PLANO,
};
