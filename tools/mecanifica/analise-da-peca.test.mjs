/* analise-da-peca.test.mjs — a matriz do "Pare e analise", o manifesto e o zoom. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { afterEach, describe, expect, it } from 'vitest';
import { analisarPeca, estadoDaAnalise, lerZoom } from './analise-da-peca.mjs';

const REPO = new URL('../..', import.meta.url).pathname;
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
    expect(r.arquivos.at(-1)).toBe(`${PASTA}/manifesto.json`);
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
    expect(r.arquivos).toContain(`${PASTA}/zoom-frontal-arame.png`);
    rmSync(area, { recursive: true, force: true });
  });

  it('recusa zoom mal formado ou fora da imagem', async () => {
    expect(() => lerZoom('frontal:1,2,3')).toThrow(/--zoom/);
    await expect(analisarPeca({ peca: PECA, zoom: 'frontal:0,0,400,300', olhar: olharFalso([]) })).rejects.toThrow(/sai da imagem/);
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
