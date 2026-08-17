#!/usr/bin/env node
/* auditar-visual.mjs — captura cada peça e o conjunto em vistas reproduzíveis. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { capturarMontagem } from '../../../tools/mecanifica/capturar-montagem.mjs';
import { carregarMontagemDoEstudo } from './carregar-estudo.mjs';

const destino = resolve('autoria-assistida/experimentos/estudo-conjunto-dobradica/evidencias');
const montagem = await carregarMontagemDoEstudo();
const alvos = [
  { id: 'conjunto', caminho: [], vistas: ['isometrica', 'frontal'] },
  { id: 'folha-fixa', caminho: ['folha-fixa'], vistas: ['isometrica', 'frontal'] },
  { id: 'folha-movel', caminho: ['folha-movel'], vistas: ['isometrica', 'frontal'] },
  { id: 'pino', caminho: ['pino'], vistas: ['isometrica', 'frontal', 'superior'] },
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
