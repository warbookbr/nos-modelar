/* pedido.js — o jeito de pedir um cabo sem conta: `cabo({ de, para, comprimento | folga, diametro, ... })`.

   O pedido diz as duas pontas em coordenada absoluta (milímetro), cada uma com a direção em que o cabo SAI dela, o comprimento do cabo ou a folga sobre a distância reta, o
   diâmetro e, por opção, as passagens (braçadeiras), os terminais e o feixe. O ajudante converte isso nos parâmetros da família `cabo` (a ponta B vira o deslocamento a partir
   da A, cada passagem o deslocamento a partir do ponto anterior) e devolve a lista de chamadas de composição, que a receita põe em `CHAMADAS_COMPOSICOES` (uma, para um cabo).
   O feixe tem a própria entrada, `feixeDeCabos`, que devolve as `poses` de `instanciaDeFamilia`. O que o pedido erra volta como `ErroChamadaDeFamilia` dizendo o recebido e o aceito, no vocabulário do pedido (de, para, passagens), e não no dos parâmetros.

   A folga do pedido é a razão sobre a distância reta pelas pontas e passagens (0,02 é 2%), de qualquer tamanho acima de zero: o ajudante a converte em comprimento. A folga mínima de
   0,3 da família é o piso do ponto mínimo da aprovação mecânica (todos os parâmetros no mínimo), e não um limite do cabo.

   O feixe põe de 2 a 6 cabos lado a lado, cada um uma instância com as mesmas pontas e passagens deslocadas de uma distância lateral. O eixo lateral é a normal do plano em que o cabo
   dobra, e por isso os cabos são cópias deslocadas uns dos outros; a distância medida entre os eixos de cada par tem de passar da soma dos raios, ou o pedido é recusado. */
import { ErroChamadaDeFamilia, chamar } from '../../../src/autoria/chamar-familia.js';
import { CABO, medidasDoCabo } from './definicao.js';
import { planejar } from './plano.js';
import { perpendicular, TIPOS_DE_TERMINAL } from './acessorios.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mult = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unitario = (a) => mult(a, 1 / norma(a));
const plano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export const CAMPOS_DO_PEDIDO = Object.freeze(['id', 'de', 'para', 'comprimento', 'folga', 'diametro', 'raioMinimo', 'caimento', 'lados', 'desvioMaximo', 'orcamentoDeFaces', 'passagens', 'bracadeiras', 'terminais', 'feixe']);
const CAMPOS_DO_FEIXE = ['diametros', 'folgaLateral', 'lateral'];
const EIXOS = Object.freeze({ '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1] });
export const MAXIMO_DE_CABOS_NO_FEIXE = 6;
const ALCANCE_DA_PONTA = 5000; const ALCANCE_DA_PERNA = 2000; const ALCANCE_DA_PASSAGEM = 700;

const recusar = (campo, valor, aceito) => { throw new ErroChamadaDeFamilia({ familia: 'cabo', campo, valor, aceito }); };
const mm = (x) => `${Number(x.toFixed(2))} mm`;

function ponto(valor, campo) {
  if (!Array.isArray(valor) || valor.length !== 3 || valor.some((x) => typeof x !== 'number' || !Number.isFinite(x))) recusar(campo, valor, 'um ponto [x, y, z] em milímetro, três números finitos');
  return valor;
}
function direcao(valor, campo) {
  const v = typeof valor === 'string' ? EIXOS[valor.trim().toLowerCase().replace(/^([xyz])$/, '+$1')] : valor;
  if (!v) recusar(campo, valor, `uma direção: um vetor [x, y, z] (em qualquer escala) ou um eixo, um de ${Object.keys(EIXOS).join(', ')}`);
  if (!Array.isArray(v) || v.length !== 3 || v.some((x) => typeof x !== 'number' || !Number.isFinite(x))) recusar(campo, valor, `uma direção: um vetor [x, y, z] (em qualquer escala) ou um eixo, um de ${Object.keys(EIXOS).join(', ')}`);
  if (norma(v) < 1e-9) recusar(campo, valor, 'uma direção não nula; é o vetor para onde o cabo segue, em qualquer escala');
  return unitario(v);
}
function numeroPositivo(valor, campo, aceito) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) recusar(campo, valor, aceito);
  return valor;
}
function extremidade(valor, campo, saida) {
  if (!plano(valor)) recusar(campo, valor, `{ ponto: [x, y, z], direcao: ${saida} }`);
  for (const chave of Object.keys(valor)) if (!['ponto', 'direcao'].includes(chave)) recusar(`${campo}.${chave}`, valor[chave], 'só ponto e direcao');
  return { ponto: ponto(valor.ponto, `${campo}.ponto`), direcao: direcao(valor.direcao, `${campo}.direcao`) };
}
function tipoDeTerminal(valor, campo) {
  if (valor === undefined || valor === null || valor === false) return 0;
  const i = TIPOS_DE_TERMINAL.indexOf(valor);
  if (i < 0) recusar(campo, valor, `um de ${TIPOS_DE_TERMINAL.slice(1).join(', ')} (ou nada, para a ponta sem terminal)`);
  return i;
}

