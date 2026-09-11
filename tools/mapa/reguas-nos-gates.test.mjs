/* reguas-nos-gates.test.mjs — a régua órfã precisa reprovar.
 *
 * O caso guardado aqui aconteceu três vezes num dia só: comando de verificação
 * que existe, sai com código de erro na divergência, e não é chamado por gate
 * nem pelo CI. Um deles estava vermelho havia três semanas sem ninguém ver.
 * Este teste prova que a guarda acusa isso, e que a exceção só vale escrita.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FORA_DOS_GATES, conferirReguas, ehRegua } from './reguas-nos-gates.mjs';
import { GATES } from '../gates.mjs';

describe('réguas rodadas por alguém', () => {
  it('o repositório de hoje passa', () => {
    expect(conferirReguas().problemas).toEqual([]);
  });

  it('reconhece pelo nome quem promete verificação', () => {
    expect(ehRegua('docs:links:check')).toBe(true);
    expect(ehRegua('guarda:acervo')).toBe(true);
    expect(ehRegua('descrever')).toBe(false);
    expect(ehRegua('exportar:obj')).toBe(false);
  });

  it('REPROVA régua que não está em gate nenhum', () => {
    /* Repositório de mentira com o caso real: uma régua existe e ninguém a
       chama. A raiz é parâmetro justamente para que a falha seja escrevível. */
    const area = mkdtempSync(join(tmpdir(), 'reguas-'));
    try {
      writeFileSync(join(area, 'package.json'), JSON.stringify({
        scripts: { test: 'vitest run', 'forma:check': 'node confere-forma.mjs' },
      }), 'utf8');
      mkdirSync(join(area, '.github/workflows'), { recursive: true });
      writeFileSync(join(area, '.github/workflows/ci.yml'), '      - run: npm run test\n', 'utf8');

      const { problemas } = conferirReguas({ raiz: area, gates: ['test'], excecoes: new Map() });
      expect(problemas).toHaveLength(1);
      expect(problemas[0]).toMatch(/forma:check/);
      expect(problemas[0]).toMatch(/não é rodado por gate nem pelo CI/);
    } finally {
      rmSync(area, { recursive: true, force: true });
    }
  });

  it('REPROVA gate que aponta para script que não existe', () => {
    const { problemas } = conferirReguas({ gates: [...GATES, 'guarda:que-nao-existe'] });
    expect(problemas.some((p) => /não existe como script/.test(p))).toBe(true);
  });

  it('a exceção precisa de motivo escrito, e some quando deixa de valer', () => {
    for (const [nome, motivo] of FORA_DOS_GATES) {
      expect(nome, 'exceção sem nome').toBeTruthy();
      /* Motivo curto é motivo que some: a mesma defesa do contato e do plano. */
      expect(motivo.length, `motivo de '${nome}' é curto demais`).toBeGreaterThan(40);
    }
  });
});
