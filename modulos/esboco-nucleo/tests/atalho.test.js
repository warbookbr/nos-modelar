/* atalho.test.js — o atalho de posição do esboço 2.0, em mm: centro, sobre, ponta, desloca e rotacao resolvidos pela caixa da malha
 * que o núcleo gerou, as formas com todas as faces na parte, o ajudante de gaiola, os passos crus, a recusa com o motivo e a mesma
 * receita para a mesma opção. */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { neutroCanonico } from '../../../procedural/nucleo/nucleo.js';
import { caixaDaMalha, receitaDaOpcao } from '../src/opcao.js';
import { montarOpcoes } from '../../../tools/modelar/esboco-nucleo.mjs';
import { coresDasPartes } from '../../../tools/modelar/vista-rapida.mjs';

const mm = (v) => v.map((x) => Math.round(x * 100000) / 100 + 0);
const caixaDe = (neutro, parte) => { const c = caixaDaMalha(neutro, parte); return { min: mm(c.min), max: mm(c.max), centro: mm(c.centro) }; };
const recusa = (opcao) => { try { receitaDaOpcao(opcao); return null; } catch (e) { return e.message; } };
const BASE = { id: 'base', op: 'cilindro', args: { raio: 105, altura: 200, lados: 32 }, centro: [100, 100, -50] };

describe('o atalho de posição', () => {
  it('centro põe o centro da caixa da malha no ponto, e o cilindro entra inteiro na parte, com as tampas', () => {
    const { neutro, facesSemParte } = receitaDaOpcao({ titulo: 't', formas: [BASE] });
    expect(facesSemParte).toBe(0);
    expect(caixaDe(neutro, 'base').centro).toEqual([100, 100, -50]);
  });

  it('sobre apoia a base no topo da outra forma, centrada nela em x e z', () => {
    const { neutro } = receitaDaOpcao({ titulo: 't', formas: [BASE, { id: 'ombro', op: 'cubo', args: { larg: 190, alt: 210, prof: 190 }, sobre: 'base' }] });
    const b = caixaDe(neutro, 'base'); const o = caixaDe(neutro, 'ombro');
    expect(o.min[1]).toBe(b.max[1]);
    expect([o.centro[0], o.centro[2]]).toEqual([b.centro[0], b.centro[2]]);
  });

  it('ponta encosta na face do lado pedido, centrada nos outros dois eixos, e desloca soma depois', () => {
    const anel = { id: 'anel', op: 'extrusao', args: { eixo: 'x', altura: 20, perfil: { circulo: { raio: 80 } }, furos: [{ circulo: { raio: 50 } }] }, ponta: { id: 'base', lado: '+x' }, desloca: [0, 10, 0] };
    const { neutro } = receitaDaOpcao({ titulo: 't', formas: [BASE, anel] });
    const b = caixaDe(neutro, 'base'); const a = caixaDe(neutro, 'anel');
    expect(a.min[0]).toBe(b.max[0]);
    expect(a.centro[1]).toBe(b.centro[1] + 10);
    expect(a.centro[2]).toBe(b.centro[2]);
    /* a ponta em -z, na forma [id, lado] */
    const r = receitaDaOpcao({ titulo: 't', formas: [BASE, { ...anel, ponta: ['base', '-z'], desloca: undefined }] });
    expect(caixaDe(r.neutro, 'anel').max[2]).toBe(caixaDe(r.neutro, 'base').min[2]);
  });

  it('rotacao gira em torno do centro da caixa antes de posicionar, e a referência pode vir depois na lista', () => {
    const barra = { id: 'barra', op: 'cubo', args: { larg: 300, alt: 20, prof: 40 }, rotacao: [0, 0, 90], sobre: 'base' };
    const { neutro } = receitaDaOpcao({ titulo: 't', formas: [barra, BASE] });
    const c = caixaDe(neutro, 'barra');
    expect([c.max[0] - c.min[0], c.max[1] - c.min[1], c.max[2] - c.min[2]].map((x) => Math.round(x))).toEqual([20, 300, 40]);
    expect(c.min[1]).toBe(caixaDe(neutro, 'base').max[1]);
  });

  it('o ajudante de gaiola vira subdivisão com os pontos no TOPO, posicionada pela caixa da malha subdividida', () => {
    const lacos = [0, 50, 100].map((em) => ({ em, trechos: { baixo: [[0, 0], [0, 40]], frente: [[0, 40], [30, 40]], cima: [[30, 40], [30, 0]], tras: [[30, 0], [0, 0]] } }));
    const barra = { id: 'barra', ajudante: 'gaiolaPorLacos', args: { nome: 'barra', eixo: 'x', tampa: { de: 'baixo', ate: 'cima' }, trechos: [{ nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos: 3 }, { nome: 'cima', pontos: 2 }, { nome: 'tras', pontos: 3 }], lacos }, subdivisao: { niveis: 2 }, centro: [0, 500, 0] };
    const { receita, neutro, facesSemParte } = receitaDaOpcao({ titulo: 't', formas: [barra] });
    expect(receita.PASSOS[0][0]).toBe('subdivisao');
    expect(Object.keys(receita.TOPO).length).toBeGreaterThan(0);
    expect(facesSemParte).toBe(0);
    expect(caixaDe(neutro, 'barra').centro).toEqual([0, 500, 0]);
  });

  it('passos crus do núcleo vêm antes das formas, e a forma de passo cru é citada pelo nome da parte que ela tem', () => {
    const opcao = { titulo: 't', passos: [['cubo', { origemId: 1, larg: 100, alt: 100, prof: 100 }], ['parte', { nome: 'cru', sel: { origem: { op: 'cubo', id: 1 } } }]], formas: [{ id: 'x', op: 'cubo', args: { lado: 50 }, centro: [500, 0, 0] }] };
    const { neutro, partes } = receitaDaOpcao(opcao);
    expect(partes.sort()).toEqual(['cru', 'x']);
    expect(caixaDe(neutro, 'cru').min[1]).toBe(0);
  });

  it('a mesma opção dá a mesma receita e a mesma malha', () => {
    const opcao = { titulo: 't', formas: [BASE, { id: 'ombro', op: 'chamferBox', args: { larg: 190, alt: 210, prof: 190, chanfro: 10 }, sobre: 'base', rotacao: { eixo: 'y', graus: 30 } }] };
    const a = receitaDaOpcao(opcao); const b = receitaDaOpcao(structuredClone(opcao));
    expect(JSON.stringify(a.receita)).toBe(JSON.stringify(b.receita));
    const hash = (n) => createHash('sha256').update(JSON.stringify(neutroCanonico(n))).digest('hex');
    expect(hash(a.neutro)).toBe(hash(b.neutro));
  });

  it('recusa com o motivo: forma citada que não existe, ciclo, dois modos, campo desconhecido e o gerador que o núcleo recusa', () => {
    expect(recusa({ titulo: 't', formas: [{ id: 'a', op: 'cubo', args: { lado: 100 }, sobre: 'nada' }] })).toMatch(/"nada", que não existe/);
    expect(recusa({ titulo: 't', formas: [{ id: 'a', op: 'cubo', args: { lado: 100 }, sobre: 'b' }, { id: 'b', op: 'cubo', args: { lado: 100 }, sobre: 'a' }] })).toMatch(/circular/);
    expect(recusa({ titulo: 't', formas: [BASE, { id: 'a', op: 'cubo', args: { lado: 100 }, sobre: 'base', centro: [0, 0, 0] }] })).toMatch(/só um entre/);
    expect(recusa({ titulo: 't', formas: [{ id: 'a', op: 'cubo', args: { lado: 100 }, encaixa: {} }] })).toMatch(/campo "encaixa"/);
    expect(recusa({ titulo: 't', formas: [{ id: 'a', op: 'extrusao', args: { perfil: [[0, 0], [100, 0]] } }] })).toMatch(/o núcleo recusou/);
    expect(recusa({ titulo: 't', formas: [{ id: 'a', ajudante: 'gaiolaQueNaoExiste' }] })).toMatch(/ajudante "gaiolaQueNaoExiste" não existe/);
  });
});

