/* composicoes.js — as composições da família `polia-e-correia`, uma por número de pontos do perfil, porque a composição v1
   só substitui valores: a dentada de vão curvo e de vão trapezoidal, cada uma com e sem flanges, a polia em V de um a quatro canais e a lisa.

   O corpo é o `lathe` de uma seção fechada em torno de y, com o furo. Na dentada, o canal de um dente é uma `extrusao` em
   [x, z], repetida em volta do eixo por `arranja` radial (o total é o número de dentes), e o `subtrair` tira os canais do
   corpo. A parte é `polia`, e a porta `eixo` é o anel do furo na face de baixo do cubo. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { PONTOS_DO_FUNDO } from './geometria.js';

export const idDaDentada = (forma, comFlanges) => `polia-e-correia.dentada-${forma}-${comFlanges ? 'com' : 'sem'}-flanges`;
export const idDaV = (canais) => `polia-e-correia.v-${canais}`;
export const ID_DA_LISA = 'polia-e-correia.lisa';
export const MAXIMO_DE_CANAIS = 4;
export const LADOS = 96;
/* pontos do vão do dente: o curvo tem a meia-volta do fundo, o trapézio só os dois cantos */
export const PONTOS_DO_VAO = Object.freeze({ curva: PONTOS_DO_FUNDO + 6, trapezio: 6 });

const p = (nome) => ({ parametro: nome });
const origem = (op, id, extra = {}) => ({ origem: { op, id, ...extra } });
const perfilPorParametros = (n) => Array.from({ length: n }, (_, k) => [p(`r${k}`), p(`y${k}`)]);
const nomesDoPerfil = (n) => Array.from({ length: n }, (_, k) => [[`r${k}`, 'numero'], [`y${k}`, 'numero']]).flat();
const BASE = [['raioDoFuro', 'numero'], ['raioDoCubo', 'numero'], ['altura', 'numero']];

const corpo = (n) => ({ id: 'corpo', operacao: 'lathe', argumentos: { origemId: 10, lados: LADOS, perfil: perfilPorParametros(n) } });
const porta = (de) => ({
  id: 'porta-eixo', operacao: 'publicarPorta',
  argumentos: {
    id: 'eixo', de,
    interface: { forma: 'anel', papel: 'recebe', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: p('raioDoFuro'), raioExterno: p('raioDoCubo'), inicio: 0, fim: p('altura') },
  },
});
const parte = (sel) => ({ id: 'parte-da-polia', operacao: 'parte', argumentos: { nome: 'polia', sel } });

const composicao = (id, nomes, nos) => Object.freeze({
  formato: FORMATO_COMPOSICAO_PROCEDURAL, id, versao: '1.0.0', parametros: Object.fromEntries(nomes.map(([nome, tipo]) => [nome, { tipo }])),
  artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1', 'mecanifica.porta@1'] }, nos,
});

/* pontos do perfil fechado (com o primeiro repetido no fim) */
const PONTOS_COM_FLANGES = 11;
const PONTOS_SEM_FLANGES = 7;
const pontosDaV = (canais) => 4 + 4 * canais + 3;

function dentada(forma, comFlanges) {
  const n = comFlanges ? PONTOS_COM_FLANGES : PONTOS_SEM_FLANGES;
  const PONTOS_DO_CANAL = PONTOS_DO_VAO[forma];
  const CANAL = { op: 'extrusao', id: 20 };
  const RESULTADO = { op: 'subtrair', id: 30 };
  return composicao(idDaDentada(forma, comFlanges), [
    ...BASE, ...nomesDoPerfil(n),
    ...Array.from({ length: PONTOS_DO_CANAL }, (_, k) => [[`cx${k}`, 'numero'], [`cz${k}`, 'numero']]).flat(),
    ['alturaDoCanal', 'numero'], ['emCanal', 'vetor3'], ['dentes', 'inteiro'], ['grausEntreDentes', 'numero'],
  ], [
    corpo(n),
    { id: 'canal', operacao: 'extrusao', argumentos: { origemId: 20, perfil: Array.from({ length: PONTOS_DO_CANAL }, (_, k) => [p(`cx${k}`), p(`cz${k}`)]), altura: p('alturaDoCanal'), em: p('emCanal') } },
    { id: 'canais', operacao: 'arranja', argumentos: { modo: 'radial', total: p('dentes'), eixo: 'y', graus: p('grausEntreDentes'), pivo: [0, 0, 0], origemId: 21, derivaDe: CANAL, sel: { origem: CANAL } } },
    { id: 'dentes', operacao: 'subtrair', argumentos: { origemId: 30, solidos: [origem('lathe', 10), { origem: CANAL }, origem('arranja', 21, { de: CANAL })] } },
    parte({ origem: RESULTADO }),
    porta(RESULTADO),
  ]);
}

const revolucao = (id, n) => composicao(id, [...BASE, ...nomesDoPerfil(n)], [corpo(n), parte(origem('lathe', 10)), porta({ op: 'lathe', id: 10 })]);

export const COMPOSICOES = Object.freeze([
  ...['curva', 'trapezio'].flatMap((forma) => [dentada(forma, false), dentada(forma, true)]),
  ...Array.from({ length: MAXIMO_DE_CANAIS }, (_, k) => revolucao(idDaV(k + 1), pontosDaV(k + 1))),
  revolucao(ID_DA_LISA, PONTOS_SEM_FLANGES),
]);
