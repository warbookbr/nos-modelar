/* migrar-etapas-para-impressao.test.mjs — a migração dos registros v2 para o v3: a classificação de cada etapa fixa pelas três vias,
   o aceite copiado como está, o relatório e a gravação. O caso do acervo (o carrinho de mão, um commit só) roda de verdade e mora na
   lista de lentos. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { acrescentarAceiteMigrado, imprimirEtapa, lerEtapas, registroVazio } from '../../src/autoria/etapas-pela-impressao.js';
import { arquivoDoRegistro } from './etapas-da-montagem.mjs';
import { classificarEtapa, descreverMigracao, gravarMigracao, planejarMigracao } from './migrar-etapas-para-impressao.mjs';

const medidoDe = (forma, { folga = 0.1, deslocamento = [0, 1, 0] } = {}) => ({
  montagem: 'm', ordem: ['a', 'b'],
  etapas: {
    a: { forma: 'sha256:a', parametros: [], pose: { rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, 0, 0] }, juntas: [] },
    b: { forma, parametros: [], pose: { rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento }, juntas: [{ relacao: 'r', com: 'a', satisfeita: true, medidas: { folga } }] },
  },
  citacoes: [{ etapa: 'a', porta: 'p', posterior: 'b', por: 'relação r', relacao: 'r' }],
  portas: { a: { p: { centro: [0, 0, 0] } } },
});
const ACEITE = { por: 'Tiago, 2026-11-05', observacao: 'ok, com a ressalva do friso', defeitosAceitos: ['friso baixo'], analise: 'feita' };
const etapaAntiga = (extra = {}) => ({ instancia: 'b', estado: 'fixa', forma: 'sha256:b', aceite: ACEITE, juntas: [{ relacao: 'r', com: 'a', satisfeita: true, medidas: { folga: 0.1 } }], ...extra });

describe('a classificação de uma etapa fixa', () => {
  it('(a) o commit reproduz a forma gravada: a impressão sai do commit, com a contraprova', () => {
    const doCommit = medidoDe('sha256:b', { deslocamento: [0, 0.9, 0] });
    const r = classificarEtapa(etapaAntiga(), doCommit, medidoDe('sha256:b'), { commit: 'abcdef0123456789' });
    expect(r.via).toBe('a');
    expect(r.impressao.pose.deslocamento).toEqual([0, 0.9, 0]);
    expect(r.origem).toEqual({ tipo: 'migração', via: 'commit do aceite', commit: 'abcdef0123456789' });
  });

  it('(b) o commit não reproduz a forma: a impressão de agora, com a porta não provada, se a forma e as juntas de agora são as gravadas', () => {
    for (const [doCommit, erroDoCommit] of [[medidoDe('sha256:outra'), null], [null, 'Cannot find module'], [null, null]]) {
      const r = classificarEtapa(etapaAntiga(), doCommit, medidoDe('sha256:b'), { commit: 'abcdef0123456789', erroDoCommit });
      expect(r.via).toBe('b');
      expect(r.impressao.pose.deslocamento).toEqual([0, 1, 0]);
      expect(r.origem).toMatchObject({ tipo: 'migração', via: 'impressão de agora', portaNaoProvada: true });
    }
    expect(classificarEtapa(etapaAntiga(), null, medidoDe('sha256:b'), { commit: null }).motivo).toContain('o commit do aceite não foi achado');
  });

  it('(c) a forma de agora não é a gravada, ou as medidas das juntas diferem, ou falta a forma gravada: a etapa não migra', () => {
    const outraForma = classificarEtapa(etapaAntiga(), null, medidoDe('sha256:nova'), { commit: 'abcdef0123456789' });
    expect(outraForma.via).toBe('c');
    expect(outraForma.motivo).toContain('a forma de agora não é a gravada no aceite');
    const juntaOutra = classificarEtapa(etapaAntiga(), null, medidoDe('sha256:b', { folga: 0.2 }), { commit: 'abcdef0123456789' });
    expect(juntaOutra.via).toBe('c');
    expect(juntaOutra.motivo).toContain('as medidas das juntas de agora diferem das gravadas (juntas[r].medidas.folga: 0.1 → 0.2)');
    expect(classificarEtapa(etapaAntiga({ forma: undefined }), null, medidoDe('sha256:b')).via).toBe('c');
    expect(classificarEtapa(etapaAntiga({ aceite: undefined }), null, medidoDe('sha256:b')).via).toBe('c');
    const semGeometria = { ...medidoDe('sha256:b'), etapas: { ...medidoDe('sha256:b').etapas, b: { juntas: [], erro: 'a receita não executa: x' } } };
    expect(classificarEtapa(etapaAntiga(), null, semGeometria).motivo).toContain('a receita não executa: x');
  });

  it('a poeira de ponto flutuante nas medidas das juntas não derruba a via (b)', () => {
    expect(classificarEtapa(etapaAntiga(), null, medidoDe('sha256:b', { folga: 0.1 + 1e-17 })).via).toBe('b');
  });
});

describe('o aceite migrado', () => {
  it('entra como está, com a origem, e a leitura o dá como fixa quando a impressão é a de agora', () => {
    const agora = medidoDe('sha256:b');
    const base = acrescentarAceiteMigrado(registroVazio('m'), 'a', { por: 'Tiago, 2026-11-01' }, imprimirEtapa(agora, 'a'), { tipo: 'migração', via: 'commit do aceite', commit: 'x' });
    const registro = acrescentarAceiteMigrado(base, 'b', ACEITE, imprimirEtapa(agora, 'b'), { tipo: 'migração', via: 'impressão de agora', portaNaoProvada: true });
    expect(registro.eventos[1].aceite).toEqual(ACEITE);
    expect(registro.eventos[1].origem.portaNaoProvada).toBe(true);
    expect(lerEtapas(registro, agora).etapas.map((e) => e.estado)).toEqual(['fixa', 'fixa']);
    expect(lerEtapas(registro, medidoDe('sha256:b', { deslocamento: [0, 2, 0] })).etapas.map((e) => e.estado)).toEqual(['fixa', 'quebrada']);
  });

  it('recusa o aceite repetido, a origem sem tipo e a impressão que não passa na validação', () => {
    const agora = medidoDe('sha256:b');
    const um = acrescentarAceiteMigrado(registroVazio('m'), 'a', { por: 'p' }, imprimirEtapa(agora, 'a'), { tipo: 'migração' });
    expect(() => acrescentarAceiteMigrado(um, 'a', { por: 'p' }, imprimirEtapa(agora, 'a'), { tipo: 'migração' })).toThrow(/já tem aceite vigente/);
    expect(() => acrescentarAceiteMigrado(registroVazio('m'), 'a', { por: 'p' }, imprimirEtapa(agora, 'a'), { via: 'x' })).toThrow(/origem/);
    expect(() => acrescentarAceiteMigrado(registroVazio('m'), 'a', { por: 'p' }, { forma: 'x' }, { tipo: 'migração' })).toThrow(/impressão/);
    expect(() => acrescentarAceiteMigrado(registroVazio('m'), 'a', {}, imprimirEtapa(agora, 'a'), { tipo: 'migração' })).toThrow(/quem aceitou/);
  });
});

describe('o relatório e a gravação', () => {
  let area; let arquivo;
  beforeEach(() => { area = mkdtempSync(join(tmpdir(), 'migrar-')); arquivo = join(area, 'montagem.json'); writeFileSync(arquivo, '{}'); });
  afterEach(() => rmSync(area, { recursive: true, force: true }));
  const antigo = (etapas) => ({ formato: 'mecanifica.registro-de-etapas', versao: 2, montagem: 'm', etapas });

  it('conta por via, copia o aceite, deixa aberta a que não migra e diz o estado de agora', async () => {
    const agora = medidoDe('sha256:b');
    writeFileSync(arquivoDoRegistro(arquivo), JSON.stringify(antigo([
      { instancia: 'a', estado: 'fixa', forma: 'sha256:a', aceite: { por: 'Ana, 2026-11-01' }, juntas: [] },
      etapaAntiga({ forma: 'sha256:velha' }),
    ])));
    const relatorio = await planejarMigracao(arquivo, { medidoAgora: agora, commits: new Map([['a', 'c1']]), medirDoCommit: async () => ({ medido: agora }) });
    expect(relatorio.contagem).toEqual({ a: 1, b: 0, c: 1, aberta: 0 });
    expect(relatorio.etapas.map((e) => [e.instancia, e.via, e.estadoDepois])).toEqual([['a', 'a', 'fixa'], ['b', 'c', undefined]]);
    expect(relatorio.registro.eventos).toHaveLength(1);
    expect(relatorio.registro.eventos[0].aceite).toEqual({ por: 'Ana, 2026-11-01' });
    expect(descreverMigracao(relatorio)).toContain('1 pela via (a), 0 pela (b), 1 pela (c)');
    expect(readFileSync(arquivoDoRegistro(arquivo), 'utf8')).toContain('"versao":2');
  });

  it('a etapa que estava aberta ou quebrada fica aberta; só --gravar grava, e só sobre o registro antigo', async () => {
    const agora = medidoDe('sha256:b');
    writeFileSync(arquivoDoRegistro(arquivo), JSON.stringify(antigo([
      { instancia: 'a', estado: 'fixa', forma: 'sha256:a', aceite: { por: 'Ana, 2026-11-01' }, juntas: [] },
      { instancia: 'b', estado: 'quebrada', juntas: [] },
    ])));
    const relatorio = await planejarMigracao(arquivo, { medidoAgora: agora, commits: new Map(), medirDoCommit: async () => ({ erro: 'sem commit' }) });
    expect(relatorio.contagem).toEqual({ a: 0, b: 1, c: 0, aberta: 1 });
    expect(relatorio.etapas[1]).toMatchObject({ via: 'aberta', estadoAntigo: 'quebrada' });
    gravarMigracao(arquivo, relatorio);
    const gravado = JSON.parse(readFileSync(arquivoDoRegistro(arquivo), 'utf8'));
    expect(gravado.versao).toBe(3);
    expect(gravado.eventos.map((e) => [e.instancia, e.origem.via])).toEqual([['a', 'impressão de agora']]);
    expect(() => gravarMigracao(arquivo, relatorio)).toThrow(/já é da versão 3/);
    await expect(planejarMigracao(arquivo, { medidoAgora: agora })).rejects.toThrow(/já é da versão 3/);
  });
});

describe('o acervo: o carrinho de mão, pelo commit do aceite', () => {
  it('as quatro etapas migram, todas conferem a forma pelo commit e a leitura de agora as dá fixas', async () => {
    const montagem = fileURLToPath(new URL('../../procedural/pecas/carrinho-de-mao/montagem.json', import.meta.url));
    const relatorio = await planejarMigracao(montagem);
    expect(relatorio.contagem).toEqual({ a: 4, b: 0, c: 0, aberta: 0 });
    expect(relatorio.fixasDepois).toBe(4);
    expect(relatorio.registro.eventos.every((e) => e.origem.via === 'commit do aceite')).toBe(true);
    expect(JSON.parse(readFileSync(arquivoDoRegistro(montagem), 'utf8')).versao).toBe(2);
  }, 300_000);
});
