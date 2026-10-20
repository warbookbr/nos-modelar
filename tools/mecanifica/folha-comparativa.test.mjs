/* Testes de folha-comparativa.mjs: as câmeras são as de modelo-de-referencia, a receita igual à fonte não deixa sobra nem falta, e a cabine mais estreita ou o corpo mais largo aparecem com a região em milímetro. A fonte é a própria fixture de caixas, desenhada nas quatro câmeras. */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { compararVistas, enquadreDaVista, mascaraDaFonte } from './folha-comparativa.mjs';
import { QUADRO_DA_FONTE, VISTAS_DA_FONTE } from './modelo-de-referencia.mjs';
import { rasterDaVista } from './vistas-de-passos.mjs';
import { poligonosDaReceita } from './vistas-da-receita.mjs';
import { fonteDeReceita } from './fonte-sintetica.mjs';
import receitaBase, { veiculoDeCaixa } from './fixtures/veiculo-caixa/receita.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../..');
const { W, H } = QUADRO_DA_FONTE;
const fonte = fonteDeReceita(receitaBase);

/* A "fonte-vistas.png" da fixture: a própria receita de caixas desenhada nas quatro câmeras de modelo-de-referencia, em cinza, sobre o fundo da fonte. */
function imagemDaFonte(receita, fonteJson) {
  const dados = poligonosDaReceita(receita); const png = new PNG({ width: 2 * W, height: 2 * H });
  png.data.fill(255);
  for (let i = 0; i < 4 * W * H; i += 1) { png.data[i * 4] = 244; png.data[i * 4 + 1] = 242; png.data[i * 4 + 2] = 238; }
  VISTAS_DA_FONTE.forEach((v, q) => {
    const cam = enquadreDaVista(fonteJson.total, v);
    const r = rasterDaVista(dados.polis, dados.indice, [v[0], cam.dir, cam.up], W, H, { enquadre: cam.enquadre, S: 1 });
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      if (r.quem[y * W + x] === -1) continue;
      const d = (((Math.floor(q / 2) * H + y) * 2 * W) + (q % 2) * W + x) * 4;
      png.data[d] = 90; png.data[d + 1] = 160; png.data[d + 2] = 90;
    }
  });
  return png;
}

describe('folha comparativa: mesmas câmeras, mesma escala', () => {
  it('as câmeras da folha são as de modelo-de-referencia: a meia altura visível é 1,1 vez o raio', () => {
    const cam = enquadreDaVista(fonte.total, VISTAS_DA_FONTE[1]);
    const raioMm = Math.hypot(...fonte.total.tamanho) / 2 * 1000;
    expect(cam.enquadre.e).toBeCloseTo((H / 2) / (1.1 * raioMm), 9);
    /* lateral: a frente (+z) fica à esquerda e y para cima */
    expect(cam.direita.map((x) => x + 0)).toEqual([0, 0, -1]);
    expect(cam.cima.map((x) => x + 0)).toEqual([0, 1, 0]);
  });

  it('receita igual à fonte dá sobra e falta praticamente nulas nas quatro vistas', () => {
    const png = imagemDaFonte(receitaBase, fonte);
    const r = compararVistas(receitaBase, fonte, png);
    for (const v of r.vistas) {
      expect(v.numeros.sobraPct).toBeLessThan(0.5); expect(v.numeros.faltaPct).toBeLessThan(0.5);
      expect(v.numeros.interseccaoSobreUniao).toBeGreaterThan(0.98);
    }
    expect(r.vistas[0].numeros.areaFonteMm2).toBeGreaterThan(0);
  });

  it('a cabine mais estreita aparece como sobra da fonte na frontal e quase nada na lateral, com a região em milímetro', () => {
    const estreita = veiculoDeCaixa({ cabineMeiaLargura: 600 });
    const r = compararVistas(estreita, fonte, imagemDaFonte(receitaBase, fonte));
    const [, lateral, frontal] = r.vistas.map((v) => v.numeros);
    expect(lateral.faltaPct).toBeLessThan(0.5); expect(lateral.sobraPct).toBeLessThan(0.5);
    /* a cabine da fonte tem 300 mm a mais de cada lado acima da cintura; na frontal isso falta na receita */
    expect(frontal.faltaPct).toBeGreaterThan(2);
    const maior = frontal.regioesQueFaltam[0];
    expect(maior.yMm[0]).toBeGreaterThan(850); expect(maior.yMm[1]).toBeGreaterThan(1450);
    /* a maior região é a faixa de um lado: de 600 a 900 mm de meia largura (a cabine da receita termina em 600) */
    expect(Math.min(...maior.xMm.map(Math.abs))).toBeGreaterThan(560); expect(Math.min(...maior.xMm.map(Math.abs))).toBeLessThan(640);
    expect(Math.max(...maior.xMm.map(Math.abs))).toBeGreaterThan(880);
  });

  it('o corpo mais largo da receita aparece como sobra', () => {
    const larga = veiculoDeCaixa({ meiaLargura: 1100, cabineMeiaLargura: 900 });
    const frontal = compararVistas(larga, fonte, imagemDaFonte(receitaBase, fonte)).vistas[2].numeros;
    expect(frontal.sobraPct).toBeGreaterThan(5); expect(frontal.faltaPct).toBeLessThan(0.5);
  });

  it('recusa imagem de tamanho errado e fonte sem frente', () => {
    expect(() => compararVistas(receitaBase, fonte, new PNG({ width: 100, height: 100 }))).toThrow(/regere/);
    expect(() => compararVistas(receitaBase, fonteDeReceita(receitaBase, { semFrente: true }), imagemDaFonte(receitaBase, fonte))).toThrow(/não registra a frente/);
  });

  it('o rótulo do canto não entra na máscara da fonte', () => {
    const png = imagemDaFonte(receitaBase, fonte);
    for (let y = 0; y < 30; y += 1) for (let x = 6; x < 200; x += 1) { const i = (y * png.width + x) * 4; png.data[i] = 0; png.data[i + 1] = 0; png.data[i + 2] = 0; }
    expect(mascaraDaFonte(png, 0).slice(0, 32 * W).reduce((s, v) => s + v, 0)).toBe(0);
  });

  it('na linha de comando gera folha.png e diferenca.json', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'fc-'));
    try {
      writeFileSync(join(pasta, 'fonte-partes.json'), JSON.stringify(fonte));
      writeFileSync(join(pasta, 'fonte-vistas.png'), PNG.sync.write(imagemDaFonte(receitaBase, fonte)));
      const r = spawnSync('node', [join(AQUI, 'folha-comparativa.mjs'), join(AQUI, 'fixtures/veiculo-caixa/receita.js'), join(pasta, 'fonte-partes.json'), '--saida', join(pasta, 'saida')], { cwd: REPO, encoding: 'utf8' });
      expect(r.status, r.stderr).toBe(0);
      expect(existsSync(join(pasta, 'saida/folha.png'))).toBe(true);
      const d = JSON.parse(readFileSync(join(pasta, 'saida/diferenca.json'), 'utf8'));
      expect(d.vistas).toHaveLength(4); expect(d.frente.lado).toBe('+z');
      expect(PNG.sync.read(readFileSync(join(pasta, 'saida/folha.png'))).width).toBeGreaterThanOrEqual(3 * W);
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  }, 60000);
});
