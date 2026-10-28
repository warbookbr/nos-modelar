/* `--explodir`: cada forma (ou cada instância de componente) da unidade é afastada do centro dela ao longo de um eixo, em passos
   por camada, com uma linha fina ligando cada peça à posição original. Medido em milímetros nas formas resolvidas e em pixels
   nas linhas do desenho (comprimento da linha = deslocamento projetado vezes a escala). */
import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expandirEsboco } from '../src/expandir.js';
import { desenharEsboco, eixoDaExplosao, ErroDeEsboco, explodir, lerExplosao, resolverOpcao } from '../src/index.js';
import { verificarContato } from '../src/contato.js';
import { lerArgumentos, lerExplosaoDaLinha, unidadeArquivo, vistasArquivo } from '../../../tools/modelar/esboco.mjs';

const caixa = (id, centro, extra = {}) => ({ id, tipo: 'caixa', largura: 40, altura: 40, profundidade: 40, centro, ...extra });
const esboco = (formas, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], ...extra });
const resolver = (formas) => { const e = expandirEsboco(esboco(formas)); return resolverOpcao(e.opcoes[0], 'o', e.pontos); };
const centros = (rs) => Object.fromEntries(rs.map((r) => [r.id, r.centro]));

describe('explodir em camadas', () => {
  it('cada camada sai do centro um passo a mais que a anterior, e a do meio fica', () => {
    const rs = resolver([caixa('a', [-60, 0, 0]), caixa('b', [0, 0, 0]), caixa('c', [60, 0, 0]), caixa('d', [60, 50, 0])]);
    const depois = centros(explodir(rs, { eixo: 'x', distancia: 30 }));
    expect(depois.a[0]).toBe(-90);
    expect(depois.b[0]).toBe(0);
    /* c e d estão na mesma camada em x e saem juntos */
    expect(depois.c[0]).toBe(90);
    expect(depois.d[0]).toBe(90);
    /* só o eixo do passo muda */
    expect(depois.d[1]).toBe(50);
  });

  it('a camada mais longe sai o número da camada vezes o passo', () => {
    const rs = resolver([caixa('a', [-100, 0, 0]), caixa('b', [-40, 0, 0]), caixa('c', [30, 0, 0]), caixa('d', [100, 0, 0])]);
    const depois = centros(explodir(rs, { eixo: 'x', distancia: 25 }));
    /* o centro do conjunto é x=0: b e c são as primeiras de cada lado, a e d as segundas */
    expect(depois.b[0] - -40).toBe(-25);
    expect(depois.c[0] - 30).toBe(25);
    expect(depois.a[0] - -100).toBe(-50);
    expect(depois.d[0] - 100).toBe(50);
  });

  it('a instância de componente sai inteira, com o mesmo deslocamento em todas as formas dela', () => {
    const rs = resolver([
      caixa('h', [-60, 0, 0]), caixa('m', [0, 0, 0]),
      caixa('g.a', [60, 0, 0], { daInstancia: { id: 'g', principal: true } }),
      caixa('g.b', [90, 0, 0], { daInstancia: { id: 'g', principal: false } }),
    ]);
    const depois = centros(explodir(rs, { eixo: 'x', distancia: 20 }));
    expect(depois['g.a'][0] - 60).toBe(depois['g.b'][0] - 90);
    expect(depois['g.a'][0] - 60).toBe(20);
    /* m é a camada mais perto do centro do conjunto (x=15) do lado menor, e h a segunda */
    expect(depois.m[0]).toBe(-20);
    expect(depois.h[0] - -60).toBe(-40);
  });

  it('sem distância o passo é proporcional ao tamanho da unidade', () => {
    const ao = (k) => {
      const rs = resolver([caixa('a', [-100 * k, 0, 0], { largura: 40 * k }), caixa('b', [0, 0, 0], { largura: 40 * k }), caixa('c', [100 * k, 0, 0], { largura: 40 * k })]);
      return centros(explodir(rs, { eixo: 'x', distancia: 'auto' })).c[0] - 100 * k;
    };
    expect(ao(1)).toBeGreaterThan(20);
    expect(ao(2)).toBeCloseTo(2 * ao(1), 9);
    /* 0,35 do tamanho da unidade (240 mm em x) com uma camada de cada lado */
    expect(ao(1)).toBeCloseTo(0.35 * 240, 9);
  });

  it('as formas deslocadas são cópias: a geometria original, e com ela o gate de contato, não muda', () => {
    const formas = [caixa('a', [0, 0, 0]), caixa('b', [40, 0, 0]), caixa('c', [80, 0, 0])];
    const antes = JSON.stringify(verificarContato(esboco(formas, { contato: { usar: true } })));
    desenharEsboco(esboco(formas, { vista: 'frontal', explosao: { eixo: 'x', distancia: 30 } }));
    const depois = JSON.stringify(verificarContato(esboco(formas, { contato: { usar: true } })));
    expect(depois).toBe(antes);
  });

  it('a explosão antiga, por fator, continua como era', () => {
    expect(lerExplosao({ eixo: 'x' }, 'o')).toEqual({ eixo: 'x', fator: 1.6 });
    const rs = resolver([caixa('a', [-50, 0, 0]), caixa('b', [50, 0, 0])]);
    expect(centros(explodir(rs, { eixo: 'x', fator: 2 })).b[0]).toBe(100);
  });

  it('recusa distância inválida e eixo ausente sem distância', () => {
    expect(() => lerExplosao({ eixo: 'x', distancia: -3 }, 'o')).toThrow(/distancia/);
    expect(() => lerExplosao({ eixo: 'x', distancia: 'longe' }, 'o')).toThrow(/distancia/);
    expect(() => lerExplosao({ distancia: 10 }, 'o')).not.toThrow();
    expect(() => lerExplosao({}, 'o')).toThrow(ErroDeEsboco);
  });
});

