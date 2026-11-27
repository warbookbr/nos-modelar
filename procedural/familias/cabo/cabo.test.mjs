/* cabo.test.mjs — a família `cabo`: cada caso de prova sai como um sólido fechado num pedaço só, com o comprimento pedido a menos de 0,5%, o raio de
 * curva nunca abaixo do mínimo e as faces que o plano contou; a mesma chamada dá os mesmos bytes; as portas das pontas estão na forma; e cada recusa
 * diz o recebido e o aceito. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { ErroChamadaDeFamilia } from '../../../src/autoria/chamar-familia.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { conferirPortasNaForma } from '../../../src/autoria/porta-confere-forma.js';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { pedacosDaMalha } from '../../../tools/fixtures/transmissao/pedacos.mjs';
import { CASOS_DO_CABO } from '../../../tools/fixtures/cabo/casos.mjs';
import { medidasDoCabo } from './index.js';
import { esquecerPlanos } from './plano.js';
import { quadroSemTorcao } from './caminho.js';

const registro = criarRegistroDeFamilias();
const F = registro.obter('cabo');
const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
const gerar = (parametros) => executarReceita({ meta: { nome: 'cabo' }, get CHAMADAS_COMPOSICOES() { return [chamar(F, 'c', parametros)]; } }, execucao).neutro;
const hash = (n) => sha256Hex(JSON.stringify(neutroCanonico(n)));

describe('família cabo', () => {
  for (const [nome, caso] of Object.entries(CASOS_DO_CABO)) {
    it(`${nome}: sólido fechado num pedaço, comprimento a menos de 0,5% e raio acima do mínimo`, () => {
      const n = gerar(caso.parametros);
      const m = medidasDoCabo(caso.parametros);
      expect((n.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
      expect([...new Set([...n.F.values()].map((f) => f.parte))]).toEqual(['cabo']);
      expect(pedacosDaMalha(n)).toBe(1);
      expect(n.F.size).toBe(m.faces);
      expect(Math.abs(m.comprimentoDeCorte / caso.parametros.comprimento - 1)).toBeLessThan(0.005);
      expect(Math.abs(m.comprimentoDaMalha / caso.parametros.comprimento - 1)).toBeLessThan(0.005);
      expect(m.raioMinimo).toBeGreaterThanOrEqual(5 * (caso.parametros.diametro ?? 6));
      expect(m.desvioDaCorda).toBeLessThanOrEqual(0.2 + 1e-9);
      /* a porta cita as duas tampas (o friso não endereça uma só); com as duas no mesmo plano (as pontas paralelas à mesma altura) a conferência de porta mede a tampa
         da outra ponta e acusa o raio; a família escapa disso nos perfis pondo as pontas em alturas diferentes */
      const coplanares = ['laco', 'u'].includes(nome);
      expect(conferirPortasNaForma(n).map((a) => a.codigo)).toEqual(coplanares ? ['porta-com-raio-errado', 'porta-com-raio-errado'] : []);
    });
  }

  it('a mesma chamada dá os mesmos bytes, mesmo refazendo a conta', () => {
    const a = hash(gerar(CASOS_DO_CABO.u.parametros));
    esquecerPlanos();
    expect(hash(gerar(CASOS_DO_CABO.u.parametros))).toBe(a);
  });

  it('o cabo quase esticado dobra como a elástica de Euler: o raio de uma viga biengastada flambada', () => {
    /* a flecha a = sqrt(4 ℓ ΔL) / π e a curvatura (a / 2) (2π / ℓ)², ℓ = 200 e ΔL = 1: raio de 225 mm; as pontas retas de 10 mm e a malha de 21 nós o encurtam uns 6% */
    const r = medidasDoCabo(CASOS_DO_CABO.esticado.parametros).raioMinimo;
    expect(r).toBeGreaterThan(225 * 0.88);
    expect(r).toBeLessThan(225 * 1.02);
  });

  it('o caimento baixa o ponto mais fundo do cabo', () => {
    const fundo = (p) => Math.min(...[...gerar(p).V.values()].map((v) => v[1]));
    const base = { ...CASOS_DO_CABO.caimento.parametros };
    expect(fundo(base)).toBeLessThan(fundo({ ...base, caimento: 0 }) - 0.0001);
  });

  it('as faces seguem os lados e as estações: lados × trechos + 2 × (lados − 2)', () => {
    for (const lados of [8, 16, 32]) {
      const m = medidasDoCabo({ ...CASOS_DO_CABO.frente.parametros, lados });
      expect(m.faces).toBe(lados * m.trechos + 2 * (lados - 2));
      expect(gerar({ ...CASOS_DO_CABO.frente.parametros, lados }).F.size).toBe(m.faces);
    }
  });

  it('as portas das pontas ficam nas pontas, com a direção de saída', () => {
    const n = gerar(CASOS_DO_CABO.tridimensional.parametros);
    const a = n.portas.get('ponta-a').interface; const b = n.portas.get('ponta-b').interface;
    expect(a.centro.map((x) => x * 1000)).toEqual([0, 0, 0].map((x) => expect.closeTo(x, 6)));
    expect(b.centro.map((x) => x * 1000)).toEqual([150, 40, 80].map((x) => expect.closeTo(x, 6)));
    expect(a.raio).toBeCloseTo(0.002, 9);
    expect(a.eixo[0]).toBeCloseTo(Math.SQRT1_2, 3);
  });

  it('o quadro não gira: numa curva plana a normal fica no plano da curva ou perpendicular a ele', () => {
    const tangentes = Array.from({ length: 30 }, (_, k) => { const t = (k / 29) * Math.PI; return [Math.cos(t), Math.sin(t), 0]; });
    for (const N of quadroSemTorcao(tangentes)) expect(Math.abs(N[2]) > 0.999999 || Math.abs(N[2]) < 1e-9).toBe(true);
  });

  describe('recusas', () => {
    const recusa = (parametros) => { try { chamar(F, 'c', parametros); } catch (e) { expect(e).toBeInstanceOf(ErroChamadaDeFamilia); return e; } throw new Error('não recusou'); };
    it('comprimento menor que a distância reta', () => {
      const e = recusa({ dx: 200, comprimento: 150 });
      expect(e.restricao).toBe('comprimento-passa-da-reta');
      expect(e.message).toMatch(/recebeu/);
    });
    it('raio mínimo impossível diz o que a curva dobra e o que se pediu', () => {
      const e = recusa({ ...CASOS_DO_CABO.frente.parametros, raioMinimo: 7 });
      expect(e.restricao).toBe('raio-minimo-cabe');
      expect(e.message).toMatch(/ao menos 28 mm/);
      expect(e.message).toMatch(/dobra até 21\.\d+ mm/);
      expect(e.valor).toBeCloseTo(medidasDoCabo(CASOS_DO_CABO.frente.parametros).raioLiso, 2);
    });
    it('orçamento de faces estourado diz quantas faces daria', () => {
      const e = recusa({ orcamentoDeFaces: 100 });
      expect(e.restricao).toBe('orcamento-de-faces');
      expect(e.message).toMatch(/daria \d+ faces/);
    });
    it('diâmetro inválido', () => {
      expect(recusa({ diametro: 0 }).message).toMatch(/parametros\.diametro/);
      expect(recusa({ diametro: -3 }).message).toMatch(/parametros\.diametro/);
    });
    it('pontas coincidentes', () => {
      expect(recusa({ dx: 0, dy: 0, dz: 0 }).restricao).toBe('pontas-distintas');
      expect(recusa({ dx: 2, dy: 0, dz: 0 }).restricao).toBe('pontas-distintas');
    });
    it('lados que não são múltiplos de 4 e direção nula', () => {
      expect(recusa({ lados: 10 }).restricao).toBe('lados-em-quartos');
      expect(recusa({ adx: 0, ady: 0, adz: 0 }).restricao).toBe('direcao-da-ponta-a');
    });
    it('comprimento que a curva não alcança com essas direções', () => {
      const e = recusa({ adx: 0, ady: 1, adz: 0, dx: 200, comprimento: 205 });
      expect(e.restricao).toBe('comprimento-chega');
      expect(e.message).toMatch(/a partir de cerca de/);
    });
  });
});

