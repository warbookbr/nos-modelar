/* conferir.test.js — o conferidor do cobre sobre o traçado declarado à mão na placa de prova: o certo passa sem violação, cada
 * traçado errado é recusado pela regra dele com a rede, a face, o ponto e o valor, e trocar o rótulo de rede de um trecho não
 * muda o que ele acha, porque a ligação é medida pelo cobre. A placa com o traçado sai fechada e determinística. */
import { describe, expect, it } from 'vitest';
import tracadoDeProva from './placa-de-prova.tracado.json' with { type: 'json' };
import pedido from './placa-de-prova.pedido.json' with { type: 'json' };
import { conferirCobre } from './conferir.js';
import { pecasDoTracado } from './geometria.js';
import { PLACA, placaDeclarada } from '../placa.js';
import { PLACA_DE_PROVA } from '../placa-de-prova.js';
import { ErroFamilia } from '../../../../src/autoria/familia.js';

const semCobre = placaDeclarada(PLACA_DE_PROVA);
const atravessam = new Set(semCobre.furos.filter((f) => f.terminal).map((f) => `${f.peca}.${f.terminal}`));
const ilhas = semCobre.ilhas.map((i) => ({ ...i, atravessa: atravessam.has(`${i.peca}.${i.terminal}`) }));
const contorno = semCobre.pecas[0].contorno;
const listaInteira = pedido.itens[0].redes;
const daProva = listaInteira.filter((r) => tracadoDeProva.redes.some((t) => t.id === r.id));
const copia = (x) => JSON.parse(JSON.stringify(x));
const conferir = (tracado, lista = daProva) => conferirCobre({ contorno, ilhas, pecas: pecasDoTracado(tracado), lista, regras: PLACA });
const regras = (r) => r.violacoes.map((v) => v.regra);
const comTrecho = (rede, trecho) => { const t = copia(tracadoDeProva); t.redes.find((r) => r.id === rede).trechos.push(trecho); return t; };

