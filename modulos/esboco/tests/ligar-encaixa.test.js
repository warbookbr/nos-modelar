/* `ligar` (forma criada entre duas âncoras, atrelada a elas) e `encaixa` (a peça posicionada pela âncora dela), com as
   mensagens de erro de âncora inexistente e a integração com o conserto e o `--ajustar`. */
import { describe, expect, it } from 'vitest';
import { ancorasDe, ErroDeEsboco, resolverOpcao } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { verificarContato } from '../src/contato.js';
import { aplicarDeslocamento, ajustarEsboco } from '../src/ajustar.js';

const perto = (v, esperado, casas = 4) => { expect(v).toHaveLength(esperado.length); v.forEach((x, i) => expect(x).toBeCloseTo(esperado[i], casas)); };
const extensao = (r) => r.max.map((v, i) => v - r.min[i]);
const caixa = (id, centro, extra = {}) => ({ id, tipo: 'caixa', largura: 20, altura: 20, profundidade: 20, centro, ...extra });
const esboco = (formas, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], contato: { usar: true }, ...extra });
const resolvidas = (formas, extra = {}) => Object.fromEntries(resolverOpcao(expandirEsboco(esboco(formas, extra)).opcoes[0], 'T').map((r) => [r.id, r]));
const mensagem = (formas, extra = {}) => {
  try { resolverOpcao(expandirEsboco(esboco(formas, extra)).opcoes[0], 'T'); } catch (e) { return e.message; }
  return null;
};

