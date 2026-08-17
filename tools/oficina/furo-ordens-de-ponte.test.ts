/* furo-ordens-de-ponte.test.ts — as promessas do A-30 que a geometria sozinha
   não mostra.

   `oficina.test.ts` já cobra o RESULTADO: as oito figuras que travavam e agora
   fecham, e as três que continuam travando. O que fica aqui é o que o resultado
   não denuncia — determinismo, inércia, e a regra de que a chave de ordenação
   não pode depender do motor de JavaScript.

   POR QUE A CHAVE NÃO PODE USAR `Math.hypot` NEM `sqrt`. A precisão de
   `Math.hypot` é definida pela implementação em ECMAScript: dois motores podem
   devolver últimos bits diferentes para a mesma entrada. Numa chave de
   ordenação isso vira ordem diferente, que vira ponte diferente, que vira
   MALHA diferente. A mesma peça sairia com geometria distinta em dois
   navegadores, e o formato salvo deixaria de ser reexecutável. Comparar
   distâncias AO QUADRADO dá exatamente a mesma ordem sem a raiz. */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
// @ts-expect-error — adaptador em JavaScript, exercitado em runtime pelo Vitest.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';
import { arestasSemPar, conferirMalha } from './conferir-malha.js';

const NUCLEO_FONTE = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../prototipos/procedural/v3/motor/oficina.js'),
  'utf8',
);

const FLANGE = (ladosDaFace: number, ladosDoFuro: number, total: number) => [
  ['cilindro', { id: 0, origemId: 1, raio: 0.052, altura: 0.012, lados: ladosDaFace }],
  ['furo', {
    origemId: 9,
    de: { op: 'cilindro', id: 1, tampa: 'topo' },
    saida: { op: 'cilindro', id: 1, tampa: 'fundo' },
    centros: { distancia: 0.038, total, volta: 360 },
    raio: 0.0065,
    lados: ladosDoFuro,
    orientacao: [1, 0, 0],
  }],
];

const fixo = (n: number) => { const s = n.toFixed(9); return s === '-0.000000000' ? '0.000000000' : s; };
const resumo = (neutro: any) => createHash('sha256').update(
  [...neutro.V.entries()].sort((a: any, b: any) => a[0] - b[0]).map(([id, p]: any) => `${id}:${p.map(fixo)}`).join('|')
  + '#'
  + [...neutro.F.entries()].sort((a: any, b: any) => a[0] - b[0]).map(([id, f]: any) => `${id}:${f.vs}`).join('|'),
).digest('hex').slice(0, 16);

/* extrai o corpo de uma função nomeada do fonte do núcleo, até a chave que a
   fecha na coluna zero. Serve para afirmar sobre o CÓDIGO da chave, e não
   sobre o comentário ao lado dele. */
function corpoDaFuncao(nome: string) {
  const inicio = NUCLEO_FONTE.indexOf(`function ${nome}(`);
  expect(inicio, `a função ${nome} não existe no núcleo`).toBeGreaterThan(-1);
  const fim = NUCLEO_FONTE.indexOf('\n}\n', inicio);
  return NUCLEO_FONTE.slice(inicio, fim);
}

describe('A-30 — as três ordens de ponte', () => {
  it('a chave de ordenação não usa `Math.hypot` nem `Math.sqrt`', () => {
    for (const nome of ['d2AoSegmento', 'ordensDePonte']) {
      const corpo = corpoDaFuncao(nome);
      expect(corpo, `${nome} usa Math.hypot — a ordem passaria a depender do motor`).not.toMatch(/Math\.hypot/);
      expect(corpo, `${nome} usa Math.sqrt — raiz na chave é gasto sem ganho de ordem`).not.toMatch(/Math\.sqrt/);
      expect(corpo, `${nome} usa ** 0.5 — é sqrt com outro nome`).not.toMatch(/\*\*\s*0?\.5/);
    }
  });

  it('a busca é fixa em três ordens: não há quarta tentativa nem sorteio', () => {
    const corpo = corpoDaFuncao('ordensDePonte');
    expect(corpo, 'sorteio na ordem quebraria o determinismo do formato salvo').not.toMatch(/Math\.random/);
    expect(corpo, 'as três ordens são nomeadas e devolvidas juntas')
      .toMatch(/\[declarada, pertoDoContorno, menorRaio\]/);
  });

  it('★ é DETERMINÍSTICO: a mesma figura montada cinco vezes dá a mesma geometria', () => {
    /* uma busca que tenta várias ordens é onde o não-determinismo entraria sem
       ninguém ver. Duas destas figuras só fecham na segunda ordem. */
    for (const [face, furo, total] of [[6, 3, 7], [8, 4, 10], [16, 12, 4]]) {
      const resumos = new Set<string>();
      for (let k = 0; k < 5; k++) resumos.add(resumo(nucleo(FLANGE(face, furo, total) as any, {}, {})));
      expect(resumos.size, `face ${face}, ${total} furos de ${furo}: geometria variou entre execuções`).toBe(1);
    }
  });

  it('★ é INERTE onde a primeira ordem já fechava — a peça de produção não se mexe', () => {
    /* a garantia forte está em `canon-linha-de-base.test.ts` e no
       `gabarito:selecao`, que cobram byte por byte contra números gravados
       ANTES desta mudança. Aqui fica a metade que se lê sem sair do arquivo: a
       figura do flange continua com a contagem fechada que ela sempre teve. */
    const n = nucleo(FLANGE(16, 12, 4) as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect(n.V.size).toBe(128);
    expect(n.F.size).toBe(204);
  });

  it('★ os DOIS lados da chapa saem sadios, e não só o de entrada', () => {
    /* cada lado tenta por conta própria. Se um fechasse e o outro não, o furo
       abortaria; se um saísse torto, a casca abriria. As oito figuras que o
       A-30 destravou passam pela régua inteira, com casca fechada cobrada. */
    for (const [face, furo, total] of [[6, 3, 7], [6, 24, 7], [18, 3, 11]]) {
      const n = nucleo(FLANGE(face, furo, total) as any, {}, {});
      conferirMalha(n, { fechada: true, rotulo: `face ${face}, ${total} furos de ${furo}` });
    }
  });

  it('as três figuras antes bloqueadas agora fecham nos dois lados, sem mudar o contrato de faces', () => {
    for (const [face, furo, total] of [[6, 3, 9], [7, 3, 8], [7, 5, 8]]) {
      const n = nucleo(FLANGE(face, furo, total) as any, {}, {});
      expect(n.orfaos, `face ${face}, ${total} furos de ${furo}`).toEqual([]);
      conferirMalha(n, { fechada: true, rotulo: `fallback ${face}/${furo}/${total}` });
      expect(arestasSemPar(n), 'a casca não pode abrir entre entrada e saída').toEqual([]);
      expect(() => adaptarThree(n, { nome: `fallback-${face}-${furo}-${total}` })).not.toThrow();
    }
  });
});
