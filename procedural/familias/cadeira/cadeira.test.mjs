/* cadeira.test.mjs — a família de cadeira: as combinações, as faixas e restrições, a solidez da malha, o determinismo do hash,
   as partes nomeadas e uma medida por perfil contra o esboço alvo (receita do externo). */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { chamar, ErroChamadaDeFamilia } from '../../../src/autoria/chamar-familia.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { CADEIRA, CONTRATO_DA_CADEIRA } from './index.js';
import { COMPOSICOES, combinacoes } from './composicoes.js';
import { combinacaoDaCadeira, geometriaDaCadeira, idDaCadeira } from './geometria.js';
import { criarRegistroDeFamilias } from '../index.js';
import { ALVOS, compararPerfil } from '../../../tools/mecanifica/cadeiras-medida.mjs';

const registro = criarRegistroDeFamilias({ familias: [CADEIRA] });
const rodar = (parametros) => executarReceita({ get CHAMADAS_COMPOSICOES() { return [chamar(CADEIRA, 'corpo', parametros)]; } }, registro);
const hash = (neutro) => sha256Hex(JSON.stringify(neutroCanonico(neutro)));
const recusa = (parametros) => {
  try { rodar(parametros); } catch (erro) { return erro; }
  throw new Error('a chamada devia ser recusada');
};
const pontos = (campo) => Object.fromEntries(Object.entries(CONTRATO_DA_CADEIRA.parametros).map(([nome, p]) => [nome, p[campo]]));
const partesDaMalha = (neutro) => new Set([...neutro.F.values()].map((f) => f.parte).filter((nome) => nome != null));
const PERFIS = Object.keys(CONTRATO_DA_CADEIRA.perfis);

describe('o contrato e as composições', () => {
  it('é um componente sem portas, com uma composição por combinação de estrutura', () => {
    expect(CONTRATO_DA_CADEIRA.id).toBe('cadeira');
    expect(CONTRATO_DA_CADEIRA.nivel).toBe('componente');
    expect(CADEIRA.contrato.portas).toEqual([]);
    expect(combinacoes()).toHaveLength(2 * 3 * 2 * 2 * 2 * 6 * 5);
    expect(new Set(COMPOSICOES.map(({ id }) => id)).size).toBe(COMPOSICOES.length);
  });

  it('declara os cinco perfis, e cada um escolhe a composição da própria estrutura', () => {
    expect(PERFIS.sort()).toEqual(Object.keys(ALVOS).sort());
    expect(chamar(CADEIRA, 'corpo', { perfil: 'cadeira-de-madeira' }).composicao).toBe('cadeira.po1-sa2-tr0-al1-ba1-t1-r5');
    expect(chamar(CADEIRA, 'corpo', { perfil: 'cadeira-rustica' }).composicao).toBe('cadeira.po0-sa1-tr1-al1-ba0-t5-r3');
  });

  it('não desenha material nem cor: as faces saem só com a parte', () => {
    const { neutro } = rodar({ perfil: 'cadeira-de-madeira' });
    expect([...neutro.F.values()].every((f) => f.material == null && f.cor == null)).toBe(true);
  });
});

describe('os pontos mínimo, médio e máximo e os perfis são sólidos', () => {
  it.each([['minimo'], ['medio'], ['maximo'], ...PERFIS.map((p) => [p])])('%s: malha com faces, sem órfãos e com assento e pernas', (nome) => {
    const parametros = ['minimo', 'medio', 'maximo'].includes(nome) ? pontos(nome) : { perfil: nome };
    const { neutro } = rodar(parametros);
    expect(neutro.orfaos ?? []).toEqual([]);
    expect(neutro.F.size).toBeGreaterThan(0);
    const partes = partesDaMalha(neutro);
    for (const parte of ['perna-frente-esq', 'perna-frente-dir', 'perna-tras-esq', 'perna-tras-dir']) expect(partes.has(parte)).toBe(true);
    expect(partes.has('assento') || partes.has('tabua-assento-1')).toBe(true);
    expect([...neutro.F.values()].every((f) => f.parte != null)).toBe(true);
  });

  it('o assento é uma placa ou tábuas, e o encosto tem tantas ripas quanto o parâmetro', () => {
    const rustica = partesDaMalha(rodar({ perfil: 'cadeira-rustica' }).neutro);
    expect([...rustica].filter((n) => n.startsWith('tabua-assento-'))).toHaveLength(5);
    expect(rustica.has('assento')).toBe(false);
    expect(rustica.has('poste-esq')).toBe(false);
    expect([...partesDaMalha(rodar({ perfil: 'cadeira-de-madeira' }).neutro)].filter((n) => n.startsWith('ripa-'))).toHaveLength(5);
  });
});

