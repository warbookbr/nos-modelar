#!/usr/bin/env node
/* filete-v2-aceitacao.mjs — gate de descoberta do arredondamento real.
   Não entra em `npm test` enquanto o v2 não existir: hoje ele precisa FALHAR,
   exibindo a lacuna que o contrato futuro deve fechar. */
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';

const passos = [
  ['chamferBox', { origemId: 1, larg: 2, alt: 2, prof: 2, chanfro: 0.2 }],
  ['arredondarAresta', {
    origemId: 2,
    de: { op: 'chamferBox', id: 1, face: 'topo' },
    aresta: 0,
    raio: 0.05,
    paineis: 2,
  }],
];

const neutro = nucleo(passos, {}, {});
const motivos = neutro.orfaos.map((o) => o.motivo);
if (neutro.orfaos.length || neutro.V.size !== 28 || neutro.F.size !== 28) {
  console.error('FILETE V2 FALHOU: o canto composto não preservou a casca esperada.');
  console.error(`  ${motivos.join('\n  ')}`);
  process.exit(1);
}

console.log('Filete v2 aceito: chamferBox composto fecha com 28 V, 28 F e sem órfãos.');
