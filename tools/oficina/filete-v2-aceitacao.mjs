#!/usr/bin/env node
/* filete-v2-aceitacao.mjs — gate de descoberta do arredondamento real.
   Não entra em `npm test` enquanto o v2 não existir: hoje ele precisa FALHAR,
   exibindo a lacuna que o contrato futuro deve fechar. */
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';

const passos = [
  ['chamferBox', { origemId: 1, larg: 2, alt: 2, prof: 2, chanfro: 0.2 }],
  ['filete', {
    origemId: 2,
    de: { op: 'chamferBox', id: 1, face: 'topo' },
    aresta: 0,
    raio: 0.05,
  }],
];

const neutro = nucleo(passos, {}, {});
const motivos = neutro.orfaos.map((o) => o.motivo);
const bloqueioComposto = motivos.some((m) => /tem 2 face\(s\) além das duas da aresta/.test(m));

if (bloqueioComposto) {
  console.error('FILETE V2 AINDA PENDENTE: chamferBox chega ao canto composto e o v1 recusa corretamente.');
  console.error(`  ${motivos.join('\n  ')}`);
  process.exit(1);
}

console.log('Filete v2 aceito: o caso composto deixou de falhar. Adicione aqui as provas de raio, painéis e determinismo.');
