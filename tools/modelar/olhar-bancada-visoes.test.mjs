/* olhar-bancada-visoes.test.mjs — a captura por comando das visões de reflexo (`--visao`, `--largura-da-zebra`, `--angulo-da-zebra`,
 * `--azimute`, `--enquadrar`).
 *
 * A fixture é neutra: a chapa abaulada de `tools/blender/chapa-com-amassado-de-prova.mjs` como peça da bancada
 * (`tools/fixtures/acervo/chapa-de-reflexo-de-prova`, com o amassado declarado, e `chapa-lisa-de-reflexo-de-prova`, sem ele). O que se
 * mede está na imagem: a máscara do fundo (a cor do fundo da bancada em auditoria é uma só) dá o quanto do quadro a peça ocupa, e o
 * gradiente das bordas das listras da zebra dá a direção delas, que na chapa lisa fica a menos de 12 graus da horizontal e no amassado
 * entorta. A direção da listra se prova na chapa de calibração do vinco em pé (`tools/fixtures/reflexo-calibracao/vinco`): a listra
 * deitada corre parelha sobre ele, e a em pé se aperta numa listra estreita na linha do vinco. Cada captura abre navegador e carrega a peça, e por isso o arquivo está em `tools/testes-lentos.mjs`. */
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

async function capturar(peca, opcoes, vista = 'isometrica') {
  const saida = relative(REPO, mkdtempSync(join(PASTA, 'c-')));
  const r = await comoCLI([peca, `--vistas=${vista}`, '--sem-contatos', `--saida=${saida}`, ...opcoes]);
  expect(r.codigo, `${r.stdout}\n${r.stderr}`).toBe(0);
  const arquivos = readdirSync(join(REPO, saida)).filter((a) => a.endsWith('.png'));
  expect(arquivos).toHaveLength(1);
  return { arquivo: join(REPO, saida, arquivos[0]), nome: arquivos[0], stdout: r.stdout };
}

/** A imagem medida: a máscara do que não é fundo, a caixa dela no quadro e a direção das bordas das listras no interior da peça. */
function medir(arquivo, { canal = 0, limiar = 200 } = {}) {
  const { width: W, height: H, data: d } = PNG.sync.read(readFileSync(arquivo));
  const lum = (x, y) => d[(y * W + x) * 4 + canal];
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
  let saturados = 0;
  for (let i = 0; i < W * H; i++) if (mascara[i] && d[4 * i] >= 250 && d[4 * i + 1] >= 250 && d[4 * i + 2] >= 250) saturados++;
  const orientacoes = [];
  const R = 5;
  let arestas = 0; let tortas = 0; let maiorDesvio = 0;
  for (let y = R + 1; y < H - R - 1; y++) {
    for (let x = R + 1; x < W - R - 1; x++) {
      let dentro = true;
      for (let dy = -R; dy <= R && dentro; dy += R) for (let dx = -R; dx <= R; dx += R) if (!mascara[(y + dy) * W + x + dx]) { dentro = false; break; }
      if (!dentro) continue;
      const gx = -lum(x - 1, y - 1) - 2 * lum(x - 1, y) - lum(x - 1, y + 1) + lum(x + 1, y - 1) + 2 * lum(x + 1, y) + lum(x + 1, y + 1);
      const gy = -lum(x - 1, y - 1) - 2 * lum(x, y - 1) - lum(x + 1, y - 1) + lum(x - 1, y + 1) + 2 * lum(x, y + 1) + lum(x + 1, y + 1);
      if (Math.hypot(gx, gy) < limiar) continue;
      arestas++;
      orientacoes.push((Math.atan2(gy, gx) * 180) / Math.PI);
      const desvio = (Math.atan2(Math.abs(gx), Math.abs(gy)) * 180) / Math.PI;
      if (desvio > 12) tortas++;
      maiorDesvio = Math.max(maiorDesvio, desvio);
    }
  }
  /* a direção das bordas: o ângulo da normal da borda módulo 180, e quantas ficam a mais de 15 graus da direção mais comum (bins de 5 graus) */
  const bins = new Array(36).fill(0);
  const modulo = (a) => ((a % 180) + 180) % 180;
  for (const o of orientacoes) bins[Math.floor(modulo(o) / 5) % 36]++;
  const dominante = bins.indexOf(Math.max(...bins)) * 5 + 2.5;
  const distancia = (a) => { const x = Math.abs(modulo(a) - dominante); return Math.min(x, 180 - x); };
  const foraDaDirecao = orientacoes.filter((o) => distancia(o) > 15).length;
  return {
    saturados: saturados / Math.max(1, pixels), foraDaDirecao, fracaoForaDaDirecao: foraDaDirecao / Math.max(1, orientacoes.length), dominante,
    ocupacao: pixels / (W * H), largura: (x1 - x0 + 1) / W, altura: (y1 - y0 + 1) / H,
    cromaMax, desvioPadrao: Math.sqrt(Math.max(0, soma2 / Math.max(1, pixels) - media ** 2)),
    arestas, tortas, fracaoTorta: tortas / Math.max(1, arestas), maiorDesvio,
  };
}

