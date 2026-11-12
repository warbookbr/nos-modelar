/* contato-de-solidos-raio-na-aresta.test.mjs — o ponto fora do sólido não vira "dentro" porque o raio da contagem passa por uma aresta.
   A contagem de cruzamentos aceita o raio que acerta o triângulo com a tolerância nas coordenadas baricêntricas, e o raio que acerta a aresta
   que dois triângulos dividem contava os dois: a paridade virava, e um vértice da porta traseira esquerda do sedã, a 3,9 mm de fora do montante C,
   saía "dentro" dele, com o relato dando travessia de 4,107 mm no lado esquerdo e folga no direito, em dois lados que são imagem um do outro
   (a direção do raio não é simétrica em x, e só o lado em que o raio atravessa o outro sólido pode contá-la). O raio que acerta a aresta passa a
   ser descartado e refeito noutra direção. */
import { describe, expect, it } from 'vitest';
import { auditarParDeSolidos, pontoDentroMalha, pontoDentroMalhaPorForcaBruta, prepararSolido } from './contato-de-solidos.js';

/* o cubo unitário; a face de x = 0 sai em leque do canto (0,0,0), com a diagonal de (0,0,0) a (0,1,1). Um segundo cubo, atrás do ponto de prova,
   alarga a caixa da malha: sem ele o ponto cairia fora da caixa e o atalho da caixa responderia sem contar cruzamento nenhum. */
function cubo(dx = 0, ini = 0, quadras = [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [3, 2, 6, 7], [0, 3, 7, 4], [1, 5, 6, 2]]) {
  const pontos = [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]];
  return { V: new Map(pontos.map((p, k) => [ini + k, [p[0] + dx, p[1], p[2]]])), F: new Map(quadras.map((vs, k) => [ini + k, { id: ini + k, vs: vs.map((v) => v + ini) }])) };
}
function doisCubos(dx = 0) {
  const a = cubo(dx); const b = cubo(-3, 10);
  return { V: new Map([...a.V, ...b.V]), F: new Map([...a.F, ...b.F]) };
}
const DIRECAO = [1, 0.3713906763541037, 0.1932731453127433];
/* o ponto de que o raio sai e acerta a diagonal da face x = 0 no meio do cubo, a 1 unidade de fora dele */
const NA_DIAGONAL = [-1, 0.4 - DIRECAO[1], 0.4 - DIRECAO[2]];

describe('contato de sólidos: raio da contagem que passa pela aresta de dois triângulos', () => {
  it('o ponto de fora que o raio liga à diagonal de uma face não está dentro, com qualquer tolerância', () => {
    const solido = prepararSolido(doisCubos(), undefined, 'cubos');
    expect(solido.fechada).toBe(true);
    for (const tolerancia of [1e-9, 1e-7, 1e-6, 1e-5]) {
      expect(pontoDentroMalha(NA_DIAGONAL, solido, tolerancia)).toBe(false);
      expect(pontoDentroMalhaPorForcaBruta(NA_DIAGONAL, solido, tolerancia)).toBe(false);
    }
  });

  it('o ponto de dentro, com o raio na aresta de saída, continua dentro', () => {
    const solido = prepararSolido(doisCubos(), undefined, 'cubos');
    /* a diagonal da face x = 1 não é a do leque, mas a aresta (1,0,0)-(1,1,1) existe nela: o raio sai por ali */
    const de = [1 - 0.9, 0.4 - DIRECAO[1] * 0.9 + 0, 0.4 - DIRECAO[2] * 0.9];
    for (const tolerancia of [1e-9, 1e-6]) expect(pontoDentroMalha([0.5, 0.5, 0.5], solido, tolerancia)).toBe(true);
    expect(de).toHaveLength(3);
  });

  it('a imagem espelhada em x dá o mesmo veredito do par de sólidos', () => {
    const a = prepararSolido(doisCubos(), undefined, 'a');
    /* um vértice solto de fora, no lugar do raio na aresta, e o seu espelho em relação ao plano x = 0,5 contra o cubo espelhado (o mesmo cubo) */
    const espelho = (p) => [1 - p[0], p[1], p[2]];
    expect(pontoDentroMalha(NA_DIAGONAL, a, 1e-6)).toBe(pontoDentroMalha(espelho(NA_DIAGONAL), a, 1e-6));
    const par = auditarParDeSolidos(a, prepararSolido(cubo(3), undefined, 'b'), 1e-6);
    expect(par.estado).toBe('separadas');
  });
});
