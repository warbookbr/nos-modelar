/* composicoes.js — a composição da família `atuador-de-junta` (forma 1, cilíndrico): a carcaça por `lathe` unida à saída do
   cabo (`lathe` em x), menos os furos da flange de fixação (um `lathe` repetido por `arranja` radial); e a flange de saída
   por `lathe`, menos os furos cegos. As partes são `carcaca` e `saida`; as portas são o padrão dos furos de fixação, atrás,
   e o da flange de saída, na frente. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';

export const ID_POR_FORMA = Object.freeze({ 1: 'atuador-de-junta.cilindrico' });
const p = (nome) => ({ parametro: nome });
const lista = (prefixo, n) => Array.from({ length: n }, (_, k) => [p(`${prefixo}r${k}`), p(`${prefixo}y${k}`)]);
const nomes = (prefixo, n) => Array.from({ length: n }, (_, k) => [[`${prefixo}r${k}`, 'numero'], [`${prefixo}y${k}`, 'numero']]).flat();
const o = (op, id) => ({ origem: { op, id } });
const FURO_F = { op: 'lathe', id: 13 }; const FURO_S = { op: 'lathe', id: 21 };

export const COMPOSICOES = Object.freeze([Object.freeze({
  formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_POR_FORMA[1], versao: '1.0.0',
  parametros: Object.fromEntries([
    ...nomes('c', 8), ...nomes('s', 5), ...nomes('k', 4), ...nomes('ff', 4), ...nomes('fs', 4),
    ['emCabo', 'vetor3'], ['emFuroF', 'vetor3'], ['emFuroS', 'vetor3'], ['furosF', 'inteiro'], ['grausF', 'numero'], ['furosS', 'inteiro'], ['grausS', 'numero'],
    ['diametroF', 'numero'], ['raioF', 'numero'], ['anguloF', 'numero'], ['diametroS', 'numero'], ['raioS', 'numero'], ['anguloS', 'numero'], ['topo', 'vetor3'],
  ].map(([n, t]) => [n, { tipo: t }])),
  artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1', 'mecanifica.porta@1'] },
  nos: [
    { id: 'carcaca', operacao: 'lathe', argumentos: { origemId: 10, lados: 96, perfil: lista('c', 8) } },
    { id: 'cabo', operacao: 'lathe', argumentos: { origemId: 11, lados: 32, eixo: 'x', perfil: lista('k', 4), em: p('emCabo') } },
    { id: 'carcaca-com-cabo', operacao: 'unir', argumentos: { origemId: 12, solidos: [o('lathe', 10), o('lathe', 11)] } },
    { id: 'furo-do-flange', operacao: 'lathe', argumentos: { origemId: 13, lados: 24, perfil: lista('ff', 4), em: p('emFuroF') } },
    { id: 'furos-do-flange', operacao: 'arranja', argumentos: { modo: 'radial', total: p('furosF'), graus: p('grausF'), eixo: 'y', pivo: [0, 0, 0], origemId: 14, derivaDe: FURO_F, sel: { origem: FURO_F } } },
    { id: 'carcaca-furada', operacao: 'subtrair', argumentos: { origemId: 15, solidos: [o('unir', 12), { origem: FURO_F }, { origem: { op: 'arranja', id: 14, de: FURO_F } }] } },
    { id: 'saida', operacao: 'lathe', argumentos: { origemId: 20, lados: 96, perfil: lista('s', 5) } },
    { id: 'furo-da-saida', operacao: 'lathe', argumentos: { origemId: 21, lados: 24, perfil: lista('fs', 4), em: p('emFuroS') } },
    { id: 'furos-da-saida', operacao: 'arranja', argumentos: { modo: 'radial', total: p('furosS'), graus: p('grausS'), eixo: 'y', pivo: [0, 0, 0], origemId: 22, derivaDe: FURO_S, sel: { origem: FURO_S } } },
    { id: 'saida-furada', operacao: 'subtrair', argumentos: { origemId: 23, solidos: [o('lathe', 20), { origem: FURO_S }, { origem: { op: 'arranja', id: 22, de: FURO_S } }] } },
    { id: 'parte-carcaca', operacao: 'parte', argumentos: { nome: 'carcaca', sel: o('subtrair', 15) } },
    { id: 'parte-saida', operacao: 'parte', argumentos: { nome: 'saida', sel: o('subtrair', 23) } },
    { id: 'porta-fixacao', operacao: 'publicarPorta', argumentos: { id: 'fixacao', de: { op: 'subtrair', id: 15 }, interface: { forma: 'padraoFuros', papel: 'recebe', plano: { ponto: [0, 0, 0], normal: [0, -1, 0] }, diametro: p('diametroF'), padrao: { tipo: 'circular', centro: [0, 0, 0], raio: p('raioF'), quantidade: p('furosF'), anguloInicial: p('anguloF') } } } },
    { id: 'porta-saida', operacao: 'publicarPorta', argumentos: { id: 'saida', de: { op: 'subtrair', id: 23 }, interface: { forma: 'padraoFuros', papel: 'recebe', plano: { ponto: p('topo'), normal: [0, 1, 0] }, diametro: p('diametroS'), padrao: { tipo: 'circular', centro: p('topo'), raio: p('raioS'), quantidade: p('furosS'), anguloInicial: p('anguloS') } } } },
  ],
})]);
