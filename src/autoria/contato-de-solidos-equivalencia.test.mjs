/* contato-de-solidos-equivalencia.test.mjs — a contenção de ponto e o cruzamento de malhas, depois de os dados de cada
   triângulo passarem a ser calculados uma vez por malha (2026-10-28), dão o MESMO resultado de antes.

   As funções do bloco "REFERÊNCIA" são a cópia literal das que o módulo tinha até então (a contenção sem o atalho da
   caixa, que não mudou). O teste sorteia malhas abertas de triângulos em grade inteira, onde há empates, coplanaridade,
   triângulos degenerados e pontos exatamente sobre a superfície, em escala de metro e de milímetro, e exige igualdade
   exata do veredito de cada ponto e de cada par de malhas. */
import { describe, expect, it } from 'vitest';
import { malhasSeInterseccionam, pontoDentroMalha } from './contato-de-solidos.js';

/* ===== REFERÊNCIA: o código anterior, sem alteração ===== */
const EPS = 1e-12;
const DIRECAO_RAIO = [1, 0.3713906763541037, 0.1932731453127433];
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function comprimento2(a) { return dot(a, a); }
function sobreposicaoTriangulo(a, b, tolerancia) {
  const eixos = [];
  /* O eixo é o produto vetorial de dois vetores e só é descartado quando é nulo diante deles (vetores paralelos): a
     comparação é relativa ao tamanho dos dois, porque o piso absoluto de 1e-12 sobre o quadrado do eixo jogava fora os
     eixos de qualquer triângulo de milímetros (a metro por unidade), e com eles a separação. */
  const adicionar = (u, v) => {
    const eixo = cross(u, v);
    if (comprimento2(eixo) > 1e-18 * comprimento2(u) * comprimento2(v)) eixos.push(eixo);
  };
  const arestasA = [sub(a[1], a[0]), sub(a[2], a[1]), sub(a[0], a[2])];
  const arestasB = [sub(b[1], b[0]), sub(b[2], b[1]), sub(b[0], b[2])];
  const normalA = cross(arestasA[0], sub(a[2], a[0]));
  const normalB = cross(arestasB[0], sub(b[2], b[0]));
  adicionar(arestasA[0], sub(a[2], a[0])); adicionar(arestasB[0], sub(b[2], b[0]));
  for (const arestaA of arestasA) {
    for (const arestaB of arestasB) adicionar(arestaA, arestaB);
  }
  /* DOIS TRIÂNGULOS NO MESMO PLANO. As arestas de um e de outro são paralelas ao plano, então todos os produtos acima
     dão a normal, e nenhum eixo enxerga a separação dentro do plano: dois triângulos coplanares e afastados saíam como
     "se cruzam". O eixo que separa é a perpendicular de cada aresta dentro do plano do próprio triângulo. */
  for (const [normal, arestas] of [[normalA, arestasA], [normalB, arestasB]]) {
    if (comprimento2(normal) > 0) for (const aresta of arestas) adicionar(normal, aresta);
  }
  for (const eixo of eixos) {
    /* o eixo vai normalizado para a tolerância ser uma distância, e não depender do tamanho do triângulo */
    const norma = Math.sqrt(comprimento2(eixo));
    const valoresA = a.map((ponto) => dot(eixo, ponto) / norma);
    const valoresB = b.map((ponto) => dot(eixo, ponto) / norma);
    if (Math.max(...valoresA) < Math.min(...valoresB) - tolerancia
      || Math.max(...valoresB) < Math.min(...valoresA) - tolerancia) return false;
  }
  return true;
}

function pontoNoTriangulo(ponto, triangulo, tolerancia) {
  const [a, b, c] = triangulo;
  const normal = cross(sub(b, a), sub(c, a));
  const tamanhoDaNormal = Math.sqrt(comprimento2(normal));
  const distancia = Math.abs(dot(normal, sub(ponto, a))) / tamanhoDaNormal;
  if (distancia > tolerancia) return false;
  const doLado = (de, para) => {
    const aresta = sub(para, de);
    const tamanho = Math.sqrt(comprimento2(aresta));
    return tamanho > 0 ? dot(cross(aresta, sub(ponto, de)), normal) / (tamanhoDaNormal * tamanho) : 0;
  };
  return doLado(a, b) >= -tolerancia && doLado(b, c) >= -tolerancia && doLado(c, a) >= -tolerancia;
}

