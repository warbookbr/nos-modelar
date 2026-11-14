/* proporcoes.test.mjs — a fonte única de proporção: fórmula, medidas, o andaime gerado, as TABELAs marcadas, a conferência que acusa a edição feita só num lugar e a propagação no braço do robô. */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { avaliarFormula, comoCLI, conferirProporcoes, ErroDasProporcoes, escreverProporcoes, gerarAndaime, lerProporcoes, resolverMedidas } from './proporcoes.mjs';

const FIXTURE = 'tools/fixtures/proporcoes/estante';
const ROBO = 'procedural/pecas/robo-humanoide';
const temporarios = [];

function copiar(origem) {
  const pasta = mkdtempSync(join(tmpdir(), 'proporcoes-'));
  temporarios.push(pasta);
  cpSync(origem, pasta, { recursive: true });
  return pasta;
}
const lerJson = (c) => JSON.parse(readFileSync(c, 'utf8'));
const trocar = (arquivo, de, para) => {
  const t = readFileSync(arquivo, 'utf8');
  if (!t.includes(de)) throw new Error(`'${de}' não está em ${arquivo}`);
  writeFileSync(arquivo, t.replace(de, para));
};
const mudarMedida = (caminho, nome, valor) => {
  const doc = lerJson(caminho);
  doc.medidas[nome] = valor;
  writeFileSync(caminho, `${JSON.stringify(doc, null, 2)}\n`);
};

afterEach(() => { while (temporarios.length) rmSync(temporarios.pop(), { recursive: true, force: true }); });

describe('fórmula', () => {
  const valor = (n) => ({ a: 10, b: 4 })[n] ?? (() => { throw new Error(`sem ${n}`); })();
  it('respeita precedência, parênteses e menos unário', () => {
    expect(avaliarFormula('a + b * 2', valor)).toBe(18);
    expect(avaliarFormula('(a + b) * 2', valor)).toBe(28);
    expect(avaliarFormula('-a / 4 + 1', valor)).toBe(-1.5);
  });
  it('recusa símbolo fora da gramática, parêntese aberto e divisão por zero, dizendo o recebido e o esperado', () => {
    expect(() => avaliarFormula('a ^ 2', valor)).toThrow(/recebi '\^' na fórmula "=a \^ 2"; esperava números, nomes de medida/);
    expect(() => avaliarFormula('(a + b', valor)).toThrow(/parêntese sem fechar/);
    expect(() => avaliarFormula('a / (b - 4)', valor)).toThrow(/divisão por zero/);
    expect(() => avaliarFormula('a b', valor)).toThrow(/sobra/);
  });
});

describe('medidas', () => {
  it('resolve fórmulas por dependência, em qualquer ordem', () => {
    const m = resolverMedidas({ medidas: { c: '=b * 2', a: 10, b: '=a + 1' } });
    expect(m).toEqual({ a: 10, b: 11, c: 22 });
  });
  it('recusa ciclo e nome desconhecido com o conserto', () => {
    expect(() => resolverMedidas({ medidas: { a: '=b', b: '=a' } })).toThrow(/o ciclo a -> b -> a; esperava medidas que dependem só de medidas já definidas/);
    expect(() => resolverMedidas({ medidas: { a: '=alturaa + 1', altura: 3 } })).toThrow(/a medida 'alturaa'; esperava um destes nomes: a, altura\.\n {2}conserte com: acrescente 'alturaa'/);
  });
  it('recusa formato e medida malformados', () => {
    const pasta = copiar(FIXTURE);
    const arquivo = join(pasta, 'proporcoes.json');
    mudarMedida(arquivo, 'profundidade', 'trezentos');
    expect(() => lerProporcoes(arquivo)).toThrow(/medidas\.profundidade = "trezentos"; esperava um número ou uma fórmula/);
    writeFileSync(arquivo, JSON.stringify({ formato: 'outro@1', medidas: { a: 1 } }));
    expect(() => lerProporcoes(arquivo)).toThrow(/formato "outro@1"; esperava "mecanifica.proporcoes@1"/);
  });
});

