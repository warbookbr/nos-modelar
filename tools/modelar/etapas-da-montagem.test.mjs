/* etapas-da-montagem.test.mjs — a porta que fixa etapa. Fixar exige a etapa
   ser a próxima, o crítico ter fechado a peça dela, a nota de passagem, as
   juntas passando e o aceite da pessoa. Cada recusa tem o seu caso. */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registrarRodada } from '../../src/autoria/laco-de-modelagem.js';
import { ErroEtapaDeConstrucao } from '../../src/autoria/etapas-de-construcao.js';
import { AVISO_DO_CAMINHO_ANTIGO, arquivoDoRegistro, auditarEtapas, comoCLI, descreverAuditoria, estadoDasEtapas, fixar, gravarRegistro, medirAgora, montagemAteAGeometria, olharEtapas, reabrir, registroComEstado } from './etapas-da-montagem.mjs';
import { aceitesDasEtapas } from './custo-por-peca.mjs';
import { etapaQueEspera } from './guardas/guarda-acervo.mjs';
import { etapaFixaDaPeca } from './vistas-de-superficie.mjs';
import { estadoDoObjeto } from './objeto.mjs';
import { lerEtapas as lerEtapasDoFluxo } from './fluxo-do-objeto.mjs';
import {
  acrescentarAceite, acrescentarReabertura, avisosDaImpressao, diferencasDaImpressao, imprimirEtapa, lerEtapas, registroVazio,
} from '../../src/autoria/etapas-pela-impressao.js';
import { receitaComParametros } from './peca-com-parametros.mjs';
import { lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
import { RECEITAS } from '../fixtures/tres-blocos-vinculados/receitas/bloco.js';

const ANTIGO = { formato: 'mecanifica.registro-de-etapas', versao: 2, montagem: 'tres-blocos', etapas: [] };
const ORIGEM = fileURLToPath(new URL('../fixtures/tres-blocos-vinculados/montagens/tres-blocos.json', import.meta.url));
let area;
let arquivo;
beforeEach(() => {
  area = mkdtempSync(join(tmpdir(), 'etapas-'));
  arquivo = join(area, 'tres-blocos.json');
  copyFileSync(ORIGEM, arquivo);
  /* o registro da versão 2, vazio: os testes do caminho antigo (e os do acervo, até a migração) começam dele; a versão do registro é
     o que escolhe o caminho, então sem ele o comando já usaria a leitura pela impressão */
  writeFileSync(arquivoDoRegistro(arquivo), `${JSON.stringify(ANTIGO)}\n`);
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
    const { registro } = await estadoDasEtapas(arquivo, { receitas: comTopoVazio(), anterior: ANTIGO });
    expect(registro.etapas.map((e) => [e.instancia, e.estado, e.juntas.length])).toEqual([
      ['base', 'aberta', 0], ['meio', 'aberta', 1], ['topo', 'aberta', 0],
    ]);
  });

  it('a etapa sem geometria não pode ser fixada', async () => {
    const receitas = comTopoVazio();
    let registro = await fixar(arquivo, 'base', aceite, { receitas, anterior: ANTIGO, rodadasDe: todasFechadas });
    registro = await fixar(arquivo, 'meio', aceite, { receitas, anterior: registro, rodadasDe: todasFechadas });
    await recusa(fixar(arquivo, 'topo', aceite, { receitas, anterior: registro, rodadasDe: () => [] }), 'etapa-sem-critico');
  });
});

describe('etapas da montagem em disco', () => {
  it('mostra as etapas abertas e aponta a primeira', async () => {
    const { registro } = await estadoDasEtapas(arquivo, { receitas: RECEITAS, anterior: ANTIGO });
    expect(registro.etapas.map((e) => e.estado)).toEqual(['aberta', 'aberta', 'aberta']);
    expect(registro.etapas[1].juntas[0]).toMatchObject({ relacao: 'meioNoPinoDaBase', satisfeita: true });
  });

  it('recusa fixar sem o crítico ter fechado a peça', async () => {
    await recusa(fixar(arquivo, 'base', aceite, { receitas: RECEITAS, anterior: ANTIGO, rodadasDe: () => [] }), 'etapa-sem-critico');
    await recusa(fixar(arquivo, 'base', aceite, { receitas: RECEITAS, anterior: ANTIGO, rodadasDe: (r) => [rodada(r, { fechada: false })] }), 'etapa-sem-critico');
  });

  it('recusa fixar sem a nota de passagem', async () => {
    await recusa(fixar(arquivo, 'base', aceite, { receitas: RECEITAS, anterior: ANTIGO, rodadasDe: (r) => [rodada(r, { nota: null })] }), 'etapa-sem-nota');
  });

  it('recusa fixar fora de ordem ou sem aceite, e fixa quando tudo está em dia', async () => {
    const opcoes = { receitas: RECEITAS, anterior: ANTIGO, rodadasDe: todasFechadas };
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
    const noMeio = { receitas: RECEITAS, anterior: ANTIGO, rodadasDe: comDefeito, limiteDe: () => 6 };
    await recusa(fixar(arquivo, 'base', aceite, noMeio), 'etapa-sem-critico');
    const registro = await fixar(arquivo, 'base', { ...aceite, aceiteHumano: true }, noMeio);
    const aceitos = registro.etapas[0].aceite.defeitosAceitos;
    expect(aceitos[0]).toMatch(/^crítico não fechou: /);
    expect(aceitos.slice(1)).toEqual(['corpo: posicao em canto de baixo']);
  });

  it('com o laço parado, grava os defeitos aceitos', async () => {
    const noMeio = { receitas: RECEITAS, anterior: ANTIGO, rodadasDe: comDefeito, limiteDe: () => 6 };
    const parado = { ...noMeio, limiteDe: () => 1 };
    await recusa(fixar(arquivo, 'base', aceite, parado), 'etapa-sem-critico');
    const registro = await fixar(arquivo, 'base', { ...aceite, aceiteHumano: true }, parado);
    expect(registro.etapas[0]).toMatchObject({ estado: 'fixa', aceite: { por: 'pessoa', defeitosAceitos: ['corpo: posicao em canto de baixo'] } });
  });
});