describe('conferirCobre', () => {
  it('o traçado certo passa, com as três redes fechadas e os mínimos medidos acima das regras', () => {
    const r = conferir(tracadoDeProva);
    expect(r.violacoes).toEqual([]);
    expect(r.redes.every((x) => x.fechada)).toBe(true);
    expect(r.minimos.largura).toBeGreaterThanOrEqual(PLACA.trilhaMinima);
    expect(r.minimos.distancia).toBeGreaterThanOrEqual(PLACA.folga);
    expect(r.minimos.borda).toBeGreaterThanOrEqual(PLACA.borda);
    expect(r.minimos.furo).toBeGreaterThanOrEqual(PLACA.via.furo);
    expect(r.minimos.anel).toBeGreaterThanOrEqual(PLACA.via.anel);
  });

  it('recusa a trilha mais estreita que a regra, com a rede, a face e o valor', () => {
    const t = copia(tracadoDeProva); t.redes[0].trechos[0].largura = 0.1;
    const v = conferir(t).violacoes.find((x) => x.regra === 'largura');
    expect(v).toMatchObject({ rede: 'led-verde', face: 'cima', medido: 0.1, exigido: PLACA.trilhaMinima });
    expect(v.terminais).toEqual(['r1.2', 'd1.anodo']);
  });

  it('recusa a trilha mais estreita que a exigência da rede, acima da regra', () => {
    const lista = copia(daProva); lista.find((r) => r.id === 'sinal-1').larguraMinima = 0.4;
    expect(conferir(tracadoDeProva, lista).violacoes.find((x) => x.regra === 'largura')).toMatchObject({ rede: 'sinal-1', exigido: 0.4, medido: 0.25 });
  });

  it('recusa cobre de pedaços diferentes mais perto que a folga, com a face e o ponto', () => {
    const v = conferir(comTrecho('led-vermelho', { face: 'baixo', largura: 0.25, pontos: [[-31, 16.35], [-30, 16.35]] })).violacoes.find((x) => x.regra === 'distancia');
    expect(v).toMatchObject({ face: 'baixo', medido: 0.1, exigido: PLACA.folga });
    expect(v.rede).toBe('sinal-1');
    expect(v.ponto[1]).toBeCloseTo(16.175, 3);
  });

  it('recusa o cobre perto da borda', () => {
    const v = conferir(comTrecho('led-verde', { face: 'cima', largura: 0.25, pontos: [[49.8, 0], [49.8, 5]] })).violacoes.find((x) => x.regra === 'borda');
    expect(v).toMatchObject({ face: 'cima', exigido: PLACA.borda });
    expect(v.medido).toBeLessThan(PLACA.borda);
  });

  it('recusa a via de furo ou de anel abaixo da regra', () => {
    const t = copia(tracadoDeProva); Object.assign(t.redes[2].vias[0], { furo: 0.2, anel: 0.1 });
    const r = conferir(t);
    expect(r.violacoes.find((x) => x.regra === 'furo-da-via')).toMatchObject({ medido: 0.2, exigido: PLACA.via.furo, ponto: [-28.73, 16] });
    expect(r.violacoes.find((x) => x.regra === 'anel-da-via')).toMatchObject({ medido: 0.1, exigido: PLACA.via.anel });
  });

  it('acusa a rede aberta, com os terminais de cada pedaço', () => {
    const t = copia(tracadoDeProva); t.redes[2].trechos.pop();
    expect(conferir(t).violacoes.find((x) => x.regra === 'rede-aberta')).toMatchObject({ rede: 'sinal-1', terminais: [['u2.3'], ['j1.1']] });
  });

  it('acusa o curto, quando o mesmo cobre une terminais de duas redes', () => {
    const t = copia(tracadoDeProva); t.redes[0].trechos[0].pontos = [[0.08, 8], [29.27, 8]];
    const lista = [...daProva, listaInteira.find((r) => r.id === 'vcc')];
    const v = conferir(t, lista).violacoes.find((x) => x.regra === 'curto');
    expect(v.rede).toBe('led-verde e vcc');
    expect(v.terminais).toEqual(expect.arrayContaining(['r1.2', 'c2.1', 'd1.anodo']));
  });

  it('acusa o terminal que não existe e o terminal citado em duas redes', () => {
    const lista = copia(daProva);
    lista[0].terminais.push({ peca: 'r1', porta: '9' });
    lista[1].terminais.push({ peca: 'r1', porta: '2' });
    const r = regras(conferir(tracadoDeProva, lista));
    expect(r).toContain('terminal-inexistente');
    expect(r).toContain('terminal-em-duas-redes');
  });

  it('mede pelo cobre: trocar o rótulo de rede de um trecho não muda o que ele acha', () => {
    const t = copia(tracadoDeProva); t.redes[0].trechos[0].pontos = [[0.08, 8], [29.27, 8]];
    const lista = [...daProva, listaInteira.find((r) => r.id === 'vcc')];
    const trocado = copia(t); trocado.redes[0].id = 'led-vermelho'; trocado.redes[1].id = 'led-verde';
    expect(conferir(trocado, lista).violacoes).toEqual(conferir(t, lista).violacoes);
  });
});

describe('a placa com o cobre traçado', () => {
  const comCobre = (tracado) => placaDeclarada({ ...PLACA_DE_PROVA, cobre: { tracado, redes: daProva } });

  it('gera as trilhas e as vias e sai igual em duas gerações', () => {
    const a = comCobre(tracadoDeProva); const b = comCobre(tracadoDeProva);
    expect(JSON.stringify(a.passos)).toBe(JSON.stringify(b.passos));
    expect(a.passos.length).toBeGreaterThan(semCobre.passos.length - semCobre.ilhas.length * 3);
  });

  it('recusa o traçado com violação, dizendo a regra e a mensagem do conferidor', () => {
    const t = copia(tracadoDeProva); t.redes[0].trechos[0].largura = 0.1;
    expect(() => comCobre(t)).toThrow(ErroFamilia);
    expect(() => comCobre(t)).toThrow(/placa\.cobre \(largura\).*0,?\.?1 mm/);
  });

  it('recusa a declaração de cobre malformada com o caminho do campo', () => {
    expect(() => placaDeclarada({ ...PLACA_DE_PROVA, cobre: { tracado: { versao: 2, redes: [] }, redes: [] } })).toThrow(/placa\.cobre\.tracado/);
    const t = copia(tracadoDeProva); t.redes[0].trechos[0].face = 'meio';
    expect(() => comCobre(t)).toThrow(/trechos\[0\]\.face/);
  });
});
