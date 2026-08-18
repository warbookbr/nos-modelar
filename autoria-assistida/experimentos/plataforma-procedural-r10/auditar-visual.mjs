#!/usr/bin/env node
/* Captura duas vistas de cada peça e do conjunto, sem usar a bancada publicada. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { capturarMontagem } from '../../../tools/mecanifica/capturar-montagem.mjs';
import { carregarEstudoR10 } from './carregar-estudo.mjs';

const destino = resolve('autoria-assistida/experimentos/plataforma-procedural-r10/evidencias');
const { montagem } = await carregarEstudoR10();
const alvos = [
  { id: 'conjunto', caminho: [], vistas: ['frontal', 'superior'] },
  { id: 'apoio', caminho: ['apoio'], vistas: ['isometrica', 'frontal'] },
  { id: 'nervura', caminho: ['nervura'], vistas: ['isometrica', 'direita'] },
  { id: 'pino', caminho: ['pino'], vistas: ['isometrica', 'direita'] },
];
const resultado = [];
mkdirSync(destino, { recursive: true });

for (const alvo of alvos) {
  const captura = await capturarMontagem({
    montagem,
    caminho: alvo.caminho,
    vistas: alvo.vistas,
  });
  if (!captura.ok) throw new Error(`${alvo.id}: ${captura.erro.mensagem}`);
  for (const vista of captura.resultado.capturas) {
    const arquivo = `${alvo.id}-${vista.nome}.png`;
    writeFileSync(resolve(destino, arquivo), vista.dados);
    resultado.push({
      alvo: alvo.id,
      vista: vista.nome,
      arquivo,
      instancias: vista.instancias,
      enquadramento: vista.enquadramento,
    });
  }
}

process.stdout.write(`${JSON.stringify({ estudo: montagem.id, capturas: resultado }, null, 2)}\n`);
