#!/usr/bin/env node
/* medir.mjs — exporta cada peça do acervo em STEP, em memória, com as opções padrão do comando, e grava o resultado.
 *
 *   node docs/modelar/banco-de-provas/tolerancia-do-step-2026-11-22/medir.mjs --saida=<arquivo.json> [--pecas=a,b] [--acrescentar]
 *
 * Com --acrescentar, as peças medidas entram no arquivo que já existe, no lugar das de mesmo nome.
 *
 * Para cada peça: se a validação da malha passa, se a costura do OCCT fecha, o número de corpos, a impressão geométrica
 * (volume e caixa de cada corpo, quantizados pela tolerância) e o tempo. A peça que não executa sem órfão sai com o motivo,
 * sem contar como falha do exportador. A medida é a mesma antes e depois da correção, e a comparação é `comparar.mjs`. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { pecasDoAcervo } from '../../../../tools/modelar/guardas/guarda-acervo.mjs';
import { carregarReceita, resolverEscalaPadrao } from '../../../../tools/modelar/exportar-step.mjs';
import { executarReceita } from '../../../../src/autoria/executar-receita.js';
import { exportarCad, validarMalha } from '../../../../modulos/exportador-cad/src/index.js';

const arg = (nome) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3);
const saida = arg('saida');
if (!saida) { console.error('medir: falta --saida=<arquivo.json>'); process.exit(1); }
const pecas = arg('pecas')?.split(',') ?? pecasDoAcervo();
const unidade = 'mm';
const escala = resolverEscalaPadrao(unidade, null);
const tolerancia = 0.001;

const resultado = process.argv.includes('--acrescentar') && existsSync(saida) ? JSON.parse(readFileSync(saida, 'utf8')) : { unidade, escala, tolerancia, pecas: {} };
/* a parte de um objeto sai de `pecasDoAcervo` sem `partes/` (aviao/asas), e o arquivo mora em aviao/partes/asas */
const caminhoDa = (peca) => {
  const direto = `procedural/pecas/${peca}`;
  if (existsSync(direto) || existsSync(`${direto}.js`)) return direto;
  const i = peca.lastIndexOf('/');
  return `procedural/pecas/${peca.slice(0, i)}/partes/${peca.slice(i + 1)}`;
};
for (const peca of pecas) {
  const t0 = performance.now();
  const r = {};
  try {
    const { receita, nome } = await carregarReceita(caminhoDa(peca));
    const { neutro } = executarReceita(receita);
    if (neutro.orfaos?.length) { r.receita = `órfãos: ${neutro.orfaos.length}`; }
    else {
      const opcoes = { nome: nome.replace(/[^a-zA-Z0-9_-]/g, '_'), neutro, formato: 'step', estrategia: 'facetada', unidade, escala, tolerancia };
      try { validarMalha(neutro, opcoes); r.valida = true; } catch (e) { r.valida = false; r.motivo = e.message; }
      if (r.valida) {
        try {
          const { diagnostico } = await exportarCad(opcoes);
          r.exporta = true;
          r.corpos = diagnostico.corpos.length;
          r.impressao = diagnostico.impressaoGeometrica.corpos;
        } catch (e) { r.exporta = false; r.motivo = e.message; }
      }
    }
  } catch (e) { r.receita = String(e.message).split('\n')[0]; }
  r.segundos = Math.round((performance.now() - t0) / 100) / 10;
  resultado.pecas[peca] = r;
  console.log(`${peca}: ${r.receita ?? (r.valida ? (r.exporta ? `exporta, ${r.corpos} corpo(s)` : `não costura: ${r.motivo}`) : `recusa: ${r.motivo}`)} (${r.segundos} s)`);
  writeFileSync(saida, `${JSON.stringify(resultado, null, 2)}\n`);
}
