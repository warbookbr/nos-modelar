/* `--previa`: menos facetas nas curvas, menos fatias e sem as arestas finas (silhuetas e arcos), para iterar por unidade em
   poucos segundos; a imagem sai rotulada "prévia" no título. A prévia só muda o desenho: a medida do gate é a do esboço
   completo. A medida é o tamanho do SVG (o custo do desenho e da rasterização é proporcional a ele) e a contagem de faces. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { desenharEsboco } from '../src/index.js';
import { verificarContato } from '../src/contato.js';
import { lerArgumentos, unidadeArquivo, vistasArquivo } from '../../../tools/mecanifica/esboco.mjs';

const fixture = (nome) => JSON.parse(readFileSync(new URL(`./fixtures/${nome}`, import.meta.url), 'utf8'));
const esboco = (formas, extra = {}) => ({ opcoes: [{ titulo: 'Opção A', formas }], ...extra });
const faces = (svg) => (svg.match(/<path /g) ?? []).length;
const finas = (svg) => (svg.match(/stroke-linecap="round"/g) ?? []).length;
const roda = [
  { id: 'pneu', tipo: 'anel', diametroExterno: 600, diametroInterno: 440, espessura: 120, eixo: 'x', centro: [0, 0, 0] },
  { id: 'eixo', tipo: 'cilindro', diametro: 30, comprimento: 400, eixo: 'x', centro: [0, 0, 0] },
  { id: 'barra', tipo: 'cilindro', diametro: 40, comprimento: 500, eixo: 'y', centro: [0, 0, 0] },
];

describe('prévia', () => {
  it('reduz as facetas e dispensa as arestas finas, e o título diz prévia', () => {
    const normal = desenharEsboco(esboco(roda, { vista: 'isometrica', ladosPorEscala: true }));
    const previa = desenharEsboco(esboco(roda, { vista: 'isometrica', ladosPorEscala: true, previa: true }));
    expect(finas(normal.svg)).toBeGreaterThan(0);
    expect(finas(previa.svg)).toBe(0);
    expect(previa.svg.length).toBeLessThan(normal.svg.length * 0.5);
    expect(faces(previa.svg)).toBeLessThan(faces(normal.svg) * 0.5);
    expect(previa.svg).toContain('Opção A (prévia)');
    expect(normal.svg).not.toContain('prévia');
    /* o polígono inscrito de menos lados encolhe o conjunto no máximo alguns por cento */
    expect(Math.abs(previa.escala / normal.escala - 1)).toBeLessThan(0.04);
  });

  it('na moto de componentes o desenho cai a menos de um terço do SVG', () => {
    const moto = { ...fixture('moto-componentes.esboco.json'), vista: 'lateral' };
    const normal = desenharEsboco({ ...moto, ladosPorEscala: true });
    const previa = desenharEsboco({ ...moto, ladosPorEscala: true, previa: true });
    expect(previa.svg.length).toBeLessThan(normal.svg.length / 3);
  });

  it('não muda o gate: o contato mede o esboço completo', () => {
    const e = { ...esboco(roda), contato: { usar: true } };
    expect(JSON.stringify(verificarContato({ ...e, previa: true }))).toBe(JSON.stringify(verificarContato(e)));
  });

  it('o desenho da prévia é determinístico', () => {
    const e = esboco(roda, { vista: 'frontal', ladosPorEscala: true, previa: true });
    expect(desenharEsboco(e).svg).toBe(desenharEsboco(e).svg);
  });

  it('recusa previa que não é verdadeiro ou falso', () => {
    expect(() => desenharEsboco(esboco(roda, { previa: 'sim' }))).toThrow(/previa/);
  });
});

describe('--previa na linha de comando', () => {
  it('lê a flag e grava a imagem com o sufixo, sem substituir a normal', async () => {
    expect(lerArgumentos(['m.esboco.json', '--unidade', 'roda', '--previa']).tem('--previa')).toBe(true);
    const pasta = mkdtempSync(join(tmpdir(), 'previa-'));
    const arq = join(pasta, 'p.esboco.json');
    writeFileSync(arq, JSON.stringify(esboco(roda.map((f) => ({ ...f, unidade: 'u' })))));
    const normal = await unidadeArquivo(arq, 'u', { vista: 'frontal', largura: 600 });
    const previa = await unidadeArquivo(arq, 'u', { vista: 'frontal', largura: 600, previa: true });
    expect(previa.destinos[0]).toMatch(/-unidade-u-600px-previa-frontal\.png$/);
    expect(previa.destinos[0]).not.toBe(normal.destinos[0]);
    expect(previa.svgs[0]).toContain('(prévia)');
    expect(previa.texto).toMatch(/prévia/);
    const inteiro = await vistasArquivo(arq, { vista: 'lateral', previa: true });
    expect(inteiro.destinos[0]).toMatch(/p-previa-lateral\.png$/);
  });
});
