/* arranja-contrato.test.ts — o que a op `arranja` PROMETE no comentário e não
   estava afirmado em lugar nenhum.

   Por que existe: a revisão adversarial do ciclo "Arranjos semânticos v1" achou
   a mesma classe dos três ciclos anteriores — promessa escrita no comentário,
   sem afirmação que morra quando ela é quebrada. Dois casos medidos:

   1. a cópia herda cinco atributos de face e só dois tinham teste. Tirar
      `material`, `liso` ou `solido` da herança deixava 553 de 553 verdes E o
      gabarito byte-idêntico nas 23 peças — nem o teste nem a rede de regressão
      notavam, porque as peças pintam a coleção inteira depois e nunca observam
      a herança;
   2. a lista de chaves aceitas em `CONTRATOS_ORIGEM.arranja` não tinha portão
      afirmado. Neutralizá-la sobrevivia a 553 de 553, e aí um erro de digitação
      (`copai` no lugar de `copia`) devolvia a COLEÇÃO INTEIRA no lugar da cópia
      pedida, sem diagnóstico. Referência que resolve para outra coisa em
      silêncio é a classe que o CLAUDE.md proíbe.

   O que este arquivo prende é o contrato, não a numeração. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — módulo .js do motor v3 (sem tipos)
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';

type Neutro = { V: Map<number, number[]>; F: Map<number, any>; orfaos: any[] };

const FONTE = { op: 'cubo', id: 10 };
const COLECAO = { op: 'arranja', id: 20, de: FONTE };

/* uma tábua marcada de todo jeito que a face sabe ser marcada, e um arranjo
   linear de três instâncias a partir dela */
const PASSOS_BASE = [
  ['cubo', { origemId: 10, larg: 1, alt: 1, prof: 1 }],
  ['pincel', { modo: 'face', sel: { origem: FONTE }, cor: '#123456' }],
  ['material', { sel: { origem: FONTE }, usa: 'madeira' }],
  ['liso', { sel: { origem: FONTE } }],
  ['solido', { sel: { origem: FONTE } }],
  ['parte', { nome: 'tabua', sel: { origem: FONTE } }],
  ['arranja', {
    modo: 'linear', d: [2, 0, 0], total: 3,
    origemId: 20, derivaDe: FONTE, sel: { origem: FONTE },
  }],
];
const MATERIAIS = { madeira: { cor: '#8a5a2b' } };

function montar(passos: any[]) {
  const neutro = nucleo(passos, {}, {}, MATERIAIS, null, []) as Neutro;
  return neutro;
}

/* faces resolvidas por uma origem, via um `parte` de sonda com nome próprio.
   `substituir: true` é obrigatório aqui: as faces já pertencem a `tabua`, e
   desde o O-2 reatribuir sem dizer grita. A sonda quer justamente reatribuir. */
function facesDe(passos: any[], origem: Record<string, unknown>, rotulo = 'sonda') {
  const neutro = montar([...passos, ['parte', { nome: rotulo, sel: { origem }, substituir: true }]]);
  return {
    neutro,
    faces: [...neutro.F.values()].filter((f: any) => f.parte === rotulo),
  };
}

describe('a cópia herda os atributos da face de origem', () => {
  /* os cinco que a op copia. `parte` é reescrito pela sonda, então é medido à
     parte, no caso seguinte. */
  const HERDADOS = ['cor', 'material', 'liso', 'solido'] as const;

  it('cada atributo marcado na fonte aparece igual em toda cópia', () => {
    const neutro = montar(PASSOS_BASE);
    expect(neutro.orfaos).toEqual([]);
    /* a fonte é citada pela ORIGEM dela, não pela parte: a parte também é
       herdada, então filtrar por `parte === 'tabua'` traria as 18 faces. */
    const fonteFaces = facesDe(PASSOS_BASE, FONTE, 'soFonte').faces;
    expect(fonteFaces.length).toBe(6);
    const referencia = fonteFaces[0];
    /* a fonte precisa estar realmente marcada, senão o teste passaria por vácuo */
    expect([referencia.cor, referencia.material, referencia.liso, referencia.solido])
      .toEqual(['#123456', 'madeira', true, true]);

    /* 3 instâncias = fonte + 2 cópias = 18 faces no total */
    expect(neutro.F.size).toBe(18);
    for (const f of neutro.F.values()) {
      for (const atributo of HERDADOS) {
        expect([atributo, (f as any)[atributo]]).toEqual([atributo, referencia[atributo]]);
      }
    }
  });

  it('a identidade semântica da fonte também é herdada por cada cópia', () => {
    const neutro = montar(PASSOS_BASE);
    const daParte = [...neutro.F.values()].filter((f: any) => f.parte === 'tabua');
    expect(daParte.length).toBe(18);
  });
});

describe('o portão da origem `arranja` recusa chave que não existe', () => {
  it('erro de digitação em `copia` GRITA em vez de devolver a coleção inteira', () => {
    const { neutro, faces } = facesDe(PASSOS_BASE, { ...COLECAO, copai: 1 } as any);
    expect(neutro.orfaos.length).toBeGreaterThan(0);
    /* e não pode ter resolvido nada: devolver as 12 faces da coleção seria
       exatamente o silêncio que este caso existe para matar */
    expect(faces.length).toBe(0);
  });

  it('sem `copia`, a coleção inteira resolve — as duas cópias, não a fonte', () => {
    const { neutro, faces } = facesDe(PASSOS_BASE, COLECAO);
    expect(neutro.orfaos).toEqual([]);
    expect(faces.length).toBe(12);
  });

  it('`copia` aponta para uma cópia só, e cópias diferentes são faces diferentes', () => {
    const a = facesDe(PASSOS_BASE, { ...COLECAO, copia: 0 });
    const b = facesDe(PASSOS_BASE, { ...COLECAO, copia: 1 });
    expect(a.neutro.orfaos).toEqual([]);
    expect(b.neutro.orfaos).toEqual([]);
    expect(a.faces.length).toBe(6);
    expect(b.faces.length).toBe(6);
    const idsA = a.faces.map((f: any) => f.id).sort();
    const idsB = b.faces.map((f: any) => f.id).sort();
    expect(idsA).not.toEqual(idsB);
  });

  it("`ultima` acompanha a contagem: com total maior, ela é outra cópia", () => {
    const comQuatro = PASSOS_BASE.map((p) => (
      p[0] === 'arranja' ? ['arranja', { ...(p[1] as any), total: 4 }] : p
    ));
    const tres = facesDe(PASSOS_BASE, { ...COLECAO, copia: 'ultima' });
    const quatro = facesDe(comQuatro, { ...COLECAO, copia: 'ultima' });
    expect(tres.neutro.orfaos).toEqual([]);
    expect(quatro.neutro.orfaos).toEqual([]);
    /* a última de 3 instâncias está a 2 passos da fonte; a de 4, a 3 passos */
    const x = (r: any) => {
      const vs = new Set<number>(r.faces.flatMap((f: any) => f.vs));
      return [...vs].reduce((s, v) => s + r.neutro.V.get(v)![0], 0) / vs.size;
    };
    expect(x(quatro)).toBeGreaterThan(x(tres));
  });
});