describe('a cor da forma', () => {
  it('vira um material liso da forma, e a cor fora do formato é recusada', () => {
    const { receita, neutro } = receitaDaOpcao({ formas: [{ id: 'corpo', op: 'cubo', args: { lado: 100 }, cor: '#141416' }, { id: 'tampa', op: 'cubo', args: { lado: 50 }, sobre: 'corpo' }] });
    expect(receita.MATERIAIS).toEqual({ 'cor-corpo': { cor: '#141416' } });
    const doCorpo = [...neutro.F.values()].filter((f) => f.parte === 'corpo');
    expect(doCorpo.length).toBeGreaterThan(0);
    expect(doCorpo.every((f) => f.material === 'cor-corpo')).toBe(true);
    expect([...neutro.F.values()].filter((f) => f.parte === 'tampa').every((f) => !f.material)).toBe(true);
    expect(receitaDaOpcao({ formas: [{ id: 'corpo', op: 'cubo', args: { lado: 100 }, cor: 'preto' }] }).receita.MATERIAIS).toEqual({ 'cor-corpo': { cor: '#1c1d20' } });
    expect(() => receitaDaOpcao({ formas: [{ id: 'corpo', op: 'cubo', args: { lado: 100 }, cor: 'grafite' }] })).toThrow(/'cor' precisa ser '#rrggbb' ou um de cinza/);
  });

  it('chega ao que o esboço exporta: o painel, a receita e a cor que a imagem desenha', () => {
    const esboco = { opcoes: [{ titulo: 'a', formas: [{ id: 'corpo', op: 'cubo', args: { lado: 100 }, cor: '#141416' }, { id: 'tampa', op: 'cubo', args: { lado: 50 }, sobre: 'corpo', cor: 'cinza' }, { id: 'miolo', op: 'cubo', args: { lado: 20 }, sobre: 'tampa' }] }] };
    const { paineis, recusas } = montarOpcoes(esboco, { relato: false });
    expect(recusas).toEqual([]);
    const [painel] = paineis;
    expect(painel.formas.map((f) => [f.id, f.cor])).toEqual([['corpo', '#141416'], ['tampa', 'cinza'], ['miolo', null]]);
    expect(Object.keys(painel.receita.MATERIAIS)).toEqual(['cor-corpo', 'cor-tampa']);
    const cores = coresDasPartes(painel.neutro, painel.partes);
    expect(cores.corpo).toMatchObject({ cor: '#141416', origem: 'material' });
    expect(cores.tampa.origem).toBe('material');
    expect(cores.tampa.cor).not.toBe(cores.corpo.cor);
    expect(cores.miolo.origem).toBe('cinza');
  });
});
