/* migrar-etapas-para-impressao.test.mjs — a migração dos registros v2 para o v3: a classificação de cada etapa fixa pelas três vias,
   o aceite copiado como está, o relatório e a gravação. O caso do acervo (o carrinho de mão, um commit só) roda de verdade e mora na
   lista de lentos. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { acrescentarAceiteMigrado, imprimirEtapa, lerEtapas, registroVazio } from '../../src/autoria/etapas-pela-impressao.js';
import { arquivoDoRegistro } from './etapas-da-montagem.mjs';
import { classificarEtapa, descreverMigracao, gravarMigracao, historicoDoRegistro, inicioDasSequencias, planejarMigracao } from './migrar-etapas-para-impressao.mjs';

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
    const relatorio = await planejarMigracao(arquivo, { medidoAgora: agora, historico: [{ commit: 'c1c1c1c1c1', registro: JSON.parse(readFileSync(arquivoDoRegistro(arquivo), 'utf8')) }], medirDoCommit: async () => ({ medido: agora }) });
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
    const relatorio = await planejarMigracao(arquivo, { medidoAgora: agora, historico: [], medirDoCommit: async () => ({ erro: 'sem commit' }) });
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

describe('o commit do aceite: a última sequência contínua, e a lacuna', () => {
  const reg = (aceite, reaberturas) => ({ versao: 2, etapas: [{ instancia: 'a', estado: 'fixa', aceite, ...(reaberturas ? { reaberturas } : {}) }] });
  const aberta = { versao: 2, etapas: [{ instancia: 'a', estado: 'aberta' }] };
  const palavras = { por: 'Ana, 2026-11-01: ok' };
  const atual = reg(palavras, [{ por: 'Ana', motivo: 'x' }]);

  it('começa na primeira vez da última sequência em que a etapa aparece fixa com o aceite e as reaberturas de agora', () => {
    const historico = [
      { commit: 'c1', registro: reg({ por: 'Outra' }) },
      { commit: 'c2', registro: reg(palavras, [{ por: 'Ana', motivo: 'x' }]) },
      { commit: 'c3', registro: reg(palavras, [{ por: 'Ana', motivo: 'x' }]) },
    ];
    expect(inicioDasSequencias(historico, atual).get('a')).toEqual({ commit: 'c2', lacuna: false });
  });

  it('dado, reaberto e dado de novo com as mesmas palavras: o começo é o do último, e a lacuna manda a etapa para a via (b)', () => {
    const historico = [
      { commit: 'c1', registro: reg(palavras, [{ por: 'Ana', motivo: 'x' }]) },
      { commit: 'c2', registro: aberta },
      { commit: 'c3', registro: reg(palavras, [{ por: 'Ana', motivo: 'x' }]) },
    ];
    const achado = inicioDasSequencias(historico, atual).get('a');
    expect(achado).toEqual({ commit: 'c3', lacuna: true });
    const r = classificarEtapa(etapaAntiga(), medidoDe('sha256:b'), medidoDe('sha256:b'), { ...achado, commit: 'c3c3c3c3c3' });
    expect(r.via).toBe('b');
    expect(r.motivo).toContain('é ambíguo');
    /* as reaberturas diferentes não casam: a lista do v2 também é critério */
    expect(inicioDasSequencias([{ commit: 'c1', registro: reg(palavras, []) }], atual).get('a')).toEqual({ commit: null, lacuna: false });
  });

  it('fora do repositório não há histórico, e a etapa vai para a via (b) em vez de derrubar', async () => {
    expect(historicoDoRegistro(join(tmpdir(), 'fora', 'montagem.etapas.json'))).toEqual([]);
    const area = mkdtempSync(join(tmpdir(), 'migrar-fora-'));
    try {
      const arquivo = join(area, 'montagem.json');
      writeFileSync(arquivo, '{}');
      writeFileSync(arquivoDoRegistro(arquivo), JSON.stringify({ versao: 2, etapas: [etapaAntiga()] }));
      const relatorio = await planejarMigracao(arquivo, { medidoAgora: medidoDe('sha256:b') });
      expect(relatorio.contagem).toMatchObject({ a: 0, b: 1, c: 0 });
    } finally { rmSync(area, { recursive: true, force: true }); }
  });
});

