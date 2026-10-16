/* vitest-duracoes.mjs — repórter do Vitest que grava a duração de cada arquivo de teste.
 *
 * O gate `test` mostrava só o tempo da suíte inteira, e em 2026-10-13 a bateria completa passou de 4 a 6 minutos para 22 sem que
 * nada apontasse o arquivo culpado (`esboco-blocagem.test.mjs`, 8 minutos sozinho, que caiu a 2 depois de medido por etapa). Este
 * repórter grava, ao fim de cada `vitest run`, a duração de cada arquivo em `tmp/gates/duracoes-dos-testes.json` (a pasta `tmp/` é
 * ignorada pelo git), e o `tools/gates.mjs` lê o arquivo depois do gate `test` e lista os mais lentos, com aviso para o que passa do
 * teto. Não muda o resultado de nenhum teste. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
/* Um arquivo por bateria, porque `test:rapidos` e `test:lentos` rodam ao mesmo tempo no `npm run gates`. */
export const arquivoDasDuracoes = (modo = process.env.MECANIFICA_TESTES) => join('tmp', 'gates', `duracoes-dos-testes${modo ? `-${modo}` : ''}.json`);
export const ARQUIVO_DAS_DURACOES = join('tmp', 'gates', 'duracoes-dos-testes.json');

export default class DuracoesDosTestes {
  onTestRunEnd(modulos) {
    const duracoes = modulos
      .map((m) => ({ arquivo: relative(RAIZ, m.moduleId).split('\\').join('/'), ms: Math.round(m.diagnostic().duration) }))
      .sort((a, b) => b.ms - a.ms);
    const caminho = join(RAIZ, arquivoDasDuracoes());
    mkdirSync(dirname(caminho), { recursive: true });
    writeFileSync(caminho, `${JSON.stringify({ gravado: new Date().toISOString(), duracoes }, null, 1)}\n`, 'utf8');
  }
}
