/* Tradutor do nível zero: lê as formas resolvidas do esboço (`mecanifica.formas-resolvidas@1`, dado puro) e gera o andaime da
   forma global N2 (`mecanifica.andaime-global@2`), que a receita detalhada refina por `REFINA`. Não importa o módulo do esboço,
   Three.js nem DOM: recebe o JSON e devolve JSON. Mesmas formas, mesmo andaime, byte a byte.

   Têm correspondência exata a caixa sem raio, chanfro nem furo; o cilindro (a haste `de`/`para` e a ligação `ligar` também); o
   anel; o cone; a esfera; a revolução; a extrusão, convexa ou côncava; e o tubo por pontos. O que a N2 não faz com o mesmo tipo
   entra com aproximação declarada, e cada forma assim vai para o relatório `perdas` com o que se perdeu e o erro de volume e de
   envelope medido na blocagem do andaime (não estimado): o loft vira `casco-secoes` (a casca vira o sólido externo cheio e a
   inclinação de seção é ignorada); a caixa com raio vira a extrusão do contorno arredondado e a caixa com chanfro o casco das
   quatro seções do esboço; o cilindro achatado vira a extrusão do círculo cortado; a forma de família vira o casco por seções que o
   módulo calcula da superfície dela (`familia-como-casco`, sem o furo nem as cavidades); e o componente com detalhe interno que passa
   do orçamento de volumes (`volumesMaximos`) é recolhido a uma caixa do envelope da forma principal. O que não tem equivalente
   (faixa, furo de caixa, rotação em dois eixos de um sólido que a N2 não inclina, medida que a N2 recusa) volta em
   `naoTraduzidas` com o motivo, e `estrito: true` recusa o conjunto inteiro quando há alguma. Nada é aproximado em silêncio: uma
   forma ou está no andaime com a mesma geometria, ou está em `perdas`, ou está em `naoTraduzidas`. A forma que subtrai outra
   (`geometria.recorte`: o alojamento da roda na asa, a porta rebaixada no casco) vai ao andaime inteira, porque a N2 não subtrai um
   volume de outro, e entra em `perdas` com o volume do vão (`recorte-ignorado`, ou a perda `recorte` somada à da aproximação).

   A orientação sai da `matriz` de cada forma (mundo = centro + matriz · local). Uma matriz que leva os três eixos da forma a
   eixos do mundo só reordena as medidas. Uma que deixa um eixo no lugar e gira os outros dois no plano dele gira o perfil: a
   caixa vira extrusão desse eixo e a extrusão gira o contorno. O cilindro fora dos eixos é o tubo de dois pontos. Cone, anel,
   revolução, loft, caixa com raio ou chanfro e cilindro achatado só aceitam o eixo da forma sobre um eixo do mundo, porque a N2
   não os inclina. A esfera não depende da matriz.

   Os ids do andaime são slugs do id da forma (acento sai, `camelCase` e pontos viram hífen); dois ids que dão o mesmo slug
   ganham ambos um sufixo com o hash do id original, e por isso o slug não depende da ordem das formas. A tabela devolvida
   leva cada id do esboço ao do andaime. As regiões de um volume são a unidade e a parte da forma (`sem-regiao` sem as duas). */
import { ErroFormaGlobal } from './base-forma-global.js';
import { FORMATO_ANDAIME_GLOBAL, normalizarAndaimeGlobal } from './forma-global.js';
import { medirAndaime } from './medir-blocagem-nivel-zero.js';
import { deslocarContorno } from '../../procedural/nucleo/contorno.js';

export const FORMATO_FORMAS_RESOLVIDAS = 'mecanifica.formas-resolvidas@1';

/* Lados que o esboço dá a cada sólido quando a forma não declara `lados`: cilindro, anel e cone em 128, a esfera em 40 lados e
   20 faixas, o tubo em 48. A N2 recebe o mesmo número, e por isso o polígono inscrito e a área são os do esboço. */
const LADOS_DO_CILINDRO = 128;
const LADOS_DA_ESFERA = 40;
const LADOS_DO_TUBO = 48;

const EIXOS = ['x', 'y', 'z'];
const EIXOS_DO_MUNDO = Object.freeze({ direita: '+x', cima: '+y', frente: '+z' });
const TOLERANCIA_DE_EIXO = 1e-9;
const REGIAO_VAZIA = 'sem-regiao';

export class ErroDoTradutor extends Error {
  constructor(mensagem, naoTraduzidas = []) {
    super(mensagem);
    this.name = 'ErroDoTradutor';
    this.naoTraduzidas = naoTraduzidas;
  }
}

/* Recusa interna de uma forma: vira um item de `naoTraduzidas`. */
class Recusa extends Error {}
const recusar = (motivo) => { throw new Recusa(motivo); };

const arredondar = (x) => { const r = Math.round(x * 1e6) / 1e6; return r === 0 ? 0 : r; };
const vetor = (v) => v.map(arredondar);
const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/* ---------- ids e regiões ---------- */

