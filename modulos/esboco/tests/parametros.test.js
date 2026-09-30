/* Parâmetros e expressões, formas herdadas da raiz, `espelha` e `arranja`, e o legado byte a byte. */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ancorasDe, desenharEsboco, ErroDeEsboco, resolverOpcao } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { herdarDoEspelho, verificarContato } from '../src/contato.js';
import { descreverEsboco, formatarDescricao, diferenca } from '../src/descrever.js';
import { analisarEsboco } from '../../../tools/mecanifica/esboco.mjs';

const fixture = (nome) => fileURLToPath(new URL(`./fixtures/${nome}`, import.meta.url));
const lerFixture = (nome) => JSON.parse(readFileSync(fixture(nome), 'utf8'));
const sha = (t) => createHash('sha256').update(t).digest('hex');
const perto = (v, esperado, casas = 6) => { expect(v).toHaveLength(esperado.length); v.forEach((x, i) => expect(x).toBeCloseTo(esperado[i], casas)); };
const caixa = (id, extra = {}) => ({ id, tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, centro: [0, 0, 0], ...extra });
const resolver = (formas) => Object.fromEntries(resolverOpcao({ formas }).map((r) => [r.id, r]));
/* resolve as opções de um esboço com parâmetros */
const opcoesDe = (esboco) => expandirEsboco(esboco).opcoes.map((o, i) => Object.fromEntries(resolverOpcao(o, `opção ${i + 1}`, expandirEsboco(esboco).pontos).map((r) => [r.id, r])));

