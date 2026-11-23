/* pedido.test.js — a resposta de cada item do pedido em formas de prova: uma caixa oca para o espaço, uma chapa com furo quadrado
   para a saída de ar, a posição pela ficha, a passagem sempre não cumprida, as ligações contra as redes traçadas, e o pedido que
   cita peça inexistente recusado sem resposta. */
import { describe, expect, it } from 'vitest';
import { montarFicha } from '../src/ficha.js';
import { responderPedido } from '../src/pedido.js';

/* a caixa de `a` a `b`, faces para fora (ou para dentro, com `dentro`) */
function caixa(a, b, dentro = false) {
  const p = (x, y, z) => [x ? b[0] : a[0], y ? b[1] : a[1], z ? b[2] : a[2]];
  const quads = [
    [p(0, 0, 0), p(0, 1, 0), p(1, 1, 0), p(1, 0, 0)], [p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)],
    [p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)], [p(0, 1, 0), p(0, 1, 1), p(1, 1, 1), p(1, 1, 0)],
    [p(0, 0, 0), p(0, 0, 1), p(0, 1, 1), p(0, 1, 0)], [p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)],
  ];
  const tris = quads.flatMap(([q, r, s, t]) => [[q, r, s], [q, s, t]]);
  return dentro ? tris.map(([x, y, z]) => [x, z, y]) : tris;
}

const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const declaracao = {
  formato: 'modelar.ponte', versao: 1, objeto: 'prova', revisao: 2,
  referencial: { frente: '+z', origem: 'canto', poseZero: 'a da montagem' },
  conjuntos: [{ id: 'fixo', movel: false, instancias: ['caixa', 'chapa'] }],
  juntas: [],
};
const instancias = [
  { id: 'caixa', ref: 'prova/caixa', pose: { rotacao: I, deslocamento: [0, 0, 0] }, portas: [] },
  { id: 'chapa', ref: 'prova/chapa', pose: { rotacao: I, deslocamento: [0.2, 0, 0] }, portas: [] },
];
const ficha = montarFicha({ declaracao, instancias, malha: { caminho: 'prova.glb', caixa: { min: [0, 0, 0], max: [300, 100, 100] }, faces: 1 } });
/* a caixa oca de paredes de 10 mm, e a chapa de 5 mm em z com um furo de 20 × 20 no meio, feita de quatro barras */
const malhas = new Map([
  ['caixa', [...caixa([0, 0, 0], [100, 100, 100]), ...caixa([10, 10, 10], [90, 90, 90], true)]],
  ['chapa', [[200, 240, 0, 100], [260, 300, 0, 100], [240, 260, 0, 40], [240, 260, 60, 100]].flatMap(([x0, x1, y0, y1]) => caixa([x0, y0, 0], [x1, y1, 5]))],
]);
const motivo = { linhaDaMatriz: 'ponte-espaco-placa-e-chicote', texto: 'prova', resultado: { grandeza: 'g', valor: 1, unidade: 'mm', origem: 'estimativa' } };
const pedido = (itens) => ({ tipo: 'pedido', versao: '1.1', objeto: 'prova', ficha: { caminho: 'prova.ficha.json', revisao: 2 }, itens: itens.map((i) => ({ ...i, motivo })) });
const responder = (itens, placas = {}) => responderPedido({ pedido: pedido(itens), ficha, malhas, placas });
const espaco = (id, caixaMinima, centro, tolerancia = 4) => ({ id, tipo: 'espaco', dentroDe: 'caixa', conteudo: 'c', caixaMinima, centro, tolerancia });

