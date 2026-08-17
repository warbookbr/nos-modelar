/* rasgo-oblongo.test.ts — a prova da ABERTURA OBLONGA no `furo`.

   A pendência que este arquivo fecha estava escrita em `INDEX.md` como
   "expressar abertura oblonga sem simulação visual": até aqui, um rasgo só
   podia ser SIMULADO — dois furos redondos vizinhos e a esperança de que a
   foto parecesse um rasgo. Simular é exatamente o que a Mecanifica recusa,
   porque a peça mediria duas aberturas onde a máquina real tem uma.

   A escolha de projeto que estas provas defendem é uma só: o rasgo NÃO é uma
   op nova nem uma família de endereço nova. Ele é o anel do `furo` com forma
   de ESTÁDIO — meia-volta em cada extremo, dois lados retos ligando — gastando
   os MESMOS `lados` pontos do círculo. É por isso que borda, parede, saída,
   tampa, preenchimento, grupo e o eixo `furo` continuam valendo palavra por
   palavra, e é isso que as afirmações abaixo matam quando deixa de ser verdade:

   1. LARGURA EXATA. O que passa pelo rasgo é o parafuso, e quem decide isso é
      a largura. Ela é `2·raio` exato, porque os lados retos caem em ±raio. O
      comprimento é inscrito, como o diâmetro de um furo redondo já era;
   2. LADOS RETOS EXISTEM. Um estádio sem reta é um losango de pontas redondas.
      A prova conta os pontos que caem na largura máxima: quatro, dois por reta;
   3. DESVIO CONTINUA PROMESSA EM METROS. Um extremo com `n` pontos cobre meia
      volta em `n−1` cordas, então um anel de `L` pontos erraria como um círculo
      de `L−2`. O passo compensa, e esta prova mede o erro de corda contra o
      desvio pedido — sem ela, pedir acabamento fino entregaria grosso calado;
   4. O ENDEREÇO NÃO MUDOU. Parede, tampa de fundo e grupo respondem no rasgo
      exatamente como respondem no furo redondo;
   5. AS RECUSAS. Comprimento zero é furo redondo com nome de rasgo, e menos de
      quatro lados não fecha meia-volta. As duas GRITAM em vez de entregar uma
      forma que a receita não pediu;
   6. CÍRCULO E ESTÁDIO CONVIVEM. Os dois no mesmo passo, sem forma nova.

   Régua headless da peça:
     npm run descrever -- _rasgo-oblongo --estrito */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — peça em JavaScript, exercitada em runtime pelo Vitest.
import * as rasgoOblongo from '../../prototipos/fps/v3/pecas/_rasgo-oblongo.js';

const CHAPA = 100;
const CORTE = 101;

const ESPESSURA = 0.02;
const RAIO = 0.01;
const MEIO = 0.03;

/* A chapa é sempre a mesma; o que muda é o corte. Manter a base fixa é o que
   permite comparar círculo e estádio sem que a diferença venha da placa. */
function cortar(argsDoFuro: Record<string, unknown>) {
  return nucleo([
    ['cubo', { origemId: CHAPA, larg: 0.24, alt: ESPESSURA, prof: 0.12 }],
    ['furo', {
      origemId: CORTE,
      de: { op: 'cubo', id: CHAPA, face: 'topo' },
      ...argsDoFuro,
    }],
  ], {});
}

function passante(argsDoFuro: Record<string, unknown>) {
  return cortar({ saida: { op: 'cubo', id: CHAPA, face: 'fundo' }, ...argsDoFuro });
}

/* Os pontos do anel de entrada são os vértices que caem no plano do topo e
   longe da borda da chapa — a borda da chapa também vive nesse plano. */
function anelNoTopo(malha: any): number[][] {
  return [...malha.V.values()]
    .filter((p: number[]) => Math.abs(p[1] - ESPESSURA) < 1e-9)
    .filter((p: number[]) => Math.abs(p[0]) < 0.11 && Math.abs(p[2]) < 0.055);
}

