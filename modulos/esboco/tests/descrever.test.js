/* Leitura do esboço em texto (`--descrever`, `--descrever --mudou`) e âncoras nomeadas. */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ancorasDe, desenharEsboco, ErroDeEsboco, resolverOpcao } from '../src/index.js';
import { descreverEsboco, diferenca, formatarDescricao } from '../src/descrever.js';
import { descreverArquivo } from '../../../tools/mecanifica/esboco.mjs';

const fixture = (nome) => fileURLToPath(new URL(`./fixtures/${nome}`, import.meta.url));
const pequeno = () => ({
  opcoes: [{
    titulo: 'T',
    formas: [
      { id: 'base', tipo: 'caixa', largura: 100, altura: 100, profundidade: 100, centro: [0, 50, 0] },
      { id: 'pino', tipo: 'cilindro', diametro: 40, comprimento: 50, eixo: 'y', centro: [0, 125, 0] },
      { id: 'anel', tipo: 'anel', diametroExterno: 100, diametroInterno: 60, espessura: 20, eixo: 'x', centro: [500, 50, 0] },
    ],
  }],
});
const perto = (v, esperado) => v.forEach((x, i) => expect(x).toBeCloseTo(esperado[i], 6));

describe('âncoras nomeadas', () => {
  it('caixa, cilindro e anel rotacionados dão as pontas e as faces no mundo', () => {
    const [caixa, cil, anel] = resolverOpcao({
      formas: [
        { id: 'c', tipo: 'caixa', largura: 100, altura: 40, profundidade: 20, centro: [10, 0, 0], rotacao: { eixo: 'z', angulo: 90 } },
        { id: 'e', tipo: 'cilindro', diametro: 20, comprimento: 100, eixo: 'y', centro: [0, 0, 0], rotacao: { eixo: 'z', angulo: 90 } },
        { id: 'a', tipo: 'anel', diametroExterno: 100, diametroInterno: 60, espessura: 20, eixo: 'x', centro: [0, 0, 0], rotacao: { eixo: 'z', angulo: 90 } },
      ],
    });
    const ac = ancorasDe(caixa);
    expect(Object.keys(ac)).toEqual(['centro', '+x', '-x', '+y', '-y', '+z', '-z']);
    perto(ac['+y'], [10, 50, 0]);
    perto(ac['-x'], [-10, 0, 0]);
    perto(ac['+z'], [10, 0, 10]);
    const ae = ancorasDe(cil);
    perto(ae.inicio, [50, 0, 0]);
    perto(ae.fim, [-50, 0, 0]);
    perto(ae['+x'], [50, 0, 0]);
    const aa = ancorasDe(anel);
    perto(aa.inicio, [0, -10, 0]);
    perto(aa.fim, [0, 10, 0]);
    perto(aa['+y'], [0, 10, 0]);
  });

  it('centro por referência soma o desloca depois e aceita forma declarada depois', () => {
    const [b, a] = resolverOpcao({
      formas: [
        { id: 'b', tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, centro: 'a.fim', desloca: [1, 2, 3] },
        { id: 'a', tipo: 'cilindro', diametro: 20, comprimento: 100, eixo: 'y', centro: [0, 50, 0] },
      ],
    });
    perto(a.centro, [0, 50, 0]);
    perto(b.centro, [1, 102, 3]);
    const [f, m] = resolverOpcao({
      formas: [
        { id: 'f', tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, centro: 'm.-z' },
        { id: 'm', tipo: 'caixa', largura: 20, altura: 20, profundidade: 40, centro: [0, 0, 100], oculto: true },
      ],
    });
    perto(f.centro, [0, 0, 80]);
    expect(m.forma.oculto).toBe(true);
  });

  it('recusa ciclo, id inexistente e âncora inexistente dizendo a referência, a forma e as âncoras válidas', () => {
    const caixa = (id, centro) => ({ id, tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, centro });
    expect(() => resolverOpcao({ formas: [caixa('a', 'b.centro'), caixa('b', 'a.centro')] }))
      .toThrow(/forma "b": referência circular em "centro": "a\.centro".*âncoras válidas de "a": centro, \+x/);
    expect(() => resolverOpcao({ formas: [caixa('a', 'a.centro')] })).toThrow(/referência circular/);
    expect(() => resolverOpcao({ formas: [caixa('a', 'z.centro')] })).toThrow(/"z\.centro".*"z" não existe.*ids: a/);
    let erro;
    try { resolverOpcao({ formas: [{ id: 'e', tipo: 'cilindro', diametro: 5, comprimento: 5, centro: [0, 0, 0] }, caixa('a', 'e.topo')] }); } catch (x) { erro = x; }
    expect(erro).toBeInstanceOf(ErroDeEsboco);
    expect(erro.message).toContain('"e.topo"');
    expect(erro.message).toContain('forma "a"');
    expect(erro.message).toContain('válidas: centro, inicio, fim, +x, -x, +y, -y, +z, -z');
    expect(() => resolverOpcao({ formas: [caixa('a', [0, 0, 0]), caixa('b', 'a.inicio')] })).toThrow(/não tem a âncora "inicio" \(válidas: centro, \+x/);
  });

  it('os arquivos legados geram o mesmo SVG de antes das âncoras', () => {
    const hashes = {
      moto: 'ee5eaae2b028ce82d3357c6e6d4a39134343370e',
      casa: '921913afe9f9074b1801322dac097743bdd57d48',
      'mancal-eixo': 'bb4a355c5ca68f60de67cabf33d778d5def27c4a',
      'teste-cubo': 'fa488c1ade466fb431429eb81308d76831c148d1',
    };
    for (const [nome, sha] of Object.entries(hashes)) {
      const svg = desenharEsboco(JSON.parse(readFileSync(fixture(`${nome}.esboco.json`), 'utf8'))).svg;
      expect(createHash('sha1').update(svg).digest('hex')).toBe(sha);
    }
  });
});

describe('--descrever', () => {
  it('descreve a fixture de três formas com valores exatos', () => {
    const d = descreverEsboco(pequeno());
    const o = d.opcoes[0];
    expect(o.gate).toEqual({ declarado: false, tolerancia_mm: 5.6, penetracao_mm: 1.68 });
    expect(o.formas.map((f) => f.id)).toEqual(['base', 'pino', 'anel']);
    expect(o.formas[1]).toMatchObject({ tipo: 'cilindro', centro: [0, 125, 0], extensao: [40, 50, 40], eixo: 'y' });
    expect(o.formas[1].ancoras.inicio).toEqual([0, 100, 0]);
    expect(o.formas[1].ancoras.fim).toEqual([0, 150, 0]);
    expect(o.formas[2].caixa).toEqual({ x: [490, 510], y: [0, 100], z: [-50, 50] });
    expect(o.contatos).toEqual([{ a: 'base', b: 'pino', folga_mm: 0 }]);
    expect(o.soltas).toEqual(['anel']);
    expect(o.sobreposicoes3d).toEqual([]);
    const texto = formatarDescricao(d);
    expect(texto).toContain('sem gate declarado (padrões do gate: tolerância 5,6 mm, penetração 1,7 mm)');
    expect(texto).toContain('forma pino: cilindro, centro [0 125 0], extensão 40x50x40, eixo y, caixa x -20..20 y 100..150 z -20..20');
    expect(texto).toContain('âncoras pino: centro [0 125 0]; inicio [0 100 0]; fim [0 150 0];');
    expect(texto).toContain('contato: base toca pino (folga 0 mm)');
    expect(texto).toContain('solta: anel fora do maior grupo conectado');
  });

  it('com contato.usar mostra o gate declarado, a penetração e o achado', () => {
    const e = pequeno();
    e.contato = { usar: true, tolerancia: 2, penetracao: 1 };
    e.opcoes[0].formas[1].centro = [0, 110, 0];
    const o = descreverEsboco(e).opcoes[0];
    expect(o.gate).toEqual({ declarado: true, tolerancia_mm: 2, penetracao_mm: 1 });
    expect(o.contatos).toEqual([{ a: 'base', b: 'pino', penetracao_mm: 15 }]);
    expect(o.sobreposicoes3d).toEqual([{ a: 'base', b: 'pino', penetracao_mm: 15 }]);
    expect(o.achadosDeContato.some((a) => a.includes('colisão') && a.includes('15,0 mm'))).toBe(true);
    expect(formatarDescricao(descreverEsboco(e))).toContain('gate de contato declarado: tolerância 2 mm, penetração 1 mm');
  });

  it('a projeção resume par, vista, fração e quem cobre', () => {
    const o = descreverEsboco({
      opcoes: [{ titulo: 'P', formas: [
        { id: 'roda', tipo: 'anel', diametroExterno: 400, diametroInterno: 200, espessura: 100, eixo: 'x', centro: [0, 200, 0] },
        { id: 'garfo', tipo: 'cilindro', diametro: 50, comprimento: 500, eixo: 'y', centro: [80, 250, 0] },
      ] }],
    }).opcoes[0];
    expect(o.projecao.length).toBeGreaterThan(0);
    expect(o.projecao[0]).toMatchObject({ a: 'roda', b: 'garfo' });
    expect(['roda', 'garfo']).toContain(o.projecao[0].cobre);
    expect(formatarDescricao({ opcoes: [o] })).toMatch(/sobreposição na vista \w+: \w+ cobre \w+ em \d+% \(par roda e garfo/);
  });

  it('descreve a moto em menos de 500 ms', () => {
    const arquivo = fixture('moto.esboco.json');
    const tempos = [];
    for (let i = 0; i < 3; i++) {
      const t = performance.now();
      const { descricao } = descreverArquivo(arquivo);
      tempos.push(performance.now() - t);
      expect(descricao.opcoes[0].formas).toHaveLength(12);
    }
    expect(Math.min(...tempos)).toBeLessThan(500);
  });

  it('--json devolve a mesma descrição', () => {
    const arquivo = fixture('teste-cubo.esboco.json');
    const { texto, descricao } = descreverArquivo(arquivo, { json: true });
    expect(JSON.parse(texto)).toEqual(descricao);
  });
});

describe('--descrever --mudou', () => {
  const preparar = () => {
    const pasta = mkdtempSync(join(tmpdir(), 'esboco-mudou-'));
    const arquivo = join(pasta, 'p.esboco.json');
    const grava = (e) => writeFileSync(arquivo, JSON.stringify(e));
    grava(pequeno());
    return { arquivo, grava };
  };

  it('primeira vez avisa e imprime o estado; sem mudança diz uma linha', () => {
    const { arquivo } = preparar();
    const primeira = descreverArquivo(arquivo, { mudou: true });
    expect(primeira.texto).toMatch(/^sem execução anterior/);
    expect(primeira.texto).toContain('forma base: caixa');
    expect(readFileSync(`${arquivo}.descrever.json`, 'utf8')).toContain('"base"');
    expect(descreverArquivo(arquivo, { mudou: true }).texto).toBe('sem mudanças\n');
  });

  it('forma movida, contato novo e forma solta que se liga', () => {
    const { arquivo, grava } = preparar();
    descreverArquivo(arquivo, { mudou: true });
    const e = pequeno();
    e.opcoes[0].formas[2].centro = [50 + 10, 50, 0];
    grava(e);
    const linhas = descreverArquivo(arquivo, { mudou: true }).texto.trim().split('\n');
    expect(linhas).toContain('[T] forma movida: anel de [500 50 0] para [60 50 0] (delta [-440 0 0] mm)');
    expect(linhas.some((l) => l.startsWith('[T] passou a tocar: base e anel'))).toBe(true);
    expect(linhas).toContain('[T] deixou de ficar solta: anel');
    expect(descreverArquivo(arquivo, { mudou: true }).texto).toBe('sem mudanças\n');
  });

  it('forma nova solta, e forma removida', () => {
    const { arquivo, grava } = preparar();
    descreverArquivo(arquivo, { mudou: true });
    const e = pequeno();
    e.opcoes[0].formas.push({ id: 'longe', tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, centro: [-900, 5, 0] });
    grava(e);
    const linhas = descreverArquivo(arquivo, { mudou: true }).texto.trim().split('\n');
    expect(linhas).toContain('[T] forma nova: longe (caixa), centro [-900 5 0]');
    expect(linhas).toContain('[T] ficou solta: longe');
    const sem = pequeno();
    sem.opcoes[0].formas.splice(0, 1);
    grava(sem);
    const depois = descreverArquivo(arquivo, { mudou: true }).texto.trim().split('\n');
    expect(depois).toContain('[T] forma removida: base');
    expect(depois).toContain('[T] deixou de tocar: base e pino (uma das formas saiu)');
  });

  it('diferenca entre duas descrições iguais é vazia', () => {
    const d = descreverEsboco(pequeno());
    expect(diferenca(d, d).linhas).toEqual([]);
  });
});
