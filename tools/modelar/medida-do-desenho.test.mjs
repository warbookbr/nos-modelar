/* A medida do desenho de linhas (`medida-do-desenho.mjs`) e o gate `desenho:check` (`medida-do-desenho-conferir.mjs`).
   A medida só vale se for provada antes de medir: os casos montados à mão dão zero no desenho certo e acusam, com grupo e posição, o traço
   plantado a mais e o traço tirado (`medida-do-desenho-casos.mjs`). Aqui rodam em duas vistas, e o gate roda nas quatro. Abre o Chromium. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RAIZ } from './calibracao-do-critico.mjs';
import { falhasDosRelatos, lerCausas, ARQUIVO_DAS_CAUSAS, FORMATO_DAS_CAUSAS } from './medida-do-desenho-conferir.mjs';
import { casosDaMedida, desenharCaso, provarAMedida } from './medida-do-desenho-casos.mjs';
import { imagemDeDiagnostico, medirConjunto, medirDesenho, relatoDaVista, tabelaDosRelatos } from './medida-do-desenho.mjs';

let navegador;
let pasta;
beforeAll(async () => {
  navegador = await (await import('playwright')).default.chromium.launch();
  pasta = mkdtempSync(join(tmpdir(), 'medida-do-desenho-'));
});
afterAll(async () => {
  await navegador?.close();
  if (pasta) rmSync(pasta, { recursive: true, force: true });
});

describe('a medida, provada nos casos montados à mão', () => {
  it('os casos têm a caixa, a caixa com furo (de 24 e de 12 lados), as duas caixas encostadas, as duas com degrau e o cilindro fino', () => {
    expect(casosDaMedida().map((c) => c.nome)).toEqual(['caixa', 'caixa com furo de 24 lados', 'caixa com furo de 12 lados', 'duas caixas encostadas', 'duas caixas com degrau', 'cilindro fino']);
  });

  it('dá zero no desenho certo e acusa o traço plantado a mais e o tirado, em cada caso, nas vistas isométrica e de frente', async () => {
    const provas = await provarAMedida({ navegador, vistas: ['isometrica', 'frontal'] });
    expect(provas.length).toBe(casosDaMedida().length * 2 * 4);
    expect(provas.filter((p) => !p.ok).map((p) => `${p.nome}: ${p.texto}`)).toEqual([]);
  }, 300000);

  it('o relato de uma vista tem os pixels e os grupos de cada tipo, com a posição e o afastamento, e grava a imagem de diagnóstico', async () => {
    const caso = casosDaMedida()[0];
    const { r, triangulos } = desenharCaso(caso, 'isometrica');
    const certo = await medirDesenho({ r, triangulos, navegador });
    expect(certo.vazamento.pixels).toBe(0);
    expect(certo.falha.pixels).toBe(0);
    expect(certo.tracos).toBeGreaterThan(1000);
    expect(certo.arestas).toBeGreaterThan(1000);
    /* a mesma caixa sem o traço mais comprido: falta uma aresta, e o relato a localiza */
    const { comTracoTirado } = await import('./medida-do-desenho-casos.mjs');
    const { r: semUm } = comTracoTirado(r);
    const falta = await medirDesenho({ r: semUm, triangulos, navegador, reaproveitar: certo });
    const relato = relatoDaVista('caixa', 'isometrica', falta);
    expect(relato.falha.pixels).toBeGreaterThan(100);
    expect(relato.falha.grupos).toBe(1);
    expect(relato.falha.onde[0].caixa).toHaveLength(4);
    expect(relato.falha.onde[0].afastamento).toBeGreaterThan(2.25);
    expect(relato.vazamento.pixels).toBe(0);
    expect(tabelaDosRelatos([relato])).toMatch(/caixa +isometrica .* 0\/0 +\d+\/1/);
    /* o diagnóstico é a imagem do desenho, com a falha em azul */
    const arquivo = join(pasta, 'diagnostico.png');
    writeFileSync(arquivo, imagemDeDiagnostico(falta));
    const png = PNG.sync.read(readFileSync(arquivo));
    expect(png.width).toBe(falta.png.width);
    let azuis = 0;
    for (let i = 0; i < png.data.length; i += 4) if (png.data[i] === 0 && png.data[i + 1] === 80 && png.data[i + 2] === 255) azuis++;
    expect(azuis).toBeGreaterThanOrEqual(falta.falha.pixels);
  }, 120000);
});

describe('o conjunto de calibração do crítico', () => {
  it('as imagens que o desenho da blocagem faz de uma família têm zero pixel de vazamento e de falha nas quatro vistas', async () => {
    const relatos = await medirConjunto({ so: 'c09,c05', navegador });
    expect(relatos).toHaveLength(8);
    expect(relatos.map((r) => [r.id, r.vista, r.vazamento.pixels, r.falha.pixels]).filter((x) => x[2] + x[3] > 0)).toEqual([]);
  }, 240000);

  it('rejeita a imagem e a vista que o conjunto não tem', async () => {
    await expect(medirConjunto({ so: 'c99', navegador })).rejects.toThrow(/c99/);
    await expect(medirConjunto({ so: 'c09', vista: 'de-baixo', navegador })).rejects.toThrow(/de-baixo/);
  });
});

describe('o gate desenho:check', () => {
  const relato = (id, vista, v, f) => ({ id, vista, tracos: 100, arestas: 100, vazamento: { pixels: v, grupos: v ? 1 : 0, onde: [] }, falha: { pixels: f, grupos: f ? 1 : 0, onde: [] } });

  it('reprova o pixel que o registro das causas não declara, e deixa passar o que declara, dizendo a causa folgada', () => {
    const causas = [{ imagem: 'c03', vista: 'lateral', tipo: 'vazamento', maximoPixels: 3, causa: 'a ponta do traço a 2,8 px da aresta mais perto' }];
    const dentro = falhasDosRelatos([relato('c03', 'lateral', 1, 0), relato('c09', 'frontal', 0, 0)], causas);
    expect(dentro.falhas).toEqual([]);
    expect(dentro.folgadas).toHaveLength(1);
    const fora = falhasDosRelatos([relato('c03', 'lateral', 4, 0), relato('c09', 'frontal', 0, 2)], causas);
    expect(fora.falhas).toHaveLength(2);
    expect(fora.falhas[0]).toMatch(/c03 lateral: vazamento de 4 px.*declara até 3 px/);
    expect(fora.falhas[1]).toMatch(/c09 frontal: falha de 2 px/);
  });

  it('o registro das causas do repositório é válido e cada causa cita uma imagem e uma vista do conjunto', () => {
    const dados = lerCausas(RAIZ);
    expect(dados.formato).toBe(FORMATO_DAS_CAUSAS);
    expect(Array.isArray(dados.causas)).toBe(true);
    expect(ARQUIVO_DAS_CAUSAS).toMatch(/desenho-das-linhas\/causas\.json$/);
  });
});
