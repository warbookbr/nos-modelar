#!/usr/bin/env node
/* Materializa o conjunto do eixo como catálogo MCP descartável, na pasta
   passada como argumento. O destino é obrigatório: gravar dentro do
   repositório por omissão deixava sobra de teste versionável. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { nucleo, neutroCanonico } from '../../../procedural/nucleo/entrada.js';
import { FORMATO, VERSAO, parteDaFace } from '../../../src/autoria/ler-peca-resolvida.js';

if (!process.argv[2]) throw new Error('informe a pasta de destino do catálogo.');
const destino = resolve(process.argv[2]);
const pecas = resolve(destino, 'pecas'); const montagens = resolve(destino, 'montagens');
mkdirSync(pecas, { recursive: true }); mkdirSync(montagens, { recursive: true });
for (const ref of ['suporte-de-eixo', 'eixo-guia', 'anel-tampa']) {
  const m = await import(new URL(`./${ref}.js`, import.meta.url));
  const bruto = nucleo(m.PASSOS, m.PARAMS, m.TOPO ?? {}, m.MATERIAIS ?? {}, null, m.ALIASES ?? []);
  if (bruto.orfaos.length) throw new Error(`${ref}: órfãos.`);
  const n = neutroCanonico(bruto);
  writeFileSync(resolve(pecas, `${ref}.json`), `${JSON.stringify({ formato: FORMATO, versao: VERSAO, peca: ref, receita: 'conjunto-do-eixo', meta: { nome: m.meta.nome }, materiais: m.MATERIAIS, partes: [...new Set(n.F.map(parteDaFace).filter(Boolean))].sort(), portas: [...bruto.portas.values()], V: n.V, F: n.F })}\n`);
}
writeFileSync(resolve(montagens, 'conjunto-do-eixo.json'), readFileSync(new URL('./montagem.json', import.meta.url)));
writeFileSync(resolve(destino, 'catalogo.json'), `${JSON.stringify({ formato: 'mecanifica.catalogo-mcp-montagens', versao: 1, raizMontagens: 'montagens', raizPecas: 'pecas', raizes: [{ id: 'conjunto-do-eixo', ref: 'conjunto-do-eixo' }] })}\n`);
process.stdout.write(`${resolve(destino, 'catalogo.json')}\n`);
