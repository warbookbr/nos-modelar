/* alvo-do-ajuste.test.js — a régua que decide se a receita reescrita chegou
   onde a pessoa deixou a peça na bancada. */
import { describe, expect, it } from 'vitest';
import { capturarAlvo, compararComAlvo, FORMATO_DO_ALVO, TOLERANCIA_PADRAO_MM } from './alvo-do-ajuste.js';
import { executarReceita } from './executar-receita.js';
import { receitaComParametros } from './parametros-vivos.js';
import * as bicicleta from '../../prototipos/procedural/v3/pecas/bicicleta-quadro/receita.js';

const receita = bicicleta.default ?? bicicleta;
const executar = (params) => executarReceita(params ? receitaComParametros(receita, params) : receita).neutro;

describe('capturarAlvo', () => {
  it('escreve parte por NOME, sem vértice, face nem índice de passo', () => {
    const alvo = capturarAlvo(executar(), { peca: 'bicicleta-quadro' });
    expect(alvo.formato).toBe(FORMATO_DO_ALVO);
    expect(alvo.toleranciaMm).toBe(TOLERANCIA_PADRAO_MM);
    expect(alvo.partes.length).toBeGreaterThan(0);
    for (const parte of alvo.partes) {
      expect(Object.keys(parte).sort()).toEqual(['max', 'min', 'parte']);
      expect(typeof parte.parte).toBe('string');
    }
    const texto = JSON.stringify(alvo);
    expect(texto).not.toMatch(/\b(vertice|vértice|face|passo|indice|índice)\b/i);
  });

  it('é determinístico: a mesma peça escreve o mesmo alvo', () => {
    const a = capturarAlvo(executar(), { peca: 'bicicleta-quadro' });
    const b = capturarAlvo(executar(), { peca: 'bicicleta-quadro' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('recusa captura sem peça e com tolerância não positiva', () => {
    expect(() => capturarAlvo(executar(), {})).toThrow(/peca/);
    expect(() => capturarAlvo(executar(), { peca: 'x', toleranciaMm: 0 })).toThrow(/toleranciaMm/);
  });
});

describe('compararComAlvo', () => {
  it('a peça contra o alvo dela mesma dá diferença zero', () => {
    const alvo = capturarAlvo(executar(), { peca: 'bicicleta-quadro' });
    const veredito = compararComAlvo(executar(), alvo);
    expect(veredito.dentro).toBe(true);
    /* Não é zero exato porque o alvo guarda metro com seis casas, e um milésimo
       de milímetro é o piso dessa escrita. O que importa é que o piso está três
       ordens de grandeza abaixo da tolerância de meio milímetro. */
    expect(veredito.piorMm).toBeLessThan(0.002);
  });

  /* O CASO QUE FALHA HOJE. O alvo abaixo é a bicicleta com o balanço 12 mm mais
     longo — o mesmo ajuste que o autor tentou fazer com a seta e que a bancada
     não comportou. Nada no repositório sabe partir deste alvo e devolver a
     receita que chega nele; o que existe é a régua que reprova a receita antiga
     e aprova a nova. A rodada de absorção é o que falta no meio. */
  it('reprova a receita antiga contra um alvo ajustado, com a diferença medida', () => {
    const ajustada = executar({ ...receita.PARAMS, balancoTraseiro: receita.PARAMS.balancoTraseiro + 12 });
    const alvo = capturarAlvo(ajustada, { peca: 'bicicleta-quadro', base: 'balancoTraseiro=502' });

    const veredito = compararComAlvo(executar(), alvo);
    expect(veredito.dentro).toBe(false);
    expect(veredito.piorMm).toBeGreaterThan(TOLERANCIA_PADRAO_MM);

    const balanco = veredito.partes.find((p) => p.parte === 'balancoInferiorEsq');
    expect(balanco.dentro).toBe(false);
  });

  it('aprova a receita que chega no alvo', () => {
    const params = { ...receita.PARAMS, balancoTraseiro: receita.PARAMS.balancoTraseiro + 12 };
    const alvo = capturarAlvo(executar(params), { peca: 'bicicleta-quadro' });
    const veredito = compararComAlvo(executar(params), alvo);
    expect(veredito.dentro).toBe(true);
  });

  it('parte que sumiu na reescrita reprova, por mais perto que as outras fiquem', () => {
    const alvo = capturarAlvo(executar(), { peca: 'bicicleta-quadro' });
    alvo.partes.push({ parte: 'parteQueNaoExiste', min: [0, 0, 0], max: [1, 1, 1] });
    const veredito = compararComAlvo(executar(), alvo);
    expect(veredito.dentro).toBe(false);
    expect(veredito.ausentes).toEqual(['parteQueNaoExiste']);
    expect(veredito.piorMm).toBe(Infinity);
  });

  it('recusa alvo de formato desconhecido em vez de comparar por engano', () => {
    expect(() => compararComAlvo(executar(), { formato: 'outra-coisa/9', partes: [] })).toThrow(/formato/);
  });
});
