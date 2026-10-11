/* aviso-de-degrau.test.ts — o arredondamento que termina em degrau não passa mais calado.

   Quando a aresta reta de uma borda continua em tangência por uma concordância facetada, o arredondamento de UMA aresta não
   cabe no plano da faceta seguinte e termina na seção perpendicular, com um degrau plano (arestas-em-grupos.js). A peça fecha,
   `orfaos` fica em 0 e nada acusava a quina. O núcleo agora põe um aviso em `neutro.avisos` (o canal que já existia, fora da
   forma canônica), e o veredito da peça e a descrição o mostram sem reprovar. A peça mínima é a aba do tubo do suporte: reto de
   10 mm seguido da concordância de 5 mm em 16 facetas, extrudada. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../entrada.js';
// @ts-expect-error — serviço JavaScript puro da fronteira de autoria.
import { descreverPeca, formatarDescricao } from '../../../src/autoria/descrever-partes.js';
// @ts-expect-error — serviço MJS.
import { descreverPecaReutilizavel } from '../../../tools/mecanifica/descrever-peca.mjs';

type Passo = [string, Record<string, unknown>];
const mm = (x: number) => x / 1000;

const abaDoTubo = (segmentosArco = 16): Passo => ['extrusao', {
  origemId: 1, altura: mm(6), segmentosArco,
  perfil: {
    contorno: {
      inicio: [mm(-30), mm(6)],
      trechos: [
        { reto: [mm(30), mm(6)] }, { reto: [mm(30), mm(50)] }, { reto: [mm(15), mm(50)] }, { concordancia: mm(5) },
        { reto: [mm(15), mm(35)] }, { arcoTangente: [mm(-15), mm(35)] }, { reto: [mm(-15), mm(50)] }, { concordancia: mm(5) },
        { reto: [mm(-30), mm(50)] },
      ],
    },
  },
}];
/* a borda livre de cima do trecho da direita: 10 mm de reto, de x = 30 a x = 20, que desemboca na concordância */
const bordaLivreDaDireita = {
  regiao: { min: [mm(19.5), -mm(0.5), mm(49.5)], max: [mm(30.5), mm(6.5), mm(50.5)] },
  onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 }, extremo: { eixo: 'z', lado: 'max' } },
};
const PAINEIS = 6;
const arredonda = (sel: unknown, raio = mm(3)): Passo => ['arredondarAresta', { origemId: 2, raio, paineis: PAINEIS, sel }];
const comParte = (passos: Passo[]): Passo[] => [...passos, ['parte', { nome: 'aba', sel: { tudo: true } }]];

describe('o aviso do degrau, na peça do suporte', () => {
  const n = nucleo([abaDoTubo(), arredonda(bordaLivreDaDireita)], {}, {});

  it('o caso reproduz o degrau: nenhum órfão, e a faixa da origem leva mais faces que os painéis do arco', () => {
    expect(n.orfaos).toEqual([]);
    const faixa = nucleo([abaDoTubo(), arredonda(bordaLivreDaDireita), ['parte', { nome: 'faixa', sel: { origem: { op: 'arredondarAresta', id: 2 } } }]], {}, {});
    expect([...faixa.F.values()].filter((f: any) => f.parte === 'faixa').length).toBe(PAINEIS + n.avisos[0].degraus.length);
  });

  it('o resultado da execução traz um aviso com a aresta, o motivo e a sugestão', () => {
    expect(n.avisos).toHaveLength(1);
    const [aviso] = n.avisos;
    expect(aviso.ref).toBe('degrau');
    expect(aviso.op).toBe('arredondarAresta');
    expect(aviso.passo).toBe(1);
    expect(aviso.origemId).toBe(2);
    expect(aviso.aresta.vertices).toHaveLength(2);
    expect(aviso.aresta.de).toEqual([mm(30), mm(6), mm(50)]);
    expect(aviso.aresta.ate).toEqual([mm(20), mm(6), mm(50)]);
    expect(aviso.pontas).toEqual(['v1']);
    expect(aviso.degraus.length).toBeGreaterThan(0);
    expect(aviso.motivo).toMatch(/terminou em degrau/);
    expect(aviso.motivo).toMatch(/tangência/);
    expect(aviso.sugestao).toMatch(/cadeia/);
  });

  it('o aviso fica fora da forma canônica: a malha é a mesma de antes do aviso', () => {
    expect(Object.keys(n)).not.toContain('avisos');
    expect(Object.getOwnPropertyDescriptor(n, 'avisos')?.enumerable).toBe(false);
  });

  it('é determinístico: a mesma receita dá o mesmo aviso', () => {
    const outro = nucleo([abaDoTubo(), arredonda(bordaLivreDaDireita)], {}, {});
    expect(JSON.stringify(outro.avisos)).toBe(JSON.stringify(n.avisos));
  });

  it('o chanfro (filete) que termina em degrau também avisa', () => {
    const f = nucleo([abaDoTubo(), ['filete', { origemId: 2, raio: mm(3), sel: bordaLivreDaDireita }]], {}, {});
    expect(f.orfaos).toEqual([]);
    expect(f.avisos).toHaveLength(1);
    expect(f.avisos[0].op).toBe('filete');
  });
});