describe('o determinismo', () => {
  it('dá o mesmo hash em duas chamadas, e outro quando um parâmetro muda', () => {
    const a = hash(rodar({ perfil: 'cadeira-de-madeira' }).neutro);
    expect(hash(rodar({ perfil: 'cadeira-de-madeira' }).neutro)).toBe(a);
    expect(hash(rodar({ perfil: 'cadeira-de-madeira', alturaDoAssento: 480 }).neutro)).not.toBe(a);
  });
});

describe('a geometria em milímetro', () => {
  it('as pernas da frente do perfil branco de madeira encostam no assento (ajuste da pessoa)', () => {
    const completos = { ...pontos('padrao'), ...CONTRATO_DA_CADEIRA.perfis['cadeira-branca-de-madeira'].parametros };
    const g = geometriaDaCadeira(completos);
    const perna = g.caixas.find((c) => c.nome === 'perna-frente-esq');
    const assento = g.caixas.find((c) => c.nome === 'assento');
    expect(perna.centro[1] + perna.alt).toBeGreaterThanOrEqual(assento.centro[1]);
    expect(perna.centro[1] + perna.alt).toBeLessThanOrEqual(assento.centro[1] + assento.alt);
  });

  it('a estrutura depende só da combinação e o id sai dela', () => {
    const completos = { ...pontos('padrao') };
    expect(idDaCadeira(combinacaoDaCadeira(completos))).toBe('cadeira.po1-sa2-tr0-al1-ba1-t1-r5');
    const a = geometriaDaCadeira(completos).caixas.map((c) => c.nome);
    const b = geometriaDaCadeira({ ...completos, larguraDoAssento: 600, alturaDosPostes: 1000 }).caixas.map((c) => c.nome);
    expect(b).toEqual(a);
  });
});

describe('as recusas dizem a restrição e não geram malha', () => {
  it('parâmetro fora da faixa', () => {
    expect(recusa({ numeroDeRipas: 6 })).toBeInstanceOf(ErroChamadaDeFamilia);
    expect(recusa({ alturaDoAssento: 600 })).toBeInstanceOf(ErroChamadaDeFamilia);
  });

  it('ripas largas demais para o vão', () => {
    expect(recusa({ larguraDoConjuntoDasRipas: 560, larguraDoAssento: 500 }).restricao).toBe('ripas-cabem-no-vao');
  });

  it('vão entre ripas que deixa a ripa fina demais', () => {
    expect(recusa({ vaoEntreRipas: 100 }).restricao).toBe('ripas-tem-largura');
  });

  it('poste que não sobe acima do assento, e a travessa baixa abaixo do assento', () => {
    expect(recusa({ alturaDosPostes: 600 }).restricao).toBe('postes-altos-ou-nenhum');
    expect(recusa({ alturaDoAssento: 500 }).restricao).toBe('travessa-baixa-acima-do-assento');
  });

  it('travessas mais largas que o assento', () => {
    expect(recusa({ larguraDoAssento: 440, larguraDasTravessas: 500 }).restricao).toBe('travessas-cabem-no-assento');
  });
});

describe('uma medida por perfil contra o esboço alvo', () => {
  it.each(PERFIS)('%s: caixa envolvente em até 3,5% por eixo e volume em até 3%', (perfil) => {
    const m = compararPerfil(perfil);
    /* a rústica tem 3,2% na profundidade: os pregos do encosto saem 8 mm do alvo e a família não os desenha */
    for (const e of m.eixos) expect(Math.abs(e.pct)).toBeLessThanOrEqual(3.5);
    expect(Math.abs(m.volume.pct)).toBeLessThanOrEqual(3);
  });
});
