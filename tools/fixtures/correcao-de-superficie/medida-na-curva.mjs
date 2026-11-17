#!/usr/bin/env node
/* medida-na-curva.mjs — a continuidade medida NA CURVA declarada, pela superfície limite exata (fatia 5 do plano das ferramentas de
 * correção de superfície, `docs/modelar/planos/2026-11-16-ferramentas-de-correcao-de-superficie.md`).
 *
 * POR QUE ELE EXISTE. `continuidade-nas-emendas.mjs` (o `npm run emendas`) acha a emenda pela borda entre as partes da malha e lê a
 * curvatura de cada lado por um ajuste de grau 2 nos vértices a até 50 mm, na malha de nível finito; no quarto traseiro as emendas que ele
 * acha são as caixas das partes, e não as curvas da gaiola, e numa gaiola de 70 mm o ajuste lê como salto o que é rampa. Aqui a curva é a
 * que o neutro marca (`chapas[k].curvas`, do passo `subdivisao` com `curvas`, que `gaiolaPorRede` dá com `marcarCurvas: true`) e a
 * superfície é a limite, avaliada pelo oráculo `superficieLimite` de `procedural/nucleo/subdivisao.js` (`medirLinhasNoLimite`). Cada curva
 * sai em dois números: o SALTO de curvatura transversal entre os dois lados, exato, que é zero onde a subdivisão é C2 (toda a curva fora dos
 * vértices extraordinários e dos vincos), e a INCLINAÇÃO máxima da rampa, a maior variação da curvatura transversal por comprimento na
 * faixa de cada lado (padrão: duas arestas da gaiola), em 1/m², fora da vizinhança dos pontos singulares (o extraordinário, o canto
 * declarado e o canto da borda, onde a curvatura diverge e a inclinação não tem teto) e dos vincos declarados (o de nitidez finita é liso no
 * limite, com um filete de poucos milímetros; a curva que é vinco sai com `vinco: true`); a inclinação com eles também sai. A borda livre é região própria: a regra de borda zera a curvatura que a atravessa e a curvatura sobe de zero
 * ao valor da superfície nas duas arestas da gaiola junto dela, e a curva que termina na borda herda a subida na ponta, onde o máximo da
 * inclinação sairia (na `emenda-g1`, 92,65 em z = 0,9 mm). A inclinação só conta a mais de `afastamentoDaBordaMm` da borda (padrão: a faixa,
 * as duas arestas da gaiola de origem), e o máximo na faixa da borda sai à parte, em `inclinacaoNaBorda`. Saem também o ângulo entre as normais (zero fora do vinco vivo), a
 * curvatura transversal na curva e na borda da faixa de cada lado (a rampa vai de uma à outra), e o salto entre a aresta que chega e a que
 * sai em cada vértice extraordinário da curva.
 *
 * A medida é da superfície limite da gaiola, antes dos vãos cortados depois; por isso, por padrão, só os passos `subdivisao` da receita
 * rodam (o quarto traseiro leva 2,5 min inteiro e poucos segundos assim). `--completa` roda a receita toda.
 *
 * Uso: node tools/fixtures/correcao-de-superficie/medida-na-curva.mjs <chapa de prova | caminho da receita> [--faixa=<mm>] [--borda=<mm>] [--curvas=<a,b>] [--completa]
 *   A chapa de prova pelo nome (de `chapas.mjs`) é montada com `marcarCurvas`; a receita pelo caminho precisa declarar as curvas no passo. O
 *   JSON vai para a saída padrão e o resumo, para a saída de erro. */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { descendenciaDasLinhas, medirLinhasNoLimite, refinarGaiola } from '../../../procedural/nucleo/subdivisao.js';
import { CHAPAS_DE_PROVA, receitaDeProva } from './chapas.mjs';

const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);
const mm = (p) => (p ? p.map((c) => r3(c * 1000)) : null);

/** medirCurvasDoNeutro(neutro, { faixaMm, curvas }) -> [{ passo, origemId, curvas: [...] }], uma entrada por passo `subdivisao` com curvas
 *  marcadas; `curvas`, uma lista de nomes, limita a medida a elas */
