/* chapas.mjs — as chapas de prova do plano das ferramentas de correção de superfície
 * (`docs/modelar/planos/2026-11-16-ferramentas-de-correcao-de-superficie.md`): redes de `gaiolaPorRede` geradas por conta, com a forma
 * e o defeito declarados aqui, para medir o que as ferramentas de alisamento, de corte com simetria e de emenda fazem.
 *
 * Todas as medidas de entrada estão em mm, como a TABELA de uma peça; `gaiolaPorRede` devolve os pontos em metro. Nenhum número vem de
 * referência externa: a superfície de cada chapa é a função escrita aqui.
 *
 * AS CHAPAS.
 * - `rede-com-ruido` e `rede-sem-ruido`: um painel de 1000 por 500 mm (x por z), a normal para +y, abaulado nas duas direções (raio de
 *   uns 3,1 m em x e 1,25 m em z, `painel`). A rede tem nove nós numa grade de 500 por 250 mm, mais o nó `M` no meio da borda de cima à
 *   direita, e quatro retalhos: três de quatro lados e o de cima à direita, `D`, de cinco lados, cujo centro é vértice extraordinário de
 *   valência 5. As curvas têm ponto-chave a cada 100 mm. Na `rede-com-ruido` cada ponto-chave que não é nó (os nós são os pontos duros)
 *   sai da superfície em y pelo ruído declarado em `RUIDO` (amplitude `AMPLITUDE_DO_RUIDO_MM`, a sequência de ângulo áureo, sem sorteio),
 *   como uma curva digitada ponto a ponto; a `rede-sem-ruido` é a de controle. As curvas são cota exata (a superfície passa por elas). Cada
 *   retalho é uma parte (`grupos` da subdivisão), para medir por região. A `rede-alisada` é a `rede-com-ruido` com a opção `alisarCurvas`
 *   da rede (`ALISAMENTO_DE_PROVA`), a prova da fatia 3.
 * - `chapa-simetrica` e `chapa-simetrica-espelhada`: a metade x >= 0 de uma casca de seção em quarto de elipse (600 mm de meia largura,
 *   500 mm de altura na crista em x = 0) ao longo de z de 0 a 1000 mm, com a meia largura caindo 10% nas pontas, `simetria: 'x'` na rede,
 *   2 mm de espessura, e um vão lateral por `aberturaPorContorno` no flanco, visto de +x (vista 'x', sentido '+'), o retângulo `VAO`. A
 *   `chapa-simetrica` é a receita sem as opções novas (o vão sai só no lado +x, e a costura interna fica a 1e-19 m do plano); a
 *   `chapa-simetrica-espelhada` declara `simetria: 'x'` no vão e `costuraExata: true` na subdivisão.
 * - `emenda-g0`, `emenda-g1`, `emenda-g2`: duas chapas de 300 por 400 mm (x por z) que se encontram na curva compartilhada `emenda`, em
 *   x = 300 mm, cada uma um retalho da mesma rede e uma parte (`esquerda`, `direita`). A seção em x é um arco com o topo na emenda e a
 *   seção em z é reta. A continuidade declarada (a da superfície que gerou os pontos) está em `EMENDAS[nome]`: G2 com os dois arcos de raio
 *   1,5 m; G1 com o da esquerda de 0,5 m e o da direita de 1,5 m (razão de curvatura 3, tangente comum); G0 com a direita girada 6 graus em
 *   torno da emenda e a curva `emenda` declarada vinco vivo, para a dobra não ser alisada pela subdivisão.
 * - `emenda-g1-declarada`, `emenda-g2-declarada` e `emenda-g1-em-g2`: as mesmas chapas com a continuidade declarada na curva `emenda`
 *   (`continuidade` da curva de `gaiolaPorRede`, a prova da fatia 4), em `EMENDAS_DECLARADAS`: a G1 com a G1 declarada, a G2 com a G2, e a
 *   G1 (razão de curvatura 3) com a G2 declarada, o caso em que a emenda tem de mudar a forma para a curvatura ficar igual.
 * - `emenda-dupla` e `emenda-inflexao`, com as declaradas `emenda-dupla-declarada` e `emenda-inflexao-declarada` (G1): as mesmas duas chapas
 *   de 300 por 400 mm, uma de dupla curvatura (a seção em x e a em z são arcos de 0,6 m, de curvatura igual dos dois lados, o caso em que a
 *   G2 experimental muda a forma) e uma de seção em S (o arco de 0,6 m vira para o outro lado na direita: tangente comum e curvatura que
 *   troca de sinal na emenda).
 * - `rede-ponta-com-ponta`: uma chapa de 400 por 200 mm (`grade`, dupla curvatura com um termo torcido) em quatro retalhos, com a curva
 *   V de ponta a ponta em x = 200 e a horizontal em z = 100 partida no nó M de V em H1 e H2, as três declaradas G1: H1 e H2 se encontram
 *   ponta com ponta no nó de outra curva emendada. `definicaoPontaComPonta` dá a rede com ou sem a declaração.
 *
 * Dado de teste: fora do acervo publicado. As receitas ficam em `tools/fixtures/correcao-de-superficie/<nome>/receita.js` e abrem pelo caminho
 * (`npm run suavidade -- tools/fixtures/correcao-de-superficie/rede-com-ruido`). A linha de base medida nelas está em
 * `docs/modelar/banco-de-provas/correcao-de-superficie-2026-11-16/`. */
