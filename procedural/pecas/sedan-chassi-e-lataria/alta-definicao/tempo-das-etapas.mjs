#!/usr/bin/env node
/* tempo-das-etapas.mjs: o tempo de montar cada etapa do sedã pela receita (só `executarReceita`, sem as medidas) e o do carro inteiro pelas cinco juntas, em segundos, com as faces e
 * as partes de cada uma. O `import` das receitas fica fora da conta (ele carrega o esboço e custa cerca de 10 s, uma vez por processo).
 *
 * Uso: node procedural/pecas/sedan-chassi-e-lataria/alta-definicao/tempo-das-etapas.mjs [etapa ...] */
import { executarReceita } from '../../../../src/autoria/executar-receita.js';
import carro from './carro-pela-receita.mjs';
import carroceria from '../partes/carroceria/receita.js';
import vidros from '../partes/vidros/receita.js';
import frente from '../partes/frente-e-traseira/receita.js';
import rodas from '../partes/rodas/receita.js';
import acessorios from '../partes/acessorios/receita.js';

const TODAS = { carroceria, vidros, 'frente-e-traseira': frente, rodas, acessorios, 'carro inteiro': carro };
const pedidas = process.argv.slice(2);
for (const [nome, receita] of Object.entries(TODAS)) {
  if (pedidas.length && !pedidas.includes(nome)) continue;
  const t = performance.now();
  const { neutro } = executarReceita(receita);
  const partes = new Set([...neutro.F.values()].map((f) => f.parte).filter(Boolean));
  console.log(`${nome}: ${((performance.now() - t) / 1000).toFixed(1)} s, ${neutro.F.size} faces, ${partes.size} partes`);
}