describe('parâmetros e expressões', () => {
  it('número, nome de parâmetro e =expressão valem em qualquer campo numérico', () => {
    const [o] = opcoesDe({
      parametros: { lado: 20, metade: '=lado/2', outro: 'lado' },
      opcoes: [{ formas: [
        caixa('a', { largura: 'lado', altura: '=lado*2', profundidade: '=(lado+10)/3', raio: '=lado/4', centro: [0, 'metade', '=-lado-5'] }),
        { id: 'c', tipo: 'cilindro', diametro: 'outro', comprimento: '=lado*3', eixo: 'x', centro: [0, 0, 0], desloca: ['=metade', 0, '=-metade'] },
        { id: 'r', tipo: 'anel', diametroExterno: '=lado*5', diametroInterno: 'lado', espessura: 'metade', eixo: 'z', centro: [0, 0, 0] },
      ] }],
    });
    expect(o.a.max.map((v, i) => v - o.a.min[i])).toEqual([20, 40, 10]);
    perto(o.a.centro, [0, 10, -25]);
    perto(o.c.centro, [10, 0, -10]);
    expect(o.c.max[0] - o.c.min[0]).toBeCloseTo(60, 6);
    expect(o.r.max[0] - o.r.min[0]).toBeCloseTo(100, 6);
    const giro = expandirEsboco({ parametros: { lado: 20 }, opcoes: [{ formas: [caixa('g', { rotacao: [0, '=lado+10', 0] }), caixa('h', { rotacao: { eixo: 'x', angulo: 'lado' } })] }] });
    expect(giro.opcoes[0].formas.map((f) => f.rotacao)).toEqual([[0, 30, 0], { eixo: 'x', angulo: 20 }]);
  });

  it('a opção sobrepõe a raiz, inclusive nos parâmetros que dependem dele', () => {
    const e = { parametros: { lado: 20, dobro: '=lado*2' }, opcoes: [{ formas: [caixa('a', { largura: 'dobro' })] }, { parametros: { lado: 50 }, formas: [caixa('a', { largura: 'dobro' })] }] };
    const [a, b] = opcoesDe(e);
    expect(a.a.max[0] - a.a.min[0]).toBe(40);
    expect(b.a.max[0] - b.a.min[0]).toBe(100);
    expect(expandirEsboco(e).opcoes.map((o) => o.parametros)).toEqual([{ lado: 20, dobro: 40 }, { lado: 50, dobro: 100 }]);
  });

  it('valores em contato, explosão, pontos, achatado, furos e encosta também passam pelo resolvedor', () => {
    const e = expandirEsboco({
      parametros: { m: 3, folga: 4 },
      contato: { usar: true, tolerancia: '=m*2', pares: [{ a: 'a', b: 'b', tipo: 'atravessa', max: 'm', motivo: 'um motivo com mais de quinze letras' }] },
      pontos: { p: [0, '=m*10', 0] },
      explosao: { eixo: 'x', fator: '=folga/2' },
      opcoes: [{ formas: [caixa('a', { furos: [{ diametro: '=m*2', centro: ['=m', 0] }], encosta: { referencia: 'b', direcao: [0, -1, 0], folga: 'folga' } }), caixa('b')] }],
    });
    expect(e.contato.tolerancia).toBe(6);
    expect(e.contato.pares[0].max).toBe(3);
    expect(e.explosao.fator).toBe(2);
    expect(e.opcoes[0].pontos).toEqual({ p: [0, 30, 0] });
    expect(e.opcoes[0].formas[0].furos).toEqual([{ diametro: 6, centro: [3, 0] }]);
    expect(e.opcoes[0].formas[0].encosta.folga).toBe(4);
  });

  it('parâmetro inexistente diz o campo, a forma, o parâmetro e os válidos', () => {
    const e = { parametros: { lado: 20, alto: 5 }, opcoes: [{ titulo: 'T', formas: [caixa('a', { largura: '=lado + lardo' })] }] };
    expect(() => desenharEsboco(e)).toThrow(ErroDeEsboco);
    let msg = '';
    try { desenharEsboco(e); } catch (x) { msg = x.message; }
    expect(msg).toContain('opção 1 (T)');
    expect(msg).toContain('forma "a"');
    expect(msg).toContain('"largura"');
    expect(msg).toContain('"lardo"');
    expect(msg).toContain('lado, alto');
    expect(() => expandirEsboco({ opcoes: [{ formas: [caixa('a', { largura: 'nada' })] }] })).toThrow(/"nada".*nenhum declarado/);
  });

  it('ciclo entre parâmetros e expressão inválida recusam com a forma e o campo', () => {
    expect(() => expandirEsboco({ parametros: { a: '=b+1', b: '=a+1' }, opcoes: [{ formas: [caixa('x')] }] })).toThrow(/ciclo de parâmetros \(a -> b -> a\)/);
    expect(() => expandirEsboco({ parametros: { a: 1 }, opcoes: [{ formas: [caixa('x', { altura: '=a +* 2' })] }] })).toThrow(/forma "x".*"altura".*expressão/);
    expect(() => expandirEsboco({ parametros: { a: 1 }, opcoes: [{ formas: [caixa('x', { altura: '=a.constructor' })] }] })).toThrow(/forma "x".*"altura"/);
    expect(() => expandirEsboco({ parametros: { a: 1 }, opcoes: [{ formas: [caixa('x', { altura: '=a/0' })] }] })).toThrow(/não-finito/);
    expect(() => expandirEsboco({ parametros: { a: [1] }, opcoes: [{ formas: [caixa('x')] }] })).toThrow(/o parâmetro "a" deve ser um número/);
    expect(() => expandirEsboco({ parametros: 3, opcoes: [{ formas: [caixa('x')] }] })).toThrow(/"parametros" deve ser um objeto/);
  });

  it('a raiz e a opção herdam as formas: a opção só traz título, nota e parâmetros', () => {
    const e = { parametros: { largura: 10 }, formas: [caixa('a', { largura: 'largura' })], opcoes: [{ titulo: 'A' }, { titulo: 'B', parametros: { largura: 30 } }, { titulo: 'C', formas: [caixa('outra')] }] };
    const [a, b, c] = opcoesDe(e);
    expect(Object.keys(a)).toEqual(['a']);
    expect(a.a.max[0] - a.a.min[0]).toBe(10);
    expect(b.a.max[0] - b.a.min[0]).toBe(30);
    expect(Object.keys(c)).toEqual(['outra']);
    expect(() => desenharEsboco({ opcoes: [{ titulo: 'sem formas' }] })).toThrow(/"formas" precisa ser uma lista não vazia/);
    expect(desenharEsboco(e).svg).toContain('<svg');
  });

  it('a expansão é idempotente', () => {
    const e = lerFixture('moto-parametros.esboco.json');
    const uma = expandirEsboco(e);
    expect(expandirEsboco(uma)).toEqual(uma);
    expect(desenharEsboco(e).svg).toBe(desenharEsboco(uma).svg);
  });

  it('a leitura em texto lista os parâmetros resolvidos e a diferença aponta o que mudou', () => {
    const e = { parametros: { lado: 20 }, opcoes: [{ titulo: 'A', formas: [caixa('a', { largura: '=lado*2' })] }, { titulo: 'B', parametros: { lado: 30 } , formas: [caixa('a', { largura: '=lado*2' })] }] };
    const d = descreverEsboco(e);
    expect(d.opcoes.map((o) => o.parametros)).toEqual([{ lado: 20 }, { lado: 30 }]);
    expect(formatarDescricao(d)).toContain('parâmetros: lado 20');
    expect(formatarDescricao(d)).toContain('parâmetros: lado 30');
    const antes = descreverEsboco({ ...e, parametros: { lado: 25 } });
    const dif = diferenca(antes, d);
    expect(dif.linhas.some((l) => /\[A\] parâmetro alterado: lado de 25 para 20/.test(l))).toBe(true);
    expect(dif.linhas.some((l) => /forma redimensionada: a/.test(l))).toBe(true);
    expect(JSON.stringify(descreverEsboco({ opcoes: [{ titulo: 'sem', formas: [caixa('a')] }] }).opcoes[0])).not.toContain('parametros');
  });

  it('o manifesto da análise traz os parâmetros por opção, e não traz nada sem parâmetros', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'parametros-'));
    const com = join(pasta, 'com.esboco.json');
    writeFileSync(com, JSON.stringify({ parametros: { lado: 20 }, formas: [caixa('a', { largura: 'lado' })], opcoes: [{ titulo: 'A' }, { titulo: 'B', parametros: { lado: 40 } }] }));
    const { manifesto } = await analisarEsboco(com);
    expect(manifesto.parametros).toEqual({ A: { lado: 20 }, B: { lado: 40 } });
    const sem = join(pasta, 'sem.esboco.json');
    writeFileSync(sem, JSON.stringify({ opcoes: [{ titulo: 'A', formas: [caixa('a')] }] }));
    expect((await analisarEsboco(sem)).manifesto).not.toHaveProperty('parametros');
  }, 60000);
});

