/* olhar-bancada-visoes.test.mjs — a captura por comando das visões de reflexo (`--visao`, `--largura-da-zebra`, `--azimute`, `--enquadrar`).
 *
 * A fixture é neutra: a chapa abaulada de `tools/blender/chapa-com-amassado-de-prova.mjs` como peça da bancada
 * (`tools/fixtures/acervo/chapa-de-reflexo-de-prova`, com o amassado declarado, e `chapa-lisa-de-reflexo-de-prova`, sem ele). O que se
 * mede está na imagem: a máscara do fundo (a cor do fundo da bancada em auditoria é uma só) dá o quanto do quadro a peça ocupa, e o
 * gradiente das bordas das listras da zebra dá a direção delas, que na chapa lisa fica a menos de 12 graus da horizontal e no amassado
 * entorta. Cada captura abre navegador e carrega a peça, e por isso o arquivo está em `tools/testes-lentos.mjs`. */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { afterAll, describe, expect, it } from 'vitest';
import { comoCLI } from './olhar-bancada.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TMP = join(REPO, 'tmp');
mkdirSync(TMP, { recursive: true });
const PASTA = mkdtempSync(join(TMP, 'visoes-da-captura-'));
afterAll(() => rmSync(PASTA, { recursive: true, force: true }));

const AMASSADA = 'chapa-de-reflexo-de-prova';
const LISA = 'chapa-lisa-de-reflexo-de-prova';
const FUNDO = [242, 244, 243];

async function capturar(peca, opcoes) {
  const saida = relative(REPO, mkdtempSync(join(PASTA, 'c-')));
  const r = await comoCLI([peca, '--vistas=isometrica', '--sem-contatos', `--saida=${saida}`, ...opcoes]);
  expect(r.codigo, `${r.stdout}\n${r.stderr}`).toBe(0);
  const arquivos = readdirSync(join(REPO, saida)).filter((a) => a.endsWith('.png'));
  expect(arquivos).toHaveLength(1);
  return { arquivo: join(REPO, saida, arquivos[0]), nome: arquivos[0], stdout: r.stdout };
}

/** A imagem medida: a máscara do que não é fundo, a caixa dela no quadro e a direção das bordas das listras no interior da peça. */
function medir(arquivo) {
  const { width: W, height: H, data: d } = PNG.sync.read(readFileSync(arquivo));
  const lum = (x, y) => d[(y * W + x) * 4];
  const fundo = (x, y) => { const i = (y * W + x) * 4; return d[i] === FUNDO[0] && d[i + 1] === FUNDO[1] && d[i + 2] === FUNDO[2]; };
  const mascara = new Uint8Array(W * H);
  let pixels = 0; let x0 = W; let x1 = 0; let y0 = H; let y1 = 0;
  let cromaMax = 0; let soma = 0; let soma2 = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (fundo(x, y)) continue;
      const i = (y * W + x) * 4;
      mascara[y * W + x] = 1; pixels++;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      cromaMax = Math.max(cromaMax, Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]));
      soma += d[i]; soma2 += d[i] * d[i];
    }
  }
  const media = soma / Math.max(1, pixels);
  const R = 5;
  let arestas = 0; let tortas = 0; let maiorDesvio = 0;
  for (let y = R + 1; y < H - R - 1; y++) {
    for (let x = R + 1; x < W - R - 1; x++) {
      let dentro = true;
      for (let dy = -R; dy <= R && dentro; dy += R) for (let dx = -R; dx <= R; dx += R) if (!mascara[(y + dy) * W + x + dx]) { dentro = false; break; }
      if (!dentro) continue;
      const gx = -lum(x - 1, y - 1) - 2 * lum(x - 1, y) - lum(x - 1, y + 1) + lum(x + 1, y - 1) + 2 * lum(x + 1, y) + lum(x + 1, y + 1);
      const gy = -lum(x - 1, y - 1) - 2 * lum(x, y - 1) - lum(x + 1, y - 1) + lum(x - 1, y + 1) + 2 * lum(x, y + 1) + lum(x + 1, y + 1);
      if (Math.hypot(gx, gy) < 200) continue;
      arestas++;
      const desvio = (Math.atan2(Math.abs(gx), Math.abs(gy)) * 180) / Math.PI;
      if (desvio > 12) tortas++;
      maiorDesvio = Math.max(maiorDesvio, desvio);
    }
  }
  return {
    ocupacao: pixels / (W * H), largura: (x1 - x0 + 1) / W, altura: (y1 - y0 + 1) / H,
    cromaMax, desvioPadrao: Math.sqrt(Math.max(0, soma2 / Math.max(1, pixels) - media ** 2)),
    arestas, tortas, fracaoTorta: tortas / Math.max(1, arestas), maiorDesvio,
  };
}

