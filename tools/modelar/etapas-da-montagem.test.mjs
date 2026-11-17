/* etapas-da-montagem.test.mjs — a porta que fixa etapa. Fixar exige a etapa
   ser a próxima, o crítico ter fechado a peça dela, a nota de passagem, as
   juntas passando e o aceite da pessoa. Cada recusa tem o seu caso. */
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registrarRodada } from '../../src/autoria/laco-de-modelagem.js';
import { ErroEtapaDeConstrucao } from '../../src/autoria/etapas-de-construcao.js';
import { arquivoDoRegistro, auditarEtapas, comoCLI, descreverAuditoria, estadoDasEtapas, fixar, gravarRegistro, montagemAteAGeometria, olharEtapas, reabrir } from './etapas-da-montagem.mjs';
import { receitaComParametros } from './peca-com-parametros.mjs';
import { lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
import { RECEITAS } from '../fixtures/tres-blocos-vinculados/receitas/bloco.js';

const ORIGEM = fileURLToPath(new URL('../fixtures/tres-blocos-vinculados/montagens/tres-blocos.json', import.meta.url));
let area;
let arquivo;
beforeEach(() => {
  area = mkdtempSync(join(tmpdir(), 'etapas-'));
  arquivo = join(area, 'tres-blocos.json');
  copyFileSync(ORIGEM, arquivo);
});
afterEach(() => rmSync(area, { recursive: true, force: true }));

const rodada = (peca, { fechada = true, nota = 'folga de 0,2 porque o pino é retificado' } = {}) => registrarRodada({
  peca, numero: 1, medidas: { passou: true, relatorio: 'ok' }, partes: [{ nome: 'corpo', confere: true }],
  veredito: { alvo: 'referencias/x.png', nota: fechada ? 9 : 5, defeitos: [], observacao: 'a peça bate com a referência nas quatro vistas' },
  ...(nota ? { notaDePassagem: nota } : {}),
});
const todasFechadas = (ref) => [rodada(ref)];
const aceite = { por: 'pessoa' };

async function recusa(promessa, codigo) {
  let erro;
  try { await promessa; } catch (capturado) { erro = capturado; }
  expect(erro).toBeInstanceOf(ErroEtapaDeConstrucao);
  expect(erro.codigo).toBe(codigo);
}

describe('etapas ainda sem geometria', () => {
  /* O plano de todas as partes existe antes da geometria delas. O registro tem
     de sair para a etapa em trabalho mesmo com as seguintes vazias. */
  const comTopoVazio = () => ({ ...RECEITAS, 'bloco-com-furo': { ...RECEITAS['bloco-com-furo'], PASSOS: [] } });

  it('resolve até antes da primeira receita vazia e deixa as seguintes abertas sem junta', async () => {
    const { registro } = await estadoDasEtapas(arquivo, { receitas: comTopoVazio(), anterior: null });
    expect(registro.etapas.map((e) => [e.instancia, e.estado, e.juntas.length])).toEqual([
      ['base', 'aberta', 0], ['meio', 'aberta', 1], ['topo', 'aberta', 0],
    ]);
  });

  it('a etapa sem geometria não pode ser fixada', async () => {
    const receitas = comTopoVazio();
    let registro = await fixar(arquivo, 'base', aceite, { receitas, anterior: null, rodadasDe: todasFechadas });
    registro = await fixar(arquivo, 'meio', aceite, { receitas, anterior: registro, rodadasDe: todasFechadas });
    await recusa(fixar(arquivo, 'topo', aceite, { receitas, anterior: registro, rodadasDe: () => [] }), 'etapa-sem-critico');
  });
});

describe('etapas da montagem em disco', () => {
  it('mostra as etapas abertas e aponta a primeira', async () => {
    const { registro } = await estadoDasEtapas(arquivo, { receitas: RECEITAS, anterior: null });
    expect(registro.etapas.map((e) => e.estado)).toEqual(['aberta', 'aberta', 'aberta']);
    expect(registro.etapas[1].juntas[0]).toMatchObject({ relacao: 'meioNoPinoDaBase', satisfeita: true });
  });

  it('recusa fixar sem o crítico ter fechado a peça', async () => {
    await recusa(fixar(arquivo, 'base', aceite, { receitas: RECEITAS, anterior: null, rodadasDe: () => [] }), 'etapa-sem-critico');
    await recusa(fixar(arquivo, 'base', aceite, { receitas: RECEITAS, anterior: null, rodadasDe: (r) => [rodada(r, { fechada: false })] }), 'etapa-sem-critico');
  });

  it('recusa fixar sem a nota de passagem', async () => {
    await recusa(fixar(arquivo, 'base', aceite, { receitas: RECEITAS, anterior: null, rodadasDe: (r) => [rodada(r, { nota: null })] }), 'etapa-sem-nota');
  });

  it('recusa fixar fora de ordem ou sem aceite, e fixa quando tudo está em dia', async () => {
    const opcoes = { receitas: RECEITAS, anterior: null, rodadasDe: todasFechadas };
    await recusa(fixar(arquivo, 'meio', aceite, opcoes), 'etapa-fora-de-ordem');
    await recusa(fixar(arquivo, 'base', {}, opcoes), 'etapa-sem-aceite');
    const registro = await fixar(arquivo, 'base', aceite, opcoes);
    expect(registro.etapas.map((e) => e.estado)).toEqual(['fixa', 'aberta', 'aberta']);
    const seguinte = await fixar(arquivo, 'meio', aceite, { ...opcoes, anterior: registro });
    expect(seguinte.etapas.map((e) => e.estado)).toEqual(['fixa', 'fixa', 'aberta']);
  });
});

describe('aceite humano com defeito em aberto', () => {
  const comDefeito = (peca) => [registrarRodada({
    peca, numero: 1, medidas: { passou: true, relatorio: 'ok' }, partes: [{ nome: 'corpo', confere: true }],
    veredito: { alvo: 'referencias/x.png', nota: 7, defeitos: [{ parte: 'corpo', tipo: 'posicao', onde: 'canto de baixo', sentido: 'alta', evidencia: 'frente-orto.png: canto visível fora do disco em x≈380, y≈930' }], observacao: 'a peça bate com a referência, menos o canto de baixo' },
    notaDePassagem: 'o canto ficou assim porque o colar é mais largo',
  })];

  it('no meio do laço, grava que o crítico não fechou junto dos defeitos', async () => {
    const noMeio = { receitas: RECEITAS, anterior: null, rodadasDe: comDefeito, limiteDe: () => 6 };
    await recusa(fixar(arquivo, 'base', aceite, noMeio), 'etapa-sem-critico');
    const registro = await fixar(arquivo, 'base', { ...aceite, aceiteHumano: true }, noMeio);
    const aceitos = registro.etapas[0].aceite.defeitosAceitos;
    expect(aceitos[0]).toMatch(/^crítico não fechou: /);
    expect(aceitos.slice(1)).toEqual(['corpo: posicao em canto de baixo']);
  });

  it('com o laço parado, grava os defeitos aceitos', async () => {
    const noMeio = { receitas: RECEITAS, anterior: null, rodadasDe: comDefeito, limiteDe: () => 6 };
    const parado = { ...noMeio, limiteDe: () => 1 };
    await recusa(fixar(arquivo, 'base', aceite, parado), 'etapa-sem-critico');
    const registro = await fixar(arquivo, 'base', { ...aceite, aceiteHumano: true }, parado);
    expect(registro.etapas[0]).toMatchObject({ estado: 'fixa', aceite: { por: 'pessoa', defeitosAceitos: ['corpo: posicao em canto de baixo'] } });
  });
});


describe('reabrir etapa fixa', () => {
  const opcoes = { receitas: RECEITAS, anterior: null, rodadasDe: todasFechadas };
  const POR = 'pessoa, 2026-09-26: refazer pelo desenho novo';
  async function duasFixas() {
    const r = await fixar(arquivo, 'base', { por: 'pessoa', observacao: 'ok' }, opcoes);
    return fixar(arquivo, 'meio', aceite, { ...opcoes, anterior: r });
  }

  it('recusa sem --por completo e recusa etapa que não está fixa', async () => {
    const registro = await duasFixas();
    await recusa(reabrir(arquivo, 'meio', undefined, { ...opcoes, anterior: registro }), 'reabertura-sem-autor');
    await recusa(reabrir(arquivo, 'meio', 'pessoa', { ...opcoes, anterior: registro }), 'reabertura-sem-autor');
    await recusa(reabrir(arquivo, 'topo', POR, { ...opcoes, anterior: registro }), 'etapa-nao-fixa');
    await recusa(reabrir(arquivo, 'nada', POR, { ...opcoes, anterior: registro }), 'etapa-inexistente');
  });

  it('reabre de trás para frente guardando o histórico', async () => {
    let registro = await duasFixas();
    registro = await reabrir(arquivo, 'meio', POR, { ...opcoes, anterior: registro });
    expect(registro.etapas.map((e) => e.estado)).toEqual(['fixa', 'aberta', 'aberta']);
    expect(registro.etapas[1].aceite).toBeUndefined();
    expect(registro.etapas[1].reaberturas).toEqual([{ por: 'pessoa', quando: '2026-09-26', motivo: 'refazer pelo desenho novo', aceite: { por: 'pessoa', analise: 'ausente' }, forma: expect.stringMatching(/^sha256:/), portas: { pino: expect.objectContaining({ forma: 'cilindro' }) } }]);
    /* A releitura mantém a etapa aberta e o histórico. */
    const { registro: relido } = await estadoDasEtapas(arquivo, { receitas: RECEITAS, anterior: registro });
    expect(relido.etapas[1]).toMatchObject({ estado: 'aberta', reaberturas: registro.etapas[1].reaberturas });
    /* Refixar acumula, sem apagar a reabertura. */
    const refixado = await fixar(arquivo, 'meio', aceite, { ...opcoes, anterior: relido });
    expect(refixado.etapas[1]).toMatchObject({ estado: 'fixa', reaberturas: [{ motivo: 'refazer pelo desenho novo' }] });
  });
});

/* REABRIR SEM REABRIR AS POSTERIORES. A posterior fica fixa quando prova que não mudou: a forma do aceite e as portas da etapa
   reaberta que ela cita iguais às do aceite. O meio cita a porta 'pino' da base por relação, vínculo e posição. */
describe('reabrir com as posteriores fixas que provam não ter mudado', () => {
  const opcoes = { receitas: RECEITAS, rodadasDe: todasFechadas };
  const POR = 'pessoa, 2026-11-17: a base muda e o meio não';
  const comBase = (tabela) => ({ ...RECEITAS, 'bloco-com-pino': receitaComParametros(RECEITAS['bloco-com-pino'], tabela) });
  async function duasFixas() {
    const r = await fixar(arquivo, 'base', aceite, { ...opcoes, anterior: null });
    const d = await fixar(arquivo, 'meio', aceite, { ...opcoes, anterior: r });
    return fixar(arquivo, 'topo', aceite, { ...opcoes, anterior: d });
  }
  const estados = (r) => r.etapas.map((e) => e.estado);
  const semPortas = (r) => ({ ...r, etapas: r.etapas.map(({ portas, ...e }) => e) });

  it('o aceite guarda as portas que as posteriores citam', async () => {
    const registro = await duasFixas();
    expect(Object.keys(registro.etapas[0].portas)).toEqual(['pino']);
    expect(registro.etapas[0].portas.pino).toMatchObject({ forma: 'cilindro', raio: 0.01, fim: 0.015 });
  });

  it('reabre a base fixa e mantém o meio fixo', async () => {
    const registro = await duasFixas();
    const { registro: reaberto, provas } = await reabrir(arquivo, 'base', POR, { ...opcoes, anterior: registro, comProvas: true });
    expect(estados(reaberto)).toEqual(['aberta', 'fixa', 'fixa']);
    expect(provas).toEqual([
      "meio: forma do aceite, a porta 'pino' igual à do aceite",
      "topo: forma do aceite, sem citar porta de etapa reaberta ou não provada",
    ]);
    /* a reabertura guarda o aceite e as portas do aceite, a referência das leituras seguintes */
    expect(reaberto.etapas[0].reaberturas.at(-1)).toMatchObject({ por: 'pessoa', motivo: 'a base muda e o meio não', aceite, portas: registro.etapas[0].portas });
  });

  it('reabre a base quebrada por uma mudança que não toca a porta citada, e o meio segue fixo', async () => {
    const registro = await duasFixas();
    const receitas = comBase({ raioDoCorpo: 34 });
    const { registro: quebrada } = await estadoDasEtapas(arquivo, { receitas, anterior: registro });
    expect(estados(quebrada)).toEqual(['quebrada', 'fixa', 'fixa']);
    const reaberto = await reabrir(arquivo, 'base', POR, { ...opcoes, receitas, anterior: registro });
    expect(estados(reaberto)).toEqual(['aberta', 'fixa', 'fixa']);
    /* o aceite antigo está na reabertura que a leitura guardou, e a nova traz quem reabriu */
    expect(reaberto.etapas[0].reaberturas.map((r) => r.por)).toEqual(['leitura do registro', 'pessoa']);
    expect(reaberto.etapas[0].reaberturas[0]).toMatchObject({ aceite, forma: registro.etapas[0].forma });
    expect(reaberto.etapas[0].motivo).toBeUndefined();
    /* a releitura segue com a base aberta e o meio fixo */
    const { registro: relido } = await estadoDasEtapas(arquivo, { receitas, anterior: reaberto });
    expect(estados(relido)).toEqual(['aberta', 'fixa', 'fixa']);
  });

  it('recusa quando a porta que a posterior cita mudou, dizendo qual e o quê', async () => {
    const registro = await duasFixas();
    const receitas = comBase({ alturaDoPino: 18 });
    let erro;
    try { await reabrir(arquivo, 'base', POR, { ...opcoes, receitas, anterior: registro }); } catch (e) { erro = e; }
    expect(erro).toBeInstanceOf(ErroEtapaDeConstrucao);
    expect(erro.codigo).toBe('etapa-com-posteriores-fixas');
    expect(erro.message).toMatch(/'meio' \(a porta 'pino' de 'base', que ela cita \(relação meioNoPinoDaBase, vínculo .*\), mudou desde o aceite de 'base': fim: 0\.015 → 0\.018\)/);
  });

  it('recusa quando a posterior quebrou junto', async () => {
    const registro = await duasFixas();
    const receitas = comBase({ raioDoPino: 12 });
    await recusa(reabrir(arquivo, 'base', POR, { ...opcoes, receitas, anterior: registro }), 'etapa-com-posteriores-fixas');
  });

  it('sem as portas no registro (anterior a esta regra), prova pela medida da junta sobre a porta, e guarda as portas provadas', async () => {
    const registro = semPortas(await duasFixas());
    const { registro: reaberto, provas } = await reabrir(arquivo, 'base', POR, { ...opcoes, receitas: comBase({ raioDoCorpo: 34 }), anterior: registro, comProvas: true });
    expect(provas[0]).toBe("meio: forma do aceite, a porta 'pino' provada pela junta 'meioNoPinoDaBase', com a medida do aceite (as portas do aceite não estão guardadas)");
    expect(reaberto.etapas[0].reaberturas.at(-1).portas.pino).toMatchObject({ fim: 0.015 });
  });

  /* A1 e A6 da revisão de 2026-11-17: a etapa reaberta que muda depois a porta citada quebrava nada, e o --fixar dela fixava tudo
     com o aceite antigo das posteriores. */
  it.each([
    ['reaberta fixa', {}],
    ['reaberta quebrada', { raioDoCorpo: 34 }],
  ])('%s: mudar depois a porta citada quebra as posteriores pela cadeia, e o --fixar dela recusa', async (_, antes) => {
    const registro = await duasFixas();
    const reaberto = await reabrir(arquivo, 'base', POR, { ...opcoes, receitas: comBase(antes), anterior: registro });
    for (const tabela of [{ alturaDoPino: 18 }, { alturaDoCorpo: 30 }]) {
      const receitas = comBase({ ...antes, ...tabela });
      const { registro: relido } = await estadoDasEtapas(arquivo, { receitas, anterior: reaberto });
      expect(estados(relido)).toEqual(['aberta', 'quebrada', 'quebrada']);
      expect(relido.etapas[1].motivo).toMatch(/^a porta 'pino' de 'base', que ela cita \(.*\), mudou desde o aceite de 'base': /);
      expect(relido.etapas[2].motivo).toMatch(/^cita a porta 'pino' de 'meio' \(.*\), que quebrou por isso$/);
      expect(relido.etapas[1].reaberturas.at(-1)).toMatchObject({ por: 'leitura do registro', aceite });
      await recusa(fixar(arquivo, 'base', aceite, { ...opcoes, receitas, anterior: reaberto }), 'etapa-com-posterior-quebrada');
    }
    /* a mesma receita da reabertura não quebra nada, e a base se fixa */
    const { registro: igual } = await estadoDasEtapas(arquivo, { receitas: comBase(antes), anterior: reaberto });
    expect(estados(igual)).toEqual(['aberta', 'fixa', 'fixa']);
    expect(estados(await fixar(arquivo, 'base', aceite, { ...opcoes, receitas: comBase(antes), anterior: reaberto }))).toEqual(['fixa', 'fixa', 'fixa']);
  });

  /* A7: sem as portas do aceite, a porta citada só por posição e vínculo não tem junta que a prove. */
  it('sem as portas no registro, a porta citada sem junta medida não está provada e a reabertura recusa', async () => {
    const dado = JSON.parse(readFileSync(arquivo, 'utf8'));
    dado.relacoes = dado.relacoes.filter((r) => r.id !== 'meioNoPinoDaBase');
    writeFileSync(arquivo, JSON.stringify(dado, null, 2));
    const registro = semPortas(await duasFixas());
    let erro;
    try { await reabrir(arquivo, 'base', POR, { ...opcoes, receitas: comBase({ raioDoCorpo: 34 }), anterior: registro }); } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('etapa-com-posteriores-fixas');
    expect(erro.message).toMatch(/'meio' \(a porta 'pino' de 'base', que ela cita \(vínculo .*posição meioSobreABase\), não tem junta medida que a prove/);
  });

  /* A3: a etapa intermediária aberta não corta a cadeia. */
  it('com o meio aberto, a base que muda a porta que o meio cita não deixa o topo fixo', async () => {
    const registro = await duasFixas();
    const meioAberto = await reabrir(arquivo, 'meio', POR, { ...opcoes, anterior: registro });
    const receitas = comBase({ alturaDoCorpo: 30 });
    const { registro: lido } = await estadoDasEtapas(arquivo, { receitas, anterior: meioAberto });
    expect(estados(lido)).toEqual(['quebrada', 'aberta', 'quebrada']);
    await recusa(reabrir(arquivo, 'base', POR, { ...opcoes, receitas, anterior: meioAberto }), 'etapa-com-posteriores-fixas');
    /* a prova pela cadeia, sem a leitura ter quebrado o topo: o meio aberto não provou, e o topo, que o cita, também não */
    const { conferirPosteriores } = await import('../../src/autoria/etapas-de-construcao.js');
    const comTopoFixo = { ...lido, etapas: lido.etapas.map((e) => (e.instancia === 'topo' ? { ...e, estado: 'fixa', motivo: undefined } : e)) };
    const { citacoes, portas } = await estadoDasEtapas(arquivo, { receitas, anterior: meioAberto });
    const { mudaram } = conferirPosteriores(comTopoFixo, 'base', { citacoes, portasAgora: portas.base, anterior: meioAberto });
    expect(mudaram.map((m) => m.posterior)).toEqual(['topo']);
    expect(mudaram[0].oQue).toMatch(/^cita a porta 'pino' de 'meio' \(.*\), que está aberta e não provou: a porta 'pino' de 'base'.* mudou: centro: /);
  });

  /* A5: sem o contexto não há prova de porta. */
  it('reabrirEtapa sem o contexto recusa', async () => {
    const { reabrirEtapa } = await import('../../src/autoria/etapas-de-construcao.js');
    const registro = await duasFixas();
    expect(() => reabrirEtapa(registro, 'base', { por: 'p', quando: '2026-11-17', motivo: 'x' })).toThrow(/exige o contexto/);
  });

  /* NIT: a porta de dentro de uma submontagem não é conferida, e a citação dela não prova. */
  it('a citação de porta de dentro de uma submontagem entra marcada como profunda e não prova', async () => {
    const { citacoesDasPortas } = await import('./etapas-da-montagem.mjs');
    const montagem = {
      etapas: ['a', 'b'],
      relacoes: [{ id: 'r', referencia: { caminho: ['a', 'sub'], porta: 'p' }, movel: { caminho: ['b'], porta: 'q' } }],
    };
    expect(citacoesDasPortas(montagem)).toEqual([{ etapa: 'a', porta: 'sub:p', posterior: 'b', por: 'relação r', relacao: 'r', profunda: true }]);
    const { conferirPosteriores } = await import('../../src/autoria/etapas-de-construcao.js');
    const registro = { etapas: [{ instancia: 'a', estado: 'fixa', portas: {} }, { instancia: 'b', estado: 'fixa', juntas: [] }] };
    const { mudaram } = conferirPosteriores(registro, 'a', { citacoes: citacoesDasPortas(montagem), portasAgora: {} });
    expect(mudaram[0].oQue).toMatch(/fica dentro de uma submontagem/);
  });
});

/* B1 a B6 da revisão de 2026-11-17, com o registro gravado em disco no meio do caminho, como a ferramenta grava a cada --reabrir e
   --fixar: a quebrada segue quebrada até a reabertura, não se fixa direto, e a porta que muda (com a malha igual, ou fora das
   portas do aceite) abala as posteriores. */
describe('o registro gravado no meio do caminho', () => {
  const opcoes = { receitas: RECEITAS, rodadasDe: todasFechadas };
  const POR = 'pessoa, 2026-11-17: a base muda';
  const estados = (r) => r.etapas.map((e) => e.estado);
  const semPortas = (r) => ({ ...r, etapas: r.etapas.map(({ portas, ...e }) => e) });
  const comBase = (tabela) => ({ ...RECEITAS, 'bloco-com-pino': receitaComParametros(RECEITAS['bloco-com-pino'], tabela) });
  /* a base com os passos trocados por `f`: a porta deslocada com a malha igual, ou uma porta a mais */
  const comPassosDaBase = (f) => {
    const b = receitaComParametros(RECEITAS['bloco-com-pino'], {});
    const d = Object.getOwnPropertyDescriptors(b);
    return { ...RECEITAS, 'bloco-com-pino': Object.defineProperties({}, { ...d, PASSOS: { enumerable: true, configurable: true, get() { return f(d.PASSOS.get.call(this)); } } }) };
  };
  const portaDoPino = (mudar) => (passos) => passos.map((p) => (p[0] === 'publicarPorta' && p[1].nome === 'pino' ? ['publicarPorta', { ...p[1], interface: mudar(p[1].interface) }] : p));
  const comOutra = (passos) => [...passos, ...passos.filter((p) => p[0] === 'publicarPorta' && p[1].nome === 'pino')
    .map((p) => ['publicarPorta', { ...p[1], nome: 'outro', interface: { ...p[1].interface, centro: [0, p[1].interface.centro[1] + 0.01, 0] } }])];
  const disco = () => JSON.parse(readFileSync(arquivoDoRegistro(arquivo), 'utf8'));
  async function tresFixas(receitas = RECEITAS) {
    let r = await fixar(arquivo, 'base', aceite, { ...opcoes, receitas, anterior: null });
    r = await fixar(arquivo, 'meio', aceite, { ...opcoes, receitas, anterior: r });
    return fixar(arquivo, 'topo', aceite, { ...opcoes, receitas, anterior: r });
  }

  it('B6 e B7: a etapa quebrada não se fixa direto, com o registro com e sem portas', async () => {
    for (const preparar of [(r) => r, semPortas]) {
      gravarRegistro(arquivo, preparar(await tresFixas()));
      await recusa(fixar(arquivo, 'base', aceite, { ...opcoes, receitas: comBase({ alturaDoCorpo: 30 }) }), 'etapa-quebrada');
    }
  });

  it('B1: a posterior quebrada gravada por outra reabertura segue quebrada e segura o --fixar até ser reaberta', async () => {
    gravarRegistro(arquivo, await tresFixas());
    gravarRegistro(arquivo, await reabrir(arquivo, 'base', POR, opcoes));
    const receitas = comBase({ alturaDoPino: 18 });
    expect(estados((await estadoDasEtapas(arquivo, { receitas })).registro)).toEqual(['aberta', 'quebrada', 'quebrada']);
    gravarRegistro(arquivo, await reabrir(arquivo, 'topo', POR, { ...opcoes, receitas }));
    expect(estados(disco())).toEqual(['aberta', 'quebrada', 'aberta']);
    /* relida do disco, a quebrada não volta a aberta sozinha, e a base não se fixa por cima dela */
    expect(estados((await estadoDasEtapas(arquivo, { receitas })).registro)).toEqual(['aberta', 'quebrada', 'aberta']);
    await recusa(fixar(arquivo, 'base', aceite, { ...opcoes, receitas }), 'etapa-com-posterior-quebrada');
    gravarRegistro(arquivo, await reabrir(arquivo, 'meio', POR, { ...opcoes, receitas }));
    expect(disco().etapas[1].reaberturas.map((r) => r.por)).toEqual(['leitura do registro', 'pessoa']);
    expect(estados(await fixar(arquivo, 'base', aceite, { ...opcoes, receitas }))).toEqual(['fixa', 'aberta', 'aberta']);
  });

  it('B5: no registro sem portas, a escrita no meio do caminho não lava a prova pela junta', async () => {
    /* a base mais alta muda a medida da junta do meio com ela; a reabertura do topo grava a base quebrada e o meio fixo com a
       junta já medida depois da mudança */
    gravarRegistro(arquivo, semPortas(await tresFixas()));
    const receitas = comBase({ alturaDoCorpo: 30 });
    gravarRegistro(arquivo, await reabrir(arquivo, 'topo', POR, { ...opcoes, receitas }));
    /* a medida da junta que mudou, sem as portas do aceite para conferir, quebra o meio já na leitura */
    expect(estados(disco())).toEqual(['quebrada', 'quebrada', 'aberta']);
    const guardada = disco().etapas[0].reaberturas.at(-1).juntasDasPosteriores.meio;
    expect(guardada.map((j) => j.relacao)).toEqual(['meioNoPinoDaBase']);
    expect(disco().etapas[1].juntas[0].medidas).not.toEqual(guardada[0].medidas);
    expect(disco().etapas[1].motivo).toMatch(/medida da junta 'meioNoPinoDaBase' mudou/);
    /* relida, a base segue quebrada, não se fixa direto, e a reabertura compara com a junta do aceite, e não com a do disco */
    expect(estados((await estadoDasEtapas(arquivo, { receitas })).registro)).toEqual(['quebrada', 'quebrada', 'aberta']);
    await recusa(fixar(arquivo, 'base', aceite, { ...opcoes, receitas }), 'etapa-quebrada');
    await recusa(reabrir(arquivo, 'base', POR, { ...opcoes, receitas }), 'etapa-com-posteriores-fixas');
    /* a mudança que não toca a junta se prova pela junta guardada, depois da mesma escrita no meio do caminho */
    gravarRegistro(arquivo, semPortas(await tresFixas()));
    const largura = comBase({ raioDoCorpo: 34 });
    gravarRegistro(arquivo, await reabrir(arquivo, 'topo', POR, { ...opcoes, receitas: largura }));
    const { provas } = await reabrir(arquivo, 'base', POR, { ...opcoes, receitas: largura, comProvas: true });
    expect(provas).toEqual(["meio: forma do aceite, a porta 'pino' provada pela junta 'meioNoPinoDaBase', com a medida do aceite (as portas do aceite não estão guardadas)"]);
  });

  it('B2: a porta da etapa fixa que muda com a malha igual quebra a etapa e as posteriores', async () => {
    gravarRegistro(arquivo, await tresFixas());
    const receitas = comPassosDaBase(portaDoPino((i) => ({ ...i, centro: [0, i.centro[1] + 0.01, 0] })));
    const { registro } = await estadoDasEtapas(arquivo, { receitas });
    expect(registro.etapas[0].forma).toBe(disco().etapas[0].forma);
    expect(estados(registro)).toEqual(['quebrada', 'quebrada', 'quebrada']);
    expect(registro.etapas[0].motivo).toBe("a porta 'pino' mudou depois do aceite: centro: [0,0.02,0] → [0,0.03,0]");
    await recusa(fixar(arquivo, 'base', aceite, { ...opcoes, receitas }), 'etapa-quebrada');
  });

  it('B4: a citação nova a uma porta fora das portas do aceite abala a posterior', async () => {
    const receitas = comPassosDaBase(comOutra);
    gravarRegistro(arquivo, await tresFixas(receitas));
    gravarRegistro(arquivo, await reabrir(arquivo, 'base', POR, { ...opcoes, receitas }));
    expect(Object.keys(disco().etapas[0].reaberturas.at(-1).portas)).toEqual(['pino']);
    const dado = JSON.parse(readFileSync(arquivo, 'utf8'));
    dado.relacoes[0].referencia.porta = 'outro';
    dado.vinculos.filter((v) => v.de.instancia === 'base').forEach((v) => { v.de.porta = 'outro'; });
    dado.posicoes[0].em.porta = 'outro';
    writeFileSync(arquivo, JSON.stringify(dado, null, 2));
    const { registro } = await estadoDasEtapas(arquivo, { receitas });
    expect(estados(registro)).toEqual(['aberta', 'quebrada', 'quebrada']);
    expect(registro.etapas[1].motivo).toMatch(/^a porta 'outro' de 'base', que ela cita \(.*\), não está nas portas do aceite de 'base'$/);
    await recusa(fixar(arquivo, 'base', aceite, { ...opcoes, receitas }), 'etapa-com-posterior-quebrada');
  });

  /* A quarta revisão (2026-11-17). */
  const comQuarto = (dado) => {
    dado.instancias.push({ id: 'quarto', alvo: { tipo: 'peca', ref: 'bloco-com-furo' } });
    dado.etapas.push('quarto');
    dado.relacoes.push({ ...JSON.parse(JSON.stringify(dado.relacoes[0])), id: 'quartoNoOutroDaBase', referencia: { caminho: ['base'], porta: 'outro' }, movel: { caminho: ['quarto'], porta: 'furo' } });
    dado.posicoes.push({ id: 'quartoSobreOOutro', instancia: 'quarto', porta: 'furo', em: { instancia: 'base', porta: 'outro' }, unidade: 'mm', afastamento: 0 });
    dado.vinculos.push({ id: 'furoDoQuarto', alvo: { instancia: 'quarto', param: 'raioDoFuro' }, de: { instancia: 'base', porta: 'outro', medida: 'raio' }, unidade: 'mm', acrescimo: 0.2 });
    return dado;
  };

  it('C2: a etapa nova que cita porta da base fora do aceite fixa sem quebrar na releitura, e a porta entra nas da base', async () => {
    const receitas = comPassosDaBase(comOutra);
    gravarRegistro(arquivo, await tresFixas(receitas));
    writeFileSync(arquivo, JSON.stringify(comQuarto(JSON.parse(readFileSync(arquivo, 'utf8'))), null, 2));
    expect(estados((await estadoDasEtapas(arquivo, { receitas })).registro)).toEqual(['fixa', 'fixa', 'fixa', 'aberta']);
    const fixado = await fixar(arquivo, 'quarto', aceite, { ...opcoes, receitas });
    expect(Object.keys(fixado.etapas[0].portas)).toEqual(['outro', 'pino']);
    gravarRegistro(arquivo, fixado);
    expect(estados((await estadoDasEtapas(arquivo, { receitas })).registro)).toEqual(['fixa', 'fixa', 'fixa', 'fixa']);
    /* a porta guardada agora vale: mudá-la depois do aceite abala a base e a quarta */
    const movida = comPassosDaBase((p) => comOutra(p).map((q) => (q[0] === 'publicarPorta' && q[1].nome === 'outro' ? ['publicarPorta', { ...q[1], interface: { ...q[1].interface, centro: [0, 0.09, 0] } }] : q)));
    expect(estados((await estadoDasEtapas(arquivo, { receitas: movida })).registro)[0]).toBe('quebrada');
  });

  const vazia = (ref) => ({ ...RECEITAS, [ref]: { ...RECEITAS[ref], PASSOS: [] } });
  const movido = () => comPassosDaBase(portaDoPino((i) => ({ ...i, centro: [0, i.centro[1] + 0.01, 0] })));

  it('D1: a etapa sem geometria (PASSOS vazio) é lida como mudada e quebra as posteriores, e não passa por fixa', async () => {
    gravarRegistro(arquivo, await tresFixas());
    gravarRegistro(arquivo, await reabrir(arquivo, 'base', POR, opcoes));
    expect(estados((await estadoDasEtapas(arquivo, { receitas: vazia('bloco-com-pino') })).registro)).toEqual(['aberta', 'quebrada', 'quebrada']);
    /* a base fixa que perde os passos também não segue fixa */
    gravarRegistro(arquivo, await tresFixas());
    expect(estados((await estadoDasEtapas(arquivo, { receitas: vazia('bloco-com-pino') })).registro)).not.toContain('fixa');
  });

  it('D2: a etapa sem geometria não se fixa, nem com aceite humano', async () => {
    gravarRegistro(arquivo, await tresFixas());
    gravarRegistro(arquivo, await reabrir(arquivo, 'base', POR, opcoes));
    const receitas = vazia('bloco-com-pino');
    const erro = await fixar(arquivo, 'base', aceite, { ...opcoes, receitas }).catch((e) => e);
    expect(erro.codigo).toBe('etapa-sem-geometria');
    expect(erro.message).toMatch(/PASSOS/);
    expect(erro.message).toMatch(/submontagem/);
    await recusa(fixar(arquivo, 'base', { ...aceite, aceiteHumano: true }, { ...opcoes, receitas }), 'etapa-sem-geometria');
  });

  it('E7: no registro sem portas, reabrir a base esvaziada recusa enquanto a posterior fixa depende da porta, e a base cheia não deixa o pino mudado ser fixado', async () => {
    gravarRegistro(arquivo, semPortas(await tresFixas()));
    await recusa(reabrir(arquivo, 'base', POR, { ...opcoes, receitas: vazia('bloco-com-pino') }), 'etapa-com-posteriores-fixas');
    gravarRegistro(arquivo, await reabrir(arquivo, 'base', POR, opcoes));
    const movidoX = comPassosDaBase(portaDoPino((i) => ({ ...i, centro: [i.centro[0] + 0.005, i.centro[1], i.centro[2]] })));
    expect(estados((await estadoDasEtapas(arquivo, { receitas: movidoX })).registro)).toEqual(['aberta', 'quebrada', 'quebrada']);
    await recusa(fixar(arquivo, 'base', aceite, { ...opcoes, receitas: movidoX }), 'etapa-com-posterior-quebrada');
  });

  it('E8: no registro sem portas, o meio esvaziado com o pino da base movido não deixa reabrir a base e lavar a junta do meio', async () => {
    gravarRegistro(arquivo, semPortas(await tresFixas()));
    const movidoEMeioVazio = { ...movido(), 'bloco-com-furo-e-pino': { ...RECEITAS['bloco-com-furo-e-pino'], PASSOS: [] } };
    await recusa(reabrir(arquivo, 'base', POR, { ...opcoes, receitas: movidoEMeioVazio }), 'etapa-com-posteriores-fixas');
  });

  it('C3: no registro sem portas, a medida da junta que mudou com a malha igual quebra a posterior fixa', async () => {
    gravarRegistro(arquivo, semPortas(await tresFixas()));
    const receitas = comPassosDaBase(portaDoPino((i) => ({ ...i, centro: [0, i.centro[1] + 0.01, 0] })));
    const { registro } = await estadoDasEtapas(arquivo, { receitas });
    expect(estados(registro)).toEqual(['fixa', 'quebrada', 'quebrada']);
    expect(registro.etapas[1].motivo).toMatch(/medida da junta 'meioNoPinoDaBase' mudou/);
  });
});

describe('a etapa compara a forma que a receita gera, e não o texto', () => {
  const opcoes = { receitas: RECEITAS, anterior: null, rodadasDe: todasFechadas };
  const comOutroTexto = { ...RECEITAS, 'bloco-com-pino': { ...RECEITAS['bloco-com-pino'], meta: { nome: 'outro nome', desc: 'comentário novo' }, PLANO: { criterios: ['critério novo'] } } };
  const comOutraForma = { ...RECEITAS, 'bloco-com-pino': receitaComParametros(RECEITAS['bloco-com-pino'], { raioDoCorpo: 31 }) };

  it('mudar meta e PLANO sem mudar a malha mantém a etapa fixa', async () => {
    const fixa = await fixar(arquivo, 'base', aceite, opcoes);
    expect(fixa.etapas[0].forma).toMatch(/^sha256:/);
    const { registro } = await estadoDasEtapas(arquivo, { receitas: comOutroTexto, anterior: fixa });
    expect(registro.etapas[0]).toMatchObject({ estado: 'fixa', forma: fixa.etapas[0].forma, aceite });
  });

  it('mudar a malha quebra a etapa e o aceite sobrevive a duas leituras', async () => {
    const fixa = await fixar(arquivo, 'base', aceite, opcoes);
    const { registro: quebrada } = await estadoDasEtapas(arquivo, { receitas: comOutraForma, anterior: fixa });
    expect(quebrada.etapas[0]).toMatchObject({ estado: 'quebrada', motivo: 'a receita mudou depois do aceite' });
    const { registro: relida } = await estadoDasEtapas(arquivo, { receitas: comOutraForma, anterior: quebrada });
    expect(relida.etapas[0].estado).toBe('quebrada');
    expect(relida.etapas[0].reaberturas[0]).toMatchObject({ motivo: 'a receita mudou depois do aceite', aceite: expect.objectContaining({ por: 'pessoa' }), forma: fixa.etapas[0].forma });
  });
});

describe('campo analise no aceite', () => {
  const opcoes = (manifesto) => ({
    receitas: RECEITAS, anterior: null, rodadasDe: todasFechadas,
    analise: { lerManifestoDe: () => manifesto, hashDe: () => 'hash-atual' },
  });

  it('grava feita quando o manifesto traz o hash da receita atual', async () => {
    const registro = await fixar(arquivo, 'base', aceite, opcoes({ receita: 'hash-atual' }));
    expect(registro.etapas[0].aceite.analise).toBe('feita');
  });

  it('grava ausente com hash errado ou sem manifesto, sem bloquear o aceite', async () => {
    const velho = await fixar(arquivo, 'base', aceite, opcoes({ receita: 'hash-velho' }));
    expect(velho.etapas[0]).toMatchObject({ estado: 'fixa', aceite: { analise: 'ausente' } });
    const sem = await fixar(arquivo, 'base', { ...aceite, aceiteHumano: true }, opcoes(null));
    expect(sem.etapas[0].aceite.analise).toBe('ausente');
  });
});

describe('as etapas construídas vistas juntas, com o quadro numa instância', () => {
  /* O quadro do conjunto faz a peça da etapa pequena demais para o crítico. Com `foco` o quadro fecha na caixa da instância e as outras
     peças ficam em volta; a captura é trocada por um gravador, e o que se confere é o que ela recebe e o que o arquivo leva no nome. */
  function capturaFalsa(pedidos) {
    return async (opcoes) => {
      pedidos.push(opcoes);
      return {
        ok: true,
        resultado: {
          capturas: opcoes.vistas.map((nome) => ({ nome, dados: Buffer.from(`png-${nome}`), enquadramento: { valida: true, area: 0.5, largura: 0.6, altura: 0.83, cortado: false } })),
        },
      };
    };
  }

  it('o foco chega à captura como caminho, com a folga e o quadro pedidos, e o arquivo leva a instância no nome', async () => {
    const pedidos = [];
    const saida = join(area, 'vistas');
    const r = await olharEtapas(arquivo, {
      vistas: ['frontal', 'direita'], saida, foco: 'meio', folga: 0.2, largura: 1200, altura: 1000, capturar: capturaFalsa(pedidos), receitas: RECEITAS,
    });
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0]).toMatchObject({ vistas: ['frontal', 'direita'], projecao: 'ortografica', foco: ['meio'], folga: 0.2, largura: 1200, altura: 1000 });
    expect(r.construidas).toEqual(['base', 'meio', 'topo']);
    expect(r.foco).toEqual(['meio']);
    expect(r.arquivos.map((a) => a.slice(saida.length + 1))).toEqual(['etapas-tres-blocos-frontal-orto-foco-meio.png', 'etapas-tres-blocos-direita-orto-foco-meio.png']);
    expect(r.enquadramentos).toEqual([
      { vista: 'frontal', valida: true, area: 0.5, largura: 0.6, altura: 0.83, cortado: false },
      { vista: 'direita', valida: true, area: 0.5, largura: 0.6, altura: 0.83, cortado: false },
    ]);
  });

  it('sem foco o pedido é o de sempre, sem foco nem quadro, e os arquivos têm os nomes de sempre', async () => {
    const pedidos = [];
    const saida = join(area, 'vistas-sem-foco');
    const r = await olharEtapas(arquivo, { vistas: ['frontal'], saida, capturar: capturaFalsa(pedidos), receitas: RECEITAS });
    expect(Object.keys(pedidos[0]).sort()).toEqual(['montagem', 'projecao', 'vistas']);
    expect(r.foco).toBeNull();
    expect(r.arquivos.map((a) => a.slice(saida.length + 1))).toEqual(['etapas-tres-blocos-frontal-orto.png']);
  });

  it('o foco numa etapa que ainda não tem geometria recusa com o código que diz isso, sem capturar', async () => {
    let capturou = false;
    const semGeometria = { ...RECEITAS, 'bloco-com-furo': { ...RECEITAS['bloco-com-furo'], PASSOS: [] } };
    let erro;
    try {
      await olharEtapas(arquivo, { foco: 'topo', saida: join(area, 'v3'), capturar: async () => { capturou = true; }, receitas: semGeometria });
    } catch (capturado) { erro = capturado; }
    expect(erro?.codigo).toBe('foco-fora-das-etapas');
    expect(erro?.message).toContain("a instância 'topo' não está entre as etapas já construídas (base, meio)");
    expect(capturou).toBe(false);
  });

  it('a captura que falha vira erro com a mensagem dela', async () => {
    await expect(olharEtapas(arquivo, { saida: join(area, 'v4'), capturar: async () => ({ ok: false, erro: { mensagem: 'o visor caiu' } }), receitas: RECEITAS })).rejects.toThrow('o visor caiu');
  });
});

