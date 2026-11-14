/* receita-esqueleto.test.mjs — `npm run receita:esqueleto` cria a receita que o alinhamento vai preencher, e o `PLANO` vazio é
   recusado pelo normalizador até estar completo. */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { normalizarPlanoDeModelagem } from '../../src/autoria/plano-de-modelagem.js';
import { executar } from './receita-esqueleto.mjs';

let raiz;
beforeEach(() => { raiz = mkdtempSync(join(tmpdir(), 'esqueleto-')); });
afterEach(() => rmSync(raiz, { recursive: true, force: true }));

const caminho = (peca) => join(raiz, 'procedural/pecas', peca, 'receita.js');
const carregar = async (peca) => (await import(`${pathToFileURL(caminho(peca)).href}?t=${Math.random()}`));

describe('receita:esqueleto', () => {
  it('cria a receita com contatos [], TABELA {} e sem passos, e o PLANO vazio é recusado', async () => {
    const r = executar(['pedal'], { raiz });
    expect(r.codigo).toBe(0);
    const modulo = await carregar('pedal');
    expect(modulo.TABELA).toEqual({});
    expect(modulo.default.contatos).toEqual([]);
    expect(modulo.default.PASSOS).toEqual([]);
    expect(() => normalizarPlanoDeModelagem(modulo.PLANO)).toThrow(/PLANO/);
  });

  it('o esqueleto traz a forma mínima de material, parte com vários corpos, ALIASES, PONTOS e furos, apontando a receita do acervo que é exemplo vivo', () => {
    executar(['pedal'], { raiz });
    const texto = readFileSync(caminho('pedal'), 'utf8');
    for (const assunto of ['MATERIAL:', 'PARTE COM VÁRIOS CORPOS:', 'ALIASES:', 'PONTOS:', 'FUROS:']) expect(texto).toContain(assunto);
    for (const exemplo of ['procedural/pecas/suporte-tubo/receita.js', 'procedural/pecas/trator-pa/receita.js', 'procedural/pecas/carenagem-de-prova/receita.js']) {
      expect(texto).toContain(exemplo);
      expect(existsSync(join(process.cwd(), exemplo))).toBe(true);
    }
  });

  it('--objeto, --escala e --partes adiantam o dito, e o plano segue recusado enquanto forma, técnica e critérios faltam', async () => {
    const r = executar(['pedal', '--objeto=pedal de bicicleta, o conjunto inteiro', '--escala=comprimento total:100', '--partes=corpo,eixoDoPedal'], { raiz });
    expect(r.codigo).toBe(0);
    const { PLANO } = await carregar('pedal');
    expect(PLANO.objeto).toBe('pedal de bicicleta, o conjunto inteiro');
    expect(PLANO.escala).toEqual({ medida: 'comprimento total', milimetros: 100 });
    expect(PLANO.partes.map((p) => p.nome)).toEqual(['corpo', 'eixoDoPedal']);
    expect(() => normalizarPlanoDeModelagem(PLANO)).toThrow(/referencias|forma|criteriosDeReprovacao/);
    /* preenchido o que faltava, o mesmo texto vira plano válido */
    const pronto = {
      ...PLANO,
      referencias: ['referencias/locais/estudo.jpg'],
      partes: PLANO.partes.map((p) => ({ ...p, forma: 'cilindro de revolução com a ponta chanfrada', tecnica: 'revolução' })),
      criteriosDeReprovacao: ['o eixo não atravessa o furo do corpo no centro'],
    };
    expect(normalizarPlanoDeModelagem(pronto).partes).toHaveLength(2);
  });

  it('recusa quando a receita já existe, sem sobrescrevê-la', () => {
    expect(executar(['pedal', '--objeto=primeiro objeto dito'], { raiz }).codigo).toBe(0);
    const antes = readFileSync(caminho('pedal'), 'utf8');
    const r = executar(['pedal', '--objeto=outro objeto dito aqui'], { raiz });
    expect(r.codigo).toBe(2);
    expect(r.stderr).toContain('já existe');
    expect(readFileSync(caminho('pedal'), 'utf8')).toBe(antes);
  });

  it('recusa nome de peça, escala e partes malformados, sem criar arquivo', () => {
    expect(executar(['Pedal Novo'], { raiz }).codigo).toBe(2);
    expect(executar(['pedal', '--escala=cem'], { raiz }).stderr).toContain('--escala');
    expect(executar(['pedal', '--partes=corpo,corpo'], { raiz }).stderr).toContain('repetir');
    expect(executar(['pedal', '--partes=corpo-1'], { raiz }).stderr).toContain('nome de parte');
    expect(existsSync(caminho('pedal'))).toBe(false);
  });

  it('--ajuda imprime o uso e não cria nada', () => {
    const r = executar(['--ajuda'], { raiz });
    expect(r.codigo).toBe(0);
    expect(r.stdout).toContain('receita:esqueleto');
    expect(executar([], { raiz }).codigo).toBe(2);
  });
});
