/* composicoes.js — a composição da família `guia-linear`: o trilho por `extrusao` da seção com os furos com rebaixo
   tirados por `subtrair` (um `lathe` em z repetido por `arranja` linear), e o carro por `extrusao` do U invertido com os
   quatro furos roscados. As partes são `trilho` e `carro`; a porta `base` é o plano de baixo do trilho e a `mesa`, o de
   cima do carro. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';

export const ID_DA_GUIA = 'guia-linear.trilho-e-carro';
const p = (nome) => ({ parametro: nome });
const lista = (prefixo, n) => Array.from({ length: n }, (_, k) => [p(`${prefixo}u${k}`), p(`${prefixo}v${k}`)]);
const nomes = (prefixo, n) => Array.from({ length: n }, (_, k) => [[`${prefixo}u${k}`, 'numero'], [`${prefixo}v${k}`, 'numero']]).flat();
const LATHE = (id, prefixo, n, em) => ({ id: `furo-${id}`, operacao: 'lathe', argumentos: { origemId: id, lados: 24, eixo: 'z', perfil: lista(prefixo, n), em: p(em) } });
const FURO = { op: 'lathe', id: 20 };

export const COMPOSICOES = Object.freeze([Object.freeze({
  formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_DA_GUIA, versao: '1.0.0',
  parametros: Object.fromEntries([
    ...nomes('t', 12), ...nomes('f', 6), ...nomes('c', 8), ...nomes('r', 4),
    ['comprimento', 'numero'], ['furos', 'inteiro'], ['passo', 'vetor3'], ['emFuro', 'vetor3'], ['emCarro', 'vetor3'], ['comprimentoDoCarro', 'numero'],
    ['emRosca0', 'vetor3'], ['emRosca1', 'vetor3'], ['emRosca2', 'vetor3'], ['emRosca3', 'vetor3'],
    ['pontoDaBase', 'vetor3'], ['larguraDoTrilho', 'numero'], ['pontoDaMesa', 'vetor3'], ['larguraDoCarro', 'numero'],
  ].map(([nome, tipo]) => [nome, { tipo }])),
  artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1', 'mecanifica.porta@1'] },
  nos: [
    { id: 'trilho', operacao: 'extrusao', argumentos: { origemId: 10, perfil: lista('t', 12), altura: p('comprimento') } },
    LATHE(20, 'f', 6, 'emFuro'),
    { id: 'furos', operacao: 'arranja', argumentos: { modo: 'linear', total: p('furos'), d: p('passo'), origemId: 21, derivaDe: FURO, sel: { origem: FURO } } },
    { id: 'trilho-furado', operacao: 'subtrair', argumentos: { origemId: 30, solidos: [{ origem: { op: 'extrusao', id: 10 } }, { origem: FURO }, { origem: { op: 'arranja', id: 21, de: FURO } }] } },
    { id: 'carro', operacao: 'extrusao', argumentos: { origemId: 40, perfil: lista('c', 8), altura: p('comprimentoDoCarro'), em: p('emCarro') } },
    ...[0, 1, 2, 3].map((k) => LATHE(50 + k, 'r', 4, `emRosca${k}`)),
    { id: 'carro-furado', operacao: 'subtrair', argumentos: { origemId: 60, solidos: [{ origem: { op: 'extrusao', id: 40 } }, ...[0, 1, 2, 3].map((k) => ({ origem: { op: 'lathe', id: 50 + k } }))] } },
    { id: 'parte-do-trilho', operacao: 'parte', argumentos: { nome: 'trilho', sel: { origem: { op: 'subtrair', id: 30 } } } },
    { id: 'parte-do-carro', operacao: 'parte', argumentos: { nome: 'carro', sel: { origem: { op: 'subtrair', id: 60 } } } },
    { id: 'porta-base', operacao: 'publicarPorta', argumentos: { id: 'base', de: { op: 'subtrair', id: 30 }, interface: { forma: 'plano', papel: 'apoia', ponto: p('pontoDaBase'), normal: [0, 0, -1], extensao: [p('larguraDoTrilho'), p('comprimento')] } } },
    { id: 'porta-mesa', operacao: 'publicarPorta', argumentos: { id: 'mesa', de: { op: 'subtrair', id: 60 }, interface: { forma: 'plano', papel: 'apoia', ponto: p('pontoDaMesa'), normal: [0, 0, 1], extensao: [p('larguraDoCarro'), p('comprimentoDoCarro')] } } },
  ],
})]);
