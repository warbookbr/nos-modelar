/* dois-vaos.test.ts — bateria do plano da abertura em qualquer direção (`docs/modelar/planos/2026-11-06-abertura-em-qualquer-direcao.md`):
   dois vãos vizinhos na mesma chapa e o vão dentro da lente de outro, em `dois-vaos.js`. A menor folga que a operação aceita é
   a partir de 0,3 mm: o segundo contorno só precisa ficar fora do furo do primeiro, visto do mesmo eixo. Abaixo disso a limpeza da
   costura do segundo funde vértices da borda do primeiro (que o friso nela lê) e a tira de chapa entre os dois sai lasca, e a operação
   recusa com a medida; com folga zero, ou com o contorno dentro do primeiro vão, ela recusa e diz que a borda de um vão aberto antes conta. */
import { describe, expect, it } from 'vitest';
import { FURO, PRIMEIRO, passosDeDoisVaos, segundo } from './dois-vaos.js';
import { desvioDoVao, exigirFechada, gate1, piorDesvio, recusaDe, rodar } from './medidas';

const medidas: Record<string, unknown> = {};
const roda = (opcoes: any) => { const { TOPO, PASSOS } = passosDeDoisVaos(opcoes); return rodar(TOPO, PASSOS, 'dois-vaos'); };

describe('dois vãos vizinhos na cúpula, vistos do mesmo eixo', () => {
  for (const folga of [20, 1, 0.3]) {
    it(`a ${folga} mm um do outro: sai fechada, sem lasca, com as duas bordas a menos de 0,5 mm do desenho`, () => {
      const neutro = roda({ folga });
      expect(neutro.orfaos).toEqual([]);
      expect(neutro.aberturas).toHaveLength(2);
      exigirFechada(gate1(neutro), `folga ${folga} mm`);
      const d = [desvioDoVao(neutro, 0, 'y', PRIMEIRO), desvioDoVao(neutro, 1, 'y', segundo(folga))];
      expect(Math.max(...d.map(piorDesvio))).toBeLessThan(0.5);
      medidas[`folga ${folga}`] = { faces: neutro.F.size, ms: neutro.ms, desvioMm: Number(Math.max(...d.map(piorDesvio)).toFixed(4)) };
    });
  }

  it('abaixo de 0,3 mm a limpeza funde vértices da borda do primeiro vão, e a operação recusa e diz a folga que mediu', () => {
    for (const folga of [0.2, 0.05]) {
      const recusa = recusaDe(roda({ folga }));
      expect(recusa, `folga ${folga}`).toMatch(/aberturaPorContorno\.contorno: a costura deste vão chega tão perto da borda do vão do passo 1 que a limpeza fundiu \d+ vértices dela.*0,3 mm no mínimo.*afaste o contorno/);
    }
  });

  it('com folga zero, ou com o contorno dentro do primeiro vão, recusa e diz que a borda de um vão aberto antes conta', () => {
    for (const folga of [0, -1]) {
      const recusa = recusaDe(roda({ folga }));
      expect(recusa).toMatch(/aberturaPorContorno\.contorno: .*(cruza a borda da chapa vista do eixo y|fora da chapa vista do eixo y)/);
    }
    const cruza = recusaDe(roda({ folga: 0 }));
    expect(cruza).toMatch(/a borda de um vão aberto antes conta.*folga entre os contornos/);
  });
});

describe('o vão dentro da lente de outro', () => {
  const neutro = roda({ folga: 20, comFuro: true });

  it('corta a lente do primeiro como uma chapa de duas peles, e a lente furada sai fechada e sem lasca', () => {
    expect(neutro.orfaos).toEqual([]);
    exigirFechada(gate1(neutro));
    const lenteDoPrimeiro = new Set(neutro.aberturas[0].lente);
    const furada = new Set(neutro.aberturas[2].parede);
    for (const f of furada) expect(neutro.F.has(f)).toBe(true);
    /* o pedaço retirado da lente é do terceiro passo, e a lente dele não existe (lente: false) */
    expect(neutro.aberturas[2].lente).toEqual([]);
    expect(lenteDoPrimeiro.size).toBeGreaterThan(0);
    medidas['furo na lente'] = { faces: neutro.F.size, ms: neutro.ms };
  });

  it('o furo fica a menos de 0,5 mm do desenho, de fora e de dentro', () => {
    const d = desvioDoVao(neutro, 2, 'y', FURO);
    expect(piorDesvio(d)).toBeLessThan(0.5);
  });

  it('imprime as medidas do banco de provas', () => {
    console.log(JSON.stringify({ doisVaos: medidas }));
  });
});
