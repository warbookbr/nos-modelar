#!/usr/bin/env node
/* Capturas privadas, globais e isoladas, para crítica visual iterativa. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { capturarMontagem } from '../../../tools/mecanifica/capturar-montagem.mjs';
import { carregarEstudoSupercarro } from './carregar-estudo.mjs';

const destino = resolve('autoria-assistida/experimentos/sonda-supercarro-1-0/evidencias');
const { montagem } = await carregarEstudoSupercarro();
const alvosDisponiveis = [
  { id: 'conjunto', caminho: [], vistas: ['isometrica', 'direita', 'frontal', 'traseira', 'superior'] },
  { id: 'roda-dianteira-esquerda', caminho: ['roda-dianteira-esquerda'], vistas: ['isometrica', 'direita'] },
  { id: 'cabine', caminho: ['cabine'], vistas: ['isometrica', 'direita'] },
  { id: 'aerodinamica', caminho: ['aerodinamica'], vistas: ['isometrica', 'traseira'] },
  { id: 'lateral-esquerda', caminho: ['porta-esquerda'], vistas: ['isometrica', 'direita'] },
];
const filtro = process.argv.find((argumento) => argumento.startsWith('--alvo='))?.slice('--alvo='.length);
const alvos = filtro ? alvosDisponiveis.filter(({ id }) => id === filtro) : alvosDisponiveis;
if (filtro && alvos.length === 0) throw new Error(`alvo visual desconhecido: ${filtro}`);
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