/* `portaE.abaPainel1` -> `porta-e-aba-painel1`; `pés de apoio` -> `pes-de-apoio`. Vazio quando nada sobra. */
export function slugDe(texto) {
  return String(texto)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* FNV-1a de 32 bits em hexadecimal: curto, sem dependência e igual em todo ambiente. */
function hashDe(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/* O slug de cada nome, sem depender da ordem: o nome que compartilha slug com outro (ou que não tem nenhum) leva o hash dele. */
function atribuirSlugs(nomes, vazio) {
  const base = new Map(nomes.map((n) => [n, slugDe(n)]));
  const usos = new Map();
  for (const s of base.values()) usos.set(s, (usos.get(s) ?? 0) + 1);
  const saida = new Map();
  const tomados = new Set();
  for (const [nome, s] of base) {
    let final = s !== '' && usos.get(s) === 1 ? s : `${s || vazio}-${hashDe(nome)}`;
    for (let n = 2; tomados.has(final); n++) final = `${s || vazio}-${hashDe(nome)}-${n}`;
    tomados.add(final);
    saida.set(nome, final);
  }
  return saida;
}

/* ---------- orientação ---------- */

/* A coluna `i` da matriz é para onde vai o eixo local `i` no mundo. Alinhada quando é um eixo do mundo, com o sinal. */
function colunasDe(m) {
  if (!Array.isArray(m) || m.length !== 3 || m.some((l) => !Array.isArray(l) || l.length !== 3 || l.some((x) => !Number.isFinite(x)))) {
    throw new ErroDoTradutor('matriz inválida: precisa ser 3 por 3 de números finitos');
  }
  return [0, 1, 2].map((i) => [m[0][i], m[1][i], m[2][i]]);
}
function alinhada(coluna) {
  const j = coluna.findIndex((c) => Math.abs(Math.abs(c) - 1) <= TOLERANCIA_DE_EIXO);
  return j < 0 ? null : { eixo: j, sinal: Math.sign(coluna[j]) };
}
const outrosEixos = (k) => [0, 1, 2].filter((i) => i !== k);

/* ---------- a conversão de cada tipo ---------- */

const SEM_ROTACAO_LIVRE = 'a rotação não deixa nenhum eixo da forma sobre um eixo do mundo (gira em dois eixos), e a N2 não inclina o sólido';

const EIXO_DA_ALTURA_SOLTO = 'o eixo da altura da caixa não fica sobre um eixo do mundo, e a N2 não inclina o sólido que o contorno extruda';

/* Fração do vizinho em que a seção ponto de um loft vira polígono: o casco da N2 não aceita seção de área nula. */
const FRACAO_DA_PONTA = 0.01;
const SEGMENTOS_DO_CANTO = 8;

/* ---------- os contornos do esboço, refeitos com as mesmas contas para a extrusão e o casco terem os mesmos pontos ---------- */

function circuloN(r, n) {
  return Array.from({ length: n }, (_, i) => [r * Math.cos(2 * Math.PI * i / n), r * Math.sin(2 * Math.PI * i / n)]);
}

/* O retângulo `l` por `p` de cantos de raio `r` (no máximo a metade da menor medida), anti-horário, com 9 pontos por canto. */
function retanguloArredondado(l, p, r) {
  const rr = Math.min(r ?? 0, l / 2, p / 2);
  if (!(rr > 0)) return [[-l / 2, -p / 2], [l / 2, -p / 2], [l / 2, p / 2], [-l / 2, p / 2]];
  const pontos = [];
  const cantos = [[l / 2 - rr, -p / 2 + rr, -90], [l / 2 - rr, p / 2 - rr, 0], [-l / 2 + rr, p / 2 - rr, 90], [-l / 2 + rr, -p / 2 + rr, 180]];
  for (const [cx, cy, a0] of cantos) {
    for (let i = 0; i <= SEGMENTOS_DO_CANTO; i++) {
      const a = (a0 + 90 * i / SEGMENTOS_DO_CANTO) * Math.PI / 180;
      pontos.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
  }
  return pontos;
}

/* O contorno sem os pontos consecutivos repetidos (o raio de metade da menor medida junta o fim de um canto ao começo do próximo). */
const semRepetidos = (pts) => pts.filter((q, i) => { const a = pts[(i + pts.length - 1) % pts.length]; return Math.hypot(q[0] - a[0], q[1] - a[1]) > 1e-9; });

/* O retângulo com os quatro cantos cortados a 45 graus, anti-horário. */
const retanguloChanfrado = (l, p, c) => [[-l / 2 + c, -p / 2], [l / 2 - c, -p / 2], [l / 2, -p / 2 + c], [l / 2, p / 2 - c],
  [l / 2 - c, p / 2], [-l / 2 + c, p / 2], [-l / 2, p / 2 - c], [-l / 2, -p / 2 + c]];

/* O contorno convexo cortado pelo semiplano n·p <= limite. */
function cortar(perfil, n, limite) {
  const saida = [];
  for (let i = 0; i < perfil.length; i++) {
    const a = perfil[i];
    const b = perfil[(i + 1) % perfil.length];
    const da = a[0] * n[0] + a[1] * n[1] - limite;
    const db = b[0] * n[0] + b[1] * n[1] - limite;
    if (da <= 0) saida.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      saida.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return saida;
}

/* Os eixos (u, v) do contorno de um sólido de eixo `eixo`, como o esboço os escolhe. */
const BASE_DO_EIXO = { x: ['z', 'y'], y: ['x', 'z'], z: ['x', 'y'] };

/* ---------- o volume do esboço, medido nos mesmos dados para dizer quanto a aproximação perdeu ---------- */

const areaDe = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return Math.abs(a) / 2; };
const pontoDoAnel = (anel, q) => [q[0], q[1], q.length > 2 ? q[2] : anel.w];
const anelInclinado = (anel) => anel.n !== undefined || anel.perfil.some((q) => q.length > 2);

/* O volume do sólido que passa por uma lista de seções planas (os aneis, de `w` crescente) e é fechado pelas duas tampas.
   Seções perpendiculares ao eixo: a fórmula do prismatoide faixa a faixa, exata para o contorno que varia linearmente. Com seção
   inclinada o plano da seção deixa de ser o de `w` constante e o volume sai dos pontos reais pelo teorema da divergência. O
   esboço desenha cada faixa como o sólido convexo das duas seções, e por isso cada quadrilátero lateral (não plano quando as
   duas seções não são paralelas) entra pela diagonal que dá o sólido convexo, a de maior volume. */
function volumeEmAneis(aneis) {
  if (!aneis.some(anelInclinado)) {
    let v = 0;
    for (let k = 0; k + 1 < aneis.length; k++) {
      const a = aneis[k], b = aneis[k + 1];
      const meio = a.perfil.map((q, i) => [(q[0] + b.perfil[i][0]) / 2, (q[1] + b.perfil[i][1]) / 2]);
      v += (b.w - a.w) / 6 * (areaDe(a.perfil) + 4 * areaDe(meio) + areaDe(b.perfil));
    }
    return v;
  }
  const pontos = aneis.map((anel) => anel.perfil.map((q) => pontoDoAnel(anel, q)));
  const n = pontos[0].length;
  const fluxo = (a, b, c) => (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  const ultimo = pontos.length - 1;
  let tampas = 0;
  for (let i = 1; i < n - 1; i++) tampas += fluxo(pontos[0][0], pontos[0][i + 1], pontos[0][i]) + fluxo(pontos[ultimo][0], pontos[ultimo][i], pontos[ultimo][i + 1]);
  const quadrilateros = [];
  for (let k = 0; k + 1 < pontos.length; k++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [a, b, c, d] = [pontos[k][i], pontos[k][j], pontos[k + 1][j], pontos[k + 1][i]];
      quadrilateros.push([fluxo(a, b, c) + fluxo(a, c, d), fluxo(a, b, d) + fluxo(b, c, d)]);
    }
  }
  /* o sinal do volume com a primeira diagonal diz se a normal sai para fora (anti-horário) ou para dentro */
  const sinal = Math.sign(tampas + quadrilateros.reduce((soma, [d1]) => soma + d1, 0)) || 1;
  return Math.abs(sinal * tampas + quadrilateros.reduce((soma, [d1, d2]) => soma + Math.max(sinal * d1, sinal * d2), 0));
}

/* ---------- uma forma, um volume ---------- */

/* Uma aproximação: o volume da N2, o volume do esboço (mm3), o que se perdeu e, no loft com casca, o volume do sólido externo cheio
   (o que o esboço teria sem a cavidade, para separar a perda da cavidade da perda da inclinação). */
const aproximado = (volume, codigo, volumeEsboco, perdido, volumeExterno = null) => ({ volume, aproximacao: { codigo, volumeEsboco, perdido, volumeExterno } });
const perda = (codigo, descricao) => ({ codigo, descricao });

function volumeDaCaixa(g, cols, al) {
  if (Array.isArray(g.furos) && g.furos.length > 0) recusar('caixa com furo: a N2 não tem cavidade em caixa');
  if (g.raio > 0) {
    /* o esboço faz a caixa com raio como a extrusão, em y, do retângulo arredondado: o mesmo contorno vai para a N2 */
    if (!al[1]) recusar(`caixa com raio de canto (${g.raio} mm): ${EIXO_DA_ALTURA_SOLTO}`);
    const perfil = semRepetidos(retanguloArredondado(g.largura, g.profundidade, g.raio));
    const volume = volumeDaExtrusao({ eixo: 'y', eixosDoPerfil: ['x', 'z'], comprimento: g.altura, perfil }, cols, al);
    return aproximado(volume, 'caixa-com-raio-como-extrusao', areaDe(perfil) * g.altura,
      [perda('tipo', `a caixa de raio ${g.raio} mm vira a extrusão do contorno arredondado (${perfil.length} pontos, os do esboço); a forma não muda e o tipo deixa de ser caixa`)]);
  }
  if (g.chanfro > 0) {
    if (!al[1]) recusar(`caixa com chanfro (${g.chanfro} mm): ${EIXO_DA_ALTURA_SOLTO}`);
    const cheio = retanguloChanfrado(g.largura, g.profundidade, g.chanfro);
    let topo;
    try { topo = deslocarContorno(cheio, g.chanfro); } catch (e) { recusar(`caixa com chanfro (${g.chanfro} mm): ${e.message.replace(/^deslocarContorno: /, '')}`); }
    const h = g.altura / 2;
    const secoes = [{ w: -h, perfil: topo }, { w: -h + g.chanfro, perfil: cheio }, { w: h - g.chanfro, perfil: cheio }, { w: h, perfil: topo }];
    const { volume } = cascoDeSecoes({ eixo: 'y', eixosDoPerfil: ['x', 'z'], secoes }, cols, al, 'caixa com chanfro');
    return aproximado(volume, 'caixa-com-chanfro-como-casco', volumeEmAneis(secoes),
      [perda('tipo', `a caixa de chanfro ${g.chanfro} mm vira o casco das quatro seções (topo, corpo, corpo, topo) que o esboço desenha; a forma não muda e o tipo deixa de ser caixa`)]);
  }
  const dim = [g.largura, g.altura, g.profundidade];
  const alinhados = al.filter(Boolean).length;
  if (alinhados === 3) {
    const dimensoes = [0, 0, 0];
    al.forEach((a, i) => { dimensoes[a.eixo] = dim[i]; });
    return { tipo: 'caixa', dimensoes: vetor(dimensoes) };
  }
  const i = al.findIndex(Boolean);
  if (i < 0) recusar(`caixa: ${SEM_ROTACAO_LIVRE}`);
  /* um eixo no lugar: a caixa é a extrusão desse eixo do retângulo das outras duas medidas, girado no plano */
  const k = al[i].eixo;
  const [a, b] = outrosEixos(i);
  const [p, q] = outrosEixos(k);
  const perfil = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sa, sb]) => {
    const ponto = [0, 1, 2].map((r) => sa * dim[a] / 2 * cols[a][r] + sb * dim[b] / 2 * cols[b][r]);
    return vetor([ponto[p], ponto[q]]);
  });
  return { tipo: 'extrusao', eixoExtrusao: EIXOS[k], eixosPerfil: [EIXOS[p], EIXOS[q]], comprimento: dim[i], perfil };
}

