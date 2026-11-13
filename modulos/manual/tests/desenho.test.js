/* desenho.test.js — o desenho técnico: projeção com linha visível e escondida num bloco com furo passante medido, recusa de cota mal
   declarada, cotas de duas peças do acervo, malha inalterada pelas cotas e determinismo. */
import { describe, expect, it } from 'vitest';
import { entradaDaReceita } from '../../../src/autoria/executar-receita.js';
import { validarCotas } from '../src/cotas.js';
import { desenharReceita } from '../src/desenho.mjs';
import { comprimentoDosSegmentos, prepararMalha, projetarVista } from '../src/projecao.js';
import kukri from '../../../procedural/pecas/kukri/receita.js';
import suporte from '../../../procedural/pecas/suporte-tubo/receita.js';

/* Bloco de 40 (x) por 20 (y) por 40 (z) mm com um furo quadrado de 10 mm que o atravessa em y, de x e z = 15 a 25. Em metro, como a malha neutra. */
function blocoComFuro() {
  const V = new Map(); const F = new Map();
  const v = (id, x, y, z) => V.set(id, [x / 1000, y / 1000, z / 1000]);
  const ext = [[0, 0], [40, 0], [40, 40], [0, 40]]; const int = [[15, 15], [25, 15], [25, 25], [15, 25]];
  ext.forEach(([x, z], i) => { v(i, x, 0, z); v(4 + i, x, 20, z); });
  int.forEach(([x, z], i) => { v(8 + i, x, 0, z); v(12 + i, x, 20, z); });
  let n = 0; const face = (...vs) => F.set(n++, { vs });
  for (let i = 0; i < 4; i += 1) {
    const j = (i + 1) % 4;
    face(4 + i, 4 + j, 12 + j, 12 + i); // anel de cima (normal +y)
    face(j, i, 8 + i, 8 + j); // anel de baixo
    face(i, j, 4 + j, 4 + i); // lado de fora
    face(8 + j, 8 + i, 12 + i, 12 + j); // parede do furo
  }
  return { V, F };
}
const caixa = { min: [0, 0, 0], max: [40, 20, 40] };

describe('projeção do bloco com furo passante', () => {
  const malha = prepararMalha(blocoComFuro());
  const vistas = Object.fromEntries(['frente', 'cima', 'lado'].map((v) => [v, projetarVista(malha, v, { escala: 8 })]));
  const noFuro = ([a, b, c, d], lo, hi) => [a, b, c, d].every((n) => n >= lo - 0.3 && n <= hi + 0.3);

  it('na vista de cima o furo aparece cheio e nada fica escondido', () => {
    expect(comprimentoDosSegmentos(vistas.cima.escondidos)).toBeLessThan(0.5);
    const doFuro = vistas.cima.visiveis.filter((s) => noFuro(s.map((n, i) => (i % 2 === 0 ? n : -n)), 15, 25));
    /* o aro de cima e o de baixo se veem pelo furo: ao menos um quadrado de 10 mm, 40 mm de perímetro */
    expect(comprimentoDosSegmentos(doFuro)).toBeGreaterThanOrEqual(40 - 0.5);
  });

  it.each(['frente', 'lado'])('na vista de %s o furo aparece tracejado: as quatro arestas verticais, 20 mm cada', (nome) => {
    const verticais = vistas[nome].escondidos.filter(([a, , c]) => Math.abs(a - c) < 1e-6);
    expect(verticais.length).toBeGreaterThanOrEqual(4);
    /* as pontas de cada aresta, onde ela encontra o aro visível, perdem até 1 pixel da grade (cerca de 0,1 mm a 8 px/mm) */
    const total = comprimentoDosSegmentos(verticais);
    expect(total).toBeGreaterThan(78);
    expect(total).toBeLessThanOrEqual(80.01);
    expect(verticais.every(([, b, , d]) => Math.min(b, d) >= -0.3 && Math.max(b, d) <= 20.3)).toBe(true);
  });

  it('o contorno externo do bloco sai cheio e não leva as diagonais da triangulação', () => {
    /* frente: o retângulo de 40 x 20 (arestas das faces) e nenhum segmento inclinado */
    expect(vistas.frente.visiveis.every(([a, b, c, d]) => Math.abs(a - c) < 1e-6 || Math.abs(b - d) < 1e-6)).toBe(true);
    expect(comprimentoDosSegmentos(vistas.frente.visiveis)).toBeGreaterThanOrEqual(2 * (40 + 20) - 1);
  });

  it('é determinística', () => {
    const outra = projetarVista(prepararMalha(blocoComFuro()), 'frente', { escala: 8 });
    expect(JSON.stringify(outra)).toBe(JSON.stringify(vistas.frente));
  });
});

