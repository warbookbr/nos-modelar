#!/usr/bin/env node
/* Adaptador privado: a comparação oficial recebe uma malha serializada; esta
   prova mantém Maps em memória. Não altera o comparador nem promove a peça. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { comparar, verticesDaPele } from '../../../tools/mecanifica/comparar-alvo.mjs';
import { construirPeleDianteira } from './secoes-de-carater.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const pele = construirPeleDianteira();
const nomeDaPele = (parte) => (['capo', 'quebraDeOmbro'].includes(parte) ? 'capo' : 'paralamaDianteiro');
const malha = {
  V: [...pele.V.entries()].map(([id, [x, y, z]]) => [id, x, y, z]),
  F: [...pele.F.values()].map((f) => [f.id, f.vs, nomeDaPele(f.parte)]),
};
const destino = path.join(aqui, 'evidencias');
mkdirSync(destino, { recursive: true });
writeFileSync(path.join(destino, 'malha-iteracao-6.json'), `${JSON.stringify(malha, null, 2)}\n`);
writeFileSync(path.join(destino, 'comparacao-p0-parcial.svg'), `${comparar(verticesDaPele(malha), { zMin: 400, zMax: 2320 })}\n`);
console.log('comparação parcial P0: nariz até cowl; não mede teto, traseira ou dimensões globais');