function volumeDoCilindro(g, cols, al) {
  const e = EIXOS.indexOf(g.eixo);
  const segmentos = g.lados ?? LADOS_DO_CILINDRO;
  const raio = g.diametro / 2;
  if (g.achatado) {
    /* o esboço corta o círculo de `segmentos` lados pelo plano do lado achatado: a extrusão do círculo cortado */
    if (!al[e]) recusar(`cilindro com face plana (achatado): ${SEM_ROTACAO_LIVRE}`);
    const [nomeU] = BASE_DO_EIXO[g.eixo];
    const lado = g.achatado.lado;
    const s = lado[0] === '+' ? 1 : -1;
    const noU = lado[1] === nomeU;
    const perfil = cortar(circuloN(raio, segmentos), noU ? [s, 0] : [0, s], raio - g.achatado.profundidade);
    const volume = volumeDaExtrusao({ eixo: g.eixo, eixosDoPerfil: BASE_DO_EIXO[g.eixo], comprimento: g.comprimento, perfil }, cols, al);
    return aproximado(volume, 'cilindro-achatado-como-extrusao', areaDe(perfil) * g.comprimento,
      [perda('tipo', `o cilindro com a face plana a ${g.achatado.profundidade} mm do lado ${lado} vira a extrusão do círculo de ${segmentos} lados cortado; a forma não muda e o tipo deixa de ser cilindro`)]);
  }
  if (al[e]) return { tipo: 'cilindro', eixo: EIXOS[al[e].eixo], raio, comprimento: g.comprimento, segmentos };
  const meio = g.comprimento / 2;
  const direcao = cols[e];
  return { tipo: 'tubo', caminho: [vetor(direcao.map((c) => -c * meio)), vetor(direcao.map((c) => c * meio))], raio, raioCurva: 0, segmentos };
}

