/* caminho-a-gaiola-da-casca.esboco.mjs: o caminho A do primeiro ciclo de alta definição do sedã. A casca facetada vira gaiola de
 * subdivisão: as estações são os vértices da planta do rascunho (mais as que a graduação do passo pede), as colunas são as arestas da
 * seção (o fundo, o alargado, o ombro, a cintura, o vão do capô, o meio do carro) mais uma coluna de meio em cada painel para a flecha,
 * e o raio das arestas de caráter sai da nitidez do vinco na coluna da cintura e na do ombro. A gaiola é escrita à mão como grade de
 * quadriláteros por nome, sem ajudante, e não tem medidas: a superfície aproxima os pontos. Os arcos de roda são abertos pelo corte.
 *
 * `HD_NC` e `HD_NO` trocam a nitidez da cintura e do ombro para a calibragem do raio; `HD_NIVEIS` troca os níveis. */
import { T, yFundo, yTopo, noLado, naCintura, noTopo, esbocoDoCaminho } from './alvo.mjs';

const NITIDEZ_DA_CINTURA = Number(process.env.HD_NC ?? 0.15);
const NITIDEZ_DO_OMBRO = Number(process.env.HD_NO ?? 0.15);
const NIVEIS = Number(process.env.HD_NIVEIS ?? 3);
/* colunas de apoio a `d` mm de cada lado da quina (0 para não ter): a face junto do vinco passa a ter `d` mm, e a nitidez age sobre ela */
const APOIO_DA_CINTURA = Number(process.env.HD_APOIO_C ?? 18);
const APOIO_DO_OMBRO = Number(process.env.HD_APOIO_O ?? 2.75);

/* as estações: os vértices da planta dentro do trecho, o corte da frente e o de trás, o pé do capô, e as de preenchimento */
const ESTACOES = [1990, 1700, 1421, 1146, 871, T.zPeDoCapo, 560, 300, 0, -280, -560, -700, -800, -1018, -1237, -1443, -1650, -1825, -2000];
const I_CAPO = ESTACOES.indexOf(T.zPeDoCapo);
const DO_LADO = ['fundo', 'baixo', 'alargado', 'meioDoOmbro', ...(APOIO_DO_OMBRO ? ['ombroAbaixo'] : []), 'ombro', ...(APOIO_DO_OMBRO ? ['ombroAcima'] : []),
  ...(APOIO_DA_CINTURA ? ['cinturaAbaixo'] : []), 'cintura'];
const DO_TOPO = [...(APOIO_DA_CINTURA ? ['cinturaAcima'] : []), 'vaoDoCapo', 'meioDoCapo', 'centro'];
const yDaColuna = { baixo: () => 560, alargado: () => T.yAlargado, meioDoOmbro: () => 795, ombro: () => T.yOmbro,
  ombroAbaixo: () => T.yOmbro - APOIO_DO_OMBRO, ombroAcima: () => T.yOmbro + APOIO_DO_OMBRO, cinturaAbaixo: (z) => yTopo(z) - APOIO_DA_CINTURA };
const xDaColuna = { cinturaAcima: (z) => naCintura(z)[0] - APOIO_DA_CINTURA, vaoDoCapo: () => T.xCapo, meioDoCapo: () => T.xCapo / 2, centro: () => 0 };

const nome = (i, coluna) => `e${i}_${coluna}`;
const pontos = {}; const faces = [];
ESTACOES.forEach((z, i) => {
  for (const c of DO_LADO) pontos[nome(i, c)] = c === 'fundo' ? noLado(z, yFundo(z)) : c === 'cintura' ? naCintura(z) : noLado(z, yDaColuna[c](z));
  if (i <= I_CAPO) for (const c of DO_TOPO) pontos[nome(i, c)] = noTopo(xDaColuna[c](z), z);
});
for (let i = 0; i + 1 < ESTACOES.length; i++) {
  const colunas = i < I_CAPO ? [...DO_LADO, ...DO_TOPO] : DO_LADO;
  for (let j = 0; j + 1 < colunas.length; j++) faces.push([nome(i, colunas[j]), nome(i + 1, colunas[j]), nome(i + 1, colunas[j + 1]), nome(i, colunas[j + 1])]);
}
const coluna = (c, de = 0, ate = ESTACOES.length - 1) => Array.from({ length: ate - de + 1 }, (_, k) => nome(de + k, c));
const ultima = ESTACOES.length - 1;

const { esboco, medidas, avisos } = esbocoDoCaminho({
  titulo: 'caminho A: gaiola tirada da casca facetada',
  nota: 'grade de estações da planta por colunas da seção, com colunas de apoio junto das quinas e vinco por aresta',
  pontos,
  passo: {
    vertices: Object.keys(pontos),
    faces,
    vincos: [
      /* a cintura só é quina onde há topo: da frente ao pé do capô; dali para trás ela é borda livre */
      ...(NITIDEZ_DA_CINTURA > 0 ? [{ nome: 'cintura', pontos: coluna('cintura', 0, I_CAPO), nitidez: NITIDEZ_DA_CINTURA }] : []),
      ...(NITIDEZ_DO_OMBRO > 0 ? [{ nome: 'ombro', pontos: coluna('ombro'), nitidez: NITIDEZ_DO_OMBRO }] : []),
    ],
    cantos: [nome(0, 'fundo'), nome(0, 'centro'), nome(I_CAPO, 'centro'), nome(I_CAPO, 'cintura'), nome(ultima, 'cintura'), nome(ultima, 'fundo')],
  },
  niveis: NIVEIS,
  arcos: true,
});
export const MEDIDAS_DO_CORTE = medidas;
export const AVISOS = { gaiola: [], corte: avisos };
export default esboco;
