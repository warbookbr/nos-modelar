/* painel-da-perua-prova.js — o painel lateral direito da perua do acervo como chapa, com os três vãos de vidro e uma moldura em volta de
 * cada um, para provar a conferência da moldura (`src/autoria/molduras-do-vao.js`) num caso real de face inclinada.
 *
 * Só fixture de teste, fora do acervo. As medidas vêm da TABELA de `procedural/pecas/carro-perua/receita.js` (recriada de um modelo livre,
 * pacote D) e nenhuma é copiada: o contorno do painel é o perfil lateral `lado` (o nariz, a rampa do para-brisa, o teto e o vidro
 * traseiro inclinado), a seção `frente` dá o x de cada altura (a saia que recolhe até o vinco em y 790 e a estufa que afunila para dentro
 * até o teto, 10,7 graus da vertical), e os vãos são os da perua: entre a cintura (y 1110) e a base do teto (y 1510), o da frente da rampa
 * do para-brisa à coluna B, o do meio entre as colunas B e C, e o de trás da coluna C ao vidro traseiro. Na perua o vidro da frente e o de
 * trás chegam à borda do perfil; como chapa, cada um precisa de chapa em volta, e o painel ganha as colunas A e D com a largura das colunas
 * B e C da tabela (80 mm, medidos em z), paralelas à rampa e ao vidro traseiro. Essa largura é a única medida que não está na tabela.
 *
 * A chapa é uma gaiola por estações em z (eixo do carro), com as colunas nas alturas da tabela; os pontos acima do vinco ficam todos no
 * plano inclinado da estufa, e os de baixo no plano da saia. A chapa não tem espessura, que a conferência não usa. A moldura é um friso
 * retangular de 10 mm de largura e 3,5 mm de altura, com 0,5 mm abaixo da pele: a perua não tem moldura, e o perfil é o mesmo da prova
 * da rede de curvas. `secao` troca a seção frontal, para comparar a mesma chapa vertical ou mais inclinada. Os arcos de roda ficam de
 * fora: não são vãos de moldura. */
import { TABELA } from '../../../procedural/pecas/carro-perua/receita.js';
import { gaiolaPorEstacoes } from '../../../procedural/nucleo/gaiola-por-estacoes.js';

const m = (mm) => mm / 1000;
export const MOLDURA = { largura: 0.010, profundidade: 0.0035, centro: 0.00125 };
/** A largura das colunas A e D: a das colunas B e C da tabela. */
export const LARGURA_DA_COLUNA = TABELA.colunas[0][1] - TABELA.colunas[0][0];

/* A altura de cada coluna da gaiola, da tabela: a saia, o vinco da seção, a altura do capô no nariz, a cintura, o ponto em que o vidro
   traseiro deixa de ser vertical, a base do teto e o topo. */
const ALTURAS = { saia: TABELA.lado[8][1], vinco: TABELA.frente[1][1], capo: TABELA.lado[2][1], cintura: TABELA.y_cintura, quebra: TABELA.lado[6][1], teto: TABELA.y_teto, topo: TABELA.y_teto_topo };
export const COLUNAS = Object.keys(ALTURAS);

/* z de um trecho do perfil lateral na altura y, entre os índices a e b de `lado`, e a meia largura da seção na altura y */
const zEm = (a, b, y) => { const [z0, y0] = TABELA.lado[a]; const [z1, y1] = TABELA.lado[b]; return z0 + ((y - y0) * (z1 - z0)) / (y1 - y0); };
const xEm = (secao, y) => {
  for (let i = 0; i + 1 < secao.length; i++) { const [x0, y0] = secao[i]; const [x1, y1] = secao[i + 1]; if (y >= y0 && y <= y1) return x0 + ((y - y0) * (x1 - x0)) / (y1 - y0); }
  throw new Error(`a seção não chega à altura ${y}`);
};
/* o contorno da frente do painel (o nariz, a frente do capô, a rampa) e o de trás (a traseira e o vidro traseiro), em z por altura */
const zDaFrente = (y) => (y <= TABELA.lado[1][1] ? zEm(0, 1, y) : y <= TABELA.lado[2][1] ? TABELA.lado[2][0] : y <= TABELA.lado[3][1] ? zEm(2, 3, y) : zEm(3, 4, y));
const zDeTras = (y) => (y <= TABELA.lado[7][1] ? zEm(8, 7, y) : y <= TABELA.lado[6][1] ? TABELA.lado[6][0] : zEm(6, 5, y));

/** As seções frontais de comparação: a da perua, a mesma com a estufa vertical e a mesma com a estufa a 30 graus. */
export const SECOES = {
  perua: TABELA.frente,
  vertical: [TABELA.frente[0], TABELA.frente[1], [TABELA.frente[1][0], TABELA.frente[2][1]]],
  trintaGraus: [TABELA.frente[0], TABELA.frente[1], [TABELA.frente[1][0] - (TABELA.frente[2][1] - TABELA.frente[1][1]) * Math.tan(Math.PI / 6), TABELA.frente[2][1]]],
};

