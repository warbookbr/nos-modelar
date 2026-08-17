/* pose-de-criacao.test.ts — a prova de `em` e `eixo` nos geradores (A-4 / O-7).

   O ATRITO MEDIDO. Nenhum gerador aceitava posição ou orientação. Uma primitiva
   que não morasse na origem custava um passo a mais, e uma peça de revolução
   fora do eixo Y custava dois — o trio criar + `rotaciona` + `transladar`. No
   acervo: 128 dos 853 passos eram transporte puro (15%), chegando a 29% no
   `freio-disco` e no `drone-inspecao`, com 0,84 passo de encanamento por
   primitiva criada. As peças chegaram a escrever helpers locais
   (`girarParaEixoX`) para disfarçar a repetição.

   O custo não era só de tamanho. A posição ficava LONGE da forma — quem lia
   `cubo` não sabia onde ele estava —, o `origemId` virava obrigatório só para
   poder selecionar a primitiva de volta, e esquecer o passo de transporte
   deixava o corpo empilhado na origem sem erro nenhum.

   A AFIRMAÇÃO CENTRAL, e a única que sustenta a mudança: a pose de criação não
   é um caminho NOVO de geometria. Ela produz exatamente a mesma malha que os
   passos escritos à mão — se um dia divergir, a peça que migrar muda de forma
   em silêncio, que é o pior defeito possível aqui. Por isso quase toda prova
   deste arquivo é uma IGUALDADE contra a escrita longa, e não uma medida solta.

   O que a pose NÃO é: `alinhar` relacional (O-8). Ela não encosta, não mede
   vizinho e não resolve pivô por seleção. É o atalho barato do caso comum. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';

const ID = 7;
const ORIGEM = (op: string) => ({ op, id: ID });

/* Só as POSIÇÕES, em ordem de id: é isso que precisa ser idêntico entre o
   caminho curto e o longo. Os ids em si mudam de propósito — o caminho curto
   gasta menos passos, e passo é o que decide o bloco de ids. */
const posicoes = (malha: any) => [...malha.V.entries()]
  .sort((a: any, b: any) => a[0] - b[0])
  .map(([, p]: any) => (p as number[]).map((n) => +n.toFixed(12)));

/* As faces precisam manter a mesma volta: uma transformação rígida preserva
   orientação, e se a pose invertesse winding a peça renderizaria pelo avesso
   sem que nenhuma medida de posição percebesse. */
const voltas = (malha: any) => [...malha.F.entries()]
  .sort((a: any, b: any) => a[0] - b[0])
  .map(([, f]: any) => f.vs.length);

function gritos(malha: any): string {
  return (malha.orfaos ?? []).map((o: any) => o.motivo).join(' | ');
}

