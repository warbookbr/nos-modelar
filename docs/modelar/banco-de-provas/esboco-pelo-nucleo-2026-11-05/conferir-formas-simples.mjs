#!/usr/bin/env node
/* conferir-formas-simples.mjs — a conta que `formasDoEsbocoSimples` (tools/modelar/esboco-para-passos.mjs) faz é a do módulo antigo.
 *
 * Fatia 3 do plano esboço pelo núcleo, em 2026-11-05. Compara, campo a campo, as formas que o módulo antigo resolvia (`formasResolvidas`)
 * com as da conta que ficou em `esboco-para-passos.mjs`, nos esboços de todas as receitas do externo versionadas (as quatro pastas de
 * `tools/modelar/fixtures/receita-externa*`, traduzidas por `receitaParaEsboco`) e nos esboços que os testes da conversão escrevem à mão.
 * Número difere quando passa de 1e-9 mm. Rodou no commit que ainda tinha o módulo; depois dele não roda (ver o README desta pasta). */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const imp = (c) => import(pathToFileURL(join(REPO, c)).href);
const { formasResolvidas } = await imp('modulos/esboco/src/formas-resolvidas.js');
const { formasDoEsbocoSimples } = await imp('tools/modelar/esboco-para-passos.mjs');
const { receitaParaEsboco } = await imp('tools/modelar/receita-externa.mjs');

function diferencas(a, b, caminho, saida) {
  if (typeof a === 'number' && typeof b === 'number') { if (Math.abs(a - b) > 1e-9) saida.push(`${caminho}: ${a} ≠ ${b}`); return; }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) { saida.push(`${caminho}: ${JSON.stringify(a)?.slice(0, 80)} ≠ ${JSON.stringify(b)?.slice(0, 80)}`); return; }
    a.forEach((x, i) => diferencas(x, b[i], `${caminho}[${i}]`, saida));
    return;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diferencas(a[k], b[k], `${caminho}.${k}`, saida);
    return;
  }
  if (a !== b) saida.push(`${caminho}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
}

const esbocos = [];
for (const pasta of ['receita-externa', 'receita-externa-cadeiras', 'receita-externa-balcoes', 'receita-externa-eletro']) {
  const dir = join(REPO, 'tools/modelar/fixtures', pasta);
  for (const a of readdirSync(dir).filter((x) => x.endsWith('.receita.json')).sort()) {
    esbocos.push([`${pasta}/${a}`, receitaParaEsboco(JSON.parse(readFileSync(join(dir, a), 'utf8'))).esboco]);
  }
}
const aMao = (formas) => ({ opcoes: [{ titulo: 't', formas }] });
esbocos.push(['teste: chanfro e cubo', aMao([
  { id: 'a', tipo: 'caixa', largura: 100, altura: 40, profundidade: 60, centro: [0, 20, 0], chanfro: 4 },
  { id: 'b', tipo: 'caixa', largura: 50, altura: 20, profundidade: 30, centro: [200, 10, 0] }])]);
esbocos.push(['teste: caixa, cilindro e extrusão girados', aMao([
  { id: 'g', tipo: 'caixa', largura: 200, altura: 50, profundidade: 80, centro: [0, 100, 0], rotacao: [15, 30, 20] },
  { id: 'c', tipo: 'cilindro', diametro: 40, comprimento: 300, eixo: 'x', centro: [500, 50, 0] },
  { id: 'e', tipo: 'extrusao', perfil: [[-50, -20], [60, -20], [60, 30], [0, 60], [-50, 30]], comprimento: 90, eixo: 'z', centro: [900, 60, 0], rotacao: [0, 25, 0] }])]);
esbocos.push(['teste: caixa de pé girada em x e em z', aMao([
  { id: 'x', tipo: 'caixa', largura: 100, altura: 200, profundidade: 50, centro: [0, 0, 0], rotacao: [90, 0, 0] },
  { id: 'z', tipo: 'caixa', largura: 100, altura: 200, profundidade: 50, centro: [0, 0, 0], rotacao: [0, 0, 90] }])]);

let formas = 0;
const problemas = [];
for (const [nome, esboco] of esbocos) {
  const antigo = formasResolvidas(esboco, 1);
  const novo = formasDoEsbocoSimples(esboco, 1);
  formas += antigo.formas.length;
  const saida = [];
  diferencas(antigo, novo, nome, saida);
  problemas.push(...saida);
}
console.log(`${esbocos.length} esboços, ${formas} formas: ${problemas.length} diferença(s)`);
for (const p of problemas.slice(0, 40)) console.log(`  ${p}`);
process.exitCode = problemas.length ? 1 : 0;
