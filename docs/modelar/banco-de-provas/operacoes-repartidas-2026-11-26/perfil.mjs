/* perfil.mjs — onde vai o tempo dentro de uma operação, pelo perfil de CPU do Node (plano das operações repartidas entre núcleos, fatia 1).
 * Uso, da raiz do repositório:
 *   node --cpu-prof --cpu-prof-dir=tmp/prof --max-old-space-size=8192 docs/modelar/banco-de-provas/execucao-paralela-2026-11-26/medir.mjs receita <peça>
 *   node docs/modelar/banco-de-provas/operacoes-repartidas-2026-11-26/perfil.mjs <arquivo.cpuprofile> [--dentro=abrir] [--arquivo=abertura-por-contorno.js]
 * Imprime uma linha JSON: o tempo dentro da função escolhida (`--dentro`, a de entrada da operação, no arquivo `--arquivo`), o tempo de
 * cada filha direta dela (inclusivo) e as funções com mais tempo próprio dentro dela, cada uma com o arquivo. */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const [arquivoDoPerfil, ...resto] = process.argv.slice(2);
const opcao = (nome, padrao) => resto.find((a) => a.startsWith(`--${nome}=`))?.split('=')[1] ?? padrao;
const dentro = opcao('dentro', 'abrir');
const doArquivo = opcao('arquivo', 'abertura-por-contorno.js');
const perfil = JSON.parse(readFileSync(arquivoDoPerfil, 'utf8'));
const nos = new Map(perfil.nodes.map((n) => [n.id, n]));
const pai = new Map();
for (const n of perfil.nodes) for (const f of n.children ?? []) pai.set(f, n.id);
const rotulo = (n) => `${n.callFrame.functionName || '(anônima)'} @ ${basename(n.callFrame.url || '?')}:${n.callFrame.lineNumber + 1}`;
const ehEntrada = (n) => n.callFrame.functionName === dentro && n.callFrame.url.endsWith(doArquivo);
const dt = new Map();
perfil.samples.forEach((id, k) => dt.set(k, perfil.timeDeltas[k + 1] ?? 0));
let totalMs = 0; let dentroMs = 0;
const proprio = new Map(); const filhas = new Map();
perfil.samples.forEach((id, k) => {
  const ms = (dt.get(k) ?? 0) / 1000; totalMs += ms;
  const pilha = []; let x = id; while (x !== undefined) { pilha.push(nos.get(x)); x = pai.get(x); }
  const i = pilha.findIndex(ehEntrada);
  if (i < 0) return;
  dentroMs += ms;
  const r = rotulo(pilha[0]); proprio.set(r, (proprio.get(r) ?? 0) + ms);
  const filha = i > 0 ? rotulo(pilha[i - 1]) : '(próprio)'; filhas.set(filha, (filhas.get(filha) ?? 0) + ms);
});
const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([f, ms]) => ({ f, s: Number((ms / 1000).toFixed(2)), fracao: Number((ms / dentroMs).toFixed(3)) }));
console.log(JSON.stringify({ perfil: basename(arquivoDoPerfil), totalS: Number((totalMs / 1000).toFixed(1)), dentro: `${dentro} @ ${doArquivo}`, dentroS: Number((dentroMs / 1000).toFixed(1)), filhas: top(filhas, 12), proprio: top(proprio, 15) }, null, 1));
