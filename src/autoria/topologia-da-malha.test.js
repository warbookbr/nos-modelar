/* topologia-da-malha.test.js — as operações que mudam a malha, medidas na
   bicicleta: quantas faces e vértices nascem, quem some, e o que fica no lugar. */
import { describe, expect, it } from 'vitest';
import { apagar, criarFace, duplicar, escalar, extrudar, rotacionar, verticesAlcancados } from './topologia-da-malha.js';
import { executarReceita } from './executar-receita.js';
import { descreverPeca } from './descrever-partes.js';
import * as bicicleta from '../../prototipos/procedural/v3/pecas/bicicleta-quadro/receita.js';

const receita = bicicleta.default ?? bicicleta;
const base = () => executarReceita(receita).neutro;
const umaFaceDe = (neutro, parte) => [...neutro.F.values()].find((f) => f.parte === parte);
const partesDe = (neutro) => new Set([...neutro.F.values()].map((f) => f.parte));

describe('verticesAlcancados', () => {
  it('a face alcança os vértices dela', () => {
    const neutro = base();
    const face = umaFaceDe(neutro, 'tuboSelim');
    const alcancados = verticesAlcancados(neutro, { modo: 'face', selecionados: [String(face.id)] });
    expect([...alcancados].sort()).toEqual([...face.vs].sort());
  });
});

describe('extrudar', () => {
  it('a face vira uma casca: topo novo, paredes, e o fundo sai', () => {
    const neutro = base();
    const face = umaFaceDe(neutro, 'tuboSelim');
    const antes = neutro.F.size;
    const { neutro: depois, selecionados, mudou } = extrudar(neutro, { modo: 'face', selecionados: [String(face.id)] });

    expect(mudou).toBe(true);
    /* Uma face vira: o topo, mais uma parede por aresta, menos o fundo. */
    expect(depois.F.size).toBe(antes + face.vs.length);
    expect(depois.F.has(face.id)).toBe(false);
    expect(selecionados).toHaveLength(1);
    expect(depois.F.get(Number(selecionados[0])).parte).toBe('tuboSelim');
  });

  /* A face nova nasce AFASTADA, e não em cima da antiga: parede de área zero é
     face degenerada, e o motor recusa. O afastamento acompanha o tamanho da
     face, então a mesma operação serve num tubo grande e num pequeno. */
  it('a face nova nasce afastada pela normal, com as paredes tendo área', () => {
    const neutro = base();
    const face = umaFaceDe(neutro, 'tuboSelim');
    const { neutro: depois, selecionados } = extrudar(neutro, { modo: 'face', selecionados: [String(face.id)] });
    const nova = depois.F.get(Number(selecionados[0]));

    const distancias = nova.vs.map((v, i) => {
      const a = depois.V.get(v);
      const b = neutro.V.get(face.vs[i]);
      return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    });
    /* Todos os cantos andam a MESMA distância: a face nova é paralela à antiga,
       e não torta. */
    for (const d of distancias) {
      expect(d).toBeGreaterThan(1e-6);
      expect(d).toBeCloseTo(distancias[0], 9);
    }
  });

  it('a extrusão não cria parte nova: a casca fica no tubo do selim', () => {
    const neutro = base();
    const face = umaFaceDe(neutro, 'tuboSelim');
    const { neutro: depois } = extrudar(neutro, { modo: 'face', selecionados: [String(face.id)] });
    expect(partesDe(depois)).toEqual(partesDe(neutro));
  });

  it('sem face inteira na seleção não extruda nada', () => {
    const neutro = base();
    expect(extrudar(neutro, { modo: 'vertice', selecionados: [] }).mudou).toBe(false);
  });
});

describe('duplicar', () => {
  it('a cópia nasce solta, no mesmo lugar, sem parede ligando', () => {
    const neutro = base();
    const face = umaFaceDe(neutro, 'tuboSelim');
    const { neutro: depois, selecionados, mudou } = duplicar(neutro, { modo: 'face', selecionados: [String(face.id)] });
    expect(mudou).toBe(true);
    expect(depois.F.size).toBe(neutro.F.size + 1);
    expect(depois.F.has(face.id)).toBe(true);
    const copia = depois.F.get(Number(selecionados[0]));
    expect(copia.vs.some((v) => face.vs.includes(v))).toBe(false);
  });
});

