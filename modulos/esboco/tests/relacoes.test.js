/* Contrato de relações da fatia 8: `contato.juntas`, pontos-guia nomeados no `caminho` do tubo, âncora com deslocamento e
   `<instancia>.<parte>` em todo campo que aceita âncora (inclusive a forma principal do componente). */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ancorasDe, ErroDeEsboco, resolverOpcao } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { verificarContato } from '../src/contato.js';

const fixture = (nome) => JSON.parse(readFileSync(new URL(`./fixtures/${nome}`, import.meta.url), 'utf8'));
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const motivo = 'as peças se cruzam de propósito neste teste';
const esboco = (formas, contato = {}, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], contato: { usar: true, tolerancia: 1, folga: 500, ...contato }, ...extra });
const resolvidas = (formas, extra = {}) => { const e = expandirEsboco(esboco(formas, {}, extra)); return Object.fromEntries(resolverOpcao(e.opcoes[0], 'T', e.pontos).map((r) => [r.id, r])); };
const perto = (v, esperado, casas = 6) => { expect(v).toHaveLength(esperado.length); v.forEach((x, i) => expect(x).toBeCloseTo(esperado[i], casas)); };
const tipos = (r) => r.achados.map((a) => `${a.tipo}:${a.pecas.join('+')}`).sort();

describe('contato.juntas', () => {
  const tres = [caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0]), caixa('c', [20, 0, 0])];

  it('uma junta no lugar dos pares atravessa: cada par das peças vira um atravessa com o max e o motivo dela', () => {
    expect(tipos(verificarContato(esboco(tres)))).toEqual(['colisao:a+b', 'colisao:b+c']);
    const r = verificarContato(esboco(tres, { juntas: [{ pecas: ['a', 'b', 'c'], max: 15, motivo }] }));
    expect(r.resultado).toBe('aprovado');
    expect(r.atravessamentos.map((t) => `${t.a}+${t.b}:${t.penetracao_mm}/${t.max_mm}`).sort()).toEqual(['a+b:10/15', 'b+c:10/15']);
    /* o max declarado é o que reprova */
    expect(tipos(verificarContato(esboco(tres, { juntas: [{ pecas: ['a', 'b', 'c'], max: 5, motivo }] })))).toEqual(['atravessa-excedido:a+b', 'atravessa-excedido:b+c']);
  });

  it('o padrão casa os ids por instância e o par do espelho herda a junta', () => {
    const j = fixture('moto-curvas.esboco.json');
    const sem = { ...j, contato: { usar: true, juntas: [{ pecas: ['garfoE.*', 'guidao'], max: 20, motivo: 'a presilha do guidão abraça a coroa' }] } };
    const r = verificarContato(sem);
    expect(r.resultado).toBe('aprovado');
    const dele = r.atravessamentos.filter((t) => t.opcao === 'A. Naked').map((t) => `${t.a}+${t.b}`);
    expect(dele).toContain('garfoE.coroa+guidao');
    expect(dele).toContain('garfoD.coroa+guidao');
    /* as partes do mesmo garfo se atravessam dentro da junta declarada sem reprovar */
    expect(tipos(r)).toEqual([]);
  });

  it('o id de uma instância vale como a forma principal dela, e a junta pode ficar na opção', () => {
    const j = fixture('moto-curvas.esboco.json');
    const r = verificarContato({ ...j, contato: { usar: true }, opcoes: j.opcoes.map((o, i) => (i === 0 ? { ...o, contato: { juntas: [{ pecas: ['garfoE.coroa', 'guidao'], max: 20, motivo: 'a presilha do guidão abraça a coroa' }] } } : o)) });
    expect(r.achados.filter((a) => a.opcao === 'A. Naked')).toEqual([]);
    expect(r.atravessamentos.filter((t) => t.opcao === 'A. Naked').map((t) => `${t.a}+${t.b}`)).toEqual(['garfoE.coroa+guidao', 'garfoD.coroa+guidao']);
    expect(r.atravessamentos.filter((t) => t.opcao === 'B. Café racer')).toEqual([]);
    /* o id da instância sozinho é a forma principal dela (garfoE.bengala) */
    const pares = expandirEsboco({ ...j, contato: { usar: true, juntas: [{ pecas: ['garfoE', 'guidao'], max: 5, motivo: 'a presilha abraça a bengala' }] } }).opcoes[0].contato.pares;
    expect(pares.filter((p) => p.junta).map((p) => `${p.a}+${p.b}:${p.tipo}:${p.max}`)).toEqual(['garfoE.bengala+guidao:atravessa:5']);
  });

  it('um par escrito à mão prevalece sobre o da junta', () => {
    const r = verificarContato(esboco(tres.slice(0, 2), { juntas: [{ pecas: ['a', 'b'], max: 15, motivo }], pares: [{ a: 'a', b: 'b', tipo: 'atravessa', max: 4, motivo }] }));
    expect(tipos(r)).toEqual(['atravessa-excedido:a+b']);
  });

  it('recusa a junta sem motivo, sem max, com motivo curto, com id ou padrão que não existe e com uma só peça', () => {
    const tenta = (junta) => () => verificarContato(esboco(tres, { juntas: [junta] }));
    expect(tenta({ pecas: ['a', 'b'], max: 15 })).toThrow(/da contato\.juntas\[0\] \(a, b\)\) \(tipo atravessa\) precisa dizer por que a exceção existe: falta o campo "motivo"/);
    expect(tenta({ pecas: ['a', 'b'], motivo })).toThrow(/precisa de "max"/);
    expect(tenta({ pecas: ['a', 'b'], max: 5, motivo: 'curto' })).toThrow(/o "motivo" tem 5 caracteres e o mínimo é 15/);
    expect(tenta({ pecas: ['a', 'zzz'], max: 5, motivo })).toThrow(/cita "zzz", que não é uma forma visível \(ids: a, b, c\)/);
    expect(tenta({ pecas: ['x*', 'a'], max: 5, motivo })).toThrow(/o padrão "x\*" não casa com nenhuma forma visível/);
    expect(tenta({ pecas: ['a'], max: 5, motivo })).toThrow(/pelo menos duas peças distintas/);
    expect(tenta({ pecas: ['a', 'b'], max: 5, motivo, extra: 1 })).toThrow(/não tem o campo "extra" \(campos: pecas, max, motivo\)/);
    expect(tenta({ pecas: ['a', 'b'], max: -1, motivo })).toThrow(/max deve ser um número em mm/);
  });

  it('com o gate desligado a junta não cobra declaração, e o arquivo sem junta não muda', () => {
    const f = [caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0])];
    expect(verificarContato({ opcoes: [{ formas: f }], contato: { usar: false, juntas: [{ pecas: ['a', 'b'] }] } }).resultado).toBe('desligado');
    const antes = expandirEsboco(esboco(f));
    expect(antes.opcoes[0].contato).toBeUndefined();
  });
});