describe('o que não termina em degrau não avisa', () => {
  it('a borda lateral reta, que termina em canto vivo, arredonda sem aviso', () => {
    const lateral = {
      regiao: { min: [mm(29.5), -mm(0.5), mm(5)], max: [mm(30.5), mm(6.5), mm(51)] },
      onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 }, extremo: { eixo: 'x', lado: 'max' } },
    };
    const n = nucleo([abaDoTubo(), arredonda(lateral)], {}, {});
    expect(n.orfaos).toEqual([]);
    expect(n.avisos).toEqual([]);
  });

  it('o canto de uma caixa não avisa', () => {
    const n = nucleo([
      ['cubo', { origemId: 1, lado: 1 }],
      ['arredondarAresta', { origemId: 2, raio: 0.1, paineis: 4, sel: { origem: { op: 'cubo', id: 1 }, onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 }, extremo: { eixo: 'z', lado: 'max' } } } }],
    ], {}, {});
    expect(n.orfaos).toEqual([]);
    expect(n.avisos).toEqual([]);
  });
});

describe('o veredito da peça e a descrição mostram o aviso', () => {
  const passos = comParte([abaDoTubo(), arredonda(bordaLivreDaDireita)]);

  it('descreverPeca leva os avisos e formatarDescricao os escreve com a sugestão', () => {
    const n = nucleo(passos, {}, {});
    const d = descreverPeca(n);
    expect(d.avisos).toHaveLength(1);
    expect(d.avisos[0].ref).toBe('degrau');
    const texto = formatarDescricao(d, { peca: 'aba-do-tubo' });
    expect(texto).toMatch(/AVISOS DO NÚCLEO \(1\)/);
    expect(texto).toMatch(/terminou em degrau/);
    expect(texto).toMatch(/sugestão: .*cadeia/);
  });

  it('a descrição de uma peça sem aviso não ganha a seção', () => {
    const n = nucleo(comParte([abaDoTubo()]), {}, {});
    const d = descreverPeca(n);
    expect(d.avisos).toEqual([]);
    expect(formatarDescricao(d, { peca: 'aba-do-tubo' })).not.toMatch(/AVISOS DO NÚCLEO/);
  });

  it('descrever mostra o aviso na saída e na saída de erro, sem reprovar a peça', async () => {
    const receita = { meta: { nome: 'aba-do-tubo' }, PASSOS: passos };
    const r = await descreverPecaReutilizavel({ peca: 'aba-do-tubo', modulo: receita });
    expect(r.ok, r.stderr).toBe(true);
    expect(r.codigo).toBe(0);
    expect(r.stdout).toMatch(/AVISOS DO NÚCLEO \(1\)/);
    expect(r.stderr).toMatch(/1 AVISO\(S\) DO NÚCLEO/);
    expect(r.resultado.avisos).toHaveLength(1);
    expect(r.resultado.avisos[0].ref).toBe('degrau');
  });
});