describe('espelha', () => {
  const esq = (extra = {}) => ({ id: 'e', tipo: 'cilindro', diametro: 20, comprimento: 100, eixo: 'y', centro: [-50, 30, 7], cor: 'laranja', rotulo: 'lado', ...extra });
  const par = (fonte, copia = {}, eixo = 'x', pos = 0) => resolver([fonte, { id: 'd', espelha: { forma: 'e', eixo, pos }, ...copia }]);

  it('reflete centro e âncoras em cada eixo e em pos diferente de zero', () => {
    const x = par(esq());
    perto(x.d.centro, [50, 30, 7]);
    const y = par(esq(), {}, 'y', 10);
    perto(y.d.centro, [-50, -10, 7]);
    const z = par(esq(), {}, 'z', 2);
    perto(z.d.centro, [-50, 30, -3]);
    perto(par(esq(), {}, 'x', 100).d.centro, [250, 30, 7]);
    perto(x.d.min, [40, -20, -3]);
    perto(x.d.max, [60, 80, 17]);
  });

  it('a rotação é refletida: as pontas do eixo inclinado trocam de lado', () => {
    const r = par(esq({ rotacao: [0, 0, 30] }));
    const ae = ancorasDe(r.e);
    const ad = ancorasDe(r.d);
    perto(ad.fim, [-ae.fim[0], ae.fim[1], ae.fim[2]]);
    perto(ad.inicio, [-ae.inicio[0], ae.inicio[1], ae.inicio[2]]);
    expect(ad.fim[0]).toBeGreaterThan(ad.centro[0]);
    expect(ae.fim[0]).toBeLessThan(ae.centro[0]);
    /* caixa girada em y: o espelho gira para o outro lado */
    const c = par({ id: 'e', tipo: 'caixa', largura: 40, altura: 10, profundidade: 100, centro: [-100, 0, 0], rotacao: [0, 30, 0] });
    perto(c.d.min, [-c.e.max[0], c.e.min[1], c.e.min[2]]);
    perto(c.d.max, [-c.e.min[0], c.e.max[1], c.e.max[2]]);
    perto(ancorasDe(c.d)['+z'], [-ancorasDe(c.e)['+z'][0], ancorasDe(c.e)['+z'][1], ancorasDe(c.e)['+z'][2]]);
  });

  it('de/para, ponta, sobre e encosta saem refletidos', () => {
    const base = { id: 'roda', tipo: 'anel', diametroExterno: 100, diametroInterno: 40, espessura: 10, eixo: 'x', centro: [0, 50, 0] };
    const r = par({ id: 'e', tipo: 'cilindro', diametro: 10, de: [-90, 0, 100], para: [-90, 200, 20] }, {}, 'x', 0);
    perto(r.d.centro, [90, 100, 60]);
    const fim = ancorasDe(r.e).fim; const fimD = ancorasDe(r.d).fim;
    perto(fimD, [-fim[0], fim[1], fim[2]]);
    expect(r.d.max[2] - r.d.min[2]).toBeCloseTo(r.e.max[2] - r.e.min[2], 6);
    const s = resolver([base, esq({ id: 'e', sobre: 'roda', centro: undefined }), { id: 'd', espelha: { forma: 'e', eixo: 'z', pos: 0 } }]);
    perto(s.d.centro, [s.e.centro[0], s.e.centro[1], -s.e.centro[2]]);
    const p = resolver([caixa('alvo'), caixa('e', { centro: undefined, ponta: ['alvo', '+x'] }), { id: 'd', espelha: { forma: 'e', eixo: 'x' } }]);
    expect(p.e.min[0]).toBeCloseTo(p.alvo.max[0], 6);
    expect(p.d.max[0]).toBeCloseTo(p.alvo.min[0], 6);
    const en = resolver([caixa('ref', { centro: [0, 0, 0] }), caixa('e', { centro: [-40, 50, 0], encosta: { referencia: 'ref', direcao: '-y' } }), { id: 'd', espelha: { forma: 'e', eixo: 'x' } }]);
    expect(en.d.min[1]).toBeCloseTo(en.ref.max[1], 6);
    perto(en.d.centro, [40, en.e.centro[1], 0]);
  });

  it('a cópia herda a cor, leva o rótulo só se declarado e a fonte pode vir depois', () => {
    const [copia, fonte] = resolverOpcao({ formas: [{ id: 'd', espelha: { forma: 'e', eixo: 'x' }, desloca: [0, 5, 0] }, esq()] });
    expect(copia.forma.cor).toBe('laranja');
    expect(copia.forma.rotulo).toBeUndefined();
    perto(copia.centro, [50, 35, 7]);
    expect(fonte.forma.rotulo).toBe('lado');
    const [c2] = resolverOpcao({ formas: [{ id: 'd', espelha: { forma: 'e', eixo: 'x' }, cor: 'azul', rotulo: 'outro' }, esq()] });
    expect(c2.forma.cor).toBe('azul');
    expect(c2.forma.rotulo).toBe('outro');
    const [oc] = resolverOpcao({ formas: [{ id: 'd', espelha: { forma: 'e', eixo: 'x' }, oculto: true }, esq()] });
    expect(oc.forma.oculto).toBe(true);
    expect(desenharEsboco({ opcoes: [{ formas: [esq(), { id: 'd', espelha: { forma: 'e', eixo: 'x' } }] }] }).svg).toContain('<svg');
  });

  it('ciclo, fonte inexistente e campo de forma na cópia são recusados', () => {
    expect(() => resolver([{ id: 'a', espelha: { forma: 'b', eixo: 'x' } }, { id: 'b', espelha: { forma: 'a', eixo: 'x' } }])).toThrow(/referência circular em "espelha.forma"/);
    expect(() => resolver([caixa('a'), { id: 'b', espelha: { forma: 'a', eixo: 'x' }, centro: [1, 2, 3] }])).toThrow(/só aceita.*retire "centro"/);
    expect(() => resolver([caixa('a'), { id: 'b', tipo: 'caixa', espelha: { forma: 'a', eixo: 'x' } }])).toThrow(/retire "tipo"/);
    expect(() => resolver([caixa('a'), { id: 'b', espelha: { forma: 'zzz', eixo: 'x' } }])).toThrow(/"zzz", que não existe.*ids: a, b/);
    expect(() => resolver([caixa('a'), { id: 'b', espelha: { forma: 'a', eixo: 'w' } }])).toThrow(/"espelha.eixo"/);
    expect(() => resolver([caixa('a'), { id: 'b', espelha: { forma: 'b', eixo: 'x' } }])).toThrow(/própria forma/);
    expect(() => resolver([caixa('a'), { id: 'b', espelha: { forma: 'a', eixo: 'x', lado: 1 } }])).toThrow(/não tem o campo "lado"/);
  });

  it('um espelho de espelho e o espelho em pos vindo de parâmetro funcionam', () => {
    const e = { parametros: { plano: 100 }, opcoes: [{ formas: [esq(), { id: 'd', espelha: { forma: 'e', eixo: 'x', pos: 'plano' } }, { id: 'dd', espelha: { forma: 'd', eixo: 'x', pos: 'plano' } }] }] };
    const [o] = opcoesDe(e);
    perto(o.d.centro, [250, 30, 7]);
    perto(o.dd.centro, [-50, 30, 7]);
  });

  describe('o gate', () => {
    const barra = { id: 'barra', tipo: 'cilindro', diametro: 20, comprimento: 400, eixo: 'x', centro: [0, 100, 0] };
    const pino = { id: 'pinoE', tipo: 'cilindro', diametro: 30, comprimento: 100, eixo: 'y', centro: [-100, 100, 0] };
    const copia = { id: 'pinoD', espelha: { forma: 'pinoE', eixo: 'x' } };
    const par1 = (max = 40) => ({ a: 'barra', b: 'pinoE', tipo: 'atravessa', max, motivo: 'a barra passa pelo pino nos dois lados' });
    const esboco = (pares, formas = [barra, pino, copia]) => ({ contato: { usar: true, pares }, opcoes: [{ titulo: 'T', formas }] });

    it('o par do espelho herda atravessa com o mesmo motivo e max, e reprova pelo mesmo max', () => {
      const r = verificarContato(esboco([par1()]));
      expect(r.resultado).toBe('aprovado');
      expect(r.atravessamentos.map((t) => [t.a, t.b, t.max_mm])).toEqual(expect.arrayContaining([['barra', 'pinoE', 40], ['barra', 'pinoD', 40]]));
      const sem = verificarContato(esboco([par1()], [barra, pino, { ...pino, id: 'pinoD', centro: [100, 100, 0] }]));
      expect(sem.achados.map((a) => `${a.tipo}:${a.pecas.join('+')}`)).toContain('colisao:barra+pinoD');
      const pouco = verificarContato(esboco([par1(5)]));
      expect(pouco.achados.map((a) => `${a.tipo}:${a.pecas.join('+')}`).sort()).toEqual(['atravessa-excedido:barra+pinoD', 'atravessa-excedido:barra+pinoE']);
    });

    it('livre e encosta também herdam, e a declaração na cópia prevalece', () => {
      const livre = verificarContato(esboco([{ a: 'barra', b: 'pinoE', tipo: 'livre', motivo: 'o pino é só conceito solto' }]));
      expect(livre.silenciados.map((s) => `${s.a}+${s.b}:${s.motivo}`).sort()).toEqual(['barra+pinoD:o pino é só conceito solto', 'barra+pinoE:o pino é só conceito solto']);
      const proprio = verificarContato(esboco([par1(40), { a: 'barra', b: 'pinoD', tipo: 'atravessa', max: 3, motivo: 'a cópia tem o limite dela mesmo' }]));
      expect(proprio.achados.map((a) => `${a.tipo}:${a.pecas.join('+')}`)).toEqual(['atravessa-excedido:barra+pinoD']);
      const plano = [caixa('chao', { largura: 400, centro: [0, -10, 0] }), caixa('e', { centro: [-100, 0, 0] }), { id: 'd', espelha: { forma: 'e', eixo: 'x' } }];
      const enc = verificarContato(esboco([{ a: 'chao', b: 'e', tipo: 'encosta' }], plano));
      expect(enc.resultado).toBe('aprovado');
      const cego = verificarContato(esboco([{ a: 'chao', b: 'e', tipo: 'encosta' }], [plano[0], caixa('e', { centro: [-100, 40, 0] }), { id: 'd', espelha: { forma: 'e', eixo: 'x' } }]));
      expect(cego.achados.filter((a) => a.tipo === 'par-nao-encosta').map((a) => a.pecas.join('+')).sort()).toEqual(['chao+d', 'chao+e']);
    });

    it('o par entre a fonte e a cópia é cobrado como qualquer outro', () => {
      const juntas = [barra, pino, { id: 'pinoD', espelha: { forma: 'pinoE', eixo: 'x', pos: -90 } }];
      const r = verificarContato(esboco([par1()], juntas));
      expect(r.achados.map((a) => `${a.tipo}:${a.pecas.join('+')}`)).toContain('colisao:pinoE+pinoD');
      const declarado = verificarContato(esboco([par1(), { a: 'pinoE', b: 'pinoD', tipo: 'atravessa', max: 30, motivo: 'as duas bengalas se cruzam de propósito' }], juntas));
      expect(declarado.achados.filter((a) => a.pecas.includes('pinoD') && a.pecas.includes('pinoE'))).toEqual([]);
    });

    it('espelhos dos dois lados do par herdam o par dos espelhos, e nunca o cruzado', () => {
      const caixinha = (id, z) => ({ id, tipo: 'caixa', largura: 20, altura: 20, profundidade: 20, centro: [-100, 0, z] });
      const formas = [caixinha('bar', 0), caixinha('pin', 10), { id: 'barD', espelha: { forma: 'bar', eixo: 'x' } }, { id: 'pinD', espelha: { forma: 'pin', eixo: 'x' } },
        { id: 'ponte', tipo: 'caixa', largura: 250, altura: 20, profundidade: 20, centro: [0, 20, 0] }];
      const par = { a: 'bar', b: 'pin', tipo: 'atravessa', max: 30, motivo: 'as duas peças se cruzam nesse ponto' };
      expect(herdarDoEspelho([par], { formas }).map((p) => `${p.a}+${p.b}`)).toEqual(['bar+pin', 'barD+pinD']);
      expect(herdarDoEspelho([par], { formas: formas.slice(0, 3) }).map((p) => `${p.a}+${p.b}`)).toEqual(['bar+pin', 'barD+pin']);
      const r = verificarContato({ contato: { usar: true, pares: [par] }, opcoes: [{ titulo: 'T', formas }] });
      expect(r.atravessamentos.map((t) => `${t.a}+${t.b}`).sort()).toEqual(['bar+pin', 'barD+pinD']);
      expect(r.resultado).toBe('aprovado');
    });

    it('a leitura em texto usa a mesma herança', () => {
      const d = descreverEsboco(esboco([par1()]));
      expect(d.opcoes[0].sobreposicoes3d.map((s) => `${s.a}+${s.b}:${s.declarado}`)).toEqual(expect.arrayContaining(['barra+pinoE:true', 'barra+pinoD:true']));
      expect(d.opcoes[0].achadosDeContato).toEqual([]);
      expect(formatarDescricao(d)).toContain('relação: espelho de pinoE no eixo x em 0 mm');
    });
  });
});

