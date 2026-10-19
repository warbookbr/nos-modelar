/* O tradutor da receita do externo: nove receitas reais (as do repositório projeto externo, já expandidas), sete sem giro e duas com peças giradas.
   Cada uma vira esboço que o módulo valida e descreve; a caixa envolvente de cada peça traduzida bate com a da receita (com o chanfro como o
   esboço o monta, 0,5 mm), e a volta devolve a mesma caixa envolvente e o mesmo volume. O bloco de materiais volta igual ao que a receita tinha. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { descreverEsboco } from '../../modulos/esboco/src/descrever.js';
import { caixaDoEsboco, chanfroDoEsboco, envolventeDaPeca, esbocoParaReceita, matrizDeEuler, materiaisParaReceita, receitaParaEsboco, volumeDaPeca } from './receita-externa.mjs';

const PASTA = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures', 'receita-externa');
const receitas = readdirSync(PASTA).filter((f) => f.endsWith('.receita.json')).map((f) => [f.replace('.receita.json', ''), JSON.parse(readFileSync(join(PASTA, f), 'utf8'))]);
const TOLERANCIA_MM = 0.5;

const difMm = (a, b) => Math.max(...[0, 1, 2].flatMap((k) => [Math.abs(a.min[k] - b.min[k]), Math.abs(a.max[k] - b.max[k])])) * 1000;

/* a caixa envolvente que o esboço lê de cada forma, no quadro da receita, pelo nome da peça (`rotulo`) */
function envolventesLidas(esboco) {
  const lido = descreverEsboco(esboco).opcoes[0].formas;
  const porId = new Map(lido.map((f) => [f.id, f]));
  return new Map(esboco.opcoes[0].formas.map((f) => [f.rotulo, caixaDoEsboco(porId.get(f.id).caixa)]));
}

/* a receita sintética de uma peça (a mesma forma que a receita expandida tem: material e veio, o chanfro zero) */
const receitaDe = (...pecas) => ({ versao: 1, id: 'teste', material: 'madeira', pecas: pecas.map((p) => ({ material: 'madeira', chanfro: 0, veio: 'x', ...p })) });

