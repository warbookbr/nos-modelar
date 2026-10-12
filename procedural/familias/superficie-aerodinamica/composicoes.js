/* composicoes.js — as composições da família `superficie-aerodinamica`: a superfície (semi ou inteira, com ou sem comando) e a
   hélice.

   A superfície é um `loft` do núcleo com o contorno de cada seção escrito ponto a ponto: o `derivar` calcula os pontos (o perfil
   NACA, a corda, a torção, o enflechamento, o entalhe do comando) e a composição, que só substitui valores, os recebe como
   parâmetros de posição. As seções são fixas por composição (o `loft` guarda 1000 vértices e 1000 faces por passo), de modo que há
   uma composição por forma de lista de seções: a semi-superfície ou a inteira (a metade espelhada pelo plano de simetria), sem ou
   com comando. As pontas do `loft` (a raiz da semi-superfície, a ponta e as duas pontas do comando) fecham numa corda, e a
   corda chega como quatro números.

   Três partes: `fixa` (a superfície inteira, com o entalhe do comando), `comando` (o do lado direito, ou o único) e `comandoE`
   (o do esquerdo, só na superfície inteira). O comando gira em torno do eixo da dobradiça por cinco giros em torno de eixos do
   mundo, e o ângulo de cada um chega pronto: os dois primeiros põem o eixo sobre x, o terceiro é a deflexão, e os dois últimos desfazem
   os primeiros. As duas portas são `raiz` (o plano da raiz) e `eixo-da-dobradica` (o cilindro do eixo, no comando se há comando e
   na parte fixa se não há).

   A hélice junta, em torno do eixo z, a pá (o mesmo `loft` de uma semi-superfície sem comando, com a raiz dentro do cubo) repetida
   por `arranja`, o cubo (um tambor) e o cone (uma ogiva), os dois de revolução. As portas são o plano traseiro do cubo (`raiz`) e o
   eixo de giro (`eixo-da-dobradica`), o cilindro do cubo. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { LADOS_DA_SECAO, LADOS_DO_COMANDO } from './geometria.js';
import { contagemDeSecoes } from './superficie.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const PORTA = 'mecanifica.porta@1';

export const LADOS_DO_CUBO = 48;
export const PONTOS_DA_OGIVA = 14;
/* o ângulo limite do sombreamento liso: a quina mais fechada que ele (o bordo de fuga, a face do cubo) fica nítida */
export const ANGULO_DO_LISO = 60;

/** O id da composição de superfície: a semi ou a inteira, sem ou com comando. */
export const idDaSuperficie = ({ simetria, comando }) => `superficie-aerodinamica.${simetria ? 'inteira' : 'semi'}${comando ? '-com-comando' : ''}`;
export const ID_DA_HELICE = 'superficie-aerodinamica.helice';

/* os nomes dos parâmetros de posição: o grupo de seções (`f` a parte fixa ou a pá, `cD` e `cE` os comandos), o índice da seção e o
   do ponto ou da ponta da corda */
export const nomeDaPosicao = (grupo, i) => `${grupo}Pos${i}`;
export const nomeDoPonto = (grupo, i, k) => `${grupo}S${i}P${k}`;
export const nomeDaCorda = (grupo, i, k) => `${grupo}S${i}E${k}`;
/* os cinco giros do comando e o pivô */
export const nomeDoGiro = (lado, k) => `giro${lado}${k}`;
export const nomeDoPivo = (lado) => `pivo${lado}`;

const p = (nome) => ({ parametro: nome });
const OPERACAO = (op, id) => ({ op, id });

/** Quais seções de cada `loft` são uma corda: a raiz da semi-superfície e a ponta; no comando, as duas pontas. */
export function tiposDasSecoes({ simetria, comando }) {
  const { fixa, comando: noComando } = contagemDeSecoes({ simetria, comando });
  const doFixo = Array.from({ length: fixa }, (_, i) => ((!simetria && i === 0) || i === fixa - 1 ? 'corda' : 'anel'));
  const doComando = Array.from({ length: noComando }, (_, i) => (i === 0 || i === noComando - 1 ? 'corda' : 'anel'));
  return { fixa: doFixo, comando: doComando };
}

function parametrosDasSecoes(grupo, tipos, lados) {
  const parametros = {};
  tipos.forEach((tipo, i) => {
    parametros[nomeDaPosicao(grupo, i)] = { tipo: 'vetor3' };
    if (tipo === 'corda') for (let k = 0; k < 4; k++) parametros[nomeDaCorda(grupo, i, k)] = { tipo: 'numero' };
    else for (let k = 0; k < lados; k++) parametros[nomeDoPonto(grupo, i, k)] = { tipo: 'vetor3' };
  });
  return parametros;
}