/** Lê o pedido: as pontas, as passagens com as direções resolvidas, o comprimento e as opções, tudo validado, sem a conversão. */
function lerPedido(pedido) {
  if (!plano(pedido)) recusar('pedido', pedido, 'um objeto { de, para, comprimento | folga, diametro, ... }');
  for (const chave of Object.keys(pedido)) if (!CAMPOS_DO_PEDIDO.includes(chave)) recusar(`pedido.${chave}`, pedido[chave], `um campo do pedido: ${CAMPOS_DO_PEDIDO.join(', ')}`);
  const de = extremidade(pedido.de, 'pedido.de', 'para onde o cabo sai da ponta');
  const para = extremidade(pedido.para, 'pedido.para', 'para onde o cabo sai da ponta (de volta, para o lado do cabo)');
  const passagensBrutas = pedido.passagens ?? [];
  if (!Array.isArray(passagensBrutas) || passagensBrutas.length > 2) recusar('pedido.passagens', Array.isArray(passagensBrutas) ? `${passagensBrutas.length} passagens` : passagensBrutas, 'uma lista de 0 a 2 passagens { ponto, direcao? }; para mais braçadeiras, divida o cabo em dois pedidos');
  const pontos = [de.ponto, ...passagensBrutas.map((q, i) => (plano(q) ? ponto(q.ponto, `pedido.passagens[${i}].ponto`) : recusar(`pedido.passagens[${i}]`, q, '{ ponto: [x, y, z], direcao?: ... }'))), para.ponto];
  const passagens = passagensBrutas.map((q, i) => {
    for (const chave of Object.keys(q)) if (!['ponto', 'direcao'].includes(chave)) recusar(`pedido.passagens[${i}].${chave}`, q[chave], 'só ponto e direcao');
    /* sem direção, o cabo passa pela braçadeira na direção da corda entre os pontos vizinhos do percurso */
    const d = q.direcao === undefined ? sub(pontos[i + 2], pontos[i]) : q.direcao;
    return { ponto: pontos[i + 1], direcao: direcao(d, `pedido.passagens[${i}].direcao`) };
  });
  if (pedido.comprimento !== undefined && pedido.folga !== undefined) recusar('pedido.folga', pedido.folga, 'folga ou comprimento, um só: a folga conta sobre a distância reta e o comprimento é o do cabo');
  const quanto = (alvo, campo) => { for (let q = 0; q < 3; q += 1) if (Math.abs(alvo[q]) > ALCANCE_DA_PONTA) recusar(campo, alvo, `pontos dentro de ${ALCANCE_DA_PONTA} mm da origem em cada eixo`); };
  quanto(de.ponto, 'pedido.de.ponto'); quanto(para.ponto, 'pedido.para.ponto');
  for (let i = 1; i < pontos.length; i += 1) {
    const salto = sub(pontos[i], pontos[i - 1]);
    const ultimo = i === pontos.length - 1;
    const alcance = ultimo ? ALCANCE_DA_PERNA : ALCANCE_DA_PASSAGEM;
    if (salto.some((x) => Math.abs(x) > alcance)) {
      recusar(ultimo ? 'pedido.para.ponto' : `pedido.passagens[${i - 1}].ponto`, pontos[i], `um ponto a até ${alcance} mm, em cada eixo, do ponto anterior do percurso (${pontos[i - 1].map((x) => Number(x.toFixed(1))).join(', ')})`);
    }
  }
  let cadeia = 0; for (let i = 1; i < pontos.length; i += 1) cadeia += norma(sub(pontos[i], pontos[i - 1]));
  let comprimento;
  if (pedido.comprimento !== undefined) {
    comprimento = numeroPositivo(pedido.comprimento, 'pedido.comprimento', 'o comprimento do cabo em milímetro, um número positivo');
    if (comprimento < cadeia) recusar('pedido.comprimento', comprimento, `um comprimento de ao menos ${mm(cadeia)}, a distância reta ${passagens.length ? 'pelos pontos' : 'entre as pontas'}; um cabo não encurta`);
  } else {
    const folga = pedido.folga === undefined ? 0.3 : pedido.folga;
    if (typeof folga !== 'number' || !Number.isFinite(folga) || folga < 0) recusar('pedido.folga', folga, 'a folga como razão sobre a distância reta (0,3 é 30%), zero ou mais');
    comprimento = cadeia * (1 + folga);
  }
  if (comprimento > 12000) recusar('pedido.comprimento', Number(comprimento.toFixed(1)), 'um cabo de até 12000 mm');
  const total = sub(para.ponto, de.ponto);
  if (total.some((x) => Math.abs(x) > ALCANCE_DA_PERNA)) recusar('pedido.para.ponto', para.ponto, `um ponto a até ${ALCANCE_DA_PERNA} mm, em cada eixo, da ponta de`);
  const terminais = plano(pedido.terminais) ? pedido.terminais : (pedido.terminais === undefined ? {} : recusar('pedido.terminais', pedido.terminais, '{ de: "capa" | "olhal", para: "capa" | "olhal" }'));
  for (const chave of Object.keys(terminais)) if (!['de', 'para'].includes(chave)) recusar(`pedido.terminais.${chave}`, terminais[chave], 'só de e para');
  return { de, para, passagens, comprimento, cadeia, terminalDe: tipoDeTerminal(terminais.de, 'pedido.terminais.de'), terminalPara: tipoDeTerminal(terminais.para, 'pedido.terminais.para') };
}

