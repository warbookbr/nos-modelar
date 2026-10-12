/* Leitura padrão do `--descrever` (só divergências), detalhe por forma, leitura completa idêntica à antiga e imagem por achado. */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { ErroDeEsboco, resolverOpcao } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { descreverEsboco, formatarDescricao, formatarForma, formatarResumo, medirEsboco } from '../src/descrever.js';
import { imagemDoAchado, pontoDoAchado } from '../src/achado.js';
import { achadoArquivo, analisarEsboco, descreverArquivo, lerArgumentos } from '../../../tools/mecanifica/esboco.mjs';

const pasta = new URL('./fixtures/', import.meta.url);
const caminho = (nome) => fileURLToPath(new URL(nome, pasta));
const fixture = (nome) => JSON.parse(readFileSync(caminho(nome), 'utf8'));
const sha = (t) => createHash('sha256').update(t).digest('hex');
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const linhas = (t) => t.trimEnd().split('\n');
const motivo = 'as peças se cruzam de propósito neste teste';

/* Um esboço com uma divergência de cada classe: uma peça solta, um atravessamento acima do max, um espelho deslocado e uma medida fora. */
const defeituoso = () => ({
  contato: { usar: true, tolerancia: 2, penetracao: 2, folga: 100, pares: [{ a: 'base', b: 'pino', tipo: 'atravessa', max: 5, motivo }] },
  plano: { medidas: [{ nome: 'altura', valor: 500, unidade: 'mm', origem: 'ficha', tolerancia: 5, mede: 'alturaTotal' }] },
  opcoes: [{
    titulo: 'T',
    formas: [
      caixa('base', [0, 50, 0], 200, 100, 100, { cor: 'cinza' }),
      caixa('pino', [0, 130, 0], 20, 100, 20, { cor: 'azul' }),
      caixa('olhoE', [-110, 50, 0], 20, 20, 20),
      { id: 'olhoD', espelha: { forma: 'olhoE', eixo: 'x' }, desloca: [0, 0, 9] },
      caixa('longe', [1000, 50, 0]),
    ],
  }],
});