function noDoLoft({ id, grupo, origemId, tipos, lados }) {
  const secoes = tipos.map((tipo, i) => (tipo === 'corda'
    ? { pos: p(nomeDaPosicao(grupo, i)), aresta: [[p(nomeDaCorda(grupo, i, 0)), p(nomeDaCorda(grupo, i, 1))], [p(nomeDaCorda(grupo, i, 2)), p(nomeDaCorda(grupo, i, 3))]] }
    : { pos: p(nomeDaPosicao(grupo, i)), contorno: Array.from({ length: lados }, (_, k) => p(nomeDoPonto(grupo, i, k))) }));
  return { id, operacao: 'loft', argumentos: { origemId, secoes, lados, orientacao: p('orientacaoDoMundo') } };
}

const parteDe = (id, nome, origem) => ({ id: `parte-${id}`, operacao: 'parte', argumentos: { nome, sel: { origem } } });
const materialDe = (id, usa, origem) => ({ id: `material-${id}`, operacao: 'material', argumentos: { usa, sel: { origem } } });
const solidoDe = (id, origem) => ({ id: `solido-${id}`, operacao: 'solido', argumentos: { sel: { origem } } });
const lisoDe = (id, origem) => ({ id: `liso-${id}`, operacao: 'liso', argumentos: { angulo: ANGULO_DO_LISO, sel: { origem } } });
const corpo = (id, nome, material, origem) => [parteDe(id, nome, origem), materialDe(id, material, origem), solidoDe(id, origem), lisoDe(id, origem)];

function portaDaRaiz(de) {
  return {
    id: 'porta-raiz', operacao: 'publicarPorta',
    argumentos: {
      id: 'raiz', de,
      interface: { forma: 'plano', papel: 'apoia', ponto: p('pontoDaRaiz'), normal: p('normalDaRaiz'), extensao: [p('larguraDaRaiz'), p('comprimentoDaRaiz')], referencia: p('referenciaDaRaiz') },
    },
  };
}
const portaDoEixo = (de) => ({
  id: 'porta-eixo', operacao: 'publicarPorta',
  argumentos: {
    id: 'eixo-da-dobradica', de,
    interface: { forma: 'cilindro', papel: 'externa', eixo: p('eixoDoEixo'), centro: p('centroDoEixo'), raio: p('raioDoEixo'), inicio: p('inicioDoEixo'), fim: p('fimDoEixo') },
  },
});

const PARAMETROS_COMUNS = {
  orientacaoDoMundo: { tipo: 'vetor3' },
  materialDaPele: { tipo: 'texto', padrao: 'aluminio' },
  pontoDaRaiz: { tipo: 'vetor3' },
  normalDaRaiz: { tipo: 'vetor3' },
  referenciaDaRaiz: { tipo: 'vetor3' },
  larguraDaRaiz: { tipo: 'numero' },
  comprimentoDaRaiz: { tipo: 'numero' },
  eixoDoEixo: { tipo: 'vetor3' },
  centroDoEixo: { tipo: 'vetor3' },
  raioDoEixo: { tipo: 'numero' },
  inicioDoEixo: { tipo: 'numero' },
  fimDoEixo: { tipo: 'numero' },
};

