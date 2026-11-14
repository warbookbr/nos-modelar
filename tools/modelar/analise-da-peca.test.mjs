/* analise-da-peca.test.mjs — a matriz do "Pare e analise", o manifesto e o zoom. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { afterEach, describe, expect, it } from 'vitest';
import { analisarPeca, cantosDaCaixaMm, caixaEmPixelsDosCantos, estadoDaAnalise, lerZoom } from './analise-da-peca.mjs';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const PECA = 'peca-teste-analise';
const PASTA = `tools/bancadas/out/analise-${PECA}`;
afterEach(() => rmSync(join(REPO, PASTA), { recursive: true, force: true }));

/* olhar falso: grava um PNG 40x30 por vista e devolve os caminhos planejados. */
function olharFalso(chamadas) {
  return async (o) => {
    chamadas.push(o);
    mkdirSync(join(REPO, o.saida), { recursive: true });
    const sufixo = [o.selecionadas?.length ? 'sel' : null, o.arame === 'raio-x' ? 'raio-x' : (o.arame ? 'arame' : null)].filter(Boolean).join('-');
    const arquivos = o.vistas.map((v) => {
      const png = new PNG({ width: 40, height: 30 });
      png.data.fill(o.arame ? 100 : 200);
      const a = join(o.saida, `bancada-${PECA}-${v}-orto${sufixo ? `-${sufixo}` : ''}.png`);
      writeFileSync(join(REPO, a), PNG.sync.write(png));
      return a;
    });
    return { ok: true, resultado: { arquivos } };
  };
}

describe('analisarPeca', () => {
  it('gera 6 vistas x 3 modos, a peça isolada e o manifesto', async () => {
    const chamadas = [];
    const r = await analisarPeca({ peca: PECA, parte: 'corpo', olhar: olharFalso(chamadas) });
    expect(r.ok).toBe(true);
    expect(chamadas.map((c) => c.arame)).toEqual([false, true, 'raio-x', false]);
    expect(chamadas[3]).toMatchObject({ selecionadas: ['corpo'], modo: 'isolar' });
    const manifesto = JSON.parse(readFileSync(join(REPO, PASTA, 'manifesto.json'), 'utf8'));
    expect(manifesto.arquivos).toHaveLength(24);
    expect(manifesto.arquivos.every((a) => existsSync(join(REPO, a)))).toBe(true);
    expect(manifesto.data).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(r.arquivos.at(-1).replaceAll('\\', '/')).toBe(`${PASTA}/manifesto.json`);
  });

  it('leva o prazo de carga pedido a cada captura, e sem pedido deixa o padrão da bancada', async () => {
    const comPrazo = [];
    await analisarPeca({ peca: PECA, parte: 'corpo', olhar: olharFalso(comPrazo), prazoDeCargaMs: 600_000 });
    expect(comPrazo.every((c) => c.prazoDeCargaMs === 600_000)).toBe(true);
    const semPrazo = [];
    await analisarPeca({ peca: PECA, olhar: olharFalso(semPrazo) });
    expect(semPrazo.every((c) => !('prazoDeCargaMs' in c))).toBe(true);
  });

  it('numa --saida escolhida grava numa subpasta por peça, e duas peças na mesma pasta não se misturam', async () => {
    const saida = 'tools/bancadas/out/teste-saida-por-peca';
    const chamadas = [];
    await analisarPeca({ peca: PECA, saida, olhar: olharFalso(chamadas) });
    await analisarPeca({ peca: 'outra-peca', saida, olhar: olharFalso([]) });
    expect(chamadas.every((c) => c.saida.replaceAll('\\', '/') === `${saida}/analise-${PECA}`)).toBe(true);
    const manifestoDaPrimeira = join(REPO, saida, `analise-${PECA}`, 'manifesto.json');
    const arquivos = JSON.parse(readFileSync(manifestoDaPrimeira, 'utf8')).arquivos;
    expect(arquivos.length).toBeGreaterThan(0);
    /* a segunda peça, na mesma --saida, não apagou nem sobrescreveu nada da primeira */
    expect(arquivos.every((a) => existsSync(join(REPO, a)))).toBe(true);
    expect(existsSync(join(REPO, saida, 'analise-outra-peca', 'manifesto.json'))).toBe(true);
    rmSync(join(REPO, saida), { recursive: true, force: true });
  });

  it('recorta o zoom 3x e compõe o par antes/depois; repetir a rodada não colide', async () => {
    const area = mkdtempSync(join(tmpdir(), 'antes-'));
    const antes = join(area, 'antes.png');
    const p = new PNG({ width: 40, height: 30 });
    p.data.fill(50);
    writeFileSync(antes, PNG.sync.write(p));
    const opcoes = { peca: PECA, zoom: 'frontal:10,5,20,15', zoomAntes: antes, olhar: olharFalso([]) };
    await analisarPeca(opcoes);
    const r = await analisarPeca(opcoes);
    const par = PNG.sync.read(readFileSync(join(REPO, PASTA, 'zoom-frontal-antes-depois.png')));
    expect([par.width, par.height]).toEqual([30 + 8 + 30, 30]);
    expect(r.arquivos.map((a) => a.replaceAll('\\', '/'))).toContain(`${PASTA}/zoom-frontal-arame.png`);
    rmSync(area, { recursive: true, force: true });
  });

  it('recusa zoom mal formado ou fora da imagem', async () => {
    expect(() => lerZoom('frontal:1,2,3')).toThrow(/--zoom/);
    await expect(analisarPeca({ peca: PECA, zoom: 'frontal:0,0,400,300', olhar: olharFalso([]) })).rejects.toThrow(/sai da imagem/);
  });
});