describe('leitura padrão do --descrever', () => {
  it('a moto detalhada, com o gate aprovado, cabe em menos de 40 linhas (só formas, parâmetros e divergências)', () => {
    const { texto } = descreverArquivo(caminho('moto-curvas.esboco.json'));
    expect(linhas(texto).length).toBeLessThan(40);
    expect(texto).toContain('opção 1 (A. Naked): 24 formas');
    expect(texto).toContain('opção 2 (B. Café racer): 24 formas');
    expect(texto).toContain('parâmetros: entreEixos 1400; raioRoda 305');
    expect(texto.match(/divergências: nenhuma/g)).toHaveLength(2);
    /* âncoras, caixas e vizinhos ficam de fora */
    expect(texto).not.toMatch(/âncoras |caixa x |contato: |forma tanque/);
    expect(linhas(texto)).toHaveLength(9);
  });

  it('lista as divergências em ordem de gravidade e numera cada uma', () => {
    const d = medirEsboco(defeituoso(), { projecao: false });
    expect(d.divergencias.map((x) => `${x.n}:${x.classe}`)).toEqual(['1:solto', '2:atravessa', '3:assimetria', '4:medida']);
    const texto = formatarResumo(d.descricao, d.divergencias);
    const l = linhas(texto);
    expect(l).toContain('divergências (4, da mais grave para a menos):');
    expect(l.find((x) => x.startsWith('  [1] solto:'))).toContain('longe fora do grupo conectado, a 870,0 mm dele');
    expect(l.find((x) => x.startsWith('  [2] atravessa:'))).toMatch(/base e pino se atravessam 20,0 mm, acima do máximo declarado de 5,0 mm; sugestão: mova/);
    expect(l.find((x) => x.startsWith('  [3] assimetria:'))).toContain('olhoD é o espelho de olhoE no eixo x, mas foi deslocado 9 mm depois de refletir');
    expect(l.find((x) => x.startsWith('  [4] medida:'))).toContain('medida "altura" fora da tolerância');
    expect(l[l.length - 1]).toBe('detalhe de uma forma: --forma <id>; imagem de uma divergência: --achado <n>; leitura completa: --completo');
  });

  it('sem o gate declarado usa as soltas e as sobreposições 3D não declaradas', () => {
    const j = defeituoso();
    delete j.contato;
    const d = medirEsboco(j, { projecao: false });
    expect(d.divergencias.map((x) => x.classe)).toEqual(['solto', 'atravessa', 'assimetria', 'medida']);
    expect(d.divergencias[1].texto).toMatch(/base e pino se atravessam/);
  });

  it('o detalhe de uma forma traz âncoras, caixa, vizinhos e as divergências que a citam, e só dela', () => {
    const j = defeituoso();
    const d = medirEsboco(j);
    const t = formatarForma(d.descricao, d.divergencias, 'pino');
    expect(t).toContain('forma pino: caixa');
    expect(t).toContain('âncoras pino: centro');
    expect(t).toContain('contato: base toca pino');
    expect(t).toMatch(/divergência \[2\] atravessa: base e pino se atravessam/);
    expect(t).not.toContain('forma base:');
    const padrao = formatarForma(medirEsboco(fixture('moto-curvas.esboco.json')).descricao, [], 'garfoE.*');
    expect(padrao.match(/^forma /gm)).toHaveLength(6);
    expect(() => formatarForma(d.descricao, d.divergencias, 'pinho')).toThrow(/"pinho" não é uma forma do esboço \(quis dizer "pino"\?\) \(ids: base, pino, olhoE, olhoD, longe\)/);
  });

  it('a linha de comando aceita --forma <id> antes ou depois do arquivo e --completo', () => {
    expect(lerArgumentos(['--forma', 'garfoE', 'a.json', '--descrever'])).toMatchObject({ alvo: 'a.json' });
    expect(lerArgumentos(['a.json', '--forma=garfoE.perna']).valor('--forma')).toBe('garfoE.perna');
    expect(lerArgumentos(['--condutor', 'b.json', '--proximo'])).toMatchObject({ alvo: 'b.json' });
    const forma = descreverArquivo(caminho('moto-curvas.esboco.json'), { forma: 'tanque' }).texto;
    expect(forma).toContain('forma tanque: loft');
    expect(descreverArquivo(caminho('moto-curvas.esboco.json'), { completo: true }).texto).toContain('forma tanque: loft');
  });
});

/* A leitura de cada fixture antiga, medida no commit anterior (a mesma de HASHES_DE_ANTES em parametros.test.js). */
const HASHES_DA_LEITURA = {
  casa: 'e68fd21974357f10d9f8fadee134a98cbf9c37fbcf012e8f99eac5db344ca6fb',
  'mancal-eixo': 'cbce6f1a621214af6eb020cce47db0061249a074b2f0807f921429b2e861c73c',
  moto: '17aa298d0c94802c01b68bb940eb5db7bf7206123645bf023bca0db1ab32da93',
  'teste-cubo': 'cf3236a889865881ec8624ac320befee8df359dd54b0a1e55e719a6b879f051d',
  'moto-relacoes': 'abaaa8aa07ee7f3b5a80e05ed71bf7cb5fc475445b53648cee85c2c46c5df492',
};

describe('--completo é a leitura de antes, byte a byte', () => {
  it.each(Object.keys(HASHES_DA_LEITURA))('%s', (nome) => {
    const { texto } = descreverArquivo(caminho(`${nome}.esboco.json`), { completo: true });
    expect(sha(texto.replace(/; sugestão: .*$/gm, ''))).toBe(HASHES_DA_LEITURA[nome]);
    expect(texto).toBe(formatarDescricao(descreverEsboco(fixture(`${nome}.esboco.json`))));
    /* o JSON da leitura também não ganha campo nenhum quando os recursos novos não são usados */
    expect(descreverArquivo(caminho(`${nome}.esboco.json`), { json: true }).texto).toBe(`${JSON.stringify(descreverEsboco(fixture(`${nome}.esboco.json`)), null, 2)}\n`);
    expect(JSON.stringify(descreverEsboco(fixture(`${nome}.esboco.json`)))).not.toMatch(/divergencias|assimetrias/);
  }, 60000);
});

