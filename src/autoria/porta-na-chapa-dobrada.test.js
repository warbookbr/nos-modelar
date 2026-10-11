/* porta-na-chapa-dobrada.test.js — a porta de uma peça de chapa dobrada sai da origem da chapa: o plano sobre uma aba e o
   anel e o cilindro sobre um rolo de 270 graus conferem com a forma da malha (porta-confere-forma). O rolo é de três
   dobras de 90 graus com trechos retos de 0,02 mm, porque uma dobra sozinha vai até 180 graus. Em metro, como as famílias. */
import { describe, expect, it } from 'vitest';
import { REGISTRO_OPERACOES, criarRegistroComExtensoes, nucleo } from '../../procedural/nucleo/entrada.js';
import { EXTENSAO, medidasDaChapa } from '../../procedural/extensoes/chapa-dobrada/index.js';
import { conferirPortasNaForma } from './porta-confere-forma.js';

const registro = criarRegistroComExtensoes({ registroBase: REGISTRO_OPERACOES, extensoes: [EXTENSAO] });
const rodar = (passos) => {
  const n = nucleo(passos, {}, {}, {}, null, [], { registroOperacoes: registro });
  expect(n.orfaos).toEqual([]);
  return n;
};
const codigos = (passos) => conferirPortasNaForma(rodar(passos)).map((a) => a.codigo);
const de = (origem) => ({ op: 'chapaDobrada', id: 1, ...origem });

// o L de 2 mm: a aba de 40 mm segue +x, dobra 90 graus a +y (raio interno 2 mm, linha média 3 mm) e a aba de 30 mm sobe
const L = { origemId: 1, espessura: 0.002, raioInterno: 0.002, largura: 0.03, abas: [{ comprimento: 0.04, angulo: 90 }, { comprimento: 0.03 }] };
const planoDaAba = (origem, ponto, normal) => [['chapaDobrada', L], ['publicarPorta', { id: 'apoio', de: de(origem), interface: { forma: 'plano', papel: 'apoia', ponto, normal, extensao: [0.03, 0.03] } }]];

describe('a porta de plano sobre uma aba da chapa', () => {
  it('passa na face de fora da aba que sobe (x = 44 mm) e na face de baixo da primeira (y = -1 mm)', () => {
    expect(codigos(planoDaAba({ aba: 1, lado: 'direita' }, [0.044, 0.03, 0], [1, 0, 0]))).toEqual([]);
    expect(codigos(planoDaAba({ aba: 0, lado: 'direita' }, [0.02, -0.001, 0], [0, -1, 0]))).toEqual([]);
  });
  it('reprova a mesma porta 3 mm fora do plano da aba, e a porta posta na face errada da aba', () => {
    expect(codigos(planoDaAba({ aba: 1, lado: 'direita' }, [0.047, 0.03, 0], [1, 0, 0]))).toEqual(['porta-fora-do-plano']);
    expect(codigos(planoDaAba({ aba: 1, lado: 'esquerda' }, [0.044, 0.03, 0], [1, 0, 0]))).toEqual(['porta-fora-do-plano']);
  });
  it('a aba é citável pelo nome do que ela é, sem posição na malha: a última aba é a que sobe', () => {
    expect(codigos(planoDaAba({ aba: 'ultima', lado: 'direita' }, [0.044, 0.03, 0], [1, 0, 0]))).toEqual([]);
  });
});

// a folha da dobradiça em miniatura: a aba plana de 25 mm, o rolo de 270 graus em torno do pino e a ponta que fecha o rolo
const RAIO_INTERNO = 0.0027, ESPESSURA = 0.002, MEDIO = RAIO_INTERNO + ESPESSURA / 2, RAIO_EXTERNO = RAIO_INTERNO + ESPESSURA, TRECHO = 0.00002;
const ROLO = {
  origemId: 1, espessura: ESPESSURA, raioInterno: RAIO_INTERNO, largura: 0.03,
  abas: [{ comprimento: 0.025, angulo: 90 }, { comprimento: TRECHO, angulo: 90 }, { comprimento: TRECHO, angulo: 90 }, { comprimento: TRECHO }],
};
const CENTRO = [0.025, MEDIO, -0.015];     // o eixo do rolo: z, a partir da tampa de z = -largura/2
const anel = (raioExterno, raioInterno = RAIO_INTERNO) => ({ forma: 'anel', papel: 'recebe', eixo: [0, 0, 1], centro: CENTRO, raioInterno, raioExterno, inicio: 0, fim: 0.03 });
const cilindro = (raio) => ({ forma: 'cilindro', papel: 'externa', eixo: [0, 0, 1], referencia: [1, 0, 0], centro: CENTRO, raio, inicio: 0, fim: 0.03 });
const comRolo = (interfaceDaPorta, citacao = { dobra: { passo: 1, fase: 0 } }, nomearRolo = true) => [
  ['chapaDobrada', ROLO],
  ...(nomearRolo ? [['parte', { nome: 'rolo', sel: { origem: de(citacao) } }]] : []),
  ['publicarPorta', { id: 'rolo', de: de(citacao), interface: interfaceDaPorta }],
];

describe('a porta de anel e de cilindro sobre o rolo de 270 graus', () => {
  it('as três dobras do rolo somam 270 graus e os vértices ficam nos raios pedidos, a menos da folga dos trechos retos', () => {
    expect(medidasDaChapa(ROLO).dobras.map((d) => d.angulo)).toEqual([90, 90, 90]);
    const raios = [...rodar([['chapaDobrada', ROLO]]).V.values()].filter((p) => p[2] < 0 && p[0] > 0.02)
      .map((p) => Math.hypot(p[0] - CENTRO[0], p[1] - CENTRO[1])).filter((r) => r < RAIO_EXTERNO + 0.001);
    expect(Math.abs(Math.min(...raios) - RAIO_INTERNO)).toBeLessThan(0.00004);
    expect(Math.abs(Math.max(...raios) - RAIO_EXTERNO)).toBeLessThan(0.00004);
  });
  it('o anel do rolo passa com os raios pedidos, medidos só nas partes do rolo (a aba plana, com 25 mm, fica de fora)', () => {
    expect(codigos(comRolo(anel(RAIO_EXTERNO)))).toEqual([]);
  });
  it('o cilindro externo do rolo passa com o raio externo', () => {
    expect(codigos(comRolo(cilindro(RAIO_EXTERNO)))).toEqual([]);
  });
  it('reprova o raio 1 mm maior, o plano 3 mm fora da tampa e o centro fora do eixo do rolo', () => {
    expect(codigos(comRolo(anel(RAIO_EXTERNO + 0.001)))).toEqual(['porta-com-raio-errado']);
    expect(codigos(comRolo({ ...anel(RAIO_EXTERNO), centro: [0.025, MEDIO, -0.012] }))).toEqual(['porta-fora-do-plano']);
    expect(codigos(comRolo({ ...anel(RAIO_EXTERNO), centro: [0.025, MEDIO + 0.001, -0.015] }))).toEqual(['porta-com-raio-errado']);
  });
  it('sem a origem da chapa o rolo não se separa da aba: a parte inteira passa de 25 mm do eixo e o raio reprova', () => {
    const inteira = [
      ['chapaDobrada', ROLO],
      ['parte', { nome: 'folha', sel: { origem: de({}) } }],
      ['publicarPorta', { id: 'rolo', de: de({}), interface: anel(RAIO_EXTERNO) }],
    ];
    expect(codigos(inteira)).toEqual(['porta-com-raio-errado']);
  });
});
