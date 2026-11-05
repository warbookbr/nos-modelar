/* leitor.test.js — o leitor dos esboços antigos: cada `.esboco.json` versionado abre no esboço 2.0 ou é recusado com o motivo, as
 * treze opções de forma de peça abrem sem recusa, e cada um dos seis tipos que elas usam vira a operação do núcleo com a malha na
 * medida declarada. */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { lerEsboco, traduzirForma } from '../src/ler-esboco.js';
import { caixaDaMalha, receitaDaOpcao, RecusaDoEsboco } from '../src/opcao.js';

const REPO = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const versionados = execFileSync('git', ['ls-files', '*.esboco.json'], { cwd: REPO, encoding: 'utf8' }).split('\n').filter(Boolean).sort();
const DE_PECA = versionados.filter((f) => f.startsWith('procedural/pecas/'));
const ler = (f) => JSON.parse(readFileSync(join(REPO, f), 'utf8'));

/** Abre um esboço como a linha de comando: o leitor e a montagem de cada opção. */
function abrir(json) {
  const r = lerEsboco(json);
  if (r.recusas.length) return { abre: false, motivos: r.recusas.map((q) => q.motivo) };
  try {
    return { abre: true, opcoes: r.opcoes.map((o) => receitaDaOpcao(o)), conferencias: r.conferencias };
  } catch (e) {
    if (e instanceof RecusaDoEsboco) return { abre: false, motivos: [e.message] };
    throw e;
  }
}

/** As arestas com uma face só (borda aberta) de um neutro. */
function arestasDeBorda(neutro) {
  const conta = new Map();
  for (const f of neutro.F.values()) for (let k = 0; k < f.vs.length; k += 1) {
    const a = f.vs[k]; const b = f.vs[(k + 1) % f.vs.length];
    const chave = a < b ? `${a}-${b}` : `${b}-${a}`;
    conta.set(chave, (conta.get(chave) ?? 0) + 1);
  }
  return [...conta.values()].filter((n) => n === 1).length;
}

describe('os esboços guardados', () => {
  it('há treze opções de forma de peça versionadas, e todas abrem sem recusa, com a malha de cada forma na medida declarada', () => {
    expect(DE_PECA).toHaveLength(13);
    for (const f of DE_PECA) {
      const json = ler(f);
      const r = abrir(json);
      expect(r.motivos ?? [], f).toEqual([]);
      const formas = json.opcoes.reduce((s, o) => s + o.formas.length, 0);
      expect(r.conferencias, f).toHaveLength(formas);
      for (const o of r.opcoes) expect(o.facesSemParte, f).toBe(0);
    }
  });

  it('todo .esboco.json versionado abre ou é recusado com o motivo', () => {
    /* 86 em 2026-11-05, e 55 depois de o esboço antigo sair com os 30 dos testes dele e a fixture da receita planejada */
    expect(versionados.length).toBeGreaterThanOrEqual(55);
    let abriram = 0;
    for (const f of versionados) {
      const r = abrir(ler(f));
      if (r.abre) abriram += 1;
      else {
        expect(r.motivos.length, f).toBeGreaterThan(0);
        for (const m of r.motivos) expect(typeof m === 'string' && m.length > 10, `${f}: ${m}`).toBe(true);
      }
    }
    expect(abriram).toBeGreaterThanOrEqual(DE_PECA.length);
  });
});