describe('arranja', () => {
  const parafuso = { id: 'p', tipo: 'cilindro', diametro: 10, comprimento: 20, eixo: 'y', centro: [50, 0, 0], cor: 'preto', rotulo: 'parafuso' };

  it('linear: total conta a fonte, e as cópias saem em p1, p2... com passo exato', () => {
    const r = resolver([parafuso, { arranja: { forma: 'p', modo: 'linear', total: 4, passo: [0, 0, 60] } }]);
    expect(Object.keys(r)).toEqual(['p', 'p1', 'p2', 'p3']);
    perto(r.p1.centro, [50, 0, 60]);
    perto(r.p2.centro, [50, 0, 120]);
    perto(r.p3.centro, [50, 0, 180]);
    expect(r.p3.forma.cor).toBe('preto');
    expect(r.p3.forma.rotulo).toBeUndefined();
    expect(r.p.forma.rotulo).toBe('parafuso');
    expect(r.p3.max[1] - r.p3.min[1]).toBeCloseTo(20, 6);
  });

  it('radial: cópias giram em torno do eixo pelo centro dado, e 360 graus não repete a fonte', () => {
    const r = resolver([parafuso, { arranja: { forma: 'p', modo: 'radial', total: 4, eixo: 'y', centro: [0, 0, 0] } }]);
    perto(r.p1.centro, [0, 0, -50]);
    perto(r.p2.centro, [-50, 0, 0]);
    perto(r.p3.centro, [0, 0, 50]);
    const seis = resolver([parafuso, { arranja: { forma: 'p', modo: 'radial', total: 6, eixo: 'y', centro: [0, 0, 0] } }]);
    for (let k = 1; k < 6; k++) {
      const a = (k * 60 * Math.PI) / 180;
      perto(seis[`p${k}`].centro, [50 * Math.cos(a), 0, -50 * Math.sin(a)]);
      expect(Math.hypot(seis[`p${k}`].centro[0], seis[`p${k}`].centro[2])).toBeCloseTo(50, 6);
    }
    /* em torno de x, a partir de um centro fora da origem, e o cilindro deitado gira junto */
    const x = resolver([{ ...parafuso, centro: [0, 60, 0] }, { arranja: { forma: 'p', modo: 'radial', total: 4, eixo: 'x', centro: [0, 10, 0] } }]);
    perto(x.p1.centro, [0, 10, 50]);
    perto(x.p2.centro, [0, -40, 0]);
    perto(ancorasDe(x.p1).fim, [0, 10, 60]);
  });

  it('radial com graus menores que 360 distribui a fonte e a última nas pontas do arco', () => {
    const r = resolver([parafuso, { arranja: { forma: 'p', modo: 'radial', total: 3, eixo: 'y', centro: [0, 0, 0], graus: 180 } }]);
    perto(r.p1.centro, [0, 0, -50]);
    perto(r.p2.centro, [-50, 0, 0]);
  });

  it('centro por âncora ou ponto nomeado, nomes explícitos e formas depois da fonte', () => {
    const cubo = { id: 'cubo', tipo: 'anel', diametroExterno: 40, diametroInterno: 10, espessura: 10, eixo: 'y', centro: [0, 5, 0] };
    const r = resolver([{ arranja: { forma: 'p', modo: 'radial', total: 3, eixo: 'y', centro: 'cubo.centro', nomes: ['a', 'b'] } }, parafuso, cubo]);
    expect(Object.keys(r).sort()).toEqual(['a', 'b', 'cubo', 'p']);
    perto(r.a.centro, [-25, 0, -43.30127018922193]);
    perto(r.b.centro, [-25, 0, 43.30127018922193]);
    const pontos = resolverOpcao({ formas: [parafuso, { arranja: { forma: 'p', modo: 'radial', total: 2, eixo: 'y', centro: 'origem' } }] }, 'o', { origem: [0, 0, 0] });
    perto(pontos[1].centro, [-50, 0, 0]);
  });

  it('as cópias entram no gate como qualquer forma e na leitura em texto', () => {
    const flange = { id: 'flange', tipo: 'anel', diametroExterno: 200, diametroInterno: 40, espessura: 10, eixo: 'y', centro: [0, 0, 0] };
    const p = { id: 'p', tipo: 'cilindro', diametro: 12, comprimento: 30, eixo: 'y', centro: [80, 20, 0] };
    const arr = { arranja: { forma: 'p', modo: 'radial', total: 6, eixo: 'y', centro: [0, 0, 0] } };
    const esboco = { contato: { usar: true }, opcoes: [{ titulo: 'T', formas: [flange, p, arr] }] };
    const r = verificarContato(esboco);
    expect(r.resultado).toBe('aprovado');
    const d = descreverEsboco(esboco).opcoes[0];
    expect(d.formas.map((f) => f.id)).toEqual(['flange', 'p', 'p1', 'p2', 'p3', 'p4', 'p5']);
    expect(d.contatos.filter((c) => c.b.startsWith('p') || c.a.startsWith('p')).length).toBeGreaterThanOrEqual(6);
    expect(formatarDescricao({ opcoes: [d] })).toContain('relação: cópia 3 de 6 de p, radial, eixo y em [0 0 0], 360 graus');
    /* uma cópia solta reprova: total maior que o flange comporta com passo longo */
    const longe = verificarContato({ contato: { usar: true }, opcoes: [{ titulo: 'T', formas: [flange, p, { arranja: { forma: 'p', modo: 'linear', total: 3, passo: [400, 0, 0] } }] }] });
    expect(longe.achados.map((a) => a.tipo)).toContain('voando');
  });

  it('a cópia respeita a opacidade da variante transparente e o desenho não muda ao repetir', () => {
    const e = { opcoes: [{ formas: [parafuso, { arranja: { forma: 'p', modo: 'linear', total: 3, passo: [0, 0, 30] } }] }] };
    expect(desenharEsboco(e).svg).toBe(desenharEsboco(expandirEsboco(e)).svg);
    expect(expandirEsboco(e).opcoes[0].formas.map((f) => f.id)).toEqual(['p', 'p1', 'p2']);
  });

  it('erros de arranjo dizem o campo', () => {
    const tenta = (a, formas = [parafuso]) => () => resolver([...formas, { arranja: a }]);
    expect(tenta({ forma: 'p', modo: 'espiral', total: 3 })).toThrow(/"arranja.modo" deve ser "linear" ou "radial"/);
    expect(tenta({ forma: 'p', modo: 'linear', total: 1, passo: [0, 0, 1] })).toThrow(/"arranja.total" deve ser um inteiro de 2 ou mais/);
    expect(tenta({ forma: 'p', modo: 'linear', total: 3 })).toThrow(/precisa de "passo"/);
    expect(tenta({ forma: 'p', modo: 'radial', total: 3, centro: [0, 0, 0] })).toThrow(/precisa de "eixo"/);
    expect(tenta({ forma: 'p', modo: 'radial', total: 3, eixo: 'y' })).toThrow(/precisa de "centro"/);
    expect(tenta({ forma: 'p', modo: 'linear', total: 3, passo: [0, 0, 1], eixo: 'y' })).toThrow(/valem só no modo radial/);
    expect(tenta({ forma: 'p', modo: 'linear', total: 3, passo: [0, 0, 1], nomes: ['a'] })).toThrow(/"arranja.nomes" deve listar 2 nomes distintos/);
    expect(tenta({ forma: 'p', modo: 'linear', total: 3, passo: [0, 0, 1], cor: 'x' })).toThrow(/não tem o campo "cor"/);
    expect(tenta({ forma: 'nada', modo: 'linear', total: 3, passo: [0, 0, 1] })).toThrow(/"nada", que não existe/);
    expect(tenta({ forma: 'p', modo: 'linear', total: 2, passo: [0, 0, 1], nomes: ['p'] })).toThrow(/id "p" repetido/);
    expect(() => resolver([parafuso, { arranja: { forma: 'p', modo: 'linear', total: 2, passo: [0, 0, 1] }, oculto: true }])).toThrow(/só tem o campo "arranja"; retire "oculto"/);
  });
});

