/* Gate de contato do esboço: colisão, folga, voando e pares declarados. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { desenharEsboco, ErroDeEsboco } from '../src/index.js';
import { descreverAchado, verificarContato } from '../src/contato.js';
import { analisarEsboco } from '../../../tools/mecanifica/esboco.mjs';

const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const esboco = (formas, contato = {}, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], contato: { usar: true, tolerancia: 1, folga: 50, ...contato }, ...extra });
const tipos = (r) => r.achados.map((a) => `${a.tipo}:${a.pecas.join('+')}`).sort();

describe('contato do esboço', () => {
  it('sem "contato" ou com usar falso fica desligado e não mede', () => {
    const f = [caixa('a', [0, 0, 0]), caixa('b', [500, 0, 0])];
    expect(verificarContato({ opcoes: [{ formas: f }] })).toMatchObject({ usar: false, resultado: 'desligado', achados: [] });
    expect(verificarContato(esboco(f, { usar: false })).resultado).toBe('desligado');
  });

  it('o desenho é idêntico com ou sem "contato", mesmo reprovado', () => {
    const f = [caixa('a', [0, 0, 0]), caixa('b', [500, 0, 0])];
    const sem = desenharEsboco({ opcoes: [{ titulo: 'T', formas: f }] });
    const com = desenharEsboco(esboco(f));
    expect(verificarContato(esboco(f)).resultado).toBe('reprovado');
    expect(com.svg).toBe(sem.svg);
  });

  it('duas caixas encostadas aprovam, separadas voam e sobrepostas colidem', () => {
    expect(verificarContato(esboco([caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0])])).resultado).toBe('aprovado');
    const sep = verificarContato(esboco([caixa('a', [0, 0, 0]), caixa('b', [30, 0, 0])]));
    expect(tipos(sep)).toEqual(['voando:b']);
    expect(sep.achados[0].mm).toBe(10);
    const sob = verificarContato(esboco([caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0])]));
    expect(tipos(sob)).toEqual(['colisao:a+b']);
    expect(sob.achados[0].mm).toBe(10);
    expect(descreverAchado(sob.achados[0])).toContain('a e b se penetram 10,0 mm');
  });

  it('a tolerância aceita folga e penetração pequenas', () => {
    expect(verificarContato(esboco([caixa('a', [0, 0, 0]), caixa('b', [20.8, 0, 0])])).resultado).toBe('aprovado');
    expect(verificarContato(esboco([caixa('a', [0, 0, 0]), caixa('b', [19.2, 0, 0])])).resultado).toBe('aprovado');
  });

  it('padrões: tolerância 1% e folga 10% da maior dimensão, mínimo 1 mm', () => {
    const r = verificarContato({ opcoes: [{ formas: [caixa('a', [0, 0, 0], 1000), caixa('b', [1000, 0, 0], 1000)] }], contato: { usar: true } });
    expect(r.tolerancia).toBe(20);
    expect(r.folga).toBe(200);
    const p = verificarContato({ opcoes: [{ formas: [caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0])] }], contato: { usar: true } });
    expect(p.tolerancia).toBe(1);
  });

  it('anel: eixo no furo não colide, eixo no aro colide, e atravessa declara a ligação', () => {
    const anel = { id: 'anel', tipo: 'anel', diametroExterno: 100, diametroInterno: 60, espessura: 20, eixo: 'z', centro: [0, 0, 0] };
    const eixo = (d) => ({ id: 'eixo', tipo: 'cilindro', diametro: d, comprimento: 100, eixo: 'z', centro: [0, 0, 0] });
    /* dentro do furo, 1 mm de folga radial: encosta na tolerância, sem colisão */
    expect(verificarContato(esboco([anel, eixo(58)])).resultado).toBe('aprovado');
    /* dentro do furo com 5 mm de folga: longe se a folga máxima é 3, e voando sem declaração */
    const solto = verificarContato(esboco([anel, eixo(50)], { folga: 3 }));
    expect(tipos(solto)).toEqual(['longe:anel', 'longe:eixo', 'voando:eixo']);
    expect(solto.achados.find((a) => a.tipo === 'longe').mm).toBe(5);
    expect(tipos(verificarContato(esboco([anel, eixo(50)], { folga: 3, pares: [{ a: 'anel', b: 'eixo', tipo: 'livre' }] })))).toEqual(['voando:eixo']);
    const decl = verificarContato(esboco([anel, eixo(50)], { folga: 6, pares: [{ a: 'eixo', b: 'anel', tipo: 'atravessa' }] }));
    expect(decl.resultado).toBe('aprovado');
    /* cruzando o aro (raio 40 entre 30 e 50): colisão de cerca de 20 mm sem declaração */
    const cruza = verificarContato(esboco([anel, eixo(80)]));
    expect(tipos(cruza)).toEqual(['colisao:anel+eixo']);
    expect(cruza.achados[0].mm).toBe(10);
    expect(verificarContato(esboco([anel, eixo(80)], { pares: [{ a: 'anel', b: 'eixo', tipo: 'atravessa' }] })).resultado).toBe('aprovado');
  });

  it('peça fora do maior grupo conectado voa, com a distância ao grupo', () => {
    const r = verificarContato(esboco([caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0]), caixa('c', [40, 0, 0]), caixa('d', [100, 0, 0])], { folga: 500 }));
    expect(tipos(r)).toEqual(['voando:d']);
    expect(r.achados[0].mm).toBe(40);
  });

  it('cadeia de peças que se encostam forma um só grupo; longe usa a peça mais próxima', () => {
    const r = verificarContato(esboco([caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0]), caixa('c', [40, 0, 0]), caixa('d', [140, 0, 0])], { folga: 50 }));
    expect(tipos(r)).toEqual(['longe:d', 'voando:d']);
    expect(r.achados.find((a) => a.tipo === 'longe').mm).toBe(80);
  });

  it('peça oculta não entra', () => {
    const f = [caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0]), caixa('longe', [900, 0, 0], 20, 20, 20, { oculto: true })];
    expect(verificarContato(esboco(f)).resultado).toBe('aprovado');
    expect(() => verificarContato(esboco(f, { pares: [{ a: 'a', b: 'fantasma', tipo: 'livre' }] }))).toThrow(ErroDeEsboco);
  });

  it('encosta exige contato; livre ignora o par por completo', () => {
    const par = (t) => ({ pares: [{ a: 'a', b: 'b', tipo: t }] });
    expect(verificarContato(esboco([caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0])], par('encosta'))).resultado).toBe('aprovado');
    const solto = verificarContato(esboco([caixa('a', [0, 0, 0]), caixa('b', [30, 0, 0])], par('encosta')));
    expect(tipos(solto)).toContain('par-nao-encosta:a+b');
    expect(solto.achados.find((a) => a.tipo === 'par-nao-encosta')).toMatchObject({ mm: 10, detalhe: 'folga' });
    const fundo = verificarContato(esboco([caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0])], par('encosta')));
    expect(tipos(fundo)).toEqual(['par-nao-encosta:a+b']);
    expect(fundo.achados[0]).toMatchObject({ mm: 10, detalhe: 'penetracao' });
    /* livre: nem colisão nem ligação */
    const livre = verificarContato(esboco([caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0]), caixa('c', [10, 0, 0])], { pares: [{ a: 'a', b: 'c', tipo: 'livre' }, { a: 'b', b: 'c', tipo: 'livre' }] }));
    expect(tipos(livre)).toEqual(['voando:c']);
  });

  it('rotação: a caixa girada 45° tem a quina a 10·√2 do centro', () => {
    const girada = caixa('b', [50 + 10 * Math.SQRT2 + 5, 0, 0], 20, 20, 20, { rotacao: [0, 0, 45] });
    const r = verificarContato(esboco([caixa('a', [0, 0, 0], 100, 100, 100), girada], { folga: 1 }));
    expect(r.achados.find((a) => a.tipo === 'longe').mm).toBe(5);
    const reta = verificarContato(esboco([caixa('a', [0, 0, 0], 100, 100, 100), { ...girada, rotacao: undefined }], { folga: 1 }));
    expect(reta.achados.find((a) => a.tipo === 'longe').mm).toBeCloseTo(9.1, 1);
  });

  it('raio de canto afasta a quina e achatado recorta o cilindro', () => {
    const redonda = caixa('a', [0, 0, 0], 100, 20, 100, { raio: 30 });
    const r = verificarContato(esboco([redonda, caixa('b', [55, 0, 45], 10, 20, 10)], { folga: 1 }));
    expect(r.achados.find((a) => a.tipo === 'longe' && a.pecas[0] === 'a').mm).toBeCloseTo(6.1, 1);
    const cil = { id: 'c', tipo: 'cilindro', diametro: 100, comprimento: 20, eixo: 'z', centro: [0, 0, 0], achatado: { lado: '+x', profundidade: 20 } };
    expect(verificarContato(esboco([cil, caixa('b', [40, 0, 0])])).resultado).toBe('aprovado');
    const solto = verificarContato(esboco([cil, caixa('b', [55, 0, 0])], { folga: 1 }));
    expect(solto.achados.find((a) => a.tipo === 'longe').mm).toBe(15);
  });

  it('caixa com furo: peça dentro do furo não colide', () => {
    const base = { id: 'base', tipo: 'caixa', largura: 100, altura: 20, profundidade: 100, centro: [0, 0, 0], furo: { diametro: 40 } };
    const pino = { id: 'pino', tipo: 'cilindro', diametro: 38, comprimento: 60, eixo: 'y', centro: [0, 0, 0] };
    expect(verificarContato(esboco([base, pino])).resultado).toBe('aprovado');
    expect(tipos(verificarContato(esboco([base, { ...pino, diametro: 60 }])))).toEqual(['colisao:base+pino']);
  });

  it('a opção sobrepõe a raiz e a análise grava o contato no manifesto', async () => {
    const f = [caixa('a', [0, 0, 0]), caixa('b', [100, 0, 0])];
    const e = { contato: { usar: true, tolerancia: 1, folga: 500 }, opcoes: [{ titulo: 'liga', formas: f }, { titulo: 'desliga', contato: { usar: false }, formas: f }, { titulo: 'perto', contato: { folga: 500, pares: [{ a: 'a', b: 'b', tipo: 'atravessa' }] }, formas: f }] };
    const r = verificarContato(e);
    expect(r.opcoes.map((o) => o.resultado)).toEqual(['reprovado', 'desligado', 'aprovado']);
    const pasta = mkdtempSync(join(tmpdir(), 'contato-'));
    const arq = join(pasta, 'c.esboco.json');
    writeFileSync(arq, JSON.stringify(e));
    const { manifesto } = await analisarEsboco(arq);
    expect(manifesto.contato).toMatchObject({ usar: true, tolerancia: 1, folga: 500, resultado: 'reprovado' });
    expect(manifesto.contato.achados[0]).toMatchObject({ tipo: 'voando', pecas: ['b'] });
    const sem = join(pasta, 's.esboco.json');
    writeFileSync(sem, JSON.stringify({ opcoes: e.opcoes.slice(0, 1) }));
    expect((await analisarEsboco(sem)).manifesto.contato).toMatchObject({ usar: false, resultado: 'desligado', achados: [] });
    expect(JSON.parse(readFileSync(join(pasta, 's-analise', 'manifesto.json'), 'utf8')).contato.resultado).toBe('desligado');
  }, 60000);

  it('recusa configuração inválida', () => {
    const f = [caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0])];
    expect(() => verificarContato(esboco(f, { pares: [{ a: 'a', b: 'b', tipo: 'toca' }] }))).toThrow(/tipo/);
    expect(() => verificarContato(esboco(f, { tolerancia: -1 }))).toThrow(/tolerancia/);
    expect(() => verificarContato(esboco(f, { pares: [{ a: 'a', b: 'zz', tipo: 'livre' }] }))).toThrow(/zz/);
  });
});