describe('fixture neutra (estante)', () => {
  it('o andaime e as TABELAs que estão no repositório concordam com as proporções', () => {
    expect(conferirProporcoes(`${FIXTURE}/proporcoes.json`)).toEqual([]);
    const doc = lerProporcoes(`${FIXTURE}/proporcoes.json`);
    const andaime = gerarAndaime(doc, resolverMedidas(doc));
    expect(andaime.volumes.find((v) => v.id === 'prateleira-alta').centro).toEqual([400, 727, 150]);
    expect(andaime.volumes.find((v) => v.id === 'topo').centro[1]).toBe(1791);
  });

  it('trocar uma medida só no proporcoes.json faz a conferência acusar o andaime e cada TABELA, e --escrever propaga tudo', () => {
    const pasta = copiar(FIXTURE);
    const arquivo = join(pasta, 'proporcoes.json');
    mudarMedida(arquivo, 'larguraDaEstante', 900);
    const antes = conferirProporcoes(arquivo);
    expect(antes.map((d) => d.lugar)).toEqual(['andaime.json.envelope.max[0]', 'pecas/prateleira/receita.js:3']);
    expect(antes[0].mensagem).toMatch(/andaime\.json\.envelope\.max\[0\] = 800; esperava 900, o que as proporções dão\.\n {2}conserte com: npm run proporcoes -- --proporcoes=.*--escrever/);
    expect(antes[1].mensagem).toMatch(/pecas\/prateleira\/receita\.js:3: largura = 800; esperava 900, o valor de 'larguraDaEstante'/);

    const mudou = escreverProporcoes(arquivo);
    expect(mudou).toEqual(['andaime.json', 'pecas/prateleira/receita.js']);
    expect(lerJson(join(pasta, 'andaime.json')).envelope.max[0]).toBe(900);
    expect(readFileSync(join(pasta, 'pecas/prateleira/receita.js'), 'utf8')).toMatch(/largura: 900, \/\/ @proporcao larguraDaEstante\n/);
    expect(readFileSync(join(pasta, 'pecas/prateleira/receita.js'), 'utf8')).toMatch(/espessura: 18, \/\/ @proporcao espessuraDaTabua — proposta\n/);
    expect(conferirProporcoes(arquivo)).toEqual([]);
    expect(escreverProporcoes(arquivo)).toEqual([]);
  });

  it('acusa a edição feita só no andaime, mesmo em volume e número fundo', () => {
    const pasta = copiar(FIXTURE);
    const andaime = join(pasta, 'andaime.json');
    const doc = lerJson(andaime);
    doc.volumes[1].dimensoes[1] = 20;
    writeFileSync(andaime, JSON.stringify(doc, null, 2));
    const d = conferirProporcoes(join(pasta, 'proporcoes.json'));
    expect(d).toHaveLength(1);
    expect(d[0].mensagem).toMatch(/andaime\.json\.volumes\[1\]\.dimensoes\[1\] = 20; esperava 18, o que as proporções dão/);
  });

  it('acusa a edição feita só numa TABELA, na linha certa, inclusive em chave com aspas e sem vírgula', () => {
    const pasta = copiar(FIXTURE);
    trocar(join(pasta, 'pecas/montante/receita.js'), 'altura: 1800', 'altura: 1750');
    trocar(join(pasta, 'pecas/montante/receita.js'), '"profundidade": 300', '"profundidade": 310');
    const d = conferirProporcoes(join(pasta, 'proporcoes.json'));
    expect(d.map((x) => x.lugar)).toEqual(['pecas/montante/receita.js:3', 'pecas/montante/receita.js:6']);
    expect(d[0].mensagem).toMatch(/altura = 1750; esperava 1800, o valor de 'alturaDaEstante'/);
    expect(d[1].mensagem).toMatch(/profundidade = 310; esperava 300/);
  });

  it('acusa a marca que cita medida inexistente, sem calar', () => {
    const pasta = copiar(FIXTURE);
    trocar(join(pasta, 'pecas/montante/receita.js'), '@proporcao alturaDoVao', '@proporcao alturaDoVa0');
    const [d] = conferirProporcoes(join(pasta, 'proporcoes.json'));
    expect(d.mensagem).toMatch(/marca '@proporcao alturaDoVa0', que não é medida; esperava um destes nomes: alturaDaEstante/);
    expect(() => escreverProporcoes(join(pasta, 'proporcoes.json'))).toThrow(/alturaDoVa0/);
  });

  it('acusa o andaime que sumiu', () => {
    const pasta = copiar(FIXTURE);
    rmSync(join(pasta, 'andaime.json'));
    const [d] = conferirProporcoes(join(pasta, 'proporcoes.json'));
    expect(d.mensagem).toMatch(/o andaime andaime\.json, que não existe/);
  });

  it('a CLI confere (0), acusa (1) e escreve, e recusa a chamada sem o arquivo', () => {
    const pasta = copiar(FIXTURE);
    const arquivo = join(pasta, 'proporcoes.json');
    const linhas = [];
    const saida = (t) => linhas.push(t);
    expect(comoCLI([`--proporcoes=${arquivo}`], saida)).toBe(0);
    mudarMedida(arquivo, 'espessuraDaTabua', 20);
    expect(comoCLI([`--proporcoes=${arquivo}`], saida)).toBe(1);
    expect(linhas.join('\n')).toMatch(/divergência\(s\):\n- /);
    expect(comoCLI([`--proporcoes=${arquivo}`, '--escrever'], saida)).toBe(0);
    expect(comoCLI([`--proporcoes=${arquivo}`], saida)).toBe(0);
    expect(() => comoCLI([], saida)).toThrow(/nenhum arquivo de proporções; esperava --proporcoes=<proporcoes.json>/);
  });
});

