/* mecanismos.test.mjs — a página dos mecanismos cita toda pasta de primeiro nível, ou ela consta nas dispensas com motivo. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DISPENSAS, PAGINA, TETO_DE_LINHAS, conferirMecanismos } from './mecanismos.mjs';

const raizes = [];
function repositorio({ pagina, pastas = [], arquivos = [] }) {
  const raiz = mkdtempSync(join(tmpdir(), 'mecanismos-'));
  raizes.push(raiz);
  for (const p of pastas) mkdirSync(join(raiz, p), { recursive: true });
  for (const a of arquivos) { mkdirSync(dirname(join(raiz, a)), { recursive: true }); writeFileSync(join(raiz, a), 'x'); }
  mkdirSync(dirname(join(raiz, PAGINA)), { recursive: true });
  writeFileSync(join(raiz, PAGINA), pagina);
  return raiz;
}
afterEach(() => { for (const r of raizes.splice(0)) rmSync(r, { recursive: true, force: true }); });

describe('conferência da página dos mecanismos', () => {
  it('a página em dia passa', () => {
    const raiz = repositorio({ pagina: '| A | b | c | `tools/mcp/`, `.claude/skills/`, `.claude/REGRAS.md` |\n', pastas: ['tools/mcp', '.claude/skills'], arquivos: ['.claude/REGRAS.md', 'tools/solto.mjs'] });
    expect(conferirMecanismos({ raiz, dispensas: {} }).problemas).toEqual([]);
  });

  it('pasta nova sem linha reprova, e a mensagem diz o que fazer', () => {
    const raiz = repositorio({ pagina: '| A | b | c | `tools/mcp/` |\n', pastas: ['tools/mcp', 'tools/nova'] });
    const { problemas } = conferirMecanismos({ raiz, dispensas: {} });
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain('tools/nova/ não está em docs/modelar/MECANISMOS.md');
    expect(problemas[0]).toContain('uma linha na tabela');
    expect(problemas[0]).toContain('DISPENSAS');
  });

  it('o .md solto em .claude/ também precisa estar citado', () => {
    const raiz = repositorio({ pagina: '| A |\n', arquivos: ['.claude/REGRAS.md'] });
    expect(conferirMecanismos({ raiz, dispensas: {} }).problemas[0]).toContain('.claude/REGRAS.md');
  });

  it('a pasta dispensada passa, e a dispensa que não serve mais reprova', () => {
    const raiz = repositorio({ pagina: '| A |\n', pastas: ['tools/fixtures'] });
    expect(conferirMecanismos({ raiz, dispensas: { 'tools/fixtures/': 'dado de teste' } }).problemas).toEqual([]);
    expect(conferirMecanismos({ raiz, dispensas: { 'tools/fixtures/': 'dado de teste', 'tools/sumiu/': 'x' } }).problemas[0]).toContain('já não existe');
    const citada = repositorio({ pagina: '| `tools/fixtures/` |\n', pastas: ['tools/fixtures'] });
    expect(conferirMecanismos({ raiz: citada, dispensas: { 'tools/fixtures/': 'dado de teste' } }).problemas[0]).toContain('já está citada');
  });

  it('a página acima do teto de linhas reprova', () => {
    const raiz = repositorio({ pagina: `${'linha\n'.repeat(TETO_DE_LINHAS + 1)}` });
    expect(conferirMecanismos({ raiz, dispensas: {} }).problemas[0]).toContain(`o teto é ${TETO_DE_LINHAS}`);
  });

  it('toda dispensa declara o motivo, e o repositório passa', () => {
    for (const [pasta, motivo] of Object.entries(DISPENSAS)) expect(motivo.length, pasta).toBeGreaterThan(10);
    expect(conferirMecanismos().problemas).toEqual([]);
  });
});