describe('o raio na curva lisa', () => {
  const tresPontos = (em, comprimento, passo) => {
    const n = (a) => Math.hypot(...a); const sub = (a, b) => a.map((x, k) => x - b[k]);
    let menor = Infinity;
    for (let t = passo; t < comprimento - passo; t += passo / 4) {
      const a = em(t - passo).p; const b = em(t).p; const c = em(t + passo).p;
      const x = sub(b, a); const y = sub(c, a);
      const area2 = n([x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]]);
      if (area2 > 1e-12) menor = Math.min(menor, (n(x) * n(sub(c, b)) * n(y)) / (2 * area2));
    }
    return menor;
  };
  it('a medida da curva lisa concorda com três pontos densos nela (controle: o caso que dobra mais que a haste e o que quase não dobra)', async () => {
    const { criarCaminho } = await import('./caminho.js');
    const { resolverElastica, nosDaHaste } = await import('./curva.js');
    for (const nome of ['frente', 'esticado']) {
      const c = CASOS_DO_CABO[nome].parametros;
      const A = [0, 0, 0]; const B = [c.dx, 0, 0]; const L = c.comprimento;
      const r = resolverElastica({ A, B, dA: [1, 0, 0], dB: [-1, 0, 0], L, nos: nosDaHaste(L, c.diametro) });
      const cam = criarCaminho({ nos: r.nos, dA: [1, 0, 0], dB: [-1, 0, 0] });
      const independente = tresPontos(cam.em, cam.comprimento, 0.25);
      expect(Math.abs(independente / cam.raioLiso - 1)).toBeLessThan(0.08);
    }
  });
  it('cada caso da fatia 1 e a junta: a curva lisa fica perto da haste e nunca abaixo do raio mínimo pedido', () => {
    esquecerPlanos();
    for (const [nome, caso] of Object.entries(CASOS_DO_CABO)) {
      const m = medidasDoCabo(caso.parametros);
      const pedido = 5 * (caso.parametros.diametro ?? 6);
      expect(m.raioLiso, nome).toBeGreaterThanOrEqual(pedido);
      expect(m.raioLiso / m.raioMinimo, nome).toBeGreaterThan(0.9);
    }
  });
  it('controle: a medida acusa o defeito antigo (haste com os trechos das pontas fixos e retos, que a Hermite cúbica dobrava na emenda) e aprova a haste engastada', async () => {
    const { criarCaminho } = await import('./caminho.js');
    const { resolverElastica } = await import('./curva.js');
    const a = 4; const M = 25; const L = 170 - 2 * a;
    const r = resolverElastica({ A: [a, 0, 0], B: [120 - a, 0, 0], dA: [1, 0, 0], dB: [-1, 0, 0], L, nos: M });
    const bom = criarCaminho({ nos: r.nos, dA: [1, 0, 0], dB: [-1, 0, 0], trechoA: a, trechoB: a });
    const nos = r.nos.map((p) => [...p]); nos[1] = [a + r.h, 0, 0]; nos[M - 2] = [120 - a - r.h, 0, 0];
    const ruim = criarCaminho({ nos, dA: [1, 0, 0], dB: [-1, 0, 0], trechoA: a, trechoB: a });
    expect(bom.raioLiso / bom.raioMinimo).toBeGreaterThan(0.9);
    expect(ruim.raioLiso / ruim.raioMinimo).toBeLessThan(0.6);
  });
});
