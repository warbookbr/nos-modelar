/* superficies.test.ts — bateria do plano da abertura em qualquer direção (`docs/modelar/planos/2026-11-06-abertura-em-qualquer-direcao.md`):
   a superfície de dupla curvatura forte (`dupla-curvatura.js`), o corpo de várias camadas na mesma reta com `sentido`
   (`tres-camadas.js`) e a chapa feita por outra gaiola, por rede e por laços (`chapa-por-rede.js` e `casco-por-lacos.js`). Cada caso
   mede o gate de malha e a borda do vão contra o desenho a menos de 0,5 mm, ou recusa com a medida e o que fazer. */
import { describe, expect, it } from 'vitest';
import { vaoEm, passosDe as passosDaSuperficie } from './dupla-curvatura.js';
import { VAO as VAO_DAS_CAMADAS, passosDe as passosDasCamadas } from './tres-camadas.js';
import { VAO as VAO_DA_REDE, passosDe as passosDaRede } from './chapa-por-rede.js';
import { VAO as VAO_DO_CASCO, passosDe as passosDoCasco } from './casco-por-lacos.js';
import { desvioDoVao, exigirFechada, gate1, piorDesvio, recusaDe, rodar } from './medidas';

const tabela: Record<string, unknown> = {};

function conferir(rotulo: string, TOPO: any, PASSOS: any, vista: any, contorno: any) {
  const neutro = rodar(TOPO, PASSOS, 'superficies');
  expect(neutro.orfaos, rotulo).toEqual([]);
  exigirFechada(gate1(neutro), rotulo);
  const d = desvioDoVao(neutro, 0, vista, contorno);
  expect(piorDesvio(d), rotulo).toBeLessThan(0.5);
  tabela[rotulo] = { faces: neutro.F.size, ms: neutro.ms, desvioMm: Number(piorDesvio(d).toFixed(4)) };
  return neutro;
}

describe('a superfície de dupla curvatura forte (raios de 250 mm, inclinação de até 75 graus nos cantos)', () => {
  for (const [forma, centro, inclinacao] of [['sela', 640, 54], ['cupula', 580, 46]] as const) {
    it(`${forma}, vão de 160 mm centrado a ${centro} mm (inclinação de ${inclinacao} graus): fechado, sem lasca, com a borda no desenho`, () => {
      const { TOPO, PASSOS } = passosDaSuperficie({ forma, cx: centro, cz: centro });
      conferir(`${forma} ${centro}`, TOPO, PASSOS, 'y', vaoEm(centro, centro));
    });
  }
});

describe('o limite que a sela deixa: uma lasca na parede ou na lente, medida e registrada', () => {
  /* na sela, em 450, 500, 580, 670 e 700 mm (de 9 posições medidas, nos eixos x = z; a de 700 deixa quatro, pela tira de 20 mm junto da borda), a face da parede ou da lente com quatro pontos
     alinhados na borda deixa um triângulo de razão de 0,0007 a 0,0016; a malha fecha e a lasca vai para `limpeza.finasRestantes` */
  for (const [centro, esperadas] of [[500, 1], [580, 1]] as const) {
    it(`sela a ${centro} mm: a malha fecha, e as ${esperadas} face(s) fina(s) que ficaram estão no registro e no gate`, () => {
      const { TOPO, PASSOS } = passosDaSuperficie({ forma: 'sela', cx: centro, cz: centro });
      const neutro = rodar(TOPO, PASSOS, 'superficies');
      expect(neutro.orfaos).toEqual([]);
      const g = gate1(neutro);
      expect(g.arestasSemPar + g.vinculosNaoManifold + g.triangulosSemArea).toBe(0);
      expect(g.faceFina).toBe(esperadas);
      expect(neutro.aberturas[0].limpeza.finasRestantes).toBe(esperadas);
      tabela[`sela ${centro} (limite)`] = { faceFina: g.faceFina, ms: neutro.ms };
    });
  }
});

