/* linhas-do-modelo.test.mjs — as linhas tiradas da malha: o contorno, a divisa entre partes, a quina do degrau e a dobra fechada saem; a
   curva larga não sai. */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dePng } from './leitura-por-regioes.mjs';
import { CORES_DAS_LINHAS, LINHA, baseDaVista, desenharLinhas, executar, linhasDoRaster, rasterizar } from './linhas-do-modelo.mjs';

const quad = (x0, x1, a, b, parte) => ({ pts: [[x0, a[0], a[1]], [x1, a[0], a[1]], [x1, b[0], b[1]], [x0, b[0], b[1]]], parte });
/* vista frontal: x para a direita, y para cima, a câmera em +z. Parte 1 à esquerda: uma face em z = 0 e, acima dela, outra 30 mm
   atrás (um degrau). Parte 2 à direita: uma face em z = 0, uma dobra de 60 graus em 18 mm e depois uma curva larga, 4 graus a cada 20 mm. */
function cena() {
  const faces = [quad(0, 100, [0, 0], [100, 0], 1), quad(0, 100, [100, -30], [200, -30], 1), quad(100, 200, [0, 0], [100, 0], 2)];
  let p = [100, 0];
  const anda = (graus, comprimento) => { const t = graus * Math.PI / 180; const q = [p[0] + comprimento * Math.cos(t), p[1] - comprimento * Math.sin(t)]; faces.push(quad(100, 200, p, q, 2)); p = q; };
  for (let g = 10; g <= 60; g += 10) anda(g, 3);
  const fimDaDobra = p[0];
  for (let g = 64; g <= 80; g += 4) anda(g, 20);
  return { faces, fimDaDobra, topoDaCurva: p[0] };
}

describe('linhas do modelo', () => {
  it('a base da vista põe o x à direita na frontal e o inverte na traseira', () => {
    expect(baseDaVista('frontal').direita).toEqual([1, 0, 0]);
    expect(baseDaVista('traseira').direita.map((v) => Math.round(v))).toEqual([-1, 0, 0]);
    expect(() => baseDaVista('de-lado')).toThrow('não existe na bancada');
  });

  it('marca o contorno, a divisa, a quina do degrau e a dobra fechada, e deixa a curva larga sem linha', () => {
    const { faces, fimDaDobra, topoDaCurva } = cena();
    const r = rasterizar(faces, 'frontal', 200);
    expect(r.largura).toBe(200); expect(r.altura).toBe(200); expect(r.mmPorPx).toBeCloseTo(1, 6);
    const linhas = linhasDoRaster(r);
    const em = (x, v) => linhas[(r.altura - 1 - v) * r.largura + x];
    const naColuna = (x, v0, v1) => { const s = new Set(); for (let v = Math.ceil(v0); v <= Math.floor(v1); v += 1) s.add(em(x, v)); return s; };
    expect(em(0, 50)).toBe(LINHA.contorno);
    expect(new Set([em(99, 50), em(100, 50)]).has(LINHA.divisa)).toBe(true);
    expect(naColuna(50, 97, 102).has(LINHA.quina)).toBe(true);
    expect(em(50, 50)).toBe(LINHA.nada);
    expect(naColuna(150, 100, fimDaDobra + 6).has(LINHA.dobra)).toBe(true);
    expect(naColuna(150, 100, fimDaDobra + 6).has(LINHA.quina)).toBe(false);
    expect([...naColuna(150, fimDaDobra + 14, topoDaCurva - 3)]).toEqual([LINHA.nada]);
    /* o desenho: a divisa em vermelho e a dobra em verde */
    const im = desenharLinhas(r, linhas, 1);
    const cor = (x, v) => [...im.dados.slice(((r.altura - 1 - v) * r.largura + x) * 3, ((r.altura - 1 - v) * r.largura + x) * 3 + 3)];
    expect(cor(0, 50)).toEqual(CORES_DAS_LINHAS.contorno);
    expect(cor(50, 50)).toEqual([255, 255, 255]);
  });

  it('recusa a malha sem área na vista', () => {
    expect(() => rasterizar([], 'frontal')).toThrow('não tem área');
  });

  it('o comando desenha as linhas de uma opção do esboço', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'linhas-'));
    writeFileSync(join(pasta, 'bloco.esboco.json'), JSON.stringify({ opcoes: [{ titulo: 'bloco', formas: [
      { id: 'base', op: 'cubo', args: { larg: 100, alt: 60, prof: 40 } }, { id: 'topo', op: 'cubo', args: { larg: 60, alt: 30, prof: 40 }, sobre: 'base' }] }] }));
    const r = await executar([join(pasta, 'bloco.esboco.json'), '--vista=frontal', `--saida=${join(pasta, 'l.png')}`, '--largura=200']);
    expect(r.stderr).toBe('');
    expect(r.stdout).toContain('200 x 180 px, 0.50 mm por px');
    const im = dePng(readFileSync(join(pasta, 'l.png')));
    expect([im.largura, im.altura]).toEqual([200, 180]);
    /* a divisa entre a base e o topo, a 60 mm do chão, no meio da largura */
    const linha = [0, 1, 2, 3].map((d) => [...im.dados.slice(((180 - 120 - 2 + d) * 200 + 100) * 3, ((180 - 120 - 2 + d) * 200 + 100) * 3 + 3)].join());
    expect(linha).toContain(CORES_DAS_LINHAS.divisa.join());
    expect((await executar([join(pasta, 'bloco.esboco.json')])).codigo).toBe(2);
    expect((await executar(['--ajuda'])).stdout).toContain('npm run linhas:modelo');
  });
});