import { gaiolaPorRede } from '../../../procedural/nucleo/gaiola-por-rede.js';

/* ---------- a rede com ruído ---------- */

export const AMPLITUDE_DO_RUIDO_MM = 2;
const ANGULO_AUREO = Math.PI * (3 - Math.sqrt(5));

/** painel(x, z): a altura y (mm) do painel de prova. */
export function painel(x, z) {
  return 40 * (1 - ((x - 500) / 500) ** 2) + 25 * (1 - ((z - 250) / 250) ** 2);
}

/* os nós: a grade de 500 por 250 mm e o M no meio da borda de cima à direita */
const NOS_DA_REDE = { N00: [0, 0], N10: [500, 0], N20: [1000, 0], N01: [0, 250], N11: [500, 250], N21: [1000, 250], N02: [0, 500], N12: [500, 500], M: [750, 500], N22: [1000, 500] };
/* as curvas: cada uma uma lista de nós e de pontos (x, z) entre eles, a cada 100 mm */
const entre = (a, b, passo = 100) => {
  const [xa, za] = NOS_DA_REDE[a]; const [xb, zb] = NOS_DA_REDE[b];
  const n = Math.round(Math.hypot(xb - xa, zb - za) / passo);
  return Array.from({ length: n - 1 }, (_, k) => [xa + ((xb - xa) * (k + 1)) / n, za + ((zb - za) * (k + 1)) / n]);
};
const caminhoDaRede = (...nos) => nos.flatMap((no, k) => (k === 0 ? [no] : [...entre(nos[k - 1], no), no]));
const CURVAS_DA_REDE = {
  baixo: caminhoDaRede('N00', 'N10', 'N20'),
  meio: caminhoDaRede('N01', 'N11', 'N21'),
  topo: caminhoDaRede('N02', 'N12', 'M', 'N22'),
  esquerda: caminhoDaRede('N00', 'N01', 'N02'),
  centro: caminhoDaRede('N10', 'N11', 'N12'),
  direita: caminhoDaRede('N20', 'N21', 'N22'),
};

/** O ruído declarado, em mm ao longo de y, de cada ponto-chave de cada curva que não é nó: `RUIDO[curva][k]` é o do k-ésimo ponto da
 *  curva (0 nos nós). A sequência é a do ângulo áureo pela ordem das curvas e dos pontos, sem sorteio. */
export const RUIDO = (() => {
  let n = 0;
  return Object.fromEntries(Object.entries(CURVAS_DA_REDE).map(([nome, pontos]) => [nome, pontos.map((p) => (typeof p === 'string' ? 0 : AMPLITUDE_DO_RUIDO_MM * Math.sin(ANGULO_AUREO * ++n * 7)))]));
})();

