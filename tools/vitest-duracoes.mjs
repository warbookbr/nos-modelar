/* vitest-duracoes.mjs — repórter do Vitest que grava a duração de cada arquivo de teste.
 *
 * O gate `test` mostrava só o tempo da suíte inteira, e em 2026-10-13 a bateria completa passou de 4 a 6 minutos para 22 sem que
 * nada apontasse o arquivo culpado (`esboco-blocagem.test.mjs`, 8 minutos sozinho, que caiu a 2 depois de medido por etapa). Este
 * repórter grava, ao fim de cada `vitest run`, a duração de cada arquivo em `tmp/gates/duracoes-dos-testes.json` (a pasta `tmp/` é
 * ignorada pelo git), e o `tools/gates.mjs` lê o arquivo depois do gate `test` e lista os mais lentos, com aviso para o que passa do
 * teto. Não muda o resultado de nenhum teste. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { doAmbiente } from './ambiente.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
/* Um arquivo por bateria, porque `test:rapidos` e `test:lentos` rodam ao mesmo tempo no `npm run gates`. */
export const arquivoDasDuracoes = (modo = doAmbiente('TESTES')) => join('tmp', 'gates', `duracoes-dos-testes${modo ? `-${modo}` : ''}.json`);
export const ARQUIVO_DAS_DURACOES = join('tmp', 'gates', 'duracoes-dos-testes.json');

/* O HISTÓRICO DAS DURAÇÕES. O teto de tempo de um arquivo, medido numa execução só, reprovou três vezes numa semana um arquivo com a
   peça certa (80 s no CI para 27 s sozinho; 337 s contra um teto de 320 s; 180 s). Cada execução das baterias `rapidos` e `lentos`
   acrescenta aqui a duração de cada arquivo que rodou, e `tools/testes-lentos.mjs` tira o teto da mediana delas. São as últimas
   `JANELA_DO_HISTORICO` execuções de cada arquivo, da mais antiga para a mais nova, num arquivo por bateria (as duas rodam ao mesmo
   tempo). A medida "sozinho" e o vitest solto, sem bateria, não gravam: medem outra coisa. */
export const JANELA_DO_HISTORICO = 10;
export const arquivoDoHistorico = (modo) => join('tmp', 'gates', `historico-das-duracoes-${modo}.json`);

export function anexarAoHistorico(historico, duracoes, janela = JANELA_DO_HISTORICO) {
  const novo = { ...historico };
  for (const { arquivo, ms } of duracoes) novo[arquivo] = [...(novo[arquivo] ?? []), ms].slice(-janela);
  return novo;
}

export function lerHistorico(modo, raiz = RAIZ) {
  try { return JSON.parse(readFileSync(join(raiz, arquivoDoHistorico(modo)), 'utf8')); } catch { return {}; }
}

export default class DuracoesDosTestes {
  onTestRunEnd(modulos) {
    const duracoes = modulos
      .map((m) => ({ arquivo: relative(RAIZ, m.moduleId).split('\\').join('/'), ms: Math.round(m.diagnostic().duration) }))
      .sort((a, b) => b.ms - a.ms);
    const caminho = join(RAIZ, arquivoDasDuracoes());
    mkdirSync(dirname(caminho), { recursive: true });
    writeFileSync(caminho, `${JSON.stringify({ gravado: new Date().toISOString(), duracoes }, null, 1)}\n`, 'utf8');
    const modo = doAmbiente('TESTES');
    if (!modo) return;
    const historico = join(RAIZ, arquivoDoHistorico(modo));
    writeFileSync(historico, JSON.stringify(anexarAoHistorico(lerHistorico(modo), duracoes)), 'utf8');
  }
}