describe('a via (a) confere as juntas, e o campo da porta não provada', () => {
  it('a forma bate mas as juntas do commit diferem das gravadas: a via (a) não vale, e a (b) decide', () => {
    const r = classificarEtapa(etapaAntiga(), medidoDe('sha256:b', { folga: 0.3 }), medidoDe('sha256:b'), { commit: 'abcdef0123456789' });
    expect(r.via).toBe('b');
    expect(r.motivo).toContain('as juntas dele diferem das gravadas');
    const sem = classificarEtapa(etapaAntiga(), medidoDe('sha256:b', { folga: 0.3 }), medidoDe('sha256:b', { folga: 0.3 }), { commit: 'abcdef0123456789' });
    expect(sem.via).toBe('c');
  });

  it('a porta não provada só aparece quando a etapa cita porta de etapa anterior', () => {
    const semCitar = { ...medidoDe('sha256:b'), citacoes: [] };
    const r = classificarEtapa(etapaAntiga(), null, semCitar, { commit: null });
    expect(r.via).toBe('b');
    expect(r.origem.portaNaoProvada).toBeUndefined();
    expect(r.motivo).toContain('não cita porta de etapa anterior');
    expect(classificarEtapa(etapaAntiga(), null, medidoDe('sha256:b'), { commit: null }).origem.portaNaoProvada).toBe(true);
  });

  it('a origem leva o commit do último v2 e a contagem das reaberturas antigas, e o relatório as imprime', async () => {
    const r = classificarEtapa(etapaAntiga({ reaberturas: [{ por: 'Ana', quando: '2026-11-03', motivo: 'placa nova' }] }), null, medidoDe('sha256:b'), { ultimoV2: 'deadbeef00' });
    expect(r.origem).toMatchObject({ tipo: 'migração', v2: 'deadbeef00', reaberturasAntigas: 1 });
    const area = mkdtempSync(join(tmpdir(), 'migrar-rea-'));
    try {
      const arquivo = join(area, 'montagem.json');
      writeFileSync(arquivo, '{}');
      const registro = { versao: 2, etapas: [etapaAntiga({ reaberturas: [{ por: 'Ana', quando: '2026-11-03', motivo: 'placa nova' }] })] };
      writeFileSync(arquivoDoRegistro(arquivo), JSON.stringify(registro));
      const relatorio = await planejarMigracao(arquivo, { medidoAgora: medidoDe('sha256:b'), historico: [{ commit: 'deadbeef00', registro }] });
      expect(relatorio.etapas[0].reaberturasAntigas).toEqual([{ por: 'Ana', quando: '2026-11-03', motivo: 'placa nova' }]);
      expect(descreverMigracao(relatorio)).toContain('reabertura antiga: Ana, 2026-11-03: placa nova');
      expect(relatorio.registro.eventos[0].origem.v2).toBe('deadbeef00');
    } finally { rmSync(area, { recursive: true, force: true }); }
  });
});

