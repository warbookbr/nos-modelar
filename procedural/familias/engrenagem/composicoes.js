/* composicoes.js — as composições da família `engrenagem`, uma por número de pontos do vão: a reta (vão evolvente) e a
   catraca (vão de dente de serra). O corpo é o `lathe` de uma seção fechada em torno de y, com o furo e o cubo; o vão de um
   dente é uma `extrusao` em [x, z], repetida em volta do eixo por `arranja` radial (o total é o número de dentes), e o
   `subtrair` tira os vãos da coroa. A parte é `engrenagem`, e a porta `eixo` é o anel do furo na face de baixo do cubo. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { PONTOS_DO_VAO, PONTOS_DO_VAO_DE_CATRACA } from './geometria.js';

export const ID_POR_TIPO = Object.freeze({ 1: 'engrenagem.reta', 2: 'engrenagem.catraca' });
export const LADOS = 128;
const PONTOS_DO_PERFIL = 7;

const p = (nome) => ({ parametro: nome });
const origem = (op, id, extra = {}) => ({ origem: { op, id, ...extra } });

function composicao(id, pontosDoVao) {
  const VAO = { op: 'extrusao', id: 20 };
  const RESULTADO = { op: 'subtrair', id: 30 };
  const nomes = [
    ['raioDoFuro', 'numero'], ['raioDoCubo', 'numero'], ['altura', 'numero'],
    ...Array.from({ length: PONTOS_DO_PERFIL }, (_, k) => [[`r${k}`, 'numero'], [`y${k}`, 'numero']]).flat(),
    ...Array.from({ length: pontosDoVao }, (_, k) => [[`vx${k}`, 'numero'], [`vz${k}`, 'numero']]).flat(),
    ['alturaDoVao', 'numero'], ['emVao', 'vetor3'], ['dentes', 'inteiro'], ['grausEntreDentes', 'numero'],
  ];
  return Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL, id, versao: '1.0.0', parametros: Object.fromEntries(nomes.map(([nome, tipo]) => [nome, { tipo }])),
    artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1', 'mecanifica.porta@1'] },
    nos: [
      { id: 'corpo', operacao: 'lathe', argumentos: { origemId: 10, lados: LADOS, perfil: Array.from({ length: PONTOS_DO_PERFIL }, (_, k) => [p(`r${k}`), p(`y${k}`)]) } },
      { id: 'vao', operacao: 'extrusao', argumentos: { origemId: 20, perfil: Array.from({ length: pontosDoVao }, (_, k) => [p(`vx${k}`), p(`vz${k}`)]), altura: p('alturaDoVao'), em: p('emVao') } },
      { id: 'vaos', operacao: 'arranja', argumentos: { modo: 'radial', total: p('dentes'), eixo: 'y', graus: p('grausEntreDentes'), pivo: [0, 0, 0], origemId: 21, derivaDe: VAO, sel: { origem: VAO } } },
      { id: 'dentes', operacao: 'subtrair', argumentos: { origemId: 30, solidos: [origem('lathe', 10), { origem: VAO }, origem('arranja', 21, { de: VAO })] } },
      { id: 'parte-da-engrenagem', operacao: 'parte', argumentos: { nome: 'engrenagem', sel: { origem: RESULTADO } } },
      {
        id: 'porta-eixo', operacao: 'publicarPorta',
        argumentos: { id: 'eixo', de: RESULTADO, interface: { forma: 'anel', papel: 'recebe', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: p('raioDoFuro'), raioExterno: p('raioDoCubo'), inicio: 0, fim: p('altura') } },
      },
    ],
  });
}

export const COMPOSICOES = Object.freeze([composicao(ID_POR_TIPO[1], PONTOS_DO_VAO), composicao(ID_POR_TIPO[2], PONTOS_DO_VAO_DE_CATRACA)]);