/* SVG, leitura em texto e contato de cada fixture, medidos no commit anterior a este recurso. */
const HASHES_DE_ANTES = {
  casa: ['c960aa92f4718b6eca6e39a5f0126e59d3d863f8a26332269ab4307da8d9d6d0', '743e7343a8a5c6460191c51716333e23a19788d620c1da4fb053e8f3e0246a7d', '861ae4da0195985f4f163e4d8aa4b4399c86421d48f7f33e4dc2116c5c59efaf'],
  'mancal-eixo': ['402b49db651a5b8afc7812b4395bf438cf9d7e1b9496a6942cfdfcb3cdad714c', 'cbce6f1a621214af6eb020cce47db0061249a074b2f0807f921429b2e861c73c', '861ae4da0195985f4f163e4d8aa4b4399c86421d48f7f33e4dc2116c5c59efaf'],
  moto: ['ed68ae2b86427f13e45dbbac33fbef973737716382c7005639d1e49f4d9fde95', '17aa298d0c94802c01b68bb940eb5db7bf7206123645bf023bca0db1ab32da93', '08d7b0b0b123cb7477a5f5a28ae175b543612ff7c6b2f234941716f47ab8e99a'],
  'teste-cubo': ['499cb2e0eaf3b860553c37f83a7094276eb4176d2b3de8aa658b4839852f2f19', 'cf3236a889865881ec8624ac320befee8df359dd54b0a1e55e719a6b879f051d', '861ae4da0195985f4f163e4d8aa4b4399c86421d48f7f33e4dc2116c5c59efaf'],
  'moto-relacoes': ['f8ea0f86fc4fc948bdae1e92d667e0aa7320709b0b2afce07e2b2db4ee8e9f71', 'abaaa8aa07ee7f3b5a80e05ed71bf7cb5fc475445b53648cee85c2c46c5df492', 'cd17b2f3f6733e4c79c6eb20673061fa96fa0810063d1304d1bd7a711e889bcb'],
};

