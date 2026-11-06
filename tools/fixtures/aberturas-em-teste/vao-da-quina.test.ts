/* vao-da-quina.test.ts — fatia 1 do plano da abertura em qualquer direção (`docs/modelar/planos/encerrados/2026-11-06-abertura-em-qualquer-direcao.md`):
   o vão que dobra a quina de uma caixa oca de quinas redondas, visto da diagonal [1, 0, 1], sai num vão só, com a malha fechada
   (nenhuma aresta sem par, vínculo não manifold, triângulo sem área nem lasca) e a borda a menos de 0,5 mm do desenho nas duas
   faces da pele, alcançando a face +z e a face +x. A caixa sem vão também sai sem lasca: o limite do `gaiolaPorLacos` que a
   bateria achou (a escada fechando a última face sobre a reta do trecho `ate`) fica no teste dele, em `gaiola-por-lacos.test.ts`. */
import { describe, expect, it } from 'vitest';
import { passosDaCaixa, RETANGULO_DA_QUINA } from './caixa-de-quinas.js';
import { passosNaQuina } from './dois-vaos.js';
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

describe('dois vãos vizinhos na quina, um em cada face (o caso do furgão)', () => {
  /* o primeiro, da face +z (vista z, x de 0 a 300 mm), e o segundo, da face +x (vista x, z de 0 até `u`), compartilham os y de 250 a 450.
     A borda do primeiro, vista do eixo x, cai num z que a malha do arco decide; o teste mede esse z numa rodada do primeiro e põe a
     borda do segundo a `delta` mm antes dele. A folga que importa é a vista do eixo do segundo: o contorno só não pode tocar o furo. */
  const primeiro = (() => { const { TOPO, PASSOS } = passosNaQuina({ xDoPrimeiro: 300 }); return rodar(TOPO, PASSOS, 'dois-vaos-na-quina'); })();
  const zDoPrimeiro = Math.min(...[...primeiro.aberturas[0].borda.fora, ...primeiro.aberturas[0].borda.dentro].map((v: number) => primeiro.V.get(v)).filter((p: number[]) => Math.abs(p[0] - 0.3) < 1e-5).map((p: number[]) => p[2])) * 1000;
  const vizinho = (delta: number) => { const { TOPO, PASSOS } = passosNaQuina({ xDoPrimeiro: 300, uDoSegundo: zDoPrimeiro - delta }); return rodar(TOPO, PASSOS, 'dois-vaos-na-quina'); };

  it('a 5 mm do furo do primeiro, visto do eixo do segundo, sai fechada e sem lasca', () => {
    const neutro = vizinho(5);
    expect(neutro.orfaos).toEqual([]);
    expect(neutro.aberturas).toHaveLength(2);
    exigirFechada(gate1(neutro));
    console.log(JSON.stringify({ quinaVizinhos: { zDaBordaDoPrimeiroMm: Number(zDoPrimeiro.toFixed(3)), faces: neutro.F.size, ms: neutro.ms } }));
  });

  it('com o contorno do segundo dentro do furo do primeiro, recusa e diz que a borda de um vão aberto antes conta', () => {
    const recusa = recusaDe(vizinho(-1));
    expect(recusa).toMatch(/aberturaPorContorno\.contorno: .*cruza a borda da chapa vista do eixo x.*a borda de um vão aberto antes conta/);
  });
});