describe('reabrir etapa fixa', () => {
  const opcoes = { receitas: RECEITAS, anterior: ANTIGO, rodadasDe: todasFechadas };
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
    const r = await fixar(arquivo, 'base', aceite, { ...opcoes, anterior: ANTIGO });
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
    let r = await fixar(arquivo, 'base', aceite, { ...opcoes, receitas, anterior: ANTIGO });
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
  const opcoes = { receitas: RECEITAS, anterior: ANTIGO, rodadasDe: todasFechadas };
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
    receitas: RECEITAS, anterior: ANTIGO, rodadasDe: todasFechadas,
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

/* A LEITURA PELA IMPRESSÃO DO ACEITE (plano das etapas pela impressão, fatia 1). Os ataques das cinco revisões da reabertura de etapas
   viram testes nos dois sentidos: o que deve quebrar quebra, e o que não mudou segue fixo. Nada aqui passa pelo caminho de `fixar` e
   `reabrir`, que a fatia 2 troca; o registro é uma lista de eventos e o estado sai da comparação com o medido agora. */
describe('a leitura pela impressão do aceite', () => {
  const POR = 'pessoa, 2026-11-17: ataque';
  const POR2 = 'pessoa, 2026-11-17: segunda';
  const medir = (receitas = RECEITAS) => medirAgora(arquivo, { receitas });
  const estados = (registro, medido) => Object.fromEntries(lerEtapas(registro, medido).etapas.map((e) => [e.instancia, e.estado]));
  const motivo = (registro, medido, instancia) => lerEtapas(registro, medido).etapas.find((e) => e.instancia === instancia).motivo;
  const aceitarTodas = (medido, de = registroVazio('tres-blocos')) => medido.ordem.reduce((r, id) => acrescentarAceite(r, medido, id, aceite), de);
  const codigoDe = (f) => { try { f(); } catch (erro) { return erro.codigo; } return undefined; };
  const mudarMontagem = (f) => { const dado = JSON.parse(readFileSync(arquivo, 'utf8')); f(dado); writeFileSync(arquivo, JSON.stringify(dado, null, 2)); };
  const FIXAS = { base: 'fixa', meio: 'fixa', topo: 'fixa' };

  const comTabela = (ref, tabela) => ({ ...RECEITAS, [ref]: receitaComParametros(RECEITAS[ref], tabela) });
  const comBase = (tabela) => comTabela('bloco-com-pino', tabela);
  const comMeio = (tabela) => comTabela('bloco-com-furo-e-pino', tabela);
  const vazia = (ref) => ({ ...RECEITAS, [ref]: { ...RECEITAS[ref], PASSOS: [] } });
  /* os passos da receita trocados por uma função, com a forma intacta quando a função só mexe na porta */
  const comPassos = (ref, mudar, tabela = {}) => {
    const descritores = Object.getOwnPropertyDescriptors(receitaComParametros(RECEITAS[ref], tabela));
    const passos = { enumerable: true, configurable: true, get() { return mudar(descritores.PASSOS.get.call(this)); } };
    return { ...RECEITAS, [ref]: Object.defineProperties({}, { ...descritores, PASSOS: passos }) };
  };
  const portaDoPino = (mudar) => (passos) => passos.map((p) => (p[0] === 'publicarPorta' && p[1].nome === 'pino'
    ? ['publicarPorta', { ...p[1], interface: mudar(p[1].interface) }] : p));
  const pinoDaBaseEmY = comPassos('bloco-com-pino', portaDoPino((i) => ({ ...i, centro: [0, i.centro[1] + 0.01, 0] })));
  const pinoDaBaseEmX = comPassos('bloco-com-pino', portaDoPino((i) => ({ ...i, centro: [i.centro[0] + 0.005, i.centro[1], i.centro[2]] })));
  const pinoDoMeioEmY = comPassos('bloco-com-furo-e-pino', portaDoPino((i) => ({ ...i, centro: [0, i.centro[1] + 0.01, 0] })));
  const comOutro = comPassos('bloco-com-pino', (passos) => [...passos, ...passos.filter((p) => p[0] === 'publicarPorta' && p[1].nome === 'pino')
    .map((p) => ['publicarPorta', { ...p[1], nome: 'outro', interface: { ...p[1].interface, centro: [0, p[1].interface.centro[1] + 0.01, 0] } }])]);
  const comQuarto = (dado, { noFim }) => {
    dado.instancias.push({ id: 'quarto', alvo: { tipo: 'peca', ref: 'bloco-com-furo' } });
    if (noFim) {
      dado.etapas.push('quarto');
      dado.relacoes.push({ ...JSON.parse(JSON.stringify(dado.relacoes[0])), id: 'quartoNoOutroDaBase', referencia: { caminho: ['base'], porta: 'outro' }, movel: { caminho: ['quarto'], porta: 'furo' } });
      dado.posicoes.push({ id: 'quartoSobreOOutro', instancia: 'quarto', porta: 'furo', em: { instancia: 'base', porta: 'outro' }, unidade: 'mm', afastamento: 0 });
      dado.vinculos.push({ id: 'furoDoQuarto', alvo: { instancia: 'quarto', param: 'raioDoFuro' }, de: { instancia: 'base', porta: 'outro', medida: 'raio' }, unidade: 'mm', acrescimo: 0.2 });
    } else {
      dado.etapas.splice(1, 0, 'quarto');
      dado.posicoes.push({ id: 'quartoSobreABase', instancia: 'quarto', porta: 'furo', em: { instancia: 'base', porta: 'pino' }, unidade: 'mm', afastamento: 0 });
      dado.posicoes = dado.posicoes.map((p) => (p.id === 'meioSobreABase' ? { ...p, em: { instancia: 'quarto', porta: 'furo' }, afastamento: 5 } : p));
    }
  };

  describe('o que a impressão guarda e o que a leitura devolve', () => {
    it('guarda em valores a forma, os parâmetros, a pose, as juntas, as portas citadas vistas de quem cita e a ordem das anteriores', async () => {
      const registro = aceitarTodas(await medir());
      const impressao = (id) => registro.eventos.find((e) => e.instancia === id).impressao;
      expect(impressao('base')).toMatchObject({ parametros: [], citadas: [], anteriores: [], juntas: [] });
      expect(impressao('meio').forma).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(impressao('meio').parametros).toEqual([{ param: 'raioDoFuro', valor: 10.2, unidade: 'mm' }, { param: 'raioDoPino', valor: 8, unidade: 'mm' }]);
      expect(impressao('meio').pose.deslocamento).toEqual([0, 0.02, 0]);
      expect(impressao('meio').juntas[0]).toMatchObject({ relacao: 'meioNoPinoDaBase', com: 'base', satisfeita: true });
      expect(impressao('meio').juntas[0].medidas.folgaRadial).toBe(0.0002);
      expect(impressao('meio').anteriores).toEqual(['base']);
      expect(impressao('topo').anteriores).toEqual(['base', 'meio']);
      const citada = impressao('meio').citadas[0];
      expect(citada).toMatchObject({ etapa: 'base', porta: 'pino' });
      expect(citada.por).toEqual(['posição meioSobreABase', 'relação meioNoPinoDaBase', 'vínculo furoDoMeioNoPinoDaBase', 'vínculo pinoDoMeioPeloPinoDaBase']);
      expect(citada.interface).toMatchObject({ forma: 'cilindro', raio: 0.01, centro: [0, 0.02, 0], fim: 0.015 });
    });

    it('o registro tem só eventos, nenhum estado gravado, e a leitura devolve o mesmo para o mesmo registro e o mesmo medido', async () => {
      const medido = await medir();
      const registro = JSON.parse(JSON.stringify(aceitarTodas(medido)));
      expect(JSON.stringify(registro)).not.toMatch(/"estado"/);
      expect(Object.keys(registro).sort()).toEqual(['eventos', 'formato', 'montagem', 'versao']);
      expect(JSON.stringify(lerEtapas(registro, medido))).toBe(JSON.stringify(lerEtapas(JSON.parse(JSON.stringify(registro)), medido)));
      expect(estados(registro, medido)).toEqual(FIXAS);
    });

    it('a quebrada diz a diferença em valores, do aceite para o de agora', async () => {
      const registro = aceitarTodas(await medir());
      const dito = motivo(registro, await medir(pinoDaBaseEmY), 'meio');
      expect(dito).toContain('impressão.citadas[base/pino].interface.centro[1]: 0.02 → 0.03');
      expect(lerEtapas(registro, await medir(pinoDaBaseEmY)).etapas[1].diferencas.length).toBeGreaterThan(1);
    });

    it('os números se comparam com 12 algarismos: a poeira de ponto flutuante não quebra, uma diferença de verdade quebra', async () => {
      const medido = await medir();
      const registro = aceitarTodas(medido);
      const mexido = (delta) => ({ ...medido, etapas: { ...medido.etapas, meio: { ...medido.etapas.meio, pose: { ...medido.etapas.meio.pose, deslocamento: [0, 0.02 + delta, 0] } } } });
      expect(estados(registro, mexido(1e-15)).meio).toBe('fixa');
      expect(estados(registro, mexido(1e-9)).meio).toBe('quebrada');
    });
  });

  describe('o estado é derivado: fixa, quebrada, aberta e não conferível', () => {
    it('a quebrada cuja mudança é desfeita volta a fixa sozinha, sem evento novo; e segue quebrada enquanto a mudança durar', async () => {
      const original = await medir();
      const registro = aceitarTodas(original);
      const antes = JSON.stringify(registro);
      const movido = await medir(pinoDaBaseEmY);
      expect(estados(registro, movido)).toEqual({ base: 'fixa', meio: 'quebrada', topo: 'quebrada' });
      expect(estados(registro, movido)).toEqual({ base: 'fixa', meio: 'quebrada', topo: 'quebrada' });
      expect(estados(registro, original)).toEqual(FIXAS);
      expect(JSON.stringify(registro)).toBe(antes);
    });

    it('só a reabertura explícita faz da quebrada uma aberta; a quebrada não se aceita direto (B7)', async () => {
      const registro = aceitarTodas(await medir());
      const alta = await medir(comBase({ alturaDoCorpo: 30 }));
      expect(estados(registro, alta)).toEqual({ base: 'quebrada', meio: 'quebrada', topo: 'quebrada' });
      expect(codigoDe(() => acrescentarAceite(registro, alta, 'base', aceite))).toBe('etapa-quebrada');
      const reaberto = acrescentarReabertura(registro, 'base', POR);
      expect(estados(reaberto, alta)).toEqual({ base: 'aberta', meio: 'quebrada', topo: 'quebrada' });
      expect(estados(acrescentarAceite(reaberto, alta, 'base', aceite), alta)).toEqual({ base: 'fixa', meio: 'quebrada', topo: 'quebrada' });
    });

    it('sem aceite vigente a etapa é aberta, e a reabertura só vale para etapa com aceite', async () => {
      const medido = await medir();
      expect(estados(registroVazio('tres-blocos'), medido)).toEqual({ base: 'aberta', meio: 'aberta', topo: 'aberta' });
      expect(codigoDe(() => acrescentarReabertura(registroVazio('tres-blocos'), 'base', POR))).toBe('etapa-nao-fixa');
      const aberta = acrescentarReabertura(aceitarTodas(medido), 'topo', POR);
      expect(codigoDe(() => acrescentarReabertura(aberta, 'topo', POR))).toBe('etapa-nao-fixa');
      expect(codigoDe(() => acrescentarReabertura(aceitarTodas(medido), 'topo', 'sem data'))).toBe('reabertura-sem-autor');
    });

    it('A9 o registro passa pelo JSON sem mudar, e a reabertura do mesmo registro dá o mesmo resultado', async () => {
      const medido = await medir();
      const registro = JSON.parse(JSON.stringify(aceitarTodas(medido)));
      const a = acrescentarReabertura(registro, 'base', POR);
      const b = acrescentarReabertura(JSON.parse(JSON.stringify(registro)), 'base', POR);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(estados(a, medido)).toEqual({ base: 'aberta', meio: 'fixa', topo: 'fixa' });
    });

    it('A6 nada do aceite se perde: reabrir acrescenta, e os eventos de antes seguem iguais', async () => {
      const medido = await medir();
      const registro = aceitarTodas(medido);
      const reaberto = acrescentarReabertura(acrescentarReabertura(registro, 'topo', POR), 'meio', POR2);
      expect(reaberto.eventos.slice(0, registro.eventos.length)).toEqual(registro.eventos);
      expect(reaberto.eventos.slice(registro.eventos.length).map((e) => [e.tipo, e.instancia, e.por])).toEqual([['reabertura', 'topo', 'pessoa'], ['reabertura', 'meio', 'pessoa']]);
      const refeito = acrescentarAceite(acrescentarAceite(reaberto, medido, 'meio', aceite), medido, 'topo', aceite);
      expect(estados(refeito, medido)).toEqual(FIXAS);
      expect(refeito.eventos.length).toBe(registro.eventos.length + 4);
    });
  });

  describe('um formato só: sem portas guardadas, sem prova pela junta vazia', () => {
    it('E5 o registro v1 e o v2 (estado e portas gravados) recusam, e o v3 sem a impressão completa também', async () => {
      const medido = await medir();
      const v3 = aceitarTodas(medido);
      const v2 = { formato: v3.formato, versao: 2, montagem: 'tres-blocos', etapas: medido.ordem.map((instancia) => ({ instancia, estado: 'fixa', juntas: [], forma: 'sha256:x', aceite: { por: 'pessoa' } })) };
      const v1 = { ...v2, versao: 1, etapas: v2.etapas.map(({ forma, ...e }) => ({ ...e, receita: `h-${e.instancia}` })) };
      expect(codigoDe(() => lerEtapas(v1, medido))).toBe('registro-antigo');
      expect(codigoDe(() => lerEtapas(v2, medido))).toBe('registro-antigo');
      expect(codigoDe(() => acrescentarReabertura(v2, 'base', POR))).toBe('registro-antigo');
      const semCitadas = JSON.parse(JSON.stringify(v3));
      delete semCitadas.eventos[1].impressao.citadas;
      expect(codigoDe(() => lerEtapas(semCitadas, medido))).toBe('registro-invalido');
      const semForma = JSON.parse(JSON.stringify(v3));
      delete semForma.eventos[0].impressao.forma;
      expect(codigoDe(() => lerEtapas(semForma, medido))).toBe('registro-invalido');
    });

    it('A2 e A7 a porta que a posterior cita por vínculo e posição, sem a relação, também quebra pela impressão dela', async () => {
      mudarMontagem((dado) => { dado.relacoes = dado.relacoes.filter((r) => r.id !== 'meioNoPinoDaBase'); });
      const registro = aceitarTodas(await medir());
      expect(registro.eventos[1].impressao.citadas[0].por).toEqual(['posição meioSobreABase', 'vínculo furoDoMeioNoPinoDaBase', 'vínculo pinoDoMeioPeloPinoDaBase']);
      const reaberto = acrescentarReabertura(registro, 'base', POR);
      for (const tabela of [{ alturaDoPino: 18 }, { alturaDoCorpo: 30 }]) {
        expect(estados(reaberto, await medir(comBase(tabela))).meio).toBe('quebrada');
        expect(estados(registro, await medir(comBase(tabela))).meio).toBe('quebrada');
      }
      expect(estados(reaberto, await medir())).toEqual({ base: 'aberta', meio: 'fixa', topo: 'fixa' });
    });

    it('A2 B5 B6 C3 D4 D6 E2 a porta movida com a malha igual, em y e em x, quebra o meio, e a mesma receita sem mudança segue fixa', async () => {
      const registro = aceitarTodas(await medir());
      expect(estados(registro, await medir())).toEqual(FIXAS);
      for (const movido of [pinoDaBaseEmY, pinoDaBaseEmX]) {
        expect(estados(registro, await medir(movido))).toEqual({ base: 'fixa', meio: 'quebrada', topo: 'quebrada' });
      }
    });
  });

  describe('reabrir antes e mudar depois', () => {
    it('A1 a mudança da porta depois da reabertura quebra a posterior pela própria impressão; sem mudança ela segue fixa', async () => {
      const original = await medir();
      const registro = acrescentarReabertura(aceitarTodas(original), 'base', POR);
      expect(estados(registro, original)).toEqual({ base: 'aberta', meio: 'fixa', topo: 'fixa' });
      for (const [tabela, esperado] of [
        [{ alturaDoPino: 18 }, { base: 'aberta', meio: 'quebrada', topo: 'fixa' }],
        [{ alturaDoCorpo: 30 }, { base: 'aberta', meio: 'quebrada', topo: 'quebrada' }],
      ]) {
        const mudado = await medir(comBase(tabela));
        expect(estados(registro, mudado)).toEqual(esperado);
        /* refixar a base com a mudança não apaga nem reescreve o aceite do meio */
        const refixada = acrescentarAceite(registro, mudado, 'base', aceite);
        expect(estados(refixada, mudado).meio).toBe('quebrada');
        expect(refixada.eventos.find((e) => e.instancia === 'meio')).toEqual(registro.eventos.find((e) => e.instancia === 'meio'));
      }
    });

    it('A3 meio reaberto antes e a base mudada depois: a base quebra, o meio fica aberto e o topo quebra pela impressão dele', async () => {
      const registro = acrescentarReabertura(aceitarTodas(await medir()), 'meio', POR);
      expect(estados(registro, await medir(comBase({ alturaDoCorpo: 30 })))).toEqual({ base: 'quebrada', meio: 'aberta', topo: 'quebrada' });
    });

    it('A4 e C5 meio reaberto e com o pino mudado: o topo quebra, a base segue fixa', async () => {
      const registro = acrescentarReabertura(aceitarTodas(await medir()), 'meio', POR);
      for (const tabela of [{ alturaDoPino: 25 }, { alturaDoPino: 18 }]) {
        expect(estados(registro, await medir(comMeio(tabela)))).toEqual({ base: 'fixa', meio: 'aberta', topo: 'quebrada' });
      }
    });

    it('A5 não há reabertura sem a leitura: reabrir não prova nada, e a posterior quebrada segue quebrada', async () => {
      const registro = aceitarTodas(await medir());
      const mudado = await medir(comBase({ alturaDoPino: 18 }));
      expect(estados(acrescentarReabertura(registro, 'base', POR), mudado).meio).toBe('quebrada');
    });

    it('B1 a quebrada não vira aberta por uma escrita sobre outra etapa, e só a reabertura a faz aberta', async () => {
      const registro = aceitarTodas(await medir());
      const mudado = await medir(comBase({ alturaDoPino: 18 }));
      const escrito = acrescentarReabertura(acrescentarReabertura(registro, 'base', POR), 'topo', POR2);
      expect(estados(escrito, mudado)).toEqual({ base: 'aberta', meio: 'quebrada', topo: 'aberta' });
      expect(codigoDe(() => acrescentarAceite(escrito, mudado, 'base', aceite))).toBeUndefined();
      expect(estados(acrescentarAceite(escrito, mudado, 'base', aceite), mudado).meio).toBe('quebrada');
      expect(estados(acrescentarReabertura(escrito, 'meio', POR), mudado).meio).toBe('aberta');
    });
  });

  describe('o que muda sem a malha mudar', () => {
    it('B2 e A10 só a porta citada muda de lugar, com a malha igual: a base segue fixa e as que a citam quebram', async () => {
      const registro = aceitarTodas(await medir());
      const movido = await medir(pinoDaBaseEmY);
      expect(movido.etapas.base.forma).toBe((await medir()).etapas.base.forma);
      expect(estados(registro, movido)).toEqual({ base: 'fixa', meio: 'quebrada', topo: 'quebrada' });
      expect(estados(acrescentarReabertura(registro, 'base', POR), movido)).toEqual({ base: 'aberta', meio: 'quebrada', topo: 'quebrada' });
    });

    it('B3 o afastamento da posição mudado na montagem quebra o meio, e o topo que está sobre ele', async () => {
      const registro = aceitarTodas(await medir());
      mudarMontagem((dado) => { dado.posicoes[0].afastamento = 5; });
      expect(estados(registro, await medir())).toEqual({ base: 'fixa', meio: 'quebrada', topo: 'quebrada' });
    });

    it('B4 a citação nova numa porta que o aceite não tinha vai à impressão da citante e a quebra; a porta publicada sem citação não', async () => {
      const registro = aceitarTodas(await medir(comOutro));
      expect(estados(registro, await medir(comOutro))).toEqual(FIXAS);
      const reaberto = acrescentarReabertura(registro, 'base', POR);
      mudarMontagem((dado) => {
        dado.relacoes[0].referencia.porta = 'outro';
        dado.vinculos.filter((v) => v.de.instancia === 'base').forEach((v) => { v.de.porta = 'outro'; });
        dado.posicoes[0].em.porta = 'outro';
      });
      const citando = await medir(comOutro);
      expect(estados(reaberto, citando).meio).toBe('quebrada');
      expect(motivo(reaberto, citando, 'meio')).toContain('citadas[base/outro]');
    });

    it('C2 etapa nova no fim, citando porta que o aceite da base não guardou: nada quebra, o aceite dela fica fixo e reabrir e aceitar de novo também', async () => {
      const registro = aceitarTodas(await medir(comOutro));
      mudarMontagem((dado) => comQuarto(dado, { noFim: true }));
      const com = await medir(comOutro);
      expect(estados(registro, com)).toEqual({ ...FIXAS, quarto: 'aberta' });
      const aceito = acrescentarAceite(registro, com, 'quarto', aceite);
      expect(aceito.eventos.at(-1).impressao.citadas.map((c) => `${c.etapa}/${c.porta}`)).toEqual(['base/outro']);
      expect(estados(aceito, com)).toEqual({ ...FIXAS, quarto: 'fixa' });
      const refeito = acrescentarAceite(acrescentarReabertura(aceito, 'quarto', POR), com, 'quarto', aceite);
      expect(estados(refeito, com)).toEqual({ ...FIXAS, quarto: 'fixa' });
    });

    it('D5 etapa nova no meio da ordem, com o meio passando a se posicionar nela: o meio e o topo quebram, e o aceite da nova não os refixa', async () => {
      const registro = aceitarTodas(await medir());
      mudarMontagem((dado) => comQuarto(dado, { noFim: false }));
      const com = await medir();
      expect(com.ordem).toEqual(['base', 'quarto', 'meio', 'topo']);
      expect(estados(registro, com)).toEqual({ base: 'fixa', quarto: 'aberta', meio: 'quebrada', topo: 'quebrada' });
      expect(motivo(registro, com, 'meio')).toContain('impressão.anteriores');
      expect(estados(acrescentarAceite(registro, com, 'quarto', aceite), com)).toEqual({ base: 'fixa', quarto: 'fixa', meio: 'quebrada', topo: 'quebrada' });
    });

    it('A8 a ordem das anteriores trocada difere: na leitura e na montagem que o resolvedor recusa', async () => {
      const medido = await medir();
      const registro = aceitarTodas(medido);
      const trocado = { ...medido, ordem: ['meio', 'base', 'topo'] };
      expect(estados(registro, trocado)).toEqual({ meio: 'quebrada', base: 'quebrada', topo: 'quebrada' });
      expect(motivo(registro, trocado, 'topo')).toContain('impressão.anteriores');
      mudarMontagem((dado) => { dado.etapas = ['meio', 'base', 'topo']; });
      await expect(medir()).rejects.toThrow();
    });

    it('E5 e o meio mudado: o meio quebra e o topo, que cita só o pino que não mudou, segue fixo', async () => {
      const registro = aceitarTodas(await medir());
      expect(estados(registro, await medir(comMeio({ raioDoCorpo: 40 })))).toEqual({ base: 'fixa', meio: 'quebrada', topo: 'fixa' });
      expect(estados(registro, await medir(comBase({ raioDoCorpo: 34 })))).toEqual({ base: 'quebrada', meio: 'fixa', topo: 'fixa' });
    });
  });

  describe('sem geometria nunca é fixa, nem aceitável', () => {
    it('D1 a etapa fixa com os passos esvaziados fica não conferível, e as seguintes também; ao voltar, volta fixa', async () => {
      const registro = aceitarTodas(await medir());
      expect(estados(registro, await medir(vazia('bloco-com-pino')))).toEqual({ base: 'nao-conferivel', meio: 'nao-conferivel', topo: 'nao-conferivel' });
      expect(estados(registro, await medir(vazia('bloco-com-furo-e-pino')))).toEqual({ base: 'fixa', meio: 'nao-conferivel', topo: 'nao-conferivel' });
      expect(estados(registro, await medir())).toEqual(FIXAS);
      expect(lerEtapas(registro, await medir(vazia('bloco-com-pino'))).etapas[0].motivo).toContain('não há geometria');
    });

    it('D2 a etapa reaberta e esvaziada não se aceita, e a etapa sem geometria nunca tem impressão', async () => {
      const registro = acrescentarReabertura(aceitarTodas(await medir()), 'base', POR);
      const vazio = await medir(vazia('bloco-com-pino'));
      expect(codigoDe(() => acrescentarAceite(registro, vazio, 'base', { ...aceite, aceiteHumano: true }))).toBe('etapa-sem-geometria');
      expect(imprimirEtapa(vazio, 'base')).toBeNull();
      expect(estados(registro, vazio).base).toBe('aberta');
    });

    it('D3 e C4 esvaziar uma etapa e escrever sobre outras não lava o aceite: ao voltar movida, as posteriores quebram', async () => {
      const original = await medir();
      const vazio = await medir(vazia('bloco-com-pino'));
      const registro = acrescentarReabertura(acrescentarReabertura(aceitarTodas(original), 'topo', POR), 'base', POR2);
      expect(estados(registro, vazio)).toEqual({ base: 'aberta', meio: 'nao-conferivel', topo: 'aberta' });
      expect(estados(registro, await medir(pinoDaBaseEmY))).toEqual({ base: 'aberta', meio: 'quebrada', topo: 'aberta' });
      expect(estados(registro, original)).toEqual({ base: 'aberta', meio: 'fixa', topo: 'aberta' });
    });

    it('E8 meio esvaziado, base reaberta e a porta do pino movida: o aceite antigo do meio não some, e refazê-lo exige reabrir', async () => {
      const original = await medir();
      const registro = aceitarTodas(original);
      const movidoEMeioVazio = { ...pinoDaBaseEmY, 'bloco-com-furo-e-pino': vazia('bloco-com-furo-e-pino')['bloco-com-furo-e-pino'] };
      expect(estados(registro, await medir(movidoEMeioVazio))).toEqual({ base: 'fixa', meio: 'nao-conferivel', topo: 'nao-conferivel' });
      const reaberta = acrescentarReabertura(registro, 'base', POR);
      const movido = await medir(pinoDaBaseEmY);
      expect(estados(reaberta, movido)).toEqual({ base: 'aberta', meio: 'quebrada', topo: 'quebrada' });
      let depois = acrescentarAceite(reaberta, movido, 'base', aceite);
      expect(codigoDe(() => acrescentarAceite(depois, movido, 'meio', aceite))).toBe('etapa-quebrada');
      depois = acrescentarAceite(acrescentarReabertura(depois, 'meio', POR), movido, 'meio', aceite);
      expect(estados(depois, movido)).toEqual({ base: 'fixa', meio: 'fixa', topo: 'quebrada' });
      depois = acrescentarAceite(acrescentarReabertura(depois, 'topo', POR), movido, 'topo', aceite);
      expect(estados(depois, movido)).toEqual(FIXAS);
    });
  });

  describe('o caminho que a pessoa faz de verdade', () => {
    it('C1 e E1 reabrir tudo com a base vazia, restaurar e refixar na ordem devolve tudo fixo, com os aceites de agora', async () => {
      const original = await medir();
      let registro = aceitarTodas(original);
      for (const id of ['topo', 'meio', 'base']) registro = acrescentarReabertura(registro, id, POR);
      expect(estados(registro, await medir(vazia('bloco-com-pino')))).toEqual({ base: 'aberta', meio: 'aberta', topo: 'aberta' });
      expect(estados(registro, original)).toEqual({ base: 'aberta', meio: 'aberta', topo: 'aberta' });
      expect(codigoDe(() => acrescentarAceite(registro, original, 'meio', aceite))).toBe('etapa-fora-de-ordem');
      for (const id of ['base', 'meio', 'topo']) registro = acrescentarAceite(registro, original, id, aceite);
      expect(estados(registro, original)).toEqual(FIXAS);
      expect(registro.eventos.filter((e) => e.tipo === 'aceite').length).toBe(6);
    });

    it('C1 mudar o pino, refixar tudo em cima da mudança e desfazê-la: tudo quebra, e ao refazer a mudança tudo volta fixo', async () => {
      const original = await medir();
      const mudado = await medir(comBase({ alturaDoPino: 18 }));
      let registro = acrescentarReabertura(aceitarTodas(original), 'base', POR);
      registro = acrescentarAceite(registro, mudado, 'base', aceite);
      for (const id of ['meio', 'topo']) registro = acrescentarAceite(acrescentarReabertura(registro, id, POR), mudado, id, aceite);
      expect(estados(registro, mudado)).toEqual(FIXAS);
      expect(estados(registro, original).base).toBe('quebrada');
      expect(estados(registro, original).meio).toBe('quebrada');
      expect(estados(registro, mudado)).toEqual(FIXAS);
    });

    it('a etapa fora de ordem, sem quem aceitou ou com junta reprovada não se aceita (B8)', async () => {
      const medido = await medir();
      expect(codigoDe(() => acrescentarAceite(registroVazio('tres-blocos'), medido, 'meio', aceite))).toBe('etapa-fora-de-ordem');
      expect(codigoDe(() => acrescentarAceite(registroVazio('tres-blocos'), medido, 'base', {}))).toBe('etapa-sem-aceite');
      expect(codigoDe(() => acrescentarAceite(registroVazio('tres-blocos'), medido, 'base', { por: '   ' }))).toBe('etapa-sem-aceite');
      expect(codigoDe(() => acrescentarAceite(registroVazio('tres-blocos'), medido, 'nenhuma', aceite))).toBe('etapa-inexistente');
      const base = acrescentarAceite(registroVazio('tres-blocos'), medido, 'base', aceite);
      expect(codigoDe(() => acrescentarAceite(base, medido, 'base', aceite))).toBe('etapa-ja-fixa');
      const reprovada = { ...medido, etapas: { ...medido.etapas, meio: { ...medido.etapas.meio, juntas: medido.etapas.meio.juntas.map((j) => ({ ...j, satisfeita: false })) } } };
      expect(codigoDe(() => acrescentarAceite(base, reprovada, 'meio', aceite))).toBe('etapa-com-junta-reprovada');
    });
  });

  describe('a propriedade: nenhuma sequência sobre outras etapas muda o aceite de uma', () => {
    const congelar = (valor) => {
      if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) { Object.freeze(valor); Object.values(valor).forEach(congelar); }
      return valor;
    };
    /* um medido pequeno e à mão, de seis etapas em cadeia, cada uma citando a anterior */
    const medidoDeSeis = () => {
      const ordem = ['a', 'b', 'c', 'd', 'e', 'f'];
      const etapas = Object.fromEntries(ordem.map((id, i) => [id, { forma: `sha256:${id}`, parametros: [], pose: { rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, i, 0] }, juntas: i ? [{ relacao: `r${i}`, com: ordem[i - 1], satisfeita: true, medidas: { folga: 0.1 * i } }] : [] }]));
      const citacoes = ordem.slice(1).map((id, i) => ({ etapa: ordem[i], porta: 'saida', posterior: id, por: `relação r${i + 1}`, relacao: `r${i + 1}` }));
      const portas = Object.fromEntries(ordem.slice(0, -1).map((id, i) => [id, { saida: { forma: 'cilindro', centro: [0, i, 0], raio: 0.01 * (i + 1) } }]));
      return { ordem, etapas, citacoes, portas };
    };
    const sorteio = (semente) => { let x = semente >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 2 ** 32; }; };

    it('com o medido fixo, comandos e leituras sobre as outras etapas deixam o aceite e o estado dela como estavam', async () => {
      let acrescentados = 0;
      let recusados = 0;
      for (const medido of [congelar(await medir()), congelar(medidoDeSeis())]) {
        const base = congelar(aceitarTodas(medido, registroVazio(medido.montagem ?? 'p')));
        for (const alvo of medido.ordem) {
          for (let semente = 1; semente <= 12; semente += 1) {
            const sorte = sorteio(semente * 7919);
            const outras = medido.ordem.filter((id) => id !== alvo);
            let registro = base;
            for (let passo = 0; passo < 40; passo += 1) {
              const quem = outras[Math.floor(sorte() * outras.length)];
              const antes = registro;
              const acao = sorte();
              try {
                if (acao < 0.4) registro = congelar(acrescentarReabertura(registro, quem, POR));
                else if (acao < 0.8) registro = congelar(acrescentarAceite(registro, medido, quem, aceite));
                else lerEtapas(registro, medido);
              } catch (erro) { expect(erro.codigo).toBeDefined(); recusados += 1; }
              acrescentados += registro.eventos.length - antes.eventos.length;
              expect(registro.eventos.slice(0, antes.eventos.length)).toEqual(antes.eventos);
              expect(registro.eventos.slice(antes.eventos.length).every((e) => e.instancia === quem)).toBe(true);
            }
            const evento = (r) => r.eventos.find((e) => e.instancia === alvo);
            expect(registro.eventos.filter((e) => e.instancia === alvo)).toEqual(base.eventos.filter((e) => e.instancia === alvo));
            expect(evento(registro)).toEqual(evento(base));
            expect(lerEtapas(registro, medido).etapas.find((e) => e.instancia === alvo).estado).toBe('fixa');
          }
        }
      }
      /* a sequência não é vazia: houve reaberturas e aceites de verdade, e recusas também */
      expect(acrescentados).toBeGreaterThan(500);
      expect(recusados).toBeGreaterThan(100);
    }, 120_000);

    it('a mesma propriedade no sentido contrário: mudar uma etapa quebra só as que a citam, e desfazer devolve todas', () => {
      const medido = medidoDeSeis();
      const registro = aceitarTodas(medido, registroVazio('p'));
      const mexido = { ...medido, portas: { ...medido.portas, c: { saida: { ...medido.portas.c.saida, raio: 0.5 } } } };
      expect(estados(registro, mexido)).toEqual({ a: 'fixa', b: 'fixa', c: 'fixa', d: 'quebrada', e: 'fixa', f: 'fixa' });
      expect(estados(registro, medido)).toEqual({ a: 'fixa', b: 'fixa', c: 'fixa', d: 'fixa', e: 'fixa', f: 'fixa' });
    });
  });

  describe('o que a revisão da fatia 1 achou', () => {
    const copia = (v) => JSON.parse(JSON.stringify(v));
    const comEtapa = (m, id, f) => ({ ...m, etapas: { ...m.etapas, [id]: f(copia(m.etapas[id])) } });
    /* as poses declaradas no lugar das posições: a citante tem pose fixa, e a citada pode andar ou girar sem a citante ir junto */
    const posar = (poses) => mudarMontagem((dado) => {
      dado.posicoes = [];
      dado.instancias.forEach((item) => { if (poses[item.id]) item.pose = poses[item.id]; });
    });
    const POSES = { base: { deslocamento: [0, 0, 0] }, meio: { deslocamento: [0, 0.02, 0] }, topo: { deslocamento: [0, 0.04, 0] } };
    const girada = { rotacao: [[0, -1, 0], [1, 0, 0], [0, 0, 1]], deslocamento: [0, 0.02, 0] };
    const linhas = async (poses, id) => {
      posar(POSES);
      const antes = imprimirEtapa(await medir(), id);
      posar(poses);
      return diferencasDaImpressao(antes, imprimirEtapa(await medir(), id));
    };

    it('a citada que anda ou gira, com a citante de pose declarada, muda a impressão da citante pela interface no mundo', async () => {
      const andou = await linhas({ ...POSES, base: { deslocamento: [0.05, 0, 0] } }, 'meio');
      expect(andou.join('\n')).toContain('citadas[base/pino].interface.centro[0]: 0 → 0.05');
      expect(andou.join('\n')).not.toContain('pose');
      const girou = await linhas({ ...POSES, base: { rotacao: [[0, -1, 0], [1, 0, 0], [0, 0, 1]], deslocamento: [0, 0, 0] } }, 'meio');
      expect(girou.join('\n')).toContain('citadas[base/pino].interface.eixo');
    });

    it('a pose da própria etapa entra inteira, a rotação e o deslocamento', async () => {
      const gira = await linhas({ ...POSES, meio: girada }, 'meio');
      expect(gira.join('\n')).toContain('pose.rotacao');
      expect(gira.join('\n')).not.toContain('pose.deslocamento');
      const anda = await linhas({ ...POSES, meio: { deslocamento: [0, 0.03, 0] } }, 'meio');
      expect(anda.join('\n')).toContain('pose.deslocamento[1]: 0.02 → 0.03');
      expect(anda.join('\n')).not.toContain('pose.rotacao');
    });

    it('a comparação enxerga chave só de um lado, elemento que some, que aparece e lista de outro tamanho', () => {
      expect(diferencasDaImpressao({ a: 1 }, { a: 1, b: 2 })).toEqual(['impressão.b: ausente → 2']);
      expect(diferencasDaImpressao({ a: 1, b: 2 }, { a: 1 })).toEqual(['impressão.b: 2 → ausente']);
      expect(diferencasDaImpressao({ l: [1, 2] }, { l: [1] })).toEqual(['impressão.l[1]: 2 → ausente']);
      expect(diferencasDaImpressao({ l: [1] }, { l: [1, 2] })).toEqual(['impressão.l[1]: ausente → 2']);
      const a = { relacao: 'a', x: 1 };
      const b = { relacao: 'b', x: 1 };
      expect(diferencasDaImpressao({ juntas: [a, b] }, { juntas: [a] })).toEqual(['impressão.juntas[b]: {"relacao":"b","x":1} → ausente']);
      expect(diferencasDaImpressao({ juntas: [a] }, { juntas: [a, b] })).toEqual(['impressão.juntas[b]: ausente → {"relacao":"b","x":1}']);
      expect(diferencasDaImpressao({ juntas: [a, b] }, { juntas: [b, a] })).toEqual([]);
      expect(diferencasDaImpressao({ juntas: [a] }, { juntas: [b] }).length).toBe(2);
      expect(diferencasDaImpressao([], [{ relacao: 'a' }])).toEqual(['impressão[0]: ausente → {"relacao":"a"}']);
    });

    /* um medido de duas etapas à mão, para os casos que a fixture não tem */
    const pequeno = (extra = {}) => ({
      montagem: 'm', ordem: ['a', 'b'],
      etapas: { a: { forma: 'sha256:a', parametros: [], pose: { rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, 0, 0] }, juntas: [] }, b: { forma: 'sha256:b', parametros: [], pose: { rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, 1, 0] }, juntas: [] } },
      citacoes: [{ etapa: 'a', porta: 'p', posterior: 'b', por: 'posição x' }, { etapa: 'a', porta: 'p', posterior: 'b', por: 'relação r', relacao: 'r' }, { etapa: 'a', porta: 'o', posterior: 'b', por: 'vínculo v' }],
      portas: { a: { p: { centro: [0, 0, 0] }, o: { centro: [1, 0, 0] } } },
      ...extra,
    });

    it('as citadas e os meios saem em ordem fixa, de qualquer ordem em que a montagem os declare', () => {
      const a = pequeno();
      const b = pequeno({ citacoes: [...a.citacoes].reverse() });
      expect(JSON.stringify(imprimirEtapa(a, 'b'))).toBe(JSON.stringify(imprimirEtapa(b, 'b')));
      expect(imprimirEtapa(a, 'b').citadas.map((c) => c.porta)).toEqual(['o', 'p']);
      expect(imprimirEtapa(a, 'b').citadas[1].por).toEqual(['posição x', 'relação r']);
    });

    it('a citação que some, ou que aparece, quebra a citante', () => {
      const registro = acrescentarAceite(acrescentarAceite(registroVazio('m'), pequeno(), 'a', aceite), pequeno(), 'b', aceite);
      const semUma = pequeno({ citacoes: pequeno().citacoes.slice(0, 2) });
      expect(estados(registro, semUma)).toEqual({ a: 'fixa', b: 'quebrada' });
      expect(motivo(registro, semUma, 'b')).toContain('citadas[a/o]');
      const so = acrescentarAceite(acrescentarAceite(registroVazio('m'), semUma, 'a', aceite), semUma, 'b', aceite);
      expect(estados(so, pequeno())).toEqual({ a: 'fixa', b: 'quebrada' });
    });

    it('a porta de dentro de submontagem fica fora da impressão e a leitura avisa', () => {
      const m = pequeno({ citacoes: [...pequeno().citacoes, { etapa: 'a', porta: 'sub/x:p', posterior: 'b', por: 'relação q', relacao: 'q', profunda: true }] });
      expect(imprimirEtapa(m, 'b').citadas.map((c) => c.porta)).toEqual(['o', 'p']);
      expect(avisosDaImpressao(m, 'b')).toHaveLength(1);
      expect(avisosDaImpressao(m, 'b')[0]).toContain("'sub/x:p'");
      expect(avisosDaImpressao(m, 'a')).toEqual([]);
      const registro = acrescentarAceite(acrescentarAceite(registroVazio('m'), m, 'a', aceite), m, 'b', aceite);
      const lida = lerEtapas(registro, m).etapas;
      expect(lida[1].avisos).toHaveLength(1);
      expect(lida[0].avisos).toBeUndefined();
    });

    it('o registro com evento de etapa que a montagem não tem devolve a lista de órfãos', () => {
      const registro = acrescentarAceite(registroVazio('m'), pequeno(), 'a', aceite);
      const menor = { ...pequeno(), ordem: ['b'], etapas: { b: pequeno().etapas.b }, citacoes: [], portas: {} };
      expect(lerEtapas(registro, menor).orfaos).toEqual(['a']);
      expect(lerEtapas(registro, pequeno()).orfaos).toEqual([]);
    });

    it('o motivo mostra as primeiras diferenças e conta as demais', () => {
      const registro = acrescentarAceite(registroVazio('m'), pequeno(), 'a', aceite);
      const muitos = comEtapa(pequeno(), 'a', (e) => ({ ...e, parametros: Array.from({ length: 9 }, (_, i) => ({ param: `p${i}`, valor: i, unidade: 'mm' })) }));
      const dito = motivo(registro, muitos, 'a');
      expect(dito).toContain('; e mais 3');
      expect(dito.split(';').length).toBe(7);
      expect(motivo(registro, comEtapa(pequeno(), 'a', (e) => ({ ...e, forma: 'sha256:z' })), 'a')).not.toContain('e mais');
    });

    it('o aceite guarda quem, observação, defeitos e análise; a pessoa e a reabertura saem sem espaço nas pontas', async () => {
      const medido = await medir();
      const defeitos = ['risco'];
      const analise = { a: 1 };
      const r = acrescentarAceite(registroVazio('tres-blocos'), medido, 'base', { por: '  Ana  ', observacao: ' ok ', defeitosAceitos: defeitos, analise });
      expect(r.eventos[0].aceite).toEqual({ por: 'Ana', observacao: 'ok', defeitosAceitos: ['risco'], analise: { a: 1 } });
      const sem = acrescentarAceite(registroVazio('tres-blocos'), medido, 'base', { por: 'Ana' });
      expect(sem.eventos[0].aceite).toEqual({ por: 'Ana' });
      const reaberto = acrescentarReabertura(r, 'base', { por: ' Ana ', quando: ' 2026-11-17 ', motivo: ' porque ' });
      expect(reaberto.eventos[1]).toEqual({ tipo: 'reabertura', instancia: 'base', por: 'Ana', quando: '2026-11-17', motivo: 'porque' });
    });

    it('o registro não compartilha objeto com quem o alimentou nem com quem o lê (R7, R8)', async () => {
      const medido = await medir();
      const defeitos = ['risco'];
      const r = acrescentarAceite(registroVazio('tres-blocos'), medido, 'base', { por: 'p', defeitosAceitos: defeitos, analise: { a: 1 } });
      const antes = JSON.stringify(r);
      defeitos.push('outro');
      medido.etapas.base.juntas.push({ relacao: 'x' });
      expect(JSON.stringify(r)).toBe(antes);
      expect(() => { lerEtapas(r, medido).etapas[0].aceite.por = 'trocado'; }).not.toThrow();
      expect(JSON.stringify(r)).toBe(antes);
      /* em cada estado, o aceite devolvido é cópia */
      const limpo = await medir();
      const tudo = aceitarTodas(limpo);
      const congelado = JSON.stringify(tudo);
      for (const lido of [limpo, await medir(pinoDaBaseEmY), await medir(vazia('bloco-com-pino'))]) {
        for (const etapa of lerEtapas(tudo, lido).etapas) expect(() => { etapa.aceite.por = 'trocado'; }).not.toThrow();
      }
      expect(JSON.stringify(tudo)).toBe(congelado);
      expect(Object.isFrozen(r.eventos[0])).toBe(true);
      expect(Object.isFrozen(r.eventos[0].impressao.pose)).toBe(true);
    });

    describe('o registro adulterado à mão recusa', () => {
      const lerOu = (registro, medido) => codigoDe(() => lerEtapas(registro, medido));
      let medido; let r;
      beforeEach(async () => { medido = await medir(); r = copia(aceitarTodas(medido)); });

      it('formato, versão, campos sobrando e instância ausente', () => {
        expect(lerOu({ ...r, formato: 'outro' }, medido)).toBe('registro-invalido');
        expect(lerOu({ ...r, versao: 9 }, medido)).toBe('registro-invalido');
        expect(lerOu({ ...r, eventos: 'x' }, medido)).toBe('registro-invalido');
        expect(lerOu({ ...r, etapas: [] }, medido)).toBe('registro-invalido');
        expect(lerOu({ ...r, eventos: [{ ...r.eventos[0], instancia: '' }] }, medido)).toBe('registro-invalido');
        expect(lerOu({ ...r, eventos: [{ ...r.eventos[0], estado: 'fixa' }] }, medido)).toBe('registro-invalido');
        expect(lerOu({ ...r, eventos: [{ ...r.eventos[0], tipo: 'fixou' }] }, medido)).toBe('registro-invalido');
        expect(lerOu(null, medido)).toBe('registro-invalido');
      });

      it('aceite sem quem, e reabertura sem quem, quando ou motivo', () => {
        const semPor = copia(r); semPor.eventos[0].aceite = {};
        expect(lerOu(semPor, medido)).toBe('registro-invalido');
        for (const campo of ['por', 'quando', 'motivo']) {
          const rea = { tipo: 'reabertura', instancia: 'base', por: 'p', quando: 'q', motivo: 'm', [campo]: ' ' };
          expect(lerOu({ ...r, eventos: [...r.eventos, rea] }, medido)).toBe('registro-invalido');
        }
        const boa = { tipo: 'reabertura', instancia: 'base', por: 'p', quando: 'q', motivo: 'm' };
        expect(lerOu({ ...r, eventos: [...r.eventos, boa] }, medido)).toBeUndefined();
      });

      it('R5 o aceite à mão sem reabertura não devolve a quebrada a fixa; a reabertura antes do aceite também recusa', () => {
        const dup = { ...r, eventos: [...r.eventos, r.eventos[0]] };
        expect(lerOu(dup, medido)).toBe('registro-invalido');
        const fora = { ...r, eventos: [{ tipo: 'reabertura', instancia: 'base', por: 'p', quando: 'q', motivo: 'm' }, ...r.eventos] };
        expect(lerOu(fora, medido)).toBe('registro-invalido');
        const duasReaberturas = { ...r, eventos: [...r.eventos, ...[1, 2].map(() => ({ tipo: 'reabertura', instancia: 'base', por: 'p', quando: 'q', motivo: 'm' }))] };
        expect(lerOu(duasReaberturas, medido)).toBe('registro-invalido');
      });

      it('R6 o aceite com junta que não passa, impressão com null, campo sobrando ou tipo trocado', () => {
        const reprovada = copia(r); reprovada.eventos[1].impressao.juntas[0].satisfeita = false;
        expect(lerOu(reprovada, medido)).toBe('registro-invalido');
        const semFlag = copia(r); delete semFlag.eventos[1].impressao.juntas[0].satisfeita;
        expect(lerOu(semFlag, medido)).toBe('registro-invalido');
        for (const campo of ['forma', 'parametros', 'pose', 'juntas', 'citadas', 'anteriores']) {
          const nulo = copia(r); nulo.eventos[1].impressao[campo] = null;
          expect(lerOu(nulo, medido)).toBe('registro-invalido');
        }
        const tipo = copia(r); tipo.eventos[1].impressao.juntas = 'x';
        expect(lerOu(tipo, medido)).toBe('registro-invalido');
        const sobra = copia(r); sobra.eventos[1].impressao.estado = 'fixa';
        expect(lerOu(sobra, medido)).toBe('registro-invalido');
        const semImpressao = copia(r); delete semImpressao.eventos[1].impressao;
        expect(lerOu(semImpressao, medido)).toBe('registro-invalido');
      });

      it('o registro de outra montagem recusa, e acrescentar reabertura também valida o registro', () => {
        expect(lerOu({ ...r, montagem: 'outra' }, medido)).toBe('registro-de-outra-montagem');
        expect(codigoDe(() => acrescentarReabertura({ ...r, versao: 9 }, 'base', POR))).toBe('registro-invalido');
      });
    });

    describe('números', () => {
      it('R1 a poeira perto de zero não quebra, e o piso não esconde uma diferença de verdade', async () => {
        const medido = await medir();
        const registro = aceitarTodas(medido);
        const suja = comEtapa(medido, 'meio', (e) => { e.pose.deslocamento[0] = 1e-17; e.pose.rotacao[0][1] = 6.123233995736766e-17; return e; });
        expect(estados(registro, suja).meio).toBe('fixa');
        expect(estados(registro, comEtapa(medido, 'meio', (e) => { e.pose.deslocamento[0] = 1e-9; return e; })).meio).toBe('quebrada');
        expect(estados(registro, comEtapa(medido, 'meio', (e) => { e.pose.deslocamento[0] = -0; return e; })).meio).toBe('fixa');
      });

      it('número não finito na medida recusa a impressão e o aceite', async () => {
        const medido = await medir();
        for (const valor of [NaN, Infinity, -Infinity]) {
          const ruim = comEtapa(medido, 'meio', (e) => ({ ...e, pose: { ...e.pose, deslocamento: [valor, 0.02, 0] } }));
          expect(codigoDe(() => imprimirEtapa(ruim, 'meio'))).toBe('impressao-nao-finita');
          expect(codigoDe(() => acrescentarAceite(aceitarTodas({ ...medido, ordem: ['base'] }), ruim, 'meio', aceite))).toBe('impressao-nao-finita');
        }
      });
    });
  });
});

