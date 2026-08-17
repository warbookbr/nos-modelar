/* referencia-posicional.test.ts — prova do A-22: a regra de "isto é referência
   por id posicional?" é UMA SÓ, e ela distingue as duas coisas que a chave `de`
   carrega desde o O-12.

   Por que este arquivo existe: a regra vivia copiada no gate `id-cru`, na antiga
   interface humana e no oráculo do harness. As três divergiram DUAS
   vezes na mesma chave. Na segunda divergência a Oficina passou a recusar
   `_jardineira` — peça que o CI aprova com 0 id cru — acusando de id posicional
   as cinco portas semânticas que o ciclo anterior tinha acabado de entregar.

   A interface humana foi retirada da Mecanifica. Este arquivo conserva a prova
   que ainda importa aqui: o gate usa a regra única e ela classifica certo. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — módulo do motor v3, em JS sem tipos.
import { contarIdCru, ocorrenciasPosicionais, origemEstrutural, rotularOcorrencias, totalDe } from '../../prototipos/procedural/v3/motor/referencia-posicional.js';
// @ts-expect-error — gate em .mjs sem tipos.
import { contarIdCru as contarIdCruDoGate } from '../../tools/bancadas/id-cru.mjs';

/* Fixture mínima: a prova precisa de oito portas com origem estrutural, não da
   geometria ou do nome de uma jardineira. Oito entradas preserva o caso que
   originalmente revelou a divergência sem manter uma receita de produto no
   teste do contrato posicional. */
const PASSOS_FIXTURE_PORTAS = Array.from({ length: 8 }, (_, indice) => [
  'publicarPorta',
  { nome: `porta${indice}`, de: { op: 'cilindro', id: 404, tampa: 'fundo' } },
]);

const rotulos = (passos: unknown[]) => rotularOcorrencias(ocorrenciasPosicionais(passos));

describe('a chave `de` tem dois contratos, e só um é id posicional', () => {
  it('`de:[ids]` do mescla É coleção posicional', () => {
    expect(rotulos([['mescla', { de: [1, 2, 3], para: 0 }]])).toEqual(['passo 0: de:[ids] (mescla)']);
    expect(contarIdCru([['mescla', { de: [1, 2, 3], para: 0 }]]).mesclaDe).toBe(3);
  });

  it('`de:{op,id}` do publicarPorta NÃO é — é origem estrutural', () => {
    const passos = [['publicarPorta', { nome: 'peDoCaule', de: { op: 'cilindro', id: 404, tampa: 'fundo' } }]];
    expect(rotulos(passos)).toEqual([]);
    expect(totalDe(contarIdCru(passos))).toBe(0);
    expect(origemEstrutural({ op: 'cilindro', id: 404 })).toBe(true);
  });

  /* o discriminador é a FORMA, e ele não pode ser mais permissivo que o núcleo:
     `validarOrigem` exige `op` E `id`, então meio contrato ainda conta. */
  it('meio contrato não vira origem: `{op}`, `{id}`, `{}` e string continuam contando', () => {
    expect(contarIdCru([['x', { de: { op: 'cubo' } }]]).mesclaDe).toBe(1);
    expect(contarIdCru([['x', { de: { id: 7 } }]]).mesclaDe).toBe(1);
    expect(contarIdCru([['x', { de: {} }]]).mesclaDe).toBe(1);
    expect(contarIdCru([['x', { de: 'nada' }]]).mesclaDe).toBe(1);
  });
});

describe('uma fixture com portas estruturais', () => {
  it('publica 8 portas e mede 0 referência posicional', () => {
    const portas = (PASSOS_FIXTURE_PORTAS as unknown[])
      .filter((p) => Array.isArray(p) && p[0] === 'publicarPorta');
    expect(portas.length).toBe(8);
    expect(rotulos(PASSOS_FIXTURE_PORTAS as unknown[])).toEqual([]);
  });

  it('a mesma fixture com UMA edição posicional volta a ser recusada', () => {
    const editada = [...PASSOS_FIXTURE_PORTAS, ['solido', { faces: [0] }]];
    expect(rotulos(editada)).toEqual([`passo ${editada.length - 1}: faces:[ids]`]);
  });
});

describe('as seis formas de coleção continuam todas cobertas', () => {
  it('nenhuma some, e cada uma aponta o passo culpado', () => {
    expect(rotulos([
      ['pincel', { modo: 'face', faces: [1, 2] }],
      ['pesar', { osso: 'b0', vs: [3, 4] }],
      ['pincel', { modo: 'livre', pontos: [{ f: 5, a: 0.5, b: 0.5 }] }],
      ['mescla', { de: [6], para: 7 }],
      ['transladar', { sel: { v: [8] } }],
      ['liso', { sel: { f: [9] } }],
    ])).toEqual([
      'passo 0: faces:[ids]',
      'passo 1: vs:[ids] (pesar)',
      'passo 2: pontos:[{f}] (pincel livre)',
      'passo 3: de:[ids] (mescla)',
      'passo 4: sel:{v:[ids]}',
      'passo 5: sel:{f:[ids]}',
    ]);
  });

  it('as referências SEMÂNTICAS não contam', () => {
    expect(rotulos([
      ['material', { sel: { porta: 'peDoCaule' }, usa: 'x' }],
      ['material', { sel: { alias: 'garraInterna' }, usa: 'x' }],
      ['rotaciona', { sel: { origem: { op: 'cilindro', id: 404 } }, eixo: 'y', ang: 1 }],
      ['cilindro', { id: 404, origemId: 404, r: 1, h: 2 }],
    ])).toEqual([]);
  });

  /* chave presente NUNCA conta 0: o núcleo grita nas duas formas, então a regra
     não pode ser mais permissiva que ele. */
  it('chave presente com lista vazia ou lixo conta pelo menos 1', () => {
    expect(contarIdCru([['solido', { faces: [] }]]).faces).toBe(1);
    expect(contarIdCru([['pincel', { faces: 'nada' }]]).faces).toBe(1);
  });
});

describe('uma regra só, de verdade', () => {
  /* Este caso já foi `expect(contarIdCruDoGate(passos)).toEqual(contarIdCru(passos))`
     sobre três passos de exemplo, e não podia falhar: `tools/bancadas/id-cru.mjs`
     REEXPORTA `contarIdCru` deste módulo, então aquilo comparava `f(x)` com
     `f(x)` para o mesmo `f`. Nenhuma mudança de produção o derrubava, e ele
     ocupava a linha de um teste real.

     O que ele queria afirmar é o degrau anterior: que não existe uma segunda
     implementação. Isso se afirma por IDENTIDADE de referência, e não por
     concordância em exemplos — uma cópia recém-escrita concorda em quase tudo.
     Foi exatamente assim que as três cópias do A-22 conviveram por dois ciclos:
     concordavam em tudo, menos na chave `de`. Uma comparação de saídas só
     acusaria a divergência se o exemplo escolhido caísse justo nela; a
     identidade acusa a cópia no instante em que ela nasce.

     Se um dia o gate PRECISAR embrulhar a função, este caso fica vermelho e a
     decisão vira explícita, que é o comportamento desejado. */
  it('o gate id-cru não tem implementação própria: ele reexporta a MESMA função', () => {
    expect(contarIdCruDoGate).toBe(contarIdCru);
  });
});
