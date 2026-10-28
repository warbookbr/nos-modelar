/* O crítico cego também no Marco, o `--medidas` em texto e o Marco incremental (plano "O esboço detalhado coerente", fatia 3). */
import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { avancar, criarEstado, registrarVeredito, unidadesNovasDoMarco } from '../src/condutor.js';
import { briefDoMarco, condutorArquivo, medidasArquivo, PERGUNTAS_DO_MARCO } from '../../../tools/modelar/esboco.mjs';

const caixa = (id, centro, extra = {}) => ({ id, tipo: 'caixa', largura: 20, altura: 20, profundidade: 20, centro, ...extra });
const medida = (nome, valor, mede, extra = {}) => ({ nome, valor, unidade: 'mm', origem: 'ficha', tolerancia: 1, mede, ...extra });
/* quatro caixas em fila, uma unidade cada, com `funcao` em b e em d */
const fila = () => ({
  contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 100 },
  plano: { nivel: 'detalhado', medidas: [medida('altura', 20, 'alturaTotal'), medida('largura', 80, 'larguraTotal'), medida('l2', 80, 'larguraTotal'), medida('l3', 80, 'larguraTotal'), medida('l4', 80, 'larguraTotal')], contrato: { tocam: [['a', 'b']] } },
  unidades: { b: { funcao: 'segundo bloco da fila' }, d: { funcao: 'ponta da fila' } },
  opcoes: [{ titulo: 'T', formas: [caixa('a', [10, 10, 0], { unidade: 'a' }), caixa('b', [30, 10, 0], { unidade: 'b' }), caixa('c', [50, 10, 0], { unidade: 'c' }), caixa('d', [70, 10, 0], { unidade: 'd' })] }],
});
const preparar = () => {
  const dir = mkdtempSync(join(tmpdir(), 'marco-'));
  const arq = join(dir, 'f.esboco.json');
  writeFileSync(arq, JSON.stringify(fila()));
  for (let i = 0; i < 3; i++) condutorArquivo(arq, { proximo: true });
  return { dir, arq };
};

describe('entrega 1: o crítico cego no Marco', () => {
  it('as unidades novas do Marco são as fechadas desde o Marco anterior', () => {
    const { arq } = preparar();
    condutorArquivo(arq, { feito: 'a' });
    condutorArquivo(arq, { feito: 'b' });
    const estado = JSON.parse(readFileSync(`${arq}.condutor.json`, 'utf8'));
    expect(unidadesNovasDoMarco(estado, 25)).toEqual(['a']);
    expect(unidadesNovasDoMarco(estado, 50)).toEqual(['b']);
  });

  it('--feito devolve o Marco novo para o brief, só quando um Marco é cruzado', () => {
    const { arq } = preparar();
    expect(condutorArquivo(arq, { feito: 'a' }).marcoDe).toMatchObject({ limiar: 25, novas: ['a'] });
    expect(condutorArquivo(arq, { feito: 'b' }).marcoDe).toMatchObject({ limiar: 50, novas: ['b'] });
    expect(condutorArquivo(arq, { feito: 'b' }).marcoDe).toBeNull();
  });

  it('o brief do Marco traz as quatro vistas gerais sem legenda, as vistas e a função de cada unidade nova e o relato por unidade', async () => {
    const { dir, arq } = preparar();
    condutorArquivo(arq, { feito: 'a' });
    condutorArquivo(arq, { feito: 'b' });
    const m = condutorArquivo(arq, { feito: 'c' });
    expect(m.marcoDe.limiar).toBe(75);
    const b = await briefDoMarco(arq, 75, { saida: join(dir, 'marco') });
    expect(b.gerais).toHaveLength(4);
    for (const g of b.gerais) { expect(existsSync(g)).toBe(true); expect(g.startsWith(join(dir, 'marco'))).toBe(true); expect(PNG.sync.read(readFileSync(g)).width).toBe(1100); }
    for (const v of ['isometrica', 'frontal', 'lateral', 'superior']) { expect(b.texto).toContain(`-marco-75-${v}.png`); expect(b.texto).toContain(`-unidade-c-${v}.png`); }
    expect(b.texto).not.toContain('-unidade-a-');
    expect(b.texto).toContain('marco de 75%');
    expect(b.texto).toMatch(/Unidade c.*Função da unidade: \(não declarada\)/s);
    /* cada unidade nova leva o texto do --ligacoes (a c toca a b e a d num ponto cada), e o brief fecha com as unidades presas a nada */
    expect(b.texto).toMatch(/Unidade c[\s\S]*Ligações da unidade em texto \(o --ligacoes\):\n\s+unidade c \(1 forma\):\n\s+toca b: 1 ponto[^\n]*\n\s+toca d: 1 ponto[^\n]*\n\s+pontas livres: nenhuma/);
    expect(b.texto).toMatch(/unidades presas a nada: nenhuma\nResponda, olhando só as imagens/);
    expect(b.texto).toMatch(/--veredito marco-75 --nota <0-10> --motivo/);
    expect(PERGUNTAS_DO_MARCO.join(' ')).toMatch(/sem função/);
    expect(PERGUNTAS_DO_MARCO.join(' ')).toMatch(/sem ligação/);
    expect(b.texto).toMatch(/Por unidade.*sem função/s);
    expect(b.texto).toMatch(/Por unidade.*sem ligação/s);
  }, 180000);

  it('aceita o veredito de Marco com o identificador do Marco, e só se o Marco existe', () => {
    const { arq } = preparar();
    condutorArquivo(arq, { feito: 'a' });
    condutorArquivo(arq, { feito: 'b' });
    const r = condutorArquivo(arq, { veredito: 'marco-50', nota: '7', motivo: 'a peça b flutua sobre a base' });
    expect(r.codigo).toBe(0);
    expect(condutorArquivo(arq, { historico: true }).texto).toContain('veredito do crítico 1: marco-50 nota 7 (a peça b flutua sobre a base)');
    expect(() => registrarVeredito(JSON.parse(readFileSync(`${arq}.condutor.json`, 'utf8')), { unidade: 'marco-75', nota: 5, motivo: 'a peça b flutua sobre a base' })).toThrow(/Marco 75%.*não foi registrado/);
  });
});