describe('a auditoria da montagem construída (--auditar)', () => {
  /* Um carro de dois cubos de lado 1: a roda assenta na base e o corpo vai em
     cima dela. O que está sob prova é a ligação das duas medidas ao comando; a
     geometria delas tem suítes próprias. */
  const CUBO = { 'cubo': { meta: { nome: 'cubo' }, PARAMS: {}, PASSOS: [
    ['cubo', { origemId: 1, larg: 1, alt: 1, prof: 1, em: [0, 0, 0] }],
    ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 1 } } }],
    ['solido', { sel: { grupo: 'corpo' } }],
  ] } };
  const pose = (x, y) => ({ rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [x, y, 0] });
  const CHAO = { plano: { normal: [0, 1, 0], altura: 0 }, toleranciaNumerica: 0.001, apoiam: [{ caminho: ['roda'] }] };
  const EXPECTATIVA = { id: 'corpo-na-roda', a: { caminho: ['corpo'] }, b: { caminho: ['roda'] }, motivo: 'o corpo assenta de propósito na roda, rente' };

  function escreverCarro({ alturaDaRoda = 0, alturaDoCorpo = 1, extras = {} } = {}) {
    const dado = {
      formato: 'mecanifica.montagem',
      versao: 5,
      id: 'carro',
      instancias: [
        { id: 'roda', alvo: { tipo: 'peca', ref: 'cubo' }, pose: pose(0, alturaDaRoda) },
        { id: 'corpo', alvo: { tipo: 'peca', ref: 'cubo' }, pose: pose(0, alturaDoCorpo) },
      ],
      relacoes: [],
      etapas: ['roda', 'corpo'],
      vinculos: [],
      posicoes: [],
      ...extras,
    };
    const caminho = join(area, 'carro.json');
    writeFileSync(caminho, JSON.stringify(dado), 'utf8');
    return caminho;
  }

  it('a descrição aceita uma auditoria de interseções feita sem profundidade', async () => {
    const r = await auditarEtapas(escreverCarro({ alturaDoCorpo: 0.6 }), { receitas: CUBO });
    const { profundidade, ...semProfundidade } = r.intersecoes.naoDeclarados[0];
    const sem = { ...r, intersecoes: { ...r.intersecoes, naoDeclarados: [semProfundidade], pares: [semProfundidade] } };
    expect(profundidade).toBeGreaterThan(0);
    expect(() => descreverAuditoria(sem)).not.toThrow();
    expect(descreverAuditoria(sem)).not.toContain('profundidade');
  });

  it('a roda no chão e o corpo rente em cima passam: o encosto não declarado avisa e não reprova', async () => {
    const r = await auditarEtapas(escreverCarro({ extras: { apoioNoChao: CHAO } }), { receitas: CUBO });
    expect(r.codigo).toBe(0);
    expect(r.construidas).toEqual(['roda', 'corpo']);
    expect(r.intersecoes.naoDeclarados.map((par) => par.estado)).toEqual(['encostam']);
    expect(r.apoio.apoios[0]).toMatchObject({ caminho: ['roda'], estado: 'apoia' });
    expect(descreverAuditoria(r)).toContain('resultado: passa.');
  });

  it('a roda 17 mm acima do chão reprova no apoio, com a altura no relatório', async () => {
    const r = await auditarEtapas(escreverCarro({ alturaDaRoda: 0.017, alturaDoCorpo: 1.017, extras: { apoioNoChao: CHAO } }), { receitas: CUBO });
    expect(r.codigo).toBe(1);
    expect(r.apoio.apoios[0].estado).toBe('flutua');
    const texto = descreverAuditoria(r);
    expect(texto).toContain('REPROVA roda: flutua, ponto mais baixo a 0.017 do chão');
    expect(texto).toContain('resultado: REPROVA.');
  });

  it('o corpo enterrado na roda e sem declaração reprova, com a profundidade, e a declaração o cala', async () => {
    const r = await auditarEtapas(escreverCarro({ alturaDoCorpo: 0.6 }), { receitas: CUBO });
    expect(r.codigo).toBe(1);
    expect(r.apoio).toBeNull();
    expect(r.intersecoes.naoDeclarados).toHaveLength(1);
    expect(r.intersecoes.naoDeclarados[0].estado).toBe('interpenetram');
    expect(r.intersecoes.naoDeclarados[0].profundidade).toBeGreaterThan(0);
    const texto = descreverAuditoria(r);
    expect(texto).toMatch(/REPROVA corpo x roda: interpenetram \(.+\), profundidade 0\.\d+/);
    expect(texto).toContain('a montagem não declara apoioNoChao; nada foi medido.');

    const declarado = await auditarEtapas(escreverCarro({ alturaDoCorpo: 0.6, extras: { auditoriaIntersecoes: { toleranciaNumerica: 1e-9, expectativas: [EXPECTATIVA] } } }), { receitas: CUBO });
    expect(declarado.codigo).toBe(0);
    expect(declarado.intersecoes.naoDeclarados).toEqual([]);
    expect(descreverAuditoria(declarado)).toMatch(/declara corpo x roda: interpenetram .*declarado 'corpo-na-roda'/);
  });

  it('os não declarados vêm antes dos declarados no relatório, e a declaração sem contato aparece', async () => {
    const r = await auditarEtapas(escreverCarro({ alturaDoCorpo: 5, extras: { auditoriaIntersecoes: { toleranciaNumerica: 1e-9, expectativas: [EXPECTATIVA] } } }), { receitas: CUBO });
    expect(r.codigo).toBe(0);
    expect(descreverAuditoria(r)).toContain("declarações sem contato (não reprovam, mas descrevem o que não existe):\n  corpo x roda: 'corpo-na-roda'");
  });

  it('o apoio reprova também quando uma peça que não se apoia passa abaixo do chão', async () => {
    const r = await auditarEtapas(escreverCarro({ alturaDoCorpo: -3, extras: { apoioNoChao: CHAO } }), { receitas: CUBO });
    expect(r.codigo).toBe(1);
    expect(r.apoio.abaixoDoChao.map((item) => item.caminho)).toEqual([['corpo']]);
    expect(descreverAuditoria(r)).toContain('REPROVA corpo: passa 3 abaixo do chão');
  });

  it('só as etapas construídas entram: a citação de instância sem geometria sai da auditoria, e o relatório diz', async () => {
    const semGeometria = { ...CUBO, 'cubo-vazio': { meta: { nome: 'v' }, PARAMS: {}, PASSOS: [] } };
    const arquivoParcial = join(area, 'parcial.json');
    const dado = JSON.parse(readFileSync(escreverCarro({ extras: { apoioNoChao: { ...CHAO, apoiam: [{ caminho: ['roda'] }, { caminho: ['corpo'] }] }, auditoriaIntersecoes: { toleranciaNumerica: 1e-9, expectativas: [EXPECTATIVA] } } }), 'utf8'));
    dado.instancias[1].alvo.ref = 'cubo-vazio';
    writeFileSync(arquivoParcial, JSON.stringify(dado), 'utf8');
    const r = await auditarEtapas(arquivoParcial, { receitas: semGeometria });
    expect(r.construidas).toEqual(['roda']);
    expect(r.foraDasEtapas).toEqual(['corpo']);
    expect(r.apoioForaDasEtapas).toEqual([['corpo']]);
    expect(r.apoio.apoios.map((item) => item.caminho)).toEqual([['roda']]);
    expect(descreverAuditoria(r)).toContain("apoio declarado em 'corpo', fora das etapas construídas, não medido.");
    /* Etapa sem geometria nunca passa por auditoria completa: o código é 2. */
    expect(r.codigo).toBe(2);
    expect(descreverAuditoria(r)).toContain('resultado: nada reprova, mas a auditoria é incompleta');
  });

  it('com o apoio todo em etapa sem geometria, a auditoria não diz que passou: mede só o que existe e sai com 2', async () => {
    const semGeometria = { ...CUBO, 'cubo-vazio': { meta: { nome: 'v' }, PARAMS: {}, PASSOS: [] } };
    const caminho = escreverCarro({ extras: { apoioNoChao: { ...CHAO, apoiam: [{ caminho: ['corpo'] }] } } });
    const dado = JSON.parse(readFileSync(caminho, 'utf8'));
    dado.instancias[1].alvo.ref = 'cubo-vazio';
    writeFileSync(caminho, JSON.stringify(dado), 'utf8');
    const { dado: parcial, construidas } = montagemAteAGeometria(dado, lerMontagemPersistida(dado), semGeometria);
    expect(construidas).toEqual(['roda']);
    expect(Object.hasOwn(parcial, 'apoioNoChao')).toBe(false);
    expect(() => lerMontagemPersistida(parcial)).not.toThrow();
    const r = await auditarEtapas(caminho, { receitas: semGeometria });
    expect(r.apoio.apoios).toEqual([]);
    expect(r.apoioForaDasEtapas).toEqual([['corpo']]);
    expect(r.codigo).toBe(2);
    /* e a peça construída ainda é conferida contra o chão */
    dado.instancias[0].pose = pose(0, -3);
    writeFileSync(caminho, JSON.stringify(dado), 'utf8');
    const funda = await auditarEtapas(caminho, { receitas: semGeometria });
    expect(funda.codigo).toBe(1);
    expect(funda.apoio.abaixoDoChao.map((item) => item.caminho)).toEqual([['roda']]);
  });

  it('a auditoria não grava o registro de etapas', async () => {
    const caminho = escreverCarro();
    await auditarEtapas(caminho, { receitas: CUBO });
    expect(() => readFileSync(caminho.replace(/\.json$/, '.etapas.json'))).toThrow();
  });
});

