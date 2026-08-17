#!/usr/bin/env node
/* Materializa JSONs descartáveis para o catálogo MCP local do experimento. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { nucleo, neutroCanonico } from '../../../prototipos/procedural/v3/motor/oficina.js';
import { FORMATO, VERSAO, parteDaFace } from '../../../src/autoria/ler-peca-resolvida.js';

const destino = resolve(process.argv[2] ?? 'autoria-assistida/experimentos/autoria-geometrica-do-zero/catalogo-local');
const pecas = resolve(destino, 'pecas'); const montagens = resolve(destino, 'montagens');
mkdirSync(pecas, { recursive: true }); mkdirSync(montagens, { recursive: true });
for (const ref of ['suporte-de-eixo', 'eixo-guia', 'anel-tampa']) {
  const m = await import(new URL(`./receitas/${ref}.js`, import.meta.url));
  const bruto = nucleo(m.PASSOS, m.PARAMS, m.TOPO ?? {}, m.MATERIAIS ?? {}, null, m.ALIASES ?? []);
  if (bruto.orfaos.length) throw new Error(`${ref}: órfãos.`);
  const n = neutroCanonico(bruto);
  writeFileSync(resolve(pecas, `${ref}.json`), `${JSON.stringify({ formato: FORMATO, versao: VERSAO, peca: ref, receita: 'autoria-geometrica-do-zero', meta: { nome: m.meta.nome }, materiais: m.MATERIAIS, partes: [...new Set(n.F.map(parteDaFace).filter(Boolean))].sort(), portas: [...bruto.portas.values()], V: n.V, F: n.F })}\n`);
}
writeFileSync(resolve(montagens, 'autoria-geometrica-do-zero.json'), readFileSync(new URL('./montagem.json', import.meta.url)));
writeFileSync(resolve(destino, 'catalogo.json'), `${JSON.stringify({ formato: 'mecanifica.catalogo-mcp-montagens', versao: 1, raizMontagens: 'montagens', raizPecas: 'pecas', raizes: [{ id: 'autoria-geometrica-do-zero', ref: 'autoria-geometrica-do-zero' }] })}\n`);
process.stdout.write(`${resolve(destino, 'catalogo.json')}\n`);
