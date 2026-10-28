/* coordenadas.mjs — o caminho da IA que desenha por coordenadas, sem resolvedor: lê <vista>.partes.json, com cada parte como um
   polígono em milímetro escrito à mão, e grava <vista>.contornos.json e <vista>.png com o mesmo código de contornos e de vista em
   traço do módulo, para a comparação com o desenho por restrições ficar justa.
   Uso: node coordenadas.mjs <pasta>/lateral.partes.json
   Formato: { "objeto": "...", "vista": "lateral", "frenteParaFundo": ["a", "b"]?, "partes": { "nome": [[h, v], ...] } } */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const raiz = resolve(new URL('.', import.meta.url).pathname, '../../../..');
const { contornosDoDesenho } = await import(pathToFileURL(`${raiz}/modulos/desenho-por-restricoes/src/contornos.js`));
const { vistaEmTraco } = await import(pathToFileURL(`${raiz}/modulos/desenho-por-restricoes/src/traco.js`));
const { chromium } = (await import(pathToFileURL(`${raiz}/node_modules/playwright/index.js`))).default;

const arquivo = resolve(process.argv[2]);
const d = JSON.parse(readFileSync(arquivo, 'utf8'));
const erros = [];
for (const [n, anel] of Object.entries(d.partes ?? {})) {
  if (!Array.isArray(anel) || anel.length < 3 || !anel.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) erros.push(`parte ${n}: precisa de 3 ou mais pontos [h, v] em mm`);
}
if (!d.partes || !Object.keys(d.partes).length) erros.push('falta "partes"');
if (erros.length) { console.error(erros.join('\n')); process.exit(2); }
const modelo = { objeto: d.objeto ?? 'objeto', vista: d.vista ?? 'lateral', olhando: null, referencias: {}, partes: Object.fromEntries(Object.keys(d.partes).map((n) => [n, {}])), ordem: d.frenteParaFundo ?? null };
const { contornos, ocultas, sobrepostas } = await contornosDoDesenho(modelo, d.partes, { origem: { desenho: 'coordenadas à mão', sha256: null } });
contornos.origem.resolvedor = null;
if (ocultas.length) console.log(`partes escondidas inteiras atrás de outras: ${ocultas.join(', ')}`);
for (const o of sobrepostas) console.log(`sobreposição ${o.a} e ${o.b}: ${o.areaMm2} mm²`);
const base = arquivo.replace(/\.partes\.json$/, '');
writeFileSync(`${base}.contornos.json`, `${JSON.stringify(contornos, null, 1)}\n`);
const { svg } = { svg: vistaEmTraco(modelo, contornos) };
const texto = typeof svg === 'string' ? svg : svg.svg;
const [, w, h] = texto.match(/viewBox="0 0 (\d+) (\d+)"/);
const nav = await chromium.launch();
try { const pg = await nav.newPage({ viewport: { width: Number(w), height: Number(h) } }); await pg.setContent(`<body style="margin:0">${texto}</body>`); await pg.screenshot({ path: `${base}.png` }); } finally { await nav.close(); }
console.log(`gravado: ${base}.contornos.json e ${base}.png`);