describe('a pose de criação é igual aos passos escritos à mão', () => {
  it('em ≡ transladar logo depois do gerador', () => {
    const curto = nucleo([
      ['cubo', { origemId: ID, larg: 0.1, alt: 0.05, prof: 0.08, em: [0.3, -0.2, 0.7] }],
    ], {});
    const longo = nucleo([
      ['cubo', { origemId: ID, larg: 0.1, alt: 0.05, prof: 0.08 }],
      ['transladar', { d: [0.3, -0.2, 0.7], sel: { origem: ORIGEM('cubo') } }],
    ], {});
    expect(curto.orfaos).toEqual([]);
    expect(posicoes(curto)).toEqual(posicoes(longo));
    expect(voltas(curto)).toEqual(voltas(longo));
  });

  it('eixo:x + em ≡ o trio criar, rotacionar em torno da origem e transladar', () => {
    const curto = nucleo([
      ['cilindro', { origemId: ID, raio: 0.02, altura: 0.1, lados: 12, eixo: 'x', em: [0.5, 0.1, 0] }],
    ], {});
    const longo = nucleo([
      ['cilindro', { origemId: ID, raio: 0.02, altura: 0.1, lados: 12 }],
      ['rotaciona', { eixo: 'z', graus: -90, pivo: [0, 0, 0], sel: { origem: ORIGEM('cilindro') } }],
      ['transladar', { d: [0.5, 0.1, 0], sel: { origem: ORIGEM('cilindro') } }],
    ], {});
    expect(curto.orfaos).toEqual([]);
    expect(posicoes(curto)).toEqual(posicoes(longo));
    expect(voltas(curto)).toEqual(voltas(longo));
  });

  it('eixo:z ≡ rotacionar +90° em torno de X', () => {
    const perfil = [[0, 0], [0.03, 0], [0.03, 0.06], [0, 0.06]];
    const curto = nucleo([['lathe', { origemId: ID, lados: 10, eixo: 'z', perfil }]], {});
    const longo = nucleo([
      ['lathe', { origemId: ID, lados: 10, perfil }],
      ['rotaciona', { eixo: 'x', graus: 90, pivo: [0, 0, 0], sel: { origem: ORIGEM('lathe') } }],
    ], {});
    expect(posicoes(curto)).toEqual(posicoes(longo));
  });

  it('eixo:y é a forma como ela já nasce, e não mexe em nada', () => {
    const comEixo = nucleo([['cone', { origemId: ID, raio: 0.02, altura: 0.05, lados: 8, eixo: 'y' }]], {});
    const semEixo = nucleo([['cone', { origemId: ID, raio: 0.02, altura: 0.05, lados: 8 }]], {});
    expect(posicoes(comEixo)).toEqual(posicoes(semEixo));
  });

  it('vale para todos os geradores colocáveis, não só para o cubo', () => {
    const casos: Array<[string, Record<string, unknown>]> = [
      ['cubo', { larg: 0.1, alt: 0.1, prof: 0.1 }],
      ['cilindro', { raio: 0.03, altura: 0.08, lados: 10 }],
      ['esfera', { raio: 0.04, seg: 8, aneis: 6 }],
      ['cone', { raio: 0.03, altura: 0.07, lados: 9 }],
      ['plano', { larg: 0.1, prof: 0.1 }],
      ['chamferBox', { larg: 0.1, alt: 0.1, prof: 0.1, chanfro: 0.01 }],
      ['lathe', { lados: 8, perfil: [[0, 0], [0.03, 0], [0.03, 0.05], [0, 0.05]] }],
    ];
    const d = [0.11, -0.22, 0.33];
    for (const [op, args] of casos) {
      const curto = nucleo([[op, { origemId: ID, ...args, em: d }]], {});
      const longo = nucleo([
        [op, { origemId: ID, ...args }],
        ['transladar', { d, sel: { origem: ORIGEM(op) } }],
      ], {});
      expect(gritos(curto), `${op} gritou com em`).toBe('');
      expect(posicoes(curto), `${op}: em divergiu de transladar`).toEqual(posicoes(longo));
    }
  });
});

describe('a pose só toca o que o passo criou', () => {
  it('geometria de passo anterior não se mexe', () => {
    const malha = nucleo([
      ['cubo', { origemId: 1, larg: 0.1, alt: 0.1, prof: 0.1 }],
      ['cubo', { origemId: 2, larg: 0.1, alt: 0.1, prof: 0.1, em: [1, 0, 0] }],
    ], {});
    const primeiro = [...malha.V.entries()].filter(([id]: any) => id < 1000).map(([, p]: any) => p);
    expect(primeiro.length).toBeGreaterThan(0);
    for (const p of primeiro) expect(Math.abs(p[0])).toBeLessThanOrEqual(0.05 + 1e-12);
  });

  it('duas primitivas posicionadas no mesmo passo-a-passo não se contaminam', () => {
    const malha = nucleo([
      ['cubo', { origemId: 1, larg: 0.02, alt: 0.02, prof: 0.02, em: [-0.5, 0, 0] }],
      ['cubo', { origemId: 2, larg: 0.02, alt: 0.02, prof: 0.02, em: [0.5, 0, 0] }],
    ], {});
    const xs = [...malha.V.values()].map((p: any) => p[0]);
    expect(Math.min(...xs)).toBeCloseTo(-0.51, 12);
    expect(Math.max(...xs)).toBeCloseTo(0.51, 12);
  });
});