function raioAtravessaTriangulo(origem, triangulo, tolerancia) {
  const [a, b, c] = triangulo;
  const direcao = DIRECAO_RAIO;
  const aresta1 = sub(b, a); const aresta2 = sub(c, a);
  const h = cross(direcao, aresta2); const determinante = dot(aresta1, h);
  /* raio paralelo ao plano do triângulo: o determinante é adimensional só depois de dividido pelo tamanho dos dois
     vetores. Comparado direto com a tolerância (uma distância), ele jogava fora todo triângulo de poucos milímetros
     quadrados como "paralelo", e a contagem de cruzamentos do raio perdia faces. */
  if (Math.abs(determinante) <= 1e-12 * Math.sqrt(comprimento2(aresta1) * comprimento2(h))) return null;
  const inverso = 1 / determinante;
  const s = sub(origem, a); const u = inverso * dot(s, h);
  if (u < -tolerancia || u > 1 + tolerancia) return null;
  const q = cross(s, aresta1); const v = inverso * dot(direcao, q);
  if (v < -tolerancia || u + v > 1 + tolerancia) return null;
  const t = inverso * dot(aresta2, q);
  return t > tolerancia ? t : null;
}

function pontoDentroMalhaAntigo(ponto, malha, tolerancia) {
  let contagem = 0;
  for (const triangulo of malha.triangulos) {
    if (pontoNoTriangulo(ponto, triangulo, tolerancia)) return null;
    if (raioAtravessaTriangulo(ponto, triangulo, tolerancia) !== null) contagem += 1;
  }
  return contagem % 2 === 1;
}

function malhasSeInterseccionamAntigo(a, b, tolerancia) {
  for (const trianguloA of a.triangulos) for (const trianguloB of b.triangulos) {
    if (sobreposicaoTriangulo(trianguloA, trianguloB, tolerancia)) return true;
  }
  return false;
}


/* ===== fim da referência ===== */

function gerador(semente) {
  let s = semente >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function sortearMalha(aleatorio, { quantidade, grade, escala, deslocamento }) {
  const ponto = () => [0, 1, 2].map((e) => (Math.floor(aleatorio() * grade) + deslocamento[e]) * escala);
  const triangulos = [];
  for (let i = 0; i < quantidade; i += 1) triangulos.push([ponto(), ponto(), ponto()]);
  return { triangulos, fechada: false };
}

const CONFIGURACOES = [
  { grade: 3, escala: 1 }, { grade: 4, escala: 0.001 }, { grade: 6, escala: 1 }, { grade: 9, escala: 0.25 }, { grade: 5, escala: 1e-4 },
];

describe('contato de sólidos: os dados por triângulo calculados uma vez não mudam o veredito', () => {
  it('a contenção de ponto é igual à de antes, ponto a ponto, em malhas sorteadas', () => {
    let nulos = 0; let dentro = 0; let fora = 0;
    for (let semente = 1; semente <= 60; semente += 1) {
      const aleatorio = gerador(semente);
      const { grade, escala } = CONFIGURACOES[semente % CONFIGURACOES.length];
      const malha = sortearMalha(aleatorio, { quantidade: 4 + (semente % 14), grade, escala, deslocamento: [0, 0, 0] });
      for (let k = 0; k < 150; k += 1) {
        const ponto = k < 75
          ? [0, 1, 2].map(() => Math.floor(aleatorio() * (grade + 1)) * escala)
          : [0, 1, 2].map(() => (aleatorio() * (grade + 1) - 0.5) * escala);
        for (const tolerancia of [1e-9, 0, 1e-3 * escala]) {
          const novo = pontoDentroMalha(ponto, malha, tolerancia);
          const antigo = pontoDentroMalhaAntigo(ponto, malha, tolerancia);
          expect(novo, `semente ${semente} ponto ${k}`).toBe(antigo);
          if (antigo === null) nulos += 1; else if (antigo) dentro += 1; else fora += 1;
        }
      }
    }
    /* o sorteio tem de exercitar os três vereditos, senão a igualdade não prova nada sobre eles */
    expect(nulos).toBeGreaterThan(200);
    expect(dentro).toBeGreaterThan(200);
    expect(fora).toBeGreaterThan(200);
  });

  it('o cruzamento de malhas é igual ao de antes, par a par, em malhas sorteadas', () => {
    let cruzam = 0; let separadas = 0;
    for (let semente = 1; semente <= 400; semente += 1) {
      const aleatorio = gerador(1000 + semente);
      const { grade, escala } = CONFIGURACOES[semente % CONFIGURACOES.length];
      const a = sortearMalha(aleatorio, { quantidade: 1 + (semente % 6), grade, escala, deslocamento: [0, 0, 0] });
      const b = sortearMalha(aleatorio, { quantidade: 1 + ((semente >> 2) % 6), grade, escala, deslocamento: [semente % 3 === 0 ? grade : 0, 0, 0] });
      for (const tolerancia of [1e-9, 0, 1e-3 * escala]) {
        const novo = malhasSeInterseccionam(a, b, tolerancia);
        const antigo = malhasSeInterseccionamAntigo(a, b, tolerancia);
        expect(novo, `semente ${semente}`).toBe(antigo);
        if (antigo) cruzam += 1; else separadas += 1;
      }
    }
    expect(cruzam).toBeGreaterThan(100);
    expect(separadas).toBeGreaterThan(100);
  });
});