describe('robô humanoide (braço opção B)', () => {
  it('o andaime e as TABELAs do repositório concordam com o proporcoes.json', () => {
    expect(conferirProporcoes(`${ROBO}/proporcoes.json`)).toEqual([]);
  });

  it('trocar o braço de 330 para 340 só no arquivo único propaga ao andaime e às receitas, e a conferência acusa antes de escrever', () => {
    const pasta = copiar(ROBO);
    const arquivo = join(pasta, 'proporcoes.json');
    const doc0 = lerJson(arquivo);
    expect(doc0.medidas.comprimentoDoBraco).toBe(330);
    mudarMedida(arquivo, 'comprimentoDoBraco', 340);
    const antes = conferirProporcoes(arquivo);
    expect(antes.some((d) => d.lugar.startsWith('andaime.json'))).toBe(true);
    expect(antes.filter((d) => d.lugar.startsWith('partes/braco/receita.js'))).toHaveLength(2);
    escreverProporcoes(arquivo);
    expect(conferirProporcoes(arquivo)).toEqual([]);
    const andaime = lerJson(join(pasta, 'andaime.json'));
    const cotovelo = andaime.volumes.find((v) => v.id === 'cotovelo');
    expect(cotovelo.centro[1]).toBe(1095);
    expect(andaime.volumes.find((v) => v.id === 'punho').centro[1]).toBe(865);
    expect(andaime.volumes.find((v) => v.id === 'distal-medio').centro[1]).toBe(684.5);
    expect(andaime.portas.find((p) => p.id === 'cotovelo').interface.centro[1]).toBe(1095);
    expect(andaime.envelope.min[1]).toBe(670);
    const receita = readFileSync(join(pasta, 'partes/braco/receita.js'), 'utf8');
    expect(receita).toMatch(/comprimentoEntreCentros: 340, \/\/ @proporcao comprimentoDoBraco/);
    expect(receita).toMatch(/"milimetros": 340 \/\/ @proporcao comprimentoDoBraco/);
    expect(readFileSync(join(pasta, 'partes/antebraco/receita.js'), 'utf8')).toMatch(/comprimentoEntreCentros: 230,/);
  });

  it('a falange distal é derivada: encurtar a mão encurta só a falange distal e o andaime a segue', () => {
    const pasta = copiar(ROBO);
    const arquivo = join(pasta, 'proporcoes.json');
    mudarMedida(arquivo, 'comprimentoDaMao', 186);
    escreverProporcoes(arquivo);
    expect(readFileSync(join(pasta, 'partes/falange-distal/receita.js'), 'utf8')).toMatch(/comprimento: 15, \/\/ @proporcao falangeDistal/);
    expect(readFileSync(join(pasta, 'partes/falange-media/receita.js'), 'utf8')).toMatch(/comprimento: 24,/);
    expect(lerJson(join(pasta, 'andaime.json')).volumes.find((v) => v.id === 'distal-indicador').dimensoes[1]).toBe(15);
  });
});

describe('recusa de tipo', () => {
  it('as falhas são ErroDasProporcoes', () => {
    expect(() => resolverMedidas({ medidas: { a: '=b' } })).toThrow(ErroDasProporcoes);
  });
});