describe('o zoom em pixels e o zoom em mm não se confundem', () => {
  it('lê as duas formas, pelo prefixo mm:, e ordena os cantos da caixa em mm', () => {
    expect(lerZoom('frontal:10,5,20,15')).toEqual({ vista: 'frontal', caixa: [10, 5, 20, 15] });
    expect(lerZoom('direita:mm:1100,1700,-300,900,1500.5,300')).toEqual({ vista: 'direita', mm: [[900, 1500.5, -300], [1100, 1700, 300]] });
  });

  it('recusa o uso ambíguo dizendo o que escrever', () => {
    expect(() => lerZoom('frontal:900,1200,-300,1100,1500,300')).toThrow(/caixa em mm leva o prefixo mm:\. Escreva --zoom=frontal:mm:900,1200,-300,1100,1500,300/);
    expect(() => lerZoom('frontal:mm:10,5,20,15')).toThrow(/pede 6 números.*escreva sem o mm: --zoom=frontal:10,5,20,15/);
    expect(() => lerZoom('frontal:mm:1,2,3')).toThrow(/pede 6 números/);
    expect(() => lerZoom('frontal:10.5,5,20,15')).toThrow(/pixels pede 4 inteiros.*só vale em mm/);
    expect(() => lerZoom('frontal:-1,5,20,15')).toThrow(/pixels pede 4 inteiros/);
    expect(() => lerZoom('frontal:a,b,c,d')).toThrow(/não é número/);
    expect(() => lerZoom('lateral:1,2,3,4')).toThrow(/vista 'lateral'/);
    expect(() => lerZoom('frontal:20,5,10,15')).toThrow(/x1>x0/);
    expect(() => lerZoom('semvista')).toThrow(/--zoom veio.*Escreva --zoom=<vista>:<x0,y0,x1,y1>.*mm:/);
  });

  it('os 8 cantos, e a caixa em pixels que os envolve, arredondada para fora e cortada ao quadro', () => {
    expect(cantosDaCaixaMm([[0, 0, 0], [1, 2, 3]])).toHaveLength(8);
    expect(new Set(cantosDaCaixaMm([[0, 0, 0], [1, 2, 3]]).map((c) => c.join()))).toEqual(new Set(['0,0,0', '0,0,3', '0,2,0', '0,2,3', '1,0,0', '1,0,3', '1,2,0', '1,2,3']));
    expect(caixaEmPixelsDosCantos([[10.2, 5.9], [20.1, 15.5], [12, 8]], [40, 30])).toEqual({ caixa: [10, 5, 21, 16], livre: [10, 5, 21, 16], cortada: false });
    expect(caixaEmPixelsDosCantos([[-5, 5], [20, 15]], [40, 30])).toMatchObject({ caixa: [0, 5, 20, 15], cortada: true });
    expect(caixaEmPixelsDosCantos([[50, 5], [60, 15]], [40, 30]).caixa).toBeNull();
  });
});

