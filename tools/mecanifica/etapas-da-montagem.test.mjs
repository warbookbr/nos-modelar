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
import { estadoDasEtapas, fixar } from './etapas-da-montagem.mjs';
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