describe('olhar-bancada: as visões de reflexo por comando', () => {
  it('recusa a visão desconhecida e o controle que a visão pedida não usa, dizendo o que veio e o que vale', async () => {
    const desconhecida = await comoCLI([AMASSADA, '--visao=espelho']);
    expect(desconhecida.codigo).toBe(2);
    expect(desconhecida.stderr).toMatch(/espelho/);
    expect(desconhecida.stderr).toMatch(/solida, arame, raio-x, curvatura, zebra, luz-rasante/);

    const larguraSemZebra = await comoCLI([AMASSADA, '--visao=luz-rasante', '--largura-da-zebra=3']);
    expect(larguraSemZebra.codigo).toBe(2);
    expect(larguraSemZebra.stderr).toMatch(/--largura-da-zebra só vale com --visao=zebra.*"luz-rasante"/);

    const azimuteSemLuz = await comoCLI([AMASSADA, '--azimute=40']);
    expect(azimuteSemLuz.codigo).toBe(2);
    expect(azimuteSemLuz.stderr).toMatch(/--azimute só vale com --visao=luz-rasante.*nenhuma/);

    const fora = await comoCLI([AMASSADA, '--visao=zebra', '--largura-da-zebra=40']);
    expect(fora.codigo).toBe(2);
    expect(fora.stderr).toMatch(/1,5 a 15|1.5 a 15/);

    const misturada = await comoCLI([AMASSADA, '--visao=zebra', '--arame']);
    expect(misturada.codigo).toBe(2);
    const analise = await comoCLI([AMASSADA, '--analise', '--enquadrar']);
    expect(analise.codigo).toBe(2);
    expect(analise.stderr).toMatch(/--analise/);
  });

  it('a ajuda lista as quatro opções', async () => {
    const r = await comoCLI(['--ajuda']);
    for (const opcao of ['--visao=', '--largura-da-zebra=', '--azimute=', '--enquadrar']) expect(r.stdout).toContain(opcao);
  });

  it('a zebra com --enquadrar ocupa o quadro; na chapa lisa as faixas saem paralelas e no amassado se entortam', async () => {
    const amassada = await capturar(AMASSADA, ['--visao=zebra', '--largura-da-zebra=1.5', '--enquadrar']);
    const lisa = await capturar(LISA, ['--visao=zebra', '--largura-da-zebra=1.5', '--enquadrar']);
    expect(amassada.nome).toMatch(/visao-zebra-1p5graus-enquadrado/);
    const a = medir(amassada.arquivo);
    const l = medir(lisa.arquivo);
    /* a peça ocupa mais da metade do quadro: a maior dimensão da caixa da máscara passa de 85 % (a vista padrão deixa 56 %) */
    expect(Math.max(a.largura, a.altura)).toBeGreaterThan(0.85);
    expect(Math.max(l.largura, l.altura)).toBeGreaterThan(0.85);
    expect(a.ocupacao).toBeGreaterThan(0.2);
    expect(l.arestas).toBeGreaterThan(2000);
    expect(l.tortas).toBe(0);
    expect(l.maiorDesvio).toBeLessThan(12);
    expect(a.fracaoTorta).toBeGreaterThan(0.01);
    expect(a.maiorDesvio).toBeGreaterThan(30);
  }, 120_000);

  it('a luz rasante e a curvatura gravam a imagem da peça, com cor e contraste', async () => {
    const luz = await capturar(AMASSADA, ['--visao=luz-rasante', '--azimute=30', '--enquadrar']);
    expect(luz.nome).toMatch(/visao-luz-rasante-az30-enquadrado/);
    expect(luz.stdout).toMatch(/luz a 30 graus/);
    const l = medir(luz.arquivo);
    expect(l.ocupacao).toBeGreaterThan(0.2);
    expect(l.desvioPadrao).toBeGreaterThan(1);

    const curvatura = await capturar(AMASSADA, ['--visao=curvatura', '--enquadrar']);
    const c = medir(curvatura.arquivo);
    expect(c.ocupacao).toBeGreaterThan(0.2);
    expect(c.cromaMax).toBeGreaterThan(40);
  }, 120_000);
});
