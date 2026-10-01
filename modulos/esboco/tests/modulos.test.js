/* Bloco `modulos` do esboço: a IA define no próprio JSON um módulo reutilizável (parâmetros, formas e âncoras) e o usa por
   `usa`, pelo mesmo caminho de expansão dos componentes de arquivo. */
import { describe, expect, it } from 'vitest';
import { ancorasDe, ErroDeEsboco, resolverOpcao } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { verificarContato } from '../src/contato.js';
import { ajustarEsboco, aplicarDeslocamento } from '../src/ajustar.js';

const perto = (v, esperado, casas = 6) => { expect(v).toHaveLength(esperado.length); v.forEach((x, i) => expect(x).toBeCloseTo(esperado[i], casas)); };
const extensao = (r) => r.max.map((v, i) => v - r.min[i]);

const suporte = {
  parametros: { larg: 40, alt: 10 },
  formas: [
    { id: 'base', tipo: 'caixa', largura: 'larg', altura: 'alt', profundidade: 20, centro: '@centro', sobre: '@sobre', desloca: '@desloca', cor: 'cinza' },
    { id: 'pino', tipo: 'cilindro', diametro: '=alt', comprimento: '=larg*2', eixo: 'y', sobre: 'base', cor: 'azul' },
  ],
  ancoras: { topo: 'pino.+y', meio: 'base.centro' },
};
const esboco = (formas, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], contato: { usar: true }, modulos: { suporte }, ...extra });
const resolvidas = (formas, extra = {}) => Object.fromEntries(resolverOpcao(expandirEsboco(esboco(formas, extra)).opcoes[0], 'T').map((r) => [r.id, r]));
const recusa = (e, trecho) => {
  expect(() => expandirEsboco(e)).toThrow(ErroDeEsboco);
  expect(() => expandirEsboco(e)).toThrow(trecho);
};

describe('módulo declarado no esboço', () => {
  it('expande com ids prefixados e parâmetros no escopo do módulo, sem deixar o bloco `modulos` no esboço expandido', () => {
    const e = expandirEsboco(esboco([{ id: 's', usa: 'suporte', centro: [0, 5, 0] }]));
    expect(e.modulos).toBeUndefined();
    expect(e.opcoes[0].formas.map((f) => f.id)).toEqual(['s.base', 's.pino']);
    expect(e.opcoes[0].formas.every((f) => f.daInstancia.id === 's')).toBe(true);
    const r = resolvidas([{ id: 's', usa: 'suporte', centro: [0, 5, 0], parametros: { larg: 60 } }]);
    expect(extensao(r['s.base'])).toEqual([60, 10, 20]);
    expect(extensao(r['s.pino'])).toEqual([10, 120, 10]);
  });

  it('a instância sobrepõe parâmetros com expressão do esboço e as âncoras posicionam outra instância', () => {
    const r = resolvidas([
      { id: 'a', usa: 'suporte', centro: [0, 5, 0], parametros: { larg: '=2*k' } },
      { id: 'b', usa: 'suporte', centro: 'a.topo', parametros: { alt: 6 } },
    ], { parametros: { k: 30 } });
    expect(extensao(r['a.base'])[0]).toBe(60);
    perto(r['b.base'].centro, ancorasDe(r['a.pino'])['+y']);
    expect(extensao(r['b.pino'])[0]).toBe(6);
  });

  it('o espelho e a unidade da instância valem como nos componentes de arquivo', () => {
    const formas = [
      { id: 'sE', usa: 'suporte', centro: [-100, 5, 0], unidade: 'apoios' },
      { id: 'sD', espelha: { forma: 'sE', eixo: 'x' } },
    ];
    const e = expandirEsboco(esboco(formas)).opcoes[0];
    expect(e.formas.map((f) => f.id)).toEqual(['sE.base', 'sE.pino', 'sD.base', 'sD.pino']);
    expect(e.formas.every((f) => f.unidade === 'apoios')).toBe(true);
    const r = resolvidas(formas);
    expect(r['sD.base'].centro[0]).toBeCloseTo(100, 6);
  });

  it('as formas do módulo entram no gate com os pares do módulo, e o módulo montado passa', () => {
    const e = esboco([{ id: 's', usa: 'suporte', centro: [0, 5, 0] }]);
    e.modulos.suporte = { ...suporte, pares: [{ a: 'base', b: 'pino', tipo: 'encosta' }] };
    const g = verificarContato(e);
    expect(g.achados).toEqual([]);
    expect(expandirEsboco(e).opcoes[0].contato.pares.map((p) => `${p.a}|${p.b}`)).toEqual(['s.base|s.pino']);
  });

  it('um arranja dentro do módulo copia a forma do módulo com o prefixo da instância', () => {
    const e = esboco([{ id: 's', usa: 'anel' }]);
    e.modulos = { anel: {
      parametros: { n: 4, raio: 50 },
      formas: [
        { id: 'miolo', tipo: 'cilindro', diametro: 20, comprimento: 10, eixo: 'z', centro: [0, 0, 0] },
        { id: 'bola', tipo: 'esfera', diametro: 10, centro: ['=raio', 0, 0] },
        { arranja: { forma: 'bola', modo: 'radial', total: 'n', eixo: 'z', centro: 'miolo.centro' } },
      ],
    } };
    const r = resolvidas([{ id: 's', usa: 'anel', parametros: { n: 6 } }], { modulos: e.modulos });
    expect(Object.keys(r).filter((id) => id.startsWith('s.bola'))).toEqual(['s.bola', 's.bola1', 's.bola2', 's.bola3', 's.bola4', 's.bola5']);
    perto(r['s.bola3'].centro, [-50, 0, 0], 4);
  });

  it('o --ajustar resolve o módulo do JSON: aprova o esboço e move a parte principal pela instância', () => {
    const e = esboco([
      { id: 'chao', tipo: 'caixa', largura: 200, altura: 10, profundidade: 100, centro: [0, 5, 0] },
      { id: 's', usa: 'suporte', centro: [0, 40, 0] },
    ]);
    e.modulos.suporte = { ...suporte, entradas: { centro: null, sobre: null, desloca: null }, pares: [{ a: 'base', b: 'pino', tipo: 'encosta' }] };
    expect(verificarContato(e).resultado).not.toBe('aprovado');
    const r = ajustarEsboco(e);
    expect(r.parou).toBe('aprovou');
    expect(r.aprovado).toBe(true);
    const mexido = JSON.parse(JSON.stringify(e));
    expect(aplicarDeslocamento(mexido, 0, 's.base', [0, -24, 0])).toMatchObject({ campo: 'centro', depois: [0, 16, 0] });
    expect(aplicarDeslocamento(mexido, 0, 's.pino', [0, -24, 0])).toBeNull();
  });
});

