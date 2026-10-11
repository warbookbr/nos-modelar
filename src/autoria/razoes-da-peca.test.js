/* razoes-da-peca.test.js — as razões que a receita declara, medidas na malha da peça executada: a picape de altura 0,29 do
   comprimento fora da faixa [0,30, 0,40] e a de 0,33 dentro, as partes como formas da medida e as declarações inválidas. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from './executar-receita.js';
import { conferirRazoesDaPeca, normalizarRazoesDaPeca, textoDaRazao } from './razoes-da-peca.js';

/* Um corpo de 5 m de comprimento (z) e 1,8 m de largura, com uma cabine de meio metro por cima: a altura é a do corpo mais 0,5 m. */
function picape(alturaDoCorpo) {
  const { neutro } = executarReceita({
    PASSOS: [
      ['cubo', { origemId: 1, larg: 1.8, alt: alturaDoCorpo, prof: 5, em: [0, 0, 0] }],
      ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 1 } } }],
      ['cubo', { origemId: 2, larg: 1.7, alt: 0.5, prof: 1.5, em: [0, alturaDoCorpo, -0.8] }],
      ['parte', { nome: 'cabine', sel: { origem: { op: 'cubo', id: 2 } } }],
    ],
  });
  expect(neutro.orfaos).toEqual([]);
  return neutro;
}
const alturaPeloComprimento = (faixa = [0.3, 0.4], extra = {}) => ({ nome: 'alturaPeloComprimento', origem: 'ficha', mede: { razao: ['alturaTotal', 'profundidadeTotal'], faixa }, ...extra });
const medir = (neutro, declaradas) => conferirRazoesDaPeca({ razoes: normalizarRazoesDaPeca(declaradas), neutro });

describe('a razão medida na malha da peça', () => {
  it('a picape com altura de 0,29 do comprimento fica fora da faixa [0,30, 0,40], e a de 0,33 dentro', () => {
    const baixa = medir(picape(0.95), [alturaPeloComprimento()]);
    expect(baixa.ok).toBe(false);
    expect(baixa.medidas[0]).toMatchObject({ lida: true, tipo: 'razao', medido: 0.29, desvio: -0.01, ok: false, a_mm: 1450, b_mm: 5000, origem: 'ficha', faixa: [0.3, 0.4] });
    expect(textoDaRazao(baixa.medidas[0])).toBe('alturaPeloComprimento: razão 0,29 (1450 mm sobre 5000 mm) abaixo da faixa 0,3 a 0,4 por 0,01 (origem: ficha)');
    const boa = medir(picape(1.15), [alturaPeloComprimento()]);
    expect(boa.ok).toBe(true);
    expect(boa.medidas[0]).toMatchObject({ medido: 0.33, desvio: 0, ok: true, a_mm: 1650, b_mm: 5000 });
  });

  it('as formas da medida são as partes da peça, por nome ou padrão, e as faces e o centro delas valem como pontos', () => {
    const r = medir(picape(1.15), [
      { nome: 'cabinePeloCorpo', origem: 'foto', mede: { razao: [{ caixa: 'z', formas: ['cabine'] }, { caixa: 'z', formas: ['corpo'] }], faixa: [0.29, 0.31] } },
      { nome: 'padrao', origem: 'ia', mede: { razao: [{ caixa: 'x', formas: ['cab*'] }, { caixa: 'x', formas: ['corpo'] }], faixa: [0.9, 1] } },
      { nome: 'pelasFaces', origem: 'ficha', mede: { razao: [{ distancia: ['corpo.-y', 'cabine.+y'], eixo: 'y' }, { distancia: ['corpo.-z', 'corpo.+z'], eixo: 'z' }], faixa: [0.32, 0.34] } },
      { nome: 'doPontoLiteral', origem: 'ficha', mede: { razao: [{ distancia: [[0, 0, 0], 'cabine.centro'], eixo: 'y' }, 'profundidadeTotal'], faixa: [0.27, 0.29] } },
    ]);
    expect(r.resumo).toEqual({ total: 4, lidas: 4, naoLidas: 0, reprovadas: 0 });
    expect(r.medidas.map((m) => m.medido)).toEqual([0.3, 0.9444, 0.33, 0.28]);
    expect(r.ok).toBe(true);
  });

  it('a razão que não se lê não é aprovada: volta com o motivo e a peça fica reprovada', () => {
    const r = medir(picape(1.15), [
      alturaPeloComprimento(),
      { nome: 'semParte', origem: 'ficha', mede: { razao: [{ caixa: 'y', formas: ['capo'] }, 'profundidadeTotal'], faixa: [0.1, 0.2] } },
      { nome: 'denominadorZero', origem: 'ficha', mede: { razao: ['alturaTotal', { distancia: ['corpo.centro', 'corpo.centro'] }], faixa: [0.1, 0.2] } },
    ]);
    expect(r.ok).toBe(false);
    expect(r.medidas.map((m) => m.lida)).toEqual([true, false, false]);
    expect(textoDaRazao(r.medidas[1])).toBe('semParte: não pôde ser lida ("capo" não é uma forma visível da opção)');
    expect(r.medidas[2].motivo).toBe('o denominador da razão mede 0 mm');
  });

  it('é determinístico', () => {
    const a = JSON.stringify(medir(picape(1.15), [alturaPeloComprimento()]));
    expect(JSON.stringify(medir(picape(1.15), [alturaPeloComprimento()]))).toBe(a);
  });
});