/** Os parâmetros da família `cabo` de UM cabo do pedido (sem o feixe), em milímetro. */
export function parametrosDoCabo(pedido) {
  const lido = lerPedido(pedido);
  return converter(pedido, lido, pedido.diametro ?? 6, lido.de.ponto);
}

function converter(pedido, lido, diametro, inicio) {
  const { de, para, passagens } = lido;
  const deslocamento = sub(inicio, de.ponto);
  const A = inicio;
  const B = soma(para.ponto, deslocamento);
  const parametros = {
    ax: A[0], ay: A[1], az: A[2], adx: de.direcao[0], ady: de.direcao[1], adz: de.direcao[2],
    dx: B[0] - A[0], dy: B[1] - A[1], dz: B[2] - A[2], bdx: para.direcao[0], bdy: para.direcao[1], bdz: para.direcao[2],
    comprimento: lido.comprimento, diametro,
  };
  for (const chave of ['raioMinimo', 'caimento', 'lados', 'desvioMaximo']) if (pedido[chave] !== undefined) parametros[chave] = pedido[chave];
  if (pedido.orcamentoDeFaces !== undefined) parametros.orcamentoDeFaces = pedido.orcamentoDeFaces;
  if (passagens.length) {
    parametros.passagens = passagens.length;
    let anterior = de.ponto;
    passagens.forEach((q, i) => {
      const k = i + 1;
      const salto = sub(q.ponto, anterior);
      Object.assign(parametros, { [`p${k}x`]: salto[0], [`p${k}y`]: salto[1], [`p${k}z`]: salto[2], [`p${k}dx`]: q.direcao[0], [`p${k}dy`]: q.direcao[1], [`p${k}dz`]: q.direcao[2] });
      anterior = q.ponto;
    });
    if (pedido.bracadeiras) parametros.bracadeiras = 1;
  } else if (pedido.bracadeiras) recusar('pedido.bracadeiras', pedido.bracadeiras, 'braçadeiras só com passagens: a braçadeira fica no ponto de cada passagem; dê passagens ou tire bracadeiras');
  if (lido.terminalDe) parametros.terminalA = lido.terminalDe;
  if (lido.terminalPara) parametros.terminalB = lido.terminalPara;
  return parametros;
}

