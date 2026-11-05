#!/usr/bin/env node
/* medir-conferencia-do-aviao.mjs — a conferência de forma das sete partes do avião com `REFINA.esboco`, antes e depois de as formas do
 * esboço virarem dado guardado.
 *
 * Fatia 3 do plano esboço pelo núcleo, em 2026-11-05. Para cada parte (asas, empenagem horizontal e vertical, hélice, motor, trem do
 * nariz e trens principais) executa a receita, roda a conferência de forma (`conferirFormaDoEsbocoDaReceita`: a razão interseção/união
 * de volume de cada parte contra o sólido da forma do esboço) e o veredito inteiro de `descrever-peca`, e grava o resultado sem os
 * tempos. `conferencia-do-aviao-antes.json`, ao lado, é a medida no commit em que a conferência ainda resolvia o `aviao.esboco.json` pelo
 * módulo antigo; com `--comparar` a medida de agora é comparada com ela, número a número e o texto do veredito byte a byte.
 *
 *   node docs/modelar/banco-de-provas/esboco-pelo-nucleo-2026-11-05/medir-conferencia-do-aviao.mjs --gravar <saida.json>
 *   node docs/modelar/banco-de-provas/esboco-pelo-nucleo-2026-11-05/medir-conferencia-do-aviao.mjs --comparar <antes.json> */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const imp = (c) => import(pathToFileURL(join(REPO, c)).href);
const { descreverPecaReutilizavel } = await imp('tools/modelar/descrever-peca.mjs');
const { conferirFormaDoEsbocoDaReceita } = await imp('tools/modelar/refinamento-global.mjs');
const { importarReceita, receitaDoModulo } = await imp('tools/modelar/importar-receita.mjs');
const { resolverCaminhoReceita } = await imp('tools/modelar/resolver-caminho-receita.mjs');
const PARTES = ['asas', 'empenagem-horizontal', 'empenagem-vertical', 'helice', 'motor', 'trem-do-nariz', 'trens-principais'];
const args = process.argv.slice(2);
const opcao = (nome) => { const i = args.indexOf(nome); return i < 0 ? null : args[i + 1]; };

const agora = {};
for (const parte of PARTES) {
  const peca = `aviao/${parte}`;
  const caminho = resolverCaminhoReceita(peca);
  const receita = receitaDoModulo(await importarReceita(caminho));
  const execucao = await descreverPecaReutilizavel({ peca, semVeredito: true });
  const forma = await conferirFormaDoEsbocoDaReceita({ receita, neutro: execucao.resultado.neutro, caminhoDaReceita: caminho });
  const veredito = await descreverPecaReutilizavel({ peca });
  agora[parte] = {
    forma: { ok: forma.ok, partes: forma.partes, achados: forma.achados },
    veredito: { ok: veredito.ok, stderr: veredito.stderr.replace(/\d+(?:[.,]\d+)?\s?(?:ms|s)\b/g, '<t>') },
  };
}

if (opcao('--gravar')) writeFileSync(resolve(opcao('--gravar')), `${JSON.stringify(agora, null, 2)}\n`);
if (opcao('--comparar')) {
  const antes = JSON.parse(readFileSync(resolve(opcao('--comparar')), 'utf8'));
  let partes = 0; let maior = 0; const dif = [];
  for (const p of PARTES) {
    const [fa, fb] = [antes[p].forma, agora[p].forma];
    if (fa.ok !== fb.ok || JSON.stringify(fa.achados) !== JSON.stringify(fb.achados) || fa.partes.length !== fb.partes.length) dif.push(`${p}: veredito da forma, achados ou partes`);
    fa.partes.forEach((x, i) => {
      partes += 1;
      for (const k of Object.keys(x)) {
        if (typeof x[k] === 'number') { const d = Math.abs(x[k] - fb.partes[i][k]); maior = Math.max(maior, d); if (d !== 0) dif.push(`${p}.${x.parte}.${k}: ${x[k]} e ${fb.partes[i][k]}`); }
        else if (JSON.stringify(x[k]) !== JSON.stringify(fb.partes[i][k])) dif.push(`${p}.${x.parte}.${k}`);
      }
    });
    if (antes[p].veredito.ok !== agora[p].veredito.ok || antes[p].veredito.stderr !== agora[p].veredito.stderr) dif.push(`${p}: o veredito de descrever-peca`);
  }
  console.log(`${PARTES.length} peças, ${partes} partes medidas, maior diferença numérica ${maior}, ${dif.length} diferença(s)`);
  for (const d of dif.slice(0, 20)) console.log(`  ${d}`);
  process.exitCode = dif.length ? 1 : 0;
}
