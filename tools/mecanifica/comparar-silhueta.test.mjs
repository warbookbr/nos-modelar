import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compararSilhueta, faixaDaCabine } from './comparar-silhueta.mjs';
import { fonteDeReceita } from './fonte-sintetica.mjs';
import receitaBase, { veiculoDeCaixa } from './fixtures/veiculo-caixa/receita.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../..');
const fonte = fonteDeReceita(receitaBase);
/* Cabine mais estreita que a da fonte (600 contra 900 de meia largura): o perfil lateral e a planta do corpo não mudam, só a seção da estufa. */
const estreita = veiculoDeCaixa({ cabineMeiaLargura: 600 });

describe('comparar-silhueta: comportamento padrão', () => {
  it('confere a receita igual à fonte e imprime as linhas de sempre, sem linha de cabine', () => {
    const r = compararSilhueta(receitaBase, fonte);
    expect(r.falha).toBe(false);
    expect(r.linhas[0]).toMatch(/^caixa x: receita -900\.\.900 mm/);
    expect(r.linhas.at(-1)).toBe('RESULTADO: a silhueta confere com a referência dentro da tolerância');
    expect(r.linhas.some((l) => /cabine|corpo|AVISO/.test(l))).toBe(false);
    expect(r.tolerancia).toBeCloseTo(200, 5);
  });
});

describe('comparar-silhueta --rigoroso', () => {
  it('usa 2% do comprimento e recusa uma fatia fora que o padrão aceitaria', () => {
    /* 60 mm a menos de meia largura em x: a caixa e todas as fatias de xmax diferem 60 mm. Com 5% (200 mm) passa; com 2% (80 mm) também. Use 120 mm. */
    const fora = veiculoDeCaixa({ meiaLargura: 780, cabineMeiaLargura: 780 });
    expect(compararSilhueta(fora, fonte).falha).toBe(false);
    const r = compararSilhueta(fora, fonte, { rigoroso: true });
    expect(r.tolerancia).toBeCloseTo(80, 5);
    expect(r.falha).toBe(true);
    expect(r.linhas.at(-2)).toMatch(/^RESULTADO \(rigoroso, 80 mm por fatia, nenhuma fatia fora\): a silhueta se afasta/);
    expect(r.linhas.at(-1)).toMatch(/confere a escala e o envelope por fatia, não a forma/);
  });
  it('aprova a receita igual, e ainda avisa que não confere a forma', () => {
    const r = compararSilhueta(receitaBase, fonte, { rigoroso: true });
    expect(r.falha).toBe(false);
    expect(r.linhas.at(-2)).toMatch(/a silhueta confere com a referência$/);
    expect(r.linhas.at(-1)).toMatch(/^AVISO: isto confere a escala/);
  });
  it('--tolerancia-mm vale sobre o 2%', () => {
    const fora = veiculoDeCaixa({ meiaLargura: 780, cabineMeiaLargura: 780 });
    expect(compararSilhueta(fora, fonte, { rigoroso: true, toleranciaMm: 150 }).falha).toBe(false);
  });
});

describe('comparar-silhueta --cabine', () => {
  it('acha a cintura da fonte e mede a estufa em separado do corpo', () => {
    const faixa = faixaDaCabine(fonte, 'auto');
    expect(faixa.de).toBeGreaterThan(850); expect(faixa.de).toBeLessThan(1000);
    const r = compararSilhueta(estreita, fonte, { cabine: 'auto' });
    const linhaCabine = r.linhas.find((l) => l.startsWith('cabine ('));
    const linhaCorpo = r.linhas.find((l) => l.startsWith('corpo ('));
    expect(linhaCabine).toBeTruthy(); expect(linhaCorpo).toBeTruthy();
    /* a seção frontal da cabine estreita erra 300 mm; o corpo, que não mudou, erra no máximo o que o perfil da cabine tem de diferença */
    expect(r.regiao.cabine.max).toBeGreaterThanOrEqual(290);
    expect(r.regiao.cabine.ruins.length).toBeGreaterThan(0);
    expect(r.regiao.corpo.max).toBeLessThan(r.regiao.cabine.max);
  });
  it('sem --rigoroso a medida da cabine só informa: o código de saída não muda', () => {
    const sem = compararSilhueta(estreita, fonte); const com = compararSilhueta(estreita, fonte, { cabine: 'auto' });
    expect(com.falha).toBe(sem.falha);
    expect(com.linhas.filter((l) => !/cabine|corpo/.test(l))).toEqual(sem.linhas);
  });
  it('aceita a faixa em y declarada e recusa faixa malformada', () => {
    expect(faixaDaCabine(fonte, '900:1600')).toMatchObject({ de: 900, ate: 1600 });
    expect(() => faixaDaCabine(fonte, '1600:900')).toThrow(/--cabine aceita/);
    expect(() => faixaDaCabine(fonte, 'alta')).toThrow(/--cabine aceita/);
  });
  it('diz que não há estufa quando a fonte tem o comprimento todo até o teto', () => {
    const lisa = veiculoDeCaixa({ cintura: 1500, teto: 1500.5 });
    const f = fonteDeReceita({ ...lisa, PASSOS: lisa.PASSOS.slice(0, 1).concat(lisa.PASSOS.slice(2, 3), lisa.PASSOS.slice(4, 5)) });
    expect(faixaDaCabine(f, 'auto')).toBeNull();
  });
});

describe('comparar-silhueta recusa fonte sem frente conferida', () => {
  it('na função e na linha de comando (código 2)', () => {
    const semFrente = fonteDeReceita(receitaBase, { semFrente: true });
    expect(() => compararSilhueta(receitaBase, semFrente)).toThrow(/não registra a frente/);
    const pasta = mkdtempSync(join(tmpdir(), 'cs-'));
    try {
      writeFileSync(join(pasta, 'fonte-partes.json'), JSON.stringify(semFrente));
      const r = spawnSync('node', [join(AQUI, 'comparar-silhueta.mjs'), join(AQUI, 'fixtures/veiculo-caixa/receita.js'), join(pasta, 'fonte-partes.json')], { cwd: REPO, encoding: 'utf8' });
      expect(r.status).toBe(2); expect(r.stderr).toMatch(/não registra a frente/);
      writeFileSync(join(pasta, 'fonte-partes.json'), JSON.stringify(fonte));
      const ok = spawnSync('node', [join(AQUI, 'comparar-silhueta.mjs'), join(AQUI, 'fixtures/veiculo-caixa/receita.js'), join(pasta, 'fonte-partes.json'), '--rigoroso', '--cabine', 'auto'], { cwd: REPO, encoding: 'utf8' });
      expect(ok.status).toBe(0); expect(ok.stdout).toMatch(/RESULTADO \(rigoroso/); expect(ok.stdout).toMatch(/^cabine \(/m);
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  });
});