describe('legado byte a byte', () => {
  it.each(Object.keys(HASHES_DE_ANTES))('%s gera o mesmo SVG, a mesma leitura e o mesmo contato de antes', (nome) => {
    const j = lerFixture(`${nome}.esboco.json`);
    const [svg, texto, contato] = HASHES_DE_ANTES[nome];
    expect(sha(desenharEsboco(j).svg)).toBe(svg);
    expect(sha(formatarDescricao(descreverEsboco(j)))).toBe(texto);
    expect(sha(JSON.stringify(verificarContato(j)))).toBe(contato);
  }, 60000);
});

/* Números escritos à mão: literais numéricos do JSON e dígitos dentro de "=expressão", sem os textos. */
const TEXTOS = new Set(['plano', 'nota', 'titulo', 'rotulo', 'motivo', 'id', 'tipo', 'cor', 'vista']);
function literais(v) {
  if (typeof v === 'number') return 1;
  if (typeof v === 'string') return v.startsWith('=') ? (v.match(/(?<![A-Za-z_])\d+(\.\d+)?/g) ?? []).length : 0;
  if (Array.isArray(v)) return v.reduce((s, x) => s + literais(x), 0);
  if (v && typeof v === 'object') return Object.entries(v).reduce((s, [k, x]) => s + (TEXTOS.has(k) && typeof x === 'string' ? 0 : literais(x)), 0);
  return 0;
}

