/* A varredura de parâmetros e o `descrever` enxergam o registro de composições. (O Envelope do Condutor do esboço antigo também
   o recebia, e o teste dele saiu com o esboço antigo em 2026-11-05.)

   A receita da fixture (`tools/fixtures/composicao-parametrica/`) compõe por `CHAMADAS_COMPOSICOES` e deriva as chamadas de
   `PARAMS`. Antes desta mudança nenhum desses caminhos recebia o registro, e a execução falhava com "exige registroComposicoes".
   O que se prova aqui:
   - com o registro entregue (por objeto na API ou por módulo em `--composicoes`), a varredura em lote dentro das faixas
     declaradas, a sensibilidade e o `descrever` medem, e duas execuções dão o mesmo resultado;
   - sem registro, cada caminho recusa dizendo o que falta, e uma configuração inválida é recusada com o motivo;
   - a receita que usa `PASSOS` tem a mesma saída com e sem registro entregue. */
import { describe, expect, it } from 'vitest';
import { varrerLote, varrerSensibilidade } from '../../src/autoria/varrer-parametros.js';
import { varrerReutilizavel } from './varrer-peca.mjs';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita, REPO } from './resolver-caminho-receita.mjs';
import { criarConfiguracao } from '../fixtures/composicao-parametrica/configuracao.mjs';
import { carregarConfiguracaoDeComposicoes, validarConfiguracao } from './configuracao-composicoes.mjs';

const PASTA = 'tools/fixtures/composicao-parametrica';
const RECEITA = `${PASTA}/receita.js`;
const CONFIGURACAO = `${PASTA}/configuracao.mjs`;
const LIVRES = ['largura:0.08..0.12:3', 'folga:0.005..0.02:4'];

const receita = async () => receitaDoModulo(await importarReceita(resolverCaminhoReceita(RECEITA, { raiz: REPO })));
const registros = () => criarConfiguracao();

describe('a varredura de uma receita que compõe', () => {
  it('o lote cai dentro das faixas declaradas, mede cada combinação e se repete bit a bit', async () => {
    const r = await receita();
    const a = varrerLote(r, { liberdades: LIVRES, objetivo: { modo: 'maximizar' }, ...registros() });
    const b = varrerLote(r, { liberdades: LIVRES, objetivo: { modo: 'maximizar' }, ...registros() });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.variantes).toBe(12);
    expect(a.candidatos).toHaveLength(12);
    expect(a.candidatos.every((c) => c.estado === 'viavel')).toBe(true);
    for (const { valores } of a.candidatos) {
      expect(valores.largura).toBeGreaterThanOrEqual(0.08);
      expect(valores.largura).toBeLessThanOrEqual(0.12);
      expect(valores.folga).toBeGreaterThanOrEqual(0.005);
      expect(valores.folga).toBeLessThanOrEqual(0.02);
    }
    /* o critério é a menor folga entre partes: ela é a `folga` declarada, em metro */
    expect(a.base.valor).toBeCloseTo(0.01, 9);
    expect(a.viaveis[0].valores.folga).toBe(0.02);
    expect(a.viaveis[0].valor).toBeCloseTo(0.02, 9);
  });

  it('a sensibilidade acha o que move a peça e o que não move, e se repete', async () => {
    const r = await receita();
    const a = varrerSensibilidade(r, registros());
    const b = varrerSensibilidade(r, registros());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.efeitos.filter((e) => e.move).map((e) => e.caminho)).toEqual(['folga']);
    expect(a.efeitos.filter((e) => !e.move).map((e) => e.caminho)).toEqual(['largura', 'altura', 'inerte']);
  });

  it('o comando entrega o mesmo resultado pelo objeto ou pelo módulo de configuração', async () => {
    const porModulo = await varrerReutilizavel({ alvo: RECEITA, liberdades: LIVRES, objetivo: { modo: 'maximizar' }, composicoes: CONFIGURACAO });
    const porObjeto = await varrerReutilizavel({ alvo: RECEITA, liberdades: LIVRES, objetivo: { modo: 'maximizar' }, ...registros() });
    const outraVez = await varrerReutilizavel({ alvo: RECEITA, liberdades: LIVRES, objetivo: { modo: 'maximizar' }, composicoes: CONFIGURACAO });
    expect(porModulo).toMatchObject({ ok: true, codigo: 0 });
    expect(porModulo.stdout).toBe(porObjeto.stdout);
    expect(porModulo.stdout).toBe(outraVez.stdout);
    expect(porModulo.stdout).toContain('12 combinações');
  });

  it('sem o registro, recusa dizendo o que falta, na API e no comando', async () => {
    const r = await receita();
    expect(() => varrerLote(r, { liberdades: LIVRES })).toThrow(/exige registroComposicoes/);
    for (const argumentos of [{ liberdades: LIVRES }, {}]) {
      const sem = await varrerReutilizavel({ alvo: RECEITA, ...argumentos });
      expect(sem).toMatchObject({ ok: false, codigo: 2 });
      expect(sem.stderr).toContain('CHAMADAS_COMPOSICOES');
      expect(sem.stderr).toContain('--composicoes=');
      expect(sem.stderr).toContain('registroComposicoes');
    }
  });
});