describe('responderPedido', () => {
  it('o espaço: cabe no vão, não cabe maciço dentro da parede nem grande demais', () => {
    const r = responder([espaco('vao', [20, 20, 20], [50, 50, 50]), espaco('parede', [4, 4, 4], [5, 50, 50], 0), espaco('grande', [85, 85, 85], [50, 50, 50])]);
    expect(r.itens.map((i) => i.estado)).toEqual(['cumprido', 'nao-cumprido', 'nao-cumprido']);
    expect(r.pedido.itens[0].resposta).toEqual({ estado: 'cumprido', revisaoDaFicha: 2 });
    expect(r.itens[1].motivo).toMatch(/1 ficam dentro de um sólido/);
    expect(r.itens[2].motivo).toMatch(/cortam a malha/);
  });

  it('a posição pela ficha, com a distância e o ângulo no motivo', () => {
    const r = responder([
      { id: 'ok', tipo: 'posicao', alvo: 'chapa', posicao: [200, 0, 0], orientacao: { eixo: [0, 1, 0], angulo: 0 }, tolerancia: { posicao: 1, angulo: 1 } },
      { id: 'longe', tipo: 'posicao', alvo: 'chapa', posicao: [210, 0, 0], orientacao: { eixo: [0, 1, 0], angulo: 30 }, tolerancia: { posicao: 5, angulo: 5 } },
    ]);
    expect(r.itens.map((i) => i.estado)).toEqual(['cumprido', 'nao-cumprido']);
    expect(r.itens[1].motivo).toMatch(/10\.0 mm .* 30\.0 graus/);
  });

  it('a saída de ar mede o furo da chapa: 400 mm² cumprem 300, não cumprem 600, e o ponto fechado não tem abertura', () => {
    const ar = (id, areaMinima, centro, tolerancia = 3) => ({ id, tipo: 'saidaDeAr', em: 'chapa', areaMinima, centro, normal: [0, 0, 1], tolerancia });
    const r = responder([ar('cabe', 300, [250, 50, 5]), ar('pouco', 600, [250, 50, 5]), ar('fechado', 100, [220, 20, 5])]);
    expect(r.itens.map((i) => i.estado)).toEqual(['cumprido', 'nao-cumprido', 'nao-cumprido']);
    const area = Number(/cerca de (\d+) mm²/.exec(r.itens[1].motivo)[1]);
    expect(area).toBeGreaterThan(300);
    expect(area).toBeLessThan(500);
    expect(r.itens[2].motivo).toMatch(/não há abertura/);
  });

  it('a passagem volta não cumprida, e as ligações comparam com as redes traçadas da placa', () => {
    const ficha2 = { ...ficha, portas: [1, 2, 3].map((k) => ({ peca: 'chapa', id: `t${k}`, tipo: 'passivo', posicao: { valor: [0, 0, 0], origem: 'medido' }, tensao: { ausente: true, motivo: 'passivo' } })) };
    const redes = [{ id: 'rede-a', terminais: [{ peca: 'chapa', porta: 't1' }, { peca: 'chapa', porta: 't2' }] }];
    const itens = [
      { id: 'cabo', tipo: 'passagem', de: [{ peca: 'chapa', porta: 't1' }], para: [{ peca: 'chapa', porta: 't2' }], atravessa: [], diametroMinimo: 3, raioDeCurvaturaMinimo: 10 },
      { id: 'lig', tipo: 'ligacoes', placa: 'chapa', redes },
      { id: 'lig-outra', tipo: 'ligacoes', placa: 'chapa', redes: [{ id: 'rede-a', terminais: [{ peca: 'chapa', porta: 't1' }, { peca: 'chapa', porta: 't3' }] }] },
    ];
    const r = responderPedido({ pedido: pedido(itens), ficha: ficha2, malhas, placas: { chapa: { redes } } });
    expect(r.itens.map((i) => i.estado)).toEqual(['nao-cumprido', 'cumprido', 'nao-cumprido']);
    expect(r.pedido.itens[2].resposta.redes).toEqual(['rede-a']);
  });

  it('recusa o pedido que cita peça inexistente ou outra revisão, sem escrever resposta', () => {
    const r = responder([{ id: 'x', tipo: 'posicao', alvo: 'motor', posicao: [0, 0, 0], orientacao: { eixo: [0, 1, 0], angulo: 0 }, tolerancia: { posicao: 1, angulo: 1 } }]);
    expect(r.recusa).toMatch(/\$\.itens\[0\]\.alvo cita uma peça que não existe/);
    expect(r.pedido).toBeUndefined();
    const velho = responderPedido({ pedido: { ...pedido([]), itens: [{ ...espaco('e', [1, 1, 1], [50, 50, 50]), motivo }], ficha: { caminho: 'p', revisao: 1 } }, ficha, malhas });
    expect(velho.recusa).toMatch(/ficha\.revisao/);
  });
});