/* Erro de corda: o quanto o meio de cada aresta do anel se afasta do raio
   verdadeiro do extremo mais próximo. É a medida que `lados:{desvio}` promete
   limitar, e a única que revela um estádio grosso disfarçado de fino. */
function erroDeCorda(anel: number[][], centros: number[][]): number {
  let pior = 0;
  for (let j = 0; j < anel.length; j++) {
    const a = anel[j];
    const b = anel[(j + 1) % anel.length];
    const meio = [(a[0] + b[0]) / 2, (a[2] + b[2]) / 2];
    const d = Math.min(...centros.map((c) => Math.hypot(meio[0] - c[0], meio[1] - c[1])));
    if (Math.abs(d - RAIO) < RAIO) pior = Math.max(pior, RAIO - d);
  }
  return pior;
}

/* O núcleo NÃO lança na recusa estrutural: ele registra o motivo em `orfaos` e
   segue, para que a peça inteira possa ser diagnosticada de uma vez em vez de
   parar no primeiro erro. A prova de recusa lê esse registro. */
function gritou(fn: () => any): string {
  const malha = fn();
  return (malha.orfaos ?? []).map((o: any) => o.motivo).join(' | ');
}

describe('rasgo — a forma', () => {
  it('a largura é exata e o comprimento é o curso mais as duas meias-voltas', () => {
    const anel = anelNoTopo(passante({
      centro: [-MEIO, 0, 0], ate: [MEIO, 0, 0], raio: RAIO, lados: 16,
    }));
    expect(anel.length).toBe(16);

    const zs = anel.map((p) => p[2]);
    /* LARGURA: exata, nas duas mãos. É a medida do parafuso. */
    expect(Math.min(...zs)).toBeCloseTo(-RAIO, 12);
    expect(Math.max(...zs)).toBeCloseTo(RAIO, 12);

    /* COMPRIMENTO: inscrito, nunca maior que o nominal — um rasgo que passasse
       do nominal comeria material que a receita não mandou tirar. */
    const xs = anel.map((p) => p[0]);
    const nominal = MEIO + RAIO;
    expect(Math.max(...xs)).toBeLessThanOrEqual(nominal + 1e-12);
    expect(Math.max(...xs)).toBeGreaterThan(nominal * 0.98);
    expect(Math.min(...xs)).toBeCloseTo(-Math.max(...xs), 12);
  });

  it('os dois lados retos existem: quatro pontos na largura máxima', () => {
    const anel = anelNoTopo(passante({
      centro: [-MEIO, 0, 0], ate: [MEIO, 0, 0], raio: RAIO, lados: 16,
    }));
    const naLargura = anel.filter((p) => Math.abs(Math.abs(p[2]) - RAIO) < 1e-12);
    expect(naLargura.length).toBe(4);
    /* Duas pontas de cada reta, uma em cada extremo do rasgo. */
    const emX = naLargura.map((p) => p[0]).sort((a, b) => a - b);
    expect(emX[0]).toBeCloseTo(-MEIO, 12);
    expect(emX[1]).toBeCloseTo(-MEIO, 12);
    expect(emX[2]).toBeCloseTo(MEIO, 12);
    expect(emX[3]).toBeCloseTo(MEIO, 12);
  });

  it('o rasgo segue a direção declarada, não um eixo do mundo', () => {
    const diagonal = passante({
      centro: [-0.02, 0, -0.02], ate: [0.02, 0, 0.02], raio: RAIO, lados: 16,
    });
    const anel = anelNoTopo(diagonal);
    /* Na diagonal, a largura sai medindo 2·raio na PERPENDICULAR ao rasgo. */
    const dir = [1 / Math.SQRT2, 1 / Math.SQRT2];
    const perp = [-dir[1], dir[0]];
    const larguras = anel.map((p) => p[0] * perp[0] + p[2] * perp[1]);
    expect(Math.min(...larguras)).toBeCloseTo(-RAIO, 12);
    expect(Math.max(...larguras)).toBeCloseTo(RAIO, 12);
  });
});

