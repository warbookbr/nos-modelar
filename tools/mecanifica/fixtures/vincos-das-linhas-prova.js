/* vincos-das-linhas-prova.js — a forma desenhada por código e o pacote sintético de linhas 3D do teste de
 * `vincos-das-linhas.mjs`.
 *
 * A forma é uma meia chapa simétrica em x, de z 0 a 1200 mm. A seção tem um teto abaulado (y = 500 − 0,0005 x²) até a
 * quina, em x 300 mm, onde dobra 47 graus para a lateral, que desce em linha reta até o friso K (x 400, y 250), dobra 28
 * graus ali e desce até a borda de baixo (x 390, y 0). Depois de z 600 a seção inteira desce 0,5 mm por milímetro, o que
 * dobra o teto 26,6 graus ao longo da estação z600. Os vincos conhecidos são a quina, a dobra do teto em z600 (de x −300 a
 * 300 mm), o friso K e a borda de baixo.
 *
 * A gaiola, por `gaiolaPorEstacoes`, tem 13 estações a cada 100 mm e as colunas centro, teto, quina, meiaAlta,
 * flancoAlto, flancoBaixo, meiaBaixa e soleira, com todos os pontos medidos, e nenhum vinco declarado. A quina e a dobra
 * em z600 caem sobre uma coluna e uma estação; o friso K cai entre flancoAlto e flancoBaixo, a 0,4 do caminho de uma à
 * outra (as duas colunas ficam sobre as retas da lateral, a 40 e a 60 mm de K), e nenhuma coluna o acompanha.
 *
 * `linhasDeProva` escreve as linhas no formato de `ler-linhas --3d`, em milímetro, com ruído uniforme de até ±1 mm em
 * cada coordenada por um gerador congruencial de semente fixa: a quina só do lado x < 0, a dobra do teto atravessando a
 * costura, o friso K e a borda de baixo do lado x > 0. A quina leva `angulo_graus`, o ângulo da dobra. Nenhum dado vem de
 * referência externa. */
import { gaiolaPorEstacoes } from '../../../procedural/nucleo/gaiola-por-estacoes.js';

export const COMPRIMENTO = 1200;
export const PASSO_DAS_ESTACOES = 100;
export const DOBRA_DO_TETO_Z = 600;
export const QUEDA = 0.5;

const tetoY = (x) => 500 - 0.0005 * x * x;
export const Q = [300, tetoY(300)];
export const K = [400, 250];
export const B = [390, 0];
const sobre = (a, b, t) => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
const comp = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
/* flancoAlto 40 mm antes de K e flancoBaixo 60 mm depois, pelas retas da lateral: K fica a 0,4 do caminho de uma à
   outra; meiaAlta e meiaBaixa dividem ao meio o resto de cada reta, para o passo das colunas da lateral ficar perto de
   100 mm (com o passo desigual, a medida de todos os pontos levava a gaiola a 84 mm da forma e a quina não dobrava) */
export const FRACAO_DO_FRISO = 0.4;
const A = sobre(K, Q, 40 / comp(Q, K));
const Bc = sobre(K, B, 60 / comp(K, B));
export const COLUNAS = [
  { nome: 'centro', em: [0, tetoY(0)] },
  { nome: 'teto', em: [150, tetoY(150)] },
  { nome: 'quina', em: Q },
  { nome: 'meiaAlta', em: sobre(Q, A, 0.5) },
  { nome: 'flancoAlto', em: A },
  { nome: 'flancoBaixo', em: Bc },
  { nome: 'meiaBaixa', em: sobre(Bc, B, 0.5) },
  { nome: 'soleira', em: B },
];

/** queda(z) -> quanto a seção desce em z, em mm. */
export const queda = (z) => (z > DOBRA_DO_TETO_Z ? QUEDA * (z - DOBRA_DO_TETO_Z) : 0);
export const ESTACOES = Array.from({ length: COMPRIMENTO / PASSO_DAS_ESTACOES + 1 }, (_, k) => k * PASSO_DAS_ESTACOES);

/** gaiolaDeProva({ vincos }) -> a saída de `gaiolaPorEstacoes`; `vincos` vai à gaiola no formato do ajudante. */
export function gaiolaDeProva({ vincos = [] } = {}) {
  return gaiolaPorEstacoes({
    eixo: 'z',
    estacoes: ESTACOES.map((z) => ({ nome: `z${z}`, em: z / 1000, colunas: COLUNAS.map((c) => ({ nome: c.nome, em: [c.em[0] / 1000, (c.em[1] - queda(z)) / 1000] })) })),
    medidas: COLUNAS.map((c) => ({ coluna: c.nome })),
    vincos,
    simetria: 'x',
  });
}

/** receitaDeProva({ vincos, vincosNaGaiola }) -> { PARAMS, TOPO, PASSOS }; `vincos` entra no passo como veio da ferramenta
 *  ({ nome, pontos, nitidez }), e `vincosNaGaiola` entra no ajudante ({ nome, coluna ou estacao, de, ate, nitidez }). */
export function receitaDeProva({ vincos = [], vincosNaGaiola = [] } = {}) {
  const g = gaiolaDeProva({ vincos: vincosNaGaiola });
  return {
    PARAMS: {},
    TOPO: g.pontos,
    PASSOS: [
      ['subdivisao', { origemId: 1, ...g.passo, vincos: [...g.passo.vincos, ...vincos], borda: 'cantos', niveis: 2 }],
      ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    ],
  };
}

/* as quatro linhas conhecidas da forma, em mm, a cada 1 mm */
const faixa = (de, ate) => Array.from({ length: ate - de + 1 }, (_, k) => de + k);
export const LINHAS = {
  quina: faixa(0, COMPRIMENTO).map((z) => [-Q[0], Q[1] - queda(z), z]),
  dobraDoTeto: faixa(-Q[0], Q[0]).map((x) => [x, tetoY(x), DOBRA_DO_TETO_Z]),
  friso: faixa(0, COMPRIMENTO).map((z) => [K[0], K[1] - queda(z), z]),
  borda: faixa(0, COMPRIMENTO).map((z) => [B[0], B[1] - queda(z), z]),
};
export const ANGULO_DA_QUINA = 47;

/** linhasDeProva({ ruidoMm, semente }) -> o JSON de `ler-linhas --3d` com as quatro linhas e o ruído. */
export function linhasDeProva({ ruidoMm = 1, semente = 12345 } = {}) {
  let s = semente >>> 0;
  const acaso = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
  const comRuido = (P) => P.map((p) => p.map((x) => Math.round((x + (2 * acaso() - 1) * ruidoMm) * 100) / 100));
  const linha = (P, confianca, extra = {}) => {
    const pontos = comRuido(P); let c = 0; for (let k = 1; k < pontos.length; k++) c += Math.hypot(...pontos[k].map((x, i) => x - pontos[k - 1][i]));
    return { confianca, vistas: ['frente', 'lado', 'topo'], terceira_vista_confere: 1, comprimento_mm: Math.round(c * 10) / 10, pontos_mm: pontos, ...extra };
  };
  return {
    ferramenta: 'ler-linhas', unidade: 'mm',
    linhas_3d: {
      classe: 'feicao', tolerancia_mm: 3, simetria_x: true, ambiguas: 0,
      polilinhas_3d: [
        linha(LINHAS.quina, 'alta', { angulo_graus: ANGULO_DA_QUINA }),
        linha(LINHAS.dobraDoTeto, 'alta'),
        linha(LINHAS.friso, 'media'),
        linha(LINHAS.borda, 'alta'),
      ],
    },
  };
}

export default receitaDeProva();
