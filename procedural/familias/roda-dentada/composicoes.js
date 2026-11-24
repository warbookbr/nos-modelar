/* composicoes.js — a composição da família `roda-dentada`: a coroa por `lathe` da seção com o furo e o cubo, e o vão de
   um dente por `extrusao` em [x, z], repetido em volta do eixo por `arranja` radial (o total é o número de dentes) e tirado
   por `subtrair`, como a `engrenagem`. A parte é `roda`, e a porta `furo` é o furo, medido da ponta do cubo para dentro. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { LADOS_DA_COROA, PONTOS_DO_VAO } from './geometria.js';

export const ID_DA_RODA = 'roda-dentada.simples';
const p = (nome) => ({ parametro: nome });
const lista = (prefixo, n) => Array.from({ length: n }, (_, k) => [p(`${prefixo}u${k}`), p(`${prefixo}v${k}`)]);
const nomes = (prefixo, n) => Array.from({ length: n }, (_, k) => [[`${prefixo}u${k}`, 'numero'], [`${prefixo}v${k}`, 'numero']]).flat();
const VAO = { op: 'extrusao', id: 20 };

export const COMPOSICOES = Object.freeze([Object.freeze({
  formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_DA_RODA, versao: '1.0.0',
  parametros: Object.fromEntries([
    ...nomes('g', PONTOS_DO_VAO), ...nomes('c', 7),
    ['alturaDoVao', 'numero'], ['emVao', 'vetor3'], ['dentes', 'inteiro'], ['passoAngular', 'numero'],
    ['raioDoFuro', 'numero'], ['raioDoCubo', 'numero'], ['comprimentoTotal', 'numero'], ['pontaDoCubo', 'vetor3'],
  ].map(([nome, tipo]) => [nome, { tipo }])),
  artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1', 'mecanifica.porta@1'] },
  nos: [
    { id: 'coroa', operacao: 'lathe', argumentos: { origemId: 10, lados: LADOS_DA_COROA, perfil: lista('c', 7) } },
    { id: 'vao', operacao: 'extrusao', argumentos: { origemId: 20, perfil: lista('g', PONTOS_DO_VAO), altura: p('alturaDoVao'), em: p('emVao') } },
    { id: 'vaos', operacao: 'arranja', argumentos: { modo: 'radial', total: p('dentes'), graus: p('passoAngular'), eixo: 'y', pivo: [0, 0, 0], origemId: 21, derivaDe: VAO, sel: { origem: VAO } } },
    { id: 'dentada', operacao: 'subtrair', argumentos: { origemId: 30, solidos: [{ origem: { op: 'lathe', id: 10 } }, { origem: VAO }, { origem: { op: 'arranja', id: 21, de: VAO } }] } },
    { id: 'parte', operacao: 'parte', argumentos: { nome: 'roda', sel: { origem: { op: 'subtrair', id: 30 } } } },
    { id: 'porta-furo', operacao: 'publicarPorta', argumentos: { id: 'furo', de: { op: 'subtrair', id: 30 }, interface: { forma: 'anel', papel: 'recebe', eixo: [0, -1, 0], centro: p('pontaDoCubo'), raioInterno: p('raioDoFuro'), raioExterno: p('raioDoCubo'), inicio: 0, fim: p('comprimentoTotal') } } },
  ],
})]);