describe('apagar', () => {
  it('apagar a face tira só ela', () => {
    const neutro = base();
    const face = umaFaceDe(neutro, 'tuboSelim');
    const { neutro: depois } = apagar(neutro, { modo: 'face', selecionados: [String(face.id)] });
    expect(depois.F.size).toBe(neutro.F.size - 1);
    expect(depois.F.has(face.id)).toBe(false);
  });

  it('apagar vértice leva junto toda face que o usava', () => {
    const neutro = base();
    const face = umaFaceDe(neutro, 'tuboSelim');
    const vertice = face.vs[0];
    const quantasUsavam = [...neutro.F.values()].filter((f) => f.vs.includes(vertice)).length;
    const { neutro: depois } = apagar(neutro, { modo: 'vertice', selecionados: [String(vertice)] });
    expect(depois.F.size).toBe(neutro.F.size - quantasUsavam);
    expect(depois.V.has(vertice)).toBe(false);
  });

  it('apagar a peça inteira faz a parte sumir, que é o caso que a absorção precisa tratar', () => {
    const neutro = base();
    const doTubo = [...neutro.F.values()].filter((f) => f.parte === 'tuboSuperior').map((f) => String(f.id));
    const { neutro: depois } = apagar(neutro, { modo: 'face', selecionados: doTubo });
    expect(partesDe(depois).has('tuboSuperior')).toBe(false);
    expect(descreverPeca(depois).partes.map((p) => p.nome)).not.toContain('tuboSuperior');
  });
});

describe('criarFace', () => {
  it('três vértices viram face, herdando a parte de quem já os usava', () => {
    const neutro = base();
    const face = umaFaceDe(neutro, 'tuboSelim');
    const { neutro: depois, selecionados, mudou } = criarFace(neutro, {
      modo: 'vertice', selecionados: face.vs.slice(0, 3).map(String),
    });
    expect(mudou).toBe(true);
    expect(depois.F.get(Number(selecionados[0])).parte).toBe('tuboSelim');
    expect(depois.F.size).toBe(neutro.F.size + 1);
  });

  it('menos de três vértices não cria face, e diz por quê', () => {
    const neutro = base();
    const resultado = criarFace(neutro, { modo: 'vertice', selecionados: ['0', '1'] });
    expect(resultado.mudou).toBe(false);
    expect(resultado.motivo).toMatch(/três/);
  });
});

describe('rotacionar e escalar', () => {
  it('girar meia volta em y devolve a peça ao mesmo lugar depois de duas vezes', () => {
    const neutro = base();
    const face = umaFaceDe(neutro, 'tuboSelim');
    const estado = { modo: 'face', selecionados: [String(face.id)] };
    const meia = rotacionar(neutro, estado, { eixo: 1, angulo: Math.PI }).neutro;
    const inteira = rotacionar(meia, estado, { eixo: 1, angulo: Math.PI }).neutro;
    for (const v of face.vs) {
      for (const i of [0, 1, 2]) expect(inteira.V.get(v)[i]).toBeCloseTo(neutro.V.get(v)[i], 9);
    }
  });

  it('girar mexe só na seleção', () => {
    const neutro = base();
    const face = umaFaceDe(neutro, 'tuboSelim');
    const alcancados = verticesAlcancados(neutro, { modo: 'face', selecionados: [String(face.id)] });
    const depois = rotacionar(neutro, { modo: 'face', selecionados: [String(face.id)] }, { eixo: 1, angulo: 0.3 }).neutro;
    for (const [id, ponto] of neutro.V) {
      if (alcancados.has(id)) continue;
      expect(depois.V.get(id)).toEqual(ponto);
    }
  });

  it('escalar por dois dobra a distância ao centro da seleção', () => {
    const neutro = base();
    const face = umaFaceDe(neutro, 'tuboSelim');
    const estado = { modo: 'face', selecionados: [String(face.id)] };
    const depois = escalar(neutro, estado, { fator: 2 }).neutro;
    const centro = [0, 1, 2].map((i) => face.vs.reduce((s, v) => s + neutro.V.get(v)[i], 0) / face.vs.length);
    for (const v of face.vs) {
      for (const i of [0, 1, 2]) {
        expect(depois.V.get(v)[i] - centro[i]).toBeCloseTo((neutro.V.get(v)[i] - centro[i]) * 2, 9);
      }
    }
  });

  it('escalar num eixo só não mexe nos outros dois', () => {
    const neutro = base();
    const face = umaFaceDe(neutro, 'tuboSelim');
    const depois = escalar(neutro, { modo: 'face', selecionados: [String(face.id)] }, { fator: 3, eixo: 1 }).neutro;
    for (const v of face.vs) {
      expect(depois.V.get(v)[0]).toBeCloseTo(neutro.V.get(v)[0], 12);
      expect(depois.V.get(v)[2]).toBeCloseTo(neutro.V.get(v)[2], 12);
    }
  });
});

describe('a malha de entrada nunca é tocada', () => {
  it('cada operação devolve malha nova', () => {
    const neutro = base();
    const face = umaFaceDe(neutro, 'tuboSelim');
    const antes = JSON.stringify([...neutro.V.entries()]);
    const estado = { modo: 'face', selecionados: [String(face.id)] };
    extrudar(neutro, estado);
    duplicar(neutro, estado);
    apagar(neutro, estado);
    rotacionar(neutro, estado, { eixo: 0, angulo: 1 });
    escalar(neutro, estado, { fator: 2 });
    expect(JSON.stringify([...neutro.V.entries()])).toBe(antes);
  });
});
