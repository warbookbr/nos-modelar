/* cache-por-prefixo.test.mjs — o cache por prefixo entre execuções (plano do cache por passo, fatia 3): a memória em armazém guarda o
 * estado depois de cada passo sob a chave dos passos até ele, e a execução seguinte recomeça do último ponto do prefixo que não mudou.
 *
 * Os três primeiros casos são os da revisão da fatia 2, em que um passo depende de um passo anterior por um caminho que a leitura
 * declarada não vê (a gaiola da `subdivisao`, a superfície do `friso` e a face que um passo apagou): muda só um passo anterior, e a
 * saída com o cache tem de ser a da execução inteira. Os outros provam os gates 2 e 4 do plano: a edição do último passo refaz só ele, e
 * o estado de outra versão do núcleo não é servido. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serialize, deserialize } from 'node:v8';
import { describe, expect, it } from 'vitest';
import { nucleo, usoDaOperacao } from '../entrada.js';
import { criarMemoriaEmArmazem } from './memoria-em-armazem.js';
import { divergenciaDaImpressao } from './impressao-do-neutro.js';
import { chaveExataDoPasso } from './chave-do-prefixo.js';
import { entradaDaVersaoNoDisco, versaoDoCodigo } from './versao-do-codigo.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));

function armazemNaMemoria() {
  const arquivos = new Map();
  return { arquivos, ler: (n) => arquivos.get(n) ?? null, gravar: (n, b) => { arquivos.set(n, b); }, apagar: (n) => { arquivos.delete(n); } };
}
const memoriaDe = (armazem, extra = {}) => criarMemoriaEmArmazem({ armazem, serializar: serialize, desserializar: deserialize, desserializarDevolveCopia: true, versao: 'v1', rotulo: 'receita', todoPasso: true, ...extra });

/** A execução com a memória, conferida, e quantos passos ela executou de fato. */
function comMemoria(passos, PARAMS, memoria) {
  let executados = 0;
  const n = nucleo(passos, PARAMS, {}, {}, null, [], { memoria, memoriaConferida: true, aoRastrear: () => { executados += 1; } });
  return { n, executados };
}

/** Executa X fria, depois Y com a mesma memória: a saída de Y tem de ser a da execução inteira, recomeçando do passo anterior ao mudado. */
function editar(X, Y, PARAMS = {}) {
  const armazem = armazemNaMemoria();
  const memoria = memoriaDe(armazem);
  const fria = comMemoria(X, PARAMS, memoria);
  expect(fria.executados).toBe(X.length);
  const mudado = Y.findIndex((p, i) => JSON.stringify(p) !== JSON.stringify(X[i]));
  const y = comMemoria(Y, PARAMS, memoria);
  const inteira = nucleo(Y, PARAMS);
  expect(divergenciaDaImpressao(y.n, inteira)).toBeNull();
  expect(y.executados).toBe(Y.length - mudado);
  return { x: nucleo(X, PARAMS), y: inteira, mudado };
}

