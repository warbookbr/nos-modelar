/* vincos-das-linhas-chaves-prova.js — a forma desenhada por código e as linhas 3D sintéticas do teste de
 * `vincos-das-linhas.mjs` sobre uma gaiola com estações geradas e um vão.
 *
 * A forma é a meia chapa de `vincos-das-linhas-prova.js` (as mesmas oito colunas de seção, simétrica em x, de z 0 a 1200 mm),
 * mas com a seção descendo 0,1 mm por milímetro de z, o que deixa cada coluna reta em z e a interpolação exata. A gaiola
 * tem só cinco estações-chave, z0, z300, z600, z900 e z1200, e `interpolar` gera duas estações entre cada par (z0_1, z0_2,
 * z300_1, ...), que a receita não pode citar. Um vão, a abertura, tira as faces entre as colunas teto e quina de z300 a z600:
 * a chapa termina ali, na coluna teto (de z300 a z600, onde ela é borda), na estação z300 e na z600.
 *
 * `linhasDeProva` escreve as linhas no formato de `ler-linhas --3d`, em milímetro, com ruído uniforme de até ±0,5 mm em
 * cada coordenada: a coluna meiaAlta inteira (passa por seis estações geradas), a flancoBaixo de z 100 a z 1000 (começa e
 * acaba em estação gerada), uma dobra transversal do teto em z 700 (cai na estação gerada z600_1), a flancoAlto de z 400
 * a z 1000 com uma saliência de 4 mm em z 700 (o canto cai na estação gerada z600_1) e a coluna teto inteira (corre ao longo
 * da borda do vão de z300 a z600). Nenhum dado vem de referência externa. */
import { gaiolaPorEstacoes } from '../../../procedural/nucleo/gaiola-por-estacoes.js';
import { COLUNAS, COMPRIMENTO } from './vincos-das-linhas-prova.js';

export { COLUNAS, COMPRIMENTO };
export const CHAVES = [0, 300, 600, 900, 1200];
export const PASSO_DAS_GERADAS = 100;
export const QUEDA = 0.1;
/** As estações geradas pela interpolação, na ordem do eixo, com a chave que as precede e a fração entre as duas chaves. */
export const GERADAS = CHAVES.slice(0, -1).flatMap((z) => [1, 2].map((k) => ({ nome: `z${z}_${k}`, z: z + k * PASSO_DAS_GERADAS, antes: `z${z}`, depois: `z${z + 300}`, fracao: (k * PASSO_DAS_GERADAS) / 300 })));

export const queda = (z) => QUEDA * z;
const tetoY = (x) => 500 - 0.0005 * x * x;
const coluna = (nome) => COLUNAS.find((c) => c.nome === nome).em;

/** gaiolaComChaves({ vincos }) -> a saída de `gaiolaPorEstacoes`; `vincos` vai à gaiola no formato do ajudante. */
export function gaiolaComChaves({ vincos = [], cantos = [], vao = true } = {}) {
  return gaiolaPorEstacoes({
    eixo: 'z',
    estacoes: CHAVES.map((z) => ({ nome: `z${z}`, em: z / 1000, colunas: COLUNAS.map((c) => ({ nome: c.nome, em: [c.em[0] / 1000, (c.em[1] - queda(z)) / 1000] })) })),
    interpolar: { passo: PASSO_DAS_GERADAS / 1000 },
    medidas: COLUNAS.map((c) => ({ coluna: c.nome, chaves: true })),
    ...(vao ? { vaos: [{ nome: 'abertura', estacoes: ['z300', 'z600'], colunas: ['teto', 'quina'] }] } : {}),
    vincos, ...(cantos.length ? { cantos } : {}),
    simetria: 'x',
  });
}

/** receitaComChaves({ vincos, vincosNaGaiola, cantosNaGaiola }) -> { PARAMS, TOPO, PASSOS }; `vincosNaGaiola` e `cantosNaGaiola`
 *  entram no ajudante, na forma que a ferramenta devolve (coluna ou estacao, de, ate, nitidez). */
export function receitaComChaves({ vincosNaGaiola = [], cantosNaGaiola = [], vao = true } = {}) {
  const g = gaiolaComChaves({ vincos: vincosNaGaiola, cantos: cantosNaGaiola, vao });
  return {
    PARAMS: {},
    TOPO: g.pontos,
    PASSOS: [
      ['subdivisao', { origemId: 1, ...g.passo, borda: 'cantos', niveis: 2 }],
      ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    ],
  };
}

const faixa = (de, ate) => Array.from({ length: ate - de + 1 }, (_, k) => de + k);
/** A saliência de BUMP mm em z 700, em V de meia largura 30 mm. */
const BUMP = 4;
const saliencia = (z) => Math.max(0, BUMP * (1 - Math.abs(z - 700) / 30));
export const LINHAS = {
  meiaAlta: faixa(0, COMPRIMENTO).map((z) => [coluna('meiaAlta')[0], coluna('meiaAlta')[1] - queda(z), z]),
  flancoBaixo: faixa(100, 1000).map((z) => [coluna('flancoBaixo')[0], coluna('flancoBaixo')[1] - queda(z), z]),
  dobraEm700: faixa(-300, 300).map((x) => [x, tetoY(x) - queda(700), 700]),
  flancoAlto: faixa(400, 1000).map((z) => [coluna('flancoAlto')[0], coluna('flancoAlto')[1] - queda(z) + saliencia(z), z]),
  teto: faixa(0, COMPRIMENTO).map((z) => [coluna('teto')[0], coluna('teto')[1] - queda(z), z]),
};

/** linhasDeProva({ ruidoMm, semente }) -> o JSON de `ler-linhas --3d` com as linhas e o ruído. */
export function linhasDeProva({ ruidoMm = 0.5, semente = 4321 } = {}) {
  let s = semente >>> 0;
  const acaso = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
  const comRuido = (P) => P.map((p) => p.map((x) => Math.round((x + (2 * acaso() - 1) * ruidoMm) * 100) / 100));
  const linha = (P) => {
    const pontos = comRuido(P); let c = 0; for (let k = 1; k < pontos.length; k++) c += Math.hypot(...pontos[k].map((x, i) => x - pontos[k - 1][i]));
    return { confianca: 'alta', vistas: ['frente', 'lado', 'topo'], terceira_vista_confere: 1, comprimento_mm: Math.round(c * 10) / 10, pontos_mm: pontos };
  };
  return {
    ferramenta: 'ler-linhas', unidade: 'mm',
    linhas_3d: { classe: 'feicao', tolerancia_mm: 3, simetria_x: true, ambiguas: 0, polilinhas_3d: Object.values(LINHAS).map(linha) },
  };
}
export const NOMES_DAS_LINHAS = Object.keys(LINHAS);

export default receitaComChaves();
