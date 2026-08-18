import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço neutro JavaScript exercitado pelo contrato público.
import { auditarIntersecoesMontagem } from '../../src/autoria/auditar-intersecoes-montagem.js';

const pose = (deslocamento = [0, 0, 0]) => ({ escala: 1, rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento });

function caixaNeutra(min: number[], max: number[], aberta = false) {
  const pontos = [
    [min[0], min[1], min[2]], [max[0], min[1], min[2]], [max[0], max[1], min[2]], [min[0], max[1], min[2]],
    [min[0], min[1], max[2]], [max[0], min[1], max[2]], [max[0], max[1], max[2]], [min[0], max[1], max[2]],
  ];
  const faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  const selecionadas = aberta ? faces.slice(1) : faces;
  return {
    V: new Map(pontos.map((ponto, id) => [id, ponto])),
    F: new Map(selecionadas.map((vs, id) => [id, { id, vs }])),
  };
}

function anelQuadrado() {
  const externos = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const internos = [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]];
  const pontos = [
    ...externos.map(([x, y]) => [x, y, 0]), ...externos.map(([x, y]) => [x, y, 1]),
    ...internos.map(([x, y]) => [x, y, 0]), ...internos.map(([x, y]) => [x, y, 1]),
  ];
  const faces: number[][] = [];
  for (let i = 0; i < 4; i += 1) {
    const j = (i + 1) % 4;
    faces.push([i, j, 4 + j, 4 + i]);
    faces.push([8 + i, 12 + i, 12 + j, 8 + j]);
    faces.push([4 + i, 4 + j, 12 + j, 12 + i]);
    faces.push([i, 8 + i, 8 + j, j]);
  }
  return { V: new Map(pontos.map((ponto, id) => [id, ponto])), F: new Map(faces.map((vs, id) => [id, { id, vs }])) };
}

function montagem(instancias: any[]) {
  return { id: 'raiz', instancias: instancias.map(({ id, neutro, deslocamento = [0, 0, 0] }) => ({
    id, caminho: [id], alvo: { tipo: 'peca', ref: id }, definicao: { neutro }, poseMundo: pose(deslocamento),
  })) };
}

describe('auditarIntersecoesMontagem', () => {
  it('descarta pares separados e detecta caixas atravessadas por malha', () => {
    const resultado = auditarIntersecoesMontagem(montagem([
      { id: 'a', neutro: caixaNeutra([0, 0, 0], [1, 1, 1]) },
      { id: 'b', neutro: caixaNeutra([0.5, 0.5, 0.5], [1.5, 1.5, 1.5]) },
      { id: 'c', neutro: caixaNeutra([3, 0, 0], [4, 1, 1]) },
    ]));
    expect(resultado.cobertura).toMatchObject({ paresTotais: 3, paresVerificados: 3, inconclusivos: 0, completa: true });
    expect(resultado.pares).toEqual([
      expect.objectContaining({ a: ['a'], b: ['b'], estado: 'interpenetram' }),
      expect.objectContaining({ a: ['a'], b: ['c'], estado: 'separadas', metodo: 'caixa-mundo' }),
      expect.objectContaining({ a: ['b'], b: ['c'], estado: 'separadas', metodo: 'caixa-mundo' }),
    ]);
  });

  it('separa contato de interpenetração', () => {
    const resultado = auditarIntersecoesMontagem(montagem([
      { id: 'a', neutro: caixaNeutra([0, 0, 0], [1, 1, 1]) },
      { id: 'b', neutro: caixaNeutra([1, 0, 0], [2, 1, 1]) },
    ]));
    expect(resultado.pares[0]).toMatchObject({ estado: 'encostam', metodo: 'superficie-na-tolerancia' });
  });

  it('detecta contenção e não confunde anel com peça dentro do furo', () => {
    const contida = auditarIntersecoesMontagem(montagem([
      { id: 'externa', neutro: caixaNeutra([-2, -2, -2], [2, 2, 2]) },
      { id: 'interna', neutro: caixaNeutra([-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]) },
    ])).pares[0];
    expect(contida.estado).toBe('interpenetram');

    const furo = auditarIntersecoesMontagem(montagem([
      { id: 'anel', neutro: anelQuadrado() },
      { id: 'pino', neutro: caixaNeutra([-0.3, -0.3, 0.1], [0.3, 0.3, 0.9]) },
    ])).pares[0];
    expect(furo).toMatchObject({ estado: 'separadas', metodo: 'malha-canonica' });
  });

  it('fecha para inconclusivo em malha aberta e permite foco explícito', () => {
    const montagemAberta = montagem([
      { id: 'aberta', neutro: caixaNeutra([0, 0, 0], [1, 1, 1], true) },
      { id: 'sobreposta', neutro: caixaNeutra([0.2, 0.2, 0.2], [1.2, 1.2, 1.2]) },
      { id: 'longe', neutro: caixaNeutra([3, 0, 0], [4, 1, 1]) },
    ]);
    const resultado = auditarIntersecoesMontagem(montagemAberta, { caminho: ['aberta'] });
    expect(resultado.escopo).toMatchObject({ caminho: ['aberta'], paresOmitidosPorFoco: 1 });
    expect(resultado.pares).toEqual([
      expect.objectContaining({ a: ['aberta'], b: ['longe'], estado: 'separadas', metodo: 'caixa-mundo' }),
      expect.objectContaining({ a: ['aberta'], b: ['sobreposta'], estado: 'inconclusivo' }),
    ]);
    expect(resultado.cobertura.completa).toBe(false);
  });

  it('expande montagem recursiva e mantém caminhos semânticos', () => {
    const filha = {
      id: 'filha',
      instancias: [
        { id: 'a', caminho: ['sub', 'a'], alvo: { tipo: 'peca', ref: 'a' }, definicao: { neutro: caixaNeutra([0, 0, 0], [1, 1, 1]) }, poseMundo: pose() },
        { id: 'b', caminho: ['sub', 'b'], alvo: { tipo: 'peca', ref: 'b' }, definicao: { neutro: caixaNeutra([2, 0, 0], [3, 1, 1]) }, poseMundo: pose() },
      ],
    };
    const resultado = auditarIntersecoesMontagem({ id: 'raiz', instancias: [{
      id: 'sub', caminho: ['sub'], alvo: { tipo: 'montagem', ref: 'filha' }, poseMundo: pose(), montagem: filha,
    }] });
    expect(resultado.escopo).toMatchObject({ folhas: 2 });
    expect(resultado.pares[0]).toMatchObject({ a: ['sub', 'a'], b: ['sub', 'b'], estado: 'separadas' });
  });
});