describe('a edição de um passo anterior, com o cache por prefixo', () => {
  it('a subdivisão que lê a gaiola de outra subdivisão: mudar a primeira muda a saída da segunda, e o cache refaz as duas', () => {
    const P = { a0: [0, 0, 0], a1: [1, 0, 0], a2: [1, 0, 1], a3: [0, 0, 1], b0: [3, 0, 0], b1: [4, 0, 0], b2: [4, 0, 1], b3: [3, 0, 1] };
    const sub = (id, nomes) => ['subdivisao', { origemId: id, vertices: nomes, faces: [[0, 3, 2, 1]], niveis: 1 }];
    const B = sub(2, ['b0', 'b1', 'b2', 'b3']);
    const { x, y } = editar([sub(1, ['a0', 'a1', 'a2', 'a3']), B], [sub(1, ['a0', 'a1', 'a2', 'b0']), B], P);
    /* o passo B não mudou e a saída dele mudou: pular B pela leitura declarada (nada) daria a malha errada */
    expect(x.F.size).not.toBe(y.F.size);
    expect((x.origens.get(2) ?? []).length).not.toBe((y.origens.get(2) ?? []).length);
  });

  it('o friso que lê a superfície guardada pela subdivisão: a mesma malha com outros nomes de ponto muda o friso', () => {
    const uso = usoDaOperacao('friso');
    const ex = uso.exemplos ?? uso.exemplo;
    const P = { ...ex.PARAMS };
    for (const [k, v] of Object.entries(ex.PARAMS)) P[`h${k.slice(1)}`] = v;
    const renomear = (x) => (typeof x === 'string' ? `h${x.slice(1)}` : x);
    const [subG, friso] = ex.PASSOS;
    const subH = ['subdivisao', { ...subG[1], vertices: subG[1].vertices.map(renomear), faces: subG[1].faces.map((f) => f.map(renomear)) }];
    const { x, y } = editar([subG, friso], [subH, friso], P);
    expect(x.F.size).not.toBe(y.F.size);
  });

  it('o friso depois de uma face apagada: mudar qual face sai muda o friso, e o cache recomeça depois da subdivisão', () => {
    const uso = usoDaOperacao('friso');
    const ex = uso.exemplos ?? uso.exemplo;
    const [sub, friso] = ex.PASSOS;
    const apaga = (f) => ['apagaFace', { sel: { f: [f] } }];
    const { x, y, mudado } = editar([sub, apaga(30), friso], [sub, apaga(4), friso], ex.PARAMS);
    expect(mudado).toBe(1);
    expect(x.orfaos.length).not.toBe(y.orfaos.length);
  });
});

