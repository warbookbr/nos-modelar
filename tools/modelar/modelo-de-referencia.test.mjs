/* modelo-de-referencia.test.mjs — a entrada do estudo de modelo de terceiros: o passo escolhe a ferramenta do grupo, a opção com `=`
   chega a ela na forma que ela lê, e a linha de comando de antes (sem passo) continua sendo o estudo da malha. */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AJUDA_DO_ESTUDO, PASSOS_DO_ESTUDO, rotearEstudo } from './modelo-de-referencia.mjs';

const ENTRADA = fileURLToPath(new URL('./modelo-de-referencia.mjs', import.meta.url));

describe('entrada do estudo de modelo de terceiros', () => {
  it('cada passo aponta para um arquivo do grupo que existe, e a ajuda cita todos', () => {
    for (const [nome, passo] of Object.entries(PASSOS_DO_ESTUDO)) {
      expect(existsSync(fileURLToPath(new URL(passo.modulo, import.meta.url))), nome).toBe(true);
      expect(AJUDA_DO_ESTUDO).toContain(`npm run modelo:referencia -- ${nome} `);
    }
  });

  it('o passo escolhe o módulo e a opção com = vira o par que a ferramenta lê', () => {
    expect(rotearEstudo(['folha', 'r.js', 'f.json', '--saida=tmp/x', '--folga-px', '2'])).toEqual({ passo: 'folha', modulo: './folha-comparativa.mjs', args: ['r.js', 'f.json', '--saida', 'tmp/x', '--folga-px', '2'] });
    expect(rotearEstudo(['silhueta', 'r.js', 'f.json', '--rigoroso', '--cabine=auto'])).toEqual({ passo: 'silhueta', modulo: './comparar-silhueta.mjs', args: ['r.js', 'f.json', '--rigoroso', '--cabine', 'auto'] });
  });

  it('sem passo, ou com estudar, é o estudo da malha, com os argumentos de antes', () => {
    expect(rotearEstudo(['carro.glb', '--saida', 'tmp/x', '--frente', '-z'])).toEqual({ passo: 'estudar', args: ['carro.glb', '--saida', 'tmp/x', '--frente', '-z'] });
    expect(rotearEstudo(['estudar', 'carro.glb', '--saida=tmp/x', '--frente=-z', '--cor=#aabbcc'])).toEqual({ passo: 'estudar', args: ['carro.glb', '--saida', 'tmp/x', '--frente', '-z', '--cor', '#aabbcc'] });
  });

  it('--ajuda sai com zero e a mensagem; o passo sem argumento devolve o uso e o código da ferramenta dele', () => {
    expect(rotearEstudo(['medidas', '--ajuda'])).toEqual({ ajuda: true });
    expect(execFileSync(process.execPath, [ENTRADA, '--ajuda'], { encoding: 'utf8' })).toBe(AJUDA_DO_ESTUDO);
    const r = spawnSync(process.execPath, [ENTRADA, 'medidas'], { encoding: 'utf8' });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('medidas-da-fonte.mjs <fonte-partes.json>');
  });
});