/* A normal do plano em que o cabo dobra: a soma dos giros entre as tangentes das estações. Reto, ou dobrando em todas as direções, volta uma perpendicular à saída de A. */
function eixoLateral(parametros) {
  const plan = planejar(Object.fromEntries(Object.entries(CABO.contrato.parametros).map(([nome, def]) => [nome, parametros[nome] ?? def.padrao])));
  const t = []; for (let i = 1; i < plan.pontos.length; i += 1) t.push(unitario(sub(plan.pontos[i], plan.pontos[i - 1])));
  let eixo = [0, 0, 0]; for (let i = 1; i < t.length; i += 1) eixo = soma(eixo, cruz(t[i - 1], t[i]));
  return norma(eixo) > 1e-6 ? unitario(eixo) : perpendicular(plan.dA);
}

/* A menor distância entre dois pontos de duas polilinhas (segmento contra segmento, por amostras finas de cada trecho). */
function distanciaMinima(a, b) {
  const aSub = []; const bSub = [];
  const amostrar = (linha, saida) => { for (let i = 0; i + 1 < linha.length; i += 1) for (let k = 0; k < 4; k += 1) saida.push(soma(mult(linha[i], 1 - k / 4), mult(linha[i + 1], k / 4))); saida.push(linha.at(-1)); };
  amostrar(a, aSub); amostrar(b, bSub);
  let menor = Infinity;
  for (const p of aSub) for (const q of bSub) { const d = norma(sub(p, q)); if (d < menor) menor = d; }
  return menor;
}

/**
 * O pedido de um cabo ou de um feixe: devolve a lista de chamadas de composição (`CHAMADAS_COMPOSICOES`), uma por cabo.
 *   cabo({ de: { ponto: [0, 0, 0], direcao: '+x' }, para: { ponto: [150, 40, 0], direcao: '-x' }, folga: 0.4, diametro: 4, lados: 8 })
 * `id` (padrão 'cabo') nomeia a chamada; no feixe os cabos são `<id>-1`, `<id>-2`, ...
 */
export function cabo(pedido) {
  if (plano(pedido) && pedido.feixe !== undefined) recusar('pedido.feixe', pedido.feixe, 'nada em cabo(): o feixe são várias instâncias da família, e duas chamadas na mesma receita repetem os ids; use feixeDeCabos(pedido) e passe `poses` a instanciaDeFamilia');
  const { parametros, ids } = parametrosDoPedido(pedido);
  return Object.freeze(parametros.map((p, i) => chamar(CABO, ids[i], p)));
}

/**
 * O pedido de um feixe: as `poses` que `instanciaDeFamilia` (tools/modelar/instancia-de-familia.mjs) recebe, uma por cabo, com os parâmetros, o id, o nome das partes (`<parte>-<k>`) e o prefixo das
 * portas (`cabo-<k>`); mais a soma das faces, o eixo lateral e o deslocamento do eixo de cada cabo.
 *   instanciaDeFamilia({ familia: 'cabo', poses: feixeDeCabos({ de, para, comprimento, feixe: { diametros: [4, 3, 3] } }).poses }).passos
 */
export function feixeDeCabos(pedido) {
  if (!plano(pedido) || pedido.feixe === undefined) recusar('pedido.feixe', pedido?.feixe, '{ diametros: [d1, d2, ...], folgaLateral?, lateral? }');
  const { parametros, ids, faces, lateral, centros } = parametrosDoPedido(pedido);
  const poses = parametros.map((parametrosDoCabo, k) => ({ id: ids[k], parametros: parametrosDoCabo, nomes: (nome) => `${nome}-${k + 1}`, portaPrefixo: `cabo-${k + 1}` }));
  return Object.freeze({ poses: Object.freeze(poses), faces, lateral, centros, cabos: parametros });
}

