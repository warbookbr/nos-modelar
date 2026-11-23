/* custo-da-opcao.mjs — quanto a opção `alisarSuperficie` da gaiolaPorRede custa na subdivisão do quarto traseiro do carro-fastback (gate 4 do
 * plano do G2: até o dobro do custo sem ela). A rede é a da receita com `chapa.passo` dado (a variante pela tabela, como `--params`), a opção
 * entra pela alteração de teste da rede (`comAlteracoesNaRede`), e só o passo da `subdivisao` executa, com a parte que nomeia o sólido dela,
 * como no ensaio de escala do carro (`../carro-fastback-2026-11-14/ensaio-de-escala.mjs`).
 * Uso, da raiz do repositório:
 *   node docs/modelar/banco-de-provas/superficie-g2-2026-11-22/custo-da-opcao.mjs [passo em mm ...]
 * Sem passo, mede 70 (o da receita) e 35 (o tamanho do carro inteiro). Cada caso roda REPETICOES vezes, alternando com e sem a opção, cada
 * vez num processo filho, para o pico de memória ser o dele; vale o menor tempo de cada caso, porque o ruído da máquina só soma. Sai uma
 * linha JSON por caso, com os tempos de cada vez, e a razão entre os menores. Nada no repositório versionado é escrito. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../../../../..');
const REPETICOES = 3;
const imp = (p) => import(pathToFileURL(resolve(RAIZ, p)).href);

async function medir(passo, com) {
  const receita = (await imp('procedural/pecas/carro-fastback/partes/lataria/receita.js')).default;
  const { executarReceita } = await imp('src/autoria/executar-receita.js');
  const { receitaComParams } = await imp('tools/modelar/entrada-de-medida.mjs');
  const { comAlteracoesNaRede } = await imp('procedural/nucleo/gaiola-captura.js');
  const montar = () => { const v = receitaComParams(receita, { chapa: { passo } }); return { v, P: v.PASSOS, TOPO: v.TOPO }; };
  const { v, P, TOPO } = com ? comAlteracoesNaRede({ alisarSuperficie: true }, montar) : montar();
  const PASSOS = [P[0], ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }]];
  const t = performance.now();
  const { neutro } = executarReceita({ PARAMS: v.PARAMS, TOPO, ALIASES: v.ALIASES, PASSOS });
  const segundos = (performance.now() - t) / 1000;
  if (neutro.orfaos.length) throw new Error(`a subdivisão não executou: ${neutro.orfaos[0].motivo}`);
  return { passo, opcao: com, verticesDaGaiola: P[0][1].vertices.length, segundos: +segundos.toFixed(2), picoMb: Math.round(process.resourceUsage().maxRSS / 1024) };
}

const [modo, ...resto] = process.argv.slice(2);
if (modo === '--um') {
  console.log(JSON.stringify(await medir(Number(resto[0]), resto[1] === 'com')));
} else {
  const passos = [modo, ...resto].filter((x) => x != null).map(Number);
  for (const passo of passos.length ? passos : [70, 35]) {
    const r = {};
    for (let vez = 0; vez < REPETICOES; vez++) for (const com of ['sem', 'com']) {
      const p = spawnSync(process.execPath, ['--max-old-space-size=8192', fileURLToPath(import.meta.url), '--um', String(passo), com], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 26 });
      const ultima = p.stdout.trim().split('\n').filter((l) => l.startsWith('{')).pop();
      if (p.status !== 0 || !ultima) throw new Error(`passo ${passo}, ${com} a opção: ${p.stderr.trim().split('\n').slice(-3).join(' | ')}`);
      const m = JSON.parse(ultima);
      if (!r[com]) r[com] = { ...m, vezes: [] };
      r[com].vezes.push(m.segundos); r[com].segundos = Math.min(...r[com].vezes); r[com].picoMb = Math.max(r[com].picoMb, m.picoMb);
    }
    for (const com of ['sem', 'com']) console.log(JSON.stringify(r[com]));
    console.log(JSON.stringify({ passo, razao: +(r.com.segundos / r.sem.segundos).toFixed(2) }));
  }
}