describe('âncora com deslocamento e pontos-guia do tubo', () => {
  it('{ ancora, mm } vale em centro, de, para e no caminho, com o deslocamento somado à âncora', () => {
    const r = resolvidas([
      caixa('a', [0, 50, 0], 40, 100, 40),
      caixa('b', [0, 0, 0], 10, 10, 10, { centro: { ancora: 'a.+y', mm: [5, 20, -3] } }),
      { id: 'h', tipo: 'cilindro', diametro: 8, de: { ancora: 'a.+y', mm: [0, 10, 0] }, para: { ancora: 'a.-y', mm: [0, -10, 0] } },
      { id: 't', tipo: 'tubo', diametro: 6, caminho: [{ ancora: 'a.-x', mm: [0, 0, 0] }, { ancora: 'a.+x', mm: [10, 5, 0] }] },
    ]);
    perto(r.b.centro, [5, 120, -3]);
    perto(r.h.centro, [0, 50, 0]);
    perto(ancorasDe(r.t).inicio, [-20, 50, 0]);
    perto(ancorasDe(r.t).fim, [30, 55, 0]);
  });

  it('o ponto nomeado também é âncora do deslocamento, e o deslocamento é opcional', () => {
    const r = resolvidas([caixa('b', [0, 0, 0], 10, 10, 10, { centro: { ancora: 'topo', mm: [1, 2, 3] } }), caixa('c', [0, 0, 0], 10, 10, 10, { centro: { ancora: 'topo' } })], { pontos: { topo: [100, 200, 300] } });
    perto(r.b.centro, [101, 202, 303]);
    perto(r.c.centro, [100, 200, 300]);
  });

  it('um ponto-guia nomeado no caminho vira a âncora <tubo>.<nome>, e o espelho o acompanha', () => {
    const formas = [
      { id: 'tubo', tipo: 'tubo', diametro: 10, caminho: [[0, 0, 0], { nome: 'joelho', ponto: [100, 0, 0] }, [100, 100, 0]] },
      caixa('marca', [0, 0, 0], 4, 4, 4, { centro: 'tubo.joelho' }),
      caixa('acima', [0, 0, 0], 4, 4, 4, { centro: { ancora: 'tubo.joelho', mm: [0, 30, 0] } }),
      { id: 'tuboE', espelha: { forma: 'tubo', eixo: 'x' } },
      caixa('marcaE', [0, 0, 0], 4, 4, 4, { centro: 'tuboE.joelho' }),
    ];
    const r = resolvidas(formas);
    perto(ancorasDe(r.tubo).joelho, [100, 0, 0]);
    perto(r.marca.centro, [100, 0, 0]);
    perto(r.acima.centro, [100, 30, 0]);
    perto(r.marcaE.centro, [-100, 0, 0]);
    /* sem esfera oculta nem desloca de folga: o tubo dobra no guia */
    expect(Object.keys(ancorasDe(r.tubo)).slice(0, 4)).toEqual(['centro', 'inicio', 'fim', 'joelho']);
  });

  it('um guia pode ser calculado a partir de outra forma e outro tubo se apoia nele', () => {
    const r = resolvidas([
      caixa('a', [0, 0, 0], 20, 20, 20),
      { id: 't1', tipo: 'tubo', diametro: 6, caminho: ['a.+x', { nome: 'p', ponto: { ancora: 'a.+x', mm: [50, 40, 0] } }] },
      { id: 't2', tipo: 'tubo', diametro: 6, caminho: ['t1.p', { ancora: 't1.p', mm: [0, 0, 60] }] },
    ]);
    perto(ancorasDe(r.t1).p, [60, 40, 0]);
    perto(ancorasDe(r.t2).fim, [60, 40, 60]);
  });

  it('recusa o nome repetido, o nome reservado e o objeto mal formado', () => {
    const tubo = (caminho) => () => resolvidas([{ id: 't', tipo: 'tubo', diametro: 6, caminho }]);
    expect(tubo([[0, 0, 0], { nome: 'p', ponto: [1, 0, 0] }, { nome: 'p', ponto: [2, 0, 0] }])).toThrow(/o ponto-guia "p" está repetido/);
    expect(tubo([[0, 0, 0], { nome: 'centro', ponto: [1, 0, 0] }])).toThrow(/o nome "centro" já é uma âncora da forma/);
    expect(tubo([[0, 0, 0], { nome: 'p' }])).toThrow(/deve ser \{ "nome": "joelho", "ponto": \[x, y, z\] \}/);
    expect(() => resolvidas([caixa('a', [0, 0, 0]), caixa('b', [0, 0, 0], 2, 2, 2, { centro: { ancora: 'a.+y', mm: [1, 2] } })])).toThrow(ErroDeEsboco);
    expect(() => resolvidas([caixa('a', [0, 0, 0]), caixa('b', [0, 0, 0], 2, 2, 2, { centro: { ancora: 'a.+y', extra: 1 } })])).toThrow(/como objeto com "ancora" deve ser/);
  });

  it('parâmetros e expressões valem dentro do deslocamento', () => {
    const r = resolvidas([caixa('a', [0, 0, 0]), caixa('b', [0, 0, 0], 2, 2, 2, { centro: { ancora: 'a.+y', mm: [0, '=2*d', 'd'] } })], { parametros: { d: 7 } });
    perto(r.b.centro, [0, 24, 7]);
  });
});

