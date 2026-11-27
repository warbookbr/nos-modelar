/* resumo-do-acervo.test.mjs — a linha de comando do resumo das réguas de malha: a ajuda sai sem medir o acervo, a bandeira desconhecida
   recusa em vez de disparar a medida inteira, e uma peça pedida sai com os números. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { medirPecaDoAcervo } from './resumo-do-acervo.mjs';

const CLI = fileURLToPath(new URL('./resumo-do-acervo.mjs', import.meta.url));
const rodar = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

describe('resumo das réguas de malha no acervo', () => {
  it('--ajuda sai com zero, cita o comando e não mede nada', () => {
    const r = rodar('--ajuda');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('npm run reguas:malha:acervo');
    expect(r.stdout).not.toContain('peças; colunas');
  });

  it('a bandeira desconhecida recusa com 2', () => {
    const r = rodar('--jsn', 'x.json');
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("não conheço '--jsn'");
  });

  it('a peça que não existe sai com o motivo, sem números', async () => {
    const r = await medirPecaDoAcervo('peca-que-nao-existe');
    expect(r.motivo).toMatch(/^não executou/);
    expect(r.faces).toBeUndefined();
  });
});
