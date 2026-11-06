/* vao-da-quina.test.ts — fatia 1 do plano da abertura em qualquer direção (`docs/modelar/planos/2026-11-06-abertura-em-qualquer-direcao.md`):
   o vão que dobra a quina de uma caixa oca de quinas redondas, visto da diagonal [1, 0, 1], sai num vão só, com a malha fechada
   (nenhuma aresta sem par, vínculo não manifold, triângulo sem área nem lasca) e a borda a menos de 0,5 mm do desenho nas duas
   faces da pele, alcançando a face +z e a face +x. A caixa sem vão também sai sem lasca: o limite do `gaiolaPorLacos` que a
   bateria achou (a escada fechando a última face sobre a reta do trecho `ate`) fica no teste dele, em `gaiola-por-lacos.test.ts`. */
import { describe, expect, it } from 'vitest';
import { passosDaCaixa, RETANGULO_DA_QUINA } from './caixa-de-quinas.js';
import { desvioDoVao, exigirFechada, gate1, piorDesvio, recusaDe, rodar } from './medidas';

const ABERTURA = { vista: [1, 0, 1], sentido: '+', contorno: RETANGULO_DA_QUINA, segmentosArco: 8 };

describe('a caixa de quinas redondas', () => {
  it('sai fechada e sem lasca, sem vão, com a tampa de baixo a 2 mm da pele', () => {
    const { TOPO, PASSOS } = passosDaCaixa();
    const neutro = rodar(TOPO, PASSOS, 'caixa-de-quinas');
    expect(neutro.orfaos).toEqual([]);
    exigirFechada(gate1(neutro));
  });
});

describe('o vão que dobra a quina pela vista [1, 0, 1]', () => {
  const { TOPO, PASSOS } = passosDaCaixa(ABERTURA);
  const neutro = rodar(TOPO, PASSOS, 'caixa-de-quinas');

  it('sai num vão só, fechado, sem triângulo sem área nem lasca', () => {
    expect(neutro.orfaos).toEqual([]);
    expect(neutro.aberturas).toHaveLength(1);
    exigirFechada(gate1(neutro));
    console.log(JSON.stringify({ quina: { faces: neutro.F.size, ms: neutro.ms, limpeza: neutro.aberturas[0].limpeza, espessura: neutro.aberturas[0].espessura } }));
  });

  it('tem a borda a menos de 0,5 mm do desenho, de fora e de dentro, nos dois sentidos', () => {
    const d = desvioDoVao(neutro, 0, ABERTURA.vista, RETANGULO_DA_QUINA);
    console.log(JSON.stringify({ quinaDesvio: d, pior: piorDesvio(d) }));
    expect(piorDesvio(d)).toBeLessThan(0.5);
  });

  it('alcança a face +z e a face +x, na pele de fora e na de dentro', () => {
    const { fora, dentro } = neutro.aberturas[0].borda;
    const pos = (v: number) => neutro.V.get(v).map((c: number) => c * 1000);
    /* a face +z é a reta z ~ 400 com |x| < 280, e a +x a reta x ~ 400 com |z| < 280 (a pele de dentro fica 2 mm abaixo) */
    const naMaisZ = (volta: number[]) => volta.filter((v) => { const [x, , z] = pos(v); return z > 388 && Math.abs(x) < 280; }).length;
    const naMaisX = (volta: number[]) => volta.filter((v) => { const [x, , z] = pos(v); return x > 388 && Math.abs(z) < 280; }).length;
    for (const volta of [fora, dentro]) {
      expect(naMaisZ(volta)).toBeGreaterThanOrEqual(2);
      expect(naMaisX(volta)).toBeGreaterThanOrEqual(2);
    }
  });

  it('a lente é um sólido fechado só, sem lasca', () => {
    const lente = new Set(neutro.aberturas[0].lente);
    expect(lente.size).toBeGreaterThan(0);
    exigirFechada(gate1(neutro, (f: any) => lente.has(f.id)));
  });

  it('sem sentido, a reta atravessa a frente e a traseira, e a operação diz que sentido corta uma camada só', () => {
    const { TOPO: T, PASSOS: P } = passosDaCaixa({ ...ABERTURA, sentido: undefined });
    const recusa = recusaDe(rodar(T, P, 'caixa-de-quinas'));
    expect(recusa).toMatch(/atravessa a chapa 2 vezes.*declare sentido/);
  });
});
