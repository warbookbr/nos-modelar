#!/usr/bin/env node
/* silhueta-pedida.mjs — quanto a malha de uma parte se afasta do corpo pedido a `lacosPelasVistas`, faixa por faixa de altura.
 *
 * POR QUE ELE EXISTE. Um corpo feito por `lacosPelasVistas` e `gaiolaPorLacos` vira malha pela subdivisão, e a superfície lisa não
 * passa pelos laços: entre dois laços ela pode encolher, ondular depois de um degrau da silhueta ou, com `compensar`, sair do
 * contorno. A comparação por cor diz quanto da imagem coincide e não diz onde nem quanto em mm; a medida ficava num script solto.
 *
 * O QUE ELE FAZ. Corta a malha da parte por planos perpendiculares ao eixo da altura (`--eixo`, padrão y), um a cada `--passo` mm
 * entre a primeira e a última estação (ou entre `--de` e `--ate`), e pede a `lacosPelasVistas` o laço daquela altura com as mesmas
 * vistas, trocando só as estações. Em cada faixa compara a seção da malha com o laço pedido em três medidas, cada uma com o desvio
 * em mm e positivo para fora: a meia largura de cada lado do centro; as duas pontas na lateral do centro (o início, no menor
 * comprimento, e o fim, no maior); e as pontas nos cantos, nas laterais centro ± f vezes a meia largura pedida para cada f de
 * `--laterais` (padrão 0,0.9, em que 0 é o centro). O desvio da ponta é a distância do ponto pedido à seção, e não só ao longo do
 * comprimento, que no canto da planta cresceria com a inclinação dela. Sai o pior desvio, com a faixa e a medida em que ele está.
 * O desvio para dentro maior que `--recorte` mm (padrão 50) é um recorte (um vão, um rebaixo cortado depois do corpo): sai à parte,
 * em blocos de faixas seguidas com a lateral e a profundidade, e fica fora do pior, para não esconder o encolhimento da malha.
 * A primeira e a última estação costumam cair no arredondamento dos vincos da subdivisão; `--de` e `--ate` tiram as pontas.
 *
 * O LIMITE. Mede o corpo contra o que foi pedido às três vistas. O corte raso, mais raso que `--recorte`, não se separa do
 * encolhimento e entra no pior; o encolhimento mais fundo que ele seria tomado por recorte. O número diz onde olhar; não aprova forma, que quem aprova é a pessoa.
 *
 * Uso: node tools/modelar/silhueta-pedida.mjs --esboco <arquivo.esboco.mjs> --parte <nome> --vistas <export> [--opcao 1] [--eixo y]
 *        [--passo 10] [--de <mm>] [--ate <mm>] [--laterais 0,0.9] [--recorte 50] [--saida <arquivo.json>]
 * O esboço é o módulo do `esboco:nucleo`, e `--vistas` é o nome do objeto que ele exporta e passa a `lacosPelasVistas`. Sai 0 com a
 * medida, e 2 em argumento ruim ou esboço recusado. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lacosPelasVistas } from '../../procedural/nucleo/lacos-pelas-vistas.js';

export class ErroDaSilhueta extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroDaSilhueta'; }
}

/* o eixo da altura e, na ordem x, y, z, os dois outros, que são o [l, c] do laço (a convenção de `gaiolaPorLacos`) */
const EIXOS = { x: [0, [1, 2]], y: [1, [0, 2]], z: [2, [0, 1]] };
export const PASSO_PADRAO = 10;
export const LATERAIS_PADRAO = Object.freeze([0, 0.9]);
export const RECORTE_PADRAO = 50;
const br = (n, casas = 1) => (Number.isFinite(n) ? n.toFixed(casas).replace('.', ',') : '—');

