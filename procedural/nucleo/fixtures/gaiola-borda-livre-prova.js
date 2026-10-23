/* gaiola-borda-livre-prova.js — a metade de uma chapa curva com um vão aberto pelas colunas que terminam e começam
 *
 * A chapa é a metade x >= 0 de um painel de 800 × 750 mm de duas curvaturas (raio 2000 mm em x e 3000 mm em z), a normal para cima,
 * montado por `gaiolaPorEstacoes` com `simetria: 'x'`, 17 estações ao longo de z a cada 50 mm (e0 a e16) e 16 colunas em x a cada
 * 50 mm (c0, no plano de simetria, a c15). A abertura, uma janela de 500 × 300 mm centrada no plano de simetria (o vidro de trás
 * de uma carroceria), nasce das colunas c0 a c4: elas terminam na estação e6 (`termina`) e começam na estação e12 (`comeca`), e
 * entre as duas a chapa só tem as colunas c5 a c15. Nenhuma face sai, e por isso o vão 'vidro' é declarado com `livre: true`: a
 * borda dele é a borda livre que as colunas deixam, da estação e6 à e12 e da coluna c0 à c5. Nenhum número vem de referência
 * externa. */
import { gaiolaPorEstacoes } from '../gaiola-por-estacoes.js';

export const PASSO = 0.05;
export const altura = (x, z) => 0.3 - (x ** 2) / (2 * 2) - ((z - 0.4) ** 2) / (2 * 3);

/** montagem({ aneis, vincos, medidas, extra }): a gaiola por estações da metade da chapa com o vão 'vidro' e os anéis pedidos. */
export function montagem({ aneis = [], vincos = [], medidas = null, pesoDosAneis = 5, extra = {} } = {}) {
  const estacoes = [];
  for (let e = 0; e < 17; e++) {
    const z = PASSO * e; const colunas = [];
    for (let c = 0; c < 16; c++) {
      const x = PASSO * c;
      const ponto = { nome: `c${c}`, em: [x, altura(x, z)] };
      if (c <= 4 && e === 6) ponto.termina = true;
      if (c <= 4 && e === 12) ponto.comeca = true;
      if (c <= 4 && e > 6 && e < 12) continue;
      colunas.push(ponto);
    }
    estacoes.push({ nome: `e${e}`, em: z, colunas });
  }
  return gaiolaPorEstacoes({
    eixo: 'z', virar: true, simetria: 'x', estacoes,
    vaos: [{ nome: 'vidro', estacoes: ['e6', 'e12'], colunas: ['c0', 'c5'], livre: true }],
    ...(aneis.length ? { aneis } : {}), vincos,
    medidas: medidas ?? [...estacoes.map((s) => ({ estacao: s.nome })), ...aneis.map((a) => ({ anel: a.nome, peso: pesoDosAneis }))],
    ...extra,
  });
}

/** receita(opcoes): a receita { PARAMS, TOPO, PASSOS } da chapa, para as ferramentas que leem a receita. */
export function receita(opcoes = {}, niveis = 2) {
  const g = montagem(opcoes);
  return {
    PARAMS: {},
    TOPO: g.pontos,
    PASSOS: [
      ['subdivisao', { origemId: 1, ...g.passo, borda: 'cantos', niveis }],
      ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    ],
  };
}