describe('receita do externo para esboço', () => {
  it('tem as nove receitas de prova, duas delas com peças giradas', () => {
    expect(receitas).toHaveLength(9);
    expect(receitas.filter(([, r]) => r.pecas.some((p) => p.rot)).map(([n]) => n)).toEqual(['cadeira_moderna_azul_escura', 'pia_branca_pedestal']);
  });

  it.each(receitas)('%s: cada peça vira forma ou sai com motivo, e o esboço é válido', (_nome, receita) => {
    const { esboco, recusas } = receitaParaEsboco(receita);
    expect(esboco.opcoes[0].formas.length + recusas.length).toBe(receita.pecas.length);
    expect(recusas.every((r) => typeof r.motivo === 'string' && !r.motivo.startsWith('rot'))).toBe(true);
    expect(() => descreverEsboco(esboco)).not.toThrow();
  });

  it.each(receitas)('%s: o bloco de materiais volta igual ao da receita', (_nome, receita) => {
    const { esboco } = receitaParaEsboco(receita);
    const volta = materiaisParaReceita(JSON.parse(JSON.stringify(esboco)));
    expect(volta.cores).toEqual(receita.cores ?? {});
    expect(volta.realista.materiais).toEqual(receita.realista?.materiais ?? {});
    for (const p of receita.pecas) if (volta.materialPorPeca[p.nome] !== undefined) expect(volta.materialPorPeca[p.nome]).toBe(p.material ?? receita.material);
  });

  it.each(receitas)('%s: a caixa envolvente lida do esboço bate com a da receita, peça a peça (também as giradas)', (_nome, receita) => {
    const { esboco } = receitaParaEsboco(receita);
    const lidas = envolventesLidas(esboco);
    for (const p of receita.pecas) {
      const l = lidas.get(p.nome);
      if (l) expect(difMm(l, envolventeDaPeca(p, { chanfroDoEsboco: true }))).toBeLessThanOrEqual(TOLERANCIA_MM);
    }
  });

  it.each(receitas)('%s: a volta devolve a mesma caixa envolvente e o mesmo volume de cada peça traduzida', (_nome, receita) => {
    const { esboco } = receitaParaEsboco(receita);
    const { receita: volta, recusas } = esbocoParaReceita(esboco);
    expect(recusas).toEqual([]);
    const porNome = new Map(volta.pecas.map((p) => [p.nome, p]));
    const traduzidas = receita.pecas.filter((p) => porNome.has(p.nome));
    expect(traduzidas.length).toBe(volta.pecas.length);
    for (const p of traduzidas) {
      const q = porNome.get(p.nome);
      expect(difMm(envolventeDaPeca(p, { chanfroDoEsboco: true }), envolventeDaPeca(q, { chanfroDoEsboco: true }))).toBeLessThanOrEqual(TOLERANCIA_MM);
      const va = volumeDaPeca(p, { chanfroDoEsboco: true });
      expect(Math.abs(va - volumeDaPeca(q)) / va).toBeLessThanOrEqual(1e-6);
    }
  });

  it('a caixa com chanfro cabe na caixa dos 8 cantos (o chanfro só corta a envolvente)', () => {
    for (const [, receita] of receitas) {
      const lidas = envolventesLidas(receitaParaEsboco(receita).esboco);
      for (const p of receita.pecas.filter((q) => q.forma === 'caixa' && chanfroDoEsboco(q) > 0)) {
        const l = lidas.get(p.nome); const canto = envolventeDaPeca(p);
        for (let k = 0; k < 3; k++) {
          expect(l.min[k]).toBeGreaterThanOrEqual(canto.min[k] - TOLERANCIA_MM / 1000);
          expect(l.max[k]).toBeLessThanOrEqual(canto.max[k] + TOLERANCIA_MM / 1000);
        }
      }
    }
  });

  it('a convenção de ângulos do esboço: a caixa girada 90° em x leva a altura a z; em z, a largura a y', () => {
    const caixa = (rotacao) => descreverEsboco({ materiais: {}, opcoes: [{ formas: [{ id: 'a', tipo: 'caixa', largura: 100, altura: 200, profundidade: 50, centro: [0, 0, 0], rotacao }] }] }).opcoes[0].formas[0].caixa;
    expect(caixa([90, 0, 0])).toEqual({ x: [-50, 50], y: [-25, 25], z: [-100, 100] });
    expect(caixa([0, 0, 90])).toEqual({ x: [-100, 100], y: [-50, 50], z: [-25, 25] });
  });

  it('a peça com corte, curva ou afinar sai com motivo, e o perfil de extrusão que se cruza também', () => {
    const { recusas } = receitaParaEsboco(receitaDe(
      { nome: 'a', forma: 'caixa', min: [0, 0, 0], max: [1, 1, 1], afinar: { quanto: 0.1, lados: ['+x'] } },
      { nome: 'b', forma: 'prisma', eixo: 'y', de: 0, ate: 1, perfil: [[0, 0], [1, 1], [1, 0], [0, 1]] },
    ));
    expect(recusas).toEqual([
      { peca: 'a', motivo: 'cortes, curva ou afinar' },
      { peca: 'b', motivo: 'perfil da extrusão com arestas que se cruzam (na receita de origem)' },
    ]);
  });

  it('o caminho de volta recusa com o motivo a forma que não tem coordenada para a receita', () => {
    const { recusas } = esbocoParaReceita({ opcoes: [{ formas: [
      { id: 'a', tipo: 'esfera', diametro: 100, centro: [0, 0, 0] },
      { id: 'b', tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, sobre: 'a' },
      { id: 'c', tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, centro: [0, 0, 0], raio: 2 },
    ] }] });
    expect(recusas).toEqual([
      { peca: 'a', motivo: 'forma esfera sem caminho de volta' },
      { peca: 'b', motivo: '"sobre": posição por relação, sem coordenada para a volta' },
      { peca: 'c', motivo: 'caixa com raio de canto ou furo, sem volta' },
    ]);
  });

  describe('casos sintéticos, para os ramos que as nove receitas não atingem', () => {
    it.each([
      ['cilindro de eixo y com 10 lados e giro em z (a fase do polígono muda)', { nome: 'p', forma: 'cilindro', centro: [0.1, 0.2, 0.3], raio: 0.05, altura: 0.2, eixo: 'y', segmentos: 10, rot: [0, 0, 30] }],
      ['cilindro de eixo x com 16 lados e giro em x e y', { nome: 'p', forma: 'cilindro', centro: [0, 0, 0], raio: 0.04, altura: 0.3, eixo: 'x', segmentos: 16, rot: [20, -35, 0] }],
      ['caixa girada em três eixos com chanfro', { nome: 'p', forma: 'caixa', min: [-0.2, -0.1, 0], max: [0.2, 0.1, 0.5], chanfro: 0.02, rot: [30, 20, 10] }],
      ['extrusão de eixo y girada em z', { nome: 'p', forma: 'prisma', eixo: 'y', de: -0.1, ate: 0.2, perfil: [[0, 0], [0.3, 0], [0.3, 0.1], [0.1, 0.2], [0, 0.1]], rot: [0, 0, 60] }],
      ['extrusão de eixo x girada em y', { nome: 'p', forma: 'prisma', eixo: 'x', de: 0, ate: 0.4, perfil: [[-0.1, 0], [0.1, 0], [0.1, 0.3], [-0.1, 0.3]], rot: [0, 45, 0] }],
    ])('%s: a caixa envolvente bate e a volta devolve a mesma caixa e o mesmo volume', (_nome, peca) => {
      const r = receitaDe(peca);
      const { esboco, recusas } = receitaParaEsboco(r);
      expect(recusas).toEqual([]);
      const d = difMm(envolventesLidas(esboco).get('p'), envolventeDaPeca(peca, { chanfroDoEsboco: true }));
      expect(d).toBeLessThanOrEqual(TOLERANCIA_MM);
      const { receita: volta } = esbocoParaReceita(esboco);
      const q = volta.pecas[0];
      expect(difMm(envolventeDaPeca(peca, { chanfroDoEsboco: true }), envolventeDaPeca(q, { chanfroDoEsboco: true }))).toBeLessThanOrEqual(TOLERANCIA_MM);
      expect(Math.abs(volumeDaPeca(peca, { chanfroDoEsboco: true }) - volumeDaPeca(q)) / volumeDaPeca(peca, { chanfroDoEsboco: true })).toBeLessThanOrEqual(1e-6);
    });

    it.each([
      ['base com raio 40 e ponta em cima de raio zero (eixo y: o início do esboço cai na ponta de cima)', { raio: 0.04, raio_topo: 0, eixo: 'y' }],
      ['base de raio zero embaixo, ponta de raio 40 (eixo y: gira 180° para o início cair na ponta de raio positivo)', { raio: 0, raio_topo: 0.04, eixo: 'y' }],
      ['cone de eixo z com tronco (40 e 15)', { raio: 0.04, raio_topo: 0.015, eixo: 'z' }],
      ['tronco de eixo x com giro', { raio: 0.04, raio_topo: 0.015, eixo: 'x', rot: [0, 30, 0] }],
    ])('cone: %s', (_nome, c) => {
      const peca = { nome: 'p', forma: 'cilindro', centro: [0.1, -0.2, 0.3], altura: 0.2, segmentos: 128, ...c };
      const { esboco, recusas } = receitaParaEsboco(receitaDe(peca));
      expect(recusas).toEqual([]);
      const forma = esboco.opcoes[0].formas[0];
      expect(forma.tipo).toBe('cone');
      const lido = descreverEsboco(esboco).opcoes[0].formas[0];
      /* o início do cone do esboço é a ponta cujo raio é o `diametro`. A base da receita fica em centro e a ponta em centro + altura; as duas
         giram com a peça em torno do meio, e o esboço as lê em milímetro no quadro dele */
      const u = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[c.eixo];
      const meio = peca.centro.map((v, i) => v + (peca.altura / 2) * u[i]);
      const R = c.rot ? matrizDeEuler(c.rot) : [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      const noQuadroDaPeca = (ponto) => { const d = ponto.map((v, i) => v - meio[i]); return R.map((row) => row[0] * d[0] + row[1] * d[1] + row[2] * d[2] + 0).map((v, i) => v + meio[i]); };
      const noEsboco = (ponto) => { const q = noQuadroDaPeca(ponto); return [q[0] * 1000, q[2] * 1000, -q[1] * 1000]; };
      const raioDoInicio = forma.diametro / 2000;
      const fim = Math.abs(raioDoInicio - c.raio) < 1e-9 ? peca.centro : peca.centro.map((v, i) => v + peca.altura * u[i]);
      const esperado = noEsboco(fim);
      for (let k = 0; k < 3; k++) expect(Math.abs(lido.ancoras.inicio[k] - esperado[k])).toBeLessThanOrEqual(TOLERANCIA_MM);
      const { receita: volta } = esbocoParaReceita(esboco);
      const q = volta.pecas[0];
      expect(difMm(envolventeDaPeca({ ...peca, chanfro: 0 }), envolventeDaPeca(q))).toBeLessThanOrEqual(TOLERANCIA_MM);
      expect(Math.abs(volumeDaPeca(q) - volumeDaPeca(peca)) / volumeDaPeca(peca)).toBeLessThanOrEqual(1e-6);
      expect(meio).toBeDefined();
    });
  });
});