function volumeDoAnel(g, _cols, al) {
  const e = EIXOS.indexOf(g.eixo);
  if (!al[e]) recusar(`anel: ${SEM_ROTACAO_LIVRE}`);
  const eixo = EIXOS[al[e].eixo];
  const segmentos = g.lados ?? LADOS_DO_CILINDRO;
  /* sem furo é um disco: o cilindro de comprimento igual à espessura */
  if (!(g.diametroInterno > 0)) return { tipo: 'cilindro', eixo, raio: g.diametroExterno / 2, comprimento: g.espessura, segmentos };
  return { tipo: 'anel', eixo, raioExterno: g.diametroExterno / 2, raioInterno: g.diametroInterno / 2, espessura: g.espessura, segmentos };
}

function volumeDoCone(g, _cols, al) {
  const e = EIXOS.indexOf(g.eixo);
  if (!al[e]) recusar(`cone: ${SEM_ROTACAO_LIVRE}`);
  const base = g.diametro / 2;
  const topo = (g.diametroTopo ?? 0) / 2;
  /* a base do esboço fica no começo do eixo local; com o eixo virado para o negativo do mundo ela fica no fim */
  const [raioBase, raioTopo] = al[e].sinal > 0 ? [base, topo] : [topo, base];
  return { tipo: 'cone', eixo: EIXOS[al[e].eixo], raioBase, raioTopo, comprimento: g.comprimento, segmentos: LADOS_DO_CILINDRO };
}

/* A esfera é igual girada: o polígono de 40 por 20 muda de fase, e o raio e o centro não. */
function volumeDaEsfera(g) {
  return { tipo: 'esfera', raio: g.diametro / 2, segmentos: LADOS_DA_ESFERA };
}

function volumeDaRevolucao(g, _cols, al) {
  const e = EIXOS.indexOf(g.eixo);
  if (!al[e]) recusar(`revolução: ${SEM_ROTACAO_LIVRE}`);
  /* a revolução `suave` traz as estações da curva do perfil: o desenho passa por elas, e a N2 liga as estações por troncos retos */
  let perfil = (g.estacoes ?? g.perfil).map((p) => [p.raio, p.altura]);
  if (al[e].sinal < 0) perfil = perfil.map(([raio, altura]) => [raio, -altura]).reverse();
  return { tipo: 'revolucao', eixo: EIXOS[al[e].eixo], perfil: perfil.map(vetor), segmentos: g.lados };
}

function volumeDaExtrusao(g, cols, al) {
  const e = EIXOS.indexOf(g.eixo);
  if (!al[e]) recusar(`extrusão: ${SEM_ROTACAO_LIVRE}`);
  const k = al[e].eixo;
  const [u, v] = g.eixosDoPerfil.map((n) => EIXOS.indexOf(n));
  const [p, q] = outrosEixos(k);
  const perfil = g.perfil.map(([pu, pv]) => {
    const ponto = [0, 1, 2].map((r) => pu * cols[u][r] + pv * cols[v][r]);
    return vetor([ponto[p], ponto[q]]);
  });
  return { tipo: 'extrusao', eixoExtrusao: EIXOS[k], eixosPerfil: [EIXOS[p], EIXOS[q]], comprimento: g.comprimento, perfil };
}

/* O casco por seções da N2 para uma lista de seções do esboço (`{ w, perfil, n? }`, o contorno de cada uma com o terceiro valor
   por ponto quando a seção está inclinada). A N2 pede o mesmo número de pontos em todas as seções, contorno convexo de área não
   nula e posição crescente. Devolve o volume e o que a conversão mexeu: seções inclinadas (o contorno é projetado no plano da
   seção, e a seção das pontas vai ao ponto mais extremo dela, para o envelope ao longo do eixo não encolher) e seções ponto
   (viram o polígono do vizinho a `FRACAO_DA_PONTA`). */
