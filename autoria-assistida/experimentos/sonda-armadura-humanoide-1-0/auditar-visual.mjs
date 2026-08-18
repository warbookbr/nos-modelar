#!/usr/bin/env node
/* Capturas privadas por estado e alvo para crítica visual reexecutável. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { capturarMontagem } from '../../../tools/mecanifica/capturar-montagem.mjs';
import { carregarEstudoArmadura } from './carregar-estudo.mjs';

const destino = resolve('autoria-assistida/experimentos/sonda-armadura-humanoide-1-0/evidencias');
const estudo = await carregarEstudoArmadura();
const alvosDisponiveis = [
  { id: 'neutra-conjunto', estado: 'neutra', caminho: [], vistas: ['isometrica', 'frontal', 'traseira', 'direita'] },
  { id: 'articulada-conjunto', estado: 'articulada', caminho: [], vistas: ['isometrica', 'frontal', 'traseira', 'direita'] },
  { id: 'capacete', estado: 'neutra', caminho: ['capacete'], vistas: ['isometrica', 'frontal'] },
  { id: 'torax', estado: 'neutra', caminho: ['torax'], vistas: ['isometrica', 'traseira'] },
  { id: 'braco-direito', estado: 'articulada', caminho: ['braco-direito'], vistas: ['isometrica', 'direita'] },
  { id: 'perna-direita', estado: 'articulada', caminho: ['perna-direita'], vistas: ['isometrica', 'direita'] },
];
const filtro = process.argv.find((argumento) => argumento.startsWith('--alvo='))?.slice('--alvo='.length);
const alvos = filtro ? alvosDisponiveis.filter(({ id }) => id === filtro) : alvosDisponiveis;
if (filtro && alvos.length === 0) throw new Error(`alvo visual desconhecido: ${filtro}`);
mkdirSync(destino, { recursive: true });
const resultado = [];

for (const alvo of alvos) {
  const captura = await capturarMontagem({
    montagem: estudo.estados[alvo.estado], caminho: alvo.caminho, vistas: alvo.vistas,
  });
  if (!captura.ok) throw new Error(`${alvo.id}: ${captura.erro.mensagem}`);
  for (const vista of captura.resultado.capturas) {
    const arquivo = `${alvo.id}-${vista.nome}.png`;
    writeFileSync(resolve(destino, arquivo), vista.dados);
    resultado.push({
      alvo: alvo.id,
      estado: alvo.estado,
      vista: vista.nome,
      arquivo,
      instancias: vista.instancias,
      enquadramento: vista.enquadramento,
    });
  }
}

process.stdout.write(`${JSON.stringify({ estudo: 'sonda-armadura-humanoide-1-0', capturas: resultado }, null, 2)}\n`);
