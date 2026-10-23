/* leitura-prova.js — a chapa curva lida com erro, desenhada por código
 *
 * A chapa é um painel de 1600 × 1600 mm de duas curvaturas (raio 2000 mm em x e 3000 mm em z), a normal para cima, montado por
 * `gaiolaPorEstacoes` em estações ao longo de z e 17 colunas em x, a cada 100 mm. A altura é `altura(x, z)`. Cada ponto traz o
 * erro de uma leitura plantado na altura, uniforme em ±`ruidoMm` (2 mm por padrão), de um gerador congruente de semente fixa, e
 * todos os pontos são medidas: com `leitura` ganham o peso da leitura, e com `leitura: false` são cotas exatas, o comportamento
 * antigo. `apertadas` põe estações-chave a 4 mm uma da outra em volta do meio da chapa, cada uma com a própria leitura. Nenhum
 * número vem de referência externa. */
import { gaiolaPorEstacoes } from '../../../procedural/nucleo/gaiola-por-estacoes.js';

export const PASSO = 0.1;
export const N = 17;
export const altura = (x, z) => 0.3 - ((x - 0.8) ** 2) / (2 * 2) - ((z - 0.8) ** 2) / (2 * 3);

/** estacoesEmZ(apertadas): as posições das estações em z, a cada 100 mm, com `apertadas` estações a 4 mm da estação do meio. */
export function estacoesEmZ(apertadas = 0) {
  const zs = Array.from({ length: N }, (_, e) => PASSO * e);
  const extra = Array.from({ length: apertadas }, (_, k) => 0.8 + 0.004 * (k + 1));
  return [...zs, ...extra].sort((a, b) => a - b);
}

/**
 * montagem({ ruidoMm, leitura, apertadas, extra }): a gaiola por estações da chapa. `leitura` é o campo da gaiola (true, objeto ou
 * false para a medida exata de antes); `extra` troca campos da definição.
 */
export function montagem({ ruidoMm = 2, leitura = true, apertadas = 0, ondeRuido = () => true, extra = {} } = {}) {
  let semente = 20260101;
  const sorteio = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
  const estacoes = estacoesEmZ(apertadas).map((z, e) => ({
    nome: `e${e}`,
    em: z,
    colunas: Array.from({ length: N }, (_, c) => {
      const x = PASSO * c;
      const r = (ruidoMm / 1000) * (2 * sorteio() - 1);
      return { nome: `c${c}`, em: [x, altura(x, z) + (ondeRuido(e, c) ? r : 0)] };
    }),
  }));
  return gaiolaPorEstacoes({
    eixo: 'z', virar: true, estacoes,
    medidas: estacoes.map((s) => ({ estacao: s.nome })),
    ...(leitura ? { leitura } : {}),
    ...extra,
  });
}

/**
 * receita(opcoes): a receita { PARAMS, TOPO, PASSOS } da chapa, para as ferramentas que leem a receita. TOPO e PASSOS montam a
 * gaiola quando lidos, como as receitas do acervo, para a ferramenta de ondulação captar a gaiola e os avisos dela.
 */
export function receita(opcoes = {}) {
  return {
    PARAMS: {},
    get TOPO() { return montagem(opcoes).pontos; },
    get PASSOS() {
      return [
        ['subdivisao', { origemId: 1, ...montagem(opcoes).passo, borda: 'cantos', niveis: 2 }],
        ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
      ];
    },
  };
}

export default receita({});