function cascoDeSecoes(g, cols, al, nome) {
  const e = EIXOS.indexOf(g.eixo);
  if (!al[e]) recusar(`${nome}: ${SEM_ROTACAO_LIVRE}`);
  const { eixo: k, sinal } = al[e];
  const [u, v] = g.eixosDoPerfil.map((n) => EIXOS.indexOf(n));
  const [p, q] = outrosEixos(k);
  const projetar = (perfil) => perfil.map(([pu, pv]) => {
    const ponto = [0, 1, 2].map((r) => pu * cols[u][r] + pv * cols[v][r]);
    return [ponto[p], ponto[q]];
  });
  let secoes = g.secoes.map((sc) => ({
    posicao: sinal * sc.w,
    pontos: projetar(sc.perfil),
    aoLongo: sc.perfil.map((pt) => sinal * (pt.length > 2 ? pt[2] : sc.w)),
    inclinada: anelInclinado(sc),
  }));
  if (sinal < 0) secoes = secoes.reverse();
  const quantidade = secoes[0].pontos.length;
  if (secoes.some((sc) => sc.pontos.length !== quantidade)) recusar(`${nome}: as seções têm números de pontos diferentes, e o casco da N2 exige o mesmo em todas`);
  const centroide = (pts) => [0, 1].map((i) => pts.reduce((s, pt) => s + pt[i], 0) / pts.length);
  const ampliadas = [];
  const comArea = secoes.map((sc) => areaDe(sc.pontos) > 1e-9);
  secoes.forEach((sc, i) => {
    if (comArea[i]) return;
    let vizinho = null;
    for (let d = 1; d < secoes.length && !vizinho; d++) vizinho = [i - d, i + d].filter((j) => comArea[j]).map((j) => secoes[j])[0] ?? null;
    if (!vizinho) recusar(`${nome}: todas as seções são pontos`);
    const [cx, cy] = centroide(sc.pontos);
    const [vx, vy] = centroide(vizinho.pontos);
    sc.pontos = vizinho.pontos.map(([x, y]) => [cx + (x - vx) * FRACAO_DA_PONTA, cy + (y - vy) * FRACAO_DA_PONTA]);
    ampliadas.push(i);
  });
  const inclinadas = secoes.filter((sc) => sc.inclinada).length;
  const movidas = [];
  const ultimo = secoes.length - 1;
  if (secoes[0].inclinada) { const alvo = Math.min(...secoes[0].aoLongo); if (alvo !== secoes[0].posicao) movidas.push(0); secoes[0].posicao = alvo; }
  if (secoes[ultimo].inclinada) { const alvo = Math.max(...secoes[ultimo].aoLongo); if (alvo !== secoes[ultimo].posicao) movidas.push(ultimo); secoes[ultimo].posicao = alvo; }
  const volume = {
    tipo: 'casco-secoes', eixoPercurso: EIXOS[k], eixosSecao: [EIXOS[p], EIXOS[q]],
    secoes: secoes.map((sc) => ({ posicao: arredondar(sc.posicao), perfil: sc.pontos.map(vetor) })),
  };
  return { volume, inclinadas, movidas, ampliadas };
}

function volumeDoLoft(g, cols, al) {
  if (!Array.isArray(g.secoes) || g.secoes.length < 2) recusar('loft sem seções: o casco da N2 precisa de duas ou mais');
  /* o loft `suave` traz as estações da curva, e o casco da N2 passa por elas (as seções declaradas são o que a curva liga) */
  const secoesDoCasco = g.estacoes ?? g.secoes;
  const { volume, inclinadas, movidas, ampliadas } = cascoDeSecoes({ ...g, secoes: secoesDoCasco }, cols, al, 'loft');
  const perdido = [];
  if (inclinadas > 0) {
    perdido.push(perda('inclinacao', `${inclinadas} seção(ões) inclinada(s): o contorno de cada uma foi projetado no plano perpendicular ao eixo${movidas.length ? `, e a seção da ponta foi levada ao ponto mais extremo dela para o envelope ao longo do eixo não encolher` : ''}`));
  }
  if (ampliadas.length > 0) perdido.push(perda('secao-ponto', `${ampliadas.length} seção(ões) ponto virou(ram) o polígono do vizinho a ${FRACAO_DA_PONTA * 100}%, porque o casco da N2 não aceita área nula`));
  const externo = volumeEmAneis(secoesDoCasco);
  let esboco = externo;
  if (g.casca) {
    const cavidade = volumeEmAneis(g.casca.cavidade);
    esboco -= cavidade;
    perdido.push(perda('casca', `a casca de ${g.casca.espessura} mm, aberta no ${g.casca.aberta}, virou o sólido externo cheio: a cavidade de ${casas(cavidade, 3)} mm3 deixa de existir`));
  }
  return aproximado(volume, 'loft-como-casco', esboco, perdido, g.casca ? externo : null);
}

/* A forma de família (a roda e o cilindro hidráulico do trem do avião, a asa): o esboço a desenha pela superfície que a família gera,
   e a N2 não tem superfície livre. O módulo entrega junto da geometria o casco por seções perpendiculares ao eixo principal da peça
   (o corte da superfície por cada plano, nos níveis das nervuras da malha e entre elas, em casco convexo de 48 pontos extremos), no mesmo formato de um loft
   sem casca, e a N2 recebe esse casco: o envelope e a silhueta de cada vista saem exatos até a faceta do raio, e o furo do cubo, a
   cavidade e a reentrância de cada seção deixam de existir, o que o relatório de perdas declara com o erro de volume medido contra o
   volume da superfície. */
function volumeDaFamilia(g, cols, al) {
  if (!Array.isArray(g.secoes) || g.secoes.length < 2) recusar('família sem o casco por seções: a N2 precisa de duas ou mais seções do sólido');
  const nome = `família ${g.familia}${g.perfil ? ` (perfil ${g.perfil})` : ''}`;
  const { volume } = cascoDeSecoes(g, cols, al, nome);
  return aproximado(volume, 'familia-como-casco', g.volume,
    [perda('superficie', `a superfície da ${nome} virou o casco convexo de ${g.secoes.length} seções perpendiculares ao eixo ${g.eixo}: o furo, as cavidades e as reentrâncias de cada seção deixam de existir, e as partes (${(g.partes ?? []).join(', ') || 'uma só'}) viram um sólido só`)]);
}

const POR_TIPO = {
  caixa: volumeDaCaixa, cilindro: volumeDoCilindro, anel: volumeDoAnel, cone: volumeDoCone, esfera: volumeDaEsfera,
  revolucao: volumeDaRevolucao, extrusao: volumeDaExtrusao, loft: volumeDoLoft, familia: volumeDaFamilia,
};
const FORA_DO_ESCOPO = {
  envolve: 'faixa que contorna círculos: a N2 não tem faixa',
};