describe('o que o cache refaz e o que ele serve', () => {
  const cubo = (id, lado, em = [0, 0, 0]) => ['cubo', { origemId: id, lado, em }];
  const o = (op, id) => ({ origem: { op, id } });
  const receita = (ultimo) => [cubo(1, 1), cubo(2, 1, [0.5, 0, 0]), ['unir', { origemId: 3, solidos: [o('cubo', 1), o('cubo', 2)] }], ['parte', { sel: o('unir', 3), nome: ultimo }]];

  it('a mesma receita outra vez não executa passo nenhum, e a edição do último passo refaz só ele (gate 2)', () => {
    const memoria = memoriaDe(armazemNaMemoria());
    expect(comMemoria(receita('a'), {}, memoria).executados).toBe(4);
    const igual = comMemoria(receita('a'), {}, memoria);
    expect(igual.executados).toBe(0);
    expect(divergenciaDaImpressao(igual.n, nucleo(receita('a')))).toBeNull();
    const ultimo = comMemoria(receita('b'), {}, memoria);
    expect(ultimo.executados).toBe(1);
    expect(divergenciaDaImpressao(ultimo.n, nucleo(receita('b')))).toBeNull();
  });

  it('o estado de outra versão do núcleo não é servido, nem com o mesmo armazém e a mesma receita (gate 4)', () => {
    const armazem = armazemNaMemoria();
    comMemoria(receita('a'), {}, memoriaDe(armazem, { versao: 'v1' }));
    const outra = memoriaDe(armazem, { versao: 'v2' });
    const r = comMemoria(receita('a'), {}, outra);
    expect(r.executados).toBe(4);
    expect(outra.estatisticas.lidos).toBe(0);
    /* o ponto gravado com uma versão no nome e outra dentro (um nome que colidisse) também é recusado */
    const [nome] = [...armazem.arquivos.keys()].filter((n) => n.startsWith('ponto-'));
    const ponto = deserialize(armazem.arquivos.get(nome));
    armazem.arquivos.set(nome, serialize({ ...ponto, versao: 'v0' }));
    const memoria = memoriaDe(armazem, { versao: 'v1' });
    expect(memoria.buscar(ponto.chave)).toBeNull();
  });

  it('em disco, entre duas memórias (dois comandos), a segunda recomeça do estado que a primeira gravou', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'cache-por-prefixo-'));
    try {
      const disco = { ler: (n) => (existsSync(join(pasta, n)) ? readFileSync(join(pasta, n)) : null), gravar: (n, b) => writeFileSync(join(pasta, n), b), apagar: (n) => { try { unlinkSync(join(pasta, n)); } catch { /* já saiu */ } } };
      expect(comMemoria(receita('a'), {}, memoriaDe(disco)).executados).toBe(4);
      const segundo = comMemoria(receita('b'), {}, memoriaDe(disco));
      expect(segundo.executados).toBe(1);
      expect(divergenciaDaImpressao(segundo.n, nucleo(receita('b')))).toBeNull();
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  });

  it('o ponto é pelo conteúdo: outra receita com o mesmo prefixo recomeça dele, e o resultado é o dela', () => {
    const armazem = armazemNaMemoria();
    comMemoria(receita('a'), {}, memoriaDe(armazem, { rotulo: 'uma' }));
    const r = comMemoria(receita('b'), {}, memoriaDe(armazem, { rotulo: 'outra' }));
    expect(r.executados).toBe(1);
    expect(divergenciaDaImpressao(r.n, nucleo(receita('b')))).toBeNull();
  });

  it('o armazém que falha ou devolve lixo não muda o resultado', () => {
    const quebrado = { ler: () => { throw new Error('disco'); }, gravar: () => { throw new Error('disco'); }, apagar: () => {} };
    const r = comMemoria(receita('a'), {}, memoriaDe(quebrado));
    expect(r.executados).toBe(4);
    expect(divergenciaDaImpressao(r.n, nucleo(receita('a')))).toBeNull();
    const lixo = { ler: () => Buffer.from('lixo'), gravar: () => {}, apagar: () => {} };
    expect(comMemoria(receita('a'), {}, memoriaDe(lixo)).executados).toBe(4);
  });

  it('o índice mantém só os pontos mais recentes', () => {
    const armazem = armazemNaMemoria();
    const memoria = memoriaDe(armazem, { maximo: 2 });
    comMemoria(receita('a'), {}, memoria);
    expect([...armazem.arquivos.keys()].filter((n) => n.startsWith('ponto-'))).toHaveLength(2);
    expect(memoria.tamanho).toBe(2);
  });

  it('o modo conferido recusa a execução que recomeçou de um estado que não é o do prefixo, e apaga o ponto recusado', () => {
    const armazem = armazemNaMemoria();
    const memoria = memoriaDe(armazem);
    comMemoria(receita('a'), {}, memoria);
    /* troca o estado guardado depois do passo 2 pelo de depois do passo 1: a chave diz um prefixo, o estado é outro */
    const pontos = [...armazem.arquivos.keys()].filter((n) => n.startsWith('ponto-')).map((n) => [n, deserialize(armazem.arquivos.get(n))]);
    const depois1 = pontos.find(([, p]) => p.passo === 1)[1], [nome2, depois2] = pontos.find(([, p]) => p.passo === 2);
    armazem.arquivos.set(nome2, serialize({ ...depois2, estado: depois1.estado }));
    expect(() => nucleo(receita('b'), {}, {}, {}, null, [], { memoria, memoriaConferida: true }))
      .toThrow(/a execução que recomeçou do estado guardado depois do passo 2 divergiu da execução inteira: o campo '\w+' difere/);
    expect(armazem.arquivos.has(nome2)).toBe(false);
    /* sai o ponto recusado e o que a execução recusada guardou depois dele (o do passo 3, feito a partir do estado trocado) */
    expect(memoria.estatisticas.descartados).toBe(2);
    /* a execução seguinte, sem o modo conferido, não recomeça do ponto recusado */
    expect(divergenciaDaImpressao(nucleo(receita('b'), {}, {}, {}, null, [], { memoria }), nucleo(receita('b')))).toBeNull();
  });
});

