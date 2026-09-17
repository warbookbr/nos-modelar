/* alvo-do-ajuste.test.js — a régua que decide se a receita reescrita chegou
   onde a pessoa deixou a peça na bancada. */
import { describe, expect, it } from 'vitest';
import { capturarAlvo, compararComAlvo, FORMATO_DO_ALVO, TOLERANCIA_PADRAO_MM } from './alvo-do-ajuste.js';
import { descreverPeca } from './descrever-partes.js';
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
      expect(Object.keys(parte).sort()).toEqual(['faces', 'max', 'min', 'parte', 'pontos']);
      expect(typeof parte.parte).toBe('string');
      expect(Array.isArray(parte.pontos)).toBe(true);
      /* `faces` é CONTAGEM, e não identidade: um número, nunca uma lista de
         ids. É o que deixa a rodada de absorção enxergar duplicar e criar face,
         que não movem ponto nenhum. */
      expect(Number.isInteger(parte.faces)).toBe(true);
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

  /* O CASO DE FALHA DA MEDIDA POR CAIXA. Mover um vértice no meio de um tubo
     não altera a caixa envolvente da parte (min e max permanecem os mesmos),
     mas muda a geometria real da peça. A comparação pontual acusa a deformação
     em milímetros e reprova a receita que não a absorveu. */
  it('reprova vértice movido no meio de um tubo que a caixa envolvente não enxerga', () => {
    const neutroOriginal = executar();
    const partesOrig = descreverPeca(neutroOriginal).partes;
    const caixaTubo = partesOrig.find((p) => p.nome === 'tuboSuperior');
    const facesTubo = [...neutroOriginal.F.values()].filter((f) => f.parte === 'tuboSuperior');
    const idsTubo = [...new Set(facesTubo.flatMap((f) => f.vs))];

    const idInterno = idsTubo.find((id) => {
      const pt = neutroOriginal.V.get(id);
      return pt[0] > caixaTubo.min[0] + 0.005 && pt[0] < caixaTubo.max[0] - 0.005
        && pt[1] > caixaTubo.min[1] + 0.005 && pt[1] < caixaTubo.max[1] - 0.005
        && pt[2] > caixaTubo.min[2] + 0.005 && pt[2] < caixaTubo.max[2] - 0.005;
    });
    expect(idInterno).toBeDefined();

    const ptOrig = neutroOriginal.V.get(idInterno);
    const deslocamentoM = 0.005; // 5 mm
    const novoV = new Map(neutroOriginal.V);
    novoV.set(idInterno, [ptOrig[0] + deslocamentoM, ptOrig[1], ptOrig[2]]);
    const neutroDeformado = { ...neutroOriginal, V: novoV };

    const partesDeform = descreverPeca(neutroDeformado).partes;
    const caixaDeform = partesDeform.find((p) => p.nome === 'tuboSuperior');
    expect(caixaDeform.min).toEqual(caixaTubo.min);
    expect(caixaDeform.max).toEqual(caixaTubo.max);

    const alvoDeformado = capturarAlvo(neutroDeformado, { peca: 'bicicleta-quadro' });
    const veredito = compararComAlvo(neutroOriginal, alvoDeformado);

    expect(veredito.dentro).toBe(false);
    expect(veredito.piorMm).toBeGreaterThanOrEqual(4.99);
    expect(veredito.piorMm).toBeLessThanOrEqual(5.01);

    const parteTubo = veredito.partes.find((p) => p.parte === 'tuboSuperior');
    expect(parteTubo.dentro).toBe(false);
    expect(parteTubo.desvioMm).toBeGreaterThanOrEqual(4.99);
    expect(parteTubo.desvioMm).toBeLessThanOrEqual(5.01);
    for (const v of parteTubo.centroMm) expect(Math.abs(v)).toBeLessThan(0.001);
    for (const v of parteTubo.dimensaoMm) expect(Math.abs(v)).toBeLessThan(0.001);
  });
});

/* PARTE A MAIS OU A MENOS. É a pergunta da fatia 1 do plano "Topologia, mover a
   peça, e ler o gesto": a rodada de absorção sabe lidar com peça que ganhou ou
   perdeu parte? Sabe, e a régua acusa nos dois sentidos — depois de uma
   correção, porque parte sobrando saía com `piorMm` de 0,000916. */
describe('peça que ganhou ou perdeu parte', () => {
  const semUmaParte = (neutro, parte) => ({
    ...neutro,
    F: new Map([...neutro.F].filter(([, face]) => face.parte !== parte)),
  });
  const renomeando = (neutro, de, para) => ({
    ...neutro,
    F: new Map([...neutro.F].map(([id, face]) => [id, face.parte === de ? { ...face, parte: para } : face])),
  });

  it('parte sobrando reprova, e não passa por diferença pequena', () => {
    const alvo = capturarAlvo(semUmaParte(executar(), 'tuboSuperior'), { peca: 'bicicleta-quadro' });
    const veredito = compararComAlvo(executar(), alvo);
    expect(veredito.dentro).toBe(false);
    expect(veredito.sobrando).toEqual(['tuboSuperior']);
    expect(veredito.piorMm).toBe(Infinity);
  });

  it('a receita que também perdeu a parte chega no alvo', () => {
    const editada = semUmaParte(executar(), 'tuboSuperior');
    const alvo = capturarAlvo(editada, { peca: 'bicicleta-quadro' });
    expect(compararComAlvo(editada, alvo).dentro).toBe(true);
  });

  it('parte nova é acusada como ausente na receita antiga, e alcançada pela nova', () => {
    const editada = renomeando(executar(), 'tuboSuperior', 'reforcoNovo');
    const alvo = capturarAlvo(editada, { peca: 'bicicleta-quadro' });
    const antiga = compararComAlvo(executar(), alvo);
    expect(antiga.ausentes).toEqual(['reforcoNovo']);
    expect(antiga.sobrando).toEqual(['tuboSuperior']);
    expect(compararComAlvo(editada, alvo).dentro).toBe(true);
  });
});