/** definicaoDaRede({ ruido }): a definição de `gaiolaPorRede` do painel, com ou sem o ruído declarado. */
export function definicaoDaRede({ ruido = true, passo = 50, alisarCurvas = null } = {}) {
  const P = (x, z) => [x, painel(x, z), z];
  const nos = Object.fromEntries(Object.entries(NOS_DA_REDE).map(([nome, [x, z]]) => [nome, P(x, z)]));
  const curvas = Object.entries(CURVAS_DA_REDE).map(([nome, pontos]) => ({
    nome,
    pontos: pontos.map((p, k) => (typeof p === 'string' ? p : [p[0], painel(p[0], p[1]) + (ruido ? RUIDO[nome][k] : 0), p[1]])),
  }));
  return {
    passo, fora: [0, 1, 0], nos, curvas, ...(alisarCurvas ? { alisarCurvas } : {}),
    retalhos: [
      { nome: 'A', borda: [{ curva: 'baixo', de: 'N00', ate: 'N10' }, { curva: 'centro', de: 'N10', ate: 'N11' }, { curva: 'meio', de: 'N11', ate: 'N01' }, { curva: 'esquerda', de: 'N01', ate: 'N00' }] },
      { nome: 'B', borda: [{ curva: 'baixo', de: 'N10', ate: 'N20' }, { curva: 'direita', de: 'N20', ate: 'N21' }, { curva: 'meio', de: 'N21', ate: 'N11' }, { curva: 'centro', de: 'N11', ate: 'N10' }] },
      { nome: 'C', borda: [{ curva: 'meio', de: 'N01', ate: 'N11' }, { curva: 'centro', de: 'N11', ate: 'N12' }, { curva: 'topo', de: 'N12', ate: 'N02' }, { curva: 'esquerda', de: 'N02', ate: 'N01' }] },
      { nome: 'D', borda: [{ curva: 'meio', de: 'N11', ate: 'N21' }, { curva: 'direita', de: 'N21', ate: 'N22' }, { curva: 'topo', de: 'N22', ate: 'M' }, { curva: 'topo', de: 'M', ate: 'N12' }, { curva: 'centro', de: 'N12', ate: 'N11' }] },
    ],
  };
}

/** Os nomes de ponto de cada retalho (os de dentro dele e os das curvas da borda), para o grupo de faces da subdivisão. */
export function pontosDosRetalhos(g) {
  const dentro = new Map(Object.keys(g.retalhos).map((r) => [r, new Set()]));
  for (const [ponto, o] of Object.entries(g.origens)) if (o.tipo === 'retalho') dentro.get(o.retalho).add(ponto);
  for (const [r, { bordas }] of Object.entries(g.retalhos)) for (const b of bordas) for (const p of b.pontos) dentro.get(r).add(p);
  return Object.fromEntries([...dentro].map(([r, s]) => [r, [...s].sort()]));
}

/** O alisamento das curvas da `rede-alisada`: a `rede-com-ruido` com a opção `alisarCurvas` da rede, os nós fixos e o limite de deslocamento
 *  (a chapa de prova não tem prancha) um pouco acima da amplitude do ruído, para o alisamento poder devolver a curva à superfície. */
export const ALISAMENTO_DE_PROVA = Object.freeze({ tolerancia: 2.5 });

/** A receita da rede: a superfície (sem espessura, uma pele) em nível 2, com uma parte por retalho. */
function receitaDeRede(nome, { ruido, alisarCurvas = null }) {
  const g = gaiolaPorRede(definicaoDaRede({ ruido, alisarCurvas }));
  const grupos = Object.entries(pontosDosRetalhos(g)).map(([r, pontos]) => ({ nome: r, pontos }));
  return {
    meta: { nome: `correcao-de-superficie/${nome}`, desc: `painel de prova da gaiola por rede ${ruido ? `com as curvas digitadas com ruído de ${AMPLITUDE_DO_RUIDO_MM} mm${alisarCurvas ? ', alisadas pela opção alisarCurvas' : ''}` : 'sem ruído, o de controle'}` },
    PARAMS: {},
    TOPO: { origem: 'canto do painel em x = 0 e z = 0, y para fora', ...g.pontos },
    PASSOS: [
      ['subdivisao', { origemId: 1, ...g.passo, niveis: 2, grupos }],
      ...grupos.map(({ nome: r }) => ['parte', { nome: r, sel: { origem: { op: 'subdivisao', id: 1, parte: r } } }]),
    ],
    PLANO: planoDeProva('painel de 1000 por 500 mm de quatro retalhos, um deles de cinco lados', 1000, grupos.map(({ nome: r }) => r)),
    REDE: g,
  };
}

