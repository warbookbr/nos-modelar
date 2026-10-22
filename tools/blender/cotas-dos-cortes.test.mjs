/* cotas-dos-cortes.test.mjs — o rótulo de cada cota de um corte não pode cobrir o traço do contorno: o desenho afasta a
   caixa do ponto e liga os dois por uma linha fina. A forma é desenhada por código (um perfil com bossa, entalhe e uma
   linha aberta, inteiro e pela metade com simetria em x), sem Blender: só precisa de python3 com Pillow e numpy, e se
   ignora sem eles. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const AQUI = fileURLToPath(new URL('.', import.meta.url));
const IMAGENS = join(AQUI, 'imagens.py');
const temPillow = spawnSync('python3', ['-I', '-c', 'import PIL, numpy'], { encoding: 'utf8' }).status === 0;
const M = 70; // a margem do desenho, a mesma de imagens.py

/** Perfil fechado de 0,8 por 0,36 m com uma bossa no teto, um entalhe redondo embaixo e uma linha aberta, em metros. */
function perfil(meia) {
  const arco = (cx, cy, r, a0, a1, n = 40) => Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  const x0 = meia ? 0 : -0.4;
  const c = [[x0, 0], [0.4, 0], [0.4, 0.12], [0.34, 0.2], ...arco(0.15, 0.36, 0.05, 0, Math.PI), [-0.1, 0.3], [x0, 0.3]];
  return { contorno: [...c, c[0]], entalhe: arco(0.2, 0, 0.09, Math.PI, 0), linha: [[x0 + 0.05, 0.1], [0.2, 0.14], [0.3, 0.1]] };
}

const segmentoCruzaCaixa = (a, b, [x0, y0, x1, y1]) => {
  let t0 = 0;
  let t1 = 1;
  const d = [b[0] - a[0], b[1] - a[1]];
  for (const [p, q] of [[-d[0], a[0] - x0], [d[0], x1 - a[0]], [-d[1], a[1] - y0], [d[1], y1 - a[1]]]) {
    if (Math.abs(p) < 1e-12) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
  }
  return t0 <= t1;
};

describe.skipIf(!temPillow)('as cotas dos cortes não cobrem o contorno', () => {
  let dir;
  const p = (nome) => join(dir, nome);
  const cortes = [];
  const rodar = () => {
    const r = spawnSync('python3', ['-I', IMAGENS, 'cortes', p('cortes.json'), p('saida')], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`imagens.py saiu com ${r.status}:\n${r.stderr.slice(-3000)}`);
  };

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'cotas-cortes-'));
    const inteiro = perfil(false);
    const meio = perfil(true);
    cortes.push({ nome: 'inteiro', eixo: 'z', valor: 0.5, eixos_uv: ['x', 'y'], cadeias: [inteiro.contorno, inteiro.entalhe, inteiro.linha] });
    cortes.push({ nome: 'metade', eixo: 'z', valor: 0.7, eixos_uv: ['x', 'y'], cadeias: [meio.contorno, meio.entalhe, meio.linha] });
    writeFileSync(p('cortes.json'), JSON.stringify({ cortes, simetria_x: true }));
    mkdirSync(p('saida'));
    rodar();
  }, 60000);
  afterAll(() => { if (dir) rmSync(dir, { recursive: true, force: true }); });

  it('nenhuma caixa de rótulo cruza o traço, medido de fora a partir do quadro e dos segmentos', () => {
    const rotulos = JSON.parse(readFileSync(p('saida/rotulos.json'), 'utf8'));
    const quadro = JSON.parse(readFileSync(p('saida/quadro.json'), 'utf8'));
    for (const c of cortes) {
      const q = quadro[c.nome];
      const px = ([u, v]) => [M + (u - q.u0) * q.escala_px_m, q.H - M - (v - q.v0) * q.escala_px_m];
      const segmentos = c.cadeias.flatMap((cad) => cad.slice(1).map((pt, i) => [px(cad[i]), px(pt)]));
      expect(rotulos[c.nome].length, c.nome).toBeGreaterThanOrEqual(4);
      expect(rotulos[c.nome].length, c.nome).toBeLessThanOrEqual(6);
      for (const r of rotulos[c.nome]) {
        const [x0, y0, x1, y1] = r.caixa;
        const folga = 2; // a meia largura do traço de 3 px e meio pixel de respiro
        expect(x0 >= 0 && y0 >= 0 && x1 <= q.W && y1 <= q.H, `${c.nome}: ${r.texto} dentro do quadro`).toBe(true);
        const caixa = [x0 - folga, y0 - folga, x1 + folga, y1 + folga];
        expect(segmentos.some(([a, b]) => segmentoCruzaCaixa(a, b, caixa)), `${c.nome}: ${r.texto}`).toBe(false);
        expect(r.cruza_contorno, `${c.nome}: ${r.texto}`).toBe(false);
      }
    }
  });

  it('o teste não é vazio: no lugar colado de antes a caixa cobria o traço, e o rótulo passou a ser afastado e ligado', () => {
    const rotulos = JSON.parse(readFileSync(p('saida/rotulos.json'), 'utf8'));
    const todos = Object.values(rotulos).flat();
    expect(todos.filter((r) => r.cruzava_no_lugar_padrao).length).toBeGreaterThan(0);
    for (const r of todos) if (r.cruzava_no_lugar_padrao) expect(r.afastado, r.texto).toBe(true);
    for (const n of ['inteiro', 'metade']) expect(existsSync(p(`saida/${n}.png`)), n).toBe(true);
  });

  it('repete a mesma saída, e a tabela de cotas fica com as linhas de cada corte', () => {
    const antes = readFileSync(p('saida/rotulos.json'), 'utf8');
    rodar();
    expect(readFileSync(p('saida/rotulos.json'), 'utf8')).toBe(antes);
    const linhas = readFileSync(p('saida/cotas.md'), 'utf8').trim().split('\n').slice(2);
    for (const c of cortes) expect(linhas.filter((l) => l.startsWith(`| ${c.nome} `)).length, c.nome).toBeGreaterThanOrEqual(4);
  });
});