/** Os segmentos [[l, c], [l, c]] da seção das faces pelo plano em que a coordenada `eixo` vale `h`. */
export function secao(faces, eixo, h) {
  const [e, [iu, iv]] = EIXOS[eixo];
  const segmentos = [];
  for (const f of faces) {
    const p = f.pts; const cortes = [];
    for (let i = 0; i < p.length; i += 1) {
      const a = p[i]; const b = p[(i + 1) % p.length];
      const da = a[e] - h; const db = b[e] - h;
      /* meio aberto: o ponto no plano conta como de cima, e cada cruzamento entra uma vez */
      if ((da >= 0) === (db >= 0)) continue;
      const t = da / (da - db);
      cortes.push([a[iu] + (b[iu] - a[iu]) * t, a[iv] + (b[iv] - a[iv]) * t]);
    }
    for (let k = 0; k + 1 < cortes.length; k += 2) segmentos.push([cortes[k], cortes[k + 1]]);
  }
  return segmentos;
}

/** Os valores de c em que os segmentos cruzam a lateral l, em crescente. */
function naLateral(segmentos, l) {
  const cs = [];
  for (const [a, b] of segmentos) {
    const da = a[0] - l; const db = b[0] - l;
    if ((da >= 0) === (db >= 0)) continue;
    cs.push(a[1] + (b[1] - a[1]) * (da / (da - db)));
  }
  return cs.sort((x, y) => x - y);
}

/** O c de uma polilinha [[l, c], ...] na lateral l, pela reta entre os dois pontos vizinhos; fora dela, null. */
function cDaPolilinha(pts, l) {
  for (let i = 1; i < pts.length; i += 1) {
    const [l0, c0] = pts[i - 1]; const [l1, c1] = pts[i];
    if ((l - l0) * (l - l1) <= 0) return l1 === l0 ? Math.min(c0, c1) : c0 + (c1 - c0) * ((l - l0) / (l1 - l0));
  }
  return null;
}

/* a distância do ponto ao segmento mais próximo da seção */
function distanciaASecao(segmentos, p) {
  let d2 = Infinity;
  for (const [a, b] of segmentos) {
    const ux = b[0] - a[0]; const uv = b[1] - a[1]; const L = ux * ux + uv * uv;
    const t = L > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * ux + (p[1] - a[1]) * uv) / L)) : 0;
    const dx = a[0] + ux * t - p[0]; const dy = a[1] + uv * t - p[1];
    if (dx * dx + dy * dy < d2) d2 = dx * dx + dy * dy;
  }
  return Math.sqrt(d2);
}

/** A meia largura medida da seção, de cada lado do centro, e as pontas nas laterais pedidas. O desvio da ponta é a distância do
 *  ponto pedido à seção, positiva quando o ponto fica dentro da malha (a malha passa para fora): na lateral em que a planta é
 *  inclinada, a diferença só ao longo do comprimento cresceria com a inclinação. */
function medirFaixa(segmentos, laco, centro, laterais) {
  const inicio = laco.trechos.inicio; const fim = [...laco.trechos.fim].sort((a, b) => a[0] - b[0]);
  const ls = inicio.map((p) => p[0]);
  const pedidaDireita = Math.max(...ls) - centro; const pedidaEsquerda = centro - Math.min(...ls);
  const w = Math.min(pedidaDireita, pedidaEsquerda);
  let uMin = Infinity; let uMax = -Infinity;
  for (const s of segmentos) for (const p of s) { if (p[0] < uMin) uMin = p[0]; if (p[0] > uMax) uMax = p[0]; }
  const medidas = [
    { medida: 'meia largura à direita', lateral: null, pedido: pedidaDireita, medido: uMax - centro, desvio: uMax - centro - pedidaDireita },
    { medida: 'meia largura à esquerda', lateral: null, pedido: pedidaEsquerda, medido: centro - uMin, desvio: centro - uMin - pedidaEsquerda },
  ];
  const pontas = [];
  for (const f of laterais) {
    if (f === 0) pontas.push(['centro', centro]);
    else pontas.push([`${br(f * 100, 0)}% à direita`, centro + f * w], [`${br(f * 100, 0)}% à esquerda`, centro - f * w]);
  }
  for (const [onde, l] of pontas) {
    const cs = naLateral(segmentos, l);
    for (const [nome, polilinha, ponta] of [['início', inicio, 0], ['fim', fim, 1]]) {
      const pedido = cDaPolilinha(polilinha, l);
      const medido = cs.length ? cs[ponta ? cs.length - 1 : 0] : null;
      let desvio = null;
      if (pedido !== null) {
        const dentro = cs.filter((c) => c < pedido).length % 2 === 1;
        desvio = (dentro ? 1 : -1) * distanciaASecao(segmentos, [l, pedido]);
      }
      medidas.push({ medida: `${nome} no ${onde}`, lateral: l, pedido, medido, desvio });
    }
  }
  return medidas;
}

