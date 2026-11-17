/* etapas-consumidores-v3.test.mjs — cada consumidor do estado das etapas, de ponta a ponta, sobre um registro v3 em disco.
   A pasta de prova é uma cópia do `carrinho-de-mao` com um registro v3 construído em memória (os quatro aceites, ou só os primeiros),
   e as receitas são as do acervo. Um consumidor que deixa de passar pela leitura, ou que mede a montagem a mais, falha aqui. */
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acrescentarAceite, registroVazio } from '../../src/autoria/etapas-pela-impressao.js';
import { arquivoDoRegistro, medicoesFeitas, medirAgora } from './etapas-da-montagem.mjs';
import { fluxoDoObjeto, lerEtapas as lerEtapasDoFluxo } from './fluxo-do-objeto.mjs';
import { estadoDoObjetoMedido } from './objeto.mjs';
import { medirReceita } from './rodada-de-modelagem.mjs';
import { etapaFixaDaPecaMedida, latariaDaPeca } from './vistas-de-superficie.mjs';
import { registroDasEtapasMedido, vistasParaCritica } from './vistas-para-critica.mjs';

const REAL = fileURLToPath(new URL('../../procedural/pecas/carrinho-de-mao', import.meta.url));
let tmp; let pasta; let arquivo; let medido;
const RODA = 'carrinho-de-mao/roda';

/* grava o registro v3 com os `n` primeiros aceites; a roda é a quarta etapa */
const gravarV3 = (n) => {
  const registro = medido.ordem.slice(0, n).reduce((r, id) => acrescentarAceite(r, medido, id, { por: 'pessoa, 2026-11-17' }), registroVazio(medido.montagem));
  writeFileSync(arquivoDoRegistro(arquivo), `${JSON.stringify(registro, null, 2)}\n`);
};

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'consumidores-v3-'));
  pasta = join(tmp, 'carrinho-de-mao');
  cpSync(REAL, pasta, { recursive: true });
  rmSync(arquivoDoRegistro(join(pasta, 'montagem.json')), { force: true });
  arquivo = join(pasta, 'montagem.json');
  medido = await medirAgora(arquivo);
}, 120_000);
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('os consumidores do estado, sobre um registro v3 em disco', () => {
  it('etapaFixaDaPecaMedida: a roda só está fixa com o aceite dela', async () => {
    gravarV3(3);
    expect(await etapaFixaDaPecaMedida(RODA, { raiz: tmp })).toBe(false);
    gravarV3(4);
    expect(await etapaFixaDaPecaMedida(RODA, { raiz: tmp })).toBe(true);
  }, 120_000);

  it('registroDasEtapasMedido: o registro com o estado da leitura', async () => {
    gravarV3(2);
    const lido = await registroDasEtapasMedido({ arquivo });
    expect(lido.etapas.map((e) => `${e.instancia}:${e.estado}`)).toEqual(['chassi:fixa', 'pes:fixa', 'cacamba:aberta', 'roda:aberta']);
  }, 120_000);

  it('estadoDoObjetoMedido: as fixas contadas pela leitura', async () => {
    gravarV3(2);
    const estado = await estadoDoObjetoMedido('carrinho-de-mao', { acervo: tmp });
    expect(estado.etapas.find((e) => e.etapa === 'modelagem por etapa').estado).toBe('2 de 4 fixas; próxima cacamba');
  }, 120_000);

  it('fluxoDoObjeto: as etapas fixas da leitura, e com --medir a montagem é medida uma vez, passada a cada peça', async () => {
    gravarV3(2);
    const antes = medicoesFeitas();
    const recebidos = [];
    const medir = async (ref, opcoes) => { recebidos.push(opcoes.registroLido); return { acao: 'parar-fechou', motivo: 'ensaio', defeitos: [] }; };
    const f = await fluxoDoObjeto(pasta, { acervo: tmp, medir });
    expect(f.passos.find((p) => p.nome === 'montagem')).toMatchObject({ fixas: 2, proxima: 'cacamba' });
    expect(medicoesFeitas() - antes).toBe(1);
    expect(recebidos.length).toBeGreaterThan(0);
    expect(recebidos.every((r) => r === recebidos[0] && r.etapas.length === 4)).toBe(true);
    expect(() => lerEtapasDoFluxo(pasta)).toThrow(/versão 3/);
  }, 120_000);

  it('rodada-de-modelagem: a luz rasante da roda sai da etapa medida que a medição recebe, e a etapa aberta não a dispensa', async () => {
    const registro = (estado) => ({ etapas: medido.ordem.map((instancia) => ({ instancia, estado: instancia === 'roda' ? estado : 'fixa' })) });
    const fixa = await medirReceita(RODA, { registroDasEtapas: registro('fixa') });
    const aberta = await medirReceita(RODA, { registroDasEtapas: registro('aberta') });
    expect(fixa.luzRasante.luzRasante).toBe(false);
    expect(aberta.luzRasante.luzRasante).toBe(true);
  }, 180_000);

  it('latariaDaPeca: a mesma decisão, lida do registro v3 em disco', async () => {
    gravarV3(3);
    expect((await latariaDaPeca(RODA, { raiz: tmp })).luzRasante).toBe(true);
    gravarV3(4);
    expect((await latariaDaPeca(RODA, { raiz: tmp })).luzRasante).toBe(false);
  }, 180_000);

  it('vistasParaCritica: a superfície e o contorno leem o mesmo registro medido, uma medição só', async () => {
    gravarV3(3);
    const montagem = { arquivo, instancia: 'roda', instancias: ['roda'] };
    const dependencias = {
      medirReceita: async () => ({ passou: true, sha256: 'sha256:de-ensaio', relatorio: 'ok' }), blender: null, rodadasAnteriores: () => [],
      montagemDaPeca: () => montagem,
      olharBancada: async () => { throw new Error('parar aqui'); },
    };
    const antes = medicoesFeitas();
    await vistasParaCritica(RODA, { saida: join(tmp, 'rodada'), pastaDasCapturas: tmp, dependencias }).catch(() => {});
    /* a roda é peça de luz rasante sem ser de lataria: a decisão da superfície pede o registro medido, uma vez, e o que vem depois o reaproveita */
    expect(medicoesFeitas() - antes).toBe(1);
  }, 180_000);
});
