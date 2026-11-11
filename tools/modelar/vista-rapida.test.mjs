import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { acharPainel, caixaDoObjeto, dePng, FUNDO_DO_PAINEL } from './leitura-por-regioes.mjs';
import { camera, CINZA, coresDasPartes, corDaFace, executar, facesDaOpcao, lerArgumentos, rasterSombreado } from './vista-rapida.mjs';

/* um paralelepípedo de quadriláteros com a normal para fora, em mm */
function caixa(cx, cy, cz, lx, ly, lz, parte, cor) {
  const x0 = cx - lx / 2; const x1 = cx + lx / 2; const y0 = cy - ly / 2; const y1 = cy + ly / 2; const z0 = cz - lz / 2; const z1 = cz + lz / 2;
  const q = [
    [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]],
    [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]],
    [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
  ];
  return q.map((pts) => ({ pts, parte, cor }));
}
/* uma esfera UV facetada, de quadriláteros (triângulos nos polos) */
function esfera(r, setores = 24, aneis = 16, parte = 'bola', cor = '#c86432') {
  const p = (i, j) => { const t = (Math.PI * j) / aneis; const f = (2 * Math.PI * i) / setores; return [r * Math.sin(t) * Math.cos(f), r * Math.cos(t), r * Math.sin(t) * Math.sin(f)]; };
  const faces = [];
  for (let j = 0; j < aneis; j += 1) for (let i = 0; i < setores; i += 1) {
    const pts = [p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1)];
    faces.push({ pts: j === 0 ? [pts[0], pts[2], pts[3]] : (j === aneis - 1 ? [pts[0], pts[1], pts[2]] : pts), parte, cor });
  }
  return faces;
}
const px = (im, x, y) => { const o = (y * im.largura + x) * 3; return [im.dados[o], im.dados[o + 1], im.dados[o + 2]]; };
const igual = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
/* o maior salto de brilho entre vizinhos dentro do disco de raio `fracao` do centro */
function maiorSalto(im, fracao) {
  const cx = im.largura / 2; const cy = im.altura / 2; const raio = fracao * Math.min(cx, cy) / 1.16;
  const brilho = (x, y) => { const c = px(im, x, y); return c[0] + c[1] + c[2]; };
  let maior = 0;
  for (let y = 1; y < im.altura - 1; y += 1) for (let x = 1; x < im.largura - 1; x += 1) {
    if (Math.hypot(x - cx, y - cy) > raio) continue;
    maior = Math.max(maior, Math.abs(brilho(x, y) - brilho(x + 1, y)), Math.abs(brilho(x, y) - brilho(x, y + 1)));
  }
  return maior;
}