describe('o eixo da explosão por vista', () => {
  /* três caixas empilhadas em z: o eixo da vista frontal (z) não mostra deslocamento algum na tela */
  const pilha = () => resolver([caixa('a', [0, 0, -60]), caixa('b', [0, 0, 0]), caixa('c', [0, 0, 60])]);
  it('escolhe entre os eixos que aparecem na tela da vista o de mais camadas, e nunca o do olho', () => {
    expect(eixoDaExplosao(pilha(), 'lateral')).toBe('z');
    expect(eixoDaExplosao(pilha(), 'isometrica')).toBe('z');
    expect(['x', 'y']).toContain(eixoDaExplosao(pilha(), 'frontal'));
    expect(['x', 'z']).toContain(eixoDaExplosao(pilha(), 'superior'));
  });

  it('explodir ao longo do eixo do olho não move nada na tela (a medida que justifica a escolha)', () => {
    const e = esboco([caixa('a', [0, 0, -60]), caixa('b', [0, 0, 0]), caixa('c', [0, 0, 60])], { vista: 'frontal', explosao: { eixo: 'z', distancia: 30 } });
    const normal = desenharEsboco({ ...e, explosao: undefined });
    const explodida = desenharEsboco(e);
    expect(explodida.escala).toBeCloseTo(normal.escala, 9);
    expect(explodida.svg).not.toContain('class="explosao-liga"');
  });
});