/**
 * A malha das faces contra o corpo pedido às vistas, por faixa de altura.
 * @param {Array<{ pts: number[][] }>} faces  as faces da parte, em mm
 * @param {object} vistas  o objeto passado a `lacosPelasVistas` (lado, perfil, planta, estacoes e as opções dele)
 * @returns {{ faixas: Array<{ altura, medidas }>, pior: { altura, medida, lateral, pedido, medido, desvio } | null, piorPorMedida, semMalha: number[] }}
 */
export function silhuetaPedida(faces, vistas, { eixo = 'y', passo = PASSO_PADRAO, de = null, ate = null, laterais = LATERAIS_PADRAO, recorte = RECORTE_PADRAO } = {}) {
  if (!EIXOS[eixo]) throw new ErroDaSilhueta(`eixo é x, y ou z, e veio ${JSON.stringify(eixo)}`);
  if (!(passo > 0)) throw new ErroDaSilhueta('o passo precisa ser maior que zero');
  if (!Array.isArray(laterais) || !laterais.length || !laterais.every((f) => f >= 0 && f < 1)) throw new ErroDaSilhueta('as laterais são frações da meia largura, de 0 (o centro) até menos que 1');
  if (!(recorte > 0)) throw new ErroDaSilhueta('o recorte precisa ser maior que zero, em mm');
  if (!faces.length) throw new ErroDaSilhueta('a parte não tem faces');
  const est = vistas?.estacoes;
  if (!Array.isArray(est) || est.length < 2) throw new ErroDaSilhueta('as vistas precisam das estacoes, como em lacosPelasVistas');
  const a0 = de ?? est[0]; const a1 = ate ?? est[est.length - 1];
  if (!(a1 > a0)) throw new ErroDaSilhueta(`a faixa de alturas vai de ${br(a0)} a ${br(a1)} mm; precisa crescer`);
  const n = Math.max(1, Math.round((a1 - a0) / passo));
  const alturas = Array.from({ length: n + 1 }, (_, i) => Math.round((a0 + ((a1 - a0) * i) / n) * 1000) / 1000);
  /* as estações fora do intervalo pedido entram no laço das pontas e saem de novo: a medida é só do intervalo */
  const pedido = lacosPelasVistas({ ...vistas, estacoes: alturas });
  const centro = vistas.centro ?? 0;
  const faixas = []; const semMalha = [];
  pedido.lacos.forEach((laco, i) => {
    const segmentos = secao(faces, eixo, alturas[i]);
    if (!segmentos.length) { semMalha.push(alturas[i]); return; }
    const medidas = medirFaixa(segmentos, laco, centro, laterais).map((m) => ({ ...m, recorte: m.desvio !== null && m.desvio < -recorte }));
    faixas.push({ altura: alturas[i], medidas });
  });
  let pior = null; const piorPorMedida = {};
  for (const f of faixas) for (const m of f.medidas) {
    if (m.desvio === null || m.pedido === null || m.recorte) continue;
    const item = { altura: f.altura, ...m };
    if (!pior || Math.abs(m.desvio) > Math.abs(pior.desvio)) pior = item;
    if (!piorPorMedida[m.medida] || Math.abs(m.desvio) > Math.abs(piorPorMedida[m.medida].desvio)) piorPorMedida[m.medida] = item;
  }
  /* os recortes de cada medida em faixas seguidas viram um bloco: as alturas, a lateral e a profundidade do mais fundo */
  const recortes = []; const aberto = {};
  faixas.forEach((f, i) => {
    for (const m of f.medidas) {
      const bloco = aberto[m.medida];
      if (!m.recorte) { delete aberto[m.medida]; continue; }
      if (bloco && bloco.indice === i - 1) {
        bloco.ate = f.altura; bloco.indice = i; bloco.faixas += 1;
        if (-m.desvio > bloco.profundidade) Object.assign(bloco, { profundidade: -m.desvio, lateral: m.lateral, altura: f.altura });
      } else {
        const novo = { medida: m.medida, de: f.altura, ate: f.altura, faixas: 1, lateral: m.lateral, altura: f.altura, profundidade: -m.desvio, indice: i };
        recortes.push(novo); aberto[m.medida] = novo;
      }
    }
  });
  for (const b of recortes) delete b.indice;
  return { eixo, passo, de: a0, ate: a1, laterais, centro, recorte, faixas, pior, piorPorMedida, recortes, semMalha, avisosDoPedido: pedido.avisos };
}

