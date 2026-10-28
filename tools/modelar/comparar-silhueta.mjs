#!/usr/bin/env node
/* comparar-silhueta.mjs — compara a silhueta de uma receita do acervo com a de um modelo de referência medido por `modelo-de-referencia.mjs`.

   Uso: node tools/modelar/comparar-silhueta.mjs <receita.js> <fonte-partes.json> [--tolerancia-mm <mm>] [--rigoroso] [--cabine auto|<de>:<ate>]

   Executa a receita pelo núcleo, calcula as mesmas silhuetas em fatias do `partes.json` (a extensão em y e em x de cada fatia em z, e a extensão em x e z de cada
   fatia em y) sobre a SUPERFÍCIE da malha (cada triângulo recortado pelos limites da fatia, e não só os vértices), em milímetro, e imprime a diferença máxima e média contra a referência e as fatias que passam da tolerância (padrão
   5% do comprimento). A referência vem em metro, endireitada com a frente em +z, o chão em y = 0 e centrada em x e z, a mesma convenção do acervo. Sai com
   código 1 se a caixa total diferir mais que a tolerância ou se alguma fatia passar muito dela; a ferramenta mede forma, e quem aprova é a pessoa.
   Recusa (código 2) a fonte cujo `partes.json` não registra a frente (campo `frente`, gravado por `modelo-de-referencia.mjs`): sem ela não se sabe se a receita foi medida do lado certo.

   `--rigoroso` troca a régua: a tolerância cai para 2% do comprimento (a não ser que `--tolerancia-mm` a fixe) e NENHUMA fatia pode passar dela. O envelope por fatia
   guarda só o mínimo e o máximo, então a aprovação rigorosa continua a conferir escala e proporção, e a saída diz isso; a forma (afunilamento da cabine, vinco, roda escondida) só a
   imagem de `folha-comparativa.mjs` mostra.

   `--cabine auto|<de>:<ate>` mede em separado a região da cabine (a estufa): `auto` toma o que fica acima da linha de cintura, achada na fonte como a altura mais alta em que a
   fonte ainda ocupa 90% do comprimento (o capô e o porta-malas terminam ali); `<de>:<ate>` é uma faixa em y, em milímetro. Entram a seção da cabine (as fatias em y inteiras dentro da faixa) e o
   perfil do teto (o y máximo das fatias em z cujo teto cai na faixa). O resto vai como "corpo". Sem `--rigoroso`, a medida da cabine só informa e não muda o código de saída. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extensoesPorFatia } from './silhueta-da-superficie.mjs';
import { exigirFrente } from './frente-da-fonte.mjs';
import { importarReceita, triangulosDaReceita } from './triangulos-da-receita.mjs';

const mm = (arr) => ({ min: Math.min(...arr), max: Math.max(...arr) });

/** A faixa em y da cabine. `auto`: acima da altura mais alta em que a fonte ainda ocupa 90% do comprimento; null quando não há estufa distinta (a fonte tem o comprimento todo até o teto). */
export function faixaDaCabine(fonte, pedido) {
  const f = (m) => m * 1000;
  const topo = f(fonte.total.maximo[1]);
  if (pedido !== 'auto') {
    const m = /^(-?\d+(?:\.\d+)?):(-?\d+(?:\.\d+)?)$/.exec(pedido ?? '');
    if (!m || Number(m[1]) >= Number(m[2])) throw new Error(`--cabine aceita "auto" ou "<de>:<ate>" em milímetro com de < ate, recebeu "${pedido}"`);
    return { de: Number(m[1]), ate: Number(m[2]), origem: 'faixa declarada' };
  }
  const compr = f(fonte.total.tamanho[2]);
  let cintura = null;
  for (const fa of fonte.silhueta.porFatiaEmY) if (fa.zmax !== null && f(fa.zmax - fa.zmin) >= 0.9 * compr) cintura = f(fa.ate);
  if (cintura === null || cintura >= topo - 0.02 * compr) return null;
  return { de: cintura, ate: topo + 1, origem: `acima da cintura detectada em y ${cintura.toFixed(0)} mm` };
}

