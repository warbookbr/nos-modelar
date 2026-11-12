/* controle-do-recorte.test.ts — a trava de `CONTROLE_DO_RECORTE` (plano `2026-11-09-abertura-na-vizinhanca-de-todo-vao.md`): o controle que
   desliga o recorte da vizinhança é de prova. Uma receita é JavaScript e importa o núcleo, e se o usasse a malha dela dependeria de um
   estado global; por isso nenhum arquivo do repositório o cita fora dos testes (`*.test.*`) e do módulo que o define. */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

const RAIZ = resolve(__dirname, '../../..');
const DONO = 'procedural/nucleo/operacoes/abertura-por-contorno.js';

it('nenhum arquivo fora dos testes e do módulo dono usa CONTROLE_DO_RECORTE', () => {
  /* os arquivos que o git conhece, sem node_modules nem .claude (as cópias isoladas); os que ainda não entraram no índice também */
  const lista = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: RAIZ, maxBuffer: 1 << 28 }).toString().split('\0').filter(Boolean);
  const candidatos = lista.filter((f) => !/(^|\/)(node_modules|\.claude)\//.test(f) && /\.(m?[jt]sx?|cjs|html|json|md)$/.test(f));
  const usos = candidatos.filter((f) => f !== DONO && !/\.test\.[^/]*$/.test(f) && readFileSync(join(RAIZ, f), 'utf8').includes('CONTROLE_DO_RECORTE'));
  /* o plano e a documentação podem citá-lo em texto; o que importa é código */
  expect(usos.filter((f) => !f.endsWith('.md')), 'arquivos que usam CONTROLE_DO_RECORTE fora de testes').toEqual([]);
  expect(candidatos).toContain(DONO);
});