describe('a gravação e a regravação', () => {
  let area; let arquivo;
  beforeEach(() => { area = mkdtempSync(join(tmpdir(), 'migrar-grava-')); arquivo = join(area, 'montagem.json'); writeFileSync(arquivo, '{}'); });
  afterEach(() => rmSync(area, { recursive: true, force: true }));

  it('recusa gravar quando uma etapa fixa ficou na via (c), e a regravação só refaz um v3 feito de eventos migrados', async () => {
    const v2 = { versao: 2, etapas: [etapaAntiga({ forma: 'sha256:velha' })] };
    writeFileSync(arquivoDoRegistro(arquivo), JSON.stringify(v2));
    const ruim = await planejarMigracao(arquivo, { medidoAgora: medidoDe('sha256:b'), historico: [] });
    expect(ruim.contagem.c).toBe(1);
    expect(() => gravarMigracao(arquivo, ruim)).toThrow(/via \(c\)/);
    expect(JSON.parse(readFileSync(arquivoDoRegistro(arquivo), 'utf8')).versao).toBe(2);
    const v2bom = { versao: 2, etapas: [etapaAntiga()] };
    writeFileSync(arquivoDoRegistro(arquivo), JSON.stringify(v2bom));
    const historico = [{ commit: 'c1c1c1c1c1', registro: v2bom }];
    const bom = await planejarMigracao(arquivo, { medidoAgora: medidoDe('sha256:b'), historico });
    gravarMigracao(arquivo, bom);
    /* regravar: o v3 de eventos migrados volta ao último v2 do histórico */
    await expect(planejarMigracao(arquivo, { medidoAgora: medidoDe('sha256:b'), historico })).rejects.toThrow(/--regravar/);
    const refeito = await planejarMigracao(arquivo, { medidoAgora: medidoDe('sha256:b'), historico, regravar: true });
    expect(refeito.contagem.b).toBe(1);
    gravarMigracao(arquivo, refeito, { regravar: true });
    /* com um evento que não é de migração, regravar perderia: recusa */
    const gravado = JSON.parse(readFileSync(arquivoDoRegistro(arquivo), 'utf8'));
    gravado.eventos.push({ tipo: 'reabertura', instancia: 'b', por: 'p', quando: 'q', motivo: 'm' });
    writeFileSync(arquivoDoRegistro(arquivo), JSON.stringify(gravado));
    await expect(planejarMigracao(arquivo, { medidoAgora: medidoDe('sha256:b'), historico, regravar: true })).rejects.toThrow(/não são de migração/);
    expect(() => gravarMigracao(arquivo, refeito, { regravar: true })).toThrow(/não são de migração|já é da versão 3/);
  });
});

describe('o acervo: o carrinho de mão, pelo commit do aceite', () => {
  it('as quatro etapas migram pelo commit, com as juntas conferidas, e o resultado é o v3 que o commit 2e1e3129 gravou', async () => {
    const raiz = fileURLToPath(new URL('../..', import.meta.url));
    const montagem = join(raiz, 'procedural/pecas/carrinho-de-mao/montagem.json');
    const git = (...args) => execFileSync('git', args, { encoding: 'utf8', cwd: raiz });
    /* o registro v2 que a migração leu, e o v3 que ela gravou, como estavam nos commits (o arquivo de hoje pode ter sido regravado) */
    const antigo = JSON.parse(git('show', 'b0519ff3:procedural/pecas/carrinho-de-mao/montagem.etapas.json'));
    const gravadoEntao = JSON.parse(git('show', '2e1e3129:procedural/pecas/carrinho-de-mao/montagem.etapas.json'));
    const relatorio = await planejarMigracao(montagem, { registroAntigo: antigo });
    expect(relatorio.contagem).toEqual({ a: 4, b: 0, c: 0, aberta: 0 });
    expect(relatorio.fixasDepois).toBe(4);
    expect(relatorio.registro.eventos.every((e) => e.origem.via === 'commit do aceite' && e.origem.v2)).toBe(true);
    const pelaFatia = (eventos) => eventos.map((e) => ({ instancia: e.instancia, aceite: e.aceite, impressao: e.impressao, via: e.origem.via, commit: e.origem.commit }));
    expect(pelaFatia(relatorio.registro.eventos)).toEqual(pelaFatia(JSON.parse(JSON.stringify(gravadoEntao.eventos))));
    await expect(planejarMigracao(montagem)).rejects.toThrow(/já é da versão 3/);
  }, 300_000);
});
