/* aba-prova.js — a chapa curva com um vão de janela nomeado e a aba que dobra a borda dele, desenhadas por código.
 *
 * A chapa é um painel de 800 × 800 mm de duas curvaturas (raio 600 mm em x e 900 mm em z), 2 mm de espessura, montado
 * por `gaiolaPorEstacoes` em 9 estações ao longo de z e 9 colunas em x, todos os pontos medidos e a normal para cima. O vão 'janela' tira as
 * faces entre as estações 'e3' e 'e5' e as colunas 'c3' e 'c5' (200 × 200 mm), com os quatro cantos vivos. A aba segue a
 * borda do vão pelo nome, `bordaDoVao('janela')`, com 20 mm de perna reta, 90 graus e raio de 2 mm na face de dentro.
 * Nenhum número vem de referência externa. */
import { gaiolaPorEstacoes } from '../gaiola-por-estacoes.js';

export const ESPESSURA = 0.002;
export const PASSO = 0.1;
export const N = 9;
export const ABA = { largura: 0.02, angulo: 90, raio: 0.002 };
export const altura = (x, z) => 0.3 - ((x - 0.4) ** 2) / (2 * 0.6) - ((z - 0.4) ** 2) / (2 * 0.9);

/** montagem(): a gaiola por estações da chapa com o vão, e os pontos nomeados dela. */
export function montagem() {
  const estacoes = [];
  for (let e = 0; e < N; e++) {
    const z = PASSO * e;
    const colunas = [];
    for (let c = 0; c < N; c++) {
      /* o ponto central do vão ficaria sem face, e a estação do meio do vão não o tem */
      if (e === 4 && c === 4) continue;
      const x = PASSO * c;
      colunas.push({ nome: `c${c}`, em: [x, altura(x, z)] });
    }
    estacoes.push({ nome: `e${e}`, em: z, colunas });
  }
  const cantos = ['e3', 'e5'].flatMap((estacao) => ['c3', 'c5'].map((coluna) => ({ estacao, coluna })));
  return gaiolaPorEstacoes({
    eixo: 'z',
    virar: true,
    estacoes,
    vaos: [{ nome: 'janela', estacoes: ['e3', 'e5'], colunas: ['c3', 'c5'] }],
    cantos,
    medidas: [...estacoes.map((s) => ({ estacao: s.nome }))],
  });
}

/** passos({ niveis, aba, extra }): a chapa, a aba e as duas partes. `extra` substitui campos do passo da aba. */
export function passos({ niveis = 2, aba = ABA, extra = {}, espessura = ESPESSURA } = {}) {
  const g = montagem();
  const chapa = { origemId: 1, ...g.passo, borda: 'cantos', niveis };
  if (espessura != null) chapa.espessura = espessura;
  return {
    pontos: g.pontos,
    gaiola: g,
    passos: [
      ['subdivisao', chapa],
      ['friso', { origemId: 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'abaDaJanela', pontos: g.bordaDoVao('janela') }, aba, ...extra }],
      ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
      ['parte', { nome: 'aba', sel: { origem: { op: 'friso', id: 2 } } }],
    ],
  };
}

export const CONTATOS = [{ par: ['chapa', 'aba'], motivo: 'a aba nasce na parede da borda do vão e continua a chapa dobrada; as malhas se cruzam por menos de 0,1 mm na costura' }];