/* O volume da N2 de uma forma e, quando é aproximado, `aproximacao` com o código, o volume do esboço e o que se perdeu. */
function traduzirForma(forma) {
  if (FORA_DO_ESCOPO[forma.tipo]) recusar(FORA_DO_ESCOPO[forma.tipo]);
  const g = forma.geometria;
  const cols = colunasDe(g.matriz);
  const al = cols.map(alinhada);
  const fazer = forma.tipo === 'tubo' ? (gg) => volumeDoTubo(gg, forma) : POR_TIPO[forma.tipo];
  if (!fazer) recusar(`tipo "${forma.tipo}" sem correspondência na N2`);
  const resultado = fazer(g, cols, al);
  const traduzida = resultado.aproximacao ? resultado : { volume: resultado, aproximacao: null };
  return g.recorte ? comRecorteIgnorado(traduzida, g.recorte) : traduzida;
}

/* A N2 não subtrai um volume de outro (o alojamento da roda na asa, a porta rebaixada no casco): a forma recortada vai ao andaime
   inteira, sem o vão, e a perda entra no relatório com o volume que o recorte tirava. O volume do esboço passa a ser o recortado, e
   por isso o erro de volume medido na blocagem é o volume do vão. */
function comRecorteIgnorado(traduzida, recorte) {
  const retirado = recorte.volumeCheioMm3 - recorte.volumeMm3;
  const quais = recorte.cortadores.map((c) => c.id).join(', ');
  const p = perda('recorte', `o recorte por ${quais} (${casas(retirado, 3)} mm3 retirados) não tem equivalente na N2, que não subtrai um volume de outro: o andaime leva a forma inteira, sem o vão`);
  const a = traduzida.aproximacao;
  if (a) return { volume: traduzida.volume, aproximacao: { ...a, volumeEsboco: a.volumeEsboco - retirado, perdido: [...a.perdido, p] } };
  return aproximado(traduzida.volume, 'recorte-ignorado', recorte.volumeMm3, [p]);
}

/* O tubo: o caminho do esboço já é o declarado (em mundo), e o N2 guarda os pontos relativos ao centro do volume. O canto sem raio
   de curva leva uma esfera no esboço e uma meia-esquadria na N2, que não são o mesmo sólido; a ponta reta de dois pontos é igual. */
function volumeDoTubo(g, forma) {
  const caminho = g.caminho.map((q) => vetor(q.map((c, i) => c - forma.geometria.centro[i])));
  const curva = g.raioCurva ?? 0;
  if (curva === 0 && caminho.length > 2) {
    recusar(`tubo com ${caminho.length - 2} canto(s) sem raio de curva: o esboço põe uma esfera na junta e a N2 uma meia-esquadria`);
  }
  return { tipo: 'tubo', caminho, raio: g.diametro / 2, raioCurva: curva, segmentos: LADOS_DO_TUBO };
}

/* A N2 é quem decide se o volume vale (lados, raio de curva, perfil simples...): um volume que ela recusa vai para a lista. */
function recusadoPelaN2(volume) {
  try {
    normalizarAndaimeGlobal({
      formato: FORMATO_ANDAIME_GLOBAL, id: 'verificacao', objetivo: 'verificacao', alvo: 'verificacao', familia: 'peca-mecanica',
      intencao: 'verificar um volume', unidade: 'mm', eixos: EIXOS_DO_MUNDO,
      envelope: { min: [0, 0, 0], max: [1, 1, 1] }, landmarks: [{ id: 'origem', posicao: [0, 0, 0] }], volumes: [volume],
    });
    return null;
  } catch (e) {
    if (e instanceof ErroFormaGlobal) return `a N2 recusa o volume: ${e.message.replace(/^volumes\[0\]\.?/, '')}`;
    throw e;
  }
}

/* ---------- o andaime ---------- */

function uniao(caixas) {
  return {
    min: [0, 1, 2].map((i) => Math.min(...caixas.map((c) => c.min[i]))),
    max: [0, 1, 2].map((i) => Math.max(...caixas.map((c) => c.max[i]))),
  };
}

function regioesDa(forma, slugsDeRegiao) {
  const nomes = [forma.unidade, forma.parte].filter((n) => typeof n === 'string' && n !== '');
  const slugs = [...new Set(nomes.map((n) => slugsDeRegiao.get(n)))].sort();
  return slugs.length > 0 ? slugs : [REGIAO_VAZIA];
}

const casas = (x, n) => { const f = 10 ** n; const r = Math.round(x * f) / f; return r === 0 ? 0 : r; };
const instanciaDe = (forma) => forma.origem?.componente?.instancia ?? null;
const porId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/* O erro do envelope do andaime contra o do esboço: o maior desvio de uma face em mm, e esse desvio sobre a extensão do esboço
   no eixo dele (o maior entre os seis). */
function erroDeEnvelope(andaime, esboco) {
  let mm = 0;
  let relativo = 0;
  for (let i = 0; i < 3; i++) {
    const extensao = esboco.max[i] - esboco.min[i];
    for (const d of [Math.abs(andaime.min[i] - esboco.min[i]), Math.abs(andaime.max[i] - esboco.max[i])]) {
      mm = Math.max(mm, d);
      if (extensao > 0) relativo = Math.max(relativo, d / extensao);
    }
  }
  return { mm: casas(mm, 6), relativo: casas(relativo, 9) };
}

/* Recolhe componentes ao envelope da forma principal até o andaime caber em `maximo` volumes. Os componentes de mais volumes vão
   primeiro, e só entra quem tem pelo menos dois (recolher um só não poupa nada). Tira de `entradas` e de `naoTraduzidas` as
   formas de cada componente recolhido e põe no lugar a caixa dele. Devolve as instâncias recolhidas. */
