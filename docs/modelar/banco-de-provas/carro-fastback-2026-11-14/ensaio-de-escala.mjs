/* ensaio-de-escala.mjs — quanto custa o ajuste da gaiola da lataria do carro-fastback quando a rede cresce até o tamanho do carro inteiro.
 * A rede do quarto traseiro é refeita com `chapa.passo` menor (a variante pela tabela, como `--params`), e só o primeiro passo da receita,
 * a `subdivisao` com o ajuste às medidas, é executado: os vãos, o arco e as regiões ficam de fora, porque o que se mede é o ajuste.
 * Uso, da raiz do repositório, um passo por processo (o pico de memória é o do processo):
 *   node --max-old-space-size=8192 docs/modelar/banco-de-provas/carro-fastback-2026-11-14/ensaio-de-escala.mjs <passo em mm> [...]
 * Sem passo, roda a série 70, 64, 58, 52 e 47 (a de 47 leva minutos), cada uma num processo filho, e imprime uma linha JSON por passo e o ajuste da lei de
 * potência do tempo e da memória sobre os vértices da gaiola (a meia que a receita declara; o espelho os dobra dentro da subdivisão). Nada no repositório versionado é escrito. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../../../../..');
const RECEITA = resolve(RAIZ, 'procedural/pecas/carro-fastback/partes/lataria/receita.js');
const SERIE = [70, 64, 58, 52, 47];

async function medir(passo) {
  const receita = (await import(pathToFileURL(RECEITA).href)).default;
  const { executarReceita } = await import(pathToFileURL(resolve(RAIZ, 'src/autoria/executar-receita.js')).href);
  const { receitaComParams } = await import(pathToFileURL(resolve(RAIZ, 'tools/modelar/entrada-de-medida.mjs')).href);
  const t0 = performance.now();
  const v = receitaComParams(receita, { chapa: { passo } });
  const TOPO = v.TOPO;
  const tRede = performance.now() - t0;
  /* só o primeiro passo, a subdivisão, e a parte que nomeia o sólido dela: sem a parte o sólido fica órfão e o núcleo não o executa */
  const PASSOS = [v.PASSOS[0], ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }]];
  const verticesDaGaiola = PASSOS[0][1].vertices.length;
  const t1 = performance.now();
  const { neutro } = executarReceita({ PARAMS: v.PARAMS, TOPO, ALIASES: v.ALIASES, PASSOS });
  const tSub = performance.now() - t1;
  if (neutro.orfaos.length) throw new Error(`a subdivisão não executou: ${neutro.orfaos[0].motivo}`);
  return { passo, verticesDaGaiola, segundosDaRede: +(tRede / 1000).toFixed(2), segundosDaSubdivisao: +(tSub / 1000).toFixed(2), picoMb: Math.round(process.resourceUsage().maxRSS / 1024) };
}

function leiDePotencia(xs, ys) {
  const lx = xs.map(Math.log), ly = ys.map(Math.log), n = xs.length;
  const mx = lx.reduce((a, b) => a + b) / n, my = ly.reduce((a, b) => a + b) / n;
  const k = lx.reduce((s, x, i) => s + (x - mx) * (ly[i] - my), 0) / lx.reduce((s, x) => s + (x - mx) ** 2, 0);
  return { expoente: +k.toFixed(2), em: (v) => Math.exp(my + k * (Math.log(v) - mx)) };
}

const args = process.argv.slice(2).map(Number);
if (args.length) {
  for (const p of args) console.log(JSON.stringify(await medir(p)));
} else {
  const linhas = [];
  for (const p of SERIE) {
    const r = spawnSync(process.execPath, ['--max-old-space-size=8192', fileURLToPath(import.meta.url), String(p)], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 26 });
    const ultima = r.stdout.trim().split('\n').filter((l) => l.startsWith('{')).pop();
    if (r.status !== 0 || !ultima) { console.log(JSON.stringify({ passo: p, falhou: r.status, erro: r.stderr.trim().split('\n').slice(-3).join(' | ') })); break; }
    console.log(ultima); linhas.push(JSON.parse(ultima));
  }
  if (linhas.length >= 3) {
    const v = linhas.map((l) => l.verticesDaGaiola);
    const tempo = leiDePotencia(v, linhas.map((l) => l.segundosDaSubdivisao)), mem = leiDePotencia(v, linhas.map((l) => l.picoMb));
    /* o carro inteiro dobra o comprimento do quarto traseiro: de 4.300 a 5.000 vértices na meia gaiola */
    const alvo = [4300, 5000].map((n) => ({ vertices: n, segundos: Math.round(tempo.em(n)), picoMb: Math.round(mem.em(n)) }));
    console.log(JSON.stringify({ leiDoTempo: tempo.expoente, leiDaMemoria: mem.expoente, projecao: alvo }));
  }
}