describe('o que a revisão do cache por prefixo achou', () => {
  const o = (op, id) => ({ origem: { op, id } });
  const cubos = (lado2) => Array.from({ length: 8 }, (_, k) => ['cubo', { origemId: k + 1, lado: k === 2 ? lado2 : 1, em: [k * 2, 0, 0] }]);
  const executados = (passos, memoria) => comMemoria(passos, {}, memoria).executados;

  it('o processo sem a Manifold não guarda ponto depois do passo que gritou por ela, e o ponto dele não serve ao processo que a tem', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'cache-sem-manifold-'));
    const processo = (...extra) => {
      const r = spawnSync(process.execPath, [...extra, join(AQUI, 'fixtures/processo-do-cache.mjs'), pasta], { encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } });
      expect(r.status, r.stderr).toBe(0);
      return JSON.parse(r.stdout.trim().split('\n').at(-1));
    };
    try {
      const sem = processo('--import', join(AQUI, 'fixtures/sem-manifold.mjs'));
      expect(sem.orfaos).toBeGreaterThan(0);
      /* os dois cubos viram ponto; a união, que gritou sem a biblioteca, e a parte depois dela, não */
      expect(sem.estatisticas.guardados).toBe(2);
      const com = processo();
      expect(com).toMatchObject({ orfaos: 0, igualSemMemoria: true });
      expect(com.estatisticas.lidos).toBe(0);
      expect(processo()).toMatchObject({ orfaos: 0, igualSemMemoria: true, estatisticas: { restaurados: 1 } });
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  }, 60_000);

  it('a versão do código cobre as extensões do registro, os pacotes e o Node', () => {
    const e = entradaDaVersaoNoDisco();
    expect(e.arquivos.some(([c]) => c.startsWith('procedural/extensoes/'))).toBe(true);
    expect(e.arquivos.some(([c]) => c.startsWith('procedural/nucleo/'))).toBe(true);
    expect(e.arquivos.some(([c]) => /\.test\./.test(c))).toBe(false);
    expect(Object.keys(e.pacotes)).toEqual(expect.arrayContaining(['manifold-3d', 'earcut']));
    expect(Object.values(e.pacotes)).not.toContain('ausente');
    expect(e.node).toBe(process.version);
    const base = versaoDoCodigo(e);
    const extensao = e.arquivos.findIndex(([c]) => c.startsWith('procedural/extensoes/'));
    const outraExtensao = e.arquivos.map(([c, x], k) => [c, k === extensao ? Buffer.concat([Buffer.from(x), Buffer.from(' ')]) : x]);
    expect(versaoDoCodigo({ ...e, arquivos: outraExtensao })).not.toBe(base);
    expect(versaoDoCodigo({ ...e, pacotes: { ...e.pacotes, 'manifold-3d': '0.0.0' } })).not.toBe(base);
    expect(versaoDoCodigo({ ...e, pacotes: { ...e.pacotes, earcut: '0.0.0' } })).not.toBe(base);
    expect(versaoDoCodigo({ ...e, node: 'v0.0.0' })).not.toBe(base);
    expect(versaoDoCodigo({ ...e, arquivos: [...e.arquivos].reverse() })).toBe(base);
  });

  it('o buraco de uma lista não tem a chave do valor indefinido, e o estado de um não serve ao outro', () => {
    // eslint-disable-next-line no-sparse-arrays
    const comBuraco = [['cubo', { origemId: 1, lado: 1, em: [0, , 0] }]];
    const comIndefinido = [['cubo', { origemId: 1, lado: 1, em: [0, undefined, 0] }]];
    expect(chaveExataDoPasso(comBuraco)).not.toBe(chaveExataDoPasso(comIndefinido));
    expect(chaveExataDoPasso(Object.assign([1], { x: 1 }))).toBeNull();
    const armazem = armazemNaMemoria();
    nucleo(comBuraco, {}, {}, {}, null, [], { memoria: memoriaDe(armazem) });
    /* sem cache o indefinido é recusado; com o cache do buraco, também */
    expect(() => nucleo(comIndefinido)).toThrow(/valor numérico inválido/);
    expect(() => nucleo(comIndefinido, {}, {}, {}, null, [], { memoria: memoriaDe(armazem) })).toThrow(/valor numérico inválido/);
  });

  it('numa receita de oito passos, a edição do passo 2 refaz só os seis do 2 em diante com todo passo guardado', () => {
    const memoria = memoriaDe(armazemNaMemoria());
    expect(executados(cubos(1), memoria)).toBe(8);
    expect(executados(cubos(2), memoria)).toBe(6);
  });

  it('com a escolha pelo custo, a segunda edição no mesmo passo refaz só ele e os seguintes, e o passo caro vira ponto na primeira', () => {
    const memoria = memoriaDe(armazemNaMemoria(), { todoPasso: false });
    expect(executados(cubos(1), memoria)).toBe(8);
    /* os passos são baratos: só os dois últimos viraram ponto, e a primeira edição no passo 2 refaz tudo e guarda o passo 1 */
    expect(executados(cubos(2), memoria)).toBe(8);
    expect(executados(cubos(3), memoria)).toBe(6);
    expect(executados(cubos(3), memoria)).toBe(0);
    /* o passo que leva ao menos o limiar vira ponto: com limiar 0, todos */
    const caro = memoriaDe(armazemNaMemoria(), { todoPasso: false, limiarDeCustoMs: 0 });
    expect(executados(cubos(1), caro)).toBe(8);
    expect(executados(cubos(2), caro)).toBe(6);
  });

  it('o índice trancado não perde o ponto de outro processo que guarda ao mesmo tempo', () => {
    const arquivos = new Map();
    let preso = false; const fila = [];
    let entreLeituraEGravacao = null;
    const armazem = {
      ler: (n) => arquivos.get(n) ?? null, apagar: (n) => { arquivos.delete(n); },
      gravar: (n, b) => { if (n.startsWith('indice-') && entreLeituraEGravacao) { const f = entreLeituraEGravacao; entreLeituraEGravacao = null; f(); } arquivos.set(n, b); },
      trancar: (nome, fn) => { if (preso) { fila.push(fn); return; } preso = true; try { fn(); } finally { preso = false; while (fila.length) { preso = true; try { fila.shift()(); } finally { preso = false; } } } },
    };
    const A = memoriaDe(armazem, { maximo: 4 }), B = memoriaDe(armazem, { maximo: 4 });
    entreLeituraEGravacao = () => B.guardar('chave-b', 0, { x: 2 });
    A.guardar('chave-a', 0, { x: 1 });
    expect(A.tamanho).toBe(2);
    A.limpar();
    expect([...arquivos.keys()].filter((n) => n.startsWith('ponto-'))).toEqual([]);
  });

  it('o estado lido só não é copiado quando o desserializador devolve cópia', () => {
    const arquivos = new Map();
    const armazem = { ler: (n) => arquivos.get(n) ?? null, gravar: (n, b) => { arquivos.set(n, b); }, apagar: (n) => { arquivos.delete(n); } };
    /* o armazém que guarda o objeto e o devolve igual */
    const memoria = criarMemoriaEmArmazem({ armazem, serializar: structuredClone, desserializar: (x) => x, versao: 'v', rotulo: 'r', passosGuardados: [0] });
    const A = [['cubo', { origemId: 1, lado: 1 }], ['transladar', { sel: { origem: { op: 'cubo', id: 1 } }, d: [1, 0, 0] }]];
    for (let k = 0; k < 3; k += 1) expect(divergenciaDaImpressao(nucleo(A, {}, {}, {}, null, [], { memoria }), nucleo(A))).toBeNull();
  });

  it('maximo e limiar fora do domínio são recusados', () => {
    for (const maximo of [0, -1, 1.5, '4', NaN]) expect(() => memoriaDe(armazemNaMemoria(), { maximo })).toThrow(/maximo precisa ser inteiro de 1 em diante ou infinito/);
    expect(() => memoriaDe(armazemNaMemoria(), { limiarDeCustoMs: -1 })).toThrow(/limiarDeCustoMs/);
    expect(() => memoriaDe(armazemNaMemoria(), { maximo: Infinity })).not.toThrow();
  });
});
