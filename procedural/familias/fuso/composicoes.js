/* composicoes.js — a composição da família `fuso`: o núcleo por `lathe`, o filete por `friso` com `helice` (como a rosca
   do `fixador`) e a castanha flangeada por `lathe` com os quatro furos do flange tirados por `subtrair` (um `lathe`
   repetido por `arranja` radial). As partes são `fuso` (o núcleo), `filete` e `castanha`; a porta `ponta` é a ponta do fuso em y = 0,
   e a `flange`, a face do flange da castanha. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { LADOS, PONTOS_POR_VOLTA } from './geometria.js';

export const ID_DO_FUSO = 'fuso.com-castanha';
export const PONTOS_DO_FILETE = 6;
const p = (nome) => ({ parametro: nome });
const lista = (prefixo, n) => Array.from({ length: n }, (_, k) => [p(`${prefixo}u${k}`), p(`${prefixo}v${k}`)]);
const nomes = (prefixo, n) => Array.from({ length: n }, (_, k) => [[`${prefixo}u${k}`, 'numero'], [`${prefixo}v${k}`, 'numero']]).flat();
const FURO = { op: 'lathe', id: 41 };

export const COMPOSICOES = Object.freeze([Object.freeze({
  formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_DO_FUSO, versao: '1.0.0',
  parametros: Object.fromEntries([
    ...nomes('n', 4), ...nomes('f', PONTOS_DO_FILETE), ...nomes('c', 7), ...nomes('h', 4),
    ['raioDoFilete', 'numero'], ['passo', 'numero'], ['voltas', 'numero'], ['centroDoFilete', 'vetor3'], ['fechamento', 'numero'],
    ['emCastanha', 'vetor3'], ['emFuro', 'vetor3'], ['raioDoNucleo', 'numero'], ['pontoDoFlange', 'vetor3'], ['diametroDoFlange', 'numero'],
  ].map(([nome, tipo]) => [nome, { tipo }])),
  artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1', 'mecanifica.porta@1'] },
  nos: [
    { id: 'nucleo', operacao: 'lathe', argumentos: { origemId: 10, lados: LADOS, perfil: lista('n', 4) } },
    { id: 'filete', operacao: 'friso', argumentos: { origemId: 20, linha: { nome: 'filete' }, ponta: 'fechada', fechamento: p('fechamento'), helice: { raio: p('raioDoFilete'), passo: p('passo'), voltas: p('voltas'), centro: p('centroDoFilete'), pontosPorVolta: PONTOS_POR_VOLTA }, perfil: lista('f', PONTOS_DO_FILETE) } },
    { id: 'castanha', operacao: 'lathe', argumentos: { origemId: 40, lados: LADOS, perfil: lista('c', 7), em: p('emCastanha') } },
    { id: 'furo', operacao: 'lathe', argumentos: { origemId: 41, lados: 24, perfil: lista('h', 4), em: p('emFuro') } },
    { id: 'furos', operacao: 'arranja', argumentos: { modo: 'radial', total: 4, graus: 90, eixo: 'y', pivo: [0, 0, 0], origemId: 42, derivaDe: FURO, sel: { origem: FURO } } },
    { id: 'castanha-furada', operacao: 'subtrair', argumentos: { origemId: 50, solidos: [{ origem: { op: 'lathe', id: 40 } }, { origem: FURO }, { origem: { op: 'arranja', id: 42, de: FURO } }] } },
    { id: 'parte-do-fuso', operacao: 'parte', argumentos: { nome: 'fuso', sel: { origem: { op: 'lathe', id: 10 } } } },
    { id: 'parte-do-filete', operacao: 'parte', argumentos: { nome: 'filete', sel: { origem: { op: 'friso', id: 20 } } } },
    { id: 'parte-da-castanha', operacao: 'parte', argumentos: { nome: 'castanha', sel: { origem: { op: 'subtrair', id: 50 } } } },
    { id: 'porta-ponta', operacao: 'publicarPorta', argumentos: { id: 'ponta', de: { op: 'lathe', id: 10 }, interface: { forma: 'anel', papel: 'ocupa', eixo: [0, -1, 0], centro: [0, 0, 0], raioInterno: 0, raioExterno: p('raioDoNucleo'), inicio: 0, fim: p('passo') } } },
    { id: 'porta-flange', operacao: 'publicarPorta', argumentos: { id: 'flange', de: { op: 'subtrair', id: 50 }, interface: { forma: 'plano', papel: 'apoia', ponto: p('pontoDoFlange'), normal: [0, -1, 0], extensao: [p('diametroDoFlange'), p('diametroDoFlange')] } } },
  ],
})]);