describe('entrega 2: --medidas em texto', () => {
  it('imprime declarado, medido, desvio e a tolerância de cada medida, sem gravar nada', () => {
    const dir = mkdtempSync(join(tmpdir(), 'medidas-'));
    const arq = join(dir, 'm.esboco.json');
    const e = fila();
    e.plano.medidas = [medida('altura', 20, 'alturaTotal'), medida('largura', 85, 'larguraTotal', { tolerancia: 2 })];
    writeFileSync(arq, JSON.stringify(e));
    const antes = readFileSync(arq, 'utf8');
    const r = medidasArquivo(arq);
    expect(r.codigo).toBe(0);
    expect(r.texto).toContain('altura: declarado 20 mm, medido 20 mm, desvio 0 mm (tolerância 1 mm), dentro');
    expect(r.texto).toContain('largura: declarado 85 mm, medido 80 mm, desvio -5 mm (tolerância 2 mm), fora');
    expect(readFileSync(arq, 'utf8')).toBe(antes);
    expect(statSync(dir).isDirectory()).toBe(true);
    expect(existsSync(`${arq}.condutor.json`)).toBe(false);
  });

  it('a razão sai em texto com os dois operandos e a faixa, e a picape baixa fica fora da faixa', () => {
    const dir = mkdtempSync(join(tmpdir(), 'razao-'));
    const arq = join(dir, 'p.esboco.json');
    const picape = (altura) => ({
      plano: { medidas: [{ nome: 'alturaPeloComprimento', origem: 'ficha', mede: { razao: ['alturaTotal', 'profundidadeTotal'], faixa: [0.3, 0.4] } }] },
      opcoes: [{ titulo: 'T', formas: [{ id: 'corpo', tipo: 'caixa', largura: 1800, altura, profundidade: 5000, centro: [0, altura / 2, 0] }] }],
    });
    writeFileSync(arq, JSON.stringify(picape(1450)));
    expect(medidasArquivo(arq).texto).toContain('alturaPeloComprimento: razão 0,29 (1450 mm sobre 5000 mm), faixa 0,3 a 0,4, fora (abaixo da faixa por 0,01)');
    writeFileSync(arq, JSON.stringify(picape(1650)));
    expect(medidasArquivo(arq).texto).toContain('alturaPeloComprimento: razão 0,33 (1650 mm sobre 5000 mm), faixa 0,3 a 0,4, dentro');
  });

  it('sem medidas no plano diz isso e sai com 0', () => {
    const dir = mkdtempSync(join(tmpdir(), 'medidas-'));
    const arq = join(dir, 'm.esboco.json');
    writeFileSync(arq, JSON.stringify({ opcoes: [{ titulo: 'T', formas: [caixa('a', [0, 10, 0])] }] }));
    const r = medidasArquivo(arq);
    expect(r.codigo).toBe(0);
    expect(r.texto).toMatch(/sem plano\.medidas/);
  });
});

describe('entrega 3: o Marco incremental', () => {
  it('já vinha da fatia 1: --feito imprime só o Marco novo e a situação sem ação lista os registrados', () => {
    const { arq } = preparar();
    expect(condutorArquivo(arq, { feito: 'a' }).texto.match(/marco de \d+%/g)).toEqual(['marco de 25%']);
    expect(condutorArquivo(arq, { feito: 'b' }).texto.match(/marco de \d+%/g)).toEqual(['marco de 50%']);
    expect(condutorArquivo(arq, {}).texto.match(/marco de \d+%/g)).toEqual(['marco de 25%', 'marco de 50%']);
    expect(avancar).toBeTypeOf('function');
    expect(criarEstado).toBeTypeOf('function');
  });
});
