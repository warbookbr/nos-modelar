/* Mede a tradução da receita do externo sobre uma pasta de receitas já expandidas (os espelhos aplicados pelo `externo/receita.py::expandir`).
   Uso: node tools/mecanifica/receita-externa-medida.mjs <pasta> [--detalhe]

   Para cada receita, traduz para o esboço e confere, peça a peça: a caixa envolvente do esboço (lida por `descreverEsboco`) contra a da receita
   com o chanfro como o esboço o monta; a caixa com chanfro dentro da caixa dos 8 cantos; a volta (receita → esboço → receita) contra a receita, em
   caixa envolvente e volume; e os chanfros que o limite de 20% corta ou que ficam abaixo de 0,5 mm. Imprime quantas receitas e peças traduzem
   inteiras e os motivos das recusas. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { descreverEsboco } from '../../modulos/esboco/src/descrever.js';
import { caixaDoEsboco, chanfroDoEsboco, envolventeDaPeca, esbocoParaReceita, receitaParaEsboco, volumeDaPeca } from './receita-externa.mjs';

const TOLERANCIA_MM = 0.5;
const pasta = process.argv[2];
const detalhe = process.argv.includes('--detalhe');
if (!pasta) {
  console.error('uso: node tools/mecanifica/receita-externa-medida.mjs <pasta de receitas expandidas> [--detalhe]');
  process.exit(2);
}

const difMm = (a, b) => Math.max(...[0, 1, 2].flatMap((k) => [Math.abs(a.min[k] - b.min[k]), Math.abs(a.max[k] - b.max[k])])) * 1000;
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : '0%');
const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.json')).sort();
const m = {
  receitas: 0, inteiras: 0, pecas: 0, traduzidas: 0, recusas: {}, erros: [],
  leituraMaxMm: 0, leituraFalhas: [], limiteFalhas: [], voltaMaxMm: 0, voltaVolumeMax: 0, voltaFalhas: [],
  chanfroCortados: 0, chanfroPerdidos: 0, chanfroMaiorCorteMm: 0,
};

for (const arq of arquivos) {
  const receita = JSON.parse(readFileSync(join(pasta, arq), 'utf8'));
  m.receitas++;
  m.pecas += receita.pecas.length;
  const { esboco, recusas } = receitaParaEsboco(receita);
  const formas = esboco.opcoes[0].formas;
  m.traduzidas += formas.length;
  if (recusas.length === 0) m.inteiras++;
  for (const r of recusas) {
    m.recusas[r.motivo] = (m.recusas[r.motivo] ?? 0) + 1;
    if (detalhe) console.log(`${arq}: ${r.peca}: ${r.motivo}`);
  }
  const pecaPorNome = new Map(receita.pecas.map((p) => [p.nome, p]));

  /* o esboço lido contra a receita, com o chanfro como o esboço o monta; a caixa com chanfro não passa da caixa dos 8 cantos */
  let lido = [];
  try { lido = descreverEsboco(esboco).opcoes[0].formas; } catch (e) { m.erros.push(`${arq}: descreverEsboco: ${e.message.split('\n')[0]}`); }
  const porId = new Map(lido.map((f) => [f.id, f]));
  for (const f of formas) {
    const p = pecaPorNome.get(f.rotulo);
    const lf = porId.get(f.id);
    if (!lf) continue;
    const e = caixaDoEsboco(lf.caixa);
    const reto = envolventeDaPeca(p, { chanfroDoEsboco: true });
    const canto = envolventeDaPeca(p);
    const dif = difMm(e, reto);
    m.leituraMaxMm = Math.max(m.leituraMaxMm, dif);
    if (dif > TOLERANCIA_MM) m.leituraFalhas.push(`${arq}: ${f.rotulo}: ${dif.toFixed(3)} mm contra o chanfro do esboço`);
    /* a caixa cabe na dos 8 cantos (vale só para a caixa, que é a única forma com chanfro) */
    if (p.forma === 'caixa') {
      const dentro = [0, 1, 2].every((k) => e.min[k] >= canto.min[k] - TOLERANCIA_MM / 1000 && e.max[k] <= canto.max[k] + TOLERANCIA_MM / 1000);
      if (!dentro) m.limiteFalhas.push(`${arq}: ${f.rotulo}: fora da caixa dos 8 cantos`);
    }
  }

  /* a volta: receita → esboço → receita, peça a peça, com o chanfro que o esboço carrega */
  const { receita: volta, recusas: recusasDaVolta } = esbocoParaReceita(esboco);
  if (recusasDaVolta.length) m.erros.push(`${arq}: volta recusou ${recusasDaVolta.length} forma(s)`);
  const voltaPorNome = new Map(volta.pecas.map((p) => [p.nome, p]));
  for (const p of receita.pecas) {
    const q = voltaPorNome.get(p.nome);
    if (!q) continue;
    const dif = difMm(envolventeDaPeca(p, { chanfroDoEsboco: true }), envolventeDaPeca(q, { chanfroDoEsboco: true }));
    const va = volumeDaPeca(p, { chanfroDoEsboco: true }); const vb = volumeDaPeca(q);
    const rel = Math.abs(va - vb) / Math.max(Math.abs(va), 1e-12);
    m.voltaMaxMm = Math.max(m.voltaMaxMm, dif);
    m.voltaVolumeMax = Math.max(m.voltaVolumeMax, rel);
    if (dif > TOLERANCIA_MM || rel > 1e-6) m.voltaFalhas.push(`${arq}: ${p.nome}: envolvente ${dif.toFixed(3)} mm, volume ${(rel * 100).toFixed(4)}%`);
  }

  /* a perda do chanfro: o cortado pelo limite de 20% da menor medida e o abaixo de 0,5 mm que não entra */
  for (const p of receita.pecas) {
    if (p.forma !== 'caixa' || !(p.chanfro > 0)) continue;
    const ef = chanfroDoEsboco(p) / 1000;
    if (ef === 0) m.chanfroPerdidos++;
    else if (ef < p.chanfro - 1e-9) {
      m.chanfroCortados++;
      m.chanfroMaiorCorteMm = Math.max(m.chanfroMaiorCorteMm, (p.chanfro - ef) * 1000);
    }
  }
}

