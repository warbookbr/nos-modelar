/* leituras-do-teste.mjs — setupFile do vitest: abre o registro do arquivo de teste deste processo e liga a anotação de
 * tools/gates/leituras.mjs. Só entra na configuração quando a bateria liga GATES_LEITURAS_DIR. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { expect } from 'vitest';
import { arquivoDoRegistro, instalar } from './leituras.mjs';

const diretorio = process.env.GATES_LEITURAS_DIR;
const teste = relative(process.cwd(), expect.getState().testPath ?? '').split('\\').join('/');
if (diretorio && teste) {
  mkdirSync(diretorio, { recursive: true });
  const destino = arquivoDoRegistro(diretorio, teste);
  writeFileSync(destino, `${JSON.stringify({ teste })}\n`);
  process.env.GATES_LEITURAS_DESTINO = destino;
  instalar(destino);
}
