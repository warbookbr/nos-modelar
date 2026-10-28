/* `--unidade` incremental: o hash do conteúdo desenhado fica em `<imagem>.hash`, e a vista cujo conteúdo (as formas da unidade
   já resolvidas, a vista, a largura e as opções de desenho) não mudou é reaproveitada sem abrir o navegador. `--forçar`
   redesenha tudo. A prova é o mtime da imagem (não regravada) e o texto "reaproveitada". */
import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lerArgumentos, unidadeArquivo } from '../../../tools/modelar/esboco.mjs';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const roda = (extra = {}) => ({
  vista: 'isometrica',
  opcoes: [{ titulo: 'T', formas: [
    { id: 'pneu', tipo: 'anel', diametroExterno: 300, diametroInterno: 220, espessura: 60, eixo: 'x', centro: [0, 0, 0], unidade: 'roda' },
    { id: 'aro', tipo: 'anel', diametroExterno: 220, diametroInterno: 60, espessura: 30, eixo: 'x', centro: [0, 0, 0], unidade: 'roda' },
    { id: 'base', tipo: 'caixa', largura: 80, altura: 10, profundidade: 80, centro: [0, -200, 0], unidade: 'chao' },
  ] }],
  ...extra,
});
const preparar = (e = roda()) => {
  const pasta = mkdtempSync(join(tmpdir(), 'incremental-'));
  const arq = join(pasta, 'r.esboco.json');
  writeFileSync(arq, JSON.stringify(e));
  return { pasta, arq, grava: (x) => writeFileSync(arq, JSON.stringify(x)) };
};
const mtimes = (r) => r.destinos.map((d) => statSync(d).mtimeMs);

describe('--unidade incremental', () => {
  it('grava o hash ao lado de cada imagem e a primeira vez desenha tudo', async () => {
    const { arq } = preparar();
    const r = await unidadeArquivo(arq, 'roda', { largura: 500 });
    expect(r.destinos).toHaveLength(4);
    for (const d of r.destinos) expect(readFileSync(`${d}.hash`, 'utf8')).toMatch(/^[0-9a-f]{64}\n?$/);
    expect(r.reaproveitadas).toEqual([false, false, false, false]);
    expect(r.texto).not.toContain('reaproveitada');
  });

  it('o segundo pedido igual reaproveita as quatro, sem regravar a imagem, e diz reaproveitada', async () => {
    const { arq } = preparar();
    const a = await unidadeArquivo(arq, 'roda', { largura: 500 });
    const antes = mtimes(a);
    await espera(30);
    const b = await unidadeArquivo(arq, 'roda', { largura: 500 });
    expect(b.reaproveitadas).toEqual([true, true, true, true]);
    expect(mtimes(b)).toEqual(antes);
    expect(b.texto.match(/reaproveitada/g)).toHaveLength(4);
  });

  it('mudar uma forma da unidade redesenha as vistas dela', async () => {
    const { arq, grava } = preparar();
    const a = await unidadeArquivo(arq, 'roda', { largura: 500 });
    const antes = mtimes(a);
    const e = roda();
    e.opcoes[0].formas[1].diametroInterno = 80;
    grava(e);
    await espera(30);
    const b = await unidadeArquivo(arq, 'roda', { largura: 500 });
    expect(b.reaproveitadas).toEqual([false, false, false, false]);
    mtimes(b).forEach((m, i) => expect(m).toBeGreaterThan(antes[i]));
    expect(b.texto).not.toContain('reaproveitada');
  });

  it('mudar uma forma de outra unidade que não toca esta unidade deixa tudo reaproveitado', async () => {
    const { arq, grava } = preparar();
    await unidadeArquivo(arq, 'roda', { largura: 500 });
    const e = roda();
    e.opcoes[0].formas[2].largura = 120;
    e.opcoes[0].formas[2].cor = 'verde';
    grava(e);
    const b = await unidadeArquivo(arq, 'roda', { largura: 500 });
    expect(b.reaproveitadas).toEqual([true, true, true, true]);
  });

  it('mudar a cor, o rótulo ou o título da unidade também redesenha', async () => {
    const { arq, grava } = preparar();
    await unidadeArquivo(arq, 'roda', { largura: 500 });
    const e = roda();
    e.opcoes[0].formas[0].cor = 'vermelho';
    grava(e);
    expect((await unidadeArquivo(arq, 'roda', { largura: 500 })).reaproveitadas).toEqual([false, false, false, false]);
  });

  it('vista nova desenha só ela; as já gravadas são reaproveitadas', async () => {
    const { arq } = preparar();
    await unidadeArquivo(arq, 'roda', { vista: 'frontal', largura: 500 });
    const b = await unidadeArquivo(arq, 'roda', { largura: 500 });
    expect(b.destinos.map((d, i) => [d.match(/-(\w+)\.png$/)[1], b.reaproveitadas[i]])).toEqual([['isometrica', false], ['frontal', true], ['lateral', false], ['superior', false]]);
  });

  it('largura e opções de desenho diferentes não aproveitam a imagem anterior do mesmo nome', async () => {
    const { arq } = preparar();
    await unidadeArquivo(arq, 'roda', { vista: 'frontal', largura: 500 });
    expect((await unidadeArquivo(arq, 'roda', { vista: 'frontal', largura: 700 })).reaproveitadas).toEqual([false]);
    expect((await unidadeArquivo(arq, 'roda', { vista: 'frontal', largura: 700 })).reaproveitadas).toEqual([true]);
  });

  it('--forçar redesenha tudo', async () => {
    const { arq } = preparar();
    const a = await unidadeArquivo(arq, 'roda', { largura: 500 });
    const antes = mtimes(a);
    await espera(30);
    const b = await unidadeArquivo(arq, 'roda', { largura: 500, forcar: true });
    expect(b.reaproveitadas).toEqual([false, false, false, false]);
    mtimes(b).forEach((m, i) => expect(m).toBeGreaterThan(antes[i]));
  });

  it('imagem apagada ou hash apagado redesenha', async () => {
    const { arq } = preparar();
    const a = await unidadeArquivo(arq, 'roda', { vista: 'frontal', largura: 500 });
    unlinkSync(a.destinos[0]);
    expect((await unidadeArquivo(arq, 'roda', { vista: 'frontal', largura: 500 })).reaproveitadas).toEqual([false]);
    unlinkSync(`${a.destinos[0]}.hash`);
    expect((await unidadeArquivo(arq, 'roda', { vista: 'frontal', largura: 500 })).reaproveitadas).toEqual([false]);
    expect(existsSync(`${a.destinos[0]}.hash`)).toBe(true);
  });

  it('lê --forçar e --forcar', () => {
    expect(lerArgumentos(['m.esboco.json', '--unidade', 'roda', '--forçar']).tem('--forçar')).toBe(true);
    expect(lerArgumentos(['m.esboco.json', '--unidade', 'roda', '--forcar']).tem('--forcar')).toBe(true);
  });
});
