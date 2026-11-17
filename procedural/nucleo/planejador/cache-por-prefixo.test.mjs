/* cache-por-prefixo.test.mjs — o cache por prefixo entre execuções (plano do cache por passo, fatia 3): a memória em armazém guarda o
 * estado depois de cada passo sob a chave dos passos até ele, e a execução seguinte recomeça do último ponto do prefixo que não mudou.
 *
 * Os três primeiros casos são os da revisão da fatia 2, em que um passo depende de um passo anterior por um caminho que a leitura
 * declarada não vê (a gaiola da `subdivisao`, a superfície do `friso` e a face que um passo apagou): muda só um passo anterior, e a
 * saída com o cache tem de ser a da execução inteira. Os outros provam os gates 2 e 4 do plano: a edição do último passo refaz só ele, e
 * o estado de outra versão do núcleo não é servido. */
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serialize, deserialize } from 'node:v8';
import { describe, expect, it } from 'vitest';
import { nucleo, usoDaOperacao } from '../entrada.js';
import { criarMemoriaEmArmazem } from './memoria-em-armazem.js';
import { divergenciaDaImpressao } from './impressao-do-neutro.js';

function armazemNaMemoria() {
  const arquivos = new Map();
  return { arquivos, ler: (n) => arquivos.get(n) ?? null, gravar: (n, b) => { arquivos.set(n, b); }, apagar: (n) => { arquivos.delete(n); } };
}
const memoriaDe = (armazem, extra = {}) => criarMemoriaEmArmazem({ armazem, serializar: serialize, desserializar: deserialize, versao: 'v1', rotulo: 'receita', todoPasso: true, ...extra });

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

  it('o modo conferido recusa a execução que recomeçou de um estado que não é o do prefixo', () => {
    const armazem = armazemNaMemoria();
    const memoria = memoriaDe(armazem);
    comMemoria(receita('a'), {}, memoria);
    /* troca o estado guardado depois do passo 2 pelo de depois do passo 1: a chave diz um prefixo, o estado é outro */
    const pontos = [...armazem.arquivos.keys()].filter((n) => n.startsWith('ponto-')).map((n) => [n, deserialize(armazem.arquivos.get(n))]);
    const depois1 = pontos.find(([, p]) => p.passo === 1)[1], [nome2, depois2] = pontos.find(([, p]) => p.passo === 2);
    armazem.arquivos.set(nome2, serialize({ ...depois2, estado: depois1.estado }));
    expect(() => nucleo(receita('b'), {}, {}, {}, null, [], { memoria, memoriaConferida: true }))
      .toThrow(/a execução que recomeçou do estado guardado depois do passo 2 divergiu da execução inteira: o campo '\w+' difere/);
  });
});
