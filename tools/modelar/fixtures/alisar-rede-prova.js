/* alisar-rede-prova.js — a chapa lateral por rede de curvas, com os pontos-chave na TABELA, para o teste do alisamento sobre a rede.
 *
 * É a chapa de `procedural/nucleo/fixtures/gaiola-por-rede-prova.js` (19 curvas, 10 retalhos, a janela em gota, o arco de roda e a coluna
 * inclinada), com a rede lida de imagem (`leitura: true`) e cada ponto-chave escrito na TABELA, em milímetro: `<curva>_<k>` para a
 * coordenada [x, y, z] do k-ésimo ponto-chave de uma curva e `no_<nome>` para a de um nó dado por coordenada. `ruido` planta nos pontos-chave
 * indicados em `ONDE` um deslocamento de até ± ruido milímetro ao longo de y (a normal da chapa), o erro de leitura de cada ponto, de modo que
 * a superfície ondula ao longo da curva e a leitura de ondulação acusa calombos. `dobra` tira o vinco declarado da cintura e da coluna, que a
 * forma desenhada dobra de verdade, para a forma que o alisamento não pode tirar dentro do erro de leitura. Nenhum número vem de referência
 * externa. */
import { gaiolaPorRede } from '../../../procedural/nucleo/gaiola-por-rede.js';
import { altura, definicao as definicaoDaChapa } from '../../../procedural/nucleo/fixtures/gaiola-por-rede-prova.js';

/* os pontos-chave com erro de leitura plantado, e o fator (de −1 a 1) do deslocamento de cada um: três grupos de três pontos vizinhos com sinais alternados, que dão um calombo cada, nas ligações da janela e da roda que não são borda nem vinco */
export const ONDE = {
  ligR_1: 1, ligR_2: -1, ligR_3: 1,
  ligU2_1: -1, ligU2_2: 1, ligU2_3: -1,
  ligL2_1: 1, ligL2_2: -1, ligL2_3: 1,
};

/* as ligações que a chapa original escreve com um ponto-chave só no meio ganham pontos-chave a cada quarto ou quinto do caminho, para que o
   erro de leitura plantado dê ondas de uns 90 mm de comprimento, que a malha de 40 mm enxerga */
const DENSAS = { ligR: [0.2, 0.4, 0.6, 0.8], ligU2: [0.25, 0.5, 0.75], ligL2: [0.25, 0.5, 0.75] };
const sobreAChapa = ([x, , z]) => [x, altura(x, z), z];
function densificada(c, nos) {
  const fr = DENSAS[c.nome];
  if (!fr) return c;
  const [a, b] = [nos[c.pontos[0]], nos[c.pontos[c.pontos.length - 1]]];
  return { ...c, pontos: [c.pontos[0], ...fr.map((t) => sobreAChapa([a[0] + (b[0] - a[0]) * t, 0, a[2] + (b[2] - a[2]) * t])), c.pontos[c.pontos.length - 1]] };
}

const ORIGINAL = definicaoDaChapa({ passo: 40 });
const BASE = { ...ORIGINAL, curvas: ORIGINAL.curvas.map((c) => densificada(c, ORIGINAL.nos)) };
const chaveDe = (curva, k) => `${curva}_${k}`;

/** tabelaDeProva({ ruido }) -> a TABELA: `<curva>_<k>: [x, y, z]` e `no_<nome>: [x, y, z]`, em milímetro. */
export function tabelaDeProva({ ruido = 0 } = {}) {
  const T = {};
  for (const c of BASE.curvas) c.pontos.forEach((p, k) => { if (typeof p !== 'string') T[chaveDe(c.nome, k)] = p.map((x) => Math.round(x * 100) / 100); });
  for (const [nome, p] of Object.entries(BASE.nos)) if (Array.isArray(p)) T[`no_${nome}`] = p.map((x) => Math.round(x * 100) / 100);
  for (const [chave, fator] of Object.entries(ONDE)) T[chave][1] = Math.round((T[chave][1] + ruido * fator) * 100) / 100;
  return T;
}

/** definicaoDaRede(T, opcoes) -> a definição da rede, escrita dos pontos-chave da TABELA. `vincos` troca a nitidez do vinco de curvas ({ cintura: 0.8 }). */
export function definicaoDaRede(T, { dobra = false, passo = 40, leitura = false, vincos = {} } = {}) {
  const curvas = BASE.curvas.map((c) => {
    const nova = { ...c, pontos: c.pontos.map((p, k) => (typeof p === 'string' ? p : T[chaveDe(c.nome, k)])) };
    if (dobra && (c.nome === 'cintura' || c.nome === 'colunaB')) delete nova.vinco;
    if (vincos[c.nome] !== undefined) nova.vinco = vincos[c.nome];
    return nova;
  });
  const nos = Object.fromEntries(Object.entries(BASE.nos).map(([nome, p]) => [nome, Array.isArray(p) ? T[`no_${nome}`] : p]));
  return { ...BASE, passo, curvas, nos, ...(leitura ? { leitura: true } : {}) };
}

/** derivar(T, opcoes) -> a gaiola da rede, escrita dos pontos-chave da TABELA. */
export function derivar(T, opcoes = {}) {
  return gaiolaPorRede(definicaoDaRede(T, opcoes));
}

/** receitaSobre(TABELA, opcoes) -> a receita que lê a TABELA a cada acesso, para a ferramenta editá-la no lugar. */
export function receitaSobre(TABELA, opcoes = {}) {
  return {
    meta: { nome: 'alisar-rede-prova', desc: 'chapa lateral por rede de curvas, com os pontos-chave na TABELA e erro de leitura plantado' },
    get PARAMS() { return { ...TABELA }; },
    get TOPO() { return { origem: 'x ao longo, z para cima, y para fora', ...derivar(this.PARAMS, opcoes).pontos }; },
    get PASSOS() {
      const { passo } = derivar(this.PARAMS, opcoes);
      return [['subdivisao', { origemId: 1, ...passo, niveis: 2 }], ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }]];
    },
    get vaos() {
      return [{ nome: 'janela', borda: derivar(this.PARAMS, opcoes).linha('janela'), semMoldura: { motivo: 'a chapa de prova testa o alisamento da rede, e a janela fica nua' } }];
    },
  };
}

/** receitaDeProva({ ruido, dobra, vincos }) -> { TABELA, receita }. */
export function receitaDeProva({ ruido = 0, ...opcoes } = {}) {
  const TABELA = tabelaDeProva({ ruido });
  return { TABELA, receita: receitaSobre(TABELA, opcoes) };
}

/* O módulo como receita para a linha de comando: a chapa com o erro de leitura de 1,5 mm plantado. */
export const TABELA = tabelaDeProva({ ruido: 1.5 });
export default receitaSobre(TABELA);
