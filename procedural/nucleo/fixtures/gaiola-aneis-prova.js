/* gaiola-aneis-prova.js — a chapa curva com um vão de janela de cantos arredondados e um arco recortado na borda, desenhada por código
 *
 * A chapa é um painel de 1600 × 1600 mm de duas curvaturas (raio 2000 mm em x e 3000 mm em z), a normal para cima, montado
 * por `gaiolaPorEstacoes` em 17 estações ao longo de z e 17 colunas em x, a cada 100 mm. A altura é `altura(x, z)`, e todos
 * os pontos das estações são medidas exatas. O vão 'janela' tira as faces entre as estações 'e5' e 'e14' e as colunas 'c3' e
 * 'c13' (900 × 1000 mm), e o vão 'arco' tira as faces entre as estações 'e0' e 'e3' e as colunas 'c4' e 'c12' (300 × 800 mm),
 * que se abre na borda da chapa em e0 (o recorte de uma roda). O anel 'janela' recua a abertura 140 mm da borda do vão, com três
 * voltas a 10 mm uma da outra e cantos de 50 mm de raio; o anel 'arco' recua 130 mm, com duas voltas e cantos de 50 mm. A
 * moldura em relevo é o anel da janela com a volta 2 deslocada 10 mm pela normal e as voltas 1 e 3 vincadas vivas. Os pontos
 * dos anéis são medidas com peso (5; na moldura só a volta deslocada, com 50): exatas, elas dobram a malha de controle ajustada
 * junto dos cantos. Nenhum número vem de referência externa. */
import { gaiolaPorEstacoes } from '../gaiola-por-estacoes.js';

export const PASSO = 0.1;
export const N = 17;
export const altura = (x, z) => 0.3 - ((x - 0.8) ** 2) / (2 * 2) - ((z - 0.8) ** 2) / (2 * 3);
export const RECUO_DA_JANELA = 140;
export const RECUO_DO_ARCO = 130;
export const LARGURA = 10;
export const RAIO = 50;
export const RELEVO = 10;
export const PESO_DOS_ANEIS = 5;
export const PESO_DA_VOLTA_DESLOCADA = 50;

export const JANELA = { estacoes: [5, 14], colunas: [3, 13] };
export const ARCO = { estacoes: [0, 3], colunas: [4, 12] };
const dentro = (v, e, c) => e > v.estacoes[0] && e < v.estacoes[1] && c > v.colunas[0] && c < v.colunas[1];
const dentroDoArco = (e, c) => e < ARCO.estacoes[1] && c > ARCO.colunas[0] && c < ARCO.colunas[1];

/**
 * montagem({ relevo, janela, arco, aneis, medidasDosAneis, janelaDoAnel, arcoDoAnel, extra }): a gaiola por estações da chapa
 * com os dois vãos e os anéis. `relevo` desloca a volta 2 da janela e vinca as voltas 1 e 3; `aneis: false` tira os anéis
 * (a chapa só com os vãos); `medidasDosAneis` troca as medidas dos anéis; `janelaDoAnel` e `arcoDoAnel` trocam campos do
 * anel; `extra` troca campos da definição da gaiola.
 */
export function montagem({ relevo = false, janela = true, arco = true, aneis: comAneis = true, medidasDosAneis = null, janelaDoAnel = {}, arcoDoAnel = {}, extra = {} } = {}) {
  const estacoes = [];
  for (let e = 0; e < N; e++) {
    const z = PASSO * e; const colunas = [];
    for (let c = 0; c < N; c++) {
      if ((janela && dentro(JANELA, e, c)) || (arco && dentroDoArco(e, c))) continue;
      const x = PASSO * c;
      colunas.push({ nome: `c${c}`, em: [x, altura(x, z)] });
    }
    estacoes.push({ nome: `e${e}`, em: z, colunas });
  }
  const aneis = []; const vaos = []; const vincos = []; const medidas = estacoes.map((s) => ({ estacao: s.nome }));
  if (janela) vaos.push({ nome: 'janela', estacoes: ['e5', 'e14'], colunas: ['c3', 'c13'] });
  if (arco) vaos.push({ nome: 'arco', estacoes: ['e0', 'e3'], colunas: ['c4', 'c12'] });
  if (comAneis) {
    if (janela) {
      aneis.push({ nome: 'janela', vao: 'janela', recuo: RECUO_DA_JANELA, voltas: 3, largura: LARGURA, raio: RAIO, ...(relevo ? { relevo: [0, RELEVO, 0] } : {}), ...janelaDoAnel });
      if (relevo) {
        vincos.push({ nome: 'molduraDeDentro', anel: 'janela', volta: 1, nitidez: 'viva' }, { nome: 'molduraDeFora', anel: 'janela', volta: 3, nitidez: 'viva' });
        medidas.push({ anel: 'janela', volta: 2, peso: PESO_DA_VOLTA_DESLOCADA });
      } else medidas.push({ anel: 'janela', peso: PESO_DOS_ANEIS });
    }
    if (arco) {
      aneis.push({ nome: 'arco', vao: 'arco', recuo: RECUO_DO_ARCO, voltas: 2, largura: LARGURA, raio: RAIO, ...arcoDoAnel });
      medidas.push({ anel: 'arco', peso: PESO_DOS_ANEIS });
    }
  }
  const todas = medidasDosAneis ? [...estacoes.map((s) => ({ estacao: s.nome })), ...medidasDosAneis] : medidas;
  return gaiolaPorEstacoes({ eixo: 'z', virar: true, estacoes, vaos, ...(comAneis ? { aneis } : {}), vincos, medidas: todas, ...extra });
}

/** receita(opcoes): a receita { PARAMS, TOPO, PASSOS } da chapa, para as ferramentas que leem a receita. */
export function receita(opcoes = {}) {
  const g = montagem(opcoes);
  return {
    PARAMS: {},
    TOPO: g.pontos,
    PASSOS: [
      ['subdivisao', { origemId: 1, ...g.passo, borda: 'cantos', niveis: 2 }],
      ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    ],
  };
}

export default receita({ relevo: true });
