/* entrada-de-medida.test.mjs — o resolvedor comum das ferramentas de medida e as quatro que passaram a ler esboço 2.0 (ondulação, lascas,
 * vistas de superfície e exportação em OBJ), mais a face de corte que a exportação não triangula. Sem domínio: a chapa em V com colunas de apoio. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ErroDeEntrada, assinaturaDaEntrada, avisoDeCache, lerEntradaDeMedida, opcaoDaLinha } from './entrada-de-medida.mjs';
import { exportarArquivoObj, semFaceSemArea } from './exportar-obj.mjs';
import { comoCLI as lascas } from './lasca.mjs';
import { vistasDeSuperficie } from './vistas-de-superficie.mjs';
import { receitaDaDobra } from './fixtures/dobra-por-apoio.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../..');
const ESBOCO = join(AQUI, 'fixtures/dobra-por-apoio.esboco.mjs');
const ESBOCO_REL = 'tools/modelar/fixtures/dobra-por-apoio.esboco.mjs';
const area = mkdtempSync(join(tmpdir(), 'entrada-de-medida-'));
const gravar = (nome, texto) => { const f = join(area, nome); writeFileSync(f, texto); return f; };

describe('o resolvedor de entrada', () => {
  it('lê o esboço de módulo e o de JSON, com a receita da opção e o neutro já executado', async () => {
    const modulo = await lerEntradaDeMedida(ESBOCO);
    expect(modulo).toMatchObject({ tipo: 'esboco', opcao: 1, opcoes: 1, titulo: 'dobra por apoio' });
    expect(modulo.receita.PASSOS.map(([op]) => op)).toEqual(['subdivisao', 'parte']);
    expect(modulo.receita.PARAMS).toEqual({});
    expect(modulo.executar().neutro.F.size).toBeGreaterThan(1000);
    expect(modulo.executar()).toBe(modulo.executar());
    const { default: esboco } = await import(ESBOCO);
    const json = await lerEntradaDeMedida(gravar('x.esboco.json', JSON.stringify(esboco)));
    expect(json.tipo).toBe('esboco');
    expect(json.executar().neutro.F.size).toBe(modulo.executar().neutro.F.size);
  });

  it('lê a receita como estava, pelo caminho dado ou pelo nome curto, e executa uma vez só', async () => {
    const arquivo = gravar('receita.mjs', `export default ${JSON.stringify(receitaDaDobra({ niveis: 1 }))};\n`);
    const lida = await lerEntradaDeMedida(arquivo);
    expect(lida.tipo).toBe('receita');
    expect(lida.receita.PASSOS[0][0]).toBe('subdivisao');
    expect(lida.executar()).toBe(lida.executar());
    expect((await lerEntradaDeMedida('tools/modelar/fixtures/lasca/receita.js')).tipo).toBe('receita');
  });

  it('recusa com o motivo: arquivo que não existe, opção que o esboço não tem, esboço recusado e montagem onde só cabe peça', async () => {
    await expect(lerEntradaDeMedida(join(area, 'nao-existe.mjs'))).rejects.toThrow(/não existe, nem como esboço nem como receita/);
    await expect(lerEntradaDeMedida(ESBOCO, { opcao: 2 })).rejects.toThrow(/o esboço tem 1 opções e veio --opcao=2/);
    const ruim = gravar('ruim.esboco.json', JSON.stringify({ opcoes: [{ titulo: 'x', formas: [{ id: 'a', op: 'nao-existe', args: {} }] }] }));
    await expect(lerEntradaDeMedida(ruim)).rejects.toBeInstanceOf(ErroDeEntrada);
    const montagem = gravar('m.json', JSON.stringify({ formato: 'mecanifica.montagem', versao: 1, id: 'm', instancias: [{ id: 'a', alvo: { tipo: 'peca', ref: 'carenagem-de-prova' } }] }));
    await expect(lerEntradaDeMedida(montagem, { montagem: false })).rejects.toThrow(/é uma montagem/);
    const lida = await lerEntradaDeMedida(montagem);
    expect(lida.tipo).toBe('montagem');
    expect(lida.partes.map((p) => p.nome)).toEqual(['carenagem-de-prova']);
    expect(lida.partes[0].receita.PASSOS).toBeTruthy();
  });

  it('a opção da linha de comando é um inteiro a partir de 1', () => {
    expect(opcaoDaLinha(null)).toBe(1);
    expect(opcaoDaLinha('2')).toBe(2);
    expect(() => opcaoDaLinha('0')).toThrow(/--opcao espera um inteiro/);
    expect(() => opcaoDaLinha('a')).toThrow(/--opcao espera um inteiro/);
  });
});

describe('o cache da montagem', () => {
  /* o esboço de um cubo cuja largura vem de um módulo importado: dentro do repositório (tmp/, ignorado pelo git), porque a assinatura segue só o que é do repositório */
  const pasta = join(REPO, 'tmp', `teste-de-cache-${process.pid}`);
  const cache = join(pasta, 'cache');
  const largura = (e) => Math.max(...[...e.executar().neutro.V.values()].map((v) => v[0])) * 2000;
  const escrever = (larg) => {
    writeFileSync(join(pasta, 'numero.mjs'), `export const LARG = ${larg};\n`);
    writeFileSync(join(pasta, 'x.esboco.mjs'), `import { LARG } from './numero.mjs';\nexport default { opcoes: [{ titulo: 'cubo', formas: [{ id: 'a', op: 'cubo', args: { larg: LARG, alt: 100, prof: 20 }, centro: [0, 0, 0] }] }] };\n`);
  };
  const ler = (o = {}) => lerEntradaDeMedida(join(pasta, 'x.esboco.mjs'), { pastaDoCache: cache, ...o });
  const limpar = () => rmSync(pasta, { recursive: true, force: true });

  it('a primeira leitura monta e guarda, a segunda lê o guardado, e as duas dão a mesma malha; --sem-cache monta de novo', async () => {
    limpar(); mkdirSync(pasta, { recursive: true });
    try {
      escrever(100);
      const a = await ler();
      expect(a.doCache).toBe(false);
      expect(readdirSync(cache).filter((f) => f.endsWith('.v8'))).toHaveLength(1);
      const b = await ler();
      expect(b.doCache).toBe(true);
      expect(avisoDeCache(b, 'medida')).toMatch(/montagem lida do cache.*--sem-cache/);
      expect(avisoDeCache(a, 'medida')).toBe('');
      expect(b.executar().neutro.F.size).toBe(a.executar().neutro.F.size);
      expect(largura(b)).toBeCloseTo(100, 3);
      expect(b.origem).toBe(a.origem);
      expect(b.receita.PASSOS).toEqual(a.receita.PASSOS);
      const sem = await ler({ cache: false });
      expect(sem.doCache).toBe(false);
    } finally { limpar(); }
  });

  it('um número mudado no esboço, ou no módulo que ele importa, nunca lê o cache velho', async () => {
    limpar(); mkdirSync(pasta, { recursive: true });
    try {
      escrever(100);
      expect(largura(await ler())).toBeCloseTo(100, 3);
      expect((await ler()).doCache).toBe(true);
      /* o módulo importado muda, o esboço não (o número novo só aparece em outro processo, porque o carregador do Node guarda o módulo importado; o cache, em todo caso, não é lido) */
      escrever(140);
      expect((await ler()).doCache).toBe(false);
      expect((await ler()).doCache).toBe(true);
      /* o próprio esboço muda */
      writeFileSync(join(pasta, 'x.esboco.mjs'), readFileSync(join(pasta, 'x.esboco.mjs'), 'utf8').replace('alt: 100', 'alt: 90'));
      const altura = await ler();
      expect(altura.doCache).toBe(false);
      expect(Math.max(...[...altura.executar().neutro.V.values()].map((v) => v[1])) * 2000).toBeCloseTo(90, 3);
    } finally { limpar(); }
  });

  it('a assinatura muda com o arquivo da entrada e com o que ele importa, e só com eles', () => {
    limpar(); mkdirSync(pasta, { recursive: true });
    try {
      escrever(100);
      const alvo = join(pasta, 'x.esboco.mjs');
      const base = assinaturaDaEntrada(alvo);
      expect(assinaturaDaEntrada(alvo)).toEqual(base);
      writeFileSync(join(pasta, 'outro.mjs'), 'export const NAO_IMPORTADO = 1;\n');
      expect(assinaturaDaEntrada(alvo).chave).toBe(base.chave);
      escrever(101);
      expect(assinaturaDaEntrada(alvo).chave).not.toBe(base.chave);
      expect(base.arquivos).toBeGreaterThan(20);
    } finally { limpar(); }
  });
});

