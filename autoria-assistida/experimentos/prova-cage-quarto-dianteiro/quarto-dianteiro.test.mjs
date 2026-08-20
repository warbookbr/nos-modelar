/* Testes da cage do quarto dianteiro e da forma não automotiva. O que se prova
   aqui é o que P2 exige: abertura real, retorno de borda, regiões da mesma
   superfície, alteração local e ausência de vocabulário de carro. */
import { describe, expect, it } from 'vitest';
import { construirQuartoDianteiro, ALVO } from './quarto-dianteiro.mjs';
import { construirInvolucro } from './forma-nao-automotiva.mjs';
import { elevarLoop, loopsTocados } from './alteracao-local.mjs';
import { validarCage, espelhar } from './cage.mjs';
import { subdividir, malhaCanonica, topologia } from './subdividir.mjs';
import { extraordinariosInternos } from './compilar.mjs';

const cage = construirQuartoDianteiro();

describe('a cage do quarto dianteiro', () => {
  it('é válida contra o contrato de P1', () => {
    expect(validarCage(cage).problemas).toEqual([]);
  });

  it('cabe folgada no teto de 800 quads do critério de descarte', () => {
    expect(cage.F.size).toBeLessThanOrEqual(800);
  });

  it('é autorada em meia carroceria, sem vértice do outro lado', () => {
    for (const p of cage.V.values()) expect(p[0]).toBeGreaterThanOrEqual(-1e-9);
  });

  it('tem capô, para-lama e lateral como regiões da MESMA superfície', () => {
    const partes = new Set([...cage.F.values()].map((f) => f.parte));
    expect(partes.has('capo')).toBe(true);
    expect(partes.has('paralamaDianteiro')).toBe(true);
    expect(partes.has('lateralDianteira')).toBe(true);
    /* uma malha só: nenhum componente solto */
    const { arestas } = topologia([...cage.F.values()]);
    const pai = new Map([...cage.V.keys()].map((v) => [v, v]));
    const achar = (v) => (pai.get(v) === v ? v : (pai.set(v, achar(pai.get(v))), pai.get(v)));
    for (const e of arestas.values()) pai.set(achar(e.a), achar(e.b));
    const usados = new Set([...cage.F.values()].flatMap((f) => f.vs));
    expect(new Set([...usados].map(achar)).size).toBe(1);
  });
});

describe('a abertura de roda', () => {
  it('é abertura de verdade: faces saíram por topologia, sem booleana', () => {
    expect(cage.arcoRemovido).toBeGreaterThan(0);
  });

  it('tem o contorno sobre o círculo do arco, e não um entalhe retangular', () => {
    const naSoleira = new Set(cage.grade.map((l) => l[l.length - 1]));
    const doArco = cage.loops.arcoDianteiro.v.filter((v) => !naSoleira.has(v));
    expect(doArco.length).toBeGreaterThan(4);
    for (const v of doArco) {
      const p = cage.V.get(v);
      const r = Math.hypot(p[2] - ALVO.zEixo, p[1] - ALVO.rodaRaio);
      expect(Math.abs(r - ALVO.arcoRaio)).toBeLessThan(1);
    }
  });

  it('tem retorno de borda, e não recorte pintado', () => {
    const retorno = [...cage.F.values()].filter((f) => f.parte === 'arcoDianteiroRetorno');
    expect(retorno.length).toBeGreaterThan(6);
  });

  it('deixa folga entre o arco e o pneu', () => {
    expect(ALVO.arcoRaio - ALVO.rodaRaio).toBeGreaterThanOrEqual(40);
  });
});

describe('compilação', () => {
  const inteira = espelhar(cage);

  it('quadruplica as faces por nível', () => {
    expect(subdividir(inteira, 1).F.size).toBe(inteira.F.size * 4);
    expect(subdividir(inteira, 2).F.size).toBe(inteira.F.size * 16);
  });

  it('fica dentro do limite de pontos extraordinários visíveis de P0', () => {
    expect(extraordinariosInternos(subdividir(inteira, 2)).length).toBeLessThanOrEqual(12);
  });

  it('preserva o nome da região da cage até o nível 2', () => {
    const nomes = new Set([...subdividir(inteira, 2).F.values()].map((f) => f.parte));
    expect(nomes.has('capo')).toBe(true);
    expect(nomes.has('paralamaDianteiro')).toBe(true);
    expect(nomes.has('arcoDianteiroRetorno')).toBe(true);
  });

  it('compila igual em execuções repetidas', () => {
    const a = JSON.stringify(malhaCanonica(subdividir(espelhar(construirQuartoDianteiro()), 2)));
    const b = JSON.stringify(malhaCanonica(subdividir(espelhar(construirQuartoDianteiro()), 2)));
    expect(a).toBe(b);
  });
});

describe('alteração local', () => {
  it('é declarada por NOME de loop, não por lista de vértices', () => {
    expect(() => elevarLoop(cage, 'loopQueNaoExiste', 25)).toThrow(/não existe/);
  });

  it('mantém a topologia intacta: muda forma, não estrutura', () => {
    const depois = elevarLoop(cage, 'cristaParalama', 25);
    expect(subdividir(espelhar(depois), 2).F.size).toBe(subdividir(espelhar(cage), 2).F.size);
  });

  it('toca a crista e ENCOSTA em duas outras linhas de caráter, por 1 e 2 vértices', () => {
    /* O critério de descarte de P0 pede que a alteração local toque UM loop
       nomeado. A medida dá três, e a causa continua sendo a mesma: pontas
       compartilhadas onde linhas de caráter se encontram, não regiões
       acopladas. A crista divide 2 vértices com a base do para-brisa, onde ela
       morre no vão, e 1 vértice com o lábio do capô, onde ela morre na quina
       dianteira. Toda carroceria real tem esses encontros.

       O teste registra o fato medido e não renegocia o critério: a escolha
       entre reabrir a representação e refinar a redação do critério é do
       usuário, e está anotada no relatório de P2. */
    const depois = elevarLoop(cage, 'cristaParalama', 25);
    const movidos = [...cage.V.keys()].filter((v) => cage.V.get(v)[1] !== depois.V.get(v)[1]);
    expect(loopsTocados(cage, movidos)).toEqual(['baseParabrisa', 'cristaParalama', 'labioDoCapo']);
    const divide = (nome) => cage.loops.cristaParalama.v.filter((v) => cage.loops[nome].v.includes(v)).length;
    expect(divide('baseParabrisa')).toBe(2);
    expect(divide('labioDoCapo')).toBe(1);
    /* Nenhum vértice interior em comum: os encontros são só nas pontas. */
    const interior = cage.loops.cristaParalama.v.slice(1, -1);
    expect(interior.filter((v) => cage.loops.labioDoCapo.v.includes(v))).toEqual([]);
  });
});

describe('sem vocabulário de carro', () => {
  const involucro = construirInvolucro();

  it('o mesmo módulo constrói um invólucro que não é carro', () => {
    expect(validarCage({ ...involucro, loops: { aroDaBase: involucro.loops.aroDaBase } }).problemas).toEqual([]);
    expect(involucro.removidas).toBeGreaterThan(0);
  });

  it('a mesma subdivisão compila o invólucro', () => {
    expect(subdividir(involucro, 2).F.size).toBe(involucro.F.size * 16);
  });

  it('nenhum nome de região do invólucro vem do domínio automotivo', () => {
    const nomes = new Set([...involucro.F.values()].map((f) => f.parte));
    for (const n of nomes) expect(['base', 'capa', 'rasgoRetorno']).toContain(n);
  });
});