/** Compara receita e fonte. Devolve `{ linhas, falha, ... }`: as linhas que a ferramenta imprime e o veredito. `receita` já importada, `fonte` o `partes.json` lido. */
export function compararSilhueta(receita, fonte, { toleranciaMm = null, rigoroso = false, cabine = null, nomeFonte = 'fonte-partes.json' } = {}) {
  const linhas = [];
  exigirFrente(fonte, nomeFonte);
  if (fonte.silhueta?.metodo !== 'superficie') throw new Error(`${nomeFonte}: a silhueta da referência foi medida pelos vértices (sem "metodo": "superficie") e lê errado onde há triângulo grande; regere com node tools/modelar/modelo-de-referencia.mjs`);
  const { tris: comParte, vertices: vs } = triangulosDaReceita(receita);
  const tris = comParte.map((t) => t.p);
  const f = (m) => m * 1000;
  const total = { x: mm(vs.map((p) => p[0])), y: mm(vs.map((p) => p[1])), z: mm(vs.map((p) => p[2])) };
  const compr = f(fonte.total.tamanho[2]);
  const tol = toleranciaMm ?? compr * (rigoroso ? 0.02 : 0.05);
  const rel = [];
  rel.push(['caixa x', total.x.min, total.x.max, f(fonte.total.minimo[0]), f(fonte.total.maximo[0])]);
  rel.push(['caixa y', total.y.min, total.y.max, f(fonte.total.minimo[1]), f(fonte.total.maximo[1])]);
  rel.push(['caixa z', total.z.min, total.z.max, f(fonte.total.minimo[2]), f(fonte.total.maximo[2])]);
  let pior = 0;
  for (const [nome, ...v] of rel) { const d = Math.max(Math.abs(v[0] - v[2]), Math.abs(v[1] - v[3])); pior = Math.max(pior, d); linhas.push(`${nome}: receita ${v[0].toFixed(0)}..${v[1].toFixed(0)} mm, referência ${v[2].toFixed(0)}..${v[3].toFixed(0)} mm, diferença ${d.toFixed(0)} mm`); }
  const caixaFora = pior > tol;
  /* Cada comparação de campo vira um registro; as estatísticas por eixo de fatia e por região saem dos mesmos registros. */
  function registros(lista, chave, eixoFatia, campos) {
    const ext = extensoesPorFatia(tris, eixoFatia, lista.map((fa) => ({ de: f(fa.de), ate: f(fa.ate) })));
    const regs = [];
    lista.forEach((fa, i) => {
      for (const [campo, idx, tipo] of campos) {
        if (fa[campo] === null) continue;
        const ref = f(fa[campo]); const base = { chave, campo, de: f(fa.de), ate: f(fa.ate), ref };
        if (!ext[i]) { regs.push({ ...base, val: null, d: compr, semSuperficie: true }); continue; }
        const val = ext[i][tipo][idx]; regs.push({ ...base, val, d: Math.abs(val - ref) });
      }
    });
    return regs;
  }
  const resumo = (regs) => {
    let soma = 0; let n = 0; let max = 0; const ruins = [];
    for (const r of regs) {
      if (r.semSuperficie) { ruins.push(`${r.chave} ${r.de.toFixed(0)}..${r.ate.toFixed(0)}: receita sem superfície, ${r.campo} da referência ${r.ref.toFixed(0)}`); max = Math.max(max, compr); continue; }
      soma += r.d; n += 1; max = Math.max(max, r.d);
      if (r.d > tol) ruins.push(`${r.chave} ${r.de.toFixed(0)}..${r.ate.toFixed(0)} ${r.campo}: receita ${r.val.toFixed(0)}, referência ${r.ref.toFixed(0)} (${r.d.toFixed(0)} mm)`);
    }
    return { media: n ? soma / n : 0, max, ruins };
  };
  const regsZ = registros(fonte.silhueta.porFatiaEmZ, 'z', 2, [['ymin', 1, 'min'], ['ymax', 1, 'max'], ['xmin', 0, 'min'], ['xmax', 0, 'max']]);
  const regsY = registros(fonte.silhueta.porFatiaEmY, 'y', 1, [['xmin', 0, 'min'], ['xmax', 0, 'max'], ['zmin', 2, 'min'], ['zmax', 2, 'max']]);
  const lat = resumo(regsZ); const fro = resumo(regsY);
  linhas.push(`silhueta por fatia em z (lateral e de cima): diferença média ${lat.media.toFixed(0)} mm, máxima ${lat.max.toFixed(0)} mm, ${lat.ruins.length} fatias acima de ${tol.toFixed(0)} mm`);
  linhas.push(`silhueta por fatia em y (frontal e lateral): diferença média ${fro.media.toFixed(0)} mm, máxima ${fro.max.toFixed(0)} mm, ${fro.ruins.length} fatias acima de ${tol.toFixed(0)} mm`);
  for (const r of [...lat.ruins, ...fro.ruins].slice(0, 25)) linhas.push(`  fora: ${r}`);
  let regiao = null;
  if (cabine !== null) {
    const faixa = faixaDaCabine(fonte, cabine);
    if (!faixa) linhas.push('cabine: a fonte não tem estufa distinta (ocupa 90% do comprimento até o teto); passe --cabine <de>:<ate> com a faixa em y que interessa');
    else {
      /* A seção da cabine: fatias em y inteiras dentro da faixa. O perfil do teto: o y máximo das fatias em z cujo teto da fonte cai na faixa. Todo o resto é corpo. */
      const naCabine = (r) => (r.chave === 'y' ? r.de >= faixa.de - 1e-6 && r.ate <= faixa.ate + 1e-6 : r.campo === 'ymax' && r.ref > faixa.de && r.ref <= faixa.ate);
      const cab = [...regsZ, ...regsY].filter(naCabine); const corpo = [...regsZ, ...regsY].filter((r) => !naCabine(r));
      const c = resumo(cab); const o = resumo(corpo);
      regiao = { faixa, cabine: c, corpo: o };
      linhas.push(`cabine (${faixa.origem}; y ${faixa.de.toFixed(0)} a ${Math.min(faixa.ate, f(fonte.total.maximo[1])).toFixed(0)} mm, ${cab.length} medidas): diferença média ${c.media.toFixed(0)} mm, máxima ${c.max.toFixed(0)} mm, ${c.ruins.length} fora de ${tol.toFixed(0)} mm`);
      linhas.push(`corpo (o resto, ${corpo.length} medidas): diferença média ${o.media.toFixed(0)} mm, máxima ${o.max.toFixed(0)} mm, ${o.ruins.length} fora de ${tol.toFixed(0)} mm`);
      for (const r of c.ruins.slice(0, 10)) linhas.push(`  cabine fora: ${r}`);
    }
  }
  let falha;
  if (rigoroso) {
    falha = caixaFora || lat.ruins.length > 0 || fro.ruins.length > 0;
    linhas.push(falha ? `RESULTADO (rigoroso, ${tol.toFixed(0)} mm por fatia, nenhuma fatia fora): a silhueta se afasta da referência` : `RESULTADO (rigoroso, ${tol.toFixed(0)} mm por fatia, nenhuma fatia fora): a silhueta confere com a referência`);
    linhas.push('AVISO: isto confere a escala e o envelope por fatia, não a forma. O envelope guarda só o mínimo e o máximo de cada fatia e não vê o afunilamento da cabine, o vinco da cintura, a roda escondida nem a cor; compare as imagens com node tools/modelar/folha-comparativa.mjs <receita.js> <fonte-partes.json> --saida <pasta>.');
  } else {
    falha = caixaFora || lat.ruins.length > 8 || fro.ruins.length > 4;
    linhas.push(falha ? 'RESULTADO: a silhueta ainda se afasta da referência' : 'RESULTADO: a silhueta confere com a referência dentro da tolerância');
  }
  return { linhas, falha, tolerancia: tol, lateral: lat, frontal: fro, regiao };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const COM_VALOR = ['--tolerancia-mm', '--cabine'];
  const valor = (flag) => { const i = a.indexOf(flag); return i >= 0 ? a[i + 1] : null; };
  const posicionais = a.filter((x, i) => !x.startsWith('--') && !COM_VALOR.includes(a[i - 1]));
  const [receitaArq, fonteArq] = posicionais;
  if (!receitaArq || !fonteArq) { console.error('uso: node tools/modelar/comparar-silhueta.mjs <receita.js> <fonte-partes.json> [--tolerancia-mm <mm>] [--rigoroso] [--cabine auto|<de>:<ate>]'); process.exit(2); }
  try {
    const fonte = JSON.parse(readFileSync(resolve(fonteArq), 'utf8'));
    const receita = await importarReceita(receitaArq);
    const r = compararSilhueta(receita, fonte, { toleranciaMm: valor('--tolerancia-mm') !== null ? parseFloat(valor('--tolerancia-mm')) : null, rigoroso: a.includes('--rigoroso'), cabine: a.includes('--cabine') ? valor('--cabine') : null, nomeFonte: fonteArq });
    for (const l of r.linhas) console.log(l);
    process.exit(r.falha ? 1 : 0);
  } catch (e) { console.error(e.message); process.exit(2); }
}
