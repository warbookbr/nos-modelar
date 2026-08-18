#!/usr/bin/env node
/* Captura isolada e do conjunto; imagens ficam confinadas ao experimento. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { capturarMontagem } from '../../../tools/mecanifica/capturar-montagem.mjs';
import { carregarEstudoDobradica } from './carregar-estudo.mjs';

const destino = resolve('autoria-assistida/experimentos/ensaio-ponta-a-ponta-dobradica/evidencias');
const { montagem } = await carregarEstudoDobradica();
const alvos = [
  { id: 'conjunto', caminho: [], vistas: ['isometrica', 'frontal'] },
  { id: 'folha-batente', caminho: ['folha-batente'], vistas: ['isometrica', 'frontal'] },
  { id: 'folha-porta', caminho: ['folha-porta'], vistas: ['isometrica', 'frontal'] },
  { id: 'parafuso-central', caminho: ['parafuso-central'], vistas: ['isometrica', 'frontal'] },
];
const resultado = [];
mkdirSync(destino, { recursive: true });

for (const alvo of alvos) {
  const captura = await capturarMontagem({ montagem, caminho: alvo.caminho, vistas: alvo.vistas });
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
