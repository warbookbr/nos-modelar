#!/usr/bin/env node
/* descrever-montagem.mjs — lê uma montagem piloto e imprime o diagnóstico
   declarativo do encaixe. Não abre renderizador, não aplica pose e não conhece
   automóvel: a escolha do piloto vive no módulo de montagem. */
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  resolverPortasDeMontagem, diagnosticarEncaixeCilindrico, formatarDiagnosticoDeEncaixe,
  diagnosticarAssentamentoAnular, formatarDiagnosticoDeAssentamentoAnular,
  derivarPreviaDeEncaixeCilindrico, formatarPreviaDePose,
} from '../../src/autoria/interfaces-montagem.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const repo = resolve(aqui, '../..');
const nome = process.argv[2];
const montagens = new Map([
  ['pino-e-luva', { arquivo: 'pino-e-luva.js', fabrica: 'montarPinoELuva' }],
  ['anel-e-faixa', { arquivo: 'anel-e-faixa.js', fabrica: 'montarAnelEFaixa', previa: false }],
  ['roda-no-freio', { arquivo: 'roda-no-freio.js', fabrica: 'montarRodaNoFreio', previa: true }],
  ['aro-no-pneu', { arquivo: 'roda-no-freio.js', fabrica: 'montarAroNoPneu', previa: false }],
]);

if (!nome || !montagens.has(nome)) {
  console.error(`descrever-montagem: escolha uma montagem: ${[...montagens.keys()].join(', ')}`);
  process.exit(2);
}

try {
  const escolha = montagens.get(nome);
  const modulo = await import(pathToFileURL(join(repo, 'prototipos/fps/v3/montagens', escolha.arquivo)).href);
  const montagem = modulo[escolha.fabrica]();
  const portas = resolverPortasDeMontagem(montagem.instancias);
  if (montagem.relacao.tipo === 'assentaAnular') {
    process.stdout.write(formatarDiagnosticoDeAssentamentoAnular(diagnosticarAssentamentoAnular(montagem.relacao, montagem.instancias)));
  } else {
    process.stdout.write(
      formatarDiagnosticoDeEncaixe(diagnosticarEncaixeCilindrico(montagem.relacao, montagem.instancias))
      + (escolha.previa ? formatarPreviaDePose(derivarPreviaDeEncaixeCilindrico(montagem.relacao, portas)) : ''),
    );
  }
} catch (erro) {
  console.error(`descrever-montagem: ${erro.message}`);
  process.exit(1);
}