describe('RAZOES', () => {
  it('ausente não declara razão nenhuma', () => {
    expect(normalizarRazoesDaPeca(undefined)).toBeNull();
    expect(normalizarRazoesDaPeca(null)).toBeNull();
  });

  it('canonicaliza e é idempotente', () => {
    const lida = normalizarRazoesDaPeca([alturaPeloComprimento([0.3, 0.4], { nome: ' alturaPeloComprimento ' })]);
    expect(lida).toEqual([{ nome: 'alturaPeloComprimento', origem: 'ficha', mede: { razao: ['alturaTotal', 'profundidadeTotal'], faixa: [0.3, 0.4] } }]);
    expect(normalizarRazoesDaPeca(lida)).toEqual(lida);
  });

  it.each([
    [[], /lista com ao menos uma razão/],
    [{}, /lista com ao menos uma razão/],
    [[7], /cada razão é um objeto/],
    [[{ origem: 'ficha', mede: { razao: ['alturaTotal', 'larguraTotal'], faixa: [1, 2] } }], /falta o 'nome'/],
    [[alturaPeloComprimento(), alturaPeloComprimento()], /o nome 'alturaPeloComprimento' está repetido/],
    [[alturaPeloComprimento([0.3, 0.4], { origem: 'adivinhei' })], /'origem' precisa ser uma de ficha, foto, ia, referencia/],
    [[alturaPeloComprimento([0.3, 0.4], { valor: 1450 })], /o campo 'valor' não existe/],
    [[alturaPeloComprimento([0.4, 0.3])], /'mede.faixa' precisa ser \[min, max\] com 0 <= min < max/],
    [[alturaPeloComprimento([0.3])], /'mede.faixa' precisa ser \[min, max\]/],
    [[{ nome: 'm', origem: 'ficha', mede: { razao: ['alturaTotal'], faixa: [1, 2] } }], /'mede' precisa ser \{ razao: \[A, B\], faixa: \[min, max\] \}/],
    [[{ nome: 'm', origem: 'ficha', mede: { razao: ['alturaTotl', 'larguraTotal'], faixa: [1, 2] } }], /'alturaTotl' não é uma medida/],
    [[{ nome: 'm', origem: 'ficha', mede: { razao: [{ caixa: 'w' }, 'larguraTotal'], faixa: [1, 2] } }], /'caixa' precisa ser um eixo/],
    [[{ nome: 'm', origem: 'ficha', mede: { razao: [{ razao: ['alturaTotal', 'larguraTotal'], faixa: [1, 2] }, 'larguraTotal'], faixa: [1, 2] } }], /uma razão não entra em outra razão/],
    [[{ nome: 'm', origem: 'ficha', mede: { razao: ['alturaTotal', 'larguraTotal'], faixa: [1, 2], tolerancia: 1 } }], /'mede.tolerancia' não existe/],
  ])('recusa %j', (valor, mensagem) => {
    expect(() => normalizarRazoesDaPeca(valor)).toThrow(mensagem);
  });
});
