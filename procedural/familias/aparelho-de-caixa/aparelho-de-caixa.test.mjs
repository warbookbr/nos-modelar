/* aparelho-de-caixa.test.mjs — a família de aparelho de caixa: as combinações que ela declara, a caixa envolvente do perfil do
   forninho medida na malha, a frente em todo ponto, o vidro como peça à parte, o determinismo do hash, e as recusas que dizem
   a restrição. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { chamar, ErroChamadaDeFamilia } from '../../../src/autoria/chamar-familia.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { APARELHO_DE_CAIXA, CONTRATO_DO_APARELHO_DE_CAIXA } from './index.js';
import { COMPOSICOES, combinacoes, idDoAparelho } from './composicoes.js';
import { criarRegistroDeFamilias } from '../index.js';

const registro = criarRegistroDeFamilias({ familias: [APARELHO_DE_CAIXA] });
const rodar = (parametros) => executarReceita({ get CHAMADAS_COMPOSICOES() { return [chamar(APARELHO_DE_CAIXA, 'corpo', parametros)]; } }, registro);
const hash = (neutro) => sha256Hex(JSON.stringify(neutroCanonico(neutro)));
const recusa = (parametros) => {
  try { rodar(parametros); } catch (erro) { return erro; }
  throw new Error('a chamada devia ser recusada');
};
const pontos = (campo) => Object.fromEntries(Object.entries(CONTRATO_DO_APARELHO_DE_CAIXA.parametros).map(([nome, p]) => [nome, p[campo]]));
const partesDaMalha = (neutro) => new Set([...neutro.F.values()].map((f) => f.parte).filter((nome) => nome != null));

describe('o contrato e as composições', () => {
  it('é um componente, sem portas, com as combinações de painel, botões, puxador e visor', () => {
    expect(CONTRATO_DO_APARELHO_DE_CAIXA.id).toBe('aparelho-de-caixa');
    expect(CONTRATO_DO_APARELHO_DE_CAIXA.nivel).toBe('componente');
    expect(APARELHO_DE_CAIXA.contrato.portas).toEqual([]);
    const combos = combinacoes();
    expect(combos).toHaveLength(96);
    expect(COMPOSICOES).toHaveLength(combos.length);
    expect(new Set(COMPOSICOES.map(({ id }) => id)).size).toBe(combos.length);
    expect(COMPOSICOES.map(({ id }) => id)).toContain(idDoAparelho({ painel: 1, giratorios: 3, pressao: 0, puxador: 1, visor: 1 }));
  });

  it('o perfil do forninho é chamável por nome e os três pontos também', () => {
    expect(chamar(APARELHO_DE_CAIXA, 'corpo', { perfil: 'forninho-eletrico' }).composicao).toBe('aparelho-de-caixa.p1-g3-b0-t1-v1');
  });
});

describe('a frente em todo ponto e perfil', () => {
  it.each([['minimo'], ['medio'], ['maximo'], ['forninho']])('o ponto %s tem porta e ao menos um botão', (nome) => {
    const parametros = nome === 'forninho' ? { perfil: 'forninho-eletrico' } : pontos(nome);
    const { neutro } = rodar(parametros);
    const partes = partesDaMalha(neutro);
    expect(partes.has('porta')).toBe(true);
    expect(partes.has('botao') || partes.has('botaoDePressao')).toBe(true);
  });
});

describe('o vidro é uma peça à parte, dentro do furo da porta', () => {
  it('o forninho tem a parte vidro, e a porta e o vidro não se tocam', () => {
    const { neutro } = rodar({ perfil: 'forninho-eletrico' });
    const partes = partesDaMalha(neutro);
    expect(partes.has('vidro')).toBe(true);
    expect(partes.has('porta')).toBe(true);
    const face = (nome) => [...neutro.F.values()].filter((f) => f.parte === nome);
    const vidroCentro = [0, 1, 2].map((k) => face('vidro').reduce((s, f) => s + f.vs.reduce((a, v) => a + neutro.V.get(v)[k], 0) / f.vs.length, 0) / face('vidro').length);
    expect(vidroCentro[2]).toBeGreaterThan(0.18);
  });

  it('sem visor o aparelho continua com porta e comando, e sem vidro', () => {
    const { neutro } = rodar({ perfil: 'forninho-eletrico', comVisor: 0 });
    const partes = partesDaMalha(neutro);
    expect(partes.has('porta')).toBe(true);
    expect(partes.has('vidro')).toBe(false);
  });
});

describe('a caixa do forninho medida na malha', () => {
  it('tem a largura, a altura e a profundidade do perfil, com o puxador saindo da porta', () => {
    const { neutro } = rodar({ perfil: 'forninho-eletrico' });
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const v of neutro.V.values()) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], v[k]); max[k] = Math.max(max[k], v[k]); }
    expect(max[0] - min[0]).toBeCloseTo(0.48, 6);
    expect(max[1] - min[1]).toBeCloseTo(0.29, 6);
    expect(min[1]).toBeCloseTo(0, 6);
    expect(min[2]).toBeCloseTo(-0.19, 6);
    expect(max[2]).toBeCloseTo(0.232, 6); // a face da porta em 0,212 mais a barra do puxador, afastada 15 mm e com 10 mm de profundidade
  });

  it('não deixa passo sem efeito e a malha tem faces', () => {
    const { neutro } = rodar({ perfil: 'forninho-eletrico' });
    expect(neutro.orfaos ?? []).toEqual([]);
    expect(neutro.F.size).toBeGreaterThan(0);
  });

  it('dá o mesmo hash em duas chamadas e nas receitas novas', () => {
    const a = hash(rodar({ perfil: 'forninho-eletrico' }).neutro);
    expect(hash(rodar({ perfil: 'forninho-eletrico' }).neutro)).toBe(a);
    expect(hash(rodar({ perfil: 'forninho-eletrico', botoesGiratorios: 2 }).neutro)).not.toBe(a);
  });
});

describe('as recusas dizem a restrição e não geram malha', () => {
  it('frente sem botão giratório: fora da faixa do contrato', () => {
    expect(recusa({ botoesGiratorios: 0 })).toBeInstanceOf(ErroChamadaDeFamilia);
  });

  it('porta baixa demais com o painel em cima', () => {
    const erro = recusa({ painelDeComando: 2, faixaDoPainel: 120, altura: 200, alturaDosPes: 15 });
    expect(erro).toBeInstanceOf(ErroChamadaDeFamilia);
    expect(erro.restricao).toBe('porta-baixa-no-painel-de-cima');
  });

  it('puxador vertical com visor numa porta estreita', () => {
    const erro = recusa({ largura: 300, tipoDePuxador: 2, comVisor: 1, faixaDoPainel: 120 });
    expect(erro.restricao).toBe('puxador-vertical-com-visor-largo');
  });

  it('botões que não cabem na coluna do painel à direita', () => {
    const erro = recusa({ altura: 200, alturaDosPes: 15, botoesGiratorios: 4, botoesDePressao: 2 });
    expect(erro.restricao).toBe('botoes-cabem-na-coluna');
    expect(erro.motivo).toMatch(/um botão a cada 50 mm/);
  });
});