describe('recusa de cota mal declarada', () => {
  const ok = { vista: 'frente', de: [0, 0, 0], ate: [40, 0, 0], lado: 'baixo' };
  const pontos = [{ nome: 'quina', em: [40, 20, 0] }];
  const recusa = (cota, trecho) => expect(() => validarCotas([cota], { caixa, pontos })).toThrow(trecho);

  it('aceita a cota certa, mede e resolve ponto nomeado', () => {
    const [c] = validarCotas([ok], { caixa, pontos });
    expect(c.medidaMm).toBe(40);
    const [d] = validarCotas([{ vista: 'frente', de: [0, 0, 0], ate: 'quina', lado: 'esquerda' }], { caixa, pontos });
    expect(d.ate).toEqual([40, 20, 0]);
    expect(d.medidaMm).toBe(20);
    expect(validarCotas(undefined, { caixa })).toEqual([]);
  });
  it('recusa com a mensagem do que foi recebido e do que era esperado', () => {
    recusa({ ...ok, vista: 'atras' }, /COTAS\[0\].*vista "atras" desconhecida.*Esperado: 'frente', 'cima', 'lado'/);
    recusa({ ...ok, lado: undefined }, /falta `lado`/);
    recusa({ ...ok, lado: 'meio' }, /lado "meio" desconhecido/);
    recusa({ ...ok, de: [0, 0] }, /'de' não é um ponto.*\[x, y, z\]/);
    recusa({ ...ok, ate: 'inexistente' }, /ponto 'inexistente', que a receita não declara em PONTOS.*'quina'/);
    recusa({ ...ok, ate: [0.005, 0, 0] }, /coincidem na vista 'frente'/);
    recusa({ ...ok, ate: [400, 0, 0] }, /cai fora da caixa da peça.*milímetro/);
    recusa({ ...ok, texto: '  ' }, /`texto` vazio/);
    recusa({ ...ok, afastamentoMm: -2 }, /afastamentoMm -2 inválido/);
    recusa({ tipo: 'diametro', vista: 'cima', centro: [20, 10, 20], diametro: 0 }, /diâmetro 0 inválido/);
    recusa({ tipo: 'diametro', vista: 'cima', diametro: 5 }, /'centro' não é um ponto/);
    recusa({ ...ok, tipo: 'raio' }, /tipo 'raio' desconhecido/);
  });
  it('recusa COTAS que não é lista', () => {
    expect(() => validarCotas({}, { caixa })).toThrow(/não é uma lista/);
  });
});

describe('cotas declaradas em peças do acervo', () => {
  it.each([['suporte-tubo', suporte, 7], ['kukri', kukri, 4]])('%s: desenha, cota e mede o tempo', (nome, receita, quantas) => {
    const t0 = performance.now();
    const r = desenharReceita(receita, { titulo: nome });
    const ms = performance.now() - t0;
    expect(r.cotas).toHaveLength(quantas);
    expect((r.svg.match(/class="cota-(linear|diametro)"/g) ?? []).length).toBe(quantas);
    expect(r.svg).toContain('Terceiro diedro');
    expect(comprimentoDosSegmentos(r.projecoes.cima.visiveis)).toBeGreaterThan(100);
    expect(r.tempos.totalMs).toBeLessThan(ms + 5);
    expect(ms).toBeLessThan(30000); // guarda contra travamento; o tempo real sai em r.tempos
    expect(desenharReceita(receita, { titulo: nome }).svg).toBe(r.svg);
  });

  it('o furo oblongo do suporte aparece tracejado na vista de lado e cheio na frontal', () => {
    const r = desenharReceita(suporte);
    expect(comprimentoDosSegmentos(r.projecoes.lado.escondidos)).toBeGreaterThan(30);
    expect(r.cotas.find((c) => c.tipo === 'diametro').diametro).toBe(30);
  });

  it('o cabo do kukri tem o furo do cordão tracejado na frente e a cota de Ø5,2', () => {
    const r = desenharReceita(kukri);
    expect(r.projecoes.frente.escondidos.length).toBeGreaterThan(0);
    expect(r.svg).toContain('Ø5,2');
  });

  it.each([['suporte-tubo', suporte], ['kukri', kukri]])('%s: COTAS não entra na entrada da receita (a malha não muda)', (_nome, receita) => {
    const sem = Object.defineProperties({}, Object.getOwnPropertyDescriptors(receita));
    delete sem.COTAS;
    expect(JSON.stringify(entradaDaReceita(receita))).toBe(JSON.stringify(entradaDaReceita(sem)));
  });
});
