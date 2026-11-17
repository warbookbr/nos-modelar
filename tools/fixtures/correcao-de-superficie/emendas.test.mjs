/* emendas.test.mjs — o item 3 do gate de saída do plano das ferramentas de correção de superfície (fatia 4): nas chapas emendadas com a
 * continuidade declarada na curva da emenda (`continuidade` de `gaiolaPorRede`), `continuidade-nas-emendas.mjs` (o `npm run emendas`) mede
 * o ângulo e a razão de curvatura dentro do declarado, fora dos vértices extraordinários: G1 com o ângulo abaixo de 0,5 grau, G2 também com
 * a razão abaixo de 1,2. As mesmas chapas sem a declaração são o antes: a G1 passa de 0,5 grau nas pontas da emenda.
 *
 * A `emenda-g1-em-g2` (a superfície G1, de razão 3, com a G2 declarada) é o limite medido: a faixa iguala a curvatura no miolo da emenda,
 * a mais de três espaçamentos das pontas, e nas pontas, onde as curvas da borda trazem o salto de curvatura nos pontos-chave, a razão sobe
 * até 1,6. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { continuidadeNasEmendas } from '../../modelar/continuidade-nas-emendas.mjs';
import { receitaDeProva } from './chapas.mjs';

const LIMITE_G1_GRAUS = 0.5;
const LIMITE_G2_RAZAO = 1.2;

/* as amostras da emenda entre as duas chapas, fora dos vértices extraordinários que a gaiola declara na curva (a um espaçamento deles) */
function amostras(nome) {
  const receita = receitaDeProva(nome);
  const { json } = continuidadeNasEmendas(executarReceita(receita).neutro, { nome });
  expect(json.emendas).toHaveLength(1);
  const extra = (receita.REDE.emendas?.emenda?.extraordinarios ?? []).map((p) => receita.REDE.pontos[p].map((c) => c * 1000));
  const fora = json.emendas[0].amostras.filter((a) => extra.every((e) => Math.hypot(a[1] - e[0], a[2] - e[1], a[3] - e[2]) > 30));
  return { receita, fora, angulo: Math.max(...fora.map((a) => a[6])), razao: Math.max(...fora.map((a) => a[9])) };
}

describe('a emenda com continuidade declarada, medida por emendas', () => {
  it('G1 declarada na chapa G1: o ângulo abaixo de 0,5 grau em toda a emenda, e sem a declaração passava', () => {
    const antes = amostras('emenda-g1');
    expect(antes.angulo).toBeGreaterThan(LIMITE_G1_GRAUS);
    const depois = amostras('emenda-g1-declarada');
    expect(depois.fora.length).toBeGreaterThan(50);
    expect(depois.angulo).toBeLessThan(LIMITE_G1_GRAUS);
    /* a G1 deixa a curvatura de cada lado: a razão fica mais perto dos 3 da superfície que sem a declaração */
    expect(depois.razao).toBeGreaterThan(antes.razao);
    expect(depois.receita.REDE.emendas.emenda).toMatchObject({ continuidade: 'G1', extraordinarios: [] });
  });

  it('G2 declarada na chapa G2: o ângulo abaixo de 0,5 grau e a razão abaixo de 1,2 em toda a emenda', () => {
    const antes = amostras('emenda-g2');
    const depois = amostras('emenda-g2-declarada');
    expect(depois.fora.length).toBeGreaterThan(50);
    expect(depois.angulo).toBeLessThan(LIMITE_G1_GRAUS);
    expect(depois.razao).toBeLessThan(LIMITE_G2_RAZAO);
    expect(depois.angulo).toBeLessThan(antes.angulo);
  });

  it('G2 declarada na chapa G1: a razão abaixo de 1,2 no miolo da emenda, a mais de três espaçamentos das pontas, e o ângulo abaixo de 0,5 grau', () => {
    const { fora, angulo } = amostras('emenda-g1-em-g2');
    /* o espaçamento da gaiola ao longo da emenda é 400/14 mm; nas três fileiras de cada ponta a razão sobe até 1,6 (o limite medido) */
    const miolo = fora.filter((a) => a[0] > (3 * 400) / 14 && a[0] < 400 - (3 * 400) / 14);
    expect(miolo.length).toBeGreaterThan(30);
    expect(Math.max(...miolo.map((a) => a[9]))).toBeLessThan(LIMITE_G2_RAZAO);
    expect(angulo).toBeLessThan(LIMITE_G1_GRAUS);
  });
});
