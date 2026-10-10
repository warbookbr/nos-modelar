/* Tradutor do nível zero: lê as formas resolvidas do esboço (`mecanifica.formas-resolvidas@1`, dado puro) e gera o andaime da
   forma global N2 (`mecanifica.andaime-global@2`), que a receita detalhada refina por `REFINA`. Não importa o módulo do esboço,
   Three.js nem DOM: recebe o JSON e devolve JSON. Mesmas formas, mesmo andaime, byte a byte.

   Só entram os tipos com correspondência exata na N2: caixa sem raio, chanfro nem furo; cilindro (a haste `de`/`para` e a
   ligação `ligar` também); anel; cone; esfera; revolução; extrusão, convexa ou côncava; e tubo por pontos. O que a N2 não faz
   igual (loft, faixa, raio, chanfro e furo da caixa, face plana do cilindro, rotação que não deixa um eixo no lugar, medida
   que a N2 recusa) fica fora do andaime e volta em `naoTraduzidas` com o motivo, e `estrito: true` recusa o conjunto inteiro.
   Nada é aproximado em silêncio: uma forma ou está no andaime com a mesma geometria, ou está na lista.

   A orientação sai da `matriz` de cada forma (mundo = centro + matriz · local). Uma matriz que leva os três eixos da forma a
   eixos do mundo só reordena as medidas. Uma que deixa um eixo no lugar e gira os outros dois no plano dele gira o perfil: a
   caixa vira extrusão desse eixo e a extrusão gira o contorno. O cilindro fora dos eixos é o tubo de dois pontos. Cone, anel e
   revolução só aceitam o eixo da forma sobre um eixo do mundo, porque a N2 não os inclina. A esfera não depende da matriz.

   Os ids do andaime são slugs do id da forma (acento sai, `camelCase` e pontos viram hífen); dois ids que dão o mesmo slug
   ganham ambos um sufixo com o hash do id original, e por isso o slug não depende da ordem das formas. A tabela devolvida
   leva cada id do esboço ao do andaime. As regiões de um volume são a unidade e a parte da forma (`sem-regiao` sem as duas). */
import { ErroFormaGlobal } from './base-forma-global.js';
import { FORMATO_ANDAIME_GLOBAL, normalizarAndaimeGlobal } from './forma-global.js';

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

/* ---------- uma forma, um volume ---------- */

const SEM_ROTACAO_LIVRE = 'a rotação não deixa nenhum eixo da forma sobre um eixo do mundo (gira em dois eixos), e a N2 não inclina o sólido';