/** O texto curto: o pior desvio, o pior de cada medida e as faixas em que a malha não chega. */
export function relatar(r, titulo = '') {
  const linha = (m) => `${m.medida}${m.lateral === null ? '' : ` (lateral ${br(m.lateral, 0)})`}, na altura ${br(m.altura)} mm: ${br(m.desvio)} mm (pedido ${br(m.pedido)}, medido ${br(m.medido)})`;
  const saida = [];
  if (titulo) saida.push(titulo);
  saida.push(`${r.faixas.length} faixas de ${br(r.de)} a ${br(r.ate)} mm no eixo ${r.eixo}, a cada ${br(r.passo)} mm; desvio positivo para fora do pedido`);
  saida.push(r.pior ? `pior: ${linha(r.pior)}` : 'pior: nenhuma medida');
  for (const m of Object.values(r.piorPorMedida)) saida.push(`  ${linha(m)}`);
  if (r.recortes.length) {
    saida.push(`recortes (para dentro mais de ${br(r.recorte, 0)} mm, fora do pior): ${r.recortes.length}`);
    for (const b of r.recortes) saida.push(`  ${b.medida}${b.lateral === null ? '' : ` (lateral ${br(b.lateral, 0)})`}, de ${br(b.de)} a ${br(b.ate)} mm (${b.faixas} faixas): até ${br(b.profundidade)} mm, na altura ${br(b.altura)}`);
  }
  if (r.semMalha.length) saida.push(`sem malha em ${r.semMalha.length} faixas: ${r.semMalha.map((a) => br(a)).join(', ')} mm`);
  return `${saida.join('\n')}\n`;
}

const AJUDA = `node tools/modelar/silhueta-pedida.mjs --esboco <arquivo.esboco.mjs> --parte <nome> --vistas <export>
    [--opcao 1] [--eixo y] [--passo ${PASSO_PADRAO}] [--de <mm>] [--ate <mm>] [--laterais ${LATERAIS_PADRAO.join(',')}] [--recorte ${RECORTE_PADRAO}] [--saida <arquivo.json>]

Corta a malha da parte por faixa de altura e compara cada seção com o laço que lacosPelasVistas dá para as vistas exportadas pelo
módulo: a meia largura de cada lado, as duas pontas no centro e as pontas nas laterais (centro ± f vezes a meia largura). Sai o
pior desvio em mm, positivo para fora, com a faixa e a medida. O desvio para dentro maior que o recorte sai à parte, como corte feito
depois do corpo, e fica fora do pior. O número informa,
não aprova forma.`;

