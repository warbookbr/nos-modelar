/* referencia-posicional.test.ts — prova do A-22: a regra de "isto é referência
   por id posicional?" é UMA SÓ, e ela distingue as duas coisas que a chave `de`
   carrega desde o O-12.

   Por que este arquivo existe: a regra vivia copiada no gate `id-cru`, na guarda
   de salvamento da Oficina e no oráculo do harness. As três divergiram DUAS
   vezes na mesma chave. Na segunda divergência a Oficina passou a recusar
   `_jardineira` — peça que o CI aprova com 0 id cru — acusando de id posicional
   as cinco portas semânticas que o ciclo anterior tinha acabado de entregar.

   O harness `guarda-salvar-oficina.mjs` prova que a guarda está INSTALADA no
   funil de salvamento (botão real, gancho, POST e download). Este arquivo prova
   que a regra que ela chama CLASSIFICA certo — headless, sem navegador. */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — módulo do motor v3, em JS sem tipos.
import { contarIdCru, ocorrenciasPosicionais, origemEstrutural, rotularOcorrencias, totalDe } from '../../prototipos/fps/v3/motor/referencia-posicional.js';
// @ts-expect-error — gate em .mjs sem tipos.
import { contarIdCru as contarIdCruDoGate } from '../../tools/bancadas/id-cru.mjs';
// @ts-expect-error — peça em JS sem tipos.
import { PASSOS as PASSOS_JARDINEIRA } from '../../prototipos/fps/v3/pecas/_jardineira.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../..');

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

describe('a peça real que o A-22 recusava', () => {
  it('`_jardineira` publica 8 portas e mede 0 referência posicional', () => {
    const portas = (PASSOS_JARDINEIRA as unknown[])
      .filter((p) => Array.isArray(p) && p[0] === 'publicarPorta');
    expect(portas.length).toBe(8);
    expect(rotulos(PASSOS_JARDINEIRA as unknown[])).toEqual([]);
  });

  /* a Oficina recusava a peça inteira por causa dessas linhas (cinco quando o
     A-22 foi medido, oito desde que o A-18 e o A-19 destravaram os recortes);
     uma edição
     posicional de verdade na MESMA peça continua sendo recusada. */
  it('a mesma peça com UMA edição posicional volta a ser recusada', () => {
    const editada = [...(PASSOS_JARDINEIRA as unknown[]), ['solido', { faces: [0] }]];
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
  it('o gate id-cru mede exatamente o que o módulo mede', () => {
    const passos = [
      ['pincel', { modo: 'face', faces: [1, 2, 3] }],
      ['publicarPorta', { nome: 'p', de: { op: 'cubo', id: 300 } }],
      ['mescla', { de: [4, 5], para: 6 }],
    ];
    expect(contarIdCruDoGate(passos)).toEqual(contarIdCru(passos));
  });

  /* O defeito do A-22 não foi uma regra errada: foi a MESMA regra escrita três
     vezes. Este teste é o que impede a quarta cópia de nascer — se alguém
     reescrever a lista de chaves dentro da Oficina, do gate ou do harness, ela
     aparece aqui em vez de divergir em silêncio dois ciclos depois. */
  it('a Oficina, o gate e o harness IMPORTAM a regra, nenhum redeclara a lista', () => {
    const consumidores = [
      'prototipos/fps/v3/oficina.html',
      'tools/bancadas/id-cru.mjs',
      'tools/mecanifica/guarda-salvar-oficina.mjs',
    ];
    for (const caminho of consumidores) {
      const fonte = readFileSync(join(REPO, caminho), 'utf8');
      expect(fonte, `${caminho} precisa importar a regra`).toContain('referencia-posicional.js');
      /* a assinatura da cópia: contar/testar as chaves na mão. */
      expect(fonte, `${caminho} redeclara a lista de chaves`).not.toMatch(/hasOwn\(\s*a\s*,\s*'(faces|vs|pontos|de)'\s*\)/);
    }
  });
});
