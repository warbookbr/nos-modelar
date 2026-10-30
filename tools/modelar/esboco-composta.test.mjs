/* esboco-composta.test.mjs — o `--composta` do esboço: uma imagem só com as quatro vistas sem legenda em grade 2x2, 1100 px
   de largura no total, cada quadrante igual ao desenho por pixel de `desenhoParaBuffer`, e a mesma saída para a mesma entrada. As
   quatro vistas que vão ao crítico (a composta, as do brief do objeto e as `--vista`) saem na escala comum, com a barra de 100 mm do
   mesmo comprimento em todas. */
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { afterAll, describe, expect, it } from 'vitest';
import { desenharEsboco, escalaComumDasVistas } from '../../modulos/esboco/src/index.js';
import { expandirEsboco } from '../../modulos/esboco/src/expandir.js';
import { briefDoObjeto, compostaArquivo, desenhoParaBuffer, desenhosDoObjeto, LARGURA_DA_COMPOSTA, OPCOES_DA_CAMADA, variante, vistasArquivo, VISTAS_DA_ANALISE } from './esboco.mjs';

const PASTA = mkdtempSync(join(tmpdir(), 'esboco-composta-'));
afterAll(() => rmSync(PASTA, { recursive: true, force: true }));

/* Um esboço pequeno de duas opções de forma: caixa e cilindro sobre ela, com as quatro vistas bem diferentes. */
const ARQUIVO = join(PASTA, 'mesa.esboco.json');
writeFileSync(ARQUIVO, `${JSON.stringify({
  opcoes: [{
    titulo: 'Mesa',
    formas: [
      { id: 'tampo', tipo: 'caixa', largura: 160, altura: 12, profundidade: 90, centro: [0, 70, 0], cor: 'cinza' },
      { id: 'perna', tipo: 'cilindro', diametro: 14, comprimento: 70, eixo: 'y', sobre: 'tampo', cor: 'azul' },
    ],
  }],
}, null, 2)}\n`);

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

describe('--composta', () => {
  it('grava uma imagem de 1100 px com as quatro vistas em quadrantes, cada uma igual ao desenho por pixel', async () => {
    const pasta = join(PASTA, 'uma');
    mkdirSync(pasta);
    const r = await compostaArquivo(ARQUIVO, { saida: pasta });
    expect(r.destino).toBe(join(pasta, 'mesa-composta.png'));
    expect(r.celula).toBe(LARGURA_DA_COMPOSTA / 2);
    const grade = PNG.sync.read(readFileSync(r.destino));
    expect(grade.width).toBe(LARGURA_DA_COMPOSTA);
    expect(grade.height).toBe(r.altura);

    const { chromium } = await import('playwright');
    const navegador = await chromium.launch();
    try {
      const expandido = expandirEsboco(JSON.parse(readFileSync(ARQUIVO, 'utf8')));
      const posicoes = [[0, 0], [1, 0], [0, 1], [1, 1]];
      let alturas = [0, 0];
      const vistas = [];
      const desenhos = VISTAS_DA_ANALISE.map((v) => variante({ ...expandido, ladosPorEscala: expandido.ladosPorEscala ?? true }, { vista: v, legendas: false, centros: false }));
      /* as quatro na escala comum, a maior com que a mesa cabe em todas */
      expect(r.escala).toBe(escalaComumDasVistas(desenhos));
      for (const desenho of desenhos) {
        const d = desenharEsboco(desenho, { ...OPCOES_DA_CAMADA, escala: r.escala });
        const { png } = await desenhoParaBuffer(d, r.celula, navegador);
        vistas.push(PNG.sync.read(png));
      }
      vistas.forEach((img, i) => { alturas[posicoes[i][1]] = Math.max(alturas[posicoes[i][1]], img.height); });
      vistas.forEach((img, i) => {
        const [coluna, linha] = posicoes[i];
        const x0 = coluna * r.celula;
        const y0 = linha === 0 ? 0 : alturas[0];
        const dy = Math.floor((alturas[linha] - img.height) / 2);
        let difere = 0;
        let semAlfa = 0;
        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const s = (y * img.width + x) * 4;
            const t = ((y0 + dy + y) * grade.width + x0 + x) * 4;
            if (img.data[s + 3] !== 255) semAlfa++;
            if (grade.data[t] !== img.data[s] || grade.data[t + 1] !== img.data[s + 1] || grade.data[t + 2] !== img.data[s + 2]) difere++;
          }
        }
        expect({ quadrante: VISTAS_DA_ANALISE[i], semAlfa, difere }).toEqual({ quadrante: VISTAS_DA_ANALISE[i], semAlfa: 0, difere: 0 });
      });
    } finally {
      await navegador.close();
    }
  }, 90_000);

  it('é determinística: o mesmo esboço gera a mesma imagem, byte a byte', async () => {
    const a = join(PASTA, 'det-a');
    const b = join(PASTA, 'det-b');
    mkdirSync(a);
    mkdirSync(b);
    const ra = await compostaArquivo(ARQUIVO, { saida: a });
    const rb = await compostaArquivo(ARQUIVO, { saida: b });
    expect(sha(readFileSync(ra.destino))).toBe(sha(readFileSync(rb.destino)));
  }, 90_000);

  it('a largura pedida muda o tamanho, e a metade de cada vista acompanha', async () => {
    const pasta = join(PASTA, 'estreita');
    mkdirSync(pasta);
    const r = await compostaArquivo(ARQUIVO, { largura: 800, saida: pasta });
    const grade = PNG.sync.read(readFileSync(r.destino));
    expect([grade.width, r.celula]).toEqual([800, 400]);
  }, 90_000);
});

