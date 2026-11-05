/* solido-por-lacos.test.ts — os gates do plano do sólido por laços sobre as duas peças de teste de `tools/fixtures/solido-por-lacos/`,
   o L de ponta-cabeça (`receita.js`) e a dobra em U (`dobra-em-u.js`), ambas pela gaiola de `gaiolaPorLacos`. Confere o gate 1
   (aresta sem par, vínculo não manifold e triângulo sem área, pelas funções de `tools/oficina/conferir-malha.ts`), o gate 2 (a forma
   do L contra a do corpo do ombro feito à mão, que é só leitura aqui, e a ondulação à parte, igual ou menor que a do ombro), o gate 4
   (a mesma receita dá a mesma malha) e o gate 3, os quatro limites do ombro: a recusa da cota exata em todos os pontos e dos planos
   próximos, a compensação que leva o canto e a dobra ao raio pedido, e os avisos de amostragem desigual. Os números estão em
   `docs/modelar/banco-de-provas/solido-por-lacos-2026-11-05/README.md`. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço de autoria em JavaScript.
import { executarReceita } from '../../../src/autoria/executar-receita.js';
// @ts-expect-error — adaptador em JavaScript.
import { adaptarThree } from '../../../src/autoria/adaptar-three.js';
// @ts-expect-error — ferramenta em JavaScript.
import { ondulacaoDaReceita } from '../../modelar/ondulacao-da-superficie.mjs';
// @ts-expect-error — peça de teste em JavaScript.
import receita from './receita.js';
// @ts-expect-error — peça de teste em JavaScript.
import dobra, { TABELA as TABELA_DA_DOBRA, derivar as derivarDobra } from './dobra-em-u.js';
// @ts-expect-error — peça de teste em JavaScript.
import arestaArredondada from './aresta-arredondada.js';
// @ts-expect-error — peça de teste em JavaScript.
import { TABELA, derivar } from './forma.js';
// @ts-expect-error — variantes em JavaScript.
import { VARIANTES, comTabela } from './variantes/variantes.js';
// @ts-expect-error — medidas em JavaScript.
import { cantoDaSecao, desvioEntreMalhas, malhaDaParte, menorDistanciaEntrePlanos, raioDaDobra } from './medir.mjs';
// @ts-expect-error — a peça feita à mão, só para a comparação do gate 2.
import ombro from '../../../procedural/pecas/braco-robotico/partes/ombro/receita.js';
import { areasDeTriangulo, arestasSemPar, escalaDaPeca, vinculosNaoManifold } from '../../oficina/conferir-malha';

const LENTO = 120_000;

function fechamento(neutro: any, nome: string) {
  const { raiz } = adaptarThree(neutro, { nome });
  const areas = areasDeTriangulo(raiz, escalaDaPeca(neutro));
  return {
    gate1: { arestasSemPar: arestasSemPar(neutro).length, vinculosNaoManifold: vinculosNaoManifold(neutro).length, triangulosSemArea: areas.abaixo.length },
    menorTriangulo: areas.menor, piso: areas.piso, vertices: neutro.V.size, faces: neutro.F.size,
  };
}

const dobraCom = (T: any) => {
  const copia = Object.defineProperties({}, Object.getOwnPropertyDescriptors(dobra));
  copia.PARAMS = T;
  return copia;
};

describe('sólido por laços: a peça em L e a dobra em U pela gaiola de gaiolaPorLacos', () => {
  const { neutro } = executarReceita(receita);
  const malha = malhaDaParte(neutro, 'corpo');
  const { neutro: neutroU } = executarReceita(dobra);
  const malhaU = malhaDaParte(neutroU, 'dobra');

  it('gate 1: as duas saem fechadas, sem aresta sem par, vínculo não manifold nem triângulo sem área', () => {
    expect(neutro.orfaos).toEqual([]);
    expect(neutroU.orfaos).toEqual([]);
    const l = fechamento(neutro, 'solido-por-lacos');
    const u = fechamento(neutroU, 'dobra-em-u');
    console.log(JSON.stringify({ l, u }));
    expect(l.gate1).toEqual({ arestasSemPar: 0, vinculosNaoManifold: 0, triangulosSemArea: 0 });
    expect(u.gate1).toEqual({ arestasSemPar: 0, vinculosNaoManifold: 0, triangulosSemArea: 0 });
    expect([l.vertices, l.faces]).toEqual([13034, 13032]);
    expect([u.vertices, u.faces]).toEqual([7874, 7872]);
  });

  it('gate 2: a forma de fora do L fica a até 0,5 mm do corpo feito à mão, e a ondulação não passa a dele', () => {
    const doOmbro = malhaDaParte(executarReceita(ombro).neutro, 'pescoco');
    const d = desvioEntreMalhas(malha, doOmbro, { teto: 2 });
    const resumo = (r: any) => {
      const s = ondulacaoDaReceita(r).superficies[0];
      return { falhas: s.falhas.length, maiorMm: Math.max(0, ...s.falhas.map((f: any) => f.amplitudeMm)), facesViradas: s.facesViradas };
    };
    const daPeca = resumo(receita);
    const doCorpo = resumo(ombro);
    console.log(JSON.stringify({ desvioContraOCorpoFeitoAMaoMm: d.maximo, onde: [d.ondeA, d.ondeB], ondulacao: { daPeca, doCorpo } }));
    expect(d.maximo).toBeLessThan(0.5);
    expect(Number(d.maximo.toFixed(3))).toBe(0.431);
    expect(daPeca.facesViradas).toBe(0);
    expect(daPeca.falhas).toBeLessThanOrEqual(doCorpo.falhas);
    expect(daPeca.maiorMm).toBeLessThanOrEqual(doCorpo.maiorMm);
    expect(daPeca).toEqual({ falhas: 3, maiorMm: 0.807, facesViradas: 0 });
    expect(doCorpo).toEqual({ falhas: 5, maiorMm: 0.811, facesViradas: 0 });
  }, LENTO);

  it('gate 4: a mesma receita dá a mesma gaiola e a mesma malha', () => {
    expect(derivar(TABELA).passo).toEqual(derivar(TABELA).passo);
    const outra = malhaDaParte(executarReceita(receita).neutro, 'corpo');
    expect(outra.pontos).toEqual(malha.pontos);
    expect(outra.triangulos).toEqual(malha.triangulos);
    const outraU = malhaDaParte(executarReceita(dobra).neutro, 'dobra');
    expect(outraU.pontos).toEqual(malhaU.pontos);
    expect(outraU.triangulos).toEqual(malhaU.triangulos);
  }, LENTO);

  it('gate 3, limite 1: a cota exata em todos os pontos é recusada com a medida da fatia 1', () => {
    expect(() => derivar(VARIANTES.medidasEmTodos)).toThrow(/medidas em todos os pontos não é aceito: .*817 pontos.*62,6 mm.*302 faces/);
  });

  it('gate 3, limite 2: os planos a menos de 2,5 mm são recusados com os dois planos e a distância', () => {
    expect(menorDistanciaEntrePlanos(TABELA)).toBeCloseTo(2.556, 3);
    expect(() => derivar(VARIANTES.planosProximos)).toThrow(/os laços 'l1' \(x = -92,56 mm\) e 'l2' \(x = -92,44 mm\) ficam a 0,12 mm um do outro, abaixo do mínimo de 2,5 mm, e mais 7 pares/);
  });

  it('gate 3, limite 3: a compensação leva o canto do L e as curvas do U ao raio pedido, dentro de 0,5 mm', () => {
    const doArredondar = cantoDaSecao(malhaDaParte(executarReceita(arestaArredondada).neutro), TABELA);
    const semCompensar = cantoDaSecao(malha, TABELA);
    const compensada = executarReceita(comTabela(VARIANTES.compensada, 'compensada')).neutro;
    expect(compensada.orfaos).toEqual([]);
    const comCompensar = cantoDaSecao(malhaDaParte(compensada, 'corpo'), TABELA);
    const uSem = raioDaDobra(malhaU, TABELA_DA_DOBRA);
    const TU = { ...TABELA_DA_DOBRA, compensarCurva: true };
    const nU = executarReceita(dobraCom(TU)).neutro;
    expect(nU.orfaos).toEqual([]);
    expect(fechamento(nU, 'dobra-compensada').gate1).toEqual({ arestasSemPar: 0, vinculosNaoManifold: 0, triangulosSemArea: 0 });
    const uCom = raioDaDobra(malhaDaParte(nU, 'dobra'), TU);
    console.log(JSON.stringify({ doArredondar, semCompensar, comCompensar, compensacao: derivar(VARIANTES.compensada).compensacao, uSem, uCom, compensacaoU: derivarDobra(TU).compensacao }));
    expect(doArredondar.raioEquivalenteMm).toBe(32);
    expect(semCompensar.raioEquivalenteMm).toBeCloseTo(34.2, 1);
    expect(Math.abs(comCompensar.raioEquivalenteMm - TABELA.raioDosCantos)).toBeLessThanOrEqual(0.5);
    expect(comCompensar).toEqual({ recuoMm: 13.175, raioEquivalenteMm: 31.807, faixaPlanaMm: 62.552, ladoMm: 93.605 });
    expect(fechamento(compensada, 'compensada').gate1).toEqual({ arestasSemPar: 0, vinculosNaoManifold: 0, triangulosSemArea: 0 });
    expect(uSem.fora.media).toBeLessThan(TABELA_DA_DOBRA.raioDeFora - 0.5);
    expect(uSem.dentro.media).toBeLessThan(TABELA_DA_DOBRA.raioDeDentro - 0.5);
    for (const [lado, raio] of [['fora', TABELA_DA_DOBRA.raioDeFora], ['dentro', TABELA_DA_DOBRA.raioDeDentro]] as const) {
      expect(Math.abs(uCom[lado].minimo - raio)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(uCom[lado].maximo - raio)).toBeLessThanOrEqual(0.5);
    }
  }, LENTO);

  it('gate 3, limite 4: a amostragem desigual entre trechos e entre planos sai em aviso', () => {
    const ref = derivar(TABELA).avisos.map((a: any) => [a.ref, (a.trechos ?? a.lacos).join('/'), a.razao]);
    const quina = derivar(VARIANTES.poucosPlanosNaQuina).avisos.filter((a: any) => a.ref === 'planosDesiguais').map((a: any) => [a.lacos[1], a.razao]);
    console.log(JSON.stringify({ ref, quina }));
    expect(ref).toEqual([['amostragemDesigual', 'tras/borda', 29.67], ['amostragemDesigual', 'topo/transicao', 6.42]]);
    expect(quina).toEqual([['l4', 6.82], ['l5', 5.62], ['l11', 5.62], ['l12', 6.82]]);
    expect(derivarDobra(TABELA_DA_DOBRA).avisos).toEqual([]);
  });

  it('a escada da tampa recusa cadeias com número de pontos diferente', () => {
    expect(() => derivar({ ...TABELA, pontos: { ...TABELA.pontos, baixo: 10 } })).toThrow(/18 pontos.*17 pontos.*mesmo número/);
  });
});
