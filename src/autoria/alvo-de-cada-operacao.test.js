/* alvo-de-cada-operacao.test.js — toda operação de topologia produz alvo que a
   régua da absorção entende, reproduz e reprova enquanto a receita não mudar. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from './executar-receita.js';
import { capturarAlvo, compararComAlvo } from './alvo-do-ajuste.js';
import { descreverGesto } from './descricao-do-gesto.js';
import {
  apagar, criarFace, duplicar, escalar, extrudar, rotacionar,
} from './topologia-da-malha.js';
import receitaDaBicicleta from '../../prototipos/procedural/v3/pecas/bicicleta-quadro/receita.js';

const PECA = 'bicicleta-quadro';
const PARTE = 'tuboSelim';

function malhaDaBicicleta() {
  return executarReceita(receitaDaBicicleta).neutro;
}

function facesDaParte(neutro, parte) {
  return [...neutro.F.values()].filter((f) => f.parte === parte).map((f) => f.id);
}

function verticesDaParte(neutro, parte) {
  const ids = new Set();
  for (const face of neutro.F.values()) {
    if (face.parte !== parte) continue;
    for (const v of face.vs) ids.add(v);
  }
  return [...ids].sort((a, b) => a - b);
}

/* Uma operação por linha, cada uma com a seleção que faz sentido para ela.
   Extrudar e duplicar pedem face; apagar leva a parte inteira embora, que é o
   caso que muda o número de partes; criar face pede vértices que ainda não
   formam face; girar e escalar pedem qualquer seleção com extensão. */
const OPERACOES = [
  ['extrudar', (n) => extrudar(n, { modo: 'face', selecionados: facesDaParte(n, PARTE).slice(0, 4) })],
  ['duplicar', (n) => duplicar(n, { modo: 'face', selecionados: facesDaParte(n, PARTE).slice(0, 4) })],
  ['apagar', (n) => apagar(n, { modo: 'face', selecionados: facesDaParte(n, PARTE) })],
  ['criarFace', (n) => criarFace(n, { modo: 'vertice', selecionados: verticesDaParte(n, PARTE).slice(0, 4) })],
  ['rotacionar', (n) => rotacionar(n, { modo: 'vertice', selecionados: verticesDaParte(n, PARTE) },
    { eixo: 'y', angulo: Math.PI / 12 })],
  ['escalar', (n) => escalar(n, { modo: 'vertice', selecionados: verticesDaParte(n, PARTE) },
    { fator: 1.2, eixo: null })],
];

describe('o alvo que cada operação de topologia produz', () => {
  for (const [nome, aplicar] of OPERACOES) {
    describe(nome, () => {
      const original = malhaDaBicicleta();
      const resultado = aplicar(original);

      it('a operação muda a malha', () => {
        expect(resultado.mudou, resultado.motivo ?? '').toBe(true);
      });

      it('o alvo capturado reproduz a malha que o gerou, dentro da tolerância', () => {
        const alvo = capturarAlvo(resultado.neutro, { peca: PECA });
        const veredito = compararComAlvo(resultado.neutro, alvo);
        expect(veredito.ausentes).toEqual([]);
        expect(veredito.sobrando).toEqual([]);
        expect(veredito.partes.every((p) => p.dentro)).toBe(true);
        expect(Math.max(...veredito.partes.map((p) => p.piorMm))).toBeLessThan(veredito.toleranciaMm);
      });

      /* A régua tem de ENXERGAR a operação, senão a rodada de absorção nunca
         saberia que houve o que absorver. Para as quatro operações que movem
         ponto, a forma já denuncia; para duplicar e criar face, que não movem
         ninguém, quem denuncia é a contagem de faces da parte. */
      it('a régua enxerga que algo foi feito, e não dá a receita por certa', () => {
        const alvo = capturarAlvo(resultado.neutro, { peca: PECA });
        const veredito = compararComAlvo(original, alvo);
        const enxergou = veredito.ausentes.length > 0
          || veredito.sobrando.length > 0
          || veredito.partes.some((p) => !p.dentro)
          || veredito.topologiaDiferente.length > 0;
        expect(enxergou).toBe(true);
      });

      it('o alvo não guarda id de vértice, índice de array nem posição de passo', () => {
        const alvo = capturarAlvo(resultado.neutro, { peca: PECA });
        const texto = JSON.stringify(alvo);
        for (const proibido of ['"vs"', '"idV"', '"indice"', '"passo"', '"origemId"', '"faceId"']) {
          expect(texto).not.toContain(proibido);
        }
        /* A identidade que sobra é o nome da parte, e só ela. */
        expect(alvo.partes.every((p) => typeof p.parte === 'string' && p.parte.length > 0)).toBe(true);
      });

      it('capturar duas vezes a mesma malha dá exatamente o mesmo alvo', () => {
        const a = JSON.stringify(capturarAlvo(resultado.neutro, { peca: PECA }));
        const b = JSON.stringify(capturarAlvo(aplicar(malhaDaBicicleta()).neutro, { peca: PECA }));
        expect(a).toBe(b);
      });

      it('a descrição do gesto sai junto, sem quebrar', () => {
        const descricao = descreverGesto(original, resultado.neutro);
        expect(Array.isArray(descricao.partes)).toBe(true);
        for (const parte of descricao.partes) expect(typeof parte.frase).toBe('string');
      });
    });
  }

  it('apagar a parte inteira é o caso que muda a contagem, e a régua acusa', () => {
    const original = malhaDaBicicleta();
    const { neutro } = apagar(original, { modo: 'face', selecionados: facesDaParte(original, PARTE) });
    const alvo = capturarAlvo(neutro, { peca: PECA });
    const veredito = compararComAlvo(original, alvo);
    expect(veredito.sobrando).toContain(PARTE);
    /* Parte a mais leva o pior a infinito: foi a fraqueza que a fatia 1 achou,
       quando sobrar um tubo inteiro devolvia 0,000916 mm e parecia acerto. */
    expect(veredito.piorMm).toBe(Infinity);
    expect(veredito.dentro).toBe(false);
  });
});
