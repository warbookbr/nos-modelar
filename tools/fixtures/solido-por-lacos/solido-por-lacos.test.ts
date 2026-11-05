/* solido-por-lacos.test.ts — a linha de base da fatia 1 do plano do sólido por laços, sobre a peça de teste
   `tools/fixtures/solido-por-lacos/`: a gaiola de laços ainda montada pela peça (`forma.js`), antes do ajudante do núcleo.
   Confere o gate 1 (aresta sem par, vínculo não manifold e triângulo sem área, pelas funções de `tools/oficina/conferir-malha.ts`),
   o gate 2 (a malha da peça de teste contra a do corpo do ombro feito à mão, que é só leitura aqui) e a repetição, e trava as
   medidas rápidas dos quatro limites: o canto da seção contra o do `arredondarAresta`, a menor distância entre planos, a razão
   de amostragem do laço e o desvio da cota exata em todos os pontos. As medidas de ondulação, que levam perto de 80 s, saem de
   `medir-limites.mjs`; os números estão em `docs/modelar/banco-de-provas/solido-por-lacos-2026-11-05/README.md`. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço de autoria em JavaScript.
import { executarReceita } from '../../../src/autoria/executar-receita.js';
// @ts-expect-error — adaptador em JavaScript.
import { adaptarThree } from '../../../src/autoria/adaptar-three.js';
// @ts-expect-error — peça de teste em JavaScript.
import receita from './receita.js';
// @ts-expect-error — peça de teste em JavaScript.
import arestaArredondada from './aresta-arredondada.js';
// @ts-expect-error — peça de teste em JavaScript.
import { TABELA, derivar } from './forma.js';
// @ts-expect-error — variantes em JavaScript.
import { VARIANTES, comTabela } from './variantes/variantes.js';
// @ts-expect-error — medidas em JavaScript.
import { cantoDaSecao, desvioEntreMalhas, malhaDaParte, menorDistanciaEntrePlanos, razaoDeAmostragem } from './medir.mjs';
// @ts-expect-error — a peça feita à mão, só para a comparação do gate 2.
import ombro from '../../../procedural/pecas/braco-robotico/partes/ombro/receita.js';
import { areasDeTriangulo, arestasSemPar, escalaDaPeca, vinculosNaoManifold } from '../../oficina/conferir-malha';

const LENTO = 120_000;

describe('sólido por laços, fatia 1: a peça de teste e os limites da gaiola de laços', () => {
  const { neutro } = executarReceita(receita);
  const malha = malhaDaParte(neutro, 'corpo');

  it('sai fechada: nenhuma aresta sem par, nenhum vínculo não manifold, nenhum triângulo sem área', () => {
    expect(neutro.orfaos).toEqual([]);
    const { raiz } = adaptarThree(neutro, { nome: 'solido-por-lacos' });
    const areas = areasDeTriangulo(raiz, escalaDaPeca(neutro));
    const gate1 = { arestasSemPar: arestasSemPar(neutro).length, vinculosNaoManifold: vinculosNaoManifold(neutro).length, triangulosSemArea: areas.abaixo.length };
    console.log(JSON.stringify({ gate1, menorTriangulo: areas.menor, piso: areas.piso, vertices: neutro.V.size, faces: neutro.F.size }));
    expect(gate1).toEqual({ arestasSemPar: 0, vinculosNaoManifold: 0, triangulosSemArea: 0 });
    expect([neutro.V.size, neutro.F.size]).toEqual([13034, 13032]);
  });

  it('dá a forma de fora do corpo feito à mão, dentro de 0,5 mm, e a mesma malha a cada execução', () => {
    const doOmbro = malhaDaParte(executarReceita(ombro).neutro, 'pescoco');
    const d = desvioEntreMalhas(malha, doOmbro);
    console.log(JSON.stringify({ desvioContraOCorpoFeitoAMaoMm: d.maximo, triangulos: [malha.triangulos.length, doOmbro.triangulos.length] }));
    expect(d.maximo).toBeLessThan(0.5);
    expect(d.maximo).toBe(0);
    const outra = malhaDaParte(executarReceita(receita).neutro, 'corpo');
    expect(outra.pontos).toEqual(malha.pontos);
    expect(outra.triangulos).toEqual(malha.triangulos);
  }, LENTO);

  it('limite 3: o canto da seção sai mais macio que o do arredondarAresta com o mesmo raio', () => {
    const daGaiola = cantoDaSecao(malha, TABELA);
    const doArredondar = cantoDaSecao(malhaDaParte(executarReceita(arestaArredondada).neutro), TABELA);
    console.log(JSON.stringify({ daGaiola, doArredondar }));
    expect(doArredondar).toEqual({ recuoMm: 13.255, raioEquivalenteMm: 32, faixaPlanaMm: 63, ladoMm: 95 });
    expect(daGaiola).toEqual({ recuoMm: 14.185, raioEquivalenteMm: 34.245, faixaPlanaMm: 60.124, ladoMm: 93.692 });
  });

  it('limites 2 e 4 na gaiola: a distância entre planos e a razão entre trechos vizinhos do laço', () => {
    const medidas = {
      referencia: { planos: derivar(TABELA).planos.length, menor: menorDistanciaEntrePlanos(TABELA), amostragem: razaoDeAmostragem(TABELA) },
      planosProximos: { planos: derivar(VARIANTES.planosProximos).planos.length, menor: menorDistanciaEntrePlanos(VARIANTES.planosProximos) },
      poucosPlanosNaQuina: { planos: derivar(VARIANTES.poucosPlanosNaQuina).planos.length, menor: menorDistanciaEntrePlanos(VARIANTES.poucosPlanosNaQuina) },
    };
    console.log(JSON.stringify(medidas));
    expect(medidas.referencia.planos).toBe(21);
    expect(medidas.referencia.menor).toBeCloseTo(2.556, 3);
    expect(medidas.referencia.amostragem.razao).toBe(20);
    expect(medidas.planosProximos.planos).toBe(27);
    expect(medidas.planosProximos.menor).toBeCloseTo(0.12, 3);
    expect(medidas.poucosPlanosNaQuina.planos).toBe(17);
  });

  it('limite 1: a cota exata em todos os pontos tira a superfície da forma e aperta o canto além do raio', () => {
    const { neutro: n } = executarReceita(comTabela(VARIANTES.medidasEmTodos, 'medidas-em-todos'));
    expect(n.orfaos).toEqual([]);
    const m = malhaDaParte(n, 'corpo');
    const d = desvioEntreMalhas(m, malha);
    const canto = cantoDaSecao(m, TABELA);
    console.log(JSON.stringify({ desvioContraAReferenciaMm: d.maximo, onde: d.ondeA, canto }));
    expect(Number(d.maximo.toFixed(2))).toBe(6.37);
    expect(canto.recuoMm).toBe(10.646);
  }, LENTO);

  it('a escada da parede de lado recusa laços com cadeias de número diferente', () => {
    expect(() => derivar({ ...TABELA, fracoesDoTopo: [0, 0.25, 0.5, 0.75] })).toThrow(/mesmo número/);
  });
});
