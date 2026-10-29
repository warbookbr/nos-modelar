/* A oclusão exata (`oclusaoExata`, `oclusao-das-linhas.js`): o que as faces de frente escondem de uma linha, pela conta sobre a linha
   inteira, e a superfície que se vê num ponto da tela. A divisão em doze pedaços de `semOQueOVolumeEsconde` deixava o trecho escondido
   que cai no meio de um pedaço visível (o toco de quinze pixels no fim de uma aresta); aqui a fronteira é a da face. */
import { describe, expect, it } from 'vitest';
import { oclusaoExata, semOQueOVolumeEsconde, visiveisContraAsFaces } from '../src/oclusao-das-linhas.js';

/* a vista de frente: o plano é x, y, e o olho está em +z */
const V = { p: (q) => [q[0], q[1]] };
const olho = [0, 0, 1];

/* um quadrado de 100 x 100 em z = 5, voltado para o observador, em dois triângulos */
const vertices = [[0, 0, 5], [100, 0, 5], [100, 100, 5], [0, 100, 5]];
const quadrado = [{ ids: [0, 1, 2], n: [0, 0, 1] }, { ids: [0, 2, 3], n: [0, 0, 1] }];

describe('oclusaoExata: o que a face esconde da linha', () => {
  it('corta a linha onde a borda da face cruza, sem dividir em pedaços', () => {
    /* a linha de (-50, 30, 0) a (50, 30, 0) passa atrás do quadrado, que começa em x = 0: o visível é só a metade de fora */
    const saida = visiveisContraAsFaces([[[-50, 30, 0], [50, 30, 0]]], quadrado, V, olho, { vertices });
    expect(saida).toHaveLength(1);
    expect(saida[0][0]).toEqual([-50, 30, 0]);
    expect(saida[0][1][0]).toBeCloseTo(0, 5);
  });

  it('a fronteira cai num ponto que a divisão em doze pedaços não alcança', () => {
    /* o quadrado acaba em x = 100; a linha, de x = 60 a 250, sai de trás dele em x = 100: 40/190 do comprimento, que não é múltiplo de 1/12 */
    const linha = [[[60, 50, 0], [250, 50, 0]]];
    const exata = visiveisContraAsFaces(linha, quadrado, V, olho, { vertices });
    expect(exata).toHaveLength(1);
    expect(exata[0][0][0]).toBeCloseTo(100, 5);
    expect(exata[0][1][0]).toBe(250);
    /* a conta antiga erra a ponta por mais de um décimo do comprimento */
    const antiga = semOQueOVolumeEsconde(linha, quadrado, V, olho, { vertices });
    expect(Math.abs(antiga[0][0][0] - 100)).toBeGreaterThan(5);
  });

  it('a linha à frente da face, ou sobre ela, fica inteira', () => {
    const adiante = visiveisContraAsFaces([[[10, 10, 9], [90, 90, 9]]], quadrado, V, olho, { vertices });
    expect(adiante).toEqual([[[10, 10, 9], [90, 90, 9]]]);
    /* a linha sobre a própria face (a aresta da borda, ou o contato com a vizinha) não some: a folga a deixa */
    const sobre = visiveisContraAsFaces([[[10, 0, 5], [90, 0, 5]]], quadrado, V, olho, { vertices });
    expect(sobre).toEqual([[[10, 0, 5], [90, 0, 5]]]);
  });

  it('a linha que passa atrás da face e sai pela frente dela, em profundidade, é cortada onde o plano a cruza', () => {
    /* a linha vai de z = 0 (atrás) a z = 10 (à frente) ao longo de x: cruza o plano z = 5 em x = 50 */
    const saida = visiveisContraAsFaces([[[0, 50, 0], [100, 50, 10]]], quadrado, V, olho, { vertices, folga: 0 });
    expect(saida).toHaveLength(1);
    expect(saida[0][0][0]).toBeCloseTo(50, 5);
    expect(saida[0][1]).toEqual([100, 50, 10]);
  });

  it('uma face de outro volume esconde a linha como a do próprio, e o que sobra entre duas faces é o intervalo livre', () => {
    const verts = [...vertices, [200, 0, 5], [300, 0, 5], [300, 100, 5], [200, 100, 5]];
    const faces = [...quadrado, { ids: [4, 5, 6], n: [0, 0, 1] }, { ids: [4, 6, 7], n: [0, 0, 1] }];
    const saida = visiveisContraAsFaces([[[-20, 50, 0], [320, 50, 0]]], faces, V, olho, { vertices: verts });
    expect(saida.map(([a, b]) => [Math.round(a[0]) + 0, Math.round(b[0]) + 0])).toEqual([[-20, 0], [100, 200], [300, 320]]);
  });

  it('é determinística: a mesma entrada dá a mesma saída', () => {
    const linhas = [[[-50, 30, 0], [150, 70, 0]], [[0, 0, 0], [100, 100, 0]]];
    expect(JSON.stringify(visiveisContraAsFaces(linhas, quadrado, V, olho, { vertices }))).toBe(JSON.stringify(visiveisContraAsFaces(linhas, quadrado, V, olho, { vertices })));
  });
});

describe('oclusaoExata: a superfície que se vê num ponto', () => {
  it('devolve a face mais perto do olho, com a normal e o plano dela, e null onde nenhuma cobre', () => {
    const verts = [...vertices, [0, 0, 8], [100, 0, 8], [100, 100, 8]];
    const faces = [...quadrado, { ids: [4, 5, 6], n: [0, 0, 1] }];
    const { superficieEm } = oclusaoExata(faces, V, olho, { vertices: verts });
    const dentro = superficieEm(70, 20);
    expect(dentro.z).toBeCloseTo(8, 6);
    expect(dentro.n).toEqual([0, 0, 1]);
    expect(dentro.plano(1000, -50)).toBeCloseTo(8, 9);
    expect(superficieEm(20, 70).z).toBeCloseTo(5, 9);
    expect(superficieEm(150, 50)).toBeNull();
  });
});