describe('<instancia>.<parte> em todo campo que aceita âncora', () => {
  const roda = { id: 'r', usa: 'roda', centro: [0, 300, 100] };

  it('a forma principal do componente (r.pneu) vale em centro, alinha.com, de/para, entre e caminho', () => {
    const r = resolvidas([
      roda,
      caixa('c1', [0, 0, 0], 10, 10, 10, { centro: 'r.pneu' }),
      caixa('c2', [0, 0, 0], 10, 10, 10, { centro: [50, 0, 0], alinha: { com: 'r.pneu', eixos: ['y', 'z'] } }),
      { id: 'h', tipo: 'cilindro', diametro: 6, de: 'r.pneu', para: 'r.cuboE' },
      caixa('c3', [0, 0, 0], 10, 10, 10, { centro: { entre: ['r.pneu', 'r.cuboD'], t: 0.5 } }),
      { id: 't', tipo: 'tubo', diametro: 4, caminho: ['r.pneu', 'r.cuboD'] },
    ]);
    perto(r.c1.centro, [0, 300, 100]);
    perto(r.c2.centro, [50, 300, 100]);
    perto(r.h.centro, ancorasDe(r['r.cuboE']).centro.map((c, i) => (c + [0, 300, 100][i]) / 2));
    perto(r.c3.centro, ancorasDe(r['r.cuboD']).centro.map((c, i) => (c + [0, 300, 100][i]) / 2));
    perto(ancorasDe(r.t).inicio, [0, 300, 100]);
  });

  it('qualquer parte vale, inclusive a de uma cópia por espelho, e a âncora do componente continua valendo', () => {
    const formas = [
      { id: 'gE', usa: 'garfo', de: [0, 0, 0], para: [0, 500, 0], desloca: [-100, 0, 0] },
      { id: 'gD', espelha: { forma: 'gE', eixo: 'x' } },
      caixa('m', [0, 0, 0], 4, 4, 4, { centro: 'gD.coroa' }),
      caixa('n', [0, 0, 0], 4, 4, 4, { centro: 'gD.topo' }),
      caixa('o', [0, 0, 0], 4, 4, 4, { centro: 'gE.bengala' }),
    ];
    const r = resolvidas(formas);
    perto(r.m.centro, r['gD.coroa'].centro);
    expect(r.m.centro[0]).toBeCloseTo(100, 6);
    perto(r.n.centro, ancorasDe(r['gD.coroa']).fim);
    perto(r.o.centro, r['gE.bengala'].centro);
  });

  it('a parte que não existe é recusada com as âncoras e as partes válidas', () => {
    expect(() => resolvidas([roda, caixa('c', [0, 0, 0], 4, 4, 4, { centro: 'r.helice' })])).toThrow(/não tem a âncora "helice" \(âncoras: eixo, .*; partes, que valem como "r\.<parte>": pneu, disco, aro, cuboE, cuboD, flangeE, flangeD\)/);
  });
});