describe('o corpo de camadas na mesma reta', () => {
  it('a folha dobrada em S, sem sentido, recusa e diz que a reta atravessa a chapa 3 vezes', () => {
    const { TOPO, PASSOS } = passosDasCamadas({ abertura: {} });
    expect(recusaDe(rodar(TOPO, PASSOS, 'superficies'))).toMatch(/atravessa a chapa 3 vezes.*declare sentido \('\+' ou '-'\)/);
  });
  for (const sentido of ['+', '-']) {
    it(`a folha em S, sentido '${sentido}': corta só a camada ${sentido === '+' ? 'de cima' : 'de baixo'}, fechada e sem lasca`, () => {
      const { TOPO, PASSOS } = passosDasCamadas({ abertura: { sentido } });
      const neutro = conferir(`S ${sentido}`, TOPO, PASSOS, 'z', VAO_DAS_CAMADAS);
      /* o corte para entre a camada e a seguinte: a de cima (z ~ 300) ou a de baixo (z ~ 100) perde o vão, e as outras duas ficam inteiras */
      const zs = new Set<number>();
      for (const v of neutro.aberturas[0].borda.fora) zs.add(Math.round(neutro.V.get(v)[2] * 1000 / 50));
      expect([...zs].every((z) => (sentido === '+' ? z * 50 > 250 : z * 50 < 150))).toBe(true);
    });
  }
  it('a folha em U, com duas camadas, corta a de cima com sentido + e recusa sem ele', () => {
    const sem = passosDasCamadas({ camadas: 2, abertura: {} });
    expect(recusaDe(rodar(sem.TOPO, sem.PASSOS, 'superficies'))).toMatch(/atravessa a chapa 2 vezes/);
    const com = passosDasCamadas({ camadas: 2, abertura: { sentido: '+' } });
    conferir('U +', com.TOPO, com.PASSOS, 'z', VAO_DAS_CAMADAS);
  });
  it('com as camadas se sobrepondo em profundidade (a de baixo, em x = 200, passa da profundidade a que a de cima chega no meio), recusa nos dois sentidos', () => {
    for (const sentido of ['+', '-']) {
      const { TOPO, PASSOS } = passosDasCamadas({ camadas: 2, ondas: 70, abertura: { sentido } });
      expect(recusaDe(rodar(TOPO, PASSOS, 'superficies')), sentido).toMatch(/a primeira camada da chapa e a seguinte se sobrepõem em profundidade: a face de dentro da primeira chega a [\d.]+ mm .* nenhum plano passa entre elas/);
    }
  });
  it('com a de baixo ainda sob o plano entre as camadas dentro do vão, mas acima dele fora, o sentido + recusa pela borda e diz o plano', () => {
    const { TOPO, PASSOS } = passosDasCamadas({ camadas: 2, ondas: 60, abertura: { sentido: '+' } });
    expect(recusaDe(rodar(TOPO, PASSOS, 'superficies'))).toMatch(/cruza a borda da chapa vista do eixo z.*com sentido, a camada é o que fica acima do plano a [\d.]+ mm no eixo.*aproxime as camadas/);
    /* o sentido '-' no mesmo corpo corta a de baixo, que o plano deixa inteira dentro do vão */
    const baixo = passosDasCamadas({ camadas: 2, ondas: 60, abertura: { sentido: '-' } });
    conferir('ondas 60 -', baixo.TOPO, baixo.PASSOS, 'z', VAO_DAS_CAMADAS);
  });
});

describe('a chapa feita por outra gaiola', () => {
  it('por gaiolaPorRede (malha irregular junto das bordas): fechada, sem lasca, com a borda no desenho', () => {
    const { TOPO, PASSOS } = passosDaRede();
    conferir('rede', TOPO, PASSOS, 'y', VAO_DA_REDE);
  });
  it('por gaiolaPorLacos (elipsoide fechado com as pontas reduzidas a um ponto): o vão do topo com sentido + sai fechado e sem lasca; sem sentido recusa', () => {
    const { TOPO, PASSOS } = passosDoCasco();
    conferir('lacos', TOPO, PASSOS, 'z', VAO_DO_CASCO);
    const sem = passosDoCasco({});
    expect(recusaDe(rodar(sem.TOPO, sem.PASSOS, 'superficies'))).toMatch(/atravessa a chapa 2 vezes.*declare sentido/);
  });
  it('imprime as medidas do banco de provas', () => {
    console.log(JSON.stringify({ superficies: tabela }));
  });
});