describe('ligar', () => {
  const A = caixa('A', [0, 0, 0]);
  const B = caixa('B', [100, 60, 0]);

  it('a haste vai da âncora de A à de B, com o diâmetro pedido e o comprimento da distância', () => {
    const r = resolvidas([A, B, { id: 'h', ligar: { de: 'A.+x', para: 'B.-x', tipo: 'haste', diametro: 6 } }]);
    perto(ancorasDe(r.h).inicio, [10, 0, 0]);
    perto(ancorasDe(r.h).fim, [90, 60, 0]);
    expect(r.h.forma.tipo).toBe('cilindro');
    expect(r.h.forma.diametro).toBe(6);
    expect(r.h.prisma.comprimento).toBeCloseTo(Math.hypot(80, 60), 6);
    expect(r.h.forma.daLigacao).toEqual({ de: 'A.+x', para: 'B.-x', tipo: 'haste' });
  });

  it('o tipo padrão é haste, e o tubo e a cinta seguem as mesmas duas âncoras', () => {
    const r = resolvidas([A, B,
      { id: 'h', ligar: { de: 'A.+x', para: 'B.-x', diametro: 6 } },
      { id: 't', ligar: { de: 'A.+y', para: 'B.-y', tipo: 'tubo', diametro: 5 }, cor: 'azul' },
      { id: 'c', ligar: { de: 'A.centro', para: 'B.centro', tipo: 'cinta', largura: 24, espessura: 3 } },
    ]);
    expect(r.h.forma.tipo).toBe('cilindro');
    perto(ancorasDe(r.t).inicio, [0, 10, 0]);
    perto(ancorasDe(r.t).fim, [100, 50, 0]);
    expect(r.t.forma.cor).toBe('azul');
    expect(r.c.forma).toMatchObject({ tipo: 'caixa', largura: 24, profundidade: 3 });
    expect(r.c.prisma.comprimento ?? r.c.forma.altura).toBeCloseTo(Math.hypot(100, 60), 6);
    perto(r.c.centro, [50, 30, 0]);
  });

  it('a ligação recalcula quando um parâmetro muda uma das âncoras', () => {
    const formas = [A, caixa('B', ['=x', 60, 0]), { id: 'h', ligar: { de: 'A.centro', para: 'B.centro', diametro: '=d' } }];
    const curto = resolvidas(formas, { parametros: { x: 100, d: 4 } });
    const longo = resolvidas(formas, { parametros: { x: 300, d: 9 } });
    expect(curto.h.prisma.comprimento).toBeCloseTo(Math.hypot(100, 60), 6);
    expect(longo.h.prisma.comprimento).toBeCloseTo(Math.hypot(300, 60), 6);
    perto(ancorasDe(longo.h).fim, [300, 60, 0]);
    expect(longo.h.forma.diametro).toBe(9);
  });

  it('liga âncoras de instâncias e de módulos, e uma ligação dentro de um módulo une as âncoras dele', () => {
    const modulos = {
      par: { parametros: { dist: 80 }, formas: [
        caixa('a', [0, 0, 0]),
        caixa('b', ['=dist', 0, 0]),
        { id: 'elo', ligar: { de: 'a.+x', para: 'b.-x', diametro: 5 } },
      ], ancoras: { esq: 'a.-x', dir: 'b.+x' } },
    };
    const r = resolvidas([{ id: 'p', usa: 'par', parametros: { dist: 120 } }, { id: 'ponte', ligar: { de: 'p.esq', para: 'p.dir', tipo: 'tubo', diametro: 3 } }], { modulos });
    perto(ancorasDe(r['p.elo']).inicio, [10, 0, 0]);
    perto(ancorasDe(r['p.elo']).fim, [110, 0, 0]);
    perto(ancorasDe(r.ponte).inicio, [-10, 0, 0]);
    perto(ancorasDe(r.ponte).fim, [130, 0, 0]);
  });

  it('a haste que toca as duas peças passa no gate, e a ligação fica em `daLigacao` na forma expandida', () => {
    const e = esboco([A, caixa('B2', [100, 0, 0]), { id: 'h', ligar: { de: 'A.+x', para: 'B2.-x', diametro: 6 } }]);
    expect(verificarContato(e).resultado).toBe('aprovado');
    expect(expandirEsboco(e).opcoes[0].formas[2].daLigacao.tipo).toBe('haste');
    /* a haste oblíqua, com a ponta redonda na face, a penetra: o gate acusa, e a ligação não esconde isso */
    expect(verificarContato(esboco([A, B, { id: 'h', ligar: { de: 'A.+x', para: 'B.-x', diametro: 6 } }])).achados.map((a) => a.tipo)).toEqual(['colisao', 'colisao']);
  });

  it('as âncoras que não existem são recusadas com a ligação, o campo, o texto escrito e o que vale', () => {
    const base = [A, B];
    expect(() => expandirEsboco(esboco([...base, { id: 'h', ligar: { de: 'A.topo', para: 'B.centro', diametro: 5 } }]))).toThrow(/ligar "h": "de" aponta para "A\.topo", mas a forma "A" \(caixa\) não tem a âncora "topo".*âncoras: centro, \+x, -x, \+y, -y, \+z, -z/);
    expect(() => expandirEsboco(esboco([...base, { id: 'h', ligar: { de: 'A.centro', para: 'C.centro', diametro: 5 } }]))).toThrow(/ligar "h": "para" aponta para "C\.centro", mas não há forma nem instância "C" nesta opção.*ids: A, B, h/);
    expect(() => expandirEsboco(esboco([...base, { id: 'h', ligar: { de: 'A', para: 'B.centro', diametro: 5 } }]))).toThrow(/ligar "h": "de" com o valor "A" deve ser "<id>\.<ancora>"/);
    expect(() => expandirEsboco(esboco([{ id: 'q', usa: 'quadro', centro: [0, 0, 0] }, { id: 'h', ligar: { de: 'q.nada', para: 'q.centro', diametro: 5 } }]))).toThrow(/o componente "quadro" \(instância "q"\) não tem a âncora "nada"/);
  });

  it('o resto da entrada também é conferido: tipo, campos, seção e campo de posição', () => {
    expect(() => expandirEsboco(esboco([A, B, { id: 'h', ligar: { de: 'A.centro', para: 'B.centro', tipo: 'fio', diametro: 5 } }]))).toThrow(/"tipo" com o valor "fio" deve ser um de haste, tubo, cinta/);
    expect(() => expandirEsboco(esboco([A, B, { id: 'h', ligar: { de: 'A.centro', para: 'B.centro' } }]))).toThrow(/a haste precisa de "diametro"/);
    expect(() => expandirEsboco(esboco([A, B, { id: 'h', ligar: { de: 'A.centro', para: 'B.centro', tipo: 'cinta', largura: 5 } }]))).toThrow(/a cinta precisa de "espessura"/);
    expect(() => expandirEsboco(esboco([A, B, { id: 'h', ligar: { de: 'A.centro', para: 'B.centro', diametro: 5, largura: 3 } }]))).toThrow(/"largura" não vale na haste/);
    expect(() => expandirEsboco(esboco([A, B, { id: 'h', centro: [0, 0, 0], ligar: { de: 'A.centro', para: 'B.centro', diametro: 5 } }]))).toThrow(/o campo "centro" não vale aqui/);
    expect(() => expandirEsboco(esboco([A, B, { id: 'h', ligar: { de: 'A.centro', diametro: 5 } }]))).toThrow(/faltam "de" e "para"/);
  });
});