describe('erros do bloco modulos', () => {
  it('o nome de um componente de arquivo só vale com "substitui": true, e o erro diz como', () => {
    const e = esboco([{ id: 'r', usa: 'roda', centro: [0, 0, 0] }]);
    e.modulos = { roda: { formas: [{ id: 'x', tipo: 'caixa', largura: 1, altura: 1, profundidade: 1, centro: '@centro' }] } };
    recusa(e, /o módulo "roda" tem o nome de um componente de arquivo; declare "substitui": true no módulo para usá-lo no lugar do componente, ou renomeie o módulo/);
  });

  it('com "substitui": true o módulo do JSON vence o componente de arquivo', () => {
    const e = esboco([{ id: 'r', usa: 'roda', centro: [0, 0, 0] }]);
    e.modulos = { roda: { substitui: true, formas: [{ id: 'x', tipo: 'caixa', largura: 7, altura: 1, profundidade: 1, centro: '@centro' }] } };
    expect(expandirEsboco(e).opcoes[0].formas.map((f) => f.id)).toEqual(['r.x']);
  });

  it('"substitui" sem componente de arquivo de mesmo nome é recusado', () => {
    const e = esboco([{ id: 'r', usa: 'novo', centro: [0, 0, 0] }]);
    e.modulos = { novo: { substitui: true, formas: [{ id: 'x', tipo: 'caixa', largura: 7, altura: 1, profundidade: 1, centro: '@centro' }] } };
    recusa(e, /o módulo "novo" declara "substitui": true, mas não existe componente de arquivo com esse nome/);
  });

  it('ciclo entre módulos diz o caminho', () => {
    const e = esboco([{ id: 'x', usa: 'a' }]);
    e.modulos = {
      a: { formas: [{ id: 'm', usa: 'b' }] },
      b: { formas: [{ id: 'n', usa: 'a' }] },
    };
    recusa(e, /ciclo de módulos: a -> b -> a/);
    e.modulos = { a: { formas: [{ id: 'm', usa: 'a' }] } };
    recusa(e, /ciclo de módulos: a -> a/);
  });

  it('módulo dentro de módulo sem ciclo é recusado com a razão, e não ignorado', () => {
    const e = esboco([{ id: 'x', usa: 'a' }]);
    e.modulos = { a: { formas: [{ id: 'm', usa: 'b' }] }, b: { formas: [{ id: 'n', tipo: 'esfera', diametro: 5, centro: [0, 0, 0] }] } };
    recusa(e, /o módulo "a" usa o módulo "b" dentro de si, e isso ainda não é suportado/);
  });

  it('usa de nome que não existe lista componentes e módulos', () => {
    recusa(esboco([{ id: 'x', usa: 'suporta' }]), /o componente "suporta" não existe.*módulos: suporte/);
  });

  it('módulo mal formado diz qual e o quê', () => {
    recusa(esboco([], { modulos: { 'a.b': { formas: [] } } }), /o módulo "a\.b": o nome não pode ter ponto/);
    recusa(esboco([], { modulos: { m: { formas: [] } } }), /o módulo "m": "formas" deve ser uma lista não vazia/);
    recusa(esboco([], { modulos: { m: { formas: [{ id: 'a', tipo: 'caixa', largura: 1, altura: 1, profundidade: 1, centro: [0, 0, 0] }], ancoras: { p: 'z.centro' } } } }), /o módulo "m": a âncora "p" aponta para "z\.centro", e "z" não é forma do módulo/);
    recusa(esboco([], { modulos: { m: { formas: [{ id: 'a', tipo: 'caixa', larg: 1 }] } } }), /módulo "m", forma "a": o campo "larg" não existe em caixa/);
    recusa(esboco([], { modulos: { m: { formas: [{ id: 'a', tipo: 'caixa', largura: 1, altura: 1, profundidade: 1, centro: [0, 0, 0] }], coisa: 1 } } }), /o módulo "m": o campo "coisa" não existe/);
  });
});