describe('rasgo — o desvio continua promessa em metros', () => {
  it('o estádio erra igual ao círculo, e os dois respeitam o desvio pedido', () => {
    const desvio = 0.00005;
    const circulo = anelNoTopo(passante({ centro: [0, 0, 0], raio: RAIO, lados: { desvio } }));
    const estadio = anelNoTopo(passante({
      centro: [-MEIO, 0, 0], ate: [MEIO, 0, 0], raio: RAIO, lados: { desvio },
    }));

    const erroCirculo = erroDeCorda(circulo, [[0, 0]]);
    const erroEstadio = erroDeCorda(estadio, [[-MEIO, 0], [MEIO, 0]]);

    expect(erroCirculo).toBeLessThanOrEqual(desvio);
    expect(erroEstadio).toBeLessThanOrEqual(desvio);
    /* A compensação é exatamente dois pontos: sem ela o estádio erraria como um
       círculo de L−2 lados, e esta igualdade seria falsa. */
    expect(estadio.length).toBe(circulo.length + 2);
    expect(erroEstadio).toBeCloseTo(erroCirculo, 12);
  });

  it('contagem explícita é obedecida ao pé da letra, sem compensação', () => {
    const anel = anelNoTopo(passante({
      centro: [-MEIO, 0, 0], ate: [MEIO, 0, 0], raio: RAIO, lados: 20,
    }));
    expect(anel.length).toBe(20);
  });
});

describe('rasgo — o endereço não mudou', () => {
  const ORIGEM = { op: 'furo', id: CORTE };

  it('parede, saída e grupo respondem como em furo redondo', () => {
    const malha = nucleo([
      ['cubo', { origemId: CHAPA, larg: 0.24, alt: ESPESSURA, prof: 0.12 }],
      ['furo', {
        origemId: CORTE,
        de: { op: 'cubo', id: CHAPA, face: 'topo' },
        saida: { op: 'cubo', id: CHAPA, face: 'fundo' },
        centros: [
          { nome: 'curso', centro: [-MEIO, 0, -0.03], ate: [MEIO, 0, -0.03], raio: RAIO },
          { nome: 'piloto', centro: [0, 0, 0.03], raio: 0.006 },
        ],
        lados: 16,
      }],
      ['parte', { nome: 'paredeDoRasgo', sel: { origem: { ...ORIGEM, grupo: 'curso', parede: { passo: 1, fase: 0 } } } }],
      ['parte', { nome: 'paredeDoPiloto', sel: { origem: { ...ORIGEM, grupo: 'piloto', parede: { passo: 1, fase: 0 } } } }],
    ], {});

    expect(malha.orfaos).toEqual([]);
    const nomes = [...malha.F.values()].map((f: any) => f.parte).filter(Boolean);
    /* `lados` paredes de cada um: o rasgo não gasta faces a mais que o círculo. */
    expect(nomes.filter((n: string) => n === 'paredeDoRasgo').length).toBe(16);
    expect(nomes.filter((n: string) => n === 'paredeDoPiloto').length).toBe(16);
  });

  it('o rasgo cego fecha o fundo, e a tampa é o estádio inteiro', () => {
    const malha = nucleo([
      ['cubo', { origemId: CHAPA, larg: 0.24, alt: ESPESSURA, prof: 0.12 }],
      ['furo', {
        origemId: CORTE,
        de: { op: 'cubo', id: CHAPA, face: 'topo' },
        profundidade: 0.008,
        centro: [-MEIO, 0, 0], ate: [MEIO, 0, 0], raio: RAIO, lados: 16,
      }],
      ['parte', { nome: 'fundoDoRasgo', sel: { origem: { ...ORIGEM, tampa: 'fundo' } } }],
    ], {});

    expect(malha.orfaos).toEqual([]);
    const tampa = [...malha.F.values()].filter((f: any) => f.parte === 'fundoDoRasgo');
    expect(tampa.length).toBe(1);
    /* UMA face com os `lados` vértices do estádio: a tampa é o anel inteiro,
       não um disco redondo no meio de um rasgo alongado. */
    expect(tampa[0].vs.length).toBe(16);
    /* E ela vive na profundidade declarada, não no plano de entrada. */
    const ys = tampa[0].vs.map((id: number) => malha.V.get(id)[1]);
    for (const y of ys) expect(y).toBeCloseTo(ESPESSURA - 0.008, 12);
  });
});