describe('vista rápida', () => {
  it('o cubo de frente sai com a face numa cor só e a caixa do objeto onde a margem manda', () => {
    const r = rasterSombreado(caixa(0, 0, 0, 100, 100, 100, 'cubo', '#3c78c8'), { vista: 'frontal', largura: 232, margem: 0.08 });
    expect(r.altura).toBe(232);
    expect(r.mmPorPx).toBeCloseTo(116 / 232, 9);
    const im = r.imagem;
    const painel = acharPainel(im);
    expect(painel).toEqual([0, 0, 232, 232]);
    const cx = caixaDoObjeto(im, painel, FUNDO_DO_PAINEL);
    for (const v of cx) expect([16, 216]).toContain(v); // 8 mm de folga = 16 px de cada lado
    expect(cx).toEqual([16, 16, 216, 216]);
    const centro = px(im, 116, 116);
    for (let y = 18; y < 214; y += 1) for (let x = 18; x < 214; x += 1) expect(igual(px(im, x, y), centro)).toBe(true);
    expect(igual(px(im, 2, 2), FUNDO_DO_PAINEL)).toBe(true);
    expect(igual(px(im, 229, 229), FUNDO_DO_PAINEL)).toBe(true);
  });

  it('a esfera alisada tem gradiente contínuo, e sem alisar tem degraus', () => {
    const faces = esfera(100);
    const lisa = rasterSombreado(faces, { vista: 'frontal', largura: 400 }).imagem;
    const chapada = rasterSombreado(faces, { vista: 'frontal', largura: 400, liso: 0 }).imagem;
    const saltoLiso = maiorSalto(lisa, 0.8); const saltoChapado = maiorSalto(chapada, 0.8);
    expect(saltoLiso).toBeLessThanOrEqual(6);
    expect(saltoChapado).toBeGreaterThan(20);
  });

  it('a aresta acima do ângulo do liso fica viva: o cubo alisado a 35 graus sai igual ao chapado', () => {
    const faces = caixa(0, 0, 0, 100, 100, 100, 'cubo', '#3c78c8');
    const a = rasterSombreado(faces, { vista: 'isometrica', largura: 200 }).imagem;
    const b = rasterSombreado(faces, { vista: 'isometrica', largura: 200, liso: 0 }).imagem;
    expect(Buffer.from(a.dados).equals(Buffer.from(b.dados))).toBe(true);
  });

  it('duas partes saem com as duas cores, e as cores se sobrepõem por nome de parte', () => {
    const faces = [...caixa(-60, 0, 0, 100, 100, 100, 'esquerda', '#c81e1e'), ...caixa(60, 0, 0, 100, 100, 100, 'direita', '#1e3cc8')];
    const r = rasterSombreado(faces, { vista: 'frontal', largura: 300 });
    const e = px(r.imagem, Math.round(r.largura * 0.3), Math.round(r.altura / 2)); const d = px(r.imagem, Math.round(r.largura * 0.7), Math.round(r.altura / 2));
    expect(e[0]).toBeGreaterThan(e[2] + 60);
    expect(d[2]).toBeGreaterThan(d[0] + 60);
    /* a cor de origem: --cores manda, depois a face, depois o material, depois o cinza */
    const neutro = {
      V: new Map([[1, [0, 0, 0]], [2, [0.1, 0, 0]], [3, [0.1, 0.1, 0]], [4, [0, 0.1, 0]]]),
      F: new Map([
        [0, { id: 0, vs: [1, 2, 3], parte: 'a', cor: '#112233', material: null }],
        [1, { id: 1, vs: [1, 3, 4], parte: 'b', cor: null, material: 'aco' }],
        [2, { id: 2, vs: [1, 2, 4], parte: 'c', cor: null, material: null }],
      ]),
      materiais: { aco: { tipo: 'liso', cor: '#445566' } },
    };
    expect(coresDasPartes(neutro, ['a', 'b', 'c'])).toEqual({
      a: { cor: '#112233', origem: 'face', faces: 1, cores: 1 }, b: { cor: '#445566', origem: 'material', faces: 1, cores: 1 }, c: { cor: CINZA, origem: 'cinza', faces: 1, cores: 1 },
    });
    expect(corDaFace(neutro.F.get(0), neutro.materiais, { a: '#ffffff' })).toEqual({ cor: '#ffffff', origem: 'cores' });
    expect(facesDaOpcao(neutro, { b: '#000000' }).map((f) => f.cor)).toEqual(['#112233', '#000000', CINZA]);
    expect(facesDaOpcao(neutro)[0].pts[1]).toEqual([100, 0, 0]);
  });

  it('--direcao gira a câmera', () => {
    const faces = caixa(0, 0, 0, 200, 100, 100, 'barra', '#808080');
    const frente = rasterSombreado(faces, { vista: 'frontal', largura: 300, margem: 0 });
    const lado = rasterSombreado(faces, { direcao: [1, 0, 0], largura: 300, margem: 0 });
    expect(frente.altura).toBe(150);
    expect(lado.altura).toBe(300);
    const viaVista = rasterSombreado(faces, { vista: 'direita', largura: 300, margem: 0 });
    expect(camera([1, 0, 0])).toEqual(camera('direita'));
    expect(Buffer.from(lado.imagem.dados).equals(Buffer.from(viaVista.imagem.dados))).toBe(true);
    const tresQuartos = rasterSombreado(faces, { direcao: [-1, 0.72, -1], largura: 300 });
    expect(tresQuartos.altura).not.toBe(frente.altura);
  });

  it('a saída é igual a cada execução', () => {
    const faces = [...esfera(80), ...caixa(0, -100, 0, 200, 20, 200, 'base', '#556070')];
    const a = rasterSombreado(faces, { direcao: [-1, 0.72, -1], largura: 240 });
    const b = rasterSombreado(faces, { direcao: [-1, 0.72, -1], largura: 240 });
    expect(Buffer.from(a.imagem.dados).equals(Buffer.from(b.imagem.dados))).toBe(true);
  });

  describe('o comando', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'vista-rapida-'));
    afterAll(() => rmSync(pasta, { recursive: true, force: true }));
    const esboco = join(pasta, 'duas.esboco.json');
    writeFileSync(esboco, JSON.stringify({
      vista: 'frontal',
      opcoes: [{ titulo: 'A', formas: [
        { id: 'corpo', tipo: 'caixa', largura: 400, altura: 200, profundidade: 100, centro: [0, 100, 0], cor: 'azul' },
        { id: 'tampa', tipo: 'caixa', largura: 200, altura: 60, profundidade: 80, centro: [0, 230, 0], cor: 'preto' },
      ] }],
    }));

    it('grava a imagem que a leitura por regiões aceita sem --painel, e diz tamanho, escala e caminho', async () => {
      const saida = join(pasta, 'v.png');
      const r = await executar([esboco, '--vista=frontal', `--saida=${saida}`, '--largura=300']);
      expect(r.stderr).toBe('');
      expect(r.codigo).toBe(0);
      expect(r.stdout).toMatch(/^300 x \d+ px, [\d.]+ mm por px\n/);
      expect(r.stdout).toContain(saida);
      const im = dePng(readFileSync(saida));
      const painel = acharPainel(im);
      expect(painel).toEqual([0, 0, im.largura, im.altura]);
      const cx = caixaDoObjeto(im, painel, FUNDO_DO_PAINEL);
      expect(cx[0]).toBeGreaterThan(0);
      expect(cx[2]).toBeLessThan(im.largura);
      const r2 = await executar([esboco, '--direcao=1,0,0', `--saida=${join(pasta, 'w.png')}`, '--largura=300', '--cores=tampa:#ff0000']);
      expect(r2.codigo).toBe(0);
      expect(r2.stdout).toMatch(/tampa #ff0000 \(cores\)/);
    });

    it('recusa argumento ruim com código 2 e esboço recusado com código 1', async () => {
      const s = `--saida=${join(pasta, 'x.png')}`;
      const casos = [
        [esboco, s], [esboco, '--vista=frontal'], [esboco, '--vista=nenhuma', s], [esboco, '--direcao=1,0', s], [esboco, '--direcao=0,0,0', s],
        [esboco, '--vista=frontal', s, '--largura=0'], [esboco, '--vista=frontal', s, '--margem=-1'], [esboco, '--vista=frontal', s, '--liso=200'],
        [esboco, '--vista=frontal', s, '--cores=corpo:vermelho'], [esboco, '--vista=frontal', s, '--opcao=2'], [esboco, '--vista=frontal', s, '--cores=roda:#000000'],
        [join(pasta, 'nao-existe.esboco.json'), '--vista=frontal', s],
      ];
      for (const argv of casos) {
        const r = await executar(argv);
        expect(r.codigo, argv.join(' ')).toBe(2);
        expect(r.stderr).toMatch(/^vista:rapida: /);
      }
      const recusado = join(pasta, 'vazio.esboco.json'); writeFileSync(recusado, '{}');
      const r = await executar([recusado, '--vista=frontal', s]);
      expect(r.codigo).toBe(1);
      expect(r.stderr).toMatch(/recusado:\n- .*opcoes/);
      expect(() => lerArgumentos(['a.json', '--vista=frontal'])).toThrow(/--saida/);
    });
  });
});