describe('as linhas que ligam a peça à posição original', () => {
  it('uma por forma deslocada, com o comprimento do deslocamento projetado vezes a escala', () => {
    const e = esboco([caixa('a', [-60, 0, 0]), caixa('b', [0, 0, 0]), caixa('c', [60, 0, 0])], { vista: 'frontal', explosao: { eixo: 'x', distancia: 30 } });
    const { svg, escala } = desenharEsboco(e);
    const linhas = [...svg.matchAll(/<line class="explosao-liga" data-forma="([^"]+)" x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"/g)].map((m) => ({ id: m[1], len: Math.hypot(m[4] - m[2], m[5] - m[3]) }));
    expect(linhas.map((l) => l.id).sort()).toEqual(['a', 'c']);
    for (const l of linhas) expect(l.len / escala).toBeCloseTo(30, 0);
    expect((svg.match(/class="explosao-origem"/g) ?? []).length).toBe(2);
  });

  it('o subtítulo diz o eixo e o passo', () => {
    const { svg } = desenharEsboco(esboco([caixa('a', [-60, 0, 0]), caixa('b', [60, 0, 0])], { vista: 'frontal', explosao: { eixo: 'x', distancia: 30 } }));
    expect(svg).toContain('explodida em x, passo 30 mm');
  });
});

describe('--explodir na linha de comando', () => {
  it('lê --explodir, --eixo e --distancia', () => {
    expect(lerExplosaoDaLinha({ explodir: false })).toBeNull();
    expect(lerExplosaoDaLinha({ explodir: true })).toEqual({ distancia: 'auto', ligacoes: true });
    expect(lerExplosaoDaLinha({ explodir: true, eixo: 'Y', distancia: '40' })).toEqual({ eixo: 'y', distancia: 40, ligacoes: true });
    expect(() => lerExplosaoDaLinha({ explodir: false, eixo: 'x' })).toThrow(/--explodir/);
    expect(() => lerExplosaoDaLinha({ explodir: true, eixo: 'w' })).toThrow(/--eixo/);
    expect(() => lerExplosaoDaLinha({ explodir: true, distancia: '0' })).toThrow(/--distancia/);
    const a = lerArgumentos(['m.esboco.json', '--unidade', 'roda', '--explodir', '--eixo', 'x', '--distancia=30']);
    expect(a.tem('--explodir')).toBe(true);
    expect(a.valor('--eixo')).toBe('x');
    expect(a.valor('--distancia')).toBe('30');
  });

  it('grava a unidade explodida ao lado da normal, sem a substituir', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'explodir-'));
    const arq = join(pasta, 'p.esboco.json');
    writeFileSync(arq, JSON.stringify(esboco([caixa('a', [-60, 0, 0], { unidade: 'u' }), caixa('b', [0, 0, 0], { unidade: 'u' }), caixa('c', [60, 0, 0], { unidade: 'u' })])));
    const normal = await unidadeArquivo(arq, 'u', { vista: 'frontal', largura: 600 });
    const explodida = await unidadeArquivo(arq, 'u', { vista: 'frontal', largura: 600, explosao: { eixo: 'x', distancia: 30, ligacoes: true } });
    expect(explodida.destinos[0]).toMatch(/-unidade-u-600px-explodida-x-30mm-frontal\.png$/);
    expect(existsSync(normal.destinos[0])).toBe(true);
    expect(existsSync(explodida.destinos[0])).toBe(true);
    expect(explodida.destinos[0]).not.toBe(normal.destinos[0]);
    expect(explodida.svgs[0]).toContain('class="explosao-liga"');
    expect(normal.svgs[0]).not.toContain('class="explosao-liga"');
    const inteiro = await vistasArquivo(arq, { vista: 'frontal', explosao: { distancia: 'auto', ligacoes: true } });
    expect(inteiro.destinos[0]).toMatch(/p-explodida-frontal\.png$/);
    expect(inteiro.texto).toMatch(/explodida/);
  });

  it('avisa quando o eixo escolhido não move nada na tela', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'explodir-'));
    const arq = join(pasta, 'p.esboco.json');
    writeFileSync(arq, JSON.stringify(esboco([caixa('a', [0, 0, -60]), caixa('b', [0, 0, 60])])));
    const r = await vistasArquivo(arq, { vista: 'frontal', explosao: { eixo: 'z', distancia: 'auto', ligacoes: true } });
    expect(r.texto).toMatch(/nenhuma forma saiu do lugar na tela/);
  });
});