describe('o descrever de uma receita que compõe', () => {
  it('mede com o registro, pelo módulo ou pelo objeto, e se repete', async () => {
    const porModulo = await descreverPecaReutilizavel({ peca: RECEITA, composicoes: CONFIGURACAO });
    const porObjeto = await descreverPecaReutilizavel({ peca: RECEITA, ...registros() });
    const outraVez = await descreverPecaReutilizavel({ peca: RECEITA, composicoes: CONFIGURACAO });
    expect(porModulo).toMatchObject({ ok: true, codigo: 0 });
    expect(porModulo.stdout).toBe(porObjeto.stdout);
    expect(porModulo.stdout).toBe(outraVez.stdout);
    expect(porModulo.resultado.descricao.totais).toMatchObject({ partes: 2, orfaos: 0, facesSemParte: 0 });
    expect(porModulo.stdout).toMatch(/base\s+pilar\s+folga\s+folga\s+y\s+0\.010000/);
  });

  it('sem o registro, recusa dizendo o que falta', async () => {
    const sem = await descreverPecaReutilizavel({ peca: RECEITA });
    expect(sem).toMatchObject({ ok: false, codigo: 2 });
    expect(sem.stderr).toContain('falta o registro de composições');
    expect(sem.stderr).toContain('--composicoes=');
  });

  it('a receita de PASSOS tem a mesma saída com e sem registro entregue', async () => {
    const peca = 'tools/fixtures/acervo/peca-de-prova/receita.js';
    const sem = await descreverPecaReutilizavel({ peca });
    const com = await descreverPecaReutilizavel({ peca, ...registros() });
    const pelaOpcao = await descreverPecaReutilizavel({ peca, composicoes: CONFIGURACAO });
    expect(sem.stdout).toContain('partes:');
    for (const outra of [com, pelaOpcao]) {
      expect(outra.stdout).toBe(sem.stdout);
      expect(outra.stderr).toBe(sem.stderr);
      expect(outra.codigo).toBe(sem.codigo);
    }
  });
});

describe('a configuração do registro', () => {
  it('é carregada do módulo e traz os registros', async () => {
    const configuracao = await carregarConfiguracaoDeComposicoes(CONFIGURACAO);
    expect(Object.keys(configuracao).sort()).toEqual(['registroComposicoes', 'registroOperacoes']);
    expect(configuracao.registroComposicoes.assinatura).toBe(registros().registroComposicoes.assinatura);
  });

  it('recusa módulo que não existe, que não exporta a configuração e objeto sem registro', async () => {
    await expect(carregarConfiguracaoDeComposicoes(`${PASTA}/nao-existe.mjs`)).rejects.toThrow(/não encontrada/);
    await expect(carregarConfiguracaoDeComposicoes('')).rejects.toThrow(/veio vazio/);
    await expect(carregarConfiguracaoDeComposicoes(`${PASTA}/composicoes.js`)).rejects.toThrow(/não exporta a configuração/);
    expect(() => validarConfiguracao({})).toThrow(/não traz registroComposicoes/);
    expect(() => validarConfiguracao({ registroComposicoes: registros().registroComposicoes, registroOperacoes: {} })).toThrow(/registroOperacoes/);
  });

  it('o comando recusa o módulo errado como erro de uso', async () => {
    const r = await descreverPecaReutilizavel({ peca: RECEITA, composicoes: `${PASTA}/composicoes.js` });
    expect(r).toMatchObject({ ok: false, codigo: 2 });
    expect(r.stderr).toContain('não exporta a configuração');
  });
});