/* ---------- a chapa simétrica com vão lateral ---------- */

export const MEIA_LARGURA_MM = 600;
export const ALTURA_DA_CRISTA_MM = 500;
export const COMPRIMENTO_MM = 1000;
/** O vão lateral, na vista 'x' ([u, v] = [z, y]), em mm: o retângulo no flanco. */
export const VAO = Object.freeze({ z0: 350, z1: 650, y0: 150, y1: 300 });

/** casca(t, z): o ponto (mm) da pele de fora na seção em z, ao ângulo t (graus) do quarto de elipse, de 0 na crista a 80 no pé. */
export function casca(t, z) {
  const a = (t * Math.PI) / 180; const s = 1 - 0.1 * ((z - COMPRIMENTO_MM / 2) / (COMPRIMENTO_MM / 2)) ** 2;
  return [MEIA_LARGURA_MM * s * Math.sin(a), ALTURA_DA_CRISTA_MM * Math.cos(a), z];
}

export function definicaoDaChapaSimetrica({ passo = 60 } = {}) {
  const niveis = { crista: 0, ombro: 40, pe: 80 };
  const zs = [0, 500, 1000];
  const nos = {};
  for (const [n, t] of Object.entries(niveis)) for (const z of zs) nos[`${n}${z}`] = casca(t, z);
  const aoComprimento = (n) => ({ nome: n, pontos: [`${n}0`, ...[100, 200, 300, 400].map((z) => casca(niveis[n], z)), `${n}500`, ...[600, 700, 800, 900].map((z) => casca(niveis[n], z)), `${n}1000`] });
  const secao = (z) => ({ nome: `secao${z}`, pontos: [`crista${z}`, ...[10, 20, 30].map((t) => casca(t, z)), `ombro${z}`, ...[50, 60, 70].map((t) => casca(t, z)), `pe${z}`] });
  return {
    passo, fora: [1, 1, 0], simetria: 'x', nos,
    curvas: [aoComprimento('crista'), aoComprimento('ombro'), aoComprimento('pe'), ...zs.map(secao)],
    retalhos: [
      { nome: 'altoFrente', borda: [{ curva: 'crista', de: 'crista0', ate: 'crista500' }, { curva: 'secao500', de: 'crista500', ate: 'ombro500' }, { curva: 'ombro', de: 'ombro500', ate: 'ombro0' }, { curva: 'secao0', de: 'ombro0', ate: 'crista0' }] },
      { nome: 'altoTras', borda: [{ curva: 'crista', de: 'crista500', ate: 'crista1000' }, { curva: 'secao1000', de: 'crista1000', ate: 'ombro1000' }, { curva: 'ombro', de: 'ombro1000', ate: 'ombro500' }, { curva: 'secao500', de: 'ombro500', ate: 'crista500' }] },
      { nome: 'flancoFrente', borda: [{ curva: 'ombro', de: 'ombro0', ate: 'ombro500' }, { curva: 'secao500', de: 'ombro500', ate: 'pe500' }, { curva: 'pe', de: 'pe500', ate: 'pe0' }, { curva: 'secao0', de: 'pe0', ate: 'ombro0' }] },
      { nome: 'flancoTras', borda: [{ curva: 'ombro', de: 'ombro500', ate: 'ombro1000' }, { curva: 'secao1000', de: 'ombro1000', ate: 'pe1000' }, { curva: 'pe', de: 'pe1000', ate: 'pe500' }, { curva: 'secao500', de: 'pe500', ate: 'ombro500' }] },
    ],
  };
}