describe('o zoom por caixa em mm na análise', () => {
  /* olhar falso com a projeção: cada vista projeta a caixa num retângulo de pixels conhecido */
  function olharComProjecao(chamadas, pixels) {
    const base = olharFalso(chamadas);
    return async (o) => {
      const r = await base(o);
      return o.projetar ? { ...r, resultado: { ...r.resultado, vistas: o.vistas.map(() => ({ projecaoMm: { pixels, quadro: [40, 30] } })), contatos: { estado: 'medidos', pares: 0, segundos: 1 }, cargasDePagina: 1 } } : r;
    };
  }

  it('pede a projeção dos 8 cantos só na primeira passada, recorta a caixa projetada nos três modos e grava a caixa em pixels no manifesto', async () => {
    const chamadas = [];
    const pixels = [[10, 5], [19.2, 14.1], [12, 8], [10, 14], [19, 5], [11, 6], [15, 9], [16, 10]];
    const r = await analisarPeca({ peca: PECA, zoom: 'frontal:mm:900,1200,-300,1100,1500,300', olhar: olharComProjecao(chamadas, pixels) });
    expect(chamadas.filter((c) => c.projetar)).toHaveLength(1);
    expect(chamadas[0].projetar).toHaveLength(8);
    const zoom = JSON.parse(readFileSync(join(REPO, PASTA, 'manifesto.json'), 'utf8')).zoom;
    expect(zoom).toMatchObject({ vista: 'frontal', caixaEmPixels: [10, 5, 20, 15], cortadaPeloQuadro: false });
    const recorte = PNG.sync.read(readFileSync(join(REPO, PASTA, 'zoom-frontal-sombreado.png')));
    expect([recorte.width, recorte.height]).toEqual([30, 30]);
    expect(r.arquivos.map((a) => a.replaceAll('\\', '/'))).toContain(`${PASTA}/zoom-frontal-raio-x.png`);
    expect(r.zoomEmPixels.caixa).toEqual([10, 5, 20, 15]);
  });

  it('caixa fora do quadro da vista, ou captura sem projeção, é recusada com o que fazer', async () => {
    await expect(analisarPeca({ peca: PECA, zoom: 'frontal:mm:0,0,0,1,1,1', olhar: olharComProjecao([], [[100, 100], [120, 120]]) })).rejects.toThrow(/cai fora do quadro da vista frontal.*use uma vista que a mostre/);
    await expect(analisarPeca({ peca: PECA, zoom: 'frontal:mm:0,0,0,1,1,1', olhar: olharFalso([]) })).rejects.toThrow(/não devolveu a projeção/);
  });

  it('leva as opções de contatos a cada captura e põe a carga e o estado dos contatos no resultado e no manifesto', async () => {
    const chamadas = [];
    const olhar = async (o) => {
      const r = await olharFalso(chamadas)(o);
      return { ...r, resultado: { ...r.resultado, cargasDePagina: chamadas.length === 1 ? 1 : 0, contatos: chamadas.length === 1 ? { estado: 'pulados' } : undefined } };
    };
    const r = await analisarPeca({ peca: PECA, contatos: { medirContatos: false, cacheDeContatos: false }, olhar });
    expect(chamadas.every((c) => c.medirContatos === false && c.cacheDeContatos === false)).toBe(true);
    expect(r.cargasDePagina).toBe(1);
    expect(r.contatos).toEqual({ estado: 'pulados' });
    expect(r.manifesto).toMatchObject({ cargasDePagina: 1, contatos: { estado: 'pulados' } });
  });
});

describe('estadoDaAnalise', () => {
  it('é feita com o hash da receita atual e ausente sem manifesto ou com hash velho', () => {
    const hashDe = () => 'novo';
    expect(estadoDaAnalise('x', { lerManifestoDe: () => ({ receita: 'novo' }), hashDe })).toBe('feita');
    expect(estadoDaAnalise('x', { lerManifestoDe: () => ({ receita: 'velho' }), hashDe })).toBe('ausente');
    expect(estadoDaAnalise('x', { lerManifestoDe: () => null, hashDe })).toBe('ausente');
  });
});
