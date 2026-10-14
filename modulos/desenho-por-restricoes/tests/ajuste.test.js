/* ajuste.test.js — a família ajustada ao contorno de uma referência (`ajustarFamilia`): com a referência desenhada pela própria
   família em valores conhecidos, a busca tem de achar esses valores; com um valor fora da faixa, tem de parar no limite e, com a
   faixa aberta, dizer até onde a faixa precisa ir. */
import { describe, expect, it } from 'vitest';
import { ajustarFamilia, desenhar, ErroDeDesenho, especializarFamilia, lerFamiliaDeDesenho, valoresDaFamilia } from '../src/index.js';
import { familiaSintetica } from './pecas.js';

const familia = () => lerFamiliaDeDesenho(familiaSintetica()).familia;
const referencia = async (f, valores) => (await desenhar(especializarFamilia(f, { ...valoresDaFamilia(f).valores, ...valores }))).contornos;

describe('ajustarFamilia', () => {
  it('acha os valores com que a própria família desenhou a referência', async () => {
    const f = familia();
    const alvo = await referencia(f, { comprimento: 2400, altura: 800 });
    const r = await ajustarFamilia(f, alvo, { soltos: ['comprimento', 'altura'] });
    expect(r.inicio).toBeLessThan(0.95);
    expect(r.iou).toBeGreaterThan(0.995);
    expect(Math.abs(r.valores.comprimento - 2400)).toBeLessThan(15);
    expect(Math.abs(r.valores.altura - 800)).toBeLessThan(10);
    expect(r.noLimite).toEqual([]);
    expect(r.foraDaFaixa).toEqual([]);
    expect(r.valores.vao).toBe(f.parametros.vao.padrao);
  }, 60_000);

  it('para no limite da faixa quando a referência pede mais, e com a faixa aberta diz até onde ir', async () => {
    const f = familia();
    const alvo = await referencia(f, { comprimento: 2900 });
    const dentro = await ajustarFamilia(f, alvo, { soltos: ['comprimento'] });
    expect(dentro.valores.comprimento).toBe(2600);
    expect(dentro.noLimite).toEqual(['comprimento']);
    expect(dentro.foraDaFaixa).toEqual([]);
    const aberta = await ajustarFamilia(f, alvo, { soltos: ['comprimento'], abrir: 0.4 });
    expect(aberta.iou).toBeGreaterThan(dentro.iou);
    expect(aberta.foraDaFaixa.map((x) => x.parametro)).toEqual(['comprimento']);
    expect(Math.abs(aberta.valores.comprimento - 2900)).toBeLessThan(20);
  }, 60_000);

  it('recusa parâmetro que a família não tem, abertura negativa e início que não desenha', async () => {
    const f = familia();
    const alvo = await referencia(f, {});
    await expect(ajustarFamilia(f, alvo, { soltos: ['largura'] })).rejects.toThrow(/o parâmetro "largura" não existe na família/);
    await expect(ajustarFamilia(f, alvo, { abrir: -1 })).rejects.toThrow(ErroDeDesenho);
    await expect(ajustarFamilia(f, alvo, { inicio: { raioDoArco: 320, topoDoArco: 300 } })).rejects.toThrow(/o conjunto de início não desenha/);
  }, 60_000);
});