/** As corridas de tom ao longo de linhas (`eixo` 'x') ou colunas ('y') a 35, 50 e 65 % do quadro, sem a primeira de cada trecho de peça
 *  (cortada pela borda): o número delas, a menor e a mediana, em pixels. A listra apertada na linha de um defeito dá a menor bem abaixo
 *  da mediana. */
function corridas(arquivo, eixo) {
  const { width: W, height: H, data: d } = PNG.sync.read(readFileSync(arquivo));
  const fundo = (i) => d[4 * i] === FUNDO[0] && d[4 * i + 1] === FUNDO[1] && d[4 * i + 2] === FUNDO[2];
  const todas = [];
  for (const f of [0.35, 0.5, 0.65]) {
    const n = eixo === 'x' ? W : H; const fixo = Math.round(f * (eixo === 'x' ? H : W));
    const trecho = []; let antes = null; let comp = 0;
    const fechar = () => { todas.push(...trecho.slice(1)); trecho.length = 0; };
    for (let k = 0; k < n; k++) {
      const i = eixo === 'x' ? fixo * W + k : k * W + fixo;
      if (fundo(i)) { fechar(); antes = null; comp = 0; continue; }
      const claro = d[4 * i] > 128;
      if (antes === null || claro === antes) comp++; else { trecho.push(comp); comp = 1; }
      antes = claro;
    }
    fechar();
  }
  const ord = [...todas].sort((a, b) => a - b);
  return { n: ord.length, menor: ord[0] ?? null, mediana: ord[Math.floor(ord.length / 2)] ?? null };
}

/** A borda do reflexo da janela de luz: em cada coluna do interior da peça, a linha onde o canal verde mais sobe (a luz branca contra a
 *  tinta vermelha). A amplitude é o quanto essa linha se afasta, em pixels, entre o 5º e o 95º percentil das colunas. */
function medirBorda(arquivo) {
  const { width: W, height: H, data: d } = PNG.sync.read(readFileSync(arquivo));
  const verde = (x, y) => d[(y * W + x) * 4 + 1];
  const fundo = (x, y) => { const i = (y * W + x) * 4; return d[i] === FUNDO[0] && d[i + 1] === FUNDO[1] && d[i + 2] === FUNDO[2]; };
  const linhas = [];
  for (let x = 0; x < W; x += 2) {
    let melhor = 0; let linha = -1;
    for (let y = 60; y < H - 60; y++) {
      if (fundo(x, y - 25) || fundo(x, y + 25)) continue;
      const salto = verde(x, y - 25) - verde(x, y + 25);
      if (salto > melhor) { melhor = salto; linha = y; }
    }
    if (linha >= 0 && melhor > 30) linhas.push(linha);
  }
  linhas.sort((p, q) => p - q);
  const pega = (f) => linhas[Math.min(linhas.length - 1, Math.floor(f * linhas.length))];
  return { colunas: linhas.length, minimo: pega(0.05), maximo: pega(0.95), amplitude: linhas.length ? pega(0.95) - pega(0.05) : 0 };
}