const m = (mm) => mm / 1000;

function receitaDaChapaSimetrica(nome, { espelhada }) {
  const g = gaiolaPorRede(definicaoDaChapaSimetrica());
  const { z0, z1, y0, y1 } = VAO;
  const contorno = { inicio: [m(z0), m(y0)], trechos: [{ reto: [m(z1), m(y0)] }, { reto: [m(z1), m(y1)] }, { reto: [m(z0), m(y1)] }, { reto: [m(z0), m(y0)] }] };
  return {
    meta: { nome: `correcao-de-superficie/${nome}`, desc: `casca simétrica de prova com um vão lateral${espelhada ? ', com o vão espelhado pela simetria e a costura em x 0 exato' : ', sem as opções de simetria do vão e da costura'}` },
    PARAMS: {},
    TOPO: { origem: 'a crista no plano x = 0, y para cima, z ao comprimento; a gaiola é a metade x >= 0', ...g.pontos },
    PASSOS: [
      ['subdivisao', { origemId: 1, ...g.passo, niveis: 2, espessura: m(2), ...(espelhada ? { costuraExata: true } : {}) }],
      ['aberturaPorContorno', { origemId: 2, chapa: { origem: { op: 'subdivisao', id: 1 } }, vista: 'x', sentido: '+', contorno, ...(espelhada ? { simetria: 'x' } : {}) }],
      ['parte', { nome: 'chapa', sel: { origem: { op: 'aberturaPorContorno', id: 2 } } }],
    ],
    PLANO: planoDeProva('casca simétrica de 1200 por 1000 mm, 2 mm de espessura, com um vão lateral de 300 por 150 mm', 2 * MEIA_LARGURA_MM, ['chapa']),
    vaos: [{ nome: 'vaoLateral', superficie: { op: 'aberturaPorContorno', id: 2 }, semMoldura: { motivo: 'a chapa de prova mede o corte, sem moldura' } }],
    REDE: g,
  };
}

/* ---------- as chapas emendadas ---------- */

export const EMENDA_X_MM = 300;
const LARGURA_DA_EMENDA_MM = 600;
const ALTURA_DA_EMENDA_MM = 400;

/** As emendas, com a continuidade declarada da superfície que gerou os pontos dos dois lados. `raioEmZMm` dá à seção em z um arco de
 *  topo em z = 200 (a dupla curvatura); `inflexao` vira a curvatura da direita para o outro lado (a seção em x em S, de tangente comum). */
export const EMENDAS = Object.freeze({
  'emenda-g2': { continuidade: 'G2', raioEsquerdaMm: 1500, raioDireitaMm: 1500, anguloGraus: 0, razaoDeCurvatura: 1, vinco: null },
  'emenda-g1': { continuidade: 'G1', raioEsquerdaMm: 500, raioDireitaMm: 1500, anguloGraus: 0, razaoDeCurvatura: 3, vinco: null },
  'emenda-g0': { continuidade: 'G0', raioEsquerdaMm: 1500, raioDireitaMm: 1500, anguloGraus: 6, razaoDeCurvatura: 1, vinco: 'viva' },
  'emenda-dupla': { continuidade: 'G2', raioEsquerdaMm: 600, raioDireitaMm: 600, raioEmZMm: 600, anguloGraus: 0, razaoDeCurvatura: 1, vinco: null },
  'emenda-inflexao': { continuidade: 'G1', raioEsquerdaMm: 600, raioDireitaMm: 600, inflexao: true, anguloGraus: 0, razaoDeCurvatura: -1, vinco: null },
});