describe('as quatro ferramentas leem o esboço direto', () => {
  it('malha:lascas lista as faces finas do esboço, com a origem dele, e sai 0 sem lasca', async () => {
    const saida = []; const escrever = process.stdout.write.bind(process.stdout);
    process.stdout.write = (t) => { saida.push(String(t)); return true; };
    let codigo;
    try { codigo = await lascas([ESBOCO_REL, '--json']); } finally { process.stdout.write = escrever; }
    const json = JSON.parse(saida.join(''));
    expect(json.esboco).toBe('esboço dobra-por-apoio.esboco.mjs, opção 1');
    expect(codigo).toBe(json.lascas.length ? 1 : 0);
  });

  it('ondulacao lê o esboço, diz a origem dele e a leitura do passo, e sai 0', () => {
    const r = spawnSync(process.execPath, [join(AQUI, 'ondulacao-da-superficie.mjs'), ESBOCO_REL], { cwd: REPO, encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/esboço dobra-por-apoio\.esboco\.mjs, opção 1/);
    expect(r.stderr).toMatch(/0 falha\(s\) fora das feições e \d+ junto delas/);
    expect(JSON.parse(r.stdout).superficies[0]).toMatchObject({ passo: 0, medidoNoPasso: 1, escolhaDoPasso: 'final' });
  });

  it('exportar:obj exporta o esboço (a opção 1, com o nome do esboço) e recusa a opção que ele não tem', async () => {
    const saida = join(area, 'esboco.obj');
    const r = await exportarArquivoObj({ arquivo: ESBOCO, saida, sobrescrever: true });
    expect(existsSync(saida)).toBe(true);
    expect(r.diagnostico.totalCorpos).toBe(1);
    expect(readFileSync(saida, 'utf8')).toMatch(/^o chapa/m);
    await expect(exportarArquivoObj({ arquivo: ESBOCO, saida, sobrescrever: true, opcao: 2 })).rejects.toThrow(/o esboço tem 1 opções/);
  });

  it('vistas:superficie gera as vistas do esboço, com a faixa dos vincos, sem montar a peça de novo a cada passo', async () => {
    const chamadas = [];
    const executar = (_blender, argv) => {
      const script = argv[3].split('/').pop(); const args = argv.slice(5);
      const opcao = (n) => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
      const prefixo = opcao('--saida'); chamadas.push({ script, args });
      const gravarArq = (n) => { writeFileSync(`${prefixo}${n}`, n); return `${prefixo}${n}`; };
      if (script === 'luz-rasante.py') writeFileSync(`${prefixo}rasante.json`, JSON.stringify({ imagens: [{ vista: 'topo', azimute: 30, arquivos: { malha: gravarArq('topo-rasante.png') }, iluminacao: { fracao: 0.5 } }] }));
      else writeFileSync(`${prefixo}curvatura.json`, JSON.stringify({ escala_1_m: 1, imagens: [{ vista: 'topo', legenda: gravarArq('topo-curvatura.png') }], faixa_dos_vincos: null }));
      return { status: 0, stdout: '', stderr: '' };
    };
    const pasta = join(area, 'vistas');
    mkdirSync(pasta, { recursive: true });
    const feitas = await vistasDeSuperficie(ESBOCO_REL, { pasta, blender: '/blender/de/ensaio', executar });
    expect(existsSync(feitas.obj)).toBe(true);
    expect(feitas.rasante).toHaveLength(1);
    expect(feitas.curvatura).toHaveLength(1);
    expect(feitas.facesPuladas).toEqual([]);
    expect(chamadas.map((c) => c.script)).toEqual(['luz-rasante.py', 'curvatura-da-lataria.py']);
  });
});

describe('a face que a exportação não triangula', () => {
  /* a parede de 1 mm de um corte, com 19 vértices da chapa nos dois lados (as coordenadas são as da malha do caminho A do sedã em modo vista) */
  const pontos = JSON.parse(readFileSync(join(AQUI, 'fixtures/tira-de-corte-colinear.json'), 'utf8'));
  const malha = () => {
    const V = new Map(pontos.map((p, i) => [i, p]));
    const F = new Map([[1, { id: 1, vs: pontos.map((_, i) => i), parte: 'parede' }]]);
    V.set(500, [0, 0.01, 0]); V.set(501, [0.01, 0.01, 0]); V.set(502, [0, 0.01, 0.01]); F.set(2, { id: 2, vs: [500, 501, 502], parte: 'chapa' });
    return { V, F };
  };

  it('a tira de corte com cantos colineares passa: o triangulador a resolve pela passagem em tira (triangulacao-colinear.test.mjs)', () => {
    const r = semFaceSemArea(malha());
    expect(r.puladas).toEqual([]);
  });

  it('a face que de fato tem triângulo sem área é pulada e listada', () => {
    const m = malha();
    m.V.set(600, [0, 0, 0]); m.V.set(601, [1, 0, 0]); m.V.set(602, [2, 0, 0]);
    m.F.set(3, { id: 3, vs: [600, 601, 602], parte: 'degenerada' });
    const { puladas, neutro } = semFaceSemArea(m);
    expect(puladas.map((p) => [p.face, p.parte, p.vertices])).toEqual([[3, 'degenerada', 3]]);
    expect(neutro.F.has(3)).toBe(false);
  });

  it('a malha sem face assim passa como estava', () => {
    const m = malha(); m.F.delete(1);
    const r = semFaceSemArea(m);
    expect(r.puladas).toEqual([]);
    expect(r.neutro).toBe(m);
  });
});