/* A FATIA 2: `fixar` e `reabrir` só acrescentam eventos ao registro da versão 3, e a versão do registro escolhe o caminho. */
describe('o registro da versão 3 pelos comandos', () => {
  const opcoes = { receitas: RECEITAS, rodadasDe: todasFechadas };
  const POR = 'pessoa, 2026-11-17: fatia 2';
  const comTabela = (ref, tabela) => ({ ...RECEITAS, [ref]: receitaComParametros(RECEITAS[ref], tabela) });
  const semRegistro = () => rmSync(arquivoDoRegistro(arquivo), { force: true });
  const lido = async (extra = {}) => (await estadoDasEtapas(arquivo, { receitas: RECEITAS, ...extra })).leitura.etapas.map((e) => `${e.instancia}:${e.estado}`).join(' ');
  const gravado = () => JSON.parse(readFileSync(arquivoDoRegistro(arquivo), 'utf8'));
  async function tresFixasEmDisco() {
    semRegistro();
    for (const id of ['base', 'meio', 'topo']) gravarRegistro(arquivo, await fixar(arquivo, id, aceite, opcoes));
  }

  it('sem registro, o primeiro fixar cria o da versão 3, só com eventos, e o estado sai da leitura', async () => {
    semRegistro();
    const registro = await fixar(arquivo, 'base', aceite, opcoes);
    gravarRegistro(arquivo, registro);
    expect(Object.keys(gravado())).toEqual(['formato', 'versao', 'montagem', 'eventos']);
    expect(gravado().versao).toBe(3);
    expect(gravado().eventos.map((e) => [e.tipo, e.instancia])).toEqual([['aceite', 'base']]);
    expect(await lido()).toBe('base:fixa meio:aberta topo:aberta');
    const estado = await estadoDasEtapas(arquivo, { receitas: RECEITAS });
    expect(estado.leitura.proxima.instancia).toBe('meio');
  });

  it('fixar na ordem, reabrir só acrescenta evento e as posteriores seguem fixas', async () => {
    await tresFixasEmDisco();
    expect(await lido()).toBe('base:fixa meio:fixa topo:fixa');
    const antes = gravado();
    const reaberto = await reabrir(arquivo, 'base', POR, { receitas: {} });
    expect(reaberto.eventos.slice(0, 3)).toEqual(antes.eventos);
    expect(reaberto.eventos.at(-1)).toEqual({ tipo: 'reabertura', instancia: 'base', por: 'pessoa', quando: '2026-11-17', motivo: 'fatia 2' });
    gravarRegistro(arquivo, reaberto);
    expect(await lido()).toBe('base:aberta meio:fixa topo:fixa');
    await recusa(reabrir(arquivo, 'base', POR), 'etapa-nao-fixa');
    await recusa(reabrir(arquivo, 'meio', 'sem data'), 'reabertura-sem-autor');
  });

  it('as recusas do fixar seguem: fora de ordem, sem o crítico e sem aceite', async () => {
    semRegistro();
    await recusa(fixar(arquivo, 'meio', aceite, opcoes), 'etapa-fora-de-ordem');
    await recusa(fixar(arquivo, 'base', aceite, { receitas: RECEITAS, rodadasDe: () => [] }), 'etapa-sem-critico');
    await recusa(fixar(arquivo, 'base', {}, opcoes), 'etapa-sem-aceite');
  });

  it('fixar a etapa com posteriores quebradas avisa, sem recusar, que elas seguem quebradas', async () => {
    await tresFixasEmDisco();
    gravarRegistro(arquivo, await reabrir(arquivo, 'base', POR));
    const mudadas = comTabela('bloco-com-pino', { alturaDoPino: 18 });
    const avisos = [];
    const registro = await fixar(arquivo, 'base', aceite, { receitas: mudadas, rodadasDe: todasFechadas, avisar: (t) => avisos.push(t) });
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatch(/^aviso: 'meio' segue quebrada depois deste aceite \(meio: mudou depois do aceite: /);
    expect(avisos[0]).toContain('reabra cada uma');
    gravarRegistro(arquivo, registro);
    expect(await lido({ receitas: mudadas })).toBe('base:fixa meio:quebrada topo:fixa');
    /* sem posterior quebrada, nenhum aviso */
    const limpos = [];
    await tresFixasEmDisco();
    gravarRegistro(arquivo, await reabrir(arquivo, 'topo', POR));
    gravarRegistro(arquivo, await fixar(arquivo, 'topo', aceite, { ...opcoes, avisar: (t) => limpos.push(t) }));
    expect(limpos).toEqual([]);
  });

  it('a versão do registro escolhe o caminho: o da versão 2 é lido pelo antigo e o comando avisa; o da 3 e a ausência, não', async () => {
    const avisos = [];
    const antigo = await estadoDasEtapas(arquivo, { receitas: RECEITAS, avisar: (t) => avisos.push(t) });
    expect(antigo.versao).toBe(2);
    expect(antigo.registro.etapas.map((e) => e.estado)).toEqual(['aberta', 'aberta', 'aberta']);
    expect(avisos).toEqual([AVISO_DO_CAMINHO_ANTIGO]);
    expect(AVISO_DO_CAMINHO_ANTIGO).toMatch(/caminho antigo/);
    const fixou = await fixar(arquivo, 'base', aceite, { ...opcoes, anterior: undefined, avisar: (t) => avisos.push(t) });
    expect(fixou.versao).toBe(2);
    expect(avisos).toHaveLength(2);
    semRegistro();
    const novos = [];
    const novo = await estadoDasEtapas(arquivo, { receitas: RECEITAS, avisar: (t) => novos.push(t) });
    expect(novo.versao).toBe(3);
    expect(novos).toEqual([]);
    await expect(estadoDasEtapas(arquivo, { receitas: RECEITAS, anterior: { formato: 'mecanifica.registro-de-etapas', versao: 3, montagem: 'tres-blocos', eventos: 'x' } })).rejects.toMatchObject({ codigo: 'registro-invalido' });
  });

  describe('os consumidores do estado leem o registro v3 pela leitura', () => {
    const v3 = async (defeitos = []) => {
      const medido = await medirAgora(arquivo, { receitas: RECEITAS });
      return medido.ordem.slice(0, 2).reduce((r, id, i) => acrescentarAceite(r, medido, id, { por: 'Ana, 2026-11-10', ...(i === 0 ? { defeitosAceitos: defeitos } : {}) }), registroVazio('tres-blocos'));
    };

    it('registroComEstado: a versão 3 sai da leitura, a 2 como gravada, e sem registro é null', async () => {
      const registro = await v3();
      const lida = await registroComEstado(arquivo, { receitas: RECEITAS, anterior: registro });
      expect(lida.etapas.map((e) => [e.instancia, e.estado])).toEqual([['base', 'fixa'], ['meio', 'fixa'], ['topo', 'aberta']]);
      expect(lida.etapas[0].aceite.por).toBe('Ana, 2026-11-10');
      const mudada = await registroComEstado(arquivo, { receitas: comTabela('bloco-com-pino', { alturaDoPino: 18 }), anterior: registro });
      expect(mudada.etapas.map((e) => e.estado)).toEqual(['quebrada', 'quebrada', 'aberta']);
      const antigo = { ...ANTIGO, etapas: [{ instancia: 'base', estado: 'fixa' }] };
      expect(await registroComEstado(arquivo, { anterior: antigo })).toBe(antigo);
      expect(await registroComEstado(arquivo, { anterior: null })).toBeNull();
    });

    it('custo por peça: o aceite vigente e os defeitos aceitos saem dos eventos, sem medir', async () => {
      const pasta = join(area, 'objeto');
      mkdirSync(pasta);
      copyFileSync(arquivo, join(pasta, 'montagem.json'));
      writeFileSync(join(pasta, 'montagem.etapas.json'), JSON.stringify(await v3(['risco', 'marca'])));
      const aceites = aceitesDasEtapas(pasta);
      expect(aceites.get('bloco-com-pino')).toEqual({ defeitosAceitos: 2, data: '2026-11-10' });
      expect(aceites.get('bloco-com-furo-e-pino')).toEqual({ defeitosAceitos: 0, data: '2026-11-10' });
      expect(aceites.has('bloco-com-furo')).toBe(false);
    });

    it('as guardas: a receita sem passo espera a etapa no registro v3, que nunca a tem fixa, e no v2 vale o gravado', () => {
      const raiz = join(area, 'acervo');
      mkdirSync(join(raiz, 'obj'), { recursive: true });
      writeFileSync(join(raiz, 'obj', 'montagem.json'), JSON.stringify({ instancias: [{ id: 'a', alvo: { ref: 'obj/x' } }], etapas: ['a'] }));
      const registro = join(raiz, 'obj', 'montagem.etapas.json');
      writeFileSync(registro, JSON.stringify({ versao: 3, eventos: [] }));
      expect(etapaQueEspera('obj/x', { raiz })).toEqual({ montagem: 'obj/montagem.json', instancia: 'a' });
      writeFileSync(registro, JSON.stringify({ versao: 2, etapas: [{ instancia: 'a', estado: 'fixa' }] }));
      expect(etapaQueEspera('obj/x', { raiz })).toBeNull();
    });

    it('a superfície: sem medir o registro v3 não está fixa, e com a etapa medida vale a medida; o v2 vale o gravado', () => {
      const raiz = join(area, 'acervo');
      mkdirSync(join(raiz, 'obj'), { recursive: true });
      writeFileSync(join(raiz, 'obj', 'montagem.json'), JSON.stringify({ instancias: [{ id: 'a', alvo: { ref: 'obj/x' } }], etapas: ['a'] }));
      const registro = join(raiz, 'obj', 'montagem.etapas.json');
      writeFileSync(registro, JSON.stringify({ versao: 3, eventos: [] }));
      expect(etapaFixaDaPeca('obj/x', { raiz })).toBe(false);
      expect(etapaFixaDaPeca('obj/x', { raiz, etapaFixa: true })).toBe(true);
      writeFileSync(registro, JSON.stringify({ versao: 2, etapas: [{ instancia: 'a', estado: 'fixa' }] }));
      expect(etapaFixaDaPeca('obj/x', { raiz })).toBe(true);
    });

    it('o resumo do objeto e o fluxo contam as fixas pela leitura, e o resumo sem a leitura recusa o v3', () => {
      const acervo = join(area, 'acervo');
      const pasta = join(acervo, 'coisa');
      mkdirSync(pasta, { recursive: true });
      writeFileSync(join(pasta, 'ALINHAMENTO.md'), '# coisa\n');
      writeFileSync(join(pasta, 'montagem.json'), JSON.stringify({ id: 'coisa', etapas: ['a', 'b'], instancias: [] }));
      writeFileSync(join(pasta, 'montagem.etapas.json'), JSON.stringify({ versao: 3, eventos: [] }));
      expect(() => estadoDoObjeto('coisa', { acervo })).toThrow(/versão 3/);
      const lido = { versao: 3, etapas: [{ instancia: 'a', estado: 'fixa' }, { instancia: 'b', estado: 'quebrada' }] };
      expect(estadoDoObjeto('coisa', { acervo, registroLido: lido }).etapas.find((e) => e.etapa === 'modelagem por etapa').estado).toBe('1 de 2 fixas; próxima b');
      expect(lerEtapasDoFluxo(pasta, { registroLido: lido })).toMatchObject({ fixas: ['a'], abertas: ['b'], proxima: 'b' });
    });
  });
});