/** pontoDaEmenda(nome, x, z): o ponto (mm) da chapa `nome` em (x, z); y para fora. */
export function pontoDaEmenda(nome, x, z) {
  const e = EMENDAS[nome];
  if (!e) throw new Error(`chapa emendada '${nome}' não existe; use ${Object.keys(EMENDAS).join(', ')}`);
  const raio = x <= EMENDA_X_MM ? e.raioEsquerdaMm : e.raioDireitaMm;
  const dx = x - EMENDA_X_MM;
  const dz = z - ALTURA_DA_EMENDA_MM / 2;
  const y = (x > EMENDA_X_MM && e.inflexao ? -1 : 1) * (Math.sqrt(raio * raio - dx * dx) - raio) + (e.raioEmZMm ? Math.sqrt(e.raioEmZMm ** 2 - dz * dz) - e.raioEmZMm : 0);
  if (x <= EMENDA_X_MM || !e.anguloGraus) return [x, y, z];
  /* a direita gira em torno da emenda (300, 0), para baixo */
  const a = (-e.anguloGraus * Math.PI) / 180;
  return [EMENDA_X_MM + dx * Math.cos(a) - y * Math.sin(a), dx * Math.sin(a) + y * Math.cos(a), z];
}

/** As chapas emendadas com a continuidade declarada na curva `emenda`: a superfície de `de` (uma de `EMENDAS`) e a `continuidade` da curva. */
export const EMENDAS_DECLARADAS = Object.freeze({
  'emenda-g1-declarada': { de: 'emenda-g1', continuidade: 'G1' },
  'emenda-g2-declarada': { de: 'emenda-g2', continuidade: 'G2' },
  'emenda-g1-em-g2': { de: 'emenda-g1', continuidade: 'G2' },
  'emenda-dupla-declarada': { de: 'emenda-dupla', continuidade: 'G1' },
  'emenda-inflexao-declarada': { de: 'emenda-inflexao', continuidade: 'G1' },
});

/** definicaoDaEmenda(nome, { passo, continuidade }): a rede da chapa emendada `nome` (de `EMENDAS`); com `continuidade` ('G1' ou 'G2'), a
 *  curva `emenda` a declara, e sem ela a rede é a de sempre. */
export function definicaoDaEmenda(nome, { passo = 30, continuidade = null } = {}) {
  const e = EMENDAS[nome];
  const P = (x, z) => pontoDaEmenda(nome, x, z);
  const xsE = [50, 100, 150, 200, 250]; const xsD = [350, 400, 450, 500, 550];
  const nos = { A: P(0, 0), B: P(EMENDA_X_MM, 0), C: P(LARGURA_DA_EMENDA_MM, 0), A1: P(0, ALTURA_DA_EMENDA_MM), B1: P(EMENDA_X_MM, ALTURA_DA_EMENDA_MM), C1: P(LARGURA_DA_EMENDA_MM, ALTURA_DA_EMENDA_MM) };
  const ao = (x) => [100, 200, 300].map((z) => P(x, z));
  return {
    passo, fora: [0, 1, 0], nos,
    curvas: [
      { nome: 'baixoEsquerda', pontos: ['A', ...xsE.map((x) => P(x, 0)), 'B'] },
      { nome: 'baixoDireita', pontos: ['B', ...xsD.map((x) => P(x, 0)), 'C'] },
      { nome: 'cimaEsquerda', pontos: ['A1', ...xsE.map((x) => P(x, ALTURA_DA_EMENDA_MM)), 'B1'] },
      { nome: 'cimaDireita', pontos: ['B1', ...xsD.map((x) => P(x, ALTURA_DA_EMENDA_MM)), 'C1'] },
      { nome: 'ladoEsquerdo', pontos: ['A', ...ao(0), 'A1'] },
      { nome: 'emenda', pontos: ['B', ...ao(EMENDA_X_MM), 'B1'], ...(e.vinco ? { vinco: e.vinco } : {}), ...(continuidade ? { continuidade } : {}) },
      { nome: 'ladoDireito', pontos: ['C', ...ao(LARGURA_DA_EMENDA_MM), 'C1'] },
    ],
    retalhos: [
      { nome: 'esquerda', borda: ['baixoEsquerda', 'emenda', 'cimaEsquerda', 'ladoEsquerdo'] },
      { nome: 'direita', borda: ['baixoDireita', 'ladoDireito', 'cimaDireita', 'emenda'] },
    ],
  };
}

