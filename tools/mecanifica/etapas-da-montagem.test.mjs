/* etapas-da-montagem.test.mjs — a porta que fixa etapa. Fixar exige a etapa
   ser a próxima, o crítico ter fechado a peça dela, a nota de passagem, as
   juntas passando e o aceite da pessoa. Cada recusa tem o seu caso. */
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registrarRodada } from '../../src/autoria/laco-de-modelagem.js';
import { ErroEtapaDeConstrucao } from '../../src/autoria/etapas-de-construcao.js';
import { estadoDasEtapas, fixar, reabrir } from './etapas-da-montagem.mjs';
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

  it('recusa reabrir etapa com posterior fixa, e reabre de trás para frente guardando o histórico', async () => {
    let registro = await duasFixas();
    await recusa(reabrir(arquivo, 'base', POR, { ...opcoes, anterior: registro }), 'etapa-com-posteriores-fixas');
    registro = await reabrir(arquivo, 'meio', POR, { ...opcoes, anterior: registro });
    expect(registro.etapas.map((e) => e.estado)).toEqual(['fixa', 'aberta', 'aberta']);
    expect(registro.etapas[1].aceite).toBeUndefined();
    expect(registro.etapas[1].reaberturas).toEqual([{ por: 'pessoa', quando: '2026-09-26', motivo: 'refazer pelo desenho novo', aceite: { por: 'pessoa', analise: 'ausente' } }]);
    /* A releitura mantém a etapa aberta e o histórico. */
    const { registro: relido } = await estadoDasEtapas(arquivo, { receitas: RECEITAS, anterior: registro });
    expect(relido.etapas[1]).toMatchObject({ estado: 'aberta', reaberturas: registro.etapas[1].reaberturas });
    /* Refixar acumula, sem apagar a reabertura. */
    const refixado = await fixar(arquivo, 'meio', aceite, { ...opcoes, anterior: relido });
    expect(refixado.etapas[1]).toMatchObject({ estado: 'fixa', reaberturas: [{ motivo: 'refazer pelo desenho novo' }] });
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
