/* farol-contorno.esboco.mjs — três tratamentos do contorno do farol A do furgão (2026-11-05), numa chapa curva de prova, para a
 * pessoa escolher: o atual (cinco retos, todos os cantos vivos), o bico vivo com os outros cantos em concordância, e o bico vivo
 * com os cantos em concordância e a borda de baixo curva. O desenho é o do lado esquerdo do furgão (`farol_perfil` da TABELA),
 * em mm na vista frontal [x, y], levado à vista de cima da chapa de prova (`tools/fixtures/abertura-de-prova/chapa.js`) pela
 * translação que põe a ponta de dentro em x 120 e o topo em z 300. O pisca é o mesmo nas três: o desenho dele cortado pelo farol
 * recuado 6 mm, como na receita. Nada vem de referência externa. */
import { PLANO as _PLANO, TABELA, derivar, passoDaChapa } from '../../../../tools/fixtures/abertura-de-prova/chapa.js';
import { contornoPorTrechos } from '../../../../procedural/nucleo/curva2d.js';
import { cortarPorConvexo } from '../esboco-pelo-nucleo-2026-11-05/farol-na-chapa.esboco.mjs';

/* o desenho de hoje: o bico em [430, 960], o canto de baixo de dentro, os dois de fora (na quina) e o de cima de dentro */
const BICO = [430, 960]; const BAIXO_DENTRO = [600, 890]; const BAIXO_FORA = [980, 900]; const CIMA_FORA = [980, 1090]; const CIMA_DENTRO = [560, 1065];
const PISCA = [[860, 898], [980, 900], [980, 1090], [860, 1082]];
const RAIO = 28;
const MARGEM_DO_PISCA = 6;

const OPCOES = [
  { titulo: '1: como está', nota: 'Cinco retos e todos os cantos vivos.',
    trechos: [{ reto: BAIXO_DENTRO }, { reto: BAIXO_FORA }, { reto: CIMA_FORA }, { reto: CIMA_DENTRO }, { reto: BICO }] },
  { titulo: '2: cantos arredondados', nota: `O bico fica vivo; os outros quatro cantos em concordância de ${RAIO} mm.`,
    trechos: [{ reto: BAIXO_DENTRO }, { concordancia: RAIO }, { reto: BAIXO_FORA }, { concordancia: RAIO }, { reto: CIMA_FORA }, { concordancia: RAIO }, { reto: CIMA_DENTRO }, { concordancia: RAIO }, { reto: BICO }] },
  { titulo: '3: cantos arredondados e borda de baixo curva', nota: 'Como a 2, e a borda de baixo desce uns 15 mm no meio, numa curva que vira o canto de fora sem quina.',
    trechos: [{ reto: BAIXO_DENTRO }, { spline: [[790, 880], [952, 894]] }, { arcoTangente: [980, 922] }, { reto: CIMA_FORA }, { concordancia: RAIO }, { reto: CIMA_DENTRO }, { concordancia: RAIO }, { reto: BICO }] },
];

const mParaMm = (x) => x * 1000;
const contornoReto = (pts) => ({ inicio: pts[0], trechos: [...pts.slice(1), pts[0]].map((p) => ({ reto: p })) });

function opcaoNaChapa(opcao) {
  const d = derivar(TABELA);
  const farolFrontal = contornoPorTrechos({ inicio: BICO, trechos: opcao.trechos }, { segmentosArco: 12 });
  const x0 = Math.min(...farolFrontal.map((p) => p[0])); const y1 = Math.max(...farolFrontal.map((p) => p[1]));
  const levar = ([x, y]) => [x - x0 + 120, y1 - y + 300];
  const farol = farolFrontal.map(levar);
  const pisca = cortarPorConvexo(PISCA.map(levar), farol, MARGEM_DO_PISCA);
  const passos = [
    ['subdivisao', { origemId: 1, ...passoDaChapa(TABELA, d), espessura: TABELA.chapa.espessura }],
    ['aberturaPorContorno', { origemId: 3, chapa: { origem: { op: 'subdivisao', id: 1 } }, contorno: contornoReto(farol), vista: 'y', lente: true, recuoDaLente: 3 }],
    ['aberturaPorContorno', { origemId: 4, chapa: { origem: { op: 'aberturaPorContorno', id: 3, parte: 'lente' } }, contorno: contornoReto(pisca), vista: 'y', lente: true, recuoDaLente: 0 }],
    ['parte', { nome: 'chapa', sel: { origem: { op: 'aberturaPorContorno', id: 3 } } }],
    ['parte', { nome: 'farol', sel: { origem: { op: 'aberturaPorContorno', id: 4 } } }],
    ['parte', { nome: 'pisca', sel: { origem: { op: 'aberturaPorContorno', id: 4, parte: 'lente' } } }],
  ];
  return { titulo: opcao.titulo, nota: opcao.nota, passos, topo: Object.fromEntries(Object.entries(d.pontos).map(([k, p]) => [k, p.map(mParaMm)])) };
}

export const PLANO_DA_CHAPA = _PLANO;

export default { formato: 'esboco-nucleo@1', vista: 'superior', opcoes: OPCOES.map(opcaoNaChapa) };
