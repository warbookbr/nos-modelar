/* subdivisao-curvas.test.mjs — o campo `curvas` do passo `subdivisao` (fatia 5 do plano das ferramentas de correção de superfície): a marca, no
 * neutro da chapa, das arestas que descendem de cada curva declarada, com a imagem espelhada na simetria, sem mudar a malha; e as recusas. */
import { describe, expect, it } from 'vitest';
import { nucleo, neutroCanonico } from '../entrada.js';

/* a placa 3 x 2 de pontos p<i><j>, com a curva do meio em j = 1 */
const nomes = []; const PONTOS = {};
for (let j = 0; j <= 2; j++) for (let i = 0; i <= 3; i++) { nomes.push(`p${i}${j}`); PONTOS[`p${i}${j}`] = [i * 0.1, 0.01 * (i - 1.5) ** 2 + 0.02 * (j - 1) ** 2, j * 0.1]; }
const faces = [];
for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) faces.push([`p${i}${j}`, `p${i}${j + 1}`, `p${i + 1}${j + 1}`, `p${i + 1}${j}`]);
const MEIO = { nome: 'meio', pontos: ['p01', 'p11', 'p21', 'p31'], continuidade: 'G1' };
const roda = (extra = {}) => nucleo([['subdivisao', { origemId: 1, vertices: nomes, faces, niveis: 2, ...extra }]], {}, PONTOS);
const recusa = (curvas) => {
  const st = roda({ curvas });
  expect(st.orfaos).toHaveLength(1);
  expect(st.orfaos[0]).toMatchObject({ passo: 0, op: 'subdivisao', ref: 'curvas' });
  return st.orfaos[0].motivo;
};

describe('subdivisao: as curvas declaradas marcadas no neutro', () => {
  it('a curva vai à cadeia dos vértices que descendem dela, com os ids do neutro, e a malha não muda', () => {
    const sem = roda(); const com = roda({ curvas: [MEIO] });
    expect(com.orfaos).toEqual([]);
    expect(JSON.stringify(neutroCanonico(com))).toBe(JSON.stringify(neutroCanonico(sem)));
    const [c] = com.chapas[0].curvas;
    expect(c).toMatchObject({ nome: 'meio', continuidade: 'G1', espelho: false });
    expect(c.vertices).toHaveLength(13);
    expect(c.ids.every((id) => com.V.has(id))).toBe(true);
    /* os vértices da cadeia ficam na linha z = 0,1 da placa refinada, e cada par seguido é aresta de uma face */
    const arestas = new Set();
    for (const f of com.F.values()) for (let k = 0; k < f.vs.length; k++) arestas.add([f.vs[k], f.vs[(k + 1) % f.vs.length]].sort().join(','));
    for (let k = 1; k < c.ids.length; k++) expect(arestas.has([c.ids[k - 1], c.ids[k]].sort().join(','))).toBe(true);
    expect(sem.chapas[0].curvas).toBeUndefined();
    expect(com.chapas[0]).toMatchObject({ borda: 'suave', vincos: [], cantos: [] });
  });

  it('na simetria em x, a imagem espelhada da curva vem com espelho: true, e a curva no plano vem uma vez', () => {
    const P = Object.fromEntries(Object.entries(PONTOS).map(([n, p]) => [n, [p[0], p[1], p[2]]]));
    const st = nucleo([['subdivisao', { origemId: 1, vertices: nomes, faces, niveis: 1, simetria: 'x', curvas: [MEIO, { nome: 'plano', pontos: ['p00', 'p01', 'p02'] }] }]], {}, P);
    expect(st.orfaos).toEqual([]);
    expect(st.chapas[0].curvas.map((c) => [c.nome, c.espelho])).toEqual([['meio', false], ['meio', true], ['plano', false]]);
    const [direta, espelhada] = st.chapas[0].curvas;
    expect(espelhada.ids.map((id) => -st.V.get(id)[0])).toEqual(direta.ids.map((id) => st.V.get(id)[0]).map((x) => expect.closeTo(x, 12)));
  });

  it('recusas: a lista, o nome, os campos, os pontos, a continuidade e a aresta', () => {
    expect(recusa('meio')).toMatch(/curvas precisa ser lista de curvas nomeadas/);
    expect(recusa([{ pontos: ['p01', 'p11'] }])).toMatch(/cada curva precisa ser objeto com nome/);
    expect(recusa([{ ...MEIO, vinco: 1 }])).toMatch(/tem campo desconhecido 'vinco'; os campos são nome, pontos/);
    expect(recusa([{ nome: 'meio', pontos: ['p01'] }])).toMatch(/precisa de pontos: lista de dois ou mais nomes de ponto/);
    expect(recusa([{ nome: 'meio', pontos: ['p01', 'zz'] }])).toMatch(/precisa de pontos: lista de dois ou mais nomes de ponto/);
    expect(recusa([{ ...MEIO, continuidade: 'G3' }])).toMatch(/tem continuidade "G3"; a continuidade é 'G1' ou 'G2'/);
    expect(recusa([{ nome: 'meio', pontos: ['p01', 'p21'] }])).toMatch(/liga 'p01' a 'p21', que não formam aresta da gaiola/);
  });
});