function receitaDaEmenda(nome) {
  const declarada = EMENDAS_DECLARADAS[nome] ?? null;
  const e = EMENDAS[declarada ? declarada.de : nome];
  const g = gaiolaPorRede(definicaoDaEmenda(declarada ? declarada.de : nome, declarada ? { continuidade: declarada.continuidade } : {}));
  const grupos = Object.entries(pontosDosRetalhos(g)).map(([r, pontos]) => ({ nome: r, pontos }));
  return {
    meta: { nome: `correcao-de-superficie/${nome}`, desc: declarada
      ? `duas chapas de prova emendadas na curva x = 300 mm, a superfície em ${e.continuidade} e a curva da emenda declarada ${declarada.continuidade}`
      : `duas chapas de prova emendadas na curva x = 300 mm, declaradas em ${e.continuidade}` },
    PARAMS: {},
    TOPO: { origem: 'canto da chapa em x = 0 e z = 0, y para fora; a emenda é x = 0,3', ...g.pontos },
    PASSOS: [
      ['subdivisao', { origemId: 1, ...g.passo, niveis: 2, grupos }],
      ...grupos.map(({ nome: r }) => ['parte', { nome: r, sel: { origem: { op: 'subdivisao', id: 1, parte: r } } }]),
    ],
    PLANO: planoDeProva(declarada ? `duas chapas de 300 por 400 mm emendadas em ${e.continuidade}, com a emenda declarada ${declarada.continuidade}` : `duas chapas de 300 por 400 mm emendadas em ${e.continuidade} declarada`, LARGURA_DA_EMENDA_MM, grupos.map(({ nome: r }) => r)),
    EMENDA: declarada ? { ...e, declarada: declarada.continuidade } : e,
    REDE: g,
  };
}

/* ---------- a rede de curvas emendadas ponta com ponta ---------- */

/** grade(x, z): a altura y (mm) da chapa de quatro retalhos, de dupla curvatura com um termo torcido, para nenhuma curva ser plana. */
export function grade(x, z) {
  return -((x - 200) ** 2) / 2400 - ((z - 100) ** 2) / 3000 + 0.05 * (x / 1000) * z;
}

/** As curvas emendadas da `rede-ponta-com-ponta`: a vertical V, que passa pelo nó M do meio, e as duas metades da horizontal, H1 e H2,
 *  que terminam em M ponta com ponta. */
export const EMENDAS_PONTA_COM_PONTA = Object.freeze(['V', 'H1', 'H2']);

/** definicaoPontaComPonta({ continuidade, passo }): a chapa de 400 por 200 mm (x por z) em quatro retalhos de 200 por 100, com a curva V em
 *  x = 200 de ponta a ponta e a horizontal em z = 100 partida no nó M em H1 e H2; as bordas também se partem nos nós do meio. Com
 *  `continuidade`, V, H1 e H2 a declaram: H1 e H2 se encontram ponta com ponta no nó M de V, que é emendada. */
export function definicaoPontaComPonta({ continuidade = null, passo = 25 } = {}) {
  const P = (x, z) => [x, grade(x, z), z];
  const nos = {};
  for (const [n, x, z] of [['A', 0, 0], ['B', 200, 0], ['C', 400, 0], ['D', 0, 100], ['M', 200, 100], ['E', 400, 100], ['F', 0, 200], ['G', 200, 200], ['H', 400, 200]]) nos[n] = P(x, z);
  const reta = (a, b) => { const [pa, pb] = [nos[a], nos[b]]; return [a, ...[1, 2, 3].map((k) => P(pa[0] + ((pb[0] - pa[0]) * k) / 4, pa[2] + ((pb[2] - pa[2]) * k) / 4)), b]; };
  const curva = (nome, a, b) => ({ nome, pontos: reta(a, b), ...(continuidade && EMENDAS_PONTA_COM_PONTA.includes(nome) ? { continuidade } : {}) });
  const V = (de, ate) => ({ curva: 'V', de, ate });
  return {
    passo, fora: [0, 1, 0], nos,
    curvas: [
      curva('b1', 'A', 'B'), curva('b2', 'B', 'C'), curva('t1', 'F', 'G'), curva('t2', 'G', 'H'),
      curva('l1', 'A', 'D'), curva('l2', 'D', 'F'), curva('r1', 'C', 'E'), curva('r2', 'E', 'H'),
      { nome: 'V', pontos: ['B', P(200, 50), 'M', P(200, 150), 'G'], ...(continuidade ? { continuidade } : {}) },
      curva('H1', 'D', 'M'), curva('H2', 'M', 'E'),
    ],
    retalhos: [
      { nome: 'q1', borda: ['b1', V('B', 'M'), { curva: 'H1', de: 'M', ate: 'D' }, 'l1'] },
      { nome: 'q2', borda: ['b2', 'r1', { curva: 'H2', de: 'E', ate: 'M' }, V('M', 'B')] },
      { nome: 'q3', borda: ['H1', V('M', 'G'), { curva: 't1', de: 'G', ate: 'F' }, { curva: 'l2', de: 'F', ate: 'D' }] },
      { nome: 'q4', borda: ['H2', 'r2', { curva: 't2', de: 'H', ate: 'G' }, V('G', 'M')] },
    ],
  };
}