describe('a moto com parâmetros', () => {
  const moto = lerFixture('moto-parametros.esboco.json');

  it('escreve à mão no máximo metade dos números da moto original', () => {
    const antes = literais(lerFixture('moto.esboco.json'));
    const relacoes = literais(lerFixture('moto-relacoes.esboco.json'));
    const agora = literais(moto);
    expect(antes).toBe(83);
    expect(relacoes).toBe(60);
    expect(agora).toBeLessThanOrEqual(antes / 2);
  });

  it('as duas opções vêm da mesma lista de formas e o gate aprova as duas', () => {
    expect(moto.opcoes.every((o) => o.formas === undefined)).toBe(true);
    expect(Object.keys(moto.opcoes[1].parametros)).toEqual(['alturaColuna', 'larguraGuidao']);
    const g = verificarContato(moto);
    expect(g.resultado).toBe('aprovado');
    expect(g.achados).toEqual([]);
    expect(g.atravessamentos.filter((t) => t.b === 'guidao' || t.a === 'guidao').map((t) => `${t.opcao}:${t.a}+${t.b}`).sort()).toEqual([
      'A. Naked:garfoD+guidao', 'A. Naked:garfoE+guidao', 'B. Café racer:garfoD+guidao', 'B. Café racer:garfoE+guidao',
    ]);
  });

  it('as duas opções diferem só onde os parâmetros mandam e os espelhos são simétricos', () => {
    const [a, b] = opcoesDe(moto);
    expect(Object.keys(a)).toEqual(Object.keys(b));
    expect(a.coluna.max[1] - a.coluna.min[1]).toBe(240);
    expect(b.coluna.max[1] - b.coluna.min[1]).toBe(180);
    expect(a.guidao.max[0] - a.guidao.min[0]).toBeCloseTo(760, 6);
    expect(b.guidao.max[0] - b.guidao.min[0]).toBeCloseTo(540, 6);
    for (const o of [a, b]) {
      perto(o.garfoD.centro, [-o.garfoE.centro[0], o.garfoE.centro[1], o.garfoE.centro[2]]);
      perto(o.balancimD.centro, [-o.balancimE.centro[0], o.balancimE.centro[1], o.balancimE.centro[2]]);
      expect(o.rodaFrente.centro[2]).toBe(700);
      expect(o.rodaTras.centro[1]).toBe(305);
    }
    expect(a.rodaFrente.centro).toEqual(b.rodaFrente.centro);
    expect(a.motor.centro).toEqual(b.motor.centro);
    expect(a.guidao.centro[1]).not.toBe(b.guidao.centro[1]);
    expect(desenharEsboco(moto).svg).toContain('B. Café racer');
  }, 60000);
});
