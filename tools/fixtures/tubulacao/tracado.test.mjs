/* tracado.test.mjs — a fatia 1 do plano da tubulação: a tabela de bitolas e a leitura do traçado, com a conexão de cada nó,
 * o comprimento de corte de cada trecho e cada recusa dizendo o nó ou o trecho e o motivo. */
import { describe, expect, it } from 'vitest';
import { BITOLAS_DE_ACO, BITOLAS_DE_PVC, bitola } from '../../../procedural/familias/tubulacao/tabela.js';
import { lerTracado } from '../../../procedural/familias/tubulacao/tracado.js';
import { L_DE_PVC, REDE_DE_ACO } from './tracados.mjs';

const comTrocado = (base, f) => { const t = JSON.parse(JSON.stringify(base)); f(t); return t; };

describe('tabela de bitolas', () => {
  it('traz o aço de 1/2" a 8" da ASME B36.10M e da B16.9 e o PVC de 20 a 110 mm da NBR 5648', () => {
    expect(Object.keys(BITOLAS_DE_ACO)).toHaveLength(12);
    expect(bitola('aco', '2')).toMatchObject({ de: 60.3, parede: 3.91, curva: 76, te: 64, reducao: 76, tampao: 38 });
    expect(Object.keys(BITOLAS_DE_PVC)).toEqual(['20', '25', '32', '40', '50', '60', '75', '85', '110']);
    expect(bitola('pvc', '110')).toMatchObject({ de: 110, parede: 6.1 });
    expect(() => bitola('aco', '10')).toThrow(/aceitas/);
    expect(() => bitola('cobre', '1')).toThrow(/material/);
  });
});

describe('leitura do traçado', () => {
  it('a rede de aço tem a conexão de cada nó e o corte de cada trecho', () => {
    const r = lerTracado(REDE_DE_ACO);
    const no = Object.fromEntries(r.nos.map((n) => [n.nome, n]));
    expect(no.entrada.tipo).toBe('ponta');
    expect(no.curva1).toMatchObject({ tipo: 'curva', raio: 76 });
    expect(no.curva1.desvio).toBeCloseTo(90, 9);
    expect(no.curva1.avanco).toBeCloseTo(76, 9);
    expect(no.te).toMatchObject({ tipo: 'te', centroABoca: 64 });
    expect(no.reducao).toMatchObject({ tipo: 'reducao', maior: '2', menor: '1.1/2', comprimento: 76 });
    const [entrada, subida] = r.trechos;
    expect(entrada.corte).toBeCloseTo(600 - 76, 9);
    expect(subida.corte).toBeCloseTo(500 - 76 - 64, 9);
    expect(r.trechos[5].corte).toBeCloseTo(400 - 38, 9);
  });

  it('a curva de 45° avança R·tan(22,5°)', () => {
    const t = { material: 'aco', nos: [{ nome: 'a', posicao: [0, 0, 0] }, { nome: 'b', posicao: [500, 0, 0] }, { nome: 'c', posicao: [1000, 0, 500] }], trechos: [{ de: 'a', para: 'b', bitola: '2' }, { de: 'b', para: 'c', bitola: '2' }] };
    expect(lerTracado(t).nos[1].avanco).toBeCloseTo(76 * Math.tan(Math.PI / 8), 9);
  });

  it('o L de PVC usa o joelho de raio de um diâmetro', () => {
    expect(lerTracado(L_DE_PVC).nos[1]).toMatchObject({ tipo: 'curva', raio: 50 });
  });

  it('recusa cada traçado errado dizendo o nó ou o trecho e o motivo', () => {
    const casos = [
      [comTrocado(REDE_DE_ACO, (t) => { t.nos[1].nome = 'entrada'; }), /'entrada' aparece duas vezes/],
      [comTrocado(REDE_DE_ACO, (t) => { t.trechos[0].para = 'nada'; }), /'nada', que não existe/],
      [comTrocado(REDE_DE_ACO, (t) => { t.trechos[0].bitola = '9'; }), /trecho 0.*'9' não existe/],
      [comTrocado(REDE_DE_ACO, (t) => { t.nos[0].posicao = [550, 0, 0]; }), /trecho 0 .* curto demais/],
      [{ material: 'aco', nos: [{ nome: 'a', posicao: [0, 0, 0] }, { nome: 'b', posicao: [500, 0, 0] }, { nome: 'c', posicao: [1000, 0, 60] }], trechos: [{ de: 'a', para: 'b', bitola: '1' }, { de: 'b', para: 'c', bitola: '1' }] }, /'b' desvia .*entre 1° e 15°/],
      [comTrocado(REDE_DE_ACO, (t) => { t.nos[2].posicao = [100, 0, 300]; }), /acima de|vai até 90°/],
      [comTrocado(REDE_DE_ACO, (t) => { t.trechos[1].bitola = '3'; }), /bitolas 2 e 3|bitolas 3 e 2|tê entre bitolas/],
      [comTrocado(REDE_DE_ACO, (t) => { t.nos[3].posicao = [1000, 0, 800]; }), /derivação a/],
      [comTrocado(REDE_DE_ACO, (t) => { t.nos[1].valvula = 'esfera'; }), /'curva1' tem válvula, mas não é um nó reto/],
      [comTrocado(REDE_DE_ACO, (t) => { t.nos[2].fim = 'flange'; }), /'te' tem fim 'flange' e 3 trechos/],
      [comTrocado(L_DE_PVC, (t) => { t.nos[0].fim = 'flange'; }), /'a': o flange e a válvula só existem em aço/],
      [{ material: 'aco', nos: [{ nome: 'a', posicao: [0, 0, 0] }, { nome: 'b', posicao: [600, 0, 0], valvula: 'esfera' }, { nome: 'c', posicao: [1200, 0, 0] }], trechos: [{ de: 'a', para: 'b', bitola: '5' }, { de: 'b', para: 'c', bitola: '5' }] }, /esfera de 5" não tem a face a face/],
      [{ material: 'aco', nos: ['a', 'b', 'c', 'd', 'e'].map((nome, i) => ({ nome, posicao: [[0, 0, 0], [500, 0, 0], [-500, 0, 0], [0, 0, 500], [0, 0, -500]][i] })), trechos: ['b', 'c', 'd', 'e'].map((para) => ({ de: 'a', para, bitola: '1' })) }, /4 trechos/],
    ];
    for (const [tracado, motivo] of casos) expect(() => lerTracado(tracado)).toThrow(motivo);
  });

  it('recusa dois trechos que se cruzam', () => {
    const t = { material: 'aco', nos: [{ nome: 'a', posicao: [0, 0, 0] }, { nome: 'b', posicao: [1000, 0, 0] }, { nome: 'c', posicao: [500, -500, 0] }, { nome: 'd', posicao: [500, 500, 0] }], trechos: [{ de: 'a', para: 'b', bitola: '1' }, { de: 'c', para: 'd', bitola: '1' }] };
    expect(() => lerTracado(t)).toThrow(/trechos 0 \(a → b\) e 1 \(c → d\) se cruzam/);
  });
});