function receitaPontaComPonta(nome) {
  const g = gaiolaPorRede(definicaoPontaComPonta({ continuidade: 'G1' }));
  const grupos = Object.entries(pontosDosRetalhos(g)).map(([r, pontos]) => ({ nome: r, pontos }));
  return {
    meta: { nome: `correcao-de-superficie/${nome}`, desc: 'chapa de prova de quatro retalhos com a curva V e as duas metades da horizontal, que se encontram ponta com ponta no meio de V, declaradas G1' },
    PARAMS: {},
    TOPO: { origem: 'canto da chapa em x = 0 e z = 0, y para fora; V é x = 0,2 e a horizontal z = 0,1', ...g.pontos },
    PASSOS: [
      ['subdivisao', { origemId: 1, ...g.passo, niveis: 2, grupos }],
      ...grupos.map(({ nome: r }) => ['parte', { nome: r, sel: { origem: { op: 'subdivisao', id: 1, parte: r } } }]),
    ],
    PLANO: planoDeProva('chapa de 400 por 200 mm de quatro retalhos, com curvas emendadas ponta com ponta', 400, grupos.map(({ nome: r }) => r)),
    REDE: g,
  };
}

function planoDeProva(objeto, milimetros, partes) {
  return {
    objeto,
    referencias: [],
    escala: { medida: 'a maior extensão da chapa', milimetros },
    partes: partes.map((p) => ({ nome: p, forma: 'retalho da chapa de prova, de superfície declarada por função', tecnica: 'gaiolaPorRede e subdivisao' })),
    criteriosDeReprovacao: ['a chapa sai diferente da superfície declarada em chapas.mjs'],
  };
}

/** receitaDeProva(nome): a receita da chapa de prova `nome`. */
export function receitaDeProva(nome) {
  if (nome === 'rede-com-ruido') return receitaDeRede(nome, { ruido: true });
  if (nome === 'rede-sem-ruido') return receitaDeRede(nome, { ruido: false });
  if (nome === 'rede-alisada') return receitaDeRede(nome, { ruido: true, alisarCurvas: ALISAMENTO_DE_PROVA });
  if (nome === 'chapa-simetrica') return receitaDaChapaSimetrica(nome, { espelhada: false });
  if (nome === 'chapa-simetrica-espelhada') return receitaDaChapaSimetrica(nome, { espelhada: true });
  if (Object.hasOwn(EMENDAS, nome) || Object.hasOwn(EMENDAS_DECLARADAS, nome)) return receitaDaEmenda(nome);
  if (nome === 'rede-ponta-com-ponta') return receitaPontaComPonta(nome);
  throw new Error(`chapa de prova '${nome}' não existe; use ${CHAPAS_DE_PROVA.join(', ')}`);
}

export const CHAPAS_DE_PROVA = Object.freeze(['rede-com-ruido', 'rede-sem-ruido', 'rede-alisada', 'chapa-simetrica', 'chapa-simetrica-espelhada', ...Object.keys(EMENDAS), ...Object.keys(EMENDAS_DECLARADAS), 'rede-ponta-com-ponta']);