function recolherComponentes(entradas, naoTraduzidas, visiveis, maximo, ids, regioes) {
  const porInstancia = new Map();
  for (const f of visiveis) {
    const inst = instanciaDe(f);
    if (inst !== null) porInstancia.set(inst, [...(porInstancia.get(inst) ?? []), f]);
  }
  const contar = (membros) => entradas.filter((e) => membros.includes(e.forma)).length;
  const candidatos = [...porInstancia.entries()].map(([instancia, membros]) => ({ instancia, membros, volumes: contar(membros) }))
    .filter((c) => c.volumes >= 2).sort((a, b) => b.volumes - a.volumes || (a.instancia < b.instancia ? -1 : 1));
  const recolhidos = [];
  for (const c of candidatos) {
    if (entradas.length <= maximo) break;
    const principal = c.membros.filter((f) => f.origem.componente.principal === true).sort(porId)[0] ?? null;
    const caixa = principal ? principal.geometria.caixa : uniao(c.membros.map((f) => f.geometria.caixa));
    const dimensoes = vetor(caixa.max.map((x, i) => x - caixa.min[i]));
    if (dimensoes.some((d) => d <= 0)) continue;
    const dono = principal ?? [...c.membros].sort(porId)[0];
    const volume = {
      id: ids.get(dono.id), regioes: [...new Set(c.membros.flatMap((f) => regioesDa(f, regioes)))].sort(),
      centro: vetor(caixa.max.map((x, i) => (x + caixa.min[i]) / 2)), tipo: 'caixa', dimensoes,
    };
    const removidas = entradas.filter((e) => c.membros.includes(e.forma));
    for (const e of removidas) entradas.splice(entradas.indexOf(e), 1);
    for (let i = naoTraduzidas.length - 1; i >= 0; i--) if (c.membros.some((f) => f.id === naoTraduzidas[i].id)) naoTraduzidas.splice(i, 1);
    entradas.push({ forma: null, caixa, volume, aproximacao: null, recolhido: { instancia: c.instancia, principal: principal?.id ?? null, membros: c.membros, removidas } });
    recolhidos.push(c.instancia);
  }
  return recolhidos;
}

/* `dados` é `formasResolvidas(esboco, opcao)`. Opções: `id`, `objetivo`, `alvo`, `familia`, `intencao` e `eixos` do andaime
   (com padrão), `volumesMaximos` (o orçamento de volumes do alvo, 1000 por padrão, acima do qual os componentes com detalhe
   interno são recolhidos ao envelope da forma principal) e `estrito` para recusar o conjunto quando alguma forma visível não
   tem equivalente. Devolve `{ andaime, tabela, naoTraduzidas, perdas, ocultas }`: o andaime já aceito por
   `normalizarAndaimeGlobal`, a tabela id do esboço -> id do andaime, as formas visíveis que ficaram de fora (`{ id, tipo,
   motivo }`), o relatório de perdas de cada forma aproximada (ver `relatorioDePerdas`) e os ids das ocultas, que são
   referência do esboço e não geometria. */
export function traduzirFormasParaAndaime(dados, opcoes = {}) {
  if (!objeto(dados) || dados.formato !== FORMATO_FORMAS_RESOLVIDAS || !Array.isArray(dados.formas)) {
    throw new ErroDoTradutor(`o tradutor lê "${FORMATO_FORMAS_RESOLVIDAS}" (a saída de formasResolvidas), com "formas"`);
  }
  const maximo = opcoes.volumesMaximos ?? 1000;
  if (!Number.isInteger(maximo) || maximo < 1) throw new ErroDoTradutor(`"volumesMaximos" precisa ser um inteiro a partir de 1 (recebeu ${JSON.stringify(opcoes.volumesMaximos)})`);
  const visiveis = dados.formas.filter((f) => f.oculto !== true);
  const ocultas = dados.formas.filter((f) => f.oculto === true).map((f) => f.id);
  const ids = atribuirSlugs(visiveis.map((f) => f.id), 'forma');
  const regioes = atribuirSlugs([...new Set(visiveis.flatMap((f) => [f.unidade, f.parte]).filter((n) => typeof n === 'string' && n !== ''))], 'regiao');

  const entradas = [];
  const naoTraduzidas = [];
  for (const forma of visiveis) {
    let entrada = null;
    let motivo = null;
    try {
      const { volume: parte, aproximacao } = traduzirForma(forma);
      const volume = { id: ids.get(forma.id), regioes: regioesDa(forma, regioes), centro: vetor(forma.geometria.centro), ...parte };
      motivo = recusadoPelaN2(volume);
      entrada = { forma, caixa: forma.geometria.caixa, volume, aproximacao, recolhido: null };
    } catch (e) {
      if (!(e instanceof Recusa)) throw e;
      motivo = e.message;
    }
    if (motivo) naoTraduzidas.push({ id: forma.id, tipo: forma.tipo, motivo });
    else entradas.push(entrada);
  }

  if (opcoes.estrito === true && naoTraduzidas.length > 0) {
    throw new ErroDoTradutor(`${naoTraduzidas.length} forma(s) sem correspondência na N2: ${naoTraduzidas.map((n) => `${n.id} (${n.motivo})`).join('; ')}`, naoTraduzidas);
  }
  const recolhidos = entradas.length > maximo ? recolherComponentes(entradas, naoTraduzidas, visiveis, maximo, ids, regioes) : [];
  if (entradas.length > maximo) {
    throw new ErroDoTradutor(`o andaime tem ${entradas.length} volumes e o orçamento do alvo é ${maximo}, mesmo com ${recolhidos.length} componente(s) recolhido(s) ao envelope da forma principal`, naoTraduzidas);
  }
  if (entradas.length === 0) {
    throw new ErroDoTradutor(`nenhuma forma visível se traduz${naoTraduzidas.length ? `: ${naoTraduzidas.map((n) => `${n.id} (${n.motivo})`).join('; ')}` : ' (o esboço não tem forma visível)'}`, naoTraduzidas);
  }

  const envelope = uniao(entradas.map((e) => e.caixa));
  const centroDoConjunto = envelope.min.map((m, i) => (m + envelope.max[i]) / 2);
  const dentro = (p) => p.every((c, i) => c >= envelope.min[i] - 1e-9 && c <= envelope.max[i] + 1e-9);
  const pontos = Object.entries(dados.pontos ?? {}).filter(([, p]) => Array.isArray(p) && p.length === 3 && dentro(p));
  const slugsDePontos = atribuirSlugs(['centro-do-conjunto', ...pontos.map(([nome]) => nome)], 'ponto');
  const landmarks = [
    { id: slugsDePontos.get('centro-do-conjunto'), posicao: vetor(centroDoConjunto) },
    ...pontos.map(([nome, p]) => ({ id: slugsDePontos.get(nome), posicao: vetor(p) })),
  ];

  const rotuloDaOpcao = dados.opcao?.titulo ? slugDe(dados.opcao.titulo) : `opcao-${dados.opcao?.numero ?? 1}`;
  const aproximadas = entradas.filter((e) => e.aproximacao || e.recolhido);
  const cabecalho = {
    formato: FORMATO_ANDAIME_GLOBAL,
    id: opcoes.id ?? `andaime-${rotuloDaOpcao}`,
    objetivo: opcoes.objetivo ?? 'esboco-nivel-zero',
    alvo: opcoes.alvo ?? 'alvo-nivel-zero',
    familia: opcoes.familia ?? 'peca-mecanica',
    intencao: opcoes.intencao ?? `Andaime do nível zero derivado das formas resolvidas do esboço (${entradas.length} volumes, ${aproximadas.length} aproximados, ${naoTraduzidas.length} formas sem equivalente).`,
    unidade: 'mm',
    eixos: opcoes.eixos ?? EIXOS_DO_MUNDO,
    envelope: { min: vetor(envelope.min), max: vetor(envelope.max) },
    landmarks,
  };
  const andaime = normalizarAndaimeGlobal({ ...cabecalho, volumes: entradas.map((e) => e.volume) });

  const perdas = relatorioDePerdas(cabecalho, aproximadas);
  const destino = new Map();
  for (const e of entradas) {
    if (e.forma) destino.set(e.forma.id, e.volume.id);
    else for (const f of e.recolhido.membros) destino.set(f.id, e.volume.id);
  }

  return JSON.parse(JSON.stringify({
    andaime,
    tabela: Object.fromEntries(visiveis.filter((f) => destino.has(f.id)).map((f) => [f.id, destino.get(f.id)])),
    naoTraduzidas,
    perdas,
    ocultas,
  }));
}