describe('olhar-bancada: as visões de reflexo por comando', () => {
  it('recusa a visão desconhecida e o controle que a visão pedida não usa, dizendo o que veio e o que vale', async () => {
    const desconhecida = await comoCLI([AMASSADA, '--visao=espelho']);
    expect(desconhecida.codigo).toBe(2);
    expect(desconhecida.stderr).toMatch(/espelho/);
    expect(desconhecida.stderr).toMatch(/solida, arame, raio-x, curvatura, zebra, luz-rasante, pintura/);

    const larguraSemZebra = await comoCLI([AMASSADA, '--visao=luz-rasante', '--largura-da-zebra=3']);
    expect(larguraSemZebra.codigo).toBe(2);
    expect(larguraSemZebra.stderr).toMatch(/--largura-da-zebra só vale com --visao=zebra.*"luz-rasante"/);

    const azimuteSemLuz = await comoCLI([AMASSADA, '--azimute=40']);
    expect(azimuteSemLuz.codigo).toBe(2);
    expect(azimuteSemLuz.stderr).toMatch(/--azimute só vale com --visao=luz-rasante.*nenhuma/);

    const fora = await comoCLI([AMASSADA, '--visao=zebra', '--largura-da-zebra=40']);
    expect(fora.codigo).toBe(2);
    expect(fora.stderr).toMatch(/1,5 a 15|1.5 a 15/);

    const anguloSemZebra = await comoCLI([AMASSADA, '--visao=pintura', '--angulo-da-zebra=90']);
    expect(anguloSemZebra.codigo).toBe(2);
    expect(anguloSemZebra.stderr).toMatch(/--angulo-da-zebra só vale com --visao=zebra.*"pintura"/);
    const anguloFora = await comoCLI([AMASSADA, '--visao=zebra', '--angulo-da-zebra=200']);
    expect(anguloFora.codigo).toBe(2);
    expect(anguloFora.stderr).toMatch(/-180 a 180/);

    const faixasSemPintura = await comoCLI([AMASSADA, '--visao=zebra', '--caixas-de-luz=3']);
    expect(faixasSemPintura.codigo).toBe(2);
    expect(faixasSemPintura.stderr).toMatch(/--caixas-de-luz só vale com --visao=pintura.*"zebra"/);

    const misturada = await comoCLI([AMASSADA, '--visao=zebra', '--arame']);
    expect(misturada.codigo).toBe(2);
    const analise = await comoCLI([AMASSADA, '--analise', '--enquadrar']);
    expect(analise.codigo).toBe(2);
    expect(analise.stderr).toMatch(/--analise/);
  });

  it('a ajuda lista as seis opções', async () => {
    const r = await comoCLI(['--ajuda']);
    for (const opcao of ['--visao=', '--largura-da-zebra=', '--angulo-da-zebra=', '--azimute=', '--caixas-de-luz=', '--enquadrar']) expect(r.stdout).toContain(opcao);
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

  it('a listra em pé vê o vinco em pé que a deitada não vê', async () => {
    const VINCO = 'tools/fixtures/reflexo-calibracao/vinco';
    const deitada = await capturar(VINCO, ['--visao=zebra', '--enquadrar'], 'frontal');
    const emPe = await capturar(VINCO, ['--visao=zebra', '--angulo-da-zebra=90', '--enquadrar'], 'frontal');
    expect(emPe.nome).toMatch(/visao-zebra-a90-enquadrado/);
    expect(emPe.stdout).toMatch(/listra a 90 graus da horizontal/);
    /* deitada: as listras correm na horizontal (quase nenhuma troca de tom ao longo das linhas, só onde a borda curva da chapa as corta)
       e têm a mesma largura ao longo das colunas */
    expect(corridas(deitada.arquivo, 'x').n).toBeLessThanOrEqual(4);
    const d = corridas(deitada.arquivo, 'y');
    expect(d.menor / d.mediana).toBeGreaterThan(0.6);
    /* em pé: as listras correm na vertical e uma delas se aperta na linha do vinco (medido em 900x900: 9 px contra a mediana de 57) */
    expect(corridas(emPe.arquivo, 'y').n).toBeLessThanOrEqual(4);
    const p = corridas(emPe.arquivo, 'x');
    expect(p.n).toBeGreaterThan(20);
    expect(p.menor / p.mediana).toBeLessThan(0.3);
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

describe('olhar-bancada: a vista de três quartos e a caixa da visão (plano do reflexo, fatia 6)', () => {
  /* a proporção da caixa da chapa de prova (1000 por 600 mm no plano xy) projetada numa câmera ortográfica que olha de `d`, com +y para cima */
  const proporcao = (d) => {
    const l = Math.hypot(...d); const z = d.map((c) => c / l);
    const xl = Math.hypot(z[2], z[0]); const x = [z[2] / xl, 0, -z[0] / xl];
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    const larg = Math.abs(x[0]) * 1000 + Math.abs(x[1]) * 600; const alt = Math.abs(y[0]) * 1000 + Math.abs(y[1]) * 600;
    return larg / alt;
  };

  it('a três quartos olha de (0,55; 0,45; 0,70), como a do Blender, e não da isométrica; a captura devolve a escala da curvatura e a luz da caixa', async () => {
    const curvatura = await capturar(AMASSADA, ['--visao=curvatura', '--enquadrar', '--projecao=ortografica', '--res=900x900'], 'tresquartos');
    expect(curvatura.nome).toMatch(/tresquartos-orto-visao-curvatura-enquadrado/);
    const c = medir(curvatura.arquivo);
    const medida = c.largura / c.altura;
    /* a chapa é abaulada, e a proporção da caixa plana é aproximada: a três quartos fica perto dela e longe da isométrica */
    expect(Math.abs(medida - proporcao([0.55, 0.45, 0.70]))).toBeLessThan(0.06);
    expect(Math.abs(medida - proporcao([0.55, 0.45, 0.70]))).toBeLessThan(Math.abs(medida - proporcao([1, 0.72, 1])) / 2);

    const { olharBancada } = await import('./olhar-bancada.mjs');
    const saida = relative(REPO, mkdtempSync(join(PASTA, 'r-')));
    const r = await olharBancada({ peca: AMASSADA, auditoria: true, visao: 'luz-rasante', enquadrar: true, projecao: 'ortografica', vistas: 'frontal', medirContatos: false, res: '600x600', saida });
    expect(r.ok, r.stderr).toBe(true);
    const dados = r.resultado.visao.dados;
    expect(r.resultado.visao.id).toBe('luz-rasante');
    /* a chapa vista de frente encara a câmera: a luz fica a 10 graus, e a outra direção boa a 90 graus da escolhida */
    expect(Number(dados.elevacao)).toBe(10);
    expect([90, 270]).toContain(((Number(dados.segundoAzimute) - Number(dados.azimute)) % 360 + 360) % 360);
    expect(r.stdout).toMatch(/a outra direção boa desta vista: \d+ graus/);
    const k = await olharBancada({ peca: AMASSADA, auditoria: true, visao: 'curvatura', enquadrar: true, projecao: 'ortografica', vistas: 'frontal', medirContatos: false, res: '600x600', saida: relative(REPO, mkdtempSync(join(PASTA, 'k-'))) });
    /* a escala é a da conta da bancada na chapa de prova (0,24758 1/m, medida na paridade da fatia 5), e a linha de estado, com o tempo, não volta */
    expect(Number(k.resultado.visao.dados.escala)).toBeCloseTo(0.24758, 4);
    expect(k.resultado.visao.linhas.join(' ')).toMatch(/saturam em ±0,248 1\/m/);
    expect(k.resultado.visao.linhas.join(' ')).not.toMatch(/ ms/);
  }, 180_000);
});

/** O limite declarado da fração de pixels da peça no branco (os três canais em 250 ou mais) na luz rasante. Antes da exposição, o quarto traseiro do carro saía com 18 %. */
const LIMITE_DE_PIXELS_SATURADOS = 0.01;

describe('olhar-bancada: a luz rasante não estoura a peça', () => {
  it('no quarto traseiro do carro, a fração de pixels saturados fica abaixo do limite declarado', async () => {
    /* A lataria da rodada 2 leva uns 130 s só para gerar no CI (a subdivisão da rede ficou mais densa), acima do prazo padrão de 90 s da bancada. */
    const r = await capturar('carro-fastback/lataria', ['--visao=luz-rasante', '--enquadrar', '--prazo=600'], 'isometrica-traseira');
    const m = medir(r.arquivo);
    expect(m.ocupacao).toBeGreaterThan(0.2);
    expect(m.saturados).toBeLessThan(LIMITE_DE_PIXELS_SATURADOS);
  }, 900_000);
});

describe('olhar-bancada: a pintura', () => {
  it('a pintura é visão de inspeção: o nome da imagem diz o número de caixas, o controle fora dela ou fora da faixa é recusado', async () => {
    const r = await capturar(LISA, ['--visao=pintura', '--caixas-de-luz=3', '--enquadrar']);
    expect(r.nome).toMatch(/visao-pintura-caixas3-enquadrado/);
    expect(r.stdout).toMatch(/3 caixas de luz/);
    const fora = await comoCLI([LISA, '--visao=pintura', '--caixas-de-luz=9']);
    expect(fora.codigo).toBe(2);
    expect(fora.stderr).toMatch(/caixas de 1 a 4.*"9"/);
    const fracionada = await comoCLI([LISA, '--visao=pintura', '--caixas-de-luz=1.5']);
    expect(fracionada.codigo).toBe(2);
    expect(fracionada.stderr).toMatch(/número inteiro/);
  }, 120_000);

  it('a borda do reflexo da janela de luz sai reta na chapa lisa e torta no amassado, medida na imagem', async () => {
    const amassada = await capturar(AMASSADA, ['--visao=pintura', '--caixas-de-luz=2', '--enquadrar'], 'frontal');
    const lisa = await capturar(LISA, ['--visao=pintura', '--caixas-de-luz=2', '--enquadrar'], 'frontal');
    const a = medirBorda(amassada.arquivo);
    const l = medirBorda(lisa.arquivo);
    console.log('pintura: borda da janela, variação em pixels (colunas, mínimo, máximo) lisa', JSON.stringify(l), 'amassada', JSON.stringify(a));
    /* a peça enche o quadro e a borda aparece em quase todas as colunas */
    expect(l.colunas).toBeGreaterThan(200);
    expect(a.colunas).toBeGreaterThan(200);
    /* lisa: a borda varia só o que o abaulamento dá; amassada: o amassado a desloca bem além disso */
    expect(l.amplitude).toBeLessThan(10);
    expect(a.amplitude).toBeGreaterThan(l.amplitude + 20);
  }, 120_000);
});