describe('rasgo — as recusas', () => {
  it('comprimento zero grita: é furo redondo com nome de rasgo', () => {
    const msg = gritou(() => passante({
      centro: [0, 0, 0], ate: [0, 0, 0], raio: RAIO, lados: 16,
    }));
    expect(msg).toMatch(/rasgo de comprimento zero|comprimento 0/);
  });

  it('menos de quatro lados grita: meia-volta precisa de dois pontos', () => {
    const msg = gritou(() => passante({
      centro: [-MEIO, 0, 0], ate: [MEIO, 0, 0], raio: RAIO, lados: 3,
    }));
    expect(msg).toMatch(/pelo menos 4 lados/);
  });

  it('ate no passo com centros grita: alongaria todos os furos de uma vez', () => {
    const msg = gritou(() => passante({
      centros: [[-0.04, 0, 0], [0.04, 0, 0]], ate: [0.06, 0, 0], raio: RAIO, lados: 16,
    }));
    expect(msg).toMatch(/ate alonga UM furo/);
  });

  it('rasgo que não cabe na face grita nomeando comprimento e raio', () => {
    const msg = gritou(() => passante({
      centro: [-0.2, 0, 0], ate: [0.2, 0, 0], raio: RAIO, lados: 16,
    }));
    expect(msg).toMatch(/rasgo de raio .* e comprimento/);
  });

  it('dois rasgos sobrepostos gritam, como dois furos sobrepostos', () => {
    const msg = gritou(() => passante({
      centros: [
        { centro: [-MEIO, 0, 0], ate: [MEIO, 0, 0], raio: RAIO },
        { centro: [-MEIO, 0, 0.005], ate: [MEIO, 0, 0.005], raio: RAIO },
      ],
      lados: 16,
    }));
    expect(msg).toMatch(/se cruzam ou se encostam|está DENTRO/);
  });
});

describe('_rasgo-oblongo — a peça', () => {
  const { PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES } = rasgoOblongo as any;
  const montar = () => nucleo(PASSOS, PARAMS, TOPO, MATERIAIS, null, ALIASES);

  it('fecha identidade: sem órfão e sem face anônima', () => {
    const malha = montar();
    expect(malha.orfaos).toEqual([]);
    const anonimas = [...malha.F.values()].filter((f: any) => !f.parte);
    expect(anonimas).toEqual([]);
  });

  it('publica o curso de regulagem e o fundo do assento', () => {
    const malha = montar();
    const rotulos = [...malha.portas.values()].map((p: any) => p.rotulo ?? p.nome).sort();
    expect(rotulos).toEqual(['cursoDeRegulagem', 'fundoDoAssento']);
  });

  it('é determinística: duas execuções produzem a mesma malha', () => {
    const a = montar();
    const b = montar();
    const chave = (m: any) => JSON.stringify({
      v: [...m.V.entries()],
      f: [...m.F.entries()].map(([id, f]: any) => [id, f.v, f.parte ?? null]),
    });
    expect(chave(a)).toBe(chave(b));
  });

  it('a largura dos dois rasgos de regulagem é a declarada, nas duas mãos', () => {
    const malha = montar();
    const topo = [...malha.V.values()].filter((p: number[]) => Math.abs(p[1] - PARAMS.chapaEspessura) < 1e-9);
    for (const lado of [-1, 1]) {
      const z = lado * PARAMS.rasgoAfastamento;
      const doRasgo = topo.filter((p: number[]) => Math.abs(p[2] - z) <= PARAMS.rasgoRaio + 1e-9 && Math.abs(p[0]) < 0.05);
      const zs = doRasgo.map((p: number[]) => p[2] - z);
      expect(Math.min(...zs)).toBeCloseTo(-PARAMS.rasgoRaio, 12);
      expect(Math.max(...zs)).toBeCloseTo(PARAMS.rasgoRaio, 12);
    }
  });
});