function volumeDaCaixa(g, cols, al) {
  if (g.raio > 0) recusar(`caixa com raio de canto (${g.raio} mm): o canto arredondado não é uma caixa`);
  if (g.chanfro > 0) recusar(`caixa com chanfro (${g.chanfro} mm): a aresta cortada não é uma caixa`);
  if (Array.isArray(g.furos) && g.furos.length > 0) recusar('caixa com furo: a N2 não tem cavidade em caixa');
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
  if (g.achatado) recusar('cilindro com face plana (achatado): a N2 não corta o círculo');
  const e = EIXOS.indexOf(g.eixo);
  const segmentos = g.lados ?? LADOS_DO_CILINDRO;
  const raio = g.diametro / 2;
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
  let perfil = g.perfil.map((p) => [p.raio, p.altura]);
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

/* O caminho do esboço já é o declarado (em mundo), e o N2 guarda os pontos relativos ao centro do volume. O canto sem raio de
   curva leva uma esfera no esboço e uma meia-esquadria na N2, que não são o mesmo sólido; a ponta reta de dois pontos é igual. */
function volumeDoTubo(g, forma) {
  const caminho = g.caminho.map((q) => vetor(q.map((c, i) => c - forma.geometria.centro[i])));
  const curva = g.raioCurva ?? 0;
  if (curva === 0 && caminho.length > 2) {
    recusar(`tubo com ${caminho.length - 2} canto(s) sem raio de curva: o esboço põe uma esfera na junta e a N2 uma meia-esquadria`);
  }
  return { tipo: 'tubo', caminho, raio: g.diametro / 2, raioCurva: curva, segmentos: LADOS_DO_TUBO };
}

const POR_TIPO = {
  caixa: volumeDaCaixa, cilindro: volumeDoCilindro, anel: volumeDoAnel, cone: volumeDoCone, esfera: volumeDaEsfera,
  revolucao: volumeDaRevolucao, extrusao: volumeDaExtrusao,
};
const FORA_DO_ESCOPO = {
  loft: 'loft (seção por seção): a N2 só tem o casco convexo, e o esboço pode ter casca, inclinação e seção côncava',
  envolve: 'faixa que contorna círculos: a N2 não tem faixa',
};

function volumeDaForma(forma) {
  if (FORA_DO_ESCOPO[forma.tipo]) recusar(FORA_DO_ESCOPO[forma.tipo]);
  const g = forma.geometria;
  const cols = colunasDe(g.matriz);
  const al = cols.map(alinhada);
  if (forma.tipo === 'tubo') return volumeDoTubo(g, forma);
  const fazer = POR_TIPO[forma.tipo];
  if (!fazer) recusar(`tipo "${forma.tipo}" sem correspondência na N2`);
  return fazer(g, cols, al);
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

/* `dados` é `formasResolvidas(esboco, opcao)`. Opções: `id`, `objetivo`, `alvo`, `familia`, `intencao` e `eixos` do andaime
   (com padrão), e `estrito` para recusar o conjunto quando alguma forma visível não se traduz. Devolve
   `{ andaime, tabela, naoTraduzidas, ocultas }`: o andaime já aceito por `normalizarAndaimeGlobal`, a tabela id do esboço ->
   id do andaime, as formas visíveis que ficaram de fora (`{ id, tipo, motivo }`) e os ids das ocultas, que são referência
   do esboço e não geometria. */
export function traduzirFormasParaAndaime(dados, opcoes = {}) {
  if (!objeto(dados) || dados.formato !== FORMATO_FORMAS_RESOLVIDAS || !Array.isArray(dados.formas)) {
    throw new ErroDoTradutor(`o tradutor lê "${FORMATO_FORMAS_RESOLVIDAS}" (a saída de formasResolvidas), com "formas"`);
  }
  const visiveis = dados.formas.filter((f) => f.oculto !== true);
  const ocultas = dados.formas.filter((f) => f.oculto === true).map((f) => f.id);
  const ids = atribuirSlugs(visiveis.map((f) => f.id), 'forma');
  const regioes = atribuirSlugs([...new Set(visiveis.flatMap((f) => [f.unidade, f.parte]).filter((n) => typeof n === 'string' && n !== ''))], 'regiao');

  const volumes = [];
  const traduzidas = [];
  const naoTraduzidas = [];
  for (const forma of visiveis) {
    let volume;
    let motivo = null;
    try {
      volume = { id: ids.get(forma.id), regioes: regioesDa(forma, regioes), centro: vetor(forma.geometria.centro), ...volumeDaForma(forma) };
      motivo = recusadoPelaN2(volume);
    } catch (e) {
      if (!(e instanceof Recusa)) throw e;
      motivo = e.message;
    }
    if (motivo) naoTraduzidas.push({ id: forma.id, tipo: forma.tipo, motivo });
    else { volumes.push(volume); traduzidas.push(forma); }
  }

  if (opcoes.estrito === true && naoTraduzidas.length > 0) {
    throw new ErroDoTradutor(`${naoTraduzidas.length} forma(s) sem correspondência exata na N2: ${naoTraduzidas.map((n) => `${n.id} (${n.motivo})`).join('; ')}`, naoTraduzidas);
  }
  if (volumes.length === 0) {
    throw new ErroDoTradutor(`nenhuma forma visível se traduz${naoTraduzidas.length ? `: ${naoTraduzidas.map((n) => `${n.id} (${n.motivo})`).join('; ')}` : ' (o esboço não tem forma visível)'}`, naoTraduzidas);
  }

  const envelope = uniao(traduzidas.map((f) => f.geometria.caixa));
  const centroDoConjunto = envelope.min.map((m, i) => (m + envelope.max[i]) / 2);
  const dentro = (p) => p.every((c, i) => c >= envelope.min[i] - 1e-9 && c <= envelope.max[i] + 1e-9);
  const pontos = Object.entries(dados.pontos ?? {}).filter(([, p]) => Array.isArray(p) && p.length === 3 && dentro(p));
  const slugsDePontos = atribuirSlugs(['centro-do-conjunto', ...pontos.map(([nome]) => nome)], 'ponto');
  const landmarks = [
    { id: slugsDePontos.get('centro-do-conjunto'), posicao: vetor(centroDoConjunto) },
    ...pontos.map(([nome, p]) => ({ id: slugsDePontos.get(nome), posicao: vetor(p) })),
  ];

  const rotuloDaOpcao = dados.opcao?.titulo ? slugDe(dados.opcao.titulo) : `opcao-${dados.opcao?.numero ?? 1}`;
  const andaime = normalizarAndaimeGlobal({
    formato: FORMATO_ANDAIME_GLOBAL,
    id: opcoes.id ?? `andaime-${rotuloDaOpcao}`,
    objetivo: opcoes.objetivo ?? 'esboco-nivel-zero',
    alvo: opcoes.alvo ?? 'alvo-nivel-zero',
    familia: opcoes.familia ?? 'peca-mecanica',
    intencao: opcoes.intencao ?? `Andaime do nível zero derivado das formas resolvidas do esboço (${volumes.length} volumes, ${naoTraduzidas.length} formas sem correspondência exata).`,
    unidade: 'mm',
    eixos: opcoes.eixos ?? EIXOS_DO_MUNDO,
    envelope: { min: vetor(envelope.min), max: vetor(envelope.max) },
    landmarks,
    volumes,
  });

  return {
    andaime: JSON.parse(JSON.stringify(andaime)),
    tabela: Object.fromEntries(traduzidas.map((f) => [f.id, ids.get(f.id)])),
    naoTraduzidas,
    ocultas,
  };
}