describe('a pose recusa o que não sabe fazer', () => {
  it('em fora de um gerador grita, em vez de mover geometria alheia', () => {
    const malha = nucleo([
      ['cubo', { origemId: 1, larg: 0.2, alt: 0.02, prof: 0.2 }],
      ['furo', {
        origemId: 2, de: { op: 'cubo', id: 1, face: 'topo' }, profundidade: 0.01,
        centro: [0, 0, 0], raio: 0.02, lados: 12, em: [0.1, 0, 0],
      }],
    ], {});
    expect(gritos(malha)).toMatch(/em posiciona a forma no momento em que ela nasce/);
  });

  it('eixo num gerador que não é de revolução grita', () => {
    const malha = nucleo([['cubo', { origemId: ID, larg: 0.1, alt: 0.1, prof: 0.1, eixo: 'x' }]], {});
    expect(gritos(malha)).toMatch(/não é gerado por revolução/);
  });

  it('eixo desconhecido grita nomeando os aceitos', () => {
    const malha = nucleo([['cilindro', { origemId: ID, raio: 0.02, altura: 0.05, lados: 8, eixo: 'w' }]], {});
    expect(gritos(malha)).toMatch(/eixo aceita 'x', 'y' ou 'z'/);
  });

  it('em com aridade errada grita e não constrói nada', () => {
    const malha = nucleo([['cubo', { origemId: ID, larg: 0.1, alt: 0.1, prof: 0.1, em: [1, 2] }]], {});
    expect(gritos(malha)).toMatch(/em precisa ser \[x,y,z\]/);
    expect(malha.V.size).toBe(0);
  });

  /* Valor não-finito num campo dimensional LANÇA alto e mata a peça inteira —
     é a lei central da Oficina, não uma decisão desta pose. `em` fica sob a
     mesma lei de `larg`, `raio` e `d`, e não sob uma regra própria mais frouxa:
     uma peça que continuasse viva com um vértice em Infinity mediria qualquer
     coisa depois. */
  it('em não-finito lança, como todo campo dimensional', () => {
    expect(() => nucleo([['cubo', { origemId: ID, larg: 0.1, alt: 0.1, prof: 0.1, em: [0, Infinity, 0] }]], {}))
      .toThrow(/não-finito/);
  });
});

describe('a pose não muda a linguagem de quem já usava as palavras', () => {
  /* `eixo` é palavra antiga de `rotaciona` e de `arranja`, onde significa o eixo
     do GIRO. Se a pose tivesse sequestrado o nome, todo arranjo radial do
     acervo mudaria de sentido calado. */
  it('eixo continua sendo o eixo do giro em rotaciona', () => {
    const comPose = nucleo([
      ['cubo', { origemId: ID, larg: 0.1, alt: 0.02, prof: 0.02 }],
      ['rotaciona', { eixo: 'y', graus: 90, pivo: [0, 0, 0], sel: { origem: ORIGEM('cubo') } }],
    ], {});
    expect(comPose.orfaos).toEqual([]);
    const zs = [...comPose.V.values()].map((p: any) => p[2]);
    /* girar 90° em torno de Y leva a maior dimensão de X para Z. */
    expect(Math.max(...zs)).toBeCloseTo(0.05, 12);
  });

  it('eixo continua sendo o eixo do arranjo radial', () => {
    const malha = nucleo([
      ['cubo', { origemId: 1, larg: 0.02, alt: 0.02, prof: 0.02, em: [0.1, 0, 0] }],
      ['arranja', {
        origemId: 2, derivaDe: { op: 'cubo', id: 1 }, sel: { origem: { op: 'cubo', id: 1 } },
        modo: 'radial', eixo: 'y', total: 4, volta: 360, pivo: [0, 0, 0],
      }],
    ], {});
    expect(malha.orfaos).toEqual([]);
    /* quatro cópias a 90°: o conjunto ocupa os dois sentidos de X e de Z. */
    const xs = [...malha.V.values()].map((p: any) => p[0]);
    const zs = [...malha.V.values()].map((p: any) => p[2]);
    expect(Math.min(...xs)).toBeLessThan(-0.05);
    expect(Math.max(...xs)).toBeGreaterThan(0.05);
    expect(Math.min(...zs)).toBeLessThan(-0.05);
    expect(Math.max(...zs)).toBeGreaterThan(0.05);
  });
});
