/* nome-de-copia.test.ts — endereço de autor para as cópias do `arranja`.

   O ATRITO. Até aqui a única forma de citar uma cópia era `copia: 2`, uma
   POSIÇÃO. O repositório proíbe posição como identidade — está escrito no
   `CLAUDE.md`: "índices de arrays e posições de passos nunca são identidade
   persistida" — e o `arranja` era o lugar onde a regra era quebrada todos os
   dias, porque não havia alternativa.

   O QUE EXATAMENTE DÁ ERRADO, medido e não suposto. Aumentar `total` NÃO troca
   o corpo que `copia: 2` devolve: a cópia 2 continua nascendo em `2·d`, no
   mesmo lugar. O que muda é o PAPEL dela. Quem escreveu `copia: 2` numa cerca
   de quatro instâncias estava dizendo "a tábua da ponta"; com seis, a mesma
   linha continua resolvendo, continua sem erro, e passa a apontar para uma
   tábua do meio. A referência sobrevive à mudança de intenção — e é isso que a
   torna perigosa, não um erro que apareceria no gate.

   `nomes` corrige os dois lados disso:

   1. o nome carrega a INTENÇÃO (`'ponta'`), não a posição;
   2. mexer no `total` sem revisar os nomes GRITA, porque a lista é exata. O
      autor é obrigado a olhar para a linha que talvez tenha mudado de sentido,
      em vez de descobrir depois, na foto.

   O modelo é o `grupo` do `furo`, que já resolvia o mesmo problema para furos:
   endereço declarado pelo autor, conferido, e que nunca é índice. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';

const FONTE = { op: 'cubo', id: 1 };
const ARRANJO = 2;

function cerca(total: number, extra: Record<string, unknown> = {}, passosExtra: any[] = []) {
  return nucleo([
    ['cubo', { origemId: 1, larg: 0.02, alt: 0.3, prof: 0.02 }],
    ['arranja', {
      origemId: ARRANJO, derivaDe: FONTE, sel: { origem: FONTE },
      modo: 'linear', d: [0.1, 0, 0], total, ...extra,
    }],
    ...passosExtra,
  ], {});
}

const gritos = (malha: any) => (malha.orfaos ?? []).map((o: any) => o.motivo).join(' | ');

/* extensão em X das faces de uma parte: identifica QUAL tábua foi endereçada. */
function faixaX(malha: any, parte: string): [number, number] {
  const xs = [...malha.F.values()]
    .filter((f: any) => f.parte === parte)
    .flatMap((f: any) => f.vs)
    .map((v: number) => malha.V.get(v)[0]);
  return [Math.min(...xs), Math.max(...xs)];
}

describe('o nome endereça a cópia certa', () => {
  const malha = cerca(4, { nomes: ['central', 'direita', 'ponta'] }, [
    ['parte', { nome: 'aCentral', sel: { origem: { op: 'arranja', id: ARRANJO, de: FONTE, nome: 'central' } } }],
    ['parte', { nome: 'aPonta', sel: { origem: { op: 'arranja', id: ARRANJO, de: FONTE, nome: 'ponta' } } }],
  ]);

  it('resolve sem órfão', () => {
    expect(gritos(malha)).toBe('');
  });

  it('cada nome cai na cópia declarada, não em outra', () => {
    const [minC, maxC] = faixaX(malha, 'aCentral');
    const [minP, maxP] = faixaX(malha, 'aPonta');
    expect(minC).toBeCloseTo(0.09, 9);
    expect(maxC).toBeCloseTo(0.11, 9);
    expect(minP).toBeCloseTo(0.29, 9);
    expect(maxP).toBeCloseTo(0.31, 9);
  });

  it('nome e copia apontam para a mesma cópia quando concordam', () => {
    const porNome = cerca(4, { nomes: ['a', 'b', 'c'] }, [
      ['parte', { nome: 'alvo', sel: { origem: { op: 'arranja', id: ARRANJO, de: FONTE, nome: 'c' } } }],
    ]);
    const porIndice = cerca(4, {}, [
      ['parte', { nome: 'alvo', sel: { origem: { op: 'arranja', id: ARRANJO, de: FONTE, copia: 2 } } }],
    ]);
    expect(faixaX(porNome, 'alvo')).toEqual(faixaX(porIndice, 'alvo'));
  });
});

describe('a armadilha que o nome fecha', () => {
  /* Esta prova documenta o comportamento ANTIGO como ele é, para que a razão da
     mudança fique medida e não fique só na prosa. Ela não é uma queixa: é o
     contrato de `copia`, que continua existindo e continua correto para quem
     realmente quer falar de posição. */
  it('copia: 2 continua resolvendo quando o arranjo cresce, sem erro nenhum', () => {
    const quatro = cerca(4, {}, [
      ['parte', { nome: 'alvo', sel: { origem: { op: 'arranja', id: ARRANJO, de: FONTE, copia: 2 } } }],
    ]);
    const seis = cerca(6, {}, [
      ['parte', { nome: 'alvo', sel: { origem: { op: 'arranja', id: ARRANJO, de: FONTE, copia: 2 } } }],
    ]);
    expect(gritos(quatro)).toBe('');
    expect(gritos(seis)).toBe('');
    /* mesmo corpo, no mesmo lugar: o que mudou foi o papel dele no conjunto —
       era a última tábua com total 4, e é uma do meio com total 6. */
    expect(faixaX(quatro, 'alvo')).toEqual(faixaX(seis, 'alvo'));
    const copiasEm = (m: any) => [...m.F.values()].filter((f: any) => f.parte === 'alvo').length;
    expect(copiasEm(quatro)).toBe(copiasEm(seis));
  });

  it('mexer no total sem revisar os nomes GRITA, em vez de deixar passar', () => {
    const malha = cerca(6, { nomes: ['central', 'direita', 'ponta'] });
    expect(gritos(malha)).toMatch(/nomes tem 3 entrada\(s\) e este arranjo cria 5 cópia\(s\)/);
  });
});

