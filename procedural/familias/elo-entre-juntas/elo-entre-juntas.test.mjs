/* elo-entre-juntas.test.mjs — a família `elo-entre-juntas`: cada seção sai com a parte `elo` num pedaço só, sem órfão, a
 * mesma malha em duas chamadas, a parede pedida entre a superfície de dentro e a de fora, as duas bocas abertas e a furação
 * de cada boca no padrão da flange do atuador (a conferência da família cobra as portas); e cada recusa diz o recebido e o aceito. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { ErroChamadaDeFamilia } from '../../../src/autoria/chamar-familia.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { pedacosDaMalha } from '../../../tools/fixtures/transmissao/pedacos.mjs';
import { parametrosDoAtuador } from '../atuador-de-junta/tabela.js';
import { parametrosDoElo } from './tabela.js';

const registro = criarRegistroDeFamilias();
const F = registro.obter('elo-entre-juntas');
const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
const gerar = (parametros) => executarReceita({ meta: { nome: 'elo' }, get CHAMADAS_COMPOSICOES() { return [chamar(F, 'e', parametros)]; } }, execucao).neutro;
const A100 = parametrosDoAtuador(100);

describe('família elo-entre-juntas', () => {
  for (const [secao, nome] of [[1, 'elíptica'], [2, 'redonda'], [3, 'de cantos arredondados']]) it(`a seção ${nome} sai com a parte elo num pedaço só, sem órfão`, () => {
    const n = gerar({ secao });
    expect((n.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    expect([...new Set([...n.F.values()].map((f) => f.parte))]).toEqual(['elo']);
    expect(pedacosDaMalha(n)).toBe(1);
  });

  it('a mesma chamada dá a mesma malha', () => {
    const hash = (n) => sha256Hex(JSON.stringify(neutroCanonico(n)));
    expect(hash(gerar({ cintura: 0.7 }))).toBe(hash(gerar({ cintura: 0.7 })));
  });

  it('as bocas ficam abertas e a cintura e a barriga mudam a largura do meio', () => {
    const extensao = (n, eixo, y = null) => { const v = [...n.V.values()].filter((p) => y === null || Math.abs(p[1] - y) < 0.004).map((p) => p[eixo]); return Math.max(...v) - Math.min(...v); };
    const reto = gerar({ cintura: 1 }); const cintura = gerar({ cintura: 0.6 }); const barriga = gerar({ cintura: 1.3 });
    expect(extensao(reto, 1)).toBeCloseTo(0.23, 4);
    expect(extensao(cintura, 0, 0.115)).toBeLessThan(extensao(reto, 0, 0.115));
    expect(extensao(barriga, 0, 0.115)).toBeGreaterThan(extensao(reto, 0, 0.115));
    /* a boca é aberta: nenhum vértice fecha o círculo da boca no centro de y = 0 e y = comprimento */
    const naBoca = (n, y) => [...n.V.values()].filter((p) => Math.abs(p[1] - y) < 1e-9 && Math.hypot(p[0], p[2]) < 0.015).length;
    expect(naBoca(reto, 0)).toBe(0);
    expect(naBoca(reto, 0.23)).toBe(0);
  });

  it('o volume da casca cresce com a parede', () => {
    const volume = (n) => { let v = 0; for (const f of n.F.values()) { const [a, ...r] = f.vs.map((i) => n.V.get(i)); for (let i = 0; i + 1 < r.length; i += 1) { const b = r[i]; const c = r[i + 1]; v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6; } } return Math.abs(v); };
    expect(volume(gerar({ parede: 2 }))).toBeGreaterThan(volume(gerar({ parede: 1.5 })));
  });

  it('parametrosDoElo lê a flange de saída do atuador na boca A e a de fixação do seguinte na boca B', () => {
    const p = parametrosDoElo({ de: A100, para: parametrosDoAtuador(60), comprimento: 300 });
    expect(p).toMatchObject({ diametroDaBocaA: 62, circuloDaBocaA: 43.4, furosDaBocaA: 8, diametroDoFuroDaBocaA: 4.2, diametroDaBocaB: 76, circuloDaBocaB: 68, furosDaBocaB: 6, diametroDoFuroDaBocaB: 3.4, comprimento: 300 });
    expect(parametrosDoElo({ de: { diametro: 50, circulo: 36, furos: 6, diametroDoFuro: 3 }, para: { diametro: 50, circulo: 36, furos: 6, diametroDoFuro: 3 } }).diametroDaBocaA).toBe(50);
    expect(() => parametrosDoElo({ de: A100 })).toThrow(/faltam as duas flanges/);
  });

  describe('recusas', () => {
    const recusa = (parametros) => { try { chamar(F, 'e', parametros); } catch (e) { expect(e).toBeInstanceOf(ErroChamadaDeFamilia); return e; } throw new Error('não recusou'); };
    const BOCAS = { diametroDaBocaA: 100, circuloDaBocaA: 40, diametroDoFuroDaBocaA: 3, diametroDaBocaB: 100, circuloDaBocaB: 40, diametroDoFuroDaBocaB: 3 };

    it('a flange que não cabe na seção da boca', () => {
      const e = recusa({ circuloDaBocaA: 58 });
      expect(e.restricao).toBe('boca-a-cabe-na-secao');
      expect(e.message).toContain('recebeu {"circuloDaBocaA":58,"diametroDaBocaA":62');
      expect(e.message).toContain('aceito: circuloDaBocaA / 2 + diametroDoFuroDaBocaA / 2 + 1 + parede <= diametroDaBocaA / 2 (o lado esquerdo vale 34.1 e o direito 31)');
    });
    it('a parede que fecha a seção (maior ou igual à meia dimensão menor)', () => {
      const e = recusa({ ...BOCAS, secao: 2, larguraDaSecao: 20, profundidadeDaSecao: 20, cintura: 1.6, parede: 10.5 });
      expect(e.restricao).toBe('parede-fecha-a-secao');
      expect(e.message).toContain('aceito: 2 * parede < min(larguraDaSecao, profundidadeDaSecao) (o lado esquerdo vale 21 e o direito 20)');
    });
    it('o comprimento menor que o necessário para as bocas e a transição', () => {
      const e = recusa({ comprimento: 60 });
      expect(e.restricao).toBe('comprimento-das-bocas');
      expect(e.message).toContain('"comprimento":60');
    });
    it('a cintura que fecha a seção', () => {
      const e = recusa({ ...BOCAS, larguraDaSecao: 40, profundidadeDaSecao: 40, cintura: 0.4, parede: 8 });
      expect(e.restricao).toBe('cintura-fecha-a-secao');
      expect(e.message).toContain('o lado esquerdo vale 12 e o direito 8');
    });
    it('a parede fora da faixa e a seção que não existe', () => {
      expect(() => chamar(F, 'e', { parede: 20 })).toThrow(/parametros\.parede/);
      expect(() => chamar(F, 'e', { secao: 4 })).toThrow(/parametros\.secao/);
    });
  });
});
