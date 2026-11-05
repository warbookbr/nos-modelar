#!/usr/bin/env node
/* conferir-comparador.mjs — o comparador de contornos que saiu do módulo antigo (`tools/modelar/comparar-contornos.mjs`) dá o mesmo
 * resultado que o dele (`modulos/esboco/src/referencia.js`).
 *
 * Fatia 3 do plano esboço pelo núcleo, em 2026-11-05. Nas duas fixtures do contorno por parte (as únicas peças com `*.contornos.json`
 * na pasta), executa a receita, monta as formas de malha como o veredito monta e compara, vista a vista, o resultado inteiro dos dois
 * comparadores e o texto que o veredito imprime. Os três contornos do braço robótico moram na pasta do objeto, que o veredito de uma
 * parte não lê; para a conta passar também por contornos de foto de verdade, cada um deles é comparado com cada parte do braço. Rodou no commit que ainda tinha o módulo; depois dele não
 * roda (ver o README desta pasta). */
import { readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const imp = (c) => import(pathToFileURL(join(REPO, c)).href);
const antigo = await imp('modulos/esboco/src/referencia.js');
const novo = await imp('tools/modelar/comparar-contornos.mjs');
const { contornosDaPeca, formasDaMalha } = await imp('tools/modelar/contorno-da-peca.mjs');
const { descreverPecaReutilizavel } = await imp('tools/modelar/descrever-peca.mjs');

const PECAS = ['tools/fixtures/refina-forma-global/contorno-ok/receita.js', 'tools/fixtures/refina-forma-global/contorno-parte-fora/receita.js',
  ...['anel-cintura', 'base', 'braco', 'ombro', 'ombro-tambor'].map((p) => `braco-robotico/${p}`)];
const DO_BRACO = ['frontal', 'lateral-sem-cabo', 'lateral'].map((n) => ({ caminho: join(REPO, `procedural/pecas/braco-robotico/referencias/${n}.contornos.json`), arquivo: `procedural/pecas/braco-robotico/referencias/${n}.contornos.json`, vista: n.startsWith('frontal') ? 'frontal' : 'lateral' }));
let conferidas = 0;
const diferentes = [];
for (const peca of PECAS) {
  const execucao = await descreverPecaReutilizavel({ peca, semVeredito: true });
  if (!execucao.ok) throw new Error(`${peca} não executou: ${execucao.stderr}`);
  const formas = formasDaMalha(execucao.resultado.neutro);
  const contornos = peca.startsWith('braco-robotico/') ? DO_BRACO : contornosDaPeca({ caminhoDaReceita: join(REPO, peca), raiz: REPO });
  for (const c of contornos) {
    if (!c.vista) continue;
    const json = JSON.parse(readFileSync(c.caminho, 'utf8'));
    const entrada = { arquivo: basename(c.arquivo), vista: c.vista };
    const tentar = (q) => formas.filter((f) => f.id === q);
    const ra = antigo.conferirReferencia(entrada, antigo.lerContornos(json, c.arquivo), formas, { selecionar: tentar, tentar, sujeito: 'da peça' });
    const rn = novo.conferirReferencia(entrada, novo.lerContornos(json, c.arquivo), formas, { selecionar: tentar, tentar, sujeito: 'da peça' });
    const ta = antigo.formatarConferencia(entrada, ra);
    const tn = novo.formatarConferencia(entrada, rn);
    conferidas += 1;
    if (JSON.stringify(ra) !== JSON.stringify(rn) || ta !== tn) diferentes.push(c.arquivo);
    console.log(`${peca} × ${c.arquivo}: ${JSON.stringify(ra) === JSON.stringify(rn) && ta === tn ? 'igual' : 'DIFERENTE'} (${ra.ok ? 'aprovada' : 'reprovada'}, ${ra.resultados.length} resultado(s))`);
  }
}
console.log(`${conferidas} contornos conferidos, ${diferentes.length} diferente(s)`);
process.exitCode = diferentes.length ? 1 : 0;

/* O texto de que lado cada vista olha (`lados-das-vistas.mjs`) é o do módulo (`lados.js`): as sete vistas, sem orientação e com cada uma
   das quatro frentes, e o bloco do brief com e sem as vistas a mais. */
const ladosAntigo = await imp('modulos/esboco/src/lados.js');
const ladosNovo = await imp('tools/modelar/lados-das-vistas.mjs');
const orientacoes = [null, ...['+x', '-x', '+z', '-z'].map((frente) => ladosAntigo.lerOrientacao({ frente, nomeDaFrente: 'a proa', nomeDeTras: 'a cauda' }))];
let textos = 0;
const ladosDiferentes = [];
for (const o of orientacoes) {
  for (const v of ['isometrica', 'frontal', 'lateral', 'superior', 'frontal-oposta', 'lateral-oposta', 'inferior']) {
    textos += 1;
    if (ladosAntigo.linhaDaVista(v, o) !== ladosNovo.linhaDaVista(v, o)) ladosDiferentes.push(`${v} ${o?.frente ?? 'sem orientação'}`);
  }
  for (const extras of [[], ['frontal-oposta', 'lateral-oposta', 'inferior']]) {
    textos += 1;
    if (JSON.stringify(ladosAntigo.ladosDasVistas({ orientacao: o, extras })) !== JSON.stringify(ladosNovo.ladosDasVistas({ orientacao: o, extras }))) ladosDiferentes.push(`bloco ${o?.frente ?? 'sem orientação'} ${extras.length}`);
  }
  for (const v of ['frontal', 'lateral', 'superior']) {
    textos += 1;
    if (JSON.stringify(antigo.vistaDoMesmoOlho(v, o)) !== JSON.stringify(novo.vistaDoMesmoOlho(v, o))) ladosDiferentes.push(`mesmo olho ${v} ${o?.frente ?? 'sem orientação'}`);
  }
}
console.log(`${textos} textos de lado conferidos, ${ladosDiferentes.length} diferente(s)${ladosDiferentes.length ? `: ${ladosDiferentes.join('; ')}` : ''}`);
if (ladosDiferentes.length) process.exitCode = 1;
