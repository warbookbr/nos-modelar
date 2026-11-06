/* formas.test.ts — bateria do plano da abertura em qualquer direção (`docs/modelar/planos/encerrados/2026-11-06-abertura-em-qualquer-direcao.md`):
   o contorno côncavo (em L e em estrela de cinco pontas) e o de bico muito agudo, em `contornos-de-forma.js`, e o contorno que cruza um
   vinco vivo e o que passa perto da borda da chapa, em `vinco-e-borda.js`. Cada caso mede o gate de malha (nenhuma aresta sem par,
   vínculo não manifold, triângulo sem área nem lasca) e a borda do vão contra o desenho a menos de 0,5 mm, ou recusa com a medida. */
import { describe, expect, it } from 'vitest';
import { EM_L, ESTRELA, bico, passosDe } from './contornos-de-forma.js';
import { CRUZANDO, passosCruzando, passosPertoDaBorda, pertoDaBorda } from './vinco-e-borda.js';
import { desvioDoVao, exigirFechada, gate1, piorDesvio, recusaDe, rodar } from './medidas';

const tabela: Record<string, unknown> = {};

function conferir(rotulo: string, TOPO: any, PASSOS: any, contorno: any) {
  const neutro = rodar(TOPO, PASSOS, 'formas');
  expect(neutro.orfaos, rotulo).toEqual([]);
  exigirFechada(gate1(neutro), rotulo);
  const d = desvioDoVao(neutro, 0, 'y', contorno);
  expect(piorDesvio(d), rotulo).toBeLessThan(0.5);
  tabela[rotulo] = { faces: neutro.F.size, ms: neutro.ms, desvioMm: Number(piorDesvio(d).toFixed(4)), limpeza: neutro.aberturas[0].limpeza };
  return neutro;
}

describe('o contorno côncavo', () => {
  it('em L (braços de 40 mm): fechado, sem lasca, com a borda a menos de 0,5 mm do desenho', () => {
    const { TOPO, PASSOS } = passosDe(EM_L);
    conferir('L', TOPO, PASSOS, EM_L);
  });
  for (const rDentro of [45, 20]) {
    it(`em estrela de cinco pontas (raio de dentro ${rDentro} mm, de fora 120): fechado, sem lasca, com a borda no desenho`, () => {
      const c = ESTRELA(rDentro);
      const { TOPO, PASSOS } = passosDe(c);
      conferir(`estrela ${rDentro}`, TOPO, PASSOS, c);
    });
  }
});

describe('o contorno de bico muito agudo', () => {
  for (const alfa of [30, 8, 4]) {
    it(`com a ponta de ${alfa} graus: fechado, sem lasca, com a ponta no desenho a menos de 0,5 mm`, () => {
      const c = bico(alfa);
      const { TOPO, PASSOS } = passosDe(c);
      const neutro = conferir(`bico ${alfa}`, TOPO, PASSOS, c);
      const ponta = [0.3, 0.42];
      const fora = neutro.aberturas[0].borda.fora.map((v: number) => neutro.V.get(v));
      const dist = Math.min(...fora.map((p: number[]) => Math.hypot(p[0] - ponta[0], p[2] - ponta[1]))) * 1000;
      expect(dist).toBeLessThan(0.5);
    });
  }

  it('com a ponta de 2 graus a lente recuada 5 mm não cabe, e a operação recusa e diz como deixá-la do tamanho do vão', () => {
    const { TOPO, PASSOS } = passosDe(bico(2));
    const recusa = recusaDe(rodar(TOPO, PASSOS, 'formas'));
    expect(recusa).toMatch(/aberturaPorContorno\.recuoDaLente: a lente não cabe no vão: o recuo de 5 mm fecha o vão inteiro; reduza recuoDaLente/);
  });

  it('com a ponta de 2 graus e o recuo da lente reduzido a 1 mm, sai fechado', () => {
    const c = bico(2);
    const { TOPO, PASSOS } = passosDe(c, { recuoDaLente: 0.001 });
    conferir('bico 2 com recuo 1 mm', TOPO, PASSOS, c);
  });
});

describe('o contorno que cruza um vinco vivo', () => {
  it('atravessa a cumeeira de um telhado de duas águas: fechado, sem lasca, com a borda no desenho dos dois lados do vinco', () => {
    const { TOPO, PASSOS } = passosCruzando();
    const neutro = conferir('cruza a cumeeira', TOPO, PASSOS, CRUZANDO);
    /* os vértices da borda de fora sobre a cumeeira (x = 400 mm) ficam nela: o vinco não se desloca */
    const naCumeeira = neutro.aberturas[0].borda.fora.map((v: number) => neutro.V.get(v)).filter((p: number[]) => Math.abs(p[0] - 0.4) < 1e-6);
    expect(naCumeeira.length).toBeGreaterThanOrEqual(2);
  });
});

describe('o contorno perto da borda da chapa', () => {
  for (const d of [40, 5, 1]) {
    it(`a ${d} mm da borda: fechado, sem lasca, com a borda no desenho`, () => {
      const { TOPO, PASSOS } = passosPertoDaBorda(d);
      conferir(`borda ${d}`, TOPO, PASSOS, pertoDaBorda(d));
    });
  }

  it('a 0,5 mm da borda a tira de chapa que sobra é ela mesma a lasca: a malha fecha, e o gate de malha a acusa', () => {
    const { TOPO, PASSOS } = passosPertoDaBorda(0.5);
    const neutro = rodar(TOPO, PASSOS, 'formas');
    expect(neutro.orfaos).toEqual([]);
    const g = gate1(neutro);
    expect(g.arestasSemPar + g.vinculosNaoManifold + g.triangulosSemArea).toBe(0);
    expect(g.faceFina).toBeGreaterThan(0);
    tabela['borda 0,5'] = { faceFina: g.faceFina };
  });

  it('encostado na borda ou para fora dela, recusa e diz que o vão precisa caber inteiro dentro da chapa', () => {
    for (const d of [0, -5]) {
      const { TOPO, PASSOS } = passosPertoDaBorda(d);
      expect(recusaDe(rodar(TOPO, PASSOS, 'formas')), `d = ${d}`).toMatch(/aberturaPorContorno\.contorno: .*(fora da chapa vista do eixo y|cruza a borda da chapa vista do eixo y).*caber inteiro dentro dela/);
    }
  });

  it('imprime as medidas do banco de provas', () => {
    console.log(JSON.stringify({ formas: tabela }));
  });
});
