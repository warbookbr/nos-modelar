/* Adaptador privado pelas portas oficiais de autoria, exportação e montagem. */
import { readFileSync } from 'node:fs';
import {
  REGISTRO_OPERACOES,
  criarRegistroComposicoes,
} from '../../../prototipos/procedural/v3/motor/oficina.js';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';
import { descreverPecaReutilizavel } from '../../../tools/mecanifica/descrever-peca.mjs';
import { exportarPeca, lerPecaResolvida } from '../../../tools/mecanifica/exportar-peca.mjs';
import { COMPOSICOES } from './composicoes.js';

export const REFERENCIAS = Object.freeze([
  'aerodinamica', 'aro', 'cabine', 'carroceria', 'disco-freio',
  'entrada-frontal', 'espelho', 'farol', 'lanterna', 'painel-lateral', 'pneu', 'porta-lateral',
]);

export function criarConfiguracaoSupercarro() {
  const registroOperacoes = REGISTRO_OPERACOES;
  const registroComposicoes = criarRegistroComposicoes({
    composicoes: COMPOSICOES,
    resolverOperacao: registroOperacoes.resolver,
  });
  return { registroOperacoes, registroComposicoes };
}

export async function carregarPecaSupercarro(ref, configuracao = criarConfiguracaoSupercarro()) {
  if (!REFERENCIAS.includes(ref)) throw new Error(`peça do supercarro desconhecida: ${ref}`);
  const modulo = await import(new URL(`./receitas/${ref}.js`, import.meta.url));
  const opcoes = { modulo, ...configuracao };
  const medida = await descreverPecaReutilizavel({ peca: ref, estrito: true, ...opcoes });
  if (!medida.ok) throw new Error(`${ref}: ${medida.stderr.trim()}`);
  const exportacao = await exportarPeca(ref, opcoes);
  const neutroLido = lerPecaResolvida(exportacao.dado);
  return { ref, modulo, medida, exportacao, neutroLido };
}

const lerJson = (caminho) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'));

export async function carregarEstudoSupercarro() {
  const configuracao = criarConfiguracaoSupercarro();
  const pecas = new Map();
  for (const ref of REFERENCIAS) pecas.set(ref, await carregarPecaSupercarro(ref, configuracao));
  const montagens = new Map([['roda', lerJson('./montagens/roda.json')]]);
  const autoria = lerJson('./montagens/carro.json');
  const montagem = await resolverMontagemPersistida(autoria, {
    carregarPeca: async (ref) => pecas.get(ref)?.exportacao.dado,
    carregarMontagem: async (ref) => montagens.get(ref),
  });
  return { configuracao, pecas, montagem, montagens };
}