/** A inclinação da estufa da seção, em graus da vertical. */
export const inclinacao = (secao) => { const [x0, y0] = secao[1]; const [x1, y1] = secao[2]; return (Math.atan2(x0 - x1, y1 - y0) * 180) / Math.PI; };

/**
 * definicao({ secao }): a definição da gaiola por estações. As estações vão de trás para a frente: a traseira, a coluna D (80 mm à frente
 * do contorno de trás, e paralela a ele), as duas faces da coluna C, as duas da coluna B, a coluna A (80 mm atrás da rampa) e a frente.
 * Cada estação dá o z dela em `em` e o desvio do contorno em w, de modo que as colunas A e D e as bordas do painel seguem o perfil.
 */
export function definicao({ secao = SECOES.perua } = {}) {
  const [cB, cC] = TABELA.colunas;
  const L = LARGURA_DA_COLUNA;
  const estacao = (nome, zBase, zDe) => ({
    nome, em: m(zBase),
    colunas: COLUNAS.map((c) => { const y = ALTURAS[c]; return { nome: c, em: [m(xEm(secao, y)), m(y), m(zDe(y) - zBase)] }; }),
  });
  const fixo = (z) => () => z;
  const estacoes = [
    estacao('traseira', zDeTras(ALTURAS.vinco), zDeTras),
    estacao('colunaD', zDeTras(ALTURAS.vinco) + L, (y) => zDeTras(y) + L),
    estacao('colunaC_tras', cC[0], fixo(cC[0])), estacao('colunaC_frente', cC[1], fixo(cC[1])),
    estacao('colunaB_tras', cB[0], fixo(cB[0])), estacao('colunaB_frente', cB[1], fixo(cB[1])),
    estacao('colunaA', zDaFrente(ALTURAS.cintura) - L, (y) => (y <= ALTURAS.cintura ? zDaFrente(ALTURAS.cintura) - L : zDaFrente(y) - L)),
    estacao('frente', zDaFrente(ALTURAS.vinco), zDaFrente),
  ];
  const vaos = [
    { nome: 'vidroTras', estacoes: ['colunaD', 'colunaC_tras'], colunas: ['cintura', 'teto'] },
    { nome: 'vidroMeio', estacoes: ['colunaC_frente', 'colunaB_tras'], colunas: ['cintura', 'teto'] },
    { nome: 'vidroFrente', estacoes: ['colunaB_frente', 'colunaA'], colunas: ['cintura', 'teto'] },
  ];
  /* os cantos dos vãos e do contorno ficam vivos; a quebra da coluna D é o canto do vidro de trás em que o contorno deixa de ser vertical */
  const cantos = [
    ...vaos.flatMap((v) => v.estacoes.flatMap((estacao) => v.colunas.map((coluna) => ({ estacao, coluna })))),
    { estacao: 'colunaD', coluna: 'quebra' },
    ...['traseira', 'frente'].flatMap((estacao) => COLUNAS.map((coluna) => ({ estacao, coluna }))),
    ...estacoes.flatMap((e) => [{ estacao: e.nome, coluna: 'saia' }, { estacao: e.nome, coluna: 'topo' }]),
  ];
  /* sem medidas: a subdivisão é afim, e o que está todo no plano da estufa continua nele; o contorno e os vãos são cantos e ficam onde a tabela diz */
  return { eixo: 'z', estacoes, vaos, cantos, vincos: [{ nome: 'vincoDaSaia', coluna: 'vinco', nitidez: 'viva' }] };
}

export function montagem(opcoes = {}) { return gaiolaPorEstacoes(definicao(opcoes)); }

export const VAOS = ['vidroTras', 'vidroMeio', 'vidroFrente'];
const nomeDaMoldura = (vao) => `moldura${vao[0].toUpperCase()}${vao.slice(1)}`;

/**
 * caso({ secao, niveis, molduras }): os passos da chapa e dos frisos e o que a receita declara em `vaos`. `molduras` dá, por vão, a lista
 * de frisos { nome, pontos, largura? }; sem ela cada vão leva uma moldura fechada pela borda inteira.
 */
export function caso({ secao, niveis = 2, molduras = {} } = {}) {
  const g = montagem({ secao });
  const porVao = Object.fromEntries(VAOS.map((v) => [v, molduras[v] ?? [{ nome: nomeDaMoldura(v), pontos: g.bordaDoVao(v) }]]));
  const frisos = VAOS.flatMap((v) => porVao[v]);
  const perfil = (largura = MOLDURA.largura) => ({ retangulo: { largura, profundidade: MOLDURA.profundidade, centro: [0, MOLDURA.centro] } });
  const passos = [
    ['subdivisao', { origemId: 1, ...g.passo, borda: 'cantos', niveis }],
    ...frisos.map((f, k) => ['friso', { origemId: k + 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: f.nome, pontos: f.pontos }, perfil: perfil(f.largura) }]),
    ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    ...frisos.map((f, k) => ['parte', { nome: f.nome, sel: { origem: { op: 'friso', id: k + 2 } } }]),
  ];
  const vaos = VAOS.map((v) => ({ nome: v, borda: g.bordaDoVao(v), frisos: porVao[v].map((f) => f.nome) }));
  return { gaiola: g, pontos: g.pontos, passos, vaos };
}
