/* Contrato do esboço: posição relativa por sobre/ponta, recusa de referência
   inexistente e PNG no tamanho que o desenho declara. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { desenharEsboco, resolverOpcao, ErroDeEsboco } from '../src/index.js';
import { gerarEsboco } from '../../../tools/mecanifica/esboco.mjs';

const deitadoSobreAnel = {
  opcoes: [{
    titulo: 'teste', nota: 'cilindro deitado sobre anel',
    formas: [
      { id: 'base', tipo: 'anel', diametroExterno: 210, diametroInterno: 120, espessura: 30, eixo: 'y', centro: [0, 0, 0], cor: 'roxo', rotulo: 'base' },
      { id: 'corpo', tipo: 'cilindro', diametro: 177, comprimento: 194, eixo: 'x', sobre: 'base', cor: 'cinza' },
      { id: 'ponta', tipo: 'anel', diametroExterno: 164, diametroInterno: 110, espessura: 20, eixo: 'x', ponta: { id: 'corpo', lado: '+x' }, cor: 'verde' },
      { id: 'caixa', tipo: 'caixa', largura: 40, altura: 20, profundidade: 30, raio: 5, ponta: ['base', '-z'] },
    ],
  }],
};

describe('esboço', () => {
  it('sobre apoia a base no topo e ponta encosta na face indicada', () => {
    const [base, corpo, ponta, caixa] = resolverOpcao(deitadoSobreAnel.opcoes[0]);
    expect(base.max[1]).toBeCloseTo(15, 6);
    expect(corpo.min[1]).toBeCloseTo(base.max[1], 6);
    expect(corpo.centro[1]).toBeCloseTo(15 + 88.5, 6);
    expect(corpo.max[0]).toBeCloseTo(97, 6);
    expect(ponta.min[0]).toBeCloseTo(corpo.max[0], 6);
    expect(ponta.centro[1]).toBeCloseTo(corpo.centro[1], 6);
    expect(caixa.max[2]).toBeCloseTo(base.min[2], 6);
  });

  it('ponta respeita a face achatada do cilindro', () => {
    const [c, a] = resolverOpcao({ formas: [
      { id: 'c', tipo: 'cilindro', diametro: 200, comprimento: 177, achatado: { lado: '+x', profundidade: 20 }, centro: [0, 0, 0] },
      { id: 'a', tipo: 'anel', diametroExterno: 164, diametroInterno: 110, espessura: 20, eixo: 'x', ponta: ['c', '+x'] },
    ] });
    expect(c.max[0]).toBeCloseTo(80, 6);
    expect(a.min[0]).toBeCloseTo(80, 6);
  });

  it('recusa sobre inexistente com mensagem clara', () => {
    const ruim = { opcoes: [{ formas: [{ id: 'a', tipo: 'cilindro', diametro: 10, comprimento: 10, sobre: 'fantasma' }] }] };
    expect(() => desenharEsboco(ruim)).toThrow(ErroDeEsboco);
    expect(() => desenharEsboco(ruim)).toThrow(/"sobre" aponta para "fantasma", que não existe/);
  });

  it('é determinístico', () => {
    expect(desenharEsboco(deitadoSobreAnel).svg).toBe(desenharEsboco(deitadoSobreAnel).svg);
  });

  it('gera PNG e SVG do tamanho declarado', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'esboco-'));
    const arquivo = join(pasta, 'teste.esboco.json');
    writeFileSync(arquivo, JSON.stringify(deitadoSobreAnel));
    const r = await gerarEsboco(arquivo);
    expect(existsSync(r.svg)).toBe(true);
    const png = readFileSync(r.png);
    expect(png.readUInt32BE(16)).toBe(620);
    expect(png.readUInt32BE(20)).toBe(720);
  });
});