/* os argumentos como --nome valor ou --nome=valor */
function lerArgumentos(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 1) {
    const x = argv[i];
    if (!x.startsWith('--')) throw new ErroDaSilhueta(`argumento sem nome: ${x}`);
    const igual = x.indexOf('=');
    if (igual > 0) { a[x.slice(2, igual)] = x.slice(igual + 1); continue; }
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new ErroDaSilhueta(`${x} espera um valor`);
    a[x.slice(2)] = v; i += 1;
  }
  return a;
}

export async function executar(argv) {
  if (!argv.length || argv.includes('--ajuda') || argv.includes('--help')) return { codigo: 0, stdout: `${AJUDA}\n`, stderr: '' };
  try {
    const a = lerArgumentos(argv);
    for (const k of ['esboco', 'parte', 'vistas']) if (!a[k]) throw new ErroDaSilhueta(`falta --${k}`);
    const numero = (k, padrao) => {
      if (a[k] === undefined) return padrao;
      const n = Number(a[k]); if (!Number.isFinite(n)) throw new ErroDaSilhueta(`--${k} espera um número`);
      return n;
    };
    const arquivo = resolve(a.esboco);
    const modulo = await import(pathToFileURL(arquivo).href);
    const vistas = modulo[a.vistas];
    if (!vistas || typeof vistas !== 'object' || !vistas.lado || !vistas.planta) {
      const candidatos = Object.keys(modulo).filter((k) => modulo[k] && typeof modulo[k] === 'object' && modulo[k].lado && modulo[k].planta);
      throw new ErroDaSilhueta(`o módulo não exporta vistas com o nome ${a.vistas}${candidatos.length ? ` (exporta ${candidatos.join(', ')})` : ''}`);
    }
    const { lerArquivoDeEsboco, montarOpcoes } = await import('./esboco-nucleo.mjs');
    const { facesDaOpcao } = await import('./vista-rapida.mjs');
    const montado = montarOpcoes(await lerArquivoDeEsboco(arquivo), { nome: basename(arquivo), relato: false });
    if (montado.recusas?.length) throw new ErroDaSilhueta(`o esboço foi recusado:\n${montado.recusas.map((r) => `- ${r.motivo ?? r}`).join('\n')}`);
    const n = numero('opcao', 1);
    const painel = montado.paineis[n - 1];
    if (!painel) throw new ErroDaSilhueta(`o esboço tem ${montado.paineis.length} opções`);
    if (!painel.partes.includes(a.parte)) throw new ErroDaSilhueta(`a parte "${a.parte}" não existe na opção (${painel.partes.join(', ')})`);
    const faces = facesDaOpcao(painel.neutro).filter((f) => f.parte === a.parte);
    const r = silhuetaPedida(faces, vistas, {
      eixo: a.eixo ?? 'y', passo: numero('passo', PASSO_PADRAO), de: numero('de', null), ate: numero('ate', null), laterais: a.laterais === undefined ? [...LATERAIS_PADRAO] : a.laterais.split(',').map(Number), recorte: numero('recorte', RECORTE_PADRAO),
    });
    const resultado = { esboco: a.esboco, parte: a.parte, vistas: a.vistas, opcao: n, faces: faces.length, ...r };
    let fim = '';
    if (a.saida) {
      const destino = resolve(a.saida);
      mkdirSync(dirname(destino), { recursive: true });
      writeFileSync(destino, `${JSON.stringify(resultado, null, 2)}\n`);
      fim = `${destino}\n`;
    }
    return { codigo: 0, stdout: `${relatar(r, `${a.parte} contra ${a.vistas} (${faces.length} faces)`)}${fim}`, stderr: '' };
  } catch (erro) {
    if (erro instanceof ErroDaSilhueta || erro?.code === 'ENOENT' || erro?.code === 'ERR_MODULE_NOT_FOUND' || erro instanceof SyntaxError
      || /^lacosPelasVistas:/.test(erro?.message ?? '')) return { codigo: 2, stdout: '', stderr: `silhueta:pedida: ${erro.message}\n` };
    throw erro;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await executar(process.argv.slice(2));
  process.stdout.write(r.stdout); process.stderr.write(r.stderr); process.exitCode = r.codigo;
}
