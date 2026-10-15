/* booleana-casca-raspada.test.ts — o canto solto que a booleana deixava quando o corte cruza a casca de um loft (achado na
   rodada das asas do avião, em 2026-10-15).

   O DEFEITO. O vértice novo de uma costura sai da Manifold em Float32 e o núcleo o recalcula pelos planos das faces de entrada que
   se encontram nele. A casca de um loft tem faces de centenas de milímetros que não são planas (o empeno chega a décimos de
   milímetro), e duas faces vizinhas da casca ficam a uma fração de grau uma da outra. Dois planos assim se cortam numa reta que
   desliza ao longo da casca quando um deles muda de décimos de milímetro, e a interseção dos três planos (as duas faces da casca
   e a face do corte) dava o vértice a centenas de milímetros do corte, fora da caixa de quem o produziu. Nas asas do avião o vão
   do aileron deixou um canto a 277 mm do corte; a receita se defendia deslocando os vãos em [3, -0,5] mm.

   A CORREÇÃO. O vértice novo não anda da posição da Manifold mais que `tetoDaCorrecao` (2^-15 da meia-caixa dos operandos).

   OS DOIS GRUPOS DE TESTES. O primeiro é o menor caso: um loft de três seções de quatro pontos e uma caixa que atravessa a aresta entre as
   duas faces vizinhas. O segundo é o das duas peças reais, com o deslocamento que a receita dá aos vãos zerado numa cópia dos
   parâmetros: as receitas em si não mudam. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { carregarManifold, nucleo } from '../entrada.js';
// @ts-expect-error — serviço de autoria em JavaScript.
import { executarReceita } from '../../../src/autoria/executar-receita.js';
// @ts-expect-error — ferramenta MJS.
import { conferirPontos } from '../../../tools/mecanifica/conferir-pontos.mjs';
import { arestasSemPar, vinculosNaoManifold } from '../../../tools/oficina/conferir-malha';

const m = (mm: number) => mm / 1000;

type Estacao = { x: number; z0: number; y0: number; corda: number; esp: number };
type Cortador = { larg: number; alt: number; prof: number; em: [number, number, number] };

const area = (p: number[][]) => {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return s / 2;
};

/* Os passos de um loft em x (as seções no plano y e z, em milímetro) fechado por dois polos, e de uma caixa subtraída dele. O
   perfil são pontos [fração da corda, fração da espessura] de cada seção. */
