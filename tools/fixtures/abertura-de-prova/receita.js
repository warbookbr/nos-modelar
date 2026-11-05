/* abertura-de-prova — a peça de teste neutra do plano da abertura de contorno livre: uma chapa curva de subdivisão com 2 mm
 * de espessura e um vão de contorno livre desenhado na vista superior, com um bico vivo, um trecho reto e um trecho curvo (a
 * chapa e o contorno estão em `chapa.js`). O vão sai pela operação `aberturaPorContorno` do núcleo: o corte da chapa já
 * subdividida pelo prisma do contorno projetado em y, com a limpeza da costura, e o pedaço retirado como lente. A aba dobra a
 * borda de fora do vão pelo `friso`. As medidas estão em `docs/modelar/banco-de-provas/abertura-de-contorno-2026-11-05/README.md`.
 * Nenhum dado vem de referência externa. */
import { PLANO, TABELA, derivar, m, parteEmVolta, passoDaChapa } from './chapa.js';

export { TABELA };

/** Os passos; `T.aba` nulo tira a aba, e `T.lente.elevar` sobe a lente acima da chapa para a imagem. */
export function gerarPassos(T = TABELA) {
  const d = derivar(T);
  const passos = [
    ['subdivisao', { origemId: 1, ...passoDaChapa(T, d) }],
    ['aberturaPorContorno', { origemId: 3, chapa: { origem: { op: 'subdivisao', id: 1 } }, contorno: d.trechos, vista: 'y', segmentosArco: T.contorno.segmentosArco, lente: true }],
    ['parte', { nome: 'chapa', sel: { origem: { op: 'aberturaPorContorno', id: 3 } } }],
    parteEmVolta(T),
    ['parte', { nome: 'lente', sel: { origem: { op: 'aberturaPorContorno', id: 3, parte: 'lente' } }, substituir: true }],
  ];
  if (T.lente?.elevar) passos.push(['transladar', { sel: { grupo: 'lente' }, d: [0, m(T.lente.elevar), 0] }]);
  if (T.aba) {
    passos.push(
      ['friso', { origemId: 4, superficie: { op: 'aberturaPorContorno', id: 3 }, linha: { nome: 'abaDoVao' }, aba: { largura: m(T.aba.largura), angulo: T.aba.angulo, raio: m(T.aba.raio) } }],
      ['parte', { nome: 'aba', sel: { origem: { op: 'friso', id: 4 } } }],
    );
  }
  return passos;
}

export default {
  meta: { nome: 'abertura-de-prova', desc: 'chapa curva por subdivisão com um vão de contorno livre de bico, reta e curva, a aba na borda e o pedaço retirado como lente' },
  TABELA,
  PARAMS: TABELA,
  get TOPO() { return { origem: 'canto da gaiola em x = 0 e z = 0, y para cima', ...derivar(this.PARAMS).pontos }; },
  get PASSOS() { return gerarPassos(this.PARAMS); },
  PLANO,
};