describe('encaixa', () => {
  const B = caixa('B', [100, 50, 0]);

  it('a âncora da peça vai ao ponto de B: só translação', () => {
    const r = resolvidas([B, caixa('P', undefined, { largura: 40, encaixa: { ancora: '-x', em: 'B.+x' } })]);
    perto(ancorasDe(r.P)['-x'], ancorasDe(r.B)['+x']);
    perto(r.P.centro, [130, 50, 0]);
    const igual = resolvidas([B, caixa('P', undefined, { largura: 40, encaixa: { ancora: 'P.-x', em: 'B.+x' } })]);
    perto(igual.P.centro, [130, 50, 0]);
  });

  it('a âncora pode ir a um ponto composto, e `desloca` vale depois do encaixe', () => {
    const r = resolvidas([B, caixa('P', undefined, { encaixa: { ancora: 'centro', em: { ancora: 'B.centro', mm: [0, 30, 0] } }, desloca: [5, 0, 0] })]);
    perto(r.P.centro, [105, 80, 0]);
  });

  it('com `gira` a peça gira em torno do eixo de mundo antes de a âncora ir ao ponto', () => {
    const haste = { id: 'P', tipo: 'cilindro', diametro: 10, comprimento: 40, eixo: 'x', encaixa: { ancora: 'fim', em: 'B.centro', gira: { eixo: 'z', graus: 90 } } };
    const r = resolvidas([B, haste]);
    expect(extensao(r.P).map((v) => Math.round(v))).toEqual([10, 40, 10]);
    perto(ancorasDe(r.P).fim, [100, 50, 0]);
    perto(ancorasDe(r.P).inicio, [100, 10, 0]);
  });

  it('o encaixe acompanha o parâmetro que muda a âncora de B', () => {
    const f = [caixa('B', ['=x', 50, 0]), caixa('P', undefined, { encaixa: { ancora: '-y', em: 'B.+y' } })];
    perto(resolvidas(f, { parametros: { x: 10 } }).P.centro, [10, 70, 0]);
    perto(resolvidas(f, { parametros: { x: 200 } }).P.centro, [200, 70, 0]);
  });

  it('a peça encaixada em B toca B e passa no gate', () => {
    expect(verificarContato(esboco([B, caixa('P', undefined, { encaixa: { ancora: '-x', em: 'B.+x' } })])).resultado).toBe('aprovado');
  });

  it('um módulo de forma simples se encaixa por uma âncora da forma dele', () => {
    const modulos = { calco: { entradas: { encaixa: null }, formas: [caixa('corpo', undefined, { encaixa: '@encaixa' })] } };
    const r = resolvidas([B, { id: 'c', usa: 'calco', encaixa: { ancora: 'c.-x', em: 'B.+x' } }], { modulos });
    perto(r['c.corpo'].centro, [120, 50, 0]);
  });

  it('âncora que não é da peça, que não existe ou ponto que não existe dizem o que vale', () => {
    const P = (encaixa, extra = {}) => caixa('P', undefined, { encaixa, ...extra });
    expect(mensagem([B, P({ ancora: 'B.-x', em: 'B.+x' })])).toMatch(/"encaixa\.ancora" com o valor "B\.-x" deve ser uma âncora da própria forma \("P", e não "B"\).*âncoras de "P": centro, \+x/);
    expect(mensagem([B, P({ ancora: 'topo', em: 'B.+x' })])).toMatch(/"encaixa\.ancora" com o valor "topo" deve ser uma âncora da própria forma.*âncoras de "P": centro/);
    expect(mensagem([B, P({ ancora: '-x', em: 'B.cume' })])).toMatch(/"encaixa\.em" aponta para "B\.cume", mas a forma "B" \(caixa\) não tem a âncora "cume"/);
    expect(mensagem([B, P({ ancora: '-x', em: 'Z.centro' })])).toMatch(/"encaixa\.em" aponta para "Z\.centro", mas a forma "Z" não existe nesta opção \(ids: B, P\)/);
    expect(mensagem([B, P({ ancora: '-x' })])).toMatch(/"encaixa" precisa de "ancora".*e "em"/);
    expect(mensagem([B, P({ ancora: '-x', em: 'B.+x', cola: 1 })])).toMatch(/"encaixa" não tem o campo "cola"/);
    expect(mensagem([B, P({ ancora: '-x', em: 'B.+x' }, { centro: [0, 0, 0] })])).toMatch(/use só um entre "centro", "sobre" e "ponta"|use só um entre/);
    expect(mensagem([B, { id: 'P', tipo: 'tubo', diametro: 4, caminho: [[0, 0, 0], [10, 0, 0]], encaixa: { ancora: 'inicio', em: 'B.centro' } }])).toMatch(/"encaixa" posiciona a peça por uma âncora dela e não vale na faixa "envolve", no tubo/);
    expect(mensagem([B, P({ ancora: '-x', em: 'B.+x', gira: { eixo: 'w', graus: 9 } })])).toMatch(/"encaixa\.gira" deve ser \{ "eixo"/);
  });

  it('o encaixe que depende de si mesmo é recusado como referência circular', () => {
    expect(mensagem([caixa('P', undefined, { encaixa: { ancora: '-x', em: 'Q.+x' } }), caixa('Q', undefined, { encaixa: { ancora: '-x', em: 'P.+x' } })])).toMatch(/referência circular/);
  });
});

describe('ligar e encaixa no conserto e no --ajustar', () => {
  it('o --ajustar não põe centro nem desloca na ligação: move a outra peça do achado', () => {
    const bruto = esboco([
      caixa('A', [0, 0, 0]),
      caixa('B', [100, 0, 0]),
      { id: 'h', ligar: { de: 'A.+x', para: 'B.-x', diametro: 4 } },
      { id: 'C', tipo: 'caixa', largura: 60, altura: 60, profundidade: 60, centro: [50, 0, 0] },
    ]);
    bruto.contato.pares = [];
    expect(verificarContato(bruto).resultado).toBe('reprovado');
    const r = ajustarEsboco(bruto);
    const h = r.esboco.opcoes[0].formas.find((f) => f.id === 'h');
    expect(h).toEqual({ id: 'h', ligar: { de: 'A.+x', para: 'B.-x', diametro: 4 } });
    for (const m of r.rodadas.flatMap((x) => x.movidos)) expect(m.fonte).not.toBe('h');
  });

  it('a sugestão que moveria a ligação vem sem aplicável e diz para mover uma das formas que ela liga', () => {
    const e = esboco([
      caixa('A', [0, 0, 0]),
      caixa('B', [100, 0, 0]),
      { id: 'h', ligar: { de: 'A.+x', para: 'B.-x', diametro: 4 } },
      { id: 'C', tipo: 'caixa', largura: 60, altura: 60, profundidade: 60, encaixa: { ancora: 'centro', em: { ancora: 'A.centro', mm: [50, 0, 0] } } },
    ]);
    e.contato.pares = [];
    const achados = verificarContato(e).achados;
    for (const a of achados) if (a.sugestao?.fonte === 'h') expect(a.sugestao.aplicavel).toBe(false);
  });

  it('`aplicarDeslocamento` edita o `desloca` da peça encaixada (o centro é do encaixe) e não toca a ligação', () => {
    const bruto = esboco([caixa('B', [100, 0, 0]), caixa('P', undefined, { encaixa: { ancora: '-x', em: 'B.+x' } }), { id: 'h', ligar: { de: 'B.centro', para: 'P.centro', diametro: 4 } }]);
    expect(aplicarDeslocamento(bruto, 0, 'P', [0, 5, 0])).toMatchObject({ campo: 'desloca', antes: null, depois: [0, 5, 0] });
    expect(aplicarDeslocamento(bruto, 0, 'h', [0, 5, 0])).toBeNull();
    expect(bruto.opcoes[0].formas[2]).toEqual({ id: 'h', ligar: { de: 'B.centro', para: 'P.centro', diametro: 4 } });
  });
});
