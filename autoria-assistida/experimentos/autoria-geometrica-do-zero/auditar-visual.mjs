#!/usr/bin/env node
/* Captura duas vistas reais da fixture confinada, sem tocar na bancada publicada. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { nucleo, neutroCanonico } from '../../../prototipos/procedural/v3/motor/oficina.js';
import { FORMATO, VERSAO, parteDaFace } from '../../../src/autoria/ler-peca-resolvida.js';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';
import { capturarMontagem } from '../../../tools/mecanifica/capturar-montagem.mjs';

const args = new Map(process.argv.slice(2).map((item) => item.split('=', 2)));
const fim = args.has('--fim-eixo') ? Number(args.get('--fim-eixo')) : 0.015;
const destino = resolve(args.get('--saida') ?? 'autoria-assistida/experimentos/autoria-geometrica-do-zero/evidencias');
if (!Number.isFinite(fim) || fim <= -0.04) throw new Error('--fim-eixo precisa ser finito e maior que -0.040.');
const montagem = JSON.parse(readFileSync(new URL('./montagem.json', import.meta.url), 'utf8'));
async function carregarPeca(ref) {
  const modulo = await import(new URL(`./receitas/${ref}.js`, import.meta.url));
  const params = ref === 'eixo-guia' ? { ...modulo.PARAMS, fim, comprimento: fim - modulo.PARAMS.inicio } : modulo.PARAMS;
  const bruto = nucleo(modulo.PASSOS, params, modulo.TOPO ?? {}, modulo.MATERIAIS ?? {}, null, modulo.ALIASES ?? []);
  if (bruto.orfaos.length) throw new Error(`${ref}: ${bruto.orfaos.length} órfão(s).`);
  const neutro = neutroCanonico(bruto);
  return { formato: FORMATO, versao: VERSAO, peca: ref, receita: 'autoria-geometrica-do-zero', meta: { nome: modulo.meta.nome }, materiais: modulo.MATERIAIS, partes: [...new Set(neutro.F.map(parteDaFace).filter(Boolean))].sort(), portas: [...bruto.portas.values()], V: neutro.V, F: neutro.F };
}
const resolvida = await resolverMontagemPersistida(montagem, { carregarPeca });
const captura = await capturarMontagem({ montagem: resolvida, vistas: ['isometrica', 'direita'] });
if (!captura.ok) throw new Error(captura.erro.mensagem);
mkdirSync(destino, { recursive: true });
for (const item of captura.resultado.capturas) writeFileSync(resolve(destino, `${fim.toFixed(3)}-${item.nome}.png`), item.dados);
process.stdout.write(`${JSON.stringify({ fimEixo: fim, vistas: captura.resultado.capturas.map(({ nome, enquadramento, instancias }) => ({ nome, enquadramento, instancias })) }, null, 2)}\n`);