function comporSuperficie({ simetria, comando }) {
  const tipos = tiposDasSecoes({ simetria, comando });
  const comandos = comando ? ['D', ...(simetria ? ['E'] : [])] : [];
  const parametros = { ...PARAMETROS_COMUNS, ...parametrosDasSecoes('f', tipos.fixa, LADOS_DA_SECAO) };
  if (simetria) parametros.eixoDoEspelho = { tipo: 'texto', padrao: 'x' };
  const FIXA = OPERACAO('loft', 1);
  const nos = [noDoLoft({ id: 'superficie-fixa', grupo: 'f', origemId: 1, tipos: tipos.fixa, lados: LADOS_DA_SECAO }), ...corpo('fixa', 'fixa', p('materialDaPele'), FIXA)];
  let alvoDoEixo = FIXA;
  comandos.forEach((lado, k) => {
    const grupo = `c${lado}`;
    Object.assign(parametros, parametrosDasSecoes(grupo, tipos.comando, LADOS_DO_COMANDO));
    parametros[nomeDoPivo(lado)] = { tipo: 'vetor3' };
    for (let g = 0; g < 5; g++) parametros[nomeDoGiro(lado, g)] = { tipo: 'numero' };
    const origem = OPERACAO('loft', 2 + k);
    const nome = lado === 'D' ? 'comando' : 'comandoE';
    nos.push(noDoLoft({ id: `comando-${lado.toLowerCase()}`, grupo, origemId: 2 + k, tipos: tipos.comando, lados: LADOS_DO_COMANDO }), ...corpo(`comando-${lado.toLowerCase()}`, nome, p('materialDaPele'), origem));
    ['y', 'z', 'x', 'z', 'y'].forEach((eixo, g) => nos.push({
      id: `giro-${lado.toLowerCase()}-${g}`, operacao: 'rotaciona', argumentos: { eixo, graus: p(nomeDoGiro(lado, g)), pivo: p(nomeDoPivo(lado)), sel: { grupo: nome } },
    }));
    if (k === 0) alvoDoEixo = origem;
  });
  if (simetria) nos.push({ id: 'espelho', operacao: 'espelha', argumentos: { eixo: p('eixoDoEspelho'), pos: 0, sel: { grupo: 'fixa' } } });
  nos.push(portaDaRaiz(FIXA), portaDoEixo(alvoDoEixo));
  return Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL, id: idDaSuperficie({ simetria, comando }), versao: '1.0.0', parametros,
    artefatos: { entra: [], sai: [MALHA, PARTE, PORTA] }, nos,
  });
}

/* a hélice: a pá (a semi-superfície sem comando), o cubo e o cone */
function comporHelice() {
  const tipos = tiposDasSecoes({ simetria: 0, comando: 0 }).fixa;
  const parametros = {
    ...PARAMETROS_COMUNS, ...parametrosDasSecoes('f', tipos, LADOS_DA_SECAO),
    materialDoCubo: { tipo: 'texto', padrao: 'aco' },
    pas: { tipo: 'inteiro' },
    passoDasPas: { tipo: 'numero' },
    ladosDoCubo: { tipo: 'inteiro', padrao: LADOS_DO_CUBO },
  };
  for (let k = 0; k < PONTOS_DA_OGIVA + 2; k++) parametros[`cone${k}`] = { tipo: 'vetor3' };
  for (let k = 0; k < 4; k++) parametros[`cubo${k}`] = { tipo: 'vetor3' };
  const PA = OPERACAO('loft', 1);
  const REPETICAO = { op: 'arranja', id: 2, de: PA };
  const CONE = OPERACAO('lathe', 3);
  const CUBO = OPERACAO('lathe', 4);
  const nos = [
    noDoLoft({ id: 'pa', grupo: 'f', origemId: 1, tipos, lados: LADOS_DA_SECAO }),
    {
      id: 'repeticao-das-pas', operacao: 'arranja',
      argumentos: { modo: 'radial', total: p('pas'), eixo: 'z', graus: p('passoDasPas'), pivo: [0, 0, 0], origemId: 2, derivaDe: PA, sel: { origem: PA } },
    },
    ...corpo('pa', 'pas', p('materialDaPele'), PA),
    ...corpo('pas-copias', 'pas', p('materialDaPele'), REPETICAO),
    {
      id: 'revolucao-cone', operacao: 'lathe',
      argumentos: { origemId: 3, eixo: 'z', lados: p('ladosDoCubo'), perfil: Array.from({ length: PONTOS_DA_OGIVA + 2 }, (_, k) => p(`cone${k}`)) },
    },
    ...corpo('cone', 'cone', p('materialDoCubo'), CONE),
    {
      id: 'revolucao-cubo', operacao: 'lathe',
      argumentos: { origemId: 4, eixo: 'z', lados: p('ladosDoCubo'), perfil: Array.from({ length: 4 }, (_, k) => p(`cubo${k}`)) },
    },
    ...corpo('cubo', 'cubo', p('materialDoCubo'), CUBO),
    portaDaRaiz(CUBO), portaDoEixo(CUBO),
  ];
  return Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_DA_HELICE, versao: '1.0.0', parametros,
    artefatos: { entra: [], sai: [MALHA, PARTE, PORTA] }, nos,
  });
}

export const COMPOSICOES = Object.freeze([
  ...[0, 1].flatMap((simetria) => [0, 1].map((comando) => comporSuperficie({ simetria, comando }))),
  comporHelice(),
]);