describe('imagem por achado', () => {
  /* matiz e saturação de um "#rrggbb" */
  const hsv = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b); const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d > 0) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: ((h * 60) + 360) % 360, s: max === 0 ? 0 : d / max };
  };

  const colisao = () => ({
    contato: { usar: true, tolerancia: 2, penetracao: 2, folga: 500 },
    opcoes: [{ titulo: 'T', formas: [
      caixa('a', [0, 50, 0], 200, 100, 100, { cor: 'verde', rotulo: '1. a' }),
      caixa('b', [0, 130, 0], 60, 100, 60, { cor: 'roxo', rotulo: '2. b' }),
      caixa('c', [-400, 50, 0], 100, 100, 100, { cor: 'vermelho', rotulo: '3. c' }),
      caixa('d', [400, 50, 0], 100, 100, 100, { cor: 'amarelo', rotulo: '4. d' }),
    ] }],
  });

  it('só o par envolvido sai colorido, o resto em cinza translúcido, sem texto, balão nem legenda numerada', () => {
    const d = medirEsboco(colisao(), { projecao: false }).divergencias.find((x) => x.tipo === 'colisao');
    expect(d.pecas).toEqual(['a', 'b']);
    const im = imagemDoAchado(colisao(), d);
    expect(im.svg).not.toContain('<text');
    expect(im.svg).not.toContain('<circle');
    expect(im.svg).not.toContain('<polyline');
    const fills = [...im.svg.matchAll(/fill="(#[0-9a-f]{6})"/g)].map((m) => m[1]).filter((c) => c !== '#ffffff');
    const coloridos = fills.filter((c) => hsv(c).s > 0.3);
    const matizes = new Set(coloridos.map((c) => Math.round(hsv(c).h / 20)));
    /* só laranja (matiz 32) e azul (matiz 215): e nenhum dos verdes, roxos, vermelhos ou amarelos originais */
    expect([...matizes].sort((x, y) => x - y)).toEqual([2, 11]);
    expect(fills.length - coloridos.length).toBeGreaterThan(0);
    expect(im.svg.match(/<g opacity="0.5">/g)).toHaveLength(2);
    expect(Object.entries(im.cores)).toEqual([['a', 'laranja'], ['b', 'azul']]);
    /* o esboço que desenhou a imagem não leva rótulo nenhum */
    expect(JSON.stringify(im.esboco)).not.toContain('rotulo');
  });

  it('o zoom fica no ponto do achado, dentro das duas peças, e a janela cabe em 200 a 700 mm', () => {
    const e = expandirEsboco(colisao());
    const rs = resolverOpcao(e.opcoes[0], 'T');
    const d = medirEsboco(colisao(), { projecao: false }).divergencias.find((x) => x.tipo === 'colisao');
    const im = imagemDoAchado(colisao(), d);
    const [a, b] = [rs[0], rs[1]];
    im.ponto.forEach((v, i) => {
      expect(v).toBeGreaterThanOrEqual(Math.max(a.min[i], b.min[i]) - 0.1);
      expect(v).toBeLessThanOrEqual(Math.min(a.max[i], b.max[i]) + 0.1);
    });
    expect(im.janela_mm).toBeGreaterThanOrEqual(200);
    expect(im.janela_mm).toBeLessThanOrEqual(700);
    const [, w, h] = /viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/.exec(im.svg).map(Number);
    expect(w).toBeCloseTo(h, 1);
    /* o quadro inteiro é a janela: pixels por mm do zoom contra os do desenho */
    expect(im.largura).toBe(640);
    expect(im.escala_px_por_mm).toBeCloseTo(640 / im.janela_mm, 9);
  });

  it('o ponto é o meio do vão quando as peças não se tocam e o centro da peça quando o achado é de uma só', () => {
    const rs = resolverOpcao({ formas: [caixa('a', [0, 0, 0], 20, 20, 20), caixa('b', [100, 0, 0], 20, 20, 20)] });
    const p = pontoDoAchado(rs, ['a', 'b']);
    expect(p.ponto).toEqual([50, 0, 0]);
    expect(pontoDoAchado(rs, ['b']).ponto).toEqual([100, 0, 0]);
    expect(pontoDoAchado(rs, []).ponto).toEqual([50, 0, 0]);
  });

  it('a recusa diz a opção ou a vista que não existe', () => {
    const d = { opcao: 'Z', pecas: ['a'] };
    expect(() => imagemDoAchado(colisao(), d)).toThrow(ErroDeEsboco);
    expect(() => imagemDoAchado(colisao(), { opcao: 'T', pecas: ['a'] }, { vista: 'frontl' })).toThrow(/a vista "frontl" não existe \(quis dizer "frontal"\?\)/);
  });

  it('--achado <n> grava o PNG e a imagem tem só o par em cor, medido nos pixels', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'achado-'));
    const arq = join(dir, 'c.esboco.json');
    writeFileSync(arq, JSON.stringify(colisao()));
    const n = medirEsboco(colisao(), { projecao: false }).divergencias.find((x) => x.tipo === 'colisao').n;
    expect(n).toBe(3);
    const r = await achadoArquivo(arq, n);
    expect(r.destino).toBe(join(dir, `c-achado-${n}.png`));
    const png = PNG.sync.read(readFileSync(r.destino));
    expect([png.width, png.height]).toEqual([640, 640]);
    let laranja = 0; let azul = 0; let outros = 0;
    for (let i = 0; i < png.data.length; i += 4) {
      const hex = `#${[0, 1, 2].map((k) => png.data[i + k].toString(16).padStart(2, '0')).join('')}`;
      const { h, s } = hsv(hex);
      if (s < 0.3) continue;
      if (h > 15 && h < 50) laranja++; else if (h > 200 && h < 230) azul++; else outros++;
    }
    expect(laranja).toBeGreaterThan(2000);
    expect(azul).toBeGreaterThan(2000);
    /* nenhum pixel dos verdes, roxos, vermelhos e amarelos originais das outras peças (só as bordas suavizadas) */
    expect(outros).toBeLessThan(0.02 * 640 * 640);
    await expect(achadoArquivo(arq, 9)).rejects.toThrow(/não há a divergência 9 \(a leitura padrão numera de 1 a 3\)/);
    const limpo = join(dir, 'l.esboco.json');
    copyFileSync(caminho('teste-cubo.esboco.json'), limpo);
    await expect(achadoArquivo(limpo, 1)).rejects.toThrow(/não tem divergência para desenhar/);
  }, 60000);

  it('a análise gera a imagem de cada divergência sem mexer nas 8 imagens de sempre nem na lista `arquivos`', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'achado-analise-'));
    const arq = join(dir, 'c.esboco.json');
    writeFileSync(arq, JSON.stringify(colisao()));
    const { pasta: saida, manifesto } = await analisarEsboco(arq);
    expect(manifesto.arquivos).toHaveLength(8);
    expect(manifesto.achados.map((a) => `${a.n}:${a.classe}:${a.arquivo}`)).toEqual(['1:solto:achado-1.png', '2:solto:achado-2.png', '3:atravessa:achado-3.png']);
    for (const a of manifesto.achados) expect(existsSync(join(saida, a.arquivo))).toBe(true);
    expect(manifesto.achados[2]).toMatchObject({ pecas: ['a', 'b'], vista: 'isometrica' });
    /* sem divergência, o manifesto é o de antes: nenhuma chave `achados` */
    writeFileSync(arq, JSON.stringify({ opcoes: [{ formas: [caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0])] }] }));
    const limpo = (await analisarEsboco(arq, { rapido: true })).manifesto;
    expect(limpo).not.toHaveProperty('achados');
    expect(limpo).not.toHaveProperty('planoConferido');
    expect(existsSync(join(saida, 'achado-1.png'))).toBe(false);
  }, 120000);
});