/* O relatório de perdas, uma entrada por forma aproximada e por componente recolhido, em ordem de id:
   { id, tipo, aproximacao, volumeId, perdido: [{ codigo, descricao }], volumeEsboco, volumeAndaime, erroVolume: { mm3, relativo },
   envelopeEsboco, envelopeAndaime, erroEnvelope: { mm, relativo } }, e, no loft com casca, `volumeExternoEsboco` e
   `erroVolumeExterno` (o mesmo erro contra o sólido externo sem cavidade, que isola o que a inclinação ignorada custa). O volume e o envelope do andaime vêm da blocagem N2 do
   volume (compilada e medida aqui, não estimada); os do esboço, da conta sobre os dados da própria forma (a caixa, o cilindro
   e o loft) ou, no componente recolhido, da soma dos volumes das formas dele que se traduzem, medidos na blocagem delas. O
   `relativo` do volume é (andaime - esboço) / esboço, e o do envelope é o maior desvio de uma face sobre a extensão do esboço. */
function relatorioDePerdas(cabecalho, aproximadas) {
  if (aproximadas.length === 0) return [];
  const medidas = medirAndaime(cabecalho, aproximadas.map((e) => e.volume));
  const removidas = aproximadas.flatMap((e) => e.recolhido?.removidas ?? []);
  const antes = removidas.length > 0 ? medirAndaime(cabecalho, removidas.map((e) => e.volume)) : new Map();
  return aproximadas.map((e) => {
    const m = medidas.get(e.volume.id);
    const r = e.recolhido;
    const envelopeEsboco = r ? uniao(r.membros.map((f) => f.geometria.caixa)) : e.forma.geometria.caixa;
    const volumeEsboco = r ? r.removidas.reduce((soma, x) => soma + antes.get(x.volume.id).volume, 0) : e.aproximacao.volumeEsboco;
    const envelopeAndaime = { min: m.min, max: m.max };
    const perdido = r
      ? [perda('detalhe-interno', `${r.membros.length} forma(s) do componente ${r.instancia} (${r.membros.map((f) => f.id).sort().join(', ')}) passaram do orçamento de volumes e viraram uma caixa do envelope ${r.principal ? `da forma principal ${r.principal}` : 'do conjunto delas (o componente não declara forma principal)'}`)]
      : e.aproximacao.perdido;
    return {
      id: r ? r.instancia : e.forma.id,
      tipo: r ? 'componente' : e.forma.tipo,
      aproximacao: r ? 'componente-recolhido-ao-envelope' : e.aproximacao.codigo,
      volumeId: e.volume.id,
      ...(r ? { formas: r.membros.map((f) => f.id).sort() } : {}),
      perdido,
      volumeEsboco: casas(volumeEsboco, 3),
      volumeAndaime: casas(m.volume, 3),
      erroVolume: { mm3: casas(m.volume - volumeEsboco, 3), relativo: casas((m.volume - volumeEsboco) / volumeEsboco, 9) },
      ...(!r && e.aproximacao.volumeExterno !== null
        ? { volumeExternoEsboco: casas(e.aproximacao.volumeExterno, 3), erroVolumeExterno: { mm3: casas(m.volume - e.aproximacao.volumeExterno, 3), relativo: casas((m.volume - e.aproximacao.volumeExterno) / e.aproximacao.volumeExterno, 9) } }
        : {}),
      envelopeEsboco: { min: vetor(envelopeEsboco.min), max: vetor(envelopeEsboco.max) },
      envelopeAndaime: { min: vetor(envelopeAndaime.min), max: vetor(envelopeAndaime.max) },
      erroEnvelope: erroDeEnvelope(envelopeAndaime, envelopeEsboco),
    };
  }).sort(porId);
}