function passosDaCasca(estacoes: Estacao[], perfil: number[][], cortador: Cortador, avanco = 0.5) {
  const secs = estacoes.map((e) => ({ x: e.x, pts: perfil.map(([a, b]) => [e.z0 + a * e.corda, e.y0 + b * e.esp]) }));
  const cz = secs[0].pts.reduce((s, p) => s + p[0], 0) / secs[0].pts.length;
  const cy = secs[0].pts.reduce((s, p) => s + p[1], 0) / secs[0].pts.length;
  const secoes = secs.map(({ x, pts }) => {
    let contorno = pts.map(([z, y]) => [m(y - cy), -m(z - cz)]);
    if (area(contorno) < 0) contorno = contorno.reverse();
    return { pos: [m(x), m(cy), m(cz)], contorno };
  });
  const polo = (e: { x: number; pts: number[][] }, sentido: number) => {
    const mz = e.pts.reduce((a, p) => a + p[0], 0) / e.pts.length;
    const my = e.pts.reduce((a, p) => a + p[1], 0) / e.pts.length;
    const pos = [m(e.x) + sentido * m(avanco), m(cy), m(cz)];
    return { pos, d: [0, m(my - cy), m(mz - cz)], regiao: { min: pos.map((v) => v - m(avanco) / 4), max: pos.map((v) => v + m(avanco) / 4) } };
  };
  const p0 = polo(secs[0], -1), p1 = polo(secs[secs.length - 1], 1);
  const casca = [
    ['loft', { origemId: 1, secoes: [{ pos: p0.pos, raio: 0 }, ...secoes, { pos: p1.pos, raio: 0 }], lados: secoes[0].contorno.length, orientacao: [0, 1, 0] }],
    ['moveV', { sel: { regiao: p0.regiao }, d: p0.d }],
    ['moveV', { sel: { regiao: p1.regiao }, d: p1.d }],
  ];
  const corte = [
    ['cubo', { origemId: 2, larg: m(cortador.larg), alt: m(cortador.alt), prof: m(cortador.prof) }],
    ['transladar', { d: cortador.em.map(m), sel: { origem: { op: 'cubo', id: 2 } } }],
  ];
  const subtrai = ['subtrair', { origemId: 3, solidos: [{ origem: { op: 'loft', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }];
  return { casca, corte, subtrai };
}

type Caixa = { min: number[]; max: number[] };
const caixaDe = (pontos: number[][]): Caixa => ({
  min: [0, 1, 2].map((c) => Math.min(...pontos.map((p) => p[c]))),
  max: [0, 1, 2].map((c) => Math.max(...pontos.map((p) => p[c]))),
});

describe('o corte que atravessa a aresta entre duas faces quase coplanares da casca', () => {
  /* Três seções de quatro pontos, com a espessura afinando mais depressa que a corda (as faces da casca saem empenadas) e o diedro
     mudando 0,2 grau na seção do meio. A caixa vai de x 400 a 1600 e atravessa a aresta da seção do meio, que as duas faces da
     casca dividem, com as duas faces dela em z. */
  const estacoes: Estacao[] = [
    { x: 0, z0: 4000, y0: 1000, corda: 1200, esp: 120 },
    { x: 1000, z0: 4250, y0: 1020, corda: 1000, esp: 106 },
    { x: 2000, z0: 4500, y0: 1040 + 1000 * Math.tan((0.2 * Math.PI) / 180), corda: 700, esp: 58 },
  ];
  const perfil = [[0, 0], [0.5, 1], [1, 0], [0.5, -0.8]];
  const cortador: Cortador = { larg: 1200, alt: 600, prof: 500, em: [1000, 700, 4900] };
  const { casca, corte, subtrai } = passosDaCasca(estacoes, perfil, cortador);

  it('todo vértice novo fica dentro da caixa do corte e da caixa da casca (saía a 730 mm do corte)', async () => {
    await carregarManifold();
    const antes = nucleo([...casca, ...corte], {});
    const depois = nucleo([...casca, ...corte, subtrai], {});
    expect(depois.orfaos).toEqual([]);
    expect(vinculosNaoManifold(depois)).toEqual([]);
    expect(arestasSemPar(depois)).toEqual([]);

    const soCasca = nucleo(casca, {});
    const caixaDaCasca = caixaDe([...soCasca.V.values()]);
    const [cx, cy, cz] = cortador.em.map(m);
    const caixaDoCorte: Caixa = {
      min: [cx - m(cortador.larg) / 2, cy, cz - m(cortador.prof) / 2],
      max: [cx + m(cortador.larg) / 2, cy + m(cortador.alt), cz + m(cortador.prof) / 2],
    };
    const novos = [...depois.V].filter(([id]: [number, number[]]) => !antes.V.has(id)).map(([, p]: [number, number[]]) => p);
    expect(novos.length).toBeGreaterThan(10);

    /* um vértice novo está nas superfícies dos dois operandos, e por isso nas caixas dos dois; 0,1 mm cobre o erro de Float32 e a
       correção pelos planos, e o defeito passava de 100 mm */
    const folga = 1e-4;
    for (const p of novos) {
      for (const caixa of [caixaDaCasca, caixaDoCorte]) {
        for (let c = 0; c < 3; c++) {
          expect(p[c]).toBeGreaterThanOrEqual(caixa.min[c] - folga);
          expect(p[c]).toBeLessThanOrEqual(caixa.max[c] + folga);
        }
      }
    }
  });

  it('os vértices que o corte põe sobre a aresta da seção do meio ficam na seção, em x = 1000 (saíam em x = 410 e 1732)', async () => {
    await carregarManifold();
    const depois = nucleo([...casca, ...corte, subtrai], {});
    const naSecaoDoMeio = [...depois.V.values()].filter((p: number[]) => Math.abs(p[0] - m(1000)) < 1e-4 && Math.abs(p[2] - m(4900 - 250)) < 1e-4);
    /* o plano de trás do corte (z = 4650) cruza as duas arestas da seção do meio, a de cima e a de baixo da frente da casca */
    expect(naSecaoDoMeio.length).toBeGreaterThanOrEqual(2);
  });
});

/* As duas peças do avião que a receita protegia com o deslocamento do vão. A cópia dos parâmetros zera o deslocamento e a receita
   original fica como está. Se a receita deixar de ter o campo (porque a rodada de ajustes tirou o deslocamento), `zera` não faz
   nada e o teste mede a receita como ela está, com os mesmos PONTOS. */
const PECAS = [
  { nome: 'aviao/asas', caminho: '../../pecas/aviao/partes/asas/receita.js', zera: (t: any) => { if (t.comando) t.comando.assentamento = [0, 0]; } },
  { nome: 'aviao/empenagem-vertical', caminho: '../../pecas/aviao/partes/empenagem-vertical/receita.js', zera: (t: any) => { if (t.leme) t.leme.deslocamentoDoVao = [[0, 0], [0, 0], [0, 0], [0, 0]]; } },
];

describe('as peças reais com o vão sem deslocamento', () => {
  for (const peca of PECAS) {
    it(`${peca.nome}: os PONTOS passam, sem órfão e sem aresta solta (a caixa saía maior que a declarada: 277 mm nas asas, 6 mm na deriva)`, async () => {
      await carregarManifold();
      const modulo: any = await import(/* @vite-ignore */ peca.caminho);
      const original = modulo.default;
      const parametros = structuredClone(original.PARAMS);
      peca.zera(parametros);
      const copia = { ...original, PARAMS: parametros, PASSOS: modulo.gerarPassos(parametros), PONTOS: modulo.pontosDeclarados(parametros) };

      const { neutro } = executarReceita(copia);
      expect(neutro.orfaos).toEqual([]);
      expect(vinculosNaoManifold(neutro)).toEqual([]);
      expect(arestasSemPar(neutro)).toEqual([]);

      const veredito = conferirPontos(copia, { quem: peca.nome });
      const reprovados = veredito.pontos.filter((p: any) => !p.passou).map((p: any) => `${p.nome}: esperado ${p.esperado}, obtido ${p.obtido}`);
      expect(reprovados).toEqual([]);
      expect(veredito.ok).toBe(true);
    }, 60_000);
  }
});