describe('o registro só se grava quando muda', () => {
  it('a mesma etapa com os campos em outra ordem dá o mesmo arquivo, e regravar sem mudança não toca nele', () => {
    const registro = { formato: 'f', versao: 1, montagem: 'm', etapas: [{ reaberturas: [], aceite: { por: 'pessoa' }, estado: 'fixa', instancia: 'base', juntas: [] }] };
    expect(gravarRegistro(arquivo, registro)).toBe(true);
    const texto = readFileSync(arquivoDoRegistro(arquivo), 'utf8');
    expect(texto.indexOf('"instancia"')).toBeLessThan(texto.indexOf('"aceite"'));
    expect(texto.indexOf('"aceite"')).toBeLessThan(texto.indexOf('"reaberturas"'));
    const trocado = { ...registro, etapas: [{ instancia: 'base', estado: 'fixa', juntas: [], aceite: { por: 'pessoa' }, reaberturas: [] }] };
    expect(gravarRegistro(arquivo, trocado)).toBe(false);
    expect(readFileSync(arquivoDoRegistro(arquivo), 'utf8')).toBe(texto);
  });

  it('ler o estado pela linha de comando não grava o registro', async () => {
    const antes = '{"marca":"o arquivo que a leitura não pode tocar"}\n';
    writeFileSync(arquivoDoRegistro(arquivo), antes);
    const r = await comoCLI([arquivo]).catch((erro) => ({ erro }));
    expect(readFileSync(arquivoDoRegistro(arquivo), 'utf8')).toBe(antes);
    expect(r).toBeDefined();
  });
});
