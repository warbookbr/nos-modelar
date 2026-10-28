/* alisar-prova.js — a chapa desenhada por código para o teste da ferramenta de alisamento.
 *
 * Uma meia chapa de 2,4 m ao longo de z, de x >= 0 e espelhada, com a seção em arco abatido: a seção em z vai da borda de baixo
 * (t = 0, x = W(z), y = BASE) à costura (t = 1, x = 0, y = BASE + H(z)) com x = W (1 − t) e y = BASE + H (1 − (1 − t)²), de modo que a
 * costura é plana e a curvatura da seção fica perto de 1/1,5 m. As sete estações-chave, a cada 0,4 m, dão a seção como curva de nove
 * pontos-chave, as colunas saem dela a frações iguais do comprimento, e `interpolar` gera as estações intermediárias a cada 0,1 m,
 * como na receita de uma carroceria lida de cortes. Todo número da forma mora na TABELA, em milímetro: um ponto [x, y] por
 * estação-chave e ponto-chave, que a ferramenta edita.
 *
 * `ruido` planta nos pontos-chave um deslocamento determinístico de até ± ruido milímetro ao longo da normal da seção, o
 * erro de leitura de cada corte, de modo que as estações-chave não combinam entre si e a superfície ondula em várias
 * estações. `dobra` acrescenta à forma uma quina real de `dobra` graus ao longo de x, em z = 1,2 m (a chapa passa a subir com essa
 * inclinação dali em diante), sem vinco declarado, para a forma que o alisamento não pode tirar dentro do erro de leitura.
 * Nenhum número vem de referência externa. */
import { gaiolaPorEstacoes } from '../../../procedural/nucleo/gaiola-por-estacoes.js';

export const CHAVES = [['e0', 0], ['e1', 400], ['e2', 800], ['e3', 1200], ['e4', 1600], ['e5', 2000], ['e6', 2400]];
export const PONTOS_CHAVE = 9;
export const COLUNAS = 7;
const BASE = 100;

const largura = (z) => 620 + 60 * Math.sin((Math.PI * z) / 4800);
const altura = (z) => 120 + 20 * (1 - ((z - 1200) / 1200) ** 2);

/** secao(z, t) -> [x, y] em milímetro da seção analítica na estação z, com t de 0 (borda de baixo) a 1 (costura). */
export function secao(z, t) {
  return [largura(z) * (1 - t), BASE + altura(z) * (1 - (1 - t) ** 2)];
}

/* O erro de leitura de cada ponto-chave: um número determinístico em [−1, 1], sem acaso. */
const nota = (e, k) => ((e * 7 + k * 13 + e * k * 5 + 3) % 7) / 3 - 1;

const m = (mm) => mm / 1000;
const chaveDe = (e, k) => `c${e}_${k}`;

/** tabelaDeProva({ ruido, dobra, peso }) -> a TABELA: `c<estação>_<ponto-chave>: [x, y]` em milímetro, o passo da interpolação e o
 *  peso das medidas (um peso alto faz a superfície seguir o erro de cada leitura). */
export function tabelaDeProva({ ruido = 0, dobra = 0, peso = 8 } = {}) {
  const T = { passo_estacao: 100, peso_cota: peso };
  CHAVES.forEach(([, z], e) => {
    for (let k = 0; k < PONTOS_CHAVE; k++) {
      const t = k / (PONTOS_CHAVE - 1);
      const p = secao(z, t);
      /* a normal da seção no ponto, para fora da chapa; o ruído anda ao longo dela */
      const q = secao(z, Math.min(1, t + 1e-4)); const r = secao(z, Math.max(0, t - 1e-4));
      const tx = q[0] - r[0], ty = q[1] - r[1]; const l = Math.hypot(tx, ty);
      const n = [-ty / l, tx / l];
      const sinal = n[1] >= 0 ? 1 : -1;
      const d = ruido * nota(e, k) * sinal;
      const subida = Math.max(0, z - 1200) * Math.tan((dobra * Math.PI) / 180);
      T[chaveDe(e, k)] = [Math.round((p[0] + n[0] * d * sinal) * 100) / 100, Math.round((p[1] + subida + n[1] * d * sinal) * 100) / 100];
    }
  });
  return T;
}

export const CURVAS = [{ nome: 'secao', colunas: Array.from({ length: COLUNAS }, (_, j) => ({ nome: `s${j}`, fracao: j / (COLUNAS - 1) })) }];

/** derivar(T) -> a gaiola em metro, escrita dos pontos-chave da TABELA. */
export function derivar(T) {
  const estacoes = CHAVES.map(([nome, z], e) => ({
    nome, em: m(z),
    colunas: [{ curva: 'secao', pontos: Array.from({ length: PONTOS_CHAVE }, (_, k) => T[chaveDe(e, k)].map(m)) }],
  }));
  return gaiolaPorEstacoes({
    eixo: 'z', simetria: 'x', curvas: CURVAS, interpolar: { passo: m(T.passo_estacao) },
    estacoes,
    medidas: [{ chaves: true, peso: T.peso_cota }],
  });
}

/** receitaSobre(TABELA) -> a receita que lê a TABELA a cada acesso, para a ferramenta editá-la no lugar. */
export function receitaSobre(TABELA) {
  return {
    meta: { nome: 'alisar-prova', desc: 'meia chapa de seção em arco abatido, por estações-chave com curva de seção e interpolação, com erro de leitura plantado' },
    get PARAMS() { return { ...TABELA }; },
    get TOPO() { return { origem: 'y para cima, estações em z', ...derivar(this.PARAMS).pontos }; },
    get PASSOS() {
      const { passo } = derivar(this.PARAMS);
      return [['subdivisao', { origemId: 1, ...passo, borda: 'cantos', niveis: 2 }], ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }]];
    },
  };
}

/** receitaDeProva({ ruido, dobra, peso }) -> { TABELA, receita }. */
export function receitaDeProva(opcoes = {}) {
  const TABELA = tabelaDeProva(opcoes);
  return { TABELA, receita: receitaSobre(TABELA) };
}

/* O módulo como receita para a linha de comando: a chapa com o erro de leitura de 1,5 mm plantado. */
export const TABELA = tabelaDeProva({ ruido: 1.5 });
export default receitaSobre(TABELA);
