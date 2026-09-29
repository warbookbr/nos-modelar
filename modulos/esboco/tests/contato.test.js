/* Gate de contato do esboço: colisão, folga, voando e pares declarados. */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { desenharEsboco, ErroDeEsboco } from '../src/index.js';
import { descreverAchado, descreverAtravessamento, descreverSilenciado, MINIMO_DO_MOTIVO, verificarContato } from '../src/contato.js';
import { analisarEsboco } from '../../../tools/mecanifica/esboco.mjs';

const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const esboco = (formas, contato = {}, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], contato: { usar: true, tolerancia: 1, folga: 50, ...contato }, ...extra });
const motivo = 'as peças se cruzam de propósito neste teste';
const atravessa = (a, b, max, extra = {}) => ({ a, b, tipo: 'atravessa', max, motivo, ...extra });
const livre = (a, b, extra = {}) => ({ a, b, tipo: 'livre', motivo, ...extra });
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

  it('sem "contato" o arquivo antigo gera o mesmo SVG e o mesmo bloco de manifesto, byte a byte', () => {
    const pasta = new URL('./fixtures/', import.meta.url);
    for (const nome of ['casa', 'mancal-eixo', 'teste-cubo', 'moto']) {
      const { contato, ...antigo } = JSON.parse(readFileSync(new URL(`${nome}.esboco.json`, pasta), 'utf8'));
      const svg = desenharEsboco(antigo).svg;
      /* ligar o gate, com ou sem pares, nunca muda o desenho */
      expect(desenharEsboco({ ...antigo, contato: { usar: true, pares: [] } }).svg).toBe(svg);
      if (contato) expect(desenharEsboco({ ...antigo, contato }).svg).toBe(svg);
      else expect(JSON.stringify(verificarContato(antigo))).toBe('{"usar":false,"tolerancia":null,"folga":null,"achados":[],"resultado":"desligado","opcoes":[]}');
    }
    /* referência fixa: o SVG que o repositório já guardava para a casa */
    const casa = JSON.parse(readFileSync(new URL('casa.esboco.json', pasta), 'utf8'));
    expect(desenharEsboco(casa).svg).toBe(readFileSync(new URL('casa.svg', pasta), 'utf8'));
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

  it('padrões: tolerância 1%, penetração 0,3% e folga 10% da maior dimensão, mínimo 1 mm', () => {
    const r = verificarContato({ opcoes: [{ formas: [caixa('a', [0, 0, 0], 1000), caixa('b', [1000, 0, 0], 1000)] }], contato: { usar: true } });
    expect(r.tolerancia).toBe(20);
    /* antes a penetração aceita era a própria tolerância (20 mm); agora é 0,3% de 2000 mm */
    expect(r.penetracao).toBe(6);
    expect(r.folga).toBe(200);
    const p = verificarContato({ opcoes: [{ formas: [caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0])] }], contato: { usar: true } });
    expect(p.tolerancia).toBe(1);
    expect(p.penetracao).toBe(1);
  });

  it('penetração: 10 mm reprova com o padrão pequeno e aprova quando declarada maior', () => {
    /* conjunto de 2000 mm: penetração padrão 6 mm, tolerância 20 mm. Antes 10 mm passava pela tolerância. */
    const f = [caixa('a', [0, 0, 0], 1000), caixa('b', [990, 0, 0], 1000)];
    const base = { opcoes: [{ titulo: 'T', formas: f }], contato: { usar: true } };
    const r = verificarContato(base);
    expect(tipos(r)).toEqual(['colisao:a+b']);
    expect(r.achados[0].mm).toBe(10);
    const maior = verificarContato({ ...base, contato: { usar: true, penetracao: 12 } });
    expect(maior.resultado).toBe('aprovado');
    expect(maior.penetracao).toBe(12);
    /* a opção sobrepõe a raiz */
    const opcao = verificarContato({ opcoes: [{ titulo: 'T', formas: f, contato: { penetracao: 12 } }], contato: { usar: true } });
    expect(opcao.resultado).toBe('aprovado');
    expect(opcao.opcoes[0].penetracao).toBe(12);
    /* a tolerância continua só ligando peças: folga de 15 mm liga, penetração declarada não a altera */
    expect(verificarContato({ opcoes: [{ formas: [caixa('a', [0, 0, 0], 1000), caixa('b', [1015, 0, 0], 1000)] }], contato: { usar: true } }).resultado).toBe('aprovado');
    /* encosta usa a penetração para a sobreposição */
    const encosta = { pares: [{ a: 'a', b: 'b', tipo: 'encosta' }] };
    expect(verificarContato({ ...base, contato: { usar: true, ...encosta } }).achados[0]).toMatchObject({ tipo: 'par-nao-encosta', detalhe: 'penetracao', mm: 10 });
    expect(verificarContato({ ...base, contato: { usar: true, penetracao: 12, ...encosta } }).resultado).toBe('aprovado');
  });

  it('atravessa dentro do max aprova e reporta a profundidade, do maior para o menor', () => {
    const f = [caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0]), caixa('c', [-5, 0, 0])];
    const pares = [atravessa('a', 'b', 20), atravessa('a', 'c', 20), atravessa('b', 'c', 20)];
    const r = verificarContato(esboco(f, { pares }));
    expect(r.resultado).toBe('aprovado');
    expect(r.atravessamentos).toEqual([
      { opcao: 'T', a: 'a', b: 'c', penetracao_mm: 15, max_mm: 20 },
      { opcao: 'T', a: 'a', b: 'b', penetracao_mm: 10, max_mm: 20 },
      { opcao: 'T', a: 'b', b: 'c', penetracao_mm: 5, max_mm: 20 },
    ]);
    expect(descreverAtravessamento(r.atravessamentos[0])).toBe('[T] a e c se atravessam 15,0 mm (máximo declarado 20,0 mm)');
    /* par declarado que apenas encosta não aparece */
    expect(verificarContato(esboco([caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0])], { pares: [atravessa('a', 'b', 5)] })).atravessamentos).toEqual([]);
  });

  describe('contrato de declaração', () => {
    const dois = [caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0])];
    const recusa = (pares, casa, contato = {}) => expect(() => verificarContato(esboco(dois, { pares, ...contato }))).toThrow(casa);

    it('atravessa e livre sem motivo são recusados, com o par, o campo e um exemplo', () => {
      for (const tipo of ['atravessa', 'livre']) {
        const par = { a: 'a', b: 'b', tipo, ...(tipo === 'atravessa' ? { max: 15 } : {}) };
        let erro;
        try { verificarContato(esboco(dois, { pares: [par] })); } catch (e) { erro = e; }
        expect(erro).toBeInstanceOf(ErroDeEsboco);
        expect(erro.message).toContain('a ↔ b');
        expect(erro.message).toContain(`tipo ${tipo}`);
        expect(erro.message).toContain('falta o campo "motivo"');
        expect(erro.message).toContain('Exemplo: { "a": "a", "b": "b", "tipo": "' + tipo + '"');
        expect(erro.message).toContain('"motivo": "');
      }
    });

    it(`motivo com menos de ${MINIMO_DO_MOTIVO} caracteres é recusado, e com ${MINIMO_DO_MOTIVO} passa`, () => {
      expect(MINIMO_DO_MOTIVO).toBe(15);
      recusa([livre('a', 'b', { motivo: 'curto' })], /o "motivo" tem 5 caracteres e o mínimo é 15/);
      recusa([atravessa('a', 'b', 15, { motivo: 'x'.repeat(14) })], /tem 14 caracteres/);
      /* espaços nas pontas não contam */
      recusa([livre('a', 'b', { motivo: `   ${'x'.repeat(14)}   ` })], /tem 14 caracteres/);
      recusa([livre('a', 'b', { motivo: 12 })], /motivo.*texto/);
      expect(verificarContato(esboco(dois, { pares: [atravessa('a', 'b', 15, { motivo: 'x'.repeat(15) })] })).resultado).toBe('aprovado');
    });

    it('atravessa sem max é recusado com exemplo', () => {
      let erro;
      try { verificarContato(esboco(dois, { pares: [{ a: 'a', b: 'b', tipo: 'atravessa', motivo }] })); } catch (e) { erro = e; }
      expect(erro).toBeInstanceOf(ErroDeEsboco);
      expect(erro.message).toContain('a ↔ b');
      expect(erro.message).toContain('precisa de "max"');
      expect(erro.message).toContain('"tipo": "atravessa", "max": 15, "motivo"');
      /* livre não pede max */
      expect(() => verificarContato(esboco(dois, { pares: [livre('a', 'b')] }))).not.toThrow();
    });

    it('encosta não exige motivo e aceita motivo opcional', () => {
      const r = verificarContato(esboco([caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0])], { pares: [{ a: 'a', b: 'b', tipo: 'encosta' }] }));
      expect(r.resultado).toBe('aprovado');
      expect(r.silenciados).toEqual([]);
      expect(verificarContato(esboco([caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0])], { pares: [{ a: 'a', b: 'b', tipo: 'encosta', motivo: 'a base assenta no apoio' }] })).resultado).toBe('aprovado');
    });

    it('a declaração vale nos pares da raiz e nos da opção ativa, e só com o contato ligado', () => {
      const semMotivo = { a: 'a', b: 'b', tipo: 'livre' };
      /* par da opção */
      expect(() => verificarContato({ contato: { usar: true }, opcoes: [{ titulo: 'T', formas: dois, contato: { pares: [semMotivo] } }] })).toThrow(/opção 1.*a ↔ b/);
      /* opção desligada não é cobrada */
      expect(verificarContato({ contato: { usar: true }, opcoes: [{ titulo: 'T', formas: dois }, { titulo: 'U', formas: dois, contato: { usar: false, pares: [semMotivo] } }] }).opcoes[1].resultado).toBe('desligado');
      /* desligado por inteiro: nada é validado nem medido */
      expect(verificarContato({ contato: { usar: false, pares: [semMotivo] }, opcoes: [{ formas: dois }] }).resultado).toBe('desligado');
      expect(verificarContato({ contato: { pares: [{ ...semMotivo, tipo: 'atravessa' }] }, opcoes: [{ formas: dois }] }).resultado).toBe('desligado');
    });

    it('a mensagem chega como "esboço recusado" na linha de comando', async () => {
      const pasta = mkdtempSync(join(tmpdir(), 'contato-'));
      const arq = join(pasta, 'r.esboco.json');
      writeFileSync(arq, JSON.stringify(esboco(dois, { pares: [{ a: 'a', b: 'b', tipo: 'atravessa', max: 15 }] })));
      const r = spawnSync(process.execPath, ['tools/mecanifica/esboco.mjs', arq], { encoding: 'utf8' });
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/^esboço recusado: .*a ↔ b.*falta o campo "motivo".*Exemplo:/);
    }, 60000);
  });

  it('livre continua ignorando o par, mas o relato o lista em pares silenciados com o motivo', () => {
    const f = [caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0]), caixa('c', [10, 0, 0])];
    const r = verificarContato(esboco(f, { pares: [livre('a', 'c', { motivo: 'o enfeite fica sobre a base de propósito' }), livre('b', 'c')] }));
    expect(tipos(r)).toEqual(['voando:c']);
    expect(r.silenciados).toEqual([
      { opcao: 'T', a: 'a', b: 'c', motivo: 'o enfeite fica sobre a base de propósito' },
      { opcao: 'T', a: 'b', b: 'c', motivo },
    ]);
    expect(descreverSilenciado(r.silenciados[0])).toBe('[T] a e c ignorados (livre): o enfeite fica sobre a base de propósito');
  });

  it('a linha de comando imprime "pares silenciados:" ao lado dos atravessamentos e o manifesto os traz', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'contato-'));
    const arq = join(pasta, 'l.esboco.json');
    const f = [caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0]), caixa('c', [20, 0, 0])];
    writeFileSync(arq, JSON.stringify(esboco(f, { pares: [atravessa('a', 'b', 12), livre('a', 'c', { motivo: 'a peça c só ilustra o remate' })] })));
    const r = spawnSync(process.execPath, ['tools/mecanifica/esboco.mjs', arq], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('atravessamentos declarados:\n  [T] a e b se atravessam 10,0 mm (máximo declarado 12,0 mm)\npares silenciados:\n  [T] a e c ignorados (livre): a peça c só ilustra o remate\n');
    const { manifesto } = await analisarEsboco(arq);
    expect(manifesto.contato.silenciados).toEqual([{ opcao: 'T', a: 'a', b: 'c', motivo: 'a peça c só ilustra o remate' }]);
  }, 120000);

  it('atravessa com max: passar do máximo reprova, ficar dentro aprova e informa', () => {
    const f = [caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0])];
    const par = (max) => ({ pares: [atravessa('a', 'b', max)] });
    const estoura = verificarContato(esboco(f, par(8)));
    expect(estoura.resultado).toBe('reprovado');
    expect(estoura.achados).toEqual([{ opcao: 'T', tipo: 'atravessa-excedido', pecas: ['a', 'b'], mm: 10, max: 8 }]);
    expect(descreverAchado(estoura.achados[0])).toBe('[T] atravessa excedido: a e b se atravessam 10,0 mm, acima do máximo declarado de 8,0 mm');
    expect(estoura.atravessamentos).toEqual([{ opcao: 'T', a: 'a', b: 'b', penetracao_mm: 10, max_mm: 8 }]);
    const cabe = verificarContato(esboco(f, par(10)));
    expect(cabe.resultado).toBe('aprovado');
    expect(cabe.atravessamentos[0]).toMatchObject({ penetracao_mm: 10, max_mm: 10 });
    expect(() => verificarContato(esboco(f, { pares: [{ a: 'a', b: 'b', tipo: 'encosta', max: 5 }] }))).toThrow(/atravessa/);
    expect(() => verificarContato(esboco(f, par(-1)))).toThrow(/max/);
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
    expect(tipos(verificarContato(esboco([anel, eixo(50)], { folga: 3, pares: [livre('anel', 'eixo')] })))).toEqual(['voando:eixo']);
    const decl = verificarContato(esboco([anel, eixo(50)], { folga: 6, pares: [atravessa('eixo', 'anel', 30)] }));
    expect(decl.resultado).toBe('aprovado');
    /* cruzando o aro (raio 40 entre 30 e 50): colisão de cerca de 20 mm sem declaração */
    const cruza = verificarContato(esboco([anel, eixo(80)]));
    expect(tipos(cruza)).toEqual(['colisao:anel+eixo']);
    expect(cruza.achados[0].mm).toBe(10);
    expect(verificarContato(esboco([anel, eixo(80)], { pares: [atravessa('anel', 'eixo', 20)] })).resultado).toBe('aprovado');
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
    expect(() => verificarContato(esboco(f, { pares: [livre('a', 'fantasma')] }))).toThrow(ErroDeEsboco);
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
    const soltos = verificarContato(esboco([caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0]), caixa('c', [10, 0, 0])], { pares: [livre('a', 'c'), livre('b', 'c')] }));
    expect(tipos(soltos)).toEqual(['voando:c']);
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
    const e = { contato: { usar: true, tolerancia: 1, folga: 500 }, opcoes: [{ titulo: 'liga', formas: f }, { titulo: 'desliga', contato: { usar: false }, formas: f }, { titulo: 'perto', contato: { folga: 500, pares: [atravessa('a', 'b', 20)] }, formas: f }] };
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
    /* sem "contato" o bloco do manifesto é exatamente o de antes do limiar de penetração */
    expect(JSON.stringify((await analisarEsboco(sem)).manifesto.contato)).toBe('{"usar":false,"tolerancia":null,"folga":null,"achados":[],"resultado":"desligado","opcoes":[]}');
    /* com "contato", o manifesto traz penetração e atravessamentos */
    const com = join(pasta, 'a.esboco.json');
    writeFileSync(com, JSON.stringify({ contato: { usar: true, pares: [atravessa('a', 'b', 20)] }, opcoes: [{ titulo: 'A', formas: [caixa('a', [0, 0, 0]), caixa('b', [10, 0, 0])] }] }));
    expect((await analisarEsboco(com)).manifesto.contato).toMatchObject({ resultado: 'aprovado', penetracao: 1, atravessamentos: [{ opcao: 'A', a: 'a', b: 'b', penetracao_mm: 10, max_mm: 20 }], silenciados: [] });
  }, 60000);

  it('recusa configuração inválida', () => {
    const f = [caixa('a', [0, 0, 0]), caixa('b', [20, 0, 0])];
    expect(() => verificarContato(esboco(f, { pares: [{ a: 'a', b: 'b', tipo: 'toca' }] }))).toThrow(/tipo/);
    expect(() => verificarContato(esboco(f, { tolerancia: -1 }))).toThrow(/tolerancia/);
    expect(() => verificarContato(esboco(f, { penetracao: -1 }))).toThrow(/penetracao/);
    expect(() => verificarContato(esboco(f, { pares: [livre('a', 'zz')] }))).toThrow(/zz/);
  });
});