console.log(`receitas: ${m.receitas}; traduzem inteiras: ${m.inteiras} (${pct(m.inteiras, m.receitas)})`);
console.log(`peças: ${m.pecas}; traduzidas: ${m.traduzidas} (${pct(m.traduzidas, m.pecas)}); recusadas: ${m.pecas - m.traduzidas}`);
console.log('recusas restantes (peças):');
for (const [motivo, n] of Object.entries(m.recusas).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${motivo}`);
console.log(`esboço contra receita (chanfro como o esboço o monta): maior diferença ${m.leituraMaxMm.toFixed(3)} mm; acima de ${TOLERANCIA_MM} mm: ${m.leituraFalhas.length}; fora da caixa dos 8 cantos: ${m.limiteFalhas.length}`);
console.log(`volta (receita → esboço → receita): maior diferença de envolvente ${m.voltaMaxMm.toFixed(3)} mm, de volume ${(m.voltaVolumeMax * 100).toFixed(6)}%; peças que falham: ${m.voltaFalhas.length}`);
console.log(`chanfro: ${m.chanfroCortados} caixas com chanfro cortado pelo limite de 20% (maior corte ${m.chanfroMaiorCorteMm.toFixed(1)} mm); ${m.chanfroPerdidos} abaixo de 0,5 mm (não entram)`);
for (const linha of [...m.erros, ...m.leituraFalhas.slice(0, 30), ...m.limiteFalhas.slice(0, 10), ...m.voltaFalhas.slice(0, 30)]) console.log(`  ! ${linha}`);
process.exitCode = m.erros.length || m.voltaFalhas.length || m.leituraFalhas.length || m.limiteFalhas.length ? 1 : 0;