export function medirCurvasDoNeutro(neutro, { faixaMm = null, curvas: so = null, afastamentoDaBordaMm = null } = {}) {
  return (neutro.chapas ?? []).filter((c) => c.curvas?.length).map((chapa) => {
    let gaiola = { vertices: chapa.vertices, faces: chapa.faces, vincos: chapa.vincos ?? [], cantos: chapa.cantos ?? [], borda: chapa.borda ?? 'suave' };
    for (let n = 0; n < chapa.niveis; n++) gaiola = refinarGaiola(gaiola);
    const linhas = chapa.curvas.filter((c) => !so || so.includes(c.nome)).map((c) => {
      let soma = 0;
      for (let k = 1; k < c.gaiola.length; k++) { const a = chapa.vertices[c.gaiola[k - 1]], b = chapa.vertices[c.gaiola[k]]; soma += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
      const faixa = faixaMm != null ? faixaMm / 1000 : (2 * soma) / Math.max(1, c.gaiola.length - 1);
      return { nome: c.nome, continuidade: c.continuidade, espelho: c.espelho, vertices: c.vertices, faixa };
    });
    /* os vincos declarados, levados ao nível da malha: a inclinação longe deles é a da emenda, e a curva que é vinco sai marcada */
    const vincos = chapa.vincos ?? [];
    const evitar = vincos.length ? descendenciaDasLinhas(chapa.faces, chapa.vertices.length, chapa.niveis, vincos.map(([a, b]) => [a, b])).flat().map((v) => gaiola.vertices[v]) : [];
    const chaveDe = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
    const noVinco = new Set(vincos.filter(([, , s]) => s > 0).map(([a, b]) => chaveDe(a, b)));
    chapa.curvas.forEach((c) => { const l = linhas.find((x) => x.vertices === c.vertices); if (l) l.vinco = c.gaiola.slice(1).every((v, j) => noVinco.has(chaveDe(c.gaiola[j], v))); });
    const medidas = medirLinhasNoLimite(gaiola, linhas, { evitar, afastamentoDaBorda: afastamentoDaBordaMm != null ? afastamentoDaBordaMm / 1000 : null });
    return {
      passo: chapa.passo, origemId: chapa.origemId,
      curvas: medidas.map((m) => ({
        nome: m.nome, continuidade: m.continuidade, espelho: m.espelho, vinco: m.vinco ?? false, arestas: m.arestas, comprimentoMm: r3(m.comprimento * 1000), faixaMm: r3(m.faixa * 1000), medidas: m.medidas,
        salto: m.saltoMaximo, ondeSalto: mm(m.ondeSalto), anguloMaximoGraus: r3(m.anguloMaximoGraus),
        lados: m.medidas ? 2 : 1, inclinacaoForaDosSingulares: r3(m.inclinacaoForaDosSingulares), singularesPerto: m.singularesPerto,
        ondeInclinacaoForaDosSingulares: m.ondeInclinacaoForaDosSingulares ? { pontoMm: mm(m.ondeInclinacaoForaDosSingulares.ponto), distanciaMm: r3(m.ondeInclinacaoForaDosSingulares.distancia * 1000), lado: m.ondeInclinacaoForaDosSingulares.lado } : null,
        inclinacaoNaBorda: r3(m.inclinacaoNaBorda), ondeInclinacaoNaBorda: m.ondeInclinacaoNaBorda ? { pontoMm: mm(m.ondeInclinacaoNaBorda.ponto), distanciaMm: r3(m.ondeInclinacaoNaBorda.distancia * 1000), lado: m.ondeInclinacaoNaBorda.lado } : null,
        afastamentoDaBordaMm: r3(m.afastamentoDaBorda * 1000), perfisCortados: m.perfisCortados,
        inclinacao: r3(m.inclinacaoMaxima), ondeInclinacao: m.ondeInclinacao ? { pontoMm: mm(m.ondeInclinacao.ponto), distanciaMm: r3(m.ondeInclinacao.distancia * 1000), lado: m.ondeInclinacao.lado } : null,
        curvaturaNaLinha: r3(m.curvaturaNaLinha), curvaturaNaFaixa: m.curvaturaNaFaixa.map(r3),
        extraordinarios: m.extraordinarios.map((e) => ({ valencia: e.valencia, pontoMm: mm(e.ponto), curvaturas: e.curvaturas.map(r3), salto: r3(e.salto) })),
      })),
    };
  });
}

/** medirCurvasDaReceita(receita, { faixaMm, curvas, completa }) -> o mesmo de `medirCurvasDoNeutro`, com a receita executada (por padrão,
 *  só os passos `subdivisao`, porque a medida é da superfície limite da gaiola) */
export function medirCurvasDaReceita(receita, { faixaMm = null, curvas = null, completa = false, afastamentoDaBordaMm = null } = {}) {
  const r = completa ? receita : { ...receita, PASSOS: receita.PASSOS.filter(([op]) => op === 'subdivisao'), vaos: undefined };
  return medirCurvasDoNeutro(executarReceita(r).neutro, { faixaMm, curvas, afastamentoDaBordaMm });
}

async function principal() {
  const args = process.argv.slice(2);
  const alvo = args.find((a) => !a.startsWith('--'));
  const opcao = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
  if (!alvo) { console.error('uso: medida-na-curva.mjs <chapa de prova | caminho da receita> [--faixa=<mm>] [--borda=<mm>] [--curvas=<a,b>] [--completa]'); process.exit(2); }
  const receita = CHAPAS_DE_PROVA.includes(alvo) ? receitaDeProva(alvo, { marcarCurvas: true }) : (await import(pathToFileURL(resolve(alvo)).href)).default;
  const chapas = medirCurvasDaReceita(receita, { faixaMm: opcao('faixa') != null ? Number(opcao('faixa')) : null, curvas: opcao('curvas')?.split(',') ?? null, afastamentoDaBordaMm: opcao('borda') != null ? Number(opcao('borda')) : null, completa: args.includes('--completa') });
  if (!chapas.length) { console.error(`${alvo}: nenhum passo subdivisao com curvas marcadas; declare marcarCurvas: true na gaiolaPorRede`); process.exit(1); }
  for (const c of chapas) {
    console.error(`passo ${c.passo} (origem ${c.origemId}):`);
    for (const m of c.curvas) console.error(`  ${m.nome}${m.espelho ? ' (espelho)' : ''}${m.continuidade ? ` ${m.continuidade}` : ''}${m.lados === 1 ? ' (borda)' : ''}${m.vinco ? ' (vinco)' : ''}: salto ${m.salto.toExponential(1)} 1/m, inclinação ${m.inclinacaoForaDosSingulares} 1/m² (${m.inclinacao} com ${m.singularesPerto} ponto(s) singular(es) perto; ${m.inclinacaoNaBorda} na faixa de ${m.afastamentoDaBordaMm} mm da borda livre), ângulo ${m.anguloMaximoGraus} grau, curvatura ${m.curvaturaNaLinha} na curva e ${m.curvaturaNaFaixa.join(' / ')} a ${m.faixaMm} mm${m.extraordinarios.length ? `, ${m.extraordinarios.length} extraordinário(s), salto ${m.extraordinarios.map((e) => e.salto).join(', ')}` : ''}`);
  }
  process.stdout.write(`${JSON.stringify({ alvo, chapas }, null, 1)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await principal();