/* Um cilindro longo (800 mm por 60 de diâmetro): sozinha, a vista de ponta enchia o painel com o círculo e a barra de 100 mm saía oito
   vezes mais comprida que nas outras. */
const LONGO = join(PASTA, 'haste.esboco.json');
writeFileSync(LONGO, `${JSON.stringify({
  opcoes: [{ titulo: 'Haste', formas: [{ id: 'haste', tipo: 'cilindro', diametro: 60, comprimento: 800, eixo: 'x', centro: [0, 0, 0], cor: 'cinza' }] }],
}, null, 2)}\n`);
const barraDe = (svg) => {
  const m = /<line x1="20" y1="([\d.]+)" x2="([\d.]+)" y2="\1" stroke="#111111" stroke-width="3"\/><text [^>]*>([^<]+)<\/text>/.exec(svg);
  return m ? `${(Number(m[2]) - 20).toFixed(1)} px, ${m[3]}` : null;
};

describe('a mesma escala nas vistas que vão ao crítico', () => {
  it('as quatro vistas do brief do objeto têm a barra de 100 mm do mesmo comprimento numa peça alongada', () => {
    const desenhos = desenhosDoObjeto(JSON.parse(readFileSync(LONGO, 'utf8'))).filter((d) => !d.ampliada);
    const barras = desenhos.map(({ r }) => barraDe(r.svg));
    expect(barras[0]).toMatch(/ px, 100 mm$/);
    expect(barras).toEqual(VISTAS_DA_ANALISE.map(() => barras[0]));
  });

  it('a vista pedida sozinha (`--vista`) sai na escala das quatro, e a composta também', async () => {
    const [frontal] = desenhosDoObjeto(JSON.parse(readFileSync(LONGO, 'utf8'))).filter((d) => d.vista === 'frontal');
    const pasta = join(PASTA, 'longo');
    mkdirSync(pasta);
    const so = await vistasArquivo(LONGO, { vista: 'lateral', saida: pasta, forcar: true });
    expect(so.destinos).toHaveLength(1);
    expect(barraDe(so.svgs[0])).toBe(barraDe(frontal.r.svg));
    const composta = await compostaArquivo(LONGO, { saida: pasta });
    expect(composta.escala).toBe(frontal.r.escala);
  }, 90_000);
});

describe('a vista ampliada em escala própria', () => {
  it('a peça alongada ganha a quinta imagem, a vista de ponta na escala própria e rotulada; a mesa compacta não ganha', () => {
    const longo = desenhosDoObjeto(JSON.parse(readFileSync(LONGO, 'utf8')));
    expect(longo.map((d) => [d.vista, Boolean(d.ampliada)])).toEqual([...VISTAS_DA_ANALISE.map((v) => [v, false]), ['lateral', true]]);
    const [ampliada] = longo.filter((d) => d.ampliada);
    expect(ampliada.r.svg).toContain('>Lateral, ampliada em escala própria</text>');
    expect(ampliada.r.escala).toBeGreaterThan(4 * longo[0].r.escala);
    expect(barraDe(ampliada.r.svg)).not.toBe(barraDe(longo[0].r.svg));
    expect(desenhosDoObjeto(JSON.parse(readFileSync(ARQUIVO, 'utf8'))).some((d) => d.ampliada)).toBe(false);
  });

  it('o brief do objeto e as vistas da unidade gravam a ampliada e o brief a lista depois das quatro, dizendo que a escala é própria', async () => {
    const pasta = join(PASTA, 'brief-longo');
    const b = await briefDoObjeto(LONGO, { saida: pasta });
    expect(b.gerais).toHaveLength(4);
    expect(b.ampliadas).toEqual([join(pasta, 'haste-objeto-lateral-ampliada.png')]);
    expect(PNG.sync.read(readFileSync(b.ampliadas[0])).width).toBe(1100);
    const linhas = b.texto.split('\n');
    const quatro = linhas.indexOf(`  ${b.gerais[3]}`);
    expect(linhas[quatro + 1]).toMatch(/^Vista ampliada em escala própria .*barra de 100 mm desta imagem tem outro comprimento/);
    expect(linhas[quatro + 2]).toBe(`  ${b.ampliadas[0]}`);
    expect(b.texto).toContain('as quatro vistas, sem legenda, na mesma escala, com a barra de 100 mm do mesmo comprimento nas quatro');
    const mesa = await briefDoObjeto(ARQUIVO, { saida: join(PASTA, 'brief-mesa') });
    expect(mesa.ampliadas).toEqual([]);
    expect(mesa.texto).not.toContain('ampliada');
    const v = await vistasArquivo(LONGO, { saida: join(PASTA, 'vistas-longo'), ampliadas: true, forcar: true });
    expect(v.destinos).toHaveLength(4);
    expect(v.ampliadas).toEqual([join(PASTA, 'vistas-longo', 'haste-lateral-ampliada.png')]);
  }, 120_000);
});
