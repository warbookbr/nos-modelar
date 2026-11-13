/* guarda-local.mjs — a guarda do acervo, só das peças que o envio mudou, dentro da bateria local.
 *
 * Medido na revisão de 2026-11-13: de sete reprovações lidas do CI, o único defeito real de peça seria pego em 2 minutos por
 * uma guarda que só rodava no CI, porque a bateria local deixava `guarda:acervo` inteiro para lá. A guarda aceita nome de peça
 * (`node tools/modelar/guardas/guarda-acervo.mjs <peça>`), então a bateria roda só as peças que têm arquivo mudado desde o ramo
 * remoto. A peça cuja guarda passa de `LIMITE_DA_PECA_MS` fica para o CI, com aviso: furgao-realista leva cerca de 2 minutos.
 * O CI chama a guarda sem nome e confere o acervo inteiro; isto não o toca. */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const LIMITE_DA_PECA_MS = 60_000;
export const ARQUIVO_DAS_DURACOES_DA_GUARDA = join('tmp', 'gates', 'duracoes-da-guarda-acervo.json');
const PASTA_DO_ACERVO = 'procedural/pecas/';

/* As peças do acervo (nomes que `pecasDoAcervo` devolve) que têm arquivo mudado. O nome da peça é o caminho dentro do acervo; um
   arquivo dentro de `partes/` pertence à parte, que a guarda conhece sem `partes/`. Vale o nome mais longo que abre o caminho. */
export function pecasMudadas(alterados, pecas) {
  const achadas = new Set();
  for (const arquivo of alterados ?? []) {
    if (!arquivo.startsWith(PASTA_DO_ACERVO)) continue;
    const interno = arquivo.slice(PASTA_DO_ACERVO.length);
    const curto = interno.replace('/partes/', '/');
    const dona = pecas
      .filter((p) => [interno, curto].some((c) => c === `${p}.js` || c.startsWith(`${p}/`)))
      .sort((a, b) => b.length - a.length)[0];
    if (dona) achadas.add(dona);
  }
  return [...achadas].sort();
}

export function lerDuracoesDaGuarda(raiz = '.') {
  try { return JSON.parse(readFileSync(join(raiz, ARQUIVO_DAS_DURACOES_DA_GUARDA), 'utf8')); } catch { return {}; }
}

function gravarDuracoesDaGuarda(duracoes, raiz) {
  const caminho = join(raiz, ARQUIVO_DAS_DURACOES_DA_GUARDA);
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, JSON.stringify(duracoes));
}

/* Roda a guarda de uma peça e para no limite. Devolve { codigo, saida, estourou }. */
export function executarGuardaDaPeca(peca, limiteMs = LIMITE_DA_PECA_MS, raiz = '.') {
  return new Promise((resolver) => {
    const processo = spawn(process.execPath, ['tools/modelar/guardas/guarda-acervo.mjs', peca], { cwd: raiz, stdio: ['ignore', 'pipe', 'pipe'] });
    const pedacos = [];
    let estourou = false;
    const relogio = setTimeout(() => { estourou = true; processo.kill('SIGKILL'); }, limiteMs);
    processo.stdout.on('data', (d) => pedacos.push(d));
    processo.stderr.on('data', (d) => pedacos.push(d));
    processo.on('close', (status) => { clearTimeout(relogio); resolver({ codigo: status ?? 1, saida: Buffer.concat(pedacos).toString(), estourou }); });
  });
}

/* Uma peça de cada vez, para não disputar a máquina com a bateria. A peça medida acima do limite, ou que estoura nele agora, vai
   para o CI com aviso; a duração fica guardada para a próxima rodada nem começar a peça lenta. */
export async function rodarGuardaLocal(pecas, { raiz = '.', limiteMs = LIMITE_DA_PECA_MS, executar = executarGuardaDaPeca } = {}) {
  const duracoes = lerDuracoesDaGuarda(raiz);
  const medidas = [];
  const paraOCi = [];
  const reprovadas = [];
  const linhas = [];
  for (const peca of pecas) {
    if (duracoes[peca] > limiteMs) { paraOCi.push(peca); linhas.push(`guarda:acervo — ${peca} levou ${Math.round(duracoes[peca] / 1000)}s na última medida, passa de ${limiteMs / 1000}s: fica para o CI.`); continue; }
    const inicio = Date.now();
    const { codigo, saida, estourou } = await executar(peca, limiteMs, raiz);
    if (estourou) { duracoes[peca] = limiteMs + 1; paraOCi.push(peca); linhas.push(`guarda:acervo — ${peca} passou de ${limiteMs / 1000}s e foi interrompida: fica para o CI.`); continue; }
    duracoes[peca] = Date.now() - inicio;
    if (codigo === 0) { medidas.push(peca); linhas.push(saida.trim()); } else { reprovadas.push(peca); linhas.push(saida.trim()); }
  }
  try { gravarDuracoesDaGuarda(duracoes, raiz); } catch { /* a medida é conveniência */ }
  return { codigo: reprovadas.length ? 1 : 0, medidas, reprovadas, paraOCi, saida: `${linhas.join('\n')}\n` };
}
