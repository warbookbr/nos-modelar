/* elo-de-chapa.test.mjs — a chapa reta da família `elo-entre-juntas` (`forma` 2): a pista de espessura uniforme, de pontas arredondadas em volta de cada boca, com as
 * duas bocas voltadas para o mesmo lado (a face de apoio, y = 0) e os furos de fixação de cada boca no padrão da flange, sem órfão e num pedaço só; a mesma chamada dá a
 * mesma malha; a forma 1 (a carenagem) segue como antes, bit a bit; e cada recusa da chapa diz o recebido e o aceito. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { ErroChamadaDeFamilia } from '../../../src/autoria/chamar-familia.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { pedacosDaMalha } from '../../../tools/fixtures/transmissao/pedacos.mjs';
import { ATUADORES, parametrosDoAtuador } from '../atuador-de-junta/tabela.js';
import { parametrosDoElo } from './tabela.js';

const registro = criarRegistroDeFamilias();
const F = registro.obter('elo-entre-juntas');
const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
const gerar = (parametros) => executarReceita({ meta: { nome: 'elo' }, get CHAMADAS_COMPOSICOES() { return [chamar(F, 'e', parametros)]; } }, execucao).neutro;
const hash = (n) => sha256Hex(JSON.stringify(neutroCanonico(n)));
const A100 = parametrosDoAtuador(100);
const COXA = parametrosDoElo({ de: A100, para: A100, forma: 2, comprimento: 431 });
const volume = (n) => { let v = 0; for (const f of n.F.values()) { const [a, ...r] = f.vs.map((i) => n.V.get(i)); for (let i = 0; i + 1 < r.length; i += 1) { const b = r[i]; const c = r[i + 1]; v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6; } } return Math.abs(v); };
const caixa = (n) => { const lo = [Infinity, Infinity, Infinity]; const hi = [-Infinity, -Infinity, -Infinity]; for (const p of n.V.values()) for (let k = 0; k < 3; k += 1) { lo[k] = Math.min(lo[k], p[k] * 1000); hi[k] = Math.max(hi[k], p[k] * 1000); } return { lo, hi }; };

describe('a chapa reta do elo entre juntas', () => {
  it('a chapa da coxa sai com a parte elo num pedaço só, sem órfão, e a caixa é a da pista: largura em x, espessura em y e as duas pontas em z', () => {
    const n = gerar(COXA);
    expect((n.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    expect([...new Set([...n.F.values()].map((f) => f.parte))]).toEqual(['elo']);
    expect(pedacosDaMalha(n)).toBe(1);
    const { lo, hi } = caixa(n);
    expect(lo[0]).toBeCloseTo(-65, 6); expect(hi[0]).toBeCloseTo(65, 6);
    expect(lo[1]).toBeCloseTo(0, 6); expect(hi[1]).toBeCloseTo(6, 6);
    expect(lo[2]).toBeCloseTo(-65, 6); expect(hi[2]).toBeCloseTo(431 + 65, 6);
  });

  it('o volume é o da pista menos os dezesseis furos (oito em cada boca)', () => {
    const n = gerar(COXA);
    const pista = 130 * 431 + Math.PI * 65 * 65; const furos = 8 * Math.PI * (4.2 / 2) ** 2 + 8 * Math.PI * (5.5 / 2) ** 2;
    const area = (volume(n) * 1e9) / 6;
    expect(area).toBeGreaterThan((pista - furos) * 0.99);
    expect(area).toBeLessThan((pista - furos) * 1.001);
  });

  it('as duas portas olham para o mesmo lado (−y, no plano da face de apoio) e cada furo da porta tem o furo na malha, no raio do furo', () => {
    const n = gerar(COXA);
    for (const [id, z, furo] of [['boca-a', 0, 4.2], ['boca-b', 431, 5.5]]) {
      const porta = n.portas.get(id).interface;
      expect(porta.normal).toEqual([0, -1, 0]);
      expect(porta.centro.map((v) => v * 1000)).toEqual([0, 0, z]);
      expect(porta.centros).toHaveLength(8);
      for (const c of porta.centros) {
        const naBorda = [...n.V.values()].filter((p) => Math.abs(p[1]) < 1e-9 && Math.abs(Math.hypot(p[0] - c[0], p[2] - c[2]) * 1000 - furo / 2) < 1e-6);
        expect(naBorda.length, `${id} ${c}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('a passagem abre o furo no centro de cada boca: o volume cai e a chamada usa a composição com a passagem', () => {
    expect(chamar(F, 'e', COXA).composicao).toBe('elo-entre-juntas.chapa');
    expect(chamar(F, 'e', { ...COXA, passagemDaChapa: 1 }).composicao).toBe('elo-entre-juntas.chapa-com-passagem');
    const sem = gerar(COXA); const com = gerar({ ...COXA, passagemDaChapa: 1 });
    expect((com.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    const retirado = (volume(sem) - volume(com)) * 1e9;
    const esperado = 6 * Math.PI * ((43.4 / 2 - 4.2 / 2 - 2) ** 2 + (112 / 2 - 5.5 / 2 - 2) ** 2);
    expect(retirado).toBeGreaterThan(esperado * 0.98);
    expect(retirado).toBeLessThan(esperado * 1.001);
    expect(pedacosDaMalha(com)).toBe(1);
  });

  it('a mesma chamada dá a mesma malha, e a espessura e a largura mudam a caixa', () => {
    expect(hash(gerar(COXA))).toBe(hash(gerar(COXA)));
    const { lo, hi } = caixa(gerar({ ...COXA, espessuraDaChapa: 8, larguraDaChapa: 140 }));
    expect(hi[1]).toBeCloseTo(8, 6); expect(hi[0] - lo[0]).toBeCloseTo(140, 6);
  });

  it('a forma 1 (o padrão) segue a carenagem de antes, bit a bit: os campos da chapa não a mudam', () => {
    expect(hash(gerar({}))).toBe('f339de7fbab8a137807194a75aeb50c0e7ddd0471110514e4dd025e76ee01409');
    expect(hash(gerar({ forma: 1, espessuraDaChapa: 12, larguraDaChapa: 200, passagemDaChapa: 1 }))).toBe(hash(gerar({})));
    expect(chamar(F, 'e', {}).composicao).toBe('elo-entre-juntas.reto');
  });

  it('a chapa ignora os campos da carenagem e as regras deles: a parede que fecharia a seção não a recusa, e a carenagem de mesmos valores é recusada', () => {
    const solta = { larguraDaSecao: 16, profundidadeDaSecao: 16, parede: 12, cintura: 0.4, desvio: 60, comprimento: 100 };
    expect(() => chamar(F, 'e', { ...COXA, ...solta, larguraDaChapa: 100, circuloDaBocaB: 80, diametroDaBocaB: 90 })).not.toThrow();
    expect(() => chamar(F, 'e', { ...solta, forma: 1 })).toThrow(ErroChamadaDeFamilia);
    expect(hash(gerar({ ...COXA, larguraDaSecao: 40, parede: 3 }))).toBe(hash(gerar(COXA)));
  });

  it('a chapa entre qualquer par de atuadores da tabela cabe, desde que a largura cubra o padrão de furos', () => {
    for (const a of Object.keys(ATUADORES)) for (const b of Object.keys(ATUADORES)) {
      const larguraDaChapa = Math.ceil(Math.max(...[parametrosDoAtuador(Number(a)).circuloDaSaida + 3 * parametrosDoAtuador(Number(a)).diametroDoFuroDaSaida, parametrosDoAtuador(Number(b)).circuloDoFlange + 3 * parametrosDoAtuador(Number(b)).diametroDoFuroDoFlange]));
      expect(() => chamar(F, 'e', parametrosDoElo({ de: parametrosDoAtuador(Number(a)), para: parametrosDoAtuador(Number(b)), forma: 2, comprimento: 300, larguraDaChapa, espessuraDaChapa: 8 })), `${a} ${b}`).not.toThrow();
    }
  });

  describe('recusas', () => {
    const recusa = (parametros) => { try { chamar(F, 'e', parametros); } catch (e) { expect(e).toBeInstanceOf(ErroChamadaDeFamilia); return e; } throw new Error('não recusou'); };

    it('a espessura que não aguenta os furos (menor que o diâmetro do maior furo)', () => {
      const e = recusa({ ...COXA, espessuraDaChapa: 5 });
      expect(e.restricao).toBe('chapa-espessura-aguenta-os-furos');
      expect(e.message).toContain('"espessuraDaChapa":5');
      expect(e.message).toContain('aceito: max(0, forma - 1) * (max(diametroDoFuroDaBocaA, diametroDoFuroDaBocaB) - espessuraDaChapa) <= 0 (o lado esquerdo vale 0.5 e o direito 0)');
      expect(() => chamar(F, 'e', { ...COXA, espessuraDaChapa: 5.5 })).not.toThrow();
    });
    it('a largura menor que o padrão de furos mais a margem', () => {
      const e = recusa({ ...COXA, larguraDaChapa: 128 });
      expect(e.restricao).toBe('chapa-cobre-os-furos');
      expect(e.message).toContain('"larguraDaChapa":128');
      expect(e.message).toContain('o lado esquerdo vale 0.5 e o direito 0');
      expect(() => chamar(F, 'e', { ...COXA, larguraDaChapa: 128.5 })).not.toThrow();
    });
    it('o comprimento menor que a soma dos raios das pontas', () => {
      const e = recusa({ ...COXA, comprimento: 129 });
      expect(e.restricao).toBe('chapa-comprimento-das-pontas');
      expect(e.message).toContain('"comprimento":129');
      expect(e.message).toContain('o lado esquerdo vale 1 e o direito 0');
      expect(() => chamar(F, 'e', { ...COXA, comprimento: 130 })).not.toThrow();
    });
    it('as flanges que se sobrepõem na face da chapa', () => {
      const e = recusa({ ...COXA, diametroDaBocaA: 200, comprimento: 150 });
      expect(e.restricao).toBe('chapa-flanges-nao-se-tocam');
    });
    it('a passagem que não cabe no círculo dos furos', () => {
      const e = recusa({ ...COXA, passagemDaChapa: 1, circuloDaBocaA: 14, diametroDoFuroDaBocaA: 3 });
      expect(e.restricao).toBe('chapa-passagem-cabe');
      expect(() => chamar(F, 'e', { ...COXA, passagemDaChapa: 0, circuloDaBocaA: 14, diametroDoFuroDaBocaA: 3 })).not.toThrow();
    });
    it('a forma que não existe e a espessura fora da faixa', () => {
      expect(() => chamar(F, 'e', { forma: 3 })).toThrow(/parametros\.forma/);
      expect(() => chamar(F, 'e', { ...COXA, espessuraDaChapa: 21 })).toThrow(/parametros\.espessuraDaChapa/);
      expect(() => chamar(F, 'e', { ...COXA, passagemDaChapa: 2 })).toThrow(/parametros\.passagemDaChapa/);
    });
  });
});
