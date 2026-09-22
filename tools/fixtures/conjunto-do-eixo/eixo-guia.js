/* eixo-guia.js — a receita declarativa pequena que os testes de autoria
   usam. Ela tem o mínimo de que eles precisam: um cilindro, um comprimento
   dado por parâmetro, uma parte nomeada e uma porta publicada. Os testes de
   publicação, revisão e revalidação mudam o comprimento e conferem o que
   acontece com a porta.

   Até 2026-09-22 ela morava em `autoria-assistida/`, como sobra de um
   experimento, e quatro testes a importavam de lá. Mudar esta receita muda o
   que eles provam: `autoria-receita`, `autoria-ativa`,
   `estudo-campo-revalidacao` e o perfil MCP `autoria-receitas`. Com `suporte-de-eixo.js`, `anel-tampa.js`
   e `montagem.json`, ela forma o conjunto que `mcp.test.mjs` publica pelo
   servidor para provar a correção declarativa de ponta a ponta. */
import { executar, colisaoDe } from '../../../procedural/nucleo/entrada.js';
export const PARAMS = { raio: 0.019, inicio: -0.040, comprimento: 0.055, fim: 0.015 };
export const TOPO = { lados: 24 };
export const MATERIAIS = { aco: { cor: '#a3adb6', aspereza: 0.42, metalness: 0.76 } };
const EIXO = 7201;
export const ALIASES = [['inteiro', { unir: [{ origem: { op: 'cilindro', id: EIXO } }, { origem: { op: 'cilindro', id: EIXO, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: EIXO, tampa: 'topo' } }] }]];
export const PASSOS = [
  ['cilindro', { origemId: EIXO, raio: 'raio', altura: 'comprimento', lados: 'lados' }], ['rotaciona', { eixo: 'z', graus: -90, pivo: [0, 0, 0], sel: { alias: 'inteiro' } }], ['transladar', { d: ['inicio', 0, 0], sel: { alias: 'inteiro' } }],
  ['parte', { nome: 'ombro', sel: { alias: 'inteiro' } }],
  ['publicarPorta', { nome: 'hasteNoSuporte', de: { op: 'cilindro', id: EIXO }, interface: { forma: 'cilindro', papel: 'externa', eixo: [1, 0, 0], referencia: [0, 1, 0], centro: [0, 0, 0], raio: 'raio', inicio: 'inicio', fim: 'fim' } }],
  ['liso', { sel: { origem: { op: 'cilindro', id: EIXO } } }], ['material', { sel: { grupo: 'ombro' }, usa: 'aco' }], ['solido', { sel: { grupo: 'ombro' } }],
];
export const meta = { nome: 'eixo-guia', tipo: 'objeto', desc: 'eixo experimental de comprimento controlado', colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES) };
export function construir(ctx) { return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES); }