describe('as recusas', () => {
  it('nomear só uma parte das cópias é recusado', () => {
    expect(gritos(cerca(5, { nomes: ['a', 'b'] }))).toMatch(/nomear só uma parte/);
  });

  it('nome repetido é recusado: nome é identidade', () => {
    expect(gritos(cerca(4, { nomes: ['a', 'b', 'a'] }))).toMatch(/repete 'a'/);
  });

  it('nome vazio ou não-string é recusado', () => {
    expect(gritos(cerca(4, { nomes: ['a', '  ', 'c'] }))).toMatch(/nomes\[1\]/);
    expect(gritos(cerca(4, { nomes: ['a', 7, 'c'] }))).toMatch(/nomes\[1\]/);
  });

  it('nomes fora de lista é recusado', () => {
    expect(gritos(cerca(4, { nomes: 'ponta' }))).toMatch(/nomes é a lista de endereços/);
  });

  it('citar nome inexistente GRITA nomeando os disponíveis', () => {
    const malha = cerca(4, { nomes: ['central', 'direita', 'ponta'] }, [
      ['parte', { nome: 'alvo', sel: { origem: { op: 'arranja', id: ARRANJO, de: FONTE, nome: 'traseira' } } }],
    ]);
    expect(gritos(malha)).toMatch(/não tem cópia chamada 'traseira'/);
    expect(gritos(malha)).toMatch(/'central', 'direita', 'ponta'/);
  });

  it('citar nome num arranjo que não nomeou GRITA dizendo o que fazer', () => {
    const malha = cerca(4, {}, [
      ['parte', { nome: 'alvo', sel: { origem: { op: 'arranja', id: ARRANJO, de: FONTE, nome: 'ponta' } } }],
    ]);
    expect(gritos(malha)).toMatch(/não nomeou suas cópias; declare nomes no passo/);
  });

  it('copia e nome juntos são recusados: se discordassem, um estaria errado', () => {
    const malha = cerca(4, { nomes: ['a', 'b', 'c'] }, [
      ['parte', { nome: 'alvo', sel: { origem: { op: 'arranja', id: ARRANJO, de: FONTE, copia: 0, nome: 'c' } } }],
    ]);
    expect(gritos(malha)).toMatch(/copia \(posição\) ou nome \(endereço declarado\), nunca os dois/);
  });
});

describe('o que já existia continua igual', () => {
  it('arranjo sem nomes se comporta exatamente como antes', () => {
    const semNomes = cerca(4, {}, [
      ['parte', { nome: 'todas', sel: { origem: { op: 'arranja', id: ARRANJO, de: FONTE } } }],
    ]);
    expect(gritos(semNomes)).toBe('');
    /* a coleção inteira: três cópias de seis faces. */
    expect([...semNomes.F.values()].filter((f: any) => f.parte === 'todas').length).toBe(18);
  });

  it('nomear não muda a geometria, só o endereço', () => {
    const posicoes = (m: any) => [...m.V.entries()]
      .sort((a: any, b: any) => a[0] - b[0]).map(([, p]: any) => p);
    expect(posicoes(cerca(4, { nomes: ['a', 'b', 'c'] }))).toEqual(posicoes(cerca(4)));
  });

  it('o arranjo radial também aceita nomes', () => {
    const malha = nucleo([
      ['cubo', { origemId: 1, larg: 0.02, alt: 0.02, prof: 0.02, em: [0.1, 0, 0] }],
      ['arranja', {
        origemId: ARRANJO, derivaDe: FONTE, sel: { origem: FONTE },
        modo: 'radial', eixo: 'y', total: 4, volta: 360, pivo: [0, 0, 0],
        /* a cópia k nasce a (k+1)·90°, então: 90°, 180° e 270° a partir de +X. */
        nomes: ['aNoventa', 'aCentoEOitenta', 'aDuzentosESetenta'],
      }],
      ['parte', { nome: 'meiaVolta', sel: { origem: { op: 'arranja', id: ARRANJO, de: FONTE, nome: 'aCentoEOitenta' } } }],
    ], {});
    expect(gritos(malha)).toBe('');
    /* meia volta a partir de +X cai em −X, com a mesma extensão da fonte. */
    const [minX, maxX] = faixaX(malha, 'meiaVolta');
    expect(minX).toBeCloseTo(-0.11, 9);
    expect(maxX).toBeCloseTo(-0.09, 9);
  });
});