/** Os parâmetros da família de cada cabo do pedido (um por cabo do feixe) e os ids das chamadas; o feixe é conferido aqui. */
export function parametrosDoPedido(pedido) {
  const lido = lerPedido(pedido);
  const id = pedido.id ?? 'cabo';
  if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id)) recusar('pedido.id', id, 'um identificador em minúsculas, números e hífen, começando por letra');
  if (pedido.feixe === undefined) return { parametros: [converter(pedido, lido, pedido.diametro ?? 6, lido.de.ponto)], ids: [id] };

  const feixe = pedido.feixe;
  if (!plano(feixe)) recusar('pedido.feixe', feixe, '{ diametros: [d1, d2, ...], folgaLateral?, lateral? }');
  for (const chave of Object.keys(feixe)) if (!CAMPOS_DO_FEIXE.includes(chave)) recusar(`pedido.feixe.${chave}`, feixe[chave], `um campo do feixe: ${CAMPOS_DO_FEIXE.join(', ')}`);
  if (pedido.diametro !== undefined) recusar('pedido.diametro', pedido.diametro, 'nada: com feixe, o diâmetro de cada cabo é feixe.diametros');
  const diametros = feixe.diametros;
  if (!Array.isArray(diametros) || diametros.length < 2 || diametros.length > MAXIMO_DE_CABOS_NO_FEIXE) recusar('pedido.feixe.diametros', diametros, `uma lista de 2 a ${MAXIMO_DE_CABOS_NO_FEIXE} diâmetros em milímetro, um por cabo`);
  diametros.forEach((d, i) => numeroPositivo(d, `pedido.feixe.diametros[${i}]`, 'um diâmetro positivo em milímetro'));
  const folgaLateral = feixe.folgaLateral === undefined ? 0.5 : feixe.folgaLateral;
  if (typeof folgaLateral !== 'number' || !Number.isFinite(folgaLateral) || folgaLateral < 0) recusar('pedido.feixe.folgaLateral', folgaLateral, 'a distância entre as superfícies de dois cabos vizinhos, em milímetro, zero ou mais');
  const orcamento = pedido.orcamentoDeFaces ?? 4000;

  /* a largura do feixe e o deslocamento do eixo de cada cabo, com o feixe centrado no eixo pedido */
  const largura = diametros.reduce((s, d) => s + d, 0) + folgaLateral * (diametros.length - 1);
  const centros = []; let cursor = -largura / 2;
  diametros.forEach((d) => { centros.push(cursor + d / 2); cursor += d + folgaLateral; });
  const pedidoDoCentral = { ...pedido, feixe: undefined, orcamentoDeFaces: 0 };
  const central = converter(pedidoDoCentral, lido, Math.max(...diametros), lido.de.ponto);
  const lateral = feixe.lateral === undefined ? eixoLateral(central) : direcao(feixe.lateral, 'pedido.feixe.lateral');

  const parametros = diametros.map((d, i) => converter({ ...pedido, orcamentoDeFaces: 0 }, lido, d, soma(lido.de.ponto, mult(lateral, centros[i]))));
  const medidas = parametros.map((p) => medidasDoCabo(p));
  const planos = parametros.map((p) => planejar(Object.fromEntries(Object.entries(CABO.contrato.parametros).map(([nome, def]) => [nome, p[nome] ?? def.padrao]))));
  for (let i = 0; i < diametros.length; i += 1) for (let j = i + 1; j < diametros.length; j += 1) {
    const distancia = distanciaMinima(planos[i].pontos, planos[j].pontos);
    const soRaios = (diametros[i] + diametros[j]) / 2;
    if (distancia < soRaios) {
      recusar('pedido.feixe.folgaLateral', folgaLateral, `cabos que não se atravessam: o eixo do cabo ${i + 1} chega a ${mm(distancia)} do eixo do cabo ${j + 1} e a soma dos raios é ${mm(soRaios)}; o plano em que o cabo dobra não é o que o eixo lateral supõe, dê feixe.lateral (a normal do plano de dobra) ou afaste os cabos com folgaLateral`);
    }
  }
  const faces = medidas.map((m) => m.faces); const total = faces.reduce((s, x) => s + x, 0);
  if (orcamento > 0 && total > orcamento) {
    recusar('pedido.orcamentoDeFaces', orcamento, `ao menos ${total} faces, a soma dos ${diametros.length} cabos (${faces.join(' + ')}); o orçamento vale para o feixe inteiro: aumente orcamentoDeFaces, aumente desvioMaximo, reduza os lados ou tire cabos`);
  }
  return { parametros, ids: diametros.map((_, i) => `${id}-${i + 1}`), faces: total, lateral, centros };
}

/** As medidas do pedido: de cada cabo o comprimento de corte, as faces e o raio mínimo, e a soma das faces. */
export function medidasDoPedido(pedido) {
  const { parametros, faces } = parametrosDoPedido(pedido);
  const cabos = parametros.map((p) => medidasDoCabo(p));
  return Object.freeze({ cabos, faces: faces ?? cabos[0].faces });
}
