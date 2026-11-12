/* assinatura-da-malha.test.mjs — a assinatura da malha por parte e da peça, e a comparação de duas rodadas. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { assinaturaDoNeutro, comoCLI, compararAssinaturas, formatarComparacao } from './assinatura-da-malha.mjs';

/* duas partes em metro: um quadrado `a` (z = 0) e um triângulo `b` (z = 1) */
function neutro({ deslocamento = 0, ordemDosCantos = [0, 1, 2, 3], numeracao = 0, sentidoDeB = 1, sobraEmB = false } = {}) {
  const V = new Map();
  const F = new Map();
  const quadrado = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]];
  const triangulo = [[0, 0, 1], [1, 0, 1], [0, 1, 1 + deslocamento]];
  quadrado.forEach((p, i) => V.set(numeracao + i, p));
  triangulo.forEach((p, i) => V.set(numeracao + 10 + i, p));
  F.set(numeracao + 100, { vs: ordemDosCantos.map((i) => numeracao + i), parte: 'a' });
  const b = [10, 11, 12].map((i) => numeracao + i);
  F.set(numeracao + 101, { vs: sentidoDeB > 0 ? b : [...b].reverse(), parte: 'b' });
  if (sobraEmB) F.set(numeracao + 102, { vs: b, parte: 'b' });
  return { V, F };
}

describe('assinatura da malha', () => {
  it('é a mesma para a mesma superfície numerada e começada de outro jeito, e uma por parte', () => {
    const base = assinaturaDoNeutro(neutro());
    const outra = assinaturaDoNeutro(neutro({ numeracao: 500, ordemDosCantos: [2, 3, 0, 1] }));
    expect(Object.keys(base.partes)).toEqual(['a', 'b']);
    expect(outra.peca).toBe(base.peca);
    expect(outra.partes.a.assinatura).toBe(base.partes.a.assinatura);
    expect(base.partes.a).toMatchObject({ faces: 1, vertices: 4, caixaMm: { min: [0, 0, 0], max: [1000, 1000, 0] } });
  });

  it('muda quando um canto anda 2 nm, só na parte dele, e quando o sentido do contorno se inverte', () => {
    const base = assinaturaDoNeutro(neutro());
    const anda = assinaturaDoNeutro(neutro({ deslocamento: 2e-9 }));
    expect(anda.partes.a.assinatura).toBe(base.partes.a.assinatura);
    expect(anda.partes.b.assinatura).not.toBe(base.partes.b.assinatura);
    expect(anda.peca).not.toBe(base.peca);
    const virada = assinaturaDoNeutro(neutro({ sentidoDeB: -1 }));
    expect(virada.partes.b.assinatura).not.toBe(base.partes.b.assinatura);
  });

  it('a comparação diz quais partes mudaram, o tamanho da mudança e o que está só de um lado', () => {
    const base = assinaturaDoNeutro(neutro());
    const igual = compararAssinaturas(base, assinaturaDoNeutro(neutro({ numeracao: 7 })));
    expect(igual).toMatchObject({ identicas: true, iguais: ['a', 'b'], diferentes: [] });
    expect(formatarComparacao(igual)).toContain('malha idêntica');

    const mudou = compararAssinaturas(base, assinaturaDoNeutro(neutro({ sobraEmB: true, deslocamento: 0.5 })));
    expect(mudou.identicas).toBe(false);
    expect(mudou.iguais).toEqual(['a']);
    expect(mudou.diferentes).toHaveLength(1);
    expect(mudou.diferentes[0]).toMatchObject({ nome: 'b', deltaFaces: 1, caixaMudou: true });
    const texto = formatarComparacao(mudou);
    expect(texto).toContain('malha DIFERENTE');
    expect(texto).toContain('b: 1 para 2 faces (+1)');

    const semB = { ...base, partes: { a: base.partes.a } };
    expect(compararAssinaturas(base, semB)).toMatchObject({ identicas: false, soEmA: ['b'], soEmB: [] });
  });

  it('recusa um arquivo que não é assinatura', () => {
    expect(() => compararAssinaturas({}, {})).toThrow(/não é mecanifica.assinatura-da-malha@1/);
  });
});

describe('o comando da assinatura', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'assinatura-da-malha-'));
  afterAll(() => rmSync(pasta, { recursive: true, force: true }));

  async function rodar(argv) {
    let saida = ''; let erro = '';
    const escreverOut = process.stdout.write.bind(process.stdout);
    const escreverErr = process.stderr.write.bind(process.stderr);
    process.stdout.write = (t) => { saida += t; return true; };
    process.stderr.write = (t) => { erro += t; return true; };
    try { return { codigo: await comoCLI(argv), saida, erro }; } finally { process.stdout.write = escreverOut; process.stderr.write = escreverErr; }
  }

  it('compara dois arquivos de assinatura: 0 quando iguais e 1 quando a malha difere', async () => {
    const a = join(pasta, 'a.json'); const b = join(pasta, 'b.json'); const c = join(pasta, 'c.json');
    writeFileSync(a, JSON.stringify(assinaturaDoNeutro(neutro())));
    writeFileSync(b, JSON.stringify(assinaturaDoNeutro(neutro({ numeracao: 3 }))));
    writeFileSync(c, JSON.stringify(assinaturaDoNeutro(neutro({ deslocamento: 1e-3 }))));
    expect((await rodar([`--comparar=${a}`, `--com=${b}`])).codigo).toBe(0);
    const diferente = await rodar([`--comparar=${a}`, `--com=${c}`]);
    expect(diferente.codigo).toBe(1);
    expect(diferente.saida).toContain('malha DIFERENTE');
    expect((await rodar([`--comparar=${a}`])).codigo).toBe(2);
    expect((await rodar([])).codigo).toBe(2);
  });

  it('assina uma receita do acervo, grava a assinatura e a segunda rodada confere contra ela', async () => {
    const arquivo = join(pasta, 'suporte.json');
    const primeira = await rodar(['suporte-tubo', `--salvar=${arquivo}`]);
    expect(primeira.codigo).toBe(0);
    const gravada = JSON.parse(readFileSync(arquivo, 'utf8'));
    expect(gravada.formato).toBe('mecanifica.assinatura-da-malha@1');
    expect(Object.keys(gravada.partes).length).toBeGreaterThan(1);
    expect(primeira.erro).toMatch(/receita executada e assinada em [\d.]+ s/);
    const segunda = await rodar(['suporte-tubo', `--contra=${arquivo}`]);
    expect(segunda.codigo).toBe(0);
    expect(segunda.saida).toContain('malha idêntica');
    /* uma assinatura adulterada em uma parte é acusada pelo nome dela */
    const nome = Object.keys(gravada.partes)[0];
    gravada.partes[nome].assinatura = `sha256:${'0'.repeat(64)}`;
    gravada.peca = `sha256:${'1'.repeat(64)}`;
    writeFileSync(arquivo, JSON.stringify(gravada));
    const terceira = await rodar(['suporte-tubo', `--contra=${arquivo}`]);
    expect(terceira.codigo).toBe(1);
    expect(terceira.saida).toContain(`${nome}:`);
  });
});