describe('os seis tipos das opções de forma', () => {
  const tamanhoMm = (forma) => {
    const { neutro } = receitaDaOpcao({ titulo: 't', formas: [forma] });
    return { neutro, tamanho: caixaDaMalha(neutro).tamanho.map((x) => Math.round(x * 10000) / 10) };
  };

  it('caixa: cubo, chamferBox com chanfro e extrusão do retângulo de cantos redondos com raio', () => {
    expect(traduzirForma({ id: 'a', tipo: 'caixa', largura: 200, altura: 100, profundidade: 50 }).forma.op).toBe('cubo');
    const chanfro = traduzirForma({ id: 'a', tipo: 'caixa', largura: 200, altura: 100, profundidade: 50, chanfro: 5 }).forma;
    expect(chanfro.op).toBe('chamferBox');
    const raio = traduzirForma({ id: 'a', tipo: 'caixa', largura: 230, altura: 20, profundidade: 230, raio: 25, centro: [0, 0, 0] }).forma;
    expect(raio.op).toBe('extrusao');
    expect(raio.args.perfil.retangulo.cantos).toBe(25);
    expect(tamanhoMm(raio).tamanho).toEqual([230, 20, 230]);
  });

  it('cilindro no eixo, e o achatado como extrusão do círculo cortado, com a face plana no lado pedido', () => {
    const c = traduzirForma({ id: 'c', tipo: 'cilindro', diametro: 156, comprimento: 100, eixo: 'z', centro: [0, 0, 0] }).forma;
    expect(c.op).toBe('cilindro');
    expect(tamanhoMm(c).tamanho[2]).toBe(100);
    const ach = traduzirForma({ id: 'o', tipo: 'cilindro', diametro: 200, comprimento: 177, eixo: 'y', achatado: { lado: '+x', profundidade: 20 }, centro: [0, 0, 0] }).forma;
    expect(ach.op).toBe('extrusao');
    const { neutro, tamanho } = tamanhoMm(ach);
    expect(tamanho).toEqual([180, 177, 200]);
    /* a face plana fica em +x: o x máximo é 80 (100 - 20) a partir do eixo */
    const cx = caixaDaMalha(neutro);
    expect(Math.round((cx.max[0] - (cx.min[0] + 0.1)) * 1000)).toBe(80);
  });

  it('anel: extrusão do círculo com o furo, fechada, na espessura do eixo', () => {
    const a = traduzirForma({ id: 'a', tipo: 'anel', diametroExterno: 190, diametroInterno: 40, espessura: 28, eixo: 'z', centro: [0, 0, 0] }).forma;
    expect(a.op).toBe('extrusao');
    expect(a.args.furos).toHaveLength(1);
    const { neutro, tamanho } = tamanhoMm(a);
    expect(tamanho).toEqual([190, 190, 28]);
    expect(arestasDeBorda(neutro)).toBe(0);
  });

  it('cone em tronco: lathe de quatro pontos com a base no início do eixo', () => {
    const c = traduzirForma({ id: 'c', tipo: 'cone', diametro: 210, diametroTopo: 190, comprimento: 20, eixo: 'y', centro: [0, 0, 0] }).forma;
    expect(c.op).toBe('lathe');
    expect(c.args.perfil).toHaveLength(4);
    const { neutro } = tamanhoMm(c);
    const cx = caixaDaMalha(neutro);
    /* a base (d 210) embaixo e o topo (d 190) em cima */
    const raioEm = (y) => Math.max(...[...neutro.V.values()].filter((p) => Math.abs(p[1] - y) < 1e-9).map((p) => Math.hypot(p[0], p[2])));
    expect(Math.round(raioEm(cx.min[1]) * 1000)).toBe(105);
    expect(Math.round(raioEm(cx.max[1]) * 1000)).toBe(95);
  });

  it('extrusão: o perfil do plano do esboço vai ao do núcleo no eixo z, e com origem "perfil" ele fica onde foi desenhado', () => {
    const perfil = [[430, 960], [600, 890], [980, 900], [980, 1090], [560, 1065]];
    const e = traduzirForma({ id: 'f', tipo: 'extrusao', eixo: 'z', origem: 'perfil', perfil, comprimento: 10, centro: [0, 0, 5] }).forma;
    const { neutro } = receitaDaOpcao({ titulo: 't', formas: [e] });
    const cx = caixaDaMalha(neutro);
    expect(cx.min.map((x) => Math.round(x * 1000) + 0)).toEqual([430, 890, 0]);
    expect(cx.max.map((x) => Math.round(x * 1000))).toEqual([980, 1090, 10]);
    /* cada ponto do perfil é um vértice da malha, na face de frente */
    for (const [x, y] of perfil) expect([...neutro.V.values()].some((p) => Math.abs(p[0] * 1000 - x) < 1e-6 && Math.abs(p[1] * 1000 - y) < 1e-6 && Math.abs(p[2] * 1000 - 10) < 1e-6)).toBe(true);
  });

  it('loft: as seções do esboço no loft do núcleo, fechado pelos polos a 0,01 mm, e o suave com as estações da curva', () => {
    const loft = { id: 'l', tipo: 'loft', eixo: 'y', suave: true, centro: [0, 0, 0], secoes: [
      { pos: 0, forma: 'arredondado', tamanho: [156, 100], cantos: 40, segmentosPorCanto: 8 },
      { pos: 200, forma: 'arredondado', tamanho: [156, 100], cantos: 40, segmentosPorCanto: 8 },
      { pos: 330, forma: 'elipse', tamanho: [156, 156] },
      { pos: 399, forma: 'elipse', tamanho: [156, 156] },
    ] };
    const t = traduzirForma(loft).forma;
    expect(t.op).toBe('loft');
    expect(t.args.secoes.length).toBe(2 + 4 + 3 * 6);
    const { neutro, tamanho } = tamanhoMm(t);
    expect(tamanho).toEqual([156, 399, 156]);
    expect(arestasDeBorda(neutro)).toBe(0);
  });

  it('recusa com o motivo o que o núcleo não faz pelo 2.0', () => {
    const motivo = (f) => { try { traduzirForma(f); return null; } catch (e) { return e.motivo; } };
    expect(motivo({ id: 't', tipo: 'tubo', caminho: [[0, 0, 0], [1, 0, 0]], diametro: 10 })).toMatch(/friso/);
    expect(motivo({ id: 'c', tipo: 'caixa', largura: 1, altura: 1, profundidade: 1, centro: 'outra.centro' })).toMatch(/âncora/);
    expect(motivo({ id: 'l', tipo: 'loft', secoes: [{ pos: 0, tamanho: [10, 10], inclinacao: [0, 3] }, { pos: 10, tamanho: [10, 10] }] })).toMatch(/inclinada/);
    expect(motivo({ id: 'c', tipo: 'caixa', largura: 1, altura: 1, profundidade: 1, subtrai: ['x'] })).toMatch(/subtrair/);
    expect(motivo({ id: 'c', tipo: 'caixa', largura: '=a', altura: 1, profundidade: 1 })).toMatch(/expressão/);
    const r = lerEsboco({ parametros: { a: 1 }, opcoes: [{ titulo: 'x', formas: [] }] });
    expect(r.recusas[0].motivo).toMatch(/parametros/);
  });
});
